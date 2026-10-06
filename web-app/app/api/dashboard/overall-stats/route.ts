// app/api/dashboard/overall-stats/route.ts
//
// Agregat statistik untuk:
// 1. Total Dokumen vs Sudah Direview (Global / Keseluruhan)
// 2. Summary Dokumen yang Sudah Direview (Relevan, Revisi, Obsolete)
//
// Mendukung filter tahun & bulan:
// - Tahun 2026 (Tahun Sekarang):
//   Dokumen sebelum 21 September 2026 (Januari - September) dianggap sudah direview.
//   Dokumen mulai 1 Oktober hingga akhir 2026 (Oktober - Desember) belum direview (memulai alur review baru).
// - Tahun Sebelumnya (2025, 2024, dst):
//   Menampilkan riwayat tahun sebelumnya di mana seluruh siklus review telah selesai (100% selesai).
// - 'all': Keseluruhan data.

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const VALID_REVIEW_STATUSES = ['Relevan', 'Revisi', 'Obsolete'];

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const rawMonth = searchParams.get('month');
    const rawYear = searchParams.get('year');

    // Filter Tahun: mulai dari basis 2026 hingga tahun saat ini (dan bertambah dinamis di masa depan)
    const currentYear = Math.max(2026, new Date().getFullYear());
    const availableYears: number[] = [];
    for (let y = currentYear; y >= 2026; y--) {
      availableYears.push(y);
    }

    let filterYear: number | 'all' = currentYear;
    if (rawYear !== null && rawYear !== '') {
      if (rawYear.toLowerCase() === 'all') {
        filterYear = 'all';
      } else {
        const parsedY = parseInt(rawYear, 10);
        if (!isNaN(parsedY)) filterYear = parsedY;
      }
    }

    // Filter Bulan: 'all' = semua bulan, atau angka 0..11
    let filterMonth: number | 'all' = 'all';
    if (rawMonth !== null && rawMonth !== '' && rawMonth.toLowerCase() !== 'all') {
      const parsed = parseInt(rawMonth, 10);
      if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 11) {
        filterMonth = parsed;
      }
    }

    // Ambil seluruh dokumen dengan info tanggal, status, revisi, dan riwayat
    const docsResult = await client.query(`
      SELECT
        pd.nomor_dokumen,
        pd.nama_dokumen,
        pd.status,
        pd.revisi,
        pd.tanggal_selesai_approval,
        pd.last_reviewed_at,
        (
          pd.status = 'Obsolete'
          OR EXISTS (SELECT 1 FROM document_reviews dr WHERE dr.nomor_dokumen = pd.nomor_dokumen AND dr.status = 'Obsolete')
          OR EXISTS (SELECT 1 FROM arsip_prosedur ap WHERE ap.nomor_dokumen = pd.nomor_dokumen AND ap.status = 'Obsolete')
        ) AS pernah_obsolete,
        (
          pd.status = 'Revisi'
          OR pd.status LIKE 'Menunggu ACC%'
          OR pd.status = 'Ditolak'
          OR EXISTS (SELECT 1 FROM document_reviews dr WHERE dr.nomor_dokumen = pd.nomor_dokumen AND dr.status = 'Revisi')
          OR EXISTS (SELECT 1 FROM procedure_approval_cycles pac WHERE pac.nomor_dokumen = pd.nomor_dokumen)
          OR EXISTS (SELECT 1 FROM procedure_revision_notes prn WHERE prn.nomor_dokumen = pd.nomor_dokumen)
        ) AS pernah_revisi
      FROM procedure_documents pd
    `);

    let totalDocuments = 0;
    let reviewedDocuments = 0;
    let relevanCount = 0;
    let revisiCount = 0;
    let obsoleteCount = 0;

    const availableMonthsSet = new Set<number>();
    const isPastYear = typeof filterYear === 'number' && filterYear < currentYear;

    for (const row of docsResult.rows) {
      const d = new Date(row.tanggal_selesai_approval);
      const isDateValid = !isNaN(d.getTime());
      const docMonth = isDateValid ? d.getMonth() : null;

      if (docMonth !== null) {
        availableMonthsSet.add(docMonth);
      }

      // Filter bulan jika bukan 'all'
      if (filterMonth !== 'all' && docMonth !== filterMonth) {
        continue;
      }

      totalDocuments += 1;

      // Cek apakah dokumen dianggap sudah direview pada periode ini
      let isReviewed = false;
      if (isPastYear) {
        // Riwayat tahun sebelumnya: seluruh dokumen siklus tersebut sudah selesai direview
        isReviewed = true;
      } else {
        // Tahun Berjalan (2026 dst) / 'all':
        // Dokumen sebelum 21 September 2026 (atau sebelum periode baru 1 Oktober 2026) dengan status valid
        // otomatis dianggap sudah direview karena aplikasi baru berjalan dan periode lampau sudah diselesaikan.
        // Dokumen pada periode baru (mulai Oktober 2026) wajib memiliki last_reviewed_at dari PIC.
        const effectiveStatus = (row.status || '').trim();
        const isValidStatus = VALID_REVIEW_STATUSES.includes(effectiveStatus);
        const CUTOFF_DATE = new Date('2026-09-21T00:00:00');
        const isBeforeCutoff = isDateValid && d < CUTOFF_DATE;
        isReviewed = isValidStatus && (isBeforeCutoff || Boolean(row.last_reviewed_at));
      }

      if (isReviewed) {
        reviewedDocuments += 1;
        // Klasifikasi sesuai instruksi manajemen:
        // - Obsolete: Dokumen yang PERNAH memiliki status 'Obsolete'
        // - Revisi: Dokumen yang PERNAH memiliki status / proses 'Revisi'
        // - Relevan: Dokumen yang TIDAK PERNAH 'Revisi' atau 'Obsolete' (murni Relevan)
        if (row.pernah_obsolete) {
          obsoleteCount += 1;
        } else if (row.pernah_revisi) {
          revisiCount += 1;
        } else {
          relevanCount += 1;
        }
      }
    }

    const unreviewedDocuments = Math.max(0, totalDocuments - reviewedDocuments);
    const reviewPercentage = totalDocuments > 0
      ? Math.round((reviewedDocuments / totalDocuments) * 1000) / 10
      : 0;

    const monthName = filterMonth === 'all'
      ? 'Semua Bulan (Keseluruhan)'
      : (MONTH_NAMES_ID[filterMonth] || 'Bulan Dipilih');

    return NextResponse.json({
      year: filterYear,
      availableYears,
      month: filterMonth,
      monthName,
      totalDocuments,
      reviewedDocuments,
      unreviewedDocuments,
      reviewPercentage,
      summaryByStatus: {
        relevan: relevanCount,
        revisi: revisiCount,
        obsolete: obsoleteCount,
      },
      availableMonths: Array.from(availableMonthsSet).sort((a, b) => a - b),
    });
  } catch (error) {
    console.error('Error fetching overall review stats:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data statistik keseluruhan' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
