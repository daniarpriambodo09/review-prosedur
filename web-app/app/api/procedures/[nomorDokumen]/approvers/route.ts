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

    // 🆕 Ambil SELURUH riwayat penolakan untuk dokumen ini dari siklus-siklus
    // sebelumnya maupun saat ini.
    const rejectResult = await client.query(
      `SELECT ra.id, ra.cycle_id, ra.role, ra.nama, ra.email, ra.reject_reason, ra.acc_at,
              pac.created_at AS cycle_created_at
       FROM procedure_approval_actions ra
       JOIN procedure_approval_cycles pac
         ON pac.id = ra.cycle_id
       WHERE pac.nomor_dokumen = $1 AND ra.acc_status = 'rejected'
       ORDER BY ra.acc_at DESC, ra.id DESC`,
      [nomorDokumen]
    );

    const rejectionHistory = rejectResult.rows.map(r => ({
      id:         r.id,
      cycleId:    r.cycle_id,
      role:       r.role,
      nama:       r.nama,
      email:      r.email,
      reason:     r.reject_reason,
      rejectedAt: r.acc_at,
    }));

    const rejection = rejectionHistory.length > 0 ? rejectionHistory[0] : null;

    return NextResponse.json({ ...grouped, rejection, rejectionHistory });
  } catch (error) {
    console.error('Error fetching approvers:', error);
    return NextResponse.json({ error: 'Failed to fetch approvers' }, { status: 500 });
  } finally {
    client.release();
  }
}

// PUT — replace semua approvers untuk dokumen ini
// Aman: jika ada cycle aktif, hanya update nama (bukan hapus+insert) untuk
// approver dengan email sama, agar token yang sudah dikirim tetap valid.
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

    // Cek apakah ada cycle approval yang sedang aktif
    const cycleRes = await client.query(
      `SELECT id FROM procedure_approval_cycles
       WHERE nomor_dokumen = $1 AND status = 'in_progress'
       LIMIT 1`,
      [nomorDokumen]
    );
    const hasActiveCycle = cycleRes.rows.length > 0;

    const roles: ('prepared' | 'checked' | 'approved')[] = ['prepared', 'checked', 'approved'];

    if (!hasActiveCycle) {
      // Tidak ada cycle aktif: aman DELETE + INSERT naif
      await client.query(`DELETE FROM procedure_approvers WHERE nomor_dokumen = $1`, [nomorDokumen]);
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
    } else {
      // Cycle aktif: hanya UPDATE nama jika email sama; abaikan perubahan email
      // (perubahan email saat cycle aktif harus via endpoint /api/approval-dokumen
      // yang punya logika cancel-token dan kirim email baru).
      for (const role of roles) {
        const list: { nama?: string; email: string }[] = body[role] || [];
        const existingRes = await client.query(
          `SELECT id, email, urutan FROM procedure_approvers
           WHERE nomor_dokumen = $1 AND role = $2
           ORDER BY urutan ASC, id ASC`,
          [nomorDokumen, role]
        );
        const existingRows = existingRes.rows;

        for (let i = 0; i < Math.max(existingRows.length, list.length); i++) {
          const existing = existingRows[i];
          const incoming = list[i];

          if (existing && incoming) {
            const emailSame = existing.email.trim().toLowerCase() === incoming.email.trim().toLowerCase();
            if (emailSame) {
              // Hanya update nama — token tidak terpengaruh
              await client.query(
                `UPDATE procedure_approvers SET nama = $1, urutan = $2 WHERE id = $3`,
                [incoming.nama?.trim() || null, i, existing.id]
              );
              // Sinkronkan nama ke pending actions juga
              await client.query(
                `UPDATE procedure_approval_actions SET nama = $1
                 WHERE approver_id = $2 AND acc_status = 'pending'`,
                [incoming.nama?.trim() || null, existing.id]
              );
            }
            // Jika email beda saat ada cycle aktif: abaikan (tidak ubah, tidak hapus)
          }
          // Penambahan/pengurangan approver saat cycle aktif diabaikan di sini
        }
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