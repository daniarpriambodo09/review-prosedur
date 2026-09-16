// app/api/departments/route.ts
//
// GET  — daftar semua departemen: jumlah staff LANGSUNG di departemen ini
//        (bukan lewat section), daftar manager, dan daftar Section yang
//        sudah dimasukkan ke departemen ini.
// POST — buat departemen baru (kosong, belum ada section).

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        d.id, d.nama, d.created_at, d.updated_at,
        COALESCE(stf.staff_count, 0) AS staff_count,
        COALESCE(mgr.managers, '[]')  AS managers,
        COALESCE(sec.sections, '[]')  AS sections
      FROM departments d
      LEFT JOIN (
        SELECT unit_id, COUNT(*) AS staff_count
        FROM staff_directory WHERE unit_type = 'department' GROUP BY unit_id
      ) stf ON stf.unit_id = d.id
      LEFT JOIN (
        SELECT dm.department_id,
               json_agg(json_build_object('kode', s.kode, 'nama', s.nama, 'email', s.email)) AS managers
        FROM department_managers dm
        JOIN staff_directory s ON s.kode = dm.manager_kode
        GROUP BY dm.department_id
      ) mgr ON mgr.department_id = d.id
      LEFT JOIN (
        SELECT department_id,
               json_agg(json_build_object('id', id, 'nama', nama) ORDER BY nama) AS sections
        FROM sections
        WHERE department_id IS NOT NULL
        GROUP BY department_id
      ) sec ON sec.department_id = d.id
      ORDER BY d.nama ASC
    `);

    return NextResponse.json(
      result.rows.map(row => ({
        id:         row.id,
        nama:       row.nama,
        createdAt:  row.created_at,
        updatedAt:  row.updated_at,
        staffCount: Number(row.staff_count),
        managers:   row.managers,
        sections:   row.sections,
      }))
    );
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const nama = (body.nama || '').trim();

    if (!nama) {
      return NextResponse.json({ error: 'Nama departemen wajib diisi' }, { status: 400 });
    }

    const result = await client.query(
      `INSERT INTO departments (nama) VALUES ($1) RETURNING *`,
      [nama]
    );

    return NextResponse.json(
      { id: result.rows[0].id, nama: result.rows[0].nama },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating department:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Nama departemen sudah ada' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 });
  } finally {
    client.release();
  }
}