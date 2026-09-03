// app/kelola-departemen/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  Building2, Layers, Users, Plus, X, Pencil, Trash2,
  UserCog, ShieldCheck, ShieldOff, AlertTriangle,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================
interface Department {
  id: number;
  nama: string;
  sectionCount: number;
  staffCount: number;
  managers: { kode: string; nama: string; email: string }[];
}

interface Section {
  id: number;
  nama: string;
  departmentId: number;
  departmentNama: string;
  staffCount: number;
}

interface Staff {
  kode: string;
  email: string;
  nama: string;
  jabatanRaw: string | null;
  unitType: 'department' | 'section' | null;
  unitId: number | null;
  unitNama: string | null;
  parentDepartmentNama: string | null;
  isManager: boolean;
}

const FALLBACK_DEPT_NAME = 'BELUM DIKELOMPOKKAN';

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
type TabKey = 'departemen' | 'section' | 'staff';

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
// Tab: Departemen
// =============================================================================
function DepartemenTab({
  departments, staff, onRefresh,
}: { departments: Department[]; staff: Staff[]; onRefresh: () => void }) {
  const [namaBaru, setNamaBaru] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNama, setEditingNama] = useState('');
  const [managerPickerFor, setManagerPickerFor] = useState<number | null>(null);
  const [managerKode, setManagerKode] = useState('');

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

  const handleDelete = async (dept: Department) => {
    if (dept.sectionCount > 0 || dept.staffCount > 0) {
      alert(
        `Tidak bisa dihapus — departemen ini masih punya ${dept.sectionCount} section dan ${dept.staffCount} staff. Pindahkan dulu sebelum menghapus.`
      );
      return;
    }
    if (!window.confirm(`Hapus departemen "${dept.nama}"?`)) return;
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

  return (
    <div className="space-y-4">
      {/* Form tambah */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-2">
        <input
          value={namaBaru}
          onChange={e => setNamaBaru(e.target.value)}
          placeholder="Nama departemen baru (mis. PPC)"
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
          <div key={dept.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${dept.nama === FALLBACK_DEPT_NAME ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              {editingId === dept.id ? (
                <div className="flex-1 flex items-center gap-1.5">
                  <input
                    value={editingNama}
                    onChange={e => setEditingNama(e.target.value)}
                    className={fieldCls}
                    autoFocus
                  />
                  <button onClick={() => handleSaveEdit(dept.id)} className="text-xs font-semibold text-blue-600 px-2">Simpan</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-slate-400 px-1"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  {dept.nama === FALLBACK_DEPT_NAME && <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />}
                  <h3 className="font-bold text-sm text-slate-900 truncate">{dept.nama}</h3>
                </div>
              )}
              {editingId !== dept.id && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => { setEditingId(dept.id); setEditingNama(dept.nama); }}
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(dept)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 mb-3">
              {dept.sectionCount} section · {dept.staffCount} staff langsung
            </p>

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
                <button
                  onClick={() => setManagerPickerFor(dept.id)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                >
                  <Plus size={11} /> Tambah manager
                </button>
              )}
            </div>
          </div>
        ))}
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
// Tab: Section
// =============================================================================
function SectionTab({
  sections, departments, onRefresh,
}: { sections: Section[]; departments: Department[]; onRefresh: () => void }) {
  const [namaBaru, setNamaBaru] = useState('');
  const [deptBaru, setDeptBaru] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNama, setEditingNama] = useState('');
  const [editingDept, setEditingDept] = useState<number | ''>('');

  const handleAdd = async () => {
    if (!namaBaru.trim() || !deptBaru) return;
    setSaving(true);
    try {
      const res = await fetch('/review-prosedur/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: namaBaru.trim(), departmentId: deptBaru }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Gagal menambah section');
        return;
      }
      setNamaBaru('');
      setDeptBaru('');
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (s: Section) => {
    setEditingId(s.id);
    setEditingNama(s.nama);
    setEditingDept(s.departmentId);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editingNama.trim() || !editingDept) return;
    const res = await fetch(`/review-prosedur/api/sections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama: editingNama.trim(), departmentId: editingDept }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Gagal mengubah section');
      return;
    }
    setEditingId(null);
    onRefresh();
  };

  const handleDelete = async (s: Section) => {
    if (s.staffCount > 0) {
      alert(`Tidak bisa dihapus — masih ada ${s.staffCount} staff di section ini.`);
      return;
    }
    if (!window.confirm(`Hapus section "${s.nama}"?`)) return;
    const res = await fetch(`/review-prosedur/api/sections/${s.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Gagal menghapus section');
      return;
    }
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Form tambah */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-2">
        <input
          value={namaBaru}
          onChange={e => setNamaBaru(e.target.value)}
          placeholder="Nama section baru (mis. IT)"
          className={fieldCls + ' flex-1 min-w-[180px]'}
        />
        <select value={deptBaru} onChange={e => setDeptBaru(e.target.value ? Number(e.target.value) : '')} className={selectCls}>
          <option value="">Pilih departemen induk…</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
        </select>
        <button
          onClick={handleAdd}
          disabled={saving || !namaBaru.trim() || !deptBaru}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
        >
          <Plus size={14} /> Tambah
        </button>
      </div>

      {/* Tabel section, dikelompokkan per departemen */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase">Section</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase">Departemen Induk</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase">Staff</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sections.map(s => (
              <tr key={s.id} className={s.departmentNama === FALLBACK_DEPT_NAME ? 'bg-amber-50/40' : ''}>
                <td className="px-4 py-2.5 text-xs font-medium text-slate-800">
                  {editingId === s.id ? (
                    <input value={editingNama} onChange={e => setEditingNama(e.target.value)} className={fieldCls} autoFocus />
                  ) : s.nama}
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-600">
                  {editingId === s.id ? (
                    <select value={editingDept} onChange={e => setEditingDept(Number(e.target.value))} className={selectCls}>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                    </select>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      {s.departmentNama === FALLBACK_DEPT_NAME && <AlertTriangle size={12} className="text-amber-500" />}
                      {s.departmentNama}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{s.staffCount}</td>
                <td className="px-4 py-2.5">
                  {editingId === s.id ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleSaveEdit(s.id)} className="text-xs font-semibold text-blue-600">Simpan</button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-slate-400">Batal</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(s)} className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => handleDelete(s)} className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {sections.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400">Belum ada section</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =============================================================================
// Tab: Staff & Manager
// =============================================================================
function StaffTab({
  staff, departments, sections, onRefresh,
}: { staff: Staff[]; departments: Department[]; sections: Section[]; onRefresh: () => void }) {
  const [editingKode, setEditingKode] = useState<string | null>(null);
  const [editUnitType, setEditUnitType] = useState<'department' | 'section'>('department');
  const [editUnitId, setEditUnitId] = useState<number | ''>('');
  const [editIsManager, setEditIsManager] = useState(false);
  const [filterUnassigned, setFilterUnassigned] = useState(false);

  const startEdit = (s: Staff) => {
    setEditingKode(s.kode);
    setEditUnitType(s.unitType || 'department');
    setEditUnitId(s.unitId || '');
    setEditIsManager(s.isManager);
  };

  const handleSave = async (kode: string) => {
    if (!editUnitId) { alert('Pilih unit (departemen/section) dulu'); return; }
    const res = await fetch('/review-prosedur/api/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kode, unitType: editUnitType, unitId: editUnitId, isManager: editIsManager }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Gagal menyimpan');
      return;
    }
    setEditingKode(null);
    onRefresh();
  };

  const displayedStaff = filterUnassigned
    ? staff.filter(s => !s.unitType || s.parentDepartmentNama === FALLBACK_DEPT_NAME || s.unitNama === FALLBACK_DEPT_NAME)
    : staff;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {staff.length} staff total. Klik <Pencil size={11} className="inline" /> untuk perbaiki unit / status manager.
        </p>
        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
          <input type="checkbox" checked={filterUnassigned} onChange={e => setFilterUnassigned(e.target.checked)} />
          Tampilkan yang perlu dicek saja
        </label>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase">Nama</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase">Kode</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase">Jabatan (Excel)</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase">Unit</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase">Manager?</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedStaff.map(s => {
              const needsCheck = !s.unitType || s.parentDepartmentNama === FALLBACK_DEPT_NAME || s.unitNama === FALLBACK_DEPT_NAME;
              return (
                <tr key={s.kode} className={needsCheck ? 'bg-amber-50/40' : ''}>
                  <td className="px-4 py-2.5 text-xs font-medium text-slate-800">{s.nama}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-slate-500">{s.kode}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{s.jabatanRaw || '-'}</td>
                  <td className="px-4 py-2.5 text-xs">
                    {editingKode === s.kode ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={editUnitType}
                          onChange={e => { setEditUnitType(e.target.value as 'department' | 'section'); setEditUnitId(''); }}
                          className={selectCls}
                        >
                          <option value="department">Departemen</option>
                          <option value="section">Section</option>
                        </select>
                        <select value={editUnitId} onChange={e => setEditUnitId(Number(e.target.value))} className={selectCls}>
                          <option value="">Pilih…</option>
                          {(editUnitType === 'department' ? departments : sections).map((u: any) => (
                            <option key={u.id} value={u.id}>{u.nama}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        {needsCheck && <AlertTriangle size={12} className="text-amber-500" />}
                        {s.unitNama || <em className="text-slate-400">belum diset</em>}
                        {s.parentDepartmentNama && <span className="text-slate-400"> ({s.parentDepartmentNama})</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {editingKode === s.kode ? (
                      <button onClick={() => setEditIsManager(v => !v)} className="inline-flex items-center gap-1">
                        {editIsManager
                          ? <ShieldCheck size={16} className="text-emerald-600" />
                          : <ShieldOff size={16} className="text-slate-300" />}
                      </button>
                    ) : (
                      s.isManager
                        ? <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold"><ShieldCheck size={13} /> Ya</span>
                        : <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {editingKode === s.kode ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleSave(s.kode)} className="text-xs font-semibold text-blue-600">Simpan</button>
                        <button onClick={() => setEditingKode(null)} className="text-xs text-slate-400">Batal</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(s)} className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50">
                        <Pencil size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {displayedStaff.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">Tidak ada data</td></tr>
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
  const [tab, setTab] = useState<TabKey>('departemen');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections]       = useState<Section[]>([]);
  const [staff, setStaff]             = useState<Staff[]>([]);
  const [loading, setLoading]         = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [dRes, sRes, stRes] = await Promise.all([
        fetch('/review-prosedur/api/departments'),
        fetch('/review-prosedur/api/sections'),
        fetch('/review-prosedur/api/staff'),
      ]);
      setDepartments(await dRes.json());
      setSections(await sRes.json());
      setStaff(await stRes.json());
    } catch (e) {
      console.error('Gagal memuat data departemen:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const needsReviewCount = staff.filter(
    s => !s.unitType || s.parentDepartmentNama === FALLBACK_DEPT_NAME || s.unitNama === FALLBACK_DEPT_NAME
  ).length;

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
              Atur struktur Departemen, Section, dan Manager untuk eskalasi reminder review prosedur.
            </p>
          </div>

          {needsReviewCount > 0 && (
            <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
              <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                Ada <strong>{needsReviewCount} staff</strong> yang unit-nya belum jelas (hasil tebakan otomatis dari import Excel) —
                cek di tab <strong>Staff & Manager</strong>.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <TabButton active={tab === 'departemen'} onClick={() => setTab('departemen')} icon={Building2} label="Departemen" />
            <TabButton active={tab === 'section'}    onClick={() => setTab('section')}    icon={Layers}    label="Section" />
            <TabButton active={tab === 'staff'}      onClick={() => setTab('staff')}      icon={UserCog}   label="Staff & Manager" />
          </div>

          {tab === 'departemen' && <DepartemenTab departments={departments} staff={staff} onRefresh={loadAll} />}
          {tab === 'section'    && <SectionTab sections={sections} departments={departments} onRefresh={loadAll} />}
          {tab === 'staff'      && <StaffTab staff={staff} departments={departments} sections={sections} onRefresh={loadAll} />}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}