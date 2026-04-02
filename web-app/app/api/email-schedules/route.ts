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
           scheduled_email_at = $1,
           email_status       = COALESCE($2, 'pending'),
           error_message      = NULL,
           updated_at         = CURRENT_TIMESTAMP
         WHERE nomor_dokumen = $3
         RETURNING *`,
        [scheduledEmailAt, emailStatus || 'pending', nomorDokumen]
      );
    } else {
      result = await client.query(
        `INSERT INTO email_schedules (nomor_dokumen, scheduled_email_at, email_status)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [nomorDokumen, scheduledEmailAt, emailStatus || 'pending']
      );
    }

    const currentScheduleStatus = emailStatus || 'pending';

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