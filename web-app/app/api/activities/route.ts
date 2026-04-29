// app/api/activities/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// ─── Mapping type dari pic_activities → type yang dipakai di activity_logs ───
//
// pic_activities.activity_type memakai label berbeda dari activity_logs:
//   pic_activities  → activity_logs (frontend)
//   'login'         → 'login'              (sama)
//   'logout'        → 'logout'             (sama)
//   'review'        → 'review'             (sama)
//   'request'       → 'request_review'     ← PIC minta review dokumen
//   'document'      → 'request_document'   ← PIC minta dokumen baru
//   'view'          → 'download'           ← PIC lihat/buka dokumen
//   'download'      → 'download'           (sama)
//   'approval'      → 'review'             ← PIC submit approval
//
// Mapping ini dilakukan di SQL agar frontend tidak perlu tahu soal dua tabel.

const PIC_TYPE_MAP: Record<string, string> = {
  login:    'login',
  logout:   'logout',
  review:   'review',
  request:  'request_review',    // PIC minta review → request_review
  document: 'request_document',  // PIC minta dok baru → request_document
  view:     'download',
  download: 'download',
  approval: 'review',
};

// Buat SQL CASE expression dari mapping di atas agar rapi di query
function buildTypeCaseExpr(alias: string): string {
  const cases = Object.entries(PIC_TYPE_MAP)
    .map(([from, to]) => `WHEN ${alias}.activity_type = '${from}' THEN '${to}'`)
    .join('\n        ');
  return `CASE\n        ${cases}\n        ELSE ${alias}.activity_type\n      END`;
}

// GET - Ambil activity logs gabungan (admin + PIC)
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

    const typeCaseExpr = buildTypeCaseExpr('pa');

    // UNION:
    //   Tabel 1: activity_logs  → aktivitas admin (login, upload, create, update, review, dll)
    //   Tabel 2: pic_activities → aktivitas PIC   (login, request, document, view, review, dll)
    //
    // Kolom yang disamakan:
    //   id              — id unik per baris; prefiks 'a_'/'p_' untuk hindari tabrakan antar tabel
    //   user_id         — NULL untuk PIC (tidak ada di pic_activities)
    //   username        — username admin ATAU email PIC (lebih informatif dari hanya pic_id)
    //   activity_type   — dinormalisasi via CASE untuk PIC
    //   activity_description — description / keterangan
    //   target_type / target_id — untuk admin saja; NULL untuk PIC
    //   created_at      — timestamp

    const query = `
      SELECT
        'a_' || al.id            AS id,
        al.user_id               AS user_id,
        al.username              AS username,
        al.activity_type         AS activity_type,
        al.activity_description  AS activity_description,
        al.target_type           AS target_type,
        al.target_id             AS target_id,
        al.created_at            AS created_at
      FROM activity_logs al

      UNION ALL

      SELECT
        'p_' || pa.id                                    AS id,
        NULL::integer                                    AS user_id,
        COALESCE(pu.full_name, pu.email, 'PIC #' || pa.pic_id::text)
                                                         AS username,
        ${typeCaseExpr}                                  AS activity_type,
        pa.description                                   AS activity_description,
        pa.target_type                                   AS target_type,
        pa.target_id                                     AS target_id,
        pa.created_at                                    AS created_at
      FROM pic_activities pa
      LEFT JOIN pic_users pu ON pa.pic_id = pu.id

      ORDER BY created_at DESC
      LIMIT $1
    `;

    const result = await client.query(query, [limit]);

    const activities = result.rows.map((row) => ({
      id:                  row.id,
      userId:              row.user_id,
      username:            row.username,
      activityType:        row.activity_type,
      activityDescription: row.activity_description,
      targetType:          row.target_type,
      targetId:            row.target_id,
      createdAt:           row.created_at,
    }));

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// POST - Log activity baru (tidak berubah)
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const {
      userId,
      username,
      activityType,
      activityDescription,
      targetType,
      targetId,
      ipAddress,
      userAgent,
    } = body;

    if (!username || !activityType || !activityDescription) {
      return NextResponse.json(
        { error: 'Username, activityType, and activityDescription are required' },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO activity_logs
      (user_id, username, activity_type, activity_description, target_type, target_id, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await client.query(query, [
      userId || null,
      username,
      activityType,
      activityDescription,
      targetType || null,
      targetId || null,
      ipAddress || null,
      userAgent || null,
    ]);

    return NextResponse.json({
      success: true,
      activity: result.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Error logging activity:', error);
    return NextResponse.json(
      { error: 'Failed to log activity' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}