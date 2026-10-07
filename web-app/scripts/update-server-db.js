/**
 * Script migrasi otomatis database di server
 * Jalankan dengan: node scripts/update-server-db.js
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Baca .env.local jika ada
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345678',
  database: process.env.DB_NAME || 'procedure_management',
});

async function main() {
  console.log('🚀 Menghubungkan ke database PostgreSQL di server...');
  const client = await pool.connect();
  try {
    console.log('🔄 Memulai update skema tabel arsip_prosedur & procedure_documents...');

    await client.query(`
      -- 1. Update tabel arsip_prosedur
      ALTER TABLE arsip_prosedur ALTER COLUMN status TYPE character varying(100);
      ALTER TABLE arsip_prosedur ALTER COLUMN revisi TYPE character varying(100);
      ALTER TABLE arsip_prosedur ALTER COLUMN level_dokumen TYPE character varying(100);
      ALTER TABLE arsip_prosedur ALTER COLUMN nomor_dokumen TYPE character varying(255);
      ALTER TABLE arsip_prosedur ALTER COLUMN owner TYPE character varying(255);
      ALTER TABLE arsip_prosedur ALTER COLUMN tanggal_selesai_approval DROP NOT NULL;

      -- 2. Update tabel procedure_documents
      ALTER TABLE procedure_documents ALTER COLUMN status TYPE character varying(100);
      ALTER TABLE procedure_documents ALTER COLUMN revisi TYPE character varying(100);
      ALTER TABLE procedure_documents ALTER COLUMN tanggal_selesai_approval DROP NOT NULL;
    `);

    console.log('✅ Skema database berhasil diperbarui!');
    console.log(' - arsip_prosedur.status: VARCHAR(100)');
    console.log(' - arsip_prosedur.revisi: VARCHAR(100)');
    console.log(' - arsip_prosedur.tanggal_selesai_approval: DROP NOT NULL (Nullable)');
    console.log(' - procedure_documents.status: VARCHAR(100)');
    console.log(' - procedure_documents.revisi: VARCHAR(100)');
    console.log(' - procedure_documents.tanggal_selesai_approval: DROP NOT NULL (Nullable)');
  } catch (error) {
    console.error('❌ Gagal memperbarui skema database:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
