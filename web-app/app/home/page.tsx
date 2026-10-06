// app/home/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { getAllProcedures, ProcedureDocument, StatusType, saveDocumentReview } from '@/data/procedures/all-procedures';
import { useAuth } from '@/contexts/AuthContext';
import DocumentModal from '@/components/documents/DocumentModal';
import EmailScheduleModal from '@/components/status-review/EmailScheduleModal';
import SectionReviewChart from '@/components/dashboard/SectionReviewChart';
import OverallReviewCharts from '@/components/dashboard/OverallReviewCharts';
import {
  FileText, CheckCircle2, RefreshCw, Clock, TrendingUp,
  Plus, CalendarClock, Archive, Users, Settings, Activity,
  ChevronRight, Calendar, Inbox, FileSpreadsheet,
  Search, X, ExternalLink, ArrowRight, ShieldCheck,
  FileCheck2, FileEdit, FileSearch, Sparkles, AlertTriangle,
  Layers, Check, Eye, Filter, ArrowUpRight, ClipboardCheck,
  UploadCloud, LogIn, LogOut, Edit3, Trash2, Send, LayoutList, Upload
} from 'lucide-react';
import AdminRequestsModal, { type AdminPICRequest } from '@/components/admin/AdminRequestsModal';
import AdminRevisiModal from '@/components/admin/AdminRevisiModal';

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
function formatSentDateTime(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;

  const dateFormatted = d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeFormatted = d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).replace('.', ':');

  return `${dateFormatted}, ${timeFormatted} WIB`;
}

function StatusBadge({
  status,
  lastSentAt,
}: {
  status: StatusType;
  lastSentAt?: string | null;
}) {
  const styles: Partial<Record<StatusType, { bg: string; dot: string }>> = {
    Relevan:          { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500' },
    Revisi:           { bg: 'bg-amber-50 text-amber-700 border-amber-200/80',       dot: 'bg-amber-500'   },
    Obsolete:         { bg: 'bg-red-50 text-red-700 border-red-200/80',             dot: 'bg-red-500'     },
    Menunggu:         { bg: 'bg-blue-50 text-blue-700 border-blue-200/80',          dot: 'bg-blue-500'    },
    'Belum dikirim':  { bg: 'bg-orange-50 text-orange-700 border-orange-200/80',    dot: 'bg-orange-500'  },
    'Telah terkirim': { bg: 'bg-cyan-50 text-cyan-700 border-cyan-200/80',          dot: 'bg-cyan-500'    },
    'Telah dibaca':   { bg: 'bg-purple-50 text-purple-700 border-purple-200/80',    dot: 'bg-purple-500'  },
    'Menunggu ACC Prepared': { bg: 'bg-violet-50 text-violet-700 border-violet-200/80', dot: 'bg-violet-500' },
    'Menunggu ACC Checked':  { bg: 'bg-violet-50 text-violet-700 border-violet-200/80', dot: 'bg-violet-500' },
    'Menunggu ACC Approved': { bg: 'bg-violet-50 text-violet-700 border-violet-200/80', dot: 'bg-violet-500' },
    '-':              { bg: 'bg-slate-50 text-slate-600 border-slate-200/80',       dot: 'bg-slate-400'   },
  };
  const s = styles[status] ?? styles['-']!;
  const sentFormatted = status === 'Telah terkirim' ? formatSentDateTime(lastSentAt) : null;

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${s.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {status}
      </span>
      {sentFormatted && (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 whitespace-nowrap pl-0.5"
          title={`Email terkirim pada ${sentFormatted}`}
        >
          <Clock size={10} className="text-cyan-600 flex-shrink-0" />
          <span>{sentFormatted}</span>
        </span>
      )}
    </div>
  );
}

// ─── KPI Card (Lapang & Tidak Terpotong) ──────────────────────────────────────
interface KpiCardProps {
  title: string;
  value: number;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  accentBar: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  onClick?: () => void;
  clickable?: boolean;
}

function KpiCard({
  title,
  value,
  subtitle,
  badge,
  badgeColor = 'bg-blue-50 text-blue-700 border-blue-200',
  accentBar,
  icon,
  iconBg,
  iconColor,
  onClick,
  clickable,
}: KpiCardProps) {
  return (
    <div
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      className={`relative bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 transition-all duration-200 overflow-hidden flex flex-col justify-between ${
        clickable
          ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 select-none group'
          : 'hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      {/* Top Accent Strip */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${accentBar}`} />

      {/* Top Row: Title + Icon */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight leading-none">{value}</span>
            <span className="text-xs font-semibold text-slate-400">Dokumen</span>
          </div>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs ${iconBg}`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>

      {/* Bottom Row: Subtitle & Optional Badge */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
        <p className="text-slate-500 font-medium text-xs truncate flex-1">{subtitle}</p>
        {badge && (
          <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex-shrink-0 ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Activity Type config ─────────────────────────────────────────────────────
const ACTIVITY_TYPE_CONFIG: Record<string, { label: string; badgeCls: string; dot: string }> = {
  login:            { label: 'Login',           badgeCls: 'bg-blue-50 text-blue-700 border-blue-200',         dot: 'bg-blue-500'    },
  logout:           { label: 'Logout',          badgeCls: 'bg-slate-50 text-slate-600 border-slate-200',      dot: 'bg-slate-400'   },
  upload:           { label: 'Upload Dokumen',  badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',dot: 'bg-emerald-500' },
  download:         { label: 'Download',        badgeCls: 'bg-cyan-50 text-cyan-700 border-cyan-200',         dot: 'bg-cyan-500'    },
  review:           { label: 'Review',          badgeCls: 'bg-purple-50 text-purple-700 border-purple-200',   dot: 'bg-purple-500'  },
  review_relevan:   { label: 'Review: Relevan', badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',dot: 'bg-emerald-500'},
  review_revisi:    { label: 'Review: Revisi',  badgeCls: 'bg-amber-50 text-amber-700 border-amber-200',     dot: 'bg-amber-500'   },
  review_obsolete:  { label: 'Review: Obsolete',badgeCls: 'bg-rose-50 text-rose-700 border-rose-200',         dot: 'bg-rose-500'    },
  archive:          { label: 'Arsip Dokumen',   badgeCls: 'bg-amber-50 text-amber-700 border-amber-200',     dot: 'bg-amber-500'   },
  restore:          { label: 'Restore Dokumen', badgeCls: 'bg-teal-50 text-teal-700 border-teal-200',         dot: 'bg-teal-500'    },
  delete:           { label: 'Hapus Data',      badgeCls: 'bg-red-50 text-red-700 border-red-200',            dot: 'bg-red-500'     },
  create:           { label: 'Tambah Data',     badgeCls: 'bg-indigo-50 text-indigo-700 border-indigo-200',   dot: 'bg-indigo-500'  },
  update:           { label: 'Update Data',     badgeCls: 'bg-orange-50 text-orange-700 border-orange-200',   dot: 'bg-orange-500'  },
  request_review:   { label: 'Permintaan Review', badgeCls: 'bg-teal-50 text-teal-700 border-teal-200',       dot: 'bg-teal-500'    },
  request_document: { label: 'Permintaan Dokumen', badgeCls: 'bg-sky-50 text-sky-700 border-sky-200',        dot: 'bg-sky-500'     },
};

function normalizeActivityType(t: string): string {
  return t === 'request_download' ? 'request_document' : t;
}

function ActivityTypeBadge({ type }: { type: string }) {
  const normalized = normalizeActivityType(type);
  const cfg = ACTIVITY_TYPE_CONFIG[normalized];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg?.badgeCls ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg?.dot ?? 'bg-slate-400'}`} />
      {cfg?.label ?? normalized}
    </span>
  );
}

function formatActivityTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
  if (isToday) return `Hari ini, ${timeStr} WIB`;
  if (isYesterday) return `Kemarin, ${timeStr} WIB`;

  return `${d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}, ${timeStr} WIB`;
}

function getActivityIcon(type: string) {
  const norm = normalizeActivityType(type);
  switch (norm) {
    case 'login':
      return { icon: <LogIn size={13} />, bg: 'bg-blue-600 text-white', border: 'border-blue-400' };
    case 'logout':
      return { icon: <LogOut size={13} />, bg: 'bg-slate-500 text-white', border: 'border-slate-400' };
    case 'upload':
      return { icon: <UploadCloud size={13} />, bg: 'bg-emerald-600 text-white', border: 'border-emerald-400' };
    case 'download':
      return { icon: <FileSpreadsheet size={13} />, bg: 'bg-cyan-600 text-white', border: 'border-cyan-400' };
    case 'review':
    case 'review_relevan':
      return { icon: <CheckCircle2 size={13} />, bg: 'bg-teal-600 text-white', border: 'border-teal-400' };
    case 'review_revisi':
      return { icon: <RefreshCw size={13} />, bg: 'bg-amber-600 text-white', border: 'border-amber-400' };
    case 'review_obsolete':
    case 'delete':
      return { icon: <Trash2 size={13} />, bg: 'bg-rose-600 text-white', border: 'border-rose-400' };
    case 'update':
      return { icon: <Edit3 size={13} />, bg: 'bg-orange-600 text-white', border: 'border-orange-400' };
    case 'request_review':
    case 'request_document':
      return { icon: <Send size={13} />, bg: 'bg-violet-600 text-white', border: 'border-violet-400' };
    default:
      return { icon: <Activity size={13} />, bg: 'bg-indigo-600 text-white', border: 'border-indigo-400' };
  }
}

// Highlight document codes, file names, and stages in activity description
function renderFormattedDescription(text: string) {
  if (!text) return '-';
  const regex = /([A-Z0-9]+(?:-[A-Z0-9]+)+|\b[\w\s.-]+\.pdf\b|\b[\w\s.-]+\.xlsx\b|tahap\s+\w+)/gi;
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (!part) return null;
    if (/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/i.test(part)) {
      return (
        <span
          key={i}
          className="font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px] border border-blue-200/80 mx-0.5 inline-block shadow-2xs"
        >
          {part}
        </span>
      );
    }
    if (/\.(pdf|xlsx)$/i.test(part)) {
      return (
        <span
          key={i}
          className="font-mono font-semibold bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded text-[11px] border border-emerald-200/80 mx-0.5 inline-flex items-center gap-1 shadow-2xs"
        >
          <FileText size={11} className="text-emerald-600 inline -mt-0.5" />
          {part}
        </span>
      );
    }
    if (/^tahap\s+\w+/i.test(part)) {
      return (
        <span
          key={i}
          className="font-semibold bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded text-[11px] border border-violet-200/80 mx-0.5 inline-block"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

// ─── Dropdown style ───────────────────────────────────────────────────────────
const selectCls =
  'pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-all shadow-2xs hover:border-slate-300';
const dropdownStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231f2937' d='M6 8L2 4h8z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat' as const,
  backgroundPosition: 'right 10px center',
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user } = useAuth();
  const [procedures,         setProcedures]         = useState<ProcedureDocument[]>([]);
  const [recentActivities,   setRecentActivities]   = useState<ActivityLog[]>([]);
  const [loading,            setLoading]            = useState(true);
  const currentYear = Math.max(2026, new Date().getFullYear());
  const [selectedMonth,      setSelectedMonth]      = useState<number | 'all'>(new Date().getMonth());
  const [selectedYear,       setSelectedYear]       = useState<number>(currentYear);
  const [activityPage,       setActivityPage]       = useState(1);
  const [activityUserFilter, setActivityUserFilter] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState('');
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [activityViewMode,   setActivityViewMode]   = useState<'timeline' | 'table'>('timeline');

  // Document Explorer in Dashboard (Jadwal)
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docStatusFilter, setDocStatusFilter] = useState<'all' | 'relevan' | 'revisi' | 'belum'>('all');
  const [schedulePage, setSchedulePage] = useState(1);
  const SCHEDULES_PER_PAGE = 8;

  // Modal state
  const [isAddModalOpen,           setIsAddModalOpen]           = useState(false);
  const [isEmailScheduleModalOpen, setIsEmailScheduleModalOpen] = useState(false);
  const [emailSchedules,           setEmailSchedules]           = useState<Record<string, any>>({});
  const [newProcedure, setNewProcedure] = useState({
    namaDokumen: '', nomorDokumen: '', levelDokumen: '',
    tanggalSelesaiApproval: '', owner: '', pic: '', email: '',
  });
  const [newProcedureFile, setNewProcedureFile] = useState<File | null>(null);
  const newProcedureFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [needsReview, setNeedsReview] = useState<boolean | null>(null);
  const [isSaving,    setIsSaving]    = useState(false);

  // State untuk Permintaan dari PIC
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [picRequests,        setPicRequests]        = useState<AdminPICRequest[]>([]);
  const [picRequestsSummary, setPicRequestsSummary] = useState({ total: 0, revisionCount: 0, newDocCount: 0 });
  const [loadingRequests,    setLoadingRequests]    = useState(false);
  const [selectedDocModal,   setSelectedDocModal]   = useState<{ nomorDokumen: string; namaDokumen: string } | null>(null);

  // State untuk Modal Detail Dokumen Perlu Revisi
  const [isRevisiModalOpen,  setIsRevisiModalOpen]  = useState(false);
  const [isExportingAudit,   setIsExportingAudit]   = useState(false);

  const handleDownloadAuditExcel = async () => {
    try {
      setIsExportingAudit(true);
      const response = await fetch('/review-prosedur/api/audit/export-excel');
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Server error: ${response.status}`);
      }
      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Rekap-Matriks-Audit-Prosedur-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download Rekap Audit gagal:', err);
      alert('Gagal membuat file Rekap Audit: ' + (err.message || 'Silakan coba lagi.'));
    } finally {
      setIsExportingAudit(false);
    }
  };

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

  const loadPicRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
      const res = await fetch('/review-prosedur/api/admin/pic-requests');
      if (res.ok) {
        const data = await res.json();
        setPicRequests(data.requests || []);
        setPicRequestsSummary(data.summary || { total: 0, revisionCount: 0, newDocCount: 0 });
      }
    } catch (err) {
      console.error('Error loading PIC requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const procs = await getAllProcedures();
        setProcedures(procs);
        const actRes = await fetch('/review-prosedur/api/activities?limit=200');
        if (actRes.ok) setRecentActivities(await actRes.json());
        await Promise.all([
          loadEmailSchedules(),
          loadPicRequests(),
        ]);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [loadEmailSchedules, loadPicRequests]);

  const availableYears = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear; y >= 2026; y--) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  const isPastYear = selectedYear < currentYear;

  // Filtered docs based on selected month ('all' or 0..11)
  const filteredDocs = useMemo(() =>
    procedures
      .filter(p => {
        const d = new Date(p.tanggalSelesaiApproval);
        if (isNaN(d.getTime())) return false;
        if (selectedMonth === 'all') return true;
        return d.getMonth() === selectedMonth;
      })
      .map(p => {
        if (isPastYear) {
          return {
            ...p,
            status: 'Relevan' as StatusType,
          };
        }
        return p;
      }),
  [procedures, selectedMonth, isPastYear]);

  const stats = useMemo(() => ({
    total:    filteredDocs.length,
    relevan:  filteredDocs.filter(p => p.status === 'Relevan').length,
    revisi:   filteredDocs.filter(p => p.status === 'Revisi').length,
    obsolete: filteredDocs.filter(p => p.status === 'Obsolete').length,
    menunggu: filteredDocs.filter(p => ['Menunggu', 'Belum dikirim', '-'].includes(p.status)).length,
    terkirim: filteredDocs.filter(p => p.status === 'Telah terkirim').length,
    terbaca:  filteredDocs.filter(p => p.status === 'Telah dibaca').length,
  }), [filteredDocs]);

  // Daftar dokumen yang membutuhkan revisi (periode aktif & seluruh periode)
  const revisiDocs = useMemo(() => filteredDocs.filter(p => p.status === 'Revisi'), [filteredDocs]);
  const allRevisiDocs = useMemo(() => procedures.filter(p => p.status === 'Revisi'), [procedures]);

  // Filtered docs for Schedule Explorer
  const displayedDocs = useMemo(() => {
    return filteredDocs.filter(d => {
      if (docStatusFilter === 'relevan' && d.status !== 'Relevan') return false;
      if (docStatusFilter === 'revisi' && d.status !== 'Revisi') return false;
      if (docStatusFilter === 'belum' && ['Relevan', 'Revisi'].includes(d.status)) return false;

      if (docSearchQuery.trim()) {
        const q = docSearchQuery.toLowerCase();
        const matchName = (d.namaDokumen || '').toLowerCase().includes(q);
        const matchNum = (d.nomorDokumen || '').toLowerCase().includes(q);
        const matchPic = (d.pic || '').toLowerCase().includes(q);
        return matchName || matchNum || matchPic;
      }
      return true;
    });
  }, [filteredDocs, docStatusFilter, docSearchQuery]);

  // Pagination for Schedule table
  const totalSchedulePages = Math.max(1, Math.ceil(displayedDocs.length / SCHEDULES_PER_PAGE));
  const safeSchedulePage = Math.min(schedulePage, totalSchedulePages);
  const scheduleStart = (safeSchedulePage - 1) * SCHEDULES_PER_PAGE;
  const scheduleEnd = Math.min(scheduleStart + SCHEDULES_PER_PAGE, displayedDocs.length);
  const paginatedScheduleDocs = displayedDocs.slice(scheduleStart, scheduleEnd);

  // Handler untuk menandai dokumen revisi menjadi Relevan langsung dari modal detail
  const handleMarkAsRelevan = useCallback(async (nomorDokumen: string, revisi: string) => {
    const proc = procedures.find(p => p.nomorDokumen === nomorDokumen);
    const d = proc ? new Date(proc.tanggalSelesaiApproval) : new Date();
    const month = !isNaN(d.getTime()) ? d.getMonth() : (selectedMonth === 'all' ? new Date().getMonth() : selectedMonth);
    await saveDocumentReview(nomorDokumen, 'Relevan', revisi || '0', month);
    const updatedProcs = await getAllProcedures();
    setProcedures(updatedProcs);
  }, [procedures, selectedMonth]);

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
      const matchSearch =
        !activitySearchQuery.trim() ||
        (a.activityDescription || '').toLowerCase().includes(activitySearchQuery.toLowerCase()) ||
        (a.username || '').toLowerCase().includes(activitySearchQuery.toLowerCase());
      return matchUser && matchType && matchSearch;
    });
  }, [recentActivities, activityUserFilter, activityTypeFilter, activitySearchQuery]);

  const totalActivityPages  = Math.max(1, Math.ceil(filteredActivities.length / ACTIVITIES_PER_PAGE));
  const safeActivityPage    = Math.min(activityPage, totalActivityPages);
  const activityStart       = (safeActivityPage - 1) * ACTIVITIES_PER_PAGE;
  const activityEnd         = Math.min(activityStart + ACTIVITIES_PER_PAGE, filteredActivities.length);
  const paginatedActivities = filteredActivities.slice(activityStart, activityEnd);

  const handleUserFilterChange = (v: string) => { setActivityUserFilter(v); setActivityPage(1); };
  const handleTypeFilterChange = (v: string) => { setActivityTypeFilter(v); setActivityPage(1); };
  const hasActiveFilter  = activityUserFilter !== '' || activityTypeFilter !== '' || activitySearchQuery.trim() !== '';
  const isCurrentMonth   = selectedMonth === today.getMonth() && selectedYear === currentYear;
  const selectedMonthName = selectedMonth === 'all' ? 'Semua Bulan' : MONTH_NAMES_ID[selectedMonth];

  // Save new procedure
  const handleSaveNewProcedure = async () => {
    if (!newProcedure.namaDokumen || !newProcedure.nomorDokumen || !newProcedure.levelDokumen ||
        !newProcedure.tanggalSelesaiApproval || !newProcedure.owner || !newProcedure.pic || !newProcedure.email) {
      alert('Semua kolom wajib diisi.');
      return;
    }

    if (!newProcedureFile) {
      alert('Silakan upload file dokumen prosedur baru (format PDF) terlebih dahulu.');
      return;
    }

    try {
      setIsSaving(true);
      const createdNomor = newProcedure.nomorDokumen;
      const response = await fetch('/review-prosedur/api/procedures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProcedure, revisi: '0', needsApproval: true }),
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

      // ── Upload file dokumen baru yang dipilih ──
      const formData = new FormData();
      formData.append('file', newProcedureFile);
      formData.append('nomorDokumen', createdNomor);
      formData.append('uploadedBy', user?.username || 'admin');

      const uploadRes = await fetch('/review-prosedur/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const upErr = await uploadRes.json().catch(() => ({}));
        console.error('Warning: Dokumen tersimpan tapi file gagal diupload:', upErr);
        alert(`Dokumen berhasil dibuat, namun file gagal diupload: ${upErr.error || 'Error upload'}. Anda dapat mengupload ulang di halaman Approval Dokumen.`);
      }

      const procs = await getAllProcedures();
      setProcedures(procs);
      setNewProcedure({ namaDokumen: '', nomorDokumen: '', levelDokumen: '', tanggalSelesaiApproval: '', owner: '', pic: '', email: '' });
      setNewProcedureFile(null);
      setNeedsReview(null);
      setIsAddModalOpen(false);
      alert('Dokumen dan file baru berhasil dibuat! Mengarahkan ke halaman Approval Dokumen untuk menentukan approver...');
      window.location.href = `/review-prosedur/approval-dokumen?openEdit=${encodeURIComponent(createdNomor)}`;
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
            <p className="text-slate-500 text-sm font-medium">Memuat dashboard...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // isInReviewRange helper
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
        <div className="space-y-6">

          {/* ── 1. Hero Welcome Banner (Bersih, Rapi & Elegan) ──────────────── */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-6 sm:p-7 text-white shadow-xl border border-blue-900/40">
            {/* Ambient Lighting Background */}
            <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/3 -mb-16 w-60 h-60 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

            {/* Top Bar: Brand Pill on Left & Kalender Tanggal Sistem di Pojok Kanan Atas */}
            <div className="relative z-10 flex items-center justify-between gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-blue-200 border border-white/10 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Sistem Manajemen Prosedur
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">• PT. Jatim Autocomp Indonesia</span>
              </div>

              {/* Kalender di Pojok Kanan Atas */}
              <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 shadow-inner">
                <Calendar size={15} className="text-blue-300 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-medium leading-none">Tanggal Sistem</p>
                  <p className="text-white text-xs font-bold mt-0.5 whitespace-nowrap">
                    {today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Section: Greeting on Left & Action Buttons di Pojok Kanan Bawah */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-5">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Selamat Datang, {user?.fullName || user?.username || 'Administrator'}
                </h1>
                <p className="mt-1.5 text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                  Pantau matriks kepatuhan peninjauan prosedur berkala, jadwal verifikasi ISO/IATF, dan seluruh rekam jejak sistem secara terpusat.
                </p>
              </div>

              {/* Header Action Buttons - Pojok Kanan Bawah */}
              <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap md:self-end">
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30 transition-all active:scale-95 whitespace-nowrap"
                >
                  <Plus size={14} />
                  <span>Tambah Prosedur</span>
                </button>

                <button
                  onClick={handleDownloadAuditExcel}
                  disabled={isExportingAudit}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-white/15 hover:bg-white/25 border border-white/20 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                >
                  <FileSpreadsheet size={14} className={isExportingAudit ? 'animate-spin' : ''} />
                  <span>{isExportingAudit ? 'Menyiapkan...' : 'Rekap Audit'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── 2. Filter Bar (Tahun & Bulan) ─────────────────────────────── */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-white px-5 py-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Filter Tahun */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Tahun:</span>
                <select
                  value={selectedYear}
                  onChange={e => { setSelectedYear(Number(e.target.value)); setActivityPage(1); setSchedulePage(1); }}
                  className={selectCls}
                  style={dropdownStyle}
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>
                      {y === currentYear ? `${y} (Tahun Ini)` : `${y} (Arsip)`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="h-4 w-px bg-slate-200 hidden sm:block" />

              {/* Filter Bulan */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Bulan:</span>
                <select
                  value={selectedMonth}
                  onChange={e => {
                    const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                    setSelectedMonth(val);
                    setActivityPage(1);
                    setSchedulePage(1);
                  }}
                  className={selectCls}
                  style={dropdownStyle}
                >
                  <option value="all">Semua Bulan ({procedures.length} Dokumen)</option>
                  {MONTH_NAMES_ID.map((name, i) => {
                    const count = procedures.filter(p => {
                      const d = new Date(p.tanggalSelesaiApproval);
                      return !isNaN(d.getTime()) && d.getMonth() === i;
                    }).length;
                    return (
                      <option key={i} value={i}>
                        {name} ({count} Dokumen)
                      </option>
                    );
                  })}
                </select>

                {selectedMonth !== 'all' && !isCurrentMonth && (
                  <button
                    onClick={() => {
                      setSelectedMonth(today.getMonth());
                      setSelectedYear(currentYear);
                      setSchedulePage(1);
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 transition-colors"
                  >
                    Ke Bulan Ini
                  </button>
                )}

                {selectedMonth === today.getMonth() && selectedYear === currentYear && (
                  <span className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-bold shadow-2xs">
                    Bulan Aktif
                  </span>
                )}

                {selectedMonth === 'all' && (
                  <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full font-bold">
                    Menampilkan Semua Bulan
                  </span>
                )}
              </div>
            </div>

            {isPastYear && (
              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
                <Clock size={12} /> Menampilkan arsip riwayat tahun {selectedYear}
              </span>
            )}
          </div>

          {/* ── Notifikasi Banner Permintaan PIC (Jika ada) ──────────────────── */}
          {picRequestsSummary.total > 0 && (
            <div
              onClick={() => setIsRequestsModalOpen(true)}
              className="flex items-center justify-between p-4 bg-violet-50/80 border border-violet-200 rounded-2xl cursor-pointer hover:bg-violet-100/70 transition-all shadow-2xs"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <Inbox size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-violet-950">
                    Terdapat {picRequestsSummary.total} Permintaan dari PIC ({picRequestsSummary.revisionCount} revisi, {picRequestsSummary.newDocCount} dokumen baru)
                  </p>
                  <p className="text-[11px] text-violet-700 mt-0.5">
                    Klik di sini untuk membuka rincian permohonan PIC dan memperbarui dokumen.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-700 bg-white px-3 py-1.5 rounded-xl border border-violet-200 shadow-2xs">
                <span>Kelola Permintaan</span>
                <ChevronRight size={14} />
              </span>
            </div>
          )}

          {/* ── 3. 4 Kartu KPI Utama (Lapang, Teks Lengkap, Rapi) ─────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Total Dokumen"
              value={stats.total}
              icon={<FileText size={20} />}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              accentBar="bg-blue-500"
              subtitle={
                selectedMonth === 'all'
                  ? `Seluruh prosedur terdaftar tahun ${selectedYear}`
                  : `Target review ${MONTH_NAMES_ID[selectedMonth]} ${selectedYear}`
              }
              badge={selectedMonth === 'all' ? 'Semua Bulan' : 'Periode Aktif'}
              badgeColor="bg-blue-50 text-blue-700 border-blue-200"
            />
            <KpiCard
              title="Dokumen Relevan"
              value={stats.relevan}
              icon={<CheckCircle2 size={20} />}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              accentBar="bg-emerald-500"
              subtitle={`${reviewProgress}% selesai dari dokumen periode ini`}
              badge={reviewProgress === 100 ? 'Selesai 100%' : `${reviewProgress}% Selesai`}
              badgeColor="bg-emerald-50 text-emerald-700 border-emerald-200"
            />
            <KpiCard
              title="Perlu Revisi"
              value={stats.revisi}
              icon={<RefreshCw size={20} />}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              accentBar="bg-amber-500"
              clickable={true}
              onClick={() => setIsRevisiModalOpen(true)}
              subtitle={stats.revisi > 0 ? 'Dokumen butuh tindakan perbaikan' : 'Tidak ada revisi diperlukan'}
              badge={stats.revisi > 0 ? 'Perlu Tindakan' : 'Aman'}
              badgeColor={
                stats.revisi > 0
                  ? 'bg-amber-100 text-amber-800 border-amber-300 font-bold'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }
            />
            <KpiCard
              title="Belum Direview"
              value={stats.menunggu + stats.terkirim + stats.terbaca}
              icon={<Clock size={20} />}
              iconBg="bg-slate-50"
              iconColor="text-slate-600"
              accentBar="bg-slate-400"
              subtitle={`${stats.menunggu} menunggu · ${stats.terkirim} terkirim`}
              badge={stats.menunggu + stats.terkirim + stats.terbaca === 0 ? 'Selesai' : 'Pending'}
              badgeColor={
                stats.menunggu + stats.terkirim + stats.terbaca === 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }
            />
          </div>

          {/* ── 4. Grafik Batang Overall Review Stats (Total Dokumen vs Sudah Direview) ── */}
          <OverallReviewCharts />

          {/* ── 5. Grafik Komparasi Section ───────────────────────────────── */}
          <SectionReviewChart />

          {/* ── 6. Tampilan Jadwal Review Dokumen Prosedur (Ringkas, Rapi & Dropdown Saja) ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header Jadwal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-white flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <CalendarClock size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-slate-900 text-base">
                      Jadwal Review Dokumen Prosedur
                    </h2>
                    <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                      {displayedDocs.length} Dokumen
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedMonth === 'all'
                      ? `Menampilkan jadwal seluruh ${filteredDocs.length} dokumen untuk tahun ${selectedYear}`
                      : `Menampilkan jadwal ${filteredDocs.length} dokumen pada bulan ${MONTH_NAMES_ID[selectedMonth]} ${selectedYear}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Sub-Header Toolbar: Filter & Search Bar yang Teratur & Simetris */}
            <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Filter Dropdowns di Kiri */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Dropdown Filter Bulan */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                  <Calendar size={13} className="text-slate-400 flex-shrink-0" />
                  <select
                    value={selectedMonth}
                    onChange={e => {
                      const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                      setSelectedMonth(val);
                      setSchedulePage(1);
                    }}
                    className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                    title="Pilih Bulan Jadwal"
                  >
                    <option value="all">Semua Bulan ({procedures.length})</option>
                    {MONTH_NAMES_ID.map((name, i) => {
                      const count = procedures.filter(p => {
                        const d = new Date(p.tanggalSelesaiApproval);
                        return !isNaN(d.getTime()) && d.getMonth() === i;
                      }).length;
                      return (
                        <option key={i} value={i}>
                          {name} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Dropdown Filter Status */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                  <Filter size={13} className="text-slate-400 flex-shrink-0" />
                  <select
                    value={docStatusFilter}
                    onChange={e => {
                      setDocStatusFilter(e.target.value as any);
                      setSchedulePage(1);
                    }}
                    className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                    title="Filter Status Review"
                  >
                    <option value="all">Semua Status Review</option>
                    <option value="relevan">Hanya Relevan</option>
                    <option value="revisi">Hanya Revisi</option>
                    <option value="belum">Belum Direview</option>
                  </select>
                </div>

                {/* Reset Filter if active */}
                {(docStatusFilter !== 'all' || docSearchQuery || selectedMonth !== 'all') && (
                  <button
                    onClick={() => {
                      setDocStatusFilter('all');
                      setDocSearchQuery('');
                      setSelectedMonth('all');
                      setSchedulePage(1);
                    }}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200 transition-colors shadow-2xs"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {/* Input Pencarian di Kanan */}
              <div className="relative w-full md:w-72">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari dokumen, nomor, PIC..."
                  value={docSearchQuery}
                  onChange={e => {
                    setDocSearchQuery(e.target.value);
                    setSchedulePage(1);
                  }}
                  className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs hover:border-slate-300"
                />
                {docSearchQuery && (
                  <button
                    onClick={() => {
                      setDocSearchQuery('');
                      setSchedulePage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Schedule Table (Ringkas, Lega & Sempurna) */}
            <div className="overflow-x-auto">
              <table className="w-full table-fixed min-w-[880px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="w-[32%] px-5 py-3">Dokumen Prosedur</th>
                    <th className="w-[17%] px-5 py-3">Jadwal Target</th>
                    <th className="w-[16%] px-5 py-3">PIC & Owner</th>
                    <th className="w-[23%] px-5 py-3">Status Review</th>
                    <th className="w-[12%] px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedScheduleDocs.length > 0 ? (
                    paginatedScheduleDocs.map((doc, idx) => {
                      const appDate = doc.tanggalSelesaiApproval ? new Date(doc.tanggalSelesaiApproval) : null;
                      const monthName = appDate && !isNaN(appDate.getTime()) ? MONTH_NAMES_ID[appDate.getMonth()] : '-';
                      const formattedDate = appDate && !isNaN(appDate.getTime())
                        ? appDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '-';

                      return (
                        <tr
                          key={doc.nomorDokumen}
                          onClick={() => setSelectedDocModal({ nomorDokumen: doc.nomorDokumen, namaDokumen: doc.namaDokumen })}
                          className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}
                        >
                          <td className="px-5 py-2.5">
                            <p className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors truncate" title={doc.namaDokumen}>
                              {doc.namaDokumen}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                              <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                                {doc.nomorDokumen}
                              </span>
                              <span>•</span>
                              <span>Level {doc.levelDokumen || '-'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200/60">
                              <Calendar size={11} className="text-blue-500" />
                              <span>{monthName}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">Approval: {formattedDate}</span>
                          </td>
                          <td className="px-5 py-2.5 whitespace-nowrap">
                            <p className="text-xs font-bold text-slate-800 truncate">{doc.pic}</p>
                            <p className="text-[10px] text-slate-400 truncate">Owner: {doc.owner}</p>
                          </td>
                          <td className="px-5 py-2.5 whitespace-nowrap">
                            <StatusBadge
                              status={doc.status}
                              lastSentAt={emailSchedules[doc.nomorDokumen]?.lastSentAt || doc.lastSentAt}
                            />
                          </td>
                          <td className="px-5 py-2.5 text-right whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDocModal({ nomorDokumen: doc.nomorDokumen, namaDokumen: doc.namaDokumen });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all shadow-2xs active:scale-95"
                            >
                              <Eye size={12} />
                              <span>Lihat</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                        <CalendarClock size={36} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-bold text-slate-700">Tidak ada jadwal dokumen yang sesuai</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {docSearchQuery
                            ? 'Coba ganti kata kunci pencarian Anda.'
                            : 'Pilih opsi "Semua Bulan" untuk melihat seluruh dokumen.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls untuk Jadwal */}
            {totalSchedulePages > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <p className="text-xs text-slate-500 font-medium">
                  Menampilkan {displayedDocs.length > 0 ? scheduleStart + 1 : 0}–{scheduleEnd} dari {displayedDocs.length} dokumen
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSchedulePage(p => Math.max(1, p - 1))}
                    disabled={safeSchedulePage === 1}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                  >
                    ← Sebelumnya
                  </button>
                  <span className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-2xs">
                    {safeSchedulePage} / {totalSchedulePages}
                  </span>
                  <button
                    onClick={() => setSchedulePage(p => Math.min(totalSchedulePages, p + 1))}
                    disabled={safeSchedulePage >= totalSchedulePages}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                  >
                    Berikutnya →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── 7. Log Aktivitas Sistem (Desain Modern: Timeline Feed & Mode Tabel) ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4 bg-slate-50/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <Activity size={19} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-slate-900 text-base">Log Aktivitas Sistem</h2>
                    <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                      {filteredActivities.length} Aksi
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Rekam jejak tindakan admin & PIC dalam sistem review prosedur</p>
                </div>
              </div>

              {/* Filter Controls & View Switcher */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* View Switcher: Timeline Feed vs Tabel */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActivityViewMode('timeline')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      activityViewMode === 'timeline'
                        ? 'bg-white text-blue-600 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Tampilan Timeline Feed Modern"
                  >
                    <Activity size={13} />
                    <span>Timeline Feed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityViewMode('table')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      activityViewMode === 'table'
                        ? 'bg-white text-blue-600 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Tampilan Tabel Rapi"
                  >
                    <LayoutList size={13} />
                    <span>Tabel</span>
                  </button>
                </div>

                <select
                  value={activityUserFilter}
                  onChange={e => handleUserFilterChange(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  title="Filter User"
                >
                  <option value="">Semua User</option>
                  {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
                </select>

                <select
                  value={activityTypeFilter}
                  onChange={e => handleTypeFilterChange(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  title="Filter Tipe Aktivitas"
                >
                  <option value="">Semua Tipe Aktivitas</option>
                  {uniqueTypes.map(t => (
                    <option key={t} value={t}>{ACTIVITY_TYPE_CONFIG[t]?.label ?? t}</option>
                  ))}
                </select>

                <div className="relative min-w-[180px]">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari aktivitas..."
                    value={activitySearchQuery}
                    onChange={e => {
                      setActivitySearchQuery(e.target.value);
                      setActivityPage(1);
                    }}
                    className="w-full pl-7 pr-6 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                  {activitySearchQuery && (
                    <button
                      onClick={() => {
                        setActivitySearchQuery('');
                        setActivityPage(1);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>

                {hasActiveFilter && (
                  <button
                    onClick={() => {
                      setActivityUserFilter('');
                      setActivityTypeFilter('');
                      setActivitySearchQuery('');
                      setActivityPage(1);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all shadow-2xs"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>

            {/* Konten Log Aktivitas Berdasarkan Mode Tampilan */}
            {activityViewMode === 'timeline' ? (
              /* ── Modern Timeline Feed Mode ── */
              <div className="p-6">
                {paginatedActivities.length > 0 ? (
                  <div className="relative pl-6 sm:pl-8 space-y-4">
                    {/* Glowing vertical connector line */}
                    <div className="absolute left-[13px] sm:left-[17px] top-3 bottom-3 w-[2px] bg-gradient-to-b from-blue-300 via-slate-200 to-transparent" />

                    {paginatedActivities.map((act) => {
                      const iconCfg = getActivityIcon(act.activityType);
                      return (
                        <div
                          key={act.id}
                          className="relative flex items-start gap-3 sm:gap-4 group"
                        >
                          {/* Node Icon on Timeline */}
                          <div
                            className={`absolute -left-6 sm:-left-8 top-1.5 w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center border shadow-2xs z-10 transition-transform group-hover:scale-110 ${iconCfg.bg} ${iconCfg.border}`}
                          >
                            {iconCfg.icon}
                          </div>

                          {/* Event Card */}
                          <div className="flex-1 bg-white hover:bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 shadow-2xs transition-all duration-200 group-hover:border-blue-200 group-hover:shadow-xs">
                            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                              {/* User Info */}
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
                                  {(act.username || 'S')[0].toUpperCase()}
                                </div>
                                <span className="text-xs font-bold text-slate-800">
                                  {act.username || 'System'}
                                </span>
                                {act.username?.toLowerCase().includes('admin') ? (
                                  <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                                    Admin
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200">
                                    PIC
                                  </span>
                                )}
                              </div>

                              {/* Time & Action Badge */}
                              <div className="flex items-center gap-2">
                                <ActivityTypeBadge type={act.activityType} />
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200/60">
                                  <Clock size={11} className="text-slate-400" />
                                  <span>{formatActivityTime(act.createdAt)}</span>
                                </span>
                              </div>
                            </div>

                            {/* Description with enriched highlights */}
                            <div className="text-xs text-slate-700 leading-relaxed font-normal bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                              {renderFormattedDescription(act.activityDescription)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-sm text-slate-400">
                    <Clock size={36} className="mx-auto mb-3 text-slate-300" />
                    <p className="font-semibold text-slate-600">
                      {hasActiveFilter ? 'Tidak ada aktivitas yang sesuai filter' : 'Belum ada aktivitas tercatat'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* ── Modern Table Mode ── */
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="w-[190px] px-5 py-3.5">Waktu Aktivitas</th>
                      <th className="w-[140px] px-5 py-3.5">Pengguna</th>
                      <th className="w-[160px] px-5 py-3.5">Tipe Aksi</th>
                      <th className="px-5 py-3.5">Deskripsi Aktivitas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedActivities.length > 0 ? (
                      paginatedActivities.map((act, idx) => (
                        <tr key={act.id} className={`hover:bg-blue-50/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                          <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-medium text-slate-600">
                              <Clock size={12} className="text-slate-400 flex-shrink-0" />
                              <span>{formatActivityTime(act.createdAt)}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                {(act.username || 'S')[0].toUpperCase()}
                              </div>
                              <span className="text-xs font-bold text-slate-800 truncate">{act.username || 'System'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <ActivityTypeBadge type={act.activityType} />
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-700 font-medium leading-relaxed">
                            <p className="line-clamp-2" title={act.activityDescription}>
                              {renderFormattedDescription(act.activityDescription)}
                            </p>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-400">
                          <Clock size={36} className="mx-auto mb-3 text-slate-300" />
                          <p className="font-semibold text-slate-600">
                            {hasActiveFilter ? 'Tidak ada aktivitas yang sesuai filter' : 'Belum ada aktivitas tercatat'}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {totalActivityPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <p className="text-xs text-slate-500 font-medium">
                  Menampilkan {filteredActivities.length > 0 ? activityStart + 1 : 0}–{activityEnd} dari {filteredActivities.length} aktivitas
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                    disabled={safeActivityPage === 1}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                  >
                    ← Sebelumnya
                  </button>
                  <span className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-2xs">
                    {safeActivityPage} / {totalActivityPages}
                  </span>
                  <button
                    onClick={() => setActivityPage(p => Math.min(totalActivityPages, p + 1))}
                    disabled={safeActivityPage >= totalActivityPages}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                  >
                    Berikutnya →
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── AddProcedureModal (inline) ─────────────────────────────────── */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Tambah Prosedur Baru</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Isi semua kolom dengan informasi yang akurat</p>
                </div>
                <button
                  onClick={() => { if (!isSaving) { setIsAddModalOpen(false); setNeedsReview(null); } }}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                >
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

                {/* Upload File Dokumen Baru */}
                <div className="col-span-2 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Upload File Dokumen Baru (PDF) <span className="text-red-500">*</span>
                  </label>
                  <div
                    onClick={() => newProcedureFileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setIsFileDragging(true); }}
                    onDragLeave={e => { e.preventDefault(); setIsFileDragging(false); }}
                    onDrop={e => {
                      e.preventDefault();
                      setIsFileDragging(false);
                      const f = e.dataTransfer.files?.[0];
                      if (!f) return;
                      setFileUploadError(null);
                      if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
                        setFileUploadError('Hanya file format PDF yang diperbolehkan.');
                        return;
                      }
                      if (f.size > 10 * 1024 * 1024) {
                        setFileUploadError('Ukuran file maksimal 10MB.');
                        return;
                      }
                      setNewProcedureFile(f);
                    }}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                      newProcedureFile
                        ? 'border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50/60'
                        : isFileDragging
                        ? 'border-blue-500 bg-blue-50/60 scale-[0.99]'
                        : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/70 bg-slate-50/30'
                    }`}
                  >
                    <input
                      ref={newProcedureFileInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      disabled={isSaving}
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setFileUploadError(null);
                        if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
                          setFileUploadError('Hanya file format PDF yang diperbolehkan.');
                          return;
                        }
                        if (f.size > 10 * 1024 * 1024) {
                          setFileUploadError('Ukuran file maksimal 10MB.');
                          return;
                        }
                        setNewProcedureFile(f);
                      }}
                    />

                    {newProcedureFile ? (
                      <div className="flex items-center justify-between gap-3 text-left">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 font-bold text-[11px] border border-red-200">
                            PDF
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{newProcedureFile.name}</p>
                            <p className="text-[11px] text-slate-500">{(newProcedureFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 rounded-md">
                            ✓ Terpilih
                          </span>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setNewProcedureFile(null);
                              if (newProcedureFileInputRef.current) newProcedureFileInputRef.current.value = '';
                            }}
                            disabled={isSaving}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus file"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2.5">
                        <Upload size={22} className="mx-auto text-blue-600 mb-1.5" />
                        <p className="text-xs font-bold text-slate-700">
                          Klik untuk upload dokumen baru <span className="font-normal text-slate-500">atau drag & drop ke sini</span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Format file: PDF (Maks. 10MB)</p>
                      </div>
                    )}
                  </div>
                  {fileUploadError && <p className="text-xs text-rose-600 font-semibold">{fileUploadError}</p>}
                </div>
                {/* Banner Alur Approval Dokumen */}
                <div className="col-span-2">
                  <div className="flex items-start gap-3 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200/90 rounded-xl px-4 py-3 shadow-2xs">
                    <span className="text-lg leading-none">🛡️</span>
                    <div>
                      <p className="text-xs font-bold text-blue-900">Alur Approval Dokumen Otomatis</p>
                      <p className="text-xs text-blue-700/90 mt-0.5 leading-relaxed">
                        Dokumen baru yang dibuat akan langsung masuk ke halaman <span className="font-bold text-blue-900">Approval Dokumen</span> untuk melewati proses verifikasi dan persetujuan bertahap (<strong className="text-slate-800">Prepared</strong>, <strong className="text-slate-800">Checked</strong>, dan <strong className="text-slate-800">Approved</strong>) sebelum aktif.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
                <button
                  onClick={() => { if (!isSaving) { setIsAddModalOpen(false); setNeedsReview(null); } }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveNewProcedure}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving && <span className="animate-spin w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full" />}
                  {isSaving ? 'Menyimpan...' : 'Simpan Prosedur'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── EmailScheduleModal ─────────────────────────────────────────── */}
        <EmailScheduleModal
          isOpen={isEmailScheduleModalOpen}
          onClose={async () => {
            setIsEmailScheduleModalOpen(false);
            const [procs] = await Promise.all([getAllProcedures(), loadEmailSchedules()]);
            setProcedures(procs);
          }}
          procedures={procedures}
          emailSchedules={emailSchedules}
          onScheduleChange={async () => {
            const [procs] = await Promise.all([getAllProcedures(), loadEmailSchedules()]);
            setProcedures(procs);
          }}
        />

        {/* ── AdminRequestsModal (Modal Detail Request PIC) ──────────────── */}
        <AdminRequestsModal
          isOpen={isRequestsModalOpen}
          onClose={() => setIsRequestsModalOpen(false)}
          requests={picRequests}
          isLoading={loadingRequests}
          onRefresh={loadPicRequests}
          onOpenDocument={(nomorDokumen, namaDokumen) => {
            setSelectedDocModal({ nomorDokumen, namaDokumen });
          }}
        />

        {/* ── AdminRevisiModal (Modal Detail Dokumen Perlu Revisi) ──────────── */}
        <AdminRevisiModal
          isOpen={isRevisiModalOpen}
          onClose={() => setIsRevisiModalOpen(false)}
          documents={revisiDocs}
          allDocuments={allRevisiDocs}
          isLoading={loading}
          onRefresh={async () => {
            const procs = await getAllProcedures();
            setProcedures(procs);
          }}
          onOpenDocument={(nomorDokumen, namaDokumen) => {
            setSelectedDocModal({ nomorDokumen, namaDokumen });
          }}
          onMarkAsRelevan={handleMarkAsRelevan}
          selectedMonthName={selectedMonth === 'all' ? 'Semua Bulan' : MONTH_NAMES_SHORT[selectedMonth]}
          selectedYear={selectedYear}
        />

        {/* ── DocumentModal (dibuka saat klik dokumen dari jadwal atau request) ── */}
        {selectedDocModal && (
          <DocumentModal
            isOpen={Boolean(selectedDocModal)}
            onClose={async () => {
              setSelectedDocModal(null);
              await loadPicRequests();
              const procs = await getAllProcedures();
              setProcedures(procs);
            }}
            nomorDokumen={selectedDocModal.nomorDokumen}
            namaDokumen={selectedDocModal.namaDokumen}
            markSeenOnOpen={true}
          />
        )}

      </AdminLayout>
    </ProtectedRoute>
  );
}