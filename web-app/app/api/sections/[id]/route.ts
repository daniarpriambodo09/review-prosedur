// app/api/sections/[id]/route.ts
//
// PATCH  — ubah nama section dan/atau pindahkan ke departemen lain.
// DELETE — hapus section (ditolak kalau masih ada staff di section itu).

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
    const nama         = body.nama !== undefined ? String(body.nama).trim() : undefined;
    const departmentId = body.departmentId;

    if (nama === '' ) {
      return NextResponse.json({ error: 'Nama section tidak boleh kosong' }, { status: 400 });
    }

    const existing = await client.query(`SELECT * FROM sections WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Section tidak ditemukan' }, { status: 404 });
    }
    const current = existing.rows[0];

    const result = await client.query(
      `UPDATE sections
       SET nama = $1, department_id = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [nama ?? current.nama, departmentId ?? current.department_id, id]
    );

    return NextResponse.json({
      id:           result.rows[0].id,
      nama:         result.rows[0].nama,
      departmentId: result.rows[0].department_id,
    });
  } catch (error: any) {
    console.error('Error updating section:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Nama section sudah ada' }, { status: 409 });
    }
    if (error.code === '23503') {
      return NextResponse.json({ error: 'Departemen induk tidak valid' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
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
      `SELECT COUNT(*)::int AS count FROM staff_directory WHERE unit_type = 'section' AND unit_id = $1`,
      [id]
    );
    if (staffCheck.rows[0].count > 0) {
      return NextResponse.json(
        { error: `Tidak bisa dihapus — masih ada ${staffCheck.rows[0].count} staff di section ini. Pindahkan staff-nya dulu.` },
        { status: 409 }
      );
    }

    const result = await client.query(`DELETE FROM sections WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Section tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting section:', error);
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
  } finally {
    client.release();
  }
}