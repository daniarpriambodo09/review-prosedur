// app/api/procedures/mark-review-seen/route.ts
//
// Endpoint: POST /api/procedures/mark-review-seen
//
// Dipakai frontend untuk menandai bahwa admin sudah melihat review terbaru
// dari PIC. Mengisi review_seen_at = NOW() jika sebelumnya masih NULL.
//
// Body JSON:  { "nomorDokumen": "DOC-001" }
// Response:   { "success": true, "nomorDokumen": "DOC-001" }
//
// Tidak mengubah status dokumen, tidak mengubah last_reviewed_at,
// tidak memengaruhi alur auto-schedule / auto-expire / auto-reactivate.

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { nomorDokumen } = body;

    if (!nomorDokumen || typeof nomorDokumen !== 'string') {
      return NextResponse.json(
        { error: 'nomorDokumen wajib diisi' },
        { status: 400 }
      );
    }

    // Hanya update jika review_seen_at masih NULL
    // (admin belum pernah lihat review terbaru ini)
    await client.query(
      `UPDATE procedure_documents
       SET review_seen_at = NOW()
       WHERE nomor_dokumen = $1
         AND last_reviewed_at IS NOT NULL
         AND review_seen_at IS NULL`,
      [nomorDokumen]
    );

    return NextResponse.json({ success: true, nomorDokumen });
  } catch (error) {
    console.error('Error marking review as seen:', error);
    return NextResponse.json(
      { error: 'Gagal menandai review sebagai sudah dilihat' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}