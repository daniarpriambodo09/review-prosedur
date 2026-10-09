// app/api/procedures/[nomorDokumen]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logActivity } from '@/lib/activityLogger';

// PATCH — Update data prosedur (edit inline dari tabel)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ nomorDokumen: string }> }
) {
  const client = await pool.connect();
  try {
    // Next.js 15+ App Router: params adalah Promise, harus di-await
    const { nomorDokumen: rawParam } = await params;
    const nomorDokumen = decodeURIComponent(rawParam);

    const body = await request.json();

    const {
      namaDokumen,
      nomorDokumenBaru,
      levelDokumen,
      tanggalSelesaiApproval,
      revisi,
      owner,
      pic,
      email,
      blockActivity, // 🆕
    } = body;

    if (!namaDokumen || !levelDokumen || !owner || !pic) {
      return NextResponse.json(
        { error: 'Field wajib (Nama, Level Dokumen, Owner, PIC) tidak boleh kosong' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Cek duplikat HANYA jika nomor dokumen memang berubah
    if (nomorDokumenBaru && nomorDokumenBaru.trim() !== nomorDokumen.trim()) {
      const dupCheck = await client.query(
        'SELECT nomor_dokumen FROM procedure_documents WHERE nomor_dokumen = $1',
        [nomorDokumenBaru.trim()]
      );
      if (dupCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Nomor dokumen sudah digunakan' },
          { status: 409 }
        );
      }
    }

    const finalNomor = nomorDokumenBaru?.trim() || nomorDokumen;

    const result = await client.query(
      `UPDATE procedure_documents
       SET
         nama_dokumen              = $1,
         nomor_dokumen             = $2,
         level_dokumen             = $3,
         tanggal_selesai_approval  = $4,
         revisi                    = $5,
         owner                     = $6,
         pic                       = $7,
         email                     = $8,
         block_activity            = $9,
         updated_at                = CURRENT_TIMESTAMP
       WHERE nomor_dokumen = $10
       RETURNING *`,
      [
        namaDokumen,
        finalNomor,
        levelDokumen,
        (tanggalSelesaiApproval && String(tanggalSelesaiApproval).trim()) ? String(tanggalSelesaiApproval).trim() : null,
        revisi || '0',
        owner,
        pic,
        email || '',
        blockActivity ?? null, // 🆕
        nomorDokumen,
      ]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Dokumen tidak ditemukan' }, { status: 404 });
    }

    // Update referensi di tabel lain jika nomor berubah
    if (nomorDokumenBaru && finalNomor !== nomorDokumen) {
      await client.query(
        `UPDATE email_schedules SET nomor_dokumen = $1 WHERE nomor_dokumen = $2`,
        [finalNomor, nomorDokumen]
      );
      await client.query(
        `UPDATE document_reviews SET nomor_dokumen = $1 WHERE nomor_dokumen = $2`,
        [finalNomor, nomorDokumen]
      );
      // 🆕 procedure_revision_notes ikut mengikuti kalau nomor dokumen berubah
      await client.query(
        `UPDATE procedure_revision_notes SET nomor_dokumen = $1 WHERE nomor_dokumen = $2`,
        [finalNomor, nomorDokumen]
      );

      await client.query(
        `UPDATE document_chat_messages SET nomor_dokumen = $1 WHERE nomor_dokumen = $2`,
        [finalNomor, nomorDokumen]
      );
    }

    // Sinkronkan revisi terbaru ke document_reviews
    await client.query(
      `UPDATE document_reviews SET revisi = $1, updated_at = CURRENT_TIMESTAMP WHERE nomor_dokumen = $2`,
      [revisi || '0', finalNomor]
    );

    await client.query('COMMIT');

    const row = result.rows[0];

    await logActivity({
      username: 'admin',
      activityType: 'update',
      activityDescription: `Update prosedur ${namaDokumen} (${nomorDokumen})`,
      targetType: 'procedure',
      targetId: finalNomor,
    });

    return NextResponse.json({
      id: row.id,
      namaDokumen: row.nama_dokumen,
      nomorDokumen: row.nomor_dokumen,
      levelDokumen: row.level_dokumen,
      tanggalSelesaiApproval: row.tanggal_selesai_approval,
      revisi: row.revisi,
      owner: row.owner,
      pic: row.pic,
      email: row.email,
      blockActivity: row.block_activity, // 🆕
      status: row.status,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating procedure:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Nomor dokumen sudah digunakan' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal mengupdate prosedur' }, { status: 500 });
  } finally {
    client.release();
  }
}