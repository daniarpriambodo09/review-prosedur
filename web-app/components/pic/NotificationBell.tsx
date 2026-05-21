// app/components/pic/NotificationBell.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Notification {
  id:            number;
  type:          'document' | 'review' | 'request' | 'info';
  title:         string;
  description:   string;
  nomorDokumen?: string;   // badge monospace — dikirim backend, opsional untuk backward compat
  time:          string;   // relatif: "5 menit lalu"
  absoluteTime?: string;   // absolut: "07 Mei 2026 • 14:32"
  isRead:        boolean;
}

// ─── Visual config per title (grouping visual) ────────────────────────────────
// Menggunakan title sebagai key karena lebih spesifik dari type
// — dua notifikasi bisa sama type 'document' tapi beda kategori visual
const TITLE_CONFIG: Record<string, {
  iconBg:    string;
  iconColor: string;
  chipBg:    string;
  chipText:  string;
  accentBar: string;   // left border color saat unread
}> = {
  'Dokumen Baru Tersedia': {
    iconBg:    'bg-blue-100',
    iconColor: 'text-blue-600',
    chipBg:    'bg-blue-50',
    chipText:  'text-blue-700',
    accentBar: 'border-l-blue-400',
  },
  'Dokumen Telah Dikirim': {
    iconBg:    'bg-emerald-100',
    iconColor: 'text-emerald-600',
    chipBg:    'bg-emerald-50',
    chipText:  'text-emerald-700',
    accentBar: 'border-l-emerald-400',
  },
};

const DEFAULT_TITLE_CONFIG = {
  iconBg:    'bg-slate-100',
  iconColor: 'text-slate-500',
  chipBg:    'bg-slate-50',
  chipText:  'text-slate-600',
  accentBar: 'border-l-slate-300',
};

// ─── Icon paths per type ──────────────────────────────────────────────────────
const TYPE_ICON_PATH: Record<Notification['type'], string> = {
  document: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  review:   'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  request:  'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  info:     'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

function NotifIcon({ type, title }: { type: Notification['type']; title: string }) {
  const cfg = TITLE_CONFIG[title] ?? DEFAULT_TITLE_CONFIG;
  return (
    <div className={`flex-shrink-0 w-8 h-8 rounded-full ${cfg.iconBg} flex items-center justify-center`}>
      <svg className={`w-4 h-4 ${cfg.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={TYPE_ICON_PATH[type]} />
      </svg>
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function NotifSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 animate-pulse">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200" />
      <div className="flex-1 space-y-2 py-0.5">
        <div className="h-3 bg-slate-200 rounded w-3/4" />
        <div className="h-2.5 bg-slate-100 rounded w-full" />
        <div className="h-2 bg-slate-100 rounded w-1/3" />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function NotificationBell() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading,     setIsLoading]     = useState(false);
  const [fetchError,    setFetchError]    = useState(false);
  const [isOpen,        setIsOpen]        = useState(false);
  const [hasFetched,    setHasFetched]    = useState(false);

  // Set ID yang sedang dalam proses API (optimistic action sedang berlangsung)
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  const panelRef  = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // ── Header auth helper ────────────────────────────────────────────────────
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'x-pic-id':     String(user?.picId ?? user?.id ?? ''),
    'x-pic-email':  user?.email ?? '',
  });

  // ── Fetch notifikasi dari backend ─────────────────────────────────────────
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      setFetchError(false);
      const res = await fetch('/review-prosedur/api/pic/notifications', { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    } catch (err) {
      console.error('NotificationBell: gagal fetch', err);
      setFetchError(true);
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  };

  useEffect(() => {
    if (user && !hasFetched) fetchNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Tutup saat klik di luar
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current  && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Tutup saat Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  // ── Mark one as read ──────────────────────────────────────────────────────
  // Optimistic: update state dulu, lalu fire API di background.
  // Jika API gagal, rollback ke isRead semula.
  const markOneRead = async (id: number) => {
    const prev = notifications.find(n => n.id === id);
    if (!prev || prev.isRead) return;   // sudah dibaca, tidak perlu action

    // Optimistic update
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, isRead: true } : n));

    try {
      const res = await fetch('/review-prosedur/api/pic/notifications', {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify({ notificationId: id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error('markOneRead gagal, rollback', err);
      // Rollback
      setNotifications(ns => ns.map(n => n.id === id ? { ...n, isRead: false } : n));
    }
  };

  // ── Mark ALL as read ──────────────────────────────────────────────────────
  const markAllRead = async () => {
    const prevNotifs = notifications;

    // Optimistic update
    setNotifications(ns => ns.map(n => ({ ...n, isRead: true })));

    try {
      const res = await fetch('/review-prosedur/api/pic/notifications', {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify({ all: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error('markAllRead gagal, rollback', err);
      setNotifications(prevNotifs);
    }
  };

  // ── Delete one notification ───────────────────────────────────────────────
  // Backend otomatis delete id1 DAN id2 dari dokumen yang sama.
  // Frontend juga harus menghapus keduanya dari state agar konsisten.
  const deleteOne = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();

    const prevNotifs = notifications;

    // Derive baseId dan kedua sibling ID — sama dengan logika backend
    const baseId = Math.floor(id / 10);
    const id1    = baseId * 10 + 1;
    const id2    = baseId * 10 + 2;

    setPendingIds(prev => new Set(prev).add(id));

    // Optimistic: hapus KEDUA sibling dari state sekaligus
    setNotifications(ns => ns.filter(n => n.id !== id1 && n.id !== id2));

    try {
      const res = await fetch('/review-prosedur/api/pic/notifications', {
        method:  'DELETE',
        headers: authHeaders(),
        body:    JSON.stringify({ notificationId: id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error('deleteOne gagal, rollback', err);
      setNotifications(prevNotifs);
    } finally {
      setPendingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(prev => !prev)}
        className={`
          relative w-9 h-9 flex items-center justify-center rounded-lg
          border transition-all duration-150
          ${isOpen
            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'}
        `}
        aria-label="Notifikasi"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        {/* Badge merah */}
        {unreadCount > 0 && (
          <span className="
            absolute -top-1 -right-1
            min-w-[18px] h-[18px] px-1
            flex items-center justify-center
            bg-red-500 text-white text-[10px] font-bold
            rounded-full leading-none border-2 border-white
            pointer-events-none
          ">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="
            absolute right-0 top-[calc(100%+8px)] z-50
            w-80 bg-white rounded-xl shadow-xl
            border border-slate-200 overflow-hidden
          "
          style={{ animation: 'notifDrop 0.15s ease both' }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">Notifikasi</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                  {unreadCount} baru
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {fetchError && (
                <button
                  onClick={fetchNotifications}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  Coba lagi
                </button>
              )}
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 hover:underline transition-colors"
                >
                  Tandai semua dibaca
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>
            {isLoading && (
              <><NotifSkeleton /><NotifSkeleton /><NotifSkeleton /></>
            )}

            {!isLoading && fetchError && (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-slate-600 font-medium">Gagal memuat notifikasi</p>
                <button
                  onClick={fetchNotifications}
                  className="mt-2 text-xs text-emerald-600 font-semibold hover:underline"
                >
                  Coba lagi
                </button>
              </div>
            )}

            {!isLoading && !fetchError && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-sm text-slate-500 font-medium">Tidak ada notifikasi</p>
              </div>
            )}

            {!isLoading && !fetchError && notifications.map(notif => {
              const cfg = TITLE_CONFIG[notif.title] ?? DEFAULT_TITLE_CONFIG;
              return (
                <div
                  key={notif.id}
                  onClick={() => markOneRead(notif.id)}
                  className={`
                    group relative flex items-start gap-3 px-4 py-3 cursor-pointer
                    transition-colors duration-100
                    border-b border-slate-100 last:border-b-0
                    border-l-[3px]
                    ${notif.isRead
                      ? `border-l-transparent bg-white hover:bg-slate-50`
                      : `${cfg.accentBar} bg-slate-50/80 hover:bg-slate-100/60`}
                  `}
                >
                  <NotifIcon type={notif.type} title={notif.title} />

                  <div className="flex-1 min-w-0 pr-6">
                    {/* Baris 1: title + unread dot */}
                    <div className="flex items-center gap-1.5 mb-1">
                      {/* Category chip — visual grouping */}
                      <span className={`
                        inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase
                        ${cfg.chipBg} ${cfg.chipText}
                      `}>
                        {notif.title}
                      </span>
                      {!notif.isRead && (
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-400" />
                      )}
                    </div>

                    {/* Baris 2: nomor dokumen sebagai badge monospace */}
                    {notif.nomorDokumen && (
                      <div className="mb-1">
                        <span className="
                          inline-flex items-center gap-1
                          px-2 py-0.5 rounded
                          bg-slate-100 border border-slate-200
                          font-mono text-[11px] font-semibold text-slate-600
                          leading-none
                        ">
                          <svg className="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z" />
                          </svg>
                          {notif.nomorDokumen}
                        </span>
                      </div>
                    )}

                    {/* Baris 3: deskripsi */}
                    <p className={`text-xs leading-relaxed line-clamp-2 ${notif.isRead ? 'text-slate-400' : 'text-slate-600'}`}>
                      {notif.description}
                    </p>

                    {/* Baris 4: timestamp relatif + absolut */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <p className="text-[11px] text-slate-400 font-medium">{notif.time}</p>
                      {notif.absoluteTime && (
                        <>
                          <span className="text-slate-200 text-[10px]">·</span>
                          <p className="text-[11px] text-slate-300">{notif.absoluteTime}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Tombol X */}
                  <button
                    onClick={(e) => deleteOne(e, notif.id)}
                    disabled={pendingIds.has(notif.id)}
                    title="Hapus notifikasi"
                    className="
                      absolute top-3 right-3
                      w-5 h-5 flex items-center justify-center rounded
                      text-slate-300 hover:text-slate-600 hover:bg-slate-200
                      opacity-0 group-hover:opacity-100
                      transition-all duration-100
                      disabled:cursor-not-allowed
                    "
                  >
                    {pendingIds.has(notif.id) ? (
                      <svg className="animate-spin w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Panel footer */}
          {!isLoading && notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
              <p className="text-[11px] text-slate-400 text-center">
                {notifications.filter(n => n.isRead).length} dari {notifications.length} notifikasi telah dibaca
              </p>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes notifDrop {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  );
}