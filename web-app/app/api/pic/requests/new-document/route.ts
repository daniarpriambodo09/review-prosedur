import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { documentNumber, title, description, reason } = body;
    const picId = request.headers.get('x-pic-id') || '1';

    if (!documentNumber || !title) {
      return NextResponse.json(
        { error: 'Nomor dokumen dan judul harus diisi' },
        { status: 400 }
      );
    }

    // Insert new document request
    const query = `
      INSERT INTO pic_document_requests (
        pic_id, document_number, title, description, reason, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id
    `;

    const result = await client.query(query, [
      picId,
      documentNumber,
      title,
      description || null,
      reason || null,
      'pending',
    ]);

    // Log activity
    const logQuery = `
      INSERT INTO pic_activities (pic_id, activity_type, description, created_at)
      VALUES ($1, $2, $3, NOW())
    `;
    await client.query(logQuery, [
      picId,
      'document',
      `Membuat permintaan dokumen baru: ${documentNumber}`,
    ]);

    return NextResponse.json({
      success: true,
      message: 'Permintaan dokumen baru telah dibuat',
      requestId: result.rows[0].id,
    });
  } catch (error) {
    console.error('Error creating new document request:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat permintaan' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
