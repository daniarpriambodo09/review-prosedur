// app/arsip-prosedur/page.tsx

'use client';
import { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/procedures/header';
import { 
  ProcedureDocument, 
  StatusType, 
  getArchivedProcedures,
  restoreProcedure,
  deleteProcedurePermanently
} from '@/data/procedures/all-procedures';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function Breadcrumb() {
  return (
    <div className="px-8 py-4 text-sm text-slate-500 border-b border-slate-200">
      <Link href="/status-review" className="text-blue-600 hover:text-blue-700 font-medium">
        Status Prosedur
      </Link>
      <span className="text-slate-400"> / </span>
      <span className="text-slate-700 font-medium">Arsip Prosedur</span>
    </div>
  );
}

function StatusBadge({ status }: { status: StatusType }) {
  // Gunakan Partial agar tidak wajib mendefinisikan semua nilai StatusType.
  // Fallback ke styles['-'] jika status tidak ditemukan di map.
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
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap border ${s.bg} ${s.text} ${s.border}`}>
      {s.icon} {status}
    </span>
  );
}

function ArchivedTable({ 
  data, 
  onRestore,
  onDelete
}: { 
  data: ProcedureDocument[];
  onRestore: (nomorDokumen: string) => void;
  onDelete: (nomorDokumen: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
            {['Nama Dokumen','Nomor Dokumen','Level Dokumen','Tanggal Approval','Revisi','Owner','PIC','Email','Status','Tanggal Arsip','Aksi'].map(h => (
              <th key={h} className="px-5 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {data.map((row, index) => (
            <tr key={`${row.nomorDokumen}-${index}`} className="hover:bg-blue-50 transition-colors">
              <td className="px-5 py-4 text-sm font-medium text-slate-900">{row.namaDokumen}</td>
              <td className="px-5 py-4 text-sm text-slate-700 font-mono text-xs">{row.nomorDokumen}</td>
              <td className="px-5 py-4 text-sm text-slate-700">{row.levelDokumen}</td>
              <td className="px-5 py-4 text-sm text-slate-700">{row.tanggalSelesaiApproval}</td>
              <td className="px-5 py-4 text-sm text-slate-700 font-semibold">{row.revisi}</td>
              <td className="px-5 py-4 text-sm text-slate-700">{row.owner}</td>
              <td className="px-5 py-4 text-sm text-slate-700">{row.pic}</td>
              <td className="px-5 py-4 text-sm text-slate-600">{row.email || '-'}</td>
              <td className="px-5 py-4"><StatusBadge status={row.status} /></td>
              <td className="px-5 py-4 text-sm text-slate-600">
                {row.deletedAt ? new Date(row.deletedAt).toLocaleDateString('id-ID') : '-'}
              </td>
              <td className="px-5 py-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => onRestore(row.nomorDokumen)}
                    className="text-green-600 hover:text-green-800 hover:bg-green-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-95"
                  >
                    ↺ Restore
                  </button>
                  <button
                    onClick={() => onDelete(row.nomorDokumen)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-95"
                  >
                    🗑️ Hapus
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={11} className="px-5 py-12 text-center text-sm text-slate-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Tidak ada prosedur yang diarsipkan
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({
  currentPage, totalPages, startIndex, endIndex, totalItems, onPrevious, onNext,
}: {
  currentPage: number; totalPages: number; startIndex: number;
  endIndex: number; totalItems: number; onPrevious: () => void; onNext: () => void;
}) {
  return (
    <div className="flex justify-between items-center px-5 py-5 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-slate-200">
      <div className="text-sm text-slate-700">
        Menampilkan <span className="font-semibold text-slate-900">{startIndex}</span> sampai{' '}
        <span className="font-semibold text-slate-900">{endIndex}</span> dari{' '}
        <span className="font-semibold text-slate-900">{totalItems}</span> entri
      </div>
      <div className="flex gap-2">
        <button onClick={onPrevious} disabled={currentPage === 1}
          className="px-3 py-2 border border-slate-300 bg-white rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95">
          ← Sebelumnya
        </button>
        <button disabled className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-semibold text-white min-w-12 text-center">
          {currentPage}
        </button>
        <button onClick={onNext} disabled={currentPage >= totalPages}
          className="px-3 py-2 border border-slate-300 bg-white rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95">
          Berikutnya →
        </button>
      </div>
    </div>
  );
}

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <Header />
        <Breadcrumb />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Memuat data arsip...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <Header />
        <Breadcrumb />

        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-3">Arsip Prosedur</h1>
            <p className="text-base text-slate-600 max-w-2xl">
              Daftar prosedur yang telah diarsipkan. Anda dapat me-restore prosedur kembali ke daftar aktif atau menghapus permanen.
            </p>
          </div>

          <div className="flex gap-3 mb-6 items-center">
            <div className="relative flex-1 max-w-md">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input type="text" placeholder="Cari prosedur..." value={searchValue}
                onChange={(e) => { setSearchValue(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <Link href="/status-review">
              <button className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all hover:shadow-md active:scale-95">
                ← Kembali
              </button>
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <h2 className="font-bold text-lg text-slate-900">Daftar Prosedur Terarsip</h2>
              <p className="text-xs text-slate-600 mt-1">Total: {filteredData.length} dokumen</p>
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
      </div>
    </ProtectedRoute>
  );
}