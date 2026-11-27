// components/status-review/EmailScheduleModal.tsx
'use client';
import { useState, useEffect, useMemo } from 'react';
import { ProcedureDocument, StatusType } from '@/data/procedures/all-procedures';
import { XCircle, User, ShieldCheck, Mail, Building2, Calendar, Clock, AlertCircle } from 'lucide-react';
import { useDialog } from '@/contexts/DialogContext';

interface EmailSchedule {
  id: number;
  nomorDokumen: string;
  scheduledEmailAt: string;
  emailStatus: 'pending' | 'sent' | 'failed' | 'cancelled';
  lastSentAt?: string;
  retryCount: number;
  errorMessage?: string;
  namaDokumen?: string;
  pic?: string;
  email?: string;
  previousStatus?: string;
}

interface EmailScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  procedures: ProcedureDocument[];
  emailSchedules: Record<string, EmailSchedule>;
  onScheduleChange?: () => void;
}

export default function EmailScheduleModal({
  isOpen,
  onClose,
  procedures,
  emailSchedules,
  onScheduleChange,
}: EmailScheduleModalProps) {
  const { showConfirm, showSuccess, showError, showWarning } = useDialog();
  const [activeRoleTab, setActiveRoleTab] = useState<'pic' | 'manager'>('pic');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sendDate, setSendDate] = useState('');
  const [sendTime, setSendTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // State lokal agar UI langsung update saat jadwal dibatalkan
  const [localProcedures, setLocalProcedures] = useState<ProcedureDocument[]>(procedures);
  const [localSchedules, setLocalSchedules] = useState<Record<string, EmailSchedule>>(emailSchedules);
  const [cancellingDoc, setCancellingDoc] = useState<string | null>(null);
  const [isCancellingBatch, setIsCancellingBatch] = useState(false);

  useEffect(() => {
    setLocalProcedures(procedures);
  }, [procedures]);

  useEffect(() => {
    setLocalSchedules(emailSchedules);
  }, [emailSchedules]);

  useEffect(() => {
    if (isOpen) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setSendDate(defaultDate.toISOString().split('T')[0]);
      setSendTime('08:00');
      setSearchQuery('');
    }
  }, [isOpen]);

  const switchRoleTab = (tab: 'pic' | 'manager') => {
    if (tab === activeRoleTab) return;
    setActiveRoleTab(tab);
    setSelectedDocs(new Set());
    setSearchQuery('');
  };

  // Filter dokumen berdasarkan bulan yang dipilih.
  const monthDocs = useMemo(() => {
    if (selectedMonth === '') return [];
    const selectedMonthIndex = parseInt(selectedMonth);
    return localProcedures.filter(doc => {
      const docDate = new Date(doc.tanggalSelesaiApproval);
      return !isNaN(docDate.getTime()) && docDate.getMonth() === selectedMonthIndex;
    });
  }, [selectedMonth, localProcedures]);

  // Dokumen setelah filter pencarian
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return monthDocs;
    const q = searchQuery.toLowerCase().trim();
    return monthDocs.filter(doc =>
      (doc.namaDokumen && doc.namaDokumen.toLowerCase().includes(q)) ||
      (doc.nomorDokumen && doc.nomorDokumen.toLowerCase().includes(q)) ||
      (doc.pic && doc.pic.toLowerCase().includes(q)) ||
      (doc.email && doc.email.toLowerCase().includes(q)) ||
      (doc.owner && doc.owner.toLowerCase().includes(q)) ||
      (doc.status && doc.status.toLowerCase().includes(q)) ||
      (doc.managerName && doc.managerName.toLowerCase().includes(q)) ||
      (doc.managerEmail && doc.managerEmail.toLowerCase().includes(q)) ||
      (doc.picDepartmentNama && doc.picDepartmentNama.toLowerCase().includes(q))
    );
  }, [monthDocs, searchQuery]);

  const toggleDocSelection = (nomorDokumen: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(nomorDokumen)) {
      newSelected.delete(nomorDokumen);
    } else {
      newSelected.add(nomorDokumen);
    }
    setSelectedDocs(newSelected);
  };

  const isAllFilteredSelected = filteredDocs.length > 0 && filteredDocs.every(d => selectedDocs.has(d.nomorDokumen));

  const handleSelectAll = () => {
    const newSelected = new Set(selectedDocs);
    if (isAllFilteredSelected) {
      filteredDocs.forEach(d => newSelected.delete(d.nomorDokumen));
    } else {
      filteredDocs.forEach(d => newSelected.add(d.nomorDokumen));
    }
    setSelectedDocs(newSelected);
  };

  // Dokumen terpilih yang sedang dalam status pending schedule sesuai tab aktif
  const selectedPendingDocs = useMemo(() => {
    return Array.from(selectedDocs).filter(no => {
      if (activeRoleTab === 'pic') {
        const s = localSchedules[no];
        return s && s.emailStatus === 'pending';
      } else {
        const doc = localProcedures.find(d => d.nomorDokumen === no);
        return doc && doc.managerEmailStatus === 'pending';
      }
    });
  }, [selectedDocs, localSchedules, localProcedures, activeRoleTab]);

  // Handler batalkan jadwal satu dokumen
  const handleCancelSingle = async (doc: ProcedureDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    const roleLabel = activeRoleTab === 'manager' ? 'Manager (MGR)' : 'PIC';
    const confirmed = await showConfirm(
      `Apakah Anda yakin ingin membatalkan jadwal email ke ${roleLabel} untuk dokumen:\n"${doc.namaDokumen}" (${doc.nomorDokumen})?\n\nStatus dokumen akan disesuaikan kembali.`,
      `Batalkan Jadwal Email ${roleLabel}`
    );
    if (!confirmed) return;

    try {
      setCancellingDoc(doc.nomorDokumen);
      const res = await fetch(
        `/review-prosedur/api/email-schedules?nomorDokumen=${encodeURIComponent(doc.nomorDokumen)}&targetRole=${activeRoleTab}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nomorDokumen: doc.nomorDokumen,
            targetRole: activeRoleTab,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membatalkan jadwal');

      const restored = data.restoredStatus || 'Relevan';

      if (activeRoleTab === 'manager') {
        setLocalProcedures(prev => prev.map(d => {
          if (d.nomorDokumen === doc.nomorDokumen) {
            return {
              ...d,
              managerEmailStatus: 'cancelled',
              status: restored as StatusType,
            };
          }
          return d;
        }));
      } else {
        setLocalSchedules(prev => ({
          ...prev,
          [doc.nomorDokumen]: {
            ...prev[doc.nomorDokumen],
            emailStatus: 'cancelled',
          },
        }));
        setLocalProcedures(prev => prev.map(d => {
          if (d.nomorDokumen === doc.nomorDokumen) {
            return {
              ...d,
              status: restored as StatusType,
            };
          }
          return d;
        }));
      }

      setSelectedDocs(prev => {
        const next = new Set(prev);
        next.delete(doc.nomorDokumen);
        return next;
      });

      showSuccess(`Jadwal pengiriman email ke ${roleLabel} untuk "${doc.namaDokumen}" berhasil dibatalkan.\nStatus dokumen dikembalikan ke: ${restored}`);
      onScheduleChange?.();
    } catch (err: any) {
      console.error('Error cancelling schedule:', err);
      showError('Gagal membatalkan jadwal: ' + (err.message || 'Unknown error'));
    } finally {
      setCancellingDoc(null);
    }
  };

  // Handler batalkan jadwal batch (dokumen terpilih)
  const handleCancelBatch = async () => {
    if (selectedPendingDocs.length === 0) return;
    const roleLabel = activeRoleTab === 'manager' ? 'Manager (MGR)' : 'PIC';
    const confirmed = await showConfirm(
      `Apakah Anda yakin ingin membatalkan jadwal email ke ${roleLabel} untuk ${selectedPendingDocs.length} dokumen terpilih?\n\nStatus dokumen akan disesuaikan kembali.`,
      `Batalkan Jadwal ${roleLabel} Batch`
    );
    if (!confirmed) return;

    try {
      setIsCancellingBatch(true);
      const res = await fetch('/review-prosedur/api/email-schedules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomorDokumenList: selectedPendingDocs,
          targetRole: activeRoleTab,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membatalkan jadwal');

      const resultsMap = new Map<string, string>();
      if (Array.isArray(data.results)) {
        data.results.forEach((r: any) => resultsMap.set(r.nomorDokumen, r.restoredStatus));
      }

      if (activeRoleTab === 'manager') {
        setLocalProcedures(prev => prev.map(d => {
          if (selectedPendingDocs.includes(d.nomorDokumen)) {
            const restored = resultsMap.get(d.nomorDokumen) || d.status;
            return {
              ...d,
              managerEmailStatus: 'cancelled',
              status: restored as StatusType,
            };
          }
          return d;
        }));
      } else {
        setLocalSchedules(prev => {
          const next = { ...prev };
          selectedPendingDocs.forEach(no => {
            if (next[no]) next[no] = { ...next[no], emailStatus: 'cancelled' };
          });
          return next;
        });

        setLocalProcedures(prev => prev.map(d => {
          if (resultsMap.has(d.nomorDokumen)) {
            return { ...d, status: resultsMap.get(d.nomorDokumen)! as StatusType };
          }
          return d;
        }));
      }

      setSelectedDocs(new Set());
      showSuccess(`Jadwal email ke ${roleLabel} berhasil dibatalkan untuk ${selectedPendingDocs.length} dokumen.`);
      onScheduleChange?.();
    } catch (err: any) {
      console.error('Error cancelling batch schedules:', err);
      showError('Gagal membatalkan jadwal: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCancellingBatch(false);
    }
  };

  const getTodayDateStr = () => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  };

  const getWibCurrentTimeStr = () => {
    const d = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d);
    return parts;
  };

  const isTimePassedToday = (date: string, time: string) => {
    if (!date || !time) return false;
    const today = getTodayDateStr();
    if (date !== today) return false;
    const nowTime = getWibCurrentTimeStr();
    return time <= nowTime;
  };

  const getTimePreview = (t: string) => {
    if (!t || !t.includes(':')) return null;
    const [hStr, mStr] = t.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return null;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const h12Str = String(h12).padStart(2, '0');
    const mStrPad = String(m).padStart(2, '0');
    const time12 = `${h12Str}:${mStrPad} ${period}`;
    const desc = h >= 0 && h < 5 ? 'Dini Hari' : (h < 11 ? 'Pagi' : (h < 15 ? 'Siang' : (h < 18 ? 'Sore' : 'Malam')));
    const isEarlyMorning = h >= 0 && h < 6;
    return { time12, desc, isEarlyMorning, h };
  };

  const isValid = () => {
    if (!selectedMonth) return false;
    if (selectedDocs.size === 0) return false;
    if (!sendDate || !sendTime) return false;
    const todayDateOnly = getTodayDateStr();
    if (sendDate < todayDateOnly) return false;
    if (isTimePassedToday(sendDate, sendTime)) return false;
    return true;
  };

  const handleSave = async () => {
    if (!isValid()) {
      if (isTimePassedToday(sendDate, sendTime)) {
        showWarning('Waktu pengiriman untuk hari ini sudah terlewat. Harap gunakan format 24 jam (misal 14:50 untuk 2:50 PM).');
      } else {
        showWarning('Mohon lengkapi semua data dengan benar.');
      }
      return;
    }

    try {
      setIsSaving(true);
      const scheduledDateTime = `${sendDate}T${sendTime}:00`;

      await Promise.all(
        Array.from(selectedDocs).map(nomorDokumen =>
          fetch('/review-prosedur/api/email-schedules', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nomorDokumen,
              scheduledEmailAt: scheduledDateTime,
              targetRole: activeRoleTab,
            }),
          })
        )
      );

      const targetLabel = activeRoleTab === 'manager' ? 'Manager (MGR)' : 'PIC';
      showSuccess(`Jadwal email ke ${targetLabel} berhasil disimpan untuk ${selectedDocs.size} dokumen`);
      setSelectedDocs(new Set());
      setSelectedMonth('');
      onScheduleChange?.();
      onClose();
    } catch (error) {
      console.error('Error saving schedules:', error);
      showError('Gagal menyimpan jadwal email');
    } finally {
      setIsSaving(false);
    }
  };

  const monthOptions = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const minDate = new Date().toISOString().split('T')[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-100">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 via-indigo-50/50 to-blue-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">Atur Jadwal Pengiriman Email</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeRoleTab === 'pic'
                  ? 'Pengingat Tahap 1: Pengiriman email review ke PIC (Bulan Ke-1)'
                  : 'Pengingat Tahap 2: Eskalasi email review ke Manager Departemen PIC (Bulan Ke-2)'}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-200/60 rounded-xl cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Tab Switcher PIC vs MGR ── */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-slate-50/70 flex gap-2">
          <button
            type="button"
            onClick={() => switchRoleTab('pic')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 font-bold text-xs border-b-2 transition-all -mb-px cursor-pointer ${
              activeRoleTab === 'pic'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User size={15} className={activeRoleTab === 'pic' ? 'text-blue-600' : 'text-slate-400'} />
            <span>Kirim ke PIC (Bulan Ke-1)</span>
          </button>

          <button
            type="button"
            onClick={() => switchRoleTab('manager')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 font-bold text-xs border-b-2 transition-all -mb-px cursor-pointer ${
              activeRoleTab === 'manager'
                ? 'border-amber-600 text-amber-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck size={15} className={activeRoleTab === 'manager' ? 'text-amber-600' : 'text-slate-400'} />
            <span>Kirim ke MGR / Manager (Bulan Ke-2)</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-5">

          {/* Banner Penjelasan Sesuai Tab */}
          {activeRoleTab === 'pic' ? (
            <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2.5">
              <User size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-950">Mode: Pengingat Email ke PIC</p>
                <p className="text-blue-800/90 mt-0.5 leading-relaxed">
                  Jadwal ini akan mengirim email notifikasi review ke PIC dokumen terkait. Dokumen yang dijadwalkan akan berubah status menjadi <span className="font-semibold">Belum dikirim ke PIC</span> sampai waktu pengiriman tiba.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-950">Mode: Pengingat Eskalasi ke Manager (MGR)</p>
                <p className="text-amber-800/90 mt-0.5 leading-relaxed">
                  Fitur ini digunakan saat PIC belum memberikan respon/review di bulan ke-2, atau ketika admin ingin mengirim ulang email reminder kepada Manager dari departemen PIC. Dokumen akan berstatus <span className="font-semibold">Belum dikirim ke MGR (Nama Manager)</span> sampai waktu tiba.
                </p>
              </div>
            </div>
          )}

          {/* Pilih Bulan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Pilih Bulan Dokumen
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setSelectedDocs(new Set());
                setSearchQuery('');
              }}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
            >
              <option value="">-- Pilih Bulan Target Approval --</option>
              {monthOptions.map((name, index) => (
                <option key={index} value={String(index)}>{name}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Berdasarkan <span className="font-medium">Tanggal Selesai Approval</span> dokumen. Pilih bulan approval dokumen yang ingin dijadwalkan.
            </p>
          </div>

          {/* Daftar Dokumen */}
          {selectedMonth !== '' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Pilih Dokumen
                  {monthDocs.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-slate-500 lowercase tracking-normal">
                      ({searchQuery ? `${filteredDocs.length} dari ${monthDocs.length}` : `${monthDocs.length}`} dokumen)
                    </span>
                  )}
                </label>
                {filteredDocs.length > 0 && (
                  <button onClick={handleSelectAll}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer">
                    {isAllFilteredSelected ? 'Batal Pilih Semua' : (searchQuery ? `Pilih Semua (${filteredDocs.length})` : 'Pilih Semua')}
                  </button>
                )}
              </div>

              {/* 🔍 Input Pencarian Dokumen */}
              {monthDocs.length > 0 && (
                <div className="relative mb-3">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nomor dokumen, nama, PIC, Manager, departemen..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {monthDocs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Tidak ada dokumen untuk bulan yang dipilih
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="font-medium text-slate-600">Tidak ada dokumen yang cocok dengan pencarian &quot;{searchQuery}&quot;</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-semibold underline cursor-pointer"
                  >
                    Reset pencarian
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-auto pr-1">
                  {filteredDocs.map((doc) => {
                    const schedule = localSchedules[doc.nomorDokumen];
                    const isSelected = selectedDocs.has(doc.nomorDokumen);

                    // Badge status jadwal PIC
                    const picScheduleBadge = schedule ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        schedule.emailStatus === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        schedule.emailStatus === 'sent' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        schedule.emailStatus === 'cancelled' ? 'bg-slate-50 text-slate-500 border-slate-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {schedule.emailStatus === 'pending' ? '⏳ PENDING PIC' :
                         schedule.emailStatus === 'sent' ? '✓ TERKIRIM PIC' :
                         schedule.emailStatus === 'cancelled' ? '⊘ PIC DIBATALKAN' : '✗ GAGAL PIC'}
                      </span>
                    ) : null;

                    // Badge status jadwal Manager
                    const isMgrPending = doc.managerEmailStatus === 'pending';
                    const isMgrSent = doc.managerEmailStatus === 'sent' || !!doc.managerEmailSentAt;
                    const mgrScheduleBadge = (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        isMgrPending ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        isMgrSent ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        doc.managerEmailStatus === 'cancelled' ? 'bg-slate-50 text-slate-500 border-slate-200' :
                        doc.managerEmailScheduledAt ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {isMgrPending ? '⏳ PENDING MGR' :
                         isMgrSent ? '✓ TERKIRIM MGR' :
                         doc.managerEmailStatus === 'cancelled' ? '⊘ MGR DIBATALKAN' :
                         doc.managerEmailScheduledAt ? '📅 TERJADWAL MGR' : 'BELUM DIJADWALKAN'}
                      </span>
                    );

                    // Badge status dokumen
                    const statusBadge = (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        doc.status === 'Relevan' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        doc.status === 'Revisi' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        doc.status === 'Obsolete' ? 'bg-red-50 text-red-700 border-red-200' :
                        doc.status === 'Menunggu' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        doc.status === 'Telah dibaca' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        (doc.status === 'Telah terkirim' || doc.status === 'Telah terkirim ke PIC') ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                        (doc.status === 'Belum dikirim' || doc.status === 'Belum dikirim ke PIC') ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        doc.status.startsWith('Telah terkirim ke MGR') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        doc.status.startsWith('Belum dikirim ke MGR') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {doc.status}
                      </span>
                    );

                    const canCancelThisDoc = activeRoleTab === 'pic'
                      ? schedule && schedule.emailStatus === 'pending'
                      : doc.managerEmailStatus === 'pending';

                    return (
                      <div
                        key={doc.nomorDokumen}
                        onClick={() => toggleDocSelection(doc.nomorDokumen)}
                        className={`p-3.5 border rounded-xl cursor-pointer transition-all ${isSelected
                            ? activeRoleTab === 'manager'
                              ? 'border-amber-500 bg-amber-50/60 shadow-2xs'
                              : 'border-blue-500 bg-blue-50/60 shadow-2xs'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <input type="checkbox" checked={isSelected}
                              onChange={() => toggleDocSelection(doc.nomorDokumen)}
                              onClick={(e) => e.stopPropagation()}
                              className={`mt-1 w-4 h-4 rounded ${
                                activeRoleTab === 'manager'
                                  ? 'text-amber-600 border-slate-300 focus:ring-amber-500'
                                  : 'text-blue-600 border-slate-300 focus:ring-blue-500'
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <p className="font-bold text-xs text-slate-900 truncate">{doc.namaDokumen}</p>
                                {statusBadge}
                                {activeRoleTab === 'pic' ? picScheduleBadge : mgrScheduleBadge}
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                                <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                  {doc.nomorDokumen}
                                </span>
                                <span>•</span>
                                <span>PIC: <strong className="text-slate-700">{doc.pic}</strong></span>
                                {doc.email && <span className="text-slate-400">({doc.email})</span>}
                              </div>

                              {/* Info Manager & Departemen */}
                              <div className="mt-1.5 pt-1.5 border-t border-slate-100/80 flex items-center gap-2 text-[11px] flex-wrap">
                                <div className="inline-flex items-center gap-1 text-slate-600">
                                  <ShieldCheck size={12} className={activeRoleTab === 'manager' ? 'text-amber-600' : 'text-slate-400'} />
                                  <span className="text-slate-400">Manager:</span>
                                  <span className="font-semibold text-slate-800">
                                    {doc.managerName || 'Belum Terdaftar'}
                                  </span>
                                </div>
                                {doc.picDepartmentNama && (
                                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                    Dept: {doc.picDepartmentNama}
                                  </span>
                                )}
                                {doc.managerEmail && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {doc.managerEmail}
                                  </span>
                                )}
                              </div>

                              {/* Tanggal Terjadwal Sesuai Tab */}
                              {activeRoleTab === 'pic' && schedule?.scheduledEmailAt && (
                                <div className="mt-1 text-[11px] text-slate-500">
                                  Jadwal PIC: {new Date(schedule.scheduledEmailAt).toLocaleString('id-ID')}
                                  {schedule.lastSentAt && (
                                    <span className="ml-2 text-emerald-600 font-medium">
                                      · Terkirim: {new Date(schedule.lastSentAt).toLocaleString('id-ID')}
                                    </span>
                                  )}
                                </div>
                              )}

                              {activeRoleTab === 'manager' && doc.managerEmailScheduledAt && (
                                <div className="mt-1 text-[11px] text-amber-700">
                                  Jadwal MGR: {new Date(doc.managerEmailScheduledAt).toLocaleString('id-ID')}
                                  {doc.managerEmailSentAt && (
                                    <span className="ml-2 text-emerald-600 font-medium">
                                      · Terkirim: {new Date(doc.managerEmailSentAt).toLocaleString('id-ID')}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Tombol Cancel Jadwal jika status pending */}
                          {canCancelThisDoc && (
                            <button
                              type="button"
                              onClick={(e) => handleCancelSingle(doc, e)}
                              disabled={cancellingDoc === doc.nomorDokumen}
                              className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all active:scale-95 flex items-center gap-1.5 shrink-0 self-center disabled:opacity-50 cursor-pointer"
                              title={`Batalkan jadwal email ke ${activeRoleTab === 'manager' ? 'MGR' : 'PIC'}`}
                            >
                              <XCircle size={13} />
                              {cancellingDoc === doc.nomorDokumen ? 'Membatalkan...' : 'Batalkan'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tanggal & Waktu */}
          {selectedDocs.size > 0 && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tanggal Kirim ({activeRoleTab === 'manager' ? 'MGR' : 'PIC'})
                </label>
                <input type="date" value={sendDate} min={minDate}
                  onChange={(e) => setSendDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Waktu Kirim</span>
                  <span className="text-[10px] font-normal text-slate-500 lowercase tracking-normal">Format 24 Jam (WIB)</span>
                </label>
                <input type="time" value={sendTime}
                  onChange={(e) => setSendTime(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 transition-all bg-white ${isTimePassedToday(sendDate, sendTime)
                      ? 'border-red-400 focus:ring-red-400 bg-red-50/30'
                      : 'border-slate-300 focus:ring-blue-500 focus:border-transparent'
                    }`}
                />
                {sendTime && (() => {
                  const preview = getTimePreview(sendTime);
                  const isPast = isTimePassedToday(sendDate, sendTime);
                  if (!preview) return null;
                  return (
                    <div className="mt-1.5 flex flex-col gap-0.5">
                      <div className={`text-xs flex items-center gap-1 font-medium ${isPast ? 'text-red-600' : 'text-blue-700'}`}>
                        <span>🕒 Jadwal: <strong>{sendTime} WIB</strong> ({preview.time12} - {preview.desc})</span>
                      </div>
                      {isPast && (
                        <span className="text-[11px] text-red-600 font-semibold">
                          ⚠️ Jam {sendTime} sudah lewat untuk hari ini! Silakan pilih jam beberapa menit ke depan.
                        </span>
                      )}
                      {!isPast && preview.isEarlyMorning && (
                        <span className="text-[11px] text-amber-600">
                          💡 Catatan: Jam {sendTime} adalah jam {preview.h} subuh. Jika maksud Anda jam 2 siang, gunakan <strong>14:50</strong>.
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {selectedDocs.size > 0 && (
            <div className={`border rounded-xl px-4 py-3 flex items-center justify-between ${
              activeRoleTab === 'manager'
                ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                : 'bg-blue-50/80 border-blue-200 text-blue-900'
            }`}>
              <p className="text-xs font-medium">
                <span className="font-bold text-sm">{selectedDocs.size}</span> dokumen dipilih untuk dijadwalkan ke <span className="font-bold uppercase">{activeRoleTab === 'manager' ? 'Manager (MGR)' : 'PIC'}</span>.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
          <div>
            {selectedPendingDocs.length > 0 && (
              <button
                type="button"
                onClick={handleCancelBatch}
                disabled={isCancellingBatch || isSaving}
                className="px-3.5 py-2 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                title={`Batalkan jadwal pengiriman email ke ${activeRoleTab === 'manager' ? 'MGR' : 'PIC'} untuk semua dokumen terpilih`}
              >
                <XCircle size={14} />
                {isCancellingBatch
                  ? 'Membatalkan...'
                  : `Batalkan Jadwal ${activeRoleTab === 'manager' ? 'MGR' : 'PIC'} Terpilih (${selectedPendingDocs.length})`}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} disabled={isSaving || isCancellingBatch}
              className="px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer">
              Tutup
            </button>
            <button onClick={handleSave} disabled={!isValid() || isSaving || isCancellingBatch}
              className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl transition-all hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer ${
                activeRoleTab === 'manager'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}>
              {isSaving && (
                <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isSaving ? 'Menyimpan...' : `Simpan Jadwal (${activeRoleTab === 'manager' ? 'MGR' : 'PIC'})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
