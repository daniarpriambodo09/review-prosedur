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
  cycleStatus: 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  currentStage: 'prepared' | 'checked' | 'approved' | 'completed';
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
}

export default function ApprovalTable({
  documents,
  loading,
  onOpenDetail,
  onOpenEdit,
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
                                    : status === 'rejected'
                                    ? 'text-rose-600'
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

                  {/* Kolom 5: Tombol Aksi (Detail dan Edit) */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
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
