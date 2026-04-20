import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const picId = request.headers.get('x-pic-id') || '1';

    // Get documents assigned to PIC
    const query = `
      SELECT id, document_number, title, status, created_at
      FROM pic_documents
      WHERE pic_id = $1
      ORDER BY created_at DESC
    `;

    const result = await client.query(query, [picId]);

    return NextResponse.json({
      documents: result.rows.map((row: any) => ({
        id: row.id,
        documentNumber: row.document_number,
        title: row.title,
        status: row.status,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data dokumen' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
