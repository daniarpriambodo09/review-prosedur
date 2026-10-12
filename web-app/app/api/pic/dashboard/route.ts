// app/api/pic/dashboard/route.ts
// PERBAIKAN: Setelah perubahan login PIC menggunakan email asli (bukan format @jai.co.id),
// picCode harus diekstrak dengan benar dari email, dan query harus mencakup
// pencarian berdasarkan KEDUA kolom: pic (kode singkat) DAN email (email asli).
//
// UPDATE: Support query param ?status= untuk filter dokumen dari PICDocumentsList.
// Jika ?status tidak ada atau 'all', kembalikan semua dokumen.

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { resolveManagerDepartments } from '@/lib/managerDepartment';

// Status yang valid diterima dari query param
const VALID_STATUSES = ['all', 'pending', 'approved', 'revision', 'rejected'] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

// Pemetaan status filter (dari chip UI) → nilai status di database
const STATUS_MAP: Record<Exclude<ValidStatus, 'all'>, string[]> = {
  pending:  ['Menunggu', 'Belum dikirim', 'Telah terkirim', 'Telah dibaca', '-'],
  approved: ['Relevan'],
  revision: ['Revisi'],
  rejected: ['Obsolete'],
};

export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    const picId    = request.headers.get('x-pic-id');
    const picEmail = request.headers.get('x-pic-email');

    if (!picId || !picEmail) {
      return NextResponse.json(
        { error: 'Header x-pic-id dan x-pic-email wajib ada' },
        { status: 400 }
      );
    }

    // ── Baca query param ?status= ─────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const rawStatus = searchParams.get('status') ?? 'all';
    const statusFilter: ValidStatus = VALID_STATUSES.includes(rawStatus as ValidStatus)
      ? (rawStatus as ValidStatus)
      : 'all';

    // Ambil info PIC dari pic_users
    const picQuery = 'SELECT id, full_name, email, department FROM pic_users WHERE id = $1';
    const picResult = await client.query(picQuery, [picId]);

    if (picResult.rows.length === 0) {
      return NextResponse.json({ error: 'PIC tidak ditemukan' }, { status: 404 });
    }

    const picUser = picResult.rows[0];

    // ── Ekstrak picCode dari email ────────────────────────────────────────────
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
      picUser.full_name,
      picCodes
    );

    const isManager = managerInfo.isManager && managerInfo.departments.length > 0;
    const deptIds = managerInfo.departments.map(d => d.id);
    const deptNames = managerInfo.departments.map(d => d.nama).join(', ');

    let docsQuery = '';
    let docsParams: any[] = [];
    let statsQuery = '';
    let statsParams: any[] = [];

    if (isManager) {
      // ── Query khusus MANAGER: Tampilkan SELURUH DOKUMEN berdasarkan departemen ─
      // Mengambil dokumen yang:
      // 1. Owner dokumen sesuai dengan nama departemen
      // 2. Owner dokumen adalah section di bawah naungan departemen ini
      // 3. PIC dokumen adalah staf di bawah naungan departemen ini
      // 4. PIC dokumen atau email persis mencakup email/kode manager sendiri
      let statusClause = '';
      docsParams = [deptIds, `%${picCode}%`, `%${picEmail}%`];
      statsParams = [deptIds, `%${picCode}%`, `%${picEmail}%`];

      if (statusFilter !== 'all') {
        const dbStatuses = STATUS_MAP[statusFilter];
        statusClause = ` AND pd.status = ANY($4)`;
        docsParams.push(dbStatuses);
      }

      const managerCte = `
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
      `;

      const managerWhere = `
        WHERE (
          EXISTS (SELECT 1 FROM target_depts td WHERE pd.owner ILIKE '%' || td.nama || '%')
          OR EXISTS (SELECT 1 FROM target_sections ts WHERE pd.owner ILIKE '%' || ts.nama || '%')
          OR EXISTS (SELECT 1 FROM target_staff tst WHERE pd.pic ILIKE '%' || tst.kode || '%' OR pd.email ILIKE '%' || tst.email || '%')
          OR pd.pic ILIKE $2
          OR pd.email ILIKE $3
        )
      `;

      docsQuery = `
        ${managerCte}
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
        ${managerWhere}
        ${statusClause}
        ORDER BY pd.tanggal_selesai_approval DESC
      `;

      statsQuery = `
        ${managerCte}
        SELECT pd.status
        FROM procedure_documents pd
        ${managerWhere}
      `;

    } else {
      // ── Query PIC reguler: HANYA dokumen pribadi user ─────────────────────
      const picConditions: string[] = [];
      const picParams: string[] = [];
      let picParamIndex = 1;

      for (const code of picCodes) {
        picConditions.push(`pd.pic ILIKE $${picParamIndex}`);
        picParams.push(`%${code}%`);
        picParamIndex++;
      }

      picConditions.push(`pd.email ILIKE $${picParamIndex}`);
      picParams.push(`%${picEmail}%`);
      picParamIndex++;

      const picWhereClause = picConditions.join(' OR ');

      docsParams = [...picParams];
      statsParams = [...picParams];
      let statusClause = '';

      if (statusFilter !== 'all') {
        const dbStatuses = STATUS_MAP[statusFilter];
        statusClause = ` AND pd.status = ANY($${picParamIndex})`;
        docsParams.push(dbStatuses);
      }

      docsQuery = `
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
        WHERE (${picWhereClause})${statusClause}
        ORDER BY pd.tanggal_selesai_approval DESC
      `;

      statsQuery = `
        SELECT pd.status FROM procedure_documents pd WHERE (${picWhereClause})
      `;
    }

    const docsResult = await client.query(docsQuery, docsParams);
    const documents = docsResult.rows.map((row: any) => ({
      id:             row.id,
      documentNumber: row.nomor_dokumen,
      title:          row.nama_dokumen,
      status:         row.status,
      createdAt:      row.created_at,
      owner:          row.owner,
      pic:            row.pic,
    }));

    // ── statsQuery: SELALU tanpa filter status ────────────────────────────────
    let statsDocuments = documents;
    if (statusFilter !== 'all') {
      const statsResult = await client.query(statsQuery, statsParams);
      statsDocuments = statsResult.rows;
    }

    const totalDocuments  = statsDocuments.length;
    const pendingReview   = statsDocuments.filter((d: any) =>
      ['Menunggu', 'Belum dikirim', 'Telah terkirim', 'Telah dibaca', '-'].includes(d.status)
    ).length;
    const completedReview = statsDocuments.filter((d: any) =>
      ['Relevan', 'Revisi', 'Obsolete'].includes(d.status)
    ).length;

    // ── Total Request: hitung permintaan aktif ────────────────────────────────
    let reviewReqResult;
    if (isManager) {
      reviewReqResult = await client.query(
        `WITH target_depts AS (
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
        SELECT COUNT(*) as count 
        FROM pic_review_requests r
        JOIN procedure_documents pd ON pd.nomor_dokumen = r.nomor_dokumen
        WHERE (
          r.pic_id = $2
          OR EXISTS (SELECT 1 FROM target_depts td WHERE pd.owner ILIKE '%' || td.nama || '%')
          OR EXISTS (SELECT 1 FROM target_sections ts WHERE pd.owner ILIKE '%' || ts.nama || '%')
          OR EXISTS (SELECT 1 FROM target_staff tst WHERE pd.pic ILIKE '%' || tst.kode || '%' OR pd.email ILIKE '%' || tst.email || '%')
        )
          AND r.status = 'pending' 
          AND pd.status != 'Relevan'`,
        [deptIds, picId]
      );
    } else {
      reviewReqResult = await client.query(
        `SELECT COUNT(*) as count 
         FROM pic_review_requests r
         JOIN procedure_documents pd ON pd.nomor_dokumen = r.nomor_dokumen
         WHERE r.pic_id = $1 
           AND r.status = 'pending' 
           AND pd.status != 'Relevan'`,
        [picId]
      );
    }

    const docReqResult = await client.query(
      `SELECT COUNT(*) as count FROM pic_document_requests WHERE pic_id = $1 AND status = 'pending'`,
      [picId]
    );
    const totalRequests =
      parseInt(reviewReqResult.rows[0]?.count || '0') +
      parseInt(docReqResult.rows[0]?.count || '0');

    // Aktivitas terbaru
    const activitiesQuery = `
      SELECT id, activity_type, description, created_at
      FROM pic_activities
      WHERE pic_id = $1
      ORDER BY created_at DESC
      LIMIT 15
    `;
    const activitiesResult = await client.query(activitiesQuery, [picId]);
    const activities       = activitiesResult.rows.map((row: any) => ({
      id:           row.id,
      activityType: row.activity_type,
      description:  row.description,
      createdAt:    row.created_at,
    }));

    return NextResponse.json({
      picUser: {
        id:             picUser.id,
        fullName:       picUser.full_name,
        email:          picUser.email,
        picCode,
        isManager:      managerInfo.isManager,
        jabatan:        managerInfo.jabatan,
        departmentName: deptNames || picUser.department || null,
      },
      stats: {
        totalDocuments,
        pendingReview,
        completedReview,
        totalRequests,
      },
      documents,
      activities,
    });

  } catch (error) {
    console.error('Error fetching PIC dashboard data:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}