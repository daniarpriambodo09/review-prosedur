// components/documents/DocumentModal.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import PDFViewer from './PDFViewer';
import FileUploader from './FileUploader';

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
}

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  nomorDokumen: string;
  namaDokumen: string;
  /** Jika true, tombol "Upload Versi Baru" disembunyikan (untuk halaman PIC) */
  hideUpload?: boolean;
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
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch { return iso; }
}

export default function DocumentModal({
  isOpen,
  onClose,
  nomorDokumen,
  namaDokumen,
  hideUpload = false,
}: DocumentModalProps) {
  const [fileInfo,      setFileInfo]      = useState<FileInfo | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [showUploader,  setShowUploader]  = useState(false);
  const [blobUrl,       setBlobUrl]       = useState<string | null>(null);
  const blobRef = useRef<string | null>(null);

  // Fetch metadata file
  const fetchFileInfo = useCallback(async () => {
    if (!nomorDokumen) return;
    try {
      setLoading(true);
      const res = await fetch(`/review-prosedur/api/files/get?nomorDokumen=${encodeURIComponent(nomorDokumen)}`);
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

  // Buat blob URL untuk download (tombol Download PDF)
  // PDFViewer sudah membuat blob URL-nya sendiri untuk tampilan,
  // tapi kita butuh blob URL terpisah untuk tombol download.
  const fetchBlobForDownload = useCallback(async (filePath: string) => {
    try {
      const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
      const res = await fetch(`/review-prosedur/api/files/serve?path=${encodeURIComponent(cleanPath)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      // Revoke yang lama kalau ada
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      blobRef.current = url;
      setBlobUrl(url);
    } catch (err) {
      console.error('DocumentModal: gagal fetch blob untuk download', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen && nomorDokumen) {
      setShowUploader(false);
      setBlobUrl(null);
      fetchFileInfo();
    }
    // Cleanup blob URL saat modal ditutup
    return () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
        setBlobUrl(null);
      }
    };
  }, [isOpen, nomorDokumen, fetchFileInfo]);

  // Setelah fileInfo tersedia, siapkan blob URL untuk tombol download
  useEffect(() => {
    if (fileInfo?.filePath) {
      fetchBlobForDownload(fileInfo.filePath);
    }
  }, [fileInfo, fetchBlobForDownload]);

  // Tutup dengan Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleDownload = () => {
    if (!blobUrl || !fileInfo) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileInfo.fileName || `${nomorDokumen}.pdf`;
    a.click();
  };

  const handleUploadSuccess = () => {
    setShowUploader(false);
    // Revoke blob lama
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
      setBlobUrl(null);
    }
    fetchFileInfo();
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
              {fileInfo && (
                <>
                  {fileInfo.version > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      Versi {fileInfo.version}
                    </span>
                  )}
                  {fileInfo.fileSize > 0 && (
                    <span className="text-xs text-slate-500">{formatFileSize(fileInfo.fileSize)}</span>
                  )}
                  {fileInfo.uploadedAt && (
                    <span className="text-xs text-slate-500">
                      Uploaded {formatDate(fileInfo.uploadedAt)}
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

          {!loading && !fileInfo && (
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

          {!loading && fileInfo && !showUploader && (
            /* PDFViewer membuat blob URL-nya sendiri secara internal */
            <PDFViewer
              filePath={fileInfo.filePath}
              fileName={fileInfo.fileName}
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
              : fileInfo
              ? 'Dokumen tersedia untuk diunduh'
              : 'Belum ada dokumen yang diupload'}
          </p>
          <div className="flex gap-3">
            {/* Tombol download menggunakan blob URL — IDM tidak bisa mengintersep */}
            {fileInfo && blobUrl && !showUploader && (
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