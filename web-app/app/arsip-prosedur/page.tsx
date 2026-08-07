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
import { Search, X, RotateCcw, Trash2, Archive, FileText } from 'lucide-react';

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: StatusType }) {
  const styles: Partial<Record<StatusType, { bg: string; text: string; border: string; icon: string }>> = {
    Revisi:           { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: '⟳' },
    Relevan:          { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '✓' },
    Obsolete:         { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     icon: '⊘' },
    Menunggu:         { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    icon: '⏳' },
    'Belum dikirim':  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  icon: '📋' },
    'Telah terkirim': { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',    icon: '📨' },
    'Telah dibaca':   { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  icon: '👁️' },
    '-':              { bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',   icon: '?' },
  };
  const s = styles[status] ?? styles['-']!;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap border ${s.bg} ${s.text} ${s.border}`}>
      {s.icon} {status}
    </span>
  );
}

// ── Archived Table ────────────────────────────────────────────────────────────
function ArchivedTable({
  data,
  onRestore,
  onDelete,
}: {
  data: ProcedureDocument[];
  onRestore: (nomorDokumen: string) => void;
  onDelete: (nomorDokumen: string) => void;
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Archive size={40} className="mx-auto mb-3 text-slate-300" />
        <p className="text-sm font-medium">Tidak ada prosedur yang diarsipkan</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50/80 border-b border-slate-200">
          <tr>
            {['Nama Dokumen', 'Nomor Dokumen', 'Level', 'Tgl Approval', 'Revisi', 'Owner', 'PIC', 'Email', 'Status', 'Tgl Arsip', 'Aksi'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, index) => (
            <tr key={`${row.nomorDokumen}-${index}`}
              className={`transition-colors hover:bg-blue-50/40 ${index % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
              <td className="px-4 py-3 text-xs font-medium text-slate-800 max-w-[200px]">
                <span className="line-clamp-2">{row.namaDokumen}</span>
              </td>
              <td className="px-4 py-3 text-xs text-slate-600 font-mono whitespace-nowrap">{row.nomorDokumen}</td>
              <td className="px-4 py-3 text-xs text-slate-600">{row.levelDokumen}</td>
              <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{row.tanggalSelesaiApproval}</td>
              <td className="px-4 py-3 text-xs text-slate-600 text-center font-semibold">{row.revisi}</td>
              <td className="px-4 py-3 text-xs text-slate-600">{row.owner}</td>
              <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{row.pic}</td>
              <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{row.email || '-'}</td>
              <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
              <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                {row.deletedAt ? new Date(row.deletedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => onRestore(row.nomorDokumen)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all active:scale-95"
                    title="Restore prosedur">
                    <RotateCcw size={12} /> Restore
                  </button>
                  <button onClick={() => onDelete(row.nomorDokumen)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all active:scale-95"
                    title="Hapus permanen">
                    <Trash2 size={12} /> Hapus
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({
  currentPage, totalPages, startIndex, endIndex, totalItems, onPrevious, onNext,
}: {
  currentPage: number; totalPages: number; startIndex: number;
  endIndex: number; totalItems: number; onPrevious: () => void; onNext: () => void;
}) {
  return (
    <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
      <p className="text-xs text-slate-500">
        Menampilkan <span className="font-semibold text-slate-700">{startIndex}</span> sampai{' '}
        <span className="font-semibold text-slate-700">{endIndex}</span> dari{' '}
        <span className="font-semibold text-slate-700">{totalItems}</span> entri
      </p>
      <div className="flex gap-1.5">
        <button onClick={onPrevious} disabled={currentPage === 1}
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95">
          ← Sebelumnya
        </button>
        <span className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold min-w-[60px] text-center">
          {currentPage} / {totalPages || 1}
        </span>
        <button onClick={onNext} disabled={currentPage >= totalPages}
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95">
          Berikutnya →
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const ROWS_PER_PAGE = 10;

export default function ArsipProsedurPage() {
  const [searchValue,  setSearchValue]  = useState('');
  const [currentPage,  setCurrentPage]  = useState(1);
  const [archivedData, setArchivedData] = useState<ProcedureDocument[]>([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await getArchivedProcedures();
        setArchivedData(data);
      } catch (error) {
        console.error('Error loading archived procedures:', error);
        alert('Gagal memuat data arsip. Silakan refresh halaman.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleRestore = async (nomorDokumen: string) => {
    if (!window.confirm('Apakah Anda yakin ingin me-restore prosedur ini?\n\nProsedur akan dipindahkan kembali ke daftar aktif.')) return;
    try {
      await restoreProcedure(nomorDokumen);
      setArchivedData(await getArchivedProcedures());
      alert('Prosedur berhasil di-restore!');
    } catch (error: any) {
      alert('Gagal me-restore prosedur: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDeletePermanently = async (nomorDokumen: string) => {
    if (!window.confirm(
      '⚠️ PERINGATAN: Hapus Permanen! ⚠️\n\nApakah Anda YAKIN ingin menghapus prosedur ini secara PERMANEN?\n\nData yang terhapus TIDAK DAPAT dikembalikan!\n\nKlik OK untuk melanjutkan.'
    )) return;
    if (!window.confirm('Konfirmasi terakhir!\n\nAnda akan menghapus prosedur ini SELAMANYA.\n\nApakah Anda benar-benar yakin?')) return;
    try {
      await deleteProcedurePermanently(nomorDokumen);
      setArchivedData(await getArchivedProcedures());
      alert('✓ Prosedur berhasil dihapus secara permanen!');
    } catch (error: any) {
      alert('Gagal menghapus prosedur: ' + (error.message || 'Unknown error'));
    }
  };

  const filteredData = useMemo(() => {
    if (!searchValue) return archivedData;
    const q = searchValue.toLowerCase();
    return archivedData.filter(r =>
      r.namaDokumen.toLowerCase().includes(q) || r.nomorDokumen.toLowerCase().includes(q)
    );
  }, [searchValue, archivedData]);

  const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);
  const startIndex = filteredData.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1;
  const endIndex   = Math.min(currentPage * ROWS_PER_PAGE, filteredData.length);
  const pageData   = filteredData.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

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

          {/* Page header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Arsip Prosedur</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Prosedur yang diarsipkan dapat di-restore kembali atau dihapus secara permanen.
              </p>
            </div>
          </div>

          {/* Filter bar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari nama atau nomor dokumen…"
                  value={searchValue}
                  onChange={e => { setSearchValue(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 hover:bg-white transition-all"
                />
                {searchValue && (
                  <button onClick={() => { setSearchValue(''); setCurrentPage(1); }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            {searchValue && (
              <p className="text-xs text-slate-500 mt-3">
                Menampilkan <span className="font-semibold text-slate-700">{filteredData.length}</span> dari{' '}
                <span className="font-semibold text-slate-700">{archivedData.length}</span> dokumen
              </p>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Daftar Prosedur Terarsip</p>
                <p className="text-xs text-slate-400 mt-0.5">Total: {filteredData.length} dokumen</p>
              </div>
            </div>
            <ArchivedTable data={pageData} onRestore={handleRestore} onDelete={handleDeletePermanently} />
            <Pagination
              currentPage={currentPage} totalPages={totalPages || 1}
              startIndex={startIndex} endIndex={endIndex} totalItems={filteredData.length}
              onPrevious={() => { if (currentPage > 1) setCurrentPage(currentPage - 1); }}
              onNext={() => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); }}
            />
          </div>

        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}