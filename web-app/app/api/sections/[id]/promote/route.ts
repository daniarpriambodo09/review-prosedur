// app/api/sections/[id]/promote/route.ts
//
// Menaikkan sebuah Section menjadi Departemen baru yang berdiri sendiri.
// - Departemen baru dibuat dengan nama yang SAMA PERSIS dengan Section.
// - Staff yang sebelumnya ter-assign ke section ini OTOMATIS ikut pindah
//   ke departemen baru (unit_type 'section' -> 'department').
// - Section lama dihapus setelah promote (sudah "menjelma" jadi departemen).
// - Nama Owner di procedure_documents/arsip_prosedur TIDAK berubah — promote
//   tidak mengubah nama apapun, hanya jenis unitnya di /kelola-departemen.

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { id } = await params;

    const sectionResult = await client.query(`SELECT * FROM sections WHERE id = $1`, [id]);
    if (sectionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Section tidak ditemukan' }, { status: 404 });
    }
    const section = sectionResult.rows[0];

    const dupCheck = await client.query(`SELECT id FROM departments WHERE nama = $1`, [section.nama]);
    if (dupCheck.rows.length > 0) {
      return NextResponse.json(
        { error: `Departemen dengan nama "${section.nama}" sudah ada` },
        { status: 409 }
      );
    }

    await client.query('BEGIN');

    const deptResult = await client.query(
      `INSERT INTO departments (nama) VALUES ($1) RETURNING *`,
      [section.nama]
    );
    const newDeptId = deptResult.rows[0].id;

    const staffMoved = await client.query(
      `UPDATE staff_directory
       SET unit_type = 'department', unit_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE unit_type = 'section' AND unit_id = $2
       RETURNING kode`,
      [newDeptId, id]
    );

    await client.query(`DELETE FROM sections WHERE id = $1`, [id]);

    await client.query('COMMIT');

    return NextResponse.json(
      {
        success:      true,
        departmentId: newDeptId,
        nama:         section.nama,
        staffMoved:   staffMoved.rowCount ?? 0,
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error promoting section to department:', error);
    return NextResponse.json({ error: 'Gagal menaikkan section menjadi departemen' }, { status: 500 });
  } finally {
    client.release();
  }
}