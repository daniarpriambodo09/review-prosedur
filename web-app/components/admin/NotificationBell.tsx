// components/admin/NotificationBell.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';

interface Notification {
  id:           number;
  type:         'new_document' | 'review_request';
  picId:        number;
  picFullName:  string;
  picEmail:     string;
  title:        string;
  nomorDokumen: string;
  namaDokumen:  string | null;
  description:  string | null;
  reason:       string | null;
  notes:        string | null;
  status:       string;
  isRead:       boolean;
  readAt:       string | null;
  createdAt:    string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'Baru saja';
  if (mins  < 60) return `${mins}m lalu`;
  if (hours < 24) return `${hours}j lalu`;
  return `${days}h lalu`;
}

function formatDatetime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const TYPE_CONFIG = {
  new_document: {
    label:    'Dokumen Baru',
    icon:     '📄',
    badgeCls: 'bg-blue-100 text-blue-700 border-blue-200',
    dotCls:   'bg-blue-500',
    headerBg: 'bg-blue-600',
  },
  review_request: {
    label:    'Minta Review',
    icon:     '🔍',
    badgeCls: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dotCls:   'bg-emerald-500',
    headerBg: 'bg-emerald-600',
  },
} as const;

const STATUS_CONFIG: Record<string, string> = {
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABEL: Record<string, string> = {
  pending:  '⏳ Menunggu',
  approved: '✓ Disetujui',
  rejected: '✗ Ditolak',
};

// ── Detail Modal via React Portal ─────────────────────────────────────────────
// ROOT CAUSE BUG 1:
// DetailModal sebelumnya di-render di dalam <div ref={dropdownRef}> yang merupakan
// ancestor dengan `position: relative`. Lebih parah lagi, AdminLayout menggunakan
// `transition-all` pada content wrapper — CSS `transform` / `transition` pada
// ancestor MEMATIKAN `position: fixed` sehingga modal tidak lagi relatif terhadap
// viewport, melainkan terhadap elemen ancestor tersebut. Hasilnya modal terpotong
// dan tidak center.
//
// FIX: Gunakan ReactDOM.createPortal untuk merender overlay langsung ke
// document.body, sepenuhnya keluar dari semua stacking context, transform,
// overflow, dan transition yang ada di layout.
function DetailModal({
  notif,
  onClose,
}: {
  notif:   Notification;
  onClose: () => void;
}) {
  const cfg   = TYPE_CONFIG[notif.type];
  const stCls = STATUS_CONFIG[notif.status] ?? STATUS_CONFIG['pending'];
  const stLbl = STATUS_LABEL[notif.status]  ?? notif.status;

  // Lock body scroll saat modal terbuka
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Tutup dengan Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  const modalContent = (
    // Overlay di-render langsung di document.body via portal.
    // Dengan ini, fixed positioning benar-benar relatif terhadap viewport —
    // tidak terpengaruh sidebar, collapse animation, maupun scroll page.
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex:          99999,  // di atas semua layer termasuk sidebar (z-40) dan dropdown (z-50)
        background:      'rgba(0,0,0,0.55)',
        backdropFilter:  'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        // Hentikan propagasi agar klik di dalam card tidak menutup modal
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-5 ${cfg.headerBg}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{cfg.icon}</span>
              <div>
                <p className="text-white/70 text-xs font-medium">Permintaan PIC</p>
                <h3 className="text-white font-bold text-base">
                  {notif.type === 'new_document' ? 'Request Dokumen Baru' : 'Request Review Dokumen'}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white transition-all flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${stCls}`}>
              {stLbl}
            </span>
            {!notif.isRead && (
              <span className="px-2 py-1 bg-white/20 text-white rounded-lg text-xs font-semibold">
                ● Belum dibaca
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[55vh] overflow-y-auto">
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Dari PIC</p>
            <p className="text-sm font-bold text-slate-900">{notif.picFullName}</p>
            <p className="text-xs text-slate-500">{notif.picEmail}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nomor Dokumen</p>
              <p className="text-sm font-mono font-semibold text-slate-900">{notif.nomorDokumen}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Waktu</p>
              <p className="text-sm text-slate-600">{timeAgo(notif.createdAt)}</p>
            </div>
          </div>

          {(notif.namaDokumen || notif.title) && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {notif.type === 'new_document' ? 'Judul Dokumen Diminta' : 'Nama Dokumen'}
              </p>
              <p className="text-sm font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                {notif.namaDokumen || notif.title}
              </p>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tanggal &amp; Waktu Lengkap</p>
            <p className="text-sm text-slate-600">{formatDatetime(notif.createdAt)}</p>
          </div>

          {notif.description && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Deskripsi</p>
              <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 leading-relaxed">
                {notif.description}
              </p>
            </div>
          )}

          {notif.reason && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Alasan Permintaan</p>
              <p className="text-sm text-slate-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed italic">
                &ldquo;{notif.reason}&rdquo;
              </p>
            </div>
          )}

          {notif.notes && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Catatan dari PIC</p>
              <p className="text-sm text-slate-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 leading-relaxed italic">
                &ldquo;{notif.notes}&rdquo;
              </p>
            </div>
          )}

          {notif.isRead && notif.readAt && (
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Dibaca pada {formatDatetime(notif.readAt)}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold transition-all active:scale-95"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );

  // Portal: render ke document.body, bebas dari semua ancestor stacking context
  return createPortal(modalContent, document.body);
}

// ── Komponen utama ─────────────────────────────────────────────────────────────
export default function NotificationBell() {
  const [notifications,    setNotifications]    = useState<Notification[]>([]);
  const [unreadCount,      setUnreadCount]      = useState(0);
  const [isOpen,           setIsOpen]           = useState(false);
  const [isMarking,        setIsMarking]        = useState(false);
  const [activeTab,        setActiveTab]        = useState<'all' | 'new_document' | 'review_request'>('all');
  const [selectedNotif,    setSelectedNotif]    = useState<Notification | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/review-prosedur/api/admin/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Mark satu ─────────────────────────────────────────────────────────────
  const markAsRead = async (notif: Notification) => {
    if (notif.isRead) return;
    try {
      await fetch('/review-prosedur/api/admin/notifications', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: notif.id, type: notif.type, readBy: 'admin' }),
      });
      setNotifications(prev =>
        prev.map(n => n.id === notif.id && n.type === notif.type ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  // ── Mark semua ────────────────────────────────────────────────────────────
  const markAllRead = async () => {
    if (unreadCount === 0 || isMarking) return;
    setIsMarking(true);
    try {
      await fetch('/review-prosedur/api/admin/notifications', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ markAllRead: true, readBy: 'admin' }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    } finally {
      setIsMarking(false);
    }
  };

  // ── Delete satu notifikasi (soft-delete) ──────────────────────────────────
  const deleteOne = async (notif: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = `${notif.type}-${notif.id}`;
    if (pendingDeleteIds.has(key)) return;

    const wasUnread = !notif.isRead;
    setNotifications(prev => prev.filter(n => !(n.id === notif.id && n.type === notif.type)));
    if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    setPendingDeleteIds(prev => new Set(prev).add(key));

    try {
      const res = await fetch('/review-prosedur/api/admin/notifications', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: notif.id, type: notif.type, adminId: 'admin' }),
      });
      if (!res.ok) {
        setNotifications(prev => {
          const exists = prev.some(n => n.id === notif.id && n.type === notif.type);
          if (exists) return prev;
          return [...prev, notif].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });
        if (wasUnread) setUnreadCount(prev => prev + 1);
      }
    } catch {
      setNotifications(prev => {
        const exists = prev.some(n => n.id === notif.id && n.type === notif.type);
        if (exists) return prev;
        return [...prev, notif].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      });
      if (wasUnread) setUnreadCount(prev => prev + 1);
    } finally {
      setPendingDeleteIds(prev => { const next = new Set(prev); next.delete(key); return next; });
    }
  };

  // ── Klik notif: mark read + buka modal ───────────────────────────────────
  const handleNotifClick = (notif: Notification) => {
    markAsRead(notif);
    setSelectedNotif(notif);
    setIsOpen(false);
  };

  const displayed    = activeTab === 'all' ? notifications : notifications.filter(n => n.type === activeTab);
  const unreadNew    = notifications.filter(n => !n.isRead && n.type === 'new_document').length;
  const unreadReview = notifications.filter(n => !n.isRead && n.type === 'review_request').length;

  return (
    <div ref={dropdownRef} className="relative">
      {/* ── Bell Button ── */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="relative p-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-all"
        title="Notifikasi"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown ── */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[420px] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">

          {/* Dropdown Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-slate-50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Notifikasi Permintaan PIC</h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-blue-600 font-medium mt-0.5">{unreadCount} belum dibaca</p>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={isMarking}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors disabled:opacity-50"
                >
                  {isMarking ? 'Memproses...' : 'Tandai semua dibaca'}
                </button>
              )}
            </div>

            {/* Tab filter */}
            <div className="flex gap-1 mt-3">
              {([
                { key: 'all',            label: 'Semua',        count: notifications.filter(n => !n.isRead).length },
                { key: 'new_document',   label: '📄 Dok. Baru', count: unreadNew    },
                { key: 'review_request', label: '🔍 Review',    count: unreadReview },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`min-w-[16px] h-4 rounded-full text-[10px] flex items-center justify-center px-1 ${
                      activeTab === tab.key ? 'bg-white/30 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[440px] overflow-y-auto divide-y divide-slate-100">
            {displayed.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell size={40} className="mx-auto mb-2 text-slate-300" />
                <p className="text-slate-500 text-sm font-medium">Tidak ada notifikasi</p>
              </div>
            ) : (
              displayed.map(notif => {
                const cfg        = TYPE_CONFIG[notif.type];
                const key        = `${notif.type}-${notif.id}`;
                const isDeleting = pendingDeleteIds.has(key);
                return (
                  <div
                    key={key}
                    onClick={() => handleNotifClick(notif)}
                    className={`relative px-4 py-3 transition-colors cursor-pointer group hover:bg-slate-50 ${
                      !notif.isRead ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    {/* Tombol hapus */}
                    <button
                      onClick={e => deleteOne(notif, e)}
                      disabled={isDeleting}
                      title="Hapus notifikasi"
                      className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full flex items-center justify-center
                                 opacity-0 group-hover:opacity-100 bg-slate-100 hover:bg-red-100
                                 text-slate-400 hover:text-red-500 transition-all duration-150 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? (
                        <svg className="w-3 h-3 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-2">
                        <span className={`block w-2 h-2 rounded-full ${!notif.isRead ? cfg.dotCls : 'bg-slate-200'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-sm font-semibold truncate ${!notif.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                            {notif.picFullName}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-xs text-slate-400">{timeAgo(notif.createdAt)}</span>
                            <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border mb-1.5 ${cfg.badgeCls}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                        <p className="text-sm text-slate-800 font-medium truncate">{notif.nomorDokumen}</p>
                        <p className="text-xs text-slate-500 truncate">{notif.title}</p>
                        {(notif.notes || notif.reason) && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2 italic">
                            &ldquo;{notif.notes || notif.reason}&rdquo;
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${STATUS_CONFIG[notif.status] ?? STATUS_CONFIG['pending']}`}>
                            {STATUS_LABEL[notif.status] ?? notif.status}
                          </span>
                          {!notif.isRead && <span className="text-[10px] text-blue-500 font-semibold">● Baru</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Dropdown Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200">
              <p className="text-xs text-slate-500 text-center">
                {notifications.filter(n => n.type === 'new_document').length} dok. baru
                &nbsp;·&nbsp;
                {notifications.filter(n => n.type === 'review_request').length} req. review
                &nbsp;·&nbsp;
                {unreadCount} belum dibaca
                &nbsp;·&nbsp;
                <span className="text-blue-500 font-medium">klik untuk detail</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Detail Modal — di-render via React Portal ke document.body ──
          Ini memutus sepenuhnya dari stacking context, overflow, dan
          CSS transform milik ancestor (sidebar transition, layout wrapper).
          Hasilnya: modal selalu center di viewport, tidak pernah terpotong.
      ── */}
      {selectedNotif !== null && (
        <DetailModal
          notif={selectedNotif}
          onClose={() => setSelectedNotif(null)}
        />
      )}
    </div>
  );
}