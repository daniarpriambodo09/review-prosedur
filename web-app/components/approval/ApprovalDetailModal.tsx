// components/approval/ApprovalDetailModal.tsx
'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  FileText,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  Circle,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Building2,
  Mail,
  AlertTriangle,
} from 'lucide-react';
import { ApprovalDocumentItem } from './ApprovalTable';

interface ApprovalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ApprovalDocumentItem | null;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function ApprovalDetailModal({
  isOpen,
  onClose,
  document: doc,
}: ApprovalDetailModalProps) {
  // Tutup dengan Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !doc) return null;

  const stages = [
    { key: 'prepared' as const, label: 'Prepared', step: 'Tahap 1', stage: doc.stages.prepared },
    { key: 'checked' as const, label: 'Checked', step: 'Tahap 2', stage: doc.stages.checked },
    { key: 'approved' as const, label: 'Approved', step: 'Tahap 3', stage: doc.stages.approved },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* ── Modal Header ── */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                Detail Dokumen & Approval
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 font-semibold">
                {doc.nomorDokumen}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug line-clamp-2">
              {doc.namaDokumen}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors flex-shrink-0"
            title="Tutup Modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Modal Body (Scrollable) ── */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Banner Penolakan (Jika dokumen saat ini sedang berstatus Ditolak) */}
          {(doc.documentStatus === 'Ditolak' || doc.cycleStatus === 'rejected') && doc.rejection && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3.5">
              <AlertTriangle size={20} className="text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-rose-900">
                  Dokumen Ditolak pada Tahap {doc.rejection.roleLabel}
                </h4>
                <p className="text-xs text-rose-700 mt-0.5">
                  Ditolak oleh:{' '}
                  <strong>{doc.rejection.nama || doc.rejection.email}</strong> ({doc.rejection.email})
                  {' • '}
                  <span>{formatDate(doc.rejection.rejectedAt)}</span>
                </p>
                <div className="mt-2 text-xs text-rose-800 bg-white/70 p-3 rounded-xl border border-rose-200/80 italic">
                  &ldquo;{doc.rejection.reason}&rdquo;
                </div>
              </div>
            </div>
          )}

          {/* Grid Informasi Dokumen (3 Kolom) */}
          <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/80">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3.5">
              Informasi Prosedur
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-3.5 gap-x-6 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Nomor Dokumen
                </span>
                <span className="font-mono font-bold text-slate-800 text-[13px]">{doc.nomorDokumen}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Level Dokumen
                </span>
                <span className="font-semibold text-slate-800">{doc.levelDokumen || '-'}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Revisi
                </span>
                <span className="font-semibold text-slate-800">{doc.revisi || '0'}</span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Owner / Departemen
                </span>
                <span className="font-semibold text-slate-800">{doc.owner || '-'}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                  PIC
                </span>
                <span className="font-semibold text-slate-800">{doc.pic || '-'}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Email PIC
                </span>
                <span className="font-semibold text-slate-800 break-words block" title={doc.email}>
                  {doc.email || '-'}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Mulai Approval
                </span>
                <span className="font-semibold text-slate-800">{formatDate(doc.startedAt)}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Selesai Approval
                </span>
                <span className="font-semibold text-slate-800">
                  {doc.documentStatus === 'Revisi' ||
                  doc.documentStatus === 'Ditolak' ||
                  doc.documentStatus === 'Menunggu Setting Approver' ||
                  doc.documentStatus === 'Menunggu Approval'
                    ? '-'
                    : formatDate(doc.completedAt)}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Status Siklus
                </span>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                    doc.documentStatus === 'Relevan' && doc.cycleStatus === 'completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : doc.cycleStatus === 'in_progress'
                      ? 'bg-amber-100 text-amber-800'
                      : doc.cycleStatus === 'rejected' || doc.documentStatus === 'Ditolak'
                      ? 'bg-rose-100 text-rose-800'
                      : doc.cycleStatus === 'revisi' || doc.documentStatus === 'Revisi'
                      ? 'bg-rose-100 text-rose-800'
                      : doc.cycleStatus === 'setting_approver' || doc.documentStatus === 'Menunggu Setting Approver'
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {doc.documentStatus === 'Relevan' && doc.cycleStatus === 'completed'
                    ? 'Selesai'
                    : doc.cycleStatus === 'in_progress'
                    ? 'Dalam Proses'
                    : doc.cycleStatus === 'rejected' || doc.documentStatus === 'Ditolak'
                    ? 'Ditolak'
                    : doc.cycleStatus === 'revisi' || doc.documentStatus === 'Revisi'
                    ? 'Perlu Revisi'
                    : doc.cycleStatus === 'setting_approver' || doc.documentStatus === 'Menunggu Setting Approver'
                    ? 'Perlu Approval'
                    : doc.cycleStatus}
                </span>
              </div>
            </div>
          </div>

          {/* ── Status Approval (Prepared, Checked, Approved) ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck size={18} className="text-blue-600" />
                <span>Progres Approval Dokumen (Siapa yang Sudah Approve)</span>
              </h3>
              <span className="text-xs text-slate-400">
                Tahap berjalan:{' '}
                <strong className="text-slate-700 capitalize">
                  {doc.documentStatus === 'Revisi' ? 'Revisi' : doc.currentStage}
                </strong>
              </span>
            </div>

            <div className="space-y-4">
              {stages.map(({ key, label, step, stage }) => {
                const isRestarting =
                  doc.documentStatus === 'Revisi' ||
                  doc.documentStatus === 'Ditolak' ||
                  doc.documentStatus === 'Menunggu Setting Approver' ||
                  doc.documentStatus === 'Menunggu Approval' ||
                  doc.cycleStatus === 'revisi' ||
                  doc.cycleStatus === 'setting_approver';

                const isCompleted = !isRestarting && stage.status === 'completed';
                const isInProgress = !isRestarting && stage.status === 'in_progress';
                const isRejected = !isRestarting && stage.status === 'rejected';

                let headerBg = 'bg-slate-100 border-slate-200 text-slate-700';
                let StatusBadge = (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-600">
                    Belum Dimulai
                  </span>
                );

                if (isCompleted) {
                  headerBg = 'bg-emerald-50/80 border-emerald-200 text-emerald-900';
                  StatusBadge = (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 size={12} />
                      <span>Selesai Disetujui</span>
                    </span>
                  );
                } else if (isInProgress) {
                  headerBg = 'bg-amber-50/80 border-amber-200 text-amber-900';
                  StatusBadge = (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                      <Clock size={12} />
                      <span>Sedang Berjalan</span>
                    </span>
                  );
                } else if (isRejected) {
                  headerBg = 'bg-rose-50/80 border-rose-200 text-rose-900';
                  StatusBadge = (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                      <XCircle size={12} />
                      <span>Ditolak</span>
                    </span>
                  );
                }

                const displayApprovedCount = isRestarting ? 0 : stage.approvedCount;

                return (
                  <div
                    key={key}
                    className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white"
                  >
                    {/* Header Tahap */}
                    <div className={`px-4 py-3 border-b flex items-center justify-between ${headerBg}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/80 shadow-2xs">
                          {step}
                        </span>
                        <h4 className="font-bold text-sm">{label}</h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-medium">
                          {displayApprovedCount} dari {stage.totalCount} disetujui
                        </span>
                        {StatusBadge}
                      </div>
                    </div>

                    {/* Daftar Approver di Tahap ini */}
                    <div className="p-4 divide-y divide-slate-100">
                      {stage.approvers.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          Belum ada approver yang didaftarkan untuk tahap ini.
                        </p>
                      ) : (
                        stage.approvers.map((approver, aIdx) => {
                          const hasApproved = !isRestarting && approver.accStatus === 'acc';
                          const isApproverRejected = !isRestarting && approver.accStatus === 'rejected';
                          const isPending =
                            !isRestarting &&
                            (approver.accStatus === 'pending' ||
                            (stage.status === 'in_progress' && !hasApproved && !isApproverRejected));

                          return (
                            <div
                              key={approver.id || `app-${aIdx}`}
                              className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                            >
                              {/* Info Approver */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                    hasApproved
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : isPending
                                      ? 'bg-amber-100 text-amber-700'
                                      : isApproverRejected
                                      ? 'bg-rose-100 text-rose-700'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {(approver.nama || approver.email || 'A')[0].toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate">
                                    {approver.nama || <span className="font-normal italic">Tanpa Nama</span>}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                                    <Mail size={11} className="text-slate-400" />
                                    <span>{approver.email}</span>
                                  </p>
                                </div>
                              </div>

                              {/* Status Persetujuan */}
                              <div className="flex flex-col sm:items-end flex-shrink-0 text-left sm:text-right pl-12 sm:pl-0">
                                {hasApproved && (
                                  <>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                      <CheckCircle2 size={13} className="text-emerald-600" />
                                      <span>Sudah Approve</span>
                                    </span>
                                    {approver.accAt && (
                                      <span className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                                        <Calendar size={10} />
                                        <span>{formatDate(approver.accAt)}</span>
                                      </span>
                                    )}
                                  </>
                                )}

                                {isPending && (
                                  <>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 animate-pulse">
                                      <Clock size={13} className="text-amber-600" />
                                      <span>Menunggu Approval</span>
                                    </span>
                                    {approver.emailSentAt ? (
                                      <span className="text-[11px] text-slate-400 mt-1">
                                        Email dikirim: {formatDate(approver.emailSentAt)}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 mt-1">
                                        Menunggu pengiriman email
                                      </span>
                                    )}
                                  </>
                                )}

                                {isApproverRejected && (
                                  <>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                                      <XCircle size={13} className="text-rose-600" />
                                      <span>Menolak Dokumen</span>
                                    </span>
                                    {approver.accAt && (
                                      <span className="text-[11px] text-rose-600 mt-1">
                                        {formatDate(approver.accAt)}
                                      </span>
                                    )}
                                  </>
                                )}

                                {!hasApproved && !isPending && !isApproverRejected && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                                    <Circle size={12} className="text-slate-400" />
                                    <span>Menunggu Giliran Tahap</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Modal Footer ── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <Link
              href={`/status-review/${encodeURIComponent(doc.nomorDokumen)}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
            >
              <ExternalLink size={13} />
              <span>Buka Halaman Lengkap Prosedur</span>
            </Link>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
