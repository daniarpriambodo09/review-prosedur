// components/approval/ApprovalEditModal.tsx
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  X,
  Plus,
  Trash2,
  FileEdit,
  FileSearch,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  User,
  Sparkles,
  ChevronDown,
  Search,
  Clock,
} from 'lucide-react';
import { ApprovalDocumentItem } from './ApprovalTable';

interface ApproverRow {
  nama: string;
  email: string;
}

interface StaffOption {
  kode: string;
  nama: string;
  email: string;
  jabatan?: string | null;
  jabatan_raw?: string | null;
  unit_nama?: string | null;
  department_nama?: string | null;
}

interface ApprovalEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ApprovalDocumentItem | null;
  onSaved: () => void;
}

/**
 * Komponen Input Manual + Dropdown Sugesti Staff
 * - User dapat mengetik manual untuk memfilter nama / email dengan cepat.
 * - Memilih opsi dari dropdown akan langsung mengisi otomatis NAMA dan EMAIL.
 * - Jika nama yang diketik tidak ada di database staff, tampilkan notifikasi
 *   bahwa admin perlu menambahkannya di halaman Kelola Departemen.
 */
function ApproverInputCombobox({
  nama,
  email,
  onUpdateNama,
  onUpdateEmail,
  onSelectStaff,
  onRemove,
  canRemove,
  disabled,
  staffList,
}: {
  nama: string;
  email: string;
  onUpdateNama: (val: string) => void;
  onUpdateEmail: (val: string) => void;
  onSelectStaff: (staff: StaffOption) => void;
  onRemove: () => void;
  canRemove: boolean;
  disabled: boolean;
  staffList: StaffOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Tutup dropdown jika klik di luar area
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Urutkan semua staff berdasarkan nama secara alfabetis
  const sortedStaffList = useMemo(() => {
    return [...staffList].sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
  }, [staffList]);

  // Filter staff: jika search kosong, tampilkan SEMUA staff (tidak dibatasi slice)
  const filteredStaff = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return sortedStaffList;
    return sortedStaffList.filter(s =>
      (s.nama && s.nama.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.kode && s.kode.toLowerCase().includes(q)) ||
      (s.jabatan && s.jabatan.toLowerCase().includes(q)) ||
      (s.unit_nama && s.unit_nama.toLowerCase().includes(q)) ||
      (s.department_nama && s.department_nama.toLowerCase().includes(q))
    );
  }, [sortedStaffList, searchTerm]);

  // Periksa apakah approver terdaftar di daftar staff (berdasarkan email atau nama)
  const isRegistered = useMemo(() => {
    const trimmedNama = (nama || '').trim().toLowerCase();
    const trimmedEmail = (email || '').trim().toLowerCase();

    // Jika belum ada input nama dan email, jangan tampilkan warning
    if (!trimmedNama && !trimmedEmail) return true;

    // Jika daftar staff belum selesai dimuat, jangan tampilkan warning semu
    if (staffList.length === 0) return true;

    // 1. Cek kecocokan Email (identifier unik dan akurat di database staff)
    if (trimmedEmail) {
      const matchEmail = staffList.some(
        s => (s.email || '').trim().toLowerCase() === trimmedEmail
      );
      if (matchEmail) return true;
    }

    // 2. Cek kecocokan Nama
    if (trimmedNama) {
      // 2a. Nama persis sama
      const matchExactNama = staffList.some(
        s => (s.nama || '').trim().toLowerCase() === trimmedNama
      );
      if (matchExactNama) return true;

      // 2b. Nama dasar (membersihkan kode kurung / inisial seperti "(DP)", "(M. PENS)", dsb)
      const cleanInputNama = trimmedNama.replace(/\s*\([^)]*\)/g, '').trim();

      const matchBaseNama = staffList.some(s => {
        const cleanSNama = (s.nama || '').toLowerCase().replace(/\s*\([^)]*\)/g, '').trim();
        if (!cleanSNama || !cleanInputNama) return false;

        // Sama persis nama bersihnya
        if (cleanSNama === cleanInputNama) return true;

        // Salah satu memuat yang lain jika panjang kata memadai (>= 4 huruf)
        if (
          cleanSNama.length >= 4 &&
          cleanInputNama.length >= 4 &&
          (cleanInputNama.includes(cleanSNama) || cleanSNama.includes(cleanInputNama))
        ) {
          return true;
        }

        return false;
      });

      if (matchBaseNama) return true;
    }

    return false;
  }, [staffList, nama, email]);

  const handleOpenDropdown = () => {
    if (disabled) return;
    setSearchTerm('');
    setIsOpen(true);
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <div className="flex items-center gap-2">
        {/* Input Nama dengan Dropdown Sugesti Lengkap */}
        <div className="relative w-1/2">
          <div className="relative flex items-center">
            <input
              type="text"
              value={nama}
              onFocus={handleOpenDropdown}
              onClick={handleOpenDropdown}
              onChange={e => {
                onUpdateNama(e.target.value);
                setSearchTerm(e.target.value);
                setIsOpen(true);
              }}
              placeholder="Pilih atau ketik nama..."
              disabled={disabled}
              className="w-full text-xs pl-3 pr-8 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            {/* Tombol Chevron Toggle Dropdown */}
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                if (disabled) return;
                setIsOpen(prev => {
                  const next = !prev;
                  if (next) setSearchTerm('');
                  return next;
                });
              }}
              className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              title="Tampilkan semua daftar staff"
            >
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`}
              />
            </button>
          </div>

          {/* Floating Dropdown Options - Menampilkan Semua Opsi */}
          {isOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-[330px] sm:w-[380px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
              {/* Header Dropdown: Search Box & Counter */}
              <div className="p-2.5 bg-slate-50/90 border-b border-slate-100 space-y-2">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Cari nama, email, jabatan... (opsional)"
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 px-0.5 font-medium">
                  <span>
                    {searchTerm
                      ? `Ditemukan: ${filteredStaff.length} dari ${staffList.length} staff`
                      : `Daftar Semua Staff (${staffList.length} orang)`}
                  </span>
                  <span className="text-blue-600">Pilih untuk auto-fill</span>
                </div>
              </div>

              {/* Scrollable Staff List - Semua Staff Tampil Langsung */}
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {filteredStaff.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-xs text-slate-500">
                      Tidak ada staff yang cocok dengan &quot;{searchTerm}&quot;
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Anda tetap bisa menggunakan nama manual ini atau menambahkannya di{' '}
                      <Link
                        href="/kelola-departemen"
                        target="_blank"
                        className="text-blue-600 underline font-semibold"
                      >
                        Kelola Departemen
                      </Link>
                    </p>
                  </div>
                ) : (
                  filteredStaff.map((staff, idx) => {
                    const isSelected =
                      (Boolean(email.trim()) &&
                        (staff.email || '').trim().toLowerCase() === email.trim().toLowerCase()) ||
                      (Boolean(nama.trim()) &&
                        ((staff.nama || '').trim().toLowerCase() === nama.trim().toLowerCase() ||
                          (staff.nama || '').trim().toLowerCase().startsWith(nama.trim().toLowerCase()) ||
                          nama.trim().toLowerCase().startsWith((staff.nama || '').trim().toLowerCase())));

                    return (
                      <button
                        key={`${staff.kode}-${idx}`}
                        type="button"
                        onClick={() => {
                          onSelectStaff(staff);
                          setIsOpen(false);
                          setSearchTerm('');
                        }}
                        className={`w-full text-left px-3 py-2.5 transition-colors flex items-center justify-between gap-2.5 group ${
                          isSelected
                            ? 'bg-blue-50/90 text-blue-900 border-l-4 border-blue-600'
                            : 'hover:bg-slate-50/80 text-slate-800'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold truncate group-hover:text-blue-700">
                              {staff.nama}
                            </p>
                            {isSelected && (
                              <CheckCircle2 size={13} className="text-blue-600 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {staff.email}
                          </p>
                        </div>

                        <div className="flex flex-col items-end flex-shrink-0">
                          {staff.jabatan && (
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/90 px-1.5 py-0.2 rounded">
                              {staff.jabatan}
                            </span>
                          )}
                          {staff.unit_nama && (
                            <span className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[110px]">
                              {staff.unit_nama}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input Email (Auto-filled or manual) */}
        <div className="relative flex-1">
          <input
            type="email"
            value={email}
            onChange={e => onUpdateEmail(e.target.value)}
            placeholder="Email approver (wajib)"
            disabled={disabled}
            className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            required
          />
        </div>

        {/* Tombol Hapus Baris */}
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled || !canRemove}
          className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors disabled:opacity-30 disabled:hover:bg-transparent flex-shrink-0"
          title="Hapus baris approver"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Warning jika nama / email yang diinput tidak terdaftar di kelola-departemen */}
      {!isRegistered && (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200/90 rounded-xl px-3 py-1.5 shadow-2xs animate-in fade-in duration-150">
          <AlertTriangle size={13} className="text-amber-600 flex-shrink-0" />
          <span>
            Nama atau email belum terdaftar di daftar staff. Admin perlu menambahkannya di halaman{' '}
            <Link
              href="/kelola-departemen"
              target="_blank"
              className="font-bold underline text-amber-900 hover:text-amber-950 inline-flex items-center gap-0.5"
            >
              Kelola Departemen <ExternalLink size={10} />
            </Link>
          </span>
        </div>
      )}
    </div>
  );
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

  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showConfirmStart, setShowConfirmStart] = useState(false);

  // Load daftar staff dari database (kelola-departemen)
  useEffect(() => {
    const loadStaff = async () => {
      try {
        const res = await fetch('/review-prosedur/api/staff');
        if (res.ok) {
          const data = await res.json();
          setStaffList(data || []);
        }
      } catch (err) {
        console.error('Error fetching staff list for approvers:', err);
      }
    };
    loadStaff();
  }, []);

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
    setShowConfirmStart(false);
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

  const isSettingApprover =
    doc.documentStatus === 'Menunggu Setting Approver' ||
    doc.documentStatus === 'Menunggu Approval' ||
    doc.cycleStatus === 'setting_approver';

  // Cek apakah siklus approval sedang aktif berjalan
  const isCycleActive =
    doc.cycleStatus === 'in_progress' ||
    doc.stages?.prepared?.status === 'in_progress' ||
    doc.stages?.checked?.status === 'in_progress' ||
    doc.stages?.approved?.status === 'in_progress';

  const isPreparedCompleted = doc.stages?.prepared?.status === 'completed';
  const isCheckedCompleted  = doc.stages?.checked?.status === 'completed';
  const isApprovedCompleted = doc.stages?.approved?.status === 'completed';

  const isPreparedInProgress = doc.stages?.prepared?.status === 'in_progress';
  const isCheckedInProgress  = doc.stages?.checked?.status === 'in_progress';
  const isApprovedInProgress = doc.stages?.approved?.status === 'in_progress';

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

  const selectStaff = (
    role: 'prepared' | 'checked' | 'approved',
    idx: number,
    staff: StaffOption
  ) => {
    const setter =
      role === 'prepared'
        ? setPreparedApprovers
        : role === 'checked'
        ? setCheckedApprovers
        : setApprovedApprovers;

    setter(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], nama: staff.nama, email: staff.email };
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

  const validateForm = () => {
    if (!namaDokumen.trim()) {
      setError('Nama dokumen wajib diisi.');
      return false;
    }

    const filterValid = (list: ApproverRow[]) =>
      list.filter(a => a.email && a.email.trim());

    const validPrepared = filterValid(preparedApprovers);
    const validChecked = filterValid(checkedApprovers);
    const validApproved = filterValid(approvedApprovers);

    if (validPrepared.length === 0) {
      setError('Approver Prepared wajib diisi minimal 1 nama & email.');
      return false;
    }
    if (validChecked.length === 0) {
      setError('Approver Checked wajib diisi minimal 1 nama & email.');
      return false;
    }
    if (validApproved.length === 0) {
      setError('Approver Approved wajib diisi minimal 1 nama & email.');
      return false;
    }

    return true;
  };

  const executeSave = async (startCycle: boolean) => {
    if (!validateForm()) return;

    const filterValid = (list: ApproverRow[]) =>
      list.filter(a => a.email && a.email.trim());

    const validPrepared = filterValid(preparedApprovers);
    const validChecked = filterValid(checkedApprovers);
    const validApproved = filterValid(approvedApprovers);

    try {
      setSaving(true);
      setError(null);

      const res = await fetch('/review-prosedur/api/approval-dokumen', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomorDokumen: doc.nomorDokumen,
          namaDokumen: namaDokumen.trim(),
          startCycle,
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

      setShowConfirmStart(false);

      setSuccessMsg(
        data.message ||
        (startCycle
          ? 'Data approver berhasil disimpan dan dokumen resmi masuk ke tahap approval (Prepared)!'
          : 'Data approver berhasil disimpan!')
      );

      setTimeout(() => {
        onSaved();
        onClose();
      }, 900);
    } catch (err: any) {
      console.error('Error saving approval details:', err);
      setError(err?.message || 'Terjadi kesalahan saat menyimpan.');
      setShowConfirmStart(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (isCycleActive) {
      // 🔒 Jika alur sudah berjalan: simpan langsung tanpa card pop-up konfirmasi
      await executeSave(false);
    } else {
      // 🆕 Jika alur belum berjalan: tampilkan card pop-up konfirmasi (masuk alur approval atau nanti saja)
      setShowConfirmStart(true);
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
            <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
              isSettingApprover
                ? 'text-blue-700 bg-blue-50 border-blue-200'
                : 'text-amber-600 bg-amber-50 border-amber-200'
            }`}>
              {isSettingApprover ? 'Atur Approver Baru' : 'Edit Approval Dokumen'}
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              {isSettingApprover
                ? 'Lengkapi Data Ketiga Approver Dokumen'
                : 'Edit Nama Dokumen & Ketiga Approver'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isSettingApprover
                ? 'Isi nama dan email approver (Prepared, Checked, Approved) untuk memulai alur approval dokumen baru.'
                : 'Sesuaikan nama dokumen dan susunan approver untuk tahap Prepared, Checked, dan Approved.'}
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
          {isSettingApprover && (
            <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-start gap-2.5 text-xs text-blue-900 shadow-2xs">
              <Sparkles size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Lengkapi Approver Dokumen</p>
                <p className="text-blue-700 text-[11px] mt-0.5 leading-relaxed">
                  Data approver untuk <strong>Prepared</strong>, <strong>Checked</strong>, dan <strong>Approved</strong> harus diisi terlebih dahulu. Saat Anda menekan tombol <strong>Simpan</strong>, Anda dapat memilih apakah dokumen langsung masuk ke alur approval sekarang atau disimpan terlebih dahulu.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-800 shadow-2xs">
              <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800 shadow-2xs">
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
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                Daftar Ketiga Approver
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Pilih nama dari dropdown atau ketik manual
              </span>
            </div>

            {/* 1. Prepared Approvers */}
            <div className={`border rounded-2xl p-4 shadow-2xs ${
              isPreparedCompleted
                ? 'border-emerald-200/90 bg-emerald-50/20'
                : 'border-blue-200/80 bg-blue-50/20'
            }`}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isPreparedCompleted
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {isPreparedCompleted ? <CheckCircle2 size={15} /> : <FileEdit size={14} />}
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${
                      isPreparedCompleted ? 'text-emerald-950' : 'text-blue-900'
                    }`}>
                      1. Approver Prepared (Pembuat Dokumen) <span className="text-red-500">*</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">Pihak yang menyiapkan atau menyusun dokumen</p>
                  </div>
                </div>

                {isPreparedCompleted ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl border border-emerald-300">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>Sudah Diapprove (Terkunci)</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => addRow('prepared')}
                    disabled={saving}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs hover:bg-blue-50 transition-colors"
                  >
                    <Plus size={13} />
                    <span>Tambah Approver</span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {preparedApprovers.map((item, idx) => (
                  <ApproverInputCombobox
                    key={`prep-${idx}`}
                    nama={item.nama}
                    email={item.email}
                    onUpdateNama={val => updateRow('prepared', idx, 'nama', val)}
                    onUpdateEmail={val => updateRow('prepared', idx, 'email', val)}
                    onSelectStaff={staff => selectStaff('prepared', idx, staff)}
                    onRemove={() => removeRow('prepared', idx)}
                    canRemove={!isPreparedCompleted && preparedApprovers.length > 1}
                    disabled={saving || isPreparedCompleted}
                    staffList={staffList}
                  />
                ))}
              </div>

              {isPreparedCompleted && (
                <p className="text-[11px] text-emerald-700 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 mt-3 font-medium">
                  ✓ Tahap Prepared telah disetujui. Approver pada tahap ini sudah mengesahkan dokumen sehingga tidak dapat ditambah atau diubah.
                </p>
              )}
            </div>

            {/* 2. Checked Approvers */}
            <div className={`border rounded-2xl p-4 shadow-2xs ${
              isCheckedCompleted
                ? 'border-emerald-200/90 bg-emerald-50/20'
                : isCheckedInProgress
                ? 'border-amber-300 bg-amber-50/30 ring-1 ring-amber-200'
                : 'border-amber-200/80 bg-amber-50/20'
            }`}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isCheckedCompleted
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {isCheckedCompleted ? <CheckCircle2 size={15} /> : <FileSearch size={14} />}
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${
                      isCheckedCompleted ? 'text-emerald-950' : 'text-amber-900'
                    }`}>
                      2. Approver Checked (Pemeriksa Dokumen) <span className="text-red-500">*</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">Pihak yang memverifikasi isi dokumen</p>
                  </div>
                </div>

                {isCheckedCompleted ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl border border-emerald-300">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>Sudah Diapprove (Terkunci)</span>
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    {isCheckedInProgress && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300">
                        <Clock size={12} className="text-amber-600" />
                        <span>Sedang Berjalan</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => addRow('checked')}
                      disabled={saving}
                      className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 bg-white px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs hover:bg-amber-50 transition-colors"
                    >
                      <Plus size={13} />
                      <span>Tambah Approver</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {checkedApprovers.map((item, idx) => (
                  <ApproverInputCombobox
                    key={`chk-${idx}`}
                    nama={item.nama}
                    email={item.email}
                    onUpdateNama={val => updateRow('checked', idx, 'nama', val)}
                    onUpdateEmail={val => updateRow('checked', idx, 'email', val)}
                    onSelectStaff={staff => selectStaff('checked', idx, staff)}
                    onRemove={() => removeRow('checked', idx)}
                    canRemove={!isCheckedCompleted && checkedApprovers.length > 1}
                    disabled={saving || isCheckedCompleted}
                    staffList={staffList}
                  />
                ))}
              </div>

              {isCheckedCompleted ? (
                <p className="text-[11px] text-emerald-700 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 mt-3 font-medium">
                  ✓ Tahap Checked telah disetujui. Approver pada tahap ini sudah mengesahkan dokumen sehingga tidak dapat ditambah atau diubah.
                </p>
              ) : isCheckedInProgress ? (
                <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 mt-3 font-medium">
                  ℹ️ Tahap ini sedang berjalan. Approver baru yang ditambahkan akan langsung menerima email approval dan dapat langsung memeriksa dokumen bersamaan.
                </p>
              ) : null}
            </div>

            {/* 3. Approved Approvers */}
            <div className={`border rounded-2xl p-4 shadow-2xs ${
              isApprovedCompleted
                ? 'border-emerald-200/90 bg-emerald-50/20'
                : isApprovedInProgress
                ? 'border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-200'
                : 'border-emerald-200/80 bg-emerald-50/20'
            }`}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
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

                {isApprovedCompleted ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl border border-emerald-300">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>Sudah Diapprove (Terkunci)</span>
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    {isApprovedInProgress && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                        <Clock size={12} className="text-emerald-600" />
                        <span>Sedang Berjalan</span>
                      </span>
                    )}
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
                )}
              </div>

              <div className="space-y-3">
                {approvedApprovers.map((item, idx) => (
                  <ApproverInputCombobox
                    key={`appr-${idx}`}
                    nama={item.nama}
                    email={item.email}
                    onUpdateNama={val => updateRow('approved', idx, 'nama', val)}
                    onUpdateEmail={val => updateRow('approved', idx, 'email', val)}
                    onSelectStaff={staff => selectStaff('approved', idx, staff)}
                    onRemove={() => removeRow('approved', idx)}
                    canRemove={!isApprovedCompleted && approvedApprovers.length > 1}
                    disabled={saving || isApprovedCompleted}
                    staffList={staffList}
                  />
                ))}
              </div>

              {isApprovedCompleted ? (
                <p className="text-[11px] text-emerald-700 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 mt-3 font-medium">
                  ✓ Tahap Approved telah disetujui. Approver pada tahap ini sudah mengesahkan dokumen sehingga tidak dapat ditambah atau diubah.
                </p>
              ) : isApprovedInProgress ? (
                <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 mt-3 font-medium">
                  ℹ️ Tahap ini sedang berjalan. Approver baru yang ditambahkan akan langsung menerima email approval dan dapat langsung mengesahkan dokumen bersamaan.
                </p>
              ) : null}
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
              className="px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 shadow-blue-500/25"
            >
              {saving && <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />}
              <span>{saving ? 'Menyimpan...' : 'Simpan'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── Card Pop-up Konfirmasi: Masuk Alur Approval atau Nanti Saja ── */}
      {showConfirmStart && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(5px)' }}
          onClick={() => {
            if (!saving) setShowConfirmStart(false);
          }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Header Pop-up */}
            <div className="flex items-start justify-between mb-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmStart(false)}
                disabled={saving}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <h3 className="text-base font-bold text-slate-900 leading-snug">
              Mulai Alur Approval Sekarang?
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Data ketiga approver sudah lengkap. Anda dapat langsung memulai alur approval atau menyimpannya terlebih dahulu dan memulainya nanti.
            </p>

            {/* Opsi Ringkas */}
            <div className="mt-4 space-y-2.5">
              <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-100 text-xs text-blue-900">
                <div className="font-bold flex items-center gap-1.5 text-blue-700">
                  <CheckCircle2 size={14} className="text-blue-600 flex-shrink-0" />
                  <span>Masuk Alur Approval</span>
                </div>
                <p className="text-[11px] text-blue-800/80 mt-1 leading-relaxed">
                  Alur approval resmi dimulai. Dokumen masuk ke tahap <strong className="text-blue-950">Prepared</strong> dan email permohonan approval langsung dikirimkan ke approver Prepared.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700">
                <div className="font-bold flex items-center gap-1.5 text-slate-800">
                  <Clock size={14} className="text-slate-500 flex-shrink-0" />
                  <span>Nanti Saja</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Hanya simpan susunan data approver ke sistem. Alur approval belum berjalan dan belum ada email yang dikirimkan.
                </p>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmStart(false)}
                disabled={saving}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => executeSave(false)}
                  disabled={saving}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Nanti Saja'}
                </button>
                <button
                  type="button"
                  onClick={() => executeSave(true)}
                  disabled={saving}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {saving && <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />}
                  <span>Masuk Alur Approval</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
