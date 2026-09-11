// scripts/import-block-activity.ts
//
// Import kolom "BLOCK ACTIVITY" dari sheet "Matrik Approval NEW" (file excel
// Matrik_Approval_Review_Prosedur) ke kolom procedure_documents.block_activity.
//
// Cara pakai:
//   1. npm install xlsx --save-dev   (kalau belum ada di project)
//   2. Sesuaikan EXCEL_PATH di bawah (atau lewat argv[2])
//   3. npx ts-node scripts/import-block-activity.ts ./Matrik_Approval_Review_Prosedur_-_V2.xlsx
//      (atau kompilasi dulu ke JS lalu `node`)
//
// Cara kerja:
//   - Baca sheet "Matrik Approval NEW".
//   - Header ada di baris ke-2 (baris pertama cuma nomor grup 1..N per 6 dokumen).
//   - Kolom B (BLOCK ACTIVITY) di-merge vertikal antar beberapa baris dokumen
//     yang satu grup — baris lanjutan kosong. Nilai di-forward-fill dari baris
//     terakhir yang terisi.
//   - Kolom D (NO DOK) dicocokkan dengan procedure_documents.nomor_dokumen.
//   - Baris yang NO DOK-nya tidak ditemukan di database akan dilaporkan di
//     akhir (tidak menggagalkan keseluruhan proses).

import * as XLSX from 'xlsx';
import { Pool } from 'pg';
import path from 'path';

const SHEET_NAME = 'Matrik Approval NEW';
const HEADER_ROW_INDEX = 1; // baris ke-2 (0-based) berisi header asli: NO, BLOCK ACTIVITY, NAMA DOK, NO DOK, ...

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'procedure_management',
  password: process.env.DB_PASSWORD || '12345678',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function main() {
  const excelPath = process.argv[2];
  if (!excelPath) {
    console.error('Penggunaan: ts-node scripts/import-block-activity.ts <path-ke-file.xlsx>');
    process.exit(1);
  }

  const wb = XLSX.readFile(path.resolve(excelPath));
  const sheet = wb.Sheets[SHEET_NAME];
  if (!sheet) {
    console.error(`Sheet "${SHEET_NAME}" tidak ditemukan. Sheet yang ada: ${wb.SheetNames.join(', ')}`);
    process.exit(1);
  }

  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

  const header = rows[HEADER_ROW_INDEX];
  const colBlockActivity = header.findIndex((h) => String(h).trim().toUpperCase() === 'BLOCK ACTIVITY');
  const colNoDok         = header.findIndex((h) => String(h).trim().toUpperCase() === 'NO DOK');

  if (colBlockActivity === -1 || colNoDok === -1) {
    console.error('Kolom BLOCK ACTIVITY atau NO DOK tidak ditemukan di header. Cek nama sheet/kolom.');
    process.exit(1);
  }

  const dataRows = rows.slice(HEADER_ROW_INDEX + 1);

  let currentBlockActivity: string | null = null;
  const updates: { nomorDokumen: string; blockActivity: string }[] = [];

  for (const row of dataRows) {
    const rawBlock = row[colBlockActivity];
    const rawNoDok = row[colNoDok];

    // Forward-fill: cell BLOCK ACTIVITY hanya terisi di baris pertama tiap grup.
    if (rawBlock !== null && rawBlock !== undefined && String(rawBlock).trim() !== '') {
      currentBlockActivity = String(rawBlock).trim();
    }

    const nomorDokumen = rawNoDok !== null && rawNoDok !== undefined ? String(rawNoDok).trim() : '';
    if (!nomorDokumen) continue; // baris kosong / bukan baris dokumen
    if (!currentBlockActivity) continue; // belum ada block activity yang terbaca sama sekali

    updates.push({ nomorDokumen, blockActivity: currentBlockActivity });
  }

  console.log(`Ditemukan ${updates.length} baris dokumen dengan Block Activity untuk diproses.`);

  const client = await pool.connect();
  let updatedCount = 0;
  const notFound: string[] = [];

  try {
    for (const u of updates) {
      const result = await client.query(
        `UPDATE procedure_documents
         SET block_activity = $1, updated_at = CURRENT_TIMESTAMP
         WHERE nomor_dokumen = $2`,
        [u.blockActivity, u.nomorDokumen]
      );
      if (result.rowCount && result.rowCount > 0) {
        updatedCount++;
      } else {
        notFound.push(u.nomorDokumen);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`✅ Berhasil update ${updatedCount} dokumen.`);
  if (notFound.length > 0) {
    console.log(`⚠️  ${notFound.length} nomor dokumen di excel tidak ditemukan di database:`);
    console.log(notFound.join(', '));
  }
}

main().catch((err) => {
  console.error('Gagal menjalankan import:', err);
  process.exit(1);
});