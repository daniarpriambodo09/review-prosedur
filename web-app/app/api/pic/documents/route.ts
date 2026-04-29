// app/api/pic/documents/route.ts
// PERBAIKAN: Dual approach filtering - by pic code AND by email

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    const picEmail = request.headers.get('x-pic-email');

    if (!picEmail) {
      return NextResponse.json(
        { error: 'Header x-pic-email wajib ada' },
        { status: 400 }
      );
    }

    // Ekstrak kode PIC dari email: "dp@jai.co.id" → ["DP"]
    // "vra, asw@jai.co.id" → ["VRA", "ASW"]
    const emailLocalPart = picEmail.split('@')[0].trim().toUpperCase();
    const picCodes = emailLocalPart
      .split(',')
      .map((c: string) => c.trim())
      .filter((c: string) => c.length > 0);

    // Bangun kondisi WHERE dual: pic code + email
    const picConditions: string[] = [];
    const queryParams: string[] = [];
    let paramIndex = 1;

    for (const code of picCodes) {
      picConditions.push(`pic ILIKE $${paramIndex}`);
      queryParams.push(`%${code}%`);
      paramIndex++;
    }

    picConditions.push(`email ILIKE $${paramIndex}`);
    queryParams.push(`%${picEmail}%`);
    paramIndex++;

    const whereClause = picConditions.join(' OR ');

    const query = `
      SELECT
        id,
        nomor_dokumen,
        nama_dokumen,
        level_dokumen,
        tanggal_selesai_approval,
        revisi,
        owner,
        pic,
        email,
        status,
        updated_at AS created_at
      FROM procedure_documents
      WHERE ${whereClause}
      ORDER BY tanggal_selesai_approval DESC
    `;

    const result    = await client.query(query, queryParams);
    const documents = result.rows.map((row: any) => ({
      id:             row.id,
      documentNumber: row.nomor_dokumen,
      title:          row.nama_dokumen,
      status:         row.status,
      createdAt:      row.created_at,
    }));

    return NextResponse.json({ documents });

  } catch (error) {
    console.error('Error fetching PIC documents:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data dokumen' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}