// app/api/departments/[id]/route.ts
//
// PATCH  — ubah nama departemen.
// DELETE — hapus departemen. Ditolak kalau masih ada staff LANGSUNG di
//          departemen ini (harus dipindah dulu). Section yang sudah
//          dimasukkan ke departemen ini TIDAK ikut terhapus — otomatis
//          dilepas (department_id -> NULL) supaya jadi section mandiri lagi.

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { id } = await params;
    const body = await request.json();
    const nama = (body.nama || '').trim();

    if (!nama) {
      return NextResponse.json({ error: 'Nama departemen wajib diisi' }, { status: 400 });
    }

    const result = await client.query(
      `UPDATE departments SET nama = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [nama, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Departemen tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ id: result.rows[0].id, nama: result.rows[0].nama });
  } catch (error: any) {
    console.error('Error updating department:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Nama departemen sudah ada' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
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

    const staffCheck = await client.query(
      `SELECT COUNT(*)::int AS count FROM staff_directory WHERE unit_type = 'department' AND unit_id = $1`,
      [id]
    );
    if (staffCheck.rows[0].count > 0) {
      return NextResponse.json(
        { error: `Tidak bisa dihapus — masih ada ${staffCheck.rows[0].count} staff langsung di departemen ini. Pindahkan staff-nya dulu.` },
        { status: 409 }
      );
    }

    await client.query('BEGIN');

    // 🆕 Section yang tergabung di departemen ini dilepas (jadi section
    // mandiri lagi), TIDAK ikut terhapus — supaya Section & relasinya ke
    // Owner di procedure_documents tidak hilang.
    const unassigned = await client.query(
      `UPDATE sections SET department_id = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE department_id = $1 RETURNING id`,
      [id]
    );

    const result = await client.query(`DELETE FROM departments WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Departemen tidak ditemukan' }, { status: 404 });
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      sectionsUnassigned: unassigned.rowCount ?? 0,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error deleting department:', error);
    return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 });
  } finally {
    client.release();
  }
}