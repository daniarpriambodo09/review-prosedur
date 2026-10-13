// app/pic-dashboard/page.tsx

'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import PICDashboardHeader from '@/components/pic/PICDashboardHeader';
import PICStatsCards from '@/components/pic/PICStatsCards';
import PICDocumentsList from '@/components/pic/PICDocumentsList';
import PICActivityLog from '@/components/pic/PICActivityLog';
import RequestReviewModal from '@/components/pic/RequestReviewModal';
import RequestNewDocumentModal from '@/components/pic/RequestNewDocumentModal';
import PICRequestsModal from '@/components/pic/PICRequestsModal';
import SectionReviewChart from '@/components/dashboard/SectionReviewChart';
import Link from 'next/link';

interface PICDashboardData {
  picUser: {
    id: number;
    fullName: string;
    email: string;
    picCode: string;
    isManager?: boolean;
    jabatan?: string | null;
    departmentName?: string | null;
  };
  stats: {
    totalDocuments: number;
    pendingReview: number;
    completedReview: number;
    totalRequests: number;
  };
  documents: Array<{
    id: number;
    documentNumber: string;
    title: string;
    status: string;
    createdAt: string;
    owner?: string;
    pic?: string;
  }>;
  activities: Array<{
    id: number;
    activityType: string;
    description: string;
    createdAt: string;
  }>;
}

// Nilai filter yang dikirim ke API sebagai query param ?status=
// 'all' berarti tidak ada filter → API mengembalikan semua dokumen
type StatusFilter = 'all' | 'pending' | 'approved' | 'revision' | 'rejected';

export default function PICDashboardPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const [dashboardData,   setDashboardData]   = useState<PICDashboardData | null>(null);
  const [isLoading,       setIsLoading]       = useState(true);
  const [error,           setError]           = useState('');

  // State dokumen terpisah — di-update saat filter berubah tanpa re-fetch semua data
  const [documents,       setDocuments]       = useState<PICDashboardData['documents']>([]);
  // allDocuments menyimpan seluruh dokumen tanpa filter — dipakai chip count di PICDocumentsList
  // agar angka per-status selalu akurat meski filter sedang aktif
  const [allDocuments,    setAllDocuments]    = useState<PICDashboardData['documents']>([]);
  const [isLoadingDocs,   setIsLoadingDocs]   = useState(false);
  const [activeFilter,    setActiveFilter]    = useState<StatusFilter>('all');

  const [showRequestReviewModal,  setShowRequestReviewModal]  = useState(false);
  const [showNewDocumentModal,    setShowNewDocumentModal]    = useState(false);
  const [showRequestsModal,       setShowRequestsModal]       = useState(false);

  // Helper: buat header auth untuk semua API call PIC
  const picHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-pic-id':    String(user?.picId ?? user?.id ?? ''),
    'x-pic-email': user?.email ?? '',
  }), [user]);

  // ── Fetch dashboard lengkap (hanya sekali saat mount / setelah submit modal) ──
  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/review-prosedur/api/pic/dashboard', {
        method: 'GET',
        headers: picHeaders(),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal mengambil data dashboard');
      }

      const data: PICDashboardData = await response.json();
      setDashboardData(data);
      setDocuments(data.documents);    // inisialisasi daftar dokumen
      setAllDocuments(data.documents); // simpan salinan unfiltered untuk chip count
      setActiveFilter('all');           // reset filter ke "Semua" setelah refresh
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  }, [picHeaders]);

  // ── Fetch dokumen saja dengan filter status ────────────────────────────────
  const fetchDocumentsByFilter = useCallback(async (filter: StatusFilter) => {
    try {
      setIsLoadingDocs(true);

      const url = filter === 'all'
        ? '/review-prosedur/api/pic/dashboard'
        : `/review-prosedur/api/pic/dashboard?status=${encodeURIComponent(filter)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: picHeaders(),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal mengambil data dokumen');
      }

      const data: PICDashboardData = await response.json();
      setDocuments(data.documents);
    } catch (err) {
      console.error('fetchDocumentsByFilter error:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  }, [picHeaders]);

  // ── Handler yang dipanggil PICDocumentsList saat filter berubah ───────────
  const handleFilterChange = useCallback((filter: StatusFilter) => {
    setActiveFilter(filter);
    fetchDocumentsByFilter(filter);
  }, [fetchDocumentsByFilter]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'pic') {
      router.push('/pic-login');
      return;
    }
    fetchDashboard();
  }, [isAuthenticated, user, fetchDashboard, router]);

  const handleLogout = () => { logout(); };

  // ── Loading & Error state ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-full mb-3">
            <svg className="animate-spin h-5 w-5 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-slate-600 text-sm font-medium">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-5 max-w-md">
          <h3 className="text-red-800 font-semibold text-sm mb-1.5">Terjadi Kesalahan</h3>
          <p className="text-red-700 text-xs">{error}</p>
          <button
            onClick={fetchDashboard}
            className="mt-3 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const picCode = dashboardData?.picUser.picCode
    ?? user?.email?.split('@')[0].toUpperCase()
    ?? '';

  return (
    <div className="min-h-screen bg-slate-50">
      <PICDashboardHeader
        userName={dashboardData?.picUser.fullName || user?.fullName || 'PIC'}
        onLogout={handleLogout}
        isManager={dashboardData?.picUser.isManager}
        departmentName={dashboardData?.picUser.departmentName}
        jabatan={dashboardData?.picUser.jabatan}
      />

      {/* CHANGED: max-w-screen-xl (lebih lebar dari 7xl), py-8→py-5, px tetap */}
      <main className="max-w-screen-xl mx-auto px-4 py-5 sm:px-6 lg:px-8">

        {/* Stats */}
        {dashboardData && (
          <PICStatsCards
            stats={dashboardData.stats}
            onRequestClick={() => setShowRequestsModal(true)}
          />
        )}

        {/* Action Quick Access — 4 Kartu Aksi Rapi, Kompak & Menarik (Dipindah ke atas grafik) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {/* 1. Review Dokumen */}
          <Link
            href={`/review-page-owner/${picCode}`}
            className="group relative bg-white hover:bg-emerald-50/30 border border-slate-200/80 hover:border-emerald-300 rounded-xl p-3 flex items-center justify-between gap-2.5 transition-all duration-150 shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-all duration-150">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors truncate">
                  Review Dokumen
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  Verifikasi dokumen saya
                </p>
              </div>
            </div>
            <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* 2. Approval Dokumen */}
          <Link
            href="/pic-approval"
            className="group relative bg-white hover:bg-indigo-50/30 border border-slate-200/80 hover:border-indigo-300 rounded-xl p-3 flex items-center justify-between gap-2.5 transition-all duration-150 shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-150">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 transition-colors truncate">
                    Approval Dokumen
                  </p>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse flex-shrink-0" />
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  Prepared &bull; Checked &bull; Approved
                </p>
              </div>
            </div>
            <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* 3. Minta Revisi Dokumen */}
          <button
            onClick={() => setShowRequestReviewModal(true)}
            className="group relative bg-white hover:bg-blue-50/30 border border-slate-200/80 hover:border-blue-300 rounded-xl p-3 flex items-center justify-between gap-2.5 transition-all duration-150 shadow-xs hover:shadow-sm text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-150">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                  Minta Revisi
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  Ajukan perbaikan dokumen
                </p>
              </div>
            </div>
            <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* 4. Dokumen Baru */}
          <button
            onClick={() => setShowNewDocumentModal(true)}
            className="group relative bg-white hover:bg-slate-100/60 border border-slate-200/80 hover:border-slate-300 rounded-xl p-3 flex items-center justify-between gap-2.5 transition-all duration-150 shadow-xs hover:shadow-sm text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 flex-shrink-0 group-hover:bg-slate-700 group-hover:text-white group-hover:border-slate-700 transition-all duration-150">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 group-hover:text-slate-900 transition-colors truncate">
                  Dokumen Baru
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  Ajukan permohonan baru
                </p>
              </div>
            </div>
            <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 🆕 Grafik Total vs Sudah Direview per Section — GLOBAL, sama untuk
            semua PIC & admin. Diletakkan tepat di bawah 4 kartu aksi dan sebelum daftar dokumen. */}
        <div className="mb-5">
          <SectionReviewChart />
        </div>

        {/* Documents and Activity — CHANGED: gap-8→gap-5 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <PICDocumentsList
              documents={documents}
              allDocuments={allDocuments}
              isLoadingDocs={isLoadingDocs}
              onFilterChange={handleFilterChange}
            />
          </div>
          <div>
            {dashboardData && (
              <PICActivityLog activities={dashboardData.activities} />
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      <RequestReviewModal
        isOpen={showRequestReviewModal}
        onClose={() => setShowRequestReviewModal(false)}
        onSubmit={async () => { await fetchDashboard(); }}
      />
      <RequestNewDocumentModal
        isOpen={showNewDocumentModal}
        onClose={() => setShowNewDocumentModal(false)}
        onSubmit={async () => { await fetchDashboard(); }}
      />
      <PICRequestsModal
        isOpen={showRequestsModal}
        onClose={() => setShowRequestsModal(false)}
      />
    </div>
  );
}