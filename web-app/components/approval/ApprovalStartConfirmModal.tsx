// components/approval/ApprovalStartConfirmModal.tsx
'use client';

import React from 'react';
import {
  FileCheck2,
  Clock,
  Send,
  Sparkles,
  AlertCircle,
  X,
  FileText,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface ApprovalStartConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  nomorDokumen: string;
  namaDokumen: string;
  fileName?: string;
  previousStatus?: string;
  onConfirmNow: () => void;
  onConfirmLater: () => void;
  loading?: boolean;
}

export default function ApprovalStartConfirmModal({
  isOpen,
  onClose,
  nomorDokumen,
  namaDokumen,
  fileName,
  previousStatus = 'Revisi',
  onConfirmNow,
  onConfirmLater,
  loading = false,
}: ApprovalStartConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Decorative Top Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          title="Tutup konfirmasi"
        >
          <X size={18} />
        </button>

        <div className="p-6 sm:p-7 space-y-5">
          {/* Header Icon & Title */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
              <FileCheck2 size={24} />
            </div>
            <div className="min-w-0 pr-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Dokumen {previousStatus} Diupload Ulang
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                Konfirmasi Alur Approval
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih apakah dokumen revisi ini akan langsung masuk ke tahap approval sekarang atau nanti.
              </p>
            </div>
          </div>

          {/* Document Summary Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60 truncate">
                {nomorDokumen}
              </span>
              {fileName && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1 truncate max-w-[200px]" title={fileName}>
                  <FileText size={12} className="text-slate-400 flex-shrink-0" />
                  <span className="truncate">{fileName}</span>
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-slate-800 leading-snug truncate" title={namaDokumen}>
              {namaDokumen}
            </p>
          </div>

          {/* Opsi Pilihan (Card Interaktif) */}
          <div className="space-y-3">
            {/* Opsi 1: Mulai Sekarang */}
            <button
              type="button"
              onClick={onConfirmNow}
              disabled={loading}
              className="w-full text-left p-4 rounded-2xl border-2 border-blue-200 hover:border-blue-600 bg-gradient-to-r from-blue-50/60 to-indigo-50/30 hover:from-blue-50 hover:to-indigo-50 transition-all duration-150 group shadow-xs hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-500/30 group-hover:scale-105 transition-transform">
                  <Send size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold text-blue-950 group-hover:text-blue-700 transition-colors">
                      Masuk Approval Sekarang
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs flex-shrink-0">
                      Mulai Langsung
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Dokumen revisi langsung masuk ke tahap <strong>Prepared</strong>, dan sistem otomatis mengirimkan email notifikasi approval kepada PIC Prepared.
                  </p>
                </div>
                <ArrowRight size={16} className="text-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all self-center flex-shrink-0" />
              </div>
            </button>

            {/* Opsi 2: Nanti Saja (Perlu Approval) */}
            <button
              type="button"
              onClick={onConfirmLater}
              disabled={loading}
              className="w-full text-left p-4 rounded-2xl border-2 border-amber-200 hover:border-amber-500 bg-gradient-to-r from-amber-50/60 to-orange-50/30 hover:from-amber-50 hover:to-orange-50 transition-all duration-150 group shadow-xs hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-amber-500/30 group-hover:scale-105 transition-transform">
                  <Clock size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold text-amber-950 group-hover:text-amber-700 transition-colors">
                      Nanti Saja
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex-shrink-0">
                      Masuk "Perlu Approval"
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Dokumen revisi akan disimpan dan dimasukkan ke daftar <strong>"Perlu Approval"</strong> di halaman Approval Dokumen. Anda dapat mengatur approver terlebih dahulu sebelum memulai.
                  </p>
                </div>
                <ArrowRight size={16} className="text-amber-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all self-center flex-shrink-0" />
              </div>
            </button>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center justify-center gap-2 p-2 text-xs font-semibold text-blue-700 bg-blue-50 rounded-xl border border-blue-200">
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-700" />
              <span>Sedang mengunggah dokumen & memproses pilihan alur...</span>
            </div>
          )}

          {/* Cancel Action */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
