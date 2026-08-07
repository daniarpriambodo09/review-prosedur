// app/home/page.tsx
'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { getAllProcedures, ProcedureDocument, StatusType } from '@/data/procedures/all-procedures';
import { useAuth } from '@/contexts/AuthContext';
import DocumentModal from '@/components/documents/DocumentModal';
import EmailScheduleModal from '@/components/status-review/EmailScheduleModal';
import {
  FileText, CheckCircle2, RefreshCw, Clock, TrendingUp,
  Plus, CalendarClock, Archive, Users, Settings, Activity,
  ChevronRight, Calendar,
} from 'lucide-react';

const MONTH_NAMES_ID = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];
const MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

interface ActivityLog {
  id: number;
  userId: number | null;
  username: string;
  activityType: string;
  activityDescription: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: StatusType }) {
  const styles: Record<StatusType, { bg: string; text: string; dot: string }> = {
    Relevan:          { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    Revisi:           { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
    Obsolete:         { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500'     },
    Menunggu:         { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
    'Belum dikirim':  { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500'  },
    'Telah terkirim': { bg: 'bg-cyan-50',    text: 'text-cyan-700',    dot: 'bg-cyan-500'    },
    'Telah dibaca':   { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-500'  },
    '-':              { bg: 'bg-slate-50',   text: 'text-slate-500',   dot: 'bg-slate-400'   },
  };
  const s = styles[status] ?? styles['-'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}
function KpiCard({ title, value, subtitle, icon, iconBg, iconColor }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900 leading-none">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1.5">{subtitle}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Activity Type config ─────────────────────────────────────────────────────
const ACTIVITY_TYPE_CONFIG: Record<string, { label: string; badgeCls: string; dot: string }> = {
  login:            { label: 'Login',           badgeCls: 'bg-blue-100 text-blue-700',      dot: 'bg-blue-500'    },
  logout:           { label: 'Logout',          badgeCls: 'bg-slate-100 text-slate-600',    dot: 'bg-slate-400'   },
  upload:           { label: 'Upload',          badgeCls: 'bg-green-100 text-green-700',    dot: 'bg-green-500'   },
  download:         { label: 'Download',        badgeCls: 'bg-cyan-100 text-cyan-700',      dot: 'bg-cyan-500'    },
  review:           { label: 'Review',          badgeCls: 'bg-purple-100 text-purple-700',  dot: 'bg-purple-500'  },
  archive:          { label: 'Archive',         badgeCls: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-500'   },
  restore:          { label: 'Restore',         badgeCls: 'bg-emerald-100 text-emerald-700',dot: 'bg-emerald-500' },
  delete:           { label: 'Delete',          badgeCls: 'bg-red-100 text-red-700',        dot: 'bg-red-500'     },
  create:           { label: 'Create',          badgeCls: 'bg-indigo-100 text-indigo-700',  dot: 'bg-indigo-500'  },
  update:           { label: 'Update',          badgeCls: 'bg-orange-100 text-orange-700',  dot: 'bg-orange-500'  },
  request_review:   { label: 'Request Review',  badgeCls: 'bg-teal-100 text-teal-700',      dot: 'bg-teal-500'    },
  request_document: { label: 'Request Dokumen', badgeCls: 'bg-sky-100 text-sky-700',        dot: 'bg-sky-500'     },
};

function normalizeActivityType(t: string): string {
  return t === 'request_download' ? 'request_document' : t;
}

function ActivityTypeBadge({ type }: { type: string }) {
  const normalized = normalizeActivityType(type);
  const cfg = ACTIVITY_TYPE_CONFIG[normalized];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg?.badgeCls ?? 'bg-slate-100 text-slate-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg?.dot ?? 'bg-slate-400'}`} />
      {cfg?.label ?? normalized}
    </span>
  );
}

// ─── Dropdown style ───────────────────────────────────────────────────────────
const selectCls =
  'pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-all';
const dropdownStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231f2937' d='M6 8L2 4h8z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat' as const,
  backgroundPosition: 'right 10px center',
};

// ─── Quick Action Card ────────────────────────────────────────────────────────
function QuickActionButton({
  onClick, icon, label, description, color,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left w-full"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">{label}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <ChevronRight size={14} className="ml-auto text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
    </button>
  );
}

function QuickActionLink({
  href, icon, label, description, color,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
}) {
  return (
    <a
      href={href}
      className="group flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">{label}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <ChevronRight size={14} className="ml-auto text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
    </a>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user } = useAuth();
  const [procedures,         setProcedures]         = useState<ProcedureDocument[]>([]);
  const [recentActivities,   setRecentActivities]   = useState<ActivityLog[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [selectedMonth,      setSelectedMonth]      = useState<number>(new Date().getMonth());
  const [activityPage,       setActivityPage]       = useState(1);
  const [activityUserFilter, setActivityUserFilter] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState('');

  // ── Modal state — BUG FIX #2 ──────────────────────────────────────────────
  const [isAddModalOpen,           setIsAddModalOpen]           = useState(false);
  const [isEmailScheduleModalOpen, setIsEmailScheduleModalOpen] = useState(false);
  const [emailSchedules,           setEmailSchedules]           = useState<Record<string, any>>({});
  // State untuk AddProcedureModal — dipanggil dari quick action
  const [newProcedure, setNewProcedure] = useState({
    namaDokumen: '', nomorDokumen: '', levelDokumen: '',
    tanggalSelesaiApproval: '', owner: '', pic: '', email: '',
  });
  const [needsReview, setNeedsReview] = useState<boolean | null>(null);
  const [isSaving,    setIsSaving]    = useState(false);

  const ACTIVITIES_PER_PAGE = 8;
  const today = new Date();

  const loadEmailSchedules = useCallback(async () => {
    try {
      const res = await fetch('/review-prosedur/api/email-schedules');
      if (res.ok) {
        const schedules = await res.json();
        const map: Record<string, any> = {};
        schedules.forEach((s: any) => { map[s.nomorDokumen] = s; });
        setEmailSchedules(map);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const procs = await getAllProcedures();
        setProcedures(procs);
        const actRes = await fetch('/review-prosedur/api/activities?limit=200');
        if (actRes.ok) setRecentActivities(await actRes.json());
        await loadEmailSchedules();
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [loadEmailSchedules]);

  const availableMonths = useMemo(() => {
    const months = new Set<number>();
    procedures.forEach(p => {
      const d = new Date(p.tanggalSelesaiApproval);
      if (!isNaN(d.getTime())) months.add(d.getMonth());
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [procedures]);

  const filteredDocs = useMemo(() =>
    procedures.filter(p => {
      const d = new Date(p.tanggalSelesaiApproval);
      return !isNaN(d.getTime()) && d.getMonth() === selectedMonth;
    }),
  [procedures, selectedMonth]);

  const stats = useMemo(() => ({
    total:    filteredDocs.length,
    relevan:  filteredDocs.filter(p => p.status === 'Relevan').length,
    revisi:   filteredDocs.filter(p => p.status === 'Revisi').length,
    obsolete: filteredDocs.filter(p => p.status === 'Obsolete').length,
    menunggu: filteredDocs.filter(p => ['Menunggu', 'Belum dikirim', '-'].includes(p.status)).length,
    terkirim: filteredDocs.filter(p => p.status === 'Telah terkirim').length,
    terbaca:  filteredDocs.filter(p => p.status === 'Telah dibaca').length,
  }), [filteredDocs]);

  const reviewProgress = useMemo(() => {
    if (filteredDocs.length === 0) return 0;
    if (filteredDocs.every(d => d.status === 'Relevan')) return 100;
    return Math.round(
      (filteredDocs.filter(d => d.status === 'Relevan').length / filteredDocs.length) * 100
    );
  }, [filteredDocs]);

  const uniqueUsers = useMemo(() => {
    const names = new Set<string>();
    recentActivities.forEach(a => { if (a.username) names.add(a.username); });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [recentActivities]);

  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    recentActivities.forEach(a => {
      if (a.activityType) types.add(normalizeActivityType(a.activityType));
    });
    const configKeys = Object.keys(ACTIVITY_TYPE_CONFIG);
    return Array.from(types).sort((a, b) => {
      const ia = configKeys.indexOf(a); const ib = configKeys.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1; if (ib === -1) return -1;
      return ia - ib;
    });
  }, [recentActivities]);

  const filteredActivities = useMemo(() => {
    return recentActivities.filter(a => {
      const matchUser = activityUserFilter === '' || a.username === activityUserFilter;
      const matchType = activityTypeFilter === '' || normalizeActivityType(a.activityType) === activityTypeFilter;
      return matchUser && matchType;
    });
  }, [recentActivities, activityUserFilter, activityTypeFilter]);

  const totalActivityPages  = Math.max(1, Math.ceil(filteredActivities.length / ACTIVITIES_PER_PAGE));
  const safeActivityPage    = Math.min(activityPage, totalActivityPages);
  const activityStart       = (safeActivityPage - 1) * ACTIVITIES_PER_PAGE;
  const activityEnd         = Math.min(activityStart + ACTIVITIES_PER_PAGE, filteredActivities.length);
  const paginatedActivities = filteredActivities.slice(activityStart, activityEnd);

  const handleUserFilterChange = (v: string) => { setActivityUserFilter(v); setActivityPage(1); };
  const handleTypeFilterChange = (v: string) => { setActivityTypeFilter(v); setActivityPage(1); };
  const hasActiveFilter  = activityUserFilter !== '' || activityTypeFilter !== '';
  const isCurrentMonth   = selectedMonth === today.getMonth();
  const selectedMonthName = MONTH_NAMES_ID[selectedMonth];

  // ── Save new procedure dari quick action ──────────────────────────────────
  const handleSaveNewProcedure = async () => {
    if (!newProcedure.namaDokumen || !newProcedure.nomorDokumen || !newProcedure.levelDokumen ||
        !newProcedure.tanggalSelesaiApproval || !newProcedure.owner || !newProcedure.pic || !newProcedure.email) {
      alert('Semua kolom wajib diisi.');
      return;
    }
    try {
      setIsSaving(true);
      const response = await fetch('/review-prosedur/api/procedures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProcedure, revisi: '0', needsReview }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 409) {
          alert('Nomor dokumen sudah ada. Silakan gunakan nomor yang berbeda.');
        } else {
          throw new Error(err.error || 'Gagal menambahkan prosedur');
        }
        return;
      }
      const procs = await getAllProcedures();
      setProcedures(procs);
      setNewProcedure({ namaDokumen: '', nomorDokumen: '', levelDokumen: '', tanggalSelesaiApproval: '', owner: '', pic: '', email: '' });
      setNeedsReview(null);
      setIsAddModalOpen(false);
      alert('Prosedur berhasil ditambahkan!');
    } catch (error: any) {
      alert('Gagal menambahkan prosedur. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-slate-500 text-sm">Memuat dashboard...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // ── isInReviewRange helper (untuk AddProcedureModal di homepage) ──────────
  function isInReviewRange(tanggalApproval: string): boolean {
    if (!tanggalApproval) return false;
    const d = new Date(tanggalApproval);
    if (isNaN(d.getTime())) return false;
    const now      = new Date();
    const expiry   = new Date(d.getFullYear(), d.getMonth() + 2, d.getDate());
    if (now >= expiry) return false;
    const schedDate = new Date(d.getFullYear(), d.getMonth() - 2, 1);
    const schedYM   = schedDate.getFullYear() * 12 + schedDate.getMonth();
    const nowYM     = now.getFullYear() * 12 + now.getMonth();
    return nowYM >= schedYM;
  }

  const fieldCls =
    'w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 ' +
    'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ' +
    'focus:border-transparent transition-all bg-white hover:border-slate-300';

  const inReviewRange = isInReviewRange(newProcedure.tanggalSelesaiApproval);
  const isExpired = (() => {
    if (!newProcedure.tanggalSelesaiApproval) return false;
    const d = new Date(newProcedure.tanggalSelesaiApproval);
    if (isNaN(d.getTime())) return false;
    return new Date() >= new Date(d.getFullYear(), d.getMonth() + 2, d.getDate());
  })();

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-7xl mx-auto space-y-8">

          {/* ── Hero Card — BUG FIX #1: Hapus KPI dari hero, hanya sapaan ── */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 md:p-8 text-white shadow-md">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-blue-200 text-sm font-medium mb-1">Selamat datang kembali 👋</p>
                <h1 className="text-2xl md:text-3xl font-bold mb-1">
                  {user?.fullName || user?.username || 'Administrator'}
                </h1>
                <p className="text-blue-200 text-sm">Review Prosedur · Quality Management System</p>
              </div>
              <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 self-start md:self-auto">
                <Calendar size={18} className="text-blue-200 flex-shrink-0" />
                <div>
                  <p className="text-blue-200 text-[10px] font-medium uppercase tracking-wider">Hari ini</p>
                  <p className="text-white text-sm font-semibold">
                    {today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Filter bulan ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-slate-700">Filter bulan:</span>
            <select
              value={selectedMonth}
              onChange={e => { setSelectedMonth(Number(e.target.value)); setActivityPage(1); }}
              className={selectCls}
              style={dropdownStyle}
            >
              {MONTH_NAMES_ID.map((name, i) => (
                <option key={i} value={i} disabled={!availableMonths.includes(i)}>
                  {name}{!availableMonths.includes(i) ? ' (kosong)' : ''}
                </option>
              ))}
            </select>
            {isCurrentMonth && (
              <span className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-full font-semibold">
                Bulan ini
              </span>
            )}
          </div>

          {/* ── KPI Cards — satu-satunya tempat KPI tampil ────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title={`Total Dokumen · ${MONTH_NAMES_SHORT[selectedMonth]}`}
              value={stats.total}
              icon={<FileText size={20} />}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              subtitle="Semua status"
            />
            <KpiCard
              title="Relevan"
              value={stats.relevan}
              icon={<CheckCircle2 size={20} />}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              subtitle="Sudah direview & relevan"
            />
            <KpiCard
              title="Perlu Revisi"
              value={stats.revisi}
              icon={<RefreshCw size={20} />}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              subtitle="Membutuhkan perubahan"
            />
            <KpiCard
              title="Belum Direview"
              value={stats.menunggu + stats.terkirim + stats.terbaca}
              icon={<Clock size={20} />}
              iconBg="bg-slate-50"
              iconColor="text-slate-500"
              subtitle={`${stats.menunggu} menunggu · ${stats.terkirim} terkirim · ${stats.terbaca} terbaca`}
            />
          </div>

          {/* ── Review Progress + Dokumen ──────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-600" />
                <h2 className="font-bold text-slate-900">Review Progress · {selectedMonthName}</h2>
                <span className="text-xs text-slate-400">({filteredDocs.length} dokumen)</span>
              </div>
              <span className={`text-sm font-bold ${reviewProgress === 100 ? 'text-emerald-600' : 'text-blue-600'}`}>
                {reviewProgress}%
              </span>
            </div>
            <div className="px-6 pt-4 pb-3">
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-700 ease-out ${
                    reviewProgress === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${reviewProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-500">
                  {filteredDocs.filter(d => d.status === 'Relevan').length} dari {filteredDocs.length} dokumen relevan
                </span>
                {reviewProgress === 100 && filteredDocs.length > 0 && (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Semua dokumen relevan
                  </span>
                )}
              </div>
            </div>
            <div className="px-6 pb-6">
              {filteredDocs.length > 0 ? (
                <div className="space-y-1.5 max-h-80 overflow-auto pr-1">
                  {filteredDocs.map((doc, idx) => (
                    <div
                      key={doc.nomorDokumen}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                        idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                      } hover:bg-blue-50`}
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="text-sm font-medium text-slate-800 truncate">{doc.namaDokumen}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{doc.nomorDokumen} · {doc.pic}</p>
                      </div>
                      <StatusBadge status={doc.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400">
                  <FileText size={40} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-medium">Tidak ada dokumen untuk {selectedMonthName}</p>
                  <p className="text-xs mt-1">Pilih bulan lain menggunakan filter di atas</p>
                </div>
              )}
            </div>
          </div>


          {/* ── Aktivitas Terbaru ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-slate-600" />
                  <h2 className="font-bold text-slate-900">Aktivitas Terbaru</h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select value={activityUserFilter} onChange={e => handleUserFilterChange(e.target.value)}
                    className={selectCls} style={dropdownStyle} title="Filter user">
                    <option value="">Semua User</option>
                    {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <select value={activityTypeFilter} onChange={e => handleTypeFilterChange(e.target.value)}
                    className={selectCls} style={dropdownStyle} title="Filter tipe">
                    <option value="">Semua Tipe</option>
                    {uniqueTypes.map(t => (
                      <option key={t} value={t}>{ACTIVITY_TYPE_CONFIG[t]?.label ?? t}</option>
                    ))}
                  </select>
                  {hasActiveFilter && (
                    <button
                      onClick={() => { setActivityUserFilter(''); setActivityTypeFilter(''); setActivityPage(1); }}
                      className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-all"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
              {hasActiveFilter && (
                <p className="text-xs text-slate-500 mt-2">
                  Menampilkan <span className="font-semibold text-slate-700">{filteredActivities.length}</span> aktivitas
                  {activityUserFilter && <> dari user <span className="font-semibold text-blue-600">{activityUserFilter}</span></>}
                  {activityTypeFilter && (
                    <> · tipe <span className="font-semibold text-blue-600">
                      {ACTIVITY_TYPE_CONFIG[activityTypeFilter]?.label ?? activityTypeFilter}
                    </span></>
                  )}
                </p>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Waktu', 'Deskripsi', 'User', 'Tipe'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedActivities.length > 0 ? (
                    paginatedActivities.map((act, idx) => (
                      <tr key={act.id} className={`hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                        <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(act.createdAt).toLocaleString('id-ID', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-800 font-medium">{act.activityDescription}</td>
                        <td className="px-5 py-3 text-sm text-slate-600">{act.username || 'System'}</td>
                        <td className="px-5 py-3"><ActivityTypeBadge type={act.activityType} /></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-400">
                        <Clock size={36} className="mx-auto mb-3 text-slate-300" />
                        {hasActiveFilter ? 'Tidak ada aktivitas yang sesuai filter' : 'Belum ada aktivitas'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalActivityPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <p className="text-xs text-slate-500">
                  {filteredActivities.length > 0 ? activityStart + 1 : 0}–{activityEnd} dari {filteredActivities.length} aktivitas
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setActivityPage(p => Math.max(1, p - 1))} disabled={safeActivityPage === 1}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                    ← Sebelumnya
                  </button>
                  <span className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold">
                    {safeActivityPage} / {totalActivityPages}
                  </span>
                  <button onClick={() => setActivityPage(p => Math.min(totalActivityPages, p + 1))} disabled={safeActivityPage >= totalActivityPages}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                    Berikutnya →
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── AddProcedureModal (inline, untuk quick action) ──────────────── */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Tambah Prosedur Baru</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Isi semua kolom dengan informasi yang akurat</p>
                </div>
                <button onClick={() => { if (!isSaving) { setIsAddModalOpen(false); setNeedsReview(null); } }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
                  ✕
                </button>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Dokumen <span className="text-red-500">*</span></label>
                  <textarea value={newProcedure.namaDokumen} disabled={isSaving} rows={2}
                    onChange={e => setNewProcedure(p => ({ ...p, namaDokumen: e.target.value }))}
                    placeholder="Masukkan nama dokumen" className={`${fieldCls} resize-none`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nomor Dokumen <span className="text-red-500">*</span></label>
                  <input type="text" value={newProcedure.nomorDokumen} disabled={isSaving}
                    onChange={e => setNewProcedure(p => ({ ...p, nomorDokumen: e.target.value }))}
                    placeholder="Masukkan nomor dokumen" className={fieldCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Level Dokumen <span className="text-red-500">*</span></label>
                  <input type="text" value={newProcedure.levelDokumen} disabled={isSaving}
                    onChange={e => setNewProcedure(p => ({ ...p, levelDokumen: e.target.value }))}
                    placeholder="Masukkan level dokumen" className={fieldCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Owner <span className="text-red-500">*</span></label>
                  <input type="text" value={newProcedure.owner} disabled={isSaving}
                    onChange={e => setNewProcedure(p => ({ ...p, owner: e.target.value }))}
                    placeholder="Masukkan owner" className={fieldCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">PIC <span className="text-red-500">*</span></label>
                  <input type="text" value={newProcedure.pic} disabled={isSaving}
                    onChange={e => setNewProcedure(p => ({ ...p, pic: e.target.value }))}
                    placeholder="Masukkan PIC" className={fieldCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                  <input type="email" value={newProcedure.email} disabled={isSaving}
                    onChange={e => setNewProcedure(p => ({ ...p, email: e.target.value }))}
                    placeholder="Masukkan email" className={fieldCls} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tanggal Selesai Approval <span className="text-red-500">*</span></label>
                  <input type="date" value={newProcedure.tanggalSelesaiApproval} disabled={isSaving}
                    onChange={e => setNewProcedure(p => ({ ...p, tanggalSelesaiApproval: e.target.value }))}
                    className={fieldCls} />
                </div>
                {newProcedure.tanggalSelesaiApproval && (
                  <div className="col-span-2">
                    {isExpired ? (
                      <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                        <p className="text-xs text-slate-600">ℹ️ Tanggal approval sudah lewat lebih dari 2 bulan. Dokumen akan otomatis berstatus <span className="font-semibold text-emerald-700">Relevan</span>.</p>
                      </div>
                    ) : inReviewRange ? (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">Status Awal Dokumen <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-2 gap-3">
                          <button type="button" onClick={() => setNeedsReview(true)} disabled={isSaving}
                            className={`p-3 rounded-xl border-2 text-left transition-all ${needsReview === true ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 bg-white'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm">📨</span>
                              <span className="font-semibold text-xs text-slate-900">Perlu Direview</span>
                              {needsReview === true && <CheckCircle2 size={14} className="ml-auto text-blue-600" />}
                            </div>
                            <p className="text-xs text-slate-500">Masuk alur review — dijadwalkan kirim email ke PIC</p>
                          </button>
                          <button type="button" onClick={() => setNeedsReview(false)} disabled={isSaving}
                            className={`p-3 rounded-xl border-2 text-left transition-all ${needsReview === false ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 bg-white'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm">✓</span>
                              <span className="font-semibold text-xs text-slate-900">Langsung Relevan</span>
                              {needsReview === false && <CheckCircle2 size={14} className="ml-auto text-emerald-600" />}
                            </div>
                            <p className="text-xs text-slate-500">Tidak masuk alur review, langsung relevan</p>
                          </button>
                        </div>
                        {needsReview === null && <p className="text-xs text-amber-600 mt-2">⚠ Pilih salah satu status awal</p>}
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                        <p className="text-xs text-slate-600">ℹ️ Jadwal review otomatis akan aktif pada <span className="font-semibold text-blue-700">
                          {(() => { const d = new Date(newProcedure.tanggalSelesaiApproval); const s = new Date(d.getFullYear(), d.getMonth() - 2, 1); return s.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }); })()}
                        </span>.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
                <button onClick={() => { if (!isSaving) { setIsAddModalOpen(false); setNeedsReview(null); } }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition-all">
                  Batal
                </button>
                <button onClick={handleSaveNewProcedure}
                  disabled={isSaving || (inReviewRange && needsReview === null)}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSaving && <span className="animate-spin w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full" />}
                  {isSaving ? 'Menyimpan...' : 'Simpan Prosedur'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── EmailScheduleModal ───────────────────────────────────────────── */}
        <EmailScheduleModal
          isOpen={isEmailScheduleModalOpen}
          onClose={async () => {
            setIsEmailScheduleModalOpen(false);
            await loadEmailSchedules();
          }}
          procedures={procedures}
          emailSchedules={emailSchedules}
        />

      </AdminLayout>
    </ProtectedRoute>
  );
}