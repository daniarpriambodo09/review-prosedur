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
import SectionReviewChart from '@/components/dashboard/SectionReviewChart';
import Link from 'next/link';

interface PICDashboardData {
  picUser: {
    id: number;
    fullName: string;
    email: string;
    picCode: string;
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
        userName={user?.fullName || 'PIC'}
        onLogout={handleLogout}
      />

      {/* CHANGED: max-w-screen-xl (lebih lebar dari 7xl), py-8→py-5, px tetap */}
      <main className="max-w-screen-xl mx-auto px-4 py-5 sm:px-6 lg:px-8">

        {/* Stats */}
        {dashboardData && <PICStatsCards stats={dashboardData.stats} />}

        {/* 🆕 Grafik Total vs Sudah Direview per Section — GLOBAL, sama untuk
            semua PIC & admin. Diletakkan paling atas, tepat di bawah stat
            cards dan sebelum tombol aksi / daftar dokumen. */}
        <div className="mb-5">
          <SectionReviewChart />
        </div>

        {/* Action Buttons — CHANGED: gap-4→gap-3, mb-8→mb-5, py-3→py-2, text-sm ditambah */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <Link
            href={`/review-page-owner/${picCode}`}
            className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Review Dokumen Saya
          </Link>

          <button
            onClick={() => setShowRequestReviewModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Minta Review Dokumen
          </button>

          <button
            onClick={() => setShowNewDocumentModal(true)}
            className="bg-slate-600 hover:bg-slate-700 text-white py-2 px-5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Dokumen Baru
          </button>
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
    </div>
  );
}