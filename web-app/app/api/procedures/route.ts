// app/api/procedures/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logActivity } from '@/lib/activityLogger';

// =============================================================================
// RANTAI LOGIKA AUTO-STATUS
// Urutan: autoExpire → autoReactivate → autoScheduleAndActivate
// Semua fungsi WAJIB melindungi status final: Relevan, Revisi, Obsolete, Telah dibaca
// =============================================================================

// Status yang TIDAK BOLEH di-override oleh auto-chain
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

// Apakah dokumen sudah expired dari perspektif review?
// Expired = sudah lebih dari 2 bulan sejak tanggal approval
// Dokumen expired tidak perlu masuk alur review lagi → langsung Relevan
function isExpiredForReview(tanggalApproval: string): boolean {
  return isPast2Months(tanggalApproval);
}

// Hitung tanggal jadwal kirim: 2 bulan SEBELUM bulan approval, tanggal 1
function getScheduledSendDate(tanggalApproval: string): Date {
  const d = new Date(tanggalApproval);
  return new Date(d.getFullYear(), d.getMonth() - 2, 1, 8, 0, 0);
}

// Tentukan tanggal kirim yang tepat sesuai konteks:
//
// Kondisi 1 — needsReview=true (admin pilih "Perlu Direview" saat buat dokumen):
//   Email harus langsung dikirim hari ini → scheduledAt = NOW
//
// Kondisi 2 — auto (needsReview=null), sudah reached (jadwal sudah lewat):
//   Waktunya sudah lewat, kirim sekarang → scheduledAt = NOW
//
// Kondisi 3 — auto (needsReview=null), belum reached (jadwal masih future):
//   Simpan tanggal otomatis (approval - 2 bulan) → scheduledAt = getScheduledSendDate()
//
// Contoh:
//   Approval 30 Jun, sekarang 31 Mar → schedYM=Apr < nowYM=Mar? Tidak → future → 1 Apr
//   Approval 31 Mar, sekarang 31 Mar → reached → NOW
//   needsReview=true, approval apapun → NOW
function resolveScheduledAt(tanggalApproval: string, needsReview: boolean | null): Date {
  const now = new Date();
  if (needsReview === true) return now;

  const autoDate = getScheduledSendDate(tanggalApproval);
  const schedYM  = autoDate.getFullYear() * 12 + autoDate.getMonth();
  const nowYM    = now.getFullYear() * 12 + now.getMonth();

  return nowYM >= schedYM ? now : autoDate;
}

// Apakah sudah waktunya jadwal email dikirim (sudah masuk bulan jadwal atau lewat)
function isScheduleMonthReached(tanggalApproval: string): boolean {
  const scheduledDate = getScheduledSendDate(tanggalApproval);
  const now = new Date();
  // Bandingkan hanya tahun+bulan
  const schedYM = scheduledDate.getFullYear() * 12 + scheduledDate.getMonth();
  const nowYM   = now.getFullYear() * 12 + now.getMonth();
  return nowYM >= schedYM;
}

// ─── Langkah 1: auto-expire → Relevan setelah 2 bulan ────────────────────────
// Hanya status '-' (unset) yang boleh auto-expire
async function autoExpire(
  client: any,
  nomorDokumen: string,
  tanggal: string,
  status: string
): Promise<string> {
  // Jangan sentuh status apapun selain '-'
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

// ─── Langkah 2: auto-reactivate → Menunggu jika approval bulan ini ───────────
async function autoReactivate(
  client: any,
  nomorDokumen: string,
  tanggal: string,
  status: string
): Promise<string> {
  if (status !== 'Relevan') return status;
  // Aktifkan jika sudah masuk bulan jadwal kirim (2 bulan sebelum approval)
  // Contoh: approval Mei → aktifkan mulai bulan April
  if (!isScheduleMonthReached(tanggal)) return status;

  await client.query(
    `UPDATE procedure_documents
     SET status = 'Menunggu', updated_at = CURRENT_TIMESTAMP
     WHERE nomor_dokumen = $1 AND status = 'Relevan'`,
    [nomorDokumen]
  );
  return 'Menunggu';
}

// ─── Langkah 3: auto-schedule → Belum dikirim jika ada jadwal email ──────────
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
    // Ada jadwal email → ubah ke "Belum dikirim"
    await client.query(
      `UPDATE procedure_documents
       SET status = 'Belum dikirim', updated_at = CURRENT_TIMESTAMP
       WHERE nomor_dokumen = $1 AND status = 'Menunggu'`,
      [nomorDokumen]
    );
    return 'Belum dikirim';
  }

  // Belum ada jadwal → buat jadwal otomatis
  const docDate = new Date(tanggal);
  if (isNaN(docDate.getTime())) return status;

  // Gunakan resolveScheduledAt dengan needsReview=null (auto)
  // Jika sudah reached → NOW; jika belum → tanggal otomatis (approval - 2bln)
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
  // ✅ PROTEKSI UTAMA: status final tidak boleh disentuh auto-chain
  if (PROTECTED_STATUSES.includes(dbStatus)) return dbStatus;

  // Workflow email juga dilindungi (hanya bisa berubah lewat trigger eksplisit)
  if (['Belum dikirim', 'Telah terkirim'].includes(dbStatus)) return dbStatus;

  const afterExpire     = await autoExpire(client, nomorDokumen, tanggal, dbStatus);
  if (afterExpire !== dbStatus) return afterExpire;

  const afterReactivate = await autoReactivate(client, nomorDokumen, tanggal, afterExpire);
  const afterSchedule   = await autoScheduleAndActivate(client, nomorDokumen, tanggal, afterReactivate);

  return afterSchedule;
}

// ─── Resolve status awal saat dokumen baru ditambahkan ───────────────────────
// needsReview: pilihan eksplisit dari admin saat membuat dokumen
//   true  → dokumen perlu masuk alur review (kirim email ke PIC)
//   false → dokumen langsung Relevan (tidak perlu review)
//   null  → sistem tentukan otomatis berdasarkan tanggal
async function resolveInitialStatus(
  client: any,
  nomorDokumen: string,
  tanggal: string,
  needsReview: boolean | null = null
): Promise<string> {
  // PRIORITAS 1: Jika admin eksplisit memilih "tidak perlu review" → langsung Relevan
  if (needsReview === false) return 'Relevan';

  // PRIORITAS 2: Dokumen expired (>2 bulan dari approval) → otomatis Relevan
  // Ini kasus dokumen lama yang baru diinput ke sistem, tidak perlu review lagi
  if (isExpiredForReview(tanggal)) return 'Relevan';

  // PRIORITAS 3: Belum waktunya jadwal dikirim → dormant Relevan
  // Contoh: approval Agustus, sekarang Maret → jadwal Juni belum tercapai
  if (!isScheduleMonthReached(tanggal)) return 'Relevan';

  // PRIORITAS 4: Sudah waktunya, tapi admin pilih tidak perlu review → Relevan
  // (sudah ditangani di PRIORITAS 1)

  // PRIORITAS 5: Dalam rentang review
  // Jika admin eksplisit pilih needsReview=true, atau sistem otomatis → masuk alur review
  if (needsReview === true || needsReview === null) {
    // Cek apakah jadwal sudah ada
    const schedResult = await client.query(
      `SELECT email_status FROM email_schedules WHERE nomor_dokumen = $1 LIMIT 1`,
      [nomorDokumen]
    );

    if (schedResult.rows.length > 0) {
      return schedResult.rows[0].email_status === 'sent' ? 'Telah terkirim' : 'Belum dikirim';
    }

    // Jadwal belum ada → akan dibuat di blok POST
    return 'Belum dikirim';
  }

  return 'Relevan';
}

// =============================================================================
// GET
// =============================================================================
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const pic = searchParams.get('pic');

    // JOIN email_schedules untuk mendapatkan last_sent_at dan scheduled_email_at
    // yang dibutuhkan frontend untuk menghitung batas visibilitas dokumen
    let query = `
      SELECT pd.*,
             es.last_sent_at,
             es.scheduled_email_at
      FROM procedure_documents pd
      LEFT JOIN email_schedules es ON pd.nomor_dokumen = es.nomor_dokumen
    `;
    let values: any[] = [];

    if (pic) {
      query += ` WHERE $1 = ANY(string_to_array(REPLACE(pd.pic, ' ', ''), ','))`;
      values = [pic];
    }

    query += ` ORDER BY pd.created_at DESC`;

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
          id: row.id,
          namaDokumen: row.nama_dokumen,
          nomorDokumen: row.nomor_dokumen,
          levelDokumen: row.level_dokumen,
          tanggalSelesaiApproval: row.tanggal_selesai_approval,
          revisi: row.revisi,
          owner: row.owner,
          pic: row.pic,
          email: row.email,
          status: resolvedStatus,
          isCustom: row.is_custom,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          lastSentAt: row.last_sent_at ?? null,
          scheduledEmailAt: row.scheduled_email_at ?? null,
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
    const body = await request.json();

    // needsReview: dikirim dari frontend (null = auto, true = perlu review, false = langsung Relevan)
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

    // Buat jadwal HANYA jika:
    // 1. Status dokumen = 'Belum dikirim' (perlu review), DAN
    // 2. Sudah waktunya jadwal dikirim, DAN
    // 3. Dokumen belum expired
    // Dokumen Relevan (expired atau dormant atau pilihan admin) tidak perlu jadwal.
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
        // Kondisi 1: needsReview=true → kirim sekarang
        // Kondisi 2: auto reached → kirim sekarang
        // Kondisi 3: auto future → kirim pada tanggal otomatis
        const scheduledAt = resolveScheduledAt(body.tanggalSelesaiApproval, needsReview);
        await client.query(
          `INSERT INTO email_schedules (nomor_dokumen, scheduled_email_at, email_status)
           VALUES ($1, $2, 'pending')`,
          [body.nomorDokumen, scheduledAt]
        );
      }
    }

    await logActivity({
      username: 'admin',
      activityType: 'create',
      activityDescription: `Tambah prosedur baru ${body.namaDokumen}`,
      targetType: 'procedure',
      targetId: body.nomorDokumen,
    });

    return NextResponse.json(
      {
        id: row.id,
        namaDokumen: row.nama_dokumen,
        nomorDokumen: row.nomor_dokumen,
        levelDokumen: row.level_dokumen,
        tanggalSelesaiApproval: row.tanggal_selesai_approval,
        revisi: row.revisi,
        owner: row.owner,
        pic: row.pic,
        email: row.email,
        status: row.status,
        isCustom: row.is_custom,
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