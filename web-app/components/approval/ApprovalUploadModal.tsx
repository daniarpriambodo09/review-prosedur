// components/approval/ApprovalUploadModal.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Search,
  Users,
  ShieldCheck,
  FileCheck2,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ApprovalDocumentItem } from './ApprovalTable';
import ApprovalStartConfirmModal from './ApprovalStartConfirmModal';

interface ApprovalUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ApprovalDocumentItem | null;
  onUploaded: (targetTab?: 'setting_approver' | 'in_progress') => void;
}

interface ProcedureOption {
  nomor_dokumen: string;
  nama_dokumen: string;
  status: string;
  revisi: string;
  level_dokumen?: string;
}

interface ApproverSummary {
  prepared: Array<{ id: number; nama: string; email: string }>;
  checked: Array<{ id: number; nama: string; email: string }>;
  approved: Array<{ id: number; nama: string; email: string }>;
}

export default function ApprovalUploadModal({
  isOpen,
  onClose,
  document: propDoc,
  onUploaded,
}: ApprovalUploadModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dokumen terpilih
  const [selectedDoc, setSelectedDoc] = useState<ProcedureOption | null>(null);

  // List dokumen untuk dropdown (jika dibuka tanpa propDoc)
  const [availableProcedures, setAvailableProcedures] = useState<ProcedureOption[]>([]);
  const [loadingProcedures, setLoadingProcedures] = useState(false);
  const [procedureSearch, setProcedureSearch] = useState('');

  // Info Approver dokumen terpilih
  const [approvers, setApprovers] = useState<ApproverSummary | null>(null);
  const [loadingApprovers, setLoadingApprovers] = useState(false);

  // File yang dipilih
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Status proses upload
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pop-up Card Konfirmasi Alur Approval Dokumen Revisi
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Inisialisasi modal saat terbuka
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setErrorMsg(null);
      setSuccessMsg(null);
      setApprovers(null);
      setSelectedDoc(null);
      setProcedureSearch('');
      return;
    }

    if (propDoc) {
      setSelectedDoc({
        nomor_dokumen: propDoc.nomorDokumen,
        nama_dokumen: propDoc.namaDokumen,
        status: propDoc.documentStatus,
        revisi: propDoc.revisi,
        level_dokumen: propDoc.levelDokumen,
      });
    } else {
      // Ambil daftar seluruh prosedur jika dibuka dari tombol header utama
      loadProcedures();
    }
  }, [isOpen, propDoc]);

  // Load daftar prosedur dari API
  const loadProcedures = async () => {
    try {
      setLoadingProcedures(true);
      const res = await fetch('/review-prosedur/api/procedures');
      if (res.ok) {
        const data = await res.json();
        const list: ProcedureOption[] = (Array.isArray(data) ? data : data.procedures || []).map((p: any) => ({
          nomor_dokumen: p.nomor_dokumen || p.nomorDokumen,
          nama_dokumen: p.nama_dokumen || p.namaDokumen,
          status: p.status,
          revisi: p.revisi,
          level_dokumen: p.level_dokumen || p.levelDokumen,
        }));
        // Prioritaskan dokumen berstatus Revisi atau Ditolak di urutan atas
        list.sort((a, b) => {
          const aPriority = a.status === 'Revisi' || a.status === 'Ditolak' ? 0 : 1;
          const bPriority = b.status === 'Revisi' || b.status === 'Ditolak' ? 0 : 1;
          if (aPriority !== bPriority) return aPriority - bPriority;
          return a.nomor_dokumen.localeCompare(b.nomor_dokumen);
        });
        setAvailableProcedures(list);
      }
    } catch (err) {
      console.error('Gagal mengambil daftar prosedur:', err);
    } finally {
      setLoadingProcedures(false);
    }
  };

  // Ambil daftar approver dokumen yang sedang dipilih
  useEffect(() => {
    if (!selectedDoc?.nomor_dokumen) {
      setApprovers(null);
      return;
    }

    const fetchApprovers = async () => {
      try {
        setLoadingApprovers(true);
        const res = await fetch(
          `/review-prosedur/api/procedures/${encodeURIComponent(selectedDoc.nomor_dokumen)}/approvers`
        );
        if (res.ok) {
          const data = await res.json();
          setApprovers({
            prepared: data.prepared || [],
            checked: data.checked || [],
            approved: data.approved || [],
          });
        }
      } catch (err) {
        console.error('Gagal memuat approver dokumen:', err);
      } finally {
        setLoadingApprovers(false);
      }
    };

    fetchApprovers();
  }, [selectedDoc]);

  // Handle seleksi file PDF
  const handleFileChange = (file: File | null) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Hanya file berekstensi PDF (.pdf) yang diperbolehkan.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Ukuran file maksimal adalah 10 MB.');
      return;
    }

    setSelectedFile(file);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  };

  const isRevisiDoc =
    selectedDoc?.status === 'Revisi' ||
    selectedDoc?.status === 'Ditolak' ||
    (typeof selectedDoc?.status === 'string' && selectedDoc.status.startsWith('Menunggu ACC'));

  // Eksekusi upload file dengan pilihan mulai approval sekarang vs nanti
  const executeUpload = async (startNow: boolean) => {
    if (!selectedDoc) {
      setErrorMsg('Silakan pilih dokumen terlebih dahulu.');
      return;
    }

    if (!selectedFile) {
      setErrorMsg('Silakan pilih file PDF yang akan diunggah.');
      return;
    }

    if (startNow) {
      const preparedCount = approvers?.prepared?.length || 0;
      if (preparedCount === 0) {
        setErrorMsg(
          'Dokumen ini belum memiliki approver Prepared terdaftar. Silakan atur approver dokumen terlebih dahulu atau pilih opsi "Nanti Saja" agar dokumen masuk ke daftar "Perlu Approval".'
        );
        setShowConfirmModal(false);
        return;
      }
    }

    try {
      setUploading(true);
      setErrorMsg(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('nomorDokumen', selectedDoc.nomor_dokumen);
      formData.append('uploadedBy', user?.username || 'admin');
      formData.append('startApproval', startNow ? 'true' : 'false');

      const response = await fetch('/review-prosedur/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal mengupload dokumen.');
      }

      setShowConfirmModal(false);

      if (startNow) {
        setSuccessMsg(
          'Dokumen berhasil diunggah! Alur approval tahap Prepared telah resmi dimulai dan notifikasi email telah dikirimkan ke Approver.'
        );
      } else {
        setSuccessMsg(
          'Dokumen revisi berhasil diunggah dan disimpan ke daftar "Perlu Approval". Anda dapat mengatur approver dan memulai alur persetujuan kapan saja.'
        );
      }

      // Notifikasi ke parent dengan target tab & tutup setelah 1.5 detik
      setTimeout(() => {
        onUploaded(startNow ? 'in_progress' : 'setting_approver');
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error saat upload dokumen approval:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat mengunggah dokumen.');
    } finally {
      setUploading(false);
    }
  };

  // Submit Upload & Mulai Alur Approval
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) {
      setErrorMsg('Silakan pilih dokumen terlebih dahulu.');
      return;
    }

    if (!selectedFile) {
      setErrorMsg('Silakan pilih file PDF yang akan diunggah.');
      return;
    }

    // Jika dokumen berstatus revisi atau ditolak, tampilkan pop-up card konfirmasi
    if (isRevisiDoc) {
      setErrorMsg(null);
      setShowConfirmModal(true);
      return;
    }

    // Untuk dokumen selain revisi (normal), cek ketersediaan approver prepared
    const preparedCount = approvers?.prepared?.length || 0;
    if (preparedCount === 0) {
      setErrorMsg(
        'Dokumen ini belum memiliki approver Prepared terdaftar. Silakan atur approver dokumen terlebih dahulu sebelum memulai alur approval.'
      );
      return;
    }

    await executeUpload(true);
  };

  if (!isOpen) return null;

  // Filter daftar prosedur saat mode pilih manual
  const filteredProcedures = availableProcedures.filter(
    p =>
      p.nomor_dokumen.toLowerCase().includes(procedureSearch.toLowerCase()) ||
      p.nama_dokumen.toLowerCase().includes(procedureSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                {propDoc ? 'Upload Ulang Dokumen Approval' : 'Upload Dokumen & Mulai Approval'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Unggah dokumen PDF revisi untuk memulai alur persetujuan berjenjang (Prepared → Checked → Approved).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Alert Error / Success */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle size={16} className="text-rose-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 font-semibold">{successMsg}</div>
            </div>
          )}

          {/* Section 1: Informasi Dokumen */}
          {propDoc || selectedDoc ? (
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Dokumen Yang Diproses
                </span>
                {!propDoc && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDoc(null);
                      setApprovers(null);
                    }}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Ganti Dokumen
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {selectedDoc?.nama_dokumen}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-lg border border-blue-200">
                      {selectedDoc?.nomor_dokumen}
                    </span>
                    {selectedDoc?.revisi && (
                      <span className="text-xs text-slate-500 font-medium">
                        Rev: <strong className="text-slate-700">{selectedDoc.revisi}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      selectedDoc?.status === 'Revisi'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : selectedDoc?.status === 'Ditolak'
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {selectedDoc?.status || 'Siap Approval'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Selector jika dibuka tanpa dokumen terpilih */
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck2 size={14} className="text-blue-600" />
                <span>Pilih Dokumen Prosedur</span>
              </label>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={procedureSearch}
                  onChange={e => setProcedureSearch(e.target.value)}
                  placeholder="Ketik nomor atau nama dokumen yang ingin diapprove..."
                  className="w-full text-xs pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {loadingProcedures ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto mb-1.5" />
                  Memuat daftar prosedur...
                </div>
              ) : (
                <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {filteredProcedures.slice(0, 8).map(proc => (
                    <button
                      key={proc.nomor_dokumen}
                      type="button"
                      onClick={() => setSelectedDoc(proc)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/70 transition-colors flex items-center justify-between group"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate">
                          {proc.nama_dokumen}
                        </p>
                        <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                          {proc.nomor_dokumen}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${
                          proc.status === 'Revisi'
                            ? 'bg-amber-100 text-amber-800'
                            : proc.status === 'Ditolak'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {proc.status}
                      </span>
                    </button>
                  ))}
                  {filteredProcedures.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Tidak ada dokumen prosedur yang cocok dengan pencarian
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Approver Check (Prepared, Checked, Approved) */}
          {selectedDoc && (
            <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <Users size={13} className="text-blue-600" />
                  <span>Daftar Approver Terdaftar</span>
                </span>
                {loadingApprovers && (
                  <span className="text-[10px] text-blue-600 animate-pulse">Memuat approver...</span>
                )}
              </div>

              {approvers ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Prepared */}
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                    <p className="text-[10px] font-bold uppercase text-blue-700">1. Prepared</p>
                    {approvers.prepared.length > 0 ? (
                      <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate" title={approvers.prepared[0].nama || approvers.prepared[0].email}>
                        {approvers.prepared[0].nama || approvers.prepared[0].email}
                      </p>
                    ) : (
                      <p className="text-xs text-rose-600 font-bold mt-0.5 flex items-center gap-1">
                        <AlertTriangle size={12} /> Belum diatur
                      </p>
                    )}
                  </div>

                  {/* Checked */}
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                    <p className="text-[10px] font-bold uppercase text-amber-700">2. Checked</p>
                    {approvers.checked.length > 0 ? (
                      <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate" title={approvers.checked[0].nama || approvers.checked[0].email}>
                        {approvers.checked[0].nama || approvers.checked[0].email}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-0.5 italic">Belum diatur</p>
                    )}
                  </div>

                  {/* Approved */}
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                    <p className="text-[10px] font-bold uppercase text-emerald-700">3. Approved</p>
                    {approvers.approved.length > 0 ? (
                      <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate" title={approvers.approved[0].nama || approvers.approved[0].email}>
                        {approvers.approved[0].nama || approvers.approved[0].email}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-0.5 italic">Belum diatur</p>
                    )}
                  </div>
                </div>
              ) : null}

              {approvers && approvers.prepared.length === 0 && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700 font-medium flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-rose-600 flex-shrink-0" />
                  <span>
                    Dokumen ini belum memiliki approver Prepared. Harap tambahkan approver terlebih dahulu melalui tombol Edit pada tabel.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Section 3: File Dropzone */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Upload size={14} className="text-blue-600" />
              <span>File Dokumen PDF</span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={e => handleFileChange(e.target.files?.[0] || null)}
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all duration-150
                  flex flex-col items-center justify-center gap-2 group
                  ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/70'
                      : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/80'
                  }
                `}
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Klik untuk memilih file PDF atau drag & drop ke sini
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Hanya format PDF (.pdf), ukuran maksimal 10 MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  disabled={uploading}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Hapus file"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Info Banner Alur */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 leading-relaxed">
              {isRevisiDoc ? (
                <span>
                  Dokumen ini berstatus <strong>{selectedDoc?.status}</strong>. Saat mengklik tombol upload, Anda dapat memilih apakah ingin <strong>langsung memulai alur approval sekarang</strong> atau <strong>nanti saja</strong> (dokumen akan disimpan ke tab <strong>Perlu Approval</strong>).
                </span>
              ) : (
                <span>
                  Setelah dokumen diunggah, dokumen akan otomatis berstatus <strong>Menunggu ACC Prepared</strong>.
                  Sistem akan mengirimkan email notifikasi approval ke approver Prepared secara otomatis.
                </span>
              )}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white hover:text-slate-800 transition-colors disabled:opacity-50"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              uploading ||
              !selectedDoc ||
              !selectedFile ||
              (!isRevisiDoc && (approvers?.prepared?.length || 0) === 0)
            }
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Memproses Dokumen...</span>
              </>
            ) : (
              <>
                <Upload size={14} />
                <span>
                  {isRevisiDoc ? 'Upload Dokumen Revisi' : 'Upload & Mulai Approval'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pop-up Card Konfirmasi Alur Approval Dokumen Revisi */}
      {selectedDoc && (
        <ApprovalStartConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          nomorDokumen={selectedDoc.nomor_dokumen}
          namaDokumen={selectedDoc.nama_dokumen}
          fileName={selectedFile?.name}
          previousStatus={selectedDoc.status || 'Revisi'}
          onConfirmNow={() => executeUpload(true)}
          onConfirmLater={() => executeUpload(false)}
          loading={uploading}
        />
      )}
    </div>
  );
}
