// app/review-page-owner/[pic]/page.tsx
// PERBAIKAN BUG: Halaman PIC review kosong setelah perubahan sistem login
//
// PERUBAHAN:
// 1. Tambah fungsi extractPicCode() untuk ekstrak kode dari email baru
// 2. loadDocuments sekarang mengirim picEmail ke API untuk dual matching
// 3. Auth guard menggunakan extractPicCode() agar access check tetap akurat
// 4. 🐛 FIX: activeWorkflow sekarang juga mencakup status alur approval
//    berjenjang (Menunggu ACC Prepared/Checked/Approved) — supaya tidak
//    ke-overlay balik oleh document_reviews bulan ini (lihat penjelasan
//    yang sama di app/status-review/page.tsx).
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
  lastSentAt?:          string | null;
  scheduledEmailAt?:    string | null;
  revisionRequestedAt?: string | null;
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
// Visibility Logic
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

/**
 * 🆕 Kondisi Permintaan Revisi dari PIC:
 * Ketika ada dokumen yang diminta revisi oleh PIC (status 'Revisi' atau tercatat di pic_review_requests),
 * dokumen tersebut HARUS muncul di halaman review PIC dan tetap muncul selama 2 bulan ke depan
 * dihitung mulai dari tanggal minta request revisi dari PIC.
 */
function isWithinRevisionWindow(doc: DocWithSchedule): boolean {
  const dateStr = doc.revisionRequestedAt || (doc.status === 'Revisi' ? doc.lastReviewedAt : null);
  if (!dateStr) return false;
  const reqDate = new Date(dateStr);
  if (isNaN(reqDate.getTime())) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiry = new Date(reqDate.getFullYear(), reqDate.getMonth() + 2, reqDate.getDate());
  return today <= expiry;
}

function shouldShowDocument(doc: DocWithSchedule, reviewedThisSession: Set<string>): boolean {
  if (reviewedThisSession.has(doc.nomorDokumen)) return true;
  // 1. Dokumen yang diminta revisi oleh PIC (tetap tampil selama 2 bulan dari tanggal request)
  if (isWithinRevisionWindow(doc)) return true;
  // 2. Dokumen dengan jadwal khusus admin
  if (isWithinScheduledWindow(doc.scheduledEmailAt)) return true;
  // 3. Dokumen dalam rentang siklus tahunan normal (2 bulan sebelum tanggal approval)
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
// Sub-components & Badges
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_META: Record<ReviewStatus, { label: string; bg: string; text: string; border: string; icon: string }> = {
  Relevan:  { label: 'Relevan',  bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '✓' },
  Revisi:   { label: 'Revisi',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: '⟳' },
  Obsolete: { label: 'Obsolete', bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    icon: '⊘' },
  '-':      { label: 'Pilih Keputusan', bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', icon: '•' },
};

function StatusSelect({ value, onChange }: { value: ReviewStatus; onChange: (s: ReviewStatus) => void }) {
  const meta = STATUS_META[value] || STATUS_META['-'];
  return (
    <div className="relative inline-block w-full min-w-[150px]">
      <select
        value={value}
        onChange={e => onChange(e.target.value as ReviewStatus)}
        className={`w-full pl-3 pr-8 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer appearance-none shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${meta.bg} ${meta.text} ${meta.border}`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23475569' d='M6 8L2 4h8z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
        }}
      >
        <option value="-" className="bg-white text-slate-600 font-medium">-- Belum Dipilih --</option>
        <option value="Relevan" className="bg-white text-emerald-700 font-bold">✓ Relevan (Tetap Berlaku)</option>
        <option value="Revisi" className="bg-white text-amber-700 font-bold">⟳ Revisi (Perlu Perubahan)</option>
        <option value="Obsolete" className="bg-white text-rose-700 font-bold">⊘ Obsolete (Tidak Berlaku)</option>
      </select>
    </div>
  );
}

function StatusDisplayBadge({ status }: { status: StatusType }) {
  const isReviewed = ['Relevan', 'Revisi', 'Obsolete'].includes(status);
  const styles: Partial<Record<StatusType, { cls: string; icon: string }>> = {
    'Belum dikirim':  { cls: 'bg-orange-50  text-orange-700  border-orange-200/80',  icon: '📋' },
    'Telah terkirim': { cls: 'bg-cyan-50    text-cyan-700    border-cyan-200/80',    icon: '📨' },
    'Telah dibaca':   { cls: 'bg-purple-50  text-purple-700  border-purple-200/80',  icon: '👁️' },
    'Relevan':        { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', icon: '✓' },
    'Revisi':         { cls: 'bg-amber-50   text-amber-700   border-amber-200/80',   icon: '⟳' },
    'Obsolete':       { cls: 'bg-rose-50    text-rose-700    border-rose-200/80',    icon: '⊘' },
    'Menunggu':       { cls: 'bg-blue-50    text-blue-700    border-blue-200/80',    icon: '⏳' },
    '-':              { cls: 'bg-slate-50   text-slate-600   border-slate-200/80',   icon: '?' },
  };

  if (!isReviewed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border bg-slate-50 text-slate-500 border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        Belum Direview
      </span>
    );
  }
  const s = styles[status] ?? styles['-']!;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border shadow-2xs ${s.cls}`}>
      <span>{s.icon}</span>
      <span>{status}</span>
    </span>
  );
}

function VisibilityReason({ doc }: { doc: DocWithSchedule }) {
  if (isWithinRevisionWindow(doc)) {
    const dateStr = doc.revisionRequestedAt || (doc.status === 'Revisi' ? doc.lastReviewedAt : null);
    if (dateStr) {
      const d = new Date(dateStr);
      const expiry = new Date(d.getFullYear(), d.getMonth() + 2, d.getDate());
      return (
        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 font-semibold mt-1">
          <span>⟳</span>
          <span>Permintaan Revisi s/d {formatDate(expiry.toISOString())}</span>
        </span>
      );
    }
  }
  if (isWithinScheduledWindow(doc.scheduledEmailAt) && !isWithinNormalWindow(doc.tanggalSelesaiApproval)) {
    const expiry = new Date(doc.scheduledEmailAt!);
    expiry.setMonth(expiry.getMonth() + 2);
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60 font-semibold mt-1">
        <span>📅</span>
        <span>Jadwal Khusus s/d {formatDate(expiry.toISOString())}</span>
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
  onDocumentClick: (nomorDokumen: string, namaDokumen: string, status: string) => void;
}) {
  if (data.length === 0) {
    return (
      <div className="py-20 text-center px-4">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414 a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-slate-800 font-bold text-base">Tidak Ada Dokumen yang Perlu Direview</h3>
        <p className="text-slate-400 text-xs max-w-md mx-auto mt-1.5 leading-relaxed">
          Semua dokumen Anda sudah selesai direview atau saat ini berada di luar rentang review (2 bulan sebelum jatuh tempo).
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200/90 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <th className="px-5 py-3.5">Dokumen & Prosedur</th>
            <th className="px-4 py-3.5">Nomor Dokumen</th>
            <th className="px-3 py-3.5 text-center">Level</th>
            <th className="px-4 py-3.5">Tgl Approval</th>
            <th className="px-3 py-3.5 text-center">Rev</th>
            <th className="px-3 py-3.5">Owner</th>
            <th className="px-3 py-3.5">PIC</th>
            <th className="px-4 py-3.5">Status Sistem</th>
            <th className="px-5 py-3.5 min-w-[180px]">Hasil Review Anda</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs">
          {data.map(row => {
            const currentSelected = pendingChanges[row.nomorDokumen] ?? toReviewStatus(row.status);
            const isChanged = Boolean(pendingChanges[row.nomorDokumen]);

            return (
              <tr
                key={row.nomorDokumen}
                className={`transition-colors group hover:bg-blue-50/40 ${
                  isChanged ? 'bg-blue-50/20' : 'bg-white'
                }`}
              >
                {/* Nama Dokumen + Read Trigger */}
                <td className="px-5 py-4 max-w-sm">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-700 flex items-center justify-center flex-shrink-0 transition-colors mt-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 7.414V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <button
                        onClick={() => onDocumentClick(row.nomorDokumen, row.namaDokumen, row.status)}
                        className="text-left font-bold text-slate-800 hover:text-blue-600 transition-colors text-xs leading-snug cursor-pointer group-hover:underline decoration-blue-400 underline-offset-2 block"
                        title="Klik untuk membuka dan membaca isi dokumen"
                      >
                        {row.namaDokumen}
                      </button>
                      <VisibilityReason doc={row} />
                    </div>
                  </div>
                </td>

                {/* Nomor Dokumen */}
                <td className="px-4 py-4 font-mono font-bold text-slate-700 text-xs whitespace-nowrap">
                  <span className="bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md">
                    {row.nomorDokumen}
                  </span>
                </td>

                {/* Level Dokumen */}
                <td className="px-3 py-4 text-center">
                  <span className="font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full text-[11px]">
                    Lv {row.levelDokumen || '-'}
                  </span>
                </td>

                {/* Tgl Selesai Approval */}
                <td className="px-4 py-4 text-slate-600 whitespace-nowrap">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium">
                    <span className="text-slate-400">📅</span>
                    {formatDate(row.tanggalSelesaiApproval)}
                  </span>
                </td>

                {/* Revisi */}
                <td className="px-3 py-4 text-center font-bold text-slate-800">
                  {row.revisi || '0'}
                </td>

                {/* Owner */}
                <td className="px-3 py-4 font-semibold text-slate-600 text-[11px]">
                  {row.owner}
                </td>

                {/* PIC */}
                <td className="px-3 py-4 text-slate-600 font-mono text-[11px]">
                  {row.pic}
                </td>

                {/* Status Sistem */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <StatusDisplayBadge status={row.status} />
                </td>

                {/* Hasil Review Selector */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <StatusSelect
                      value={currentSelected}
                      onChange={s => onStatusChange(row.nomorDokumen, s)}
                    />
                    {isChanged && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse flex-shrink-0" title="Perubahan belum disimpan" />
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
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
  const loggedPicCode = user?.role === 'pic'
    ? extractPicCode(user.email ?? '')
    : '';

  // State
  const [documents,           setDocuments]           = useState<DocWithSchedule[]>([]);
  const [pendingChanges,      setPendingChanges]       = useState<Record<string, ReviewStatus>>({});
  const [reviewedThisSession, setReviewedThisSession] = useState<Set<string>>(new Set());
  const [selectedDocument,    setSelectedDocument]    = useState<{ nomorDokumen: string; namaDokumen: string; status: string } | null>(null);
  const [loading,             setLoading]             = useState(true);
  const [saving,              setSaving]              = useState(false);
  const [currentMonthAbbr,    setCurrentMonthAbbr]    = useState('');
  const [searchQuery,         setSearchQuery]         = useState('');
  const [activeFilter,        setActiveFilter]        = useState<'all' | 'unreviewed' | 'Relevan' | 'Revisi' | 'Obsolete'>('all');

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

  // ── Load dokumen menggunakan EMAIL sebagai identifier ──────────────────────
  const loadDocuments = useCallback(async () => {
    if (!urlPic) return;
    try {
      setLoading(true);
      setCurrentMonthAbbr(MONTH_NAMES[new Date().getMonth()]);

      const picIdentifier = user?.email ?? urlPic;
      const loaded = await getProceduresByPic(picIdentifier) as DocWithSchedule[];

      const withReviews = await Promise.all(
        loaded.map(async doc => {
          const activeWorkflow: StatusType[] = [
            'Telah terkirim', 'Belum dikirim', 'Telah dibaca', 'Menunggu',
            'Menunggu ACC Prepared', 'Menunggu ACC Checked', 'Menunggu ACC Approved',
            'Ditolak',
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

          if (doc.status === 'Revisi' || isWithinRevisionWindow(doc)) {
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
  }, [urlPic, user?.email]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (user?.role === 'pic' && loggedPicCode !== urlPic) return;
      loadDocuments();
    }
  }, [authLoading, isAuthenticated, user, loggedPicCode, urlPic, loadDocuments]);

  // Handlers
  const handleStatusChange = (nomorDokumen: string, status: ReviewStatus) => {
    if (status === '-') {
      setPendingChanges(prev => { const n = { ...prev }; delete n[nomorDokumen]; return n; });
    } else {
      setPendingChanges(prev => ({ ...prev, [nomorDokumen]: status }));
    }
  };

  const handleDocumentClick = async (nomorDokumen: string, namaDokumen: string, status: string) => {
    setSelectedDocument({ nomorDokumen, namaDokumen, status });
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
      alert('Tidak ada perubahan review untuk disimpan.');
      return;
    }

    try {
      setSaving(true);
      await batchSaveReviews(reviews, urlPic);

      await Promise.all(
        reviews.map(rv =>
          fetch(`/review-prosedur/api/email-schedules?nomorDokumen=${encodeURIComponent(rv.nomorDokumen)}`, {
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
      alert('✓ Seluruh review berhasil disimpan ke sistem. Terima kasih atas partisipasi Anda!');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan review. Silakan coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-xl max-w-sm w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-blue-600 border-t-transparent mx-auto mb-4" />
          <h2 className="text-base font-bold text-slate-800">Memverifikasi Sesi PIC</h2>
          <p className="text-xs text-slate-400 mt-1">Menyiapkan hak akses review dokumen...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user?.role === 'pic' && loggedPicCode !== urlPic) {
    return <AccessDenied currentPic={loggedPicCode} targetPic={urlPic} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-xl max-w-sm w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-blue-600 border-t-transparent mx-auto mb-4" />
          <h2 className="text-base font-bold text-slate-800">Memuat Dokumen Prosedur</h2>
          <p className="text-xs text-slate-400 mt-1">Mengambil data prosedur yang ditugaskan kepada PIC {urlPic}...</p>
        </div>
      </div>
    );
  }

  const visibleDocuments = documents.filter(doc => shouldShowDocument(doc, reviewedThisSession));
  const pendingCount = Object.values(pendingChanges).filter(s => s !== '-').length;

  // Statistik KPI
  const totalDocs = visibleDocuments.length;
  const reviewedCount = visibleDocuments.filter(d => ['Relevan', 'Revisi', 'Obsolete'].includes(d.status)).length;
  const unreviewedCount = totalDocs - reviewedCount;

  // Filter & Search Logic
  const filteredDocuments = visibleDocuments.filter(doc => {
    // 1. Text Search
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchNomor = doc.nomorDokumen.toLowerCase().includes(q);
      const matchNama  = doc.namaDokumen.toLowerCase().includes(q);
      const matchOwner = (doc.owner || '').toLowerCase().includes(q);
      if (!matchNomor && !matchNama && !matchOwner) return false;
    }

    // 2. Active Tab Filter
    const currentStatus = pendingChanges[doc.nomorDokumen] ?? toReviewStatus(doc.status);
    if (activeFilter === 'unreviewed') {
      return currentStatus === '-';
    }
    if (activeFilter === 'Relevan') {
      return currentStatus === 'Relevan';
    }
    if (activeFilter === 'Revisi') {
      return currentStatus === 'Revisi';
    }
    if (activeFilter === 'Obsolete') {
      return currentStatus === 'Obsolete';
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50/70 antialiased text-slate-800 flex flex-col pb-24">
      {/* ── Top Hero Banner (Executive Dark Style) ── */}
      <header className="relative bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white overflow-hidden shadow-md">
        {/* Subtle Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          {/* Tombol Navigasi Kembali */}
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  router.back();
                } else {
                  router.push(user?.role === 'pic' ? '/pic-dashboard' : '/home');
                }
              }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-md transition-all border border-white/15 active:scale-95 cursor-pointer shadow-2xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Kembali ke Dashboard</span>
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Portal PIC Review Prosedur
                </span>
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-white/10 text-white border border-white/10">
                  QMS PT JAI
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Peninjauan Berkala Dokumen Prosedur
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                Silakan baca lembar prosedur operasional dan tentukan apakah dokumen masih <strong>Relevan</strong>, memerlukan <strong>Revisi</strong>, atau sudah <strong>Obsolete</strong>.
              </p>
            </div>

            {/* Profil PIC & Tombol Selesai Cepat */}
            <div className="flex items-center gap-3 self-start md:self-auto bg-white/10 backdrop-blur-md p-2.5 rounded-2xl border border-white/15 flex-shrink-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md flex-shrink-0 overflow-hidden">
                {(user?.fullName ? user.fullName.slice(0, 2) : urlPic.slice(0, 2)).toUpperCase()}
              </div>
              <div className="pr-2 text-left min-w-0 max-w-[180px] sm:max-w-[220px]">
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider truncate">
                    Penanggung Jawab
                  </p>
                  <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/30 text-blue-200 border border-blue-400/30 flex-shrink-0">
                    {urlPic.length > 6 ? urlPic.slice(0, 6) : urlPic}
                  </span>
                </div>
                <p className="text-xs font-bold text-white truncate mt-0.5" title={user?.fullName || `PIC - ${urlPic}`}>
                  {user?.fullName || `PIC - ${urlPic}`}
                </p>
                <p className="text-[10px] text-slate-300 truncate mt-0.5" title={user?.email || `Bulan ${currentMonthAbbr}`}>
                  {user?.email || `Bulan ${currentMonthAbbr}`}
                </p>
              </div>

              <button
                onClick={handleFinish}
                disabled={pendingCount === 0 || saving}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-500/25 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <span>Simpan Review</span>
                    {pendingCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-md bg-white text-emerald-800 text-[10px] font-black">
                        {pendingCount}
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 z-20 w-full space-y-6">
        {/* ── KPI Summary Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Dokumen */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Total Dokumen</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                📑
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">{totalDocs}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate" title={`Ditugaskan ke PIC ${urlPic}`}>Ditugaskan ke PIC {urlPic}</p>
          </div>

          {/* Card 2: Belum Direview */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Belum Direview</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                ⏳
              </div>
            </div>
            <p className="text-2xl font-black text-amber-600 mt-2">{unreviewedCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Menunggu konfirmasi Anda</p>
          </div>

          {/* Card 3: Sudah Direview */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Selesai Direview</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                ✓
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-600 mt-2">{reviewedCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Sudah tervalidasi</p>
          </div>

          {/* Card 4: Draft Perubahan */}
          <div className={`rounded-2xl p-4 border transition-all ${
            pendingCount > 0 ? 'bg-blue-50/70 border-blue-200 shadow-xs' : 'bg-white border-slate-200/90 shadow-2xs'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Draft Baru</span>
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                ✏️
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <p className="text-2xl font-black text-blue-700">{pendingCount}</p>
              {pendingCount > 0 && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Belum Disimpan
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Perubahan di sesi ini</p>
          </div>
        </div>

        {/* ── Card Panduan Cepat Hasil Review ── */}
        <div className="bg-gradient-to-r from-blue-50/60 via-slate-50 to-indigo-50/50 border border-blue-100/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-2xs mt-0.5">
              💡
            </div>
            <div className="min-w-0 flex-1 text-xs">
              <p className="font-bold text-slate-900 mb-1">Panduan Singkat Penentuan Hasil Review:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-600 mt-2">
                <div className="p-2 rounded-xl bg-white border border-emerald-100 shadow-2xs">
                  <span className="font-bold text-emerald-700 block mb-0.5">✓ Relevan</span>
                  <span>Prosedur operasional saat ini masih akurat & berlaku tanpa perlu perubahan isi.</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-amber-100 shadow-2xs">
                  <span className="font-bold text-amber-700 block mb-0.5">⟳ Revisi</span>
                  <span>Terdapat alur atau kebijakan baru di lapangan yang harus diperbarui oleh tim.</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-rose-100 shadow-2xs">
                  <span className="font-bold text-rose-700 block mb-0.5">⊘ Obsolete</span>
                  <span>Prosedur sudah tidak dipakai lagi atau digantikan prosedur baru sejenis.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Card Tabel Dokumen & Kontrol Filter ── */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Header Kontrol: Filter Tabs & Search Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Semua ({totalDocs})
              </button>
              <button
                onClick={() => setActiveFilter('unreviewed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === 'unreviewed'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                ⏳ Belum Direview ({unreviewedCount})
              </button>
              <button
                onClick={() => setActiveFilter('Relevan')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === 'Relevan'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                ✓ Relevan
              </button>
              <button
                onClick={() => setActiveFilter('Revisi')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === 'Revisi'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                ⟳ Revisi
              </button>
              <button
                onClick={() => setActiveFilter('Obsolete')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === 'Obsolete'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                ⊘ Obsolete
              </button>
            </div>

            {/* Live Search Bar */}
            <div className="relative w-full md:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nomor / nama dokumen..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-2xs"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold px-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Table Render */}
          <DocumentTable
            data={filteredDocuments}
            pendingChanges={pendingChanges}
            onStatusChange={handleStatusChange}
            onDocumentClick={handleDocumentClick}
          />

          {/* Bottom Info Visibilitas */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-blue-600 font-bold">ℹ️ Informasi Visibilitas:</span>
              <span>Dokumen otomatis muncul dalam 2 bulan sebelum tanggal jatuh tempo approval atau jadwal khusus admin.</span>
            </div>
            <span className="font-semibold text-slate-400">
              Menampilkan {filteredDocuments.length} dari {totalDocs} dokumen
            </span>
          </div>
        </div>
      </main>

      {/* ── Floating Sticky Action Dock (Muncul saat ada perubahan draft) ── */}
      {pendingCount > 0 && (
        <div className="fixed bottom-6 inset-x-0 mx-auto max-w-xl px-4 z-40 animate-in slide-in-from-bottom duration-300">
          <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-3xl p-4 shadow-2xl border border-white/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm animate-bounce">
                {pendingCount}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  Ada {pendingCount} dokumen siap disimpan
                </p>
                <p className="text-[11px] text-slate-300 truncate">
                  Klik tombol di samping untuk menyimpan hasil review Anda ke sistem.
                </p>
              </div>
            </div>

            <button
              onClick={handleFinish}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex-shrink-0"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <span>✓ Simpan Semua Review</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal Pratinjau Dokumen ── */}
      <DocumentModal
        isOpen={selectedDocument !== null}
        onClose={() => setSelectedDocument(null)}
        nomorDokumen={selectedDocument?.nomorDokumen || ''}
        namaDokumen={selectedDocument?.namaDokumen   || ''}
        documentStatus={selectedDocument?.status}
        hideUpload={true}
        annotatorIdentity={user?.email ? { nama: user.fullName ?? null, email: user.email } : undefined}
      />
    </div>
  );
}