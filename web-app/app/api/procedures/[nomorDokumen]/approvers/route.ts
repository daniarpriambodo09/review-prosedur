// app/api/procedures/[nomorDokumen]/approvers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nomorDokumen: string }> }
) {
  const client = await pool.connect();
  try {
    const { nomorDokumen: raw } = await params;
    const nomorDokumen = decodeURIComponent(raw);

    const result = await client.query(
      `SELECT id, grup, role, nama, email
       FROM procedure_approvers
       WHERE nomor_dokumen = $1
       ORDER BY role, grup, urutan, id`,
      [nomorDokumen]
    );

    const grouped = { prepared: [] as any[], checked: [] as any[], approved: [] as any[] };
    for (const row of result.rows) {
      grouped[row.role as keyof typeof grouped].push({
        id: row.id, grup: row.grup, nama: row.nama, email: row.email,
      });
    }

    // 🆕 Ambil detail penolakan TERBARU untuk dokumen ini (kalau ada cycle
    // approval yang berakhir 'rejected'). Dipakai ApprovalCard di halaman
    // admin untuk menampilkan siapa & kenapa dokumen ini ditolak.
    const rejectResult = await client.query(
      `SELECT ra.role, ra.nama, ra.email, ra.reject_reason, ra.acc_at
       FROM procedure_approval_cycles pac
       JOIN procedure_approval_actions ra
         ON ra.cycle_id = pac.id AND ra.acc_status = 'rejected'
       WHERE pac.nomor_dokumen = $1 AND pac.status = 'rejected'
       ORDER BY pac.id DESC
       LIMIT 1`,
      [nomorDokumen]
    );

    const rejection = rejectResult.rows.length > 0
      ? {
          role:       rejectResult.rows[0].role,
          nama:       rejectResult.rows[0].nama,
          email:      rejectResult.rows[0].email,
          reason:     rejectResult.rows[0].reject_reason,
          rejectedAt: rejectResult.rows[0].acc_at,
        }
      : null;

    return NextResponse.json({ ...grouped, rejection });
  } catch (error) {
    console.error('Error fetching approvers:', error);
    return NextResponse.json({ error: 'Failed to fetch approvers' }, { status: 500 });
  } finally {
    client.release();
  }
}

// PUT — replace semua approvers untuk dokumen ini
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ nomorDokumen: string }> }
) {
  const client = await pool.connect();
  try {
    const { nomorDokumen: raw } = await params;
    const nomorDokumen = decodeURIComponent(raw);
    const body = await request.json(); // { prepared: [{nama,email}], checked: [...], approved: [...] }

    await client.query('BEGIN');
    await client.query(`DELETE FROM procedure_approvers WHERE nomor_dokumen = $1`, [nomorDokumen]);

    const roles: ('prepared' | 'checked' | 'approved')[] = ['prepared', 'checked', 'approved'];
    for (const role of roles) {
      const list = body[role] || [];
      for (let i = 0; i < list.length; i++) {
        const { nama, email } = list[i];
        if (!email) continue;
        await client.query(
          `INSERT INTO procedure_approvers (nomor_dokumen, role, nama, email, urutan)
           VALUES ($1, $2, $3, $4, $5)`,
          [nomorDokumen, role, nama || null, email, i]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving approvers:', error);
    return NextResponse.json({ error: 'Failed to save approvers' }, { status: 500 });
  } finally {
    client.release();
  }
}