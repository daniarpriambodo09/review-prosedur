// scripts/import-approver-names.mjs
//
// Mengisi kolom `nama` di tabel procedure_approvers berdasarkan data di
// sheet "Matrik Approval NEW" pada file Matrik_Approval_Review_Prosedur_-_V2.xlsx.
//
// Berbeda dari import-approvers.mjs (yang INSERT baris baru berisi email),
// script ini hanya melakukan UPDATE nama pada baris yang SUDAH ADA di DB,
// dicocokkan lewat kombinasi (nomor_dokumen, grup, role, email) — kombinasi
// yang sama persis dipakai saat proses insert email sebelumnya, sehingga
// aman dan tidak menduplikasi / mengubah data lain.
//
// Struktur sheet "Matrik Approval NEW":
//   Baris 1-2 = header (data mulai baris 3)
//   Kolom D (index 3, 0-based)  = NO DOK
//   5 kelompok approval, tiap kelompok 9 kolom, dimulai kolom H (index 7):
//     [PREPARED email, NAMA LENGKAP, JABATAN,
//      CHECKED  email, NAMA LENGKAP, JABATAN,
//      APPROVED email, NAMA LENGKAP, JABATAN]
//   Satu cell email/nama bisa berisi beberapa approver dipisah koma / newline,
//   dengan urutan yang selalu paralel antara kolom email dan kolom nama.
//
// Cara pakai:
//   node scripts/import-approver-names.mjs "path/ke/Matrik_Approval_Review_Prosedur_-_V2.xlsx"
//
// Kalau path tidak diisi, script akan mencari file dengan nama default
// (lihat DEFAULT_FILE_PATH di bawah) di folder tempat command dijalankan.
//
// Koneksi database otomatis dibaca dari file .env.local di root project
// (variabel DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT — sama seperti
// yang dipakai lib/db.ts). Kalau DATABASE_URL di-set manual sebagai
// environment variable, itu akan dipakai duluan.

import XLSX from 'xlsx';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

// ── Load .env.local (kalau ada) tanpa perlu package dotenv ─────────────────
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
    // buang tanda kutip pembungkus kalau ada
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

const DEFAULT_FILE_PATH = 'Matrik_Approval_Review_Prosedur_-_V2.xlsx';
const FILE_PATH  = process.argv[2] || DEFAULT_FILE_PATH;
const SHEET_NAME = 'Matrik Approval NEW';

function clean(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

// Pisah cell yang berisi banyak nilai dipisah koma atau newline,
// hasilnya sudah di-trim dan kosong dibuang — dipakai untuk email & nama.
function splitMulti(cell) {
  if (!cell) return [];
  return String(cell)
    .split(/[,\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

async function main() {
  console.log(`Membaca file: ${FILE_PATH}`);
  const wb = XLSX.readFile(FILE_PATH);
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) throw new Error(`Sheet "${SHEET_NAME}" tidak ditemukan di ${FILE_PATH}`);

  // range: 2 → skip 2 baris header, data mulai baris ke-3
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, range: 2 });

  const client = await pool.connect();
  let updated        = 0;
  let skippedDoc      = 0;
  let skippedNoMatch  = 0;
  let skippedNoNama   = 0;
  let mismatchCount   = 0; // jumlah email vs jumlah nama di 1 cell tidak sama
  const notFoundDocs  = new Set();
  const notMatchedRows = [];

  try {
    await client.query('BEGIN');

    for (const row of rows) {
      const nomorDokumen = clean(row[3]); // kolom D = NO DOK
      if (!nomorDokumen) continue;

      const check = await client.query(
        `SELECT 1 FROM procedure_documents WHERE nomor_dokumen = $1`,
        [nomorDokumen]
      );
      if (check.rows.length === 0) {
        skippedDoc++;
        notFoundDocs.add(nomorDokumen);
        continue;
      }

      // 5 kelompok, tiap kelompok 9 kolom, mulai index 7 (0-based)
      for (let g = 0; g < 5; g++) {
        const base = 7 + g * 9;
        const roleBlocks = [
          ['prepared', row[base],     row[base + 1]],
          ['checked',  row[base + 3], row[base + 4]],
          ['approved', row[base + 6], row[base + 7]],
        ];

        for (const [role, emailCell, namaCell] of roleBlocks) {
          const emails = splitMulti(emailCell);
          const namas  = splitMulti(namaCell);
          if (emails.length === 0) continue;

          if (namas.length !== emails.length) {
            mismatchCount++;
            console.warn(
              `⚠ Jumlah email (${emails.length}) ≠ jumlah nama (${namas.length}) ` +
              `di ${nomorDokumen} / grup ${g + 1} / ${role} — dilewati sebagian.`
            );
          }

          for (let i = 0; i < emails.length; i++) {
            const email = emails[i];
            const nama  = namas[i] || null;

            if (!nama) { skippedNoNama++; continue; }

            const result = await client.query(
              `UPDATE procedure_approvers
               SET nama = $1
               WHERE nomor_dokumen = $2
                 AND grup = $3
                 AND role = $4
                 AND LOWER(email) = LOWER($5)`,
              [nama, nomorDokumen, g + 1, role, email]
            );

            if (result.rowCount > 0) {
              updated += result.rowCount;
            } else {
              skippedNoMatch++;
              notMatchedRows.push({ nomorDokumen, grup: g + 1, role, email });
            }
          }
        }
      }
    }

    await client.query('COMMIT');

    console.log('\n=== Selesai ===');
    console.log(`Nama ter-update      : ${updated}`);
    console.log(`Dokumen tidak di DB   : ${skippedDoc} (unik: ${notFoundDocs.size})`);
    console.log(`Email tanpa nama      : ${skippedNoNama}`);
    console.log(`Email tidak cocok DB  : ${skippedNoMatch}`);
    console.log(`Cell email/nama mismatch: ${mismatchCount}`);

    if (notFoundDocs.size > 0) {
      console.log('\nContoh dokumen tidak ditemukan di procedure_documents:');
      console.log([...notFoundDocs].slice(0, 15).join(', '));
    }
    if (notMatchedRows.length > 0) {
      console.log('\nContoh email yang tidak cocok dengan baris di procedure_approvers:');
      notMatchedRows.slice(0, 15).forEach(r =>
        console.log(`  - ${r.nomorDokumen} / grup ${r.grup} / ${r.role} / ${r.email}`)
      );
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Gagal menjalankan script:', err);
  process.exit(1);
});
