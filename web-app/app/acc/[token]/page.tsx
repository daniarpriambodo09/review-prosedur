// app/acc/[token]/page.tsx
//
// Halaman publik persetujuan dokumen (TANPA login) dari tautan email ACC.
// Tata letak 2 kolom modern (Split-Screen):
// - Bagian Kiri: Pratinjau dokumen PDF interaktif dengan anotasi & fitur bandingkan versi
// - Bagian Kanan: Panel persetujuan terstruktur (Info Dokumen, Identitas, Stepper Alur, & Tombol Aksi)
// - Pojok Kanan Bawah: Floating Chat Widget untuk diskusi real-time dengan tim

'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PDFViewer from '@/components/documents/PDFViewer';
import VersionToggleBar from '@/components/documents/VersionToggleBar';
import DocumentChat from '@/components/chat/DocumentChat';
import { useAuth } from '@/contexts/AuthContext';
import { checkUserApproverMatch } from '@/lib/approvalAuth';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  User,
  Mail,
  Download,
  ExternalLink,
  AlertCircle,
  Check,
  Calendar,
  Layers,
  Info,
  ChevronRight,
  FileCheck2,
  Lock,
} from 'lucide-react';

interface RejectionInfo {
  role: 'prepared' | 'checked' | 'approved';
  roleLabel: string;
  nama: string | null;
  email: string;
  reason: string;
  rejectedAt: string;
}

interface TimelineItem {
  role: string;
  roleLabel: string;
  nama: string | null;
  email: string;
  accStatus: 'acc' | 'pending' | 'rejected' | 'waiting';
  accAt: string | null;
}

interface AccInfo {
  role: 'prepared' | 'checked' | 'approved';
  roleLabel: string;
  nama: string | null;
  email: string;
  accStatus: 'pending' | 'acc' | 'rejected';
  accAt: string | null;
  rejectReason: string | null;
  nomorDokumen: string;
  namaDokumen: string;
  levelDokumen?: string | null;
  revisi?: string | null;
  owner?: string | null;
  pic?: string | null;
  cycleStatus: 'in_progress' | 'completed' | 'cancelled' | 'rejected';
  currentStage?: string;
  fileName: string | null;
  filePath: string | null;
  rejection: RejectionInfo | null;
  timeline?: TimelineItem[];
}

interface AccSubmitResult {
  rejected: boolean;
  cycleCompleted: boolean;
  nextRole: string | null;
  emailWarning: string | null;
}

const ROLE_COLOR: Record<string, string> = {
  prepared: 'bg-blue-50 text-blue-700 border-blue-200',
  checked:  'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const ROLE_BADGE_COLOR: Record<string, string> = {
  prepared: 'bg-blue-600 text-white',
  checked:  'bg-amber-600 text-white',
  approved: 'bg-emerald-600 text-white',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function getInitials(name: string | null, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col antialiased text-slate-800 animate-pulse">
      {/* Header Skeleton */}
      <header className="bg-white/95 border-b border-slate-200/80 px-4 sm:px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-slate-200" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-5 w-24 bg-slate-200 rounded-lg" />
              <div className="h-5 w-48 bg-slate-200 rounded-md" />
            </div>
            <div className="h-3 w-36 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-7 w-28 bg-slate-200 rounded-full" />
          <div className="w-8 h-8 rounded-xl bg-slate-200 hidden md:block" />
        </div>
      </header>

      {/* Main Skeleton */}
      <main className="flex-1 flex flex-col lg:flex-row p-3 sm:p-5 gap-5 max-w-[1840px] w-full mx-auto">
        {/* Left PDF Canvas Skeleton */}
        <section className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden min-h-[620px]">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-200" />
              <div className="space-y-1">
                <div className="h-4 w-36 bg-slate-200 rounded" />
                <div className="h-3 w-28 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-7 w-24 bg-slate-100 rounded-xl" />
              <div className="h-7 w-28 bg-slate-100 rounded-xl" />
            </div>
          </div>
          <div className="flex-1 bg-slate-100/70 flex flex-col items-center justify-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-200" />
            <div className="h-4 w-48 bg-slate-200 rounded" />
            <div className="h-3 w-64 bg-slate-200/60 rounded" />
          </div>
        </section>

        {/* Right Aside Skeleton */}
        <aside className="w-full lg:w-[400px] xl:w-[430px] flex flex-col space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 space-y-4">
            <div className="flex justify-between">
              <div className="h-6 w-24 bg-slate-200 rounded-full" />
              <div className="h-6 w-20 bg-slate-200 rounded-md" />
            </div>
            <div className="h-6 w-3/4 bg-slate-200 rounded-lg" />
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-slate-100 rounded-md" />
              <div className="h-5 w-16 bg-slate-100 rounded-md" />
            </div>
            <div className="h-px bg-slate-100" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-12 bg-slate-100 rounded-xl" />
            </div>
            <div className="h-px bg-slate-100" />
            <div className="space-y-2 pt-2">
              <div className="h-10 bg-slate-200 rounded-xl" />
              <div className="h-10 bg-slate-100 rounded-xl" />
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-lg font-extrabold text-slate-900 mb-2">Akses Tidak Valid</h1>
        <p className="text-xs text-slate-500 leading-relaxed mb-6">{message}</p>
        <p className="text-[11px] text-slate-400">
          Silakan hubungi administrator jika Anda merasa ini adalah sebuah kesalahan.
        </p>
      </div>
    </div>
  );
}

export default function AccPage() {
  const params = useParams<{ token: string }>();
  const token  = params?.token ?? '';

  const { user, isAuthenticated } = useAuth();

  const [info,       setInfo]       = useState<AccInfo | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState('');
  const [submitError, setSubmitError] = useState('');
  const [result,     setResult]     = useState<AccSubmitResult | null>(null);

  // Cek apakah akun yang sedang login adalah PIC dan BUKAN pejabat approver dokumen ini
  const isPicUser = isAuthenticated && !!user && user.role === 'pic';
  const isMatchingApprover = !isPicUser || !info || checkUserApproverMatch(user, { email: info.email, nama: info.nama });

  // Form tolak dokumen
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason,   setRejectReason]   = useState('');
  const [submittingAction, setSubmittingAction] = useState<'approve' | 'reject' | null>(null);

  // Fitur Bandingkan Dokumen (versi lama vs baru)
  const [versions, setVersions] = useState<Array<{ id: number; fileName: string; filePath: string; version: number; uploadedAt: string; isActive: boolean }>>([]);
  const [viewing,  setViewing]  = useState<'current' | 'previous'>('current');

  // Mobile Tab Switcher: 'pdf' (Lihat PDF) atau 'approval' (Form ACC)
  const [mobileTab, setMobileTab] = useState<'pdf' | 'approval'>('pdf');

  // Fetch data approval dari token
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    fetch(`/review-prosedur/api/acc/${encodeURIComponent(token)}`)
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Link tidak ditemukan atau tidak valid.');
        return data as AccInfo;
      })
      .then(data => { if (!cancelled) setInfo(data); })
      .catch(err => { if (!cancelled) setLoadError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [token]);

  // Fetch riwayat versi file untuk nomor dokumen ini
  useEffect(() => {
    if (!info?.nomorDokumen) return;
    let cancelled = false;

    fetch(`/review-prosedur/api/files/list?nomorDokumen=${encodeURIComponent(info.nomorDokumen)}`)
      .then(res => res.ok ? res.json() : { files: [] })
      .then(data => { if (!cancelled) setVersions(data.files || []); })
      .catch(() => { if (!cancelled) setVersions([]); });

    return () => { cancelled = true; };
  }, [info?.nomorDokumen]);

  const handleSubmit = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && rejectReason.trim().length < 5) {
      setSubmitError('Alasan penolakan wajib diisi (minimal 5 karakter).');
      return;
    }
    setSubmittingAction(action);
    setSubmitError('');
    try {
      const res = await fetch(`/review-prosedur/api/acc/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          action === 'reject'
            ? { action: 'reject', reason: rejectReason.trim() }
            : { action: 'approve' }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses permintaan.');

      if (action === 'reject') {
        setResult({ rejected: true, cycleCompleted: false, nextRole: null, emailWarning: null });
        setInfo(prev => prev ? {
          ...prev,
          accStatus: 'rejected',
          accAt: new Date().toISOString(),
          rejectReason: rejectReason.trim(),
        } : prev);
      } else {
        setResult({
          rejected: false,
          cycleCompleted: data.cycleCompleted,
          nextRole:       data.nextRole,
          emailWarning:   data.emailWarning,
        });
        setInfo(prev => prev ? { ...prev, accStatus: 'acc', accAt: new Date().toISOString() } : prev);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Gagal memproses permintaan. Silakan coba lagi.');
    } finally {
      setSubmittingAction(null);
    }
  };

  if (loading) return <LoadingState />;
  if (loadError || !info) return <ErrorState message={loadError || 'Data persetujuan tidak ditemukan.'} />;

  const alreadyAcc = info.accStatus === 'acc';
  const cycleRejected = info.cycleStatus === 'rejected';
  const roleColorCls = ROLE_COLOR[info.role] ?? ROLE_COLOR.prepared;
  const roleBadgeCls = ROLE_BADGE_COLOR[info.role] ?? ROLE_BADGE_COLOR.prepared;

  // File resolution untuk viewing
  const currentFile  = versions.find(v => v.isActive) ?? versions[0] ?? null;
  const previousFile = versions.filter(v => v.id !== currentFile?.id).sort((a, b) => b.version - a.version)[0] ?? null;
  const canCompare = info.cycleStatus !== 'completed' && !!currentFile && !!previousFile;
  const displayFilePath = canCompare && viewing === 'previous' && previousFile ? previousFile.filePath : (currentFile?.filePath || info.filePath);
  const displayFileId   = canCompare && viewing === 'previous' && previousFile ? previousFile.id : (currentFile?.id ?? 0);

  const handleDownload = () => {
    if (!displayFilePath) return;
    const downloadUrl = displayFilePath.startsWith('http') ? displayFilePath : `/review-prosedur${displayFilePath}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = currentFile?.fileName || `${info.nomorDokumen}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenNewTab = () => {
    if (!displayFilePath) return;
    const url = displayFilePath.startsWith('http') ? displayFilePath : `/review-prosedur${displayFilePath}`;
    window.open(url, '_blank');
  };

  // Susun 3 tahap workflow untuk visual progress stepper
  const rolesList: Array<{ key: 'prepared' | 'checked' | 'approved'; label: string; stepNo: number }> = [
    { key: 'prepared', label: 'Prepared', stepNo: 1 },
    { key: 'checked',  label: 'Checked',  stepNo: 2 },
    { key: 'approved', label: 'Approved', stepNo: 3 },
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col antialiased text-slate-800">
      {/* ── Top Navigation Bar (Glassmorphic) ── */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 ring-4 ring-blue-50 flex-shrink-0">
            <ShieldCheck size={22} className="stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-lg flex-shrink-0">
                {info.nomorDokumen}
              </span>
              <h1 className="text-sm font-bold text-slate-900 truncate">
                {info.namaDokumen}
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:flex items-center gap-1.5">
              <span>Portal Persetujuan Dokumen</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-400">Sistem Manajemen Mutu (QMS) PT JAI</span>
            </p>
          </div>
        </div>

        {/* Right Info: Role Badge & Approver Identity */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${roleColorCls}`}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span>Tahap: {info.roleLabel}</span>
          </div>

          <div className="hidden md:flex items-center gap-2.5 pl-3 border-l border-slate-200/80">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs ring-2 ring-slate-100">
              {getInitials(info.nama, info.email)}
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-800 text-[11px] leading-tight">
                {info.nama || 'Approver'}
              </p>
              <p className="text-[10px] text-slate-500 leading-tight truncate max-w-[160px]">
                {info.email}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Layout: Split Screen ── */}
      <main className="flex-1 flex flex-col lg:flex-row p-3 sm:p-5 gap-5 max-w-[1840px] w-full mx-auto">
        {/* ── Segmented Control Mobile Switcher (< lg) ── */}
        <div className="lg:hidden flex items-center p-1 bg-slate-200/80 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => setMobileTab('pdf')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mobileTab === 'pdf'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText size={14} className={mobileTab === 'pdf' ? 'text-blue-600' : 'text-slate-500'} />
            <span>Dokumen PDF</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('approval')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mobileTab === 'approval'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck size={14} className={mobileTab === 'approval' ? 'text-blue-600' : 'text-slate-500'} />
            <span>Form Persetujuan</span>
            {!alreadyAcc && !cycleRejected && isMatchingApprover && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
            )}
          </button>
        </div>

        {/* ── BAGIAN KIRI: Area Pratinjau Dokumen PDF (~68% width) ── */}
        <section className={`flex-1 flex-col bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden min-h-[580px] lg:min-h-[calc(100vh-5.8rem)] ${
          mobileTab === 'pdf' ? 'flex' : 'hidden lg:flex'
        }`}>
          {/* Header Toolbar Pratinjau PDF */}
          <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-slate-50/90 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 border border-rose-100 shadow-2xs">
                <FileText size={18} className="stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                    Lembar Dokumen Prosedur
                  </h2>
                  {currentFile && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      Versi {currentFile.version}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate max-w-sm sm:max-w-md font-mono" title={currentFile?.fileName || info.fileName || ''}>
                  {currentFile?.fileName || info.fileName || 'Pratinjau PDF'}
                </p>
              </div>
            </div>

            {/* Versi Compare, Download & New Tab Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {canCompare && currentFile && previousFile && (
                <div className="scale-95 origin-right">
                  <VersionToggleBar
                    current={{ version: currentFile.version, uploadedAt: currentFile.uploadedAt }}
                    previous={{ version: previousFile.version, uploadedAt: previousFile.uploadedAt }}
                    viewing={viewing}
                    onChange={setViewing}
                  />
                </div>
              )}

              {displayFilePath && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all active:scale-95 shadow-2xs cursor-pointer"
                    title="Unduh file PDF ini ke komputer"
                  >
                    <Download size={13} className="text-slate-500" />
                    <span className="hidden sm:inline">Download PDF</span>
                  </button>
                  <button
                    onClick={handleOpenNewTab}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all active:scale-95 shadow-2xs cursor-pointer"
                    title="Buka PDF di tab baru browser"
                  >
                    <ExternalLink size={13} className="text-slate-500" />
                    <span className="hidden md:inline">Buka di Tab Baru</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Area Render PDF Asli (Native Browser Viewer) */}
          <div className="flex-1 bg-slate-100/60 overflow-hidden relative min-h-[500px] flex flex-col">
            {displayFilePath ? (
              <div className="w-full h-full flex-1">
                <PDFViewer
                  filePath={displayFilePath}
                  fileName={currentFile?.fileName || `${info.nomorDokumen}.pdf`}
                />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center min-h-[450px]">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mb-4 text-slate-300">
                  <FileText size={36} />
                </div>
                <p className="text-sm font-bold text-slate-700">Dokumen Belum Tersedia</p>
                <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                  File dokumen PDF belum diunggah untuk alur persetujuan ini. Silakan hubungi admin pengelola prosedur.
                </p>
              </div>
            )}
          </div>

          {/* Sticky Mobile Floating Pill to jump to Approval form */}
          <div className="lg:hidden p-3 bg-white/95 border-t border-slate-200 flex items-center justify-between gap-3 shadow-lg flex-shrink-0">
            <span className="text-[11px] text-slate-500 truncate">
              Selesai membaca dokumen?
            </span>
            <button
              type="button"
              onClick={() => setMobileTab('approval')}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 flex-shrink-0"
            >
              <span>Buka Form ACC</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </section>

        {/* ── BAGIAN KANAN: Panel Persetujuan & Alur (~32% width, max 430px) ── */}
        <aside className={`w-full lg:w-[400px] xl:w-[430px] flex-col flex-shrink-0 space-y-4 ${
          mobileTab === 'approval' ? 'flex' : 'hidden lg:flex'
        }`}>
          {/* Card Utama: Informasi Dokumen & Tindakan Persetujuan */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            {/* Top Header Card */}
            <div className="p-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${roleColorCls}`}>
                  Tahap: {info.roleLabel}
                </span>
                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                  {info.nomorDokumen}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                {info.namaDokumen}
              </h3>

              {/* Metadata Pills */}
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                {info.levelDokumen && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200/60">
                    Level {info.levelDokumen}
                  </span>
                )}
                {info.revisi && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-100">
                    Rev. {info.revisi}
                  </span>
                )}
                {info.owner && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] border border-slate-200/60">
                    Owner: <strong className="text-slate-800">{info.owner}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Body Card */}
            <div className="p-5 space-y-4">
              {/* Executive Approver Identity */}
              <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 border border-blue-100/80 rounded-2xl p-3.5 flex items-center gap-3 shadow-2xs">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-blue-500/25 flex-shrink-0">
                  {getInitials(info.nama, info.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    Menyetujui Sebagai
                  </p>
                  <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                    {info.nama || 'Approver Terdaftar'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                    <Mail size={12} className="text-slate-400 flex-shrink-0" />
                    <span className="truncate">{info.email}</span>
                  </p>
                </div>
              </div>

              {/* Visual Progress Stepper Alur Persetujuan (Prepared -> Checked -> Approved) */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Alur Persetujuan Dokumen
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    3 Tahap Berjenjang
                  </span>
                </div>
                <div className="space-y-2">
                  {rolesList.map(({ key, label, stepNo }) => {
                    const timelineAction = info.timeline?.find(t => t.role === key);
                    const isCurrentRole = info.role === key;
                    const isPast =
                      (info.role === 'checked' && key === 'prepared') ||
                      (info.role === 'approved' && (key === 'prepared' || key === 'checked'));
                    
                    const isDone = timelineAction?.accStatus === 'acc' || (isPast && !cycleRejected) || (isCurrentRole && (alreadyAcc || result?.rejected === false));
                    const isRejected = timelineAction?.accStatus === 'rejected' || (isCurrentRole && (info.accStatus === 'rejected' || result?.rejected === true));

                    let statusText = 'Menunggu';
                    let badgeBg = 'bg-slate-100 text-slate-500 border border-slate-200/60';
                    let StatusIcon = Clock;
                    let iconColor = 'text-slate-300';

                    if (isDone) {
                      statusText = 'Disetujui';
                      badgeBg = 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold';
                      StatusIcon = CheckCircle2;
                      iconColor = 'text-emerald-600';
                    } else if (isRejected) {
                      statusText = 'Ditolak';
                      badgeBg = 'bg-rose-50 text-rose-700 border border-rose-200 font-bold';
                      StatusIcon = XCircle;
                      iconColor = 'text-rose-600';
                    } else if (isCurrentRole) {
                      statusText = 'Tahap Anda';
                      badgeBg = 'bg-blue-600 text-white font-bold shadow-xs';
                      StatusIcon = Clock;
                      iconColor = 'text-blue-600';
                    }

                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                          isCurrentRole
                            ? 'bg-white border-blue-300 shadow-xs ring-1 ring-blue-100'
                            : 'bg-white/80 border-slate-200/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <StatusIcon size={16} className={`flex-shrink-0 ${iconColor}`} />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 leading-tight">
                              {stepNo}. {label}
                            </p>
                            {timelineAction?.nama && (
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                {timelineAction.nama}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md flex-shrink-0 ${badgeBg}`}>
                          {statusText}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Status Hasil Aksi ── */}
              {/* 1. Baru selesai submit aksi */}
              {result && (
                result.rejected ? (
                  <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                      <XCircle size={16} className="text-rose-600" />
                      <span>Dokumen Ditolak</span>
                    </div>
                    <p className="text-xs text-rose-700 leading-relaxed">
                      Penolakan Anda telah dicatat. Admin pengelola prosedur akan menerima notifikasi untuk merevisi dokumen ini.
                    </p>
                    {info.rejectReason && (
                      <div className="p-2.5 rounded-xl bg-white/90 border border-rose-200 text-xs text-rose-900 italic">
                        &ldquo;{info.rejectReason}&rdquo;
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>Persetujuan Berhasil Dicatat</span>
                    </div>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      {result.cycleCompleted
                        ? 'Seluruh tahapan persetujuan telah selesai! Dokumen ini sekarang resmi berstatus Relevan.'
                        : 'Terima kasih. Persetujuan Anda telah dicatat dan sistem secara otomatis meneruskan dokumen ke tahap berikutnya.'}
                    </p>
                    {result.emailWarning && (
                      <p className="text-[11px] text-amber-700 mt-1">{result.emailWarning}</p>
                    )}
                  </div>
                )
              )}

              {/* 2. Sebelumnya sudah ditolak */}
              {!result && cycleRejected && (
                info.accStatus === 'rejected' ? (
                  <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-2">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                      <XCircle size={16} className="text-rose-600" />
                      <span>Anda Menolak Dokumen Ini</span>
                    </div>
                    <p className="text-xs text-rose-700">
                      {info.accAt ? `Tercatat pada ${formatDate(info.accAt)}.` : ''} Tidak ada tindakan lanjutan yang diperlukan dari Anda.
                    </p>
                    {info.rejectReason && (
                      <div className="p-2.5 rounded-xl bg-white/90 border border-rose-200 text-xs text-rose-900 italic">
                        &ldquo;{info.rejectReason}&rdquo;
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-2">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                      <XCircle size={16} className="text-rose-600" />
                      <span>Dokumen Telah Ditolak</span>
                    </div>
                    <p className="text-xs text-rose-700 leading-relaxed">
                      Dokumen ditolak oleh <strong>{info.rejection?.nama || info.rejection?.email}</strong> ({info.rejection?.roleLabel})
                      {info.rejection?.rejectedAt ? ` pada ${formatDate(info.rejection.rejectedAt)}` : ''}.
                    </p>
                    {info.rejection?.reason && (
                      <div className="p-2.5 rounded-xl bg-white/90 border border-rose-200 text-xs text-rose-900 italic">
                        &ldquo;{info.rejection.reason}&rdquo;
                      </div>
                    )}
                  </div>
                )
              )}

              {/* 3. Sebelumnya sudah pernah ACC */}
              {!result && !cycleRejected && alreadyAcc && (
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Sudah Disetujui</span>
                  </div>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    Anda telah menyetujui dokumen ini{info.accAt ? ` pada ${formatDate(info.accAt)}` : ''}. Menunggu persetujuan dari approver lainnya.
                  </p>
                </div>
              )}

              {/* 4. FORM TINDAKAN: Validasi Kesesuaian Pejabat Approver */}
              {!result && !cycleRejected && !alreadyAcc && (
                !isMatchingApprover ? (
                  <div className="space-y-3 pt-3 border-t border-slate-100 animate-in fade-in">
                    <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 space-y-2">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                        <Lock size={16} className="text-amber-700 flex-shrink-0" />
                        <span>Akses Persetujuan Dibatasi (Hanya Lihat)</span>
                      </div>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Anda sedang login sebagai <strong>{user?.fullName || user?.email}</strong> ({user?.email}).
                        Dokumen ini memerlukan persetujuan dari pejabat <strong>{info.nama || info.email}</strong> ({info.email}).
                      </p>
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        Karena akun Anda tidak cocok dengan pejabat approver yang disetting oleh admin, tombol persetujuan dinonaktifkan. Anda hanya dapat melihat dokumen ini.
                      </p>
                    </div>

                    <button
                      disabled
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-100 text-slate-400 border border-slate-200 text-xs font-bold rounded-2xl cursor-not-allowed opacity-75 shadow-2xs"
                    >
                      <Lock size={15} />
                      <span>Persetujuan Dinonaktifkan (Bukan Pejabat Terdaftar)</span>
                    </button>
                  </div>
                ) : !showRejectForm ? (
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Harap teliti lembar dokumen di sebelah kiri, kemudian tentukan keputusan Anda:
                    </p>

                    {submitError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 font-medium">
                        <AlertCircle size={14} className="text-rose-600 flex-shrink-0" />
                        <span>{submitError}</span>
                      </div>
                    )}

                    <div className="space-y-2 pt-1">
                      {/* Tombol Setujui Dokumen (Emerald Gradient dengan Glow) */}
                      <button
                        onClick={() => handleSubmit('approve')}
                        disabled={submittingAction !== null}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold rounded-2xl transition-all shadow-md shadow-emerald-500/25 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                      >
                        {submittingAction === 'approve' ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Memproses Persetujuan...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={16} className="stroke-[2.5]" />
                            <span>Setujui Dokumen</span>
                          </>
                        )}
                      </button>

                      {/* Tombol Tolak Dokumen */}
                      <button
                        onClick={() => {
                          setShowRejectForm(true);
                          setSubmitError('');
                        }}
                        disabled={submittingAction !== null}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 text-xs font-bold rounded-2xl transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                      >
                        <XCircle size={15} className="text-rose-600" />
                        <span>Tolak Dokumen</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Form Input Alasan Penolakan */
                  <div className="space-y-3 pt-3 border-t border-slate-100 animate-in fade-in">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Alasan Penolakan <span className="text-rose-600">*</span>
                      </label>
                      <textarea
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Jelaskan alasan atau bagian yang perlu direvisi oleh tim..."
                        rows={4}
                        disabled={submittingAction !== null}
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all resize-none disabled:opacity-50"
                      />
                    </div>

                    {submitError && (
                      <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2.5 font-medium">
                        {submitError}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowRejectForm(false);
                          setRejectReason('');
                          setSubmitError('');
                        }}
                        disabled={submittingAction !== null}
                        className="flex-1 px-3 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => handleSubmit('reject')}
                        disabled={submittingAction !== null}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all active:scale-[0.99] shadow-sm shadow-rose-500/25 disabled:opacity-50 cursor-pointer"
                      >
                        {submittingAction === 'reject' ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Mengirim...</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={14} />
                            <span>Kirim Penolakan</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Catatan Keamanan Privat */}
          <div className="p-3 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck size={13} className="text-slate-400" />
            <span>Link persetujuan ini bersifat privat dan dikhususkan untuk akun Anda.</span>
          </div>
        </aside>
      </main>

      {/* ── Floating Chat Widget (Pojok Kanan Bawah) ── */}
      <DocumentChat
        accToken={token}
        myEmail={info.email}
        subtitle={info.namaDokumen}
        inline={false}
      />
    </div>
  );
}