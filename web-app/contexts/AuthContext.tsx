// contexts/AuthContext.tsx

'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  role: 'user' | 'pic';
  picId?: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  picLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Public routes yang tidak perlu autentikasi
const PUBLIC_ROUTES = ['/login-page', '/review-page-owner'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route));

  // Validate session on mount
  useEffect(() => {
    const validateSession = async () => {
      const storedAuth = localStorage.getItem('isAuthenticated');
      const storedUser = localStorage.getItem('user');

      if (storedAuth === 'true' && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          
          // Validate with backend
          const response = await fetch('/api/auth/validate', {
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
          
          // If validation fails, clear storage
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('user');
        } catch (error) {
          console.error('Session validation error:', error);
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('user');
        }
      }

      setIsLoading(false);

      // Redirect to login if not authenticated and not on public route
      if (!isPublicRoute && pathname !== '/login-page') {
        router.push('/login-page');
      }
    };

    validateSession();
  }, [pathname, router, isPublicRoute]);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

    if (response.ok && data.success) {
      setIsAuthenticated(true);
      setUser(data.user);
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect ke /home instead of /status-review
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

  const picLogin = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/pic-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsAuthenticated(true);
        setUser(data.user);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect ke PIC dashboard
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

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, picLogin, logout, isLoading }}>
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
