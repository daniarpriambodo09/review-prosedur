// app/api/staff/route.ts
//
// GET   — daftar semua staff, dengan info unit (department/section) yang
//         sudah di-resolve jadi nama, supaya gampang ditampilkan di tabel.
// POST  — tambah staff baru secara manual (body: { kode, email, nama,
//         jabatanRaw?, unitType?, unitId?, isManager? }).
// PATCH — update satu staff (body: { kode, email?, nama?, jabatanRaw?,
//         unitType?, unitId?, isManager? }). Dipakai admin utk perbaiki hasil
//         parsing otomatis yang meleset (mis. section yang ke-fallback ke
//         'BELUM DIKELOMPOKKAN'), atau edit data staff biasa.

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        s.kode, s.email, s.nama, s.jabatan_raw, s.unit_type, s.unit_id, s.is_manager,
        CASE
          WHEN s.unit_type = 'department' THEN d1.nama
          WHEN s.unit_type = 'section'    THEN sec.nama
        END AS unit_nama,
        CASE
          WHEN s.unit_type = 'section' THEN d2.nama
          ELSE NULL
        END AS parent_department_nama
      FROM staff_directory s
      LEFT JOIN departments d1 ON s.unit_type = 'department' AND d1.id = s.unit_id
      LEFT JOIN sections    sec ON s.unit_type = 'section'    AND sec.id = s.unit_id
      LEFT JOIN departments d2 ON sec.department_id = d2.id
      ORDER BY s.nama ASC
    `);

    return NextResponse.json(
      result.rows.map(row => ({
        kode:                 row.kode,
        email:                row.email,
        nama:                 row.nama,
        jabatanRaw:           row.jabatan_raw,
        unitType:             row.unit_type,
        unitId:               row.unit_id,
        unitNama:             row.unit_nama,
        parentDepartmentNama: row.parent_department_nama,
        isManager:            row.is_manager,
      }))
    );
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  let kode = '';
  try {
    const body = await request.json();
    kode             = (body.kode || '').trim().toUpperCase();
    const email      = (body.email || '').trim();
    const nama       = (body.nama || '').trim();
    const jabatanRaw = body.jabatanRaw ? String(body.jabatanRaw).trim() : null;
    const unitType   = body.unitType || null; // 'department' | 'section' | null
    const unitId     = body.unitId || null;
    const isManager  = typeof body.isManager === 'boolean' ? body.isManager : false;

    if (!kode || !email || !nama) {
      return NextResponse.json({ error: 'Kode, email, dan nama wajib diisi' }, { status: 400 });
    }
    if (unitType && !['department', 'section'].includes(unitType)) {
      return NextResponse.json({ error: 'unitType harus department atau section' }, { status: 400 });
    }
    // PENTING: kode ini yang akan dicocokkan dengan kolom procedure_documents.pic
    // (mis. 'AYS') — jadi harus konsisten dengan kode yang dipakai di sana.

    const result = await client.query(
      `INSERT INTO staff_directory (kode, email, nama, jabatan_raw, unit_type, unit_id, is_manager, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [kode, email, nama, jabatanRaw, unitType, unitId, isManager]
    );

    return NextResponse.json(
      {
        kode:      result.rows[0].kode,
        email:     result.rows[0].email,
        nama:      result.rows[0].nama,
        unitType:  result.rows[0].unit_type,
        unitId:    result.rows[0].unit_id,
        isManager: result.rows[0].is_manager,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating staff:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: `Kode staff '${kode}' sudah dipakai` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create staff' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PATCH(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const kode       = (body.kode || '').trim().toUpperCase();
    const email      = body.email !== undefined ? String(body.email).trim() : undefined;
    const nama       = body.nama !== undefined ? String(body.nama).trim() : undefined;
    const jabatanRaw = body.jabatanRaw !== undefined ? (body.jabatanRaw ? String(body.jabatanRaw).trim() : null) : undefined;
    const unitType   = body.unitType; // 'department' | 'section' | null
    const unitId     = body.unitId ?? null;
    const isManager  = typeof body.isManager === 'boolean' ? body.isManager : undefined;

    if (!kode) {
      return NextResponse.json({ error: 'Kode staff wajib diisi' }, { status: 400 });
    }
    if (unitType && !['department', 'section'].includes(unitType)) {
      return NextResponse.json({ error: 'unitType harus department atau section' }, { status: 400 });
    }

    const existing = await client.query(`SELECT * FROM staff_directory WHERE kode = $1`, [kode]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Staff tidak ditemukan' }, { status: 404 });
    }
    const current = existing.rows[0];

    const result = await client.query(
      `UPDATE staff_directory
       SET email       = $1,
           nama        = $2,
           jabatan_raw = $3,
           unit_type   = $4,
           unit_id     = $5,
           is_manager  = $6,
           updated_at  = CURRENT_TIMESTAMP
       WHERE kode = $7
       RETURNING *`,
      [
        email !== undefined ? email : current.email,
        nama !== undefined ? nama : current.nama,
        jabatanRaw !== undefined ? jabatanRaw : current.jabatan_raw,
        unitType !== undefined ? unitType : current.unit_type,
        unitType !== undefined ? unitId   : current.unit_id,
        isManager !== undefined ? isManager : current.is_manager,
        kode,
      ]
    );

    return NextResponse.json({
      kode:      result.rows[0].kode,
      email:     result.rows[0].email,
      nama:      result.rows[0].nama,
      unitType:  result.rows[0].unit_type,
      unitId:    result.rows[0].unit_id,
      isManager: result.rows[0].is_manager,
    });
  } catch (error) {
    console.error('Error updating staff:', error);
    return NextResponse.json({ error: 'Failed to update staff' }, { status: 500 });
  } finally {
    client.release();
  }
}