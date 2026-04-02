import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logActivity } from '@/lib/activityLogger';

// GET - Ambil review berdasarkan nomorDokumen dan bulan
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const { searchParams } = new URL(request.url);
    const nomorDokumen = searchParams.get('nomorDokumen');
    const month = searchParams.get('month');

    if (!nomorDokumen || !month) {
      return NextResponse.json(
        { error: 'nomorDokumen and month are required' },
        { status: 400 }
      );
    }

    const query = `
      SELECT * FROM document_reviews 
      WHERE nomor_dokumen = $1 AND last_reviewed_month = $2
    `;

    const result = await client.query(query, [nomorDokumen, parseInt(month)]);

    if (result.rows.length === 0) {
      return NextResponse.json(null);
    }

    const row = result.rows[0];
    const review = {
      id: row.id,
      nomorDokumen: row.nomor_dokumen,
      status: row.status,
      revisi: row.revisi,
      lastReviewedMonth: row.last_reviewed_month,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// POST - Simpan/update review
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { nomorDokumen, status, revisi, lastReviewedMonth } = body;

    // Ambil nama dokumen dari database
    const docQuery = 'SELECT nama_dokumen FROM procedure_documents WHERE nomor_dokumen = $1';
    const docResult = await client.query(docQuery, [nomorDokumen]);
    const namaDokumen = docResult.rows[0]?.nama_dokumen || nomorDokumen;

    await client.query('BEGIN');

    // Upsert review
    const upsertQuery = `
      INSERT INTO document_reviews (nomor_dokumen, status, revisi, last_reviewed_month)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (nomor_dokumen, last_reviewed_month)
      DO UPDATE SET 
        status = EXCLUDED.status,
        revisi = EXCLUDED.revisi,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const reviewResult = await client.query(upsertQuery, [
      nomorDokumen,
      status,
      revisi,
      lastReviewedMonth
    ]);

    // Update procedure document
    const updateProcedureQuery = `
      UPDATE procedure_documents 
      SET status = $1, revisi = $2, updated_at = CURRENT_TIMESTAMP
      WHERE nomor_dokumen = $3
    `;

    await client.query(updateProcedureQuery, [status, revisi, nomorDokumen]);

    await client.query('COMMIT');

    // ✅ Tambahkan log activity setelah review berhasil disimpan
    await logActivity({
      username: 'user', // bisa diganti dengan username dari session
      activityType: 'review',
      activityDescription: `Review ${status} untuk ${namaDokumen}`,
      targetType: 'review',
      targetId: nomorDokumen,
    });

    const row = reviewResult.rows[0];
    const review = {
      id: row.id,
      nomorDokumen: row.nomor_dokumen,
      status: row.status,
      revisi: row.revisi,
      lastReviewedMonth: row.last_reviewed_month,
    };

    return NextResponse.json(review);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving review:', error);
    return NextResponse.json(
      { error: 'Failed to save review' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// PATCH - Batch update reviews
export async function PATCH(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { reviews, username } = body; // ✅ AMBIL username dari request

    await client.query('BEGIN');

    for (const review of reviews) {
      // Ambil nama dokumen dari database
      const docQuery = 'SELECT nama_dokumen FROM procedure_documents WHERE nomor_dokumen = $1';
      const docResult = await client.query(docQuery, [review.nomorDokumen]);
      const namaDokumen = docResult.rows[0]?.nama_dokumen || review.nomorDokumen;

      const upsertQuery = `
        INSERT INTO document_reviews (nomor_dokumen, status, revisi, last_reviewed_month)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (nomor_dokumen, last_reviewed_month)
        DO UPDATE SET 
          status = EXCLUDED.status,
          revisi = EXCLUDED.revisi,
          updated_at = CURRENT_TIMESTAMP
      `;

      await client.query(upsertQuery, [
        review.nomorDokumen,
        review.status,
        review.revisi,
        review.lastReviewedMonth
      ]);

      const updateProcedureQuery = `
        UPDATE procedure_documents 
        SET status = $1, revisi = $2, updated_at = CURRENT_TIMESTAMP
        WHERE nomor_dokumen = $3
      `;

      await client.query(updateProcedureQuery, [
        review.status,
        review.revisi,
        review.nomorDokumen
      ]);

      // ✅ GUNAKAN USERNAME YANG DIKIRIM (PIC atau admin)
      const actorUsername = username || 'user';
      await logActivity({
        username: actorUsername,
        activityType: 'review',
        activityDescription: `Batch review ${review.status} untuk ${namaDokumen}`,
        targetType: 'review',
        targetId: review.nomorDokumen,
      });
    }

    await client.query('COMMIT');

    return NextResponse.json({ success: true, count: reviews.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error batch updating reviews:', error);
    return NextResponse.json(
      { error: 'Failed to batch update reviews' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}