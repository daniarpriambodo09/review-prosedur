// components/admin/AdminRequestsModal.tsx
'use client';

import { useState, useMemo } from 'react';
import {
  X, Search, RefreshCw, FileText, PlusCircle,
  ExternalLink, User, Clock, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export interface AdminPICRequest {
  id:             number;
  type:           'revision' | 'new_document';
  picId:          number;
  picName:        string;
  picEmail:       string;
  nomorDokumen:   string;
  namaDokumen:    string;
  notes?:         string | null;
  requestStatus:  string;
  documentStatus: string | null;
  createdAt:      string;
}

interface AdminRequestsModalProps {
  isOpen:         boolean;
  onClose:        () => void;
  requests:       AdminPICRequest[];
  isLoading:      boolean;
  onRefresh:      () => void;
  onOpenDocument?: (nomorDokumen: string, namaDokumen: string) => void;
}

export default function AdminRequestsModal({
  isOpen,
  onClose,
  requests,
  isLoading,
  onRefresh,
  onOpenDocument,
}: AdminRequestsModalProps) {
  const [activeTab,    setActiveTab]    = useState<'all' | 'revision' | 'new_document'>('all');
  const [searchQuery,  setSearchQuery]  = useState('');

  const revisionCount = useMemo(() => requests.filter(r => r.type === 'revision').length, [requests]);
  const newDocCount   = useMemo(() => requests.filter(r => r.type === 'new_document').length, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (activeTab === 'revision' && r.type !== 'revision') return false;
      if (activeTab === 'new_document' && r.type !== 'new_document') return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        r.namaDokumen.toLowerCase().includes(q) ||
        r.nomorDokumen.toLowerCase().includes(q) ||
        r.picName.toLowerCase().includes(q) ||
        r.picEmail.toLowerCase().includes(q) ||
        (r.notes && r.notes.toLowerCase().includes(q))
      );
    });
  }, [requests, activeTab, searchQuery]);

  if (!isOpen) return null;

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 bg-gradient-to-r from-violet-50/70 via-indigo-50/40 to-slate-50 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shadow-xs">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Total Permintaan dari PIC</h2>
                <span className="text-xs bg-violet-100 text-violet-700 px-2.5 py-0.5 rounded-full font-bold">
                  {requests.length} Permintaan Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar permintaan revisi dan dokumen baru dari PIC yang menunggu tindak lanjut admin
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
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semua ({requests.length})
            </button>
            <button
              onClick={() => setActiveTab('revision')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'revision'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
              Revisi Dokumen ({revisionCount})
            </button>
            <button
              onClick={() => setActiveTab('new_document')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'new_document'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
              Dokumen Baru ({newDocCount})
            </button>
          </div>

          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari PIC, judul, nomor..."
              className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5 bg-slate-50/50">
          {isLoading ? (
            <div className="py-16 text-center text-slate-500">
              <div className="animate-spin w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-xs font-medium">Memuat permintaan PIC...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                <AlertCircle size={22} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Tidak ada permintaan aktif</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'Tidak ada permintaan yang cocok dengan kata kunci pencarian Anda.'
                  : 'Semua permintaan revisi dari PIC telah selesai ditindaklanjuti (berstatus Relevan).'}
              </p>
            </div>
          ) : (
            filteredRequests.map(req => {
              const isRevision = req.type === 'revision';
              return (
                <div
                  key={`${req.type}-${req.id}`}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Meta badges row */}
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        {isRevision ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                            Revisi Dokumen
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                            Dokumen Baru
                          </span>
                        )}

                        {req.nomorDokumen && req.nomorDokumen !== '-' && (
                          <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                            {req.nomorDokumen}
                          </span>
                        )}

                        {req.documentStatus && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Status: {req.documentStatus}
                          </span>
                        )}

                        <div className="ml-auto flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                          <Clock size={12} />
                          <span>{formatDate(req.createdAt)}</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {req.namaDokumen}
                      </h4>

                      {/* PIC info */}
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                          <User size={12} className="text-slate-500" />
                          <span>{req.picName}</span>
                          <span className="text-slate-400 font-normal">({req.picEmail})</span>
                        </div>
                      </div>

                      {/* Notes / Reason */}
                      {req.notes && (
                        <div className="mt-2.5 text-xs bg-amber-50/50 border border-amber-200/80 rounded-lg p-2.5 text-slate-700">
                          <span className="font-semibold text-amber-800 block mb-0.5">Catatan / Alasan:</span>
                          <p className="whitespace-pre-wrap">{req.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">
                      {isRevision
                        ? 'Otomatis selesai begitu dokumen di-update ke status Relevan.'
                        : 'Permintaan dokumen baru dari PIC.'}
                    </span>

                    <div className="flex items-center gap-2">
                      {isRevision && onOpenDocument && req.nomorDokumen && (
                        <button
                          onClick={() => onOpenDocument(req.nomorDokumen, req.namaDokumen)}
                          className="px-3 py-1.5 bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 rounded-lg font-semibold flex items-center gap-1.5 transition-all"
                        >
                          <FileText size={13} />
                          <span>Buka Dokumen</span>
                        </button>
                      )}

                      {isRevision && (
                        <Link
                          href={`/status-review?search=${encodeURIComponent(req.nomorDokumen)}`}
                          onClick={onClose}
                          className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg font-medium flex items-center gap-1.5 transition-all"
                        >
                          <span>Status Review</span>
                          <ExternalLink size={12} />
                        </Link>
                      )}

                      {!isRevision && (
                        <Link
                          href={`/status-review?addProcedure=true&title=${encodeURIComponent(req.namaDokumen)}&pic=${encodeURIComponent(req.picName)}&email=${encodeURIComponent(req.picEmail)}&requestId=${req.id}`}
                          onClick={onClose}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg font-semibold flex items-center gap-1.5 transition-all"
                        >
                          <PlusCircle size={13} />
                          <span>Buat Dokumen</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan {filteredRequests.length} dari {requests.length} permintaan aktif</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg transition-all"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
