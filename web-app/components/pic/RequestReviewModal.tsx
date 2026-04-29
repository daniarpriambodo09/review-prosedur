// app/components/pic/RequestReviewModal.tsx

'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Document {
  id:             number;
  documentNumber: string;
  title:          string;
  status:         string;
}

interface RequestReviewModalProps {
  isOpen:    boolean;
  onClose:   () => void;
  onSubmit:  (documentIds: number[]) => Promise<void>;
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'Relevan':          'bg-emerald-500',
    'Revisi':           'bg-amber-500',
    'Obsolete':         'bg-red-500',
    'Telah terkirim':   'bg-cyan-500',
    'Telah dibaca':     'bg-purple-500',
    'Belum dikirim':    'bg-orange-400',
    'Menunggu':         'bg-blue-400',
  };
  return (
    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${colors[status] ?? 'bg-slate-300'}`} />
  );
}

export default function RequestReviewModal({
  isOpen,
  onClose,
  onSubmit,
}: RequestReviewModalProps) {
  const { user } = useAuth();
  const [documents,    setDocuments]    = useState<Document[]>([]);
  const [selectedIds,  setSelectedIds]  = useState<number[]>([]);
  const [notes,        setNotes]        = useState('');
  const [isFetching,   setIsFetching]   = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState(false);

  const picHeaders = () => ({
    'Content-Type':  'application/json',
    'x-pic-id':      String(user?.picId ?? user?.id ?? ''),
    'x-pic-email':   user?.email ?? '',
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedIds([]);
      setNotes('');
      setError('');
      setSuccess(false);
      fetchDocuments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const fetchDocuments = async () => {
    setIsFetching(true);
    try {
      const res = await fetch('/api/pic/documents', { headers: picHeaders() });
      if (!res.ok) throw new Error('Gagal mengambil data dokumen');
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsFetching(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (selectedIds.length === 0) {
      setError('Pilih minimal satu dokumen');
      return;
    }

    setIsSubmitting(true);
    try {
      // documentIds berisi id dari procedure_documents
      const res = await fetch('/api/pic/requests/review', {
        method:  'POST',
        headers: picHeaders(),
        body:    JSON.stringify({ documentIds: selectedIds, notes }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal membuat permintaan review');
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        onSubmit(selectedIds);
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Minta Review Dokumen</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih dokumen yang ingin Anda minta untuk direview oleh admin
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Permintaan review berhasil dikirim! Admin akan segera meninjaunya.
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Document list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-slate-700">
                Pilih Dokumen
              </label>
              {selectedIds.length > 0 && (
                <span className="text-xs text-emerald-600 font-semibold">
                  {selectedIds.length} dipilih
                </span>
              )}
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              {isFetching ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
                  Memuat dokumen...
                </div>
              ) : documents.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  Tidak ada dokumen yang ditemukan
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                  {documents.map(doc => {
                    const isSelected = selectedIds.includes(doc.id);
                    return (
                      <label
                        key={doc.id}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(doc.id)}
                          className="mt-0.5 w-4 h-4 text-emerald-600 rounded cursor-pointer accent-emerald-600"
                        />
                        <StatusDot status={doc.status} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {doc.documentNumber}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{doc.title}</p>
                        </div>
                        <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5">
                          {doc.status}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Catatan <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Tambahkan catatan atau alasan permintaan review..."
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {selectedIds.length === 0
              ? 'Pilih minimal satu dokumen'
              : `${selectedIds.length} dokumen akan direquest review`}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-all disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedIds.length === 0}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {isSubmitting ? 'Mengirim...' : `Kirim Request (${selectedIds.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}