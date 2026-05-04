// app/status-review/page.tsx
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Header } from '@/components/procedures/header';
import {
  ProcedureDocument,
  StatusType,
  getAllProcedures,
  getDocumentReview,
  archiveProcedure
} from '@/data/procedures/all-procedures';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DocumentModal from '@/components/documents/DocumentModal';
import EmailScheduleModal from '@/components/status-review/EmailScheduleModal';

function Breadcrumb() {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
      <Link href="/home" className="hover:text-blue-600 transition-colors">
        Dashboard Admin
      </Link>
      <span>/</span>
      <span className="text-slate-900 font-semibold">Status Prosedur</span>
    </div>
  );
}

function StatusBadge({ status }: { status: StatusType }) {
  const styles: Record<StatusType, { bg: string; text: string; border: string; icon: string }> = {
    Revisi:           { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: '⟳' },
    Relevan:          { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '✓' },
    Obsolete:         { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     icon: '⊘' },
    Menunggu:         { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    icon: '⏳' },
    'Belum dikirim':  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  icon: '📋' },
    'Telah terkirim': { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',    icon: '📨' },
    'Telah dibaca':   { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  icon: '👁️' },
    '-':              { bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',   icon: '?' },
  };
  const { bg, text, border, icon } = styles[status] || styles['-'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap border ${bg} ${text} ${border}`}>
      {icon} {status}
    </span>
  );
}

function EmailStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; border: string; icon: string }> = {
    pending:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: '⏳' },
    sent:      { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '✓' },
    failed:    { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     icon: '✗' },
    cancelled: { bg: 'bg-slate-50',   text: 'text-slate-700',   border: 'border-slate-200',   icon: '⊘' },
  };
  const { bg, text, border, icon } = styles[status] || styles['pending'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border whitespace-nowrap ${bg} ${text} ${border}`}>
      {icon} {status.toUpperCase()}
    </span>
  );
}

interface EmailSchedule {
  id: number;
  nomorDokumen: string;
  scheduledEmailAt: string;
  emailStatus: 'pending' | 'sent' | 'failed' | 'cancelled';
  lastSentAt?: string;
  retryCount: number;
  errorMessage?: string;
  namaDokumen?: string;
  pic?: string;
  email?: string;
}

// =============================================================================
// resolveDisplayStatus — prioritas yang benar
//
// KUNCI: "Relevan" BUKAN immutable. Jika ada jadwal email pending/sent,
// status Relevan harus di-override karena ini siklus review baru.
//
// Yang benar-benar immutable hanya hasil review final PIC:
//   - Revisi   → PIC sudah memilih Revisi
//   - Obsolete → PIC sudah memilih Obsolete
//   - Telah dibaca → PIC sudah buka dokumen (lebih maju dari Telah terkirim)
//
// Relevan bisa muncul dari:
//   a) PIC memilih Relevan (hasil review) → akan di-override oleh jadwal baru (benar)
//   b) Auto-expire setelah 2 bulan       → juga boleh di-override oleh jadwal baru
// =============================================================================
// =============================================================================
// resolveDisplayStatus
//
// Fungsi ini hanya sebagai LAPISAN DISPLAY di atas data dari DB.
// Sumber kebenaran utama tetap procedure_documents.status di DB.
//
// Alur status yang benar:
//   Relevan (lama) → [admin buat jadwal] → Belum dikirim → [email terkirim]
//   → Telah terkirim → [PIC klik] → Telah dibaca → [PIC submit]
//   → Relevan / Revisi / Obsolete
//
// Prioritas display:
//   1. Revisi / Obsolete          → hasil review final, tidak bisa di-override
//   2. Telah dibaca               → PIC sudah buka, tidak boleh mundur ke Telah terkirim
//   3. Email schedule sent        → tampilkan Telah terkirim
//   4. Email schedule pending     → tampilkan Belum dikirim
//   5. Relevan (tanpa schedule)   → hasil review sebelumnya, tampilkan apa adanya
//   6. Default                    → status dari DB
// =============================================================================
// =============================================================================
// resolveDisplayStatus
//
// ATURAN SEDERHANA:
// - Jika doc.status dari DB adalah status final PIC (Relevan/Revisi/Obsolete)
//   atau status yang lebih maju (Telah dibaca) → tampilkan apa adanya, SELESAI.
// - Jika doc.status masih dalam tahap awal (Belum dikirim, Menunggu, dsb)
//   → cek email schedule untuk display yang lebih akurat.
//
// Kenapa Relevan masuk P1:
//   loadData() sudah menjamin bahwa jika doc.status = 'Relevan' di state,
//   itu adalah hasil review PIC yang valid (bukan nilai lama yang tertimpa),
//   karena loadData() tidak menimpa status workflow aktif dengan review lama.
//   Jadi saat resolveDisplayStatus melihat Relevan, itu memang sudah final.
// =============================================================================
function resolveDisplayStatus(
  doc: ProcedureDocument,
  emailSchedules: Record<string, EmailSchedule>
): StatusType {
  // P1: Status final dari PIC — tidak bisa di-override oleh apapun
  if (
    doc.status === 'Relevan' ||
    doc.status === 'Revisi'  ||
    doc.status === 'Obsolete'
  ) return doc.status;

  // P2: PIC sudah membaca — tidak boleh mundur ke Telah terkirim
  if (doc.status === 'Telah dibaca') return 'Telah dibaca';

  // P3: Belum ada aksi PIC → tampilkan berdasarkan status email schedule
  // Schedule 'cancelled' diabaikan — tidak mempengaruhi display status
  const schedule = emailSchedules[doc.nomorDokumen];
  if (schedule && schedule.emailStatus !== 'cancelled') {
    if (schedule.emailStatus === 'sent')    return 'Telah terkirim';
    if (schedule.emailStatus === 'pending') return 'Belum dikirim';
  }

  // Default
  return doc.status;
}

function ProceduresTable({
  data,
  onDelete,
  onDocumentClick,
  emailSchedules
}: {
  data: ProcedureDocument[];
  onDelete: (nomorDokumen: string) => void;
  onDocumentClick: (nomorDokumen: string, namaDokumen: string) => void;
  emailSchedules: Record<string, EmailSchedule>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {['Nama Dokumen','Nomor Dokumen','Level Dokumen','Tanggal Selesai Approval','Revisi','Owner','PIC','Email','Status','Jadwal Email','Aksi'].map(h => (
              <th key={h} className="px-5 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {data.map((row, index) => {
            const schedule = emailSchedules[row.nomorDokumen];
            return (
              <tr key={`${row.nomorDokumen}-${index}`} className="hover:bg-blue-50 transition-colors">
                <td className="px-5 py-4">
                  <button
                    onClick={() => onDocumentClick(row.nomorDokumen, row.namaDokumen)}
                    className="text-left hover:text-blue-600 transition-colors underline decoration-dotted underline-offset-2 hover:decoration-solid"
                    title="Klik untuk melihat dokumen"
                  >
                    {row.namaDokumen}
                  </button>
                </td>
                <td className="px-5 py-4 text-sm text-slate-700">{row.nomorDokumen}</td>
                <td className="px-5 py-4 text-sm text-slate-700">{row.levelDokumen}</td>
                <td className="px-5 py-4 text-sm text-slate-700">{formatToDDMonYYYY(row.tanggalSelesaiApproval)}</td>
                <td className="px-5 py-4 text-sm text-slate-700">{row.revisi}</td>
                <td className="px-5 py-4 text-sm text-slate-700">{row.owner}</td>
                <td className="px-5 py-4 text-sm text-slate-700">{row.pic}</td>
                <td className="px-5 py-4 text-sm text-slate-700">{row.email || '-'}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-5 py-4">
                  {schedule && schedule.emailStatus !== 'cancelled' ? (
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">
                          {new Date(schedule.scheduledEmailAt).toLocaleDateString('id-ID', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })}
                        </span>
                        <span className="text-slate-500">
                          {new Date(schedule.scheduledEmailAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                        <EmailStatusBadge status={schedule.emailStatus} />
                      </div>
                      {/* Tampilkan info terkirim + expiry jika sudah sent */}
                      {schedule.emailStatus === 'sent' && schedule.lastSentAt && (() => {
                        const sentDate = new Date(schedule.lastSentAt);
                        const expiryDate = new Date(sentDate.getFullYear(), sentDate.getMonth() + 2, sentDate.getDate());
                        const now = new Date();
                        const isExpired = now >= expiryDate;
                        return (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-emerald-600">
                              Terkirim: {sentDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <span className={isExpired ? 'text-red-500 font-medium' : 'text-slate-400'}>
                              {isExpired ? '⚠ Expired' : `Berlaku s/d: ${expiryDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <span className="text-slate-400 text-sm">-</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => onDelete(row.nomorDokumen)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-95"
                    title="Arsipkan prosedur"
                  >
                    🗑️ Hapus
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="px-5 py-12 text-center text-sm text-slate-500">
          <svg className="w-16 h-16 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Tidak ada data prosedur yang sesuai dengan filter
        </div>
      )}
    </div>
  );
}

function Pagination({
  currentPage, totalPages, startIndex, endIndex, totalItems, onPrevious, onNext,
}: {
  currentPage: number; totalPages: number; startIndex: number;
  endIndex: number; totalItems: number; onPrevious: () => void; onNext: () => void;
}) {
  return (
    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
      <div className="text-sm text-slate-600">
        Menampilkan <span className="font-semibold">{startIndex}</span> sampai{' '}
        <span className="font-semibold">{endIndex}</span> dari{' '}
        <span className="font-semibold">{totalItems}</span> entri
      </div>
      <div className="flex gap-2">
        <button onClick={onPrevious} disabled={currentPage === 1}
          className="px-3 py-2 border border-slate-300 bg-white rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95">
          ← Sebelumnya
        </button>
        <span className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">
          {currentPage} / {totalPages}
        </span>
        <button onClick={onNext} disabled={currentPage >= totalPages}
          className="px-3 py-2 border border-slate-300 bg-white rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95">
          Berikutnya →
        </button>
      </div>
    </div>
  );
}

function Controls({
  searchValue, filterValue, monthFilter,
  onSearchChange, onFilterChange, onMonthFilterChange,
  onAddProcedure, onOpenEmailSchedule,
}: {
  searchValue: string; filterValue: string; monthFilter: string;
  onSearchChange: (v: string) => void; onFilterChange: (v: string) => void;
  onMonthFilterChange: (v: string) => void; onAddProcedure: () => void;
  onOpenEmailSchedule: () => void;
}) {
  return (
    <div className="flex gap-3 mb-6 items-center flex-wrap">
      <div className="relative flex-1 max-w-md">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input type="text" placeholder="Cari prosedur..." value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      <select value={filterValue} onChange={(e) => onFilterChange(e.target.value)}
        className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-right bg-no-repeat pr-10 transition-all"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231f2937' d='M6 8L2 4h8z'/%3E%3C/svg%3E")`, backgroundPosition: 'right 12px center' }}>
        <option value="">Semua Status</option>
        <option value="Revisi">Revisi</option>
        <option value="Relevan">Relevan</option>
        <option value="Obsolete">Obsolete</option>
        <option value="Menunggu">Menunggu</option>
        <option value="Belum dikirim">Belum dikirim</option>
        <option value="Telah terkirim">Telah terkirim</option>
        <option value="Telah dibaca">Telah dibaca</option>
        <option value="-">Belum Ditentukan</option>
      </select>

      <select value={monthFilter} onChange={(e) => onMonthFilterChange(e.target.value)}
        className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-right bg-no-repeat pr-10 transition-all"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231f2937' d='M6 8L2 4h8z'/%3E%3C/svg%3E")`, backgroundPosition: 'right 12px center' }}>
        <option value="">Semua Bulan</option>
        {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map((m, i) => (
          <option key={i} value={String(i)}>{m}</option>
        ))}
      </select>

      <Link href="/arsip-prosedur">
        <button className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all hover:shadow-md active:scale-95">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          Arsip Prosedur
        </button>
      </Link>

      <button onClick={onOpenEmailSchedule}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all hover:shadow-md active:scale-95">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        Atur Jadwal
      </button>

      <button onClick={onAddProcedure}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all hover:shadow-md active:scale-95">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
          <path d="M12 5v14m-7-7h14" />
        </svg>
        Tambah Prosedur
      </button>
    </div>
  );
}

const ROWS_PER_PAGE = 10;

// Helper: apakah tanggal approval dalam rentang yang membutuhkan pilihan review?
// Rentang = sudah waktunya jadwal (reached) DAN belum expired (< 2 bulan)
function isInReviewRange(tanggalApproval: string): boolean {
  if (!tanggalApproval) return false;
  const d = new Date(tanggalApproval);
  if (isNaN(d.getTime())) return false;
  const now = new Date();

  // Hitung expiry (approval + 2 bulan)
  const expiry = new Date(d.getFullYear(), d.getMonth() + 2, d.getDate());
  if (now >= expiry) return false; // sudah expired → tidak perlu pilihan

  // Hitung jadwal kirim (approval - 2 bulan)
  const schedDate = new Date(d.getFullYear(), d.getMonth() - 2, 1);
  const schedYM = schedDate.getFullYear() * 12 + schedDate.getMonth();
  const nowYM   = now.getFullYear() * 12 + now.getMonth();
  if (nowYM < schedYM) return false; // belum waktunya → tidak perlu pilihan

  return true; // dalam rentang → perlu pilihan admin
}

function AddProcedureModal({
  isOpen, onClose, onSave, value, onChange, needsReview, onNeedsReviewChange, isSaving,
}: {
  isOpen: boolean; onClose: () => void; onSave: () => void;
  value: Omit<ProcedureDocument, 'status' | 'revisi' | 'id'> & { revisi?: string };
  onChange: (field: keyof Omit<ProcedureDocument, 'status' | 'revisi' | 'id'>, val: string) => void;
  needsReview: boolean | null;
  onNeedsReviewChange: (val: boolean | null) => void;
  isSaving: boolean;
}) {
  if (!isOpen) return null;

  const inReviewRange = isInReviewRange(value.tanggalSelesaiApproval || '');
  const isExpired = (() => {
    if (!value.tanggalSelesaiApproval) return false;
    const d = new Date(value.tanggalSelesaiApproval);
    if (isNaN(d.getTime())) return false;
    const expiry = new Date(d.getFullYear(), d.getMonth() + 2, d.getDate());
    return new Date() >= expiry;
  })();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-blue-100">
          <h3 className="text-lg font-bold text-slate-900">Tambah Prosedur Baru</h3>
          <p className="text-xs text-slate-600 mt-1">Isi semua kolom dengan informasi yang akurat</p>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {([
            { label: 'Nama Dokumen',  key: 'namaDokumen' },
            { label: 'Nomor Dokumen', key: 'nomorDokumen' },
            { label: 'Level Dokumen', key: 'levelDokumen' },
            { label: 'Owner',         key: 'owner' },
            { label: 'PIC',           key: 'pic' },
            { label: 'Email',         key: 'email' },
          ] as const).map(({ label, key }) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
              <input type={key === 'email' ? 'email' : 'text'} value={value[key] || ''}
                onChange={(e) => onChange(key as any, e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder={`Masukkan ${label.toLowerCase()}`} disabled={isSaving} />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tanggal Selesai Approval</label>
            <input type="date" value={value.tanggalSelesaiApproval || ''}
              onChange={(e) => onChange('tanggalSelesaiApproval' as any, e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={isSaving} />
          </div>

          {/* Opsi status awal — hanya muncul jika tanggal dalam rentang review */}
          {value.tanggalSelesaiApproval && (
            <div className="col-span-2">
              {isExpired ? (
                // Expired: otomatis Relevan, tidak perlu pilihan
                <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                  <span className="text-slate-500 text-sm mt-0.5">ℹ️</span>
                  <p className="text-sm text-slate-600">
                    Tanggal approval sudah lewat lebih dari 2 bulan.
                    Dokumen akan otomatis berstatus <span className="font-semibold text-emerald-700">Relevan</span> — tidak masuk alur review.
                  </p>
                </div>
              ) : inReviewRange ? (
                // Dalam rentang: admin harus pilih
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Status Awal Dokumen
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => onNeedsReviewChange(true)}
                      disabled={isSaving}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        needsReview === true
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">📨</span>
                        <span className="font-semibold text-sm text-slate-900">Perlu Direview</span>
                        {needsReview === true && <span className="ml-auto text-blue-600">✓</span>}
                      </div>
                      <p className="text-xs text-slate-500">Dokumen akan masuk alur review — dijadwalkan kirim email ke PIC</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => onNeedsReviewChange(false)}
                      disabled={isSaving}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        needsReview === false
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 hover:border-emerald-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">✓</span>
                        <span className="font-semibold text-sm text-slate-900">Langsung Relevan</span>
                        {needsReview === false && <span className="ml-auto text-emerald-600">✓</span>}
                      </div>
                      <p className="text-xs text-slate-500">Dokumen sudah OK — tidak masuk alur review, langsung dianggap relevan</p>
                    </button>
                  </div>
                  {needsReview === null && (
                    <p className="text-xs text-amber-600 mt-2">⚠ Pilih salah satu status awal untuk melanjutkan</p>
                  )}
                </div>
              ) : (
                // Belum waktunya: otomatis dormant
                <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                  <span className="text-slate-500 text-sm mt-0.5">ℹ️</span>
                  <p className="text-sm text-slate-600">
                    Jadwal review otomatis akan aktif pada{' '}
                    <span className="font-semibold text-blue-700">
                      {(() => {
                        const d = new Date(value.tanggalSelesaiApproval);
                        const sched = new Date(d.getFullYear(), d.getMonth() - 2, 1);
                        return sched.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                      })()}
                    </span>.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} disabled={isSaving}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-all active:scale-95">
            Batal
          </button>
          <button
            onClick={onSave}
            disabled={isSaving || (inReviewRange && needsReview === null)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {isSaving && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isSaving ? 'Menyimpan...' : 'Simpan Prosedur'}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatToDDMonYYYY(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()}-${MONTH_NAMES[d.getMonth()]}-${d.getFullYear()}`;
}

export default function StatusReviewPage() {
  const [searchValue,    setSearchValue]    = useState('');
  const [filterValue,    setFilterValue]    = useState('');
  const [monthFilter,    setMonthFilter]    = useState('');
  const [currentPage,    setCurrentPage]    = useState(1);
  const [dataWithStatus, setDataWithStatus] = useState<ProcedureDocument[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [isModalOpen,    setIsModalOpen]    = useState(false);
  const [isSaving,       setIsSaving]       = useState(false);
  const [newProcedure,   setNewProcedure]   = useState<Omit<ProcedureDocument, 'status' | 'revisi' | 'id'>>({
    namaDokumen: '', nomorDokumen: '', levelDokumen: '',
    tanggalSelesaiApproval: '', owner: '', pic: '', email: '',
  });
  // null = belum dipilih, true = perlu review, false = langsung Relevan
  const [needsReview, setNeedsReview] = useState<boolean | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<{
    nomorDokumen: string; namaDokumen: string;
  } | null>(null);
  const [isEmailScheduleModalOpen, setIsEmailScheduleModalOpen] = useState(false);
  const [emailSchedules, setEmailSchedules] = useState<Record<string, EmailSchedule>>({});

  const loadEmailSchedules = async () => {
    try {
      const response = await fetch('/review-prosedur/api/email-schedules');
      if (response.ok) {
        const schedules = await response.json();
        const scheduleMap: Record<string, EmailSchedule> = {};
        schedules.forEach((s: EmailSchedule) => { scheduleMap[s.nomorDokumen] = s; });
        setEmailSchedules(scheduleMap);
      }
    } catch (error) {
      console.error('Error loading email schedules:', error);
    }
  };

  // ✅ loadData dibuat useCallback agar bisa dipanggil ulang dari mana saja
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const procedures = await getAllProcedures();

      // Status workflow aktif yang TIDAK boleh ditimpa oleh document_reviews.
      // DB procedure_documents adalah sumber kebenaran untuk status ini —
      // document_reviews hanya menyimpan hasil review final dari PIC.
      const workflowStatuses: StatusType[] = [
        'Belum dikirim',
        'Telah terkirim',
        'Telah dibaca',
        'Menunggu',
      ];

      const withReviews = await Promise.all(
        procedures.map(async (doc) => {
          // Jika status dari DB sudah dalam workflow aktif, jangan timpa
          if (workflowStatuses.includes(doc.status)) return doc;

          const docDate = new Date(doc.tanggalSelesaiApproval);
          const approvalMonth = isNaN(docDate.getTime())
            ? new Date().getMonth()
            : docDate.getMonth();
          const review = await getDocumentReview(doc.nomorDokumen, approvalMonth);

          // Hanya terapkan review jika berisi status final PIC
          if (review && ['Relevan', 'Revisi', 'Obsolete'].includes(review.status)) {
            return { ...doc, status: review.status as StatusType, revisi: review.revisi };
          }
          return doc;
        })
      );
      setDataWithStatus(withReviews);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Gagal memuat data. Silakan refresh halaman.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEmailSchedules(); }, []);
  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh saat admin kembali ke tab browser (misal setelah cek halaman PIC)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData();
        loadEmailSchedules();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadData]);

  const dataResolved = useMemo(() => {
    return dataWithStatus.map((doc) => ({
      ...doc,
      status: resolveDisplayStatus(doc, emailSchedules),
    }));
  }, [dataWithStatus, emailSchedules]);

  const handleNewProcedureChange = (
    field: keyof Omit<ProcedureDocument, 'status' | 'revisi' | 'id'>,
    value: string
  ) => {
    setNewProcedure((prev) => ({ ...prev, [field]: value }));
  };

  const handleDeleteProcedure = async (nomorDokumen: string) => {
    const confirmed = window.confirm(
      'Apakah Anda yakin ingin mengarsipkan prosedur ini?\n\nProsedur akan dipindahkan ke arsip dan dapat di-restore kembali.'
    );
    if (!confirmed) return;
    try {
      await archiveProcedure(nomorDokumen);
      await loadData();
      alert('Prosedur berhasil diarsipkan!');
    } catch (error: any) {
      console.error('Error archiving procedure:', error);
      alert('Gagal mengarsipkan prosedur: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDocumentClick = (nomorDokumen: string, namaDokumen: string) => {
    setSelectedDocument({ nomorDokumen, namaDokumen });
  };



  const handleSaveNewProcedure = async () => {
    if (!newProcedure.namaDokumen || !newProcedure.nomorDokumen || !newProcedure.levelDokumen ||
        !newProcedure.tanggalSelesaiApproval || !newProcedure.owner || !newProcedure.pic || !newProcedure.email) {
      alert('Semua kolom wajib diisi.');
      return;
    }
    try {
      setIsSaving(true);

      // Kirim needsReview sebagai field terpisah di body request.
      // addProcedure() tidak mengenal needsReview di typenya, jadi kita panggil
      // API /api/procedures langsung agar bisa menyertakan field tersebut.
      const response = await fetch('/review-prosedur/api/procedures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProcedure,
          revisi: '0',
          needsReview, // diterima backend di body.needsReview
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 409) {
          alert('Nomor dokumen sudah ada. Silakan gunakan nomor yang berbeda.');
        } else {
          throw new Error(err.error || 'Gagal menambahkan prosedur');
        }
        return;
      }

      await loadData();
      setNewProcedure({
        namaDokumen: '', nomorDokumen: '', levelDokumen: '',
        tanggalSelesaiApproval: '', owner: '', pic: '', email: '',
      });
      setNeedsReview(null);
      setIsModalOpen(false);
      setCurrentPage(1);
      alert('Prosedur berhasil ditambahkan!');
    } catch (error: any) {
      console.error('Error saving procedure:', error);
      alert('Gagal menambahkan prosedur. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredData = useMemo(() => {
    let result = dataResolved;
    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      result = result.filter((row) =>
        row.namaDokumen.toLowerCase().includes(searchLower) ||
        row.nomorDokumen.toLowerCase().includes(searchLower)
      );
    }
    if (filterValue) result = result.filter((row) => row.status === filterValue);
    if (monthFilter !== '') {
      const selectedMonth = parseInt(monthFilter);
      result = result.filter((row) => {
        const approvalDate = new Date(row.tanggalSelesaiApproval);
        return approvalDate.getMonth() === selectedMonth;
      });
    }
    return result;
  }, [searchValue, filterValue, monthFilter, dataResolved]);

  const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);
  const startIndex = filteredData.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1;
  const endIndex   = Math.min(currentPage * ROWS_PER_PAGE, filteredData.length);
  const pageData   = filteredData.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <Header />
        <div className="max-w-[1600px] mx-auto px-8 py-8">
          <Breadcrumb />
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-3">Status Prosedur</h1>
            <p className="text-base text-slate-600 max-w-2xl">
              Memantau perkembangan review, status relevansi, dan riwayat revisi dokumen.
            </p>
          </div>
          <Controls
            searchValue={searchValue} filterValue={filterValue} monthFilter={monthFilter}
            onSearchChange={(v) => { setSearchValue(v); setCurrentPage(1); }}
            onFilterChange={(v) => { setFilterValue(v); setCurrentPage(1); }}
            onMonthFilterChange={(v) => { setMonthFilter(v); setCurrentPage(1); }}
            onAddProcedure={() => setIsModalOpen(true)}
            onOpenEmailSchedule={() => setIsEmailScheduleModalOpen(true)}
          />
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <h2 className="font-bold text-lg text-slate-900">Daftar Dokumen Prosedur</h2>
              <p className="text-xs text-slate-600 mt-1">Total: {filteredData.length} dokumen</p>
            </div>
            <ProceduresTable
              data={pageData}
              onDelete={handleDeleteProcedure}
              onDocumentClick={handleDocumentClick}
              emailSchedules={emailSchedules}
            />
            <Pagination
              currentPage={currentPage} totalPages={totalPages || 1}
              startIndex={startIndex} endIndex={endIndex} totalItems={filteredData.length}
              onPrevious={() => { if (currentPage > 1) setCurrentPage(currentPage - 1); }}
              onNext={() => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); }}
            />
          </div>
        </div>

        <AddProcedureModal
          isOpen={isModalOpen}
          onClose={() => { if (!isSaving) { setIsModalOpen(false); setNeedsReview(null); } }}
          onSave={handleSaveNewProcedure}
          value={newProcedure}
          onChange={handleNewProcedureChange}
          needsReview={needsReview}
          onNeedsReviewChange={setNeedsReview}
          isSaving={isSaving}
        />

        <DocumentModal
          isOpen={selectedDocument !== null}
          onClose={() => setSelectedDocument(null)}
          nomorDokumen={selectedDocument?.nomorDokumen || ''}
          namaDokumen={selectedDocument?.namaDokumen || ''}
        />

        {/* ✅ FIX: onClose sekarang reload KEDUA sumber data:
            - loadData()          → refresh status dokumen dari DB (dataWithStatus)
            - loadEmailSchedules() → refresh jadwal email (emailSchedules)
            Keduanya diperlukan agar resolveDisplayStatus bekerja dengan data terbaru */}
        <EmailScheduleModal
          isOpen={isEmailScheduleModalOpen}
          onClose={async () => {
            setIsEmailScheduleModalOpen(false);
            await Promise.all([loadData(), loadEmailSchedules()]);
          }}
          procedures={dataWithStatus}
          emailSchedules={emailSchedules}
        />
      </div>
    </ProtectedRoute>
  );
}