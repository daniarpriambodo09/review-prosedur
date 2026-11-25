// app/api/arsip/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - Ambil semua arsip prosedur
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    // 🚀 Pindahkan dokumen dengan status Obsolete dari procedure_documents ke arsip_prosedur jika ada
    await client.query(`
      INSERT INTO arsip_prosedur 
      (nama_dokumen, nomor_dokumen, level_dokumen, tanggal_selesai_approval, 
       revisi, owner, pic, email, status, is_custom, created_at, updated_at, deleted_at)
      SELECT nama_dokumen, nomor_dokumen, level_dokumen, tanggal_selesai_approval, 
             revisi, owner, pic, email, 'Obsolete', is_custom, created_at, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM procedure_documents
      WHERE status = 'Obsolete'
      ON CONFLICT DO NOTHING
    `);
    await client.query(`
      DELETE FROM procedure_documents WHERE status = 'Obsolete'
    `);

    const query = 'SELECT * FROM arsip_prosedur ORDER BY COALESCE(deleted_at, updated_at) DESC';
    const result = await client.query(query);

    // Convert snake_case to camelCase (TAMBAHKAN email)
    const arsip = result.rows.map((row: any) => ({
      id: row.id,
      namaDokumen: row.nama_dokumen,
      nomorDokumen: row.nomor_dokumen,
      levelDokumen: row.level_dokumen,
      tanggalSelesaiApproval: row.tanggal_selesai_approval,
      revisi: row.revisi,
      owner: row.owner,
      pic: row.pic,
      email: row.email, // TAMBAHKAN INI
      status: row.status,
      isCustom: row.is_custom,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    }));

    return NextResponse.json(arsip);
  } catch (error) {
    console.error('Error fetching archived procedures:', error);
    return NextResponse.json(
      { error: 'Failed to fetch archived procedures' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}