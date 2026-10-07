/**
 * scripts/auto-migrate.js
 * 
 * Auto-migration runner untuk menyinkronkan skema database PostgreSQL
 * secara otomatis saat proses build atau deployment.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// 1. Muat environment variable dari .env.local jika ada
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

async function runAutoMigration() {
  console.log('📦 [AUTO-MIGRATE] Memeriksa migrasi database PostgreSQL...');
  let client;
  try {
    client = await pool.connect();
  } catch (connErr) {
    console.warn('⚠️ [AUTO-MIGRATE] Gagal terhubung ke database. Migrasi dilewati:', connErr.message);
    return;
  }

  try {
    // 2. Buat tabel pelacak migrasi jika belum ada
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Ambil daftar migrasi yang sudah pernah diaplikasikan
    const appliedRes = await client.query('SELECT filename FROM schema_migrations');
    const appliedSet = new Set(appliedRes.rows.map(r => r.filename));

    // 4. Baca semua file .sql dari folder migration/patches
    const patchesDir = path.resolve(__dirname, '../migration/patches');
    if (!fs.existsSync(patchesDir)) {
      fs.mkdirSync(patchesDir, { recursive: true });
    }

    const files = fs.readdirSync(patchesDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Urutan numerik/alfabetik: 001_, 002_, dst.

    let newMigrationsCount = 0;

    for (const file of files) {
      if (!appliedSet.has(file)) {
        console.log(`⏳ [AUTO-MIGRATE] Menerapkan patch: ${file}...`);
        const filePath = path.join(patchesDir, file);
        const sqlContent = fs.readFileSync(filePath, 'utf-8');

        await client.query('BEGIN');
        try {
          await client.query(sqlContent);
          await client.query(
            'INSERT INTO schema_migrations (filename) VALUES ($1)',
            [file]
          );
          await client.query('COMMIT');
          console.log(`✅ [AUTO-MIGRATE] Berhasil menerapkan patch: ${file}`);
          newMigrationsCount++;
        } catch (patchErr) {
          await client.query('ROLLBACK');
          console.error(`❌ [AUTO-MIGRATE] Gagal menerapkan patch ${file}:`, patchErr.message);
          throw patchErr;
        }
      }
    }

    if (newMigrationsCount === 0) {
      console.log('✨ [AUTO-MIGRATE] Database sudah up-to-date (tidak ada migrasi baru).');
    } else {
      console.log(`🎉 [AUTO-MIGRATE] Selesai menerapkan ${newMigrationsCount} patch migrasi baru.`);
    }
  } catch (err) {
    console.error('❌ [AUTO-MIGRATE] Terjadi kesalahan saat proses migrasi:', err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

runAutoMigration();
