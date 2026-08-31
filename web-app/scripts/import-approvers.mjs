// scripts/import-approvers.mjs
import XLSX from 'xlsx';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function splitEmails(cell) {
  if (!cell) return [];
  return String(cell)
    .split(/[,\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

async function main() {
  const wb = XLSX.readFile('Matrik_Approval_Review_Prosedur.xlsx');
  const ws = wb.Sheets['Matrik Approval'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, range: 1 }); // skip header row

  const client = await pool.connect();
  let inserted = 0, skipped = 0;

  try {
    for (const row of rows) {
      const nomorDokumen = row[2]; // kolom C = NO DOK
      if (!nomorDokumen) continue;

      // Cek dokumen memang ada di procedure_documents
      const check = await client.query(
        `SELECT 1 FROM procedure_documents WHERE nomor_dokumen = $1`,
        [String(nomorDokumen).trim()]
      );
      if (check.rows.length === 0) { skipped++; continue; }

      // 5 kelompok, mulai kolom index 6 (PREPARED grup 1)
      for (let g = 0; g < 5; g++) {
        const base = 6 + g * 3;
        const groups = [
          ['prepared', row[base]],
          ['checked',  row[base + 1]],
          ['approved', row[base + 2]],
        ];
        for (const [role, cell] of groups) {
          const emails = splitEmails(cell);
          for (let i = 0; i < emails.length; i++) {
            await client.query(
              `INSERT INTO procedure_approvers (nomor_dokumen, grup, role, email, urutan)
               VALUES ($1, $2, $3, $4, $5)`,
              [String(nomorDokumen).trim(), g + 1, role, emails[i], i]
            );
            inserted++;
          }
        }
      }
    }
    console.log(`Selesai. Inserted: ${inserted}, Dokumen dilewati (tidak ditemukan): ${skipped}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);