// components/pic/PICDashboardHeader.tsx
'use client';

import Link from 'next/link';
import NotificationBell from './NotificationBell';
import Image from 'next/image';

interface PICDashboardHeaderProps {
  userName: string;
  onLogout: () => void;
}

export default function PICDashboardHeader({ userName, onLogout }: PICDashboardHeaderProps) {
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
          <div className="flex items-center gap-2.5">
            {/* CHANGED: w-10 h-10→w-8 h-8 */}
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex-shrink-0">
              <Image
                src="/review-prosedur/images/logo.png"
                alt="Yazaki"
                width={24}
                height={24}
                priority
                className="object-contain"
              />
            </div>
            <div>
              {/* CHANGED: text-xl→text-base */}
              <h1 className="text-base font-bold text-slate-900">PIC Dashboard</h1>
              {/* CHANGED: text-xs→text-[11px] */}
              <p className="text-[11px] text-slate-500">Review Prosedur</p>
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              {/* CHANGED: text-sm→text-xs */}
              <p className="text-xs font-semibold text-slate-900">{userName}</p>
              {/* CHANGED: text-xs→text-[11px] */}
              <p className="text-[11px] text-slate-500">Person In Charge</p>
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