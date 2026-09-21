// app/api/document-chat/route.ts
//
// GET  — ambil riwayat chat satu dokumen (opsional ?since=<id>).
// POST — kirim pesan baru (opsional membalas pesan lain lewat `replyToId`),
//        lalu broadcast lewat pg_notify supaya semua klien yang sedang
//        membuka dokumen ini menerimanya seketika.
//
// 🆕 Reply ala WhatsApp: setiap pesan boleh menempel ke SATU pesan lain
// (reply_to_id) sebagai kutipan. Kutipan yang dikirim balik ke klien hanya
// cuplikan ringan (id, pengirim, isi pesan) — cukup untuk ditampilkan di atas
// bubble tanpa perlu request tambahan.
//
// Identitas pengirim di-resolve dengan pola yang SAMA seperti
// app/api/annotations/route.ts:
//   - ada `token`  → identitas dari procedure_approval_actions (server-side,
//                    tidak bisa dipalsukan dari client)
//   - tanpa token  → role DIPAKSA 'admin' di server

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { CHAT_CHANNEL, type ChatMessagePayload } from '@/lib/chatBus';

const MAX_MESSAGE_LENGTH = 2000;

function mapRow(r: any): ChatMessagePayload {
  return {
    id:           r.id,
    nomorDokumen: r.nomor_dokumen,
    senderRole:   r.sender_role,
    senderNama:   r.sender_nama,
    senderEmail:  r.sender_email,
    message:      r.message,
    createdAt:    r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    replyTo: r.reply_to_id
      ? {
          id:         r.reply_to_id,
          senderRole: r.reply_sender_role,
          senderNama: r.reply_sender_nama,
          message:    r.reply_message,
        }
      : null,
  };
}

/** Resolve nomorDokumen milik sebuah token approver. */
async function resolveTokenDoc(client: any, token: string) {
  const result = await client.query(
    `SELECT a.nama, a.email, a.role, c.nomor_dokumen, c.id AS cycle_id
     FROM procedure_approval_actions a
     JOIN procedure_approval_cycles c ON c.id = a.cycle_id
     WHERE a.token = $1`,
    [token]
  );
  return result.rows[0] ?? null;
}

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const sinceParam = searchParams.get('since');
    const since = sinceParam ? parseInt(sinceParam, 10) : 0;

    let nomorDokumen = searchParams.get('nomorDokumen');

    if (token) {
      const row = await resolveTokenDoc(client, token);
      if (!row) {
        return NextResponse.json({ error: 'Token tidak valid' }, { status: 404 });
      }
      nomorDokumen = row.nomor_dokumen;
    }

    if (!nomorDokumen) {
      return NextResponse.json({ error: 'nomorDokumen wajib diisi' }, { status: 400 });
    }

    const result = await client.query(
      `SELECT
         m.id, m.nomor_dokumen, m.sender_role, m.sender_nama, m.sender_email,
         m.message, m.created_at, m.reply_to_id,
         r.sender_role AS reply_sender_role,
         r.sender_nama AS reply_sender_nama,
         r.message     AS reply_message
       FROM document_chat_messages m
       LEFT JOIN document_chat_messages r ON r.id = m.reply_to_id
       WHERE m.nomor_dokumen = $1 AND m.id > $2
       ORDER BY m.id ASC`,
      [nomorDokumen, isNaN(since) ? 0 : since]
    );

    return NextResponse.json({
      nomorDokumen,
      messages: result.rows.map(mapRow),
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json({ error: 'Gagal memuat percakapan' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const token   = typeof body.token === 'string' ? body.token : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const replyToIdRaw = body.replyToId;

    if (!message) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Pesan terlalu panjang (maksimal ${MAX_MESSAGE_LENGTH} karakter)` },
        { status: 400 }
      );
    }

    let nomorDokumen: string;
    let cycleId: number | null = null;
    let senderRole: string;
    let senderNama: string | null;
    let senderEmail: string;

    if (token) {
      const row = await resolveTokenDoc(client, token);
      if (!row) {
        return NextResponse.json({ error: 'Token tidak valid' }, { status: 404 });
      }
      nomorDokumen = row.nomor_dokumen;
      cycleId      = row.cycle_id;
      senderRole   = row.role;      // 'prepared' | 'checked' | 'approved'
      senderNama   = row.nama;
      senderEmail  = row.email;
    } else {
      nomorDokumen = typeof body.nomorDokumen === 'string' ? body.nomorDokumen : '';
      if (!nomorDokumen) {
        return NextResponse.json({ error: 'nomorDokumen wajib diisi' }, { status: 400 });
      }
      const docCheck = await client.query(
        `SELECT nomor_dokumen FROM procedure_documents WHERE nomor_dokumen = $1`,
        [nomorDokumen]
      );
      if (docCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Dokumen tidak ditemukan' }, { status: 404 });
      }
      const cycleResult = await client.query(
        `SELECT id FROM procedure_approval_cycles
         WHERE nomor_dokumen = $1 ORDER BY id DESC LIMIT 1`,
        [nomorDokumen]
      );
      cycleId     = cycleResult.rows[0]?.id ?? null;
      senderRole  = 'admin';
      senderNama  = typeof body.nama === 'string' ? body.nama : 'Administrator';
      senderEmail = typeof body.email === 'string' && body.email ? body.email : 'admin';
    }

    // 🆕 Validasi reply — pesan yang dibalas HARUS ada dan milik dokumen yang
    // sama (mencegah orang membalas ke pesan dokumen lain lewat manipulasi id).
    let replyToId: number | null = null;
    if (replyToIdRaw !== undefined && replyToIdRaw !== null) {
      const parsed = parseInt(String(replyToIdRaw), 10);
      if (!isNaN(parsed)) {
        const replyCheck = await client.query(
          `SELECT id FROM document_chat_messages WHERE id = $1 AND nomor_dokumen = $2`,
          [parsed, nomorDokumen]
        );
        if (replyCheck.rows.length > 0) replyToId = parsed;
      }
    }

    const isAdmin = senderRole === 'admin';
    const insertResult = await client.query(
      `INSERT INTO document_chat_messages
         (nomor_dokumen, cycle_id, sender_role, sender_nama, sender_email, message, reply_to_id, admin_read, admin_read_at, admin_read_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, nomor_dokumen, sender_role, sender_nama, sender_email, message, created_at, reply_to_id`,
      [
        nomorDokumen,
        cycleId,
        senderRole,
        senderNama,
        senderEmail,
        message,
        replyToId,
        isAdmin,
        isAdmin ? new Date() : null,
        isAdmin ? 'admin' : null,
      ]
    );

    const row = insertResult.rows[0];

    // Ambil cuplikan pesan yang dibalas (kalau ada), untuk disertakan di payload
    let replyPreview: { reply_sender_role: string; reply_sender_nama: string | null; reply_message: string } | null = null;
    if (replyToId) {
      const previewResult = await client.query(
        `SELECT sender_role AS reply_sender_role, sender_nama AS reply_sender_nama, message AS reply_message
         FROM document_chat_messages WHERE id = $1`,
        [replyToId]
      );
      replyPreview = previewResult.rows[0] ?? null;
    }

    const payload = mapRow({ ...row, ...replyPreview });

    // Broadcast ke semua klien yang sedang mendengarkan dokumen ini.
    await client.query(`SELECT pg_notify($1, $2)`, [CHAT_CHANNEL, JSON.stringify(payload)]);

    return NextResponse.json({ success: true, message: payload }, { status: 201 });
  } catch (error) {
    console.error('Error sending chat message:', error);
    return NextResponse.json({ error: 'Gagal mengirim pesan' }, { status: 500 });
  } finally {
    client.release();
  }
}