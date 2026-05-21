// app/pic-profile/page.tsx
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

// ── Helpers ───────────────────────────────────────────────────────────────────

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

type AlertKind = 'success' | 'error';

function Alert({ kind, message }: { kind: AlertKind; message: string }) {
  const styles = kind === 'success'
    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
    : 'bg-red-50 border-red-200 text-red-700';
  const icon = kind === 'success'
    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;

  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium ${styles}`}>
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {icon}
      </svg>
      {message}
    </div>
  );
}

const INPUT = `
  w-full pl-4 pr-10 py-2.5 text-sm rounded-lg border border-slate-200
  bg-slate-50 text-slate-800 placeholder:text-slate-400
  focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent
  transition-all duration-150
`;

// ── Main component ────────────────────────────────────────────────────────────

export default function PICProfilePage() {
  const { user, updateUser } = useAuth();

  const initials = (user?.fullName ?? 'PIC')
    .split(' ').slice(0, 2)
    .map((n: string) => n[0])
    .join('').toUpperCase();

  // Auth headers — konsisten dengan pattern dashboard
  const picHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-pic-id':    String(user?.picId ?? user?.id ?? ''),
    'x-pic-email': user?.email ?? '',
  }), [user]);

  // ── State: Edit Nama ──────────────────────────────────────────────────────
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue,     setNameValue]     = useState(user?.fullName ?? '');
  const [nameLoading,   setNameLoading]   = useState(false);
  const [nameAlert,     setNameAlert]     = useState<{ kind: AlertKind; msg: string } | null>(null);

  const handleSaveName = async () => {
    if (!nameValue.trim() || nameValue.trim() === user?.fullName) {
      setIsEditingName(false);
      return;
    }
    try {
      setNameLoading(true);
      setNameAlert(null);
      const res = await fetch('/review-prosedur/api/pic/profile/update-name', {
        method: 'PATCH',
        headers: picHeaders(),
        body: JSON.stringify({ fullName: nameValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui nama');

      updateUser?.({ fullName: data.fullName });
      setNameAlert({ kind: 'success', msg: data.message });
      setIsEditingName(false);
    } catch (err) {
      setNameAlert({ kind: 'error', msg: err instanceof Error ? err.message : 'Terjadi kesalahan' });
    } finally {
      setNameLoading(false);
    }
  };

  const handleCancelName = () => {
    setNameValue(user?.fullName ?? '');
    setIsEditingName(false);
    setNameAlert(null);
  };

  // ── State: Ganti Password ─────────────────────────────────────────────────
  const [pwOpen,          setPwOpen]          = useState(false);
  const [oldPassword,     setOldPassword]     = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld,         setShowOld]         = useState(false);
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [pwLoading,       setPwLoading]       = useState(false);
  const [pwAlert,         setPwAlert]         = useState<{ kind: AlertKind; msg: string } | null>(null);

  const pwTooShort = newPassword.length > 0 && newPassword.length < 8;
  const pwMismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const pwSubmitOk = !!oldPassword && newPassword.length >= 8 && newPassword === confirmPassword;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setPwLoading(true);
      setPwAlert(null);
      const res = await fetch('/review-prosedur/api/pic/profile/change-password', {
        method: 'POST',
        headers: picHeaders(),
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengganti password');

      setPwAlert({ kind: 'success', msg: data.message });
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      setPwOpen(false);
    } catch (err) {
      setPwAlert({ kind: 'error', msg: err instanceof Error ? err.message : 'Terjadi kesalahan' });
    } finally {
      setPwLoading(false);
    }
  };

  const togglePwOpen = () => {
    setPwOpen(v => !v);
    setPwAlert(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Mini header ───────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/pic-dashboard"
              title="Kembali ke dashboard"
              className="
                inline-flex items-center justify-center w-8 h-8 rounded-lg
                text-slate-500 hover:text-slate-700 hover:bg-slate-100
                transition-all duration-150
              "
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex-shrink-0">
                <Image
                    src="/review-prosedur/images/logo.png"
                    alt="Yazaki"
                    width={24}
                    height={24}
                    priority
                    className="object-contain"
                />
                </div>
              <span className="text-sm font-semibold text-slate-700">PIC Dashboard</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profil Saya</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola informasi akun dan keamanan Anda</p>
        </div>

        {/* ── Card: Informasi Akun ─────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Informasi Akun</h2>
          </div>

          <div className="px-6 py-6 space-y-5">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="
                flex-shrink-0 inline-flex items-center justify-center
                w-16 h-16 rounded-2xl
                bg-emerald-600 text-white text-xl font-bold
                ring-4 ring-emerald-100
              ">
                {initials}
              </div>

              <div className="flex-1 min-w-0 space-y-3">
                {/* Nama Lengkap — inline editable */}
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-1">Nama Lengkap</p>
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={nameValue}
                        onChange={e => setNameValue(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-emerald-300 bg-white
                          focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                        autoFocus
                        maxLength={200}
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={nameLoading || !nameValue.trim()}
                        className="
                          px-3 py-1.5 text-xs font-semibold rounded-lg
                          bg-emerald-600 text-white
                          hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed
                          transition-all duration-150
                        "
                      >
                        {nameLoading ? 'Menyimpan...' : 'Simpan'}
                      </button>
                      <button
                        onClick={handleCancelName}
                        disabled={nameLoading}
                        className="
                          px-3 py-1.5 text-xs font-semibold rounded-lg
                          bg-slate-100 text-slate-600
                          hover:bg-slate-200 disabled:opacity-50
                          transition-all duration-150
                        "
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {user?.fullName ?? '—'}
                      </span>
                      <button
                        onClick={() => { setIsEditingName(true); setNameAlert(null); setNameValue(user?.fullName ?? ''); }}
                        className="
                          opacity-0 group-hover:opacity-100 ml-1
                          inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium
                          rounded text-emerald-600 bg-emerald-50 border border-emerald-200
                          hover:bg-emerald-100 transition-all duration-150
                        "
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Email — read only */}
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-1">Email</p>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-slate-700 truncate">{user?.email ?? '—'}</span>
                  </div>
                </div>
              </div>

              {/* Role badge */}
              <div className="flex-shrink-0 hidden sm:block">
                <span className="
                  inline-flex items-center gap-1.5 px-3 py-1.5
                  bg-emerald-50 text-emerald-700 border border-emerald-200
                  rounded-lg text-xs font-semibold
                ">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Person In Charge
                </span>
              </div>
            </div>

            {/* Alert nama */}
            {nameAlert && <Alert kind={nameAlert.kind} message={nameAlert.msg} />}
          </div>
        </div>

        {/* ── Card: Ganti Password (collapsible) ──────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Toggle header */}
          <button
            type="button"
            onClick={togglePwOpen}
            className="
              w-full px-6 py-5 flex items-center justify-between
              hover:bg-slate-50 transition-colors duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400
            "
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Ganti Password</h2>
            </div>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${pwOpen ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Alert password — tampil di luar accordion agar tetap visible setelah collapse */}
          {pwAlert && (
            <div className="px-6 pb-4">
              <Alert kind={pwAlert.kind} message={pwAlert.msg} />
            </div>
          )}

          {/* Collapsible body */}
          {pwOpen && (
            <form
              onSubmit={handleChangePassword}
              className="px-6 pb-6 space-y-4 border-t border-slate-100 pt-5"
            >
              {/* Password Lama */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Password Lama
                </label>
                <div className="relative">
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    placeholder="Masukkan password lama"
                    className={INPUT}
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowOld(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    <EyeIcon open={showOld} />
                  </button>
                </div>
              </div>

              {/* Password Baru */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className={`${INPUT} ${pwTooShort ? '!border-amber-300 !bg-amber-50' : ''}`}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    <EyeIcon open={showNew} />
                  </button>
                </div>
                {pwTooShort && (
                  <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Password minimal 8 karakter
                  </p>
                )}
              </div>

              {/* Konfirmasi */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    className={`${INPUT} ${pwMismatch ? '!border-red-300 !bg-red-50' : ''}`}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
                {pwMismatch && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Password tidak cocok
                  </p>
                )}
              </div>

              {/* Submit */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-400">Gunakan minimal 8 karakter</p>
                <button
                  type="submit"
                  disabled={!pwSubmitOk || pwLoading}
                  className="
                    px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg
                    hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-150 flex items-center gap-2
                  "
                >
                  {pwLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Simpan Password
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Kembali ke dashboard */}
        <div className="flex justify-start pb-4">
          <Link
            href="/pic-dashboard"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors duration-150"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali ke Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}