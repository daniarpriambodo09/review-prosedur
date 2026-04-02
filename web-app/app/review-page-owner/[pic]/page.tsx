// app/review-page-owner/[pic]/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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

function formatToDDMonYYYY(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()}-${MONTH_NAMES[d.getMonth()]}-${d.getFullYear()}`;
}

type ReviewStatusType = 'Relevan' | 'Revisi' | 'Obsolete' | '-';

// ─── Filter: dokumen apa yang tampil di halaman PIC ─────────────────────────
//
// Aturan BARU (lebih lengkap):
// 1. Status workflow aktif (Telah terkirim, Belum dikirim, Telah dibaca) → SELALU tampil,
//    karena ini berarti email sudah dikirim dan PIC harus mereview.
//    Tidak peduli bulan approvalnya.
// 2. Bulan approval == bulan sekarang → tampil (kecuali sudah Relevan)
// 3. Bulan approval != bulan sekarang → tampil HANYA jika belum Relevan
// ─── Aturan visibilitas dokumen di halaman PIC ──────────────────────────────
//
// Dokumen TAMPIL jika tanggal approval (bulan + tanggal, ignore tahun)
// berada dalam window: [sekarang, sekarang + 2 bulan]
//
// Logika: review bisa dimulai 2 bulan SEBELUM tanggal approval.
// Jadi pada tanggal T, dokumen yang approval-nya antara T dan T+2bulan
// sudah harus bisa direview oleh PIC.
//
// Contoh: sekarang 1 April → window = [1 Apr, 1 Jun]
//   - approval 1 Apr  → tampil (batas bawah = sekarang)
//   - approval 15 Mei → tampil (dalam window)
//   - approval 1 Jun  → tampil (batas atas)
//   - approval 24 Mar → tidak tampil (sudah lewat dari sekarang)
//   - approval 2 Jun  → tidak tampil (di luar window ke depan)
//
// Pengecualian yang SELALU tampil (override window):
//   1. Status workflow aktif (Belum dikirim, Telah terkirim, Telah dibaca, Menunggu)
//      → email sudah dikirim, PIC harus bisa akses terlepas dari window
//   2. Baru direview di sesi ini (reviewedThisSession)
//      → jangan hilangkan dokumen seketika setelah PIC klik Selesai
//
// Semua status (termasuk Relevan, Revisi, Obsolete) bisa tampil selama
// masih dalam window — visibilitas hanya ditentukan oleh tanggal.

function shouldShowDocument(
  doc: ProcedureDocument & { lastSentAt?: string | null },
  reviewedThisSession: Set<string>
): boolean {
  // Pengecualian 1: workflow aktif → SELALU tampil
  const activeWorkflowStatuses: StatusType[] = [
    'Telah terkirim',
    'Belum dikirim',
    'Telah dibaca',
    'Menunggu',
  ];
  if (activeWorkflowStatuses.includes(doc.status)) return true;

  // Pengecualian 2: baru direview di sesi ini → tetap tampil
  if (reviewedThisSession.has(doc.nomorDokumen)) return true;

  // ── Hitung window [now, now + 2 bulan] berbasis bulan+tanggal, ignore tahun ──
  const approvalDate = new Date(doc.tanggalSelesaiApproval);
  if (isNaN(approvalDate.getTime())) return false;

  const now = new Date();

  // MD value: bulan*100 + tanggal — representasi unik titik dalam setahun
  const approvalMD = (approvalDate.getMonth() + 1) * 100 + approvalDate.getDate();
  const nowMD      = (now.getMonth() + 1) * 100 + now.getDate();

  // Batas atas window: sekarang + 2 bulan
  let endMonth = now.getMonth() + 1 + 2; // getMonth() 0-based, +1 untuk 1-based
  if (endMonth > 12) endMonth -= 12;
  const endMD = endMonth * 100 + now.getDate();

  // Cek apakah approvalMD berada dalam [nowMD, endMD]
  if (nowMD <= endMD) {
    // Normal (tidak wrap): misal [401, 601] → Apr s/d Jun
    return approvalMD >= nowMD && approvalMD <= endMD;
  } else {
    // Wrap-around: misal [1201, 201] → Des s/d Feb
    // approval harus >= Des (nowMD) ATAU <= Feb (endMD)
    return approvalMD >= nowMD || approvalMD <= endMD;
  }
}

const statusClassMap: Record<ReviewStatusType, string> = {
  Relevan:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  Revisi:   'bg-amber-50   text-amber-700   border-amber-200',
  Obsolete: 'bg-red-50     text-red-700     border-red-200',
  '-':      'bg-slate-50   text-slate-600   border-slate-200',
};

// StatusDisplayBadge — dipakai di kolom "Status" (bukan kolom "Hasil Review")
// Menampilkan status aktual dokumen dari perspektif PIC
function StatusDisplayBadge({ status }: { status: StatusType }) {
  // Status yang belum merupakan hasil review final ditampilkan sebagai "Belum Direview"
  const isPendingReview = !['Relevan', 'Revisi', 'Obsolete'].includes(status);

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

  if (isPendingReview) {
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

function StatusSelect({
  value,
  onChange,
}: {
  value: ReviewStatusType;
  onChange: (s: ReviewStatusType) => void;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as ReviewStatusType)}
      className={`px-3 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer appearance-none bg-right bg-no-repeat pr-8 ${statusClassMap[value]}`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231f2937' d='M6 8L2 4h8z'/%3E%3C/svg%3E")`,
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

// ✅ FIX: toReviewStatus — konversi status ke ReviewStatusType untuk dropdown
// Status final review (Relevan/Revisi/Obsolete) ditampilkan sesuai nilainya.
// Status lain (workflow email, belum review) → '-' supaya dropdown default ke "Belum Dipilih"
function toReviewStatus(status: StatusType): ReviewStatusType {
  if (status === 'Relevan' || status === 'Revisi' || status === 'Obsolete') return status;
  return '-';
}

function getApprovalMonthLabel(iso: string): string {
  const d   = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const sameMonth = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (sameMonth) return '';
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function DocumentTable({
  data,
  pendingChanges,
  onStatusChange,
  onDocumentClick,
}: {
  data: ProcedureDocument[];
  pendingChanges: Record<string, ReviewStatusType>;
  onStatusChange: (nomorDokumen: string, status: ReviewStatusType) => void;
  onDocumentClick: (nomorDokumen: string, namaDokumen: string) => void;
}) {
  if (data.length === 0)
    return (
      <div className="px-5 py-12 text-center">
        <svg className="w-16 h-16 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-slate-500 font-medium">Semua dokumen sudah direview</p>
        <p className="text-slate-400 text-sm mt-1">Tidak ada dokumen yang perlu ditinjau untuk saat ini</p>
      </div>
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {['Nama Dokumen','Nomor Dokumen','Level','Tgl Selesai Approval',
              'Revisi','Owner','PIC','Status','Hasil Review'].map(h => (
              <th key={h} className="px-5 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {data.map(row => {
            const approvalMonthLabel = getApprovalMonthLabel(row.tanggalSelesaiApproval);
            return (
              <tr key={row.nomorDokumen} className="hover:bg-blue-50 transition-colors">
                <td className="px-5 py-4">
                  <button
                    onClick={() => onDocumentClick(row.nomorDokumen, row.namaDokumen)}
                    className="text-left text-blue-600 hover:text-blue-800 transition-colors underline decoration-dotted underline-offset-2 hover:decoration-solid font-medium"
                  >
                    {row.namaDokumen}
                  </button>
                </td>
                <td className="px-5 py-4 text-sm text-slate-700">{row.nomorDokumen}</td>
                <td className="px-5 py-4 text-sm text-slate-700">{row.levelDokumen}</td>
                <td className="px-5 py-4">
                  <div className="text-sm text-slate-700">
                    {formatToDDMonYYYY(row.tanggalSelesaiApproval)}
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-slate-700">{row.revisi}</td>
                <td className="px-5 py-4 text-sm text-slate-700">{row.owner}</td>
                <td className="px-5 py-4 text-sm text-slate-700">{row.pic}</td>
                <td className="px-5 py-4">
                  <StatusDisplayBadge status={row.status} />
                </td>
                <td className="px-5 py-4">
                  <StatusSelect
                    value={pendingChanges[row.nomorDokumen] ?? toReviewStatus(row.status)}
                    onChange={status => onStatusChange(row.nomorDokumen, status)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── OTP Overlay ───────────────────────────────────────────────────────────────
function OTPOverlay({ pic, onVerified }: { pic: string; onVerified: () => void }) {
  const [otp,        setOtp]        = useState('');
  const [error,      setError]      = useState('');
  const [isVerifying, setVerifying] = useState(false);
  const [showHint,   setShowHint]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) { setError('OTP harus 6 digit angka'); return; }

    try {
      setVerifying(true);
      const res  = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pic, otp }),
      });
      const data = await res.json();

      if (res.ok && data.valid) {
        sessionStorage.setItem(`otp_verified_${pic}`, 'true');
        onVerified();
      } else {
        setError(data.message || 'OTP tidak valid');
        setOtp('');
      }
    } catch {
      setError('Gagal memverifikasi OTP. Silakan coba lagi.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Verifikasi Keamanan</h3>
              <p className="text-xs text-slate-600">PIC: {pic}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Masukkan Kode OTP</label>
            <input
              type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
              value={otp} autoFocus disabled={isVerifying}
              onChange={e => { setOtp(e.target.value.replace(/\D/g,'').slice(0,6)); setError(''); }}
              placeholder="000000"
              className="w-full px-4 py-3 text-center text-2xl font-mono font-bold tracking-widest border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <p className="text-xs text-slate-500 mt-2">Kode OTP terdapat pada email yang dikirim ke PIC</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <button type="button" onClick={() => setShowHint(!showHint)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium">
            {showHint ? 'Sembunyikan Petunjuk' : 'Lupa kode OTP?'}
          </button>

          {showHint && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs space-y-1">
              <p>📧 Cek email Anda untuk kode OTP 6 digit</p>
              <p>🔄 Kode OTP berubah setiap bulan</p>
              <p>⏰ Kode hanya berlaku hingga akhir bulan</p>
              <p>🔐 Jangan bagikan kode OTP kepada siapa pun</p>
            </div>
          )}

          <button type="submit" disabled={otp.length !== 6 || isVerifying}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2">
            {isVerifying ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memverifikasi...
              </>
            ) : 'Verifikasi & Lanjutkan'}
          </button>

          <p className="text-xs text-center text-slate-500">Butuh bantuan? Hubungi administrator sistem.</p>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PicReviewPage() {
  const params = useParams<{ pic: string }>();
  let pic = params?.pic?.toUpperCase() || '';
  if (pic.startsWith('PIC-')) pic = pic.slice(4).trim();

  const [documents,           setDocuments]           = useState<ProcedureDocument[]>([]);
  const [currentMonthAbbr,    setCurrentMonthAbbr]    = useState('');
  const [pendingChanges,      setPendingChanges]      = useState<Record<string, ReviewStatusType>>({});
  const [loading,             setLoading]             = useState(true);
  const [isVerified,          setIsVerified]          = useState(false);
  const [selectedDocument,    setSelectedDocument]    = useState<{
    nomorDokumen: string; namaDokumen: string;
  } | null>(null);
  // Menyimpan dokumen yang baru direview di sesi ini agar tidak langsung hilang
  // dari layar setelah PIC submit review. Set ini direset saat halaman di-refresh.
  const [reviewedThisSession, setReviewedThisSession] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (sessionStorage.getItem(`otp_verified_${pic}`) === 'true') setIsVerified(true);
  }, [pic]);

  useEffect(() => {
    if (!isVerified) return;
    const loadData = async () => {
      try {
        const now = new Date();
        setCurrentMonthAbbr(MONTH_NAMES[now.getMonth()]);

        const loaded = await getProceduresByPic(pic);

        // Ambil review berdasarkan bulan APPROVAL dokumen (bukan bulan sekarang).
        // PENTING: Status workflow aktif (Telah terkirim, Belum dikirim, Telah dibaca)
        // dari procedure_documents TIDAK boleh ditimpa oleh document_reviews yang kosong/lama,
        // karena status workflow ini diset oleh sistem email, bukan oleh PIC.
        const activeWorkflow: StatusType[] = ['Telah terkirim', 'Belum dikirim', 'Telah dibaca', 'Menunggu'];

        const withReviews = await Promise.all(
          loaded.map(async doc => {
            // Jika status sudah dalam workflow aktif, langsung pakai — jangan di-override
            if (activeWorkflow.includes(doc.status)) return doc;

            const docDate = new Date(doc.tanggalSelesaiApproval);
            const approvalMonth = isNaN(docDate.getTime())
              ? now.getMonth()
              : docDate.getMonth();

            const review = await getDocumentReview(doc.nomorDokumen, approvalMonth);
            // Hanya override dengan review jika review berisi status final (Relevan/Revisi/Obsolete)
            if (review && ['Relevan', 'Revisi', 'Obsolete'].includes(review.status)) {
              return { ...doc, status: review.status as StatusType, revisi: review.revisi };
            }
            return doc;
          })
        );

        setDocuments(withReviews);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [pic, isVerified]);

  const visibleDocuments = documents.filter(doc => shouldShowDocument(doc, reviewedThisSession));

  const handleStatusChange = (nomorDokumen: string, status: ReviewStatusType) => {
    if (status === '-') {
      setPendingChanges(prev => { const n = { ...prev }; delete n[nomorDokumen]; return n; });
      return;
    }
    // Simpan pilihan PIC hanya di pendingChanges.
    // documents state TIDAK diubah di sini agar visibilitas dokumen tidak berfluktuasi.
    // Status di documents baru diupdate setelah PIC klik "Selesai" (handleFinish).
    setPendingChanges(prev => ({ ...prev, [nomorDokumen]: status }));
  };

  const handleDocumentClick = async (nomorDokumen: string, namaDokumen: string) => {
    setSelectedDocument({ nomorDokumen, namaDokumen });
    await markDocumentAsRead(nomorDokumen, pic);

    // Update state lokal — hanya jika status masih eligible
    setDocuments(prev =>
      prev.map(doc => {
        if (doc.nomorDokumen !== nomorDokumen) return doc;
        const eligible: StatusType[] = ['Belum dikirim', 'Telah terkirim', 'Menunggu', '-'];
        return eligible.includes(doc.status)
          ? { ...doc, status: 'Telah dibaca' as StatusType }
          : doc;
      })
    );
  };

  const handleFinish = async () => {
    try {
      const reviews = Object.entries(pendingChanges)
        .filter(([, s]) => s !== '-')
        .map(([nomorDokumen, pendingStatus]) => {
          const doc = documents.find(d => d.nomorDokumen === nomorDokumen);

          let newRevisi = doc?.revisi || '0';
          if (pendingStatus === 'Revisi') newRevisi = String((parseInt(newRevisi, 10) || 0) + 1);

          // ✅ FIX: Gunakan bulan APPROVAL dokumen sebagai lastReviewedMonth,
          //    bukan new Date().getMonth() (bulan sekarang).
          const docDate = new Date(doc?.tanggalSelesaiApproval || '');
          const lastReviewedMonth = isNaN(docDate.getTime())
            ? new Date().getMonth()
            : docDate.getMonth();

          return {
            nomorDokumen,
            status: pendingStatus as StatusType,
            revisi: newRevisi,
            lastReviewedMonth,
          };
        });

      if (reviews.length === 0) { alert('Tidak ada perubahan untuk disimpan.'); return; }

      await batchSaveReviews(reviews, pic);

      // Cancel email schedule untuk setiap dokumen yang sudah direview
      await Promise.all(
        reviews.map(rv =>
          fetch(`/api/email-schedules?nomorDokumen=${encodeURIComponent(rv.nomorDokumen)}`, {
            method: 'DELETE',
          })
        )
      );

      // Tandai dokumen-dokumen ini sebagai "baru direview di sesi ini"
      // agar tetap tampil di halaman meskipun status sudah Relevan/expired.
      // Dokumen baru hilang saat PIC refresh/tutup halaman.
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
      alert('Perubahan telah disimpan. Terima kasih!');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan perubahan. Silakan coba lagi.');
    }
  };

  if (!isVerified) {
    return <OTPOverlay pic={pic} onVerified={() => setIsVerified(true)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  const pendingCount = Object.values(pendingChanges).filter(s => s !== '-').length;

  const overdueCount = visibleDocuments.filter(doc => {
    const d   = new Date(doc.tanggalSelesaiApproval);
    const now = new Date();
    return !(d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear());
  }).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold">Review Prosedur</h1>
              <p className="text-blue-100 mt-1">Quality Management System</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold">PIC: {pic}</p>
                <p className="text-xs text-blue-100">Bulan {currentMonthAbbr}</p>
              </div>
              <button
                onClick={handleFinish}
                disabled={pendingCount === 0}
                className="bg-white text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 rounded-lg text-sm font-bold transition-all hover:shadow-md active:scale-95"
              >
                ✓ Selesai{pendingCount > 0 ? ` (${pendingCount})` : ''}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
            <h2 className="font-bold text-lg text-slate-900">Dokumen yang Perlu Direview</h2>
            <p className="text-xs text-slate-600 mt-1">
              Klik nama dokumen untuk membuka dan membaca, lalu pilih hasil review di kolom "Hasil Review"
            </p>
          </div>

          <div className="p-6">
            <DocumentTable
              data={visibleDocuments}
              pendingChanges={pendingChanges}
              onStatusChange={handleStatusChange}
              onDocumentClick={handleDocumentClick}
            />
          </div>

          <div className="px-6 py-4 bg-blue-50 border-t border-blue-200">
            <p className="text-xs text-slate-600">
              <span className="font-semibold text-blue-700">ℹ️ Informasi: </span>
              Menampilkan semua dokumen yang belum selesai direview. Dokumen bulan {currentMonthAbbr} selalu ditampilkan.
              Dokumen dari bulan sebelumnya akan tersembunyi otomatis setelah berstatus Relevan.
            </p>
          </div>
        </div>
      </div>

      <DocumentModal
        isOpen={selectedDocument !== null}
        onClose={() => setSelectedDocument(null)}
        nomorDokumen={selectedDocument?.nomorDokumen || ''}
        namaDokumen={selectedDocument?.namaDokumen || ''}
        hideUpload={true}
      />
    </div>
  );
}