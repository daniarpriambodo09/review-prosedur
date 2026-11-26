// contexts/AuthContext.tsx

'use client';
import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  role: 'user' | 'pic' | 'admin';
  picId?: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  picLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: (reason?: string) => void;
  isLoading: boolean;
  updateUser: (partial: Partial<User>) => void;
  setAuthUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Semua public routes — tidak perlu autentikasi
const PUBLIC_ROUTES = [
  '/login-page', '/pic-login', '/review-page-owner',
  // Halaman ACC (approve/reject dokumen) dan verifikasi QR code
  '/acc', '/verify',
];

function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

// ── Batas waktu auto-logout saat tidak aktif / di luar tab: 15 Menit ───────────
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 menit (900.000 ms)

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser]                       = useState<User | null>(null);
  const [isLoading, setIsLoading]             = useState(true);

  const hasValidated = useRef(false);
  const lastActivityRef = useRef(Date.now());

  const router   = useRouter();
  const pathname = usePathname();

  // ── Logout Handler ──────────────────────────────────────────────────────────
  const logout = useCallback((reason?: string) => {
    const currentRole = user?.role;
    setIsAuthenticated(false);
    setUser(null);

    // Bersihkan sessionStorage dan localStorage lama
    try {
      sessionStorage.removeItem('isAuthenticated');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('lastActivity');
      sessionStorage.removeItem('tabHiddenAt');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');

      if (reason) {
        sessionStorage.setItem('logoutReason', reason);
      }
    } catch (e) {
      console.error('Error clearing session:', e);
    }

    if (currentRole === 'pic' || pathname?.startsWith('/pic-')) {
      router.push('/pic-login');
    } else {
      router.push('/login-page');
    }
  }, [user, pathname, router]);

  // ── 1. Inisialisasi & Validasi Sesi saat Mount (Menggunakan sessionStorage) ──
  useEffect(() => {
    if (hasValidated.current) return;
    hasValidated.current = true;

    const validateSession = async () => {
      // Selalu bersihkan sisa localStorage lama agar tidak ada auto-login admin permanen yang bocor
      try {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('user');
      } catch {}

      // Ambil sesi hanya dari sessionStorage (otomatis hilang saat tab / browser ditutup)
      const storedAuth = sessionStorage.getItem('isAuthenticated');
      const storedUser = sessionStorage.getItem('user');
      const lastActiveStr = sessionStorage.getItem('lastActivity');

      if (storedAuth === 'true' && storedUser) {
        const now = Date.now();
        const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : 0;

        // Cek apakah sudah melebihi batas waktu idle
        if (lastActive > 0 && now - lastActive >= INACTIVITY_TIMEOUT_MS) {
          sessionStorage.removeItem('isAuthenticated');
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('lastActivity');
          sessionStorage.setItem('logoutReason', 'Sesi Anda telah berakhir karena tidak ada aktivitas selama 15 menit. Silakan login kembali.');
          setIsLoading(false);
          return;
        }

        try {
          const userData = JSON.parse(storedUser);

          const response = await fetch('/review-prosedur/api/auth/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: userData.username }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.valid) {
              setIsAuthenticated(true);
              setUser(data.user);
              lastActivityRef.current = Date.now();
              sessionStorage.setItem('lastActivity', Date.now().toString());
              setIsLoading(false);
              return;
            }
          }

          // Validasi gagal — bersihkan sessionStorage
          sessionStorage.removeItem('isAuthenticated');
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('lastActivity');
        } catch (error) {
          console.error('Session validation error:', error);
          sessionStorage.removeItem('isAuthenticated');
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('lastActivity');
        }
      }

      setIsLoading(false);
    };

    validateSession();
  }, []);

  // ── 2. Guard Redirect: Jika belum login dan bukan public route ───────────────
  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) return;
    if (isPublicPath(pathname)) return;

    // Arahkan ke login page yang sesuai: jika path PIC ke /pic-login, selainnya ke /login-page
    if (pathname?.startsWith('/pic-')) {
      router.replace('/pic-login');
    } else {
      router.replace('/login-page');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // ── 3. Auto-Logout Detektor: Idle & Meninggalkan Tab (Visibility Change) ─────
  useEffect(() => {
    if (!isAuthenticated) return;

    // Catat timestamp aktivitas terakhir (throttled setiap 2 detik)
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current > 2000) {
        lastActivityRef.current = now;
        try {
          sessionStorage.setItem('lastActivity', now.toString());
        } catch {}
      }
    };

    // Pasang listeners interaksi user
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Deteksi saat user berpindah tab / minimize browser
    const handleVisibilityChange = () => {
      const now = Date.now();
      if (document.visibilityState === 'hidden') {
        try {
          sessionStorage.setItem('tabHiddenAt', now.toString());
        } catch {}
      } else if (document.visibilityState === 'visible') {
        const lastActiveStr = sessionStorage.getItem('lastActivity');
        const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : lastActivityRef.current;
        if (now - lastActive >= INACTIVITY_TIMEOUT_MS) {
          logout('Sesi Anda telah berakhir karena Anda berada di luar tab atau tidak aktif selama lebih dari 15 menit. Silakan login kembali.');
          return;
        }
        handleActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic check interval setiap 10 detik
    const intervalId = setInterval(() => {
      const now = Date.now();
      const lastActiveStr = sessionStorage.getItem('lastActivity');
      const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : lastActivityRef.current;
      if (now - lastActive >= INACTIVITY_TIMEOUT_MS) {
        logout('Sesi Anda telah berakhir karena tidak ada aktivitas selama 15 menit. Silakan login kembali.');
      }
    }, 10000);

    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [isAuthenticated, logout]);

  // ── 4. Login Admin ──────────────────────────────────────────────────────────
  const login = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/review-prosedur/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        sessionStorage.setItem('isAuthenticated', 'true');
        sessionStorage.setItem('user', JSON.stringify(data.user));
        sessionStorage.setItem('lastActivity', Date.now().toString());
        lastActivityRef.current = Date.now();

        setUser(data.user);
        setIsAuthenticated(true);

        router.push('/home');
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login gagal' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Terjadi kesalahan saat login' };
    }
  };

  // ── 5. Login PIC ────────────────────────────────────────────────────────────
  const picLogin = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/review-prosedur/api/auth/pic-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        sessionStorage.setItem('isAuthenticated', 'true');
        sessionStorage.setItem('user', JSON.stringify(data.user));
        sessionStorage.setItem('lastActivity', Date.now().toString());
        lastActivityRef.current = Date.now();

        setUser(data.user);
        setIsAuthenticated(true);

        router.push('/pic-dashboard');
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login gagal' };
      }
    } catch (error) {
      console.error('PIC Login error:', error);
      return { success: false, error: 'Terjadi kesalahan saat login' };
    }
  };

  const updateUser = (partial: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      try {
        sessionStorage.setItem('user', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const setAuthUser = useCallback((userData: User) => {
    try {
      sessionStorage.setItem('isAuthenticated', 'true');
      sessionStorage.setItem('user', JSON.stringify(userData));
      sessionStorage.setItem('lastActivity', Date.now().toString());
    } catch {}
    lastActivityRef.current = Date.now();
    setUser(userData);
    setIsAuthenticated(true);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, picLogin, logout, isLoading, updateUser, setAuthUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
