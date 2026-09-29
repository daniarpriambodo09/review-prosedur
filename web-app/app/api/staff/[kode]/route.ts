// app/api/staff/[kode]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ kode: string }> }
) {
  const client = await pool.connect();
  try {
    const { kode: rawKode } = await params;
    const kode = decodeURIComponent(rawKode || '').trim().toUpperCase();

    if (!kode) {
      return NextResponse.json({ error: 'Kode staff diperlukan' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Hapus relasi di staff_sections
    await client.query(`DELETE FROM staff_sections WHERE staff_kode = $1`, [kode]);

    // Hapus relasi di department_managers
    await client.query(`DELETE FROM department_managers WHERE manager_kode = $1`, [kode]);

    // Hapus dari staff_directory
    const res = await client.query(
      `DELETE FROM staff_directory WHERE kode = $1 RETURNING kode, nama`,
      [kode]
    );

    if (res.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Staff tidak ditemukan' }, { status: 404 });
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true, deleted: res.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error deleting staff by route param:', error);
    return NextResponse.json({ error: 'Gagal menghapus staff' }, { status: 500 });
  } finally {
    client.release();
  }
}
