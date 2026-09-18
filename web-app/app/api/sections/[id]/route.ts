// app/api/sections/[id]/route.ts
//
// PATCH — ubah nama section dan/atau departemen induknya (bisa di-set NULL
//         untuk melepas dari departemen). Kalau nama berubah, otomatis
//         cascade-update kolom Owner di procedure_documents DAN
//         arsip_prosedur yang masih memakai nama lama — supaya
//         /status-review tetap konsisten tanpa perlu edit manual satu-satu.
// DELETE — hapus section. Ditolak kalau masih ada staff ter-assign ke
//          section ini. Dokumen yang Owner-nya masih memakai nama section
//          ini TIDAK ikut terhapus/berubah — hanya tidak lagi muncul di
//          dropdown Owner untuk dokumen baru.

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
    const namaBaru = body.nama !== undefined ? String(body.nama).trim() : undefined;
    // departmentId: number untuk assign, null untuk lepas dari departemen,
    // undefined kalau field ini memang tidak dikirim (tidak diubah).
    const departmentId = body.departmentId !== undefined ? body.departmentId : undefined;

    if (namaBaru === '') {
      return NextResponse.json({ error: 'Nama section tidak boleh kosong' }, { status: 400 });
    }

    const existing = await client.query(`SELECT * FROM sections WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Section tidak ditemukan' }, { status: 404 });
    }
    const current  = existing.rows[0];
    const namaLama = current.nama;

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE sections
       SET nama = $1, department_id = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [
        namaBaru !== undefined ? namaBaru : current.nama,
        departmentId !== undefined ? departmentId : current.department_id,
        id,
      ]
    );

    let affectedDocs = 0;
    if (namaBaru !== undefined && namaBaru !== namaLama) {
      // 🆕 Cascade — samakan Owner di semua dokumen (aktif & arsip) yang
      // masih memakai nama section lama.
      const docUpdate = await client.query(
        `UPDATE procedure_documents
         SET owner = $1, updated_at = CURRENT_TIMESTAMP
         WHERE TRIM(owner) = $2`,
        [namaBaru, namaLama]
      );
      await client.query(
        `UPDATE arsip_prosedur
         SET owner = $1, updated_at = CURRENT_TIMESTAMP
         WHERE TRIM(owner) = $2`,
        [namaBaru, namaLama]
      );
      affectedDocs = docUpdate.rowCount ?? 0;
    }

    await client.query('COMMIT');

    return NextResponse.json({
      id:            result.rows[0].id,
      nama:          result.rows[0].nama,
      departmentId:  result.rows[0].department_id,
      affectedDocs, // jumlah dokumen aktif yang Owner-nya ikut ter-update
    });
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error updating section:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Nama section sudah ada' }, { status: 409 });
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
      `SELECT COUNT(DISTINCT staff_kode)::int AS count FROM staff_sections WHERE section_id = $1`,
      [id]
    );
    if (staffCheck.rows[0].count > 0) {
      return NextResponse.json(
        { error: `Tidak bisa dihapus — masih ada ${staffCheck.rows[0].count} staff di section ini. Pindahkan staff-nya dulu.` },
        { status: 409 }
      );
    }

    const sectionResult = await client.query(`SELECT nama FROM sections WHERE id = $1`, [id]);
    if (sectionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Section tidak ditemukan' }, { status: 404 });
    }
    const nama = sectionResult.rows[0].nama;

    const docCountResult = await client.query(
      `SELECT COUNT(*)::int AS count FROM procedure_documents WHERE TRIM(owner) = $1`,
      [nama]
    );

    await client.query(`DELETE FROM sections WHERE id = $1`, [id]);

    return NextResponse.json({
      success: true,
      // Info saja untuk ditampilkan ke admin — dokumen ini TIDAK ikut berubah.
      stillUsedByDocs: docCountResult.rows[0].count,
    });
  } catch (error) {
    console.error('Error deleting section:', error);
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
  } finally {
    client.release();
  }
}