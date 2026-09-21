// components/pic/PICRequestsModal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ActiveRequest {
  id:             number;
  type:           'revision' | 'new_document';
  nomorDokumen:   string;
  namaDokumen:    string;
  notes?:         string | null;
  requestStatus:  string;
  documentStatus: string | null;
  createdAt:      string;
}

interface PICRequestsModalProps {
  isOpen:   boolean;
  onClose:  () => void;
}

export default function PICRequestsModal({ isOpen, onClose }: PICRequestsModalProps) {
  const { user } = useAuth();
  const [requests,   setRequests]   = useState<ActiveRequest[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [activeTab,  setActiveTab]  = useState<'all' | 'revision' | 'new_document'>('all');
  const [error,      setError]      = useState('');

  const fetchActiveRequests = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/review-prosedur/api/pic/requests/review?active=true', {
        headers: {
          'Content-Type': 'application/json',
          'x-pic-id':     String(user?.picId ?? user?.id ?? ''),
          'x-pic-email':  user?.email ?? '',
        },
      });

      if (!res.ok) {
        throw new Error('Gagal mengambil daftar permintaan aktif');
      }

      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [isOpen, user]);

  useEffect(() => {
    fetchActiveRequests();
  }, [fetchActiveRequests]);

  if (!isOpen) return null;

  const filteredRequests = requests.filter(r => {
    if (activeTab === 'revision') return r.type === 'revision';
    if (activeTab === 'new_document') return r.type === 'new_document';
    return true;
  });

  const revisionCount = requests.filter(r => r.type === 'revision').length;
  const newDocCount   = requests.filter(r => r.type === 'new_document').length;

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
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 to-slate-50 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Daftar Permintaan Aktif</h2>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                {requests.length} aktif
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 pl-10.5">
              Permintaan revisi dan dokumen baru yang diajukan. Otomatis selesai begitu dokumen berstatus <b>Relevan</b>.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-100 bg-white flex items-center gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Semua ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('revision')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'revision'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Revisi Dokumen ({revisionCount})
          </button>
          <button
            onClick={() => setActiveTab('new_document')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'new_document'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Dokumen Baru ({newDocCount})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <div className="animate-spin w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-xs">Memuat permintaan aktif...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {error}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-700">Tidak ada permintaan aktif</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Semua permintaan revisi telah diselesaikan atau Anda belum mengajukan permintaan baru.
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
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
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                        {req.namaDokumen}
                      </h4>

                      {req.notes && (
                        <div className="mt-2 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700">
                          <span className="font-semibold text-slate-500 block mb-0.5">Catatan / Alasan:</span>
                          <p className="whitespace-pre-wrap">{req.notes}</p>
                        </div>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 flex-shrink-0 font-medium whitespace-nowrap">
                      {formatDate(req.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Total {filteredRequests.length} item ditampilkan</span>
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
