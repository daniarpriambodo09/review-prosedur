// components/procedures/header.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    const confirmed = window.confirm('Apakah Anda yakin ingin logout?');
    if (confirmed) {
      logout();
    }
  };

  // Tentukan menu berdasarkan halaman saat ini
  const getNavigationMenu = () => {
    if (pathname === '/home') {
      return [
        { label: 'Status Prosedur', path: '/status-review' },
        { label: 'Arsip Prosedur', path: '/arsip-prosedur' },
      ];
    } else if (pathname === '/status-review') {
      return [
        { label: 'Home', path: '/home' },
        { label: 'Arsip Prosedur', path: '/arsip-prosedur' },
      ];
    } else if (pathname === '/arsip-prosedur') {
      return [
        { label: 'Home', path: '/home' },
        { label: 'Status Prosedur', path: '/status-review' },
      ];
    } else {
      // Default untuk halaman lain
      return [
        { label: 'Home', path: '/home' },
        { label: 'Status Prosedur', path: '/status-review' },
        { label: 'Arsip Prosedur', path: '/arsip-prosedur' },
      ];
    }
  };

  const menuItems = getNavigationMenu();

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
      <div className="px-8 py-5 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              className="w-5 h-5"
            >
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Review Prosedur</h1>
            <p className="text-xs text-blue-100">Quality Management System</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex gap-6">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`text-sm font-medium transition-colors ${
                  pathname === item.path
                    ? 'text-white'
                    : 'text-blue-50 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          
          {/* User Info & Logout */}
          <div className="flex items-center gap-3 pl-6 border-l border-blue-500">
            <div className="text-right">
              <p className="text-xs text-blue-100">Logged in as</p>
              <p className="text-sm font-semibold text-white">{user?.fullName || user?.username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="w-6 h-6"
          >
            {isMenuOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
            
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-blue-800 border-t border-blue-500">
          <nav className="px-8 py-4 space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.path
                    ? 'bg-white/20 text-white'
                    : 'text-blue-50 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          
          {/* Mobile User Info & Logout */}
          <div className="px-8 py-4 border-t border-blue-500">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-blue-200">Logged in as</p>
                <p className="text-sm font-semibold text-white">{user?.fullName || user?.username}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full bg-white/20 hover:bg-white/30 text-white px-4 py-3 rounded-lg text-sm font-semibold transition-all active:scale-95"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
}