// app/api/admin/notifications/route.ts
//
// 🆕 Ditambah sumber notifikasi ketiga: 'approval_rejected' — muncul saat
// salah satu approver (Prepared/Checked/Approved) menolak dokumen lewat
// halaman /acc/[token]. Sumbernya dari procedure_approval_actions (bukan
// tabel pic_*), tapi tetap di-UNION dengan bentuk (shape) yang sama supaya
// NotificationBell.tsx bisa merender ketiganya secara seragam.

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logActivity } from '@/lib/activityLogger';

// GET — Fetch semua notifikasi untuk admin (exclude deleted)
export async function GET(request: NextRequest) {
  const adminId = request.headers.get('x-admin-id') ?? 'admin';

  const client = await pool.connect();
  try {
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
      UNION ALL
      SELECT
        ra.id,
        ra.approver_id                       AS "picId",
        COALESCE(ra.nama, ra.email)          AS "picFullName",
        ra.email                             AS "picEmail",
        pd.nama_dokumen                      AS title,
        pd.nomor_dokumen                     AS "nomorDokumen",
        pd.nama_dokumen                      AS "namaDokumen",
        NULL                                 AS description,
        ra.reject_reason                     AS reason,
        ('Ditolak sebagai ' ||
          CASE ra.role
            WHEN 'prepared' THEN 'Prepared'
            WHEN 'checked'  THEN 'Checked'
            WHEN 'approved' THEN 'Approved'
            ELSE ra.role
          END)                               AS notes,
        'rejected'                           AS status,
        ra.admin_read                        AS "isRead",
        ra.acc_at                            AS "createdAt",
        ra.admin_read_at                     AS "readAt",
        'approval_rejected'                  AS type
      FROM procedure_approval_actions ra
      JOIN procedure_approval_cycles pac ON pac.id = ra.cycle_id
      JOIN procedure_documents pd        ON pd.nomor_dokumen = pac.nomor_dokumen
      WHERE ra.acc_status = 'rejected'
        AND NOT EXISTS (
          SELECT 1 FROM admin_notification_deletes d
          WHERE d.notification_id = ra.id
            AND d.notification_type = 'approval_rejected'
            AND d.admin_id = $1
        )
      UNION ALL
      SELECT
        ae.id,
        0                                     AS "picId",
        COALESCE(ae.annotated_by_nama, ae.annotated_by_email) AS "picFullName",
        ae.annotated_by_email                 AS "picEmail",
        pd2.nama_dokumen                      AS title,
        pd2.nomor_dokumen                     AS "nomorDokumen",
        pd2.nama_dokumen                      AS "namaDokumen",
        NULL                                  AS description,
        NULL                                  AS reason,
        (ae.annotation_count || ' coretan/komentar baru — sebagai ' ||
          CASE ae.annotated_by_role
            WHEN 'pic'      THEN 'PIC'
            WHEN 'prepared' THEN 'Prepared'
            WHEN 'checked'  THEN 'Checked'
            WHEN 'approved' THEN 'Approved'
            ELSE ae.annotated_by_role
          END)                                AS notes,
        'info'                                AS status,
        ae.admin_read                         AS "isRead",
        ae.created_at                         AS "createdAt",
        ae.admin_read_at                      AS "readAt",
        'document_annotated'                  AS type
      FROM document_annotation_events ae
      JOIN procedure_documents pd2 ON pd2.nomor_dokumen = ae.nomor_dokumen
      WHERE NOT EXISTS (
        SELECT 1 FROM admin_notification_deletes d
        WHERE d.notification_id = ae.id
          AND d.notification_type = 'document_annotated'
          AND d.admin_id = $1
      )
      UNION ALL
      SELECT
        m.id,
        0                                     AS "picId",
        COALESCE(m.sender_nama, m.sender_email) AS "picFullName",
        m.sender_email                        AS "picEmail",
        COALESCE(pd3.nama_dokumen, m.nomor_dokumen) AS title,
        m.nomor_dokumen                       AS "nomorDokumen",
        pd3.nama_dokumen                      AS "namaDokumen",
        m.message                             AS description,
        NULL                                  AS reason,
        ('Pesan chat dari ' ||
          CASE LOWER(m.sender_role)
            WHEN 'prepared' THEN 'Prepared'
            WHEN 'checked'  THEN 'Checked'
            WHEN 'approved' THEN 'Approved'
            ELSE m.sender_role
          END)                                AS notes,
        'info'                                AS status,
        COALESCE(m.admin_read, false)         AS "isRead",
        m.created_at                          AS "createdAt",
        m.admin_read_at                       AS "readAt",
        'chat_message'                        AS type
      FROM document_chat_messages m
      LEFT JOIN procedure_documents pd3 ON pd3.nomor_dokumen = m.nomor_dokumen
      WHERE LOWER(m.sender_role) IN ('prepared', 'checked', 'approved')
        AND NOT EXISTS (
          SELECT 1 FROM admin_notification_deletes d
          WHERE d.notification_id = m.id
            AND d.notification_type = 'chat_message'
            AND d.admin_id = $1
        )
      ORDER BY "createdAt" DESC
    `, [adminId]);

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
        UNION ALL
        SELECT ra.id, 'approval_rejected' AS type FROM procedure_approval_actions ra
        WHERE ra.acc_status = 'rejected' AND ra.admin_read = false
          AND NOT EXISTS (
            SELECT 1 FROM admin_notification_deletes d
            WHERE d.notification_id = ra.id
              AND d.notification_type = 'approval_rejected'
              AND d.admin_id = $1
          )
        UNION ALL
        SELECT ae.id, 'document_annotated' AS type FROM document_annotation_events ae
        WHERE ae.admin_read = false
          AND NOT EXISTS (
            SELECT 1 FROM admin_notification_deletes d
            WHERE d.notification_id = ae.id
              AND d.notification_type = 'document_annotated'
              AND d.admin_id = $1
          )
        UNION ALL
        SELECT m.id, 'chat_message' AS type FROM document_chat_messages m
        WHERE LOWER(m.sender_role) IN ('prepared', 'checked', 'approved')
          AND COALESCE(m.admin_read, false) = false
          AND NOT EXISTS (
            SELECT 1 FROM admin_notification_deletes d
            WHERE d.notification_id = m.id
              AND d.notification_type = 'chat_message'
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

      // 🆕 Tandai semua notifikasi penolakan sebagai sudah dibaca juga
      await client.query(`
        UPDATE procedure_approval_actions
        SET admin_read = true, admin_read_at = COALESCE(admin_read_at, NOW()), admin_read_by = COALESCE(admin_read_by, $1)
        WHERE acc_status = 'rejected' AND admin_read = false
      `, [readBy]);

      // 🆕 Tandai semua notifikasi coretan/komentar sebagai sudah dibaca juga
      await client.query(`
        UPDATE document_annotation_events
        SET admin_read = true, admin_read_at = COALESCE(admin_read_at, NOW()), admin_read_by = COALESCE(admin_read_by, $1)
        WHERE admin_read = false
      `, [readBy]);

      // 🆕 Tandai semua notifikasi pesan chat approver sebagai sudah dibaca juga
      await client.query(`
        UPDATE document_chat_messages
        SET admin_read = true, admin_read_at = COALESCE(admin_read_at, NOW()), admin_read_by = COALESCE(admin_read_by, $1)
        WHERE LOWER(sender_role) IN ('prepared', 'checked', 'approved') AND (admin_read = false OR admin_read IS NULL)
      `, [readBy]);

      return NextResponse.json({ success: true });
    } else if (id && type) {
      if (type === 'approval_rejected') {
        // 🆕 Tabel & nama kolom beda dari dua tipe lainnya
        await client.query(`
          UPDATE procedure_approval_actions
          SET admin_read = true, admin_read_at = COALESCE(admin_read_at, NOW()), admin_read_by = COALESCE(admin_read_by, $1)
          WHERE id = $2 AND admin_read = false
        `, [readBy, id]);
      } else if (type === 'document_annotated') {
        // 🆕 Sama polanya dengan approval_rejected, tabel beda
        await client.query(`
          UPDATE document_annotation_events
          SET admin_read = true, admin_read_at = COALESCE(admin_read_at, NOW()), admin_read_by = COALESCE(admin_read_by, $1)
          WHERE id = $2 AND admin_read = false
        `, [readBy, id]);
      } else if (type === 'chat_message') {
        // 🆕 Notifikasi chat dari salah satu approver (prepared, checked, approved)
        await client.query(`
          UPDATE document_chat_messages
          SET admin_read = true, admin_read_at = COALESCE(admin_read_at, NOW()), admin_read_by = COALESCE(admin_read_by, $1)
          WHERE id = $2 AND (admin_read = false OR admin_read IS NULL)
        `, [readBy, id]);
      } else {
        const table = type === 'new_document' ? 'pic_document_requests' : 'pic_review_requests';
        await client.query(`
          UPDATE ${table}
          SET is_read = true, read_at = COALESCE(read_at, NOW()), read_by = COALESCE(read_by, $1)
          WHERE id = $2 AND is_read = false
        `, [readBy, id]);
      }

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
// Body: { id: number; type: 'new_document' | 'review_request' | 'approval_rejected' | 'document_annotated' | 'chat_message'; adminId?: string }
export async function DELETE(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json().catch(() => ({}));
    const { id, type, adminId = 'admin' } = body as {
      id?: unknown;
      type?: unknown;
      adminId?: string;
    };

    const notifId = Number(id);
    if (!Number.isFinite(notifId) || !Number.isSafeInteger(notifId)) {
      return NextResponse.json(
        { error: 'id harus berupa integer yang valid' },
        { status: 400 }
      );
    }
    if (type !== 'new_document' && type !== 'review_request' && type !== 'approval_rejected' && type !== 'document_annotated' && type !== 'chat_message') {
      return NextResponse.json(
        { error: 'type harus "new_document", "review_request", "approval_rejected", "document_annotated", atau "chat_message"' },
        { status: 400 }
      );
    }

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