// app/system-settings/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  Server,
  Database,
  Clock,
  RefreshCw,
  Download,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCode,
  ShieldCheck,
  Zap,
  Terminal,
} from 'lucide-react';

interface SystemStatus {
  allHealthy: boolean;
  webServer: {
    status: string;
    uptimeSeconds: number;
    nodeVersion: string;
    port: string;
    memoryHeapUsedMB: number;
  };
  database: {
    status: string;
    latencyMs: number;
    databaseName: string;
    host: string;
    totalProcedures: number;
    totalUsers: number;
  };
  emailScheduler: {
    serviceName: string;
    isOnline: boolean;
    status: string;
    lastHeartbeat: string | null;
    lastError: string | null;
    minutesSinceHeartbeat: number | null;
  };
}

interface BackupFile {
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}h ${h}j ${m}m`;
  if (h > 0) return `${h}j ${m}m ${s}d`;
  return `${m}m ${s}d`;
}

function formatDate(isoStr: string | null) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).replace(/\./g, ':');
}

export default function SystemSettingsPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Load System Health ──────────────────────────────────────────────────────
  const loadSystemStatus = useCallback(async () => {
    try {
      setLoadingStatus(true);
      const res = await fetch('/review-prosedur/api/system/status');
      const data = await res.json();
      if (data.success && data.system) {
        setStatus(data.system);
      }
    } catch (err) {
      console.error('Gagal mengambil status sistem:', err);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // ── Load Backup List ────────────────────────────────────────────────────────
  const loadBackups = useCallback(async () => {
    try {
      setLoadingBackups(true);
      const res = await fetch('/review-prosedur/api/admin/backup-database');
      const data = await res.json();
      if (data.success && Array.isArray(data.backups)) {
        setBackups(data.backups);
      }
    } catch (err) {
      console.error('Gagal mengambil daftar backup:', err);
    } finally {
      setLoadingBackups(false);
    }
  }, []);

  useEffect(() => {
    loadSystemStatus();
    loadBackups();
    // Auto refresh status every 30 seconds
    const interval = setInterval(loadSystemStatus, 30000);
    return () => clearInterval(interval);
  }, [loadSystemStatus, loadBackups]);

  // ── Trigger Manual Backup ───────────────────────────────────────────────────
  const handleTriggerBackup = async () => {
    try {
      setIsBackingUp(true);
      setActionMessage(null);
      const res = await fetch('/review-prosedur/api/admin/backup-database', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal membuat backup');
      }
      setActionMessage({
        type: 'success',
        text: `Backup database berhasil dibuat: ${data.backup?.filename} (${data.backup?.sizeFormatted})`,
      });
      await loadBackups();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Terjadi kesalahan saat memproses backup.',
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  // ── Download Backup File ────────────────────────────────────────────────────
  const handleDownloadFile = (filename: string) => {
    const downloadUrl = `/review-prosedur/api/admin/backup-database?file=${encodeURIComponent(filename)}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">Status Sistem & Backup Database</h1>
                {status?.allHealthy ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 size={12} /> Sistem Normal
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                    <AlertTriangle size={12} /> Perlu Perhatian
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Pantau kesehatan server & scheduler pasca listrik padam, serta kelola backup berkala database PostgreSQL.
              </p>
            </div>

            <button
              onClick={() => {
                loadSystemStatus();
                loadBackups();
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm active:scale-95 transition-all"
            >
              <RefreshCw size={14} className={loadingStatus ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          {/* Action Message Alert */}
          {actionMessage && (
            <div
              className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm ${
                actionMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {actionMessage.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                <span>{actionMessage.text}</span>
              </div>
              <button
                onClick={() => setActionMessage(null)}
                className="text-xs font-semibold hover:underline"
              >
                Tutup
              </button>
            </div>
          )}

          {/* ── SEKSI 1: KESEHATAN SISTEM & SCHEDULER ─────────────────────── */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Zap size={18} className="text-amber-500" />
              Pemulihan Layanan & Heartbeat (Kendala Listrik Padam)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Web Server Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <Server size={18} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-slate-900">Web App (Next.js)</h3>
                      <p className="text-xs text-slate-400">Port {status?.webServer.port || '3090'}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 text-xs space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Uptime:</span>
                    <span className="font-medium text-slate-800">
                      {status ? formatUptime(status.webServer.uptimeSeconds) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Node.js:</span>
                    <span className="font-medium text-slate-800">{status?.webServer.nodeVersion || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">RAM Heap:</span>
                    <span className="font-medium text-slate-800">{status?.webServer.memoryHeapUsedMB || 0} MB</span>
                  </div>
                </div>
              </div>

              {/* Database PostgreSQL Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                      <Database size={18} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-slate-900">Database PostgreSQL</h3>
                      <p className="text-xs text-slate-400">{status?.database.databaseName || 'procedure_management'}</p>
                    </div>
                  </div>
                  {status?.database.status === 'connected' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Terhubung
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                      Terputus
                    </span>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-100 text-xs space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Host:</span>
                    <span className="font-medium text-slate-800">{status?.database.host || 'localhost'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Latency:</span>
                    <span className="font-medium text-slate-800">{status?.database.latencyMs || 0} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Prosedur:</span>
                    <span className="font-medium text-slate-800">{status?.database.totalProcedures || 0} dokumen</span>
                  </div>
                </div>
              </div>

              {/* Email Scheduler Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                      <Clock size={18} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-slate-900">Email Scheduler (Python)</h3>
                      <p className="text-xs text-slate-400">send_email.py (Tiap 2 mnt)</p>
                    </div>
                  </div>
                  {status?.emailScheduler.isOnline ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Online
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <AlertTriangle size={12} /> Belum Aktif
                    </span>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-100 text-xs space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Heartbeat Terakhir:</span>
                    <span className="font-medium text-slate-800">
                      {status?.emailScheduler.minutesSinceHeartbeat !== null && status?.emailScheduler.minutesSinceHeartbeat !== undefined
                        ? `${status.emailScheduler.minutesSinceHeartbeat} menit lalu`
                        : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Waktu Detak:</span>
                    <span className="font-medium text-slate-800 text-[11px]">
                      {formatDate(status?.emailScheduler.lastHeartbeat || null)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status Proses:</span>
                    <span className="font-medium text-slate-800">{status?.emailScheduler.status || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Petunjuk Pemulihan / Auto Start */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Terminal size={15} className="text-blue-600" />
                Informasi Pemulihan Otomatis Pasca Listrik Padam / Server Reboot:
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                <li>
                  <strong>Auto-Start Windows:</strong> Skrip <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800">scripts/setup-autostart-task.bat</code> telah disediakan untuk mendaftarkan sistem ke Windows Task Scheduler & folder Startup.
                </li>
                <li>
                  <strong>Toleransi Grace Period (Maintenance):</strong> Scheduler email memiliki toleransi susulan otomatis 1 hari. Jika listrik padam tepat di tanggal target kirim, email notifikasi akan otomatis terkirim segera setelah komputer menyala kembali.
                </li>
                <li>
                  <strong>Start Manual Darurat:</strong> Jika ingin menjalankan ulang secara manual dari terminal, klik 2x file <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800">scripts/start-server.bat</code>.
                </li>
              </ul>
            </div>
          </div>

          {/* ── SEKSI 2: BACKUP DATABASE POSTGRESQL ────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Database size={18} className="text-indigo-600" />
                  Manajemen Backup Database (PostgreSQL)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Backup otomatis terjadwal setiap hari pukul 00:00 (retensi 30 hari). Anda juga dapat melakukan backup langsung kapan saja.
                </p>
              </div>

              <button
                onClick={handleTriggerBackup}
                disabled={isBackingUp}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm active:scale-95 disabled:opacity-60 transition-all"
              >
                <HardDrive size={15} className={isBackingUp ? 'animate-spin' : ''} />
                {isBackingUp ? 'Memproses Backup...' : 'Backup Database Sekarang'}
              </button>
            </div>

            {/* Tabel Daftar File Backup */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs font-semibold text-slate-700">
                  Daftar Arsip Backup Tersimpan ({backups.length} file)
                </span>
                <span className="text-[11px] text-slate-400">
                  Lokasi: <code className="text-slate-600">web-app/backups/</code>
                </span>
              </div>

              {loadingBackups ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2" />
                  Memuat riwayat backup...
                </div>
              ) : backups.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <FileCode size={28} className="mx-auto mb-2 text-slate-300" />
                  Belum ada file backup di folder <code className="bg-slate-100 px-1 py-0.5 rounded">backups/</code>.
                  <br />
                  Klik tombol <strong>"Backup Database Sekarang"</strong> di atas untuk membuat cadangan pertama.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider text-[10px]">
                        <th className="px-4 py-3 font-semibold">Nama File Backup</th>
                        <th className="px-4 py-3 font-semibold">Ukuran File</th>
                        <th className="px-4 py-3 font-semibold">Waktu Dibuat</th>
                        <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {backups.map(file => (
                        <tr key={file.filename} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-mono font-medium text-slate-800 flex items-center gap-2">
                            <FileCode size={16} className="text-indigo-500 shrink-0" />
                            {file.filename}
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-medium">
                            {file.sizeFormatted}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {formatDate(file.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDownloadFile(file.filename)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                            >
                              <Download size={13} /> Unduh (.sql)
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Info Task Scheduler Backup */}
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-emerald-950">
                <ShieldCheck size={16} className="text-emerald-600" />
                Jadwal Backup Otomatis Harian (Windows Task Scheduler):
              </div>
              <p className="text-emerald-800">
                Untuk mengaktifkan backup otomatis harian tanpa perlu klik manual, jalankan file skrip{' '}
                <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-900 font-semibold">
                  scripts/setup-backup-task.bat
                </code>{' '}
                sebagai Administrator. Tugas <code className="font-mono">ReviewProsedur-DailyDBBackup</code> akan otomatis berjalan setiap pukul 00:00 tengah malam dan membersihkan backup yang sudah lebih tua dari 30 hari.
              </p>
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
