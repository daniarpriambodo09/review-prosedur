// app/email-schedules-settings/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  CalendarClock,
  Clock,
  Calendar,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  Mail,
  UserCheck,
  Building2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface SettingsData {
  picReminderMonthsBefore: number;
  picSendDayOfMonth: number;
  picSendHour: number;
  picSendMinute: number;
  managerReminderMonthsBefore: number;
  managerSendDayOfMonth: number;
  managerSendHour: number;
  managerSendMinute: number;
  autoRescheduleActive: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

interface StatsData {
  totalPending: number;
  earliestScheduled: string | null;
  manualPendingCount: number;
  autoPendingCount: number;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export default function EmailSchedulesSettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    picReminderMonthsBefore: 2,
    picSendDayOfMonth: 1,
    picSendHour: 8,
    picSendMinute: 0,
    managerReminderMonthsBefore: 1,
    managerSendDayOfMonth: 1,
    managerSendHour: 8,
    managerSendMinute: 0,
    autoRescheduleActive: true,
  });

  const [stats, setStats] = useState<StatsData>({
    totalPending: 0,
    earliestScheduled: null,
    manualPendingCount: 0,
    autoPendingCount: 0,
  });

  const [syncPending, setSyncPending] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ── Load Settings ───────────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/review-prosedur/api/email-schedule-settings');
      const data = await res.json();
      if (data.success) {
        if (data.settings) setSettings(data.settings);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Gagal mengambil pengaturan jadwal:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ── Save Settings ───────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setFeedback(null);

      const res = await fetch('/review-prosedur/api/email-schedule-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          syncPendingSchedules: syncPending,
          updatedBy: 'Admin',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan pengaturan jadwal');
      }

      setFeedback({
        type: 'success',
        message: data.message || 'Pengaturan jadwal berhasil disimpan!',
      });
      await loadSettings();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Terjadi kesalahan saat menyimpan.',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Live Simulation Calculation ─────────────────────────────────────────────
  // Contoh simulasi: Dokumen dengan target approval 15 Desember 2026
  const simulation = useMemo(() => {
    const simDeadline = new Date(2026, 11, 15); // 15 Des 2026
    const picDate = new Date(
      2026,
      11 - settings.picReminderMonthsBefore,
      Math.min(settings.picSendDayOfMonth, 28),
      settings.picSendHour,
      settings.picSendMinute,
      0
    );
    const mgrDate = new Date(
      2026,
      11 - settings.managerReminderMonthsBefore,
      Math.min(settings.managerSendDayOfMonth, 28),
      settings.managerSendHour,
      settings.managerSendMinute,
      0
    );

    const pad = (n: number) => String(n).padStart(2, '0');
    const formatSim = (d: Date) =>
      `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}, pukul ${pad(d.getHours())}:${pad(d.getMinutes())} WIB`;

    return {
      deadline: '15 Desember 2026',
      picSchedule: formatSim(picDate),
      mgrSchedule: formatSim(mgrDate),
    };
  }, [settings]);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-5xl mx-auto space-y-6">
          {/* ── Page Header ──────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <CalendarClock className="text-blue-600" size={24} />
                Pengaturan Jadwal Otomatis Email
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Atur tanggal dalam bulan, jam pengiriman, dan lead time reminder review dokumen secara fleksibel.
              </p>
            </div>

            <button
              onClick={loadSettings}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs active:scale-95 transition-all"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Segarkan
            </button>
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <div
              className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                <span>{feedback.message}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="text-xs font-semibold hover:underline">
                Tutup
              </button>
            </div>
          )}

          {/* ── Status Antrean Saat Ini ───────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-400">Total Antrean Email Pending</span>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stats.totalPending} dokumen</p>
              <span className="text-[11px] text-slate-500">
                {stats.autoPendingCount} otomatis · {stats.manualPendingCount} jadwal manual
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-400">Waktu Kirim Terdekat</span>
              <p className="text-sm font-bold text-blue-600 mt-2">
                {stats.earliestScheduled
                  ? new Date(stats.earliestScheduled).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }) + ' WIB'
                  : 'Tidak ada antrean'}
              </p>
              <span className="text-[11px] text-slate-500">Berdasarkan jadwal pending aktif</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-400">Status Terakhir Disimpan</span>
              <p className="text-sm font-semibold text-slate-700 mt-2">
                {settings.updatedAt
                  ? new Date(settings.updatedAt).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }) + ' WIB'
                  : 'Default Sistem'}
              </p>
              <span className="text-[11px] text-slate-500">Oleh: {settings.updatedBy || 'System'}</span>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ── CARD 1: PENGINGAT PIC (TAHAP 1) ──────────────────────── */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Jadwal Pengingat ke PIC</h2>
                    <p className="text-xs text-slate-500">Tahap 1: Pengiriman notifikasi email pertama ke PIC</p>
                  </div>
                </div>

                {/* Lead Time Bulan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Waktu Pengiriman (Lead Time Sebelum Target):
                  </label>
                  <select
                    value={settings.picReminderMonthsBefore}
                    onChange={e =>
                      setSettings(prev => ({ ...prev, picReminderMonthsBefore: parseInt(e.target.value) || 2 }))
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                  >
                    <option value={1}>1 Bulan sebelum target approval</option>
                    <option value={2}>2 Bulan sebelum target approval (Standar / Rekomendasi)</option>
                    <option value={3}>3 Bulan sebelum target approval</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Berapa bulan lebih awal PIC menerima email pengingat review sebelum tanggal target dokumen.
                  </p>
                </div>

                {/* Tanggal dalam Bulan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Pilihan Tanggal Pengiriman dalam Bulan:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={settings.picSendDayOfMonth}
                      onChange={e =>
                        setSettings(prev => ({ ...prev, picSendDayOfMonth: parseInt(e.target.value) || 1 }))
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>
                          Tanggal {d} {d === 1 ? '(Awal Bulan)' : d === 15 ? '(Pertengahan Bulan)' : ''}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3">
                      <span>Maksimal tgl 28 (aman untuk semua bulan)</span>
                    </div>
                  </div>
                </div>

                {/* Jam & Menit Pengiriman */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Jam Pengiriman Notifikasi (WIB):
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Clock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="time"
                        value={`${pad(settings.picSendHour)}:${pad(settings.picSendMinute)}`}
                        onChange={e => {
                          const val = e.target.value;
                          if (val) {
                            const [h, m] = val.split(':').map(Number);
                            setSettings(prev => ({
                              ...prev,
                              picSendHour: isNaN(h) ? 8 : h,
                              picSendMinute: isNaN(m) ? 0 : m,
                            }));
                          }
                        }}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">WIB</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Scheduler akan mengeksekusi pengiriman tepat pada atau setelah jam ini.
                  </p>
                </div>
              </div>

              {/* ── CARD 2: ESKALASI KE MANAGER (TAHAP 2) ────────────────── */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Jadwal Eskalasi ke Manager</h2>
                    <p className="text-xs text-slate-500">Tahap 2: Dikirim ke Manager bila PIC belum review</p>
                  </div>
                </div>

                {/* Lead Time Bulan Manager */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Waktu Pengiriman (Lead Time Sebelum Target):
                  </label>
                  <select
                    value={settings.managerReminderMonthsBefore}
                    onChange={e =>
                      setSettings(prev => ({ ...prev, managerReminderMonthsBefore: parseInt(e.target.value) || 1 }))
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
                  >
                    <option value={1}>1 Bulan sebelum target approval (Rekomendasi)</option>
                    <option value={2}>2 Bulan sebelum target approval</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Eskalasi hanya terkirim jika PIC belum memberikan status (Relevan/Revisi/Obsolete).
                  </p>
                </div>

                {/* Tanggal dalam Bulan Manager */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Pilihan Tanggal Pengiriman dalam Bulan:
                  </label>
                  <select
                    value={settings.managerSendDayOfMonth}
                    onChange={e =>
                      setSettings(prev => ({ ...prev, managerSendDayOfMonth: parseInt(e.target.value) || 1 }))
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>
                        Tanggal {d} {d === 1 ? '(Awal Bulan)' : d === 15 ? '(Pertengahan Bulan)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Jam & Menit Pengiriman Manager */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Jam Pengiriman Eskalasi (WIB):
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Clock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="time"
                        value={`${pad(settings.managerSendHour)}:${pad(settings.managerSendMinute)}`}
                        onChange={e => {
                          const val = e.target.value;
                          if (val) {
                            const [h, m] = val.split(':').map(Number);
                            setSettings(prev => ({
                              ...prev,
                              managerSendHour: isNaN(h) ? 8 : h,
                              managerSendMinute: isNaN(m) ? 0 : m,
                            }));
                          }
                        }}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                      />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">WIB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── CARD 3: SIMULASI LANGSUNG / PREVIEW ───────────────────────── */}
            <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-2xl p-6 text-white shadow-md space-y-4">
              <div className="flex items-center gap-2 text-blue-300 font-semibold text-sm">
                <Sparkles size={16} />
                Simulasi Alur Pengiriman Berdasarkan Pengaturan di Atas:
              </div>

              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-4 text-xs space-y-3 border border-white/10">
                <p className="text-slate-300 font-medium">
                  Contoh untuk Dokumen dengan Tanggal Target Approval:{' '}
                  <span className="text-white font-bold underline">{simulation.deadline}</span>
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10 space-y-1">
                    <span className="text-blue-200 text-[11px] font-semibold flex items-center gap-1.5">
                      <Mail size={13} /> 1. Pengingat Pertama ke PIC:
                    </span>
                    <p className="text-white font-semibold text-sm">{simulation.picSchedule}</p>
                    <p className="text-slate-400 text-[10px]">
                      ({settings.picReminderMonthsBefore} bulan sebelum deadline, tanggal {settings.picSendDayOfMonth})
                    </p>
                  </div>

                  <div className="bg-white/5 p-3 rounded-lg border border-white/10 space-y-1">
                    <span className="text-amber-200 text-[11px] font-semibold flex items-center gap-1.5">
                      <Building2 size={13} /> 2. Eskalasi ke Manager:
                    </span>
                    <p className="text-white font-semibold text-sm">{simulation.mgrSchedule}</p>
                    <p className="text-slate-400 text-[10px]">
                      ({settings.managerReminderMonthsBefore} bulan sebelum deadline, jika PIC belum review)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── CARD 4: OPSI SINKRONISASI JADWAL PENDING ───────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-start gap-3">
              <input
                type="checkbox"
                id="syncPendingCheck"
                checked={syncPending}
                onChange={e => setSyncPending(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="syncPendingCheck" className="text-xs text-slate-700 cursor-pointer select-none space-y-0.5">
                <span className="font-bold text-slate-900 block">
                  Terapkan perubahan tanggal & jam ini ke seluruh antrean jadwal otomatis yang sedang pending ({stats.autoPendingCount} dokumen)
                </span>
                <span className="text-slate-500 block">
                  Jika dicentang, seluruh dokumen yang sedang menunggu pengiriman (status Pending) akan langsung dihitung ulang tanggal dan jam pengirimannya sesuai aturan baru ini. Jadwal yang dibuat secara manual lewat "Atur Jadwal" tidak akan terpengaruh.
                </span>
              </label>
            </div>

            {/* ── TOMBOL SUBMIT ────────────────────────────────────────────── */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm active:scale-95 disabled:opacity-60 transition-all cursor-pointer"
              >
                <Save size={16} className={saving ? 'animate-spin' : ''} />
                {saving ? 'Menyimpan Pengaturan...' : 'Simpan Pengaturan Jadwal'}
              </button>
            </div>
          </form>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
