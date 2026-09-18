// components/dashboard/SectionReviewChart.tsx
//
// Bar chart VERTIKAL "Total Dokumen vs Sudah Direview per Section", dipakai
// di app/home/page.tsx (admin) dan app/pic-dashboard/page.tsx (PIC) — datanya
// sama untuk semua orang (bukan spesifik satu PIC), jadi komponen ini
// sepenuhnya self-contained: dropdown bulan sendiri, fetch sendiri, tidak
// butuh prop apapun dari parent.
//
// 🆕 Dirombak: area bar (+ gridline) sekarang dikunci dalam kontainer tinggi
// tetap yang TERPISAH dari baris label di bawahnya — supaya sumbu Y selalu
// pas sejajar dengan puncak/dasar bar, tidak terpengaruh tinggi label. Label
// section TIDAK lagi dirotasi diagonal (rawan terpotong oleh overflow-hidden
// card) — sekarang horizontal, dipotong rapi dengan ellipsis kalau kepanjangan
// (nama lengkap tetap muncul lewat tooltip saat hover). Badge persentase per
// kolom dan ringkasan persentase di header dihapus — diganti angka
// "direview/total" polos yang selalu tampil.
//
// Kolom otomatis membagi rata lebar container (flex-1) supaya SEMUA section
// langsung terlihat tanpa perlu scroll, berapapun jumlahnya.
//
// Sengaja TIDAK pakai library chart (recharts/chart.js/dll) supaya tidak
// menambah dependency baru — semua digambar manual pakai div + Tailwind.
'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart3 } from 'lucide-react';

const MONTH_NAMES_ID = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];

interface SectionStat {
  label: string;
  total: number;
  reviewed: number;
}

const selectCls =
  'pl-3.5 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-all ' +
  'hover:border-slate-300 shadow-sm';

const dropdownStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L2 4h8z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat' as const,
  backgroundPosition: 'right 12px center',
};

const CHART_HEIGHT = 176; // area plotting bar (px) — dikunci, terpisah dari label

function niceMax(value: number): number {
  if (value <= 0) return 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  let niceNormalized;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;
  return niceNormalized * magnitude;
}

// Bar saja (Total + Sudah Direview) — hidup di dalam kontainer tinggi tetap
// CHART_HEIGHT, sejajar persis dengan gridline & sumbu Y.
function SectionBars({ stat, maxValue }: { stat: SectionStat; maxValue: number }) {
  const totalHeightPct    = maxValue > 0 ? Math.max((stat.total / maxValue) * 100, stat.total > 0 ? 3 : 0) : 0;
  const reviewedHeightPct = maxValue > 0 ? Math.max((stat.reviewed / maxValue) * 100, stat.reviewed > 0 ? 3 : 0) : 0;

  return (
    <div
      className="group flex-1 min-w-0 h-full flex items-end justify-center gap-[3px] px-1"
      title={`${stat.label} — Total: ${stat.total}, Sudah direview: ${stat.reviewed}`}
    >
      <div className="relative w-2.5 sm:w-3 h-full rounded-t-md bg-slate-100 flex items-end overflow-hidden">
        <div
          className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-500 ease-out group-hover:brightness-110"
          style={{ height: `${totalHeightPct}%` }}
        />
      </div>
      <div className="relative w-2.5 sm:w-3 h-full rounded-t-md bg-slate-100 flex items-end overflow-hidden">
        <div
          className="w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-500 ease-out group-hover:brightness-110"
          style={{ height: `${reviewedHeightPct}%` }}
        />
      </div>
    </div>
  );
}

// Label + angka di bawah bar — HORIZONTAL, dipotong rapi (bukan dirotasi).
function SectionLabel({ stat }: { stat: SectionStat }) {
  return (
    <div className="flex-1 min-w-0 px-1 pt-2 text-center" title={stat.label}>
      <p className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
        {stat.reviewed}/{stat.total}
      </p>
      <p className="text-[10px] font-semibold text-slate-600 truncate">
        {stat.label}
      </p>
    </div>
  );
}

export default function SectionReviewChart() {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [stats, setStats] = useState<SectionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  const loadStats = useCallback(async (month: number) => {
    setLoading(true);
    setErrored(false);
    try {
      const res = await fetch(`/review-prosedur/api/dashboard/section-stats?month=${month}`, { cache: 'no-store' });
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

  useEffect(() => { loadStats(selectedMonth); }, [selectedMonth, loadStats]);

  const maxTotal  = useMemo(() => stats.reduce((max, s) => Math.max(max, s.total), 0), [stats]);
  const chartMax  = useMemo(() => niceMax(maxTotal), [maxTotal]);
  const gridTicks = useMemo(() => [1, 0.75, 0.5, 0.25, 0].map(f => Math.round(chartMax * f)), [chartMax]);

  const grandTotal    = stats.reduce((sum, s) => sum + s.total, 0);
  const grandReviewed = stats.reduce((sum, s) => sum + s.reviewed, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-gradient-to-r from-blue-50/60 via-white to-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-200">
            <BarChart3 size={18} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 leading-tight">Total Dokumen vs Sudah Direview</h2>
            <p className="text-[11px] text-slate-400">Per section / departemen — {MONTH_NAMES_ID[selectedMonth]}</p>
          </div>
        </div>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(Number(e.target.value))}
          className={selectCls}
          style={dropdownStyle}
        >
          {MONTH_NAMES_ID.map((name, i) => (
            <option key={i} value={i}>{name}</option>
          ))}
        </select>
      </div>

      {/* Legend + ringkasan */}
      <div className="px-6 pt-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-blue-600 to-blue-400" /> Total Dokumen
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-emerald-600 to-emerald-400" /> Sudah Direview
          </span>
        </div>
        {grandTotal > 0 && (
          <span className="text-xs font-semibold text-slate-500">
            {grandReviewed}/{grandTotal} dokumen sudah direview bulan ini
          </span>
        )}
      </div>

      {/* Chart area */}
      <div className="px-6 pb-6 pt-4">
        {loading ? (
          <div className="py-14 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Memuat data...</p>
          </div>
        ) : errored ? (
          <p className="text-xs text-red-500 text-center py-10">Gagal memuat data. Silakan refresh halaman.</p>
        ) : stats.length === 0 ? (
          <div className="text-center py-10">
            <BarChart3 size={32} className="mx-auto mb-2 text-slate-200" />
            <p className="text-xs text-slate-400">Tidak ada dokumen untuk bulan {MONTH_NAMES_ID[selectedMonth]}.</p>
          </div>
        ) : (
          <div className="flex">
            {/* Sumbu Y — tinggi PERSIS CHART_HEIGHT, jadi selalu sejajar dengan bar */}
            <div
              className="flex flex-col justify-between text-[10px] text-slate-400 pr-2 flex-shrink-0"
              style={{ height: CHART_HEIGHT }}
            >
              {gridTicks.map((tick, i) => <span key={i} className="leading-none">{tick}</span>)}
            </div>

            {/* Plot + label */}
            <div className="flex-1 min-w-0">
              {/* Area bar — tinggi tetap, gridline & bar dikunci absolute di sini SAJA */}
              <div className="relative" style={{ height: CHART_HEIGHT }}>
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {gridTicks.map((_, i) => (
                    <div key={i} className={`w-full border-t ${i === gridTicks.length - 1 ? 'border-slate-300' : 'border-slate-100'}`} />
                  ))}
                </div>
                <div className="absolute inset-0 flex items-end">
                  {stats.map(stat => (
                    <SectionBars key={stat.label} stat={stat} maxValue={chartMax} />
                  ))}
                </div>
              </div>

              {/* Label — di LUAR kontainer bar, tidak memengaruhi tinggi/alignment sumbu Y */}
              <div className="flex">
                {stats.map(stat => (
                  <SectionLabel key={stat.label} stat={stat} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}