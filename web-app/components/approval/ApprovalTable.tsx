// components/approval/ApprovalTable.tsx
'use client';

import React from 'react';
import {
  CheckCircle2,
  Clock,
  Circle,
  XCircle,
  Eye,
  Pencil,
  FileText,
  Upload,
  RotateCcw,
  AlertCircle,
  UserCheck,
} from 'lucide-react';

export interface ApproverDetail {
  id?: number | null;
  approverId?: number;
  nama: string | null;
  email: string;
  accStatus: 'acc' | 'pending' | 'rejected' | 'waiting';
  accAt: string | null;
  emailSentAt: string | null;
  rejectReason: string | null;
}

function formatCompletedDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function isRecentlyCompleted(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const diffDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  } catch {
    return false;
  }
}

export interface StageInfo {
  role: 'prepared' | 'checked' | 'approved';
  roleLabel: string;
  status: 'completed' | 'in_progress' | 'pending' | 'rejected';
  approvedCount: number;
  totalCount: number;
  approvers: ApproverDetail[];
}

export interface ApprovalDocumentItem {
  cycleId: number;
  nomorDokumen: string;
  namaDokumen: string;
  levelDokumen: string;
  revisi: string;
  owner: string;
  pic: string;
  email: string;
  documentStatus: string;
  cycleStatus: 'in_progress' | 'completed' | 'rejected' | 'cancelled' | 'revisi' | 'setting_approver';
  currentStage: 'prepared' | 'checked' | 'approved' | 'completed' | 'revisi';
  startedAt: string;
  completedAt: string | null;
  fileName: string | null;
  filePath: string | null;
  stages: {
    prepared: StageInfo;
    checked: StageInfo;
    approved: StageInfo;
  };
  rejection: {
    role: string;
    roleLabel: string;
    nama: string | null;
    email: string;
    reason: string;
    rejectedAt: string;
  } | null;
}

interface ApprovalTableProps {
  documents: ApprovalDocumentItem[];
  loading: boolean;
  onOpenDetail: (doc: ApprovalDocumentItem) => void;
  onOpenEdit: (doc: ApprovalDocumentItem) => void;
  onOpenUpload: (doc: ApprovalDocumentItem) => void;
  onOpenRejection: (doc: ApprovalDocumentItem) => void;
}

export default function ApprovalTable({
  documents,
  loading,
  onOpenDetail,
  onOpenEdit,
  onOpenUpload,
  onOpenRejection,
}: ApprovalTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-700">Memuat data approval dokumen...</p>
        <p className="text-xs text-slate-400 mt-1">Mengambil status Prepared, Checked, dan Approved...</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <FileText size={22} />
        </div>
        <h3 className="text-sm font-bold text-slate-800">Tidak Ada Dokumen Approval Ditemukan</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          Tidak ada dokumen yang sesuai dengan filter atau kata kunci pencarian yang dipilih saat ini.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm table-auto">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
              <th className="py-3 px-3.5 text-center w-12">No</th>
              <th className="py-3 px-4 min-w-[260px]">Nama Dokumen</th>
              <th className="py-3 px-4 text-center w-36 whitespace-nowrap">Nomor Dokumen</th>
              <th className="py-3 px-4 w-72 whitespace-nowrap">Status Approval</th>
              <th className="py-3 px-4 text-center w-40 whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((doc, idx) => {
              const isCompleted =
                doc.cycleStatus === 'completed' ||
                doc.documentStatus === 'Relevan' ||
                doc.currentStage === 'completed';

              const stages = [
                { key: 'prepared' as const, label: 'Prepared', stage: doc.stages.prepared },
                { key: 'checked' as const, label: 'Checked', stage: doc.stages.checked },
                { key: 'approved' as const, label: 'Approved', stage: doc.stages.approved },
              ];

              return (
                <tr
                  key={`${doc.cycleId}-${doc.nomorDokumen}`}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  {/* Kolom 1: No */}
                  <td className="py-3.5 px-3.5 text-center font-medium text-xs text-slate-400">
                    {idx + 1}
                  </td>

                  {/* Kolom 2: Nama Dokumen */}
                  <td className="py-3.5 px-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm leading-snug">
                        {doc.namaDokumen}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                        {isCompleted && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isRecentlyCompleted(doc.completedAt)
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs'
                                : 'bg-teal-50 text-teal-700 border border-teal-200'
                            }`}
                            title={doc.completedAt ? `Selesai approval: ${formatCompletedDate(doc.completedAt)}` : 'Selesai Approval'}
                          >
                            {isRecentlyCompleted(doc.completedAt) ? 'Baru Selesai ✨' : 'Selesai Approval'}
                          </span>
                        )}
                        {doc.levelDokumen && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[10px]">
                            {doc.levelDokumen}
                          </span>
                        )}
                        {doc.revisi && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">
                            Rev: <strong className="text-slate-700">{doc.revisi}</strong>
                          </span>
                        )}
                        {doc.owner && (
                          <span className="text-[11px] text-slate-400">
                            Owner: <span className="text-slate-600 font-medium">{doc.owner}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Kolom 3: Nomor Dokumen */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-800 tracking-wide">
                      {doc.nomorDokumen}
                    </span>
                  </td>

                  {/* Kolom 4: Status (Daftar 3 ke bawah: Prepared, Checked, Approved) */}
                  <td className="py-3 px-4">
                    <div className="space-y-1.5 w-full max-w-[270px]">
                      {/* Highlight Badge jika dokumen telah SELESAI seluruh tahap approval */}
                      {isCompleted && (
                        <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-bold shadow-2xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                            <span className="truncate">Selesai Approval (ACC)</span>
                          </div>
                          {doc.completedAt && (
                            <span className="text-[10px] text-emerald-700/90 font-mono font-medium flex-shrink-0" title="Waktu selesai approval">
                              {formatCompletedDate(doc.completedAt)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Highlight Badge jika dokumen baru dibuat dan butuh setting approver */}
                      {(doc.documentStatus === 'Menunggu Setting Approver' || doc.cycleStatus === 'setting_approver') && !isCompleted && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-bold shadow-xs">
                          <AlertCircle size={13} className="text-amber-600 flex-shrink-0" />
                          <span className="truncate">Perlu Setting Approver</span>
                        </div>
                      )}

                      {/* Highlight Badge jika dokumen berstatus Revisi atau Ditolak */}
                      {(doc.documentStatus === 'Revisi' || doc.cycleStatus === 'revisi') && !isCompleted && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold">
                          <RotateCcw size={13} className="text-rose-600 flex-shrink-0" />
                          <span className="truncate">Perlu Upload Revisi</span>
                        </div>
                      )}
                      {/* Highlight Badge jika dokumen berstatus Ditolak */}
                      {(doc.documentStatus === 'Ditolak' || doc.cycleStatus === 'rejected' || doc.rejection) && (
                        <button
                          type="button"
                          onClick={() => onOpenRejection(doc)}
                          className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100/90 border border-red-300 text-red-900 text-[11px] font-bold shadow-2xs transition-all active:scale-98 group cursor-pointer text-left"
                          title="Klik untuk melihat keterangan & alasan penolakan dokumen ini"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <XCircle size={13} className="text-red-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="truncate">
                              Ditolak {doc.rejection ? `(${doc.rejection.roleLabel})` : ''}
                            </span>
                          </div>
                          <span className="text-[10px] bg-red-200/90 text-red-800 px-1.5 py-0.5 rounded font-semibold flex-shrink-0 group-hover:bg-red-300 transition-colors">
                            Lihat Alasan &rarr;
                          </span>
                        </button>
                      )}

                      {stages.map(({ key, label, stage }) => {
                        const status = stage.status;

                        // Peraturan Warna & Icon:
                        // 1. Selesai -> Hijau dengan icon centang
                        // 2. Dalam proses -> Kuning dengan icon jam
                        // 3. Belum di tahap -> Tidak ada warna (abu-abu netral)
                        // 4. Ditolak -> Merah dengan icon silang
                        let styleClass = '';
                        let IconComponent = Circle;
                        let statusBadge = '';

                        if (status === 'completed') {
                          styleClass = 'bg-emerald-50 text-emerald-800 border-emerald-200/90 font-medium';
                          IconComponent = CheckCircle2;
                          statusBadge = `✓ ${stage.approvedCount}/${stage.totalCount || 1}`;
                        } else if (status === 'in_progress') {
                          styleClass = 'bg-amber-50 text-amber-800 border-amber-200 font-semibold shadow-2xs';
                          IconComponent = Clock;
                          statusBadge = `⏳ ${stage.approvedCount}/${stage.totalCount || 1}`;
                        } else if (status === 'rejected') {
                          styleClass = 'bg-rose-50 text-rose-800 border-rose-200 font-semibold';
                          IconComponent = XCircle;
                          statusBadge = '✕ Ditolak';
                        } else {
                          // Belum di tahap (tidak ada warna)
                          styleClass = 'text-slate-400 bg-slate-50/40 border-slate-100';
                          IconComponent = Circle;
                          statusBadge = '-';
                        }

                        const isRejectedStage = status === 'rejected';

                        if (isRejectedStage) {
                          return (
                            <button
                              type="button"
                              key={key}
                              onClick={() => onOpenRejection(doc)}
                              className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg border text-xs transition-all cursor-pointer hover:bg-rose-100/90 active:scale-98 group ${styleClass}`}
                              title={`Tahap ${label} ditolak — Klik untuk melihat alasan penolakan`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <IconComponent
                                  size={13}
                                  className="flex-shrink-0 text-rose-600 group-hover:scale-110 transition-transform"
                                />
                                <span className="truncate">{label}</span>
                              </div>
                              <span className="text-[11px] font-mono ml-2 opacity-90 flex-shrink-0 group-hover:underline">
                                {statusBadge}
                              </span>
                            </button>
                          );
                        }

                        return (
                          <div
                            key={key}
                            className={`flex items-center justify-between px-2.5 py-1 rounded-lg border text-xs transition-colors ${styleClass}`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <IconComponent
                                size={13}
                                className={`flex-shrink-0 ${
                                  status === 'completed'
                                    ? 'text-emerald-600'
                                    : status === 'in_progress'
                                    ? 'text-amber-600'
                                    : 'text-slate-300'
                                }`}
                              />
                              <span className="truncate">{label}</span>
                            </div>
                            <span className="text-[11px] font-mono ml-2 opacity-90 flex-shrink-0">
                              {statusBadge}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </td>

                  {/* Kolom 5: Tombol Aksi (Upload Ulang, Detail, dan Edit) */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      {doc.documentStatus === 'Menunggu Setting Approver' || doc.cycleStatus === 'setting_approver' ? (
                        <>
                          {/* Tombol Prioritas: Atur Approver */}
                          <button
                            onClick={() => onOpenEdit(doc)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
                                       bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/25 ring-2 ring-amber-500/20
                                       transition-all active:scale-95"
                            title="Atur approver (Prepared, Checked, Approved) untuk memulai alur approval"
                          >
                            <UserCheck size={13} />
                            <span>Atur Approver</span>
                          </button>

                          {/* Tombol Detail */}
                          <button
                            onClick={() => onOpenDetail(doc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                                       bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100
                                       transition-all active:scale-95 shadow-2xs"
                            title="Lihat detail dokumen"
                          >
                            <Eye size={13} />
                            <span>Detail</span>
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Tombol Upload Ulang */}
                          <button
                            onClick={() => onOpenUpload(doc)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-2xs ${
                              doc.documentStatus === 'Revisi' || doc.documentStatus === 'Ditolak'
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 ring-2 ring-blue-500/20'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 hover:text-indigo-800'
                            }`}
                            title="Upload ulang dokumen untuk memulai / mengulang alur approval"
                          >
                            <Upload size={13} />
                            <span>Upload</span>
                          </button>

                          {/* Tombol Detail */}
                          <button
                            onClick={() => onOpenDetail(doc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                                       bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:text-blue-800
                                       transition-all active:scale-95 shadow-2xs"
                            title="Lihat detail dokumen dan siapa yang sudah approve"
                          >
                            <Eye size={13} />
                            <span>Detail</span>
                          </button>

                          {/* Tombol Edit */}
                          <button
                            onClick={() => onOpenEdit(doc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                                       bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:text-amber-800
                                       transition-all active:scale-95 shadow-2xs"
                            title="Edit nama dokumen dan ketiga approver (Prepared, Checked, Approved)"
                          >
                            <Pencil size={13} />
                            <span>Edit</span>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
