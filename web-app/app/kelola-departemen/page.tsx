// app/kelola-departemen/page.tsx
//
// Section = representasi kolom Owner di procedure_documents (tabel "Daftar
// Dokumen Prosedur" di /status-review). Section berdiri sendiri (tidak wajib
// punya departemen induk). Mengubah nama Section otomatis meng-cascade-update
// Owner di semua dokumen (aktif & arsip) yang masih memakai nama lama.
// Section bisa "dinaikkan" jadi Departemen baru (tombol Promote).
// Departemen dibentuk dengan MEMASUKKAN Section yang sudah terdaftar.
// Staff punya kolom Jabatan yang bisa diedit manual atau di-import dari
// sheet "list PIC" pada file Excel Matrik Approval Review Prosedur, dan bisa
// memegang LEBIH DARI SATU Section sekaligus (staff_sections, many-to-many),
// plus opsional di-assign langsung ke sebuah Departemen.
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  Building2, Layers, Users, Plus, X, Pencil, Trash2, Search,
  UserCog, ShieldCheck, ShieldOff, AlertTriangle, ArrowUpCircle,
  FileText, Upload, Link2, Unlink,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================
interface SectionItem {
  id: number;
  nama: string;
  departmentId: number | null;
  departmentNama: string | null;
  docCount: number;
  staffCount: number;
}

interface DepartmentSectionRef { id: number; nama: string; }
interface DepartmentManagerRef { kode: string; nama: string; email: string; }

interface DepartmentItem {
  id: number;
  nama: string;
  staffCount: number;
  managers: DepartmentManagerRef[];
  sections: DepartmentSectionRef[];
}

interface StaffSectionRef { id: number; nama: string; departmentNama: string | null; }

interface Staff {
  kode: string;
  email: string;
  nama: string;
  jabatanRaw: string | null;
  jabatan: string | null;
  sections: StaffSectionRef[];
  departmentId: number | null;
  departmentNama: string | null;
  isManager: boolean;
}

const fieldCls =
  'w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ' +
  'focus:border-transparent transition-all bg-white hover:border-slate-300';

const selectCls =
  'px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all';

// =============================================================================
// Tabs
// =============================================================================
type TabKey = 'section' | 'departemen' | 'staff';

function TabButton({
  active, onClick, icon: Icon, label,
}: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
        ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

// =============================================================================
// Multi-picker Section — dipakai di form Tambah Staff & baris edit Staff.
// Bukan <select> biasa (yang cuma bisa 1 nilai) — ini chip + tombol
// "+ Tambah section" yang bisa diklik berkali-kali untuk menambahkan lebih
// dari satu section ke staff yang sama (mis. staff "HR-IR SSPV" -> section
// HR dan IR sekaligus).
// =============================================================================
function SectionMultiPicker({
  sections, selectedIds, onChange,
}: { sections: SectionItem[]; selectedIds: number[]; onChange: (ids: number[]) => void }) {
  const [picking, setPicking] = useState(false);
  const [pick, setPick] = useState<number | ''>('');

  const selected  = sections.filter(s => selectedIds.includes(s.id));
  const available = sections.filter(s => !selectedIds.includes(s.id));

  const addSection = () => {
    if (!pick) return;
    onChange([...selectedIds, Number(pick)]);
    setPick('');
    setPicking(false);
  };

  const removeSection = (id: number) => onChange(selectedIds.filter(x => x !== id));

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {selected.length === 0 && <span className="text-xs text-slate-400 italic">Belum ada section</span>}
        {selected.map(s => (
          <span key={s.id} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[11px] font-medium border border-blue-100">
            {s.nama}
            <button type="button" onClick={() => removeSection(s.id)} className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-blue-200 transition-colors">
              <X size={9} />
            </button>
          </span>
        ))}
      </div>
      {picking ? (
        <div className="flex items-center gap-1">
          <select
            value={pick}
            onChange={e => setPick(e.target.value ? Number(e.target.value) : '')}
            className={`${selectCls} py-1 px-2 text-xs w-28`}
            autoFocus
          >
            <option value="">Pilih…</option>
            {available.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
          <button
            type="button"
            onClick={addSection}
            disabled={!pick}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-[11px] font-bold rounded-lg shrink-0 transition-all shadow-xs cursor-pointer"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => { setPicking(false); setPick(''); }}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg shrink-0 transition-all cursor-pointer"
            title="Batal"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
        >
          <Plus size={11} /> Tambah section
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Tab: Section
// =============================================================================
function SectionTab({
  sections, departments, onRefresh,
}: { sections: SectionItem[]; departments: DepartmentItem[]; onRefresh: () => void }) {
  const [namaBaru, setNamaBaru] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNama, setEditingNama] = useState('');

  const handleAdd = async () => {
    if (!namaBaru.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/review-prosedur/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: namaBaru.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Gagal menambah section');
        return;
      }
      setNamaBaru('');
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (s: SectionItem) => {
    if (!editingNama.trim()) return;
    const res = await fetch(`/review-prosedur/api/sections/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama: editingNama.trim() }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Gagal mengubah nama section');
      return;
    }
    const data = await res.json();
    setEditingId(null);
    onRefresh();
    if (editingNama.trim() !== s.nama && data.affectedDocs > 0) {
      alert(`Nama section diubah. ${data.affectedDocs} dokumen di /status-review otomatis ikut diperbarui (kolom Owner).`);
    }
  };

  const handleDelete = async (s: SectionItem) => {
    if (s.staffCount > 0) {
      alert(`Tidak bisa dihapus — masih ada ${s.staffCount} staff di section ini. Pindahkan staff-nya dulu.`);
      return;
    }
    const confirmMsg = s.docCount > 0
      ? `Hapus section "${s.nama}"?\n\nMasih ada ${s.docCount} dokumen di /status-review yang Owner-nya memakai nama ini — dokumen TIDAK akan berubah, hanya nama ini tidak lagi muncul sebagai pilihan Owner untuk dokumen baru.`
      : `Hapus section "${s.nama}"?`;
    if (!window.confirm(confirmMsg)) return;
    const res = await fetch(`/review-prosedur/api/sections/${s.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Gagal menghapus section');
      return;
    }
    onRefresh();
  };

  const handleAssignDept = async (s: SectionItem, departmentId: number | null) => {
    const res = await fetch(`/review-prosedur/api/sections/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ departmentId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Gagal mengubah departemen induk');
      return;
    }
    onRefresh();
  };

  const handlePromote = async (s: SectionItem) => {
    if (!window.confirm(
      `Naikkan section "${s.nama}" menjadi Departemen baru?\n\n` +
      `Section ini akan dihapus dan digantikan Departemen dengan nama yang sama. ` +
      `${s.staffCount > 0 ? `${s.staffCount} staff di section ini akan otomatis ikut pindah ke departemen baru.` : ''}`
    )) return;
    const res = await fetch(`/review-prosedur/api/sections/${s.id}/promote`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Gagal menaikkan section menjadi departemen');
      return;
    }
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-xs text-blue-800">
        Section di sini = nilai kolom <strong>Owner</strong> pada tabel "Daftar Dokumen Prosedur" di
        <strong> /status-review</strong>. Mengubah nama section otomatis memperbarui Owner di semua
        dokumen yang memakainya.
      </div>

      {/* Form tambah */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-2">
        <input
          value={namaBaru}
          onChange={e => setNamaBaru(e.target.value)}
          placeholder="Nama section baru (mis. PPC)"
          className={fieldCls + ' flex-1'}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={saving || !namaBaru.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
        >
          <Plus size={14} /> Tambah
        </button>
      </div>

      {/* List section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider min-w-[140px]">Section</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider min-w-[200px]">Departemen Induk</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider min-w-[80px]">Dokumen</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider min-w-[80px]">Staff</th>
              <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider min-w-[120px]">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sections.map(s => (
              <tr key={s.id}>
                <td className="px-4 py-2.5 text-xs font-medium text-slate-800">
                  {editingId === s.id ? (
                    <input value={editingNama} onChange={e => setEditingNama(e.target.value)} className={fieldCls} autoFocus />
                  ) : s.nama}
                </td>
                <td className="px-4 py-2.5 text-xs">
                  <select
                    value={s.departmentId ?? ''}
                    onChange={e => handleAssignDept(s, e.target.value ? Number(e.target.value) : null)}
                    className={selectCls}
                  >
                    <option value="">— Belum masuk departemen —</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{s.docCount}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{s.staffCount}</td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  {editingId === s.id ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => handleSaveEdit(s)} className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer">Simpan</button>
                      <button onClick={() => setEditingId(null)} className="px-2 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs font-medium transition-all cursor-pointer">Batal</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditingId(s.id); setEditingNama(s.nama); }}
                        title="Ganti nama"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 cursor-pointer transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handlePromote(s)}
                        title="Naikkan jadi Departemen"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 cursor-pointer transition-colors">
                        <ArrowUpCircle size={14} />
                      </button>
                      <button onClick={() => handleDelete(s)}
                        title="Hapus section"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {sections.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400">Belum ada section</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =============================================================================
// Tab: Departemen
// =============================================================================
function DepartemenTab({
  departments, sections, staff, onRefresh,
}: { departments: DepartmentItem[]; sections: SectionItem[]; staff: Staff[]; onRefresh: () => void }) {
  const [namaBaru, setNamaBaru] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNama, setEditingNama] = useState('');
  const [managerPickerFor, setManagerPickerFor] = useState<number | null>(null);
  const [managerKode, setManagerKode] = useState('');
  const [sectionPickerFor, setSectionPickerFor] = useState<number | null>(null);
  const [sectionPick, setSectionPick] = useState<number | ''>('');

  const handleAdd = async () => {
    if (!namaBaru.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/review-prosedur/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: namaBaru.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Gagal menambah departemen');
        return;
      }
      setNamaBaru('');
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (id: number) => {
    if (!editingNama.trim()) return;
    const res = await fetch(`/review-prosedur/api/departments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama: editingNama.trim() }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Gagal mengubah nama departemen');
      return;
    }
    setEditingId(null);
    onRefresh();
  };

  const handleDelete = async (dept: DepartmentItem) => {
    if (dept.staffCount > 0) {
      alert(`Tidak bisa dihapus — masih ada ${dept.staffCount} staff langsung di departemen ini. Pindahkan dulu.`);
      return;
    }
    const msg = dept.sections.length > 0
      ? `Hapus departemen "${dept.nama}"?\n\n${dept.sections.length} section yang tergabung akan otomatis dilepas (jadi section mandiri lagi), tidak ikut terhapus.`
      : `Hapus departemen "${dept.nama}"?`;
    if (!window.confirm(msg)) return;
    const res = await fetch(`/review-prosedur/api/departments/${dept.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Gagal menghapus departemen');
      return;
    }
    onRefresh();
  };

  const handleAssignManager = async (deptId: number) => {
    const kode = managerKode.trim().toUpperCase();
    if (!kode) return;
    const res = await fetch(`/review-prosedur/api/departments/${deptId}/managers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kode }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Gagal menambahkan manager');
      return;
    }
    setManagerKode('');
    setManagerPickerFor(null);
    onRefresh();
  };

  const handleRemoveManager = async (deptId: number, kode: string) => {
    if (!window.confirm(`Lepas ${kode} sebagai manager departemen ini?`)) return;
    const res = await fetch(
      `/review-prosedur/api/departments/${deptId}/managers?kode=${encodeURIComponent(kode)}`,
      { method: 'DELETE' }
    );
    if (!res.ok) {
      alert('Gagal melepas manager');
      return;
    }
    onRefresh();
  };

  const handleAddSection = async (deptId: number) => {
    if (!sectionPick) return;
    const res = await fetch(`/review-prosedur/api/sections/${sectionPick}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ departmentId: deptId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Gagal menambahkan section');
      return;
    }
    setSectionPick('');
    setSectionPickerFor(null);
    onRefresh();
  };

  const handleRemoveSection = async (sectionId: number) => {
    const res = await fetch(`/review-prosedur/api/sections/${sectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ departmentId: null }),
    });
    if (!res.ok) {
      alert('Gagal melepas section dari departemen');
      return;
    }
    onRefresh();
  };

  // Section yang belum masuk departemen manapun — kandidat utama untuk ditambahkan
  const availableSections = (deptId: number) =>
    sections.filter(s => s.departmentId === null || s.departmentId === deptId);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-xs text-blue-800">
        Departemen dibentuk dengan memasukkan Section yang sudah terdaftar (bukan sebaliknya). Kelola
        daftar Section di tab <strong>Section</strong>.
      </div>

      {/* Form tambah */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-2">
        <input
          value={namaBaru}
          onChange={e => setNamaBaru(e.target.value)}
          placeholder="Nama departemen baru (mis. PRODUKSI)"
          className={fieldCls + ' flex-1'}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={saving || !namaBaru.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
        >
          <Plus size={14} /> Tambah
        </button>
      </div>

      {/* List departemen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {departments.map(dept => (
          <div key={dept.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              {editingId === dept.id ? (
                <div className="flex-1 flex items-center gap-1.5">
                  <input value={editingNama} onChange={e => setEditingNama(e.target.value)} className={fieldCls} autoFocus />
                  <button onClick={() => handleSaveEdit(dept.id)} className="text-xs font-semibold text-blue-600 px-2">Simpan</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-slate-400 px-1"><X size={14} /></button>
                </div>
              ) : (
                <h3 className="font-bold text-sm text-slate-900 truncate">{dept.nama}</h3>
              )}
              {editingId !== dept.id && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => { setEditingId(dept.id); setEditingNama(dept.nama); }}
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => handleDelete(dept)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 mb-3">
              {dept.sections.length} section · {dept.staffCount} staff langsung
            </p>

            {/* Section tergabung */}
            <div className="border-t border-slate-100 pt-2.5 mb-2.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Section</p>
              {dept.sections.length === 0 ? (
                <p className="text-xs text-slate-400 italic mb-2">Belum ada section</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {dept.sections.map(sec => (
                    <span key={sec.id} className="inline-flex items-center gap-1 pl-2 pr-1 py-1 bg-blue-50 text-blue-700 rounded-full text-[11px] font-medium">
                      <Layers size={10} /> {sec.nama}
                      <button onClick={() => handleRemoveSection(sec.id)} title="Lepas dari departemen"
                        className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-blue-200">
                        <Unlink size={9} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {sectionPickerFor === dept.id ? (
                <div className="flex items-center gap-1.5">
                  <select value={sectionPick} onChange={e => setSectionPick(e.target.value ? Number(e.target.value) : '')} className={selectCls}>
                    <option value="">Pilih section…</option>
                    {availableSections(dept.id).filter(s => s.departmentId !== dept.id).map(s => (
                      <option key={s.id} value={s.id}>{s.nama}</option>
                    ))}
                  </select>
                  <button onClick={() => handleAddSection(dept.id)} className="text-xs font-semibold text-blue-600 px-1.5">OK</button>
                  <button onClick={() => setSectionPickerFor(null)} className="text-slate-400 px-1"><X size={13} /></button>
                </div>
              ) : (
                <button onClick={() => setSectionPickerFor(dept.id)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800">
                  <Link2 size={11} /> Tambah section
                </button>
              )}
            </div>

            {/* Managers */}
            <div className="border-t border-slate-100 pt-2.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Manager</p>
              {dept.managers.length === 0 ? (
                <p className="text-xs text-slate-400 italic mb-2">Belum ada manager</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {dept.managers.map(m => (
                    <span key={m.kode} className="inline-flex items-center gap-1 pl-2 pr-1 py-1 bg-violet-50 text-violet-700 rounded-full text-[11px] font-medium">
                      {m.nama} ({m.kode})
                      <button onClick={() => handleRemoveManager(dept.id, m.kode)} className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-violet-200">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {managerPickerFor === dept.id ? (
                <div className="flex items-center gap-1.5">
                  <input
                    list="staff-kode-list"
                    value={managerKode}
                    onChange={e => setManagerKode(e.target.value)}
                    placeholder="Kode staff (mis. EME)"
                    className={fieldCls}
                    onKeyDown={e => e.key === 'Enter' && handleAssignManager(dept.id)}
                    autoFocus
                  />
                  <button onClick={() => handleAssignManager(dept.id)} className="text-xs font-semibold text-blue-600 px-1.5">OK</button>
                  <button onClick={() => setManagerPickerFor(null)} className="text-slate-400 px-1"><X size={13} /></button>
                </div>
              ) : (
                <button onClick={() => setManagerPickerFor(dept.id)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800">
                  <Plus size={11} /> Tambah manager
                </button>
              )}
            </div>
          </div>
        ))}
        {departments.length === 0 && (
          <p className="text-xs text-slate-400 col-span-2 text-center py-8">Belum ada departemen</p>
        )}
      </div>

      <datalist id="staff-kode-list">
        {staff.map(s => (
          <option key={s.kode} value={s.kode}>{s.nama}</option>
        ))}
      </datalist>
    </div>
  );
}

// =============================================================================
// Tab: Staff & Manager
// =============================================================================
function AddStaffForm({
  sections, departments, onAdded,
}: { sections: SectionItem[]; departments: DepartmentItem[]; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [kode, setKode] = useState('');
  const [email, setEmail] = useState('');
  const [nama, setNama] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [sectionIds, setSectionIds] = useState<number[]>([]);
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [isManager, setIsManager] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setKode(''); setEmail(''); setNama(''); setJabatan(''); setSectionIds([]); setDepartmentId(''); setIsManager(false);
  };

  const handleSubmit = async () => {
    if (!kode.trim() || !email.trim() || !nama.trim()) {
      alert('Kode, email, dan nama wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/review-prosedur/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kode: kode.trim(),
          email: email.trim(),
          nama: nama.trim(),
          jabatan: jabatan.trim() || null,
          sectionIds,
          departmentId: departmentId || null,
          isManager,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Gagal menambah staff');
        return;
      }
      reset();
      setOpen(false);
      onAdded();
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all"
        >
          <Plus size={14} /> Tambah Staff
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-900">Tambah Staff Baru</p>
        <button onClick={() => { setOpen(false); reset(); }} className="text-slate-400 hover:text-slate-700">
          <X size={16} />
        </button>
      </div>

      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        Kode staff <strong>harus persis sama</strong> dengan kode PIC yang dipakai di kolom "PIC" pada
        data prosedur (mis. <code>AYS</code>).
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kode <span className="text-red-500">*</span></label>
          <input value={kode} onChange={e => setKode(e.target.value.toUpperCase())} placeholder="mis. AYS" className={fieldCls} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Email <span className="text-red-500">*</span></label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@jai.co.id" className={fieldCls} />
        </div>
        <div className="col-span-2">
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
          <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama lengkap" className={fieldCls} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jabatan (mis. SPV, SSPV, MGR)</label>
          <input value={jabatan} onChange={e => setJabatan(e.target.value)} placeholder="mis. SPV" className={fieldCls} />
        </div>
        <div className="col-span-2">
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Section <span className="font-normal text-slate-400">(bisa lebih dari satu)</span>
          </label>
          <SectionMultiPicker sections={sections} selectedIds={sectionIds} onChange={setSectionIds} />
        </div>
        <div className="col-span-2">
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Departemen <span className="font-normal text-slate-400">(opsional — kalau staff ini bertanggung jawab langsung di level departemen)</span>
          </label>
          <select value={departmentId} onChange={e => setDepartmentId(e.target.value ? Number(e.target.value) : '')} className={selectCls + ' w-full'}>
            <option value="">Tidak ada</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input type="checkbox" checked={isManager} onChange={e => setIsManager(e.target.checked)} />
            Staff ini adalah seorang manager
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={() => { setOpen(false); reset(); }} disabled={saving} className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl">
          Batal
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
        >
          {saving && <span className="animate-spin w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full" />}
          {saving ? 'Menyimpan...' : 'Simpan Staff'}
        </button>
      </div>
    </div>
  );
}

function ImportExcelButton({ onImported }: { onImported: (result: any) => void }) {
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/review-prosedur/api/staff/import-excel', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Gagal mengimpor file Excel');
        return;
      }
      onImported(data);
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={importing}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
      >
        {importing
          ? <span className="animate-spin w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full" />
          : <Upload size={14} />}
        {importing ? 'Mengimpor...' : 'Import dari Excel (sheet "list PIC")'}
      </button>
    </>
  );
}

function StaffTab({
  staff, sections, departments, onRefresh,
}: { staff: Staff[]; sections: SectionItem[]; departments: DepartmentItem[]; onRefresh: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingKode, setEditingKode] = useState<string | null>(null);
  const [deletingKode, setDeletingKode] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editJabatan, setEditJabatan] = useState('');
  const [editSectionIds, setEditSectionIds] = useState<number[]>([]);
  const [editDepartmentId, setEditDepartmentId] = useState<number | ''>('');
  const [editIsManager, setEditIsManager] = useState(false);
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const startEdit = (s: Staff) => {
    setEditingKode(s.kode);
    setEditEmail(s.email);
    setEditJabatan(s.jabatan || '');
    setEditSectionIds((s.sections ?? []).map(sec => sec.id));
    setEditDepartmentId(s.departmentId ?? '');
    setEditIsManager(s.isManager);
  };

  const handleSave = async (kode: string) => {
    if (!editEmail.trim()) { alert('Email tidak boleh kosong'); return; }
    const res = await fetch('/review-prosedur/api/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kode,
        email: editEmail.trim(),
        jabatan: editJabatan.trim() || null,
        sectionIds: editSectionIds,
        departmentId: editDepartmentId || null,
        isManager: editIsManager,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Gagal menyimpan');
      return;
    }
    setEditingKode(null);
    onRefresh();
  };

  const handleDelete = async (s: Staff) => {
    const confirmMsg = `Hapus staff "${s.nama}" (${s.kode})?\n\nStaff ini akan dihapus dari daftar staff directory dan penugasan section/departemen.`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingKode(s.kode);
    try {
      const res = await fetch(`/review-prosedur/api/staff?kode=${encodeURIComponent(s.kode)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Gagal menghapus staff');
        return;
      }
      onRefresh();
    } catch (err) {
      console.error('Error deleting staff:', err);
      alert('Terjadi kesalahan saat menghapus staff');
    } finally {
      setDeletingKode(null);
    }
  };

  const q = searchQuery.trim().toLowerCase();
  const displayedStaff = staff.filter(s => {
    if (filterUnassigned) {
      const isUnassigned = (s.sections ?? []).length === 0 && !s.departmentId;
      if (!isUnassigned) return false;
    }
    if (!q) return true;

    const matchNama = (s.nama || '').toLowerCase().includes(q);
    const matchKode = (s.kode || '').toLowerCase().includes(q);
    const matchEmail = (s.email || '').toLowerCase().includes(q);
    const matchJabatan = (s.jabatan || '').toLowerCase().includes(q) || (s.jabatanRaw || '').toLowerCase().includes(q);
    const matchSection = (s.sections ?? []).some(sec => (sec.nama || '').toLowerCase().includes(q));
    const matchDept = (s.departmentNama || '').toLowerCase().includes(q);

    return matchNama || matchKode || matchEmail || matchJabatan || matchSection || matchDept;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <AddStaffForm sections={sections} departments={departments} onAdded={onRefresh} />
        <ImportExcelButton onImported={result => { setImportResult(result); onRefresh(); }} />
      </div>

      {importResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-xs text-emerald-800 space-y-2">
          <p>
            Import selesai — <strong>{importResult.created}</strong> staff baru dibuat,{' '}
            <strong>{importResult.updated}</strong> staff diperbarui.
          </p>
          {importResult.unresolved?.length > 0 && (
            <div>
              <p className="font-semibold text-amber-700 mb-1">
                {importResult.unresolved.length} baris perlu dicek manual:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                {importResult.unresolved.map((u: any, i: number) => (
                  <li key={i}>{u.nama} ({u.jabatan}) — {u.reason}</li>
                ))}
              </ul>
            </div>
          )}
          <button onClick={() => setImportResult(null)} className="text-emerald-600 underline text-[11px]">Tutup</button>
        </div>
      )}

      {/* Control Bar: Search & Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama, kode, email, jabatan, section, departemen..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs text-slate-800 placeholder-slate-400 transition-all outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md cursor-pointer"
                title="Hapus pencarian"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
            <input type="checkbox" checked={filterUnassigned} onChange={e => setFilterUnassigned(e.target.checked)} />
            Tampilkan yang belum punya section/departemen saja
          </label>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <p>
            {searchQuery.trim() || filterUnassigned
              ? `Menampilkan ${displayedStaff.length} dari ${staff.length} staff.`
              : `${staff.length} staff total.`}{' '}
            Klik <Pencil size={11} className="inline text-slate-500" /> untuk edit data atau <Trash2 size={11} className="inline text-red-500" /> untuk menghapus.
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-blue-600 hover:underline cursor-pointer"
            >
              Reset pencarian
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3.5 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nama</th>
              <th className="px-2 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-16">Kode</th>
              <th className="px-3.5 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-48">Email</th>
              <th className="px-3.5 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-28">Jabatan</th>
              <th className="px-3.5 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-44">Section</th>
              <th className="px-3.5 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-32">Departemen</th>
              <th className="px-2 py-2.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider w-20">Manager?</th>
              <th className="px-3.5 py-2.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedStaff.map(s => {
              const needsCheck = (s.sections ?? []).length === 0 && !s.departmentId;
              return (
                <tr key={s.kode} className={needsCheck ? 'bg-amber-50/40' : ''}>
                  <td className="px-3.5 py-2 text-xs font-medium text-slate-800">{s.nama}</td>
                  <td className="px-2 py-2 text-xs font-mono text-slate-500">{s.kode}</td>
                  <td className="px-3.5 py-2 text-xs">
                    {editingKode === s.kode ? (
                      <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className={fieldCls} />
                    ) : (
                      <span className="text-slate-600">{s.email}</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2 text-xs">
                    {editingKode === s.kode ? (
                      <input value={editJabatan} onChange={e => setEditJabatan(e.target.value)} placeholder="mis. SPV" className={fieldCls} />
                    ) : (
                      <span className="text-slate-600">{s.jabatan || <em className="text-slate-400">-</em>}</span>
                    )}
                    {s.jabatanRaw && (
                      <p className="text-[10px] text-slate-400 mt-0.5">Excel: {s.jabatanRaw}</p>
                    )}
                  </td>
                  <td className="px-3.5 py-2 text-xs">
                    {editingKode === s.kode ? (
                      <SectionMultiPicker sections={sections} selectedIds={editSectionIds} onChange={setEditSectionIds} />
                    ) : (
                      <div className="flex items-start gap-1">
                        {needsCheck && <AlertTriangle size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />}
                        {(s.sections ?? []).length === 0 ? (
                          <em className="text-slate-400">belum diset</em>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {(s.sections ?? []).map(sec => (
                              <span key={sec.id} className="inline-flex items-center px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium border border-blue-100">
                                {sec.nama}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3.5 py-2 text-xs">
                    {editingKode === s.kode ? (
                      <select value={editDepartmentId} onChange={e => setEditDepartmentId(e.target.value ? Number(e.target.value) : '')} className={selectCls + ' w-full'}>
                        <option value="">Tidak ada</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                      </select>
                    ) : (
                      s.departmentNama
                        ? <span className="inline-flex items-center px-2 py-0.5 bg-violet-50 text-violet-700 rounded text-[10px] font-medium border border-violet-100">{s.departmentNama}</span>
                        : <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs text-center">
                    {editingKode === s.kode ? (
                      <button
                        type="button"
                        onClick={() => setEditIsManager(v => !v)}
                        className="inline-flex items-center justify-center p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title={editIsManager ? 'Manager (Klik untuk ubah)' : 'Bukan Manager (Klik untuk ubah)'}
                      >
                        {editIsManager
                          ? <ShieldCheck size={18} className="text-emerald-600" />
                          : <ShieldOff size={18} className="text-slate-300" />}
                      </button>
                    ) : (
                      s.isManager
                        ? <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold"><ShieldCheck size={13} /> Ya</span>
                        : <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2 whitespace-nowrap text-right">
                    {editingKode === s.kode ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSave(s.kode)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
                        >
                          Simpan
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingKode(null)}
                          className="px-2 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs font-medium transition-all cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(s)}
                          className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all cursor-pointer"
                          title="Edit staff"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
                          disabled={deletingKode === s.kode}
                          className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer disabled:opacity-50"
                          title="Hapus staff"
                        >
                          {deletingKode === s.kode ? (
                            <span className="animate-spin w-3 h-3 border-2 border-red-400/40 border-t-red-600 rounded-full" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {displayedStaff.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-xs text-slate-400">
                  {searchQuery ? `Tidak ada staff yang cocok dengan pencarian "${searchQuery}"` : 'Tidak ada data'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================
export default function KelolaDepartemenPage() {
  const [tab, setTab] = useState<TabKey>('section');
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [sections, setSections]       = useState<SectionItem[]>([]);
  const [staff, setStaff]             = useState<Staff[]>([]);
  const [loading, setLoading]         = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [secRes, dRes, stRes] = await Promise.all([
        fetch('/review-prosedur/api/sections'),
        fetch('/review-prosedur/api/departments'),
        fetch('/review-prosedur/api/staff'),
      ]);
      setSections(await secRes.json());
      setDepartments(await dRes.json());
      setStaff(await stRes.json());
    } catch (e) {
      console.error('Gagal memuat data departemen:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const needsReviewCount = staff.filter(s => (s.sections ?? []).length === 0 && !s.departmentId).length;

  if (loading) {
    return (
      <ProtectedRoute>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-[1400px] mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Kelola Departemen</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Atur Section (sinkron dengan Owner di /status-review), Departemen, dan Staff & Manager.
            </p>
          </div>

          {needsReviewCount > 0 && (
            <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
              <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                Ada <strong>{needsReviewCount} staff</strong> yang belum punya Section maupun Departemen —
                cek di tab <strong>Staff & Manager</strong>.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <TabButton active={tab === 'section'}    onClick={() => setTab('section')}    icon={Layers}    label="Section" />
            <TabButton active={tab === 'departemen'} onClick={() => setTab('departemen')} icon={Building2} label="Departemen" />
            <TabButton active={tab === 'staff'}      onClick={() => setTab('staff')}      icon={UserCog}   label="Staff & Manager" />
          </div>

          {tab === 'section'    && <SectionTab sections={sections} departments={departments} onRefresh={loadAll} />}
          {tab === 'departemen' && <DepartemenTab departments={departments} sections={sections} staff={staff} onRefresh={loadAll} />}
          {tab === 'staff'      && <StaffTab staff={staff} sections={sections} departments={departments} onRefresh={loadAll} />}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}