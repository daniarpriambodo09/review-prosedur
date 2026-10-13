// app/status-review/page.tsx
'use client';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  ProcedureDocument,
  StatusType,
  getAllProcedures,
  getDocumentReview,
  archiveProcedure,
  markReviewAsSeen, 
  hasUnseenReview,
} from '@/data/procedures/all-procedures';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DocumentModal from '@/components/documents/DocumentModal';
import EmailScheduleModal from '@/components/status-review/EmailScheduleModal';
import EditProcedureModal from '@/components/status-review/EditProcedureModal';
import ApprovalCard from '@/components/status-review/ApprovalCard';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  Search, X, Plus, Calendar, Download, Archive,
  ChevronUp, ChevronDown, FileText, CheckCircle2,
  RefreshCw, Clock, Eye, Pencil, Trash2, Users,
  CalendarX, FileSpreadsheet, Upload,
} from 'lucide-react';
import RevisionNotesModal from '@/components/status-review/RevisionNotesModal';
import { FileClock } from 'lucide-react';
import { useDialog } from '@/contexts/DialogContext';

// =============================================================================
// Helpers — TIDAK DIUBAH
// =============================================================================
function formatToDDMonYYYY(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()}-${M[d.getMonth()]}-${d.getFullYear()}`;
}

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
  if (nowYM < schedYM) return false;
  return true;
}

// =============================================================================
// Types
// =============================================================================
interface EmailSchedule {
  id: number;
  nomorDokumen: string;
  scheduledEmailAt: string;
  emailStatus: 'pending' | 'sent' | 'failed' | 'cancelled';
  lastSentAt?: string;
  retryCount: number;
  errorMessage?: string;
  namaDokumen?: string;
  pic?: string;
  email?: string;
}

type SortKey = 'namaDokumen' | 'nomorDokumen' | 'levelDokumen' | 'tanggalSelesaiApproval' | 'revisi' | 'pic';
type SortDir = 'asc' | 'desc' | null;

// =============================================================================
// Business logic helpers — TIDAK DIUBAH
// =============================================================================
function isScheduleExpired(schedule: EmailSchedule): boolean {
  if (schedule.emailStatus !== 'sent') return false;
  if (!schedule.lastSentAt) return false;
  const sentDate   = new Date(schedule.lastSentAt);
  const expiryDate = new Date(sentDate.getFullYear(), sentDate.getMonth() + 2, sentDate.getDate());
  return new Date() >= expiryDate;
}

function resolveDisplayStatus(
  doc: ProcedureDocument,
  emailSchedules: Record<string, EmailSchedule>
): StatusType {
  if (['Relevan', 'Revisi', 'Obsolete'].includes(doc.status)) return doc.status as StatusType;
  if (doc.status === 'Telah dibaca') return 'Telah dibaca';
  const schedule = emailSchedules[doc.nomorDokumen];
  if (schedule && schedule.emailStatus !== 'cancelled' && !isScheduleExpired(schedule)) {
    if (schedule.emailStatus === 'sent')    return 'Telah terkirim';
    if (schedule.emailStatus === 'pending') return 'Belum dikirim';
  }
  return doc.status;
}

// =============================================================================
// Status Badge — modern pill dengan keterangan tanggal/jam terkirim
// =============================================================================
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

interface StatusTimeInfo {
  formatted: string;
  tooltip: string;
}

function getStatusTimeInfo(
  status: StatusType,
  doc?: {
    lastSentAt?: string | null;
    lastReviewedAt?: string | null;
    revisionRequestedAt?: string | null;
    scheduledEmailAt?: string | null;
    updatedAt?: string | null;
    createdAt?: string | null;
  } | null,
  overrideLastSentAt?: string | null
): StatusTimeInfo | null {
  if (!doc && !overrideLastSentAt) return null;

  let targetDateStr: string | null | undefined = null;
  let labelPrefix = 'Diperbarui pada';

  switch (status) {
    case 'Telah terkirim':
      targetDateStr = overrideLastSentAt || doc?.lastSentAt || doc?.updatedAt;
      labelPrefix = 'Email terkirim pada';
      break;

    case 'Relevan':
      targetDateStr = doc?.lastReviewedAt || doc?.updatedAt || doc?.createdAt;
      labelPrefix = doc?.lastReviewedAt ? 'Direview relevan pada' : 'Status relevan sejak';
      break;

    case 'Revisi':
      targetDateStr = doc?.revisionRequestedAt || doc?.lastReviewedAt || doc?.updatedAt;
      labelPrefix = 'Permintaan revisi pada';
      break;

    case 'Obsolete':
      targetDateStr = doc?.lastReviewedAt || doc?.updatedAt;
      labelPrefix = 'Ditandai obsolete pada';
      break;

    case 'Telah dibaca':
      targetDateStr = doc?.updatedAt;
      labelPrefix = 'Dibaca PIC pada';
      break;

    case 'Menunggu':
      targetDateStr = doc?.scheduledEmailAt || doc?.updatedAt || doc?.createdAt;
      labelPrefix = 'Menunggu review sejak';
      break;

    case 'Belum dikirim':
      targetDateStr = doc?.scheduledEmailAt || doc?.updatedAt || doc?.createdAt;
      labelPrefix = doc?.scheduledEmailAt ? 'Jadwal kirim email' : 'Status belum dikirim sejak';
      break;

    case 'Menunggu ACC Prepared':
    case 'Menunggu ACC Checked':
    case 'Menunggu ACC Approved':
      targetDateStr = doc?.updatedAt || doc?.createdAt;
      labelPrefix = 'Masuk alur approval pada';
      break;

    case 'Ditolak':
      targetDateStr = doc?.updatedAt;
      labelPrefix = 'Ditolak pada';
      break;

    default:
      targetDateStr = doc?.updatedAt || doc?.createdAt;
      labelPrefix = 'Diperbarui pada';
      break;
  }

  const formatted = formatSentDateTime(targetDateStr);
  if (!formatted) return null;

  return {
    formatted,
    tooltip: `${labelPrefix} ${formatted}`,
  };
}

function StatusBadge({
  status,
  doc,
  lastSentAt,
}: {
  status: StatusType;
  doc?: ProcedureDocument | null;
  lastSentAt?: string | null;
}) {
  const styles: Record<string, { bg: string; text: string; dot: string; clock: string }> = {
    Revisi:           { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   clock: 'text-amber-600'   },
    Relevan:          { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', clock: 'text-emerald-600' },
    Obsolete:         { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     clock: 'text-red-600'     },
    Menunggu:         { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    clock: 'text-blue-600'    },
    'Belum dikirim':  { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500',  clock: 'text-orange-600'  },
    'Telah terkirim': { bg: 'bg-cyan-50',    text: 'text-cyan-700',    dot: 'bg-cyan-500',    clock: 'text-cyan-600'    },
    'Telah dibaca':   { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-500',  clock: 'text-purple-600'  },
    'Menunggu ACC Prepared': { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500', clock: 'text-violet-600' },
    'Menunggu ACC Checked':  { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500', clock: 'text-violet-600' },
    'Menunggu ACC Approved': { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500', clock: 'text-violet-600' },
    'Ditolak':        { bg: 'bg-rose-50',     text: 'text-rose-700',    dot: 'bg-rose-500',    clock: 'text-rose-600'    },
    '-':              { bg: 'bg-slate-50',   text: 'text-slate-500',   dot: 'bg-slate-400',   clock: 'text-slate-400'   },
  };
  const s = styles[status] ?? styles['-'];
  const timeInfo = getStatusTimeInfo(status, doc, lastSentAt);

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${s.bg} ${s.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
        {status}
      </span>
      {timeInfo && (
        <span
          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 whitespace-nowrap pl-0.5"
          title={timeInfo.tooltip}
        >
          <Clock size={11} className={`${s.clock} flex-shrink-0`} />
          <span>{timeInfo.formatted}</span>
        </span>
      )}
    </div>
  );
}

// =============================================================================
// Email Status Badge
// =============================================================================
function EmailStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string }> = {
    pending:   { bg: 'bg-amber-50',   text: 'text-amber-700'   },
    sent:      { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    failed:    { bg: 'bg-red-50',     text: 'text-red-700'     },
    cancelled: { bg: 'bg-slate-50',   text: 'text-slate-600'   },
  };
  const s = styles[status] ?? styles['pending'];
  const label: Record<string, string> = {
    pending: 'Menunggu', sent: 'Terkirim', failed: 'Gagal', cancelled: 'Dibatalkan',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${s.bg} ${s.text}`}>
      {label[status] ?? status.toUpperCase()}
    </span>
  );
}

// =============================================================================
// EmailScheduleDot
// =============================================================================
function EmailScheduleDot({
  schedule,
  isOpen,
  onToggle,
}: {
  schedule: EmailSchedule;
  isOpen: boolean;
  onToggle: () => void;
}) {
  if (schedule.emailStatus !== 'sent' || !schedule.lastSentAt) return null;

  const sentDate   = new Date(schedule.lastSentAt);
  const expiryDate = new Date(sentDate.getFullYear(), sentDate.getMonth() + 2, sentDate.getDate());
  const isExpired  = new Date() >= expiryDate;

  return (
    <div className="relative inline-flex" data-email-schedule-dot>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onToggle(); }}
        title="Klik untuk detail masa berlaku"
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all active:scale-90
                    ${isExpired ? 'bg-red-500' : 'bg-emerald-500'}
                    ${isOpen ? 'ring-2 ring-offset-1 ring-slate-300' : 'hover:ring-2 hover:ring-offset-1 hover:ring-slate-200'}`}
      />
      {isOpen && (
        <div
          className="absolute z-20 left-1/2 -translate-x-1/2 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 p-3 text-xs"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isExpired ? 'bg-red-500' : 'bg-emerald-500'}`} />
            <span className="font-semibold text-slate-700">
              {isExpired ? 'Jadwal Expired' : 'Email Terkirim'}
            </span>
          </div>
          <p className="text-slate-500">
            Terkirim:{' '}
            <span className="font-medium text-slate-700">
              {sentDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </p>
          <p className={isExpired ? 'text-red-500 font-medium mt-0.5' : 'text-slate-500 mt-0.5'}>
            {isExpired
              ? '⚠ Sudah melewati masa berlaku'
              : <>Berlaku s/d:{' '}
                  <span className="font-medium text-slate-700">
                    {expiryDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </>}
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// RecentlyReviewedBadge — LOGIC TIDAK DIUBAH, hanya visual diperbarui
// =============================================================================
function RecentlyReviewedBadge({
  lastReviewedAt,
  onClick,
}: {
  lastReviewedAt: string;
  onClick: () => void;
}) {
  const reviewedAt = new Date(lastReviewedAt);

  function formatRelative(date: Date): string {
    const diffMs   = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    const diffHrs  = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffMins < 1)  return 'baru saja';
    if (diffMins < 60) return `${diffMins} mnt lalu`;
    if (diffHrs  < 24) return `${diffHrs} jam lalu`;
    return `${diffDays} hari lalu`;
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      title={`Klik untuk tandai sudah dilihat.\nDireview: ${reviewedAt.toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })}`}
      className="
        inline-flex items-center gap-1.5
        px-2 py-0.5 rounded-full
        text-[10px] font-bold
        bg-violet-600 text-white
        hover:bg-violet-700
        whitespace-nowrap cursor-pointer select-none
        transition-all active:scale-95
      "
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
      </span>
      Baru direview · {formatRelative(reviewedAt)}
    </button>
  );
}

// =============================================================================
// Highlight keyword — TIDAK DIUBAH
// =============================================================================
function Highlight({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword.trim()) return <>{text}</>;
  const regex = new RegExp(`(${keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5 not-italic font-medium">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// =============================================================================
// Summary Card
// =============================================================================
function SummaryCard({
  label, value, icon, colorBg, colorText,
}: {
  label: string; value: number;
  icon: React.ReactNode; colorBg: string; colorText: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorBg}`}>
          <div className={colorText}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sortable TH
// =============================================================================
function SortableTh({
  label, colKey, currentSort, currentDir, onSort,
}: {
  label: string; colKey: string; currentSort: SortKey | null;
  currentDir: SortDir; onSort: (k: SortKey) => void;
}) {
  const active = currentSort === colKey;
  return (
    <th
      onClick={() => onSort(colKey as SortKey)}
      title="Klik 1× → A→Z, klik 2× → Z→A, klik 3× → reset"
      className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-800 hover:bg-slate-100 transition-colors"
    >
      <div className="flex items-center gap-1 whitespace-nowrap">
        {label}
        <span className="inline-flex flex-col" style={{ opacity: active ? 1 : 0.3 }}>
          <ChevronUp size={10} className={active && currentDir === 'asc' ? 'text-blue-600' : 'text-slate-400'} />
          <ChevronDown size={10} className={active && currentDir === 'desc' ? 'text-blue-600' : 'text-slate-400'} style={{ marginTop: '-2px' }} />
        </span>
      </div>
    </th>
  );
}

// =============================================================================
// AutoResizeTextarea — TIDAK DIUBAH
// =============================================================================
interface AutoResizeTextareaProps {
  value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean;
  className?: string; minRows?: number; maxRows?: number;
}
function AutoResizeTextarea({
  value, onChange, placeholder, disabled, className = '', minRows = 1, maxRows = 6,
}: AutoResizeTextareaProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const resize = useCallback(() => {
    const el = taRef.current; if (!el) return;
    el.style.height = 'auto';
    const style      = getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight) || 20;
    const paddingY   = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const minH       = lineHeight * minRows + paddingY;
    const maxH       = lineHeight * maxRows + paddingY;
    const newH       = Math.min(Math.max(el.scrollHeight, minH), maxH);
    el.style.height    = `${newH}px`;
    el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden';
  }, [minRows, maxRows]);
  useEffect(() => { resize(); }, [value, resize]);
  return (
    <textarea ref={taRef} value={value} rows={minRows}
      onChange={e => onChange(e.target.value)} onInput={resize}
      placeholder={placeholder} disabled={disabled}
      className={`resize-none leading-relaxed ${className}`}
      style={{ overflowY: 'hidden' }}
    />
  );
}

const fieldCls =
  'w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ' +
  'focus:border-transparent transition-all bg-white hover:border-slate-300';

interface StaffItem {
  kode: string;
  nama: string;
  email: string;
  jabatan?: string | null;
  unitNama?: string | null;
}

// =============================================================================
// AddProcedureModal — logic TIDAK DIUBAH, visual diperbarui
// =============================================================================
function AddProcedureModal({
  isOpen, onClose, onSave, value, onChange, file, onFileChange, isSaving,
}: {
  isOpen: boolean; onClose: () => void; onSave: () => void;
  value: Omit<ProcedureDocument, 'status' | 'revisi' | 'id'> & { revisi?: string };
  onChange: (field: keyof Omit<ProcedureDocument, 'status' | 'revisi' | 'id'>, val: string) => void;
  file: File | null;
  onFileChange: (f: File | null) => void;
  isSaving: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Dropdown PIC State
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [isPicOpen, setIsPicOpen] = useState(false);
  const [picSearch, setPicSearch] = useState('');
  const picContainerRef = useRef<HTMLDivElement | null>(null);

  // Load daftar staff untuk dropdown PIC
  useEffect(() => {
    if (!isOpen) return;
    const loadStaff = async () => {
      try {
        const res = await fetch('/review-prosedur/api/staff');
        if (res.ok) {
          const data = await res.json();
          setStaffList(data || []);
        }
      } catch (e) {
        console.error('Error fetching staff list for PIC:', e);
      }
    };
    loadStaff();
  }, [isOpen]);

  // Tutup dropdown PIC saat klik di luar
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (picContainerRef.current && !picContainerRef.current.contains(e.target as Node)) {
        setIsPicOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const sortedStaff = useMemo(() => {
    return [...staffList].sort((a, b) => (a.kode || '').localeCompare(b.kode || ''));
  }, [staffList]);

  const filteredPicStaff = useMemo(() => {
    const q = picSearch.trim().toLowerCase();
    if (!q) return sortedStaff;
    return sortedStaff.filter(s =>
      (s.kode && s.kode.toLowerCase().includes(q)) ||
      (s.nama && s.nama.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.jabatan && s.jabatan.toLowerCase().includes(q)) ||
      (s.unitNama && s.unitNama.toLowerCase().includes(q))
    );
  }, [sortedStaff, picSearch]);

  const selectedStaffObj = useMemo(() => {
    if (!value.pic) return null;
    return staffList.find(s => s.kode.toLowerCase().trim() === value.pic.toLowerCase().trim());
  }, [staffList, value.pic]);

  const handleSelectPic = (staff: StaffItem) => {
    onChange('pic', staff.kode); // Diambil kode staff saja
    onChange('email', staff.email); // Email terisi otomatis sesuai kode PIC
    setIsPicOpen(false);
    setPicSearch('');
  };

  if (!isOpen) return null;

  const handleFile = (f: File | undefined | null) => {
    setFileError(null);
    if (!f) {
      onFileChange(null);
      return;
    }
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setFileError('Hanya file format PDF yang diperbolehkan.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setFileError('Ukuran file maksimal 10MB.');
      return;
    }
    onFileChange(f);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Tambah Prosedur Baru</h3>
            <p className="text-xs text-slate-500 mt-0.5">Isi semua kolom dan unggah file dokumen prosedur</p>
          </div>
          <button onClick={onClose} disabled={isSaving}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Dokumen <span className="text-red-500">*</span></label>
            <AutoResizeTextarea value={value.namaDokumen || ''} onChange={v => onChange('namaDokumen', v)}
              placeholder="Masukkan nama dokumen" disabled={isSaving} minRows={1} maxRows={5} className={fieldCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nomor Dokumen <span className="text-red-500">*</span></label>
            <input type="text" value={value.nomorDokumen || ''} disabled={isSaving}
              onChange={e => onChange('nomorDokumen', e.target.value)}
              placeholder="Masukkan nomor dokumen" className={fieldCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Level Dokumen <span className="text-red-500">*</span></label>
            <input type="text" value={value.levelDokumen || ''} disabled={isSaving}
              onChange={e => onChange('levelDokumen', e.target.value)}
              placeholder="Masukkan level dokumen" className={fieldCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Owner <span className="text-red-500">*</span></label>
            <AutoResizeTextarea value={value.owner || ''} onChange={v => onChange('owner', v)}
              placeholder="Masukkan owner" disabled={isSaving} minRows={1} maxRows={3} className={fieldCls} />
          </div>
          {/* PIC (Kode Staff) dengan Dropdown & Search */}
          <div className="relative" ref={picContainerRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                PIC (Kode Staff) <span className="text-red-500">*</span>
              </label>
              {selectedStaffObj && (
                <span
                  className="text-[10px] font-medium text-blue-600 truncate max-w-[150px]"
                  title={`${selectedStaffObj.nama} (${selectedStaffObj.jabatan || selectedStaffObj.unitNama || ''})`}
                >
                  {selectedStaffObj.nama}
                </span>
              )}
            </div>

            <div className="relative flex items-center">
              <input
                type="text"
                value={value.pic || ''}
                disabled={isSaving}
                onFocus={() => {
                  setPicSearch('');
                  setIsPicOpen(true);
                }}
                onClick={() => {
                  setPicSearch('');
                  setIsPicOpen(true);
                }}
                onChange={e => {
                  onChange('pic', e.target.value.toUpperCase());
                  setPicSearch(e.target.value);
                  setIsPicOpen(true);
                }}
                placeholder="Pilih kode PIC (mis. DP)..."
                className={`${fieldCls} pr-8 font-mono font-bold tracking-wide uppercase`}
              />

              <button
                type="button"
                tabIndex={-1}
                disabled={isSaving}
                onClick={() => {
                  setIsPicOpen(prev => {
                    const next = !prev;
                    if (next) setPicSearch('');
                    return next;
                  });
                }}
                className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                title="Tampilkan daftar PIC"
              >
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${isPicOpen ? 'rotate-180 text-blue-600' : ''}`}
                />
              </button>
            </div>

            {/* Dropdown Popover PIC */}
            {isPicOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-[320px] sm:w-[350px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                {/* Search Header */}
                <div className="p-2.5 bg-slate-50/90 border-b border-slate-100 space-y-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={picSearch}
                      onChange={e => setPicSearch(e.target.value)}
                      placeholder="Cari kode staff, nama, email..."
                      className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    {picSearch && (
                      <button
                        type="button"
                        onClick={() => setPicSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 px-0.5 font-medium">
                    <span>
                      {picSearch
                        ? `Ditemukan: ${filteredPicStaff.length} staff`
                        : `Semua Staff PIC (${staffList.length})`}
                    </span>
                    <span className="text-blue-600">Pilih kode PIC</span>
                  </div>
                </div>

                {/* Staff List */}
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {filteredPicStaff.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Tidak ada PIC yang cocok dengan &quot;{picSearch}&quot;
                    </div>
                  ) : (
                    filteredPicStaff.map((s, idx) => {
                      const isSelected = value.pic?.toUpperCase() === s.kode?.toUpperCase();
                      return (
                        <button
                          key={`${s.kode}-${idx}`}
                          type="button"
                          onClick={() => handleSelectPic(s)}
                          className={`w-full text-left px-3 py-2.5 transition-colors flex items-center justify-between gap-2.5 group ${
                            isSelected
                              ? 'bg-blue-50/90 text-blue-900 border-l-4 border-blue-600'
                              : 'hover:bg-slate-50/80 text-slate-800'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200/80">
                                {s.kode}
                              </span>
                              <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate">
                                {s.nama}
                              </span>
                              {isSelected && (
                                <CheckCircle2 size={13} className="text-blue-600 flex-shrink-0 ml-auto" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5 pl-0.5">
                              {s.email}
                            </p>
                          </div>

                          <div className="flex flex-col items-end flex-shrink-0">
                            {s.jabatan && (
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.2 rounded">
                                {s.jabatan}
                              </span>
                            )}
                            {s.unitNama && (
                              <span className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[90px]">
                                {s.unitNama}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Email PIC (Otomatis terisi dari PIC) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Email <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 font-normal">
                Otomatis dari PIC
              </span>
            </div>
            <input
              type="email"
              value={value.email || ''}
              disabled={isSaving}
              onChange={e => onChange('email', e.target.value)}
              placeholder="Email terisi otomatis dari kode PIC"
              className={fieldCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tanggal Selesai Approval <span className="text-slate-400 font-normal">(Opsional)</span>
            </label>
            <input type="date" value={value.tanggalSelesaiApproval || ''} disabled={isSaving}
              onChange={e => onChange('tanggalSelesaiApproval' as any, e.target.value)}
              className={fieldCls} />
            <p className="text-[10px] text-slate-400 mt-1">
              Otomatis terisi saat semua role approver (Prepared, Checked, Approved) telah menyetujui dokumen.
            </p>
          </div>

          {/* Upload File Dokumen Baru */}
          <div className="col-span-2 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Upload File Dokumen Baru (PDF) <span className="text-red-500">*</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
              onDrop={e => {
                e.preventDefault();
                setIsDragging(false);
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                file
                  ? 'border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50/60'
                  : isDragging
                  ? 'border-blue-500 bg-blue-50/60 scale-[0.99]'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/70 bg-slate-50/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={isSaving}
                onChange={e => handleFile(e.target.files?.[0])}
              />

              {file ? (
                <div className="flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 font-bold text-[11px] border border-red-200">
                      PDF
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                      <p className="text-[11px] text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
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
                        onFileChange(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
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
            {fileError && <p className="text-xs text-rose-600 font-semibold">{fileError}</p>}
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSaving}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition-all">
            Batal
          </button>
          <button onClick={onSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
            {isSaving && <span className="animate-spin w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full" />}
            {isSaving ? 'Menyimpan...' : 'Simpan Prosedur'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ROWS_PER_PAGE
// =============================================================================
const ROWS_PER_PAGE = 10;

// =============================================================================
// Main Page
// =============================================================================
export default function StatusReviewPage() {
  const [searchValue,     setSearchValue]     = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterValue,     setFilterValue]     = useState('');
  const [monthFilter,     setMonthFilter]     = useState('');
  const [currentPage,     setCurrentPage]     = useState(1);
  const [dataWithStatus,  setDataWithStatus]  = useState<ProcedureDocument[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [isAddModalOpen,  setIsAddModalOpen]  = useState(false);
  const [isSaving,        setIsSaving]        = useState(false);
  const [newProcedure, setNewProcedure] = useState<Omit<ProcedureDocument, 'status' | 'revisi' | 'id'>>({
    namaDokumen: '', nomorDokumen: '', levelDokumen: '',
    tanggalSelesaiApproval: '', owner: '', pic: '', email: '',
  });
  const [needsReview, setNeedsReview] = useState<boolean | null>(null);
  const [newProcedureFile, setNewProcedureFile] = useState<File | null>(null);
  const [requestIdToComplete, setRequestIdToComplete] = useState<number | null>(null);
  const [isExportingAudit, setIsExportingAudit] = useState(false);

  const [editingProcedure, setEditingProcedure] = useState<ProcedureDocument | null>(null);
  const [isEditModalOpen,  setIsEditModalOpen]  = useState(false);

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const { showAlert, showConfirm, showSuccess, showError, showWarning } = useDialog();

  // BUG FIX #3 & #4: selectedDocument untuk DocumentModal
  const [selectedDocument,         setSelectedDocument]         = useState<{ nomorDokumen: string; namaDokumen: string; status: string } | null>(null);
  const [isEmailScheduleModalOpen, setIsEmailScheduleModalOpen] = useState(false);
  const [emailSchedules,           setEmailSchedules]           = useState<Record<string, EmailSchedule>>({});

  // nomorDokumen yang popover detail jadwal-nya sedang terbuka (titik hijau/merah)
  const [openScheduleDetail, setOpenScheduleDetail] = useState<string | null>(null);

  // 🆕 BARU: dokumen yang kartu Approval-nya (Prepared/Checked/Approved) sedang dibuka
  const [approvalDoc, setApprovalDoc] = useState<{ nomorDokumen: string; namaDokumen: string } | null>(null);
  const [revisionDoc, setRevisionDoc] = useState<{ nomorDokumen: string; namaDokumen: string; revisi?: string } | null>(null);

  // Search input ref & keyboard shortcut Ctrl+K atau /
  const searchBarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.key === 'k') ||
        (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')
      ) {
        e.preventDefault();
        searchBarRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Load email schedules — TIDAK DIUBAH ────────────────────────────────────
  const loadEmailSchedules = useCallback(async () => {
    try {
      const res = await fetch('/review-prosedur/api/email-schedules');
      if (res.ok) {
        const schedules = await res.json();
        const map: Record<string, EmailSchedule> = {};
        schedules.forEach((s: EmailSchedule) => { map[s.nomorDokumen] = s; });
        setEmailSchedules(map);
      }
    } catch (error) {
      console.error('Error loading email schedules:', error);
    }
  }, []);

  // ── Load procedures — TIDAK DIUBAH ─────────────────────────────────────────
  const loadData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const procedures = await getAllProcedures();
      // 🐛 FIX: status alur approval berjenjang (Prepared/Checked/Approved) juga
      // harus dianggap "status workflow" — kalau tidak, tabel ini akan meng-
      // overlay status tsb dengan record document_reviews BULAN INI yang masih
      // menyimpan hasil review PIC sebelumnya (mis. 'Revisi'), sehingga status
      // yang sebenarnya sudah maju ke 'Menunggu ACC ...' malah tampil balik
      // jadi 'Revisi' di tabel sampai admin upload ulang sekali lagi.
      const workflowStatuses: StatusType[] = [
        'Belum dikirim', 'Telah terkirim', 'Telah dibaca', 'Menunggu',
        'Menunggu ACC Prepared', 'Menunggu ACC Checked', 'Menunggu ACC Approved',
        // 🆕 status ditolak saat proses ACC — sama seperti status ACC lainnya,
        // ini bukan hasil dari document_reviews, jadi harus dikecualikan dari
        // overlay supaya tidak ketiban status lama.
        'Ditolak',
      ];
      const withReviews = await Promise.all(
        procedures.map(async (doc) => {
          if (workflowStatuses.includes(doc.status)) return doc;
          const docDate       = new Date(doc.tanggalSelesaiApproval);
          const approvalMonth = isNaN(docDate.getTime()) ? new Date().getMonth() : docDate.getMonth();
          const review        = await getDocumentReview(doc.nomorDokumen, approvalMonth);
          if (review && ['Relevan', 'Revisi', 'Obsolete'].includes(review.status)) {
            return {
              ...doc,
              status: review.status as StatusType,
              revisi: review.revisi,
              lastReviewedAt: review.updatedAt || review.createdAt || doc.lastReviewedAt,
              updatedAt: review.updatedAt || doc.updatedAt,
            };
          }
          return doc;
        })
      );
      setDataWithStatus(withReviews);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Gagal memuat data. Silakan refresh halaman.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEmailSchedules(); }, []);
  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchValue), 300);
    return () => clearTimeout(t);
  }, [searchValue]);

  // 🆕 Cek URL query param untuk membuka modal tambah prosedur dari request PIC
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('addProcedure') === 'true' || params.get('action') === 'add') {
        const title = params.get('title') || '';
        const pic = params.get('pic') || '';
        const email = params.get('email') || '';
        const reqId = params.get('requestId') || '';
        setNewProcedure(prev => ({
          ...prev,
          namaDokumen: title || prev.namaDokumen,
          pic: pic || prev.pic,
          email: email || prev.email,
        }));
        if (reqId) {
          setRequestIdToComplete(Number(reqId));
        }
        setIsAddModalOpen(true);
      }
      if (params.get('search')) {
        const s = params.get('search') || '';
        setSearchValue(s);
        setDebouncedSearch(s);
      }
    }
  }, []);

  // Tutup popover detail jadwal email saat klik di luar area popover/titik
  useEffect(() => {
    if (!openScheduleDetail) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-email-schedule-dot]')) {
        setOpenScheduleDetail(null);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openScheduleDetail]);

  // ── Resolved display status ─────────────────────────────────────────────────
  const dataResolved = useMemo(() => {
    return dataWithStatus.map(doc => ({
      ...doc,
      status: resolveDisplayStatus(doc, emailSchedules),
    }));
  }, [dataWithStatus, emailSchedules]);

  // ── Handlers — TIDAK DIUBAH ─────────────────────────────────────────────────
  const handleMarkSeen = useCallback(async (nomorDokumen: string) => {
    setDataWithStatus(prev => prev.map(doc =>
      doc.nomorDokumen === nomorDokumen
        ? { ...doc, reviewSeenAt: new Date().toISOString() }
        : doc
    ));
    await markReviewAsSeen(nomorDokumen);
  }, []);

  const handleReviewSeen = useCallback((nomorDokumen: string) => {
    setDataWithStatus(prev => prev.map(doc =>
      doc.nomorDokumen === nomorDokumen
        ? { ...doc, reviewSeenAt: new Date().toISOString() }
        : doc
    ));
  }, []);

  const handleNewProcedureChange = (
    field: keyof Omit<ProcedureDocument, 'status' | 'revisi' | 'id'>,
    value: string
  ) => {
    setNewProcedure(prev => ({ ...prev, [field]: value }));
  };

  const handleDeleteProcedure = async (nomorDokumen: string) => {
    const confirmed = await showConfirm(
      'Apakah Anda yakin ingin mengarsipkan prosedur ini?\n\nProsedur akan dipindahkan ke arsip dan dapat di-restore kembali.',
      'Konfirmasi Pengarsipan'
    );
    if (!confirmed) return;
    try {
      await archiveProcedure(nomorDokumen);
      await loadData(false);
      showSuccess('Prosedur berhasil diarsipkan!');
    } catch (error: any) {
      console.error('Error archiving procedure:', error);
      showError('Gagal mengarsipkan prosedur: ' + (error.message || 'Unknown error'));
    }
  };

  const handleEditClick = (row: ProcedureDocument) => { setEditingProcedure(row); setIsEditModalOpen(true); };
  const handleEditClose = () => { setIsEditModalOpen(false); setTimeout(() => setEditingProcedure(null), 250); };
  const handleEditSaved = async () => { await loadData(false); };

  // BUG FIX #3 & #4: handler klik nama dokumen / tombol detail membuka DocumentModal
  // 🆕 tambah parameter `status`, dipakai DocumentModal untuk fitur Bandingkan Dokumen
  const handleDocumentClick = (nomorDokumen: string, namaDokumen: string, status: string) => {
    setSelectedDocument({ nomorDokumen, namaDokumen, status });
    // Optimistic update — badge hilang seketika
    setDataWithStatus(prev => prev.map(doc =>
      doc.nomorDokumen === nomorDokumen && hasUnseenReview(doc)
        ? { ...doc, reviewSeenAt: new Date().toISOString() }
        : doc
    ));
  };

  // ✅ FIX: dipanggil saat DocumentModal ditutup.
  const handleDocumentModalClose = useCallback(async () => {
    setSelectedDocument(null);
    await Promise.all([loadData(false), loadEmailSchedules()]);
  }, [loadData, loadEmailSchedules]);

  // 🆕 BARU: handler tombol Approval (Prepared/Checked/Approved) di kolom Aksi
  const handleApprovalClick = (nomorDokumen: string, namaDokumen: string) => {
    setApprovalDoc({ nomorDokumen, namaDokumen });
  };

  const handleRevisionNotesClick = (nomorDokumen: string, namaDokumen: string, revisi?: string) => {
    setRevisionDoc({ nomorDokumen, namaDokumen, revisi });
  };

  const handleCancelSchedule = async (nomorDokumen: string, namaDokumen: string) => {
    const confirmed = await showConfirm(
      `Batalkan jadwal pengiriman email untuk "${namaDokumen}"?\n\nStatus dokumen akan dikembalikan ke status sebelumnya (Relevan/Revisi).`,
      'Konfirmasi Pembatalan Jadwal'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/review-prosedur/api/email-schedules?nomorDokumen=${encodeURIComponent(nomorDokumen)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membatalkan jadwal');

      showSuccess(`Jadwal email berhasil dibatalkan.\nStatus dokumen dikembalikan ke: ${data.restoredStatus || 'Relevan'}`);
      await Promise.all([loadData(false), loadEmailSchedules()]);
    } catch (err: any) {
      console.error('Error cancelling schedule:', err);
      showError('Gagal membatalkan jadwal: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const exportData = filteredData.map(doc => ({
        'Nama Dokumen':             doc.namaDokumen,
        'Nomor Dokumen':            doc.nomorDokumen,
        'Level Dokumen':            doc.levelDokumen,
        'Tanggal Selesai Approval': formatToDDMonYYYY(doc.tanggalSelesaiApproval),
        'Revisi':                   doc.revisi ?? '0',
        'Owner':                    doc.owner,
        'PIC':                      doc.pic,
        'Email':                    doc.email ?? '',
        'Status':                   doc.status,
      }));
      const response = await fetch('/review-prosedur/api/download-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: exportData }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Server error: ${response.status}`);
      }
      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `dokumen-prosedur-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download Excel gagal:', err);
      showError('Gagal membuat file Excel. Silakan coba lagi.');
    }
  };

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
      showError('Gagal membuat file Rekap Audit: ' + (err.message || 'Silakan coba lagi.'));
    } finally {
      setIsExportingAudit(false);
    }
  };

  const handleSaveNewProcedure = async () => {
    if (!newProcedure.namaDokumen || !newProcedure.nomorDokumen || !newProcedure.levelDokumen ||
        !newProcedure.owner || !newProcedure.pic || !newProcedure.email) {
      showWarning('Kolom bertanda * (Nama, Nomor, Level Dokumen, Owner, PIC, dan Email) wajib diisi.');
      return;
    }

    if (!newProcedureFile) {
      showWarning('Silakan upload file dokumen prosedur baru (format PDF) terlebih dahulu.');
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch('/review-prosedur/api/procedures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProcedure,
          revisi: '0',
          needsApproval: true,
          requestId: requestIdToComplete,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 409) {
          showError('Nomor dokumen sudah ada. Silakan gunakan nomor yang berbeda.', 'Nomor Dokumen Terdaftar');
        } else {
          throw new Error(err.error || 'Gagal menambahkan prosedur');
        }
        return;
      }
      const createdNomor = newProcedure.nomorDokumen;

      // ── Upload file dokumen baru yang dipilih ──
      const formData = new FormData();
      formData.append('file', newProcedureFile);
      formData.append('nomorDokumen', createdNomor);
      formData.append('uploadedBy', 'admin');

      const uploadRes = await fetch('/review-prosedur/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const upErr = await uploadRes.json().catch(() => ({}));
        console.error('Warning: Dokumen tersimpan tapi file gagal diupload:', upErr);
        showWarning(`Dokumen berhasil dibuat, namun file gagal diupload: ${upErr.error || 'Error upload'}. Anda dapat mengupload ulang di halaman Approval Dokumen.`);
      }

      await loadData(false);
      setNewProcedure({
        namaDokumen: '', nomorDokumen: '', levelDokumen: '',
        tanggalSelesaiApproval: '', owner: '', pic: '', email: '',
      });
      setNewProcedureFile(null);
      setNeedsReview(null);
      setRequestIdToComplete(null);
      setIsAddModalOpen(false);
      setCurrentPage(1);

      await showAlert({
        title: 'Dokumen Baru Berhasil Dibuat!',
        message: 'Dokumen dan file baru berhasil dibuat! Mengarahkan ke halaman Approval Dokumen untuk menentukan approver...',
        type: 'success',
        okText: 'Lanjutkan ke Approval',
      });
      window.location.href = `/review-prosedur/approval-dokumen?openEdit=${encodeURIComponent(createdNomor)}`;
    } catch (error: any) {
      console.error('Error saving procedure:', error);
      showError('Gagal menambahkan prosedur. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Sort handler — 3-state: asc → desc → reset (TIDAK DIUBAH) ─────────────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === 'asc')       { setSortDir('desc'); }
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
    } else {
      setSortKey(key); setSortDir('asc');
    }
    setCurrentPage(1);
  };

  // ── Filtered + sorted data — TIDAK DIUBAH ──────────────────────────────────
  const filteredData = useMemo(() => {
    let result = dataResolved;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase().trim();
      result = result.filter(row => {
        const tgl = formatToDDMonYYYY(row.tanggalSelesaiApproval).toLowerCase();
        return (
          row.namaDokumen.toLowerCase().includes(q)           ||
          row.nomorDokumen.toLowerCase().includes(q)          ||
          tgl.includes(q)                                      ||
          String(row.revisi ?? '').toLowerCase().includes(q)  ||
          row.owner.toLowerCase().includes(q)                  ||
          row.pic.toLowerCase().includes(q)                    ||
          (row.email ?? '').toLowerCase().includes(q)          ||
          row.status.toLowerCase().includes(q)
        );
      });
    }
    if (filterValue) result = result.filter(row => row.status === filterValue);
    if (monthFilter !== '') {
      const sel = parseInt(monthFilter);
      result = result.filter(row => new Date(row.tanggalSelesaiApproval).getMonth() === sel);
    }
    if (sortKey && sortDir) {
      result = [...result].sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortKey === 'tanggalSelesaiApproval')
          return (new Date(a.tanggalSelesaiApproval).getTime() - new Date(b.tanggalSelesaiApproval).getTime()) * dir;
        if (sortKey === 'levelDokumen' || sortKey === 'revisi')
          return ((parseInt(a[sortKey]) || 0) - (parseInt(b[sortKey]) || 0)) * dir;
        if (sortKey === 'nomorDokumen')
          return a.nomorDokumen.localeCompare(b.nomorDokumen, undefined, { numeric: true }) * dir;
        return String(a[sortKey] ?? '').toLowerCase().localeCompare(String(b[sortKey] ?? '').toLowerCase()) * dir;
      });
    }
    return result;
  }, [debouncedSearch, filterValue, monthFilter, dataResolved, sortKey, sortDir]);

  const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);
  const startIndex = filteredData.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1;
  const endIndex   = Math.min(currentPage * ROWS_PER_PAGE, filteredData.length);
  const pageData   = filteredData.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  // ── Derived stats ───────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:       dataResolved.length,
    relevan:     dataResolved.filter(p => p.status === 'Relevan').length,
    revisi:      dataResolved.filter(p => p.status === 'Revisi').length,
    belumReview: dataResolved.filter(p => ['Menunggu','Belum dikirim','-'].includes(p.status)).length,
  }), [dataResolved]);

  // ── Dropdown style ──────────────────────────────────────────────────────────
  const selectCls =
    'pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-all';
  const dropdownBg = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231f2937' d='M6 8L2 4h8z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat' as const,
    backgroundPosition: 'right 10px center',
  };

  // ── Sortable TH shorthand ───────────────────────────────────────────────────
  const sTh = (label: string, colKey: SortKey) => (
    <SortableTh label={label} colKey={colKey}
      currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
  );
  const plainTh = (label: string) => (
    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
      {label}
    </th>
  );

  const hasFilter = searchValue !== '' || filterValue !== '' || monthFilter !== '';

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <ProtectedRoute>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Memuat data prosedur...</p>
            </div>
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-[1600px] mx-auto space-y-6">

          {/* ── Page header + action buttons ─────────────────────────────── */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Status Prosedur</h1>
              <p className="text-sm text-slate-500 mt-0.5">Kelola dan pantau status review dokumen prosedur</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsEmailScheduleModalOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 transition-all active:scale-95"
              >
                <Calendar size={14} /> Atur Jadwal
              </button>
              <button
                onClick={handleDownloadExcel}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm hover:shadow active:scale-95"
              >
                <Download size={14} /> Excel
              </button>
              <button
                onClick={handleDownloadAuditExcel}
                disabled={isExportingAudit}
                title="Unduh Rekap Matriks Status Review & Approval untuk Audit Mutu ISO 9001 / IATF 16949"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-all shadow-sm active:scale-95 disabled:opacity-60"
              >
                <FileSpreadsheet size={14} className={isExportingAudit ? 'animate-spin' : ''} />
                {isExportingAudit ? 'Menyiapkan...' : 'Rekap Audit ISO/IATF'}
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm hover:shadow-md active:scale-95"
              >
                <Plus size={14} /> Tambah Prosedur
              </button>
            </div>
          </div>

          {/* ── Summary cards ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard label="Total Dokumen" value={stats.total}
              icon={<FileText size={18} />} colorBg="bg-blue-50" colorText="text-blue-600" />
            <SummaryCard label="Relevan" value={stats.relevan}
              icon={<CheckCircle2 size={18} />} colorBg="bg-emerald-50" colorText="text-emerald-600" />
            <SummaryCard label="Perlu Revisi" value={stats.revisi}
              icon={<RefreshCw size={18} />} colorBg="bg-amber-50" colorText="text-amber-600" />
            <SummaryCard label="Belum Direview" value={stats.belumReview}
              icon={<Clock size={18} />} colorBg="bg-slate-100" colorText="text-slate-500" />
          </div>

          {/* ── Filter bar ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  ref={searchBarRef}
                  type="text"
                  placeholder="Cari nama, nomor, PIC, status…"
                  value={searchValue}
                  onChange={e => { setSearchValue(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-16 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 hover:bg-white transition-all"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searchValue ? (
                    <button onClick={() => { setSearchValue(''); setCurrentPage(1); }}
                      className="text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  ) : (
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono font-medium text-slate-400 bg-slate-200/80 rounded border border-slate-300/80 select-none">
                      Ctrl K
                    </kbd>
                  )}
                </div>
              </div>
              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <select value={filterValue} onChange={e => { setFilterValue(e.target.value); setCurrentPage(1); }}
                  className={selectCls} style={dropdownBg}>
                  <option value="">Semua Status</option>
                  <option value="Revisi">Revisi</option>
                  <option value="Relevan">Relevan</option>
                  <option value="Obsolete">Obsolete</option>
                  <option value="Menunggu">Menunggu</option>
                  <option value="Belum dikirim">Belum dikirim</option>
                  <option value="Telah terkirim">Telah terkirim</option>
                  <option value="Telah dibaca">Telah dibaca</option>
                  <option value="-">Belum Ditentukan</option>
                </select>
                <select value={monthFilter} onChange={e => { setMonthFilter(e.target.value); setCurrentPage(1); }}
                  className={selectCls} style={dropdownBg}>
                  <option value="">Semua Bulan</option>
                  {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map((m, i) => (
                    <option key={i} value={String(i)}>{m}</option>
                  ))}
                </select>
                {hasFilter && (
                  <button onClick={() => { setSearchValue(''); setFilterValue(''); setMonthFilter(''); setCurrentPage(1); }}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-xl transition-all">
                    <X size={12} /> Reset
                  </button>
                )}
              </div>
            </div>
            {hasFilter && (
              <p className="text-xs text-slate-500 mt-3">
                Menampilkan <span className="font-semibold text-slate-700">{filteredData.length}</span> dari{' '}
                <span className="font-semibold text-slate-700">{dataResolved.length}</span> dokumen
              </p>
            )}
          </div>

          {/* ── Table ──────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Daftar Dokumen Prosedur</p>
                <p className="text-xs text-slate-400 mt-0.5">Total: {filteredData.length} dokumen</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    {sTh('Nama Dokumen',  'namaDokumen')}
                    {sTh('Nomor Dokumen', 'nomorDokumen')}
                    {plainTh('Status')}
                    {plainTh('Aksi')}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    [1, 2, 3, 4, 5].map(i => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-4 py-3"><div className="h-4 w-3/4 bg-slate-200 rounded" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-28 bg-slate-200 rounded font-mono" /></td>
                        <td className="px-4 py-3"><div className="h-6 w-24 bg-slate-100 rounded-full" /></td>
                        <td className="px-4 py-3"><div className="h-7 w-28 bg-slate-100 rounded-lg" /></td>
                      </tr>
                    ))
                  ) : pageData.length > 0 ? (
                    pageData.map((row, index) => {
                      const schedule  = emailSchedules[row.nomorDokumen];
                      const showBadge = hasUnseenReview(row);
                      return (
                        <tr
                          key={`${row.nomorDokumen}-${index}`}
                          className={`transition-colors hover:bg-blue-50/40 ${
                            showBadge ? 'bg-violet-50/30' : index % 2 === 1 ? 'bg-slate-50/30' : ''
                          }`}
                        >
                          {/* 🆕 Nama dokumen sekarang mengarah ke halaman detail */}
                          <td className="px-4 py-2 max-w-[320px]">
                            <Link
                              href={`/status-review/${encodeURIComponent(row.nomorDokumen)}`}
                              className="text-left text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline underline-offset-2 transition-colors line-clamp-2"
                            >
                              <Highlight text={row.namaDokumen} keyword={debouncedSearch} />
                            </Link>
                          </td>

                          {/* Nomor Dokumen */}
                          <td className="px-4 py-2 text-xs text-slate-600 font-mono whitespace-nowrap">
                            <Highlight text={row.nomorDokumen} keyword={debouncedSearch} />
                          </td>
                          
                          {/* Status + indikator jadwal email aktif + badge "Baru Direview" */}
                          <td className="px-4 py-2">
                            <div className="flex flex-col gap-1.5 items-start">
                              <div className="flex items-start gap-1.5">
                                <StatusBadge
                                  status={row.status}
                                  doc={row}
                                  lastSentAt={schedule?.lastSentAt || row.lastSentAt}
                                />
                                {schedule && schedule.emailStatus !== 'cancelled' && !isScheduleExpired(schedule) && (
                                  <Link
                                    href={`/status-review/${encodeURIComponent(row.nomorDokumen)}`}
                                    title={`Ada jadwal email aktif (${schedule.emailStatus === 'sent' ? 'sudah terkirim' : 'menunggu dikirim'}) — klik untuk detail`}
                                    className="inline-flex hover:scale-125 transition-transform mt-1"
                                  >
                                    <span
                                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                        schedule.emailStatus === 'sent' ? 'bg-emerald-500' : 'bg-amber-500'
                                      }`}
                                    />
                                  </Link>
                                )}
                              </div>
                              {showBadge && row.lastReviewedAt && (
                                <RecentlyReviewedBadge
                                  lastReviewedAt={row.lastReviewedAt}
                                  onClick={() => handleMarkSeen(row.nomorDokumen)}
                                />
                              )}
                            </div>
                          </td>

                          {/* Aksi — tidak berubah */}
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleApprovalClick(row.nomorDokumen, row.namaDokumen)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-all"
                                title="Lihat Prepared / Checked / Approved"
                              >
                                <Users size={13} />
                              </button>
                              <button
                                onClick={() => handleRevisionNotesClick(row.nomorDokumen, row.namaDokumen, row.revisi)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                title="Catatan Perubahan (Record Revisi)"
                              >
                                <FileClock size={13} />
                              </button>
                              <button
                                onClick={() => handleDocumentClick(row.nomorDokumen, row.namaDokumen, row.status)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                title="Lihat dokumen"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => handleEditClick(row)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                                title="Edit prosedur"
                              >
                                <Pencil size={13} />
                              </button>
                              {schedule && schedule.emailStatus === 'pending' && (
                                <button
                                  onClick={() => handleCancelSchedule(row.nomorDokumen, row.namaDokumen)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-all"
                                  title="Batalkan jadwal email (Kembali ke status sebelumnya)"
                                >
                                  <CalendarX size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteProcedure(row.nomorDokumen)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                title="Arsipkan prosedur"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-14 text-center">
                        <FileText size={40} className="mx-auto mb-3 text-slate-300" />
                        <p className="text-sm font-medium text-slate-500">
                          {hasFilter ? 'Tidak ada dokumen yang sesuai filter' : 'Belum ada data prosedur'}
                        </p>
                        {hasFilter && (
                          <button onClick={() => { setSearchValue(''); setFilterValue(''); setMonthFilter(''); }}
                            className="mt-2 text-xs text-blue-600 hover:underline">
                            Hapus semua filter
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Menampilkan <span className="font-semibold text-slate-700">{startIndex}</span> sampai{' '}
                <span className="font-semibold text-slate-700">{endIndex}</span> dari{' '}
                <span className="font-semibold text-slate-700">{filteredData.length}</span> entri
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => { if (currentPage > 1) setCurrentPage(currentPage - 1); }}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  ← Sebelumnya
                </button>
                <span className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold min-w-[60px] text-center">
                  {currentPage} / {totalPages || 1}
                </span>
                <button
                  onClick={() => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); }}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  Berikutnya →
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* ── Modals — semua functionality dipertahankan ─────────────────── */}

        {/* AddProcedureModal */}
        <AddProcedureModal
          isOpen={isAddModalOpen}
          onClose={() => { if (!isSaving) { setIsAddModalOpen(false); setNewProcedureFile(null); setNeedsReview(null); } }}
          onSave={handleSaveNewProcedure}
          value={newProcedure}
          onChange={handleNewProcedureChange}
          file={newProcedureFile}
          onFileChange={setNewProcedureFile}
          isSaving={isSaving}
        />

        {/* EditProcedureModal */}
        <EditProcedureModal
          isOpen={isEditModalOpen}
          onClose={handleEditClose}
          procedure={editingProcedure}
          onSaved={handleEditSaved}
        />

        {/* DocumentModal */}
        <DocumentModal
          isOpen={selectedDocument !== null}
          onClose={handleDocumentModalClose}
          nomorDokumen={selectedDocument?.nomorDokumen || ''}
          namaDokumen={selectedDocument?.namaDokumen || ''}
          documentStatus={selectedDocument?.status}
          markSeenOnOpen={true}
          onReviewSeen={handleReviewSeen}
        />

        {/* EmailScheduleModal */}
        <EmailScheduleModal
          isOpen={isEmailScheduleModalOpen}
          onClose={async () => {
            setIsEmailScheduleModalOpen(false);
            await Promise.all([loadData(false), loadEmailSchedules()]);
          }}
          procedures={dataWithStatus}
          emailSchedules={emailSchedules}
          onScheduleChange={async () => {
            await Promise.all([loadData(false), loadEmailSchedules()]);
          }}
        />

        {/* ApprovalCard — 🆕 BARU: kartu Prepared / Checked / Approved */}
        <ApprovalCard
          isOpen={approvalDoc !== null}
          onClose={() => setApprovalDoc(null)}
          nomorDokumen={approvalDoc?.nomorDokumen || ''}
          namaDokumen={approvalDoc?.namaDokumen || ''}
        />
        
        <RevisionNotesModal
          isOpen={revisionDoc !== null}
          onClose={() => setRevisionDoc(null)}
          nomorDokumen={revisionDoc?.nomorDokumen || ''}
          namaDokumen={revisionDoc?.namaDokumen || ''}
          currentRevisi={revisionDoc?.revisi}
        />

      </AdminLayout>
    </ProtectedRoute>
  );
}