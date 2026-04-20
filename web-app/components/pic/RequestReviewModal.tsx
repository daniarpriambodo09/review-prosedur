'use client';
import { useState, useEffect } from 'react';

interface Document {
  id: number;
  documentNumber: string;
  title: string;
}

interface RequestReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (documentIds: number[]) => Promise<void>;
}

export default function RequestReviewModal({ isOpen, onClose, onSubmit }: RequestReviewModalProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/pic/documents');
      if (!response.ok) throw new Error('Gagal mengambil data dokumen');
      
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDocs.length === 0) {
      setError('Pilih minimal satu dokumen');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/pic/requests/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: selectedDocs, notes }),
      });

      if (!response.ok) throw new Error('Gagal membuat permintaan review');

      setSelectedDocs([]);
      setNotes('');
      onClose();
      await onSubmit(selectedDocs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Minta Review Dokumen</h2>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4">
          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Documents List */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Pilih Dokumen (Multiple Select)
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-4">
              {documents.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Tidak ada dokumen</p>
              ) : (
                documents.map((doc) => (
                  <label key={doc.id} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDocs.includes(doc.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDocs([...selectedDocs, doc.id]);
                        } else {
                          setSelectedDocs(selectedDocs.filter(id => id !== doc.id));
                        }
                      }}
                      className="mt-1 w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                    <div>
                      <p className="font-medium text-slate-900">{doc.documentNumber}</p>
                      <p className="text-sm text-slate-600">{doc.title}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
            {selectedDocs.length > 0 && (
              <p className="text-sm text-emerald-600 mt-2">
                {selectedDocs.length} dokumen dipilih
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Catatan Tambahan (Opsional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tambahkan catatan atau informasi penting"
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-all disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading || selectedDocs.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isLoading ? 'Memproses...' : 'Kirim Permintaan'}
          </button>
        </div>
      </div>
    </div>
  );
}
