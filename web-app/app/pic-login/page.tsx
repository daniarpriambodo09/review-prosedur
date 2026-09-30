// app/pic-login/page.tsx

'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldCheck,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

export default function PICLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { picLogin, isAuthenticated, user } = useAuth();

  // Redirect if already authenticated as PIC
  useEffect(() => {
    if (isAuthenticated && user?.role === 'pic') {
      router.push('/pic-dashboard');
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await picLogin(email, password);

    if (result.success) {
      router.push('/pic-dashboard');
    } else {
      setError(result.error || 'Login gagal. Periksa kembali email dan password PIC Anda.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden font-sans">
      {/* Decorative Background Patterns & Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-100/80 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Container */}
      <div className="w-full max-w-4xl relative z-10">
        
        {/* Brand Header (Mobile & Top Branding) */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/80 shadow-sm text-xs font-semibold text-slate-700 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Portal Person In Charge (PIC)
          </div>
          <p className="text-xs text-slate-500 max-w-sm">
            Platform Pengajuan, Monitoring, & Revisi Prosedur Operasional
          </p>
        </div>

        {/* Dual-Card Modern White Container */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.08)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 transition-all">
          
          {/* Left Section: Login Form (Col 7) */}
          <div className="p-6 sm:p-8 lg:p-10 lg:col-span-7 flex flex-col justify-between order-2 lg:order-1">
            <div>
              {/* Yazaki Brand Logo on Form */}
              <div className="flex items-center justify-between mb-5">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs inline-block">
                  <Image
                    src="/review-prosedur/images/yazaki-logo.jpg"
                    alt="Yazaki Logo"
                    width={130}
                    height={34}
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="text-[11px] font-medium text-slate-400">
                  PIC Review System
                </div>
              </div>

              {/* Role Switcher Tabs */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl mb-6">
                <Link
                  href="/login-page"
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-all flex items-center justify-center gap-2 hover:bg-slate-200/60"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-500" />
                  <span>Admin / Reviewer</span>
                </Link>
                <button
                  type="button"
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 bg-white text-slate-900 shadow-sm border border-slate-200/60"
                >
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>PIC Portal</span>
                </button>
              </div>

              {/* Form Header */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100 text-[11px] font-semibold text-emerald-700 mb-2">
                  <User className="w-3.5 h-3.5" />
                  <span>Akses PIC Prosedur</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Portal Masuk PIC
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Gunakan email PIC terdaftar untuk mengunggah dan memantau status prosedur.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-50/90 border border-red-200 text-red-700 text-sm flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
                  <div className="text-xs leading-relaxed font-medium">{error}</div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email PIC
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all hover:border-slate-300"
                      placeholder="nama@yazaki.com"
                      required
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all hover:border-slate-300"
                      placeholder="Masukkan kata sandi PIC"
                      required
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                      tabIndex={-1}
                      aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Memverifikasi Akun PIC...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk ke Portal PIC</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Bottom Footer & Navigation */}
            <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Bukan PIC?{' '}
                <Link href="/login-page" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                  Login Admin / Reviewer →
                </Link>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Enkripsi 256-bit Aktif</span>
              </div>
            </div>
          </div>

          {/* Right Section: Pure Visual Image (Col 5) */}
          <div className="relative w-full min-h-[300px] sm:min-h-[360px] lg:min-h-full lg:col-span-5 order-1 lg:order-2 overflow-hidden bg-slate-100 border-b lg:border-b-0 lg:border-l border-slate-200/80">
            <Image
              src="/review-prosedur/images/sop-review-meeting.jpg"
              alt="SOP Procedure Review Session Meeting"
              fill
              className="object-cover object-center transition-transform duration-700 hover:scale-105"
              priority
            />
            {/* Subtle soft gradient edge for elegance */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent pointer-events-none" />
          </div>

        </div>

        {/* Global Footer Copyright */}
        <p className="text-center text-xs text-slate-400 mt-6 font-normal">
          &copy; {new Date().getFullYear()} Quality Management System. All rights reserved.
        </p>

      </div>
    </div>
  );
}
