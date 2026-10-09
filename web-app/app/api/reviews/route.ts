// app/api/reviews/route.ts
//
// Perubahan dari versi sebelumnya:
// — POST & PATCH: saat PIC submit review, set:
//     last_reviewed_at = NOW()   ← timestamp review terbaru
//     review_seen_at   = NULL    ← reset agar badge "Baru Direview" muncul kembali
// — activityType log dipecah berdasarkan status yang diberikan
//   (review_relevan / review_revisi / review_obsolete), bukan 'review'
//   generik lagi — supaya admin bisa filter "Aktivitas Terbaru" per status
//   hasil review PIC.
// — 🆕 Kalau dokumen ini direview di bawah jadwal MANUAL (is_manual = TRUE
//   di email_schedules — di-set oleh app/api/email-schedules/route.ts saat
//   admin klik "Atur Jadwal"), tanggal_selesai_approval OTOMATIS di-reset ke
//   TANGGAL REVIEW INI (hari ini), lalu is_manual dikembalikan ke FALSE.
//   Ini supaya siklus tahunan berikutnya berpatokan ke tanggal review yang
//   baru & relevan, bukan tanggal approval lama yang sudah tidak berarti.
//   Untuk review yang terjadi lewat siklus tahunan biasa (is_manual = FALSE
//   atau tidak ada baris jadwal sama sekali), tanggal_selesai_approval TIDAK
//   disentuh — perilaku lama tetap berlaku.

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logActivity, type ActivityType } from '@/lib/activityLogger';
import { incrementRevision } from '@/lib/revisionHelper';

// Map status hasil review ke activityType yang lebih spesifik.
function reviewActivityType(status: string): ActivityType {
  if (status === 'Relevan')  return 'review_relevan';
  if (status === 'Revisi')   return 'review_revisi';
  if (status === 'Obsolete') return 'review_obsolete';
  return 'review';
}

// 🆕 Kalau dokumen ini sedang dalam jadwal manual, reset tanggal_selesai_approval
// ke hari ini & matikan flag is_manual. Dipanggil setelah status/revisi
// tersimpan, di dalam transaksi yang sama.
async function maybeResetApprovalDateForManualSchedule(
  client: any,
  nomorDokumen: string
): Promise<void> {
  const scheduleCheck = await client.query(
    `SELECT is_manual FROM email_schedules WHERE nomor_dokumen = $1`,
    [nomorDokumen]
  );
  if (!scheduleCheck.rows[0]?.is_manual) return;

  await client.query(
    `UPDATE procedure_documents
     SET tanggal_selesai_approval = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
     WHERE nomor_dokumen = $1`,
    [nomorDokumen]
  );
  await client.query(
    `UPDATE email_schedules SET is_manual = FALSE, updated_at = CURRENT_TIMESTAMP
     WHERE nomor_dokumen = $1`,
    [nomorDokumen]
  );
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

    // Ambil nama dokumen, status lama, dan revisi lama
    const docResult = await client.query(
      'SELECT nama_dokumen, status, revisi FROM procedure_documents WHERE nomor_dokumen = $1',
      [nomorDokumen]
    );
    const namaDokumen = docResult.rows[0]?.nama_dokumen || nomorDokumen;
    const prevStatus = docResult.rows[0]?.status;
    const currentDocRevisi = docResult.rows[0]?.revisi || '0';

    // 🚀 Jika status dokumen awalnya 'Revisi' dan sekarang diubah menjadi 'Relevan',
    // nomor revisi otomatis bertambah 1
    let finalRevisi = revisi || currentDocRevisi;
    if (prevStatus === 'Revisi' && status === 'Relevan') {
      finalRevisi = incrementRevision(currentDocRevisi);
    }

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
      [nomorDokumen, status, finalRevisi, lastReviewedMonth]
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
      [status, finalRevisi, nomorDokumen]
    );

    // 🆕 Reset tanggal_selesai_approval kalau dokumen ini direview di bawah
    // jadwal manual (Atur Jadwal).
    await maybeResetApprovalDateForManualSchedule(client, nomorDokumen);

    // 🆕 Jika status menjadi 'Relevan', selesaikan request revisi aktif milik dokumen ini
    if (status === 'Relevan') {
      await client.query(
        `UPDATE pic_review_requests
         SET status = 'completed', updated_at = CURRENT_TIMESTAMP
         WHERE nomor_dokumen = $1 AND status = 'pending'`,
        [nomorDokumen]
      );
    }

    await client.query('COMMIT');

    await logActivity({
      username:            'user',
      activityType:        reviewActivityType(status),
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
      // Ambil nama dokumen, status lama, dan revisi lama
      const docResult = await client.query(
        'SELECT nama_dokumen, status, revisi FROM procedure_documents WHERE nomor_dokumen = $1',
        [review.nomorDokumen]
      );
      const namaDokumen = docResult.rows[0]?.nama_dokumen || review.nomorDokumen;
      const prevStatus = docResult.rows[0]?.status;
      const currentDocRevisi = docResult.rows[0]?.revisi || '0';

      // 🚀 Jika status dokumen awalnya 'Revisi' dan sekarang diubah menjadi 'Relevan',
      // nomor revisi otomatis bertambah 1
      let finalRevisi = review.revisi || currentDocRevisi;
      if (prevStatus === 'Revisi' && review.status === 'Relevan') {
        finalRevisi = incrementRevision(currentDocRevisi);
      }

      await client.query(
        `INSERT INTO document_reviews (nomor_dokumen, status, revisi, last_reviewed_month)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (nomor_dokumen, last_reviewed_month)
         DO UPDATE SET
           status     = EXCLUDED.status,
           revisi     = EXCLUDED.revisi,
           updated_at = CURRENT_TIMESTAMP`,
        [review.nomorDokumen, review.status, finalRevisi, review.lastReviewedMonth]
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
        [review.status, finalRevisi, review.nomorDokumen]
      );

      // 🆕 Sama seperti di POST — reset tanggal_selesai_approval kalau
      // dokumen ini direview di bawah jadwal manual (Atur Jadwal).
      await maybeResetApprovalDateForManualSchedule(client, review.nomorDokumen);

      // 🆕 Jika status menjadi 'Relevan', selesaikan request revisi aktif milik dokumen ini
      if (review.status === 'Relevan') {
        await client.query(
          `UPDATE pic_review_requests
           SET status = 'completed', updated_at = CURRENT_TIMESTAMP
           WHERE nomor_dokumen = $1 AND status = 'pending'`,
          [review.nomorDokumen]
        );
      }

      await logActivity({
        username:            username || 'user',
        activityType:        reviewActivityType(review.status),
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