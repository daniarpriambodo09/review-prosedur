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
} from 'lucide-react';
import RevisionNotesModal from '@/components/status-review/RevisionNotesModal';
import { FileClock } from 'lucide-react';

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
// Status Badge — modern pill
// =============================================================================
function StatusBadge({ status }: { status: StatusType }) {
  const styles: Record<string, { bg: string; text: string; dot: string }> = {
    Revisi:           { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
    Relevan:          { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    Obsolete:         { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500'     },
    Menunggu:         { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
    'Belum dikirim':  { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500'  },
    'Telah terkirim': { bg: 'bg-cyan-50',    text: 'text-cyan-700',    dot: 'bg-cyan-500'    },
    'Telah dibaca':   { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-500'  },
    'Menunggu ACC Prepared': { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
    'Menunggu ACC Checked':  { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
    'Menunggu ACC Approved': { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
    'Ditolak':        { bg: 'bg-rose-50',     text: 'text-rose-700',    dot: 'bg-rose-500'    },
    '-':              { bg: 'bg-slate-50',   text: 'text-slate-500',   dot: 'bg-slate-400'   },
  };
  const s = styles[status] ?? styles['-'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {status}
    </span>
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

// =============================================================================
// AddProcedureModal — logic TIDAK DIUBAH, visual diperbarui
// =============================================================================
function AddProcedureModal({
  isOpen, onClose, onSave, value, onChange, needsReview, onNeedsReviewChange, isSaving,
}: {
  isOpen: boolean; onClose: () => void; onSave: () => void;
  value: Omit<ProcedureDocument, 'status' | 'revisi' | 'id'> & { revisi?: string };
  onChange: (field: keyof Omit<ProcedureDocument, 'status' | 'revisi' | 'id'>, val: string) => void;
  needsReview: boolean | null; onNeedsReviewChange: (val: boolean | null) => void; isSaving: boolean;
}) {
  if (!isOpen) return null;
  const inReviewRange = isInReviewRange(value.tanggalSelesaiApproval || '');
  const isExpired = (() => {
    if (!value.tanggalSelesaiApproval) return false;
    const d = new Date(value.tanggalSelesaiApproval);
    if (isNaN(d.getTime())) return false;
    return new Date() >= new Date(d.getFullYear(), d.getMonth() + 2, d.getDate());
  })();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Tambah Prosedur Baru</h3>
            <p className="text-xs text-slate-500 mt-0.5">Isi semua kolom dengan informasi yang akurat</p>
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">PIC <span className="text-red-500">*</span></label>
            <input type="text" value={value.pic || ''} disabled={isSaving}
              onChange={e => onChange('pic', e.target.value)}
              placeholder="Masukkan PIC" className={fieldCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email <span className="text-red-500">*</span></label>
            <input type="email" value={value.email || ''} disabled={isSaving}
              onChange={e => onChange('email', e.target.value)}
              placeholder="Masukkan email" className={fieldCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tanggal Selesai Approval <span className="text-red-500">*</span></label>
            <input type="date" value={value.tanggalSelesaiApproval || ''} disabled={isSaving}
              onChange={e => onChange('tanggalSelesaiApproval' as any, e.target.value)}
              className={fieldCls} />
          </div>

          {value.tanggalSelesaiApproval && (
            <div className="col-span-2">
              {isExpired ? (
                <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-slate-600">ℹ️ Tanggal approval sudah lewat lebih dari 2 bulan. Dokumen akan otomatis berstatus <span className="font-semibold text-emerald-700">Relevan</span> — tidak masuk alur review.</p>
                </div>
              ) : inReviewRange ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Status Awal Dokumen <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => onNeedsReviewChange(true)} disabled={isSaving}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${needsReview === true ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 bg-white'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">📨</span>
                        <span className="font-semibold text-xs text-slate-900">Perlu Direview</span>
                        {needsReview === true && <CheckCircle2 size={14} className="ml-auto text-blue-600" />}
                      </div>
                      <p className="text-xs text-slate-500">Dokumen masuk alur review — dijadwalkan kirim email ke PIC</p>
                    </button>
                    <button type="button" onClick={() => onNeedsReviewChange(false)} disabled={isSaving}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${needsReview === false ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 bg-white'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">✓</span>
                        <span className="font-semibold text-xs text-slate-900">Langsung Relevan</span>
                        {needsReview === false && <CheckCircle2 size={14} className="ml-auto text-emerald-600" />}
                      </div>
                      <p className="text-xs text-slate-500">Dokumen sudah OK — tidak masuk alur review</p>
                    </button>
                  </div>
                  {needsReview === null && <p className="text-xs text-amber-600 mt-2">⚠ Pilih salah satu status awal untuk melanjutkan</p>}
                </div>
              ) : (
                <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-slate-600">ℹ️ Jadwal review otomatis akan aktif pada <span className="font-semibold text-blue-700">
                    {(() => {
                      const d     = new Date(value.tanggalSelesaiApproval);
                      const sched = new Date(d.getFullYear(), d.getMonth() - 2, 1);
                      return sched.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                    })()}
                  </span>.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSaving}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition-all">
            Batal
          </button>
          <button onClick={onSave}
            disabled={isSaving || (inReviewRange && needsReview === null)}
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

  const [editingProcedure, setEditingProcedure] = useState<ProcedureDocument | null>(null);
  const [isEditModalOpen,  setIsEditModalOpen]  = useState(false);

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  // BUG FIX #3 & #4: selectedDocument untuk DocumentModal
  const [selectedDocument,         setSelectedDocument]         = useState<{ nomorDokumen: string; namaDokumen: string; status: string } | null>(null);
  const [isEmailScheduleModalOpen, setIsEmailScheduleModalOpen] = useState(false);
  const [emailSchedules,           setEmailSchedules]           = useState<Record<string, EmailSchedule>>({});

  // nomorDokumen yang popover detail jadwal-nya sedang terbuka (titik hijau/merah)
  const [openScheduleDetail, setOpenScheduleDetail] = useState<string | null>(null);

  // 🆕 BARU: dokumen yang kartu Approval-nya (Prepared/Checked/Approved) sedang dibuka
  const [approvalDoc, setApprovalDoc] = useState<{ nomorDokumen: string; namaDokumen: string } | null>(null);
  const [revisionDoc, setRevisionDoc] = useState<{ nomorDokumen: string; namaDokumen: string; revisi?: string } | null>(null);

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
            return { ...doc, status: review.status as StatusType, revisi: review.revisi };
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
    const confirmed = window.confirm(
      'Apakah Anda yakin ingin mengarsipkan prosedur ini?\n\nProsedur akan dipindahkan ke arsip dan dapat di-restore kembali.'
    );
    if (!confirmed) return;
    try {
      await archiveProcedure(nomorDokumen);
      await loadData(false);
      alert('Prosedur berhasil diarsipkan!');
    } catch (error: any) {
      console.error('Error archiving procedure:', error);
      alert('Gagal mengarsipkan prosedur: ' + (error.message || 'Unknown error'));
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
      alert('Gagal membuat file Excel. Silakan coba lagi.');
    }
  };

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
      await loadData(false);
      setNewProcedure({
        namaDokumen: '', nomorDokumen: '', levelDokumen: '',
        tanggalSelesaiApproval: '', owner: '', pic: '', email: '',
      });
      setNeedsReview(null);
      setIsAddModalOpen(false);
      setCurrentPage(1);
      alert('Prosedur berhasil ditambahkan!');
    } catch (error: any) {
      console.error('Error saving procedure:', error);
      alert('Gagal menambahkan prosedur. Silakan coba lagi.');
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
                  type="text"
                  placeholder="Cari nama, nomor, PIC, status…"
                  value={searchValue}
                  onChange={e => { setSearchValue(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 hover:bg-white transition-all"
                />
                {searchValue && (
                  <button onClick={() => { setSearchValue(''); setCurrentPage(1); }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                )}
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
                  {pageData.length > 0 ? (
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
                              <div className="flex items-center gap-1.5">
                                <StatusBadge status={row.status} />
                                {schedule && schedule.emailStatus !== 'cancelled' && !isScheduleExpired(schedule) && (
                                  <Link
                                    href={`/status-review/${encodeURIComponent(row.nomorDokumen)}`}
                                    title={`Ada jadwal email aktif (${schedule.emailStatus === 'sent' ? 'sudah terkirim' : 'menunggu dikirim'}) — klik untuk detail`}
                                    className="inline-flex hover:scale-125 transition-transform"
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
          onClose={() => { if (!isSaving) { setIsAddModalOpen(false); setNeedsReview(null); } }}
          onSave={handleSaveNewProcedure}
          value={newProcedure}
          onChange={handleNewProcedureChange}
          needsReview={needsReview}
          onNeedsReviewChange={setNeedsReview}
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