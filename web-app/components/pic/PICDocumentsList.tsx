// app/components/pic/PICDocumentsList.tsx

'use client';
import { useState, useMemo } from 'react';
import DocumentModal from '@/components/documents/DocumentModal';

interface Document {
  id: number;
  documentNumber: string;
  title: string;
  status: string;
  createdAt: string;
  owner?: string;
  pic?: string;
}

// StatusFilter harus sama persis dengan type di page.tsx
type StatusFilter = 'all' | 'pending' | 'approved' | 'revision' | 'rejected';

interface PICDocumentsListProps {
  documents: Document[];
  /** Seluruh dokumen unfiltered — untuk chip count yang akurat */
  allDocuments?: Document[];
  /** Dikirim dari page.tsx saat fetch filter sedang berlangsung */
  isLoadingDocs?: boolean;
  /** Dipanggil saat user klik chip filter — page.tsx yang handle fetch-nya */
  onFilterChange?: (filter: StatusFilter) => void;
}

// ─── Bulan ────────────────────────────────────────────────────────────────────
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const;
type MonthFilter = '' | typeof MONTHS[number];

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
const FILTERS: StatusFilter[] = ['all', 'pending', 'approved', 'revision', 'rejected'];

const DB_STATUS_MAP: Record<Exclude<StatusFilter, 'all'>, string[]> = {
  pending:  ['Menunggu', 'Belum dikirim', 'Telah terkirim', 'Telah dibaca', '-'],
  approved: ['Relevan'],
  revision: ['Revisi'],
  rejected: ['Obsolete'],
};

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
        group relative flex items-center gap-3 px-4 py-2.5 cursor-pointer
        border-b border-slate-100 last:border-b-0
        transition-all duration-150 outline-none
        focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400
        ${isActive
          ? 'bg-emerald-50 border-l-[3px] border-l-emerald-500'
          : 'hover:bg-slate-50 border-l-[3px] border-l-transparent hover:border-l-slate-300'}
      `}
    >
      {/* Doc icon — CHANGED: w-9 h-9→w-8 h-8, rounded-lg→rounded-md */}
      <div className={`
        flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md
        transition-colors duration-150
        ${isActive
          ? 'bg-emerald-100 text-emerald-600'
          : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'}
      `}>
        {/* CHANGED: w-4 h-4→w-3.5 h-3.5 */}
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className={`
            text-xs font-bold tracking-tight truncate
            ${isActive ? 'text-emerald-700' : 'text-slate-800 group-hover:text-slate-900'}
          `}>
            {doc.documentNumber}
          </span>
          {doc.owner && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              {doc.owner}
            </span>
          )}
          {doc.pic && (
            <span className="text-[10px] text-slate-400">
              PIC: <strong className="text-slate-600 font-medium">{doc.pic}</strong>
            </span>
          )}
        </div>
        {/* CHANGED: text-xs tetap */}
        <p className="text-xs text-slate-500 truncate">{doc.title}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Dibuat: {formatDate(doc.createdAt)}
        </p>
      </div>

      {/* Status badge */}
      <div className="flex-shrink-0 flex flex-col items-end gap-2">
        <span className={`
          inline-flex items-center gap-1 px-2 py-0.5
          rounded text-[11px] font-semibold border
          ${s.bg} ${s.text} ${s.border}
        `}>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
          {s.label || doc.status}
        </span>
      </div>

      {/* Arrow indicator */}
      <svg
        className={`
          flex-shrink-0 w-3.5 h-3.5 transition-all duration-150
          ${isActive
            ? 'text-emerald-500 translate-x-0 opacity-100'
            : 'text-slate-300 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}
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
  allDocuments,
  isLoadingDocs = false,
  onFilterChange,
}: PICDocumentsListProps) {
  const [activeId,      setActiveId]      = useState<number | null>(null);
  const [activeFilter,  setActiveFilter]  = useState<StatusFilter>('all');
  const [searchQuery,   setSearchQuery]   = useState('');
  const [monthFilter,   setMonthFilter]   = useState<MonthFilter>('');
  const [modalDoc,      setModalDoc]      = useState<Document | null>(null);

  const handleRowClick = (id: number) => {
    const doc = documents.find(d => d.id === id) ?? null;
    setActiveId(id);
    setModalDoc(doc);
  };

  const handleModalClose = () => {
    setModalDoc(null);
    setActiveId(null);
  };

  const handleFilterClick = (f: StatusFilter) => {
    setActiveFilter(f);
    setSearchQuery('');
    setActiveId(null);
    onFilterChange?.(f);
  };

  const handleResetAll = () => {
    setSearchQuery('');
    setMonthFilter('');
    setActiveId(null);
    handleFilterClick('all');
  };

  const hasLocalFilter = searchQuery.trim() !== '' || monthFilter !== '';

  // ── useMemo: kombinasi search + bulan ────────────────────────────────────
  const filtered = useMemo(() => {
    return documents.filter(doc => {
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchSearch =
          doc.title.toLowerCase().includes(q) ||
          doc.documentNumber.toLowerCase().includes(q) ||
          (doc.owner || '').toLowerCase().includes(q) ||
          (doc.pic || '').toLowerCase().includes(q);
        if (!matchSearch) return false;
      }
      if (monthFilter !== '') {
        const docMonth = new Date(doc.createdAt).getMonth();
        const selectedMonth = MONTHS.indexOf(monthFilter);
        if (docMonth !== selectedMonth) return false;
      }
      return true;
    });
  }, [documents, searchQuery, monthFilter]);

  const sourceForCount = allDocuments ?? documents;
  const countOf = (f: StatusFilter): number => {
    if (f === 'all') return sourceForCount.length;
    return sourceForCount.filter(doc => DB_STATUS_MAP[f].includes(doc.status)).length;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">

      {/* ── Header — CHANGED: px-5 pt-5 pb-4→px-4 pt-4 pb-3 ──────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">

        {/* Judul + spinner + info hasil — CHANGED: mb-4→mb-3 */}
        <div className="flex items-center justify-between mb-3">
          {/* CHANGED: text-base font-bold → text-sm font-semibold */}
          <h2 className="text-sm font-semibold text-slate-900">Daftar Dokumen</h2>
          <div className="flex items-center gap-2">
            {isLoadingDocs && (
              <svg className="animate-spin h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            <span className={`text-xs font-medium ${hasLocalFilter || activeFilter !== 'all' ? 'text-emerald-600' : 'text-slate-400'}`}>
              {filtered.length} dokumen ditemukan
            </span>
          </div>
        </div>

        {/* Search + Filter Bulan — CHANGED: gap-2 mb-3→gap-2 mb-2 */}
        <div className="flex gap-2 mb-2">

          {/* Search */}
          <div className="relative flex-1">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
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
                w-full pl-8 pr-3 py-1.5 text-xs
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
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Dropdown Bulan — CHANGED: w-40→w-36 */}
          <div className="relative w-36">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <select
              value={monthFilter}
              onChange={e => {
                setMonthFilter(e.target.value as MonthFilter);
                setActiveId(null);
              }}
              disabled={isLoadingDocs}
              className={`
                w-full pl-7 pr-6 py-1.5 text-xs rounded-lg border appearance-none
                bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent
                transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer
                ${monthFilter !== ''
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold'
                  : 'border-slate-200 text-slate-600'}
              `}
            >
              <option value="">Semua Bulan</option>
              {MONTHS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <svg
              className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Tombol Reset — CHANGED: w-10 h-10→w-8 h-8 */}
          {hasLocalFilter && (
            <button
              onClick={handleResetAll}
              title="Reset semua filter"
              className="
                flex-shrink-0 flex items-center justify-center
                w-8 h-8 rounded-lg
                bg-red-50 border border-red-200 text-red-500
                hover:bg-red-100 hover:text-red-600
                transition-all duration-150
              "
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 flex-wrap">
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
                  inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold
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

      {/* ── List (scrollable) — CHANGED: maxHeight 420px→360px ────────────── */}
      <div className="overflow-y-auto relative" style={{ maxHeight: '360px' }}>

        {/* Loading overlay */}
        {isLoadingDocs && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/80 backdrop-blur-[2px]">
            <svg className="animate-spin h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-xs text-slate-500 font-medium">Memfilter dokumen...</p>
          </div>
        )}

        {filtered.length === 0 && !isLoadingDocs ? (
          // CHANGED: py-16→py-12, w-14 h-14→w-12 h-12, mb-4→mb-3, w-7 h-7→w-6 h-6
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-600 font-semibold text-xs">Tidak ada dokumen</p>
            <p className="text-slate-400 text-[11px] mt-1">
              {searchQuery
                ? `Tidak ada hasil untuk "${searchQuery}"`
                : monthFilter
                ? `Tidak ada dokumen untuk filter yang dipilih`
                : 'Belum ada dokumen dalam kategori ini'}
            </p>
            {(hasLocalFilter || activeFilter !== 'all') && (
              <button
                onClick={handleResetAll}
                className="mt-3 text-xs text-emerald-600 font-semibold hover:underline"
              >
                Reset semua filter
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

      {/* ── Footer scroll hint ──────────────────────────────────────────────── */}
      {filtered.length > 6 && (
        // CHANGED: px-5 py-2.5→px-4 py-2
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
          <p className="text-[11px] text-slate-400 text-center">
            Scroll untuk melihat {filtered.length - 6} dokumen lainnya
          </p>
        </div>
      )}

      {/* ── Document Modal ──────────────────────────────────────────────────── */}
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