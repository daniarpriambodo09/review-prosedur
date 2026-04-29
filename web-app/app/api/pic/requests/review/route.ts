// app/api/pic/requests/review/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// ─── POST — PIC membuat request review dokumen ───────────────────────────────
export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const body     = await request.json();
    const { documentIds, notes } = body;

    const picId    = request.headers.get('x-pic-id');
    const picEmail = request.headers.get('x-pic-email');

    if (!picId || !picEmail) {
      return NextResponse.json(
        { error: 'Header x-pic-id dan x-pic-email wajib ada' },
        { status: 400 }
      );
    }

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'Pilih minimal satu dokumen' },
        { status: 400 }
      );
    }

    // documentIds berisi id dari procedure_documents (integer)
    // Ambil nomor_dokumen + nama_dokumen untuk setiap id yang dipilih
    const docQuery = `
      SELECT id, nomor_dokumen, nama_dokumen
      FROM procedure_documents
      WHERE id = ANY($1::int[])
    `;
    const docResult = await client.query(docQuery, [documentIds]);

    if (docResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Dokumen tidak ditemukan' },
        { status: 404 }
      );
    }

    await client.query('BEGIN');

    // Insert satu baris per dokumen ke pic_review_requests
    // is_read = false secara default → menjadi notifikasi admin
    for (const doc of docResult.rows) {
      await client.query(`
        INSERT INTO pic_review_requests
          (pic_id, nomor_dokumen, nama_dokumen, notes, status, is_read)
        VALUES ($1, $2, $3, $4, 'pending', false)
      `, [picId, doc.nomor_dokumen, doc.nama_dokumen, notes || null]);
    }

    // Log ke pic_activities
    await client.query(`
      INSERT INTO pic_activities (pic_id, activity_type, description, created_at)
      VALUES ($1, 'request', $2, NOW())
    `, [
      picId,
      `Meminta review untuk ${docResult.rows.length} dokumen: ${
        docResult.rows.map((d: any) => d.nomor_dokumen).join(', ')
      }`,
    ]);

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: `Permintaan review untuk ${docResult.rows.length} dokumen telah dikirim ke admin`,
      count:   docResult.rows.length,
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating review request:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat permintaan' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// ─── GET — ambil history request review milik PIC ────────────────────────────
export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    const picId = request.headers.get('x-pic-id');

    if (!picId) {
      return NextResponse.json(
        { error: 'Header x-pic-id wajib ada' },
        { status: 400 }
      );
    }

    const result = await client.query(`
      SELECT id, nomor_dokumen, nama_dokumen, notes, status, created_at
      FROM pic_review_requests
      WHERE pic_id = $1
      ORDER BY created_at DESC
    `, [picId]);

    return NextResponse.json({
      requests: result.rows.map((row: any) => ({
        id:            row.id,
        nomorDokumen:  row.nomor_dokumen,
        namaDokumen:   row.nama_dokumen,
        notes:         row.notes,
        status:        row.status,
        createdAt:     row.created_at,
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