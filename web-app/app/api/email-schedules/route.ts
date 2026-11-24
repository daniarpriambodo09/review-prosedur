// app/api/email-schedules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool, { formatTimestampLocal } from '@/lib/db';

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
        es.manager_email_scheduled_at,
        es.manager_email_status,
        es.manager_email_sent_at,
        es.manager_name,
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
      managerEmailScheduledAt: row.manager_email_scheduled_at,
      managerEmailStatus: row.manager_email_status,
      managerEmailSentAt: row.manager_email_sent_at,
      managerName: row.manager_name,
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

    // Validasi tanggal — gunakan tanggal hari ini dalam timezone Asia/Jakarta (WIB)
    if (emailStatus !== 'sent') {
      const scheduledDateOnly = scheduledEmailAt.split('T')[0].split(' ')[0];
      const todayDateOnly = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
      if (scheduledDateOnly < todayDateOnly) {
        return NextResponse.json(
          { error: 'Tanggal pengiriman tidak boleh sebelum hari ini' },
          { status: 400 }
        );
      }
    }

    const currentScheduleStatus = emailStatus || 'pending';

    // Normalisasi scheduledEmailAt menjadi string format lokal 'YYYY-MM-DD HH:mm:ss'
    const scheduledEmailAtFormatted = typeof scheduledEmailAt === 'string'
      ? scheduledEmailAt.replace('T', ' ')
      : scheduledEmailAt;

    // Saat admin bikin/reset jadwal MANUAL (emailStatus 'pending'), hitung
    // cycle_deadline_at (T-0, 2 bulan dari tanggal ini) dan
    // manager_email_scheduled_at (T+1 bulan).
    let cycleDeadlineAtStr: string | null = null;
    let managerScheduledAtStr: string | null = null;
    if (currentScheduleStatus === 'pending') {
      const isoStr = scheduledEmailAt.includes('T') ? scheduledEmailAt : scheduledEmailAt.replace(' ', 'T');
      const base = new Date(isoStr);
      const cycleDeadlineAt = new Date(base.getFullYear(), base.getMonth() + 2, base.getDate(), base.getHours(), base.getMinutes(), 0);
      const managerScheduledAt = new Date(base.getFullYear(), base.getMonth() + 1, base.getDate(), base.getHours(), base.getMinutes(), 0);
      cycleDeadlineAtStr = formatTimestampLocal(cycleDeadlineAt);
      managerScheduledAtStr = formatTimestampLocal(managerScheduledAt);
    }

    await client.query('BEGIN');

    // Cek status saat ini dari procedure_documents sebelum diubah ke 'Belum dikirim ke PIC'
    const docCheck = await client.query(
      `SELECT status FROM procedure_documents WHERE nomor_dokumen = $1`,
      [nomorDokumen]
    );
    const existingDocStatus = docCheck.rows[0]?.status;

    // Simpan status sebelumnya jika valid (misal: Relevan, Revisi, Obsolete)
    let prevStatusToSave: string | null = null;
    const isWorkflowStatus = (s?: string) => !s || s.startsWith('Belum dikirim') || s.startsWith('Telah terkirim') || s === 'Telah dibaca' || s === 'Menunggu' || s === '-';
    if (existingDocStatus && !isWorkflowStatus(existingDocStatus)) {
      prevStatusToSave = existingDocStatus;
    }

    // Resolusi nama manager dari staff_directory
    const mgrCheck = await client.query(`
      SELECT string_agg(DISTINCT m.nama, ', ') as mgr_name
      FROM procedure_documents pd
      LEFT JOIN (
        SELECT 
          s.kode,
          s.unit_type,
          s.unit_id,
          CASE 
            WHEN s.unit_type = 'department' THEN s.unit_id
            WHEN s.unit_type = 'section' THEN sec.department_id
          END AS dept_id
        FROM staff_directory s
        LEFT JOIN sections sec ON s.unit_type = 'section' AND sec.id = s.unit_id
      ) pinfo ON pinfo.kode = UPPER(SPLIT_PART(REPLACE(pd.pic, ' ', ''), ',', 1))
      LEFT JOIN staff_directory m ON m.is_manager = true
      LEFT JOIN sections msec ON m.unit_type = 'section' AND msec.id = m.unit_id
      LEFT JOIN department_managers dm ON dm.manager_kode = m.kode
      WHERE pd.nomor_dokumen = $1
        AND (
          (pinfo.dept_id IS NOT NULL AND dm.department_id = pinfo.dept_id)
          OR (pinfo.dept_id IS NOT NULL AND (
              (m.unit_type = 'department' AND m.unit_id = pinfo.dept_id)
              OR (m.unit_type = 'section' AND msec.department_id = pinfo.dept_id)
          ))
          OR (pinfo.unit_type = 'section' AND m.unit_type = 'section' AND m.unit_id = pinfo.unit_id)
          OR (m.unit_type = 'department' AND EXISTS (
              SELECT 1 FROM departments d WHERE d.id = m.unit_id AND UPPER(d.nama) = UPPER(pd.owner)
          ))
          OR (m.unit_type = 'section' AND EXISTS (
              SELECT 1 FROM sections s2 WHERE s2.id = m.unit_id AND UPPER(s2.nama) = UPPER(pd.owner)
          ))
        )
    `, [nomorDokumen]);
    const resolvedManagerName = mgrCheck.rows[0]?.mgr_name || null;

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
           manager_name                = COALESCE($5, manager_name),
           is_manual                   = CASE WHEN $2::varchar = 'pending' THEN TRUE ELSE is_manual END,
           previous_status             = COALESCE($6, previous_status),
           updated_at                  = CURRENT_TIMESTAMP
         WHERE nomor_dokumen = $7
         RETURNING *`,
        [scheduledEmailAtFormatted, currentScheduleStatus, cycleDeadlineAtStr, managerScheduledAtStr, resolvedManagerName, prevStatusToSave, nomorDokumen]
      );
    } else {
      result = await client.query(
        `INSERT INTO email_schedules
           (nomor_dokumen, scheduled_email_at, email_status, cycle_deadline_at, manager_email_scheduled_at, manager_email_status, manager_name, is_manual, previous_status)
         VALUES ($1, $2, $3, $4, $5, 'not_applicable', $6, TRUE, $7)
         RETURNING *`,
        [nomorDokumen, scheduledEmailAtFormatted, currentScheduleStatus, cycleDeadlineAtStr, managerScheduledAtStr, resolvedManagerName, prevStatusToSave]
      );
    }

    if (currentScheduleStatus === 'pending') {
      // Admin secara eksplisit membuat/mengupdate jadwal baru →
      // reset status dokumen ke "Belum dikirim ke PIC"
      await client.query(
        `UPDATE procedure_documents
         SET status = 'Belum dikirim ke PIC', updated_at = CURRENT_TIMESTAMP
         WHERE nomor_dokumen = $1`,
        [nomorDokumen]
      );
    } else if (currentScheduleStatus === 'sent') {
      // Dipanggil sistem pengirim email saat email PIC berhasil terkirim
      await client.query(
        `UPDATE procedure_documents
         SET status = 'Telah terkirim ke PIC', updated_at = CURRENT_TIMESTAMP
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
    } catch { }

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

      const isWorkflow = (s?: string) => !s || s.startsWith('Belum dikirim') || s.startsWith('Telah terkirim') || s === 'Telah dibaca' || s === 'Menunggu' || s === '-';

      // Jika previous_status kosong atau tidak valid, cari status dari riwayat review terakhir
      if (isWorkflow(targetStatus)) {
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
      if (isWorkflow(targetStatus)) {
        targetStatus = 'Relevan';
      }

      // 2. Batalkan jadwal email
      await client.query(
        `UPDATE email_schedules
         SET email_status = 'cancelled', is_manual = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE nomor_dokumen = $1`,
        [docNo]
      );

      // 3. Kembalikan status dokumen ke status terakhir HANYA jika saat ini dokumen dalam mode jadwal
      // Jika dokumen sudah direview (misal Relevan/Revisi/Obsolete oleh PIC), status tersebut tidak di-overwrite.
      if (!row || isWorkflow(row.current_doc_status)) {
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