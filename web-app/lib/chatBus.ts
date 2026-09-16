// lib/chatBus.ts
//
// Bus pub/sub untuk chat dokumen, berbasis Postgres LISTEN/NOTIFY.
//
// Kenapa pakai Client terpisah, bukan pool dari lib/db.ts?
// Koneksi yang dipakai LISTEN harus dipegang terus-menerus (long-lived) —
// kalau diambil dari pool, koneksi itu tidak akan pernah dikembalikan dan
// pool cepat habis. Jadi: SATU koneksi listener dipakai bersama oleh SEMUA
// subscriber SSE (berapa pun jumlah tab yang terbuka), lalu di-fan-out
// di dalam proses Node.

import { Client, type Notification } from 'pg';

export interface ChatMessagePayload {
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

export const CHAT_CHANNEL = 'document_chat';

type Subscriber = (payload: ChatMessagePayload) => void;

// nomorDokumen -> himpunan callback yang sedang mendengarkan dokumen itu
const subscribers = new Map<string, Set<Subscriber>>();

let listener: Client | null = null;
let connecting: Promise<void> | null = null;

function handleNotification(msg: Notification) {
  if (!msg.payload) return;
  try {
    const payload = JSON.parse(msg.payload) as ChatMessagePayload;
    const set = subscribers.get(payload.nomorDokumen);
    if (!set) return;
    for (const cb of set) {
      try { cb(payload); } catch (e) { console.error('chatBus subscriber error:', e); }
    }
  } catch (e) {
    console.error('chatBus: payload NOTIFY tidak valid', e);
  }
}

async function ensureListener(): Promise<void> {
  if (listener) return;
  if (connecting) return connecting;

  connecting = (async () => {
    const client = new Client({
      user:     process.env.DB_USER     || 'postgres',
      host:     process.env.DB_HOST     || 'localhost',
      database: process.env.DB_NAME     || 'procedure_management',
      password: process.env.DB_PASSWORD || 'J41pens123',
      port:     parseInt(process.env.DB_PORT || '5432'),
    });

    client.on('notification', handleNotification);
    client.on('error', (err) => {
      console.error('chatBus: koneksi listener error, akan reconnect', err);
      try { client.end().catch(() => {}); } catch {}
      listener = null;
      connecting = null;
      // Reconnect otomatis kalau masih ada yang mendengarkan
      if (subscribers.size > 0) {
        setTimeout(() => { ensureListener().catch(() => {}); }, 2000);
      }
    });

    await client.connect();
    await client.query(`LISTEN ${CHAT_CHANNEL}`);
    listener = client;
  })();

  try {
    await connecting;
  } finally {
    connecting = null;
  }
}

/**
 * Berlangganan pesan baru untuk satu dokumen.
 * Mengembalikan fungsi unsubscribe — WAJIB dipanggil saat SSE ditutup.
 */
export async function subscribeChat(
  nomorDokumen: string,
  cb: Subscriber
): Promise<() => void> {
  await ensureListener();

  let set = subscribers.get(nomorDokumen);
  if (!set) {
    set = new Set();
    subscribers.set(nomorDokumen, set);
  }
  set.add(cb);

  return () => {
    const s = subscribers.get(nomorDokumen);
    if (!s) return;
    s.delete(cb);
    if (s.size === 0) subscribers.delete(nomorDokumen);
  };
}