// app/api/reviews/route.ts
//
// Perubahan dari versi sebelumnya:
// — POST & PATCH: saat PIC submit review, set:
//     last_reviewed_at = NOW()   ← timestamp review terbaru
//     review_seen_at   = NULL    ← reset agar badge "Baru Direview" muncul kembali
// — 🆕 activityType log SEKARANG dipecah berdasarkan status yang diberikan
//   (review_relevan / review_revisi / review_obsolete), bukan 'review'
//   generik lagi — supaya admin bisa filter "Aktivitas Terbaru" per status
//   hasil review PIC (siapa & kapan kasih Relevan/Revisi/Obsolete), bukan
//   semuanya nyampur di satu badge "Review".
//
// Tidak ada perubahan pada logika status, revisi, atau kolom lainnya.

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logActivity, type ActivityType } from '@/lib/activityLogger';

// 🆕 Map status hasil review ke activityType yang lebih spesifik.
// Fallback ke 'review' generik kalau ada status di luar 3 ini (seharusnya
// tidak pernah terjadi karena StatusType hanya mengizinkan Relevan/Revisi/
// Obsolete untuk hasil review, tapi tetap dijaga supaya tidak error).
function reviewActivityType(status: string): ActivityType {
  if (status === 'Relevan')  return 'review_relevan';
  if (status === 'Revisi')   return 'review_revisi';
  if (status === 'Obsolete') return 'review_obsolete';
  return 'review';
}

// ─── GET — Ambil review berdasarkan nomorDokumen dan bulan ────────────────────
export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    const { searchParams } = new URL(request.url);
    const nomorDokumen     = searchParams.get('nomorDokumen');
    const month            = searchParams.get('month');

    if (!nomorDokumen || !month) {
      return NextResponse.json(
        { error: 'nomorDokumen and month are required' },
        { status: 400 }
      );
    }

    const result = await client.query(
      `SELECT * FROM document_reviews
       WHERE nomor_dokumen = $1 AND last_reviewed_month = $2`,
      [nomorDokumen, parseInt(month)]
    );

    if (result.rows.length === 0) return NextResponse.json(null);

    const row = result.rows[0];
    return NextResponse.json({
      id:                row.id,
      nomorDokumen:      row.nomor_dokumen,
      status:            row.status,
      revisi:            row.revisi,
      lastReviewedMonth: row.last_reviewed_month,
      createdAt:         row.created_at,
      updatedAt:         row.updated_at,
    });
  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json({ error: 'Failed to fetch review' }, { status: 500 });
  } finally {
    client.release();
  }
}

// ─── POST — Simpan/update review (single) ────────────────────────────────────
export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const { nomorDokumen, status, revisi, lastReviewedMonth } = body;

    // Ambil nama dokumen untuk log activity
    const docResult = await client.query(
      'SELECT nama_dokumen FROM procedure_documents WHERE nomor_dokumen = $1',
      [nomorDokumen]
    );
    const namaDokumen = docResult.rows[0]?.nama_dokumen || nomorDokumen;

    await client.query('BEGIN');

    // Upsert ke tabel document_reviews
    const reviewResult = await client.query(
      `INSERT INTO document_reviews (nomor_dokumen, status, revisi, last_reviewed_month)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (nomor_dokumen, last_reviewed_month)
       DO UPDATE SET
         status     = EXCLUDED.status,
         revisi     = EXCLUDED.revisi,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [nomorDokumen, status, revisi, lastReviewedMonth]
    );

    // Update procedure_documents:
    // • last_reviewed_at = NOW()  → catat waktu review terbaru
    // • review_seen_at   = NULL   → reset agar badge muncul kembali di halaman admin
    await client.query(
      `UPDATE procedure_documents
       SET status           = $1,
           revisi           = $2,
           last_reviewed_at = NOW(),
           review_seen_at   = NULL,
           updated_at       = CURRENT_TIMESTAMP
       WHERE nomor_dokumen  = $3`,
      [status, revisi, nomorDokumen]
    );

    await client.query('COMMIT');

    await logActivity({
      username:            'user',
      activityType:        reviewActivityType(status), // 🆕
      activityDescription: `Review ${status} untuk ${namaDokumen}`,
      targetType:          'review',
      targetId:            nomorDokumen,
    });

    const row = reviewResult.rows[0];
    return NextResponse.json({
      id:                row.id,
      nomorDokumen:      row.nomor_dokumen,
      status:            row.status,
      revisi:            row.revisi,
      lastReviewedMonth: row.last_reviewed_month,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving review:', error);
    return NextResponse.json({ error: 'Failed to save review' }, { status: 500 });
  } finally {
    client.release();
  }
}

// ─── PATCH — Batch update reviews ────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const client = await pool.connect();

  try {
    const body             = await request.json();
    const { reviews, username } = body;

    await client.query('BEGIN');

    for (const review of reviews) {
      // Ambil nama dokumen untuk log activity
      const docResult = await client.query(
        'SELECT nama_dokumen FROM procedure_documents WHERE nomor_dokumen = $1',
        [review.nomorDokumen]
      );
      const namaDokumen = docResult.rows[0]?.nama_dokumen || review.nomorDokumen;

      await client.query(
        `INSERT INTO document_reviews (nomor_dokumen, status, revisi, last_reviewed_month)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (nomor_dokumen, last_reviewed_month)
         DO UPDATE SET
           status     = EXCLUDED.status,
           revisi     = EXCLUDED.revisi,
           updated_at = CURRENT_TIMESTAMP`,
        [review.nomorDokumen, review.status, review.revisi, review.lastReviewedMonth]
      );

      // Update procedure_documents:
      // • last_reviewed_at = NOW()  → catat waktu review terbaru
      // • review_seen_at   = NULL   → reset agar badge muncul kembali di halaman admin
      await client.query(
        `UPDATE procedure_documents
         SET status           = $1,
             revisi           = $2,
             last_reviewed_at = NOW(),
             review_seen_at   = NULL,
             updated_at       = CURRENT_TIMESTAMP
         WHERE nomor_dokumen  = $3`,
        [review.status, review.revisi, review.nomorDokumen]
      );

      await logActivity({
        username:            username || 'user',
        activityType:        reviewActivityType(review.status), // 🆕
        activityDescription: `Batch review ${review.status} untuk ${namaDokumen}`,
        targetType:          'review',
        targetId:            review.nomorDokumen,
      });
    }

    await client.query('COMMIT');

    return NextResponse.json({ success: true, count: reviews.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error batch updating reviews:', error);
    return NextResponse.json({ error: 'Failed to batch update reviews' }, { status: 500 });
  } finally {
    client.release();
  }
}