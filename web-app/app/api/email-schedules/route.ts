// app/api/email-schedules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const nomorDokumen = searchParams.get('nomorDokumen');

    let query = `
      SELECT
        es.id,
        es.nomor_dokumen,
        es.scheduled_email_at,
        es.email_status,
        es.last_sent_at,
        es.retry_count,
        es.error_message,
        es.cycle_deadline_at,
        es.is_manual,
        es.previous_status,
        es.created_at,
        es.updated_at,
        pd.nama_dokumen,
        pd.pic,
        pd.email
      FROM email_schedules es
      LEFT JOIN procedure_documents pd ON es.nomor_dokumen = pd.nomor_dokumen
    `;
    let values: any[] = [];

    if (nomorDokumen) {
      query += ' WHERE es.nomor_dokumen = $1';
      values = [nomorDokumen];
    }

    query += ' ORDER BY es.scheduled_email_at ASC';

    const result = await client.query(query, values);

    return NextResponse.json(result.rows.map((row) => ({
      id: row.id,
      nomorDokumen: row.nomor_dokumen,
      scheduledEmailAt: row.scheduled_email_at,
      emailStatus: row.email_status,
      lastSentAt: row.last_sent_at,
      retryCount: row.retry_count,
      errorMessage: row.error_message,
      cycleDeadlineAt: row.cycle_deadline_at,
      isManual: row.is_manual,
      previousStatus: row.previous_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      namaDokumen: row.nama_dokumen,
      pic: row.pic,
      email: row.email,
    })));
  } catch (error) {
    console.error('Error fetching email schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch email schedules' }, { status: 500 });
  } finally {
    client.release();
  }
}

// PUT
//
// 🆕 Dipakai fitur "Atur Jadwal" di /status-review. Selain menyimpan tanggal
// kirim, sekarang juga menghitung:
//   - cycle_deadline_at          = tanggal ini + 2 bulan (T-0, dipakai
//                                  app/api/procedures/route.ts untuk
//                                  menentukan kapan dokumen auto-jadi Relevan)
//   - manager_email_scheduled_at = tanggal ini + 1 bulan (eskalasi manager
//                                  kalau PIC belum review dalam 1 bulan)
//   - is_manual = TRUE           = penanda bahwa jadwal ini dibuat manual
//                                  oleh admin, BUKAN siklus tahunan otomatis
//                                  — dibaca oleh app/api/reviews/route.ts
//                                  untuk tahu kapan tanggal_selesai_approval
//                                  perlu di-reset ke tanggal review.
//   - previous_status            = menyimpan status dokumen sebelum dijadwalkan
//                                  (Relevan / Revisi) agar bisa dikembalikan
//                                  jika jadwal dibatalkan (cancel).
export async function PUT(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { nomorDokumen, scheduledEmailAt, emailStatus } = body;

    if (!nomorDokumen || !scheduledEmailAt) {
      return NextResponse.json(
        { error: 'Nomor dokumen dan scheduled email at harus diisi' },
        { status: 400 }
      );
    }

    // Validasi tanggal — bandingkan hanya bagian YYYY-MM-DD untuk menghindari
    // bug timezone antara browser (WIB) dan server Node.js (UTC)
    if (emailStatus !== 'sent') {
      const scheduledDateOnly = scheduledEmailAt.split('T')[0];
      const todayDateOnly = new Date().toISOString().split('T')[0];
      if (scheduledDateOnly < todayDateOnly) {
        return NextResponse.json(
          { error: 'Tanggal pengiriman tidak boleh sebelum hari ini' },
          { status: 400 }
        );
      }
    }

    const currentScheduleStatus = emailStatus || 'pending';

    // Saat admin bikin/reset jadwal MANUAL (emailStatus 'pending'), hitung
    // cycle_deadline_at (T-0, 2 bulan dari tanggal ini) dan
    // manager_email_scheduled_at (T+1 bulan).
    let cycleDeadlineAt: Date | null = null;
    let managerScheduledAt: Date | null = null;
    if (currentScheduleStatus === 'pending') {
      const base = new Date(scheduledEmailAt);
      cycleDeadlineAt    = new Date(base.getFullYear(), base.getMonth() + 2, base.getDate(), base.getHours(), base.getMinutes());
      managerScheduledAt = new Date(base.getFullYear(), base.getMonth() + 1, base.getDate(), base.getHours(), base.getMinutes());
    }

    await client.query('BEGIN');

    // Cek status saat ini dari procedure_documents sebelum diubah ke 'Belum dikirim'
    const docCheck = await client.query(
      `SELECT status FROM procedure_documents WHERE nomor_dokumen = $1`,
      [nomorDokumen]
    );
    const existingDocStatus = docCheck.rows[0]?.status;

    // Simpan status sebelumnya jika valid (misal: Relevan, Revisi, Obsolete)
    let prevStatusToSave: string | null = null;
    if (existingDocStatus && !['Belum dikirim', 'Telah terkirim', 'Telah dibaca'].includes(existingDocStatus)) {
      prevStatusToSave = existingDocStatus;
    }

    // Upsert email schedule
    const checkResult = await client.query(
      'SELECT id, previous_status FROM email_schedules WHERE nomor_dokumen = $1',
      [nomorDokumen]
    );
    let result;

    if (checkResult.rows.length > 0) {
      result = await client.query(
        `UPDATE email_schedules
         SET
           scheduled_email_at          = $1,
           email_status                = $2::varchar,
           error_message               = NULL,
           last_sent_at                = CASE WHEN $2::varchar = 'pending' THEN NULL ELSE last_sent_at END,
           cycle_deadline_at           = COALESCE($3, cycle_deadline_at),
           manager_email_scheduled_at  = COALESCE($4, manager_email_scheduled_at),
           manager_email_status        = CASE WHEN $2::varchar = 'pending' THEN 'not_applicable' ELSE manager_email_status END,
           is_manual                   = CASE WHEN $2::varchar = 'pending' THEN TRUE ELSE is_manual END,
           previous_status             = COALESCE($5, previous_status),
           updated_at                  = CURRENT_TIMESTAMP
         WHERE nomor_dokumen = $6
         RETURNING *`,
        [scheduledEmailAt, currentScheduleStatus, cycleDeadlineAt, managerScheduledAt, prevStatusToSave, nomorDokumen]
      );
    } else {
      result = await client.query(
        `INSERT INTO email_schedules
           (nomor_dokumen, scheduled_email_at, email_status, cycle_deadline_at, manager_email_scheduled_at, manager_email_status, is_manual, previous_status)
         VALUES ($1, $2, $3, $4, $5, 'not_applicable', TRUE, $6)
         RETURNING *`,
        [nomorDokumen, scheduledEmailAt, currentScheduleStatus, cycleDeadlineAt, managerScheduledAt, prevStatusToSave]
      );
    }

    if (currentScheduleStatus === 'pending') {
      // Admin secara eksplisit membuat/mengupdate jadwal baru →
      // reset status dokumen ke "Belum dikirim" tanpa pengecualian apapun.
      await client.query(
        `UPDATE procedure_documents
         SET status = 'Belum dikirim', updated_at = CURRENT_TIMESTAMP
         WHERE nomor_dokumen = $1`,
        [nomorDokumen]
      );
    } else if (currentScheduleStatus === 'sent') {
      // Dipanggil sistem pengirim email saat email berhasil terkirim
      await client.query(
        `UPDATE procedure_documents
         SET status = 'Telah terkirim', updated_at = CURRENT_TIMESTAMP
         WHERE nomor_dokumen = $1
           AND status NOT IN ('Relevan', 'Revisi', 'Obsolete', 'Telah dibaca')`,
        [nomorDokumen]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({ success: true, schedule: result.rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating email schedule:', error);
    return NextResponse.json({ error: 'Failed to update email schedule' }, { status: 500 });
  } finally {
    client.release();
  }
}

// DELETE - Cancel jadwal email dan kembalikan status dokumen ke status terakhir (Relevan/Revisi)
export async function DELETE(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const nomorDokumenParam = searchParams.get('nomorDokumen');

    let bodyData: any = {};
    try {
      bodyData = await request.json();
    } catch {}

    const docsToCancel: string[] = Array.isArray(bodyData.nomorDokumenList)
      ? bodyData.nomorDokumenList
      : bodyData.nomorDokumen
      ? [bodyData.nomorDokumen]
      : nomorDokumenParam
      ? [nomorDokumenParam]
      : [];

    if (docsToCancel.length === 0) {
      return NextResponse.json(
        { error: 'nomorDokumen atau nomorDokumenList harus diisi' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    const results: Array<{ nomorDokumen: string; restoredStatus: string }> = [];

    for (const docNo of docsToCancel) {
      // 1. Ambil previous_status dan email_status saat ini
      const schedCheck = await client.query(
        `SELECT es.previous_status, es.email_status, pd.status AS current_doc_status
         FROM email_schedules es
         LEFT JOIN procedure_documents pd ON pd.nomor_dokumen = es.nomor_dokumen
         WHERE es.nomor_dokumen = $1`,
        [docNo]
      );

      const row = schedCheck.rows[0];
      let targetStatus = row?.previous_status;

      // Jika previous_status kosong atau tidak valid, cari status dari riwayat review terakhir
      if (!targetStatus || ['Belum dikirim', 'Telah terkirim', 'Telah dibaca'].includes(targetStatus)) {
        const revCheck = await client.query(
          `SELECT status FROM document_reviews
           WHERE nomor_dokumen = $1
           ORDER BY updated_at DESC, id DESC
           LIMIT 1`,
          [docNo]
        );
        targetStatus = revCheck.rows[0]?.status;
      }

      // Default jika belum ada riwayat adalah 'Relevan'
      if (!targetStatus || ['Belum dikirim', 'Telah terkirim', 'Telah dibaca'].includes(targetStatus)) {
        targetStatus = 'Relevan';
      }

      // 2. Batalkan jadwal email
      await client.query(
        `UPDATE email_schedules
         SET email_status = 'cancelled', is_manual = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE nomor_dokumen = $1`,
        [docNo]
      );

      // 3. Kembalikan status dokumen ke status terakhir HANYA jika saat ini dokumen dalam mode jadwal ('Belum dikirim')
      // Jika dokumen sudah direview (misal Relevan/Revisi/Obsolete oleh PIC), status tersebut tidak di-overwrite.
      if (!row || row.current_doc_status === 'Belum dikirim' || row.current_doc_status === 'Telah terkirim') {
        await client.query(
          `UPDATE procedure_documents
           SET status = $1, updated_at = CURRENT_TIMESTAMP
           WHERE nomor_dokumen = $2`,
          [targetStatus, docNo]
        );
      } else {
        targetStatus = row.current_doc_status;
      }

      results.push({ nomorDokumen: docNo, restoredStatus: targetStatus });
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      cancelled: results.length,
      restoredStatus: results[0]?.restoredStatus,
      results,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error cancelling email schedule:', error);
    return NextResponse.json(
      { error: 'Gagal membatalkan jadwal email' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}