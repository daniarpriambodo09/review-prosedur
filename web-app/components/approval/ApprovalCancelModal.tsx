// components/approval/ApprovalCancelModal.tsx
'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, XCircle, RotateCcw, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { ApprovalDocumentItem } from './ApprovalTable';

interface ApprovalCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ApprovalDocumentItem | null;
  onSuccess: () => void;
}

export default function ApprovalCancelModal({
  isOpen,
  onClose,
  document: doc,
  onSuccess,
}: ApprovalCancelModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !doc) return null;

  const currentStageLabel =
    doc.documentStatus === 'Menunggu Setting Approver' || doc.cycleStatus === 'setting_approver'
      ? 'Perlu Approval (Setting Approver)'
      : doc.currentStage
      ? doc.currentStage.charAt(0).toUpperCase() + doc.currentStage.slice(1)
      : doc.documentStatus;

  const handleConfirmCancel = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const params = new URLSearchParams();
      if (doc.cycleId) {
        params.set('cycleId', String(doc.cycleId));
      }
      params.set('nomorDokumen', doc.nomorDokumen);

      const res = await fetch(`/review-prosedur/api/approval-dokumen?${params.toString()}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal membatalkan alur approval.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error cancelling approval:', err);
      setError(err?.message || 'Terjadi kesalahan saat membatalkan approval.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-rose-50/80 via-white to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100/80 text-rose-600 border border-rose-200 shadow-2xs">
              <XCircle size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Batalkan Tahap Approval
              </h2>
              <p className="text-[11px] text-slate-500">
                Konfirmasi pembatalan persetujuan dokumen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            title="Tutup modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Kartu Detail Dokumen */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Nomor Dokumen</span>
              <span className="font-mono font-bold text-slate-900 px-2 py-0.5 rounded-md bg-white border border-slate-200 shadow-2xs">
                {doc.nomorDokumen}
              </span>
            </div>

            <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-200/60">
              <span className="text-slate-500 font-medium shrink-0">Nama Dokumen</span>
              <span className="font-semibold text-slate-800 text-right line-clamp-2">
                {doc.namaDokumen}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
              <span className="text-slate-500 font-medium">Nomor Revisi</span>
              <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded-md text-[11px]">
                Rev. {doc.revisi || '0'}
                <span className="text-emerald-700 font-bold text-[10px]">(Tetap)</span>
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
              <span className="text-slate-500 font-medium">Tahap Berjalan</span>
              <span className="font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md text-[11px]">
                {currentStageLabel}
              </span>
            </div>
          </div>

          {/* Alert Peringatan Penegasan Status Relevan & Revisi */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/80 text-rose-900 text-xs leading-relaxed">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-semibold">Perhatian:</p>
              <p className="text-rose-800/90 mt-0.5">
                Alur approval yang sedang berjalan akan dihentikan seketika. Status dokumen akan langsung dikembalikan menjadi <strong className="font-bold text-rose-950 underline decoration-rose-400">RELEVAN</strong> tanpa menambah jumlah nomor revisi.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirmCancel}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 transition-all shadow-md shadow-rose-500/25 active:scale-95 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Membatalkan...</span>
              </>
            ) : (
              <>
                <RotateCcw size={13} />
                <span>Ya, Batalkan Approval</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
