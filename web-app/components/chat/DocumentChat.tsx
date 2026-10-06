// components/chat/DocumentChat.tsx
//
// Chat real-time antara admin dan para approver (Prepared/Checked/Approved)
// untuk SATU nomor dokumen. Riwayat percakapan menempel ke nomor dokumen —
// bukan ke tahap atau siklus — jadi orang yang sudah menyelesaikan tahapnya
// (mis. Prepared yang sudah ACC) tetap melihat dan bisa ikut percakapan saat
// dokumen berada di tahap Checked/Approved.
//
// 🆕 Reply ala WhatsApp: hover/tap ikon reply di sebuah bubble untuk membalas
// pesan itu — muncul kutipan di atas kotak input, bisa dibatalkan. Pesan yang
// terkirim menampilkan kutipan pesan asli; klik kutipan itu untuk scroll +
// highlight ke pesan aslinya.
//
// TAMPILAN: floating widget ala chatbot — tombol bulat mengambang di kanan
// bawah, klik untuk membuka panel percakapan.
//
// Real-time memakai SSE (EventSource) — koneksi tetap hidup meski panel
// ditutup, supaya badge "pesan belum dibaca" tetap akurat.
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, WifiOff, X, Minus, Reply, CornerUpLeft } from 'lucide-react';

export interface ChatMessage {
  id: number;
  nomorDokumen: string;
  senderRole: string;
  senderNama: string | null;
  senderEmail: string;
  message: string;
  createdAt: string;
  replyTo: {
    id: number;
    senderRole: string;
    senderNama: string | null;
    message: string;
  } | null;
}

interface DocumentChatProps {
  /** Wajib untuk sisi admin. Di sisi approver, biarkan kosong — dokumen
   *  ditentukan server dari accToken. */
  nomorDokumen?: string;
  /** Token dari link email ACC. Kalau diisi, identitas pengirim di-resolve
   *  server-side dari token ini. */
  accToken?: string;
  /** Identitas admin (hanya dipakai saat accToken kosong). */
  adminNama?: string;
  adminEmail?: string;
  /** Email pengguna saat ini — dipakai untuk menentukan bubble "saya". */
  myEmail?: string;
  /** Judul kecil di bawah header panel, mis. nama dokumen. */
  subtitle?: string;
  /** Mode inline untuk ditanam langsung ke dalam sidebar / layout */
  inline?: boolean;
  onCloseInline?: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  admin:    'Admin',
  prepared: 'Prepared',
  checked:  'Checked',
  approved: 'Approved',
};

const ROLE_COLOR: Record<string, string> = {
  admin:    'bg-slate-100 text-slate-700',
  prepared: 'bg-blue-100 text-blue-700',
  checked:  'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function truncate(text: string, max = 90): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

export default function DocumentChat({
  nomorDokumen,
  accToken,
  adminNama,
  adminEmail,
  myEmail,
  subtitle,
  inline = false,
  onCloseInline,
}: DocumentChatProps) {
  const [open,      setOpen]      = useState(inline ? true : false);
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [draft,     setDraft]     = useState('');
  const [loading,   setLoading]   = useState(true);
  const [sending,   setSending]   = useState(false);
  const [connected, setConnected] = useState(false);
  const [unread,    setUnread]    = useState(0);
  const [error,     setError]     = useState('');

  // 🆕 Pesan yang sedang dibalas (null kalau tidak sedang membalas)
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  // 🆕 id pesan yang sedang di-highlight sesaat (habis diklik dari kutipan)
  const [highlightId, setHighlightId] = useState<number | null>(null);

  const scrollRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const lastIdRef  = useRef(0);
  const msgRefs    = useRef<Map<number, HTMLDivElement>>(new Map());
  // Dibaca di dalam callback SSE yang tidak ikut re-render — pakai ref
  // supaya nilainya selalu yang terbaru, bukan hasil closure lama.
  const openRef    = useRef(false);
  useEffect(() => { openRef.current = open; }, [open]);

  const queryString = accToken
    ? `token=${encodeURIComponent(accToken)}`
    : `nomorDokumen=${encodeURIComponent(nomorDokumen ?? '')}`;

  // Gabungkan pesan baru tanpa duplikat (SSE dan fetch bisa membawa pesan sama)
  const mergeMessages = useCallback((incoming: ChatMessage[], countUnread = false) => {
    if (incoming.length === 0) return;
    setMessages(prev => {
      const seen = new Set(prev.map(m => m.id));
      const fresh = incoming.filter(m => !seen.has(m.id));
      if (fresh.length === 0) return prev;

      if (countUnread && !openRef.current) {
        const fromOthers = fresh.filter(m => !myEmail || m.senderEmail !== myEmail);
        if (fromOthers.length > 0) setUnread(u => u + fromOthers.length);
      }

      const merged = [...prev, ...fresh].sort((a, b) => a.id - b.id);
      lastIdRef.current = merged[merged.length - 1].id;
      return merged;
    });
  }, [myEmail]);

  const fetchMessages = useCallback(async () => {
    if (!accToken && !nomorDokumen) return;
    try {
      const res = await fetch(
        `/review-prosedur/api/document-chat?${queryString}&since=${lastIdRef.current}`
      );
      if (!res.ok) throw new Error('Gagal memuat percakapan');
      const data = await res.json();
      mergeMessages(data.messages ?? []);
      setError('');
    } catch (err) {
      console.error('DocumentChat: gagal memuat pesan', err);
    } finally {
      setLoading(false);
    }
  }, [accToken, nomorDokumen, queryString, mergeMessages]);

  useEffect(() => {
    lastIdRef.current = 0;
    setMessages([]);
    setUnread(0);
    setReplyingTo(null);
    setLoading(true);
    fetchMessages();
  }, [fetchMessages]);

  // ── Koneksi SSE — tetap hidup meski panel tertutup, supaya badge akurat ───
  useEffect(() => {
    if (!accToken && !nomorDokumen) return;

    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      es = new EventSource(`/review-prosedur/api/document-chat/stream?${queryString}`);

      es.addEventListener('ready', () => setConnected(true));

      es.addEventListener('message', (e: MessageEvent) => {
        try {
          mergeMessages([JSON.parse(e.data) as ChatMessage], true);
        } catch (err) {
          console.error('DocumentChat: payload SSE tidak valid', err);
        }
      });

      es.onerror = () => {
        setConnected(false);
        es?.close();
        if (stopped) return;
        retryTimer = setTimeout(() => { fetchMessages(); connect(); }, 3000);
      };
    };

    connect();

    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
      setConnected(false);
    };
  }, [accToken, nomorDokumen, queryString, mergeMessages, fetchMessages]);

  // Auto-scroll ke pesan terbaru (hanya saat panel terbuka)
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    setUnread(0);
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // 🆕 Klik kutipan di dalam bubble → scroll ke pesan asli + highlight sesaat
  const jumpToMessage = (id: number) => {
    const el = msgRefs.current.get(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightId(id);
    setTimeout(() => setHighlightId(prev => (prev === id ? null : prev)), 1500);
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/review-prosedur/api/document-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          accToken
            ? { token: accToken, message: text, replyToId: replyingTo?.id ?? undefined }
            : { nomorDokumen, message: text, nama: adminNama, email: adminEmail, replyToId: replyingTo?.id ?? undefined }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim pesan');
      if (data.message) mergeMessages([data.message]);
      setDraft('');
      setReplyingTo(null);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim pesan');
    } finally {
      setSending(false);
    }
  };

  if (inline) {
    return (
      <div className="w-full h-full flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-blue-700 to-blue-900 flex items-start justify-between gap-2 flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MessageSquare size={15} className="text-white/90 flex-shrink-0" />
              <p className="text-sm font-bold text-white">Diskusi Dokumen</p>
            </div>
            <p className="text-[11px] text-blue-200 mt-0.5 truncate">
              {connected
                ? (subtitle || 'Admin · Prepared · Checked · Approved')
                : 'Menyambungkan…'}
            </p>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {!connected && !loading && (
              <WifiOff size={13} className="text-amber-300 mr-1" />
            )}
            {onCloseInline && (
              <button
                onClick={onCloseInline}
                title="Tutup Chat"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-all"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Daftar pesan */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50 min-h-[300px]">
          {loading && (
            <p className="text-xs text-slate-400 text-center py-8">Memuat percakapan…</p>
          )}

          {!loading && messages.length === 0 && (
            <div className="text-center py-8 px-4">
              <MessageSquare size={24} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">Belum ada pesan</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Kirim pesan untuk berdiskusi dengan admin atau approver lainnya.
              </p>
            </div>
          )}

          {messages.map(m => {
            const isMine = myEmail
              ? m.senderEmail.toLowerCase() === myEmail.toLowerCase()
              : m.senderRole === 'admin';
            const roleColor = ROLE_COLOR[m.senderRole] ?? 'bg-slate-100 text-slate-700';
            const roleLabel = ROLE_LABEL[m.senderRole] ?? m.senderRole;
            const isHighlighted = highlightId === m.id;

            return (
              <div
                key={m.id}
                ref={el => { if (el) msgRefs.current.set(m.id, el); }}
                className={`group/msg flex flex-col transition-all duration-300 ${
                  isMine ? 'items-end' : 'items-start'
                }`}
              >
                <div className={`max-w-[85%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  {!isMine && (
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${roleColor}`}>
                        {roleLabel}
                      </span>
                      {m.senderNama && (
                        <span className="text-[11px] font-medium text-slate-600">
                          {m.senderNama}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="relative group/bubble">
                    <button
                      onClick={() => setReplyingTo(m)}
                      title="Balas pesan ini"
                      className={`absolute top-1 opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 rounded-md
                                 text-slate-400 hover:text-slate-700 hover:bg-slate-200 z-10 ${
                        isMine ? '-left-7' : '-right-7'
                      }`}
                    >
                      <Reply size={13} />
                    </button>

                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-xs whitespace-pre-wrap break-words leading-relaxed transition-all ${
                        isMine
                          ? 'bg-blue-600 text-white rounded-br-xs'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-2xs'
                      } ${isHighlighted ? 'ring-2 ring-amber-400' : ''}`}
                    >
                      {m.replyTo && (
                        <button
                          onClick={() => jumpToMessage(m.replyTo!.id)}
                          className={`block w-full text-left mb-1.5 pl-2 border-l-2 rounded-r-md px-1.5 py-1 ${
                            isMine
                              ? 'border-white/50 bg-white/10 hover:bg-white/20'
                              : 'border-blue-300 bg-slate-50 hover:bg-slate-100'
                          }`}
                        >
                          <p className={`text-[10px] font-bold ${isMine ? 'text-white/90' : 'text-blue-700'}`}>
                            {ROLE_LABEL[m.replyTo.senderRole] ?? m.replyTo.senderRole}
                            {m.replyTo.senderNama ? ` · ${m.replyTo.senderNama}` : ''}
                          </p>
                          <p className={`text-[10px] truncate ${isMine ? 'text-white/75' : 'text-slate-500'}`}>
                            {truncate(m.replyTo.message, 70)}
                          </p>
                        </button>
                      )}
                      {m.message}
                    </div>
                  </div>

                  <span className="text-[9px] text-slate-400 px-1 mt-0.5">{formatTime(m.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Kutipan pesan yang sedang dibalas */}
        {replyingTo && (
          <div className="px-3 pt-2.5 bg-white border-t border-slate-100 flex-shrink-0">
            <div className="flex items-start gap-2 bg-slate-50 border-l-2 border-blue-500 rounded-r-lg px-2.5 py-1.5">
              <CornerUpLeft size={12} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-blue-700">
                  Membalas {ROLE_LABEL[replyingTo.senderRole] ?? replyingTo.senderRole}
                  {replyingTo.senderNama ? ` · ${replyingTo.senderNama}` : ''}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{truncate(replyingTo.message, 80)}</p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                title="Batal membalas"
                className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-3 py-3 border-t border-slate-100 bg-white flex-shrink-0">
          {error && <p className="text-[11px] text-red-600 mb-2 px-1">{error}</p>}
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                if (e.key === 'Escape' && replyingTo) { setReplyingTo(null); }
              }}
              placeholder={replyingTo ? 'Tulis balasan…' : 'Tulis pesan…'}
              rows={1}
              maxLength={2000}
              disabled={sending}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900
                         placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                         focus:border-transparent focus:bg-white transition-all resize-none
                         disabled:opacity-60 max-h-24"
            />
            <button
              onClick={handleSend}
              disabled={sending || !draft.trim()}
              title="Kirim (Enter)"
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700
                         text-white rounded-xl transition-all active:scale-95
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending
                ? <span className="animate-spin w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full" />
                : <Send size={14} />}
            </button>
          </div>
          <p className="text-[9px] text-slate-300 mt-1.5 px-1">
            Enter untuk kirim · Shift+Enter baris baru
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* ── Panel percakapan ────────────────────────────────────────────── */}
      {open && (
        <div
          className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden
                     flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-200"
          style={{ width: 'min(380px, calc(100vw - 3rem))', height: 'min(560px, calc(100vh - 8rem))' }}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-700 to-blue-900 flex items-start justify-between gap-2 flex-shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <MessageSquare size={15} className="text-white/90 flex-shrink-0" />
                <p className="text-sm font-bold text-white">Diskusi Dokumen</p>
              </div>
              <p className="text-[11px] text-blue-200 mt-0.5 truncate">
                {connected
                  ? (subtitle || 'Admin · Prepared · Checked · Approved')
                  : 'Menyambungkan…'}
              </p>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {!connected && !loading && (
                <WifiOff size={13} className="text-amber-300 mr-1" />
              )}
              <button
                onClick={() => setOpen(false)}
                title="Tutup"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-all"
              >
                <Minus size={15} />
              </button>
            </div>
          </div>

          {/* Daftar pesan */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
            {loading && (
              <p className="text-xs text-slate-400 text-center py-8">Memuat percakapan…</p>
            )}

            {!loading && messages.length === 0 && (
              <div className="text-center py-10">
                <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2.5">
                  <MessageSquare size={18} className="text-slate-300" />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Belum ada percakapan.<br />Tulis pesan pertama di bawah.
                </p>
              </div>
            )}

            {messages.map(m => {
              const isMine = !!myEmail && m.senderEmail === myEmail;
              const isHighlighted = highlightId === m.id;
              return (
                <div
                  key={m.id}
                  ref={el => { if (el) msgRefs.current.set(m.id, el); }}
                  className={`group flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[82%] flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${ROLE_COLOR[m.senderRole] ?? ROLE_COLOR.admin}`}>
                        {ROLE_LABEL[m.senderRole] ?? m.senderRole}
                      </span>
                      <span className="text-[10px] font-medium text-slate-600 truncate max-w-[140px]">
                        {m.senderNama || m.senderEmail}
                      </span>
                    </div>

                    {/* 🆕 Bubble + tombol reply dibungkus SATU baris kecil,
                        supaya tombol selalu menempel pas di sebelah bubble —
                        tidak lagi ikut lebar kolom/badge di atasnya. */}
                    <div className={`flex items-center gap-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                      <button
                        onClick={() => { setReplyingTo(m); inputRef.current?.focus(); }}
                        title="Balas pesan ini"
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex-shrink-0
                                   flex items-center justify-center rounded-full text-slate-400 hover:text-blue-600 hover:bg-white"
                      >
                        <Reply size={13} />
                      </button>

                      <div
                        className={`px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words transition-colors ${
                          isMine
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'
                        } ${isHighlighted ? 'ring-2 ring-amber-400' : ''}`}
                      >
                        {/* Kutipan pesan yang dibalas */}
                        {m.replyTo && (
                          <button
                            onClick={() => jumpToMessage(m.replyTo!.id)}
                            className={`block w-full text-left mb-1.5 pl-2 border-l-2 rounded-r-md px-1.5 py-1 ${
                              isMine
                                ? 'border-white/50 bg-white/10 hover:bg-white/20'
                                : 'border-blue-300 bg-slate-50 hover:bg-slate-100'
                            }`}
                          >
                            <p className={`text-[10px] font-bold ${isMine ? 'text-white/90' : 'text-blue-700'}`}>
                              {ROLE_LABEL[m.replyTo.senderRole] ?? m.replyTo.senderRole}
                              {m.replyTo.senderNama ? ` · ${m.replyTo.senderNama}` : ''}
                            </p>
                            <p className={`text-[10px] truncate ${isMine ? 'text-white/75' : 'text-slate-500'}`}>
                              {truncate(m.replyTo.message, 70)}
                            </p>
                          </button>
                        )}
                        {m.message}
                      </div>
                    </div>

                    <span className="text-[9px] text-slate-400 px-1">{formatTime(m.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 🆕 Kutipan pesan yang sedang dibalas — muncul di atas input */}
          {replyingTo && (
            <div className="px-3 pt-2.5 bg-white border-t border-slate-100 flex-shrink-0">
              <div className="flex items-start gap-2 bg-slate-50 border-l-2 border-blue-500 rounded-r-lg px-2.5 py-1.5">
                <CornerUpLeft size={12} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-blue-700">
                    Membalas {ROLE_LABEL[replyingTo.senderRole] ?? replyingTo.senderRole}
                    {replyingTo.senderNama ? ` · ${replyingTo.senderNama}` : ''}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">{truncate(replyingTo.message, 80)}</p>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  title="Batal membalas"
                  className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-slate-100 bg-white flex-shrink-0">
            {error && <p className="text-[11px] text-red-600 mb-2 px-1">{error}</p>}
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  if (e.key === 'Escape' && replyingTo) { setReplyingTo(null); }
                }}
                placeholder={replyingTo ? 'Tulis balasan…' : 'Tulis pesan…'}
                rows={1}
                maxLength={2000}
                disabled={sending}
                className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900
                           placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                           focus:border-transparent focus:bg-white transition-all resize-none
                           disabled:opacity-60 max-h-24"
              />
              <button
                onClick={handleSend}
                disabled={sending || !draft.trim()}
                title="Kirim (Enter)"
                className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700
                           text-white rounded-xl transition-all active:scale-95
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending
                  ? <span className="animate-spin w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full" />
                  : <Send size={15} />}
              </button>
            </div>
            <p className="text-[9px] text-slate-300 mt-1.5 px-1">
              Enter untuk kirim · Shift+Enter baris baru
            </p>
          </div>
        </div>
      )}

      {/* ── Tombol mengambang ───────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(prev => !prev)}
        title={open ? 'Tutup diskusi' : 'Buka diskusi dokumen'}
        className={`relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center
                    transition-all active:scale-90 hover:scale-105 ${
          open
            ? 'bg-slate-700 hover:bg-slate-800'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {open ? <X size={22} className="text-white" /> : <MessageSquare size={22} className="text-white" />}

        {!open && unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500
                           text-white text-[10px] font-bold flex items-center justify-center
                           ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}

        {!open && unread === 0 && connected && (
          <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-white" />
        )}
      </button>
    </div>
  );
}