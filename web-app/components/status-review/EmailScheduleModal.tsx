// components/status-review/EmailScheduleModal.tsx
'use client';
import { useState, useEffect, useMemo } from 'react';
import { ProcedureDocument } from '@/data/procedures/all-procedures';

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
}

interface EmailScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  procedures: ProcedureDocument[];
  emailSchedules: Record<string, EmailSchedule>;
}

export default function EmailScheduleModal({
  isOpen,
  onClose,
  procedures,
  emailSchedules,
}: EmailScheduleModalProps) {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDocs,  setSelectedDocs]  = useState<Set<string>>(new Set());
  const [sendDate,      setSendDate]      = useState('');
  const [sendTime,      setSendTime]      = useState('');
  const [isSaving,      setIsSaving]      = useState(false);

  useEffect(() => {
    if (isOpen) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setSendDate(defaultDate.toISOString().split('T')[0]);
      setSendTime('08:00');
    }
  }, [isOpen]);

  // Filter dokumen berdasarkan bulan yang dipilih.
  // Mencakup SEMUA bulan (termasuk bulan lama) sehingga admin bisa
  // mengirim ulang dokumen dari bulan manapun tanpa fitur tambahan.
  const filteredDocs = useMemo(() => {
    if (selectedMonth === '') return [];
    const selectedMonthIndex = parseInt(selectedMonth);
    return procedures.filter(doc => {
      const docDate = new Date(doc.tanggalSelesaiApproval);
      return !isNaN(docDate.getTime()) && docDate.getMonth() === selectedMonthIndex;
    });
  }, [selectedMonth, procedures]);

  const toggleDocSelection = (nomorDokumen: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(nomorDokumen)) {
      newSelected.delete(nomorDokumen);
    } else {
      newSelected.add(nomorDokumen);
    }
    setSelectedDocs(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedDocs.size === filteredDocs.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(filteredDocs.map(d => d.nomorDokumen)));
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
      alert('Mohon lengkapi semua data dengan benar');
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

      alert(`Jadwal email berhasil disimpan untuk ${selectedDocs.size} dokumen`);
      setSelectedDocs(new Set());
      setSelectedMonth('');
      onClose();
    } catch (error) {
      console.error('Error saving schedules:', error);
      alert('Gagal menyimpan jadwal email');
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
              onChange={(e) => { setSelectedMonth(e.target.value); setSelectedDocs(new Set()); }}
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
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-slate-700">
                  Pilih Dokumen
                  {filteredDocs.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      ({filteredDocs.length} dokumen)
                    </span>
                  )}
                </label>
                {filteredDocs.length > 0 && (
                  <button onClick={handleSelectAll}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    {selectedDocs.size === filteredDocs.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                  </button>
                )}
              </div>

              {filteredDocs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-lg">
                  Tidak ada dokumen untuk bulan yang dipilih
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-auto">
                  {filteredDocs.map((doc) => {
                    const schedule  = emailSchedules[doc.nomorDokumen];
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
                        <div className="flex items-start gap-3">
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
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} disabled={isSaving}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-all active:scale-95 disabled:opacity-50">
            Batal
          </button>
          <button onClick={handleSave} disabled={!isValid() || isSaving}
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
  );
}