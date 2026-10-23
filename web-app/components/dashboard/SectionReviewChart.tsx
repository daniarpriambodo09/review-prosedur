// components/dashboard/SectionReviewChart.tsx
//
// Grafik Komparasi "Total Dokumen vs Sudah Direview per Section"
// Desain modern, ultra-estetis, interaktif dengan visual gradient mendalam,
// KPI summary cards, floating direct-value badges, dual view mode
// (Grafik Batang & Kartu Grid), dan sorting interaktif.
// Dipakai di /home (Admin) dan /pic-dashboard (PIC).

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3, CheckCircle2, Clock, Sparkles,
  Calendar, Layers, Check, AlertCircle,
  LayoutGrid, TrendingUp, Award, FileText,
  ChevronDown, ArrowUpRight, HelpCircle
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

type ViewMode = 'chart' | 'cards';
type SortMode = 'total' | 'pending' | 'completed' | 'name';

const CHART_HEIGHT = 210; // px

function calculateChartMax(maxVal: number): number {
  if (maxVal <= 0) return 4;
  if (maxVal <= 4) return 4;
  if (maxVal <= 8) return 8;
  if (maxVal <= 12) return 14;
  if (maxVal <= 16) return 18;
  if (maxVal <= 24) return 25;
  if (maxVal <= 32) return 35;
  if (maxVal <= 50) return 55;
  return Math.ceil(maxVal * 1.15);
}

export default function SectionReviewChart() {
  const currentYear = Math.max(2026, new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear,  setSelectedYear]  = useState<number>(currentYear);
  const [stats,         setStats]         = useState<SectionStat[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [errored,       setErrored]       = useState(false);
  const [hoveredStat,   setHoveredStat]   = useState<SectionStat | null>(null);
  const [viewMode,      setViewMode]      = useState<ViewMode>('chart');
  const [sortMode,      setSortMode]      = useState<SortMode>('total');

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

  // Aggregate KPI metrics
  const grandTotal    = useMemo(() => stats.reduce((sum, s) => sum + s.total, 0), [stats]);
  const grandReviewed = useMemo(() => stats.reduce((sum, s) => sum + s.reviewed, 0), [stats]);
  const progressPct   = grandTotal > 0 ? Math.round((grandReviewed / grandTotal) * 100) : 0;
  const pendingCount  = Math.max(0, grandTotal - grandReviewed);

  const completedSectionsCount = useMemo(() => {
    return stats.filter(s => s.total > 0 && s.reviewed >= s.total).length;
  }, [stats]);

  // Sorted stats based on current sortMode
  const sortedStats = useMemo(() => {
    const copy = [...stats];
    switch (sortMode) {
      case 'pending':
        return copy.sort((a, b) => {
          const pendA = a.total - a.reviewed;
          const pendB = b.total - b.reviewed;
          if (pendB !== pendA) return pendB - pendA;
          return b.total - a.total;
        });
      case 'completed':
        return copy.sort((a, b) => {
          const pctA = a.total > 0 ? a.reviewed / a.total : 0;
          const pctB = b.total > 0 ? b.reviewed / b.total : 0;
          if (pctB !== pctA) return pctB - pctA;
          return b.total - a.total;
        });
      case 'name':
        return copy.sort((a, b) => a.label.localeCompare(b.label));
      case 'total':
      default:
        return copy.sort((a, b) => b.total - a.total);
    }
  }, [stats, sortMode]);

  const maxTotal   = useMemo(() => stats.reduce((max, s) => Math.max(max, s.total), 0), [stats]);
  const chartMax   = useMemo(() => calculateChartMax(maxTotal), [maxTotal]);
  const gridTicks  = useMemo(() => [1, 0.75, 0.5, 0.25, 0].map(f => Math.round(chartMax * f)), [chartMax]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.05)] overflow-hidden transition-all duration-300">
      
      {/* ── 1. Top Header Bar ─────────────────────────────────────────────── */}
      <div className="px-5 sm:px-7 py-4.5 bg-gradient-to-r from-blue-600/5 via-indigo-600/5 to-purple-600/5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        
        {/* Title & icon */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-500/25 flex-shrink-0">
            <BarChart3 size={22} className="relative z-10 stroke-[2.2]" />
            <div className="absolute inset-0 rounded-2xl bg-white/20 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
                Total Dokumen vs Sudah Direview
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-indigo-700 border border-indigo-200/60 shadow-xs">
                <Sparkles size={11} className="text-indigo-600 animate-spin" style={{ animationDuration: '6s' }} />
                <span>Statistik Section</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Perbandingan Status Review</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                {MONTH_NAMES_ID[selectedMonth]} {selectedYear}
              </span>
              {stats.length > 0 && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  <span className="text-slate-600 font-medium">{stats.length} Section Terdaftar</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Controls: View Switcher + Sort + Period (Bulan & Tahun Sejajar dalam 1 Baris) */}
        <div className="flex items-center gap-2 flex-nowrap overflow-x-auto pb-1 sm:pb-0 shrink-0">
          
          {/* Mode Switcher: Bar vs Grid Cards */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/70 shadow-inner shrink-0">
            <button
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'chart'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tampilkan grafik batang"
            >
              <BarChart3 size={13} />
              <span>Grafik</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tampilkan kartu grid per section"
            >
              <LayoutGrid size={13} />
              <span>Kartu</span>
            </button>
          </div>

          {/* Sort Selector */}
          <div className="relative shrink-0">
            <select
              value={sortMode}
              onChange={e => setSortMode(e.target.value as SortMode)}
              className="px-2.5 py-1.5 pr-6 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-all hover:border-slate-300 shadow-xs"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L2 4h8z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 7px center',
              }}
              title="Urutkan data"
            >
              <option value="total">Dokumen Terbanyak</option>
              <option value="pending">Belum Selesai</option>
              <option value="completed">% Paling Tuntas</option>
              <option value="name">Nama Section (A-Z)</option>
            </select>
          </div>

          {/* Unified Period Picker (Bulan & Tahun Sejajar dalam 1 Kapsul) */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden divide-x divide-slate-150 shrink-0">
            {/* Month */}
            <div className="relative flex items-center">
              <span className="pl-2.5 pr-1 text-slate-400 pointer-events-none">
                <Calendar size={13} />
              </span>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="py-1.5 pl-1 pr-6 bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='9' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L2 4h8z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 6px center',
                }}
              >
                {MONTH_NAMES_ID.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div className="relative flex items-center">
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="py-1.5 pl-2.5 pr-6 bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='9' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L2 4h8z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 6px center',
                }}
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

        </div>

      </div>

      {/* ── 2. Executive KPI Summary Cards ────────────────────────────────── */}
      <div className="px-5 sm:px-7 py-4 bg-slate-50/70 border-b border-slate-100">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Card 1: Total Dokumen */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 transition-transform hover:-translate-y-0.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
              <FileText size={20} className="stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Total Dokumen</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-slate-900">{grandTotal}</span>
                <span className="text-[11px] font-medium text-slate-400">Prosedur</span>
              </div>
            </div>
          </div>

          {/* Card 2: Sudah Direview */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 transition-transform hover:-translate-y-0.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <CheckCircle2 size={20} className="stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Sudah Direview</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-emerald-600">{grandReviewed}</span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.2 rounded-md">
                  {progressPct}%
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Belum Direview / Pending */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 transition-transform hover:-translate-y-0.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              pendingCount === 0
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                : 'bg-amber-50 text-amber-600 border border-amber-100'
            }`}>
              {pendingCount === 0 ? <Check size={20} className="stroke-[2.5]" /> : <Clock size={20} className="stroke-[2.2]" />}
            </div>
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Belum Selesai</p>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-lg font-black ${pendingCount === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {pendingCount}
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  {pendingCount === 0 ? 'Tuntas 100%' : 'Dokumen Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Section Tuntas */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 transition-transform hover:-translate-y-0.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
              <Award size={20} className="stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Section Tuntas</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-purple-700">{completedSectionsCount}</span>
                <span className="text-[11px] font-medium text-slate-500">
                  / {stats.length} Section
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── 3. Legend & Status Banner ───────────────────────────────────────── */}
      <div className="px-5 sm:px-7 py-3 bg-white border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 text-xs">
        
        {/* Interactive Legend */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <span className="w-3.5 h-3.5 rounded-md bg-gradient-to-t from-blue-600 via-indigo-600 to-sky-400 shadow-xs shadow-blue-500/20" />
            <span>Total Dokumen</span>
          </div>
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <span className="w-3.5 h-3.5 rounded-md bg-gradient-to-t from-emerald-600 via-teal-500 to-emerald-400 shadow-xs shadow-emerald-500/20" />
            <span>Sudah Direview</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-[11px]">
            <HelpCircle size={12} />
            <span>Arahkan kursor ke tiap section untuk melihat rincian</span>
          </div>
        </div>

        {/* Global Celebration / Alert Status */}
        {grandTotal > 0 && (
          <div className="flex items-center gap-2">
            {pendingCount === 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-emerald-500/10 via-teal-500/15 to-emerald-500/10 text-emerald-800 border border-emerald-300 shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                </span>
                <span>🎉 Seluruh Dokumen Telah Selesai Direview (100%)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-xs">
                <Clock size={12} className="text-amber-600 animate-spin" style={{ animationDuration: '8s' }} />
                <span>{pendingCount} dokumen dari {stats.length - completedSectionsCount} section belum selesai direview</span>
              </span>
            )}
          </div>
        )}

      </div>

      {/* ── 4. Main Content Area ────────────────────────────────────────────── */}
      <div className="p-5 sm:p-7 relative min-h-[300px]">
        {loading ? (
          /* Sleek Skeleton Loader */
          <div className="py-8">
            <div className="flex items-end justify-between gap-3" style={{ height: CHART_HEIGHT }}>
              {[65, 80, 45, 90, 70, 35, 60, 85, 50, 75, 40, 65].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full animate-pulse gap-2">
                  <div className="w-8 h-4 bg-slate-200 rounded-md" />
                  <div className="w-full max-w-[42px] bg-slate-100 rounded-t-xl flex items-end justify-center gap-1 p-1" style={{ height: `${h}%` }}>
                    <div className="w-3.5 bg-blue-200/70 rounded-t-md h-full" />
                    <div className="w-3.5 bg-emerald-200/70 rounded-t-md" style={{ height: `${h * 0.75}%` }} />
                  </div>
                  <div className="w-10 h-3 bg-slate-200 rounded-md mt-2" />
                </div>
              ))}
            </div>
            <p className="text-xs text-center text-slate-400 font-semibold mt-6 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              Menyusun data grafik & statistik section...
            </p>
          </div>
        ) : errored ? (
          <div className="py-14 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-3 border border-rose-100">
              <AlertCircle size={24} />
            </div>
            <p className="text-sm font-bold text-slate-800">Gagal Memuat Grafik Section</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Terjadi gangguan koneksi saat mengambil data statistik. Silakan refresh halaman atau coba sesaat lagi.
            </p>
          </div>
        ) : stats.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Layers size={26} />
            </div>
            <p className="text-sm font-bold text-slate-800">Tidak Ada Dokumen pada Periode Ini</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Belum ada prosedur yang dijadwalkan selesai review pada bulan {MONTH_NAMES_ID[selectedMonth]} {selectedYear}.
            </p>
          </div>
        ) : viewMode === 'cards' ? (

          /* ── VIEW MODE 2: KARTU GRID SECTION ───────────────────────────── */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 animate-in fade-in duration-300">
            {sortedStats.map((stat) => {
              const pct = stat.total > 0 ? Math.round((stat.reviewed / stat.total) * 100) : 0;
              const isComplete = stat.total > 0 && stat.reviewed >= stat.total;
              const pending = Math.max(0, stat.total - stat.reviewed);

              return (
                <div
                  key={stat.label}
                  className={`relative p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${
                    isComplete
                      ? 'bg-gradient-to-br from-white via-white to-emerald-50/30 border-emerald-200/80 shadow-xs'
                      : 'bg-white border-slate-200 shadow-xs hover:border-amber-300'
                  }`}
                >
                  {/* Top: Section Name & Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                        {stat.label}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Section Prosedur</p>
                    </div>
                    {isComplete ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Check size={11} className="stroke-[3]" /> Tuntas
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock size={10} /> {pending} Pending
                      </span>
                    )}
                  </div>

                  {/* Percentage Progress Bar */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-500">Progress</span>
                      <span className={isComplete ? 'text-emerald-600' : 'text-slate-800'}>
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isComplete
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : 'bg-gradient-to-r from-blue-600 via-indigo-500 to-teal-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats Bottom Breakdown */}
                  <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Total Dokumen:</span>
                      <span className="font-bold text-slate-800 text-xs">{stat.total}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block">Sudah Direview:</span>
                      <span className={`font-bold text-xs ${isComplete ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {stat.reviewed}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        ) : (

          /* ── VIEW MODE 1: MODERN BAR CHART ─────────────────────────────── */
          <div className="animate-in fade-in duration-300">
            
            <div className="flex">
              
              {/* Sumbu Y (Axis Values) */}
              <div
                className="flex flex-col justify-between text-[11px] font-bold text-slate-400 pr-3.5 select-none flex-shrink-0"
                style={{ height: CHART_HEIGHT }}
              >
                {gridTicks.map((tick, i) => (
                  <span key={i} className="leading-none text-right min-w-[22px]">
                    {tick}
                  </span>
                ))}
              </div>

              {/* Bar Plot + Gridlines Area */}
              <div className="flex-1 min-w-0 relative">
                
                {/* Horizontal Background Gridlines */}
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
                <div className="relative flex items-end justify-between gap-1 sm:gap-2" style={{ height: CHART_HEIGHT }}>
                  {sortedStats.map((stat, idx) => {
                    const totalPct    = chartMax > 0 ? Math.max((stat.total / chartMax) * 100, stat.total > 0 ? 8 : 0) : 0;
                    const reviewedPct = chartMax > 0 ? Math.max((stat.reviewed / chartMax) * 100, stat.reviewed > 0 ? 8 : 0) : 0;
                    const isHovered   = hoveredStat?.label === stat.label;
                    const isComplete  = stat.total > 0 && stat.reviewed >= stat.total;
                    const pending     = Math.max(0, stat.total - stat.reviewed);

                    return (
                      <div
                        key={stat.label || idx}
                        onMouseEnter={() => setHoveredStat(stat)}
                        onMouseLeave={() => setHoveredStat(null)}
                        className={`group relative flex-1 min-w-[36px] sm:min-w-[48px] h-full flex flex-col justify-end items-center cursor-pointer transition-all duration-200 ${
                          isHovered ? 'z-20 scale-102' : 'hover:scale-101'
                        }`}
                      >
                        {/* 🌟 Direct Value Indicator on top of the bars */}
                        <div className="mb-2 transition-transform duration-200 group-hover:-translate-y-1">
                          {isComplete ? (
                            <span
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold shadow-xs transition-all ${
                                isHovered
                                  ? 'bg-emerald-600 text-white scale-110 shadow-emerald-500/30'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                              }`}
                              title={`${stat.reviewed}/${stat.total} Selesai 100%`}
                            >
                              <Check size={10} className="stroke-[3]" />
                              <span>{stat.total}</span>
                            </span>
                          ) : pending > 0 ? (
                            <span
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-xs transition-all ${
                                isHovered
                                  ? 'bg-amber-600 text-white scale-110 shadow-amber-500/30'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200/80 animate-pulse'
                              }`}
                              title={`${pending} dokumen belum selesai`}
                            >
                              <Clock size={9} />
                              <span>{stat.reviewed}/{stat.total}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-500">
                              {stat.total}
                            </span>
                          )}
                        </div>

                        {/* Modern Translucent Bar Groove / Track */}
                        <div
                          className={`w-full max-w-[40px] sm:max-w-[48px] h-full rounded-t-2xl flex items-end justify-center gap-1.5 px-1 pb-0.5 transition-all duration-200 border-b-2 ${
                            isHovered
                              ? 'bg-gradient-to-t from-indigo-100/70 to-blue-50/40 border-blue-500 shadow-md ring-2 ring-blue-400/30'
                              : isComplete
                              ? 'bg-gradient-to-t from-emerald-50/40 to-slate-50/30 border-emerald-400/60 hover:bg-emerald-50/70'
                              : 'bg-gradient-to-t from-amber-50/40 to-slate-50/30 border-amber-400/60 hover:bg-slate-100/70'
                          }`}
                        >
                          {/* Bar 1: Total Dokumen (Indigo - Royal Blue Glow) */}
                          <div
                            className="relative flex-1 max-w-[15px] sm:max-w-[17px] rounded-t-lg bg-gradient-to-t from-blue-700 via-indigo-600 to-sky-400 shadow-[0_4px_12px_rgba(79,70,229,0.25)] transition-all duration-500 ease-out group-hover:brightness-110 flex items-start justify-center overflow-hidden"
                            style={{ height: `${totalPct}%` }}
                          >
                            {/* Inner Gloss / Highlight Line */}
                            <span className="w-full h-1 bg-white/50 rounded-t-lg" />
                            <span className="absolute inset-x-0 bottom-0 top-1 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                          </div>

                          {/* Bar 2: Sudah Direview (Emerald - Teal Radiant Glow) */}
                          <div
                            className="relative flex-1 max-w-[15px] sm:max-w-[17px] rounded-t-lg bg-gradient-to-t from-emerald-600 via-teal-500 to-emerald-400 shadow-[0_4px_12px_rgba(16,185,129,0.25)] transition-all duration-500 ease-out group-hover:brightness-110 flex items-start justify-center overflow-hidden"
                            style={{ height: `${reviewedPct}%` }}
                          >
                            <span className="w-full h-1 bg-white/50 rounded-t-lg" />
                            <span className="absolute inset-x-0 bottom-0 top-1 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                          </div>
                        </div>

                        {/* ── Rich Floating Glassmorphic Tooltip on Hover ───── */}
                        {isHovered && (
                          <div className="absolute bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2 z-40 pointer-events-none min-w-[210px] p-3.5 rounded-2xl bg-slate-900/95 text-white shadow-2xl backdrop-blur-md border border-slate-700/80 animate-in fade-in zoom-in-95 duration-150">
                            
                            {/* Header */}
                            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2.5">
                              <div>
                                <span className="font-extrabold text-xs text-white block">{stat.label}</span>
                                <span className="text-[10px] text-slate-400 font-medium">Section Prosedur</span>
                              </div>
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                  isComplete
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                }`}
                              >
                                {isComplete ? 'Tuntas 100%' : `${Math.round((stat.reviewed / stat.total) * 100)}%`}
                              </span>
                            </div>

                            {/* Mini Progress Bar inside Tooltip */}
                            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mb-2.5 flex">
                              <div
                                className={`h-full rounded-full ${
                                  isComplete
                                    ? 'bg-gradient-to-r from-emerald-400 to-teal-300'
                                    : 'bg-gradient-to-r from-blue-500 to-emerald-400'
                                }`}
                                style={{ width: `${Math.round((stat.reviewed / stat.total) * 100)}%` }}
                              />
                            </div>

                            {/* Details */}
                            <div className="space-y-1.5 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-blue-400 shadow-xs shadow-blue-400/50" />
                                  Total Dokumen:
                                </span>
                                <span className="font-bold text-white">{stat.total} Prosedur</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400/50" />
                                  Sudah Direview:
                                </span>
                                <span className="font-bold text-emerald-400">{stat.reviewed} Prosedur</span>
                              </div>
                              {pending > 0 && (
                                <div className="flex items-center justify-between pt-1.5 border-t border-slate-800 text-[11px]">
                                  <span className="text-amber-400 flex items-center gap-1 font-semibold">
                                    <Clock size={11} /> Belum Selesai:
                                  </span>
                                  <span className="font-extrabold text-amber-300">{pending} Dokumen</span>
                                </div>
                              )}
                            </div>

                            {/* Tooltip Arrow */}
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 border-r border-b border-slate-700/80" />
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>

                {/* ── Section Labels on X Axis ─────────────────────────────── */}
                <div className="flex pt-3 border-t-2 border-slate-200/80 justify-between gap-1 sm:gap-2">
                  {sortedStats.map((stat) => {
                    const isComplete = stat.total > 0 && stat.reviewed >= stat.total;
                    const isHovered  = hoveredStat?.label === stat.label;

                    return (
                      <div
                        key={stat.label}
                        onMouseEnter={() => setHoveredStat(stat)}
                        onMouseLeave={() => setHoveredStat(null)}
                        className={`flex-1 min-w-[36px] sm:min-w-[48px] text-center cursor-pointer transition-all duration-150 ${
                          isHovered ? 'scale-105' : 'hover:opacity-100'
                        }`}
                        title={stat.label}
                      >
                        {/* Ratio Pill */}
                        <div className="inline-flex items-center justify-center mb-1">
                          <span
                            className={`text-[9.5px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-md transition-colors ${
                              isHovered
                                ? 'bg-blue-600 text-white font-black shadow-xs'
                                : isComplete
                                ? 'bg-emerald-100 text-emerald-800 font-extrabold'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {stat.reviewed}/{stat.total}
                          </span>
                        </div>

                        {/* Section Name */}
                        <p
                          className={`text-[10.5px] sm:text-[11px] font-black truncate leading-tight transition-colors ${
                            isHovered
                              ? 'text-blue-600 underline underline-offset-2'
                              : isComplete
                              ? 'text-slate-800'
                              : 'text-amber-800'
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