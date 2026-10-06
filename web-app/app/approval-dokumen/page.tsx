// app/approval-dokumen/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import ApprovalFilterCards, { StageFilterType } from '@/components/approval/ApprovalFilterCards';
import ApprovalTable, { ApprovalDocumentItem } from '@/components/approval/ApprovalTable';
import ApprovalDetailModal from '@/components/approval/ApprovalDetailModal';
import ApprovalEditModal from '@/components/approval/ApprovalEditModal';
import ApprovalUploadModal from '@/components/approval/ApprovalUploadModal';
import {
  RotateCw,
  Search,
  X,
  FileCheck2,
  Clock,
  Layers,
  Upload,
  Sparkles,
} from 'lucide-react';

interface ApprovalStats {
  settingApprover?: number;
  revisi?: number;
  prepared: number;
  checked: number;
  approved: number;
  inProgressTotal: number;
  completedTotal: number;
  allTotal: number;
}

export default function ApprovalDokumenPage() {
  const [stats, setStats] = useState<ApprovalStats>({
    settingApprover: 0,
    revisi: 0,
    prepared: 0,
    checked: 0,
    approved: 0,
    inProgressTotal: 0,
    completedTotal: 0,
    allTotal: 0,
  });

  const [documents, setDocuments] = useState<ApprovalDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tab & Filters
  // 'in_progress' | 'setting_approver' | 'all'
  const [statusTab, setStatusTab] = useState<'in_progress' | 'setting_approver' | 'all'>('in_progress');
  const [stageFilter, setStageFilter] = useState<StageFilterType>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [detailDoc, setDetailDoc] = useState<ApprovalDocumentItem | null>(null);
  const [editDoc, setEditDoc] = useState<ApprovalDocumentItem | null>(null);
  const [uploadDoc, setUploadDoc] = useState<ApprovalDocumentItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Load data approval dokumen dari API
  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const params = new URLSearchParams();
      params.set('filter', statusTab);
      if (stageFilter) params.set('stage', stageFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/review-prosedur/api/approval-dokumen?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();
      setStats(data.stats || {
        settingApprover: 0,
        revisi: 0,
        prepared: 0,
        checked: 0,
        approved: 0,
        inProgressTotal: 0,
        completedTotal: 0,
        allTotal: 0,
      });
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error fetching approval documents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusTab, stageFilter, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Jika ada param openEdit saat load page, langsung arahkan tab ke 'setting_approver'
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('openEdit')) {
        setStatusTab('setting_approver');
      }
    }
  }, []);

  // Auto-buka modal edit jika ada query param openEdit (misal setelah buat dokumen dari request PIC)
  useEffect(() => {
    if (typeof window !== 'undefined' && documents.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const openEditNomor = params.get('openEdit');
      if (openEditNomor) {
        const found = documents.find(d => d.nomorDokumen.toLowerCase() === openEditNomor.toLowerCase());
        if (found) {
          setEditDoc(found);
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        }
      }
    }
  }, [documents]);

  // Handle klik card filter stage
  const handleStageCardClick = (stage: StageFilterType) => {
    setStageFilter(stage);
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="w-full space-y-5">
          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  Monitoring Alur Approval
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                <FileCheck2 size={26} className="text-blue-600" />
                <span>Approval Dokumen</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Pantau progres persetujuan (Prepared, Checked, dan Approved) dari dokumen yang berjalan
                secara transparan, pantau siapa yang sudah approve, dan kelola detail approval.
              </p>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  setUploadDoc(null);
                  setIsUploadModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                           bg-blue-600 text-xs font-bold text-white hover:bg-blue-700
                           transition-all shadow-md shadow-blue-500/25 active:scale-95"
                title="Unggah dokumen baru / revisi untuk memulai alur approval"
              >
                <Upload size={14} />
                <span>Upload Dokumen Approval</span>
              </button>

              <button
                onClick={() => fetchData(true)}
                disabled={refreshing || loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200
                           bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900
                           transition-all shadow-2xs active:scale-95 disabled:opacity-50"
                title="Refresh Data"
              >
                <RotateCw size={14} className={refreshing ? 'animate-spin text-blue-600' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* ── 5 Card Approval (Perlu Masuk Approval, Perlu Revisi, Prepared, Checked, Approved) ── */}
          <div>
            <ApprovalFilterCards
              stats={{
                settingApprover: stats.settingApprover,
                revisi: stats.revisi,
                prepared: stats.prepared,
                checked: stats.checked,
                approved: stats.approved,
                inProgressTotal: stats.inProgressTotal,
              }}
              activeStage={stageFilter}
              onSelectStage={handleStageCardClick}
            />
          </div>

          {/* ── Filter Controls & Search ── */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Tabs: Dokumen Berjalan vs Perlu Masuk Approval vs Semua Siklus */}
            <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/60 text-xs self-start">
              <button
                onClick={() => {
                  setStatusTab('in_progress');
                  setStageFilter(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  statusTab === 'in_progress'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock size={13} />
                <span>Sedang Berjalan</span>
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
                  {stats.inProgressTotal}
                </span>
              </button>

              <button
                onClick={() => {
                  setStatusTab('setting_approver');
                  setStageFilter(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  statusTab === 'setting_approver'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Dokumen baru dibuat yang menunggu penentuan approver & masuk tahap approval"
              >
                <Sparkles size={13} className={statusTab === 'setting_approver' ? 'text-sky-600' : 'text-slate-400'} />
                <span>Perlu Masuk Approval</span>
                <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                  (stats.settingApprover || 0) > 0
                    ? 'bg-sky-100 text-sky-800 font-extrabold'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {stats.settingApprover || 0}
                </span>
              </button>

              <button
                onClick={() => {
                  setStatusTab('all');
                  setStageFilter(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  statusTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers size={13} />
                <span>Semua Dokumen</span>
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                  {stats.allTotal}
                </span>
              </button>
            </div>

            {/* Filter Stage Pill (jika aktif) & Search Input */}
            <div className="flex flex-wrap items-center gap-2.5">
              {stageFilter && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700 font-semibold shadow-2xs">
                  <span className="text-slate-500 font-medium">Filter Status:</span>
                  <span className="font-bold text-blue-800">
                    {stageFilter === 'setting_approver'
                      ? 'Dokumen Baru'
                      : stageFilter === 'revisi'
                      ? 'Perlu Revisi'
                      : stageFilter === 'prepared'
                      ? 'Prepared'
                      : stageFilter === 'checked'
                      ? 'Checked'
                      : 'Approved'}
                  </span>
                  <button
                    onClick={() => setStageFilter(null)}
                    className="w-4 h-4 rounded-full hover:bg-blue-200 text-blue-600 flex items-center justify-center transition-colors ml-0.5"
                    title="Hapus filter"
                  >
                    <X size={11} />
                  </button>
                </div>
              )}

              {/* Input Pencarian */}
              <div className="relative min-w-[240px] flex-1 sm:flex-initial">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari nama atau nomor dokumen..."
                  className="w-full text-xs pl-8 pr-7 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Main Approval Table ── */}
          <div>
            <ApprovalTable
              documents={documents}
              loading={loading}
              onOpenDetail={doc => setDetailDoc(doc)}
              onOpenEdit={doc => setEditDoc(doc)}
              onOpenUpload={doc => {
                setUploadDoc(doc);
                setIsUploadModalOpen(true);
              }}
            />
          </div>

          {/* ── Footer Stats Summary ── */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 px-1">
            <span>
              Menampilkan <strong>{documents.length}</strong> dokumen approval
            </span>
            <span>
              Total dokumen tercatat: <strong>{stats.allTotal}</strong>
            </span>
          </div>
        </div>

        {/* ── Modals ── */}
        <ApprovalDetailModal
          isOpen={!!detailDoc}
          onClose={() => setDetailDoc(null)}
          document={detailDoc}
        />

        <ApprovalEditModal
          isOpen={!!editDoc}
          onClose={() => setEditDoc(null)}
          document={editDoc}
          onSaved={() => fetchData(true)}
        />

        <ApprovalUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => {
            setIsUploadModalOpen(false);
            setUploadDoc(null);
          }}
          document={uploadDoc}
          onUploaded={() => fetchData(true)}
        />
      </AdminLayout>
    </ProtectedRoute>
  );
}
