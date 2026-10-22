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
  logout: () => void;
  isLoading: boolean;
  updateUser: (partial: Partial<User>) => void;
  setAuthUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Semua public routes — tidak perlu autentikasi
const PUBLIC_ROUTES = [
  '/login-page', '/pic-login', '/review-page-owner',
  // 🆕 Halaman ACC (approve/reject dokumen) dan verifikasi QR code —
  // dibuka lewat link di email oleh Prepared/Checked/Approved yang
  // TIDAK punya akun di sistem ini sama sekali, jadi wajib publik.
  '/acc', '/verify',
];

function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser]                       = useState<User | null>(null);
  // FIX 1: isLoading hanya true saat initial mount, BUKAN setiap kali pathname berubah
  const [isLoading, setIsLoading]             = useState(true);

  // FIX 2: Gunakan ref untuk memastikan validateSession hanya jalan SEKALI
  // saat mount, tidak re-run setiap kali pathname/router berubah
  const hasValidated = useRef(false);

  const router   = useRouter();
  const pathname = usePathname();

  // FIX 3: useEffect ini hanya jalan sekali (dependency array kosong [])
  // Tidak ada pathname/router di dependency — ini yang mencegah re-run saat navigasi
  useEffect(() => {
    if (hasValidated.current) return;
    hasValidated.current = true;

    const validateSession = async () => {
      const storedAuth = localStorage.getItem('isAuthenticated');
      const storedUser = localStorage.getItem('user');

      if (storedAuth === 'true' && storedUser) {
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
              setIsLoading(false);
              return;
            }
          }

          // Validasi gagal — bersihkan storage
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('user');
        } catch (error) {
          console.error('Session validation error:', error);
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('user');
        }
      }

      setIsLoading(false);
    };

    validateSession();
  }, []); // <-- dependency kosong: hanya jalan saat mount

  // FIX 4: Guard redirect dipisah ke useEffect tersendiri
  // Ini jalan setelah isLoading selesai, bukan di tengah-tengah validateSession
  useEffect(() => {
    if (isLoading) return; // Tunggu validasi selesai dulu
    if (isAuthenticated) return; // Sudah login, tidak perlu redirect
    if (isPublicPath(pathname)) return; // Public route, boleh akses bebas

    // Belum login dan bukan public route → redirect ke login
    router.replace('/login-page');
  }, [isLoading, isAuthenticated, pathname, router]);

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
        // FIX 5: Set state SEBELUM push router
        // Dengan begitu saat halaman baru mount, state sudah benar
        // dan guard redirect tidak akan trigger
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user', JSON.stringify(data.user));
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
        // FIX 5 (sama): localStorage + state dulu, baru router.push
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user', JSON.stringify(data.user));
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

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    router.push('/login-page');
  };

  const updateUser = (partial: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const setAuthUser = useCallback((userData: User) => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('user', JSON.stringify(userData));
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