// app/api/approval-dokumen/route.ts
//
// Endpoint API untuk menu Approval Dokumen:
// - GET: Mengambil daftar dokumen dengan proses approval, statistik nominal per tahap
//   (Prepared, Checked, Approved), serta status real-time tiap approver.
// - PATCH: Mengedit nama dokumen dan daftar approver (Prepared, Checked, Approved).
// - POST: Memulai siklus approval baru untuk dokumen prosedur yang dipilih.
// - DELETE: Membatalkan siklus approval yang sedang berjalan (jika diperlukan admin).

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logActivity } from '@/lib/activityLogger';
import {
  startApprovalCycle,
  STAGE_DISPLAY,
  STAGE_STATUS_LABEL,
  type ApprovalRole,
} from '@/lib/approvalCycle';
import { getActiveSmtpSettings, sendMail } from '@/lib/mailer';
import { buildAccEmailHtml, buildAccEmailText } from '@/lib/approvalEmailTemplate';

export const dynamic = 'force-dynamic';

interface ApproverInput {
  id?: number;
  nama?: string;
  email: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: Ambil daftar approval dokumen & statistik nominal
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // 'in_progress' | 'completed' | 'all'
    const stageFilter = searchParams.get('stage'); // 'prepared' | 'checked' | 'approved' | null
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    // 1. Ambil statistik nominal dokumen di tahap-tahap approval yang sedang berjalan
    //    Hitung berdasarkan siklus TERBARU per nomor_dokumen yang statusnya 'in_progress'
    const statsQuery = await client.query(`
      WITH LatestActiveCycles AS (
        SELECT DISTINCT ON (c.nomor_dokumen)
          c.id,
          c.nomor_dokumen,
          c.current_stage,
          c.status
        FROM procedure_approval_cycles c
        WHERE c.status = 'in_progress'
        ORDER BY c.nomor_dokumen, c.id DESC
      )
      SELECT
        COUNT(*) FILTER (WHERE current_stage = 'prepared')::int AS prepared_count,
        COUNT(*) FILTER (WHERE current_stage = 'checked')::int  AS checked_count,
        COUNT(*) FILTER (WHERE current_stage = 'approved')::int AS approved_count,
        COUNT(*)::int AS in_progress_total
      FROM LatestActiveCycles
    `);

    const statsRow = statsQuery.rows[0] || {
      prepared_count: 0,
      checked_count: 0,
      approved_count: 0,
      in_progress_total: 0,
    };

    // Total dokumen unik yang memiliki siklus approval
    const totalsQuery = await client.query(`
      SELECT
        COUNT(DISTINCT nomor_dokumen) FILTER (WHERE status = 'completed')::int AS completed_total,
        COUNT(DISTINCT nomor_dokumen)::int AS all_total
      FROM procedure_approval_cycles
    `);
    const totalsRow = totalsQuery.rows[0] || { completed_total: 0, all_total: 0 };

    // 2. Ambil dokumen dengan siklus approval (siklus terbaru per dokumen)
    //    Dahulukan siklus yang statusnya 'in_progress'
    const cyclesQuery = await client.query(`
      WITH RankedCycles AS (
        SELECT
          c.id AS cycle_id,
          c.nomor_dokumen,
          c.current_stage,
          c.status AS cycle_status,
          c.started_at,
          c.completed_at,
          pd.nama_dokumen,
          pd.level_dokumen,
          pd.revisi,
          pd.owner,
          pd.pic,
          pd.email,
          pd.status AS document_status,
          af.file_name,
          af.file_path,
          ROW_NUMBER() OVER (
            PARTITION BY c.nomor_dokumen
            ORDER BY
              CASE WHEN c.status = 'in_progress' THEN 0 ELSE 1 END,
              c.id DESC
          ) AS rn
        FROM procedure_approval_cycles c
        JOIN procedure_documents pd ON pd.nomor_dokumen = c.nomor_dokumen
        LEFT JOIN active_procedure_files af ON af.nomor_dokumen = c.nomor_dokumen
      )
      SELECT *
      FROM RankedCycles
      WHERE rn = 1
      ORDER BY
        CASE WHEN cycle_status = 'in_progress' THEN 0 ELSE 1 END,
        started_at DESC,
        cycle_id DESC
    `);

    const cycleRows = cyclesQuery.rows;
    if (cycleRows.length === 0) {
      return NextResponse.json({
        stats: {
          prepared: statsRow.prepared_count,
          checked: statsRow.checked_count,
          approved: statsRow.approved_count,
          inProgressTotal: statsRow.in_progress_total,
          completedTotal: totalsRow.completed_total,
          allTotal: totalsRow.all_total,
        },
        documents: [],
      });
    }

    const cycleIds = cycleRows.map(r => r.cycle_id);
    const nomorDokumens = cycleRows.map(r => r.nomor_dokumen);

    // 3. Ambil seluruh action approval untuk siklus-siklus ini
    const actionsQuery = await client.query(`
      SELECT
        id,
        cycle_id,
        approver_id,
        role,
        nama,
        email,
        acc_status,
        acc_at,
        email_sent_at,
        reject_reason
      FROM procedure_approval_actions
      WHERE cycle_id = ANY($1)
      ORDER BY id ASC
    `, [cycleIds]);

    const actionsByCycleAndRole: Record<string, any[]> = {};
    for (const a of actionsQuery.rows) {
      const key = `${a.cycle_id}:${a.role}`;
      if (!actionsByCycleAndRole[key]) actionsByCycleAndRole[key] = [];
      actionsByCycleAndRole[key].push(a);
    }

    // 4. Ambil seluruh approver terdaftar di procedure_approvers
    const approversQuery = await client.query(`
      SELECT
        id,
        nomor_dokumen,
        role,
        nama,
        email,
        grup,
        urutan
      FROM procedure_approvers
      WHERE nomor_dokumen = ANY($1)
      ORDER BY urutan ASC, id ASC
    `, [nomorDokumens]);

    const approversByDocAndRole: Record<string, any[]> = {};
    for (const pa of approversQuery.rows) {
      const key = `${pa.nomor_dokumen}:${pa.role}`;
      if (!approversByDocAndRole[key]) approversByDocAndRole[key] = [];
      approversByDocAndRole[key].push(pa);
    }

    // 5. Susun data dokumen terstruktur
    const stageOrder: Record<string, number> = {
      prepared: 1,
      checked: 2,
      approved: 3,
      completed: 4,
    };

    const roles: ApprovalRole[] = ['prepared', 'checked', 'approved'];

    const documents = cycleRows.map(row => {
      const cycleStatus: string = row.cycle_status;
      const currentStage: string = row.current_stage;
      const currentOrder = stageOrder[currentStage] || 1;

      // Cari rejection jika ada
      let rejection = null;
      for (const r of roles) {
        const key = `${row.cycle_id}:${r}`;
        const actions = actionsByCycleAndRole[key] || [];
        const rejectedAction = actions.find(a => a.acc_status === 'rejected');
        if (rejectedAction) {
          rejection = {
            role: rejectedAction.role,
            roleLabel: STAGE_DISPLAY[rejectedAction.role as ApprovalRole],
            nama: rejectedAction.nama,
            email: rejectedAction.email,
            reason: rejectedAction.reject_reason,
            rejectedAt: rejectedAction.acc_at,
          };
          break;
        }
      }

      // Susun status 3 tahap (Prepared, Checked, Approved)
      const stages: Record<string, any> = {};

      for (const role of roles) {
        const targetOrder = stageOrder[role];
        const actionKey = `${row.cycle_id}:${role}`;
        const existingActions = actionsByCycleAndRole[actionKey] || [];
        const registeredApprovers = approversByDocAndRole[`${row.nomor_dokumen}:${role}`] || [];

        let stageStatus: 'completed' | 'in_progress' | 'pending' | 'rejected' = 'pending';

        if (cycleStatus === 'completed') {
          stageStatus = 'completed';
        } else if (cycleStatus === 'rejected') {
          const hasReject = existingActions.some(a => a.acc_status === 'rejected');
          if (hasReject) {
            stageStatus = 'rejected';
          } else if (targetOrder < currentOrder) {
            stageStatus = 'completed';
          } else {
            stageStatus = 'pending';
          }
        } else if (cycleStatus === 'in_progress') {
          if (targetOrder < currentOrder) {
            stageStatus = 'completed';
          } else if (targetOrder === currentOrder) {
            stageStatus = 'in_progress';
          } else {
            stageStatus = 'pending';
          }
        }

        // Susun daftar approver di tahap ini
        let approverList: any[] = [];
        if (existingActions.length > 0) {
          approverList = existingActions.map(a => ({
            id: a.id,
            approverId: a.approver_id,
            nama: a.nama,
            email: a.email,
            accStatus: a.acc_status, // 'acc' | 'pending' | 'rejected'
            accAt: a.acc_at,
            emailSentAt: a.email_sent_at,
            rejectReason: a.reject_reason,
          }));
        } else {
          // Tahap belum dimulai di cycle ini, ambil dari daftar approver terdaftar
          approverList = registeredApprovers.map(pa => ({
            id: null,
            approverId: pa.id,
            nama: pa.nama,
            email: pa.email,
            accStatus: stageStatus === 'completed' ? 'acc' : 'waiting',
            accAt: null,
            emailSentAt: null,
            rejectReason: null,
          }));
        }

        const approvedCount = approverList.filter(a => a.accStatus === 'acc').length;
        const totalCount = approverList.length;

        stages[role] = {
          role,
          roleLabel: STAGE_DISPLAY[role],
          status: stageStatus,
          approvedCount,
          totalCount,
          approvers: approverList,
        };
      }

      return {
        cycleId: row.cycle_id,
        nomorDokumen: row.nomor_dokumen,
        namaDokumen: row.nama_dokumen,
        levelDokumen: row.level_dokumen,
        revisi: row.revisi,
        owner: row.owner,
        pic: row.pic,
        email: row.email,
        documentStatus: row.document_status,
        cycleStatus: row.cycle_status,
        currentStage: row.current_stage,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        fileName: row.file_name,
        filePath: row.file_path,
        stages,
        rejection,
      };
    });

    // 6. Terapkan filter di memori
    let filteredDocs = documents;

    // Filter status siklus
    if (filter === 'in_progress') {
      filteredDocs = filteredDocs.filter(d => d.cycleStatus === 'in_progress');
    } else if (filter === 'completed') {
      filteredDocs = filteredDocs.filter(d => d.cycleStatus === 'completed');
    }

    // Filter klik card stage (Prepared / Checked / Approved)
    if (stageFilter && ['prepared', 'checked', 'approved'].includes(stageFilter)) {
      filteredDocs = filteredDocs.filter(d => {
        // Dokumen yang tahap aktifnya saat ini adalah stageFilter
        return d.cycleStatus === 'in_progress' && d.currentStage === stageFilter;
      });
    }

    // Filter teks pencarian (nama dokumen / nomor dokumen)
    if (search) {
      filteredDocs = filteredDocs.filter(d =>
        d.namaDokumen.toLowerCase().includes(search) ||
        d.nomorDokumen.toLowerCase().includes(search) ||
        (d.owner && d.owner.toLowerCase().includes(search)) ||
        (d.pic && d.pic.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      stats: {
        prepared: statsRow.prepared_count,
        checked: statsRow.checked_count,
        approved: statsRow.approved_count,
        inProgressTotal: statsRow.in_progress_total,
        completedTotal: totalsRow.completed_total,
        allTotal: totalsRow.all_total,
      },
      documents: filteredDocs,
    });
  } catch (error) {
    console.error('Error fetching approval documents:', error);
    return NextResponse.json({ error: 'Gagal memuat data approval dokumen.' }, { status: 500 });
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH: Edit nama dokumen dan ketiga approval (Prepared, Checked, Approved)
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { nomorDokumen, namaDokumen, approvers } = body;

    if (!nomorDokumen || typeof nomorDokumen !== 'string') {
      return NextResponse.json({ error: 'Nomor dokumen wajib diisi.' }, { status: 400 });
    }
    if (!namaDokumen || typeof namaDokumen !== 'string' || !namaDokumen.trim()) {
      return NextResponse.json({ error: 'Nama dokumen wajib diisi.' }, { status: 400 });
    }

    await client.query('BEGIN');

    // 1. Update nama dokumen di procedure_documents
    const updateDoc = await client.query(
      `UPDATE procedure_documents
       SET nama_dokumen = $1, updated_at = CURRENT_TIMESTAMP
       WHERE nomor_dokumen = $2
       RETURNING nomor_dokumen`,
      [namaDokumen.trim(), nomorDokumen]
    );

    if (updateDoc.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Dokumen tidak ditemukan.' }, { status: 404 });
    }

    // 2. Simpan ketiga approval (Prepared, Checked, Approved) dengan aman
    //    PENTING: Jangan langsung DELETE semua rows karena procedure_approval_actions
    //    memiliki foreign key CASCADE ke procedure_approvers(id).
    //    Gunakan teknik update in-place dan hanya hapus rows yang tidak terikat actions!
    if (approvers && typeof approvers === 'object') {
      const roles: ApprovalRole[] = ['prepared', 'checked', 'approved'];

      for (const role of roles) {
        const newApprovers: ApproverInput[] = Array.isArray(approvers[role])
          ? approvers[role].filter((a: ApproverInput) => a.email && a.email.trim())
          : [];

        // Ambil approver existing untuk role ini
        const existingRes = await client.query(
          `SELECT id, urutan FROM procedure_approvers
           WHERE nomor_dokumen = $1 AND role = $2
           ORDER BY urutan ASC, id ASC`,
          [nomorDokumen, role]
        );
        const existingRows = existingRes.rows;

        const maxLen = Math.max(existingRows.length, newApprovers.length);

        for (let i = 0; i < maxLen; i++) {
          const existing = existingRows[i];
          const incoming = newApprovers[i];

          if (existing && incoming) {
            // Update row yang sudah ada
            await client.query(
              `UPDATE procedure_approvers
               SET nama = $1, email = $2, urutan = $3, updated_at = CURRENT_TIMESTAMP
               WHERE id = $4`,
              [incoming.nama?.trim() || null, incoming.email.trim(), i, existing.id]
            );

            // Jika ada action pending di siklus in_progress yang menunjuk approver ini,
            // sinkronkan nama dan emailnya
            await client.query(
              `UPDATE procedure_approval_actions
               SET nama = $1, email = $2
               WHERE approver_id = $3 AND acc_status = 'pending'`,
              [incoming.nama?.trim() || null, incoming.email.trim(), existing.id]
            );
          } else if (!existing && incoming) {
            // Insert row baru
            await client.query(
              `INSERT INTO procedure_approvers (nomor_dokumen, role, nama, email, urutan, grup)
               VALUES ($1, $2, $3, $4, $5, 1)`,
              [nomorDokumen, role, incoming.nama?.trim() || null, incoming.email.trim(), i]
            );
          } else if (existing && !incoming) {
            // Approver dikurangi dari form. Cek apakah aman untuk dihapus (tidak direferensikan action)
            const refCheck = await client.query(
              `SELECT COUNT(*)::int AS count FROM procedure_approval_actions WHERE approver_id = $1`,
              [existing.id]
            );
            if (refCheck.rows[0].count === 0) {
              await client.query(`DELETE FROM procedure_approvers WHERE id = $1`, [existing.id]);
            }
          }
        }
      }
    }

    await client.query('COMMIT');

    await logActivity({
      username: 'admin',
      activityType: 'update',
      activityDescription: `Memperbarui detail approval untuk dokumen ${nomorDokumen} (${namaDokumen})`,
      targetType: 'procedure',
      targetId: nomorDokumen,
    });

    return NextResponse.json({
      success: true,
      message: 'Detail dokumen dan approval berhasil diperbarui.',
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error updating approval details:', error);
    return NextResponse.json({ error: 'Gagal menyimpan perubahan approval.' }, { status: 500 });
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST: Mulai siklus approval baru untuk dokumen prosedur
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { nomorDokumen } = body;

    if (!nomorDokumen) {
      return NextResponse.json({ error: 'Nomor dokumen wajib dipilih.' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Cek apakah dokumen sedang dalam proses approval aktif
    const activeCheck = await client.query(
      `SELECT id FROM procedure_approval_cycles
       WHERE nomor_dokumen = $1 AND status = 'in_progress'
       LIMIT 1`,
      [nomorDokumen]
    );

    if (activeCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Dokumen ini sudah memiliki proses approval yang sedang berjalan.' },
        { status: 409 }
      );
    }

    // Ambil info file aktif jika ada
    const fileRes = await client.query(
      `SELECT id FROM active_procedure_files WHERE nomor_dokumen = $1 LIMIT 1`,
      [nomorDokumen]
    );
    const fileId = fileRes.rows[0]?.id ?? null;

    // Mulai siklus approval
    const cycleResult = await startApprovalCycle(client, nomorDokumen, fileId);

    if (!cycleResult.started) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Dokumen belum memiliki approver Prepared terdaftar. Silakan lengkapi approver terlebih dahulu via Edit.' },
        { status: 400 }
      );
    }

    const { cycleId, actions } = cycleResult;

    // Ambil info nama dokumen
    const docRes = await client.query(
      `SELECT nama_dokumen FROM procedure_documents WHERE nomor_dokumen = $1`,
      [nomorDokumen]
    );
    const namaDokumen = docRes.rows[0]?.nama_dokumen || nomorDokumen;

    await client.query('COMMIT');

    await logActivity({
      username: 'admin',
      activityType: 'update',
      activityDescription: `Memulai siklus approval baru untuk dokumen ${nomorDokumen} (${namaDokumen})`,
      targetType: 'procedure',
      targetId: nomorDokumen,
    });

    // Kirim email notifikasi ke approver Prepared di luar transaksi
    let emailSentCount = 0;
    try {
      const smtpSettings = await getActiveSmtpSettings(client);
      if (smtpSettings && actions.length > 0) {
        for (const action of actions) {
          try {
            const accLink = `${smtpSettings.appUrl}/review-prosedur/acc/${action.token}`;
            const emailParams = {
              nama: action.nama,
              role: 'prepared' as const,
              namaDokumen,
              nomorDokumen,
              accLink,
            };
            await sendMail(
              smtpSettings,
              action.email,
              'Permintaan Approval Dokumen Prosedur (Prepared)',
              buildAccEmailHtml(emailParams),
              buildAccEmailText(emailParams)
            );
            await client.query(
              `UPDATE procedure_approval_actions SET email_sent_at = NOW() WHERE id = $1`,
              [action.actionId]
            );
            emailSentCount++;
          } catch (mailErr) {
            console.error(`Gagal mengirim email approval ke ${action.email}:`, mailErr);
          }
        }
      }
    } catch (smtpErr) {
      console.error('Error checking SMTP settings for approval:', smtpErr);
    }

    return NextResponse.json({
      success: true,
      cycleId,
      emailSentCount,
      message: `Proses approval untuk dokumen ${nomorDokumen} berhasil dimulai.`,
    });
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error starting approval cycle:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal memulai siklus approval.' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE: Batalkan siklus approval yang sedang berjalan
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get('cycleId');

    if (!cycleId) {
      return NextResponse.json({ error: 'Cycle ID wajib diberikan.' }, { status: 400 });
    }

    await client.query('BEGIN');

    const cycleRes = await client.query(
      `SELECT c.id, c.nomor_dokumen, pd.nama_dokumen
       FROM procedure_approval_cycles c
       JOIN procedure_documents pd ON pd.nomor_dokumen = c.nomor_dokumen
       WHERE c.id = $1 AND c.status = 'in_progress'`,
      [cycleId]
    );

    if (cycleRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Siklus approval tidak ditemukan atau sudah tidak berjalan.' },
        { status: 404 }
      );
    }

    const { nomor_dokumen, nama_dokumen } = cycleRes.rows[0];

    // Update status siklus menjadi 'cancelled'
    await client.query(
      `UPDATE procedure_approval_cycles
       SET status = 'cancelled'
       WHERE id = $1`,
      [cycleId]
    );

    // Kembalikan status dokumen ke 'Relevan'
    await client.query(
      `UPDATE procedure_documents
       SET status = 'Relevan', updated_at = CURRENT_TIMESTAMP
       WHERE nomor_dokumen = $1`,
      [nomor_dokumen]
    );

    await client.query('COMMIT');

    await logActivity({
      username: 'admin',
      activityType: 'update',
      activityDescription: `Membatalkan proses approval untuk dokumen ${nomor_dokumen} (${nama_dokumen})`,
      targetType: 'procedure',
      targetId: nomor_dokumen,
    });

    return NextResponse.json({
      success: true,
      message: `Proses approval untuk dokumen ${nomor_dokumen} berhasil dibatalkan.`,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error cancelling approval cycle:', error);
    return NextResponse.json({ error: 'Gagal membatalkan siklus approval.' }, { status: 500 });
  } finally {
    client.release();
  }
}
