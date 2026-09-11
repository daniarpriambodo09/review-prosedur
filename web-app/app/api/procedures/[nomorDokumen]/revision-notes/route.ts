// app/api/procedures/[nomorDokumen]/revision-notes/route.ts
//
// GET  — daftar semua entri Catatan Perubahan milik dokumen, urut kronologis
//        menaik (lama -> baru). Dipakai RevisionNotesModal.tsx.
// POST — tambah entri baru. `urutan` diisi otomatis (MAX(urutan)+1).

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logActivity } from '@/lib/activityLogger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nomorDokumen: string }> }
) {
  const client = await pool.connect();
  try {
    const { nomorDokumen: raw } = await params;
    const nomorDokumen = decodeURIComponent(raw);

    const result = await client.query(
      `SELECT id, rev_no, catatan_perubahan, tanggal_selesai_approval, oleh, urutan, created_at, updated_at
       FROM procedure_revision_notes
       WHERE nomor_dokumen = $1
       ORDER BY urutan ASC, id ASC`,
      [nomorDokumen]
    );

    return NextResponse.json({
      entries: result.rows.map((row) => ({
        id: row.id,
        revNo: row.rev_no,
        catatanPerubahan: row.catatan_perubahan,
        tanggalSelesaiApproval: row.tanggal_selesai_approval,
        oleh: row.oleh,
        urutan: row.urutan,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching revision notes:', error);
    return NextResponse.json({ error: 'Gagal mengambil catatan perubahan' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nomorDokumen: string }> }
) {
  const client = await pool.connect();
  try {
    const { nomorDokumen: raw } = await params;
    const nomorDokumen = decodeURIComponent(raw);

    const body = await request.json();
    const { revNo, catatanPerubahan, tanggalSelesaiApproval, oleh } = body as {
      revNo?: string;
      catatanPerubahan?: string;
      tanggalSelesaiApproval?: string | null;
      oleh?: string | null;
    };

    if (!revNo || !catatanPerubahan) {
      return NextResponse.json(
        { error: 'revNo dan catatanPerubahan wajib diisi' },
        { status: 400 }
      );
    }

    const docCheck = await client.query(
      'SELECT nama_dokumen FROM procedure_documents WHERE nomor_dokumen = $1',
      [nomorDokumen]
    );
    if (docCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Dokumen tidak ditemukan' }, { status: 404 });
    }
    const namaDokumen = docCheck.rows[0].nama_dokumen;

    const urutanResult = await client.query(
      `SELECT COALESCE(MAX(urutan), 0) + 1 AS next_urutan
       FROM procedure_revision_notes WHERE nomor_dokumen = $1`,
      [nomorDokumen]
    );
    const nextUrutan = urutanResult.rows[0].next_urutan;

    const insertResult = await client.query(
      `INSERT INTO procedure_revision_notes
         (nomor_dokumen, rev_no, catatan_perubahan, tanggal_selesai_approval, oleh, urutan)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [nomorDokumen, revNo, catatanPerubahan, tanggalSelesaiApproval || null, oleh || null, nextUrutan]
    );

    await logActivity({
      username: 'admin',
      activityType: 'create',
      activityDescription: `Tambah Catatan Perubahan (Rev. ${revNo}) untuk ${namaDokumen}`,
      targetType: 'procedure',
      targetId: nomorDokumen,
    });

    const row = insertResult.rows[0];
    return NextResponse.json({
      id: row.id,
      revNo: row.rev_no,
      catatanPerubahan: row.catatan_perubahan,
      tanggalSelesaiApproval: row.tanggal_selesai_approval,
      oleh: row.oleh,
      urutan: row.urutan,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating revision note:', error);
    return NextResponse.json({ error: 'Gagal menambahkan catatan perubahan' }, { status: 500 });
  } finally {
    client.release();
  }
}