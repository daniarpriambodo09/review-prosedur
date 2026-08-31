// components/documents/DocumentModal.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import AnnotatablePDFViewer from './AnnotatablePDFViewer';
import FileUploader from './FileUploader';
import VersionToggleBar, { type VersionOption } from './VersionToggleBar';
import { markReviewAsSeen } from '@/data/procedures/all-procedures';
import { isInRevisionWorkflow } from '@/lib/revisionStatuses';

interface FileInfo {
  id: number;
  nomorDokumen: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  version: number;
  uploadedBy: string;
  uploadedAt: string;
  isActive?: boolean;
}

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  nomorDokumen: string;
  namaDokumen: string;
  /** Jika true, tombol "Upload Versi Baru" disembunyikan (untuk halaman PIC) */
  hideUpload?: boolean;
  /**
   * Jika true, modal ini dibuka dari halaman admin dan perlu menandai
   * review sebagai sudah dilihat (review_seen_at = NOW()).
   * Default: false — halaman PIC tidak perlu menandai.
   */
  markSeenOnOpen?: boolean;
  /**
   * Callback opsional setelah review berhasil ditandai sudah dilihat.
   * Gunakan ini untuk refresh state di parent component
   * (misalnya update badge di tabel tanpa full reload).
   */
  onReviewSeen?: (nomorDokumen: string) => void;
  /**
   * 🆕 Status dokumen SAAT INI (mis. 'Revisi', 'Menunggu ACC Prepared',
   * 'Relevan'). Dipakai untuk menentukan apakah fitur "Bandingkan Dokumen"
   * (lihat versi lama vs baru) perlu ditampilkan — hanya muncul selama
   * dokumen ada di salah satu status siklus revisi/approval, hilang lagi
   * begitu sudah 'Relevan'. Opsional — kalau tidak diisi, fitur bandingkan
   * tidak pernah tampil (perilaku lama, tetap aman untuk caller yang belum
   * diupdate).
   */
  documentStatus?: string;
  /**
   * 🆕 Identitas PIC yang sedang login — WAJIB diisi kalau modal ini dibuka
   * dari halaman PIC (hideUpload=true) supaya fitur coret/kotak-teks bisa
   * dipakai (butuh email untuk disimpan sebagai pembuat anotasi). Kalau
   * tidak diisi di konteks PIC, fitur anotasi tetap tersembunyi (aman).
   * Di konteks admin (hideUpload=false), prop ini diabaikan — admin selalu
   * dapat mode lihat-saja + toggle bersih/coretan.
   */
  annotatorIdentity?: { nama: string | null; email: string };
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

export default function DocumentModal({
  isOpen,
  onClose,
  nomorDokumen,
  namaDokumen,
  hideUpload    = false,
  markSeenOnOpen = false,
  onReviewSeen,
  documentStatus,
  annotatorIdentity,
}: DocumentModalProps) {
  const [fileInfo,     setFileInfo]     = useState<FileInfo | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [blobUrl,      setBlobUrl]      = useState<string | null>(null);
  const blobRef = useRef<string | null>(null);

  // 🆕 State untuk fitur Bandingkan Dokumen (versi lama vs baru)
  const [versions,           setVersions]           = useState<FileInfo[]>([]);
  const [viewing,            setViewing]            = useState<'current' | 'previous'>('current');
  const [localStatusOverride, setLocalStatusOverride] = useState<string | null>(null);

  // ── Fetch metadata file aktif ─────────────────────────────────────────────
  const fetchFileInfo = useCallback(async () => {
    if (!nomorDokumen) return;
    try {
      setLoading(true);
      const res = await fetch(
        `/review-prosedur/api/files/get?nomorDokumen=${encodeURIComponent(nomorDokumen)}`
      );
      if (!res.ok) throw new Error('Gagal mengambil metadata');
      const data = await res.json();
      setFileInfo(data.file || null);
    } catch (err) {
      console.error('DocumentModal: gagal fetch metadata', err);
      setFileInfo(null);
    } finally {
      setLoading(false);
    }
  }, [nomorDokumen]);

  // 🆕 Fetch seluruh riwayat versi (untuk fitur Bandingkan Dokumen)
  const fetchVersions = useCallback(async () => {
    if (!nomorDokumen) return;
    try {
      const res = await fetch(
        `/review-prosedur/api/files/list?nomorDokumen=${encodeURIComponent(nomorDokumen)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setVersions(data.files || []);
    } catch (err) {
      console.error('DocumentModal: gagal fetch riwayat versi', err);
      setVersions([]);
    }
  }, [nomorDokumen]);

  // ── Buat blob URL untuk tombol Download PDF ───────────────────────────────
  const fetchBlobForDownload = useCallback(async (filePath: string) => {
    try {
      const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
      const res = await fetch(
        `/review-prosedur/api/files/serve?path=${encodeURIComponent(cleanPath)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      blobRef.current = url;
      setBlobUrl(url);
    } catch (err) {
      console.error('DocumentModal: gagal fetch blob untuk download', err);
    }
  }, []);

  // ── Effect saat modal dibuka ──────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && nomorDokumen) {
      setShowUploader(false);
      setBlobUrl(null);
      setViewing('current');
      setLocalStatusOverride(null);
      fetchFileInfo();
      fetchVersions();

      if (markSeenOnOpen) {
        markReviewAsSeen(nomorDokumen).then(() => {
          onReviewSeen?.(nomorDokumen);
        });
      }
    }

    return () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
        setBlobUrl(null);
      }
    };
  }, [isOpen, nomorDokumen, fetchFileInfo, fetchVersions, markSeenOnOpen, onReviewSeen]);

  // 🆕 Hitung versi "sebelumnya" (versi tertinggi yang BUKAN versi aktif)
  const previousVersion = versions
    .filter(v => v.id !== fileInfo?.id)
    .sort((a, b) => b.version - a.version)[0] ?? null;

  const effectiveStatus = localStatusOverride ?? documentStatus;
  const canCompare = isInRevisionWorkflow(effectiveStatus) && !!fileInfo && !!previousVersion;

  // File yang sedang ditampilkan di viewer (current = fileInfo aktif, previous = versi lama)
  const displayFile: FileInfo | null =
    canCompare && viewing === 'previous' && previousVersion ? previousVersion : fileInfo;

  // ── Siapkan blob URL untuk tombol download, ikut berubah saat toggle ──────
  useEffect(() => {
    if (displayFile?.filePath) {
      fetchBlobForDownload(displayFile.filePath);
    }
  }, [displayFile?.filePath, fetchBlobForDownload]);

  // ── Tutup dengan Escape ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleDownload = () => {
    if (!blobUrl || !displayFile) return;
    const a      = document.createElement('a');
    a.href       = blobUrl;
    a.download   = displayFile.fileName || `${nomorDokumen}.pdf`;
    a.click();
  };

  const handleUploadSuccess = (status?: string) => {
    setShowUploader(false);
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
      setBlobUrl(null);
    }
    // 🆕 Simpan status terbaru hasil upload secara lokal, supaya fitur
    // Bandingkan Dokumen langsung akurat tanpa perlu tutup-buka modal.
    if (status) setLocalStatusOverride(status);
    setViewing('current');
    fetchFileInfo();
    fetchVersions();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
        style={{ maxWidth: '960px', height: '90vh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 py-4 bg-gradient-to-r from-blue-50 to-slate-50 border-b border-slate-200 flex-shrink-0">
          <div className="min-w-0 flex-1 pr-4">
            <h2 className="text-lg font-bold text-slate-900 truncate">{namaDokumen}</h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-slate-500">
                Nomor Dokumen:{' '}
                <span className="font-mono font-semibold text-slate-700">{nomorDokumen}</span>
              </span>
              {displayFile && (
                <>
                  {displayFile.version > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      Versi {displayFile.version}
                    </span>
                  )}
                  {displayFile.fileSize > 0 && (
                    <span className="text-xs text-slate-500">{formatFileSize(displayFile.fileSize)}</span>
                  )}
                  {displayFile.uploadedAt && (
                    <span className="text-xs text-slate-500">
                      Uploaded {formatDate(displayFile.uploadedAt)}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all"
            title="Tutup"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 🆕 Toggle Bandingkan Dokumen — hanya muncul selama status masih
            dalam siklus revisi/approval DAN ada versi sebelumnya untuk
            dibandingkan. */}
        {canCompare && fileInfo && previousVersion && !showUploader && (
          <div className="px-6 py-2.5 border-b border-slate-100 bg-amber-50/50 flex-shrink-0">
            <VersionToggleBar
              current={{ version: fileInfo.version, uploadedAt: fileInfo.uploadedAt }}
              previous={{ version: previousVersion.version, uploadedAt: previousVersion.uploadedAt }}
              viewing={viewing}
              onChange={setViewing}
            />
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 overflow-hidden bg-slate-100 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-slate-500 text-sm">Memuat dokumen...</p>
              </div>
            </div>
          )}

          {!loading && !displayFile && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 bg-slate-50">
              <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-slate-700 font-medium mb-1">Belum ada dokumen</p>
                <p className="text-slate-500 text-sm">File PDF belum diunggah untuk prosedur ini</p>
              </div>
            </div>
          )}

          {!loading && displayFile && !showUploader && (
            <AnnotatablePDFViewer
              filePath={displayFile.filePath}
              fileId={displayFile.id}
              nomorDokumen={nomorDokumen}
              canEdit={hideUpload === true && !!annotatorIdentity}
              myRole={hideUpload === true ? 'pic' : undefined}
              myNama={annotatorIdentity?.nama}
              myEmail={annotatorIdentity?.email}
              showCleanToggle={hideUpload !== true}
            />
          )}

          {showUploader && (
            <div className="absolute inset-0 overflow-y-auto bg-white p-6">
              <FileUploader
                nomorDokumen={nomorDokumen}
                onSuccess={handleUploadSuccess}
                onCancel={() => setShowUploader(false)}
              />
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <p className="text-xs text-slate-500">
            {loading
              ? 'Memuat...'
              : displayFile
              ? (canCompare && viewing === 'previous' ? 'Menampilkan dokumen versi lama' : 'Dokumen tersedia untuk diunduh')
              : 'Belum ada dokumen yang diupload'}
          </p>
          <div className="flex gap-3">
            {displayFile && blobUrl && !showUploader && (
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PDF
              </button>
            )}

            {!hideUpload && !showUploader && (
              <button
                onClick={() => setShowUploader(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4-4m4 4V4" />
                </svg>
                Upload Versi Baru
              </button>
            )}

            {showUploader && (
              <button
                onClick={() => setShowUploader(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold transition-all"
              >
                ← Kembali ke PDF
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}