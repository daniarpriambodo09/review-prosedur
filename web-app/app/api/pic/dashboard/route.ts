// app/api/pic/dashboard/route.ts
// PERBAIKAN: Setelah perubahan login PIC menggunakan email asli (bukan format @jai.co.id),
// picCode harus diekstrak dengan benar dari email, dan query harus mencakup
// pencarian berdasarkan KEDUA kolom: pic (kode singkat) DAN email (email asli).
//
// UPDATE: Support query param ?status= untuk filter dokumen dari PICDocumentsList.
// Jika ?status tidak ada atau 'all', kembalikan semua dokumen.

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// Status yang valid diterima dari query param
const VALID_STATUSES = ['all', 'pending', 'approved', 'revision', 'rejected'] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

// Pemetaan status filter (dari chip UI) → nilai status di database
// Sesuaikan value-nya jika kolom `status` di DB menggunakan label berbeda
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
    const picQuery = 'SELECT id, full_name, email FROM pic_users WHERE id = $1';
    const picResult = await client.query(picQuery, [picId]);

    if (picResult.rows.length === 0) {
      return NextResponse.json({ error: 'PIC tidak ditemukan' }, { status: 404 });
    }

    const picUser = picResult.rows[0];

    // ── Ekstrak picCode dari email ────────────────────────────────────────────
    // Email format: "dp@jai.co.id" → picCode: "DP"
    // Email format: "vra, asw@jai.co.id" → picCode: "VRA, ASW" (multi-PIC)
    const emailLocalPart = picEmail.split('@')[0].trim().toUpperCase();
    const picCodes = emailLocalPart
      .split(',')
      .map((c: string) => c.trim())
      .filter((c: string) => c.length > 0);

    const picCode = picCodes[0];

    // ── Bangun WHERE clause untuk PIC ─────────────────────────────────────────
    // picParams dan picWhereClause dipakai oleh DUA query berbeda:
    //   1. docsQuery  — dengan status filter opsional
    //   2. statsQuery — SELALU tanpa status filter
    // Keduanya TIDAK boleh berbagi array params yang sama agar tidak terjadi
    // mismatch "bind message supplies X parameters, but prepared statement requires Y".
    const picConditions: string[] = [];
    const picParams: string[] = [];   // params khusus untuk WHERE pic/email — tidak pernah diubah
    let   picParamIndex = 1;

    for (const code of picCodes) {
      picConditions.push(`pd.pic ILIKE $${picParamIndex}`);
      picParams.push(`%${code}%`);
      picParamIndex++;
    }

    picConditions.push(`pd.email ILIKE $${picParamIndex}`);
    picParams.push(`%${picEmail}%`);
    picParamIndex++;

    const picWhereClause = picConditions.join(' OR ');

    // ── docsQuery: picParams + status filter opsional ─────────────────────────
    // Copy picParams ke array terpisah — jangan mutasi picParams langsung
    const docsParams: (string | string[])[] = [...picParams];
    let   docsParamIndex = picParamIndex;   // lanjutkan dari indeks setelah picParams
    let   statusClause   = '';

    if (statusFilter !== 'all') {
      const dbStatuses = STATUS_MAP[statusFilter];
      statusClause  = ` AND pd.status = ANY($${docsParamIndex})`;
      docsParams.push(dbStatuses as unknown as string);  // pg driver terima array
      docsParamIndex++;
    }

    const docsQuery = `
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
      FROM procedure_documents pd
      WHERE (${picWhereClause})${statusClause}
      ORDER BY tanggal_selesai_approval DESC
    `;

    const docsResult = await client.query(docsQuery, docsParams);
    const documents  = docsResult.rows.map((row: any) => ({
      id:             row.id,
      documentNumber: row.nomor_dokumen,
      title:          row.nama_dokumen,
      status:         row.status,
      createdAt:      row.created_at,
    }));

    // ── statsQuery: SELALU tanpa filter status — pakai picParams langsung ─────
    // Tujuan: angka di StatsCards tidak berubah saat user mengaktifkan filter.
    // picParams tidak pernah mengandung status param, jadi aman dipakai di sini.
    let statsDocuments = documents;   // default: reuse hasil docs jika tidak ada filter
    if (statusFilter !== 'all') {
      const statsResult = await client.query(
        `SELECT status FROM procedure_documents pd WHERE (${picWhereClause})`,
        picParams   // ← picParams murni, tidak ada status param di dalamnya
      );
      statsDocuments = statsResult.rows;
    }

    const totalDocuments  = statsDocuments.length;
    const pendingReview   = statsDocuments.filter((d: any) =>
      ['Menunggu', 'Belum dikirim', 'Telah terkirim', 'Telah dibaca', '-'].includes(d.status)
    ).length;
    const completedReview = statsDocuments.filter((d: any) =>
      ['Relevan', 'Revisi', 'Obsolete'].includes(d.status)
    ).length;

    const reviewReqResult = await client.query(
      `SELECT COUNT(*) as count FROM pic_review_requests WHERE pic_id = $1`,
      [picId]
    );
    const docReqResult = await client.query(
      `SELECT COUNT(*) as count FROM pic_document_requests WHERE pic_id = $1`,
      [picId]
    );
    const totalRequests =
      parseInt(reviewReqResult.rows[0].count) +
      parseInt(docReqResult.rows[0].count);

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
        id:       picUser.id,
        fullName: picUser.full_name,
        email:    picUser.email,
        picCode,
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