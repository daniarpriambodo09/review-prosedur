// components/pic/PICDashboardHeader.tsx
'use client';

import Link from 'next/link';
import NotificationBell from './NotificationBell';
import Image from 'next/image';

interface PICDashboardHeaderProps {
  userName: string;
  onLogout: () => void;
  isManager?: boolean;
  departmentName?: string | null;
  jabatan?: string | null;
}

export default function PICDashboardHeader({
  userName,
  onLogout,
  isManager = false,
  departmentName,
  jabatan,
}: PICDashboardHeaderProps) {
  // Ambil inisial dari nama untuk avatar
  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      {/* CHANGED: max-w-7xl→max-w-screen-xl, py-4→py-2.5 */}
      <div className="max-w-screen-xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">

          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center flex-shrink-0">
              <Image
                src="/review-prosedur/images/yazaki-logo.jpg"
                alt="Yazaki Logo"
                width={120}
                height={32}
                priority
                className="object-contain h-8 w-auto"
              />
            </div>
            <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900">PIC Dashboard</h1>
                <Link
                  href="/pic-approval"
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-all"
                  title="Buka Halaman Persetujuan Dokumen (Prepared, Checked, Approved)"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  Approval Dokumen &rarr;
                </Link>
              </div>
              <p className="text-[11px] text-slate-500">Review Prosedur</p>
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              {/* CHANGED: text-sm→text-xs */}
              <p className="text-xs font-semibold text-slate-900">{userName}</p>
              {isManager ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  {jabatan || 'Manager'}{departmentName ? ` • ${departmentName}` : ''}
                </span>
              ) : (
                <p className="text-[11px] text-slate-500">Person In Charge</p>
              )}
            </div>

            {/* Notification Bell — tidak diubah, sudah compact */}
            <NotificationBell />

            {/* Avatar — CHANGED: w-9 h-9→w-8 h-8, text-sm→text-xs */}
            <Link
              href="/pic-profile"
              title="Lihat profil saya"
              className="
                flex-shrink-0 inline-flex items-center justify-center
                w-8 h-8 rounded-full
                bg-emerald-600 text-white text-xs font-bold
                ring-2 ring-offset-1 ring-emerald-200
                hover:bg-emerald-700 hover:ring-emerald-300
                transition-all duration-150
              "
            >
              {initials}
            </Link>

            {/* CHANGED: px-4 py-2→px-3 py-1.5, text-sm→text-xs */}
            <button
              onClick={onLogout}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-all border border-slate-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}