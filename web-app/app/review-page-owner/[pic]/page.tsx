// app/review-page-owner/[pic]/page.tsx
// PERBAIKAN BUG: Halaman PIC review kosong setelah perubahan sistem login
//
// PERUBAHAN:
// 1. Tambah fungsi extractPicCode() untuk ekstrak kode dari email baru
// 2. loadDocuments sekarang mengirim picEmail ke API untuk dual matching
// 3. Auth guard menggunakan extractPicCode() agar access check tetap akurat
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  ProcedureDocument,
  StatusType,
  getProceduresByPic,
  batchSaveReviews,
  getDocumentReview,
  markDocumentAsRead,
} from '@/data/procedures/all-procedures';
import DocumentModal from '@/components/documents/DocumentModal';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type ReviewStatus = 'Relevan' | 'Revisi' | 'Obsolete' | '-';

type DocWithSchedule = ProcedureDocument & {
  lastSentAt?:       string | null;
  scheduledEmailAt?: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// FIX: Helper untuk ekstrak kode PIC dari email
// "dp@jai.co.id"         → "DP"
// "vra, asw@jai.co.id"   → "VRA"  (kode pertama untuk URL)
// "DP"                   → "DP"   (sudah berupa kode, dikembalikan apa adanya)
// ─────────────────────────────────────────────────────────────────────────────
function extractPicCode(emailOrCode: string): string {
  if (!emailOrCode) return '';
  // Jika mengandung '@', ini adalah email — ambil local part
  const localPart = emailOrCode.includes('@')
    ? emailOrCode.split('@')[0].trim()
    : emailOrCode.trim();
  // Uppercase dan ambil kode pertama jika multi-PIC
  return localPart.toUpperCase().split(',')[0].trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Visibility Logic (tidak berubah dari versi asli)
// ─────────────────────────────────────────────────────────────────────────────
function isWithinNormalWindow(tanggalApproval: string): boolean {
  const approval = new Date(tanggalApproval);
  if (isNaN(approval.getTime())) return false;
  const now         = new Date();
  const today       = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const windowEnd   = new Date(today.getFullYear(), today.getMonth() + 2, today.getDate());
  const approvalDay = new Date(approval.getFullYear(), approval.getMonth(), approval.getDate());
  return approvalDay >= today && approvalDay <= windowEnd;
}

function isWithinScheduledWindow(scheduledEmailAt: string | null | undefined): boolean {
  if (!scheduledEmailAt) return false;
  const scheduled = new Date(scheduledEmailAt);
  if (isNaN(scheduled.getTime())) return false;
  const now    = new Date();
  const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiry = new Date(scheduled.getFullYear(), scheduled.getMonth() + 2, scheduled.getDate());
  return today <= expiry;
}

function shouldShowDocument(doc: DocWithSchedule, reviewedThisSession: Set<string>): boolean {
  if (reviewedThisSession.has(doc.nomorDokumen)) return true;
  if (isWithinScheduledWindow(doc.scheduledEmailAt)) return true;
  if (isWithinNormalWindow(doc.tanggalSelesaiApproval)) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()}-${MONTH_NAMES[d.getMonth()]}-${d.getFullYear()}`;
}

function toReviewStatus(status: StatusType): ReviewStatus {
  if (status === 'Relevan' || status === 'Revisi' || status === 'Obsolete') return status;
  return '-';
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (tidak berubah dari versi asli)
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CLASS: Record<ReviewStatus, string> = {
  Relevan:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  Revisi:   'bg-amber-50   text-amber-700   border-amber-200',
  Obsolete: 'bg-red-50     text-red-700     border-red-200',
  '-':      'bg-slate-50   text-slate-600   border-slate-200',
};

function StatusSelect({ value, onChange }: { value: ReviewStatus; onChange: (s: ReviewStatus) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as ReviewStatus)}
      className={`px-3 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2
                  focus:ring-blue-500 transition-all cursor-pointer appearance-none pr-8
                  ${STATUS_CLASS[value]}`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231f2937' d='M6 8L2 4h8z'/%3E%3C/svg%3E")`,
        backgroundRepeat:   'no-repeat',
        backgroundPosition: 'right 8px center',
      }}
    >
      <option value="-">Belum Dipilih</option>
      <option value="Relevan">Relevan</option>
      <option value="Revisi">Revisi</option>
      <option value="Obsolete">Obsolete</option>
    </select>
  );
}

function StatusDisplayBadge({ status }: { status: StatusType }) {
  const isReviewed = ['Relevan', 'Revisi', 'Obsolete'].includes(status);
  const styles: Partial<Record<StatusType, { cls: string; icon: string }>> = {
    'Belum dikirim':  { cls: 'bg-orange-50  text-orange-700  border-orange-200',  icon: '📋' },
    'Telah terkirim': { cls: 'bg-cyan-50    text-cyan-700    border-cyan-200',    icon: '📨' },
    'Telah dibaca':   { cls: 'bg-purple-50  text-purple-700  border-purple-200',  icon: '👁️' },
    'Relevan':        { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '✓' },
    'Revisi':         { cls: 'bg-amber-50   text-amber-700   border-amber-200',   icon: '⟳' },
    'Obsolete':       { cls: 'bg-red-50     text-red-700     border-red-200',     icon: '⊘' },
    'Menunggu':       { cls: 'bg-blue-50    text-blue-700    border-blue-200',    icon: '⏳' },
    '-':              { cls: 'bg-slate-50   text-slate-600   border-slate-200',   icon: '?' },
  };
  if (!isReviewed) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border bg-slate-50 text-slate-600 border-slate-200">
        ❓ Belum Direview
      </span>
    );
  }
  const s = styles[status] ?? styles['-']!;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${s.cls}`}>
      {s.icon} {status}
    </span>
  );
}

function VisibilityReason({ doc }: { doc: DocWithSchedule }) {
  if (isWithinScheduledWindow(doc.scheduledEmailAt) && !isWithinNormalWindow(doc.tanggalSelesaiApproval)) {
    const expiry = new Date(doc.scheduledEmailAt!);
    expiry.setMonth(expiry.getMonth() + 2);
    return (
      <span className="block text-[10px] text-blue-500 font-medium mt-0.5">
        📅 Jadwal s/d {formatDate(expiry.toISOString())}
      </span>
    );
  }
  return null;
}

function DocumentTable({
  data, pendingChanges, onStatusChange, onDocumentClick,
}: {
  data: DocWithSchedule[];
  pendingChanges: Record<string, ReviewStatus>;
  onStatusChange: (nomorDokumen: string, status: ReviewStatus) => void;
  onDocumentClick: (nomorDokumen: string, namaDokumen: string) => void;
}) {
  if (data.length === 0) {
    return (
      <div className="px-5 py-16 text-center">
        <svg className="w-16 h-16 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414 a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-slate-600 font-semibold">Tidak ada dokumen yang perlu direview</p>
        <p className="text-slate-400 text-sm mt-1">
          Dokumen akan muncul saat tanggal approval berada dalam rentang 2 bulan ke depan,
          atau ketika admin mengatur jadwal review khusus.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {['Nama Dokumen','Nomor Dokumen','Level','Tgl Selesai Approval',
              'Revisi','Owner','PIC','Status','Hasil Review'].map(h => (
              <th key={h} className="px-5 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {data.map(row => (
            <tr key={row.nomorDokumen} className="hover:bg-blue-50/40 transition-colors">
              <td className="px-5 py-4">
                <button
                  onClick={() => onDocumentClick(row.nomorDokumen, row.namaDokumen)}
                  className="text-left text-blue-600 hover:text-blue-800 transition-colors underline decoration-dotted underline-offset-2 hover:decoration-solid font-medium text-sm"
                >
                  {row.namaDokumen}
                </button>
                <VisibilityReason doc={row} />
              </td>
              <td className="px-5 py-4 text-sm text-slate-700 font-mono">{row.nomorDokumen}</td>
              <td className="px-5 py-4 text-sm text-slate-700">{row.levelDokumen}</td>
              <td className="px-5 py-4 text-sm text-slate-700">{formatDate(row.tanggalSelesaiApproval)}</td>
              <td className="px-5 py-4 text-sm text-slate-700 font-semibold">{row.revisi}</td>
              <td className="px-5 py-4 text-sm text-slate-700">{row.owner}</td>
              <td className="px-5 py-4 text-sm text-slate-700">{row.pic}</td>
              <td className="px-5 py-4">
                <StatusDisplayBadge status={row.status} />
              </td>
              <td className="px-5 py-4">
                <StatusSelect
                  value={pendingChanges[row.nomorDokumen] ?? toReviewStatus(row.status)}
                  onChange={s => onStatusChange(row.nomorDokumen, s)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AccessDenied({ currentPic, targetPic }: { currentPic: string; targetPic: string }) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Akses Ditolak</h2>
        <p className="text-slate-600 text-sm mb-1">
          Anda login sebagai PIC <span className="font-semibold text-blue-600">{currentPic}</span>,
          namun mencoba mengakses halaman review untuk PIC{' '}
          <span className="font-semibold text-red-600">{targetPic}</span>.
        </p>
        <p className="text-slate-500 text-xs mb-6">
          Setiap PIC hanya bisa mengakses halaman reviewnya sendiri.
        </p>
        <button
          onClick={() => router.push(`/review-page-owner/${currentPic}`)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-all"
        >
          Ke Halaman Review Saya
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function PicReviewPage() {
  const params   = useParams<{ pic: string }>();
  const router   = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Normalisasi param PIC dari URL
  let urlPic = (params?.pic ?? '').toUpperCase();
  if (urlPic.startsWith('PIC-')) urlPic = urlPic.slice(4).trim();

  // ── FIX: Ekstrak PIC code dari email user yang login ──────────────────────
  // Dulu: user.email?.split('@')[0] → tapi ini bisa salah untuk email multi-PIC
  // Sekarang: extractPicCode() menangani semua format dengan benar
  const loggedPicCode = user?.role === 'pic'
    ? extractPicCode(user.email ?? '')
    : '';

  // State
  const [documents,           setDocuments]           = useState<DocWithSchedule[]>([]);
  const [pendingChanges,      setPendingChanges]       = useState<Record<string, ReviewStatus>>({});
  const [reviewedThisSession, setReviewedThisSession] = useState<Set<string>>(new Set());
  const [selectedDocument,    setSelectedDocument]    = useState<{ nomorDokumen: string; namaDokumen: string } | null>(null);
  const [loading,             setLoading]             = useState(true);
  const [currentMonthAbbr,    setCurrentMonthAbbr]    = useState('');

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/pic-login');
      return;
    }
    if (user?.role === 'pic' && loggedPicCode !== urlPic) {
      setLoading(false);
      return;
    }
  }, [authLoading, isAuthenticated, user, loggedPicCode, urlPic, router]);

  // ── FIX: Load dokumen menggunakan EMAIL sebagai identifier ────────────────
  // Sebelumnya: getProceduresByPic(urlPic) → hanya match berdasarkan kode PIC
  // Sekarang: kirim email ke backend untuk dual matching (kode PIC + email)
  //
  // Kenapa perlu email?
  // - Dokumen lama: pic="DP", email="daniarpriambodo11@gmail.com"
  // - Dokumen baru: pic="DP", email="dp@jai.co.id"
  // - Keduanya harus muncul untuk PIC "DP" yang login dengan "dp@jai.co.id"
  // - Filter by pic ILIKE '%DP%' sudah cukup untuk kedua kasus di atas
  // - Tapi untuk memastikan tidak ada yang terlewat, kirim email juga
  const loadDocuments = useCallback(async () => {
    if (!urlPic) return;
    try {
      setLoading(true);
      setCurrentMonthAbbr(MONTH_NAMES[new Date().getMonth()]);

      // FIX: Kirim email PIC ke API agar backend bisa melakukan dual matching
      // Backend /api/procedures?pic=... sudah diupdate untuk menangani email
      const picIdentifier = user?.email ?? urlPic;
      const loaded = await getProceduresByPic(picIdentifier) as DocWithSchedule[];

      // Overlay review (logika tidak berubah)
      const withReviews = await Promise.all(
        loaded.map(async doc => {
          const activeWorkflow: StatusType[] = [
            'Telah terkirim', 'Belum dikirim', 'Telah dibaca', 'Menunggu',
          ];

          if (activeWorkflow.includes(doc.status)) {
            const inWindow =
              isWithinNormalWindow(doc.tanggalSelesaiApproval) ||
              isWithinScheduledWindow(doc.scheduledEmailAt);

            if (!inWindow) {
              const docDate       = new Date(doc.tanggalSelesaiApproval);
              const approvalMonth = isNaN(docDate.getTime()) ? new Date().getMonth() : docDate.getMonth();
              const review = await getDocumentReview(doc.nomorDokumen, approvalMonth);
              if (review && ['Relevan', 'Revisi', 'Obsolete'].includes(review.status)) {
                return { ...doc, status: review.status as StatusType, revisi: review.revisi };
              }
              return doc;
            }
            return doc;
          }

          const docDate       = new Date(doc.tanggalSelesaiApproval);
          const approvalMonth = isNaN(docDate.getTime()) ? new Date().getMonth() : docDate.getMonth();
          const review = await getDocumentReview(doc.nomorDokumen, approvalMonth);
          if (review && ['Relevan', 'Revisi', 'Obsolete'].includes(review.status)) {
            return { ...doc, status: review.status as StatusType, revisi: review.revisi };
          }
          return doc;
        })
      );

      setDocuments(withReviews);
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  }, [urlPic, user?.email]); // FIX: tambah user?.email sebagai dependency

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (user?.role === 'pic' && loggedPicCode !== urlPic) return;
      loadDocuments();
    }
  }, [authLoading, isAuthenticated, user, loggedPicCode, urlPic, loadDocuments]);

  // Handlers (tidak berubah)
  const handleStatusChange = (nomorDokumen: string, status: ReviewStatus) => {
    if (status === '-') {
      setPendingChanges(prev => { const n = { ...prev }; delete n[nomorDokumen]; return n; });
    } else {
      setPendingChanges(prev => ({ ...prev, [nomorDokumen]: status }));
    }
  };

  const handleDocumentClick = async (nomorDokumen: string, namaDokumen: string) => {
    setSelectedDocument({ nomorDokumen, namaDokumen });
    await markDocumentAsRead(nomorDokumen, urlPic);

    setDocuments(prev => prev.map(doc => {
      if (doc.nomorDokumen !== nomorDokumen) return doc;
      const eligible: StatusType[] = ['Belum dikirim', 'Telah terkirim', 'Menunggu', '-'];
      return eligible.includes(doc.status)
        ? { ...doc, status: 'Telah dibaca' as StatusType }
        : doc;
    }));
  };

  const handleFinish = async () => {
    const reviews = Object.entries(pendingChanges)
      .filter(([, s]) => s !== '-')
      .map(([nomorDokumen, pendingStatus]) => {
        const doc     = documents.find(d => d.nomorDokumen === nomorDokumen);
        let newRevisi = doc?.revisi || '0';
        if (pendingStatus === 'Revisi') {
          newRevisi = String((parseInt(newRevisi, 10) || 0) + 1);
        }
        const docDate           = new Date(doc?.tanggalSelesaiApproval || '');
        const lastReviewedMonth = isNaN(docDate.getTime()) ? new Date().getMonth() : docDate.getMonth();
        return { nomorDokumen, status: pendingStatus as StatusType, revisi: newRevisi, lastReviewedMonth };
      });

    if (reviews.length === 0) {
      alert('Tidak ada perubahan untuk disimpan.');
      return;
    }

    try {
      await batchSaveReviews(reviews, urlPic);

      await Promise.all(
        reviews.map(rv =>
          fetch(`/api/email-schedules?nomorDokumen=${encodeURIComponent(rv.nomorDokumen)}`, {
            method: 'DELETE',
          })
        )
      );

      setReviewedThisSession(prev => {
        const next = new Set(prev);
        reviews.forEach(rv => next.add(rv.nomorDokumen));
        return next;
      });

      setDocuments(prev => prev.map(doc => {
        const r = reviews.find(rv => rv.nomorDokumen === doc.nomorDokumen);
        return r ? { ...doc, status: r.status, revisi: r.revisi } : doc;
      }));

      setPendingChanges({});
      alert('✓ Review berhasil disimpan. Terima kasih!');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan review. Silakan coba lagi.');
    }
  };

  // Render states
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Memuat sesi...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user?.role === 'pic' && loggedPicCode !== urlPic) {
    return <AccessDenied currentPic={loggedPicCode} targetPic={urlPic} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Memuat dokumen...</p>
        </div>
      </div>
    );
  }

  const visibleDocuments = documents.filter(doc => shouldShowDocument(doc, reviewedThisSession));
  const pendingCount = Object.values(pendingChanges).filter(s => s !== '-').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold">Review Prosedur</h1>
              <p className="text-blue-100 mt-1 text-sm">Quality Management System</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold">PIC: {urlPic}</p>
                <p className="text-xs text-blue-200">Bulan {currentMonthAbbr}</p>
              </div>
              <button
                onClick={handleFinish}
                disabled={pendingCount === 0}
                className="bg-white text-blue-700 hover:bg-blue-50 disabled:opacity-50
                           disabled:cursor-not-allowed px-6 py-2.5 rounded-lg text-sm font-bold
                           transition-all hover:shadow-md active:scale-95"
              >
                ✓ Selesai{pendingCount > 0 ? ` (${pendingCount})` : ''}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-bold text-lg text-slate-900">Dokumen yang Perlu Direview</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Klik nama dokumen untuk membaca, lalu pilih hasil review di kolom "Hasil Review"
                </p>
              </div>
              {visibleDocuments.length > 0 && (
                <span className="text-xs text-slate-500 font-medium">
                  {visibleDocuments.length} dokumen
                </span>
              )}
            </div>
          </div>

          <div className="p-6">
            <DocumentTable
              data={visibleDocuments}
              pendingChanges={pendingChanges}
              onStatusChange={handleStatusChange}
              onDocumentClick={handleDocumentClick}
            />
          </div>

          <div className="px-6 py-4 bg-blue-50 border-t border-blue-100">
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-blue-700">ℹ️ Informasi Visibilitas: </span>
              Dokumen ditampilkan jika tanggal approval berada dalam{' '}
              <span className="font-medium">2 bulan ke depan dari hari ini</span>, atau jika admin
              telah mengatur jadwal review khusus.
            </p>
          </div>
        </div>
      </div>

      <DocumentModal
        isOpen={selectedDocument !== null}
        onClose={() => setSelectedDocument(null)}
        nomorDokumen={selectedDocument?.nomorDokumen || ''}
        namaDokumen={selectedDocument?.namaDokumen   || ''}
        hideUpload={true}
      />
    </div>
  );
}