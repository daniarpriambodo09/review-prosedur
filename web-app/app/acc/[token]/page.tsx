// app/acc/[token]/page.tsx
//
// Halaman publik (TANPA login) yang dibuka dari link di email ACC.
// Menampilkan info dokumen + tombol "Setujui Dokumen". Setelah diklik,
// backend (app/api/acc/[token]/route.ts) menandai ACC dan otomatis
// melanjutkan ke tahap berikutnya (Prepared -> Checked -> Approved) atau
// menyelesaikan cycle jika tahap terakhir sudah selesai.
//
// 🆕 Di bagian bawah ada Diskusi Dokumen — chat real-time dengan admin dan
// approver lain. Chat SENGAJA ditampilkan di semua kondisi (termasuk setelah
// orang ini sudah ACC, setelah dokumen maju ke tahap berikutnya, maupun
// setelah cycle ditolak/selesai) — sesuai alur: yang dibatasi oleh tahap
// hanyalah tombol Setujui/Tolak, bukan kemampuan berkomunikasi.

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AnnotatablePDFViewer from '@/components/documents/AnnotatablePDFViewer';
import VersionToggleBar from '@/components/documents/VersionToggleBar';
import DocumentChat from '@/components/chat/DocumentChat';

interface RejectionInfo {
  role: 'prepared' | 'checked' | 'approved';
  roleLabel: string;
  nama: string | null;
  email: string;
  reason: string;
  rejectedAt: string;
}

interface AccInfo {
  role: 'prepared' | 'checked' | 'approved';
  roleLabel: string;
  nama: string | null;
  email: string;
  accStatus: 'pending' | 'acc' | 'rejected';
  accAt: string | null;
  rejectReason: string | null;
  nomorDokumen: string;
  namaDokumen: string;
  cycleStatus: 'in_progress' | 'completed' | 'cancelled' | 'rejected';
  fileName: string | null;
  filePath: string | null;
  rejection: RejectionInfo | null;
}

interface AccSubmitResult {
  rejected: boolean;
  cycleCompleted: boolean;
  nextRole: string | null;
  emailWarning: string | null;
}

const ROLE_COLOR: Record<string, string> = {
  prepared: 'bg-blue-50 text-blue-700 border-blue-200',
  checked:  'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function Shell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className={`w-full transition-all ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>{children}</div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {children}
    </div>
  );
}

function LoadingState() {
  return (
    <Shell>
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Memuat data persetujuan...</p>
      </div>
    </Shell>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Shell>
      <Card>
        <div className="p-8 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-1.5">Link Tidak Valid</h1>
          <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
        </div>
      </Card>
    </Shell>
  );
}

export default function AccPage() {
  const params = useParams<{ token: string }>();
  const token  = params?.token ?? '';

  const [info,       setInfo]       = useState<AccInfo | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState('');
  const [submitError, setSubmitError] = useState('');
  const [result,     setResult]     = useState<AccSubmitResult | null>(null);
  const [showDocument, setShowDocument] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason,   setRejectReason]   = useState('');
  const [submittingAction, setSubmittingAction] = useState<'approve' | 'reject' | null>(null);

  // 🆕 State untuk fitur Bandingkan Dokumen (versi lama vs baru)
  const [versions, setVersions] = useState<Array<{ id: number; fileName: string; filePath: string; version: number; uploadedAt: string; isActive: boolean }>>([]);
  const [viewing,  setViewing]  = useState<'current' | 'previous'>('current');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    fetch(`/review-prosedur/api/acc/${encodeURIComponent(token)}`)
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Link tidak ditemukan atau tidak valid.');
        return data as AccInfo;
      })
      .then(data => { if (!cancelled) setInfo(data); })
      .catch(err => { if (!cancelled) setLoadError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [token]);

  // 🆕 Fetch riwayat versi file — dipakai untuk fitur Bandingkan Dokumen.
  // Butuh nomorDokumen, jadi baru jalan setelah `info` berhasil dimuat.
  useEffect(() => {
    if (!info?.nomorDokumen) return;
    let cancelled = false;

    fetch(`/review-prosedur/api/files/list?nomorDokumen=${encodeURIComponent(info.nomorDokumen)}`)
      .then(res => res.ok ? res.json() : { files: [] })
      .then(data => { if (!cancelled) setVersions(data.files || []); })
      .catch(() => { if (!cancelled) setVersions([]); });

    return () => { cancelled = true; };
  }, [info?.nomorDokumen]);

  const handleSubmit = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && rejectReason.trim().length < 5) {
      setSubmitError('Alasan penolakan wajib diisi (minimal 5 karakter).');
      return;
    }
    setSubmittingAction(action);
    setSubmitError('');
    try {
      const res = await fetch(`/review-prosedur/api/acc/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          action === 'reject'
            ? { action: 'reject', reason: rejectReason.trim() }
            : { action: 'approve' }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses permintaan.');

      if (action === 'reject') {
        setResult({ rejected: true, cycleCompleted: false, nextRole: null, emailWarning: null });
        setInfo(prev => prev ? {
          ...prev,
          accStatus: 'rejected',
          accAt: new Date().toISOString(),
          rejectReason: rejectReason.trim(),
        } : prev);
      } else {
        setResult({
          rejected: false,
          cycleCompleted: data.cycleCompleted,
          nextRole:       data.nextRole,
          emailWarning:   data.emailWarning,
        });
        setInfo(prev => prev ? { ...prev, accStatus: 'acc', accAt: new Date().toISOString() } : prev);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Gagal memproses permintaan. Silakan coba lagi.');
    } finally {
      setSubmittingAction(null);
    }
  };

  if (loading) return <LoadingState />;
  if (loadError || !info) return <ErrorState message={loadError || 'Data tidak ditemukan.'} />;

  const alreadyAcc = info.accStatus === 'acc';
  const cycleRejected = info.cycleStatus === 'rejected';
  const roleColorCls = ROLE_COLOR[info.role] ?? ROLE_COLOR.prepared;

  // 🆕 Bandingkan Dokumen: tampil selama cycle belum selesai (in_progress
  // atau rejected — keduanya masih "dalam proses revisi"), dan ada minimal
  // 2 versi file untuk dibandingkan.
  const currentFile  = versions.find(v => v.isActive) ?? versions[0] ?? null;
  const previousFile = versions.filter(v => v.id !== currentFile?.id).sort((a, b) => b.version - a.version)[0] ?? null;
  const canCompare = info.cycleStatus !== 'completed' && !!currentFile && !!previousFile;
  const displayFilePath = canCompare && viewing === 'previous' && previousFile ? previousFile.filePath : (currentFile?.filePath || info.filePath);
  const displayFileId   = canCompare && viewing === 'previous' && previousFile ? previousFile.id : (currentFile?.id ?? 0);
  // 🆕 Boleh mencoret/komentar selama belum ACC/tolak dan cycle belum berakhir
  // — sama seperti kondisi tombol Setujui/Tolak di bawah.
  const canAnnotate = !cycleRejected && !alreadyAcc && !result;

  return (
    <Shell wide={showDocument}>
      <Card>
        {/* Header */}
        <div className={`px-6 py-5 bg-gradient-to-r ${
          (result?.rejected || (cycleRejected && !result))
            ? 'from-red-600 to-red-700'
            : 'from-blue-700 to-blue-900'
        }`}>
          <p className="text-white/70 text-xs font-medium mb-1">Procedure Management System</p>
          <h1 className="text-white text-lg font-bold">Persetujuan Dokumen Prosedur</h1>
        </div>

        <div className="p-6 space-y-5">
          {/* Info dokumen */}
          <div>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border mb-3 ${roleColorCls}`}>
              Tahap: {info.roleLabel}
            </span>
            <h2 className="text-base font-bold text-slate-900 leading-snug">{info.namaDokumen}</h2>
            <p className="text-xs text-slate-500 font-mono mt-1">{info.nomorDokumen}</p>
          </div>

          {/* Info penerima */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500 mb-0.5">Menyetujui sebagai</p>
            <p className="text-sm font-semibold text-slate-800">
              {info.nama ? `${info.nama} · ` : ''}{info.email}
            </p>
          </div>

          {/* ── Lihat dokumen sebelum menyetujui ────────────────────────────── */}
          {info.filePath ? (
            <div>
              <button
                type="button"
                onClick={() => setShowDocument(prev => !prev)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5
                           border border-slate-300 hover:bg-slate-50 text-slate-700
                           text-sm font-semibold rounded-xl transition-all active:scale-[0.98]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showDocument ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  )}
                </svg>
                {showDocument ? 'Sembunyikan Dokumen' : 'Lihat Dokumen'}
              </button>

              {showDocument && (
                <div className="mt-3 space-y-2">
                  {canCompare && currentFile && previousFile && (
                    <VersionToggleBar
                      current={{ version: currentFile.version, uploadedAt: currentFile.uploadedAt }}
                      previous={{ version: previousFile.version, uploadedAt: previousFile.uploadedAt }}
                      viewing={viewing}
                      onChange={setViewing}
                    />
                  )}
                  <div className="border border-slate-200 rounded-xl overflow-auto bg-slate-100"
                       style={{ height: '65vh', minHeight: '420px' }}>
                    <AnnotatablePDFViewer
                      filePath={displayFilePath || ''}
                      fileId={displayFileId}
                      nomorDokumen={info.nomorDokumen}
                      canEdit={canAnnotate}
                      myRole={info.role}
                      myNama={info.nama}
                      accToken={token}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center">
              Dokumen belum tersedia untuk pratinjau.
            </p>
          )}

          {/* ── Baru saja submit di sesi ini: berhasil ACC atau berhasil Tolak ── */}
          {result && (
            result.rejected ? (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3.5">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-red-800">Dokumen Ditolak</p>
                  <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                    Penolakan Anda tercatat. Admin akan mendapat notifikasi beserta alasan
                    yang Anda berikan, dan perlu memperbaiki dokumen ini sebelum mengulang
                    proses approval dari awal.
                  </p>
                  {info.rejectReason && (
                    <p className="text-xs text-red-700 mt-2 bg-white/60 border border-red-200 rounded-lg px-3 py-2 italic">
                      &ldquo;{info.rejectReason}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3.5">
                <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Berhasil Disetujui</p>
                  <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                    {result.cycleCompleted
                      ? 'Semua tahap approval (Prepared, Checked, Approved) telah selesai. Dokumen kini berstatus Relevan.'
                      : `Terima kasih. Persetujuan Anda tercatat. Dokumen akan dilanjutkan ke tahap berikutnya begitu semua orang di tahap ${info.roleLabel} selesai menyetujui.`}
                  </p>
                  {result.emailWarning && (
                    <p className="text-xs text-amber-600 mt-2">{result.emailWarning}</p>
                  )}
                </div>
              </div>
            )
          )}

          {/* ── Sudah pernah diproses sebelumnya (buka link lagi), cycle DITOLAK ── */}
          {!result && cycleRejected && (
            info.accStatus === 'rejected' ? (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3.5">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-red-800">Anda Menolak Dokumen Ini</p>
                  <p className="text-xs text-red-700 mt-0.5">
                    {info.accAt ? `Pada ${formatDate(info.accAt)}.` : ''} Tidak ada tindakan lain yang diperlukan.
                  </p>
                  {info.rejectReason && (
                    <p className="text-xs text-red-700 mt-2 bg-white/60 border border-red-200 rounded-lg px-3 py-2 italic">
                      &ldquo;{info.rejectReason}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3.5">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-red-800">Dokumen Ini Telah Ditolak</p>
                  <p className="text-xs text-red-700 mt-0.5">
                    Ditolak oleh{' '}
                    <strong>{info.rejection?.nama || info.rejection?.email}</strong>
                    {' '}({info.rejection?.roleLabel})
                    {info.rejection?.rejectedAt ? ` pada ${formatDate(info.rejection.rejectedAt)}` : ''}.
                  </p>
                  {info.rejection?.reason && (
                    <p className="text-xs text-red-700 mt-2 bg-white/60 border border-red-200 rounded-lg px-3 py-2 italic">
                      &ldquo;{info.rejection.reason}&rdquo;
                    </p>
                  )}
                  <p className="text-xs text-red-600 mt-2">
                    Tidak ada tindakan lebih lanjut yang diperlukan dari Anda — admin perlu
                    memperbaiki dan mengunggah ulang dokumen ini untuk memulai proses baru.
                  </p>
                </div>
              </div>
            )
          )}

          {/* ── Sudah pernah ACC sebelumnya (buka link lagi), cycle belum ditolak ── */}
          {!result && !cycleRejected && alreadyAcc && (
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3.5">
              <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-emerald-800">Sudah Disetujui</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Anda sudah menyetujui dokumen ini
                  {info.accAt ? ` pada ${formatDate(info.accAt)}` : ''}. Tidak ada tindakan lain yang diperlukan.
                </p>
              </div>
            </div>
          )}

          {/* ── Belum ada aksi sama sekali, cycle masih berjalan → tombol ───── */}
          {!result && !cycleRejected && !alreadyAcc && (
            !showRejectForm ? (
              <>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Silakan periksa dokumen di atas, lalu tentukan tindakan Anda sebagai{' '}
                  <strong>{info.roleLabel}</strong>.
                </p>
                {submitError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {submitError}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSubmit('approve')}
                    disabled={submittingAction !== null}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
                  >
                    {submittingAction === 'approve' && (
                      <span className="animate-spin w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
                    )}
                    {submittingAction === 'approve' ? 'Memproses...' : 'Setujui Dokumen'}
                  </button>
                  <button
                    onClick={() => { setShowRejectForm(true); setSubmitError(''); }}
                    disabled={submittingAction !== null}
                    className="px-5 py-3 border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold rounded-xl transition-all active:scale-[0.98]"
                  >
                    Tolak Dokumen
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Alasan Penolakan <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Jelaskan alasan Anda menolak dokumen ini..."
                    rows={4}
                    disabled={submittingAction !== null}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900
                               placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400
                               focus:border-transparent transition-all resize-none disabled:opacity-60"
                  />
                </div>
                {submitError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {submitError}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowRejectForm(false); setRejectReason(''); setSubmitError(''); }}
                    disabled={submittingAction !== null}
                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 rounded-xl text-sm font-semibold transition-all"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => handleSubmit('reject')}
                    disabled={submittingAction !== null}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all active:scale-[0.98]"
                  >
                    {submittingAction === 'reject' && (
                      <span className="animate-spin w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
                    )}
                    {submittingAction === 'reject' ? 'Memproses...' : 'Kirim Penolakan'}
                  </button>
                </div>
              </div>
            )
          )}

          {/* 🆕 Diskusi dengan admin & approver lain.
              Sengaja DI LUAR semua kondisi di atas — chat tetap tersedia
              setelah Anda ACC, setelah dokumen maju ke tahap berikutnya,
              maupun setelah cycle ditolak/selesai. */}
          <DocumentChat
            accToken={token}
            myEmail={info.email}
            subtitle={info.namaDokumen}
          />
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 text-center">
            Link ini khusus untuk Anda dan hanya berlaku sekali.
          </p>
        </div>
      </Card>
    </Shell>
  );
}