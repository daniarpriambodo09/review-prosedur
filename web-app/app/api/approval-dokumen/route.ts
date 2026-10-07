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
  generateToken,
  generateVerificationCode,
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

    // 1. Ambil statistik nominal dokumen di tahap-tahap approval yang sedang berjalan & revisi
    const statsQuery = await client.query(`
      WITH LatestCycles AS (
        SELECT DISTINCT ON (c.nomor_dokumen)
          c.id,
          c.nomor_dokumen,
          c.current_stage,
          c.status
        FROM procedure_approval_cycles c
        ORDER BY c.nomor_dokumen, c.id DESC
      )
      SELECT
        COUNT(*) FILTER (WHERE status = 'in_progress' AND current_stage = 'prepared')::int AS prepared_count,
        COUNT(*) FILTER (WHERE status = 'in_progress' AND current_stage = 'checked')::int  AS checked_count,
        COUNT(*) FILTER (WHERE status = 'in_progress' AND current_stage = 'approved')::int AS approved_count,
        COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress_total
      FROM LatestCycles
    `);

    const statsRow = statsQuery.rows[0] || {
      prepared_count: 0,
      checked_count: 0,
      approved_count: 0,
      in_progress_total: 0,
    };

    // Dokumen berstatus Revisi atau Ditolak (perlu upload ulang untuk memulai approval)
    const revisiCountQuery = await client.query(`
      SELECT COUNT(*)::int AS revisi_count
      FROM procedure_documents
      WHERE status = 'Revisi' OR status = 'Ditolak'
    `);
    const revisiCount = revisiCountQuery.rows[0]?.revisi_count || 0;

    // Dokumen baru yang menunggu setting approver
    const settingApproverQuery = await client.query(`
      SELECT COUNT(*)::int AS count
      FROM procedure_documents
      WHERE status = 'Menunggu Setting Approver' OR status = 'Menunggu Approval'
    `);
    const settingApproverCount = settingApproverQuery.rows[0]?.count || 0;

    // Total dokumen unik yang memiliki siklus approval (completed dibatasi 7 hari terakhir)
    const totalsQuery = await client.query(`
      SELECT
        COUNT(DISTINCT nomor_dokumen) FILTER (
          WHERE status = 'completed' AND completed_at >= NOW() - INTERVAL '7 days'
        )::int AS completed_total
      FROM procedure_approval_cycles
    `);
    const totalsRow = totalsQuery.rows[0] || { completed_total: 0 };

    // 2. Ambil dokumen dengan siklus approval ATAU berstatus Revisi/Ditolak/Menunggu ACC/Menunggu Setting Approver
    const cyclesQuery = await client.query(`
      WITH LatestCycles AS (
        SELECT DISTINCT ON (c.nomor_dokumen)
          c.id AS cycle_id,
          c.nomor_dokumen,
          c.current_stage,
          c.status AS cycle_status,
          c.started_at,
          c.completed_at
        FROM procedure_approval_cycles c
        ORDER BY c.nomor_dokumen, c.id DESC
      ),
      CombinedDocs AS (
        SELECT
          COALESCE(lc.cycle_id, 0) AS cycle_id,
          pd.nomor_dokumen,
          CASE
            WHEN pd.status = 'Menunggu Setting Approver' OR pd.status = 'Menunggu Approval' THEN 'setting_approver'
            WHEN pd.status = 'Revisi' THEN 'revisi'
            WHEN pd.status = 'Ditolak' THEN 'rejected'
            WHEN lc.current_stage IS NOT NULL THEN lc.current_stage
            WHEN lc.cycle_status = 'completed' THEN 'completed'
            ELSE 'setting_approver'
          END AS current_stage,
          CASE
            WHEN pd.status = 'Menunggu Setting Approver' OR pd.status = 'Menunggu Approval' THEN 'setting_approver'
            WHEN pd.status = 'Revisi' THEN 'revisi'
            WHEN pd.status = 'Ditolak' THEN 'rejected'
            WHEN lc.cycle_status IS NOT NULL THEN lc.cycle_status
            ELSE 'setting_approver'
          END AS cycle_status,
          COALESCE(lc.started_at, pd.updated_at, pd.created_at) AS started_at,
          lc.completed_at,
          pd.nama_dokumen,
          pd.level_dokumen,
          pd.revisi,
          pd.owner,
          pd.pic,
          pd.email,
          pd.status AS document_status,
          af.file_name,
          af.file_path
        FROM procedure_documents pd
        LEFT JOIN LatestCycles lc ON lc.nomor_dokumen = pd.nomor_dokumen
        LEFT JOIN active_procedure_files af ON af.nomor_dokumen = pd.nomor_dokumen
        WHERE
          (lc.cycle_id IS NOT NULL AND (lc.cycle_status != 'completed' OR lc.completed_at >= NOW() - INTERVAL '7 days'))
          OR pd.status = 'Revisi'
          OR pd.status = 'Ditolak'
          OR pd.status LIKE 'Menunggu ACC%'
          OR pd.status = 'Menunggu Setting Approver'
          OR pd.status = 'Menunggu Approval'
      )
      SELECT *
      FROM CombinedDocs
      ORDER BY
        CASE
          WHEN document_status = 'Menunggu Setting Approver' OR cycle_status = 'setting_approver' THEN 0
          WHEN document_status = 'Revisi' OR cycle_status = 'revisi' THEN 1
          WHEN document_status = 'Ditolak' OR cycle_status = 'rejected' THEN 2
          WHEN cycle_status = 'in_progress' THEN 3
          ELSE 4
        END,
        COALESCE(completed_at, started_at) DESC,
        cycle_id DESC
    `);

    const cycleRows = cyclesQuery.rows;
    if (cycleRows.length === 0) {
      return NextResponse.json({
        stats: {
          revisi: revisiCount,
          settingApprover: settingApproverCount,
          prepared: statsRow.prepared_count,
          checked: statsRow.checked_count,
          approved: statsRow.approved_count,
          inProgressTotal: statsRow.in_progress_total + revisiCount + settingApproverCount,
          completedTotal: totalsRow.completed_total,
          allTotal: totalsRow.all_total + revisiCount + settingApproverCount,
        },
        documents: [],
      });
    }

    const cycleIds = cycleRows.map(r => r.cycle_id).filter(id => id > 0);
    const nomorDokumens = cycleRows.map(r => r.nomor_dokumen);

    // 3. Ambil seluruh action approval untuk siklus-siklus ini
    const actionsQuery = cycleIds.length > 0
      ? await client.query(`
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
        `, [cycleIds])
      : { rows: [] };

    const actionsByCycleAndRole: Record<string, any[]> = {};
    for (const a of actionsQuery.rows) {
      const key = `${a.cycle_id}:${a.role}`;
      if (!actionsByCycleAndRole[key]) actionsByCycleAndRole[key] = [];
      actionsByCycleAndRole[key].push(a);
    }

    // 3.5. Ambil data penolakan terbaru (jika ada) untuk seluruh dokumen yang terdaftar
    const rejectionsQuery = nomorDokumens.length > 0
      ? await client.query(`
          SELECT DISTINCT ON (pac.nomor_dokumen)
            ra.id,
            pac.nomor_dokumen,
            ra.role,
            ra.nama,
            ra.email,
            ra.reject_reason,
            ra.acc_at
          FROM procedure_approval_actions ra
          JOIN procedure_approval_cycles pac ON pac.id = ra.cycle_id
          WHERE pac.nomor_dokumen = ANY($1) AND ra.acc_status = 'rejected'
          ORDER BY pac.nomor_dokumen, ra.id DESC
        `, [nomorDokumens])
      : { rows: [] };

    const latestRejectionByDoc: Record<string, any> = {};
    for (const rej of rejectionsQuery.rows) {
      latestRejectionByDoc[rej.nomor_dokumen] = rej;
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

    // 4.5. Auto-sync: Jika ada dokumen berstatus in_progress, dan di current_stage-nya ada approver terdaftar
    // yang belum dibuatkan action di procedure_approval_actions, buatkan action-nya & kirimkan email!
    const unlinkedActionsToInsert: any[] = [];
    for (const row of cycleRows) {
      if (row.cycle_status === 'in_progress' && row.cycle_id) {
        const curRole = row.current_stage as ApprovalRole;
        if (curRole && ['prepared', 'checked', 'approved'].includes(curRole)) {
          const actionKey = `${row.cycle_id}:${curRole}`;
          const existingActions = actionsByCycleAndRole[actionKey] || [];
          const registeredApprovers = approversByDocAndRole[`${row.nomor_dokumen}:${curRole}`] || [];
          const existingApproverIds = new Set(existingActions.map(a => a.approver_id).filter(Boolean));

          const missingApprovers = registeredApprovers.filter(pa => !existingApproverIds.has(pa.id));
          for (const pa of missingApprovers) {
            unlinkedActionsToInsert.push({
              cycleId: row.cycle_id,
              approverId: pa.id,
              role: curRole,
              nama: pa.nama,
              email: pa.email,
              nomorDokumen: row.nomor_dokumen,
              namaDokumen: row.nama_dokumen,
            });
          }
        }
      }
    }

    if (unlinkedActionsToInsert.length > 0) {
      for (const item of unlinkedActionsToInsert) {
        try {
          const token = generateToken();
          const verificationCode = generateVerificationCode();
          const insRes = await client.query(
            `INSERT INTO procedure_approval_actions
               (cycle_id, approver_id, role, nama, email, token, verification_code, acc_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
             RETURNING id, cycle_id, approver_id, role, nama, email, acc_status, acc_at, email_sent_at, reject_reason`,
            [item.cycleId, item.approverId, item.role, item.nama, item.email, token, verificationCode]
          );
          const newAct = insRes.rows[0];
          const key = `${item.cycleId}:${item.role}`;
          if (!actionsByCycleAndRole[key]) actionsByCycleAndRole[key] = [];
          actionsByCycleAndRole[key].push(newAct);

          // Kirim email notifikasi
          try {
            const smtpSettings = await getActiveSmtpSettings(client);
            if (smtpSettings) {
              const accLink = `${smtpSettings.appUrl}/review-prosedur/acc/${token}`;
              const emailParams = {
                nama: item.nama,
                namaDokumen: item.namaDokumen || item.nomorDokumen,
                nomorDokumen: item.nomorDokumen,
                role: item.role as ApprovalRole,
                accLink,
              };
              await sendMail(
                smtpSettings,
                item.email,
                `[Review Prosedur] Permintaan Approval Dokumen Prosedur (${STAGE_DISPLAY[item.role as ApprovalRole]}) - ${item.nomorDokumen}`,
                buildAccEmailHtml(emailParams),
                buildAccEmailText(emailParams)
              );
              await client.query(
                `UPDATE procedure_approval_actions SET email_sent_at = NOW() WHERE id = $1`,
                [newAct.id]
              );
              newAct.email_sent_at = new Date().toISOString();
            }
          } catch (mErr) {
            console.error(`Gagal kirim email auto-sync ke ${item.email}:`, mErr);
          }
        } catch (e) {
          console.error('Error auto-syncing missing approval action in GET:', e);
        }
      }
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

      // Fallback: Jika rejection belum ditemukan tapi dokumen berstatus Ditolak atau ada data penolakan tercatat
      if (!rejection && latestRejectionByDoc[row.nomor_dokumen]) {
        const fallbackRej = latestRejectionByDoc[row.nomor_dokumen];
        rejection = {
          role: fallbackRej.role,
          roleLabel: STAGE_DISPLAY[fallbackRej.role as ApprovalRole] || fallbackRej.role,
          nama: fallbackRej.nama,
          email: fallbackRej.email,
          reason: fallbackRej.reject_reason,
          rejectedAt: fallbackRej.acc_at,
        };
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

          // 🆕 PENTING: Jika ada approver di registeredApprovers yang belum tercatat di actions
          // (misalnya baru saja ditambahkan atau tahapnya belum dibuatkan action),
          // gabungkan agar tetap tampil di modal edit dan tabel dokumen!
          const existingApproverIds = new Set(existingActions.map(a => a.approver_id).filter(Boolean));
          const unlinkedApprovers = registeredApprovers.filter(pa => !existingApproverIds.has(pa.id));
          for (const pa of unlinkedApprovers) {
            approverList.push({
              id: null,
              approverId: pa.id,
              nama: pa.nama,
              email: pa.email,
              accStatus: stageStatus === 'completed' ? 'acc' : (stageStatus === 'in_progress' ? 'pending' : 'waiting'),
              accAt: null,
              emailSentAt: null,
              rejectReason: null,
            });
          }
        } else {
          // Tahap belum dimulai di cycle ini, ambil dari daftar approver terdaftar
          approverList = registeredApprovers.map(pa => ({
            id: null,
            approverId: pa.id,
            nama: pa.nama,
            email: pa.email,
            accStatus: stageStatus === 'completed' ? 'acc' : (stageStatus === 'in_progress' ? 'pending' : 'waiting'),
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
      filteredDocs = filteredDocs.filter(
        d =>
          (d.cycleStatus === 'in_progress' ||
          d.cycleStatus === 'revisi' ||
          d.cycleStatus === 'rejected' ||
          d.documentStatus === 'Revisi' ||
          d.documentStatus === 'Ditolak') &&
          d.cycleStatus !== 'completed' &&
          d.documentStatus !== 'Relevan'
      );
    } else if (filter === 'setting_approver' || filter === 'new_docs') {
      filteredDocs = filteredDocs.filter(
        d =>
          d.cycleStatus === 'setting_approver' ||
          d.documentStatus === 'Menunggu Setting Approver' ||
          d.documentStatus === 'Menunggu Approval'
      );
    } else if (filter === 'completed') {
      filteredDocs = filteredDocs.filter(
        d =>
          (d.cycleStatus === 'completed' || d.currentStage === 'completed') &&
          d.completedAt &&
          new Date(d.completedAt).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000
      );
      // Sort: dokumen yang paling baru selesai approval diletakkan di paling atas!
      filteredDocs.sort((a, b) => {
        const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return timeB - timeA;
      });
    }

    // Filter klik card stage (Setting Approver / Revisi / Prepared / Checked / Approved / Selesai)
    if (stageFilter && ['setting_approver', 'prepared', 'checked', 'approved', 'revisi', 'completed'].includes(stageFilter)) {
      filteredDocs = filteredDocs.filter(d => {
        if (stageFilter === 'setting_approver') {
          return (
            d.cycleStatus === 'setting_approver' ||
            d.documentStatus === 'Menunggu Setting Approver' ||
            d.documentStatus === 'Menunggu Approval'
          );
        }
        if (stageFilter === 'revisi') {
          return (
            d.currentStage === 'revisi' ||
            d.cycleStatus === 'revisi' ||
            d.documentStatus === 'Revisi' ||
            d.documentStatus === 'Ditolak'
          );
        }
        if (stageFilter === 'completed') {
          return (
            (d.cycleStatus === 'completed' || d.currentStage === 'completed') &&
            d.completedAt &&
            new Date(d.completedAt).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000
          );
        }
        return d.cycleStatus === 'in_progress' && d.currentStage === stageFilter;
      });

      if (stageFilter === 'completed') {
        filteredDocs.sort((a, b) => {
          const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return timeB - timeA;
        });
      }
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

    const inProgressTotal = statsRow.in_progress_total + revisiCount;
    const completedTotal = totalsRow.completed_total || 0;
    const allTotal = inProgressTotal + settingApproverCount + completedTotal;

    return NextResponse.json({
      stats: {
        settingApprover: settingApproverCount,
        revisi: revisiCount,
        prepared: statsRow.prepared_count,
        checked: statsRow.checked_count,
        approved: statsRow.approved_count,
        inProgressTotal,
        completedTotal,
        allTotal,
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
    const activeCycleRes = await client.query(
      `SELECT id, current_stage, status FROM procedure_approval_cycles
       WHERE nomor_dokumen = $1 AND status = 'in_progress'
       ORDER BY id DESC LIMIT 1`,
      [nomorDokumen]
    );
    const activeCycle = activeCycleRes.rows[0] || null;
    const newActionsToNotify: any[] = [];

    if (approvers && typeof approvers === 'object') {
      const roles: ApprovalRole[] = ['prepared', 'checked', 'approved'];
      const stageOrder: Record<string, number> = {
        prepared: 1,
        checked: 2,
        approved: 3,
      };
      const curStageOrder = activeCycle ? (stageOrder[activeCycle.current_stage] || 1) : 1;

      for (const role of roles) {
        // 🔒 Jika siklus sedang berjalan dan tahap ini SUDAH selesai disetujui (order < curStageOrder):
        // Jangan izinkan ubah atau tambah approver pada tahap yang sudah selesai!
        if (activeCycle && stageOrder[role] < curStageOrder) {
          continue;
        }

        const newApprovers: ApproverInput[] = Array.isArray(approvers[role])
          ? approvers[role].filter((a: ApproverInput) => a.email && a.email.trim())
          : [];

        // Ambil approver existing untuk role ini
        const existingRes = await client.query(
          `SELECT id, urutan, email, nama FROM procedure_approvers
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

            // Jika role ini sedang berjalan di activeCycle, cek apakah action sudah ada dan sudah dikirimi email
            if (activeCycle && activeCycle.current_stage === role) {
              const actCheck = await client.query(
                `SELECT id, email_sent_at, token FROM procedure_approval_actions WHERE cycle_id = $1 AND approver_id = $2`,
                [activeCycle.id, existing.id]
              );
              if (actCheck.rows.length === 0) {
                const token = generateToken();
                const verificationCode = generateVerificationCode();
                const actionInsert = await client.query(
                  `INSERT INTO procedure_approval_actions
                     (cycle_id, approver_id, role, nama, email, token, verification_code, acc_status)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
                   RETURNING id`,
                  [activeCycle.id, existing.id, role, incoming.nama?.trim() || null, incoming.email.trim(), token, verificationCode]
                );
                newActionsToNotify.push({
                  actionId: actionInsert.rows[0]?.id,
                  cycleId: activeCycle.id,
                  approverId: existing.id,
                  role: role,
                  nama: incoming.nama?.trim() || null,
                  email: incoming.email.trim(),
                  token,
                });
              } else if (!actCheck.rows[0].email_sent_at) {
                newActionsToNotify.push({
                  actionId: actCheck.rows[0].id,
                  cycleId: activeCycle.id,
                  approverId: existing.id,
                  role: role,
                  nama: incoming.nama?.trim() || null,
                  email: incoming.email.trim(),
                  token: actCheck.rows[0].token,
                });
              }
            }
          } else if (!existing && incoming) {
            // Insert row baru ke procedure_approvers
            const insertRes = await client.query(
              `INSERT INTO procedure_approvers (nomor_dokumen, role, nama, email, urutan, grup)
               VALUES ($1, $2, $3, $4, $5, 1)
               RETURNING id`,
              [nomorDokumen, role, incoming.nama?.trim() || null, incoming.email.trim(), i]
            );
            const newApproverId = insertRes.rows[0]?.id;

            // 🆕 Jika dokumen memiliki siklus yang SEDANG BERJALAN di tahap ini (role === activeCycle.current_stage):
            // Buatkan action approval baru dengan status 'pending', token unik, dan daftarkan untuk dikirimi email notifikasi!
            if (activeCycle && activeCycle.current_stage === role && newApproverId) {
              const token = generateToken();
              const verificationCode = generateVerificationCode();
              const actionInsert = await client.query(
                `INSERT INTO procedure_approval_actions
                   (cycle_id, approver_id, role, nama, email, token, verification_code, acc_status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
                 RETURNING id`,
                [activeCycle.id, newApproverId, role, incoming.nama?.trim() || null, incoming.email.trim(), token, verificationCode]
              );
              newActionsToNotify.push({
                actionId: actionInsert.rows[0]?.id,
                cycleId: activeCycle.id,
                approverId: newApproverId,
                role: role,
                nama: incoming.nama?.trim() || null,
                email: incoming.email.trim(),
                token,
              });
            }
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

    // 3. Cek apakah dokumen ini berstatus 'Menunggu Setting Approver' atau belum memiliki siklus approval aktif.
    // Jika semua 3 approver (Prepared, Checked, Approved) sudah diisi, langsung masukkan ke tahap approval (Prepared)!
    const currentDocStatusRes = await client.query(
      `SELECT status FROM procedure_documents WHERE nomor_dokumen = $1`,
      [nomorDokumen]
    );
    const curStatus = currentDocStatusRes.rows[0]?.status;

    let startedApproval = false;
    let pendingActions: any[] = [];

    if (
      (curStatus === 'Menunggu Setting Approver' || curStatus === 'Menunggu Approval' || !activeCycle) &&
      approvers && typeof approvers === 'object'
    ) {
      const hasPrepared = (approvers.prepared || []).some((a: any) => a.email && a.email.trim());
      const hasChecked = (approvers.checked || []).some((a: any) => a.email && a.email.trim());
      const hasApproved = (approvers.approved || []).some((a: any) => a.email && a.email.trim());

      if (hasPrepared && hasChecked && hasApproved) {
        // Ambil info file aktif jika ada
        const fileRes = await client.query(
          `SELECT id FROM active_procedure_files WHERE nomor_dokumen = $1 LIMIT 1`,
          [nomorDokumen]
        );
        const fileId = fileRes.rows[0]?.id ?? null;

        const cycleResult = await startApprovalCycle(client, nomorDokumen, fileId);
        if (cycleResult.started) {
          startedApproval = true;
          pendingActions = cycleResult.actions;
        }
      }
    }

    await client.query('COMMIT');

    await logActivity({
      username: 'admin',
      activityType: 'update',
      activityDescription: startedApproval
        ? `Menyimpan approver dan memulai alur approval (Prepared) untuk dokumen ${nomorDokumen} (${namaDokumen})`
        : `Memperbarui detail approval untuk dokumen ${nomorDokumen} (${namaDokumen})`,
      targetType: 'procedure',
      targetId: nomorDokumen,
    });

    // 🆕 Kirim email notifikasi ke approver baru yang ditambahkan di tahap yang sedang berjalan
    if (newActionsToNotify.length > 0) {
      try {
        const smtpSettings = await getActiveSmtpSettings(client);
        if (smtpSettings) {
          for (const action of newActionsToNotify) {
            try {
              const accLink = `${smtpSettings.appUrl}/review-prosedur/acc/${action.token}`;
              const emailParams = {
                nama: action.nama,
                namaDokumen: namaDokumen || nomorDokumen,
                nomorDokumen,
                role: action.role as ApprovalRole,
                accLink,
              };
              await sendMail(
                smtpSettings,
                action.email,
                `[Review Prosedur] Permintaan Approval Dokumen Prosedur (${STAGE_DISPLAY[action.role as ApprovalRole]}) - ${nomorDokumen}`,
                buildAccEmailHtml(emailParams),
                buildAccEmailText(emailParams)
              );
              await client.query(
                `UPDATE procedure_approval_actions SET email_sent_at = NOW() WHERE id = $1`,
                [action.actionId]
              );
            } catch (errSend) {
              console.error(`Error sending email to newly added approver ${action.email}:`, errSend);
            }
          }
        }
      } catch (errSmtp) {
        console.error('Error in smtp check during new approver notification:', errSmtp);
      }
    }

    // Kirim email notifikasi ke approver Prepared jika alur approval baru saja dimulai
    if (startedApproval && pendingActions.length > 0) {
      try {
        const smtpSettings = await getActiveSmtpSettings(client);
        if (smtpSettings) {
          for (const action of pendingActions) {
            try {
              const accLink = `${smtpSettings.appUrl}/review-prosedur/acc/${action.token}`;
              const emailParams = {
                nama: action.nama,
                namaDokumen: namaDokumen || nomorDokumen,
                nomorDokumen,
                role: 'prepared' as ApprovalRole,
                accLink,
              };
              await sendMail(
                smtpSettings,
                action.email,
                `[Review Prosedur] Permintaan Approval Dokumen Prosedur (Prepared) - ${nomorDokumen}`,
                buildAccEmailHtml(emailParams),
                buildAccEmailText(emailParams)
              );
              await client.query(
                `UPDATE procedure_approval_actions SET email_sent_at = NOW() WHERE id = $1`,
                [action.actionId]
              );
            } catch (mailErr) {
              console.error('Error sending approval email to prepared approver:', mailErr);
            }
          }
        }
      } catch (e) {
        console.error('Error in smtp check during start approval:', e);
      }
    }

    return NextResponse.json({
      success: true,
      startedApproval,
      newApproversAdded: newActionsToNotify.length,
      message: startedApproval
        ? 'Data approver berhasil disimpan dan dokumen resmi masuk ke tahap approval (Prepared)!'
        : newActionsToNotify.length > 0
        ? `Approver baru berhasil ditambahkan dan email permintaan approval telah dikirim!`
        : 'Detail dokumen dan approval berhasil diperbarui.',
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
