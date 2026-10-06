import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import pool from '@/lib/db';

const execPromise = util.promisify(exec);

export const dynamic = 'force-dynamic';

function getBackupsDir() {
  const dir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// Format bytes to human readable string
function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ── GET: List backups OR download a specific backup file ─────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedFile = searchParams.get('file');
    const backupsDir = getBackupsDir();

    // 1. Download file jika parameter 'file' ada
    if (requestedFile) {
      // Security sanitize: cegah directory traversal
      const safeFileName = path.basename(requestedFile);
      if (!safeFileName.endsWith('.sql')) {
        return NextResponse.json({ error: 'File tidak valid' }, { status: 400 });
      }

      const filePath = path.join(backupsDir, safeFileName);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'File backup tidak ditemukan' }, { status: 404 });
      }

      const fileBuffer = fs.readFileSync(filePath);
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/sql',
          'Content-Disposition': `attachment; filename="${safeFileName}"`,
        },
      });
    }

    // 2. Tampilkan daftar semua file backup
    const files = fs.readdirSync(backupsDir)
      .filter(f => f.endsWith('.sql'))
      .map(filename => {
        const filePath = path.join(backupsDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          sizeBytes: stats.size,
          sizeFormatted: formatBytes(stats.size),
          createdAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      totalBackups: files.length,
      backups: files,
    });
  } catch (error: any) {
    console.error('Error in backup-database GET:', error);
    return NextResponse.json({ error: 'Gagal mengambil data backup' }, { status: 500 });
  }
}

// ── POST: Trigger database backup sekarang ───────────────────────────────────
export async function POST() {
  try {
    const backupsDir = getBackupsDir();
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const filename = `procedure_management_backup_${timestamp}.sql`;
    const targetPath = path.join(backupsDir, filename);

    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || '12345678';
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'procedure_management';

    let usedMethod = 'pg_dump';

    try {
      // Coba pg_dump terlebih dahulu
      const env = { ...process.env, PGPASSWORD: dbPassword };
      // Cari pg_dump path potensial di Windows jika default PATH tidak ada
      const pgDumpCommand = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --clean --if-exists --inserts -f "${targetPath}"`;
      
      await execPromise(pgDumpCommand, { env, timeout: 60000 });
    } catch (pgDumpError) {
      console.warn('pg_dump tidak tersedia di PATH, menggunakan engine Node.js...', pgDumpError);
      usedMethod = 'nodejs-engine';
      // Gunakan fallback direct node query
      await generateDirectSqlBackup(targetPath);
    }

    if (!fs.existsSync(targetPath)) {
      throw new Error('File backup tidak berhasil dibuat');
    }

    const stats = fs.statSync(targetPath);

    // Auto-clean backups > 30 hari
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const allFiles = fs.readdirSync(backupsDir);
    let deletedCount = 0;
    for (const f of allFiles) {
      if (f.endsWith('.sql')) {
        const p = path.join(backupsDir, f);
        const fStats = fs.statSync(p);
        if (fStats.mtimeMs < thirtyDaysAgo) {
          try {
            fs.unlinkSync(p);
            deletedCount++;
          } catch (e) {
            console.error('Gagal menghapus backup kadaluarsa:', e);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Backup database berhasil dibuat',
      method: usedMethod,
      backup: {
        filename,
        sizeBytes: stats.size,
        sizeFormatted: formatBytes(stats.size),
        createdAt: stats.mtime.toISOString(),
      },
      cleanedOldBackups: deletedCount,
    });
  } catch (error: any) {
    console.error('Error creating database backup:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal membuat backup database',
    }, { status: 500 });
  }
}

// Fallback direct SQL dumper
async function generateDirectSqlBackup(targetPath: string) {
  const client = await pool.connect();
  try {
    const stream = fs.createWriteStream(targetPath, { encoding: 'utf8' });

    stream.write(`-- ========================================================\n`);
    stream.write(`-- Procedure Management Database Direct SQL Backup\n`);
    stream.write(`-- Generated: ${new Date().toISOString()}\n`);
    stream.write(`-- Database: ${process.env.DB_NAME || 'procedure_management'}\n`);
    stream.write(`-- ========================================================\n\n`);
    stream.write(`SET client_encoding = 'UTF8';\n`);
    stream.write(`SET standard_conforming_strings = on;\n\n`);

    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    for (const { table_name } of tablesRes.rows) {
      stream.write(`\n-- -----------------------------------------------------\n`);
      stream.write(`-- Table: "${table_name}"\n`);
      stream.write(`-- -----------------------------------------------------\n`);

      const rowsRes = await client.query(`SELECT * FROM "${table_name}"`);
      if (rowsRes.rows.length === 0) {
        stream.write(`-- (0 records)\n`);
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
    }

    await new Promise<void>((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
      stream.end();
    });
  } finally {
    client.release();
  }
}
