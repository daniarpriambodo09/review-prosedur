// app/api/procedures/[nomorDokumen]/revision-notes/[id]/route.ts
//
// PUT    — edit satu entri Catatan Perubahan.
// DELETE — hapus satu entri Catatan Perubahan.

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logActivity } from '@/lib/activityLogger';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ nomorDokumen: string; id: string }> }
) {
  const client = await pool.connect();
  try {
    const { nomorDokumen: rawDok, id: rawId } = await params;
    const nomorDokumen = decodeURIComponent(rawDok);
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'id tidak valid' }, { status: 400 });
    }

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

    const result = await client.query(
      `UPDATE procedure_revision_notes
       SET rev_no = $1, catatan_perubahan = $2, tanggal_selesai_approval = $3, oleh = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND nomor_dokumen = $6
       RETURNING *`,
      [revNo, catatanPerubahan, tanggalSelesaiApproval || null, oleh || null, id, nomorDokumen]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Catatan perubahan tidak ditemukan' }, { status: 404 });
    }

    await logActivity({
      username: 'admin',
      activityType: 'update',
      activityDescription: `Edit Catatan Perubahan (Rev. ${revNo}) untuk dokumen ${nomorDokumen}`,
      targetType: 'procedure',
      targetId: nomorDokumen,
    });

    const row = result.rows[0];
    return NextResponse.json({
      id: row.id,
      revNo: row.rev_no,
      catatanPerubahan: row.catatan_perubahan,
      tanggalSelesaiApproval: row.tanggal_selesai_approval,
      oleh: row.oleh,
      urutan: row.urutan,
    });
  } catch (error) {
    console.error('Error updating revision note:', error);
    return NextResponse.json({ error: 'Gagal mengupdate catatan perubahan' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ nomorDokumen: string; id: string }> }
) {
  const client = await pool.connect();
  try {
    const { nomorDokumen: rawDok, id: rawId } = await params;
    const nomorDokumen = decodeURIComponent(rawDok);
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'id tidak valid' }, { status: 400 });
    }

    const result = await client.query(
      `DELETE FROM procedure_revision_notes WHERE id = $1 AND nomor_dokumen = $2 RETURNING rev_no`,
      [id, nomorDokumen]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Catatan perubahan tidak ditemukan' }, { status: 404 });
    }

    await logActivity({
      username: 'admin',
      activityType: 'delete',
      activityDescription: `Hapus Catatan Perubahan (Rev. ${result.rows[0].rev_no}) untuk dokumen ${nomorDokumen}`,
      targetType: 'procedure',
      targetId: nomorDokumen,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting revision note:', error);
    return NextResponse.json({ error: 'Gagal menghapus catatan perubahan' }, { status: 500 });
  } finally {
    client.release();
  }
}