// app/status-review/[nomorDokumen]/page.tsx
//
// 🆕 Halaman detail dokumen prosedur. Menggantikan perilaku lama (klik nama
// dokumen di tabel /status-review langsung membuka modal PDF) — sekarang
// klik nama dokumen mengarahkan ke sini, menampilkan seluruh informasi
// dokumen (yang sebelumnya jadi kolom-kolom tabel: Level, Tgl Approval,
// Revisi, Owner, PIC, Email, Jadwal Email) dalam bentuk card, plus tombol
// aksi (Lihat Dokumen PDF, Approval, Catatan Perubahan, Edit, Arsipkan).
//
// 🆕 Di bagian bawah ada Diskusi Dokumen — chat real-time antara admin dan
// para approver (Prepared/Checked/Approved) untuk dokumen ini. Percakapan
// menempel ke nomor dokumen, jadi tetap utuh lintas tahap approval.
//
// Status yang ditampilkan memakai logika resolve yang SAMA PERSIS dengan
// tabel di /status-review (overlay document_reviews + email_schedules),
// supaya tidak ada perbedaan status antara tabel dan halaman detail.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDialog } from '@/contexts/DialogContext';
import {
  ProcedureDocument,
  StatusType,
  getAllProcedures,
  getDocumentReview,
  markReviewAsSeen,
  hasUnseenReview,
  archiveProcedure,
} from '@/data/procedures/all-procedures';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import DocumentModal from '@/components/documents/DocumentModal';
import ApprovalCard from '@/components/status-review/ApprovalCard';
import EditProcedureModal from '@/components/status-review/EditProcedureModal';
import DocumentChat from '@/components/chat/DocumentChat';
import {
  ArrowLeft, Hash, FileText, Calendar, RefreshCw, Building2, User, Mail,
  Eye, Users, Pencil, Trash2, Send, XCircle, Clock,
  ShieldAlert, Copy, Check, ArrowRight, Layers, FileCheck,
} from 'lucide-react';

// =============================================================================
// Helpers — SAMA PERSIS dengan app/status-review/page.tsx, supaya status yang
// tampil di sini selalu konsisten dengan tabel.
// =============================================================================
function formatToDDMonYYYY(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()}-${M[d.getMonth()]}-${d.getFullYear()}`;
}

interface EmailSchedule {
  id: number;
  nomorDokumen: string;
  scheduledEmailAt: string;
  emailStatus: 'pending' | 'sent' | 'failed' | 'cancelled';
  lastSentAt?: string;
  retryCount: number;
  errorMessage?: string;
}

function isScheduleExpired(schedule: EmailSchedule): boolean {
  if (schedule.emailStatus !== 'sent') return false;
  if (!schedule.lastSentAt) return false;
  const sentDate   = new Date(schedule.lastSentAt);
  const expiryDate = new Date(sentDate.getFullYear(), sentDate.getMonth() + 2, sentDate.getDate());
  return new Date() >= expiryDate;
}

function resolveDisplayStatus(doc: ProcedureDocument, schedule: EmailSchedule | null): StatusType {
  if (['Relevan', 'Revisi', 'Obsolete'].includes(doc.status)) return doc.status as StatusType;
  if (doc.status === 'Telah dibaca') return 'Telah dibaca';
  if (schedule && schedule.emailStatus !== 'cancelled' && !isScheduleExpired(schedule)) {
    if (schedule.emailStatus === 'sent')    return 'Telah terkirim';
    if (schedule.emailStatus === 'pending') return 'Belum dikirim';
  }
  return doc.status;
}

// =============================================================================
// Status Badge — gaya sama dengan tabel /status-review
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
  const styles: Record<string, { bg: string; text: string; dot: string; clock: string; timeText: string }> = {
    Revisi:           { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   clock: 'text-amber-400',   timeText: 'text-amber-200' },
    Relevan:          { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', clock: 'text-emerald-400', timeText: 'text-emerald-200' },
    Obsolete:         { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     clock: 'text-red-400',     timeText: 'text-red-200' },
    Menunggu:         { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    clock: 'text-blue-400',    timeText: 'text-blue-200' },
    'Belum dikirim':  { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500',  clock: 'text-orange-400',  timeText: 'text-orange-200' },
    'Telah terkirim': { bg: 'bg-cyan-50',    text: 'text-cyan-700',    dot: 'bg-cyan-500',    clock: 'text-cyan-400',    timeText: 'text-cyan-200' },
    'Telah dibaca':   { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-500',  clock: 'text-purple-400',  timeText: 'text-purple-200' },
    'Menunggu ACC Prepared': { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500', clock: 'text-violet-400', timeText: 'text-violet-200' },
    'Menunggu ACC Checked':  { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500', clock: 'text-violet-400', timeText: 'text-violet-200' },
    'Menunggu ACC Approved': { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500', clock: 'text-violet-400', timeText: 'text-violet-200' },
    'Ditolak':        { bg: 'bg-rose-50',     text: 'text-rose-700',    dot: 'bg-rose-500',    clock: 'text-rose-400',    timeText: 'text-rose-200' },
    '-':              { bg: 'bg-slate-50',   text: 'text-slate-500',   dot: 'bg-slate-400',   clock: 'text-slate-300',   timeText: 'text-slate-200' },
  };
  const s = styles[status] ?? styles['-'];
  const timeInfo = getStatusTimeInfo(status, doc, lastSentAt);

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${s.bg} ${s.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
        {status}
      </span>
      {timeInfo && (
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${s.timeText} whitespace-nowrap pl-0.5`}
          title={timeInfo.tooltip}
        >
          <Clock size={12} className={`${s.clock} flex-shrink-0`} />
          <span>{timeInfo.formatted}</span>
        </span>
      )}
    </div>
  );
}

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
// Item detail — label di atas nilai, spasi ringkas (bukan tabel)
// =============================================================================
function DetailItem({
  icon: Icon, label, value, mono,
}: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={13} className="text-slate-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-400 mb-0.5">{label}</p>
        <p className={`text-sm text-slate-800 break-words ${mono ? 'font-mono' : ''}`}>
          {value || <span className="text-slate-300">-</span>}
        </p>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon, label, onClick, danger,
}: { icon: any; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
        danger
          ? 'text-red-600 border-red-200 hover:bg-red-50'
          : 'text-slate-600 border-slate-200 hover:bg-slate-50'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

// =============================================================================
// Main Page
// =============================================================================
export default function DocumentDetailPage() {
  const params = useParams<{ nomorDokumen: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { showConfirm, showSuccess, showError } = useDialog();
  const nomorDokumen = decodeURIComponent(params?.nomorDokumen ?? '');

  const [doc, setDoc]           = useState<ProcedureDocument | null>(null);
  const [schedule, setSchedule] = useState<EmailSchedule | null>(null);
  const [rejections, setRejections] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copiedNomor, setCopiedNomor] = useState(false);

  const [isPdfOpen,      setIsPdfOpen]      = useState(false);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [isEditOpen,     setIsEditOpen]     = useState(false);

  const handleCopyNomor = () => {
    if (!doc?.nomorDokumen) return;
    navigator.clipboard.writeText(doc.nomorDokumen);
    setCopiedNomor(true);
    setTimeout(() => setCopiedNomor(false), 2000);
  };

  const loadData = useCallback(async () => {
    if (!nomorDokumen) return;
    try {
      setLoading(true);
      setNotFound(false);

      const all   = await getAllProcedures();
      const found = all.find(d => d.nomorDokumen === nomorDokumen);
      if (!found) { setNotFound(true); return; }

      // Overlay status dari document_reviews — sama seperti loadData() di
      // tabel /status-review, supaya status yang tampil identik.
      let resolved: ProcedureDocument = found;
      const workflowStatuses: StatusType[] = [
        'Belum dikirim', 'Telah terkirim', 'Telah dibaca', 'Menunggu',
        'Menunggu ACC Prepared', 'Menunggu ACC Checked', 'Menunggu ACC Approved',
        'Ditolak',
      ];
      if (!workflowStatuses.includes(found.status)) {
        const docDate       = new Date(found.tanggalSelesaiApproval);
        const approvalMonth = isNaN(docDate.getTime()) ? new Date().getMonth() : docDate.getMonth();
        const review        = await getDocumentReview(found.nomorDokumen, approvalMonth);
        if (review && ['Relevan', 'Revisi', 'Obsolete'].includes(review.status)) {
          resolved = { ...found, status: review.status as StatusType, revisi: review.revisi };
        }
      }

      // Jadwal email dokumen ini
      let sched: EmailSchedule | null = null;
      try {
        const res = await fetch(`/review-prosedur/api/email-schedules?nomorDokumen=${encodeURIComponent(nomorDokumen)}`);
        if (res.ok) {
          const list = await res.json();
          sched = list[0] ?? null;
        }
      } catch (e) {
        console.error('Gagal memuat jadwal email:', e);
      }
      setSchedule(sched);

      // Riwayat penolakan & approver
      try {
        const approverRes = await fetch(`/review-prosedur/api/procedures/${encodeURIComponent(nomorDokumen)}/approvers`);
        if (approverRes.ok) {
          const approverJson = await approverRes.json();
          setRejections(approverJson.rejectionHistory ?? (approverJson.rejection ? [approverJson.rejection] : []));
        }
      } catch (e) {
        console.error('Gagal memuat data approver & penolakan:', e);
      }

      const displayStatus = resolveDisplayStatus(resolved, sched);
      const finalDoc = { ...resolved, status: displayStatus };
      setDoc(finalDoc);

      // Tandai review sudah dilihat admin
      if (hasUnseenReview(finalDoc)) {
        markReviewAsSeen(nomorDokumen);
      }
    } catch (error) {
      console.error('Error loading document detail:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [nomorDokumen]);

  useEffect(() => { loadData(); }, [loadData]);

  const [isCancellingSchedule, setIsCancellingSchedule] = useState(false);

  const handleCancelSchedule = async () => {
    if (!doc) return;
    const confirmed = await showConfirm(
      `Apakah Anda yakin ingin membatalkan jadwal pengiriman email untuk dokumen ini?\n\nStatus dokumen akan dikembalikan ke status sebelumnya (Relevan/Revisi).`,
      'Batalkan Jadwal Email'
    );
    if (!confirmed) return;

    try {
      setIsCancellingSchedule(true);
      const res = await fetch(`/review-prosedur/api/email-schedules?nomorDokumen=${encodeURIComponent(doc.nomorDokumen)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membatalkan jadwal');

      showSuccess(`Jadwal email berhasil dibatalkan.\nStatus dokumen dikembalikan ke: ${data.restoredStatus || 'Relevan'}`);
      await loadData();
    } catch (err: any) {
      console.error('Error cancelling schedule:', err);
      showError('Gagal membatalkan jadwal: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCancellingSchedule(false);
    }
  };

  const handleArchive = async () => {
    if (!doc) return;
    const confirmed = await showConfirm(
      'Apakah Anda yakin ingin mengarsipkan prosedur ini?\n\nProsedur akan dipindahkan ke arsip dan dapat di-restore kembali.',
      'Konfirmasi Pengarsipan'
    );
    if (!confirmed) return;
    try {
      await archiveProcedure(doc.nomorDokumen);
      showSuccess('Prosedur berhasil diarsipkan!');
      router.push('/status-review');
    } catch (error: any) {
      console.error('Error archiving procedure:', error);
      showError('Gagal mengarsipkan prosedur: ' + (error.message || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Memuat detail dokumen...</p>
            </div>
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  if (notFound || !doc) {
    return (
      <ProtectedRoute>
        <AdminLayout>
          <div className="max-w-2xl mx-auto text-center py-20">
            <FileText size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-500 mb-4">Dokumen tidak ditemukan</p>
            <Link href="/status-review" className="text-sm text-blue-600 hover:underline">
              ← Kembali ke Daftar Dokumen
            </Link>
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  const showScheduleCard = schedule && schedule.emailStatus !== 'cancelled' && !isScheduleExpired(schedule);

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-150">

          {/* ── Breadcrumb & Top Bar ── */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Link
              href="/status-review"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs transition-all"
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Status Review</span>
            </Link>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded-md text-[11px] text-slate-600 font-semibold">
                {doc.nomorDokumen}
              </span>
              <span>&bull;</span>
              <span>Departemen {doc.owner}</span>
            </div>
          </div>

          {/* ── Executive Hero Card ── */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-indigo-900/40">
            {/* Ambient Background Glows */}
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -top-20 w-60 h-60 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="min-w-0 max-w-3xl space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <FileText size={13} className="text-indigo-400" />
                    Dokumen Prosedur Operasional
                  </span>
                  <div className="flex items-center gap-1 bg-white/10 hover:bg-white/15 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-200 transition-colors">
                    <span>{doc.nomorDokumen}</span>
                    <button
                      type="button"
                      onClick={handleCopyNomor}
                      className="ml-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Salin Nomor Dokumen"
                    >
                      {copiedNomor ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                  {doc.namaDokumen}
                </h1>

                {/* Metadata Pills */}
                <div className="flex items-center gap-2.5 flex-wrap pt-1 text-xs text-slate-300">
                  <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 font-medium">
                    Level: <strong className="text-white">{doc.levelDokumen || '-'}</strong>
                  </span>
                  <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 font-medium">
                    Revisi: <strong className="text-white">Rev. {doc.revisi ?? '0'}</strong>
                  </span>
                  <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 font-medium">
                    Tgl Approval: <strong className="text-white">{formatToDDMonYYYY(doc.tanggalSelesaiApproval)}</strong>
                  </span>
                  <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 font-medium">
                    Owner: <strong className="text-white">{doc.owner}</strong>
                  </span>
                </div>
              </div>

              {/* Right Side: Status Badge */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 flex-shrink-0">
                <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15 shadow-sm">
                  <StatusBadge status={doc.status} doc={doc} lastSentAt={schedule?.lastSentAt || doc.lastSentAt} />
                </div>
              </div>
            </div>
          </div>



          {/* ── Main Dashboard Layout (2 Columns) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ── Kolom Kiri: Detail Informasi & Diskusi (Col 8) ── */}
            <div className="lg:col-span-8 space-y-6">

              {/* Card Informasi Dokumen Modern Grid */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-7">
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Layers size={16} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Informasi Lengkap Dokumen</h2>
                      <p className="text-[11px] text-slate-400">Atribut data master dokumen prosedur</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    ID: {doc.nomorDokumen}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Item 1: Nomor Dokumen */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                      <Hash size={14} className="text-slate-400" />
                      <span>Nomor Dokumen</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 font-mono select-all">
                      {doc.nomorDokumen}
                    </p>
                  </div>

                  {/* Item 2: Level Dokumen */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                      <FileText size={14} className="text-slate-400" />
                      <span>Level Dokumen</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900">
                      {doc.levelDokumen || '-'}
                    </p>
                  </div>

                  {/* Item 3: Tanggal Approval */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                      <Calendar size={14} className="text-slate-400" />
                      <span>Tgl Selesai Approval</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900">
                      {formatToDDMonYYYY(doc.tanggalSelesaiApproval)}
                    </p>
                  </div>

                  {/* Item 4: Revisi */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                      <RefreshCw size={14} className="text-slate-400" />
                      <span>Revisi Saat Ini</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Rev. {doc.revisi ?? '0'}
                      </span>
                    </div>
                  </div>

                  {/* Item 5: Owner / Departemen */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                      <Building2 size={14} className="text-slate-400" />
                      <span>Departemen / Section Owner</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900">
                      {doc.owner}
                    </p>
                  </div>

                  {/* Item 6: Status Persetujuan */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                      <FileCheck size={14} className="text-slate-400" />
                      <span>Tahap Verifikasi</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900">
                      {doc.status}
                    </p>
                  </div>
                </div>

                {/* Detail PIC Card di dalam info dokumen */}
                <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border border-blue-200/70 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                      {doc.pic ? doc.pic.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide">
                        Person In Charge (PIC)
                      </p>
                      <h4 className="text-xs font-bold text-slate-900">{doc.pic}</h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                        <Mail size={12} className="text-slate-400" />
                        {doc.email || '-'}
                      </p>
                    </div>
                  </div>


                </div>
              </div>

              {/* 🆕 Diskusi Dokumen dengan Approver (Prepared / Checked / Approved) */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                <DocumentChat
                  nomorDokumen={doc.nomorDokumen}
                  adminNama={user?.fullName ?? 'Administrator'}
                  adminEmail={user?.email ?? 'admin'}
                  myEmail={user?.email ?? 'admin'}
                  subtitle={doc.namaDokumen}
                />
              </div>

            </div>

            {/* ── Kolom Kanan: Panel Aksi & Jadwal (Col 4) ── */}
            <div className="lg:col-span-4 space-y-6">

              {/* Card Panel Aksi Cepat */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span>Panel Tindakan</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                </h3>

                <div className="space-y-2.5">
                  {/* Aksi 1: Lihat Dokumen PDF */}
                  <button
                    type="button"
                    onClick={() => setIsPdfOpen(true)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-blue-50/80 hover:bg-blue-100/90 text-blue-700 border border-blue-200/80 transition-all font-semibold text-xs cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <Eye size={15} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-900 group-hover:text-blue-700">Lihat PDF</p>
                        <p className="text-[10px] text-slate-400 font-normal">Pratinjau lembar prosedur</p>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-blue-500 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Aksi 2: Approval Dokumen & Riwayat Penolakan */}
                  <button
                    type="button"
                    onClick={() => setIsApprovalOpen(true)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-indigo-50/80 hover:bg-indigo-100/90 text-indigo-700 border border-indigo-200/80 transition-all font-semibold text-xs cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Users size={15} />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-900 group-hover:text-indigo-700">Approval Dokumen</p>
                          {rejections.length > 0 && (
                            <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-bold rounded-full">
                              {rejections.length}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-normal">Approver & riwayat penolakan</p>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-indigo-500 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Aksi 3: Edit Prosedur */}
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(true)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all font-semibold text-xs cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-700 text-white flex items-center justify-center shadow-xs">
                        <Pencil size={14} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-900 group-hover:text-slate-800">Edit Data</p>
                        <p className="text-[10px] text-slate-400 font-normal">Ubah metadata prosedur</p>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Aksi 5: Arsipkan */}
                  <button
                    type="button"
                    onClick={handleArchive}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-rose-50/40 hover:bg-rose-50 text-rose-600 border border-rose-200/60 hover:border-rose-200 transition-all font-semibold text-xs cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Trash2 size={14} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-rose-700">Arsipkan Dokumen</p>
                        <p className="text-[10px] text-rose-400 font-normal">Pindahkan ke arsip sistem</p>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-rose-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Card Jadwal Email Aktif */}
              {showScheduleCard && schedule && (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Send size={15} className="text-indigo-600" />
                      <h3 className="text-xs font-bold text-slate-900">Jadwal Email PIC</h3>
                    </div>
                    <EmailStatusBadge status={schedule.emailStatus} />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                      <Clock size={13} className="text-slate-400" />
                      <span>
                        {new Date(schedule.scheduledEmailAt).toLocaleDateString('id-ID', {
                          day: '2-digit', month: 'long', year: 'numeric',
                        })}{' '}
                        {new Date(schedule.scheduledEmailAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit', minute: '2-digit',
                        })} WIB
                      </span>
                    </div>
                    {schedule.lastSentAt && (
                      <p className="text-[11px] text-slate-500 font-mono">
                        Terkirim: {formatSentDateTime(schedule.lastSentAt)}
                      </p>
                    )}
                  </div>

                  {schedule.emailStatus === 'pending' && (
                    <button
                      type="button"
                      onClick={handleCancelSchedule}
                      disabled={isCancellingSchedule}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <XCircle size={14} className={isCancellingSchedule ? 'animate-spin' : ''} />
                      <span>{isCancellingSchedule ? 'Membatalkan...' : 'Batalkan Jadwal Email'}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Card Info Alur Persetujuan 3 Tahap */}
              <div className="bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 rounded-3xl border border-indigo-100/90 shadow-xs p-6 space-y-3">
                <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-indigo-600" />
                  Alur Persetujuan (QMS)
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Dokumen prosedur melalui 3 tahap persetujuan berjenjang:
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0">1</span>
                    <span><strong>Prepared</strong> &bull; Pembuat Dokumen</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0">2</span>
                    <span><strong>Checked</strong> &bull; Pemeriksa / Supervisor</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0">3</span>
                    <span><strong>Approved</strong> &bull; Pejabat Penyetujui Akhir</span>
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsApprovalOpen(true)}
                    className="w-full py-2 bg-white hover:bg-slate-50 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200/90 shadow-2xs transition-all cursor-pointer text-center"
                  >
                    Buka Detail Approver &rarr;
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Modals */}
        <DocumentModal
          isOpen={isPdfOpen}
          onClose={() => { setIsPdfOpen(false); loadData(); }}
          nomorDokumen={doc.nomorDokumen}
          namaDokumen={doc.namaDokumen}
          documentStatus={doc.status}
          markSeenOnOpen={true}
        />

        <ApprovalCard
          isOpen={isApprovalOpen}
          onClose={() => setIsApprovalOpen(false)}
          nomorDokumen={doc.nomorDokumen}
          namaDokumen={doc.namaDokumen}
        />

        <EditProcedureModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          procedure={doc}
          onSaved={loadData}
        />
      </AdminLayout>
    </ProtectedRoute>
  );
}