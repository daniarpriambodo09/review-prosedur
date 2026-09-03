// app/api/sections/route.ts
//
// GET  — daftar semua section + nama departemen induk + jumlah staff.
// POST — buat section baru (body: { nama, departmentId }).

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        s.id, s.nama, s.department_id, d.nama AS department_nama,
        COALESCE(stf.staff_count, 0) AS staff_count
      FROM sections s
      JOIN departments d ON d.id = s.department_id
      LEFT JOIN (
        SELECT unit_id, COUNT(*) AS staff_count
        FROM staff_directory WHERE unit_type = 'section' GROUP BY unit_id
      ) stf ON stf.unit_id = s.id
      ORDER BY d.nama ASC, s.nama ASC
    `);

    return NextResponse.json(
      result.rows.map(row => ({
        id:             row.id,
        nama:           row.nama,
        departmentId:   row.department_id,
        departmentNama: row.department_nama,
        staffCount:     Number(row.staff_count),
      }))
    );
  } catch (error) {
    console.error('Error fetching sections:', error);
    return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body        = await request.json();
    const nama         = (body.nama || '').trim();
    const departmentId = body.departmentId;

    if (!nama || !departmentId) {
      return NextResponse.json({ error: 'Nama section dan departemen induk wajib diisi' }, { status: 400 });
    }

    const result = await client.query(
      `INSERT INTO sections (nama, department_id) VALUES ($1, $2) RETURNING *`,
      [nama, departmentId]
    );

    return NextResponse.json(
      { id: result.rows[0].id, nama: result.rows[0].nama, departmentId: result.rows[0].department_id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating section:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Nama section sudah ada' }, { status: 409 });
    }
    if (error.code === '23503') {
      return NextResponse.json({ error: 'Departemen induk tidak valid' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
  } finally {
    client.release();
  }
}