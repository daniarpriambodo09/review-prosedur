// app/api/pic/requests/review/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// ─── POST — PIC membuat request revisi dokumen ───────────────────────────────
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
    // Ambil info dokumen untuk setiap id yang dipilih
    const docQuery = `
      SELECT id, nomor_dokumen, nama_dokumen, revisi, tanggal_selesai_approval
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

    // 1. Insert ke pic_review_requests
    // 2. Ubah status dokumen di procedure_documents menjadi 'Revisi'
    // 3. Sinkronkan ke document_reviews agar halaman status-review langsung menampilkan 'Revisi'
    for (const doc of docResult.rows) {
      await client.query(`
        INSERT INTO pic_review_requests
          (pic_id, nomor_dokumen, nama_dokumen, notes, status, is_read)
        VALUES ($1, $2, $3, $4, 'pending', false)
      `, [picId, doc.nomor_dokumen, doc.nama_dokumen, notes || null]);

      await client.query(`
        UPDATE procedure_documents
        SET status           = 'Revisi',
            last_reviewed_at = NOW(),
            review_seen_at   = NULL,
            updated_at       = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [doc.id]);

      const docDate = new Date(doc.tanggal_selesai_approval);
      const approvalMonth = isNaN(docDate.getTime())
        ? new Date().getMonth()
        : docDate.getMonth();
      const revisiVal = doc.revisi || '0';

      await client.query(`
        INSERT INTO document_reviews
          (nomor_dokumen, status, revisi, last_reviewed_month, updated_at)
        VALUES ($1, 'Revisi', $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (nomor_dokumen, last_reviewed_month)
        DO UPDATE SET
          status     = 'Revisi',
          revisi     = $2,
          updated_at = CURRENT_TIMESTAMP
      `, [doc.nomor_dokumen, revisiVal, approvalMonth]);
    }

    // Log ke pic_activities
    await client.query(`
      INSERT INTO pic_activities (pic_id, activity_type, description, created_at)
      VALUES ($1, 'request', $2, NOW())
    `, [
      picId,
      `Meminta revisi untuk ${docResult.rows.length} dokumen: ${
        docResult.rows.map((d: any) => d.nomor_dokumen).join(', ')
      }`,
    ]);

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: `Permintaan revisi untuk ${docResult.rows.length} dokumen telah dikirim ke admin`,
      count:   docResult.rows.length,
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating review request:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat permintaan revisi' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// ─── GET — ambil request review milik PIC (bisa filter active=true) ───────────
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

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    if (activeOnly) {
      // Ambil hanya request aktif:
      // 1. Revision requests yang masih pending dan status dokumen belum 'Relevan'
      // 2. New document requests yang masih pending
      const revResult = await client.query(`
        SELECT 
          r.id,
          'revision' AS type,
          r.nomor_dokumen,
          r.nama_dokumen,
          r.notes,
          r.status AS request_status,
          pd.status AS document_status,
          r.created_at
        FROM pic_review_requests r
        JOIN procedure_documents pd ON pd.nomor_dokumen = r.nomor_dokumen
        WHERE r.pic_id = $1
          AND r.status = 'pending'
          AND pd.status != 'Relevan'
        ORDER BY r.created_at DESC
      `, [picId]);

      const docResult = await client.query(`
        SELECT 
          id,
          'new_document' AS type,
          document_number AS nomor_dokumen,
          title AS nama_dokumen,
          reason AS notes,
          description,
          status AS request_status,
          NULL AS document_status,
          created_at
        FROM pic_document_requests
        WHERE pic_id = $1
          AND status = 'pending'
        ORDER BY created_at DESC
      `, [picId]);

      const allActive = [
        ...revResult.rows.map((row: any) => ({
          id:             row.id,
          type:           'revision',
          nomorDokumen:   row.nomor_dokumen,
          namaDokumen:    row.nama_dokumen,
          notes:          row.notes,
          requestStatus:  row.request_status,
          documentStatus: row.document_status,
          createdAt:      row.created_at,
        })),
        ...docResult.rows.map((row: any) => ({
          id:             row.id,
          type:           'new_document',
          nomorDokumen:   row.nomor_dokumen || '-',
          namaDokumen:    row.nama_dokumen,
          notes:          row.notes || row.description,
          requestStatus:  row.request_status,
          documentStatus: null,
          createdAt:      row.created_at,
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return NextResponse.json({ requests: allActive });
    }

    // Default: Semua riwayat review request milik PIC
    const result = await client.query(`
      SELECT 
        r.id, 
        r.nomor_dokumen, 
        r.nama_dokumen, 
        r.notes, 
        r.status, 
        r.created_at,
        pd.status AS document_status
      FROM pic_review_requests r
      LEFT JOIN procedure_documents pd ON pd.nomor_dokumen = r.nomor_dokumen
      WHERE r.pic_id = $1
      ORDER BY r.created_at DESC
    `, [picId]);

    return NextResponse.json({
      requests: result.rows.map((row: any) => ({
        id:             row.id,
        nomorDokumen:   row.nomor_dokumen,
        namaDokumen:    row.nama_dokumen,
        notes:          row.notes,
        status:         row.status,
        documentStatus: row.document_status,
        createdAt:      row.created_at,
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