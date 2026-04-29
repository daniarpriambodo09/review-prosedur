// app/api/admin/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logActivity } from '@/lib/activityLogger';

// GET — Fetch semua notifikasi untuk admin
export async function GET() {
  const client = await pool.connect();
  try {
    // Query untuk mengambil semua notifikasi dari kedua tabel
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
      ORDER BY "createdAt" DESC
    `);

    // Hitung jumlah unread
    const unreadQuery = await client.query(`
      SELECT COUNT(*) as unread_count
      FROM (
        SELECT id FROM pic_document_requests WHERE is_read = false
        UNION ALL
        SELECT id FROM pic_review_requests WHERE is_read = false
      ) as unread
    `);

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