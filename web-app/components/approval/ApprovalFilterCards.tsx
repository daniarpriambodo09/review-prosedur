// components/approval/ApprovalFilterCards.tsx
'use client';

import React from 'react';
import { FileEdit, FileSearch, ShieldCheck, RotateCcw, Sparkles } from 'lucide-react';

export type StageFilterType = 'setting_approver' | 'revisi' | 'prepared' | 'checked' | 'approved' | null;

interface ApprovalFilterCardsProps {
  stats: {
    settingApprover?: number;
    revisi?: number;
    prepared: number;
    checked: number;
    approved: number;
    inProgressTotal?: number;
  };
  activeStage: StageFilterType;
  onSelectStage: (stage: StageFilterType) => void;
}

export default function ApprovalFilterCards({
  stats,
  activeStage,
  onSelectStage,
}: ApprovalFilterCardsProps) {
  const cards = [
    {
      id: 'setting_approver' as const,
      title: 'Dokumen Baru',
      subtitle: 'Perlu Approval',
      count: stats.settingApprover ?? 0,
      icon: Sparkles,
      color: {
        active: 'bg-sky-50/60 border-sky-500 ring-2 ring-sky-500/25 shadow-sm',
        inactive: 'bg-white hover:bg-slate-50/70 border-slate-200 hover:border-sky-300',
        iconBg: 'bg-sky-50 text-sky-600 border border-sky-200/80',
        countColor: 'text-slate-900 group-hover:text-sky-700',
        accentBar: 'bg-sky-500',
        activeBadge: 'bg-sky-600 text-white',
      },
    },
    {
      id: 'revisi' as const,
      title: 'Perlu Revisi',
      subtitle: 'Upload Ulang',
      count: stats.revisi ?? 0,
      icon: RotateCcw,
      color: {
        active: 'bg-rose-50/60 border-rose-500 ring-2 ring-rose-500/25 shadow-sm',
        inactive: 'bg-white hover:bg-slate-50/70 border-slate-200 hover:border-rose-300',
        iconBg: 'bg-rose-50 text-rose-600 border border-rose-200/80',
        countColor: 'text-slate-900 group-hover:text-rose-700',
        accentBar: 'bg-rose-500',
        activeBadge: 'bg-rose-600 text-white',
      },
    },
    {
      id: 'prepared' as const,
      title: 'Prepared',
      subtitle: 'Disiapkan PIC',
      count: stats.prepared,
      icon: FileEdit,
      color: {
        active: 'bg-blue-50/60 border-blue-500 ring-2 ring-blue-500/25 shadow-sm',
        inactive: 'bg-white hover:bg-slate-50/70 border-slate-200 hover:border-blue-300',
        iconBg: 'bg-blue-50 text-blue-600 border border-blue-200/80',
        countColor: 'text-slate-900 group-hover:text-blue-700',
        accentBar: 'bg-blue-500',
        activeBadge: 'bg-blue-600 text-white',
      },
    },
    {
      id: 'checked' as const,
      title: 'Checked',
      subtitle: 'Pemeriksaan',
      count: stats.checked,
      icon: FileSearch,
      color: {
        active: 'bg-amber-50/60 border-amber-500 ring-2 ring-amber-500/25 shadow-sm',
        inactive: 'bg-white hover:bg-slate-50/70 border-slate-200 hover:border-amber-300',
        iconBg: 'bg-amber-50 text-amber-600 border border-amber-200/80',
        countColor: 'text-slate-900 group-hover:text-amber-700',
        accentBar: 'bg-amber-500',
        activeBadge: 'bg-amber-600 text-white',
      },
    },
    {
      id: 'approved' as const,
      title: 'Approved',
      subtitle: 'Disetujui',
      count: stats.approved,
      icon: ShieldCheck,
      color: {
        active: 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/25 shadow-sm',
        inactive: 'bg-white hover:bg-slate-50/70 border-slate-200 hover:border-emerald-300',
        iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-200/80',
        countColor: 'text-slate-900 group-hover:text-emerald-700',
        accentBar: 'bg-emerald-500',
        activeBadge: 'bg-emerald-600 text-white',
      },
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(card => {
        const Icon = card.icon;
        const isActive = activeStage === card.id;

        return (
          <div
            key={card.id}
            onClick={() => onSelectStage(isActive ? null : card.id)}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectStage(isActive ? null : card.id);
              }
            }}
            className={`
              group relative p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none
              flex flex-col justify-between shadow-2xs hover:shadow-sm hover:-translate-y-0.5
              ${isActive ? card.color.active : card.color.inactive}
            `}
          >
            {/* Top colored accent indicator bar */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl transition-all ${
                isActive
                  ? card.color.accentBar
                  : 'bg-transparent group-hover:opacity-60 ' + card.color.accentBar
              }`}
            />

            {/* Header: Icon (kiri) & Metrik Angka Dokumen (kanan) */}
            <div className="flex items-start justify-between gap-2">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-2xs ${card.color.iconBg}`}
              >
                <Icon size={18} />
              </div>

              <div className="text-right">
                <div className={`text-2xl font-black tracking-tight leading-none ${card.color.countColor}`}>
                  {card.count}
                </div>
                <div className="text-[10px] font-semibold text-slate-400 mt-1">
                  Dokumen
                </div>
              </div>
            </div>

            {/* Body: Judul & Subtitle jelas dan tidak terpotong */}
            <div className="mt-3">
              <div className="flex items-center justify-between gap-1">
                <h3 className="text-xs sm:text-[13px] font-bold text-slate-800 group-hover:text-slate-950 transition-colors leading-snug">
                  {card.title}
                </h3>
                {isActive && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none flex-shrink-0 ${card.color.activeBadge}`}>
                    Aktif
                  </span>
                )}
              </div>

              <p className="text-[11px] font-medium text-slate-500 group-hover:text-slate-600 transition-colors mt-0.5 leading-snug">
                {card.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
