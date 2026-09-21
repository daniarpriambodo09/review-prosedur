// app/api/admin/pic-requests/route.ts
// Mengambil seluruh permintaan aktif dari PIC (Revisi Dokumen + Dokumen Baru)
// untuk ditampilkan di card dan modal Total Request PIC pada dashboard admin (/home).

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    // 1. Ambil permintaan revisi aktif (status 'pending' DAN status dokumen belum 'Relevan')
    const revResult = await client.query(`
      SELECT 
        r.id,
        'revision' AS type,
        r.pic_id AS "picId",
        pu.full_name AS "picName",
        pu.email AS "picEmail",
        r.nomor_dokumen AS "nomorDokumen",
        r.nama_dokumen AS "namaDokumen",
        r.notes,
        r.status AS "requestStatus",
        pd.status AS "documentStatus",
        r.created_at AS "createdAt"
      FROM pic_review_requests r
      JOIN pic_users pu ON r.pic_id = pu.id
      JOIN procedure_documents pd ON pd.nomor_dokumen = r.nomor_dokumen
      WHERE r.status = 'pending' 
        AND pd.status != 'Relevan'
      ORDER BY r.created_at DESC
    `);

    // 2. Ambil permintaan dokumen baru yang pending
    const docResult = await client.query(`
      SELECT 
        dr.id,
        'new_document' AS type,
        dr.pic_id AS "picId",
        pu.full_name AS "picName",
        pu.email AS "picEmail",
        dr.document_number AS "nomorDokumen",
        dr.title AS "namaDokumen",
        COALESCE(dr.reason, dr.description, '') AS notes,
        dr.description,
        dr.reason,
        dr.status AS "requestStatus",
        NULL AS "documentStatus",
        dr.created_at AS "createdAt"
      FROM pic_document_requests dr
      JOIN pic_users pu ON dr.pic_id = pu.id
      WHERE dr.status = 'pending'
      ORDER BY dr.created_at DESC
    `);

    const revisionRequests = revResult.rows;
    const newDocRequests   = docResult.rows.map(r => ({
      ...r,
      nomorDokumen: r.nomorDokumen || '-',
    }));

    const allRequests = [...revisionRequests, ...newDocRequests].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      summary: {
        total:         allRequests.length,
        revisionCount: revisionRequests.length,
        newDocCount:   newDocRequests.length,
      },
      requests: allRequests,
    });

  } catch (error) {
    console.error('Error fetching admin PIC requests:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data permintaan PIC' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
