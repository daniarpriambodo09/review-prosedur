// components/approval/ApprovalFilterCards.tsx
'use client';

import React from 'react';
import { FileEdit, FileSearch, ShieldCheck, Check } from 'lucide-react';

export type StageFilterType = 'prepared' | 'checked' | 'approved' | null;

interface ApprovalFilterCardsProps {
  stats: {
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
      id: 'prepared' as const,
      title: 'Prepared',
      step: 'Tahap 1',
      count: stats.prepared,
      icon: FileEdit,
      color: {
        active: 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/25 shadow-sm',
        inactive: 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-blue-300',
        iconBg: 'bg-blue-100 text-blue-700',
        badgeBg: 'bg-blue-100/80 text-blue-800',
        countColor: 'text-blue-900',
        accentBar: 'bg-blue-500',
      },
    },
    {
      id: 'checked' as const,
      title: 'Checked',
      step: 'Tahap 2',
      count: stats.checked,
      icon: FileSearch,
      color: {
        active: 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/25 shadow-sm',
        inactive: 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-amber-300',
        iconBg: 'bg-amber-100 text-amber-700',
        badgeBg: 'bg-amber-100/80 text-amber-800',
        countColor: 'text-amber-900',
        accentBar: 'bg-amber-500',
      },
    },
    {
      id: 'approved' as const,
      title: 'Approved',
      step: 'Tahap 3',
      count: stats.approved,
      icon: ShieldCheck,
      color: {
        active: 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/25 shadow-sm',
        inactive: 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-emerald-300',
        iconBg: 'bg-emerald-100 text-emerald-700',
        badgeBg: 'bg-emerald-100/80 text-emerald-800',
        countColor: 'text-emerald-900',
        accentBar: 'bg-emerald-500',
      },
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
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
              relative px-4 py-3 rounded-xl border transition-all duration-150 cursor-pointer
              select-none flex items-center justify-between group overflow-hidden
              ${isActive ? card.color.active : card.color.inactive}
            `}
          >
            {/* Left accent line indicator when active */}
            {isActive && (
              <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${card.color.accentBar}`} />
            )}

            {/* Left: Icon & Stage labels */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${card.color.iconBg}`}
              >
                <Icon size={17} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">{card.title}</h3>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${card.color.badgeBg}`}>
                    {card.step}
                  </span>
                </div>
                {isActive && (
                  <p className="text-[11px] text-blue-600 font-semibold flex items-center gap-0.5 mt-0.5">
                    <Check size={11} strokeWidth={3} /> Filter aktif
                  </p>
                )}
              </div>
            </div>

            {/* Right: Metric count */}
            <div className="flex flex-col items-end flex-shrink-0 pl-2">
              <span className={`text-2xl font-black tracking-tight leading-none ${card.color.countColor}`}>
                {card.count}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wider">
                Dokumen
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
