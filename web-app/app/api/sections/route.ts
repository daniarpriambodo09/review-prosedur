// app/api/sections/route.ts
//
// GET  — daftar semua section: nama departemen induk (nullable), jumlah
//        dokumen di procedure_documents yang Owner-nya cocok, dan jumlah
//        staff yang ter-assign ke section ini.
// POST — buat section baru (berdiri sendiri, department_id = NULL).
//        Section TIDAK lagi wajib punya departemen induk saat dibuat —
//        admin bisa memasukkannya ke sebuah Departemen belakangan dari
//        tab Departemen di /kelola-departemen.

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        s.id, s.nama, s.department_id, d.nama AS department_nama,
        COALESCE(doc.doc_count, 0) AS doc_count,
        COALESCE(stf.staff_count, 0) AS staff_count
      FROM sections s
      LEFT JOIN departments d ON d.id = s.department_id
      LEFT JOIN (
        SELECT TRIM(owner) AS owner_nama, COUNT(*) AS doc_count
        FROM procedure_documents
        GROUP BY TRIM(owner)
      ) doc ON doc.owner_nama = s.nama
      LEFT JOIN (
        SELECT section_id, COUNT(DISTINCT staff_kode) AS staff_count
        FROM staff_sections GROUP BY section_id
      ) stf ON stf.section_id = s.id
      ORDER BY s.nama ASC
    `);

    return NextResponse.json(
      result.rows.map(row => ({
        id:             row.id,
        nama:           row.nama,
        departmentId:   row.department_id,
        departmentNama: row.department_nama,
        docCount:       Number(row.doc_count),
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
    const body = await request.json();
    const nama = (body.nama || '').trim();

    if (!nama) {
      return NextResponse.json({ error: 'Nama section wajib diisi' }, { status: 400 });
    }

    const result = await client.query(
      `INSERT INTO sections (nama, department_id) VALUES ($1, NULL) RETURNING *`,
      [nama]
    );

    return NextResponse.json(
      { id: result.rows[0].id, nama: result.rows[0].nama, departmentId: null },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating section:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Nama section sudah ada' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
  } finally {
    client.release();
  }
}