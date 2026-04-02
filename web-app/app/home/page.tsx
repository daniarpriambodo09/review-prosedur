// app/home/page.tsx
'use client';
import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/procedures/header';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { getAllProcedures, ProcedureDocument, StatusType } from '@/data/procedures/all-procedures';

const MONTH_NAMES_ID = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];
const MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface Activity {
  id: number;
  userId: number | null;
  username: string;
  activityType: string;
  activityDescription: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
}

// ─── Status Badge — semua 8 status ───────────────────────────────────────────
function StatusBadge({ status }: { status: StatusType }) {
  const styles: Record<StatusType, { bg: string; text: string; border: string; icon: string }> = {
    Relevan:          { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '✓'  },
    Revisi:           { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: '⟳'  },
    Obsolete:         { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     icon: '⊘'  },
    Menunggu:         { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    icon: '⏳' },
    'Belum dikirim':  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  icon: '📋' },
    'Telah terkirim': { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',    icon: '📨' },
    'Telah dibaca':   { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  icon: '👁️' },
    '-':              { bg: 'bg-slate-50',   text: 'text-slate-500',   border: 'border-slate-200',   icon: '–'  },
  };
  const s = styles[status] ?? styles['-'];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${s.bg} ${s.text} ${s.border}`}>
      {s.icon} {status}
    </span>
  );
}

// ─── Stat Card biasa ──────────────────────────────────────────────────────────
function StatCard({
  title, value, icon, color,
}: {
  title: string; value: number; icon: React.ReactNode;
  color: 'blue' | 'green' | 'amber' | 'slate' | 'red';
}) {
  const colorClasses = {
    blue:  'bg-blue-50    text-blue-600    border-blue-200',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    amber: 'bg-amber-50   text-amber-600   border-amber-200',
    slate: 'bg-slate-50   text-slate-600   border-slate-200',
    red:   'bg-red-50     text-red-600     border-red-200',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
    </div>
  );
}

// ─── Card khusus ke-4: Belum Review (breakdown 3 sub-status) ─────────────────
function PendingReviewCard({
  menunggu, terkirim, terbaca,
}: {
  menunggu: number; terkirim: number; terbaca: number;
}) {
  const total = menunggu + terkirim + terbaca;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-slate-600 mb-1">Belum Direview</p>
          <p className="text-3xl font-bold text-slate-900">{total}</p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 text-slate-600 border border-slate-200">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Month Filter ─────────────────────────────────────────────────────────────
function MonthFilter({
  value, onChange, availableMonths,
}: {
  value: number;
  onChange: (m: number) => void;
  availableMonths: number[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-600 font-medium whitespace-nowrap">Filter bulan:</span>
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231f2937' d='M6 8L2 4h8z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
        }}
      >
        {MONTH_NAMES_ID.map((name, i) => (
          <option key={i} value={i} disabled={!availableMonths.includes(i)}>
            {name}{!availableMonths.includes(i) ? ' (kosong)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Activity Type Badge ──────────────────────────────────────────────────────
function ActivityTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    login: 'bg-blue-100 text-blue-700', logout: 'bg-slate-100 text-slate-700',
    upload: 'bg-green-100 text-green-700', download: 'bg-cyan-100 text-cyan-700',
    review: 'bg-purple-100 text-purple-700', archive: 'bg-amber-100 text-amber-700',
    restore: 'bg-emerald-100 text-emerald-700', delete: 'bg-red-100 text-red-700',
    create: 'bg-indigo-100 text-indigo-700', update: 'bg-orange-100 text-orange-700',
  };
  const typeLabels: Record<string, string> = {
    login: '🔐 LOGIN', logout: '🚪 LOGOUT', upload: '📤 UPLOAD',
    download: '📥 DOWNLOAD', review: '✅ REVIEW', archive: '📦 ARCHIVE',
    restore: '↺ RESTORE', delete: '🗑️ DELETE', create: '➕ CREATE', update: '✏️ UPDATE',
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${styles[type] || 'bg-slate-100 text-slate-700'}`}>
      {typeLabels[type] || type.toUpperCase()}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [procedures,       setProcedures]       = useState<ProcedureDocument[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [selectedMonth,    setSelectedMonth]    = useState<number>(new Date().getMonth());
  const [activityPage,     setActivityPage]     = useState(1);
  const ACTIVITIES_PER_PAGE = 8;

  useEffect(() => {
    const load = async () => {
      try {
        const procs = await getAllProcedures();
        setProcedures(procs);
        const actRes = await fetch('/api/activities?limit=100');
        if (actRes.ok) setRecentActivities(await actRes.json());
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Bulan yang punya dokumen
  const availableMonths = useMemo(() => {
    const months = new Set<number>();
    procedures.forEach(p => {
      const d = new Date(p.tanggalSelesaiApproval);
      if (!isNaN(d.getTime())) months.add(d.getMonth());
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [procedures]);

  // Dokumen yang terfilter berdasarkan bulan yang dipilih
  const filteredDocs = useMemo(() =>
    procedures.filter(p => {
      const d = new Date(p.tanggalSelesaiApproval);
      return !isNaN(d.getTime()) && d.getMonth() === selectedMonth;
    }),
  [procedures, selectedMonth]);

  // Semua stats mengikuti filter bulan
  const stats = useMemo(() => ({
    total:    filteredDocs.length,
    relevan:  filteredDocs.filter(p => p.status === 'Relevan').length,
    revisi:   filteredDocs.filter(p => p.status === 'Revisi').length,
    obsolete: filteredDocs.filter(p => p.status === 'Obsolete').length,
    // Card ke-4: breakdown 3 sub-status "belum review"
    menunggu:  filteredDocs.filter(p => ['Menunggu', 'Belum dikirim', '-'].includes(p.status)).length,
    terkirim:  filteredDocs.filter(p => p.status === 'Telah terkirim').length,
    terbaca:   filteredDocs.filter(p => p.status === 'Telah dibaca').length,
  }), [filteredDocs]);

  // Progress review
  const reviewProgress = useMemo(() => {
    if (filteredDocs.length === 0) return 0;
    if (filteredDocs.every(d => d.status === 'Relevan')) return 100;
    return Math.round(
      (filteredDocs.filter(d => d.status === 'Relevan').length / filteredDocs.length) * 100
    );
  }, [filteredDocs]);

  // Pagination aktivitas
  const totalActivityPages  = Math.ceil(recentActivities.length / ACTIVITIES_PER_PAGE);
  const activityStart       = (activityPage - 1) * ACTIVITIES_PER_PAGE;
  const activityEnd         = Math.min(activityStart + ACTIVITIES_PER_PAGE, recentActivities.length);
  const paginatedActivities = recentActivities.slice(activityStart, activityEnd);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  const selectedMonthName = MONTH_NAMES_ID[selectedMonth];
  const isCurrentMonth    = selectedMonth === new Date().getMonth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <Header />

        <div className="max-w-7xl mx-auto px-8 py-8">

          {/* Welcome + filter bulan di sini — memengaruhi semua di bawahnya */}
          <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-1">Dashboard Admin</h1>
              <p className="text-slate-600">Selamat datang di sistem Review Prosedur Quality Management System</p>
            </div>
            {/* Filter bulan utama — di sini, mempengaruhi SEMUA card & daftar */}
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <MonthFilter
                value={selectedMonth}
                onChange={m => { setSelectedMonth(m); setActivityPage(1); }}
                availableMonths={availableMonths}
              />
              {isCurrentMonth && (
                <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                  Bulan ini
                </span>
              )}
            </div>
          </div>

          {/* Stats — semua mengikuti filter bulan */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title={`Total Dokumen · ${MONTH_NAMES_SHORT[selectedMonth]}`}
              value={stats.total}
              color="blue"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <StatCard
              title="Relevan"
              value={stats.relevan}
              color="green"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              title="Revisi"
              value={stats.revisi}
              color="amber"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
            />
            {/* Card ke-4 — breakdown Menunggu + Telah terkirim + Telah dibaca */}
            <PendingReviewCard
              menunggu={stats.menunggu}
              terkirim={stats.terkirim}
              terbaca={stats.terbaca}
            />
          </div>

          {/* Daftar dokumen — mengikuti filter bulan */}
          <div className="mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-slate-200">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="font-bold text-lg text-slate-900">
                    📅 Dokumen Bulan {selectedMonthName}
                  </h2>
                  <span className="text-xs text-slate-500 font-medium">
                    {filteredDocs.length} dokumen
                  </span>
                </div>
              </div>

              {/* Progress */}
              <div className="px-6 pt-5 pb-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600">
                    Progress Review{' '}
                    <span className="text-slate-400">
                      ({filteredDocs.filter(d => d.status === 'Relevan').length}/{filteredDocs.length} Relevan)
                    </span>
                  </span>
                  <span className={`text-sm font-bold ${reviewProgress === 100 ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {reviewProgress}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      reviewProgress === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${reviewProgress}%` }}
                  />
                </div>
                {reviewProgress === 100 && filteredDocs.length > 0 && (
                  <p className="text-xs text-emerald-600 mt-2 font-medium">
                    ✓ Semua dokumen bulan {selectedMonthName} sudah berstatus Relevan
                  </p>
                )}
              </div>

              {/* List */}
              <div className="px-6 pb-6 pt-2">
                {filteredDocs.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-auto pr-1">
                    {filteredDocs.map(doc => (
                      <div key={doc.nomorDokumen}
                        className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="text-sm font-medium text-slate-900 truncate">{doc.namaDokumen}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{doc.nomorDokumen} · {doc.pic}</p>
                        </div>
                        <StatusBadge status={doc.status} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <svg className="w-14 h-14 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-slate-500 text-sm font-medium">Tidak ada dokumen untuk bulan {selectedMonthName}</p>
                    <p className="text-slate-400 text-xs mt-1">Pilih bulan lain menggunakan filter di atas</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Aktivitas terbaru */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <h2 className="font-bold text-lg text-slate-900">🕐 Aktivitas Terbaru</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Waktu','Aktivitas','User','Type'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedActivities.length > 0 ? (
                    paginatedActivities.map(act => (
                      <tr key={act.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">
                          {new Date(act.createdAt).toLocaleString('id-ID', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td className="px-5 py-3 text-sm font-medium text-slate-900">{act.activityDescription}</td>
                        <td className="px-5 py-3 text-sm text-slate-600">{act.username || 'System'}</td>
                        <td className="px-5 py-3"><ActivityTypeBadge type={act.activityType} /></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-500">
                        <svg className="w-16 h-16 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Belum ada aktivitas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalActivityPages > 1 && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Menampilkan <span className="font-semibold">{activityStart + 1}</span>–
                  <span className="font-semibold">{activityEnd}</span> dari{' '}
                  <span className="font-semibold">{recentActivities.length}</span> aktivitas
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                    disabled={activityPage === 1}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95">
                    ← Sebelumnya
                  </button>
                  <span className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">
                    {activityPage} / {totalActivityPages}
                  </span>
                  <button onClick={() => setActivityPage(p => Math.min(totalActivityPages, p + 1))}
                    disabled={activityPage >= totalActivityPages}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95">
                    Berikutnya →
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}