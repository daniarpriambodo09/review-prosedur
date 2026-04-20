'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import PICDashboardHeader from '@/components/pic/PICDashboardHeader';
import PICStatsCards from '@/components/pic/PICStatsCards';
import PICDocumentsList from '@/components/pic/PICDocumentsList';
import PICActivityLog from '@/components/pic/PICActivityLog';
import RequestReviewModal from '@/components/pic/RequestReviewModal';
import RequestNewDocumentModal from '@/components/pic/RequestNewDocumentModal';

interface PICDashboardData {
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

export default function PICDashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<PICDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRequestReviewModal, setShowRequestReviewModal] = useState(false);
  const [showNewDocumentModal, setShowNewDocumentModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'pic') {
      router.push('/pic-login');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/pic/dashboard', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error('Gagal mengambil data dashboard');
        }

        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full mb-4">
            <svg className="animate-spin h-6 w-6 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-slate-600 font-medium">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 font-semibold mb-2">Terjadi Kesalahan</h3>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <PICDashboardHeader 
        userName={user?.fullName || 'PIC'}
        onLogout={() => {
          localStorage.removeItem('user');
          localStorage.removeItem('isAuthenticated');
          router.push('/pic-login');
        }}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        {dashboardData && (
          <PICStatsCards stats={dashboardData.stats} />
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setShowRequestReviewModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Minta Review Dokumen
          </button>
          
          <button
            onClick={() => setShowNewDocumentModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Dokumen Baru
          </button>
        </div>

        {/* Documents and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {dashboardData && (
              <PICDocumentsList documents={dashboardData.documents} />
            )}
          </div>
          
          <div>
            {dashboardData && (
              <PICActivityLog activities={dashboardData.activities} />
            )}
          </div>
        </div>
      </main>

      {/* Request Review Modal */}
      <RequestReviewModal
        isOpen={showRequestReviewModal}
        onClose={() => setShowRequestReviewModal(false)}
        onSubmit={async () => {
          // Refresh dashboard data
          const response = await fetch('/api/pic/dashboard');
          const data = await response.json();
          setDashboardData(data);
        }}
      />

      {/* Request New Document Modal */}
      <RequestNewDocumentModal
        isOpen={showNewDocumentModal}
        onClose={() => setShowNewDocumentModal(false)}
        onSubmit={async () => {
          // Refresh dashboard data
          const response = await fetch('/api/pic/dashboard');
          const data = await response.json();
          setDashboardData(data);
        }}
      />
    </div>
  );
}
