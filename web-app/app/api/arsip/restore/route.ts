// app/api/arsip/restore/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logActivity } from '@/lib/activityLogger';

// POST - Restore archived procedure
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

    // 1. Ambil data dari arsip_prosedur (inklusive nama_dokumen)
    const selectQuery = `
      SELECT nama_dokumen, * FROM arsip_prosedur 
      WHERE nomor_dokumen = $1
    `;
    const selectResult = await client.query(selectQuery, [nomorDokumen]);

    if (selectResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Archived procedure not found' },
        { status: 404 }
      );
    }

    const row = selectResult.rows[0];
    const namaDokumen = row.nama_dokumen; // ✅ SIMPAN NAMA DOKUMEN

    // 2. Insert kembali ke procedure_documents
    const insertQuery = `
      INSERT INTO procedure_documents 
      (nama_dokumen, nomor_dokumen, level_dokumen, tanggal_selesai_approval, 
       revisi, owner, pic, email, status, is_custom, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
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
      row.created_at
    ];

    await client.query(insertQuery, insertValues);

    // 3. Delete dari arsip_prosedur
    const deleteQuery = `
      DELETE FROM arsip_prosedur 
      WHERE nomor_dokumen = $1
    `;
    await client.query(deleteQuery, [nomorDokumen]);

    await client.query('COMMIT');

    // ✅ Tambahkan logging setelah restore berhasil - GUNAKAN NAMA DOKUMEN
    await logActivity({
      username: 'admin',
      activityType: 'restore',
      activityDescription: `Restore prosedur ${namaDokumen}`,
      targetType: 'procedure',
      targetId: nomorDokumen,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Procedure restored successfully' 
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error restoring procedure:', error);
    
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Procedure already exists in active list' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to restore procedure' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}