// app/api/procedures/route.ts
//
// ============================================================================
// PERUBAHAN BESAR — Eskalasi 2 tahap + fix "abaikan tahun"
// ============================================================================
// Alur lama: 1x reminder ke PIC di (tanggalApproval - 2 bulan), auto-expire ke
//            'Relevan' di (tanggalApproval + 2 bulan). Perhitungan tanggal
//            SALAH karena memakai tahun asli dari tanggal_selesai_approval,
//            bukan tahun berjalan -> begitu tahun dokumen sudah lewat,
//            reminder langsung terpicu instan & auto-expire tidak pernah
//            reset lagi di tahun berikutnya.
//
// Alur baru (SEMUA perhitungan tanggal SEKARANG abaikan tahun asli dokumen —
// yang dipakai cuma hari & bulannya, dicocokkan ke kemunculan terdekat dari
// "sekarang"):
//   T-2 bulan  -> email ke PIC (tahap 1)
//   T-1 bulan  -> KALAU PIC belum kasih status (Relevan/Revisi/Obsolete),
//                 email ke MANAGER departemen PIC tsb (tahap 2)
//   T-0        -> KALAU masih belum ada status sama sekali, dokumen otomatis
//                 jadi 'Relevan'
//   Sepanjang T-2bulan s/d T-0, dokumen tetap muncul & tetap bisa diubah
//   statusnya oleh PIC di halaman review-page-owner (tidak berubah dari
//   sebelumnya — window kelayakan tampil diatur di file itu, bukan di sini).
//
// Manager dicari dari tabel staff_directory: departemen PIC (kode pertama di
// kolom procedure_documents.pic) dicocokkan ke staff dengan is_manager=true
// di departemen yang sama (termasuk manager gabungan departemen, mis.
// 'FATP-EXIM').
//
// ============================================================================
// 🆕 FIX — cycle_deadline_at eksplisit (bug jadwal manual langsung ter-cancel)
// ============================================================================
// SEBELUMNYA, autoExpireAtDeadline() menghitung ulang T-0 dari hari-bulan
// tanggalSelesaiApproval dicocokkan ke TAHUN BERJALAN setiap kali endpoint ini
// diakses. Untuk dokumen yang hari-bulan approvalnya sudah lewat di tahun ini
// (kasus umum untuk dokumen lama), itu membuat fungsi tsb SELALU menganggap
// "sudah lewat deadline" sepanjang sisa tahun — termasuk untuk jadwal yang
// BARU SAJA dibuat admin lewat "Atur Jadwal" di /status-review, sehingga
// status & jadwal langsung dibatalkan lagi di request berikutnya.
//
// SEKARANG deadline (T-0) disimpan eksplisit di kolom email_schedules.
// cycle_deadline_at setiap kali sebuah siklus (baik otomatis tahunan maupun
// manual dari admin) dibuat/di-reset — autoExpireAtDeadline() tinggal
// membaca kolom ini, tidak menebak-nebak lagi.
//
// 🆕 FIX — is_manual (tanggal approval ikut pindah kalau direview di bawah
// jadwal manual)
// ============================================================================
// Kalau admin mengatur jadwal manual (Atur Jadwal) untuk dokumen yang
// tanggal_selesai_approval aslinya sudah sangat lampau, dan PIC benar-benar
// mereview dokumen itu, maka tanggal_selesai_approval di-reset ke TANGGAL
// REVIEW tsb (lihat app/api/reviews/route.ts) — supaya siklus tahunan
// berikutnya berpatokan ke tanggal yang relevan, bukan tanggal lampau yang
// sudah tidak berarti. Flag is_manual di email_schedules menandai jadwal mana
// yang "manual" (di-set oleh app/api/email-schedules/route.ts PUT), berbeda
// dari jadwal siklus tahunan otomatis (createOrResetSchedule di bawah, yang
// SELALU set is_manual = FALSE).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logActivity } from '@/lib/activityLogger';

// Status yang TIDAK PERNAH disentuh chain auto-status di bawah ini.
// CATATAN: 'Relevan' & 'Telah dibaca' SENGAJA tidak dimasukkan ke sini —
// keduanya tetap perlu dicek ulang tiap load (Relevan -> kemungkinan
// reaktivasi tahunan; Telah dibaca -> kemungkinan auto-expire di T-0 kalau
// PIC buka dokumennya tapi tidak pernah kasih status).
const PROTECTED_STATUSES = [
  'Revisi', 'Obsolete',
  'Menunggu ACC Prepared', 'Menunggu ACC Checked', 'Menunggu ACC Approved',
  'Ditolak',
];

// Toleransi maintenance server — HARUS SAMA dengan GRACE_DAYS di
// send_email.py. Kalau tanggal target (T-2bulan/T-1bulan) sudah lewat lebih
// dari ini SEBELUM sempat ada yang membuka aplikasi (mis. server mati
// beberapa hari), dokumen TIDAK direaktivasi cycle ini — tetap 'Relevan',
// menunggu siklus tahun depan. Ini mencegah status 'Belum dikirim' muncul
// tiba-tiba di UI untuk jadwal yang sudah pasti bakal di-skip oleh
// send_email.py, sekaligus mencegah data email_schedules yang stale.
const GRACE_DAYS = 1;

// ── Helper tanggal: abaikan tahun, cari kemunculan hari-bulan berikutnya ────

function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayMonthOf(tanggal: string): { month: number; day: number } | null {
  const d = new Date(tanggal);
  if (isNaN(d.getTime())) return null;
  return { month: d.getMonth(), day: d.getDate() };
}

// Kemunculan hari-bulan (abaikan tahun asli) yang PALING DEKAT dan >= reference.
// Kalau hari-bulan itu sudah lewat tahun ini (relatif ke reference), pakai tahun depan.
function nextOccurrence(month: number, day: number, reference: Date): Date {
  const ref = dateOnly(reference);
  let occ = new Date(ref.getFullYear(), month, day);
  if (occ < ref) occ = new Date(ref.getFullYear() + 1, month, day);
  return occ;
}

function addMonths(date: Date, delta: number, hour = 8): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, date.getDate(), hour, 0, 0);
}

// Tanggal 1 pada bulan (date.month + delta) — dipakai utk reminder PIC/Manager.
// Contoh: deadline 3 Desember, delta -2 -> 1 Oktober (BUKAN 3 Oktober).
// Kita cuma lihat BULAN dari deadline, bukan tanggal persisnya, sesuai
// keputusan bisnis: reminder selalu jatuh di awal bulan.
function addMonthsFirstDay(date: Date, delta: number, hour = 8): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1, hour, 0, 0);
}

// Apakah "reference" (biasanya now) masih dalam window [target, target + GRACE_DAYS]?
// Dipakai sebagai gate: kalau target sudah lewat lebih dari GRACE_DAYS
// sebelum aplikasi sempat mengecek, JANGAN reaktivasi cycle ini — biar
// konsisten dengan send_email.py yang juga akan menolak kirim susulan
// setelah toleransi ini lewat.
function isWithinGraceWindow(target: Date, reference: Date): boolean {
  if (reference < target) return false; // belum sampai tanggalnya sama sekali
  const graceEnd = new Date(
    target.getFullYear(), target.getMonth(), target.getDate() + GRACE_DAYS,
    23, 59, 59, 999
  );
  return reference <= graceEnd;
}

// Deadline (T-0) siklus AKTIF SEKARANG untuk sebuah tanggalApproval, dihitung
// dari "reference" (biasanya "now"). Ini basis semua perhitungan T-2bulan/T-1bulan
// UNTUK SIKLUS OTOMATIS TAHUNAN. Untuk siklus manual (Atur Jadwal), deadline
// TIDAK dihitung dari sini — lihat cycle_deadline_at di email_schedules.
function currentCycleDeadline(tanggalApproval: string, reference: Date = new Date()): Date | null {
  const dm = dayMonthOf(tanggalApproval);
  if (!dm) return null;
  return nextOccurrence(dm.month, dm.day, reference);
}

// Sudah lewat deadline (T-0) siklus saat ini? HANYA dipakai sebagai fallback
// di autoExpireAtDeadline() untuk baris email_schedules lama yang belum
// punya cycle_deadline_at terisi.
function isPastDeadline(tanggalApproval: string, reference: Date = new Date()): boolean {
  const dm = dayMonthOf(tanggalApproval);
  if (!dm) return false;
  const ref = dateOnly(reference);
  let deadlineThisYear = new Date(ref.getFullYear(), dm.month, dm.day);
  return ref >= deadlineThisYear;
}

// NOTE: resolusi email manager (departemen PIC -> department_managers ->
// staff_directory) dilakukan di send_email.py (fungsi resolve_manager),
// bukan di sini — Node cuma menyimpan manager_email_scheduled_at, Python
// yang benar-benar mengeksekusi pengiriman & lookup manager-nya.

// ── Buat/reset jadwal email 2-tahap untuk sebuah dokumen ────────────────────
// Dipanggil saat dokumen masuk 'Menunggu' (baru dibuat / reaktivasi tahunan).
// is_manual SELALU FALSE di sini — jalur ini khusus SIKLUS OTOMATIS TAHUNAN.
// Jadwal MANUAL (Atur Jadwal oleh admin) dibuat lewat
// app/api/email-schedules/route.ts (PUT), bukan lewat fungsi ini.
async function createOrResetSchedule(
  client: any,
  nomorDokumen: string,
  tanggalApproval: string,
  needsReview: boolean | null
): Promise<Date> {
  const now      = new Date();
  const deadline = currentCycleDeadline(tanggalApproval, now) as Date; // sudah divalidasi non-null sebelum dipanggil

  // Kalau admin secara eksplisit menandai "Perlu Direview" saat create,
  // kirim email PIC SEKARANG (itu memang perintah eksplisit admin, bukan
  // auto-schedule). Selain itu, reminder SELALU jatuh di TANGGAL 1 pada
  // bulan (deadline - 2) — bukan tanggal persis (deadline - 2 bulan).
  // Contoh: deadline 3 Desember -> PIC direminder 1 Oktober, bukan 3 Oktober.
  const picScheduledAt = needsReview === true
    ? now
    : addMonthsFirstDay(deadline, -2);

  const managerScheduledAt = addMonthsFirstDay(deadline, -1);

  // 🆕 cycleDeadline disimpan EKSPLISIT — inilah yang dipakai
  // autoExpireAtDeadline() untuk menentukan T-0, BUKAN dihitung ulang dari
  // tanggalApproval setiap kali endpoint ini diakses.
  const cycleDeadline = deadline;

  const existing = await client.query(
    `SELECT id FROM email_schedules WHERE nomor_dokumen = $1 LIMIT 1`,
    [nomorDokumen]
  );

  if (existing.rows.length > 0) {
    await client.query(
      `UPDATE email_schedules
       SET scheduled_email_at          = $2,
           email_status                = 'pending',
           last_sent_at                = NULL,
           manager_email_scheduled_at  = $3,
           manager_email_status        = 'not_applicable',
           manager_email_sent_at       = NULL,
           manager_email_error         = NULL,
           cycle_deadline_at           = $4,
           is_manual                   = FALSE,
           retry_count                 = 0,
           error_message               = NULL,
           updated_at                  = CURRENT_TIMESTAMP
       WHERE nomor_dokumen = $1`,
      [nomorDokumen, picScheduledAt, managerScheduledAt, cycleDeadline]
    );
  } else {
    await client.query(
      `INSERT INTO email_schedules
         (nomor_dokumen, scheduled_email_at, email_status,
          manager_email_scheduled_at, manager_email_status, cycle_deadline_at, is_manual)
       VALUES ($1, $2, 'pending', $3, 'not_applicable', $4, FALSE)`,
      [nomorDokumen, picScheduledAt, managerScheduledAt, cycleDeadline]
    );
  }

  return picScheduledAt;
}

// ─── Langkah 1: auto-set 'Relevan' TEPAT DI T-0 kalau belum ada status ──────
// 🐛 FIX: deadline (T-0) SEKARANG dibaca dari cycle_deadline_at milik jadwal
// yang sedang aktif — BUKAN dihitung ulang dari hari-bulan tanggalSelesai-
// Approval yang dicocokkan ke "tahun ini". Cara lama itu bug: begitu hari-
// bulan tsb sudah lewat DI TAHUN INI (hampir selalu true untuk dokumen yang
// sudah lama ada di sistem), isPastDeadline() akan SELALU bernilai true
// sepanjang sisa tahun — termasuk untuk jadwal yang BARU SAJA dibuat admin
// lewat "Atur Jadwal" di /status-review, sehingga langsung dibatalkan lagi
// di request berikutnya.
async function autoExpireAtDeadline(
  client: any,
  nomorDokumen: string,
  tanggal: string,
  status: string
): Promise<string> {
  if (status !== '-' && status !== 'Belum dikirim' && status !== 'Telah terkirim' && status !== 'Telah dibaca') {
    return status;
  }

  const scheduleResult = await client.query(
    `SELECT cycle_deadline_at FROM email_schedules WHERE nomor_dokumen = $1 LIMIT 1`,
    [nomorDokumen]
  );

  let pastDeadline: boolean;
  if (scheduleResult.rows.length > 0 && scheduleResult.rows[0].cycle_deadline_at) {
    pastDeadline = new Date() >= new Date(scheduleResult.rows[0].cycle_deadline_at);
  } else {
    // Fallback — jadwal lama yang dibuat sebelum kolom cycle_deadline_at ada.
    // Akan otomatis terisi begitu jadwal ini di-reset (reaktivasi tahunan
    // atau Atur Jadwal manual), setelah itu tidak lagi lewat jalur ini.
    pastDeadline = isPastDeadline(tanggal);
  }

  if (!pastDeadline) return status;

  await client.query(
    `UPDATE procedure_documents
     SET status = 'Relevan', updated_at = CURRENT_TIMESTAMP
     WHERE nomor_dokumen = $1 AND status = $2`,
    [nomorDokumen, status]
  );
  // Tandai schedule lama selesai (biar tidak terus dicoba kirim kalau masih pending)
  await client.query(
    `UPDATE email_schedules
     SET email_status = CASE WHEN email_status = 'pending' THEN 'cancelled' ELSE email_status END,
         manager_email_status = CASE WHEN manager_email_status IN ('pending') THEN 'skipped' ELSE manager_email_status END,
         updated_at = CURRENT_TIMESTAMP
     WHERE nomor_dokumen = $1`,
    [nomorDokumen]
  );
  return 'Relevan';
}

// ─── Langkah 2: reaktivasi tahunan → 'Menunggu' + jadwal baru ──────────────
// Dokumen yang sudah 'Relevan' dari siklus tahun lalu, dicek apakah siklus
// TAHUN INI sudah masuk window (T-2bulan sudah tercapai).
async function autoReactivate(
  client: any,
  nomorDokumen: string,
  tanggal: string,
  status: string
): Promise<string> {
  if (status !== 'Relevan') return status;

  const deadline = currentCycleDeadline(tanggal);
  if (!deadline) return status;

  const picScheduleStart = addMonthsFirstDay(deadline, -2);
  const now = new Date();

  if (now < picScheduleStart) return status; // belum masuk window siklus baru

  if (!isWithinGraceWindow(picScheduleStart, now)) {
    // Tanggal target (T-2bulan) sudah lewat lebih dari GRACE_DAYS SEBELUM
    // sempat ada yang membuka aplikasi (mis. server mati beberapa hari).
    // JANGAN reaktivasi cycle ini — biarkan tetap 'Relevan', tunggu siklus
    // TAHUN DEPAN. Mencegah status 'Belum dikirim' muncul di UI utk jadwal
    // yang toh akan ditolak send_email.py juga.
    return status;
  }

  // Kalau sudah pernah masuk siklus baru (ada email_schedules yang masih
  // relevan utk deadline ini), jangan dobel-reset — cek lewat scheduled_email_at
  // apakah sudah "mendekati" deadline sekarang (dalam 3 bulan ke depan).
  const existing = await client.query(
    `SELECT scheduled_email_at FROM email_schedules WHERE nomor_dokumen = $1`,
    [nomorDokumen]
  );
  if (existing.rows.length > 0) {
    const sched = new Date(existing.rows[0].scheduled_email_at);
    const monthsDiff = (deadline.getFullYear() - sched.getFullYear()) * 12 + (deadline.getMonth() - sched.getMonth());
    if (monthsDiff <= 2 && monthsDiff >= 0) {
      // schedule yang ada masih untuk siklus deadline yang sama -> jangan reset
      return status;
    }
  }

  await client.query(
    `UPDATE procedure_documents
     SET status = 'Menunggu', updated_at = CURRENT_TIMESTAMP
     WHERE nomor_dokumen = $1 AND status = 'Relevan'`,
    [nomorDokumen]
  );
  await createOrResetSchedule(client, nomorDokumen, tanggal, null);
  return 'Menunggu';
}

// ─── Langkah 3: dari 'Menunggu' → 'Belum dikirim' (siap dikirim scheduler) ──
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
  if (check.rows.length === 0) {
    await createOrResetSchedule(client, nomorDokumen, tanggal, null);
  }

  await client.query(
    `UPDATE procedure_documents
     SET status = 'Belum dikirim', updated_at = CURRENT_TIMESTAMP
     WHERE nomor_dokumen = $1 AND status = 'Menunggu'`,
    [nomorDokumen]
  );
  return 'Belum dikirim';
}

// ─── Master chain ────────────────────────────────────────────────────────────
async function runAutoStatusChain(
  client: any,
  nomorDokumen: string,
  tanggal: string,
  dbStatus: string
): Promise<string> {
  // 'Relevan' -> satu-satunya jalur yang perlu dicek reaktivasi tahunan.
  if (dbStatus === 'Relevan') {
    const afterReactivate = await autoReactivate(client, nomorDokumen, tanggal, dbStatus);
    if (afterReactivate !== dbStatus) {
      return await autoScheduleAndActivate(client, nomorDokumen, tanggal, afterReactivate);
    }
    return afterReactivate;
  }

  // Revisi/Obsolete/status alur ACC -> diamkan sepenuhnya, menunggu admin.
  if (PROTECTED_STATUSES.includes(dbStatus)) return dbStatus;

  // Sisanya: '-', 'Belum dikirim', 'Telah terkirim', 'Telah dibaca'
  // -> cek apakah sudah menyentuh deadline (T-0) tanpa PIC memberi status.
  const afterDeadline = await autoExpireAtDeadline(client, nomorDokumen, tanggal, dbStatus);
  return afterDeadline; // sama dengan dbStatus kalau belum lewat deadline
}

// ─── Resolve status awal saat dokumen baru ditambahkan ───────────────────────
async function resolveInitialStatus(
  client: any,
  nomorDokumen: string,
  tanggal: string,
  needsReview: boolean | null = null
): Promise<string> {
  if (needsReview === false) return 'Relevan';

  const deadline = currentCycleDeadline(tanggal);
  if (!deadline) return 'Relevan';

  const picScheduleStart = addMonthsFirstDay(deadline, -2);
  const now = new Date();

  if (needsReview === true) {
    await createOrResetSchedule(client, nomorDokumen, tanggal, true);
    return 'Belum dikirim';
  }

  if (now < picScheduleStart) return 'Relevan'; // belum masuk window, tunggu siklus berjalan alami

  if (!isWithinGraceWindow(picScheduleStart, now)) {
    // Sama seperti autoReactivate: window T-2bulan sudah lewat lebih dari
    // GRACE_DAYS sebelum dokumen ini ditambahkan -> jangan langsung 'Belum
    // dikirim', tunggu siklus tahun depan.
    return 'Relevan';
  }

  await createOrResetSchedule(client, nomorDokumen, tanggal, null);
  return 'Belum dikirim';
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const picParam = searchParams.get('pic');

    let query:  string;
    let values: any[] = [];

    if (picParam) {
      if (picParam.includes('@')) {
        const emailLocalPart = picParam.split('@')[0].trim().toUpperCase();
        const picCodes       = emailLocalPart
          .split(',')
          .map((c: string) => c.trim())
          .filter((c: string) => c.length > 0);

        const conditions: string[] = [];
        values = [];
        let idx = 1;

        for (const code of picCodes) {
          conditions.push(
            `$${idx} = ANY(string_to_array(REPLACE(UPPER(pd.pic), ' ', ''), ','))`
          );
          values.push(code);
          idx++;
        }

        conditions.push(`pd.email ILIKE $${idx}`);
        values.push(`%${picParam}%`);
        idx++;

        query = `
          SELECT pd.*,
                 es.last_sent_at,
                 es.scheduled_email_at,
                 es.manager_email_scheduled_at,
                 es.manager_email_status
          FROM procedure_documents pd
          LEFT JOIN email_schedules es ON pd.nomor_dokumen = es.nomor_dokumen
          WHERE ${conditions.join(' OR ')}
          ORDER BY pd.created_at DESC
        `;
      } else {
        query = `
          SELECT pd.*,
                 es.last_sent_at,
                 es.scheduled_email_at,
                 es.manager_email_scheduled_at,
                 es.manager_email_status
          FROM procedure_documents pd
          LEFT JOIN email_schedules es ON pd.nomor_dokumen = es.nomor_dokumen
          WHERE $1 = ANY(string_to_array(REPLACE(pd.pic, ' ', ''), ','))
          ORDER BY pd.created_at DESC
        `;
        values = [picParam];
      }
    } else {
      query = `
        SELECT pd.*,
               es.last_sent_at,
               es.scheduled_email_at,
               es.manager_email_scheduled_at,
               es.manager_email_status
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
          blockActivity:          row.block_activity              ?? null,
          status:                 resolvedStatus,
          isCustom:               row.is_custom,
          createdAt:              row.created_at,
          updatedAt:              row.updated_at,
          lastSentAt:             row.last_sent_at              ?? null,
          scheduledEmailAt:       row.scheduled_email_at        ?? null,
          managerEmailScheduledAt: row.manager_email_scheduled_at ?? null,
          managerEmailStatus:     row.manager_email_status      ?? 'not_applicable',
          lastReviewedAt:         row.last_reviewed_at          ?? null,
          reviewSeenAt:           row.review_seen_at            ?? null,
        };
      })
    );

    return NextResponse.json(procedures);
  } catch (error) {
    console.error('Error fetching procedures:', error);
    return NextResponse.json({ error: 'Failed to fetch procedures' }, { status: 500 });
  } finally {
    client.release();
  }
}

// ── POST — Tambah dokumen baru ────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body                      = await request.json();
    const needsReview: boolean|null = body.needsReview ?? null;

    await client.query('BEGIN');

    const status = await resolveInitialStatus(
      client,
      body.nomorDokumen,
      body.tanggalSelesaiApproval,
      needsReview
    );

    const result = await client.query(
      `INSERT INTO procedure_documents
         (nama_dokumen, nomor_dokumen, level_dokumen, tanggal_selesai_approval,
          revisi, owner, pic, email, block_activity, status, is_custom)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        body.namaDokumen,
        body.nomorDokumen,
        body.levelDokumen,
        body.tanggalSelesaiApproval,
        body.revisi || '0',
        body.owner,
        body.pic,
        body.email || '',
        body.blockActivity || null,
        status,
        true,
      ]
    );

    await client.query('COMMIT');

    const row = result.rows[0];

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
        blockActivity:          row.block_activity,
        status:                 row.status,
        isCustom:               row.is_custom,
        lastReviewedAt:         null,
        reviewSeenAt:           null,
      },
      { status: 201 }
    );
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating procedure:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Nomor dokumen sudah ada' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create procedure' }, { status: 500 });
  } finally {
    client.release();
  }
}