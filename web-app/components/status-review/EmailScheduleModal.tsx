// components/status-review/EmailScheduleModal.tsx
'use client';
import { useState, useEffect, useMemo } from 'react';
import { ProcedureDocument, StatusType } from '@/data/procedures/all-procedures';
import { XCircle } from 'lucide-react';
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
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDocs,  setSelectedDocs]  = useState<Set<string>>(new Set());
  const [searchQuery,   setSearchQuery]   = useState('');
  const [sendDate,      setSendDate]      = useState('');
  const [sendTime,      setSendTime]      = useState('');
  const [isSaving,      setIsSaving]      = useState(false);

  // State lokal agar UI langsung update saat jadwal dibatalkan
  const [localProcedures, setLocalProcedures] = useState<ProcedureDocument[]>(procedures);
  const [localSchedules,  setLocalSchedules]  = useState<Record<string, EmailSchedule>>(emailSchedules);
  const [cancellingDoc,   setCancellingDoc]   = useState<string | null>(null);
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
      (doc.status && doc.status.toLowerCase().includes(q))
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

  // Dokumen terpilih yang sedang dalam status pending schedule
  const selectedPendingDocs = useMemo(() => {
    return Array.from(selectedDocs).filter(no => {
      const s = localSchedules[no];
      return s && s.emailStatus === 'pending';
    });
  }, [selectedDocs, localSchedules]);

  // Handler batalkan jadwal satu dokumen
  const handleCancelSingle = async (doc: ProcedureDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await showConfirm(
      `Apakah Anda yakin ingin membatalkan jadwal email untuk dokumen:\n"${doc.namaDokumen}" (${doc.nomorDokumen})?\n\nStatus dokumen akan dikembalikan ke status sebelumnya (Relevan/Revisi).`,
      'Batalkan Jadwal Email'
    );
    if (!confirmed) return;

    try {
      setCancellingDoc(doc.nomorDokumen);
      const res = await fetch(`/review-prosedur/api/email-schedules?nomorDokumen=${encodeURIComponent(doc.nomorDokumen)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membatalkan jadwal');

      const restored = data.restoredStatus || 'Relevan';

      setLocalSchedules(prev => ({
        ...prev,
        [doc.nomorDokumen]: {
          ...prev[doc.nomorDokumen],
          emailStatus: 'cancelled',
        },
      }));

      setLocalProcedures(prev => prev.map(d => d.nomorDokumen === doc.nomorDokumen ? { ...d, status: restored as StatusType } : d));

      setSelectedDocs(prev => {
        const next = new Set(prev);
        next.delete(doc.nomorDokumen);
        return next;
      });

      showSuccess(`Jadwal pengiriman email untuk "${doc.namaDokumen}" berhasil dibatalkan.\nStatus dokumen dikembalikan ke: ${restored}`);
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
    const confirmed = await showConfirm(
      `Apakah Anda yakin ingin membatalkan jadwal email untuk ${selectedPendingDocs.length} dokumen terpilih?\n\nStatus dokumen akan dikembalikan ke status sebelumnya (Relevan/Revisi).`,
      'Batalkan Jadwal Batch'
    );
    if (!confirmed) return;

    try {
      setIsCancellingBatch(true);
      const res = await fetch('/review-prosedur/api/email-schedules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomorDokumenList: selectedPendingDocs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membatalkan jadwal');

      const resultsMap = new Map<string, string>();
      if (Array.isArray(data.results)) {
        data.results.forEach((r: any) => resultsMap.set(r.nomorDokumen, r.restoredStatus));
      }

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

      setSelectedDocs(new Set());
      showSuccess(`Jadwal email berhasil dibatalkan untuk ${selectedPendingDocs.length} dokumen.`);
      onScheduleChange?.();
    } catch (err: any) {
      console.error('Error cancelling batch schedules:', err);
      showError('Gagal membatalkan jadwal: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCancellingBatch(false);
    }
  };

  const isValid = () => {
    if (!selectedMonth) return false;
    if (selectedDocs.size === 0) return false;
    if (!sendDate || !sendTime) return false;
    const todayDateOnly = new Date().toISOString().split('T')[0];
    return sendDate >= todayDateOnly;
  };

  const handleSave = async () => {
    if (!isValid()) {
      showWarning('Mohon lengkapi semua data dengan benar.');
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
            body: JSON.stringify({ nomorDokumen, scheduledEmailAt: scheduledDateTime }),
          })
        )
      );

      showSuccess(`Jadwal email berhasil disimpan untuk ${selectedDocs.size} dokumen`);
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
    'Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'
  ];

  const minDate = new Date().toISOString().split('T')[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-bold text-slate-900">Atur Jadwal Pengiriman Email</h3>
          </div>
          <button onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">

          {/* Pilih Bulan */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Pilih Bulan
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setSelectedDocs(new Set());
                setSearchQuery('');
              }}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">-- Pilih Bulan --</option>
              {monthOptions.map((name, index) => (
                <option key={index} value={String(index)}>{name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1.5">
              Pilih bulan sesuai <span className="font-medium">Tanggal Selesai Approval</span> dokumen.
              Untuk kirim ulang dokumen lama, pilih bulan approval dokumen tersebut.
            </p>
          </div>

          {/* Daftar Dokumen */}
          {selectedMonth !== '' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Pilih Dokumen
                  {monthDocs.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      ({searchQuery ? `${filteredDocs.length} dari ${monthDocs.length}` : `${monthDocs.length}`} dokumen)
                    </span>
                  )}
                </label>
                {filteredDocs.length > 0 && (
                  <button onClick={handleSelectAll}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold">
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
                    placeholder="Cari nomor dokumen, nama, PIC, status, owner..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {monthDocs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-lg">
                  Tidak ada dokumen untuk bulan yang dipilih
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <p className="font-medium text-slate-600">Tidak ada dokumen yang cocok dengan pencarian &quot;{searchQuery}&quot;</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-semibold underline"
                  >
                    Reset pencarian
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-auto">
                  {filteredDocs.map((doc) => {
                    const schedule  = localSchedules[doc.nomorDokumen];
                    const isSelected = selectedDocs.has(doc.nomorDokumen);

                    // Badge jadwal email
                    const scheduleBadge = schedule ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${
                        schedule.emailStatus === 'pending'   ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        schedule.emailStatus === 'sent'      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        schedule.emailStatus === 'cancelled' ? 'bg-slate-50 text-slate-500 border-slate-200' :
                                                               'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {schedule.emailStatus === 'pending'   ? '⏳' :
                         schedule.emailStatus === 'sent'      ? '✓'  :
                         schedule.emailStatus === 'cancelled' ? '⊘'  : '✗'}
                        {' '}{schedule.emailStatus.toUpperCase()}
                      </span>
                    ) : null;

                    // Badge status dokumen
                    const statusBadge = (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                        doc.status === 'Relevan'         ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        doc.status === 'Revisi'          ? 'bg-amber-50 text-amber-700 border-amber-200'       :
                        doc.status === 'Obsolete'        ? 'bg-red-50 text-red-700 border-red-200'             :
                        doc.status === 'Telah dibaca'    ? 'bg-purple-50 text-purple-700 border-purple-200'    :
                        doc.status === 'Telah terkirim'  ? 'bg-cyan-50 text-cyan-700 border-cyan-200'          :
                        doc.status === 'Belum dikirim'   ? 'bg-orange-50 text-orange-700 border-orange-200'    :
                                                           'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {doc.status}
                      </span>
                    );

                    return (
                      <div
                        key={doc.nomorDokumen}
                        onClick={() => toggleDocSelection(doc.nomorDokumen)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <input type="checkbox" checked={isSelected}
                              onChange={() => toggleDocSelection(doc.nomorDokumen)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <p className="font-semibold text-slate-900 truncate">{doc.namaDokumen}</p>
                                {statusBadge}
                                {scheduleBadge}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-slate-600">
                                <span className="font-mono">{doc.nomorDokumen}</span>
                                <span>PIC: {doc.pic}</span>
                                {doc.email && <span>{doc.email}</span>}
                              </div>
                              {schedule?.scheduledEmailAt && (
                                <div className="mt-1.5 text-xs text-slate-500">
                                  Terjadwal: {new Date(schedule.scheduledEmailAt).toLocaleString('id-ID')}
                                  {schedule.lastSentAt && (
                                    <span className="ml-2 text-emerald-600">
                                      · Terkirim: {new Date(schedule.lastSentAt).toLocaleString('id-ID')}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Tombol Cancel Jadwal jika status pending */}
                          {schedule && schedule.emailStatus === 'pending' && (
                            <button
                              type="button"
                              onClick={(e) => handleCancelSingle(doc, e)}
                              disabled={cancellingDoc === doc.nomorDokumen}
                              className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all active:scale-95 flex items-center gap-1.5 shrink-0 self-center disabled:opacity-50"
                              title="Batalkan jadwal pengiriman email dan kembalikan status dokumen"
                            >
                              <XCircle size={14} />
                              {cancellingDoc === doc.nomorDokumen ? 'Membatalkan...' : 'Batalkan Jadwal'}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tanggal Kirim</label>
                <input type="date" value={sendDate} min={minDate}
                  onChange={(e) => setSendDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Waktu Kirim</label>
                <input type="time" value={sendTime}
                  onChange={(e) => setSendTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          )}

          {selectedDocs.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">{selectedDocs.size}</span> dokumen dipilih
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
                className="px-3.5 py-2 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                title="Batalkan jadwal pengiriman untuk semua dokumen terpilih"
              >
                <XCircle size={14} />
                {isCancellingBatch
                  ? 'Membatalkan...'
                  : `Batalkan Jadwal Terpilih (${selectedPendingDocs.length})`}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} disabled={isSaving || isCancellingBatch}
              className="px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-all active:scale-95 disabled:opacity-50">
              Tutup
            </button>
            <button onClick={handleSave} disabled={!isValid() || isSaving || isCancellingBatch}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {isSaving && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isSaving ? 'Menyimpan...' : 'Simpan Jadwal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}