// scripts/fix-pic-schedule-dates.mjs
//
// PERBAIKAN DATA SATU KALI — jalankan SEKALI SAJA setelah deploy patch
// app/api/procedures/route.ts yang menghapus bug catch-up-to-now.
//
// Bug lama: createOrResetSchedule() memaksa scheduled_email_at (PIC) jadi
// waktu SEKARANG kalau kebetulan sudah masuk window 2 bulan, alih-alih
// pakai tanggal T-2bulan yang sebenarnya. Akibatnya banyak dokumen yang
// scheduled_email_at-nya numpuk di satu timestamp yang sama (saat GET
// /api/procedures terakhir dipanggil), bukan tanggal masing-masing yang
// benar.
//
// Script ini menghitung ULANG scheduled_email_at & manager_email_scheduled_at
// yang SEHARUSNYA (pakai logika yang SAMA PERSIS dengan
// app/api/procedures/route.ts — day/month tanggal_selesai_approval, abaikan
// tahun) untuk semua baris email_schedules yang statusnya masih 'pending',
// lalu UPDATE kalau beda dari yang tersimpan.
//
// AMAN dijalankan berkali-kali (idempotent) — baris yang sudah benar tidak
// disentuh (tidak ada UPDATE kalau nilainya sudah sama).
//
// Cara pakai:
//   node scripts/fix-pic-schedule-dates.mjs
//
// Koneksi database otomatis dibaca dari .env.local, sama seperti script lain.

import pg from 'pg';
import fs from 'fs';
import path from 'path';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : new pg.Pool({
      user:     process.env.DB_USER,
      host:     process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port:     Number(process.env.DB_PORT) || 5432,
    });

// ── SAMA PERSIS dengan helper di app/api/procedures/route.ts ───────────────
function dateOnly(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function dayMonthOf(tanggal) {
  const d = new Date(tanggal);
  if (isNaN(d.getTime())) return null;
  return { month: d.getMonth(), day: d.getDate() };
}
function nextOccurrence(month, day, reference) {
  const ref = dateOnly(reference);
  let occ = new Date(ref.getFullYear(), month, day);
  if (occ < ref) occ = new Date(ref.getFullYear() + 1, month, day);
  return occ;
}
function addMonths(date, delta, hour = 8) {
  return new Date(date.getFullYear(), date.getMonth() + delta, date.getDate(), hour, 0, 0);
}
function currentCycleDeadline(tanggalApproval, reference = new Date()) {
  const dm = dayMonthOf(tanggalApproval);
  if (!dm) return null;
  return nextOccurrence(dm.month, dm.day, reference);
}

function sameInstant(a, b) {
  if (!a || !b) return a === b;
  return new Date(a).getTime() === new Date(b).getTime();
}

async function main() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT es.id, es.nomor_dokumen, es.scheduled_email_at, es.manager_email_scheduled_at,
             pd.tanggal_selesai_approval
      FROM email_schedules es
      JOIN procedure_documents pd ON pd.nomor_dokumen = es.nomor_dokumen
      WHERE es.email_status = 'pending'
      ORDER BY es.nomor_dokumen ASC
    `);

    console.log(`Ditemukan ${result.rows.length} baris berstatus 'pending' untuk dicek.\n`);

    let updated = 0, skipped = 0, noDeadline = 0;
    const changes = [];

    await client.query('BEGIN');

    for (const row of result.rows) {
      const deadline = currentCycleDeadline(row.tanggal_selesai_approval);
      if (!deadline) { noDeadline++; continue; }

      const correctPic     = addMonths(deadline, -2);
      const correctManager = addMonths(deadline, -1);

      const picDrift     = !sameInstant(row.scheduled_email_at, correctPic);
      const managerDrift = !sameInstant(row.manager_email_scheduled_at, correctManager);

      if (!picDrift && !managerDrift) { skipped++; continue; }

      await client.query(
        `UPDATE email_schedules
         SET scheduled_email_at = $1, manager_email_scheduled_at = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [correctPic, correctManager, row.id]
      );
      updated++;
      changes.push({
        nomor: row.nomor_dokumen,
        picBefore: row.scheduled_email_at,
        picAfter: correctPic,
        managerBefore: row.manager_email_scheduled_at,
        managerAfter: correctManager,
      });
    }

    await client.query('COMMIT');

    console.log(`=== Selesai ===`);
    console.log(`Diperbaiki : ${updated}`);
    console.log(`Sudah benar (dilewati) : ${skipped}`);
    console.log(`Tanpa tanggal approval valid (dilewati) : ${noDeadline}`);

    if (changes.length > 0) {
      console.log(`\nDetail perubahan:`);
      changes.forEach(c => {
        console.log(`  - ${c.nomor}`);
        console.log(`      PIC:     ${fmt(c.picBefore)} -> ${fmt(c.picAfter)}`);
        console.log(`      Manager: ${fmt(c.managerBefore)} -> ${fmt(c.managerAfter)}`);
      });
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

function fmt(d) {
  if (!d) return '(kosong)';
  return new Date(d).toISOString().replace('T', ' ').slice(0, 19);
}

main().catch(err => {
  console.error('Gagal menjalankan script:', err);
  process.exit(1);
});
