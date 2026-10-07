// components/approval/RejectionDetailModal.tsx
'use client';

import React from 'react';
import {
  X,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Mail,
  FileText,
  Upload,
  ArrowRight,
} from 'lucide-react';
import { ApprovalDocumentItem } from './ApprovalTable';

interface RejectionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ApprovalDocumentItem | null;
  onOpenUpload?: (doc: ApprovalDocumentItem) => void;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';
  } catch {
    return dateStr;
  }
}

export default function RejectionDetailModal({
  isOpen,
  onClose,
  document,
  onOpenUpload,
}: RejectionDetailModalProps) {
  if (!isOpen || !document) return null;

  const rejection = document.rejection;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-rose-50 via-red-50 to-white border-b border-rose-100 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100/80 border border-rose-200 flex items-center justify-center text-rose-600 flex-shrink-0 shadow-2xs">
              <XCircle size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-[10px] tracking-wider uppercase">
                  Ditolak
                </span>
                <span className="font-mono text-xs font-bold text-slate-500">
                  {document.nomorDokumen}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 leading-tight mt-0.5">
                Keterangan Alasan Penolakan
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Modal */}
        <div className="p-6 overflow-y-auto space-y-4.5 text-xs text-slate-600">
          {/* Info Dokumen */}
          <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Dokumen Terkait
            </span>
            <p className="text-sm font-semibold text-slate-900 leading-snug">
              {document.namaDokumen}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-500">
              <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-semibold text-slate-700">
                Rev: {document.revisi || '0'}
              </span>
              <span>•</span>
              <span>Owner: <strong className="text-slate-700">{document.owner || '-'}</strong></span>
              <span>•</span>
              <span>PIC: <strong className="text-slate-700">{document.pic || '-'}</strong></span>
            </div>
          </div>

          {/* Detail Penolakan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tahap & Approver */}
            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Tahap Penolakan
              </span>
              <div className="flex items-center gap-1.5 font-bold text-rose-700 text-xs">
                <AlertTriangle size={14} className="text-rose-500" />
                <span>Tahap {rejection?.roleLabel || document.currentStage || 'Approval'}</span>
              </div>
            </div>

            {/* Waktu Penolakan */}
            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Waktu Penolakan
              </span>
              <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs">
                <Clock size={13} className="text-slate-400" />
                <span>{formatDate(rejection?.rejectedAt)}</span>
              </div>
            </div>
          </div>

          {/* Ditolak Oleh */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Ditolak Oleh (Approver)
            </span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                <User size={14} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-800 text-xs truncate">
                  {rejection?.nama || rejection?.email || 'Approver Dokumen'}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Mail size={11} className="text-slate-400 flex-shrink-0" />
                  <span className="truncate">{rejection?.email || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Kotak Catatan / Alasan Penolakan */}
          <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200/90 shadow-2xs">
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <XCircle size={13} className="text-rose-600" />
              Alasan / Catatan Penolakan
            </span>
            <div className="bg-white/90 p-3.5 rounded-lg border border-rose-200 text-slate-800 text-xs leading-relaxed whitespace-pre-wrap font-medium">
              {rejection?.reason ? (
                `“${rejection.reason}”`
              ) : (
                <span className="text-slate-400 italic">
                  Tidak ada catatan alasan khusus yang disertakan oleh approver.
                </span>
              )}
            </div>
          </div>

          {/* Petunjuk Tindak Lanjut */}
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/70 text-[11px] text-blue-800 leading-normal flex items-start gap-2">
            <FileText size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <p>
              Silakan lakukan perbaikan pada isi dokumen sesuai catatan di atas, kemudian unggah kembali dokumen revisi melalui tombol <strong>Upload Dokumen</strong> untuk memulai alur approval baru.
            </p>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Tutup
          </button>

          {onOpenUpload && (
            <button
              onClick={() => {
                onClose();
                onOpenUpload(document);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/25 active:scale-95"
            >
              <Upload size={14} />
              <span>Upload Dokumen Revisi</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
