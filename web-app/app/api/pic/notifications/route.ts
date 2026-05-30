// app/api/pic/notifications/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// ── Helper: format waktu relatif ──────────────────────────────────────────────
function formatRelativeTime(date: Date): string {
  const diffMs    = Date.now() - date.getTime();
  const diffMins  = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays  = Math.floor(diffMs / 86_400_000);

  if (diffMins  <  1) return 'Baru saja';
  if (diffMins  < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays  <  7) return `${diffDays} hari lalu`;

  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Helper: validasi header auth ──────────────────────────────────────────────
function getAuthHeaders(request: NextRequest): { picId: string; picEmail: string } | null {
  const picId    = request.headers.get('x-pic-id');
  const picEmail = request.headers.get('x-pic-email');
  if (!picId || !picEmail) return null;
  return { picId, picEmail };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pic/notifications
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = getAuthHeaders(request);
  if (!auth) {
    return NextResponse.json(
      { error: 'Header x-pic-id dan x-pic-email wajib ada' },
      { status: 400 }
    );
  }
  const { picId, picEmail } = auth;

  const client = await pool.connect();
  try {
    const emailLocalPart = picEmail.split('@')[0].trim().toUpperCase();
    const picCodes = emailLocalPart
      .split(',')
      .map((c: string) => c.trim())
      .filter((c: string) => c.length > 0);

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let idx = 1;

    for (const code of picCodes) {
      conditions.push(`pic ILIKE $${idx}`);
      params.push(`%${code}%`);
      idx++;
    }
    conditions.push(`email ILIKE $${idx}`);
    params.push(`%${picEmail}%`);

    const whereClause = conditions.join(' OR ');

    const docsResult = await client.query(
      `SELECT id, nomor_dokumen, nama_dokumen, status, updated_at
       FROM procedure_documents
       WHERE (${whereClause})
       ORDER BY updated_at DESC
       LIMIT 20`,
      params
    );

    // ── Ambil read & deleted IDs — cast eksplisit ke BIGINT di query ──────────
    // Casting ::bigint di sisi SQL memastikan pg driver mengembalikan string
    // representasi angka besar yang konsisten, lalu kita konversi ke number JS
    // dengan Number(). Untuk ID sangat besar, gunakan BigInt() — tapi dalam
    // kasus ini row.id * 10 + 2 masih aman selama row.id < 200_000_000.
    const [readsResult, deletesResult] = await Promise.all([
      client.query(
        'SELECT notification_id::bigint AS notification_id FROM pic_notification_reads   WHERE pic_id = $1',
        [picId]
      ),
      client.query(
        'SELECT notification_id::bigint AS notification_id FROM pic_notification_deletes WHERE pic_id = $1',
        [picId]
      ),
    ]);

    // Konversi ke number — pg mengembalikan bigint sebagai string di Node.js
    const readIds    = new Set<number>(readsResult.rows.map((r: any)   => Number(r.notification_id)));
    const deletedIds = new Set<number>(deletesResult.rows.map((r: any) => Number(r.notification_id)));

// ─── Types (shared shape antara GET response dan NotificationBell) ────────────
// CATATAN: interface ini harus konsisten dengan Notification di NotificationBell.tsx
// Field tambahan: nomorDokumen dan absoluteTime untuk UX clarity
interface RawNotif {
  id:            number;
  type:          'document' | 'review' | 'request' | 'info';
  title:         string;
  description:   string;
  nomorDokumen:  string;   // ditampilkan sebagai badge monospace di frontend
  time:          string;   // relatif: "5 menit lalu"
  absoluteTime:  string;   // absolut: "07 Mei 2026 • 14:32" — untuk tooltip/sub-label
  isRead:        boolean;
  sortDate:      Date;
}

    // Helper: format timestamp absolut untuk label sekunder di notifikasi
    const formatAbsoluteTime = (date: Date): string =>
      date.toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
      }) + ' • ' + date.toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', hour12: false,
      });

    const SENT_STATUSES = ['Telah terkirim', 'Belum dikirim'];
    const rawNotifs: RawNotif[] = [];

    for (const row of docsResult.rows) {
      const updatedAt   = new Date(row.updated_at);
      const namaDokumen = row.nama_dokumen as string;
      const nomorDoc    = row.nomor_dokumen as string;
      const status      = row.status as string;

      const rowId = Number(row.id);
      const id1   = rowId * 10 + 1;
      const id2   = rowId * 10 + 2;

      if (!Number.isSafeInteger(id1)) continue;

      if (!deletedIds.has(id1)) {
        rawNotifs.push({
          id:           id1,
          type:         'document',
          title:        'Dokumen Baru Tersedia',
          description:  `${namaDokumen} telah ditambahkan dan memerlukan perhatian Anda.`,
          nomorDokumen: nomorDoc,
          time:         formatRelativeTime(updatedAt),
          absoluteTime: formatAbsoluteTime(updatedAt),
          isRead:       readIds.has(id1),
          sortDate:     updatedAt,
        });
      }

      if (SENT_STATUSES.includes(status)) {
        if (!Number.isSafeInteger(id2)) continue;
        if (!deletedIds.has(id2)) {
          rawNotifs.push({
            id:           id2,
            type:         'document',
            title:        'Dokumen Telah Dikirim',
            description:  `${namaDokumen} telah dikirim kepada Anda.`,
            nomorDokumen: nomorDoc,
            time:         formatRelativeTime(updatedAt),
            absoluteTime: formatAbsoluteTime(updatedAt),
            isRead:       readIds.has(id2),
            sortDate:     updatedAt,
          });
        }
      }
    }

    const notifications = rawNotifs
      .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
      .slice(0, 10)
      .map(({ sortDate, ...rest }) => rest);

    return NextResponse.json({ notifications });

  } catch (error) {
    console.error('GET /api/pic/notifications error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/pic/notifications
// Body: { notificationId: number } | { all: true }
// Tandai satu atau semua notifikasi sebagai dibaca.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = getAuthHeaders(request);
  if (!auth) {
    return NextResponse.json(
      { error: 'Header x-pic-id dan x-pic-email wajib ada' },
      { status: 400 }
    );
  }
  const { picId, picEmail } = auth;

  const client = await pool.connect();
  try {
    const body = await request.json().catch(() => ({}));
    const { notificationId, all } = body as { notificationId?: number; all?: boolean };

    if (all) {
      // Re-generate semua ID aktif untuk PIC, lalu insert semuanya
      const emailLocalPart = picEmail.split('@')[0].trim().toUpperCase();
      const picCodes = emailLocalPart.split(',').map((c: string) => c.trim()).filter(Boolean);

      const conds: string[] = [];
      const p: (string | number)[] = [];
      let i = 1;
      for (const code of picCodes) { conds.push(`pic ILIKE $${i}`); p.push(`%${code}%`); i++; }
      conds.push(`email ILIKE $${i}`); p.push(`%${picEmail}%`);

      const docsResult = await client.query(
        `SELECT id, status FROM procedure_documents WHERE (${conds.join(' OR ')}) LIMIT 20`,
        p
      );

      const SENT_STATUSES = ['Telah terkirim', 'Belum dikirim'];
      const allIds: number[] = [];
      for (const row of docsResult.rows) {
        allIds.push(row.id * 10 + 1);
        if (SENT_STATUSES.includes(row.status)) allIds.push(row.id * 10 + 2);
      }

      if (allIds.length > 0) {
        const values = allIds.map((_, i) => `($1, $${i + 2})`).join(', ');
        await client.query(
          `INSERT INTO pic_notification_reads (pic_id, notification_id) VALUES ${values} ON CONFLICT DO NOTHING`,
          [picId, ...allIds]
        );
      }

      return NextResponse.json({ ok: true, markedCount: allIds.length });
    }

    if (typeof notificationId !== 'number') {
      return NextResponse.json(
        { error: 'notificationId (number) atau all (boolean) wajib diisi' },
        { status: 400 }
      );
    }

    await client.query(
      `INSERT INTO pic_notification_reads (pic_id, notification_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [picId, notificationId]
    );

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('POST /api/pic/notifications error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/pic/notifications
// Body: { notificationId: number }
// Saat delete 1 notifikasi, otomatis delete SEMUA notifikasi dari dokumen
// yang sama (id1 = baseId*10+1 dan id2 = baseId*10+2) dalam satu INSERT.
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const auth = getAuthHeaders(request);
  if (!auth) {
    return NextResponse.json(
      { error: 'Header x-pic-id dan x-pic-email wajib ada' },
      { status: 400 }
    );
  }
  const { picId } = auth;

  const client = await pool.connect();
  try {
    const body = await request.json().catch(() => ({}));
    const { notificationId } = body as { notificationId?: unknown };

    const notifIdNum = Number(notificationId);

    if (!Number.isFinite(notifIdNum) || !Number.isSafeInteger(notifIdNum)) {
      return NextResponse.json(
        { error: 'notificationId harus berupa integer yang valid' },
        { status: 400 }
      );
    }

    // ── Derive baseId dan kedua ID dari dokumen yang sama ────────────────────
    // Formula generate: id = row.id * 10 + suffix (1 atau 2)
    // Kebalikannya: baseId = Math.floor(notificationId / 10)
    const baseId = Math.floor(notifIdNum / 10);
    const id1    = baseId * 10 + 1;
    const id2    = baseId * 10 + 2;

    // Insert keduanya sekaligus — ON CONFLICT DO NOTHING aman jika sudah ada
    await client.query(
      `INSERT INTO pic_notification_deletes (pic_id, notification_id)
       VALUES ($1, $2::bigint), ($1, $3::bigint)
       ON CONFLICT DO NOTHING`,
      [picId, id1, id2]
    );

    return NextResponse.json({ ok: true, deletedIds: [id1, id2] });

  } catch (error) {
    console.error('DELETE /api/pic/notifications error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  } finally {
    client.release();
  }
}