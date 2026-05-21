// app/api/admin/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logActivity } from '@/lib/activityLogger';

// GET — Fetch semua notifikasi untuk admin (exclude deleted)
export async function GET(request: NextRequest) {
  // ── Ambil identifier admin (opsional, untuk filter deleted per-admin) ──────
  // Jika tidak ada header, default ke 'admin' agar backward-compatible
  const adminId = request.headers.get('x-admin-id') ?? 'admin';

  const client = await pool.connect();
  try {
    // Query untuk mengambil semua notifikasi dari kedua tabel,
    // exclude yang sudah dihapus oleh admin ini
    const notifQuery = await client.query(`
      SELECT
        n.id,
        n.pic_id       AS "picId",
        pu.full_name   AS "picFullName",
        pu.email       AS "picEmail",
        n.title        AS title,
        n.document_number AS "nomorDokumen",
        n.title        AS "namaDokumen",
        n.description  AS description,
        n.reason       AS reason,
        NULL           AS notes,
        n.status       AS status,
        n.is_read      AS "isRead",
        n.created_at   AS "createdAt",
        n.read_at      AS "readAt",
        'new_document' AS type
      FROM pic_document_requests n
      JOIN pic_users pu ON n.pic_id = pu.id
      WHERE NOT EXISTS (
        SELECT 1 FROM admin_notification_deletes d
        WHERE d.notification_id = n.id
          AND d.notification_type = 'new_document'
          AND d.admin_id = $1
      )
      UNION ALL
      SELECT
        r.id,
        r.pic_id            AS "picId",
        pu.full_name        AS "picFullName",
        pu.email            AS "picEmail",
        r.nama_dokumen      AS title,
        r.nomor_dokumen     AS "nomorDokumen",
        r.nama_dokumen      AS "namaDokumen",
        NULL                AS description,
        NULL                AS reason,
        r.notes             AS notes,
        r.status            AS status,
        r.is_read           AS "isRead",
        r.created_at        AS "createdAt",
        r.read_at           AS "readAt",
        'review_request'    AS type
      FROM pic_review_requests r
      JOIN pic_users pu ON r.pic_id = pu.id
      WHERE NOT EXISTS (
        SELECT 1 FROM admin_notification_deletes d
        WHERE d.notification_id = r.id
          AND d.notification_type = 'review_request'
          AND d.admin_id = $1
      )
      ORDER BY "createdAt" DESC
    `, [adminId]);

    // Hitung jumlah unread (exclude deleted)
    const unreadQuery = await client.query(`
      SELECT COUNT(*) as unread_count
      FROM (
        SELECT n.id, 'new_document' AS type FROM pic_document_requests n
        WHERE n.is_read = false
          AND NOT EXISTS (
            SELECT 1 FROM admin_notification_deletes d
            WHERE d.notification_id = n.id
              AND d.notification_type = 'new_document'
              AND d.admin_id = $1
          )
        UNION ALL
        SELECT r.id, 'review_request' AS type FROM pic_review_requests r
        WHERE r.is_read = false
          AND NOT EXISTS (
            SELECT 1 FROM admin_notification_deletes d
            WHERE d.notification_id = r.id
              AND d.notification_type = 'review_request'
              AND d.admin_id = $1
          )
      ) as unread
    `, [adminId]);

    const unreadCount = parseInt(unreadQuery.rows[0].unread_count) || 0;

    return NextResponse.json({
      notifications: notifQuery.rows,
      unreadCount: unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil notifikasi' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// PATCH — Update status request dari PIC (approve / reject / completed) atau mark as read
export async function PATCH(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { id, type, readBy, markAllRead } = body;

    if (markAllRead) {
      // Mark all as read
      await client.query(`
        UPDATE pic_document_requests
        SET is_read = true, read_at = COALESCE(read_at, NOW()), read_by = COALESCE(read_by, $1)
        WHERE is_read = false
      `, [readBy]);

      await client.query(`
        UPDATE pic_review_requests
        SET is_read = true, read_at = COALESCE(read_at, NOW()), read_by = COALESCE(read_by, $1)
        WHERE is_read = false
      `, [readBy]);

      return NextResponse.json({ success: true });
    } else if (id && type) {
      // Mark single as read
      const table = type === 'new_document' ? 'pic_document_requests' : 'pic_review_requests';
      await client.query(`
        UPDATE ${table}
        SET is_read = true, read_at = COALESCE(read_at, NOW()), read_by = COALESCE(read_by, $1)
        WHERE id = $2 AND is_read = false
      `, [readBy, id]);

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Parameter tidak valid' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Gagal mengupdate notifikasi' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// DELETE — Soft-delete notifikasi untuk admin tertentu
// Body: { id: number; type: 'new_document' | 'review_request'; adminId?: string }
export async function DELETE(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json().catch(() => ({}));
    const { id, type, adminId = 'admin' } = body as {
      id?: unknown;
      type?: unknown;
      adminId?: string;
    };

    // Validasi
    const notifId = Number(id);
    if (!Number.isFinite(notifId) || !Number.isSafeInteger(notifId)) {
      return NextResponse.json(
        { error: 'id harus berupa integer yang valid' },
        { status: 400 }
      );
    }
    if (type !== 'new_document' && type !== 'review_request') {
      return NextResponse.json(
        { error: 'type harus "new_document" atau "review_request"' },
        { status: 400 }
      );
    }

    // Soft-delete: insert ke tabel admin_notification_deletes
    // ON CONFLICT DO NOTHING aman jika sudah pernah dihapus sebelumnya
    await client.query(
      `INSERT INTO admin_notification_deletes (admin_id, notification_id, notification_type)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [adminId, notifId, type]
    );

    return NextResponse.json({ ok: true, deletedId: notifId, type });

  } catch (error) {
    console.error('DELETE /api/admin/notifications error:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus notifikasi' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 