// components/dashboard/SectionReviewChart.tsx
//
// Grafik Komparasi "Total Dokumen vs Sudah Direview per Section"
// Desain modern, interaktif, dengan visual gradient, micro-animations,
// summary progress bar, dan floating tooltip detail per section.
// Dipakai di /home (Admin) dan /pic-dashboard (PIC).

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3, CheckCircle2, Clock, Sparkles,
  Calendar, Layers, ArrowUpRight,
} from 'lucide-react';

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

interface SectionStat {
  label: string;
  total: number;
  reviewed: number;
}

const CHART_HEIGHT = 180; // px

function niceMax(value: number): number {
  if (value <= 0) return 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  let niceNormalized: number;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;
  return niceNormalized * magnitude;
}

export default function SectionReviewChart() {
  const currentYear = Math.max(2026, new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear,  setSelectedYear]  = useState<number>(currentYear);
  const [stats,         setStats]         = useState<SectionStat[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [errored,       setErrored]       = useState(false);
  const [hoveredStat,   setHoveredStat]   = useState<SectionStat | null>(null);

  const availableYears = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear; y >= 2026; y--) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  const loadStats = useCallback(async (month: number, year: number) => {
    setLoading(true);
    setErrored(false);
    try {
      const res = await fetch(`/review-prosedur/api/dashboard/section-stats?month=${month}&year=${year}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat data');
      const json = await res.json();
      setStats(json.data ?? []);
    } catch (err) {
      console.error('Gagal memuat section stats:', err);
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear, loadStats]);

  const maxTotal   = useMemo(() => stats.reduce((max, s) => Math.max(max, s.total), 0), [stats]);
  const chartMax   = useMemo(() => niceMax(maxTotal), [maxTotal]);
  const gridTicks  = useMemo(() => [1, 0.75, 0.5, 0.25, 0].map(f => Math.round(chartMax * f)), [chartMax]);

  const grandTotal    = useMemo(() => stats.reduce((sum, s) => sum + s.total, 0), [stats]);
  const grandReviewed = useMemo(() => stats.reduce((sum, s) => sum + s.reviewed, 0), [stats]);
  const progressPct   = grandTotal > 0 ? Math.round((grandReviewed / grandTotal) * 100) : 0;
  const pendingCount  = Math.max(0, grandTotal - grandReviewed);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
      
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-6 py-4.5 border-b border-slate-100 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50/60 flex items-center justify-between flex-wrap gap-4">
        
        {/* Title & icon */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-blue-500/25 flex-shrink-0">
            <BarChart3 size={20} className="relative z-10" />
            <span className="absolute inset-0 rounded-2xl bg-white/20 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Total Dokumen vs Sudah Direview
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">
                <Sparkles size={11} /> Global
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <span>Per Section & Departemen</span>
              <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />
              <span className="font-medium text-slate-600">{MONTH_NAMES_ID[selectedMonth]} {selectedYear}</span>
              {stats.length > 0 && (
                <>
                  <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-slate-500 font-medium">{stats.length} section aktif</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls: Progress Badge + Year Selector + Month Selector */}
        <div className="flex items-center gap-2.5 ml-auto flex-wrap">
          {/* Progress Pill */}
          {grandTotal > 0 && (
            <div className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Progress Review</p>
                <p className="text-xs font-bold text-slate-800">
                  {grandReviewed}/{grandTotal} <span className="text-slate-400 font-medium text-[11px]">({progressPct}%)</span>
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs border border-emerald-100">
                {progressPct === 100 ? <CheckCircle2 size={18} className="text-emerald-500" /> : `${progressPct}%`}
              </div>
            </div>
          )}

          {/* Year Selector */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 pr-7 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-all hover:border-slate-300 shadow-xs"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L2 4h8z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
              }}
            >
              {availableYears.map(y => (
                <option key={y} value={y}>
                  {y === currentYear ? y : `${y} (Riwayat)`}
                </option>
              ))}
            </select>
          </div>

          {/* Month Selector */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Calendar size={14} />
            </div>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="pl-8.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-all hover:border-slate-300 shadow-xs"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L2 4h8z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
              }}
            >
              {MONTH_NAMES_ID.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* ── Summary & Legend Row ────────────────────────────────────────────── */}
      <div className="px-6 py-3 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 text-xs">
        
        {/* Interactive Legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <span className="w-3 h-3 rounded-md bg-gradient-to-t from-blue-600 to-indigo-500 shadow-xs" />
            <span>Total Dokumen</span>
          </div>
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <span className="w-3 h-3 rounded-md bg-gradient-to-t from-emerald-600 to-teal-400 shadow-xs" />
            <span>Sudah Direview</span>
          </div>
        </div>

        {/* Status completion badges */}
        <div className="flex items-center gap-2">
          {grandTotal > 0 && (
            <>
              {pendingCount === 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                  </span>
                  Semua dokumen sudah direview ({grandReviewed}/{grandTotal})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock size={12} className="text-amber-600" />
                  <span>{pendingCount} dokumen belum selesai direview</span>
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Chart Container ─────────────────────────────────────────────────── */}
      <div className="p-6 relative">
        {loading ? (
          /* Shimmer Skeleton Loader */
          <div className="py-8">
            <div className="flex items-end justify-between gap-3" style={{ height: CHART_HEIGHT }}>
              {[60, 85, 45, 95, 70, 40, 65, 80, 50, 75].map((h, i) => (
                <div key={i} className="flex-1 flex items-end justify-center gap-1.5 h-full animate-pulse">
                  <div className="w-3.5 bg-blue-100 rounded-t-md" style={{ height: `${h}%` }} />
                  <div className="w-3.5 bg-emerald-100 rounded-t-md" style={{ height: `${h * 0.7}%` }} />
                </div>
              ))}
            </div>
            <p className="text-xs text-center text-slate-400 font-medium mt-4">Memuat data grafik...</p>
          </div>
        ) : errored ? (
          <div className="py-12 text-center text-red-500">
            <p className="text-xs font-medium">Gagal memuat grafik section. Silakan refresh halaman.</p>
          </div>
        ) : stats.length === 0 ? (
          <div className="py-14 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <Layers size={22} />
            </div>
            <p className="text-sm font-semibold text-slate-700">Tidak ada dokumen</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Belum ada prosedur yang dijadwalkan selesai approval pada bulan {MONTH_NAMES_ID[selectedMonth]}.
            </p>
          </div>
        ) : (
          <div>
            {/* Plotting area with Y-axis */}
            <div className="flex">
              
              {/* Sumbu Y */}
              <div
                className="flex flex-col justify-between text-[11px] font-semibold text-slate-400 pr-3 select-none flex-shrink-0"
                style={{ height: CHART_HEIGHT }}
              >
                {gridTicks.map((tick, i) => (
                  <span key={i} className="leading-none text-right min-w-[20px]">{tick}</span>
                ))}
              </div>

              {/* Bar Plot + Gridlines */}
              <div className="flex-1 min-w-0 relative">
                
                {/* Horizontal Gridlines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {gridTicks.map((_, i) => (
                    <div
                      key={i}
                      className={`w-full border-t transition-colors ${
                        i === gridTicks.length - 1
                          ? 'border-slate-300'
                          : 'border-slate-100 border-dashed'
                      }`}
                    />
                  ))}
                </div>

                {/* Bars Area */}
                <div className="relative flex items-end" style={{ height: CHART_HEIGHT }}>
                  {stats.map((stat, idx) => {
                    const totalPct    = chartMax > 0 ? Math.max((stat.total / chartMax) * 100, stat.total > 0 ? 5 : 0) : 0;
                    const reviewedPct = chartMax > 0 ? Math.max((stat.reviewed / chartMax) * 100, stat.reviewed > 0 ? 5 : 0) : 0;
                    const isHovered   = hoveredStat?.label === stat.label;
                    const isComplete  = stat.total > 0 && stat.reviewed >= stat.total;

                    return (
                      <div
                        key={stat.label || idx}
                        onMouseEnter={() => setHoveredStat(stat)}
                        onMouseLeave={() => setHoveredStat(null)}
                        className={`group relative flex-1 min-w-0 h-full flex items-end justify-center px-1 sm:px-1.5 cursor-pointer transition-all duration-200 ${
                          isHovered ? 'z-20 scale-102' : 'hover:scale-101'
                        }`}
                      >
                        {/* Background track pill */}
                        <div
                          className={`w-full max-w-[34px] sm:max-w-[42px] h-full rounded-t-xl flex items-end justify-center gap-1 px-1 transition-all duration-200 ${
                            isHovered
                              ? 'bg-slate-200/70 shadow-inner'
                              : 'bg-slate-100/50 hover:bg-slate-100'
                          }`}
                        >
                          {/* Bar: Total Dokumen */}
                          <div
                            className="relative flex-1 max-w-[14px] rounded-t-lg bg-gradient-to-t from-blue-600 via-indigo-600 to-blue-400 shadow-sm shadow-blue-500/20 transition-all duration-500 ease-out group-hover:brightness-110 flex items-start justify-center"
                            style={{ height: `${totalPct}%` }}
                          >
                            {/* Inner top highlight */}
                            <span className="w-full h-1 bg-white/40 rounded-t-lg" />
                          </div>

                          {/* Bar: Sudah Direview */}
                          <div
                            className="relative flex-1 max-w-[14px] rounded-t-lg bg-gradient-to-t from-emerald-600 via-teal-500 to-emerald-400 shadow-sm shadow-emerald-500/20 transition-all duration-500 ease-out group-hover:brightness-110 flex items-start justify-center"
                            style={{ height: `${reviewedPct}%` }}
                          >
                            <span className="w-full h-1 bg-white/40 rounded-t-lg" />
                          </div>
                        </div>

                        {/* Floating Tooltip card when hovered */}
                        {isHovered && (
                          <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-30 pointer-events-none min-w-[190px] p-3 rounded-xl bg-slate-900/95 text-white shadow-xl backdrop-blur-sm border border-slate-700/80 animate-in fade-in zoom-in-95 duration-150">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-700/80 pb-2 mb-2">
                              <span className="font-bold text-xs text-white truncate">{stat.label}</span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                  isComplete
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {isComplete ? 'Selesai 100%' : `${Math.round((stat.reviewed / stat.total) * 100)}%`}
                              </span>
                            </div>

                            <div className="space-y-1.5 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                                  Total Dokumen:
                                </span>
                                <span className="font-bold text-white">{stat.total}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                  Sudah Direview:
                                </span>
                                <span className="font-bold text-emerald-400">{stat.reviewed}</span>
                              </div>
                              {stat.total > stat.reviewed && (
                                <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                                  <span className="text-amber-400 flex items-center gap-1">
                                    <Clock size={10} /> Belum:
                                  </span>
                                  <span className="font-semibold text-amber-400">{stat.total - stat.reviewed} dokumen</span>
                                </div>
                              )}
                            </div>

                            {/* Mini Tooltip Arrow */}
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 border-r border-b border-slate-700/80" />
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>

                {/* ── Section Labels on X Axis ─────────────────────────────── */}
                <div className="flex pt-2.5 border-t border-slate-200">
                  {stats.map((stat) => {
                    const isComplete = stat.total > 0 && stat.reviewed >= stat.total;
                    const isHovered  = hoveredStat?.label === stat.label;

                    return (
                      <div
                        key={stat.label}
                        onMouseEnter={() => setHoveredStat(stat)}
                        onMouseLeave={() => setHoveredStat(null)}
                        className={`flex-1 min-w-0 px-1 text-center cursor-pointer transition-colors duration-150 ${
                          isHovered ? 'opacity-100' : 'opacity-90 hover:opacity-100'
                        }`}
                        title={stat.label}
                      >
                        {/* Pill ratio count */}
                        <div className="inline-flex items-center justify-center mb-1">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md transition-colors ${
                              isComplete
                                ? 'bg-emerald-100 text-emerald-800 font-extrabold'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {stat.reviewed}/{stat.total}
                          </span>
                        </div>

                        {/* Section Name */}
                        <p
                          className={`text-[10.5px] font-bold truncate leading-tight transition-colors ${
                            isHovered ? 'text-blue-600' : 'text-slate-700'
                          }`}
                        >
                          {stat.label}
                        </p>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}