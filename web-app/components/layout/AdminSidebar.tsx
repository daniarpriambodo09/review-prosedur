// components/layout/AdminSidebar.tsx
'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from './AdminLayout';
import {
  LayoutDashboard,
  FileCheck,
  ClipboardCheck,
  Archive,
  Users,
  Settings,
  Building2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard',        path: '/home',              icon: LayoutDashboard },
  { label: 'Status Prosedur',  path: '/status-review',     icon: FileCheck       },
  { label: 'Approval Dokumen', path: '/approval-dokumen',  icon: ClipboardCheck  },
  { label: 'Arsip Prosedur',   path: '/arsip-prosedur',    icon: Archive         },
  { label: 'Kelola Departemen',path: '/kelola-departemen', icon: Building2       },
  { label: 'Kelola User',      path: '/user-management',   icon: Users           },
  { label: 'Pengaturan SMTP',  path: '/smtp-settings',     icon: Settings        },
];

// ── Desktop sidebar ──────────────────────────────────────────────────────────
export function AdminSidebar() {
  const { collapsed, setCollapsed } = useSidebar();
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    if (window.confirm('Apakah Anda yakin ingin logout?')) logout();
  };

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-[260px]';

  return (
    <aside
      className={`
        hidden md:flex flex-col fixed left-0 top-0 h-screen z-40
        bg-white border-r border-slate-200 shadow-sm
        transition-all duration-300 ease-in-out
        ${sidebarWidth}
      `}
    >
      {/* ── Logo area ─────────────────────────────────────────────────────── */}
      <div className={`
        flex items-center border-b border-slate-100
        transition-all duration-300
        ${collapsed ? 'justify-center px-3 py-4' : 'justify-between px-4 py-3'}
      `}>
        {collapsed ? (
          // Collapsed: hanya logo, tanpa teks
          <button
            onClick={() => setCollapsed(c => !c)}
            className="flex flex-col items-center gap-1 group"
            title="Expand sidebar"
          >
            <div className="relative w-9 h-9 flex-shrink-0">
              <Image
                src="/review-prosedur/images/logo.png"
                alt="Logo"
                fill
                className="object-contain"
                sizes="36px"
                priority
              />
            </div>
            <ChevronRight size={12} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
          </button>
        ) : (
          // Expanded: logo + tombol collapse
          <>
            <div className="relative flex-shrink-0 w-[180px] h-[60px] min-w-0">
              <Image
                src="/review-prosedur/images/yazaki-logo.jpg"
                alt="Yazaki Logo"
                fill
                className="object-contain object-left"
                sizes="180px"
                priority
              />
            </div>
            <button
              onClick={() => setCollapsed(c => !c)}
              className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center
                         text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              title="Collapse sidebar"
            >
              <ChevronLeft size={14} />
            </button>
          </>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-0.5">
        {!collapsed && (
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-2">Menu</p>
        )}
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
          const isActive = pathname === path;
          return (
            <Link
              key={path}
              href={path}
              title={collapsed ? label : undefined}
              className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150
                ${isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <Icon
                size={18}
                className={`flex-shrink-0 transition-colors ${
                  isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              />
              {!collapsed && <span className="truncate">{label}</span>}
              {isActive && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Profile + Logout ──────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 px-3 py-4">
        {!collapsed ? (
          <div className="mb-2 px-3 py-2.5 rounded-lg bg-slate-50">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-blue-700">
                  {(user?.fullName || user?.username || 'A')[0].toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {user?.fullName || user?.username}
                </p>
                <p className="text-[10px] text-slate-400 truncate capitalize">{user?.role || 'Admin'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-700">
                {(user?.fullName || user?.username || 'A')[0].toUpperCase()}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className={`
            w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium
            text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

// ── Mobile Drawer ─────────────────────────────────────────────────────────────
export function MobileSidebarDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    if (window.confirm('Apakah Anda yakin ingin logout?')) {
      logout();
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`
          fixed left-0 top-0 h-screen w-72 z-50 flex flex-col
          bg-white border-r border-slate-200 shadow-xl
          transition-transform duration-300 ease-in-out md:hidden
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="relative w-[180px] h-[60px] flex-shrink-0">
            <Image
              src="/review-prosedur/images/yazaki-logo.jpg"
              alt="Yazaki Logo"
              fill
              className="object-contain object-left"
              sizes="180px"
            />
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-2">Menu</p>
          {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
            const isActive = pathname === path;
            return (
              <Link
                key={path}
                href={path}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-150
                  ${isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
              >
                <Icon size={18} className={`flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{label}</span>
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-100 px-3 py-4">
          <div className="mb-2 px-3 py-2.5 rounded-lg bg-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-blue-700">
                  {(user?.fullName || user?.username || 'A')[0].toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">{user?.fullName || user?.username}</p>
                <p className="text-[10px] text-slate-400 capitalize">{user?.role || 'Admin'}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}