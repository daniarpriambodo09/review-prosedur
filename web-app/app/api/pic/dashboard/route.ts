// app/api/pic/dashboard/route.ts
// PERBAIKAN: Setelah perubahan login PIC menggunakan email asli (bukan format @jai.co.id),
// picCode harus diekstrak dengan benar dari email, dan query harus mencakup
// pencarian berdasarkan KEDUA kolom: pic (kode singkat) DAN email (email asli).

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

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
    // Email format: "mcb, dhs@jai.co.id" → picCode: "MCB, DHS"
    //
    // Ambil bagian sebelum "@", lalu uppercase
    const emailLocalPart = picEmail.split('@')[0].trim().toUpperCase();

    // Untuk multi-PIC seperti "vra, asw@jai.co.id", emailLocalPart = "VRA, ASW"
    // Kita perlu split lagi dan cari per individu
    const picCodes = emailLocalPart
      .split(',')
      .map((c: string) => c.trim())
      .filter((c: string) => c.length > 0);

    // picCode utama (untuk display dan URL)
    const picCode = picCodes[0];

    // ── Query procedure_documents ─────────────────────────────────────────────
    // FIX: Gunakan dual approach:
    //   1. Match kolom `pic` (ILIKE) — untuk format lama dan format kode singkat
    //   2. Match kolom `email` (ILIKE) — untuk format baru yang menggunakan email asli
    //
    // Ini memastikan backward compatibility dan forward compatibility

    // Bangun kondisi WHERE yang mencakup semua picCodes
    // Contoh: pic ILIKE '%DP%' OR pic ILIKE '%US%' OR email ILIKE '%dp@jai.co.id%'
    const picConditions: string[] = [];
    const queryParams: string[] = [];
    let paramIndex = 1;

    // Kondisi berdasarkan kode pic
    for (const code of picCodes) {
      picConditions.push(`pd.pic ILIKE $${paramIndex}`);
      queryParams.push(`%${code}%`);
      paramIndex++;
    }

    // Kondisi berdasarkan email (match exact email dari pic_users)
    picConditions.push(`pd.email ILIKE $${paramIndex}`);
    queryParams.push(`%${picEmail}%`);
    paramIndex++;

    const whereClause = picConditions.join(' OR ');

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
      WHERE ${whereClause}
      ORDER BY tanggal_selesai_approval DESC
    `;

    const docsResult = await client.query(docsQuery, queryParams);
    const documents  = docsResult.rows.map((row: any) => ({
      id:             row.id,
      documentNumber: row.nomor_dokumen,
      title:          row.nama_dokumen,
      status:         row.status,
      createdAt:      row.created_at,
    }));

    // Hitung stats
    const totalDocuments  = documents.length;
    const pendingReview   = documents.filter((d: any) =>
      ['Menunggu', 'Belum dikirim', 'Telah terkirim', 'Telah dibaca', '-'].includes(d.status)
    ).length;
    const completedReview = documents.filter((d: any) =>
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
        picCode,  // Kode singkat untuk URL /review-page-owner/[pic]
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