// components/approval/ApprovalStartCycleConfirmModal.tsx
'use client';

import React, { useState } from 'react';
import {
  Play,
  X,
  FileText,
  User,
  Mail,
  Send,
  Pencil,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { ApprovalDocumentItem } from './ApprovalTable';

interface ApprovalStartCycleConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ApprovalDocumentItem | null;
  onConfirmSuccess: () => void;
  onOpenEdit: (doc: ApprovalDocumentItem) => void;
}

export default function ApprovalStartCycleConfirmModal({
  isOpen,
  onClose,
  document: doc,
  onConfirmSuccess,
  onOpenEdit,
}: ApprovalStartCycleConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !doc) return null;

  const preparedApprovers = doc.stages?.prepared?.approvers || [];
  const checkedApprovers = doc.stages?.checked?.approvers || [];
  const approvedApprovers = doc.stages?.approved?.approvers || [];

  const handleStartApproval = async () => {
    if (!doc.nomorDokumen) return;

    try {
      setLoading(true);
      setErrorMsg(null);

      const response = await fetch('/review-prosedur/api/approval-dokumen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomorDokumen: doc.nomorDokumen }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal memulai alur approval.');
      }

      setSuccessMsg(
        `Alur approval untuk ${doc.nomorDokumen} berhasil dimulai! Notifikasi email telah dikirimkan ke PIC Prepared.`
      );

      setTimeout(() => {
        onConfirmSuccess();
        onClose();
        setSuccessMsg(null);
      }, 1400);
    } catch (err: any) {
      console.error('Error saat memulai alur approval:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat memulai siklus approval.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Decorative Top Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 flex-shrink-0">
              <Play size={20} className="fill-current ml-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Konfirmasi Start Approval
                </span>
              </div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                Mulai Alur Persetujuan Dokumen
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            title="Tutup dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
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

          {/* Section 1: Ringkasan Dokumen */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-lg border border-blue-200">
                {doc.nomorDokumen}
              </span>
              <div className="flex items-center gap-1.5 text-xs">
                {doc.levelDokumen && (
                  <span className="px-2 py-0.5 rounded bg-white text-slate-600 font-semibold text-[10px] border border-slate-200">
                    {doc.levelDokumen}
                  </span>
                )}
                {doc.revisi && (
                  <span className="px-2 py-0.5 rounded bg-white text-slate-600 font-semibold text-[10px] border border-slate-200">
                    Rev: {doc.revisi}
                  </span>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-extrabold text-slate-900 leading-snug">
                {doc.namaDokumen}
              </p>
              {doc.fileName && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                  <FileText size={13} className="text-slate-400 flex-shrink-0" />
                  <span className="truncate font-medium">{doc.fileName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Daftar Detail Approver per Tahap */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>Susunan Approver Yang Ditetapkan</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEdit(doc);
                }}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline"
                title="Buka form edit untuk mengubah susunan approver"
              >
                <Pencil size={12} />
                <span>Ubah Approver</span>
              </button>
            </div>

            {/* Tahap 1: Prepared */}
            <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                    1
                  </span>
                  <span className="text-xs font-extrabold text-blue-900">
                    Tahap Prepared (Pembuat Dokumen)
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs">
                  Aktif Pertama
                </span>
              </div>

              <div className="space-y-1.5 pl-7">
                {preparedApprovers.length > 0 ? (
                  preparedApprovers.map((appr, idx) => (
                    <div
                      key={`prep-${idx}`}
                      className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-blue-100 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <User size={13} className="text-blue-600 flex-shrink-0" />
                        <span className="font-bold text-slate-800 truncate">
                          {appr.nama || appr.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 text-[11px] font-mono ml-2 truncate">
                        <Mail size={11} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate">{appr.email}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-rose-600 italic">Belum ada approver Prepared.</p>
                )}
                <p className="text-[10px] text-blue-700/80 mt-1">
                  ⚡ Approver pada tahap ini akan langsung menerima email notifikasi approval setelah Anda konfirmasi.
                </p>
              </div>
            </div>

            {/* Tahap 2: Checked */}
            <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                    2
                  </span>
                  <span className="text-xs font-extrabold text-amber-900">
                    Tahap Checked (Pemeriksa)
                  </span>
                </div>
                <span className="text-[10px] font-medium text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                  Menunggu Prepared Selesai
                </span>
              </div>

              <div className="space-y-1.5 pl-7">
                {checkedApprovers.length > 0 ? (
                  checkedApprovers.map((appr, idx) => (
                    <div
                      key={`chk-${idx}`}
                      className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-amber-100 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <User size={13} className="text-amber-600 flex-shrink-0" />
                        <span className="font-bold text-slate-800 truncate">
                          {appr.nama || appr.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 text-[11px] font-mono ml-2 truncate">
                        <Mail size={11} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate">{appr.email}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">Belum ada approver Checked.</p>
                )}
              </div>
            </div>

            {/* Tahap 3: Approved */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                    3
                  </span>
                  <span className="text-xs font-extrabold text-emerald-900">
                    Tahap Approved (Penyetuju Akhir)
                  </span>
                </div>
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                  Menunggu Checked Selesai
                </span>
              </div>

              <div className="space-y-1.5 pl-7">
                {approvedApprovers.length > 0 ? (
                  approvedApprovers.map((appr, idx) => (
                    <div
                      key={`appr-${idx}`}
                      className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-emerald-100 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <User size={13} className="text-emerald-600 flex-shrink-0" />
                        <span className="font-bold text-slate-800 truncate">
                          {appr.nama || appr.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 text-[11px] font-mono ml-2 truncate">
                        <Mail size={11} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate">{appr.email}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">Belum ada approver Approved.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white hover:text-slate-800 transition-colors disabled:opacity-50"
          >
            Batal
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenEdit(doc);
              }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <Pencil size={13} />
              <span>Ubah Approver</span>
            </button>

            <button
              type="button"
              onClick={handleStartApproval}
              disabled={loading || preparedApprovers.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memulai Approval...</span>
                </>
              ) : (
                <>
                  <Play size={14} className="fill-current ml-0.5" />
                  <span>Mulai Approval Sekarang</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
