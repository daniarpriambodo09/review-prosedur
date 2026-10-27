// components/status-review/ApprovalCard.tsx
'use client';

import { useEffect, useState } from 'react';
import { X, UserCheck, XCircle, AlertCircle, History, Clock, ShieldAlert, Users } from 'lucide-react';

interface Approver {
  id: number;
  grup: number;
  nama?: string;
  email: string;
}

interface RejectionInfo {
  id?: number;
  cycleId?: number;
  role: 'prepared' | 'checked' | 'approved';
  nama: string | null;
  email: string;
  reason: string;
  rejectedAt: string;
}

interface ApproverData {
  prepared: Approver[];
  checked: Approver[];
  approved: Approver[];
  rejection: RejectionInfo | null;
  rejectionHistory: RejectionInfo[];
}

interface ApprovalCardProps {
  isOpen: boolean;
  onClose: () => void;
  nomorDokumen: string;
  namaDokumen: string;
}

const ROLE_LABEL: Record<string, string> = {
  prepared: 'Prepared',
  checked: 'Checked',
  approved: 'Approved',
};

const ROLE_COLOR: Record<string, string> = {
  prepared: 'bg-blue-50 text-blue-700 border-blue-200',
  checked: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-purple-50 text-purple-700 border-purple-200',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

const EMPTY_DATA: ApproverData = { prepared: [], checked: [], approved: [], rejection: null, rejectionHistory: [] };

export default function ApprovalCard({
  isOpen,
  onClose,
  nomorDokumen,
  namaDokumen,
}: ApprovalCardProps) {
  const [data, setData] = useState<ApproverData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);
  const [activeTab, setActiveTab] = useState<'approvers' | 'rejections'>('approvers');

  // ── Fetch data approver saat kartu dibuka ──────────────────────────────────
  useEffect(() => {
    if (!isOpen || !nomorDokumen) return;
    let cancelled = false;

    setLoading(true);
    setErrored(false);
    setData(null);

    fetch(`/review-prosedur/api/procedures/${encodeURIComponent(nomorDokumen)}/approvers`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: any) => {
        if (cancelled) return;
        const rejections: RejectionInfo[] = json.rejectionHistory ?? (json.rejection ? [json.rejection] : []);
        setData({
          prepared: json.prepared ?? [],
          checked: json.checked ?? [],
          approved: json.approved ?? [],
          rejection: json.rejection ?? (rejections[0] || null),
          rejectionHistory: rejections,
        });
        // Jika ada riwayat penolakan, bisa langsung sorot tab penolakan
        if (rejections.length > 0 && json.rejection) {
          setActiveTab('rejections');
        } else {
          setActiveTab('approvers');
        }
      })
      .catch(err => {
        console.error('ApprovalCard: gagal memuat data approver', err);
        if (!cancelled) {
          setData(EMPTY_DATA);
          setErrored(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, nomorDokumen]);

  // ── Tutup dengan Escape ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const rejectionCount = data?.rejectionHistory?.length ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* ── Header ── */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Approval Prosedur
                </span>
                {rejectionCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                    <ShieldAlert size={11} />
                    {rejectionCount} Riwayat Penolakan
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-1" title={namaDokumen}>
                {namaDokumen}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{nomorDokumen}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all flex-shrink-0 cursor-pointer"
              title="Tutup"
            >
              <X size={18} />
            </button>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="flex items-center bg-slate-200/70 p-1 rounded-xl mt-4">
            <button
              type="button"
              onClick={() => setActiveTab('approvers')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'approvers'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users size={14} className={activeTab === 'approvers' ? 'text-indigo-600' : 'text-slate-400'} />
              <span>Pejabat Approver</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rejections')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'rejections'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History size={14} className={activeTab === 'rejections' ? 'text-rose-600' : 'text-slate-400'} />
              <span>Riwayat Penolakan</span>
              {rejectionCount > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  activeTab === 'rejections' ? 'bg-rose-100 text-rose-700' : 'bg-slate-300 text-slate-700'
                }`}>
                  {rejectionCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {loading && (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mx-auto mb-3" />
              <p className="text-xs font-medium text-slate-500">Memuat data approval & riwayat...</p>
            </div>
          )}

          {!loading && errored && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center">
              <AlertCircle size={24} className="text-rose-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-rose-800">Gagal memuat data approval</p>
              <p className="text-[11px] text-rose-600 mt-1">Silakan tutup dan buka kembali jendela ini.</p>
            </div>
          )}

          {/* TAB 1: PEJABAT APPROVER */}
          {!loading && !errored && data && activeTab === 'approvers' && (
            <div className="space-y-4">
              {rejectionCount > 0 && (
                <div
                  onClick={() => setActiveTab('rejections')}
                  className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 flex items-center justify-between gap-3 cursor-pointer hover:bg-rose-100/70 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <XCircle size={16} className="text-rose-600 flex-shrink-0" />
                    <p className="text-xs text-rose-800 font-medium truncate">
                      Dokumen memiliki <strong>{rejectionCount} catatan penolakan</strong> dari approver.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-rose-700 whitespace-nowrap hover:underline">
                    Lihat Alasan &rarr;
                  </span>
                </div>
              )}

              {(['prepared', 'checked', 'approved'] as const).map(role => (
                <div key={role} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${ROLE_COLOR[role]}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {ROLE_LABEL[role]}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {data[role].length} approver
                    </span>
                  </div>

                  {data[role].length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-1">Belum ada approver yang ditugaskan</p>
                  ) : (
                    <ul className="space-y-2">
                      {data[role].map((a, idx) => (
                        <li key={a.id || idx} className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                            {a.nama ? a.nama.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800 leading-tight">
                              {a.nama || 'Pejabat Approver'}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">{a.email}</p>
                          </div>
                          <UserCheck size={14} className="text-emerald-500 flex-shrink-0" />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: RIWAYAT KETERANGAN PENOLAKAN */}
          {!loading && !errored && data && activeTab === 'rejections' && (
            <div className="space-y-3.5">
              {rejectionCount === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <UserCheck size={24} />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 mb-1">Tidak Ada Riwayat Penolakan</h4>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Dokumen ini belum pernah mendapatkan penolakan pada tahap Prepared, Checked, maupun Approved.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span>Menampilkan <strong>{rejectionCount}</strong> riwayat penolakan sebelumnya</span>
                    <span className="text-[10px] text-slate-400">Urut dari terbaru</span>
                  </div>

                  {data.rejectionHistory.map((item, index) => {
                    const isLatest = index === 0;
                    return (
                      <div
                        key={item.id || index}
                        className={`p-4 rounded-2xl border transition-all ${
                          isLatest
                            ? 'bg-rose-50/90 border-rose-300 shadow-xs'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${ROLE_COLOR[item.role] || 'bg-slate-100 text-slate-700'}`}>
                              Tahap: {ROLE_LABEL[item.role] || item.role}
                            </span>
                            {isLatest && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                                Penolakan Terbaru
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                            <Clock size={11} />
                            {formatDate(item.rejectedAt)}
                          </span>
                        </div>

                        <div className="mb-2.5 text-xs text-slate-700">
                          <span className="text-slate-400">Ditolak oleh: </span>
                          <strong className="text-slate-800">{item.nama || item.email}</strong>
                          {item.nama && <span className="text-slate-400"> ({item.email})</span>}
                        </div>

                        <div className="bg-white rounded-xl p-3 border border-rose-200/80 shadow-2xs">
                          <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wide mb-1 flex items-center gap-1">
                            <XCircle size={12} className="text-rose-600" />
                            Keterangan / Alasan Penolakan:
                          </p>
                          <p className="text-xs text-slate-800 leading-relaxed italic">
                            &ldquo;{item.reason}&rdquo;
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            {rejectionCount > 0 ? `${rejectionCount} penolakan tercatat` : 'Semua approver aktif'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}