// app/components/pic/PICDocumentsList.tsx

'use client';
import { useState } from 'react';
import DocumentModal from '@/components/documents/DocumentModal';

interface Document {
  id: number;
  documentNumber: string;
  title: string;
  status: string;
  createdAt: string;
}

// StatusFilter harus sama persis dengan type di page.tsx
type StatusFilter = 'all' | 'pending' | 'approved' | 'revision' | 'rejected';

interface PICDocumentsListProps {
  documents: Document[];
  /** Dikirim dari page.tsx saat fetch filter sedang berlangsung */
  isLoadingDocs?: boolean;
  /** Dipanggil saat user klik chip filter — page.tsx yang handle fetch-nya */
  onFilterChange?: (filter: StatusFilter) => void;
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; border: string; dot: string; label: string }
> = {
  pending: {
    bg:     'bg-amber-100',
    text:   'text-amber-800',
    border: 'border-amber-300',
    dot:    'bg-amber-500',
    label:  'Pending',
  },
  approved: {
    bg:     'bg-emerald-100',
    text:   'text-emerald-800',
    border: 'border-emerald-300',
    dot:    'bg-emerald-500',
    label:  'Approved',
  },
  rejected: {
    bg:     'bg-red-100',
    text:   'text-red-800',
    border: 'border-red-300',
    dot:    'bg-red-500',
    label:  'Rejected',
  },
  revision: {
    bg:     'bg-blue-100',
    text:   'text-blue-800',
    border: 'border-blue-300',
    dot:    'bg-blue-500',
    label:  'Revisi',
  },
};

const DEFAULT_STATUS = {
  bg:     'bg-slate-100',
  text:   'text-slate-700',
  border: 'border-slate-300',
  dot:    'bg-slate-400',
  label:  '',
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status.toLowerCase()] ?? {
    ...DEFAULT_STATUS,
    label: status,
  };
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });
}

// ─── Filter chips ─────────────────────────────────────────────────────────────
// 'all' dipetakan ke label "Semua" di UI, dikirim ke API sebagai ?status=all
// (atau tidak ada filter sama sekali — lihat fetchDocumentsByFilter di page.tsx)
const FILTERS: StatusFilter[] = ['all', 'pending', 'approved', 'revision', 'rejected'];

// ─── DocumentRow ──────────────────────────────────────────────────────────────
function DocumentRow({
  doc,
  isActive,
  onClick,
}: {
  doc: Document;
  isActive: boolean;
  onClick: (id: number) => void;
}) {
  const s = getStatusConfig(doc.status);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(doc.id)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(doc.id)}
      className={`
        group relative flex items-center gap-4 px-5 py-4 cursor-pointer
        border-b border-slate-100 last:border-b-0
        transition-all duration-150 outline-none
        focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400
        ${isActive
          ? 'bg-emerald-50 border-l-[3px] border-l-emerald-500'
          : 'hover:bg-slate-50 border-l-[3px] border-l-transparent hover:border-l-slate-300'}
      `}
    >
      {/* Doc icon */}
      <div className={`
        flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg
        transition-colors duration-150
        ${isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'}
      `}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`
            text-sm font-bold tracking-tight truncate
            ${isActive ? 'text-emerald-700' : 'text-slate-800 group-hover:text-slate-900'}
          `}>
            {doc.documentNumber}
          </span>
        </div>
        <p className="text-xs text-slate-500 truncate">{doc.title}</p>
        <p className="text-[11px] text-slate-400 mt-1">
          Dibuat: {formatDate(doc.createdAt)}
        </p>
      </div>

      {/* Status badge */}
      <div className="flex-shrink-0 flex flex-col items-end gap-2">
        <span className={`
          inline-flex items-center gap-1.5 px-2.5 py-1
          rounded-md text-xs font-semibold border
          ${s.bg} ${s.text} ${s.border}
        `}>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
          {s.label || doc.status}
        </span>
      </div>

      {/* Arrow indicator */}
      <svg
        className={`
          flex-shrink-0 w-4 h-4 transition-all duration-150
          ${isActive ? 'text-emerald-500 translate-x-0 opacity-100' : 'text-slate-300 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}
        `}
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PICDocumentsList({
  documents,
  isLoadingDocs = false,
  onFilterChange,
}: PICDocumentsListProps) {
  const [activeId,      setActiveId]      = useState<number | null>(null);
  // activeFilter hanya untuk UI highlight chip — data sudah difilter API
  const [activeFilter,  setActiveFilter]  = useState<StatusFilter>('all');
  const [searchQuery,   setSearchQuery]   = useState('');

  // State modal — menyimpan dokumen yang sedang dibuka
  const [modalDoc, setModalDoc] = useState<Document | null>(null);

  const handleRowClick = (id: number) => {
    const doc = documents.find(d => d.id === id) ?? null;
    setActiveId(id);
    setModalDoc(doc);
  };

  const handleModalClose = () => {
    setModalDoc(null);
    setActiveId(null);
  };

  // Klik chip filter → update UI state + panggil callback ke page.tsx
  const handleFilterClick = (f: StatusFilter) => {
    setActiveFilter(f);
    setSearchQuery('');    // reset search lokal saat filter berubah
    setActiveId(null);
    onFilterChange?.(f);
  };

  // Search tetap di frontend — filter terhadap documents yang sudah di-filter API
  const filtered = documents.filter(doc => {
    if (searchQuery.trim() === '') return true;
    return (
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Count per status — dihitung dari documents (sudah terfilter API)
  // Untuk chip 'all' tampilkan total, lainnya 0 karena API sudah memfilter
  const countOf = (f: StatusFilter) => {
    if (f === 'all') return documents.length;
    // Jika filter aktif = f, semua dokumen cocok → tampilkan jumlah total
    if (activeFilter === f) return documents.length;
    return 0;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900">Daftar Dokumen</h2>
          <div className="flex items-center gap-2">
            {/* Spinner kecil di header saat fetch filter berjalan */}
            {isLoadingDocs && (
              <svg className="animate-spin h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            <span className="text-xs text-slate-400 font-medium">
              {filtered.length} dari {documents.length}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Cari nomor atau judul dokumen..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            disabled={isLoadingDocs}
            className="
              w-full pl-9 pr-3 py-2 text-sm
              bg-slate-50 border border-slate-200 rounded-lg
              text-slate-800 placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent
              transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed
            "
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => {
            const isActive = activeFilter === f;
            const sc = f !== 'all' ? getStatusConfig(f) : null;
            const count = countOf(f);
            const label = f === 'all' ? 'Semua' : STATUS_CONFIG[f]?.label ?? f;
            return (
              <button
                key={f}
                onClick={() => handleFilterClick(f)}
                disabled={isLoadingDocs}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                  border transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60
                  ${isActive
                    ? sc
                      ? `${sc.bg} ${sc.text} ${sc.border}`
                      : 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                `}
              >
                {sc && isActive && (
                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                )}
                {label}
                <span className={`
                  text-[10px] font-bold px-1 py-0.5 rounded
                  ${isActive
                    ? sc ? 'bg-white/40' : 'bg-white/20'
                    : 'bg-slate-100'}
                `}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── List (scrollable) ───────────────────────────────────── */}
      <div className="overflow-y-auto relative" style={{ maxHeight: '420px' }}>

        {/* Loading overlay saat fetch filter berlangsung */}
        {isLoadingDocs && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/80 backdrop-blur-[2px]">
            <svg className="animate-spin h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-xs text-slate-500 font-medium">Memfilter dokumen...</p>
          </div>
        )}

        {filtered.length === 0 && !isLoadingDocs ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-600 font-semibold text-sm">Tidak ada dokumen</p>
            <p className="text-slate-400 text-xs mt-1">
              {searchQuery
                ? `Tidak ada hasil untuk "${searchQuery}"`
                : 'Belum ada dokumen dalam kategori ini'}
            </p>
            {(searchQuery || activeFilter !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); handleFilterClick('all'); }}
                className="mt-4 text-xs text-emerald-600 font-semibold hover:underline"
              >
                Reset filter
              </button>
            )}
          </div>
        ) : (
          filtered.map(doc => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              isActive={activeId === doc.id}
              onClick={handleRowClick}
            />
          ))
        )}
      </div>

      {/* ── Footer scroll hint ──────────────────────────────────── */}
      {filtered.length > 6 && (
        <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50">
          <p className="text-[11px] text-slate-400 text-center">
            Scroll untuk melihat {filtered.length - 6} dokumen lainnya
          </p>
        </div>
      )}

      {/* ── Document Modal ──────────────────────────────────────── */}
      <DocumentModal
        isOpen={modalDoc !== null}
        onClose={handleModalClose}
        nomorDokumen={modalDoc?.documentNumber ?? ''}
        namaDokumen={modalDoc?.title ?? ''}
        hideUpload={true}
      />
    </div>
  );
}