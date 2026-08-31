// app/api/annotations/route.ts
//
// GET  — ambil semua anotasi (coretan + kotak teks) untuk satu file tertentu.
// POST — simpan batch anotasi baru. Identitas pengirim di-resolve dua cara:
//   - accToken diisi   → identitas diambil dari procedure_approval_actions
//     (server-side, tidak bisa dipalsukan) — dipakai halaman /acc/[token].
//   - accToken kosong  → identitas dari body (email/nama), role DIPAKSA 'pic'
//     di server (tidak dipercaya dari client) — dipakai halaman PIC, konsisten
//     dengan pola trust yang sudah dipakai endpoint PIC lain di aplikasi ini.

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const nomorDokumen = searchParams.get('nomorDokumen');
    const fileIdParam  = searchParams.get('fileId');

    if (!nomorDokumen || !fileIdParam) {
      return NextResponse.json({ error: 'nomorDokumen dan fileId wajib diisi' }, { status: 400 });
    }
    const fileId = parseInt(fileIdParam, 10);
    if (isNaN(fileId)) {
      return NextResponse.json({ error: 'fileId tidak valid' }, { status: 400 });
    }

    const result = await client.query(
      `SELECT id, page_number, annotation_type, data, color,
              created_by_nama, created_by_email, created_by_role, created_at
       FROM document_annotations
       WHERE nomor_dokumen = $1 AND file_id = $2
       ORDER BY created_at ASC`,
      [nomorDokumen, fileId]
    );

    return NextResponse.json({
      annotations: result.rows.map(r => ({
        id:             r.id,
        pageNumber:     r.page_number,
        type:           r.annotation_type,
        data:           r.data,
        color:          r.color,
        createdByNama:  r.created_by_nama,
        createdByEmail: r.created_by_email,
        createdByRole:  r.created_by_role,
        createdAt:      r.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching annotations:', error);
    return NextResponse.json({ error: 'Gagal mengambil coretan' }, { status: 500 });
  } finally {
    client.release();
  }
}

interface IncomingAnnotation {
  pageNumber: number;
  type: 'stroke' | 'textbox';
  data: any;
  color?: string;
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { nomorDokumen, fileId, annotations, token } = body as {
      nomorDokumen?: string;
      fileId?: number;
      annotations?: IncomingAnnotation[];
      token?: string;
      email?: string;
      nama?: string;
    };

    if (!nomorDokumen || !fileId || !Array.isArray(annotations) || annotations.length === 0) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const fileCheck = await client.query(
      `SELECT id FROM procedure_files WHERE id = $1 AND nomor_dokumen = $2`,
      [fileId, nomorDokumen]
    );
    if (fileCheck.rows.length === 0) {
      return NextResponse.json({ error: 'File tidak ditemukan untuk dokumen ini' }, { status: 404 });
    }

    // ── Resolve identitas pengirim ────────────────────────────────────────────
    let nama: string | null;
    let email: string;
    let role: string;

    if (token) {
      const actionResult = await client.query(
        `SELECT nama, email, role FROM procedure_approval_actions WHERE token = $1`,
        [token]
      );
      if (actionResult.rows.length === 0) {
        return NextResponse.json({ error: 'Token tidak valid' }, { status: 404 });
      }
      nama  = actionResult.rows[0].nama;
      email = actionResult.rows[0].email;
      role  = actionResult.rows[0].role;
    } else {
      if (!body.email) {
        return NextResponse.json({ error: 'email wajib diisi' }, { status: 400 });
      }
      email = body.email;
      nama  = body.nama || null;
      role  = 'pic';
    }

    await client.query('BEGIN');

    let insertedCount = 0;
    for (const ann of annotations) {
      if (!ann || (ann.type !== 'stroke' && ann.type !== 'textbox') || !ann.pageNumber || !ann.data) {
        continue;
      }
      await client.query(
        `INSERT INTO document_annotations
           (nomor_dokumen, file_id, page_number, annotation_type, data, color,
            created_by_nama, created_by_email, created_by_role)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          nomorDokumen, fileId, ann.pageNumber, ann.type,
          JSON.stringify(ann.data), ann.color || '#ef4444',
          nama, email, role,
        ]
      );
      insertedCount++;
    }

    if (insertedCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Tidak ada anotasi valid untuk disimpan' }, { status: 400 });
    }

    await client.query(
      `INSERT INTO document_annotation_events
         (nomor_dokumen, file_id, annotated_by_nama, annotated_by_email, annotated_by_role, annotation_count)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [nomorDokumen, fileId, nama, email, role, insertedCount]
    );

    await client.query('COMMIT');

    return NextResponse.json({ success: true, insertedCount });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error saving annotations:', error);
    return NextResponse.json({ error: 'Gagal menyimpan coretan' }, { status: 500 });
  } finally {
    client.release();
  }
}