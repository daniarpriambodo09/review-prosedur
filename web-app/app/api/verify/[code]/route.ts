// app/api/verify/[code]/route.ts
//
// Endpoint publik READ-ONLY untuk verifikasi QR code yang tercetak di
// dokumen final. Dibuka saat QR discan — TIDAK bisa dipakai untuk ACC
// apapun (beda dari /api/acc/[token] yang pakai token rahasia terpisah).

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { STAGE_DISPLAY, type ApprovalRole } from '@/lib/approvalCycle';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const client = await pool.connect();
  try {
    const { code } = await params;

    const result = await client.query(
      `SELECT a.role, a.nama, a.email, a.acc_at,
              c.nomor_dokumen, pd.nama_dokumen
       FROM procedure_approval_actions a
       JOIN procedure_approval_cycles c ON c.id = a.cycle_id
       JOIN procedure_documents pd ON pd.nomor_dokumen = c.nomor_dokumen
       WHERE a.verification_code = $1 AND a.acc_status = 'acc'`,
      [code]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Kode verifikasi tidak ditemukan.' },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    return NextResponse.json({
      role:         row.role,
      roleLabel:    STAGE_DISPLAY[row.role as ApprovalRole],
      nama:         row.nama,
      email:        row.email,
      accAt:        row.acc_at,
      nomorDokumen: row.nomor_dokumen,
      namaDokumen:  row.nama_dokumen,
    });
  } catch (error) {
    console.error('Error verifying code:', error);
    return NextResponse.json({ error: 'Gagal memuat data verifikasi.' }, { status: 500 });
  } finally {
    client.release();
  }
}