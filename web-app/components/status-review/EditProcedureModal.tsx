// components/status-review/EditProcedureModal.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ProcedureDocument } from '@/data/procedures/all-procedures';

interface EditProcedureModalProps {
  isOpen: boolean;
  onClose: () => void;
  procedure: ProcedureDocument | null;
  onSaved: () => void;
}

interface EditValues {
  namaDokumen: string;
  nomorDokumen: string;
  levelDokumen: string;
  tanggalSelesaiApproval: string;
  revisi: string;
  owner: string;
  pic: string;
  email: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Approvers (Prepared / Checked / Approved) — 🆕 BARU
// ─────────────────────────────────────────────────────────────────────────────
type ApproverRole = 'prepared' | 'checked' | 'approved';
interface ApproverRow { nama: string; email: string; }
interface ApproverState {
  prepared: ApproverRow[];
  checked:  ApproverRow[];
  approved: ApproverRow[];
}

const emptyApproverRow = (): ApproverRow => ({ nama: '', email: '' });
const emptyApproverState = (): ApproverState => ({
  prepared: [emptyApproverRow()],
  checked:  [emptyApproverRow()],
  approved: [emptyApproverRow()],
});

const APPROVER_ROLE_LABEL: Record<ApproverRole, string> = {
  prepared: 'Prepared', checked: 'Checked', approved: 'Approved',
};

// ─────────────────────────────────────────────────────────────────────────────
// AutoResizeTextarea
// Textarea yang tingginya mengikuti konten secara otomatis.
// Teknik: reset height ke 'auto' setiap render, lalu set ke scrollHeight.
// maxRows membatasi tinggi maksimum; setelah itu scroll muncul.
// ─────────────────────────────────────────────────────────────────────────────
interface AutoResizeTextareaProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minRows?: number;
  maxRows?: number;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  disabled,
  className = '',
  minRows = 1,
  maxRows = 6,
  inputRef: externalRef,
}: AutoResizeTextareaProps) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const ref = externalRef ?? internalRef;

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';                          // collapse dulu
    const style      = getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight) || 20;
    const paddingY   = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const minH       = lineHeight * minRows + paddingY;
    const maxH       = lineHeight * maxRows + paddingY;
    const newH       = Math.min(Math.max(el.scrollHeight, minH), maxH);
    el.style.height     = `${newH}px`;  
    el.style.overflowY  = el.scrollHeight > maxH ? 'auto' : 'hidden';
  }, [minRows, maxRows, ref]);

  // Re-run resize setiap kali value berubah (termasuk saat prefill)
  useEffect(() => { resize(); }, [value, resize]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={minRows}
      onChange={e => onChange(e.target.value)}
      onInput={resize}
      placeholder={placeholder}
      disabled={disabled}
      className={`resize-none leading-relaxed ${className}`}
      style={{ overflowY: 'hidden' }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared styling untuk semua field (input & textarea)
// ─────────────────────────────────────────────────────────────────────────────
const fieldCls =
  'w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ' +
  'focus:border-transparent transition-all disabled:opacity-60 disabled:bg-slate-50 ' +
  'hover:border-slate-400 bg-white';

// Versi fieldCls TANPA 'w-full' — dipakai untuk input di dalam flex row
// (mis. baris Prepared/Checked/Approved) supaya class lebar (w-2/5, flex-1)
// tidak bentrok dengan w-full. Kalau w-full dan flex-1 sama-sama ada di satu
// input, urutan generate CSS Tailwind tidak dijamin w-full kalah — jadi bisa
// bikin input jadi sangat sempit (ini bug yang sempat terjadi sebelumnya).
const fieldClsFlex = fieldCls.replace('w-full ', '');

// ─────────────────────────────────────────────────────────────────────────────
// EditProcedureModal
// ─────────────────────────────────────────────────────────────────────────────
export default function EditProcedureModal({
  isOpen,
  onClose,
  procedure,
  onSaved,
}: EditProcedureModalProps) {
  const [values,   setValues]   = useState<EditValues>({
    namaDokumen: '', nomorDokumen: '', levelDokumen: '',
    tanggalSelesaiApproval: '', revisi: '0', owner: '', pic: '', email: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error,    setError]    = useState('');
  const [visible,  setVisible]  = useState(false);

  // 🆕 BARU: state untuk daftar prepared/checked/approved
  const [approvers,        setApprovers]        = useState<ApproverState>(emptyApproverState());
  const [approversLoading, setApproversLoading]  = useState(false);

  const firstFieldRef = useRef<HTMLTextAreaElement>(null);

  // Prefill form saat procedure berubah
  useEffect(() => {
    if (procedure) {
      setValues({
        namaDokumen:            procedure.namaDokumen,
        nomorDokumen:           procedure.nomorDokumen,
        levelDokumen:           procedure.levelDokumen,
        tanggalSelesaiApproval: procedure.tanggalSelesaiApproval?.slice(0, 10) ?? '',
        revisi:                 String(procedure.revisi ?? '0'),
        owner:                  procedure.owner,
        pic:                    procedure.pic,
        email:                  procedure.email ?? '',
      });
      setError('');
    }
  }, [procedure]);

  // 🆕 BARU: load daftar prepared/checked/approved saat procedure berubah
  useEffect(() => {
    if (!procedure) { setApprovers(emptyApproverState()); return; }
    let cancelled = false;
    setApproversLoading(true);
    fetch(`/review-prosedur/api/procedures/${encodeURIComponent(procedure.nomorDokumen)}/approvers`)
      .then(res => res.json())
      .then((data: { prepared: any[]; checked: any[]; approved: any[] }) => {
        if (cancelled) return;
        setApprovers({
          prepared: data.prepared?.length
            ? data.prepared.map(a => ({ nama: a.nama || '', email: a.email }))
            : [emptyApproverRow()],
          checked: data.checked?.length
            ? data.checked.map(a => ({ nama: a.nama || '', email: a.email }))
            : [emptyApproverRow()],
          approved: data.approved?.length
            ? data.approved.map(a => ({ nama: a.nama || '', email: a.email }))
            : [emptyApproverRow()],
        });
      })
      .catch(() => { if (!cancelled) setApprovers(emptyApproverState()); })
      .finally(() => { if (!cancelled) setApproversLoading(false); });
    return () => { cancelled = true; };
  }, [procedure]);

  // 🆕 BARU: helper untuk manipulasi baris approver
  const updateApprover = (role: ApproverRole, idx: number, field: keyof ApproverRow, val: string) => {
    setApprovers(prev => {
      const list = [...prev[role]];
      list[idx] = { ...list[idx], [field]: val };
      return { ...prev, [role]: list };
    });
  };
  const addApproverRow = (role: ApproverRole) => {
    setApprovers(prev => ({ ...prev, [role]: [...prev[role], emptyApproverRow()] }));
  };
  const removeApproverRow = (role: ApproverRole, idx: number) => {
    setApprovers(prev => {
      const list = prev[role].filter((_, i) => i !== idx);
      return { ...prev, [role]: list.length ? list : [emptyApproverRow()] };
    });
  };

  // Animasi buka / tutup
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      setTimeout(() => firstFieldRef.current?.focus(), 120);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  // Tutup dengan Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, isSaving, onClose]);

  const change = (field: keyof EditValues, val: string) => {
    setValues(prev => ({ ...prev, [field]: val }));
    setError('');
  };

  const validate = () => {
    if (!values.namaDokumen.trim())     return 'Nama Dokumen wajib diisi.';
    if (!values.nomorDokumen.trim())    return 'Nomor Dokumen wajib diisi.';
    if (!values.levelDokumen.trim())    return 'Level Dokumen wajib diisi.';
    if (!values.tanggalSelesaiApproval) return 'Tanggal Selesai Approval wajib diisi.';
    if (!values.owner.trim())           return 'Owner wajib diisi.';
    if (!values.pic.trim())             return 'PIC wajib diisi.';
    return '';
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    if (!procedure) return;

    try {
      setIsSaving(true);
      setError('');
      const originalNomor = procedure.nomorDokumen;
      const nomorBerubah  = values.nomorDokumen.trim() !== originalNomor.trim();

      const res = await fetch(
        `/review-prosedur/api/procedures/${encodeURIComponent(originalNomor)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            namaDokumen:            values.namaDokumen,
            ...(nomorBerubah && { nomorDokumenBaru: values.nomorDokumen }),
            levelDokumen:           values.levelDokumen,
            tanggalSelesaiApproval: values.tanggalSelesaiApproval,
            revisi:                 values.revisi,
            owner:                  values.owner,
            pic:                    values.pic,
            email:                  values.email,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Gagal menyimpan perubahan.');
        return;
      }

      // 🆕 BARU: simpan daftar prepared/checked/approved.
      // Nomor dokumen final dipakai (kalau nomor berubah, endpoint approvers
      // memakai nomor BARU karena PATCH di atas sudah commit perubahan nomor).
      const finalNomor = values.nomorDokumen.trim();
      const approversRes = await fetch(
        `/review-prosedur/api/procedures/${encodeURIComponent(finalNomor)}/approvers`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prepared: approvers.prepared.filter(a => a.email.trim()),
            checked:  approvers.checked.filter(a => a.email.trim()),
            approved: approvers.approved.filter(a => a.email.trim()),
          }),
        }
      );
      if (!approversRes.ok) {
        // Data utama sudah tersimpan; approver gagal disimpan tidak membatalkan
        // perubahan utama, tapi tetap diberitahukan ke admin.
        setError('Data prosedur tersimpan, tapi gagal menyimpan data prepared/checked/approved. Silakan coba edit lagi.');
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError('Gagal menyimpan perubahan. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen && !visible) return null;

  // Change indicator
  const labelMap: Record<keyof EditValues, string> = {
    namaDokumen: 'Nama', nomorDokumen: 'Nomor', levelDokumen: 'Level',
    tanggalSelesaiApproval: 'Tanggal', revisi: 'Revisi',
    owner: 'Owner', pic: 'PIC', email: 'Email',
  };
  const changedFields = procedure
    ? (Object.keys(values) as (keyof EditValues)[]).filter(key => {
        const orig = key === 'tanggalSelesaiApproval'
          ? (procedure.tanggalSelesaiApproval?.slice(0, 10) ?? '')
          : String((procedure as any)[key] ?? '');
        return values[key] !== orig;
      })
    : [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{
          backgroundColor: `rgba(0,0,0,${visible ? 0.5 : 0})`,
          backdropFilter:  `blur(${visible ? 4 : 0}px)`,
          transition: 'background-color 200ms ease, backdrop-filter 200ms ease',
        }}
        onClick={() => { if (!isSaving) onClose(); }}
      />

      {/* Modal panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl pointer-events-auto
                     flex flex-col overflow-hidden"
          style={{
            maxHeight: '90vh',
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
            opacity:   visible ? 1 : 0,
            transition: 'transform 220ms cubic-bezier(.34,1.56,.64,1), opacity 200ms ease',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="px-6 py-5 bg-gradient-to-r from-blue-50 via-blue-100 to-slate-50
                          border-b border-slate-200 flex items-start justify-between flex-shrink-0">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor"
                    viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Edit Prosedur</h3>
              </div>
              {procedure && (
                <p className="text-xs text-slate-500 ml-10">
                  <span className="font-mono font-semibold text-slate-600">
                    {procedure.nomorDokumen}
                  </span>
                  {' · '}perubahan tidak dapat dibatalkan setelah disimpan
                </p>
              )}
            </div>
            <button
              onClick={() => { if (!isSaving) onClose(); }}
              disabled={isSaving}
              className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400
                         hover:text-slate-600 hover:bg-slate-200 transition-all flex-shrink-0
                         disabled:opacity-40"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor"
                viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 grid grid-cols-2 gap-4">

              {/* Nama Dokumen — textarea auto-resize, full width */}
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Nama Dokumen <span className="text-red-500">*</span>
                </label>
                <AutoResizeTextarea
                  inputRef={firstFieldRef}
                  value={values.namaDokumen}
                  onChange={v => change('namaDokumen', v)}
                  placeholder="Masukkan nama dokumen"
                  disabled={isSaving}
                  minRows={1}
                  maxRows={5}
                  className={fieldCls}
                />
              </div>

              {/* Nomor Dokumen */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Nomor Dokumen <span className="text-red-500">*</span>
                </label>
                <AutoResizeTextarea
                  value={values.nomorDokumen}
                  onChange={v => change('nomorDokumen', v)}
                  placeholder="Masukkan nomor dokumen"
                  disabled={isSaving}
                  minRows={1}
                  maxRows={2}
                  className={fieldCls}
                />
              </div>

              {/* Level Dokumen */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Level Dokumen <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={values.levelDokumen}
                  onChange={e => change('levelDokumen', e.target.value)}
                  placeholder="Masukkan level"
                  disabled={isSaving}
                  className={fieldCls}
                />
              </div>

              {/* Tanggal Selesai Approval */}
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Tanggal Selesai Approval <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={values.tanggalSelesaiApproval}
                  onChange={e => change('tanggalSelesaiApproval', e.target.value)}
                  disabled={isSaving}
                  className={fieldCls}
                />
              </div>

              {/* Revisi */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Revisi
                </label>
                <input
                  type="text"
                  value={values.revisi}
                  onChange={e => change('revisi', e.target.value)}
                  placeholder="0"
                  disabled={isSaving}
                  className={fieldCls}
                />
              </div>

              {/* Owner — textarea: nama unit/orang bisa panjang */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Owner <span className="text-red-500">*</span>
                </label>
                <AutoResizeTextarea
                  value={values.owner}
                  onChange={v => change('owner', v)}
                  placeholder="Masukkan owner"
                  disabled={isSaving}
                  minRows={1}
                  maxRows={3}
                  className={fieldCls}
                />
              </div>

              {/* PIC */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  PIC <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={values.pic}
                  onChange={e => change('pic', e.target.value)}
                  placeholder="Masukkan PIC"
                  disabled={isSaving}
                  className={fieldCls}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Email
                </label>
                <AutoResizeTextarea
                  value={values.email}
                  onChange={v => change('email', v)}
                  placeholder="Masukkan email"
                  disabled={isSaving}
                  minRows={1}
                  maxRows={3}
                  className={fieldCls}
                />
              </div>

              {/* ── Prepared / Checked / Approved — 🆕 BARU ────────────────── */}
              <div className="col-span-2 border-t border-slate-200 pt-5 mt-1">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h4 className="text-sm font-semibold text-slate-700">Prepared / Checked / Approved</h4>
                  {approversLoading && (
                    <span className="text-xs text-slate-400">memuat...</span>
                  )}
                </div>

                <div className="space-y-5">
                  {(['prepared', 'checked', 'approved'] as ApproverRole[]).map(role => (
                    <div key={role}>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        {APPROVER_ROLE_LABEL[role]}
                      </label>
                      <div className="space-y-2">
                        {approvers[role].map((row, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <input
                              type="text"
                              value={row.nama}
                              placeholder="Nama (opsional)"
                              disabled={isSaving || approversLoading}
                              onChange={e => updateApprover(role, idx, 'nama', e.target.value)}
                              className={`${fieldClsFlex} w-2/5`}
                            />
                            <input
                              type="email"
                              value={row.email}
                              placeholder="Masukkan email"
                              disabled={isSaving || approversLoading}
                              onChange={e => updateApprover(role, idx, 'email', e.target.value)}
                              className={`${fieldClsFlex} flex-1 min-w-0`}
                            />
                            <button
                              type="button"
                              onClick={() => removeApproverRow(role, idx)}
                              disabled={isSaving || approversLoading}
                              title="Hapus baris"
                              className="px-2.5 py-2.5 text-red-400 hover:text-red-600 hover:bg-red-50
                                         rounded-lg transition-all disabled:opacity-40 flex-shrink-0"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => addApproverRow(role)}
                        disabled={isSaving || approversLoading}
                        className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800
                                   hover:underline transition-all disabled:opacity-40"
                      >
                        + Tambah {APPROVER_ROLE_LABEL[role].toLowerCase()}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Change indicator */}
              {changedFields.length > 0 && (
                <div className="col-span-2 pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-slate-400 mr-0.5">Perubahan:</span>
                    {changedFields.map(key => (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50
                                   border border-amber-200 text-amber-700 rounded text-xs font-medium"
                      >
                        ✎ {labelMap[key]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Error banner */}
            {error && (
              <div className="mx-6 mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg
                              flex items-start gap-2.5">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none"
                  stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                </svg>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}
          </div>

          {/* ── Footer — always visible ── */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center
                          justify-between flex-shrink-0">
            <p className="text-xs text-slate-500">
              <span className="text-red-500">*</span> wajib diisi
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { if (!isSaving) onClose(); }}
                disabled={isSaving}
                className="px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200
                           rounded-lg transition-all active:scale-95 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm
                           font-semibold rounded-lg transition-all hover:shadow-md active:scale-95
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg"
                      fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor"
                      viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}