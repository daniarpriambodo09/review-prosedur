/**
 * Node.js Fallback Database Backup Script
 * Generates full SQL dump directly using node-postgres
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'procedure_management',
  password: process.env.DB_PASSWORD || '12345678',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function runBackup(targetFilePath) {
  const client = await pool.connect();
  try {
    const backupPath = targetFilePath || path.join(
      __dirname,
      '..',
      'backups',
      `procedure_management_backup_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}.sql`
    );

    const dir = path.dirname(backupPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const stream = fs.createWriteStream(backupPath, { encoding: 'utf8' });

    stream.write(`-- ========================================================\n`);
    stream.write(`-- Procedure Management Database Backup (Node.js Engine)\n`);
    stream.write(`-- Generated: ${new Date().toISOString()}\n`);
    stream.write(`-- Database: ${process.env.DB_NAME || 'procedure_management'}\n`);
    stream.write(`-- ========================================================\n\n`);
    stream.write(`SET client_encoding = 'UTF8';\n`);
    stream.write(`SET standard_conforming_strings = on;\n\n`);

    // Ambil semua tabel di public schema
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    for (const { table_name } of tablesRes.rows) {
      stream.write(`\n-- -----------------------------------------------------\n`);
      stream.write(`-- Table: ${table_name}\n`);
      stream.write(`-- -----------------------------------------------------\n`);

      // Dapatkan data baris
      const rowsRes = await client.query(`SELECT * FROM "${table_name}"`);
      if (rowsRes.rows.length === 0) {
        stream.write(`-- (No records in ${table_name})\n\n`);
        continue;
      }

      const columns = Object.keys(rowsRes.rows[0]);
      const quotedCols = columns.map(c => `"${c}"`).join(', ');

      for (const row of rowsRes.rows) {
        const values = columns.map(col => {
          const val = row[col];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
          if (typeof val === 'number') return val;
          if (val instanceof Date) return `'${val.toISOString()}'`;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          return `'${String(val).replace(/'/g, "''")}'`;
        });
        stream.write(`INSERT INTO "${table_name}" (${quotedCols}) VALUES (${values.join(', ')});\n`);
      }
      stream.write(`\n`);
    }

    stream.end();
    console.log(`[SUKSES] Backup berhasil dibuat: ${backupPath}`);
    return backupPath;
  } catch (err) {
    console.error('Backup database gagal:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  const customFile = process.argv[2];
  runBackup(customFile)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runBackup };
