// components/layout/AdminHeader.tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Home, ChevronRight } from 'lucide-react';
import NotificationBell from '@/components/admin/NotificationBell';
import { MobileSidebarDrawer } from './AdminSidebar';

const BREADCRUMB_MAP: Record<string, { label: string; parent?: { label: string; path: string } }> = {
  '/home':              { label: 'Dashboard' },
  '/status-review':     { label: 'Status Prosedur',   parent: { label: 'Dashboard', path: '/home' } },
  '/approval-dokumen':  { label: 'Approval Dokumen',  parent: { label: 'Dashboard', path: '/home' } },
  '/arsip-prosedur':    { label: 'Arsip Prosedur',    parent: { label: 'Dashboard', path: '/home' } },
  '/kelola-departemen': { label: 'Kelola Departemen', parent: { label: 'Dashboard', path: '/home' } },
  '/user-management':   { label: 'Kelola User',       parent: { label: 'Dashboard', path: '/home' } },
  '/smtp-settings':            { label: 'Pengaturan SMTP',        parent: { label: 'Dashboard', path: '/home' } },
  '/email-schedules-settings': { label: 'Jadwal Otomatis Email',  parent: { label: 'Dashboard', path: '/home' } },
  '/system-settings':          { label: 'Sistem & Backup',        parent: { label: 'Dashboard', path: '/home' } },
};

export function AdminHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [systemOk, setSystemOk] = useState<boolean | null>(null);
  const pathname = usePathname();

  const crumb = BREADCRUMB_MAP[pathname];

  useEffect(() => {
    const checkSystem = async () => {
      try {
        const res = await fetch('/review-prosedur/api/system/status');
        const data = await res.json();
        setSystemOk(data.success && data.system?.allHealthy);
      } catch {
        setSystemOk(false);
      }
    };
    checkSystem();
    const interval = setInterval(checkSystem, 45000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 h-14 flex items-center bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 md:px-6 gap-4">
        {/* Hamburger — mobile only */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 transition-all"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        {/* Breadcrumb */}
        <nav className="flex-1 flex items-center gap-1.5 text-sm">
          <Link href="/home" className="text-slate-400 hover:text-slate-700 transition-colors">
            <Home size={14} />
          </Link>
          {crumb?.parent && (
            <>
              <ChevronRight size={13} className="text-slate-300" />
              <Link href={crumb.parent.path} className="text-slate-400 hover:text-slate-700 transition-colors text-xs">
                {crumb.parent.label}
              </Link>
            </>
          )}
          {crumb && (
            <>
              <ChevronRight size={13} className="text-slate-300" />
              <span className="text-slate-700 font-semibold text-xs">{crumb.label}</span>
            </>
          )}
        </nav>

        {/* Right — system health indicator & notifications */}
        <div className="flex items-center gap-3">
          <Link
            href="/system-settings"
            title="Status Layanan & Backup Sistem"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border hover:shadow-xs"
            style={{
              backgroundColor: systemOk === true ? '#F0FDF4' : systemOk === false ? '#FEF2F2' : '#F8FAFC',
              borderColor: systemOk === true ? '#BBF7D0' : systemOk === false ? '#FECACA' : '#E2E8F0',
              color: systemOk === true ? '#166534' : systemOk === false ? '#991B1B' : '#64748B',
            }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                systemOk === true ? 'bg-emerald-500 animate-pulse' : systemOk === false ? 'bg-red-500' : 'bg-slate-400'
              }`}
            />
            {systemOk === true ? 'Sistem Normal' : systemOk === false ? 'Periksa Sistem' : 'Sistem'}
          </Link>

          <NotificationBell />
        </div>
      </header>

      <MobileSidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}