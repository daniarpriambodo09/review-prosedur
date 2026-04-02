// app/api/procedures/archive/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logActivity } from '@/lib/activityLogger'; // ✅ Tambahan

// POST - Archive (soft delete) procedure
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { nomorDokumen } = body;

    if (!nomorDokumen) {
      return NextResponse.json(
        { error: 'Nomor dokumen is required' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // 1. Ambil data dari procedure_documents
    const selectQuery = `
      SELECT * FROM procedure_documents 
      WHERE nomor_dokumen = $1
    `;
    const selectResult = await client.query(selectQuery, [nomorDokumen]);

    if (selectResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Procedure not found' },
        { status: 404 }
      );
    }

    const row = selectResult.rows[0];

    // 2. Insert ke arsip_prosedur
    const insertQuery = `
      INSERT INTO arsip_prosedur 
      (nama_dokumen, nomor_dokumen, level_dokumen, tanggal_selesai_approval, 
       revisi, owner, pic, email, status, is_custom, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const insertValues = [
      row.nama_dokumen,
      row.nomor_dokumen,
      row.level_dokumen,
      row.tanggal_selesai_approval,
      row.revisi,
      row.owner,
      row.pic,
      row.email,
      row.status,
      row.is_custom,
      row.created_at,
      row.updated_at
    ];

    await client.query(insertQuery, insertValues);

    let namaDokumen = nomorDokumen; // Fallback ke nomor jika tidak ditemukan
    if (selectResult.rows.length > 0) {
      namaDokumen = selectResult.rows[0].nama_dokumen;
    }

    // 3. Delete dari procedure_documents
    const deleteQuery = `
      DELETE FROM procedure_documents 
      WHERE nomor_dokumen = $1
    `;
    await client.query(deleteQuery, [nomorDokumen]);

    // 4. Delete related reviews
    const deleteReviewsQuery = `
      DELETE FROM document_reviews 
      WHERE nomor_dokumen = $1
    `;
    await client.query(deleteReviewsQuery, [nomorDokumen]);

    await client.query('COMMIT');

    // ✅ Tambahkan logging setelah archive berhasil
    await logActivity({
      username: 'admin',
      activityType: 'archive',
      activityDescription: `Archive prosedur ${namaDokumen}`,
      targetType: 'procedure',
      targetId: nomorDokumen,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Procedure archived successfully' 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error archiving procedure:', error);
    return NextResponse.json(
      { error: 'Failed to archive procedure' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}