// app/api/procedures/seed/route.ts

import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RAW_EXCEL_ROWS } from '@/data/data_review/all-data-table';

function parseExcelDate(dateStr: string): string {
  const [day, month, year] = dateStr.split('-');
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const paddedDay = day.padStart(2, '0');
  const monthNum = months[month];
  if (!monthNum) return '1970-01-01';
  const fullYear = parseInt(year, 10) < 50 ? `20${year}` : `19${year}`;
  return `${fullYear}-${monthNum}-${paddedDay}`;
}

export async function POST() {
  const client = await pool.connect();
  
  try {
    // Check if already seeded
    const countResult = await client.query('SELECT COUNT(*) FROM procedure_documents');
    const count = parseInt(countResult.rows[0].count);

    if (count > 0) {
      return NextResponse.json(
        { message: 'Database already seeded', count },
        { status: 200 }
      );
    }

    // Begin transaction
    await client.query('BEGIN');

    // Insert data - AMBIL SEMUA PIC dan EMAIL (tidak di-split)
    const insertQuery = `
      INSERT INTO procedure_documents 
      (nama_dokumen, nomor_dokumen, level_dokumen, tanggal_selesai_approval, revisi, owner, pic, email, status, is_custom)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    for (const row of RAW_EXCEL_ROWS) {
      const values = [
        row.nama,
        row.nomorDokumen,
        row.level,
        parseExcelDate(row.tanggal),
        row.revisi,
        row.owner.trim(),
        row.pic.trim(), // AMBIL SEMUA PIC (tidak di-split)
        row.email.trim(), // AMBIL SEMUA EMAIL (tidak di-split)
        '-',
        false
      ];

      await client.query(insertQuery, values);
    }

    // Commit transaction
    await client.query('COMMIT');

    const newCountResult = await client.query('SELECT COUNT(*) FROM procedure_documents');
    const newCount = parseInt(newCountResult.rows[0].count);

    return NextResponse.json(
      { message: 'Database seeded successfully', count: newCount },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding database:', error);
    return NextResponse.json(
      { error: 'Failed to seed database' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}