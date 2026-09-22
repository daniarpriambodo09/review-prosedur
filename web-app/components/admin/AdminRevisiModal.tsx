// components/admin/AdminRevisiModal.tsx
'use client';

import { useState, useMemo } from 'react';
import {
  X, Search, RefreshCw, FileText, CheckCircle2,
  ExternalLink, User, Building2, Calendar, AlertCircle,
  Clock, Check
} from 'lucide-react';
import Link from 'next/link';
import type { ProcedureDocument } from '@/data/procedures/all-procedures';

interface AdminRevisiModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: ProcedureDocument[];
  allDocuments?: ProcedureDocument[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onOpenDocument?: (nomorDokumen: string, namaDokumen: string) => void;
  onMarkAsRelevan?: (nomorDokumen: string, revisi: string) => Promise<void>;
  selectedMonthName: string;
  selectedYear: number;
}

export default function AdminRevisiModal({
  isOpen,
  onClose,
  documents,
  allDocuments = [],
  isLoading,
  onRefresh,
  onOpenDocument,
  onMarkAsRelevan,
  selectedMonthName,
  selectedYear,
}: AdminRevisiModalProps) {
  const [activeTab, setActiveTab] = useState<'month' | 'all'>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [markingDoc, setMarkingDoc] = useState<string | null>(null);
  const [confirmRelevanDoc, setConfirmRelevanDoc] = useState<ProcedureDocument | null>(null);

  const currentDocs = activeTab === 'month' ? documents : allDocuments;

  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return currentDocs;
    const q = searchQuery.toLowerCase().trim();
    return currentDocs.filter(doc =>
      doc.nomorDokumen.toLowerCase().includes(q) ||
      doc.namaDokumen.toLowerCase().includes(q) ||
      (doc.pic && doc.pic.toLowerCase().includes(q)) ||
      (doc.email && doc.email.toLowerCase().includes(q)) ||
      (doc.owner && doc.owner.toLowerCase().includes(q))
    );
  }, [currentDocs, searchQuery]);

  if (!isOpen) return null;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleConfirmMarkAsRelevan = async () => {
    if (!confirmRelevanDoc || !onMarkAsRelevan) return;
    try {
      setMarkingDoc(confirmRelevanDoc.nomorDokumen);
      await onMarkAsRelevan(confirmRelevanDoc.nomorDokumen, String(confirmRelevanDoc.revisi || '0'));
      setConfirmRelevanDoc(null);
    } catch (err) {
      console.error('Gagal mengubah status:', err);
      alert('Gagal mengubah status menjadi Relevan. Silakan coba lagi.');
    } finally {
      setMarkingDoc(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-slate-50 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
              <RefreshCw size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Detail Dokumen Perlu Revisi</h2>
                <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold">
                  {currentDocs.length} Dokumen
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar dokumen berstatus Revisi yang membutuhkan perubahan dokumen dan verifikasi ulang
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Perbarui data"
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter bar & Search */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'month'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Periode {selectedMonthName} {selectedYear} ({documents.length})
            </button>
            {allDocuments.length > 0 && (
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>Semua Periode ({allDocuments.length})</span>
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nomor, judul, PIC, owner..."
              className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* List of Documents */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5 bg-slate-50/50">
          {isLoading ? (
            <div className="py-16 text-center text-slate-500">
              <div className="animate-spin w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-xs font-medium">Memuat data dokumen revisi...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                {searchQuery ? 'Tidak ada dokumen yang cocok' : 'Semua dokumen relevan!'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `Tidak ada dokumen revisi yang sesuai dengan kata kunci "${searchQuery}".`
                  : `Tidak ada dokumen yang berstatus Perlu Revisi pada ${activeTab === 'month' ? `periode ${selectedMonthName} ${selectedYear}` : 'sistem'}.`}
              </p>
            </div>
          ) : (
            filteredDocs.map(doc => {
              const isMarking = markingDoc === doc.nomorDokumen;

              return (
                <div
                  key={doc.nomorDokumen}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-amber-200 hover:shadow-xs transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Meta badges row */}
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                          <RefreshCw size={11} className="text-amber-700" />
                          Perlu Revisi
                        </span>

                        <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                          {doc.nomorDokumen}
                        </span>

                        {doc.levelDokumen && (
                          <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            Level {doc.levelDokumen}
                          </span>
                        )}

                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                          Rev. {doc.revisi || '0'}
                        </span>

                        <div className="ml-auto flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                          <Calendar size={12} />
                          <span>Approval: {formatDate(doc.tanggalSelesaiApproval)}</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {doc.namaDokumen}
                      </h4>

                      {/* PIC and Owner information */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 flex-wrap">
                        {doc.pic && (
                          <div className="flex items-center gap-1.5 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                            <User size={12} className="text-slate-500" />
                            <span>{doc.pic}</span>
                            {doc.email && (
                              <span className="text-slate-400 font-normal">({doc.email})</span>
                            )}
                          </div>
                        )}

                        {doc.owner && (
                          <div className="flex items-center gap-1.5 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                            <Building2 size={12} className="text-slate-500" />
                            <span>{doc.owner}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs flex-wrap gap-2">
                    <span className="text-slate-400 text-[11px]">
                      Akan otomatis berkurang dari daftar saat status berubah menjadi Relevan.
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Tombol Buka Dokumen */}
                      {onOpenDocument && (
                        <button
                          onClick={() => onOpenDocument(doc.nomorDokumen, doc.namaDokumen)}
                          className="px-3 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-lg font-semibold flex items-center gap-1.5 transition-all"
                        >
                          <FileText size={13} />
                          <span>Buka Dokumen</span>
                        </button>
                      )}

                      {/* Tombol Tandai Relevan */}
                      {onMarkAsRelevan && (
                        <button
                          onClick={() => setConfirmRelevanDoc(doc)}
                          disabled={isMarking}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                        >
                          <CheckCircle2 size={13} />
                          <span>Tandai Relevan</span>
                        </button>
                      )}

                      {/* Link ke Status Review */}
                      <Link
                        href={`/status-review?search=${encodeURIComponent(doc.nomorDokumen)}`}
                        onClick={onClose}
                        className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg font-medium flex items-center gap-1.5 transition-all"
                      >
                        <span>Status Review</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan {filteredDocs.length} dari {currentDocs.length} dokumen perlu revisi</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg transition-all"
          >
            Tutup
          </button>
        </div>

      </div>

      {/* Modal Konfirmasi Ubah Status ke Relevan */}
      {confirmRelevanDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-emerald-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Ubah Menjadi Relevan?</h3>
                <p className="text-xs text-slate-500 font-mono">{confirmRelevanDoc.nomorDokumen}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Apakah Anda yakin ingin menandai dokumen <b className="text-slate-900">{confirmRelevanDoc.namaDokumen}</b> sebagai <span className="text-emerald-700 font-semibold">Relevan</span>? Dokumen akan selesai dari alur revisi dan jumlah Perlu Revisi akan berkurang.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmRelevanDoc(null)}
                disabled={markingDoc !== null}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmMarkAsRelevan}
                disabled={markingDoc !== null}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {markingDoc ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Ya, Tandai Relevan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
