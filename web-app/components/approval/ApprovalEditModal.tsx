// components/approval/ApprovalEditModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  FileEdit,
  FileSearch,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { ApprovalDocumentItem } from './ApprovalTable';

interface ApproverRow {
  nama: string;
  email: string;
}

interface ApprovalEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ApprovalDocumentItem | null;
  onSaved: () => void;
}

export default function ApprovalEditModal({
  isOpen,
  onClose,
  document: doc,
  onSaved,
}: ApprovalEditModalProps) {
  const [namaDokumen, setNamaDokumen] = useState('');
  const [preparedApprovers, setPreparedApprovers] = useState<ApproverRow[]>([]);
  const [checkedApprovers, setCheckedApprovers] = useState<ApproverRow[]>([]);
  const [approvedApprovers, setApprovedApprovers] = useState<ApproverRow[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Inisialisasi form dari document yang dipilih
  useEffect(() => {
    if (!doc || !isOpen) return;

    setNamaDokumen(doc.namaDokumen || '');

    const mapApprovers = (list: any[]): ApproverRow[] => {
      if (!list || list.length === 0) return [{ nama: '', email: '' }];
      return list.map(a => ({
        nama: a.nama || '',
        email: a.email || '',
      }));
    };

    setPreparedApprovers(mapApprovers(doc.stages.prepared.approvers));
    setCheckedApprovers(mapApprovers(doc.stages.checked.approvers));
    setApprovedApprovers(mapApprovers(doc.stages.approved.approvers));
    setError(null);
    setSuccessMsg(null);
  }, [doc, isOpen]);

  // Tutup dengan Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, saving, onClose]);

  if (!isOpen || !doc) return null;

  // Helpers manipulasi baris approver
  const updateRow = (
    role: 'prepared' | 'checked' | 'approved',
    idx: number,
    field: 'nama' | 'email',
    val: string
  ) => {
    const setter =
      role === 'prepared'
        ? setPreparedApprovers
        : role === 'checked'
        ? setCheckedApprovers
        : setApprovedApprovers;

    setter(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const addRow = (role: 'prepared' | 'checked' | 'approved') => {
    const setter =
      role === 'prepared'
        ? setPreparedApprovers
        : role === 'checked'
        ? setCheckedApprovers
        : setApprovedApprovers;

    setter(prev => [...prev, { nama: '', email: '' }]);
  };

  const removeRow = (role: 'prepared' | 'checked' | 'approved', idx: number) => {
    const setter =
      role === 'prepared'
        ? setPreparedApprovers
        : role === 'checked'
        ? setCheckedApprovers
        : setApprovedApprovers;

    setter(prev => {
      const filtered = prev.filter((_, i) => i !== idx);
      return filtered.length > 0 ? filtered : [{ nama: '', email: '' }];
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaDokumen.trim()) {
      setError('Nama dokumen wajib diisi.');
      return;
    }

    // Validasi email
    const filterValid = (list: ApproverRow[]) =>
      list.filter(a => a.email && a.email.trim());

    const validPrepared = filterValid(preparedApprovers);
    const validChecked = filterValid(checkedApprovers);
    const validApproved = filterValid(approvedApprovers);

    if (validPrepared.length === 0) {
      setError('Approver Prepared wajib diisi minimal 1 email.');
      return;
    }
    if (validChecked.length === 0) {
      setError('Approver Checked wajib diisi minimal 1 email.');
      return;
    }
    if (validApproved.length === 0) {
      setError('Approver Approved wajib diisi minimal 1 email.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const res = await fetch('/review-prosedur/api/approval-dokumen', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomorDokumen: doc.nomorDokumen,
          namaDokumen: namaDokumen.trim(),
          approvers: {
            prepared: validPrepared,
            checked: validChecked,
            approved: validApproved,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan perubahan approval.');
      }

      setSuccessMsg('Perubahan nama dokumen dan approver berhasil disimpan!');
      setTimeout(() => {
        onSaved();
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Error saving approval details:', err);
      setError(err?.message || 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* ── Modal Header ── */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Edit Approval Dokumen
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Edit Nama Dokumen & Ketiga Approver
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sesuaikan nama dokumen dan susunan approver untuk tahap Prepared, Checked, dan Approved.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-50"
            title="Tutup Modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Modal Body (Form) ── */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-800">
              <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Nama Dokumen & Nomor Dokumen */}
          <div className="space-y-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-200/70">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nama Dokumen <span className="text-red-500">*</span>
              </label>
              <textarea
                value={namaDokumen}
                onChange={e => setNamaDokumen(e.target.value)}
                rows={2}
                disabled={saving}
                className="w-full text-sm font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                placeholder="Masukkan nama dokumen prosedur..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Nomor Dokumen (Identitas Dokumen)
              </label>
              <span className="inline-block px-3 py-1.5 rounded-lg bg-slate-200/80 font-mono text-xs font-bold text-slate-800">
                {doc.nomorDokumen}
              </span>
            </div>
          </div>

          {/* Section 2: Ketiga Approval (Prepared, Checked, Approved) */}
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Daftar Ketiga Approver
            </h3>

            {/* 1. Prepared Approvers */}
            <div className="border border-blue-200/80 rounded-2xl p-4 bg-blue-50/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <FileEdit size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-blue-900">
                      1. Approver Prepared (Pembuat Dokumen) <span className="text-red-500">*</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">Pihak yang menyiapkan atau menyusun dokumen</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => addRow('prepared')}
                  disabled={saving}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs hover:bg-blue-50 transition-colors"
                >
                  <Plus size={13} />
                  <span>Tambah Approver</span>
                </button>
              </div>

              <div className="space-y-2">
                {preparedApprovers.map((item, idx) => (
                  <div key={`prep-${idx}`} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.nama}
                      onChange={e => updateRow('prepared', idx, 'nama', e.target.value)}
                      placeholder="Nama Lengkap"
                      disabled={saving}
                      className="w-2/5 text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <input
                      type="email"
                      value={item.email}
                      onChange={e => updateRow('prepared', idx, 'email', e.target.value)}
                      placeholder="Email Approver (wajib)"
                      disabled={saving}
                      className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeRow('prepared', idx)}
                      disabled={saving || preparedApprovers.length === 1}
                      className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Hapus baris"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Checked Approvers */}
            <div className="border border-amber-200/80 rounded-2xl p-4 bg-amber-50/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <FileSearch size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">
                      2. Approver Checked (Pemeriksa Dokumen) <span className="text-red-500">*</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">Pihak yang memverifikasi isi dokumen</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => addRow('checked')}
                  disabled={saving}
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-800 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs hover:bg-amber-50 transition-colors"
                >
                  <Plus size={13} />
                  <span>Tambah Approver</span>
                </button>
              </div>

              <div className="space-y-2">
                {checkedApprovers.map((item, idx) => (
                  <div key={`chk-${idx}`} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.nama}
                      onChange={e => updateRow('checked', idx, 'nama', e.target.value)}
                      placeholder="Nama Lengkap"
                      disabled={saving}
                      className="w-2/5 text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                    <input
                      type="email"
                      value={item.email}
                      onChange={e => updateRow('checked', idx, 'email', e.target.value)}
                      placeholder="Email Approver (wajib)"
                      disabled={saving}
                      className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeRow('checked', idx)}
                      disabled={saving || checkedApprovers.length === 1}
                      className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Hapus baris"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Approved Approvers */}
            <div className="border border-emerald-200/80 rounded-2xl p-4 bg-emerald-50/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <ShieldCheck size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">
                      3. Approver Approved (Penyetuju Akhir) <span className="text-red-500">*</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">Pihak otorisasi / manajemen tingkat akhir</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => addRow('approved')}
                  disabled={saving}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs hover:bg-emerald-50 transition-colors"
                >
                  <Plus size={13} />
                  <span>Tambah Approver</span>
                </button>
              </div>

              <div className="space-y-2">
                {approvedApprovers.map((item, idx) => (
                  <div key={`appr-${idx}`} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.nama}
                      onChange={e => updateRow('approved', idx, 'nama', e.target.value)}
                      placeholder="Nama Lengkap"
                      disabled={saving}
                      className="w-2/5 text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <input
                      type="email"
                      value={item.email}
                      onChange={e => updateRow('approved', idx, 'email', e.target.value)}
                      placeholder="Email Approver (wajib)"
                      disabled={saving}
                      className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeRow('approved', idx)}
                      disabled={saving || approvedApprovers.length === 1}
                      className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Hapus baris"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Modal Footer ── */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />}
              <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
