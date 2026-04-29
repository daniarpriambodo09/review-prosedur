// app/api/procedures/route.ts
//
// PATCH untuk autoReactivate:
// Fungsi ini hanya mengubah bagian autoReactivate dan runAutoStatusChain.
// Salin seluruh isi file ini menggantikan app/api/procedures/route.ts yang lama.
//
// Root cause bug dokumen lama muncul:
// autoReactivate tidak punya guard "apakah approval sudah lewat 2 bulan?".
// Dokumen approval Feb/Mar yang sudah Relevan akan terus di-reactivate → Menunggu
// karena isScheduleMonthReached(Feb) = true (jadwal Des sudah jauh lewat).
// Fix: tambahkan guard isPast2Months sebelum reactivate.

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logActivity } from '@/lib/activityLogger';

const PROTECTED_STATUSES = ['Revisi', 'Obsolete', 'Relevan', 'Telah dibaca'];

function isSameMonthYear(tanggal: string): boolean {
  const d = new Date(tanggal);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function isPast2Months(tanggal: string): boolean {
  const d = new Date(tanggal);
  if (isNaN(d.getTime())) return false;
  const twoMonthsLater = new Date(d.getFullYear(), d.getMonth() + 2, d.getDate());
  return new Date() >= twoMonthsLater;
}

function isExpiredForReview(tanggalApproval: string): boolean {
  return isPast2Months(tanggalApproval);
}

function getScheduledSendDate(tanggalApproval: string): Date {
  const d = new Date(tanggalApproval);
  return new Date(d.getFullYear(), d.getMonth() - 2, d.getDate(), 8, 0, 0);
}

function resolveScheduledAt(tanggalApproval: string, needsReview: boolean | null): Date {
  const now = new Date();
  if (needsReview === true) return now;
  const autoDate = getScheduledSendDate(tanggalApproval);
  if (now >= autoDate) return now;
  return autoDate;
}

function isScheduleDateReached(tanggalApproval: string): boolean {
  const scheduledDate = getScheduledSendDate(tanggalApproval);
  return new Date() >= scheduledDate;
}

function isScheduleMonthReached(tanggalApproval: string): boolean {
  return isScheduleDateReached(tanggalApproval);
}

// ─── Langkah 1: auto-expire → Relevan setelah 2 bulan ────────────────────────
async function autoExpire(
  client: any,
  nomorDokumen: string,
  tanggal: string,
  status: string
): Promise<string> {
  if (status !== '-') return status;
  if (!isPast2Months(tanggal)) return status;

  await client.query(
    `UPDATE procedure_documents
     SET status = 'Relevan', updated_at = CURRENT_TIMESTAMP
     WHERE nomor_dokumen = $1 AND status = '-'`,
    [nomorDokumen]
  );
  return 'Relevan';
}

// ─── Langkah 2: auto-reactivate → Menunggu ───────────────────────────────────
// FIX: tambahkan guard isPast2Months.
// Dokumen yang approval-nya sudah lewat lebih dari 2 bulan (Feb, Mar, dst)
// TIDAK boleh di-reactivate, walaupun isScheduleMonthReached = true,
// karena window review-nya sudah selesai.
//
// Contoh yang HARUS di-reactivate:
//   Sekarang 22 Apr, approval 15 Jun → jadwal 15 Apr → reached, belum expired → reactivate ✓
//
// Contoh yang TIDAK boleh di-reactivate:
//   Sekarang 22 Apr, approval 22 Feb → isPast2Months = true → SKIP ✗
//   Sekarang 22 Apr, approval 11 Mar → isPast2Months = true → SKIP ✗
async function autoReactivate(
  client: any,
  nomorDokumen: string,
  tanggal: string,
  status: string
): Promise<string> {
  if (status !== 'Relevan') return status;

  // ✅ GUARD BARU: jika approval sudah lewat lebih dari 2 bulan → jangan reactivate
  // Window review sudah selesai, dokumen harus tetap Relevan
  if (isPast2Months(tanggal)) return status;

  // Aktifkan hanya jika sudah masuk jadwal kirim (2 bulan sebelum approval)
  if (!isScheduleMonthReached(tanggal)) return status;

  await client.query(
    `UPDATE procedure_documents
     SET status = 'Menunggu', updated_at = CURRENT_TIMESTAMP
     WHERE nomor_dokumen = $1 AND status = 'Relevan'`,
    [nomorDokumen]
  );
  return 'Menunggu';
}

// ─── Langkah 3: auto-schedule → Belum dikirim ────────────────────────────────
async function autoScheduleAndActivate(
  client: any,
  nomorDokumen: string,
  tanggal: string,
  status: string
): Promise<string> {
  if (status !== 'Menunggu') return status;

  const check = await client.query(
    `SELECT id FROM email_schedules WHERE nomor_dokumen = $1 LIMIT 1`,
    [nomorDokumen]
  );

  if (check.rows.length > 0) {
    await client.query(
      `UPDATE procedure_documents
       SET status = 'Belum dikirim', updated_at = CURRENT_TIMESTAMP
       WHERE nomor_dokumen = $1 AND status = 'Menunggu'`,
      [nomorDokumen]
    );
    return 'Belum dikirim';
  }

  const docDate = new Date(tanggal);
  if (isNaN(docDate.getTime())) return status;

  const scheduledAt = resolveScheduledAt(tanggal, null);

  await client.query(
    `INSERT INTO email_schedules (nomor_dokumen, scheduled_email_at, email_status)
     VALUES ($1, $2, 'pending')
     ON CONFLICT DO NOTHING`,
    [nomorDokumen, scheduledAt]
  );

  await client.query(
    `UPDATE procedure_documents
     SET status = 'Belum dikirim', updated_at = CURRENT_TIMESTAMP
     WHERE nomor_dokumen = $1 AND status = 'Menunggu'`,
    [nomorDokumen]
  );

  return 'Belum dikirim';
}

// ─── Master chain ─────────────────────────────────────────────────────────────
async function runAutoStatusChain(
  client: any,
  nomorDokumen: string,
  tanggal: string,
  dbStatus: string
): Promise<string> {
  if (PROTECTED_STATUSES.includes(dbStatus)) return dbStatus;
  if (['Belum dikirim', 'Telah terkirim'].includes(dbStatus)) return dbStatus;

  const afterExpire     = await autoExpire(client, nomorDokumen, tanggal, dbStatus);
  if (afterExpire !== dbStatus) return afterExpire;

  const afterReactivate = await autoReactivate(client, nomorDokumen, tanggal, afterExpire);
  const afterSchedule   = await autoScheduleAndActivate(client, nomorDokumen, tanggal, afterReactivate);

  return afterSchedule;
}

// ─── Resolve status awal saat dokumen baru ditambahkan ───────────────────────
async function resolveInitialStatus(
  client: any,
  nomorDokumen: string,
  tanggal: string,
  needsReview: boolean | null = null
): Promise<string> {
  if (needsReview === false) return 'Relevan';
  if (isExpiredForReview(tanggal)) return 'Relevan';
  if (!isScheduleMonthReached(tanggal)) return 'Relevan';

  if (needsReview === true || needsReview === null) {
    const schedResult = await client.query(
      `SELECT email_status FROM email_schedules WHERE nomor_dokumen = $1 LIMIT 1`,
      [nomorDokumen]
    );
    if (schedResult.rows.length > 0) {
      return schedResult.rows[0].email_status === 'sent' ? 'Telah terkirim' : 'Belum dikirim';
    }
    return 'Belum dikirim';
  }

  return 'Relevan';
}

// ── GET ─────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const picParam = searchParams.get('pic');
 
    let query: string;
    let values: any[] = [];
 
    if (picParam) {
      // FIX: Deteksi apakah parameter adalah email (mengandung '@') atau kode PIC
      if (picParam.includes('@')) {
        // Login baru: parameter adalah email lengkap seperti "dp@jai.co.id"
        // Ekstrak kode dari email: "dp@jai.co.id" → "DP"
        // Juga cari di kolom email untuk backward compat
        const emailLocalPart = picParam.split('@')[0].trim().toUpperCase();
        const picCodes = emailLocalPart
          .split(',')
          .map((c: string) => c.trim())
          .filter((c: string) => c.length > 0);
 
        const conditions: string[] = [];
        values = [];
        let idx = 1;
 
        // Match berdasarkan kode pic di kolom `pic`
        for (const code of picCodes) {
          conditions.push(
            `$${idx} = ANY(string_to_array(REPLACE(UPPER(pd.pic), ' ', ''), ','))`
          );
          values.push(code);
          idx++;
        }
 
        // Match berdasarkan email di kolom `email` (untuk data baru)
        conditions.push(`pd.email ILIKE $${idx}`);
        values.push(`%${picParam}%`);
        idx++;
 
        query = `
          SELECT pd.*,
                 es.last_sent_at,
                 es.scheduled_email_at
          FROM procedure_documents pd
          LEFT JOIN email_schedules es ON pd.nomor_dokumen = es.nomor_dokumen
          WHERE ${conditions.join(' OR ')}
          ORDER BY pd.created_at DESC
        `;
      } else {
        // Login lama / filter langsung dengan kode PIC: ?pic=DP
        // Gunakan logika exact match setelah split koma
        query = `
          SELECT pd.*,
                 es.last_sent_at,
                 es.scheduled_email_at
          FROM procedure_documents pd
          LEFT JOIN email_schedules es ON pd.nomor_dokumen = es.nomor_dokumen
          WHERE $1 = ANY(string_to_array(REPLACE(pd.pic, ' ', ''), ','))
          ORDER BY pd.created_at DESC
        `;
        values = [picParam];
      }
    } else {
      // Tidak ada filter PIC — ambil semua
      query = `
        SELECT pd.*,
               es.last_sent_at,
               es.scheduled_email_at
        FROM procedure_documents pd
        LEFT JOIN email_schedules es ON pd.nomor_dokumen = es.nomor_dokumen
        ORDER BY pd.created_at DESC
      `;
      values = [];
    }
 
    const result = await client.query(query, values);
 
    const procedures = await Promise.all(
      result.rows.map(async (row: any) => {
        const resolvedStatus = await runAutoStatusChain(
          client,
          row.nomor_dokumen,
          row.tanggal_selesai_approval,
          row.status
        );
 
        return {
          id:                     row.id,
          namaDokumen:            row.nama_dokumen,
          nomorDokumen:           row.nomor_dokumen,
          levelDokumen:           row.level_dokumen,
          tanggalSelesaiApproval: row.tanggal_selesai_approval,
          revisi:                 row.revisi,
          owner:                  row.owner,
          pic:                    row.pic,
          email:                  row.email,
          status:                 resolvedStatus,
          isCustom:               row.is_custom,
          createdAt:              row.created_at,
          updatedAt:              row.updated_at,
          lastSentAt:             row.last_sent_at        ?? null,
          scheduledEmailAt:       row.scheduled_email_at ?? null,
        };
      })
    );
 
    return NextResponse.json(procedures);
  } catch (error) {
    console.error('Error fetching procedures:', error);
    return NextResponse.json(
      { error: 'Failed to fetch procedures' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// =============================================================================
// POST — Tambah dokumen baru
// =============================================================================
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body        = await request.json();
    const needsReview: boolean | null = body.needsReview ?? null;

    const status = await resolveInitialStatus(
      client,
      body.nomorDokumen,
      body.tanggalSelesaiApproval,
      needsReview
    );

    const query = `
      INSERT INTO procedure_documents
        (nama_dokumen, nomor_dokumen, level_dokumen, tanggal_selesai_approval,
         revisi, owner, pic, email, status, is_custom)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await client.query(query, [
      body.namaDokumen,
      body.nomorDokumen,
      body.levelDokumen,
      body.tanggalSelesaiApproval,
      body.revisi || '0',
      body.owner,
      body.pic,
      body.email || '',
      status,
      true,
    ]);

    const row = result.rows[0];

    if (
      status === 'Belum dikirim' &&
      isScheduleMonthReached(body.tanggalSelesaiApproval) &&
      !isExpiredForReview(body.tanggalSelesaiApproval)
    ) {
      const existingSched = await client.query(
        `SELECT id FROM email_schedules WHERE nomor_dokumen = $1 LIMIT 1`,
        [body.nomorDokumen]
      );

      if (existingSched.rows.length === 0) {
        const scheduledAt = resolveScheduledAt(body.tanggalSelesaiApproval, needsReview);
        await client.query(
          `INSERT INTO email_schedules (nomor_dokumen, scheduled_email_at, email_status)
           VALUES ($1, $2, 'pending')`,
          [body.nomorDokumen, scheduledAt]
        );
      }
    }

    await logActivity({
      username:            'admin',
      activityType:        'create',
      activityDescription: `Tambah prosedur baru ${body.namaDokumen}`,
      targetType:          'procedure',
      targetId:            body.nomorDokumen,
    });

    return NextResponse.json(
      {
        id:                     row.id,
        namaDokumen:            row.nama_dokumen,
        nomorDokumen:           row.nomor_dokumen,
        levelDokumen:           row.level_dokumen,
        tanggalSelesaiApproval: row.tanggal_selesai_approval,
        revisi:                 row.revisi,
        owner:                  row.owner,
        pic:                    row.pic,
        email:                  row.email,
        status:                 row.status,
        isCustom:               row.is_custom,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating procedure:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Nomor dokumen sudah ada' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create procedure' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}