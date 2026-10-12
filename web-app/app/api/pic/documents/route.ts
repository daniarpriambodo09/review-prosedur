// app/api/pic/documents/route.ts
// PERBAIKAN: Dual approach filtering - by pic code AND by email

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { resolveManagerDepartments } from '@/lib/managerDepartment';

export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    const picEmail = request.headers.get('x-pic-email');

    if (!picEmail) {
      return NextResponse.json(
        { error: 'Header x-pic-email wajib ada' },
        { status: 400 }
      );
    }

    // Ekstrak kode PIC dari email: "dp@jai.co.id" → ["DP"]
    const emailLocalPart = picEmail.split('@')[0].trim().toUpperCase();
    const picCodes = emailLocalPart
      .split(',')
      .map((c: string) => c.trim())
      .filter((c: string) => c.length > 0);

    const picCode = picCodes[0] || 'PIC';

    // ── Resolve Relasi Staff & Jabatan Manager dari kelola-departemen ─────────
    const managerInfo = await resolveManagerDepartments(
      client,
      picEmail,
      '',
      picCodes
    );

    const isManager = managerInfo.isManager && managerInfo.departments.length > 0;
    const deptIds = managerInfo.departments.map(d => d.id);

    let query = '';
    let queryParams: any[] = [];

    if (isManager) {
      queryParams = [deptIds, `%${picCode}%`, `%${picEmail}%`];
      query = `
        WITH target_depts AS (
          SELECT id, nama FROM departments WHERE id = ANY($1)
        ),
        target_sections AS (
          SELECT id, nama FROM sections WHERE department_id = ANY($1)
        ),
        target_staff AS (
          SELECT DISTINCT s.kode, s.email
          FROM staff_directory s
          LEFT JOIN staff_sections ss ON ss.staff_kode = s.kode
          LEFT JOIN sections sc ON sc.id = ss.section_id
          WHERE (s.unit_type = 'department' AND s.unit_id = ANY($1))
             OR sc.department_id = ANY($1)
        )
        SELECT
          pd.id,
          pd.nomor_dokumen,
          pd.nama_dokumen,
          pd.level_dokumen,
          pd.tanggal_selesai_approval,
          pd.revisi,
          pd.owner,
          pd.pic,
          pd.email,
          pd.status,
          pd.updated_at AS created_at
        FROM procedure_documents pd
        WHERE (
          EXISTS (SELECT 1 FROM target_depts td WHERE pd.owner ILIKE '%' || td.nama || '%')
          OR EXISTS (SELECT 1 FROM target_sections ts WHERE pd.owner ILIKE '%' || ts.nama || '%')
          OR EXISTS (SELECT 1 FROM target_staff tst WHERE pd.pic ILIKE '%' || tst.kode || '%' OR pd.email ILIKE '%' || tst.email || '%')
          OR pd.pic ILIKE $2
          OR pd.email ILIKE $3
        )
        ORDER BY pd.tanggal_selesai_approval DESC
      `;
    } else {
      // Bangun kondisi WHERE dual: pic code + email
      const picConditions: string[] = [];
      let paramIndex = 1;

      for (const code of picCodes) {
        picConditions.push(`pic ILIKE $${paramIndex}`);
        queryParams.push(`%${code}%`);
        paramIndex++;
      }

      picConditions.push(`email ILIKE $${paramIndex}`);
      queryParams.push(`%${picEmail}%`);
      paramIndex++;

      const whereClause = picConditions.join(' OR ');

      query = `
        SELECT
          id,
          nomor_dokumen,
          nama_dokumen,
          level_dokumen,
          tanggal_selesai_approval,
          revisi,
          owner,
          pic,
          email,
          status,
          updated_at AS created_at
        FROM procedure_documents
        WHERE ${whereClause}
        ORDER BY tanggal_selesai_approval DESC
      `;
    }

    const result = await client.query(query, queryParams);
    const documents = result.rows.map((row: any) => ({
      id:             row.id,
      documentNumber: row.nomor_dokumen,
      title:          row.nama_dokumen,
      status:         row.status,
      createdAt:      row.created_at,
      owner:          row.owner,
      pic:            row.pic,
    }));

    return NextResponse.json({ documents });

  } catch (error) {
    console.error('Error fetching PIC documents:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data dokumen' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}