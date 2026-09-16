// app/api/staff/import-excel/route.ts
//
// Import staff dari sheet "list PIC" pada file Matrik Approval Review
// Prosedur (.xlsx). Kolom yang dipakai: PIC, EMAIL, NAMA, JABATAN.
//
// Format JABATAN: "<SECTION> <ROLE>" — KATA TERAKHIR adalah role
// (SPV/SSPV/SMGR/MGR/JMGR/dst), sisanya (boleh lebih dari 1 kata, mis.
// "QC CHECK WH SPV" -> section "QC CHECK WH") adalah nama Section.
// Baris yang jabatannya cuma 1 kata (tanpa spasi, mis. "DFM") dianggap
// TIDAK punya section — jabatan tetap disimpan, tapi unit dibiarkan
// kosong dan baris ini dimasukkan ke daftar `unresolved` untuk dicek
// manual oleh admin di tab Staff.
//
// is_manager otomatis TRUE kalau kata role mengandung "MGR" (mencakup
// MGR, SMGR, JMGR, dst).
//
// Matching ke staff yang sudah ada: dicoba lewat kode (kolom PIC) dulu,
// kalau tidak ketemu dicoba lewat nama (case-insensitive, spasi
// dirapikan). Kalau dua-duanya tidak ketemu, staff baru OTOMATIS dibuat —
// tapi HANYA kalau kolom PIC di baris tsb terisi (kode staff harus ada
// supaya bisa dicocokkan dengan kolom PIC di procedure_documents). Baris
// tanpa kode PIC dan tanpa nama yang cocok masuk ke `unresolved`.
//
// Section yang disebut di JABATAN tapi belum terdaftar di tabel sections
// akan dibuat otomatis (tanpa departemen induk — section mandiri).

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import * as XLSX from 'xlsx';

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseJabatan(raw: string): { sectionNama: string | null; role: string } {
  const trimmed = raw.trim();
  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace === -1) {
    return { sectionNama: null, role: trimmed };
  }
  return {
    sectionNama: trimmed.slice(0, lastSpace).trim(),
    role: trimmed.slice(lastSpace + 1).trim(),
  };
}

function isManagerRole(role: string): boolean {
  return /MGR/i.test(role);
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'File Excel wajib diupload (field "file")' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: 'array' });
    const sheetName = workbook.SheetNames.find(n => n.trim().toLowerCase() === 'list pic');
    if (!sheetName) {
      return NextResponse.json({ error: 'Sheet "list PIC" tidak ditemukan di file ini' }, { status: 400 });
    }
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

    await client.query('BEGIN');

    // Cache supaya tidak query berulang-ulang per baris
    const existingSections = await client.query(`SELECT id, nama FROM sections`);
    const sectionMap = new Map<string, number>(); // normalized nama -> id
    for (const row of existingSections.rows) sectionMap.set(normalize(row.nama), row.id);

    const existingStaff = await client.query(`SELECT kode, nama FROM staff_directory`);
    const staffByKode = new Set<string>(existingStaff.rows.map(r => r.kode));
    const staffByNama = new Map<string, string>(); // normalized nama -> kode
    for (const row of existingStaff.rows) staffByNama.set(normalize(row.nama), row.kode);

    let created = 0;
    let updated = 0;
    const unresolved: { nama: string; jabatan: string; reason: string }[] = [];

    for (const row of rows) {
      const kodeExcel = row['PIC'] ? String(row['PIC']).trim().toUpperCase() : '';
      const email = row['EMAIL'] ? String(row['EMAIL']).trim() : '';
      const nama = row['NAMA'] ? String(row['NAMA']).trim() : '';
      const jabatanRaw = row['JABATAN'] ? String(row['JABATAN']).trim() : '';

      if (!nama || !jabatanRaw) continue; // baris kosong/tidak lengkap, lewati

      const { sectionNama, role } = parseJabatan(jabatanRaw);
      const isManager = isManagerRole(role);

      let unitId: number | null = null;
      if (sectionNama) {
        const key = normalize(sectionNama);
        if (sectionMap.has(key)) {
          unitId = sectionMap.get(key)!;
        } else {
          const inserted = await client.query(
            `INSERT INTO sections (nama, department_id) VALUES ($1, NULL)
             ON CONFLICT (nama) DO UPDATE SET nama = EXCLUDED.nama
             RETURNING id`,
            [sectionNama]
          );
          const insertedId: number = inserted.rows[0].id;
          unitId = insertedId;
          sectionMap.set(key, insertedId);
        }
      }

      // Cari staff yang cocok: kode dulu, baru nama
      let targetKode: string | null = kodeExcel && staffByKode.has(kodeExcel) ? kodeExcel : null;
      if (!targetKode) {
        const byNama = staffByNama.get(normalize(nama));
        if (byNama) targetKode = byNama;
      }

      if (targetKode) {
        await client.query(
          `UPDATE staff_directory
           SET email       = COALESCE(NULLIF($1, ''), email),
               nama        = $2,
               jabatan_raw = $3,
               jabatan     = $4,
               unit_type   = $5,
               unit_id     = $6,
               is_manager  = $7,
               updated_at  = CURRENT_TIMESTAMP
           WHERE kode = $8`,
          [email, nama, jabatanRaw, role, unitId ? 'section' : null, unitId, isManager, targetKode]
        );
        updated++;
      } else if (kodeExcel) {
        await client.query(
          `INSERT INTO staff_directory
             (kode, email, nama, jabatan_raw, jabatan, unit_type, unit_id, is_manager, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
           ON CONFLICT (kode) DO UPDATE SET
             email       = COALESCE(NULLIF(EXCLUDED.email, ''), staff_directory.email),
             nama        = EXCLUDED.nama,
             jabatan_raw = EXCLUDED.jabatan_raw,
             jabatan     = EXCLUDED.jabatan,
             unit_type   = EXCLUDED.unit_type,
             unit_id     = EXCLUDED.unit_id,
             is_manager  = EXCLUDED.is_manager,
             updated_at  = CURRENT_TIMESTAMP`,
          [kodeExcel, email, nama, jabatanRaw, role, unitId ? 'section' : null, unitId, isManager]
        );
        staffByKode.add(kodeExcel);
        staffByNama.set(normalize(nama), kodeExcel);
        created++;
      } else {
        unresolved.push({
          nama,
          jabatan: jabatanRaw,
          reason: 'Tidak ada kode PIC dan nama tidak cocok dengan staff yang sudah ada — tidak dibuat otomatis.',
        });
        continue;
      }

      if (!sectionNama) {
        unresolved.push({
          nama,
          jabatan: jabatanRaw,
          reason: 'Format jabatan tidak mengandung nama section (cuma 1 kata) — unit dibiarkan kosong.',
        });
      }
    }

    await client.query('COMMIT');

    return NextResponse.json({ success: true, created, updated, unresolved });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => { });
    console.error('Error importing staff from Excel:', error);
    return NextResponse.json({ error: 'Gagal mengimpor data staff dari Excel' }, { status: 500 });
  } finally {
    client.release();
  }
}