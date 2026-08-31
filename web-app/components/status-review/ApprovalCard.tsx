// components/status-review/ApprovalCard.tsx
'use client';

import { useEffect, useState } from 'react';
import { X, UserCheck, XCircle } from 'lucide-react';

interface Approver {
  id: number;
  grup: number;
  nama?: string;
  email: string;
}

interface RejectionInfo {
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
  prepared: 'bg-blue-50 text-blue-700',
  checked: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

const EMPTY_DATA: ApproverData = { prepared: [], checked: [], approved: [], rejection: null };

export default function ApprovalCard({
  isOpen,
  onClose,
  nomorDokumen,
  namaDokumen,
}: ApprovalCardProps) {
  const [data, setData] = useState<ApproverData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);

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
      .then((json: ApproverData) => {
        if (cancelled) return;
        setData({
          prepared: json.prepared ?? [],
          checked: json.checked ?? [],
          approved: json.approved ?? [],
          rejection: json.rejection ?? null,
        });
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* ── Header ── */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between">
          <div className="min-w-0 pr-3">
            <h3 className="text-sm font-bold text-slate-900">Approval Dokumen</h3>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1" title={namaDokumen}>
              {namaDokumen}
            </p>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{nomorDokumen}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all flex-shrink-0"
            title="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Memuat data approval...</p>
            </div>
          )}

          {!loading && errored && (
            <p className="text-xs text-red-500 text-center py-4">
              Gagal memuat data approval. Silakan coba lagi.
            </p>
          )}

          {!loading && !errored && data?.rejection && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3">
              <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-red-800">
                  Ditolak oleh {ROLE_LABEL[data.rejection.role]}
                </p>
                <p className="text-xs text-red-700 mt-0.5">
                  {data.rejection.nama ? `${data.rejection.nama} · ` : ''}{data.rejection.email}
                  {' — '}{formatDate(data.rejection.rejectedAt)}
                </p>
                <p className="text-xs text-red-700 mt-1.5 italic bg-white/60 border border-red-200 rounded-lg px-2.5 py-1.5">
                  &ldquo;{data.rejection.reason}&rdquo;
                </p>
              </div>
            </div>
          )}

          {!loading && !errored && data && (['prepared', 'checked', 'approved'] as const).map(role => (
            <div key={role}>
              <p className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mb-2 ${ROLE_COLOR[role]}`}>
                {ROLE_LABEL[role]} ({data[role].length})
              </p>
              {data[role].length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada data</p>
              ) : (
                <ul className="space-y-1.5">
                  {data[role].map(a => (
                    <li key={a.id} className="flex items-center gap-2 text-xs text-slate-700">
                      <UserCheck size={12} className="text-slate-400 flex-shrink-0" />
                      {a.nama && <span className="font-medium">{a.nama}</span>}
                      <span className={a.nama ? 'text-slate-400' : ''}>{a.email}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}