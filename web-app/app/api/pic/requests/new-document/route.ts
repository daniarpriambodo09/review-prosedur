// app/api/pic/requests/new-document/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const body                                      = await request.json();
    const { title, description, reason } = body;

    // Ambil picId dari header (dikirim oleh frontend)
    const picId = request.headers.get('x-pic-id');

    if (!picId) {
      return NextResponse.json(
        { error: 'Header x-pic-id wajib ada' },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: 'Judul dokumen harus diisi' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Insert ke pic_document_requests (is_read default false → jadi notifikasi admin)
    const insertQuery = `
      INSERT INTO pic_document_requests (
        pic_id, document_number, title, description, reason, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
      RETURNING id
    `;
    const result = await client.query(insertQuery, [
      picId,
      '',
      title,
      description || null,
      reason      || null,
    ]);

    // Log ke pic_activities
    await client.query(`
      INSERT INTO pic_activities (pic_id, activity_type, description, created_at)
      VALUES ($1, 'document', $2, NOW())
    `, [picId, `Membuat permintaan dokumen baru: ${title}`]);

    await client.query('COMMIT');

    return NextResponse.json({
      success:   true,
      message:   'Permintaan dokumen baru telah dibuat',
      requestId: result.rows[0].id,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating new document request:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat permintaan' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}