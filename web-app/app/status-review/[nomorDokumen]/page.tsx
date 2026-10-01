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
import RevisionNotesModal from '@/components/status-review/RevisionNotesModal';
import EditProcedureModal from '@/components/status-review/EditProcedureModal';
import DocumentChat from '@/components/chat/DocumentChat';
import {
  ArrowLeft, Hash, FileText, Calendar, RefreshCw, Building2, User, Mail,
  Eye, Users, FileClock, Pencil, Trash2, Send, XCircle, Clock,
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

function StatusBadge({
  status,
  lastSentAt,
}: {
  status: StatusType;
  lastSentAt?: string | null;
}) {
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
  const sentFormatted = status === 'Telah terkirim' ? formatSentDateTime(lastSentAt) : null;

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${s.bg} ${s.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
        {status}
      </span>
      {sentFormatted && (
        <span
          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 whitespace-nowrap pl-0.5"
          title={`Email terkirim pada ${sentFormatted}`}
        >
          <Clock size={11} className="text-cyan-600 flex-shrink-0" />
          <span>{sentFormatted}</span>
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
  const nomorDokumen = decodeURIComponent(params?.nomorDokumen ?? '');

  const [doc, setDoc]           = useState<ProcedureDocument | null>(null);
  const [schedule, setSchedule] = useState<EmailSchedule | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [isPdfOpen,      setIsPdfOpen]      = useState(false);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [isRevisionOpen, setIsRevisionOpen] = useState(false);
  const [isEditOpen,     setIsEditOpen]     = useState(false);

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

      const displayStatus = resolveDisplayStatus(resolved, sched);
      const finalDoc = { ...resolved, status: displayStatus };
      setDoc(finalDoc);

      // Tandai review sudah dilihat admin (sama seperti saat modal PDF dibuka
      // dari tabel — perilaku badge "Baru Direview" tetap konsisten)
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
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin membatalkan jadwal pengiriman email untuk dokumen ini?\n\nStatus dokumen akan dikembalikan ke status sebelumnya (Relevan/Revisi).`
    );
    if (!confirmed) return;

    try {
      setIsCancellingSchedule(true);
      const res = await fetch(`/review-prosedur/api/email-schedules?nomorDokumen=${encodeURIComponent(doc.nomorDokumen)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membatalkan jadwal');

      alert(`Jadwal email berhasil dibatalkan.\nStatus dokumen dikembalikan ke: ${data.restoredStatus || 'Relevan'}`);
      await loadData();
    } catch (err: any) {
      console.error('Error cancelling schedule:', err);
      alert('Gagal membatalkan jadwal: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCancellingSchedule(false);
    }
  };

  const handleArchive = async () => {
    if (!doc) return;
    const confirmed = window.confirm(
      'Apakah Anda yakin ingin mengarsipkan prosedur ini?\n\nProsedur akan dipindahkan ke arsip dan dapat di-restore kembali.'
    );
    if (!confirmed) return;
    try {
      await archiveProcedure(doc.nomorDokumen);
      alert('Prosedur berhasil diarsipkan!');
      router.push('/status-review');
    } catch (error: any) {
      console.error('Error archiving procedure:', error);
      alert('Gagal mengarsipkan prosedur: ' + (error.message || 'Unknown error'));
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
        <div className="max-w-3xl mx-auto space-y-5">

          {/* Back link */}
          <Link
            href="/status-review"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={15} /> Kembali ke Daftar Dokumen
          </Link>

          {/* Header */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-slate-900">{doc.namaDokumen}</h1>
                <p className="text-xs text-slate-400 font-mono mt-1">{doc.nomorDokumen}</p>
              </div>
              <StatusBadge status={doc.status} lastSentAt={schedule?.lastSentAt || doc.lastSentAt} />
            </div>
          </div>

          {/* Informasi Dokumen */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-5">Informasi Dokumen</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              <DetailItem icon={Hash}      label="Nomor Dokumen"        value={doc.nomorDokumen} mono />
              <DetailItem icon={FileText}  label="Level Dokumen"        value={doc.levelDokumen} />
              <DetailItem icon={Calendar}  label="Tgl Selesai Approval" value={formatToDDMonYYYY(doc.tanggalSelesaiApproval)} />
              <DetailItem icon={RefreshCw} label="Revisi"               value={String(doc.revisi ?? '0')} />
              <DetailItem icon={Building2} label="Owner"                value={doc.owner} />
              <DetailItem icon={User}      label="PIC"                  value={doc.pic} />
              <DetailItem icon={Mail}      label="Email"                value={doc.email || '-'} />
            </div>
          </div>

          {/* Jadwal Email — hanya tampil kalau ada jadwal aktif */}
          {showScheduleCard && schedule && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Jadwal Email</h2>
                {schedule.emailStatus === 'pending' && (
                  <button
                    type="button"
                    onClick={handleCancelSchedule}
                    disabled={isCancellingSchedule}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors disabled:opacity-50"
                  >
                    <XCircle size={14} className={isCancellingSchedule ? 'animate-spin' : ''} />
                    {isCancellingSchedule ? 'Membatalkan...' : 'Batalkan Jadwal'}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Send size={14} className="text-slate-400" />
                  {new Date(schedule.scheduledEmailAt).toLocaleDateString('id-ID', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}{' '}
                  {new Date(schedule.scheduledEmailAt).toLocaleTimeString('id-ID', {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </div>
                <EmailStatusBadge status={schedule.emailStatus} />
                {schedule.lastSentAt && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock size={12} className="text-slate-400" />
                    Terkirim {formatSentDateTime(schedule.lastSentAt)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Aksi */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Aksi</h2>
            <div className="flex flex-wrap gap-2">
              <ActionButton icon={Eye}       label="Lihat Dokumen"      onClick={() => setIsPdfOpen(true)} />
              <ActionButton icon={Users}     label="Approval"           onClick={() => setIsApprovalOpen(true)} />
              <ActionButton icon={FileClock} label="Catatan Perubahan"  onClick={() => setIsRevisionOpen(true)} />
              <ActionButton icon={Pencil}    label="Edit Prosedur"      onClick={() => setIsEditOpen(true)} />
              <ActionButton icon={Trash2}    label="Arsipkan"           onClick={handleArchive} danger />
            </div>
          </div>

          {/* 🆕 Diskusi dengan approver (Prepared / Checked / Approved).
              Percakapan menempel ke nomor dokumen, jadi tetap utuh lintas
              tahap approval maupun lintas siklus revisi. */}
          <DocumentChat
            nomorDokumen={doc.nomorDokumen}
            adminNama={user?.fullName ?? 'Administrator'}
            adminEmail={user?.email ?? 'admin'}
            myEmail={user?.email ?? 'admin'}
            subtitle={doc.namaDokumen}
          />
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

        <RevisionNotesModal
          isOpen={isRevisionOpen}
          onClose={() => setIsRevisionOpen(false)}
          nomorDokumen={doc.nomorDokumen}
          namaDokumen={doc.namaDokumen}
          currentRevisi={doc.revisi}
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