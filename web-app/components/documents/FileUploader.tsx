// components/documents/FileUploader.tsx

'use client';
import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface FileUploaderProps {
  nomorDokumen: string;
  /**
   * 🆕 onSuccess sekarang membawa `status` terbaru dokumen hasil response
   * upload API (mis. 'Relevan' atau 'Menunggu ACC Prepared'), supaya parent
   * (DocumentModal) bisa langsung tahu status terbaru tanpa perlu tutup-buka
   * modal lagi — dipakai untuk menentukan apakah fitur "Bandingkan Dokumen"
   * harus tetap tampil setelah upload.
   */
  onSuccess: (status?: string) => void;
  onCancel: () => void;
}

export default function FileUploader({
  nomorDokumen,
  onSuccess,
  onCancel,
}: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Hanya file PDF yang diperbolehkan');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Ukuran file maksimal 10MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError('');

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('nomorDokumen', nomorDokumen);
      formData.append('uploadedBy', user?.username || 'admin');

      const response = await fetch('/review-prosedur/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload gagal');
      }

      // 🆕 Teruskan status terbaru dari response ke parent
      onSuccess(data.status);
    } catch (err: any) {
      setError(err.message || 'Gagal mengupload file');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all active:scale-95"
          >
            Pilih File PDF
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-all"
          >
            Batal
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-slate-400 hover:text-red-600 transition-colors"
                disabled={uploading}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <button
            onClick={onCancel}
            disabled={uploading}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          >
            Batal
          </button>
        </div>
      )}
      {error && (
        <p className="text-red-600 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}