// app/verify/[code]/page.tsx
//
// Halaman publik (TANPA login) yang terbuka saat QR code di dokumen final
// discan. Read-only — hanya menampilkan info approval, tidak ada aksi apapun.

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface VerifyInfo {
  role: 'prepared' | 'checked' | 'approved';
  roleLabel: string;
  nama: string | null;
  email: string;
  accAt: string;
  nomorDokumen: string;
  namaDokumen: string;
}

const ROLE_COLOR: Record<string, string> = {
  prepared: 'bg-blue-50 text-blue-700 border-blue-200',
  checked:  'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

export default function VerifyPage() {
  const params = useParams<{ code: string }>();
  const code   = params?.code ?? '';

  const [info,  setInfo]  = useState<VerifyInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;

    fetch(`/review-prosedur/api/verify/${encodeURIComponent(code)}`)
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Kode verifikasi tidak ditemukan.');
        return data as VerifyInfo;
      })
      .then(data => { if (!cancelled) setInfo(data); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [code]);

  if (loading) {
    return (
      <Shell>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Memuat data verifikasi...</p>
        </div>
      </Shell>
    );
  }

  if (error || !info) {
    return (
      <Shell>
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-1.5">Verifikasi Gagal</h1>
          <p className="text-sm text-slate-500 leading-relaxed">{error || 'Data tidak ditemukan.'}</p>
        </div>
      </Shell>
    );
  }

  const roleColorCls = ROLE_COLOR[info.role] ?? ROLE_COLOR.prepared;

  return (
    <Shell>
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-emerald-700">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-emerald-100 text-xs font-medium">Verifikasi Berhasil</p>
          </div>
          <h1 className="text-white text-lg font-bold">Tanda Tangan Digital Sah</h1>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border mb-3 ${roleColorCls}`}>
              {info.roleLabel}
            </span>
            <h2 className="text-base font-bold text-slate-900 leading-snug">{info.namaDokumen}</h2>
            <p className="text-xs text-slate-500 font-mono mt-1">{info.nomorDokumen}</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200">
            <div className="px-4 py-3">
              <p className="text-xs text-slate-500 mb-0.5">Disetujui oleh</p>
              <p className="text-sm font-semibold text-slate-800">
                {info.nama ? `${info.nama} · ` : ''}{info.email}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-slate-500 mb-0.5">Tanggal & waktu approval</p>
              <p className="text-sm font-semibold text-slate-800">{formatDate(info.accAt)}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 text-center">
            Halaman ini menampilkan bukti persetujuan yang tercatat di sistem — bersifat read-only.
          </p>
        </div>
      </div>
    </Shell>
  );
}