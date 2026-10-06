// components/dashboard/OverallReviewCharts.tsx
//
// Dua Grafik Batang Dashboard Admin:
// 1. Total Dokumen vs Sudah Direview (Keseluruhan / Agregat Global tanpa per section)
// 2. Summary Dokumen yang Sudah Direview (Status: Relevan, Revisi, Obsolete)
//
// Mengimplementasikan kriteria review aktual PIC (dalam rentang 2 bulan).
// Dokumen yang otomatis Relevan karena sistem (2 bulan tidak direview)
// masuk ke kategori "Belum Direview".

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart2, CheckCircle2, RefreshCw, AlertOctagon,
  Clock, FileText, Calendar, Sparkles, PieChart,
  HelpCircle,
} from 'lucide-react';

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

interface OverallStats {
  month: number | 'all';
  monthName: string;
  totalDocuments: number;
  reviewedDocuments: number;
  unreviewedDocuments: number;
  reviewPercentage: number;
  summaryByStatus: {
    relevan: number;
    revisi: number;
    obsolete: number;
  };
  availableMonths: number[];
}

const BAR_CHART_HEIGHT = 190; // px

export default function OverallReviewCharts() {
  const currentYear = Math.max(2026, new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  const availableYears = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear; y >= 2026; y--) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  const loadStats = useCallback(async (month: string, year: string) => {
    setLoading(true);
    setErrored(false);
    try {
      const res = await fetch(`/review-prosedur/api/dashboard/overall-stats?month=${month}&year=${year}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Gagal memuat data statistik');
      const data: OverallStats = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error loading overall stats:', err);
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear, loadStats]);

  // Hitung skala maksimum untuk Grafik 1 (Total vs Sudah Direview)
  const maxValChart1 = useMemo(() => {
    if (!stats) return 10;
    const m = Math.max(stats.totalDocuments, stats.reviewedDocuments, stats.unreviewedDocuments);
    return m > 0 ? m : 10;
  }, [stats]);

  // Hitung skala maksimum untuk Grafik 2 (Summary Relevan, Revisi, Obsolete)
  const maxValChart2 = useMemo(() => {
    if (!stats) return 10;
    const { relevan, revisi, obsolete } = stats.summaryByStatus;
    const m = Math.max(relevan, revisi, obsolete);
    return m > 0 ? m : 10;
  }, [stats]);

  // Hitung persentase masing-masing status dari total yang sudah direview
  const reviewBreakdown = useMemo(() => {
    if (!stats || stats.reviewedDocuments === 0) {
      return { relevanPct: 0, revisiPct: 0, obsoletePct: 0 };
    }
    const total = stats.reviewedDocuments;
    return {
      relevanPct: Math.round((stats.summaryByStatus.relevan / total) * 100),
      revisiPct: Math.round((stats.summaryByStatus.revisi / total) * 100),
      obsoletePct: Math.round((stats.summaryByStatus.obsolete / total) * 100),
    };
  }, [stats]);

  return (
    <div className="space-y-4">
      {/* ── Filter Bar Bersama ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs px-5 py-3.5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <PieChart size={17} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Analisis Dokumen & Review Keseluruhan
            </h3>
            <p className="text-[11px] text-slate-400">
              Periode:{' '}
              <span className="font-semibold text-slate-600">
                {selectedYear === 'all' ? 'Semua Tahun' : `Tahun ${selectedYear}`} ·{' '}
                {selectedMonth === 'all'
                  ? 'Semua Bulan (Keseluruhan Dokumen)'
                  : `Bulan ${MONTH_NAMES_ID[Number(selectedMonth)]}`}
              </span>
            </p>
          </div>
        </div>

        {/* Dropdown Pemilihan Tahun & Bulan */}
        <div className="flex items-center gap-2.5 ml-auto flex-wrap">
          {/* Dropdown Tahun */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Tahun:</span>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="pl-3 pr-8 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-all shadow-2xs"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L2 4h8z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px center',
                }}
              >
                {availableYears.map(y => (
                  <option key={y} value={String(y)}>
                    {y === currentYear ? `${y} (Tahun Sekarang)` : `${y} (Riwayat)`}
                  </option>
                ))}
                {availableYears.length > 1 && (
                  <option value="all">Semua Tahun</option>
                )}
              </select>
            </div>
          </div>

          {/* Dropdown Bulan */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Bulan:</span>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Calendar size={13} />
              </div>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="pl-7.5 pr-8 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-all shadow-2xs"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L2 4h8z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px center',
                }}
              >
                <option value="all">Semua Bulan (Keseluruhan)</option>
                {MONTH_NAMES_ID.map((name, i) => (
                  <option key={i} value={String(i)}>
                    Bulan {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Grid 2 Grafik Batang ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ════════════════════════════════════════════════════════════════════
            GRAFIK 1: Total Dokumen vs Sudah Direview (Global Keseluruhan)
        ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all duration-300 hover:shadow-md">
          {/* Header Card */}
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 via-indigo-50/30 to-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <BarChart2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Total Dokumen vs Sudah Direview</h3>
              </div>
            </div>
            {stats && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                {stats.reviewPercentage}% Selesai
              </span>
            )}
          </div>

          {/* KPI Mini Pills */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/50">
            <div className="px-4 py-2.5 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Dokumen</p>
              <p className="text-sm font-bold text-slate-800">{loading ? '...' : stats?.totalDocuments ?? 0}</p>
            </div>
            <div className="px-4 py-2.5 text-center bg-emerald-50/30">
              <p className="text-[10px] uppercase font-bold text-emerald-600">Sudah Direview</p>
              <p className="text-sm font-bold text-emerald-700">{loading ? '...' : stats?.reviewedDocuments ?? 0}</p>
            </div>
            <div className="px-4 py-2.5 text-center bg-amber-50/30">
              <p className="text-[10px] uppercase font-bold text-amber-600">Belum Direview</p>
              <p className="text-sm font-bold text-amber-700">{loading ? '...' : stats?.unreviewedDocuments ?? 0}</p>
            </div>
          </div>

          {/* Grafik Batang Body */}
          <div className="p-6 flex-1 flex flex-col justify-between">
            {loading ? (
              <div className="h-56 flex items-center justify-center text-slate-400 text-xs">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2" />
                Memuat data grafik...
              </div>
            ) : errored ? (
              <div className="h-56 flex items-center justify-center text-rose-500 text-xs">
                Gagal memuat data grafik
              </div>
            ) : (
              <div className="w-full">
                {/* Visual Bars Container */}
                <div
                  className="flex items-end justify-around gap-6 pt-6 pb-2 border-b border-slate-200 relative"
                  style={{ height: BAR_CHART_HEIGHT }}
                >
                  {/* Grid garis referensi */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between opacity-30">
                    <div className="border-b border-dashed border-slate-300 w-full" />
                    <div className="border-b border-dashed border-slate-300 w-full" />
                    <div className="border-b border-dashed border-slate-300 w-full" />
                  </div>

                  {/* 1. Bar: Total Dokumen */}
                  {(() => {
                    const val = stats?.totalDocuments ?? 0;
                    const max = Math.max(maxValChart1, 1);
                    const barHeight = val > 0 ? Math.max(12, Math.round((val / max) * 135)) : 4;
                    const isHovered = hoveredBar === 'chart1-total';
                    return (
                      <div
                        className="flex-1 max-w-[84px] h-full flex flex-col justify-end items-center group cursor-pointer z-10 select-none"
                        onMouseEnter={() => setHoveredBar('chart1-total')}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        <span className="text-xs font-bold text-slate-800 mb-1.5 transition-transform group-hover:scale-110">
                          {val}
                        </span>
                        <div
                          className="w-full rounded-t-xl bg-gradient-to-t from-blue-600 via-indigo-600 to-indigo-500 shadow-md shadow-blue-500/25 transition-all duration-500 ease-out group-hover:brightness-110 group-hover:shadow-blue-500/40 relative"
                          style={{ height: `${barHeight}px` }}
                        >
                          <div className="w-full h-1 bg-white/30 rounded-t-xl" />
                          {isHovered && (
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded shadow-lg whitespace-nowrap z-30 pointer-events-none">
                              Total: {val} Dokumen (100%)
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2. Bar: Sudah Direview */}
                  {(() => {
                    const val = stats?.reviewedDocuments ?? 0;
                    const max = Math.max(maxValChart1, 1);
                    const barHeight = val > 0 ? Math.max(12, Math.round((val / max) * 135)) : 4;
                    const isHovered = hoveredBar === 'chart1-reviewed';
                    return (
                      <div
                        className="flex-1 max-w-[84px] h-full flex flex-col justify-end items-center group cursor-pointer z-10 select-none"
                        onMouseEnter={() => setHoveredBar('chart1-reviewed')}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        <span className="text-xs font-bold text-emerald-600 mb-1.5 transition-transform group-hover:scale-110">
                          {val}
                        </span>
                        <div
                          className="w-full rounded-t-xl bg-gradient-to-t from-emerald-600 via-teal-500 to-emerald-400 shadow-md shadow-emerald-500/25 transition-all duration-500 ease-out group-hover:brightness-110 group-hover:shadow-emerald-500/40 relative"
                          style={{ height: `${barHeight}px` }}
                        >
                          <div className="w-full h-1 bg-white/30 rounded-t-xl" />
                          {isHovered && (
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded shadow-lg whitespace-nowrap z-30 pointer-events-none">
                              Direview: {val} Dokumen ({stats?.reviewPercentage ?? 0}%)
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 3. Bar: Belum Direview */}
                  {(() => {
                    const val = stats?.unreviewedDocuments ?? 0;
                    const max = Math.max(maxValChart1, 1);
                    const barHeight = val > 0 ? Math.max(12, Math.round((val / max) * 135)) : 4;
                    const unreviewedPct = (stats?.totalDocuments ?? 0) > 0
                      ? Math.round((val / stats!.totalDocuments) * 100)
                      : 0;
                    const isHovered = hoveredBar === 'chart1-unreviewed';
                    return (
                      <div
                        className="flex-1 max-w-[84px] h-full flex flex-col justify-end items-center group cursor-pointer z-10 select-none"
                        onMouseEnter={() => setHoveredBar('chart1-unreviewed')}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        <span className="text-xs font-bold text-amber-600 mb-1.5 transition-transform group-hover:scale-110">
                          {val}
                        </span>
                        <div
                          className="w-full rounded-t-xl bg-gradient-to-t from-amber-500 via-amber-400 to-orange-400 shadow-md shadow-amber-500/25 transition-all duration-500 ease-out group-hover:brightness-110 group-hover:shadow-amber-500/40 relative"
                          style={{ height: `${barHeight}px` }}
                        >
                          <div className="w-full h-1 bg-white/30 rounded-t-xl" />
                          {isHovered && (
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded shadow-lg whitespace-nowrap z-30 pointer-events-none">
                              Belum Direview: {val} Dokumen ({unreviewedPct}%)
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Legend & Labels Bawah */}
                <div className="flex items-center justify-around gap-2 pt-3">
                  <div className="text-center flex-1">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      <p className="text-xs font-semibold text-slate-700">Total Dokumen</p>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Keseluruhan</p>
                  </div>
                  <div className="text-center flex-1">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <p className="text-xs font-semibold text-emerald-700">Sudah Direview</p>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{stats?.reviewPercentage}% dari total</p>
                  </div>
                  <div className="text-center flex-1">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <p className="text-xs font-semibold text-amber-700">Belum Direview</p>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Termasuk auto-expire</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            GRAFIK 2: Summary Dokumen yang Sudah Direview (Relevan/Revisi/Obsolete)
        ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all duration-300 hover:shadow-md">
          {/* Header Card */}
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/60 via-teal-50/30 to-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Summary Dokumen Sudah Direview</h3>
              </div>
            </div>
            {stats && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                {stats.reviewedDocuments} Dokumen
              </span>
            )}
          </div>

          {/* KPI Mini Pills Status */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/50">
            <div className="px-4 py-2.5 text-center bg-emerald-50/30">
              <p
                className="text-[10px] uppercase font-bold text-emerald-600"
                title="Dokumen yang tidak pernah berstatus Revisi atau Obsolete"
              >
                Relevan
              </p>
              <p className="text-sm font-bold text-emerald-700">
                {loading ? '...' : stats?.summaryByStatus.relevan ?? 0}
                <span className="text-[10px] font-normal text-emerald-500 ml-1">({reviewBreakdown.relevanPct}%)</span>
              </p>
            </div>
            <div className="px-4 py-2.5 text-center bg-amber-50/30">
              <p
                className="text-[10px] uppercase font-bold text-amber-600"
                title="Dokumen yang pernah berstatus atau memiliki riwayat revisi"
              >
                Pernah Revisi
              </p>
              <p className="text-sm font-bold text-amber-700">
                {loading ? '...' : stats?.summaryByStatus.revisi ?? 0}
                <span className="text-[10px] font-normal text-amber-500 ml-1">({reviewBreakdown.revisiPct}%)</span>
              </p>
            </div>
            <div className="px-4 py-2.5 text-center bg-rose-50/30">
              <p
                className="text-[10px] uppercase font-bold text-rose-600"
                title="Dokumen yang pernah berstatus Obsolete"
              >
                Pernah Obsolete
              </p>
              <p className="text-sm font-bold text-rose-700">
                {loading ? '...' : stats?.summaryByStatus.obsolete ?? 0}
                <span className="text-[10px] font-normal text-rose-500 ml-1">({reviewBreakdown.obsoletePct}%)</span>
              </p>
            </div>
          </div>

          {/* Grafik Batang Body */}
          <div className="p-6 flex-1 flex flex-col justify-between">
            {loading ? (
              <div className="h-56 flex items-center justify-center text-slate-400 text-xs">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mr-2" />
                Memuat data grafik...
              </div>
            ) : errored ? (
              <div className="h-56 flex items-center justify-center text-rose-500 text-xs">
                Gagal memuat data grafik
              </div>
            ) : stats?.reviewedDocuments === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-center px-4">
                <FileText size={36} className="text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">Belum ada dokumen yang direview</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pada periode {stats?.monthName}, belum ada review aktual yang disubmit oleh PIC
                </p>
              </div>
            ) : (
              <div className="w-full">
                {/* Visual Bars Container */}
                <div
                  className="flex items-end justify-around gap-6 pt-6 pb-2 border-b border-slate-200 relative"
                  style={{ height: BAR_CHART_HEIGHT }}
                >
                  {/* Grid garis referensi */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between opacity-30">
                    <div className="border-b border-dashed border-slate-300 w-full" />
                    <div className="border-b border-dashed border-slate-300 w-full" />
                    <div className="border-b border-dashed border-slate-300 w-full" />
                  </div>

                  {/* 1. Bar: RELEVAN */}
                  {(() => {
                    const val = stats?.summaryByStatus.relevan ?? 0;
                    const max = Math.max(maxValChart2, 1);
                    const barHeight = val > 0 ? Math.max(12, Math.round((val / max) * 135)) : 4;
                    const isHovered = hoveredBar === 'chart2-relevan';
                    return (
                      <div
                        className="flex-1 max-w-[84px] h-full flex flex-col justify-end items-center group cursor-pointer z-10 select-none"
                        onMouseEnter={() => setHoveredBar('chart2-relevan')}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        <span className="text-xs font-bold text-emerald-600 mb-1.5 transition-transform group-hover:scale-110">
                          {val}
                        </span>
                        <div
                          className="w-full rounded-t-xl bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400 shadow-md shadow-emerald-500/25 transition-all duration-500 ease-out group-hover:brightness-110 group-hover:shadow-emerald-500/40 relative"
                          style={{ height: `${barHeight}px` }}
                        >
                          <div className="w-full h-1 bg-white/30 rounded-t-xl" />
                          {isHovered && (
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded shadow-lg whitespace-nowrap z-30 pointer-events-none">
                              Relevan (Belum Pernah Revisi): {val} Dokumen ({reviewBreakdown.relevanPct}%)
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2. Bar: REVISI */}
                  {(() => {
                    const val = stats?.summaryByStatus.revisi ?? 0;
                    const max = Math.max(maxValChart2, 1);
                    const barHeight = val > 0 ? Math.max(12, Math.round((val / max) * 135)) : 4;
                    const isHovered = hoveredBar === 'chart2-revisi';
                    return (
                      <div
                        className="flex-1 max-w-[84px] h-full flex flex-col justify-end items-center group cursor-pointer z-10 select-none"
                        onMouseEnter={() => setHoveredBar('chart2-revisi')}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        <span className="text-xs font-bold text-amber-600 mb-1.5 transition-transform group-hover:scale-110">
                          {val}
                        </span>
                        <div
                          className="w-full rounded-t-xl bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-400 shadow-md shadow-amber-500/25 transition-all duration-500 ease-out group-hover:brightness-110 group-hover:shadow-amber-500/40 relative"
                          style={{ height: `${barHeight}px` }}
                        >
                          <div className="w-full h-1 bg-white/30 rounded-t-xl" />
                          {isHovered && (
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded shadow-lg whitespace-nowrap z-30 pointer-events-none">
                              Pernah Revisi: {val} Dokumen ({reviewBreakdown.revisiPct}%)
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 3. Bar: OBSOLETE */}
                  {(() => {
                    const val = stats?.summaryByStatus.obsolete ?? 0;
                    const max = Math.max(maxValChart2, 1);
                    const barHeight = val > 0 ? Math.max(12, Math.round((val / max) * 135)) : 4;
                    const isHovered = hoveredBar === 'chart2-obsolete';
                    return (
                      <div
                        className="flex-1 max-w-[84px] h-full flex flex-col justify-end items-center group cursor-pointer z-10 select-none"
                        onMouseEnter={() => setHoveredBar('chart2-obsolete')}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        <span className="text-xs font-bold text-rose-600 mb-1.5 transition-transform group-hover:scale-110">
                          {val}
                        </span>
                        <div
                          className="w-full rounded-t-xl bg-gradient-to-t from-rose-600 via-rose-500 to-red-400 shadow-md shadow-rose-500/25 transition-all duration-500 ease-out group-hover:brightness-110 group-hover:shadow-rose-500/40 relative"
                          style={{ height: `${barHeight}px` }}
                        >
                          <div className="w-full h-1 bg-white/30 rounded-t-xl" />
                          {isHovered && (
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded shadow-lg whitespace-nowrap z-30 pointer-events-none">
                              Pernah Obsolete: {val} Dokumen ({reviewBreakdown.obsoletePct}%)
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Legend & Labels Bawah */}
                <div className="flex items-center justify-around gap-2 pt-3">
                  <div className="text-center flex-1">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <p className="text-xs font-semibold text-emerald-700">Relevan</p>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Tidak pernah revisi</p>
                  </div>
                  <div className="text-center flex-1">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <p className="text-xs font-semibold text-amber-700">Pernah Revisi</p>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{reviewBreakdown.revisiPct}% dari review</p>
                  </div>
                  <div className="text-center flex-1">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <p className="text-xs font-semibold text-rose-700">Pernah Obsolete</p>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{reviewBreakdown.obsoletePct}% dari review</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Catatan Aturan Review ────────────────────────────────────────── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-500 flex items-start gap-2">
        <HelpCircle size={15} className="text-slate-400 mt-0.5 shrink-0" />
        <p>
          <span className="font-semibold text-slate-700">Catatan Kriteria Review:</span> Dokumen dihitung sebagai{' '}
          <span className="font-semibold text-emerald-700">"Sudah Direview"</span> apabila PIC memberikan status (Relevan, Revisi, atau Obsolete) dalam rentang siklus 2 bulan review. Dokumen yang statusnya otomatis berubah menjadi Relevan oleh sistem karena batas waktu 2 bulan terlampaui tanpa aksi PIC{' '}
          <span className="font-semibold text-slate-700">tidak dihitung</span> sebagai sudah direview (masuk kategori Belum Direview).
        </p>
      </div>
    </div>
  );
}
