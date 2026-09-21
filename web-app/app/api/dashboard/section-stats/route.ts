// app/api/dashboard/section-stats/route.ts
//
// Agregat data untuk grafik "Total Dokumen vs Sudah Direview per Section"
// yang tampil di dashboard admin (app/home) dan dashboard PIC
// (app/pic-dashboard). TIDAK memerlukan header auth PIC — ini data ringkasan
// global, bukan data spesifik satu PIC, jadi aman diakses semua role yang
// sudah login ke aplikasi.
//
// 🐛 FIX: sebelumnya query ini membaca section staff dari
// staff_directory.unit_type = 'section' — pola LAMA yang sudah tidak dipakai
// lagi sejak staff bisa pegang lebih dari satu section (sekarang lewat tabel
// relasi staff_sections). Karena unit_type tidak pernah lagi bernilai
// 'section', hampir semua PIC jatuh ke fallback "Belum Terklasifikasi".
// Sekarang section staff diambil dari staff_sections — kalau staff punya
// lebih dari satu section, dipakai section PERTAMA (urut abjad) sebagai
// label representatif, supaya total dokumen tidak dobel terhitung.
// Departemen (unit_type = 'department') tetap diprioritaskan lebih dulu
// kalau staff memang di-assign langsung ke sebuah departemen.
//
// Cara kerja:
//   1. Ambil semua staff (kode -> unit) dari staff_directory + staff_sections,
//      resolve ke nama departemen (kalau unit_type='department') atau nama
//      section pertama (kalau punya assignment di staff_sections).
//   2. Ambil semua procedure_documents, filter berdasarkan bulan
//      (tanggal_selesai_approval, month 0-11).
//   3. Untuk tiap dokumen, ambil KODE PIC PERTAMA (kalau field `pic` berisi
//      beberapa kode dipisah koma, mis. "VRA, ASW" -> pakai "VRA").
//   4. Kelompokkan ke label unit staff tsb. Kalau kode tidak dikenali di
//      staff_directory sama sekali (atau belum di-assign section/departemen
//      apapun), masuk ke label "Belum Terklasifikasi".
//   5. Hitung total dokumen & jumlah yang sudah berstatus Relevan/Revisi/
//      Obsolete (="sudah direview") per label, urut dari total terbanyak.

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

const REVIEWED_STATUSES = ['Relevan', 'Revisi', 'Obsolete'];

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const rawMonth = searchParams.get('month');
    const rawYear = searchParams.get('year');
    const parsedMonth = rawMonth !== null ? parseInt(rawMonth, 10) : NaN;
    const month = Number.isInteger(parsedMonth) && parsedMonth >= 0 && parsedMonth <= 11
      ? parsedMonth
      : new Date().getMonth();

    const currentYear = Math.max(2026, new Date().getFullYear());
    const availableYears: number[] = [];
    for (let y = currentYear; y >= 2026; y--) {
      availableYears.push(y);
    }

    let filterYear = currentYear;
    if (rawYear !== null && rawYear !== '') {
      const parsedY = parseInt(rawYear, 10);
      if (!isNaN(parsedY)) filterYear = parsedY;
    }
    const isPastYear = filterYear < currentYear;

    // ── 1. Peta kode staff -> label unit (departemen ATAU section) ──────────
    const staffResult = await client.query(`
      SELECT
        s.kode,
        s.unit_type,
        d.nama AS department_nama,
        COALESCE(sec.section_names, ARRAY[]::varchar[]) AS section_names
      FROM staff_directory s
      LEFT JOIN departments d
        ON s.unit_type = 'department' AND d.id = s.unit_id
      LEFT JOIN (
        SELECT ss.staff_kode, array_agg(sc.nama ORDER BY sc.nama) AS section_names
        FROM staff_sections ss
        JOIN sections sc ON sc.id = ss.section_id
        GROUP BY ss.staff_kode
      ) sec ON sec.staff_kode = s.kode
    `);

    const staffLabelMap = new Map<string, string>();
    for (const row of staffResult.rows) {
      let label: string | null = null;
      if (row.unit_type === 'department' && row.department_nama) {
        label = row.department_nama;
      } else if (row.section_names && row.section_names.length > 0) {
        // Staff bisa punya beberapa section — pakai yang pertama (urut abjad)
        // sebagai label representatif, supaya total dokumen tidak dobel hitung.
        label = row.section_names[0];
      }
      if (label) {
        staffLabelMap.set(String(row.kode).trim().toUpperCase(), label);
      }
    }

    const FALLBACK_LABEL = 'Belum Terklasifikasi';

    // ── 2. Semua dokumen (tanpa filter status, kita filter bulan di JS) ──────
    const docsResult = await client.query(`
      SELECT pic, status, tanggal_selesai_approval, last_reviewed_at
      FROM procedure_documents
    `);

    // ── 3-5. Kelompokkan & hitung ─────────────────────────────────────────────
    const counts = new Map<string, { total: number; reviewed: number }>();

    for (const row of docsResult.rows) {
      const d = new Date(row.tanggal_selesai_approval);
      if (isNaN(d.getTime()) || d.getMonth() !== month) continue;

      const rawPic = (row.pic || '').split(',')[0]?.trim().toUpperCase();
      const label = rawPic ? (staffLabelMap.get(rawPic) ?? FALLBACK_LABEL) : FALLBACK_LABEL;

      const entry = counts.get(label) ?? { total: 0, reviewed: 0 };
      entry.total += 1;
      const isReviewed = isPastYear || (REVIEWED_STATUSES.includes(row.status) && Boolean(row.last_reviewed_at));
      if (isReviewed) entry.reviewed += 1;
      counts.set(label, entry);
    }

    const data = Array.from(counts.entries())
      .map(([label, v]) => ({ label, total: v.total, reviewed: v.reviewed }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      month,
      year: filterYear,
      availableYears,
      data,
    });
  } catch (error) {
    console.error('Error fetching section stats:', error);
    return NextResponse.json({ error: 'Gagal mengambil data statistik section' }, { status: 500 });
  } finally {
    client.release();
  }
}