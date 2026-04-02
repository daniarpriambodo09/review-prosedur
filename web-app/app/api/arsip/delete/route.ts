// app/api/arsip/delete/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logActivity } from '@/lib/activityLogger';

// DELETE - Hapus permanen archived procedure
export async function DELETE(request: NextRequest) {
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

    // ✅ Ambil nama_dokumen sebelum delete
    const selectQuery = `
      SELECT nama_dokumen FROM arsip_prosedur
      WHERE nomor_dokumen = $1
    `;
    const selectResult = await client.query(selectQuery, [nomorDokumen]);
    
    let namaDokumen = nomorDokumen; // Fallback ke nomor jika tidak ditemukan
    if (selectResult.rows.length > 0) {
      namaDokumen = selectResult.rows[0].nama_dokumen;
    }

    // Delete permanen dari arsip_prosedur
    const deleteQuery = `
      DELETE FROM arsip_prosedur
      WHERE nomor_dokumen = $1
      RETURNING *
    `;
    const result = await client.query(deleteQuery, [nomorDokumen]);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Archived procedure not found' },
        { status: 404 }
      );
    }

    // ✅ Tambahkan logging setelah delete berhasil - GUNAKAN NAMA DOKUMEN
    await logActivity({
      username: 'admin',
      activityType: 'delete',
      activityDescription: `Hapus permanen prosedur ${namaDokumen}`,
      targetType: 'procedure',
      targetId: nomorDokumen,
    });

    return NextResponse.json({
      success: true,
      message: 'Procedure permanently deleted'
    });
  } catch (error) {
    console.error('Error deleting procedure permanently:', error);
    return NextResponse.json(
      { error: 'Failed to delete procedure permanently' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}