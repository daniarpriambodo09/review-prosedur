// scripts/migrate-documents.ts

import { readdir } from 'fs/promises';
import path from 'path';
import pool from '@/lib/db';

async function migrateDocuments() {
  const client = await pool.connect();
  const DOKUMEN_DIR = path.join(process.cwd(), 'data', 'Dokumen');

  try {
    await client.query('BEGIN');

    const files = await readdir(DOKUMEN_DIR);
    const pdfFiles = files.filter(f => f.endsWith('.pdf'));

    for (const fileName of pdfFiles) {
      // Extract nomor dokumen dari nama file
      // Format: "BPR-W-01 Risk Analysis R03.pdf"
      const match = fileName.match(/^([A-Z]+-[A-Z]-\d+)/);
      
      if (!match) {
        console.log(`Skipping ${fileName} - no document number found`);
        continue;
      }

      const nomorDokumen = match[1];

      // Check if procedure exists
      const checkProc = await client.query(
        'SELECT nomor_dokumen FROM procedure_documents WHERE nomor_dokumen = $1',
        [nomorDokumen]
      );

      if (checkProc.rows.length === 0) {
        console.log(`Skipping ${fileName} - procedure not found`);
        continue;
      }

      // Insert file metadata
      const filePath = `/data/Dokumen/${fileName}`;
      
      await client.query(`
        INSERT INTO procedure_files 
        (nomor_dokumen, file_name, file_path, file_size, version, uploaded_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `, [
        nomorDokumen,
        fileName,
        filePath,
        0, // Size unknown for existing files
        1,
        'system'
      ]);

      console.log(`Migrated: ${fileName} -> ${nomorDokumen}`);
    }

    await client.query('COMMIT');
    console.log('Migration complete!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration error:', error);
  } finally {
    client.release();
  }
}

migrateDocuments();