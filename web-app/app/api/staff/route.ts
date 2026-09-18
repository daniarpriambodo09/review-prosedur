// app/api/staff/route.ts
//
// GET   — daftar semua staff, dengan info unit (department/section) yang
//         sudah di-resolve jadi nama.
// POST  — tambah staff baru secara manual.
// PATCH — update satu staff. 🆕 sekarang termasuk field `jabatan` (role
//         singkat, mis. SPV/SSPV/MGR — terpisah dari jabatan_raw yang
//         merupakan teks mentah asli dari Excel).

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        s.kode,
        s.email,
        s.nama,
        s.jabatan_raw,
        s.jabatan,
        s.is_manager,
        s.unit_type,
        s.unit_id,
        CASE
          WHEN s.unit_type = 'department' THEN s.unit_id
          ELSE NULL
        END AS department_id,
        CASE
          WHEN s.unit_type = 'department' THEN d1.nama
          ELSE NULL
        END AS department_nama,
        CASE
          WHEN s.unit_type = 'department' THEN d1.nama
          WHEN s.unit_type = 'section'    THEN sec.nama
        END AS unit_nama,
        CASE
          WHEN s.unit_type = 'section' THEN d2.nama
          ELSE NULL
        END AS parent_department_nama,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', sc.id,
                'nama', sc.nama,
                'departmentNama', d_sec.nama
              ) ORDER BY sc.nama
            )
            FROM staff_sections ss
            JOIN sections sc ON sc.id = ss.section_id
            LEFT JOIN departments d_sec ON d_sec.id = sc.department_id
            WHERE ss.staff_kode = s.kode
          ),
          '[]'::json
        ) AS sections
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
        jabatan:              row.jabatan,
        sections:             row.sections || [],
        departmentId:         row.department_id,
        departmentNama:       row.department_nama,
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
    const jabatan    = body.jabatan ? String(body.jabatan).trim() : null;
    const isManager  = typeof body.isManager === 'boolean' ? body.isManager : false;

    // Support sectionIds + departmentId, or legacy unitType + unitId
    const sectionIds: number[] = Array.isArray(body.sectionIds)
      ? body.sectionIds.map((id: any) => Number(id)).filter((n: number) => !isNaN(n))
      : [];
    const departmentId: number | null = body.departmentId ? Number(body.departmentId) : null;

    let unitType = body.unitType || null;
    let unitId = body.unitId || null;

    if (departmentId) {
      unitType = 'department';
      unitId = departmentId;
    } else if (sectionIds.length > 0) {
      unitType = 'section';
      unitId = sectionIds[0];
    }

    if (!kode || !email || !nama) {
      return NextResponse.json({ error: 'Kode, email, dan nama wajib diisi' }, { status: 400 });
    }
    if (unitType && !['department', 'section'].includes(unitType)) {
      return NextResponse.json({ error: 'unitType harus department atau section' }, { status: 400 });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO staff_directory
         (kode, email, nama, jabatan_raw, jabatan, unit_type, unit_id, is_manager, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [kode, email, nama, jabatanRaw, jabatan, unitType, unitId, isManager]
    );

    // Sync staff_sections
    if (sectionIds.length > 0) {
      for (const sId of sectionIds) {
        await client.query(
          `INSERT INTO staff_sections (staff_kode, section_id)
           VALUES ($1, $2)
           ON CONFLICT (staff_kode, section_id) DO NOTHING`,
          [kode, sId]
        );
      }
    } else if (unitType === 'section' && unitId) {
      await client.query(
        `INSERT INTO staff_sections (staff_kode, section_id)
         VALUES ($1, $2)
         ON CONFLICT (staff_kode, section_id) DO NOTHING`,
        [kode, unitId]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json(
      {
        kode:         result.rows[0].kode,
        email:        result.rows[0].email,
        nama:         result.rows[0].nama,
        jabatan:      result.rows[0].jabatan,
        sectionIds:   sectionIds,
        departmentId: departmentId,
        unitType:     result.rows[0].unit_type,
        unitId:       result.rows[0].unit_id,
        isManager:    result.rows[0].is_manager,
      },
      { status: 201 }
    );
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
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
    const kode      = (body.kode || '').trim().toUpperCase();
    const email     = body.email !== undefined ? String(body.email).trim() : undefined;
    const nama      = body.nama !== undefined ? String(body.nama).trim() : undefined;
    const jabatan   = body.jabatan !== undefined ? (body.jabatan ? String(body.jabatan).trim() : null) : undefined;
    const isManager = typeof body.isManager === 'boolean' ? body.isManager : undefined;

    const sectionIds: number[] | undefined = Array.isArray(body.sectionIds)
      ? body.sectionIds.map((id: any) => Number(id)).filter((n: number) => !isNaN(n))
      : undefined;
    const departmentId: number | null | undefined = body.departmentId !== undefined
      ? (body.departmentId ? Number(body.departmentId) : null)
      : undefined;

    let unitType = body.unitType; // 'department' | 'section' | null
    let unitId = body.unitId !== undefined ? body.unitId : undefined;

    if (!kode) {
      return NextResponse.json({ error: 'Kode staff wajib diisi' }, { status: 400 });
    }

    const existing = await client.query(`SELECT * FROM staff_directory WHERE kode = $1`, [kode]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Staff tidak ditemukan' }, { status: 404 });
    }
    const current = existing.rows[0];

    // Determine unit_type & unit_id if sectionIds or departmentId were provided
    if (departmentId !== undefined || sectionIds !== undefined) {
      const activeDeptId = departmentId !== undefined ? departmentId : (current.unit_type === 'department' ? current.unit_id : null);
      const activeSectionIds = sectionIds !== undefined ? sectionIds : [];

      if (activeDeptId) {
        unitType = 'department';
        unitId = activeDeptId;
      } else if (activeSectionIds.length > 0) {
        unitType = 'section';
        unitId = activeSectionIds[0];
      } else if (departmentId === null && sectionIds !== undefined && activeSectionIds.length === 0) {
        unitType = null;
        unitId = null;
      }
    }

    if (unitType && !['department', 'section'].includes(unitType)) {
      return NextResponse.json({ error: 'unitType harus department atau section' }, { status: 400 });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE staff_directory
       SET email       = $1,
           nama        = $2,
           jabatan     = $3,
           unit_type   = $4,
           unit_id     = $5,
           is_manager  = $6,
           updated_at  = CURRENT_TIMESTAMP
       WHERE kode = $7
       RETURNING *`,
      [
        email !== undefined ? email : current.email,
        nama !== undefined ? nama : current.nama,
        jabatan !== undefined ? jabatan : current.jabatan,
        unitType !== undefined ? unitType : current.unit_type,
        unitType !== undefined ? unitId   : current.unit_id,
        isManager !== undefined ? isManager : current.is_manager,
        kode,
      ]
    );

    // Sync staff_sections if sectionIds was provided
    if (sectionIds !== undefined) {
      await client.query(`DELETE FROM staff_sections WHERE staff_kode = $1`, [kode]);
      for (const sId of sectionIds) {
        await client.query(
          `INSERT INTO staff_sections (staff_kode, section_id)
           VALUES ($1, $2)
           ON CONFLICT (staff_kode, section_id) DO NOTHING`,
          [kode, sId]
        );
      }
    } else if (unitType === 'section' && unitId) {
      await client.query(
        `INSERT INTO staff_sections (staff_kode, section_id)
         VALUES ($1, $2)
         ON CONFLICT (staff_kode, section_id) DO NOTHING`,
        [kode, unitId]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({
      kode:         result.rows[0].kode,
      email:        result.rows[0].email,
      nama:         result.rows[0].nama,
      jabatan:      result.rows[0].jabatan,
      unitType:     result.rows[0].unit_type,
      unitId:       result.rows[0].unit_id,
      isManager:    result.rows[0].is_manager,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error updating staff:', error);
    return NextResponse.json({ error: 'Failed to update staff' }, { status: 500 });
  } finally {
    client.release();
  }
}