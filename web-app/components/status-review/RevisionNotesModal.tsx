// components/status-review/RevisionNotesModal.tsx
//
// Card untuk mengelola riwayat "Catatan Perubahan" (record revisi) satu
// dokumen. Semua entri yang ditambahkan di sini disimpan penuh di tabel
// procedure_revision_notes — tapi yang ditampilkan di halaman terakhir PDF
// (lib/pdfLastPage.ts) hanya entri PERTAMA (Index 0) + 3 entri TERAKHIR.

'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Plus, Pencil, Trash2, FileClock, Info } from 'lucide-react';
import { useDialog } from '@/contexts/DialogContext';

interface RevisionEntry {
  id: number;
  revNo: string;
  catatanPerubahan: string; // newline-separated bullets
  tanggalSelesaiApproval: string | null;
  oleh: string | null;
  urutan: number;
}

interface RevisionNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  nomorDokumen: string;
  namaDokumen: string;
  /** Revisi dokumen saat ini — dipakai sebagai default nilai Rev No saat menambah entri baru. */
  currentRevisi?: string;
}

const EMPTY_FORM = { revNo: '', catatanPerubahan: '', tanggalSelesaiApproval: '', oleh: '' };

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Tentukan 4 baris yang akan tampil di PDF, supaya admin bisa lihat preview-nya di sini juga. */
function computeDisplayedIds(entries: RevisionEntry[]): Set<number> {
  const ids = new Set<number>();
  if (entries.length === 0) return ids;
  ids.add(entries[0].id);
  entries.slice(Math.max(0, entries.length - 3)).forEach((e) => ids.add(e.id));
  return ids;
}

export default function RevisionNotesModal({
  isOpen, onClose, nomorDokumen, namaDokumen, currentRevisi,
}: RevisionNotesModalProps) {
  const [entries, setEntries]   = useState<RevisionEntry[]>([]);
  const [loading, setLoading]   = useState(false);
  const [errored, setErrored]   = useState(false);
  const [saving, setSaving]     = useState(false);

  const [formMode, setFormMode] = useState<'closed' | 'add' | number>('closed'); // number = id yang sedang diedit
  const [form, setForm]         = useState(EMPTY_FORM);

  const loadEntries = useCallback(() => {
    if (!nomorDokumen) return;
    setLoading(true);
    setErrored(false);
    fetch(`/review-prosedur/api/procedures/${encodeURIComponent(nomorDokumen)}/revision-notes`)
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json) => setEntries(json.entries ?? []))
      .catch((err) => { console.error('Gagal memuat catatan perubahan', err); setErrored(true); })
      .finally(() => setLoading(false));
  }, [nomorDokumen]);

  useEffect(() => {
    if (isOpen) {
      loadEntries();
      setFormMode('closed');
      setForm({ ...EMPTY_FORM, revNo: currentRevisi || '' });
    }
  }, [isOpen, loadEntries, currentRevisi]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayedIds = computeDisplayedIds(entries);

  const openAddForm = () => {
    setForm({ ...EMPTY_FORM, revNo: currentRevisi || '' });
    setFormMode('add');
  };

  const openEditForm = (entry: RevisionEntry) => {
    setForm({
      revNo: entry.revNo,
      catatanPerubahan: entry.catatanPerubahan,
      tanggalSelesaiApproval: entry.tanggalSelesaiApproval ? entry.tanggalSelesaiApproval.slice(0, 10) : '',
      oleh: entry.oleh || '',
    });
    setFormMode(entry.id);
  };

  const { showConfirm, showWarning, showError, showSuccess } = useDialog();

  const handleSubmit = async () => {
    if (!form.revNo.trim() || !form.catatanPerubahan.trim()) {
      showWarning('Rev No dan Catatan Perubahan wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const isEdit = typeof formMode === 'number';
      const url = isEdit
        ? `/review-prosedur/api/procedures/${encodeURIComponent(nomorDokumen)}/revision-notes/${formMode}`
        : `/review-prosedur/api/procedures/${encodeURIComponent(nomorDokumen)}/revision-notes`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revNo: form.revNo.trim(),
          catatanPerubahan: form.catatanPerubahan.trim(),
          tanggalSelesaiApproval: form.tanggalSelesaiApproval || null,
          oleh: form.oleh.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal menyimpan');
      }
      setFormMode('closed');
      loadEntries();
      showSuccess('Catatan perubahan berhasil disimpan!');
    } catch (err: any) {
      showError(err.message || 'Gagal menyimpan catatan perubahan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry: RevisionEntry) => {
    const confirmed = await showConfirm(`Hapus catatan perubahan Rev. ${entry.revNo}?`, 'Konfirmasi Hapus');
    if (!confirmed) return;
    try {
      const res = await fetch(
        `/review-prosedur/api/procedures/${encodeURIComponent(nomorDokumen)}/revision-notes/${entry.id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal menghapus');
      }
      loadEntries();
      showSuccess('Catatan perubahan berhasil dihapus.');
    } catch (err: any) {
      showError(err.message || 'Gagal menghapus catatan perubahan');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between shrink-0">
          <div className="min-w-0 pr-3 flex items-start gap-2.5">
            <FileClock size={18} className="text-blue-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900">Catatan Perubahan (Record Revisi)</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1" title={namaDokumen}>{namaDokumen}</p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">{nomorDokumen}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Info banner */}
        <div className="mx-5 mt-4 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 text-xs text-blue-800 shrink-0">
          <Info size={14} className="shrink-0 mt-0.5" />
          <p>
            Semua entri di sini tersimpan sebagai riwayat. Yang tampil di halaman terakhir PDF dokumen
            hanya <strong>4 baris</strong>: entri <strong>pertama</strong> (ditandai <span className="font-semibold">"Index 0"</span> di bawah)
            dan <strong>3 entri terakhir</strong> (ditandai <span className="font-semibold">"Tampil di PDF"</span>).
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading && (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Memuat catatan perubahan...</p>
            </div>
          )}

          {!loading && errored && (
            <p className="text-xs text-red-500 text-center py-4">Gagal memuat data. Silakan coba lagi.</p>
          )}

          {!loading && !errored && entries.length === 0 && formMode !== 'add' && (
            <p className="text-xs text-slate-400 text-center py-6">Belum ada catatan perubahan untuk dokumen ini.</p>
          )}

          {!loading && !errored && entries.map((entry, idx) => {
            const isTampil = displayedIds.has(entry.id);
            const isFirst  = idx === 0;
            return (
              <div key={entry.id} className="border border-slate-200 rounded-xl p-3.5">
                {formMode === entry.id ? (
                  <RevisionForm form={form} setForm={setForm} onCancel={() => setFormMode('closed')} onSubmit={handleSubmit} saving={saving} />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-bold text-slate-900">Rev. {entry.revNo}</span>
                        {isFirst && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">Index 0</span>
                        )}
                        {isTampil && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Tampil di PDF</span>
                        )}
                      </div>
                      <ul className="text-xs text-slate-700 list-disc list-inside space-y-0.5">
                        {entry.catatanPerubahan.split('\n').filter(Boolean).map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        {formatDate(entry.tanggalSelesaiApproval)} · {entry.oleh || '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEditForm(entry)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all" title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(entry)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Hapus">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {formMode === 'add' && (
            <div className="border border-blue-300 bg-blue-50/40 rounded-xl p-3.5">
              <RevisionForm form={form} setForm={setForm} onCancel={() => setFormMode('closed')} onSubmit={handleSubmit} saving={saving} />
            </div>
          )}
        </div>

        {/* Footer */}
        {formMode === 'closed' && (
          <div className="px-5 py-3.5 border-t border-slate-100 shrink-0">
            <button onClick={openAddForm}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all active:scale-95">
              <Plus size={14} /> Tambah Catatan Perubahan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function RevisionForm({
  form, setForm, onCancel, onSubmit, saving,
}: {
  form: { revNo: string; catatanPerubahan: string; tanggalSelesaiApproval: string; oleh: string };
  setForm: (f: any) => void;
  onCancel: () => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  const fieldCls =
    'w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 ' +
    'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ' +
    'focus:border-transparent transition-all bg-white';

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Rev No <span className="text-red-500">*</span></label>
          <input type="text" value={form.revNo} disabled={saving}
            onChange={(e) => setForm((f: any) => ({ ...f, revNo: e.target.value }))}
            placeholder="mis. 05" className={fieldCls} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tanggal Selesai Approval</label>
          <input type="date" value={form.tanggalSelesaiApproval} disabled={saving}
            onChange={(e) => setForm((f: any) => ({ ...f, tanggalSelesaiApproval: e.target.value }))}
            className={fieldCls} />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
          Catatan Perubahan <span className="text-red-500">*</span>
          <span className="font-normal text-slate-400 ml-1">(satu poin per baris)</span>
        </label>
        <textarea rows={3} value={form.catatanPerubahan} disabled={saving}
          onChange={(e) => setForm((f: any) => ({ ...f, catatanPerubahan: e.target.value }))}
          placeholder={'Contoh:\nPerbaikan alur approval\nPenambahan lampiran'}
          className={`${fieldCls} resize-none`} />
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Oleh</label>
        <input type="text" value={form.oleh} disabled={saving}
          onChange={(e) => setForm((f: any) => ({ ...f, oleh: e.target.value }))}
          placeholder="Nama/jabatan" className={fieldCls} />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} disabled={saving}
          className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-all">
          Batal
        </button>
        <button onClick={onSubmit} disabled={saving}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50">
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </div>
  );
}