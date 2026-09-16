// app/api/document-chat/stream/route.ts
//
// Server-Sent Events — mendorong pesan chat baru ke browser secara real-time
// tanpa polling. Klien menyambung lewat EventSource dan otomatis reconnect
// kalau koneksi putus (lihat komponen DocumentChat.tsx).

import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { subscribeChat, type ChatMessagePayload } from '@/lib/chatBus';

// WAJIB: LISTEN/NOTIFY butuh koneksi TCP ke Postgres — tidak bisa Edge runtime.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  let nomorDokumen = searchParams.get('nomorDokumen');

  // Sama seperti route GET biasa: kalau ada token, dokumen ditentukan oleh
  // token, bukan query string.
  if (token) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT c.nomor_dokumen
         FROM procedure_approval_actions a
         JOIN procedure_approval_cycles c ON c.id = a.cycle_id
         WHERE a.token = $1`,
        [token]
      );
      if (result.rows.length === 0) {
        return new Response('Token tidak valid', { status: 404 });
      }
      nomorDokumen = result.rows[0].nomor_dokumen;
    } finally {
      client.release();
    }
  }

  if (!nomorDokumen) {
    return new Response('nomorDokumen wajib diisi', { status: 400 });
  }

  const docKey = nomorDokumen;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let unsubscribe: (() => void) | null = null;
      let heartbeat: ReturnType<typeof setInterval> | null = null;

      const send = (data: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(data)); } catch { /* sudah tertutup */ }
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe?.();
        try { controller.close(); } catch { /* ignore */ }
      };

      try {
        unsubscribe = await subscribeChat(docKey, (payload: ChatMessagePayload) => {
          send(`event: message\ndata: ${JSON.stringify(payload)}\n\n`);
        });
      } catch (err) {
        console.error('SSE chat: gagal subscribe', err);
        send(`event: error\ndata: {"error":"listener tidak tersedia"}\n\n`);
        cleanup();
        return;
      }

      // Sinyal siap — klien memakai ini untuk menutup indikator "menyambung…"
      send(`event: ready\ndata: {"nomorDokumen":${JSON.stringify(docKey)}}\n\n`);

      // Komentar heartbeat tiap 25 detik supaya proxy/nginx tidak memutus
      // koneksi yang dianggap idle.
      heartbeat = setInterval(() => send(`: ping\n\n`), 25_000);

      request.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream; charset=utf-8',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no', // penting kalau di belakang nginx
    },
  });
}