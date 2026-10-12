// app/user-management/page.tsx
'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Search, X, ChevronUp, ChevronDown, Trash2, CheckCircle2 } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface StaffDirectoryItem {
  kode: string;
  email: string;
  nama: string;
  jabatanRaw?: string | null;
  jabatan?: string | null;
  departmentNama?: string | null;
  unitNama?: string | null;
  parentDepartmentNama?: string | null;
  isManager?: boolean;
}

interface UserRow {
  id: number;
  username: string;
  full_name: string;
  email: string | null;
  role: string;
  is_active: boolean;
  has_encrypted: boolean;
  created_at: string;
  updated_at: string;
}

interface PasswordState {
  [key: string]: { visible: boolean; value: string | null; loading: boolean };
}

// 🆕 Sortable columns
type SortKey = 'fullName' | 'username' | 'role' | 'status';
type SortDir = 'asc' | 'desc' | null;

const EMPTY_FORM = {
  fullName: '',
  role: 'pic' as 'admin' | 'pic',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const EMPTY_EDIT = {
  id: 0,
  role: 'pic' as 'admin' | 'pic',
  fullName: '',
  username: '',
  email: '',
  isActive: true,
  newPassword: '',
  confirmPassword: '',
};

// ── Role Badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-100 text-violet-700">
      PIC
    </span>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
      active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-red-400'}`} />
      {active ? 'Aktif' : 'Nonaktif'}
    </span>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Input component ───────────────────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
const selectCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';

// ── 🆕 Sortable table header (pola sama seperti di halaman Status Prosedur:
// klik 1x → A→Z, klik 2x → Z→A, klik 3x → reset) ───────────────────────────────
function SortableTh({
  label, colKey, currentSort, currentDir, onSort,
}: {
  label: string; colKey: SortKey; currentSort: SortKey | null;
  currentDir: SortDir; onSort: (k: SortKey) => void;
}) {
  const active = currentSort === colKey;
  return (
    <th
      onClick={() => onSort(colKey)}
      title="Klik 1× → A→Z, klik 2× → Z→A, klik 3× → reset"
      className="text-left py-3 px-3 font-semibold text-slate-500 whitespace-nowrap cursor-pointer select-none hover:text-slate-800 hover:bg-slate-100 transition-colors"
    >
      <div className="flex items-center gap-1">
        {label}
        <span className="inline-flex flex-col" style={{ opacity: active ? 1 : 0.3 }}>
          <ChevronUp size={10} className={active && currentDir === 'asc' ? 'text-blue-600' : 'text-slate-400'} />
          <ChevronDown size={10} className={active && currentDir === 'desc' ? 'text-blue-600' : 'text-slate-400'} style={{ marginTop: '-2px' }} />
        </span>
      </div>
    </th>
  );
}

// ── Searchable Dropdown untuk Nama Staf & Manager ────────────────────────────
function StaffSearchDropdown({
  value,
  onSelect,
  onManualInput,
  staffList,
  loading = false,
  registeredEmails,
  error,
}: {
  value: string;
  onSelect: (staff: StaffDirectoryItem) => void;
  onManualInput: (nama: string) => void;
  staffList: StaffDirectoryItem[];
  loading?: boolean;
  registeredEmails?: Set<string>;
  error?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Autofocus input pencarian saat dropdown dibuka
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const sortedStaffList = useMemo(() => {
    return [...staffList].sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
  }, [staffList]);

  const filteredStaff = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return sortedStaffList;
    return sortedStaffList.filter(s =>
      (s.nama && s.nama.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.kode && s.kode.toLowerCase().includes(q)) ||
      (s.jabatan && s.jabatan.toLowerCase().includes(q)) ||
      (s.unitNama && s.unitNama.toLowerCase().includes(q)) ||
      (s.departmentNama && s.departmentNama.toLowerCase().includes(q))
    );
  }, [sortedStaffList, searchTerm]);

  const selectedStaff = useMemo(() => {
    if (!value.trim()) return null;
    return staffList.find(s => s.nama.trim().toLowerCase() === value.trim().toLowerCase()) || null;
  }, [staffList, value]);

  const handleOpen = () => {
    setSearchTerm('');
    setIsOpen(prev => !prev);
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Box */}
      <div
        onClick={handleOpen}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen();
          }
        }}
        className={`w-full px-3 py-2 text-sm rounded-lg border bg-white cursor-pointer select-none transition-all flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500 ring-1 ring-red-500' : isOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <div className="flex-1 min-w-0">
          {value ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-slate-800 truncate">{value}</span>
              {selectedStaff?.kode && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {selectedStaff.kode}
                </span>
              )}
              {selectedStaff?.jabatan && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  selectedStaff.isManager ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {selectedStaff.jabatan}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 text-xs">-- Pilih atau cari nama staf/manager --</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onManualInput('');
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors"
              title="Hapus pilihan"
            >
              <X size={13} />
            </button>
          )}
          <ChevronDown
            size={15}
            className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`}
          />
        </div>
      </div>

      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}

      {/* Floating Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
          {/* Header Search Box */}
          <div className="p-2.5 bg-slate-50 space-y-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Cari nama, kode, email, jabatan..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            <div className="flex items-center justify-between text-[10px] text-slate-500 px-0.5">
              <span>
                {loading
                  ? 'Memuat data staf...'
                  : searchTerm
                  ? `Ditemukan: ${filteredStaff.length} dari ${staffList.length} staf`
                  : `Daftar Semua Staf & Manager (${staffList.length} orang)`}
              </span>
              <span className="text-blue-600 font-medium">Klik untuk auto-fill</span>
            </div>
          </div>

          {/* List Staff */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-400">
                <span className="inline-block animate-spin mr-2">⟳</span> Memuat staf dari database...
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs text-slate-500">
                  Tidak ada staf yang cocok dengan &quot;{searchTerm}&quot;
                </p>
                {searchTerm.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      onManualInput(searchTerm.trim());
                      setIsOpen(false);
                    }}
                    className="text-xs text-blue-600 hover:underline font-semibold block mx-auto py-1 px-2 rounded hover:bg-blue-50"
                  >
                    Gunakan nama &quot;{searchTerm.trim()}&quot;
                  </button>
                )}
              </div>
            ) : (
              filteredStaff.map((staff, idx) => {
                const isSelected = value.trim().toLowerCase() === (staff.nama || '').trim().toLowerCase();
                const isAlreadyRegistered = staff.email && registeredEmails?.has(staff.email.trim().toLowerCase());

                return (
                  <button
                    key={`${staff.kode}-${idx}`}
                    type="button"
                    onClick={() => {
                      onSelect(staff);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full text-left px-3 py-2 transition-colors flex items-center justify-between gap-2.5 group ${
                      isSelected
                        ? 'bg-blue-50/90 text-blue-900 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-slate-900 group-hover:text-blue-700">
                          {staff.nama}
                        </span>
                        {staff.kode && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                            {staff.kode}
                          </span>
                        )}
                        {staff.jabatan && (
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                            staff.isManager ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {staff.jabatan}
                          </span>
                        )}
                        {staff.unitNama && (
                          <span className="text-[10px] text-slate-400">
                            • {staff.unitNama}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span className="truncate">{staff.email || '(Email belum diset)'}</span>
                        {isAlreadyRegistered && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                            Sudah ada akun PIC
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <CheckCircle2 size={15} className="text-blue-600 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer note link to kelola-departemen */}
          <div className="p-2 bg-slate-50 text-center">
            <p className="text-[10px] text-slate-500">
              Master staf &amp; manager diambil dari{' '}
              <Link href="/kelola-departemen" target="_blank" className="text-blue-600 hover:underline font-semibold">
                Kelola Departemen
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page Content ─────────────────────────────────────────────────────────
function UserManagementContent() {
  const { user } = useAuth();
  const [adminUsers, setAdminUsers] = useState<UserRow[]>([]);
  const [picUsers, setPicUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'admin' | 'pic'>('admin');
  const [passwordStates, setPasswordStates] = useState<PasswordState>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 🆕 Search + sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState<{ id: number; role: string; name: string } | null>(null);
  // 🆕 Konfirmasi hapus permanen — modal TERPISAH dari nonaktifkan, supaya
  // tidak tertukar (aksinya jauh lebih berisiko / tidak bisa dibatalkan)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: number; role: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form state
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [addLoading, setAddLoading] = useState(false);

  // 🆕 Master staff directory (dari kelola-departemen tab Staff & Manager)
  const [staffList, setStaffList] = useState<StaffDirectoryItem[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editLoading, setEditLoading] = useState(false);

  const [resetForm, setResetForm] = useState({ id: 0, role: 'pic' as 'admin' | 'pic', name: '', newPassword: '', confirmPassword: '' });
  const [resetErrors, setResetErrors] = useState<Record<string, string>>({});
  const [resetLoading, setResetLoading] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-admin-username': user?.username ?? '',
  }), [user]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/review-prosedur/api/user-management', {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setAdminUsers(data.adminUsers);
        setPicUsers(data.picUsers);
      }
    } catch {
      showToast('error', 'Gagal memuat data user');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  const fetchStaffList = useCallback(async () => {
    try {
      setLoadingStaff(true);
      const res = await fetch('/review-prosedur/api/staff');
      if (res.ok) {
        const data = await res.json();
        setStaffList(Array.isArray(data) ? data : []);
      }
    } catch {
      console.error('Gagal mengambil daftar staff');
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchStaffList();
  }, [fetchUsers, fetchStaffList]);

  // Set email PIC yang sudah terdaftar
  const registeredPicEmails = useMemo(() => {
    const set = new Set<string>();
    picUsers.forEach(u => {
      if (u.email) set.add(u.email.trim().toLowerCase());
    });
    return set;
  }, [picUsers]);

  // Handler saat nama staf dipilih dari dropdown
  const handleSelectStaffForAdd = (staff: StaffDirectoryItem) => {
    const cleanName = (staff.nama || '').trim();
    const cleanEmail = (staff.email || '').trim();
    setAddForm(prev => ({
      ...prev,
      fullName: cleanName,
      email: cleanEmail,
      username: prev.role === 'pic' ? (cleanEmail || cleanName.toLowerCase().replace(/\s+/g, '.')) : prev.username,
    }));
    setAddErrors(prev => {
      const next = { ...prev };
      delete next.fullName;
      if (cleanEmail) delete next.email;
      if (cleanEmail) delete next.username;
      return next;
    });
  };

  const handleManualNameForAdd = (nama: string) => {
    setAddForm(prev => ({
      ...prev,
      fullName: nama,
    }));
    if (nama.trim()) {
      setAddErrors(prev => {
        const next = { ...prev };
        delete next.fullName;
        return next;
      });
    }
  };

  // ── Toggle password visibility ──────────────────────────────────────────────
  const togglePassword = async (id: number, role: string) => {
    const key = `${role}-${id}`;
    const current = passwordStates[key];

    if (current?.visible) {
      setPasswordStates(prev => ({ ...prev, [key]: { ...prev[key], visible: false } }));
      return;
    }

    if (current?.value !== null && current?.value !== undefined) {
      setPasswordStates(prev => ({ ...prev, [key]: { ...prev[key], visible: true } }));
      return;
    }

    setPasswordStates(prev => ({ ...prev, [key]: { visible: false, value: null, loading: true } }));

    try {
      const res = await fetch(
        `/review-prosedur/api/user-management/password/${id}?role=${role}`,
        { headers: authHeaders() }
      );
      const data = await res.json();

      if (res.status === 422) {
        setPasswordStates(prev => ({ ...prev, [key]: { visible: false, value: 'UNAVAILABLE', loading: false } }));
        return;
      }

      if (!res.ok || !data.success) {
        showToast('error', data.message || 'Gagal mengambil password');
        setPasswordStates(prev => ({ ...prev, [key]: { visible: false, value: null, loading: false } }));
        return;
      }

      setPasswordStates(prev => ({ ...prev, [key]: { visible: true, value: data.password, loading: false } }));
    } catch {
      setPasswordStates(prev => ({ ...prev, [key]: { visible: false, value: null, loading: false } }));
      showToast('error', 'Gagal mengambil password');
    }
  };

  const copyPassword = (password: string) => {
    navigator.clipboard.writeText(password).then(() => {
      showToast('success', 'Password berhasil disalin');
    });
  };

  // ── Add user ────────────────────────────────────────────────────────────────
  const validateAdd = () => {
    const errs: Record<string, string> = {};
    if (!addForm.fullName.trim()) errs.fullName = 'Wajib diisi';
    if (!addForm.username.trim()) errs.username = 'Wajib diisi';
    if (addForm.role === 'pic' && !addForm.email.trim()) errs.email = 'Wajib diisi untuk PIC';
    if (!addForm.password) errs.password = 'Wajib diisi';
    else if (addForm.password.length < 6) errs.password = 'Minimal 6 karakter';
    if (addForm.password !== addForm.confirmPassword) errs.confirmPassword = 'Konfirmasi tidak cocok';
    return errs;
  };

  const handleAdd = async () => {
    const errs = validateAdd();
    setAddErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setAddLoading(true);
    try {
      const res = await fetch('/review-prosedur/api/user-management', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          fullName: addForm.fullName.trim(),
          role: addForm.role,
          username: addForm.username.trim(),
          email: addForm.email.trim() || undefined,
          password: addForm.password,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'User berhasil ditambahkan');
        setShowAddModal(false);
        setAddForm(EMPTY_FORM);
        fetchUsers();
      } else {
        showToast('error', data.error || 'Gagal menambah user');
      }
    } catch {
      showToast('error', 'Terjadi kesalahan server');
    } finally {
      setAddLoading(false);
    }
  };

  // ── Edit user ───────────────────────────────────────────────────────────────
  const openEdit = (u: UserRow) => {
    setEditForm({
      id: u.id,
      role: u.role === 'admin' ? 'admin' : 'pic',
      fullName: u.full_name,
      username: u.username,
      email: u.email ?? '',
      isActive: u.is_active,
      newPassword: '',
      confirmPassword: '',
    });
    setEditErrors({});
    setShowEditModal(true);
  };

  const validateEdit = () => {
    const errs: Record<string, string> = {};
    if (!editForm.fullName.trim()) errs.fullName = 'Wajib diisi';
    if (editForm.newPassword && editForm.newPassword.length < 6) errs.newPassword = 'Minimal 6 karakter';
    if (editForm.newPassword && editForm.newPassword !== editForm.confirmPassword) errs.confirmPassword = 'Konfirmasi tidak cocok';
    return errs;
  };

  const handleEdit = async () => {
    const errs = validateEdit();
    setEditErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setEditLoading(true);
    try {
      const res = await fetch('/review-prosedur/api/user-management', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          id: editForm.id,
          role: editForm.role,
          fullName: editForm.fullName.trim(),
          username: editForm.username.trim(),
          email: editForm.email.trim() || undefined,
          isActive: editForm.isActive,
          newPassword: editForm.newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'User berhasil diperbarui');
        setShowEditModal(false);
        fetchUsers();
      } else {
        showToast('error', data.error || 'Gagal memperbarui user');
      }
    } catch {
      showToast('error', 'Terjadi kesalahan server');
    } finally {
      setEditLoading(false);
    }
  };

  // ── Reset password ──────────────────────────────────────────────────────────
  const openReset = (u: UserRow) => {
    setResetForm({ id: u.id, role: u.role === 'admin' ? 'admin' : 'pic', name: u.full_name, newPassword: '', confirmPassword: '' });
    setResetErrors({});
    setShowResetModal(true);
  };

  const handleReset = async () => {
    const errs: Record<string, string> = {};
    if (!resetForm.newPassword) errs.newPassword = 'Wajib diisi';
    else if (resetForm.newPassword.length < 6) errs.newPassword = 'Minimal 6 karakter';
    if (resetForm.newPassword !== resetForm.confirmPassword) errs.confirmPassword = 'Konfirmasi tidak cocok';
    setResetErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setResetLoading(true);
    try {
      const res = await fetch('/review-prosedur/api/user-management/reset-password', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ id: resetForm.id, role: resetForm.role, newPassword: resetForm.newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Password berhasil direset');
        setShowResetModal(false);
        const key = `${resetForm.role}-${resetForm.id}`;
        setPasswordStates(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        fetchUsers();
      } else {
        showToast('error', data.error || 'Gagal reset password');
      }
    } catch {
      showToast('error', 'Terjadi kesalahan server');
    } finally {
      setResetLoading(false);
    }
  };

  // ── Deactivate (soft) ─────────────────────────────────────────────────────
  const handleDeactivate = async () => {
    if (!showDeactivateConfirm) return;
    try {
      const res = await fetch('/review-prosedur/api/user-management', {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ id: showDeactivateConfirm.id, role: showDeactivateConfirm.role }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'User berhasil dinonaktifkan');
        setShowDeactivateConfirm(null);
        fetchUsers();
      } else {
        showToast('error', data.error || 'Gagal menonaktifkan user');
      }
    } catch {
      showToast('error', 'Terjadi kesalahan server');
    }
  };

  // ── 🆕 Hapus permanen ────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!showDeleteConfirm) return;
    setDeleteLoading(true);
    try {
      const res = await fetch('/review-prosedur/api/user-management', {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ id: showDeleteConfirm.id, role: showDeleteConfirm.role, permanent: true }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'User berhasil dihapus permanen');
        setShowDeleteConfirm(null);
        const key = `${showDeleteConfirm.role}-${showDeleteConfirm.id}`;
        setPasswordStates(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        fetchUsers();
      } else {
        showToast('error', data.error || 'Gagal menghapus user');
      }
    } catch {
      showToast('error', 'Terjadi kesalahan server');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── 🆕 Sort handler — 3-state: asc → desc → reset ──────────────────────────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === 'asc') { setSortDir('desc'); }
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
    } else {
      setSortKey(key); setSortDir('asc');
    }
  };

  // ── 🆕 Data yang ditampilkan: base rows → search → sort ───────────────────
  const baseRows = activeTab === 'admin' ? adminUsers : picUsers;

  const displayedRows = useMemo(() => {
    let result = baseRows;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(u =>
        u.full_name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q)
      );
    }

    if (sortKey && sortDir) {
      const dir = sortDir === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        if (sortKey === 'fullName') return a.full_name.localeCompare(b.full_name) * dir;
        if (sortKey === 'username') return a.username.localeCompare(b.username) * dir;
        if (sortKey === 'role') return a.role.localeCompare(b.role) * dir;
        if (sortKey === 'status') return (Number(a.is_active) - Number(b.is_active)) * dir;
        return 0;
      });
    }

    return result;
  }, [baseRows, searchQuery, sortKey, sortDir]);

  const hasFilter = searchQuery.trim() !== '';

  // ── Table rows ──────────────────────────────────────────────────────────────
  const renderPasswordCell = (u: UserRow) => {
    const key = `${u.role === 'admin' ? 'admin' : 'pic'}-${u.id}`;
    const state = passwordStates[key];

    if (!u.has_encrypted || state?.value === 'UNAVAILABLE') {
      return (
        <div className="flex items-center gap-2">
          <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
            Belum tersedia
          </span>
        </div>
      );
    }

    if (state?.loading) {
      return (
        <div className="flex items-center gap-1 text-slate-400 text-xs">
          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Memuat...
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs text-slate-700 min-w-[80px]">
          {state?.visible && state?.value ? state.value : '••••••••'}
        </span>
        <button
          onClick={() => togglePassword(u.id, u.role === 'admin' ? 'admin' : 'pic')}
          className="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors"
          title={state?.visible ? 'Sembunyikan' : 'Tampilkan password'}
        >
          {state?.visible ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
        {state?.visible && state?.value && (
          <button
            onClick={() => copyPassword(state.value!)}
            className="text-slate-400 hover:text-blue-600 p-1 rounded transition-colors"
            title="Salin password"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  const renderTable = (rows: UserRow[]) => {
    if (rows.length === 0) {
      return (
        <div className="text-center py-12 text-slate-400">
          <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
          <p className="text-sm">{hasFilter ? 'Tidak ada user yang sesuai pencarian' : 'Belum ada user'}</p>
          {hasFilter && (
            <button onClick={() => setSearchQuery('')} className="mt-2 text-xs text-blue-600 hover:underline">
              Hapus pencarian
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              <SortableTh label="Nama Lengkap" colKey="fullName" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableTh label="Username / Email" colKey="username" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableTh label="Role" colKey="role" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableTh label="Status" colKey="status" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <th className="text-left py-3 px-3 font-semibold text-slate-500">Password</th>
              <th className="text-left py-3 px-3 font-semibold text-slate-500">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">{u.full_name}</td>
                <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{u.username}</td>
                <td className="py-3 px-3"><RoleBadge role={u.role} /></td>
                <td className="py-3 px-3"><StatusBadge active={u.is_active} /></td>
                <td className="py-3 px-3">{renderPasswordCell(u)}</td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Edit user"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openReset(u)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      title="Reset password"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                      </svg>
                    </button>
                    {u.is_active && (
                      <button
                        onClick={() => setShowDeactivateConfirm({ id: u.id, role: u.role === 'admin' ? 'admin' : 'pic', name: u.full_name })}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Nonaktifkan user"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                      </button>
                    )}
                    {/* 🆕 Hapus permanen */}
                    <button
                      onClick={() => setShowDeleteConfirm({ id: u.id, role: u.role === 'admin' ? 'admin' : 'pic', name: u.full_name })}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Hapus user permanen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Kelola User</h1>
            <p className="text-sm text-slate-500 mt-0.5">Kelola akun Admin dan PIC yang dapat mengakses sistem</p>
          </div>
          <button
            onClick={() => {
              setAddForm({ ...EMPTY_FORM, role: activeTab });
              setAddErrors({});
              setShowAddModal(true);
              fetchStaffList();
            }}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tambah User
          </button>
        </div>

        {/* Tabs + 🆕 Search */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            {(['admin', 'pic'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'admin' ? 'Admin' : 'PIC'}{' '}
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === tab ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  {tab === 'admin' ? adminUsers.length : picUsers.length}
                </span>
              </button>
            ))}
          </div>

          {/* 🆕 Search bar */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama, username, email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white
                         placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                         hover:border-slate-300 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {hasFilter && (
          <p className="text-xs text-slate-500 -mt-3">
            Menampilkan <span className="font-semibold text-slate-700">{displayedRows.length}</span> dari{' '}
            <span className="font-semibold text-slate-700">{baseRows.length}</span> user
          </p>
        )}

        {/* Table card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Memuat data...</span>
            </div>
          ) : (
            renderTable(displayedRows)
          )}
        </div>

      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          {toast.message}
        </div>
      )}

      {/* ── Add User Modal ── */}
      {showAddModal && (
        <Modal title="Tambah User Baru" onClose={() => setShowAddModal(false)}>
          <div className="space-y-4">
            <Field label="Role" required>
              <select
                className={selectCls}
                value={addForm.role}
                onChange={e => {
                  const newRole = e.target.value as 'admin' | 'pic';
                  setAddForm(f => ({
                    ...f,
                    role: newRole,
                    username: newRole === 'pic' && f.email ? f.email : f.username,
                  }));
                }}
              >
                <option value="pic">PIC</option>
                <option value="admin">Admin</option>
              </select>
            </Field>

            <Field label="Nama Lengkap" required>
              {addForm.role === 'pic' ? (
                <StaffSearchDropdown
                  value={addForm.fullName}
                  onSelect={handleSelectStaffForAdd}
                  onManualInput={handleManualNameForAdd}
                  staffList={staffList}
                  loading={loadingStaff}
                  registeredEmails={registeredPicEmails}
                  error={addErrors.fullName}
                />
              ) : (
                <>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="contoh: Budi Santoso"
                    value={addForm.fullName}
                    onChange={e => setAddForm(f => ({ ...f, fullName: e.target.value }))}
                  />
                  {addErrors.fullName && <p className="text-[11px] text-red-500 mt-1">{addErrors.fullName}</p>}
                </>
              )}
            </Field>

            <Field label="Email" required={addForm.role === 'pic'}>
              <input
                type="email"
                className={inputCls}
                placeholder={addForm.role === 'pic' ? 'contoh: nama.pic@jai.co.id' : 'contoh: budi@example.com'}
                value={addForm.email}
                onChange={e => {
                  const val = e.target.value;
                  setAddForm(f => ({
                    ...f,
                    email: val,
                    username: f.role === 'pic' ? val : f.username,
                  }));
                }}
              />
              {addErrors.email && <p className="text-[11px] text-red-500 mt-1">{addErrors.email}</p>}
              {addForm.role === 'pic' && addForm.email && (
                <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                  <CheckCircle2 size={12} className="shrink-0" />
                  Email otomatis terisi dari staf &amp; digunakan login PIC
                </p>
              )}
            </Field>

            <Field label="Username" required>
              <input
                type="text"
                className={inputCls}
                placeholder={addForm.role === 'pic' ? 'contoh: nama.pic@jai.co.id' : 'contoh: budi.admin'}
                value={addForm.username}
                onChange={e => setAddForm(f => ({ ...f, username: e.target.value }))}
              />
              {addErrors.username && <p className="text-[11px] text-red-500 mt-1">{addErrors.username}</p>}
              {addForm.role === 'pic' && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  (Untuk PIC, username login disamakan dengan email)
                </p>
              )}
            </Field>

            <Field label="Password" required>
              <input
                type="password"
                className={inputCls}
                placeholder="Minimal 6 karakter"
                value={addForm.password}
                onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
              />
              {addErrors.password && <p className="text-[11px] text-red-500 mt-1">{addErrors.password}</p>}
            </Field>

            <Field label="Konfirmasi Password" required>
              <input
                type="password"
                className={inputCls}
                placeholder="Ulangi password"
                value={addForm.confirmPassword}
                onChange={e => setAddForm(f => ({ ...f, confirmPassword: e.target.value }))}
              />
              {addErrors.confirmPassword && <p className="text-[11px] text-red-500 mt-1">{addErrors.confirmPassword}</p>}
            </Field>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAdd}
                disabled={addLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold transition-all active:scale-95"
              >
                {addLoading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit User Modal ── */}
      {showEditModal && (
        <Modal title="Edit User" onClose={() => setShowEditModal(false)}>
          <div className="space-y-4">
            <Field label="Nama Lengkap" required>
              <input type="text" className={inputCls} value={editForm.fullName}
                onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} />
              {editErrors.fullName && <p className="text-[11px] text-red-500 mt-1">{editErrors.fullName}</p>}
            </Field>
            {editForm.role === 'admin' && (
              <Field label="Username" required>
                <input type="text" className={inputCls} value={editForm.username}
                  onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} />
              </Field>
            )}
            <Field label="Email">
              <input type="email" className={inputCls} value={editForm.email}
                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label="Status">
              <select className={selectCls} value={editForm.isActive ? 'active' : 'inactive'}
                onChange={e => setEditForm(f => ({ ...f, isActive: e.target.value === 'active' }))}>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </Field>
            <div className="border-t border-slate-100 pt-4">
              <p className="text-[11px] text-slate-500 mb-3">Kosongkan jika tidak ingin mengubah password</p>
              <div className="space-y-3">
                <Field label="Password Baru">
                  <input type="password" className={inputCls} placeholder="Minimal 6 karakter"
                    value={editForm.newPassword} onChange={e => setEditForm(f => ({ ...f, newPassword: e.target.value }))} />
                  {editErrors.newPassword && <p className="text-[11px] text-red-500 mt-1">{editErrors.newPassword}</p>}
                </Field>
                <Field label="Konfirmasi Password Baru">
                  <input type="password" className={inputCls} placeholder="Ulangi password baru"
                    value={editForm.confirmPassword} onChange={e => setEditForm(f => ({ ...f, confirmPassword: e.target.value }))} />
                  {editErrors.confirmPassword && <p className="text-[11px] text-red-500 mt-1">{editErrors.confirmPassword}</p>}
                </Field>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Batal
              </button>
              <button onClick={handleEdit} disabled={editLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold transition-all active:scale-95">
                {editLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Reset Password Modal ── */}
      {showResetModal && (
        <Modal title={`Reset Password — ${resetForm.name}`} onClose={() => setShowResetModal(false)}>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
              Password baru akan menggantikan password lama. User harus menggunakan password baru ini untuk login.
            </div>
            <Field label="Password Baru" required>
              <input type="password" className={inputCls} placeholder="Minimal 6 karakter"
                value={resetForm.newPassword} onChange={e => setResetForm(f => ({ ...f, newPassword: e.target.value }))} />
              {resetErrors.newPassword && <p className="text-[11px] text-red-500 mt-1">{resetErrors.newPassword}</p>}
            </Field>
            <Field label="Konfirmasi Password Baru" required>
              <input type="password" className={inputCls} placeholder="Ulangi password baru"
                value={resetForm.confirmPassword} onChange={e => setResetForm(f => ({ ...f, confirmPassword: e.target.value }))} />
              {resetErrors.confirmPassword && <p className="text-[11px] text-red-500 mt-1">{resetErrors.confirmPassword}</p>}
            </Field>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowResetModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Batal
              </button>
              <button onClick={handleReset} disabled={resetLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-xs font-semibold transition-all active:scale-95">
                {resetLoading ? 'Mereset...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Deactivate Confirm ── */}
      {showDeactivateConfirm && (
        <Modal title="Nonaktifkan User" onClose={() => setShowDeactivateConfirm(null)}>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
              User <strong>{showDeactivateConfirm.name}</strong> akan dinonaktifkan dan tidak dapat login lagi. Data tidak akan dihapus — bisa diaktifkan kembali lewat Edit User.
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowDeactivateConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Batal
              </button>
              <button onClick={handleDeactivate}
                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-all active:scale-95">
                Ya, Nonaktifkan
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── 🆕 Delete (Permanen) Confirm ── */}
      {showDeleteConfirm && (
        <Modal title="Hapus User Permanen" onClose={() => !deleteLoading && setShowDeleteConfirm(null)}>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-800 space-y-1.5">
              <p className="font-bold">⚠ Tindakan ini PERMANEN dan tidak dapat dibatalkan.</p>
              <p>
                Akun <strong>{showDeleteConfirm.name}</strong> beserta datanya akan <strong>dihapus total</strong> dari
                database — bukan sekadar dinonaktifkan. Kalau kamu cuma ingin user tidak bisa login sementara,
                pakai tombol <strong>Nonaktifkan</strong> saja.
              </p>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowDeleteConfirm(null)} disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                Batal
              </button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold transition-all active:scale-95">
                {deleteLoading ? 'Menghapus...' : 'Ya, Hapus Permanen'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function UserManagementPage() {
  return (
    <ProtectedRoute>
      <AdminLayout>
        <UserManagementContent />
      </AdminLayout>
    </ProtectedRoute>
  );
}