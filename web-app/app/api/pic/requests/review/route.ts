import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { documentIds, notes } = body;
    const picId = request.headers.get('x-pic-id') || '1';

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'Dokumen harus dipilih' },
        { status: 400 }
      );
    }

    // Create review request for each selected document
    const queries = documentIds.map((docId: number) => ({
      text: `
        INSERT INTO pic_requests (pic_id, document_id, status, notes, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id
      `,
      values: [picId, docId, 'pending', notes || null],
    }));

    // Begin transaction
    await client.query('BEGIN');

    try {
      for (const query of queries) {
        await client.query(query.text, query.values);
      }

      // Log activity
      const logQuery = `
        INSERT INTO pic_activities (pic_id, activity_type, description, created_at)
        VALUES ($1, $2, $3, NOW())
      `;
      await client.query(logQuery, [
        picId,
        'request',
        `Meminta review untuk ${documentIds.length} dokumen`,
      ]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: `Permintaan review untuk ${documentIds.length} dokumen telah dibuat`,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error creating review request:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat permintaan' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const picId = request.headers.get('x-pic-id') || '1';

    const query = `
      SELECT pr.id, pr.status, pr.notes, pd.document_number, pd.title, pr.created_at
      FROM pic_requests pr
      JOIN pic_documents pd ON pr.document_id = pd.id
      WHERE pr.pic_id = $1
      ORDER BY pr.created_at DESC
    `;

    const result = await client.query(query, [picId]);

    return NextResponse.json({
      requests: result.rows.map((row: any) => ({
        id: row.id,
        status: row.status,
        notes: row.notes,
        documentNumber: row.document_number,
        title: row.title,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching review requests:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
