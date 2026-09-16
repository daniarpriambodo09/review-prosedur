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
    // manager_email_scheduled_at (T+1 bulan) — supaya jadwal manual punya
    // siklus lengkap yang SAMA seperti reminder otomatis (email PIC ->
    // eskalasi manager kalau 1 bulan belum direview -> auto Relevan kalau
    // 2 bulan total belum direview).
    let cycleDeadlineAt: Date | null = null;
    let managerScheduledAt: Date | null = null;
    if (currentScheduleStatus === 'pending') {
      const base = new Date(scheduledEmailAt);
      cycleDeadlineAt    = new Date(base.getFullYear(), base.getMonth() + 2, base.getDate(), base.getHours(), base.getMinutes());
      managerScheduledAt = new Date(base.getFullYear(), base.getMonth() + 1, base.getDate(), base.getHours(), base.getMinutes());
    }

    await client.query('BEGIN');

    // Upsert email schedule
    const checkResult = await client.query(
      'SELECT id FROM email_schedules WHERE nomor_dokumen = $1',
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
           updated_at                  = CURRENT_TIMESTAMP
         WHERE nomor_dokumen = $5
         RETURNING *`,
        [scheduledEmailAt, currentScheduleStatus, cycleDeadlineAt, managerScheduledAt, nomorDokumen]
      );
    } else {
      result = await client.query(
        `INSERT INTO email_schedules
           (nomor_dokumen, scheduled_email_at, email_status, cycle_deadline_at, manager_email_scheduled_at, manager_email_status, is_manual)
         VALUES ($1, $2, $3, $4, $5, 'not_applicable', TRUE)
         RETURNING *`,
        [nomorDokumen, scheduledEmailAt, currentScheduleStatus, cycleDeadlineAt, managerScheduledAt]
      );
    }

    if (currentScheduleStatus === 'pending') {
      // Admin secara eksplisit membuat/mengupdate jadwal baru →
      // reset status dokumen ke "Belum dikirim" tanpa pengecualian apapun.
      // Ini berlaku meski status sebelumnya Revisi, Obsolete, atau Relevan
      // karena admin memulai siklus review baru.
      await client.query(
        `UPDATE procedure_documents
         SET status = 'Belum dikirim', updated_at = CURRENT_TIMESTAMP
         WHERE nomor_dokumen = $1`,
        [nomorDokumen]
      );
    } else if (currentScheduleStatus === 'sent') {
      // Dipanggil sistem pengirim email (bukan admin) saat email berhasil terkirim →
      // ubah ke "Telah terkirim" HANYA jika PIC belum lebih maju
      // (belum membaca atau belum submit hasil review)
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

// DELETE - Cancel jadwal email (set status = 'cancelled')
// Dipanggil saat status dokumen berubah dari "Telah terkirim" ke status lain
export async function DELETE(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const nomorDokumen = searchParams.get('nomorDokumen');

    if (!nomorDokumen) {
      return NextResponse.json(
        { error: 'nomorDokumen harus diisi' },
        { status: 400 }
      );
    }

    const result = await client.query(
      `UPDATE email_schedules
       SET email_status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE nomor_dokumen = $1
         AND email_status = 'sent'
       RETURNING nomor_dokumen, email_status`,
      [nomorDokumen]
    );

    return NextResponse.json({
      success: true,
      cancelled: result.rowCount ?? 0,
    });
  } catch (error) {
    console.error('Error cancelling email schedule:', error);
    return NextResponse.json(
      { error: 'Failed to cancel email schedule' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}