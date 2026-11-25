// app/arsip-prosedur/page.tsx
'use client';
import { useState, useMemo, useEffect } from 'react';
import {
  ProcedureDocument,
  StatusType,
  getArchivedProcedures,
  restoreProcedure,
  deleteProcedurePermanently,
} from '@/data/procedures/all-procedures';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Search, X, RotateCcw, Trash2, Ban, Archive, FileText, AlertTriangle } from 'lucide-react';
import { useDialog } from '@/contexts/DialogContext';

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: StatusType }) {
  const styles: Record<string, { bg: string; text: string; border: string; icon: string }> = {
    Revisi:                  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: '⟳' },
    Relevan:                 { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '✓' },
    Obsolete:                { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     icon: '⊘' },
    Menunggu:                { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    icon: '⏳' },
    'Belum dikirim':         { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  icon: '📋' },
    'Belum dikirim ke PIC':  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  icon: '📋' },
    'Telah terkirim':        { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',    icon: '📨' },
    'Telah terkirim ke PIC': { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',    icon: '📨' },
    'Belum dikirim ke MGR':  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: '📋' },
    'Telah terkirim ke MGR': { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    icon: '📨' },
    'Telah dibaca':          { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  icon: '👁️' },
    'Menunggu ACC Prepared': { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  icon: '📝' },
    'Menunggu ACC Checked':  { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  icon: '🔍' },
    'Menunggu ACC Approved': { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  icon: '✅' },
    'Ditolak':               { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    icon: '✕' },
    '-':                     { bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',   icon: '?' },
  };

  let s = styles[status];
  if (!s) {
    if (status.startsWith('Belum dikirim ke MGR')) {
      s = styles['Belum dikirim ke MGR'];
    } else if (status.startsWith('Telah terkirim ke MGR')) {
      s = styles['Telah terkirim ke MGR'];
    } else {
      s = styles['-'];
    }
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap border ${s.bg} ${s.text} ${s.border}`}>
      {s.icon} {status}
    </span>
  );
}

// ── Helper Formatter Tanggal ──────────────────────────────────────────────────
function formatDate(dateStr?: string | null): string {
  if (!dateStr || dateStr === '-' || dateStr === 'null' || dateStr === 'undefined') return '-';
  let s = dateStr;
  if (typeof s === 'string' && !s.endsWith('Z') && !s.includes('+') && s.includes(' ')) {
    s = s.replace(' ', 'T') + '+07:00';
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ── Archived Table ────────────────────────────────────────────────────────────
function ArchivedTable({
  data,
  activeTab,
  onRestore,
  onDelete,
}: {
  data: ProcedureDocument[];
  activeTab: 'obsolete' | 'trash';
  onRestore: (nomorDokumen: string, namaDokumen?: string) => void;
  onDelete: (nomorDokumen: string, namaDokumen?: string) => void;
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        {activeTab === 'obsolete' ? (
          <>
            <Ban size={44} className="mx-auto mb-3 text-red-300" />
            <p className="text-sm font-semibold text-slate-700">Tidak Ada Prosedur Obsolete</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Dokumen yang diubah statusnya menjadi Obsolete oleh PIC atau admin akan otomatis tersimpan di sini.
            </p>
          </>
        ) : (
          <>
            <Trash2 size={44} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">Trash Kosong</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Tidak ada dokumen yang dihapus dari daftar prosedur aktif.
            </p>
          </>
        )}
      </div>
    );
  }

  const dateColHeader = activeTab === 'obsolete' ? 'Tgl Obsolete' : 'Tgl Dihapus';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-slate-50/80 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Dokumen Prosedur
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              PIC & Owner
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Tgl Approval
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              {activeTab === 'obsolete' ? 'Status' : 'Status Terakhir'}
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              {dateColHeader}
            </th>
            <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, index) => {
            const dateDisplay = row.deletedAt || row.updatedAt;
            return (
              <tr
                key={`${row.nomorDokumen}-${index}`}
                className={`transition-colors hover:bg-blue-50/40 ${index % 2 === 1 ? 'bg-slate-50/30' : ''}`}
              >
                {/* Dokumen: Nama + Nomor + Level + Revisi */}
                <td className="px-4 py-3">
                  <p className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug" title={row.namaDokumen}>
                    {row.namaDokumen}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[11px]">
                    <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                      {row.nomorDokumen}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-medium">Rev {row.revisi || '0'}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-medium">Level {row.levelDokumen || '-'}</span>
                  </div>
                </td>

                {/* PIC & Owner & Email */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-xs font-bold text-slate-800 truncate" title={row.pic}>
                    {row.pic || '-'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate" title={row.owner}>
                    Owner: <span className="text-slate-700 font-semibold">{row.owner || '-'}</span>
                  </p>
                  {row.email && (
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[170px]" title={row.email}>
                      {row.email}
                    </p>
                  )}
                </td>

                {/* Tanggal Selesai Approval */}
                <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 font-medium">
                  {formatDate(row.tanggalSelesaiApproval)}
                </td>

                {/* Status */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={row.status} />
                </td>

                {/* Tanggal Obsolete / Dihapus */}
                <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                  {formatDate(dateDisplay)}
                </td>

                {/* Aksi */}
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => onRestore(row.nomorDokumen, row.namaDokumen)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all active:scale-95 shadow-2xs cursor-pointer"
                      title="Kembalikan dokumen ke daftar aktif dengan status RELEVAN"
                    >
                      <RotateCcw size={12} />
                      <span>Restore</span>
                    </button>
                    <button
                      onClick={() => onDelete(row.nomorDokumen, row.namaDokumen)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all active:scale-95 shadow-2xs cursor-pointer"
                      title="Hapus permanen dokumen dari database"
                    >
                      <Trash2 size={12} />
                      <span>Hapus</span>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
      <p className="text-xs text-slate-500">
        Menampilkan <span className="font-semibold text-slate-700">{startIndex}</span> sampai{' '}
        <span className="font-semibold text-slate-700">{endIndex}</span> dari{' '}
        <span className="font-semibold text-slate-700">{totalItems}</span> entri
      </p>
      <div className="flex gap-1.5">
        <button
          onClick={onPrevious}
          disabled={currentPage === 1}
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          ← Sebelumnya
        </button>
        <span className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold min-w-[60px] text-center">
          {currentPage} / {totalPages || 1}
        </span>
        <button
          onClick={onNext}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          Berikutnya →
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const ROWS_PER_PAGE = 10;

export default function ArsipProsedurPage() {
  const { showConfirm, showSuccess, showError } = useDialog();
  const [activeTab,    setActiveTab]    = useState<'obsolete' | 'trash'>('obsolete');
  const [searchValue,  setSearchValue]  = useState('');
  const [currentPage,  setCurrentPage]  = useState(1);
  const [archivedData, setArchivedData] = useState<ProcedureDocument[]>([]);
  const [loading,      setLoading]      = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getArchivedProcedures();
      setArchivedData(data);
    } catch (error) {
      console.error('Error loading archived procedures:', error);
      showError('Gagal memuat data arsip. Silakan refresh halaman.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter per tab
  const obsoleteDocs = useMemo(() => {
    return archivedData.filter(d => d.status === 'Obsolete');
  }, [archivedData]);

  const trashDocs = useMemo(() => {
    return archivedData.filter(d => d.status !== 'Obsolete');
  }, [archivedData]);

  const currentTabData = activeTab === 'obsolete' ? obsoleteDocs : trashDocs;

  // Search filter
  const filteredData = useMemo(() => {
    if (!searchValue) return currentTabData;
    const q = searchValue.toLowerCase();
    return currentTabData.filter(
      r =>
        (r.namaDokumen && r.namaDokumen.toLowerCase().includes(q)) ||
        (r.nomorDokumen && r.nomorDokumen.toLowerCase().includes(q)) ||
        (r.pic && r.pic.toLowerCase().includes(q)) ||
        (r.owner && r.owner.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q))
    );
  }, [searchValue, currentTabData]);

  const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);
  const startIndex = filteredData.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1;
  const endIndex   = Math.min(currentPage * ROWS_PER_PAGE, filteredData.length);
  const pageData   = filteredData.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  // Restore handler
  const handleRestore = async (nomorDokumen: string, namaDokumen?: string) => {
    const docTitle = namaDokumen || nomorDokumen;
    const tabLabel = activeTab === 'obsolete' ? 'Obsolete' : 'Terhapus';
    const confirmed = await showConfirm(
      `Apakah Anda yakin ingin me-restore dokumen "${docTitle}" dari tab ${tabLabel} kembali ke status RELEVAN?\n\nDokumen akan dipindahkan kembali ke daftar prosedur aktif dengan status RELEVAN.`,
      'Konfirmasi Restore Dokumen'
    );
    if (!confirmed) return;
    try {
      await restoreProcedure(nomorDokumen);
      await loadData();
      showSuccess(`Dokumen "${docTitle}" berhasil di-restore kembali ke status RELEVAN!`);
    } catch (error: any) {
      showError('Gagal me-restore prosedur: ' + (error.message || 'Unknown error'));
    }
  };

  // Permanent Delete handler
  const handleDeletePermanently = async (nomorDokumen: string, namaDokumen?: string) => {
    const docTitle = namaDokumen || nomorDokumen;
    const confirmed = await showConfirm(
      `⚠️ PERINGATAN: Hapus Permanen!\n\nApakah Anda YAKIN ingin menghapus dokumen "${docTitle}" secara PERMANEN?\n\nData dokumen ini akan dihapus selamanya dari database dan TIDAK DAPAT dikembalikan!`,
      'Konfirmasi Hapus Permanen'
    );
    if (!confirmed) return;

    try {
      await deleteProcedurePermanently(nomorDokumen);
      await loadData();
      showSuccess(`Dokumen "${docTitle}" berhasil dihapus secara permanen!`);
    } catch (error: any) {
      showError('Gagal menghapus prosedur: ' + (error.message || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Memuat data arsip...</p>
            </div>
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-[1600px] mx-auto space-y-6">

          {/* ── Page Header ─────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Arsip Prosedur</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Kelola dokumen yang sudah Obsolete (tidak berlaku) dan dokumen yang dihapus (Trash).
              </p>
            </div>
          </div>

          {/* ── 2 Tabs Navigation: Obsolete & Terhapus (Trash) ──────────── */}
          <div className="flex items-center gap-2 border-b border-slate-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab('obsolete');
                setSearchValue('');
                setCurrentPage(1);
              }}
              className={`inline-flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-all -mb-px cursor-pointer ${
                activeTab === 'obsolete'
                  ? 'border-red-600 text-red-600 bg-red-50/70 rounded-t-xl shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Ban size={16} className={activeTab === 'obsolete' ? 'text-red-600' : 'text-slate-400'} />
              <span>Obsolete</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === 'obsolete' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {obsoleteDocs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('trash');
                setSearchValue('');
                setCurrentPage(1);
              }}
              className={`inline-flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-all -mb-px cursor-pointer ${
                activeTab === 'trash'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/70 rounded-t-xl shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Trash2 size={16} className={activeTab === 'trash' ? 'text-blue-600' : 'text-slate-400'} />
              <span>Terhapus (Trash)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === 'trash' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {trashDocs.length}
              </span>
            </button>
          </div>

          {/* ── Search Bar & Info ────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder={`Cari nama, nomor dokumen, owner, atau PIC di tab ${
                    activeTab === 'obsolete' ? 'Obsolete' : 'Terhapus'
                  }…`}
                  value={searchValue}
                  onChange={e => {
                    setSearchValue(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 hover:bg-white transition-all"
                />
                {searchValue && (
                  <button
                    onClick={() => {
                      setSearchValue('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            {searchValue && (
              <p className="text-xs text-slate-500 mt-3">
                Menampilkan <span className="font-semibold text-slate-700">{filteredData.length}</span> dari{' '}
                <span className="font-semibold text-slate-700">{currentTabData.length}</span> dokumen di tab{' '}
                <span className="font-semibold text-slate-700">
                  {activeTab === 'obsolete' ? 'Obsolete' : 'Terhapus (Trash)'}
                </span>
              </p>
            )}
          </div>

          {/* ── Table Container ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {activeTab === 'obsolete'
                    ? 'Daftar Dokumen Obsolete'
                    : 'Daftar Dokumen Terhapus (Trash)'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeTab === 'obsolete'
                    ? 'Dokumen yang tidak berlaku lagi. Gunakan Restore untuk mengaktifkan kembali ke status RELEVAN.'
                    : 'Dokumen yang dihapus dari prosedur aktif. Gunakan Restore untuk memulihkan ke status RELEVAN.'}
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                Total: {filteredData.length} dokumen
              </span>
            </div>

            <ArchivedTable
              data={pageData}
              activeTab={activeTab}
              onRestore={handleRestore}
              onDelete={handleDeletePermanently}
            />

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages || 1}
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={filteredData.length}
              onPrevious={() => {
                if (currentPage > 1) setCurrentPage(currentPage - 1);
              }}
              onNext={() => {
                if (currentPage < totalPages) setCurrentPage(currentPage + 1);
              }}
            />
          </div>

        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
