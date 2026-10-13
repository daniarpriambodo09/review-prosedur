// app/pic-approval/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import PDFViewer from '@/components/documents/PDFViewer';
import { checkUserApproverMatch } from '@/lib/approvalAuth';
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Search,
  ArrowLeft,
  RotateCw,
  Layers,
  AlertCircle,
  Calendar,
  X,
  FileCheck2,
  ChevronRight,
  User,
  Building2,
  Sparkles,
  ArrowRight,
  Info,
  Check,
  Copy,
  Tag,
  Workflow,
  Lock,
} from 'lucide-react';

interface ApproverItem {
  id?: number | null;
  approverId?: number;
  nama: string | null;
  email: string;
  token?: string | null;
  accStatus: 'acc' | 'pending' | 'rejected' | 'waiting';
  accAt: string | null;
  emailSentAt: string | null;
  rejectReason: string | null;
}

interface StageDetail {
  role: 'prepared' | 'checked' | 'approved';
  roleLabel: string;
  status: 'completed' | 'in_progress' | 'pending' | 'rejected';
  approvedCount: number;
  totalCount: number;
  approvers: ApproverItem[];
}

interface ApprovalDocument {
  cycleId: number;
  nomorDokumen: string;
  namaDokumen: string;
  levelDokumen: string;
  revisi: string;
  owner: string;
  pic: string;
  email: string;
  documentStatus: string;
  cycleStatus: string;
  currentStage: string;
  startedAt: string | null;
  completedAt: string | null;
  tanggalSelesaiApproval: string | null;
  isDateStamped: boolean;
  fileName: string | null;
  filePath: string | null;
  stages: {
    prepared?: StageDetail;
    checked?: StageDetail;
    approved?: StageDetail;
  };
  rejection?: {
    role: string;
    roleLabel: string;
    nama: string | null;
    email: string;
    reason: string;
    rejectedAt: string;
  } | null;
}

type TabFilter = 'all' | 'my_pending' | 'prepared' | 'checked' | 'approved' | 'completed';

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function getInitials(nameOrEmail: string | null | undefined): string {
  if (!nameOrEmail) return '?';
  const clean = nameOrEmail.split('@')[0].replace(/[^a-zA-Z\s]/g, ' ').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Tentukan tahap efektif alur dokumen secara akurat,
 * Dokumen berstatus 'Revisi' / 'Ditolak' / 'Menunggu Setting Approver' diklasifikasikan
 * sebagai 'not_started' agar tidak muncul di halaman pic-approval sebelum diunggah ulang & dimulai oleh admin.
 */
function getEffectiveStage(
  doc: ApprovalDocument
): 'prepared' | 'checked' | 'approved' | 'completed' | 'rejected' | 'not_started' {
  // 1. Dokumen yang belum dimulai alurnya / belum diunggah ulang revisinya oleh admin / ditolak / belum disetting
  const isNotStarted =
    doc.documentStatus === 'Revisi' ||
    doc.cycleStatus === 'revisi' ||
    doc.currentStage === 'revisi' ||
    doc.documentStatus === 'Ditolak' ||
    doc.cycleStatus === 'rejected' ||
    doc.currentStage === 'rejected' ||
    doc.documentStatus === 'Menunggu Setting Approver' ||
    doc.documentStatus === 'Menunggu Approval' ||
    doc.cycleStatus === 'setting_approver' ||
    doc.currentStage === 'setting_approver';

  if (isNotStarted) return 'not_started';

  const isCompleted =
    doc.documentStatus === 'Relevan' &&
    (doc.cycleStatus === 'completed' || doc.currentStage === 'completed');
  if (isCompleted) return 'completed';

  const isRejected = doc.documentStatus === 'Ditolak' || doc.cycleStatus === 'rejected';
  if (isRejected) return 'rejected';

  if (doc.currentStage === 'approved') return 'approved';
  if (doc.currentStage === 'checked') return 'checked';
  if (doc.currentStage === 'prepared') return 'prepared';

  // Fallback analisa status approvers di setiap tahap HANYA jika siklus benar-benar in_progress
  if (doc.cycleStatus === 'in_progress') {
    const preparedAllAcc =
      doc.stages.prepared?.approvers &&
      doc.stages.prepared.approvers.length > 0 &&
      doc.stages.prepared.approvers.every(a => a.accStatus === 'acc');

    const checkedAllAcc =
      doc.stages.checked?.approvers &&
      doc.stages.checked.approvers.length > 0 &&
      doc.stages.checked.approvers.every(a => a.accStatus === 'acc');

    if (preparedAllAcc && checkedAllAcc) return 'approved';
    if (preparedAllAcc) return 'checked';
    return 'prepared';
  }

  return 'not_started';
}

function DocumentApprovalSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Top Bar Skeleton */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-2.5 flex-1">
              <div className="flex items-center gap-2">
                <div className="h-6 w-20 bg-slate-200 rounded-lg" />
                <div className="h-6 w-16 bg-slate-200 rounded-lg" />
                <div className="h-6 w-36 bg-slate-200 rounded-full" />
              </div>
              <div className="h-5 w-3/4 sm:w-1/2 bg-slate-200 rounded-md" />
              <div className="flex items-center gap-3">
                <div className="h-3.5 w-24 bg-slate-100 rounded" />
                <div className="h-3.5 w-20 bg-slate-100 rounded" />
                <div className="h-3.5 w-28 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="h-8 w-24 bg-slate-200 rounded-xl" />
              <div className="h-8 w-24 bg-slate-100 rounded-xl" />
            </div>
          </div>

          {/* Pipeline Stepper Box Skeleton */}
          <div className="p-4 sm:p-5 bg-slate-50/50 space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-4 w-40 bg-slate-200 rounded" />
              <div className="h-4 w-48 bg-slate-200 rounded" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {[1, 2, 3].map(box => (
                <div key={box} className="rounded-xl border border-slate-200/80 bg-white p-3 space-y-2.5">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200" />
                      <div className="h-4 w-20 bg-slate-200 rounded" />
                    </div>
                    <div className="h-4 w-16 bg-slate-200 rounded-full" />
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200" />
                      <div className="space-y-1">
                        <div className="h-3.5 w-24 bg-slate-200 rounded" />
                        <div className="h-2.5 w-28 bg-slate-100 rounded" />
                      </div>
                    </div>
                    <div className="h-6 w-16 bg-slate-200 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PICApprovalPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const [documents, setDocuments] = useState<ApprovalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'prepared' | 'checked' | 'approved'>('all');
  const [adminViewAll, setAdminViewAll] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Search input ref & keyboard shortcut Ctrl+K atau /
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.key === 'k') ||
        (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Modal Preview PDF
  const [previewPdfDoc, setPreviewPdfDoc] = useState<{ filePath: string; fileName: string; nomorDokumen: string } | null>(null);

  // Modal Detail Alur
  const [detailDoc, setDetailDoc] = useState<ApprovalDocument | null>(null);

  // Fetch data approval dari API (Gunakan filter=pic untuk dokumen yang resmi aktif & selesai saja)
  const fetchApprovals = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/review-prosedur/api/approval-dokumen?filter=pic', {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Gagal mengambil data approval dokumen');
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Error fetching approval documents:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/pic-login');
      return;
    }
    fetchApprovals();
  }, [isAuthenticated, router, fetchApprovals]);

  // Helper Cek Giliran User Saat Ini (HANYA jika email/nama/kode cocok dengan approver tahap aktif)
  const isMyPendingApproval = useCallback((doc: ApprovalDocument): { isMyTurn: boolean; token?: string; role?: 'prepared' | 'checked' | 'approved' } => {
    if (!user) return { isMyTurn: false };
    const effStage = getEffectiveStage(doc);
    if (effStage === 'completed' || effStage === 'rejected' || effStage === 'not_started') return { isMyTurn: false };

    // Cek di tahap efektif yang sedang aktif
    const activeStage = doc.stages[effStage];
    if (activeStage) {
      const match = activeStage.approvers.find(
        a => checkUserApproverMatch(user, a) && a.accStatus === 'pending'
      );
      if (match) {
        return { isMyTurn: true, token: match.token || undefined, role: effStage };
      }
    }

    return { isMyTurn: false };
  }, [user]);

  // Helper Mendapatkan Peran User di Dokumen Tertentu (Prepared / Checked / Approved)
  const getUserRolesInDocument = useCallback((doc: ApprovalDocument): ('prepared' | 'checked' | 'approved')[] => {
    if (!user) return [];
    const roles: ('prepared' | 'checked' | 'approved')[] = [];

    const isMatchInStage = (approvers?: ApproverItem[]) => {
      if (!approvers || approvers.length === 0) return false;
      return approvers.some(a => checkUserApproverMatch(user, a));
    };

    if (isMatchInStage(doc.stages?.prepared?.approvers)) roles.push('prepared');
    if (isMatchInStage(doc.stages?.checked?.approvers)) roles.push('checked');
    if (isMatchInStage(doc.stages?.approved?.approvers)) roles.push('approved');

    return roles;
  }, [user]);

  // Helper Cek Apakah User Terlibat Sebagai Approver Dokumen Ini (Hak Akses Tampil)
  const isUserInvolvedInDocument = useCallback((doc: ApprovalDocument): boolean => {
    if (!user) return false;
    // Khusus admin jika menyalakan mode lihat semua dokumen
    if (user.role === 'admin' && adminViewAll) return true;

    // Dokumen HANYA muncul jika user terdaftar sebagai Prepared, Checked, atau Approved
    const roles = getUserRolesInDocument(doc);
    return roles.length > 0;
  }, [user, adminViewAll, getUserRolesInDocument]);

  // Statistik & Hitungan per Tab (Hanya dari dokumen yang menjadi hak akses user ini)
  const stats = useMemo(() => {
    let preparedCount = 0;
    let checkedCount = 0;
    let approvedCount = 0;
    let inProgressTotal = 0;
    let completedTotal = 0;
    let myPendingCount = 0;

    for (const doc of documents) {
      const effStage = getEffectiveStage(doc);

      // Jangan hitung dokumen yang belum aktif/not_started atau rejected
      if (effStage === 'not_started' || effStage === 'rejected') continue;

      // 🔒 FILTER HAK AKSES: Hanya hitung dokumen di mana user terlibat sebagai approver
      if (!isUserInvolvedInDocument(doc)) continue;

      if (effStage === 'completed') {
        completedTotal++;
      } else {
        inProgressTotal++;
        if (effStage === 'prepared') {
          preparedCount++;
        } else if (effStage === 'checked') {
          checkedCount++;
        } else if (effStage === 'approved') {
          approvedCount++;
        }
      }

      if (isMyPendingApproval(doc).isMyTurn) {
        myPendingCount++;
      }
    }

    return {
      inProgressTotal,
      preparedCount,
      checkedCount,
      approvedCount,
      completedTotal,
      myPendingCount,
      allTotal: inProgressTotal + completedTotal,
    };
  }, [documents, isUserInvolvedInDocument, isMyPendingApproval]);

  // Filter Dokumen
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const effStage = getEffectiveStage(doc);

      // Jangan pernah tampilkan dokumen yang belum mulai alur / perlu upload revisi oleh admin
      if (effStage === 'not_started' || effStage === 'rejected') return false;

      // 🔒 FILTER HAK AKSES: Hanya tampilkan jika user terlibat di dokumen ini!
      if (!isUserInvolvedInDocument(doc)) return false;

      const isCompleted = effStage === 'completed';

      // 1. Filter Tab
      if (activeTab === 'all' && isCompleted) return false;
      if (activeTab === 'my_pending' && !isMyPendingApproval(doc).isMyTurn) return false;
      if (activeTab === 'prepared' && (isCompleted || effStage !== 'prepared')) return false;
      if (activeTab === 'checked' && (isCompleted || effStage !== 'checked')) return false;
      if (activeTab === 'approved' && (isCompleted || effStage !== 'approved')) return false;
      if (activeTab === 'completed' && !isCompleted) return false;

      // 2. Filter Peran Saya (Prepared / Checked / Approved)
      if (roleFilter !== 'all') {
        const userRoles = getUserRolesInDocument(doc);
        if (!userRoles.includes(roleFilter)) return false;
      }

      // 3. Filter Search (nomor, nama dokumen, owner, pic, nama/email approver)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNomor = doc.nomorDokumen.toLowerCase().includes(q);
        const matchNama = doc.namaDokumen.toLowerCase().includes(q);
        const matchOwner = (doc.owner || '').toLowerCase().includes(q);
        const matchPic = (doc.pic || '').toLowerCase().includes(q);
        const matchApprover = Object.values(doc.stages).some(st =>
          st?.approvers?.some(a => (a.nama || '').toLowerCase().includes(q) || (a.email || '').toLowerCase().includes(q))
        );
        return matchNomor || matchNama || matchOwner || matchPic || matchApprover;
      }

      return true;
    });
  }, [documents, activeTab, roleFilter, searchQuery, isUserInvolvedInDocument, getUserRolesInDocument, isMyPendingApproval]);

  const copyLink = (token: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}/review-prosedur/acc/${token}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2500);
    });
  };

  // Render Status Badge Dokumen Utama
  const renderDocumentStatusBadge = (doc: ApprovalDocument) => {
    const effStage = getEffectiveStage(doc);

    if (effStage === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Selesai Disetujui (ACC Lengkap)
        </span>
      );
    }
    if (effStage === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          Alur Ditolak
        </span>
      );
    }
    if (effStage === 'prepared') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Tahap 1: Prepared (Sedang Berjalan)
        </span>
      );
    }
    if (effStage === 'checked') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-300 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Tahap 2: Checked (Sedang Berjalan)
        </span>
      );
    }
    if (effStage === 'approved') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-300 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          Tahap 3: Approved (Sedang Berjalan)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <Clock className="w-3.5 h-3.5 text-slate-500" />
        {doc.documentStatus || 'Menunggu'}
      </span>
    );
  };

  // Render Box Tahap dalam Pipeline Stepper
  const renderPipelineStageBox = (
    stepNum: number,
    roleKey: 'prepared' | 'checked' | 'approved',
    roleLabel: string,
    roleSublabel: string,
    doc: ApprovalDocument
  ) => {
    const stageDetail = doc.stages[roleKey];
    const approvers = stageDetail?.approvers || [];
    const effStage = getEffectiveStage(doc);

    // Tentukan status tahap ini
    const isStageCompleted =
      effStage === 'completed' ||
      stageDetail?.status === 'completed' ||
      (approvers.length > 0 && approvers.every(a => a.accStatus === 'acc')) ||
      (roleKey === 'prepared' && (effStage === 'checked' || effStage === 'approved')) ||
      (roleKey === 'checked' && effStage === 'approved');

    const isStageActive = effStage === roleKey;
    const isStageRejected = effStage === 'rejected' && stageDetail?.status === 'rejected';

    // Theme styles
    let containerClass = 'border-slate-200 bg-slate-50/60';
    let stepBadge = 'bg-slate-100 text-slate-600 border-slate-200';
    let stepBadgeText = 'Antre Giliran';
    let numCircle = 'bg-slate-200 text-slate-600';
    let avatarTheme = 'bg-slate-100 text-slate-600 border-slate-200';

    if (isStageCompleted) {
      containerClass = 'border-emerald-200/90 bg-emerald-50/30';
      stepBadge = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      stepBadgeText = '✓ Selesai ACC';
      numCircle = 'bg-emerald-600 text-white shadow-xs';
      avatarTheme = 'bg-emerald-100 text-emerald-700 border-emerald-200';
    } else if (isStageActive) {
      if (roleKey === 'prepared') {
        containerClass = 'border-amber-300 bg-white ring-2 ring-amber-400/20 shadow-xs';
        stepBadge = 'bg-amber-100 text-amber-800 border-amber-300';
        stepBadgeText = '● Sedang Berjalan';
        numCircle = 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-300 animate-pulse';
        avatarTheme = 'bg-amber-100 text-amber-800 border-amber-200';
      } else if (roleKey === 'checked') {
        containerClass = 'border-blue-300 bg-white ring-2 ring-blue-400/20 shadow-xs';
        stepBadge = 'bg-blue-100 text-blue-800 border-blue-300';
        stepBadgeText = '● Sedang Berjalan';
        numCircle = 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-300 animate-pulse';
        avatarTheme = 'bg-blue-100 text-blue-800 border-blue-200';
      } else {
        containerClass = 'border-purple-300 bg-white ring-2 ring-purple-400/20 shadow-xs';
        stepBadge = 'bg-purple-100 text-purple-800 border-purple-300';
        stepBadgeText = '● Sedang Berjalan';
        numCircle = 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-300 animate-pulse';
        avatarTheme = 'bg-purple-100 text-purple-800 border-purple-200';
      }
    } else if (isStageRejected) {
      containerClass = 'border-rose-200 bg-rose-50/40';
      stepBadge = 'bg-rose-100 text-rose-800 border-rose-200';
      stepBadgeText = '✕ Ditolak';
      numCircle = 'bg-rose-600 text-white';
      avatarTheme = 'bg-rose-100 text-rose-800 border-rose-200';
    }

    return (
      <div className={`rounded-xl border p-3 flex flex-col justify-between transition-all duration-200 ${containerClass}`}>
        {/* Step Header */}
        <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-slate-200/70">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${numCircle}`}>
              {isStageCompleted ? '✓' : stepNum}
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  {roleLabel}
                </span>
                <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                  ({roleSublabel})
                </span>
              </div>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${stepBadge}`}>
            {stepBadgeText}
          </span>
        </div>

        {/* Approver Cards inside Step */}
        <div className="space-y-2 flex-1">
          {approvers.length > 0 ? (
            approvers.map((a, idx) => {
              const isAcc = a.accStatus === 'acc' || isStageCompleted;
              const isPending = a.accStatus === 'pending';
              const isRej = a.accStatus === 'rejected';

              // PENTING: Cek kecocokan user yang login dengan setting approver oleh admin
              const isUserApprover = checkUserApproverMatch(user, a);
              const initials = getInitials(a.nama || a.email);

              return (
                <div
                  key={idx}
                  className={`bg-white rounded-lg p-2.5 border transition-all shadow-2xs flex items-center justify-between gap-2 text-xs ${isUserApprover && isPending && isStageActive
                    ? 'border-indigo-400 ring-2 ring-indigo-200/50 bg-indigo-50/20'
                    : isUserApprover
                      ? 'border-indigo-200 bg-indigo-50/10'
                      : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                >
                  {/* Left: Avatar & Info */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-bold flex-shrink-0 shadow-2xs ${avatarTheme}`}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-800 truncate text-[11px] leading-tight" title={a.nama || a.email}>
                          {a.nama || a.email.split('@')[0]}
                        </p>
                        {isUserApprover && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-600 text-white leading-none shadow-2xs">
                            Anda
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">{a.email}</p>
                    </div>
                  </div>

                  {/* Right: Status Pill & Direct Action (Tombol Buka ACC langsung di luar untuk alur milik user) */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
                    {/* Status Pill */}
                    {isAcc ? (
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ACC
                        </span>
                        {a.accAt && (
                          <span className="text-[9px] text-slate-400">{formatDate(a.accAt)}</span>
                        )}
                      </div>
                    ) : isPending && isStageActive ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending
                      </span>
                    ) : isRej ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        <XCircle className="w-3 h-3 text-rose-600" /> Ditolak
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {isUserApprover ? 'Antre Giliran Anda' : 'Antre Giliran'}
                      </span>
                    )}

                    {/* 🆕 TOMBOL BUKA ACC LANGSUNG DI LUAR (BAGIAN ALUR MILIK DIA) */}
                    {isUserApprover && a.token && (
                      <Link
                        href={`/acc/${a.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all shadow-2xs ${isPending && isStageActive
                          ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-xs hover:scale-105 active:scale-95'
                          : isAcc
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 hover:border-emerald-300'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 hover:border-indigo-300'
                          }`}
                        title="Buka formulir persetujuan (ACC) dokumen Anda"
                      >
                        <span>Buka ACC</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-[11px] text-slate-400 italic py-3 text-center">Belum ada pejabat approver</p>
          )}
        </div>
      </div>
    );
  };

  const userInitials = getInitials(user?.fullName || user?.email || 'PIC');

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 pb-12">
      {/* ─── Modern Elevated Header ─────────────────────────────────────────── */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Breadcrumbs & Brand */}
            <div className="flex items-center gap-3">
              <Link
                href="/pic-dashboard"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold transition-all group shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>Dashboard PIC</span>
              </Link>

              <div className="h-5 w-px bg-slate-200 hidden sm:block" />

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-none">
                    Persetujuan Dokumen Prosedur
                  </h1>
                  <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
                    Monitoring & Akses Pengesahan: Prepared &bull; Checked &bull; Approved
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Sync & Profile */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={fetchApprovals}
                disabled={refreshing}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all disabled:opacity-50 shadow-2xs"
                title="Segarkan Data Real-Time"
              >
                <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
              </button>

              <div className="flex items-center gap-2.5 pl-2.5 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-indigo-100 flex-shrink-0 shadow-2xs">
                  {userInitials}
                </div>
                <div className="text-left hidden md:block">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-900 leading-none">{user?.fullName || 'PIC / Approver'}</p>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 leading-tight">
                      PIC
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate max-w-[150px] leading-tight mt-0.5">{user?.email}</p>
                </div>
              </div>

              <button
                onClick={() => logout()}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all border border-slate-200 hover:border-rose-200 shadow-2xs"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Container ──────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8 space-y-4">
        {/* Banner Notifikasi Khusus jika ada dokumen yang menunggu tindakan ACC user */}
        {stats.myPendingCount > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center flex-shrink-0 shadow-inner">
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-sm">
                  Tindakan Diperlukan: Ada {stats.myPendingCount} Dokumen Menunggu Persetujuan Anda!
                </h3>
                <p className="text-xs text-indigo-100 mt-0.5">
                  Email/Nama Anda terdaftar sesuai setting pejabat approver aktif oleh admin. Silakan klik tombol ACC untuk meninjau dan menyetujui.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('my_pending')}
              className="px-4 py-2 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 text-xs font-bold transition-all whitespace-nowrap self-start sm:self-auto shadow-xs flex items-center gap-1.5 hover:shadow"
            >
              <span>Buka Tugas Saya ({stats.myPendingCount})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ─── 6 Kartu Statistik Eksekutif (Harmonis, Modern & Seimbang) ──────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Sedang Berjalan */}
          <button
            onClick={() => setActiveTab('all')}
            className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group shadow-2xs hover:shadow-xs ${activeTab === 'all'
              ? 'bg-indigo-50/40 border-indigo-600 ring-2 ring-indigo-500/20'
              : 'bg-white border-slate-200/90 hover:border-indigo-300'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Sedang Berjalan
              </span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2 leading-none">{stats.inProgressTotal}</p>
            <p className="text-[10px] text-slate-400 mt-1 truncate">Total alur aktif</p>
            {activeTab === 'all' && (
              <span className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600" />
            )}
          </button>

          {/* 2. Tugas Saya */}
          <button
            onClick={() => setActiveTab('my_pending')}
            className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group shadow-2xs hover:shadow-xs ${activeTab === 'my_pending'
              ? 'bg-purple-50/40 border-purple-600 ring-2 ring-purple-500/20'
              : stats.myPendingCount > 0
                ? 'bg-purple-50/20 border-purple-300 hover:border-purple-400'
                : 'bg-white border-slate-200/90 hover:border-purple-300'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                Tugas Saya
              </span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center relative">
                <Sparkles className="w-3.5 h-3.5" />
                {stats.myPendingCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-purple-600 animate-ping" />
                )}
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2 leading-none">{stats.myPendingCount}</p>
            <p className="text-[10px] text-purple-600 font-medium mt-1 truncate">Perlu ACC Anda</p>
            {activeTab === 'my_pending' && (
              <span className="absolute bottom-0 left-0 right-0 h-1 bg-purple-600" />
            )}
          </button>

          {/* 3. Tahap Prepared */}
          <button
            onClick={() => setActiveTab('prepared')}
            className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group shadow-2xs hover:shadow-xs ${activeTab === 'prepared'
              ? 'bg-amber-50/40 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200/90 hover:border-amber-300'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Prepared
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2 leading-none">{stats.preparedCount}</p>
            <p className="text-[10px] text-slate-400 mt-1 truncate">Tahap 1 Penyusun</p>
            {activeTab === 'prepared' && (
              <span className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
            )}
          </button>

          {/* 4. Tahap Checked */}
          <button
            onClick={() => setActiveTab('checked')}
            className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group shadow-2xs hover:shadow-xs ${activeTab === 'checked'
              ? 'bg-blue-50/40 border-blue-600 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200/90 hover:border-blue-300'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                Checked
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
                <FileCheck2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2 leading-none">{stats.checkedCount}</p>
            <p className="text-[10px] text-slate-400 mt-1 truncate">Tahap 2 Pemeriksa</p>
            {activeTab === 'checked' && (
              <span className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600" />
            )}
          </button>

          {/* 5. Tahap Approved */}
          <button
            onClick={() => setActiveTab('approved')}
            className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group shadow-2xs hover:shadow-xs ${activeTab === 'approved'
              ? 'bg-purple-50/40 border-purple-600 ring-2 ring-purple-500/20'
              : 'bg-white border-slate-200/90 hover:border-purple-300'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                Approved
              </span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2 leading-none">{stats.approvedCount}</p>
            <p className="text-[10px] text-slate-400 mt-1 truncate">Tahap 3 Pengesah</p>
            {activeTab === 'approved' && (
              <span className="absolute bottom-0 left-0 right-0 h-1 bg-purple-600" />
            )}
          </button>

          {/* 6. Selesai ACC */}
          <button
            onClick={() => setActiveTab('completed')}
            className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group shadow-2xs hover:shadow-xs ${activeTab === 'completed'
              ? 'bg-emerald-50/40 border-emerald-600 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200/90 hover:border-emerald-300'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Selesai ACC
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2 leading-none">{stats.completedTotal}</p>
            <p className="text-[10px] text-slate-400 mt-1 truncate">Disetujui penuh</p>
            {activeTab === 'completed' && (
              <span className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600" />
            )}
          </button>
        </div>

        {/* ─── Segmented Filter & Search Toolbar ──────────────────────────────── */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-2.5">
          {/* Segmented Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <span>Semua Berjalan</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${activeTab === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {stats.inProgressTotal}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('my_pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'my_pending'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-purple-700 hover:bg-purple-50'
                }`}
            >
              <span>Tugas Saya</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${activeTab === 'my_pending' ? 'bg-purple-800 text-white' : 'bg-purple-100 text-purple-700'}`}>
                {stats.myPendingCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('prepared')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'prepared'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <span>Prepared</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${activeTab === 'prepared' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {stats.preparedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('checked')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'checked'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <span>Checked</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${activeTab === 'checked' ? 'bg-blue-800 text-white' : 'bg-blue-100 text-blue-700'}`}>
                {stats.checkedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'approved'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <span>Approved</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${activeTab === 'approved' ? 'bg-purple-800 text-white' : 'bg-purple-100 text-purple-700'}`}>
                {stats.approvedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <span>Selesai</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${activeTab === 'completed' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                {stats.completedTotal}
              </span>
            </button>
          </div>

          {/* Controls: Role Filter & Search */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto">
            {/* Filter Peran Saya */}
            <div className="relative">
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as any)}
                className="pl-2.5 pr-7 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer transition-colors shadow-2xs"
                title="Filter dokumen berdasarkan peran Anda (Prepared / Checked / Approved)"
              >
                <option value="all">Semua Peran Saya</option>
                <option value="prepared">Sebagai Prepared</option>
                <option value="checked">Sebagai Checked</option>
                <option value="approved">Sebagai Approved</option>
              </select>
            </div>

            {/* Toggle Mode Admin (Khusus user dengan role admin) */}
            {user?.role === 'admin' && (
              <button
                type="button"
                onClick={() => setAdminViewAll(prev => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-2xs ${
                  adminViewAll
                    ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title="Khusus Akun Admin: Beralih antara melihat semua dokumen atau hanya dokumen Anda"
              >
                <ShieldCheck size={13} className={adminViewAll ? 'text-white' : 'text-slate-500'} />
                <span>{adminViewAll ? 'Mode Admin: Semua' : 'Dokumen Saya'}</span>
              </button>
            )}

            {/* Search Box with Shortcut Badge */}
            <div className="relative flex-1 sm:w-60 md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari nomor, judul, approver..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-16 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all shadow-inner"
              />
              <div className="absolute right-2.5 top-2 flex items-center gap-1">
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono font-medium text-slate-400 bg-slate-200/80 rounded border border-slate-300/80 select-none">
                    Ctrl K
                  </kbd>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Daftar Dokumen ─────────────────────────────────────────────────── */}
        {loading ? (
          <DocumentApprovalSkeleton />
        ) : filteredDocuments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <FileText className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Tidak ada dokumen ditemukan</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {searchQuery
                ? `Tidak ada dokumen yang cocok dengan kata kunci "${searchQuery}".`
                : activeTab === 'my_pending'
                  ? 'Bagus! Saat ini tidak ada dokumen yang memerlukan tindakan persetujuan (ACC) dari Anda.'
                  : 'Tidak ada dokumen aktif pada kategori ini.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDocuments.map(doc => {
              const myApproval = isMyPendingApproval(doc);
              const effStage = getEffectiveStage(doc);
              const isCompleted = effStage === 'completed';

              // Analisa keterkaitan user dengan dokumen ini berdasarkan setting approver oleh admin:
              const userInPrepared = doc.stages.prepared?.approvers.some(a => checkUserApproverMatch(user, a));
              const userInChecked = doc.stages.checked?.approvers.some(a => checkUserApproverMatch(user, a));
              const userInApproved = doc.stages.approved?.approvers.some(a => checkUserApproverMatch(user, a));
              const isUserConfiguredApprover = userInPrepared || userInChecked || userInApproved;

              // Apakah user sudah pernah melakukan ACC di dokumen ini?
              const userHasApprovedThisDoc =
                (userInPrepared && doc.stages.prepared?.approvers.some(a => checkUserApproverMatch(user, a) && a.accStatus === 'acc')) ||
                (userInChecked && doc.stages.checked?.approvers.some(a => checkUserApproverMatch(user, a) && a.accStatus === 'acc')) ||
                (userInApproved && doc.stages.approved?.approvers.some(a => checkUserApproverMatch(user, a) && a.accStatus === 'acc'));

              // Apakah user terdaftar di tahap masa depan yang saat ini masih menunggu giliran?
              let userFutureStage: { role: string; roleLabel: string } | null = null;
              if (effStage === 'prepared') {
                if (userInChecked) userFutureStage = { role: 'checked', roleLabel: 'Tahap 2: Checked' };
                else if (userInApproved) userFutureStage = { role: 'approved', roleLabel: 'Tahap 3: Approved' };
              } else if (effStage === 'checked') {
                if (userInApproved) userFutureStage = { role: 'approved', roleLabel: 'Tahap 3: Approved' };
              }

              return (
                <div
                  key={`${doc.nomorDokumen}-${doc.cycleId}`}
                  className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-sm overflow-hidden ${myApproval.isMyTurn
                    ? 'border-l-4 border-l-purple-600 border-purple-200 ring-2 ring-purple-500/10'
                    : isCompleted
                      ? 'border-l-4 border-l-emerald-500 border-slate-200'
                      : effStage === 'prepared'
                        ? 'border-l-4 border-l-amber-500 border-slate-200'
                        : effStage === 'checked'
                          ? 'border-l-4 border-l-blue-500 border-slate-200'
                          : effStage === 'approved'
                            ? 'border-l-4 border-l-purple-500 border-slate-200'
                            : 'border-l-4 border-l-slate-400 border-slate-200'
                    }`}
                >
                  {/* Top Bar Dokumen */}
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                    <div className="space-y-1.5 min-w-0">
                      {/* Badge Metadata Bar */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white bg-slate-900 px-2.5 py-0.5 rounded-lg shadow-2xs tracking-wide">
                          {doc.nomorDokumen}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          Level {doc.levelDokumen}
                        </span>
                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                          Rev. {doc.revisi || '0'}
                        </span>
                        {renderDocumentStatusBadge(doc)}

                        {/* Badge Peran Anda pada Dokumen Ini */}
                        {userInPrepared && (
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200 shadow-2xs flex items-center gap-1">
                            <UserCheck size={11} className="text-amber-600" />
                            <span>Peran Anda: Prepared</span>
                          </span>
                        )}
                        {userInChecked && (
                          <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200 shadow-2xs flex items-center gap-1">
                            <FileCheck2 size={11} className="text-blue-600" />
                            <span>Peran Anda: Checked</span>
                          </span>
                        )}
                        {userInApproved && (
                          <span className="text-[11px] font-bold text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200 shadow-2xs flex items-center gap-1">
                            <ShieldCheck size={11} className="text-purple-600" />
                            <span>Peran Anda: Approved</span>
                          </span>
                        )}
                      </div>

                      {/* Judul Dokumen */}
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug tracking-tight">
                        {doc.namaDokumen}
                      </h2>

                      {/* Chips Info Owner & Tanggal */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-0.5">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          Owner: <strong className="text-slate-700">{doc.owner || '-'}</strong>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          PIC: <strong className="text-slate-700">{doc.pic || '-'}</strong>
                        </span>
                        {doc.startedAt && (
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Mulai: <strong className="text-slate-700">{formatDate(doc.startedAt)}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tombol Aksi Kanan (Validasi Hak Akses PIC & Approver) */}
                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                      {/* 1. KONDISI SUDAH SELESAI */}
                      {isCompleted && (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Selesai Disetujui</span>
                        </span>
                      )}

                      {/* 2. KONDISI DITOLAK */}
                      {effStage === 'rejected' && (
                        <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Alur Ditolak</span>
                        </span>
                      )}

                      {/* 3. GILIRAN USER SAAT INI (AKTIF & COCOK DENGAN SETTING ADMIN) */}
                      {!isCompleted && effStage !== 'rejected' && myApproval.isMyTurn && myApproval.token && (
                        <Link
                          href={`/acc/${myApproval.token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                          title="Klik untuk membuka lembar persetujuan dokumen Anda"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>ACC Dokumen Sekarang</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}

                      {/* 4. USER TERDAFTAR DI TAHAP MASA DEPAN (MENUNGGU GILIRAN) */}
                      {!isCompleted && effStage !== 'rejected' && !myApproval.isMyTurn && !userHasApprovedThisDoc && userFutureStage && (
                        <button
                          disabled
                          className="px-3.5 py-1.5 rounded-xl bg-amber-50/80 text-amber-800 border border-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed opacity-90 shadow-2xs"
                          title={`Anda terdaftar sebagai approver pada ${userFutureStage.roleLabel}. Menunggu tahap ${effStage.toUpperCase()} selesai disetujui.`}
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Menunggu Giliran ({userFutureStage.role.toUpperCase()})</span>
                        </button>
                      )}

                      {/* 6. USER BUKAN APPROVER PADA DOKUMEN INI (DISABLE / READ-ONLY) */}
                      {!isCompleted && effStage !== 'rejected' && !myApproval.isMyTurn && !userHasApprovedThisDoc && !userFutureStage && (
                        <button
                          disabled
                          className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed opacity-75 shadow-2xs"
                          title="Akun PIC Anda tidak disetting sebagai pejabat approver untuk dokumen ini. Anda hanya dapat melihat dokumen & alur."
                        >
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Hanya Lihat (Bukan Approver)</span>
                        </button>
                      )}

                      {/* Tombol Preview PDF (Selalu dapat dilihat PIC) */}
                      {doc.filePath && (
                        <button
                          onClick={() => setPreviewPdfDoc({
                            filePath: doc.filePath!,
                            fileName: doc.fileName || `${doc.nomorDokumen}.pdf`,
                            nomorDokumen: doc.nomorDokumen,
                          })}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Lihat PDF</span>
                        </button>
                      )}

                      {/* Tombol Detail Alur */}
                      <button
                        onClick={() => setDetailDoc(doc)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <Workflow className="w-3.5 h-3.5 text-slate-500" />
                        <span>Detail Alur</span>
                      </button>
                    </div>
                  </div>

                  {/* Banner Notifikasi Giliran User jika dokumen ini memerlukan ACC user */}
                  {myApproval.isMyTurn && (
                    <div className="px-4 py-2.5 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-purple-900 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse flex-shrink-0" />
                        <span>
                          Giliran Anda: Dokumen ini memerlukan persetujuan dari Anda pada tahap{' '}
                          <strong className="uppercase font-bold text-purple-800">{myApproval.role}</strong>.
                        </span>
                      </div>
                      {myApproval.token && (
                        <Link
                          href={`/acc/${myApproval.token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-purple-700 hover:text-purple-900 hover:underline flex items-center gap-1 whitespace-nowrap self-start sm:self-auto"
                        >
                          <span>Buka Formulir ACC</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  )}

                  {/* ─── Pipeline Stepper Visual (3 Tahap Terhubung) ─────────── */}
                  <div className="p-4 sm:p-5 bg-slate-50/50 space-y-3">
                    {/* Stepper Pipeline Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pb-1">
                      <div className="flex items-center gap-2">
                        <Workflow className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                          Alur Persetujuan Dokumen
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 font-medium text-[11px]">
                          {isCompleted ? '3 Tahap Telah Disetujui Penuh' : 'Siklus Berjenjang 3 Tahap'}
                        </span>
                      </div>

                      {/* Step Indicator Breadcrumb */}
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                        <span className={effStage === 'prepared' ? 'text-amber-700 font-bold' : effStage === 'checked' || effStage === 'approved' || effStage === 'completed' ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                          1. Prepared
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        <span className={effStage === 'checked' ? 'text-blue-700 font-bold' : effStage === 'approved' || effStage === 'completed' ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                          2. Checked
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        <span className={effStage === 'approved' ? 'text-purple-700 font-bold' : effStage === 'completed' ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                          3. Approved
                        </span>
                      </div>
                    </div>

                    {/* Grid 3 Kolom Stepper Box */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                      {renderPipelineStageBox(1, 'prepared', 'Prepared', 'Penyusun', doc)}
                      {renderPipelineStageBox(2, 'checked', 'Checked', 'Pemeriksa', doc)}
                      {renderPipelineStageBox(3, 'approved', 'Approved', 'Pengesah', doc)}
                    </div>

                    {/* Alert Penolakan jika ada */}
                    {doc.rejection && (
                      <div className="mt-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 animate-in fade-in">
                        <div className="flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-bold text-rose-800">
                              Ditolak pada tahap {doc.rejection.roleLabel} oleh {doc.rejection.nama || doc.rejection.email}
                            </p>
                            <p className="text-rose-700 mt-0.5 italic">&ldquo;{doc.rejection.reason}&rdquo;</p>
                            <p className="text-[10px] text-rose-500 mt-1">Waktu: {formatDateTime(doc.rejection.rejectedAt)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ─── Modal Preview PDF ────────────────────────────────────────────────── */}
      {previewPdfDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Header Modal */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 shadow-2xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm leading-none">{previewPdfDoc.nomorDokumen}</h3>
                  <p className="text-xs text-slate-500 truncate max-w-md mt-0.5">{previewPdfDoc.fileName}</p>
                </div>
              </div>

              <button
                onClick={() => setPreviewPdfDoc(null)}
                className="w-8 h-8 rounded-xl hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewer Body */}
            <div className="flex-1 bg-slate-100 overflow-hidden relative">
              <PDFViewer
                filePath={previewPdfDoc.filePath}
                fileName={previewPdfDoc.fileName}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Detail Alur ────────────────────────────────────────────────── */}
      {detailDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <span className="font-mono text-xs font-bold text-white bg-slate-900 px-2.5 py-0.5 rounded-lg shadow-2xs">
                  {detailDoc.nomorDokumen}
                </span>
                <h3 className="font-bold text-slate-900 text-base mt-1.5">{detailDoc.namaDokumen}</h3>
              </div>
              <button
                onClick={() => setDetailDoc(null)}
                className="w-8 h-8 rounded-xl hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/70">
                <div>
                  <p className="text-slate-400">Level Dokumen</p>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">Level {detailDoc.levelDokumen}</p>
                </div>
                <div>
                  <p className="text-slate-400">Nomor Revisi</p>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">Rev. {detailDoc.revisi || '0'}</p>
                </div>
                <div>
                  <p className="text-slate-400">Owner Departemen</p>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">{detailDoc.owner || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-400">PIC Penanggung Jawab</p>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">{detailDoc.pic || '-'}</p>
                </div>
              </div>

              {/* Rincian Setiap Tahap */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Workflow className="w-3.5 h-3.5 text-slate-400" />
                  <span>Daftar Pejabat Approver & Riwayat Tindakan</span>
                </h4>

                {(['prepared', 'checked', 'approved'] as const).map(role => {
                  const stage = detailDoc.stages[role];
                  const approvers = stage?.approvers || [];
                  const effStage = getEffectiveStage(detailDoc);
                  const isStageDone =
                    effStage === 'completed' ||
                    stage?.status === 'completed' ||
                    (approvers.length > 0 && approvers.every(a => a.accStatus === 'acc')) ||
                    (role === 'prepared' && (effStage === 'checked' || effStage === 'approved')) ||
                    (role === 'checked' && effStage === 'approved');

                  return (
                    <div key={role} className="border border-slate-200 rounded-xl p-3.5 bg-white shadow-2xs">
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                        <span className="font-bold text-xs uppercase text-slate-800 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isStageDone ? 'bg-emerald-500' : effStage === role ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
                          Tahap {role.toUpperCase()}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isStageDone
                          ? 'bg-emerald-100 text-emerald-800'
                          : effStage === role
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                          }`}>
                          {isStageDone ? '✓ Selesai ACC' : effStage === role ? 'Sedang Berjalan' : 'Antre Giliran'}
                        </span>
                      </div>

                      {approvers.length > 0 ? (
                        <div className="space-y-2 mt-2">
                          {approvers.map((a, idx) => {
                            // Cek apakah approver ini cocok dengan user yang login
                            const isThisUserApprover = checkUserApproverMatch(user, a);

                            return (
                              <div key={idx} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200/70 text-xs">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-bold text-slate-800">{a.nama || '-'}</p>
                                    {isThisUserApprover && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-600 text-white leading-none shadow-2xs">
                                        Anda
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-slate-400 text-[11px]">{a.email}</p>
                                  {a.accAt && (
                                    <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                                      Disetujui: {formatDateTime(a.accAt)}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right flex flex-col items-end gap-1">
                                  {(a.accStatus === 'acc' || isStageDone) && (
                                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> ACC
                                    </span>
                                  )}
                                  {a.accStatus === 'pending' && !isStageDone && (
                                    <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300">
                                      <Clock className="w-3.5 h-3.5" /> Pending
                                    </span>
                                  )}
                                  {a.accStatus === 'rejected' && (
                                    <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-xs bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                      <XCircle className="w-3.5 h-3.5" /> Ditolak
                                    </span>
                                  )}
                                  {a.accStatus === 'waiting' && !isStageDone && (
                                    <span className="inline-flex items-center gap-1 text-slate-500 font-medium text-xs bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                      <Clock className="w-3.5 h-3.5 text-slate-400" /> Antre
                                    </span>
                                  )}

                                  {/* HANYA APPROVER BERSANGKUTAN YANG BISA MELIHAT TAUTAN ACC PRIBADINYA */}
                                  {a.token && isThisUserApprover ? (
                                    <div className="flex items-center gap-2 mt-1">
                                      <button
                                        onClick={() => copyLink(a.token!)}
                                        className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                                        title="Salin Link Approval Pribadi Anda"
                                      >
                                        {copiedToken === a.token ? (
                                          <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                                            <Check className="w-3 h-3" /> Tersalin
                                          </span>
                                        ) : (
                                          <span className="flex items-center gap-0.5">
                                            <Copy className="w-3 h-3" /> Salin Link
                                          </span>
                                        )}
                                      </button>
                                      <Link
                                        href={`/acc/${a.token}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-indigo-600 hover:underline font-semibold flex items-center gap-0.5"
                                      >
                                        <span>Buka ACC</span>
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </Link>
                                    </div>
                                  ) : !isStageDone ? (
                                    <span className="text-[10px] text-slate-400 italic mt-1 block">
                                      Khusus approver bersangkutan
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Belum ada pejabat approver.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setDetailDoc(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
