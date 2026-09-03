// app/api/departments/[id]/managers/route.ts
//
// POST   — assign seorang staff jadi manager departemen ini (body: { kode }).
//          Otomatis set staff_directory.is_manager = TRUE juga.
// DELETE — lepas assignment manager dari departemen ini (body: { kode }).
//          TIDAK mengubah is_manager di staff_directory (siapa tahu dia
//          masih manager departemen lain).

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { id } = await params;
    const body = await request.json();
    const kode = (body.kode || '').trim().toUpperCase();

    if (!kode) {
      return NextResponse.json({ error: 'Kode staff wajib diisi' }, { status: 400 });
    }

    const staffCheck = await client.query(`SELECT kode FROM staff_directory WHERE kode = $1`, [kode]);
    if (staffCheck.rows.length === 0) {
      return NextResponse.json({ error: `Staff dengan kode '${kode}' tidak ditemukan` }, { status: 404 });
    }

    await client.query('BEGIN');

    await client.query(
      `INSERT INTO department_managers (department_id, manager_kode)
       VALUES ($1, $2)
       ON CONFLICT (department_id, manager_kode) DO NOTHING`,
      [id, kode]
    );
    await client.query(
      `UPDATE staff_directory SET is_manager = TRUE, updated_at = CURRENT_TIMESTAMP WHERE kode = $1`,
      [kode]
    );

    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error assigning manager:', error);
    return NextResponse.json({ error: 'Failed to assign manager' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const kode = (searchParams.get('kode') || '').trim().toUpperCase();

    if (!kode) {
      return NextResponse.json({ error: 'Kode staff wajib diisi' }, { status: 400 });
    }

    await client.query(
      `DELETE FROM department_managers WHERE department_id = $1 AND manager_kode = $2`,
      [id, kode]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing manager:', error);
    return NextResponse.json({ error: 'Failed to remove manager' }, { status: 500 });
  } finally {
    client.release();
  }
}