// app/api/acc/[token]/route.ts
//
// Endpoint publik (TANPA login) untuk alur approval berjenjang
// Prepared -> Checked -> Approved. Token unik per approver per cycle,
// dikirim lewat email (lihat lib/approvalEmailTemplate.ts).
//
// GET  — ambil info dokumen + status ACC saat ini, untuk ditampilkan
//         sebelum orang klik tombol "Setujui".
// POST — proses ACC: tandai action ini selesai, cek apakah semua approver
//         di role yang sama sudah ACC, kalau ya majukan ke role berikutnya
//         (kirim email baru) atau selesaikan cycle (role approved selesai).

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logActivity } from '@/lib/activityLogger';
import {
  checkAndAdvanceStage,
  rejectApprovalAction,
  getLatestRejectionForDocument,
  STAGE_DISPLAY,
  type ApprovalRole,
  type PendingAction,
} from '@/lib/approvalCycle';
import { finalizeApprovalCycle } from '@/lib/approvalFinalize';
import { getActiveSmtpSettings, sendMail } from '@/lib/mailer';
import { buildAccEmailHtml, buildAccEmailText } from '@/lib/approvalEmailTemplate';
import { ensurePicUserExists } from '@/lib/picUserHelper';

// ── GET — info untuk ditampilkan di halaman /acc/[token] ─────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const client = await pool.connect();
  try {
    const { token } = await params;

    const result = await client.query(
      `SELECT a.role, a.nama, a.email, a.acc_status, a.acc_at, a.reject_reason,
              c.id AS cycle_id, c.nomor_dokumen, c.status AS cycle_status, c.current_stage,
              pd.nama_dokumen, pd.level_dokumen, pd.revisi, pd.owner, pd.pic,
              af.file_name, af.file_path
       FROM procedure_approval_actions a
       JOIN procedure_approval_cycles c ON c.id = a.cycle_id
       JOIN procedure_documents pd ON pd.nomor_dokumen = c.nomor_dokumen
       LEFT JOIN active_procedure_files af ON af.nomor_dokumen = c.nomor_dokumen
       WHERE a.token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tautan persetujuan tidak ditemukan atau sudah tidak berlaku karena data approver telah diperbarui oleh administrator.' },
        { status: 404 }
      );
    }

    const row = result.rows[0];

    // 🔒 Jika action ini sudah dibatalkan karena approver diperbarui/diganti admin
    if (row.acc_status === 'cancelled') {
      return NextResponse.json(
        { error: 'Tautan persetujuan ini sudah tidak berlaku karena data approver telah diperbarui atau diganti oleh administrator.' },
        { status: 410 }
      );
    }

    // Detail approver terdaftar dan aksi di siklus approval ini
    const approversResult = await client.query(
      `SELECT id, role, nama, email, urutan
       FROM procedure_approvers
       WHERE nomor_dokumen = $1
       ORDER BY role, urutan, id`,
      [row.nomor_dokumen]
    );

    const actionsResult = await client.query(
      `SELECT id, approver_id, role, nama, email, acc_status, acc_at
       FROM procedure_approval_actions
       WHERE cycle_id = $1
       ORDER BY id ASC`,
      [row.cycle_id]
    );

    const stageOrder: Record<string, number> = {
      prepared: 1,
      checked: 2,
      approved: 3,
    };
    const currentOrder = stageOrder[row.current_stage || row.role] || 1;

    // Susun timeline lengkap per approver per stage
    const roles: ApprovalRole[] = ['prepared', 'checked', 'approved'];
    const timeline: Array<{
      role: string;
      roleLabel: string;
      nama: string | null;
      email: string;
      accStatus: 'acc' | 'pending' | 'rejected' | 'waiting';
      accAt: string | null;
      isCurrentUser: boolean;
    }> = [];

    const matchedActionIds = new Set<number>();

    for (const role of roles) {
      const targetOrder = stageOrder[role];
      const registeredInRole = approversResult.rows.filter(a => a.role === role);
      const actionsInRole = actionsResult.rows.filter(a => a.role === role);

      // 1. Petakan approver yang terdaftar di master
      for (const approver of registeredInRole) {
        // Cari action yang cocok berdasarkan approver_id atau email
        const matchedAction = actionsInRole.find(
          a => (a.approver_id && a.approver_id === approver.id) ||
               (a.email && approver.email && a.email.toLowerCase() === approver.email.toLowerCase())
        );

        let accStatus: 'acc' | 'pending' | 'rejected' | 'waiting' = 'waiting';
        let accAt: string | null = null;
        let displayName = approver.nama;
        let displayEmail = approver.email;

        if (matchedAction) {
          matchedActionIds.add(matchedAction.id);
          accStatus = matchedAction.acc_status;
          accAt = matchedAction.acc_at;
          displayName = matchedAction.nama || approver.nama;
          displayEmail = matchedAction.email || approver.email;
        } else {
          // Jika belum ada action di db
          if (row.cycle_status === 'completed') {
            accStatus = 'acc';
          } else if (row.cycle_status === 'rejected') {
            accStatus = targetOrder < currentOrder ? 'acc' : 'waiting';
          } else if (targetOrder < currentOrder) {
            accStatus = 'acc';
          } else if (targetOrder === currentOrder) {
            accStatus = 'pending';
          } else {
            accStatus = 'waiting';
          }
        }

        const isCurrent =
          Boolean(displayEmail && row.email && displayEmail.toLowerCase() === row.email.toLowerCase()) &&
          role === row.role;

        timeline.push({
          role,
          roleLabel: STAGE_DISPLAY[role] || role,
          nama: displayName,
          email: displayEmail,
          accStatus,
          accAt,
          isCurrentUser: isCurrent,
        });
      }

      // 2. Sertakan action historis jika ada yang tidak terdaftar lagi di master approver
      for (const act of actionsInRole) {
        if (!matchedActionIds.has(act.id)) {
          const isCurrent =
            Boolean(act.email && row.email && act.email.toLowerCase() === row.email.toLowerCase()) &&
            role === row.role;

          timeline.push({
            role,
            roleLabel: STAGE_DISPLAY[role] || role,
            nama: act.nama,
            email: act.email,
            accStatus: act.acc_status,
            accAt: act.acc_at,
            isCurrentUser: isCurrent,
          });
        }
      }
    }

    // 🆕 Kalau cycle-nya sudah 'rejected', ambil detail siapa & kenapa
    let rejection = null;
    if (row.cycle_status === 'rejected') {
      const rejectResult = await client.query(
        `SELECT role, nama, email, reject_reason, acc_at
         FROM procedure_approval_actions
         WHERE cycle_id = $1 AND acc_status = 'rejected'
         LIMIT 1`,
        [row.cycle_id]
      );
      if (rejectResult.rows.length > 0) {
        const r = rejectResult.rows[0];
        rejection = {
          role:       r.role,
          roleLabel:  STAGE_DISPLAY[r.role as ApprovalRole],
          nama:       r.nama,
          email:      r.email,
          reason:     r.reject_reason,
          rejectedAt: r.acc_at,
        };
      }
    }

    // 🆕 Catatan penolakan dari siklus sebelumnya jika dokumen ini adalah hasil revisi yang diajukan ulang
    const previousRejection = await getLatestRejectionForDocument(client, row.nomor_dokumen, row.cycle_id);

    return NextResponse.json({
      role:         row.role,
      roleLabel:    STAGE_DISPLAY[row.role as ApprovalRole],
      nama:         row.nama,
      email:        row.email,
      accStatus:    row.acc_status,
      accAt:        row.acc_at,
      rejectReason: row.reject_reason,
      nomorDokumen: row.nomor_dokumen,
      namaDokumen:  row.nama_dokumen,
      levelDokumen: row.level_dokumen ?? null,
      revisi:       row.revisi ?? null,
      owner:        row.owner ?? null,
      pic:          row.pic ?? null,
      cycleStatus:  row.cycle_status,
      currentStage: row.current_stage,
      // 🆕 Info file aktif, untuk preview PDF di halaman ACC
      fileName:     row.file_name ?? null,
      filePath:     row.file_path ?? null,
      // 🆕 detail penolakan & timeline alur
      rejection,
      previousRejection,
      timeline,
      // 🆕 Pastikan user approver terdaftar di pic_users & kembalikan untuk auto-login
      picUser: await ensurePicUserExists(client, row.email, row.nama),
    });
  } catch (error) {
    console.error('Error fetching ACC info:', error);
    return NextResponse.json({ error: 'Gagal memuat data.' }, { status: 500 });
  } finally {
    client.release();
  }
}

// ── POST — proses ACC ─────────────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const client = await pool.connect();
  try {
    const { token } = await params;
    const body = await request.json().catch(() => ({} as any));
    const requestedAction: 'approve' | 'reject' = body?.action === 'reject' ? 'reject' : 'approve';
    const reason: string = typeof body?.reason === 'string' ? body.reason.trim() : '';

    if (requestedAction === 'reject' && reason.length < 5) {
      return NextResponse.json(
        { error: 'Alasan penolakan wajib diisi (minimal 5 karakter).' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Lock baris ini supaya aman dari klik ganda / double-submit bersamaan
    const actionResult = await client.query(
      `SELECT a.id, a.cycle_id, a.role, a.acc_status, a.nama, a.email,
              c.nomor_dokumen, pd.nama_dokumen
       FROM procedure_approval_actions a
       JOIN procedure_approval_cycles c ON c.id = a.cycle_id
       JOIN procedure_documents pd ON pd.nomor_dokumen = c.nomor_dokumen
       WHERE a.token = $1
       FOR UPDATE OF a`,
      [token]
    );

    if (actionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Tautan persetujuan tidak ditemukan atau sudah tidak berlaku karena data approver telah diperbarui oleh administrator.' },
        { status: 404 }
      );
    }

    const action = actionResult.rows[0];

    if (action.acc_status === 'acc') {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Dokumen ini sudah Anda setujui sebelumnya.' },
        { status: 409 }
      );
    }
    if (action.acc_status === 'cancelled') {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Tautan persetujuan ini sudah tidak berlaku karena data approver telah diperbarui atau diganti oleh administrator.' },
        { status: 410 }
      );
    }
    if (action.acc_status === 'rejected') {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Dokumen ini sudah Anda tolak sebelumnya.' },
        { status: 409 }
      );
    }

    // ─── Cabang: TOLAK ─────────────────────────────────────────────────────
    if (requestedAction === 'reject') {
      const rejectResult = await rejectApprovalAction(client, action.id, reason);
      await client.query('COMMIT');

      await logActivity({
        username:            action.email,
        activityType:        'review',
        activityDescription: `${STAGE_DISPLAY[rejectResult.role]} (${action.email}) MENOLAK dokumen ${action.nama_dokumen} — alasan: ${reason}`,
        targetType:          'procedure',
        targetId:            action.nomor_dokumen,
      });

      return NextResponse.json({
        success:  true,
        rejected: true,
      });
    }

    // ─── Cabang: SETUJUI (perilaku lama, tidak berubah) ─────────────────────
    await client.query(
      `UPDATE procedure_approval_actions SET acc_status = 'acc', acc_at = NOW() WHERE id = $1`,
      [action.id]
    );

    const advanceResult = await checkAndAdvanceStage(client, action.cycle_id);

    let cycleCompleted = false;
    let nextRole: ApprovalRole | null = null;
    let pendingEmailActions: PendingAction[] = [];

    if (advanceResult.advanced) {
      if (advanceResult.completed) {
        cycleCompleted = true;
        await finalizeApprovalCycle(client, advanceResult.cycleId, advanceResult.nomorDokumen);
      } else {
        nextRole = advanceResult.nextRole;
        pendingEmailActions = advanceResult.actions;
      }
    }

    await client.query('COMMIT');

    await logActivity({
      username:            action.email,
      activityType:        'review',
      activityDescription: `${STAGE_DISPLAY[action.role as ApprovalRole]} (${action.email}) menyetujui (ACC) dokumen ${action.nama_dokumen}`,
      targetType:          'procedure',
      targetId:            action.nomor_dokumen,
    });

    if (cycleCompleted) {
      await logActivity({
        username:            'system',
        activityType:        'update',
        activityDescription: `Semua tahap approval (Prepared/Checked/Approved) selesai untuk ${action.nama_dokumen} — status otomatis menjadi Relevan`,
        targetType:          'procedure',
        targetId:            action.nomor_dokumen,
      });
    }

    // ─── Kirim email ke role berikutnya (di luar transaksi DB) ───────────────
    let emailWarning: string | null = null;
    if (nextRole && pendingEmailActions.length > 0) {
      const smtpSettings = await getActiveSmtpSettings(client);
      if (!smtpSettings) {
        emailWarning = `Berhasil ACC, tahap berikutnya (${STAGE_DISPLAY[nextRole]}) sudah disiapkan, tapi konfigurasi SMTP belum diatur — email belum terkirim.`;
      } else {
        const rejectionNote = await getLatestRejectionForDocument(client, action.nomor_dokumen, action.cycle_id);
        let sentCount = 0;
        for (const nextAction of pendingEmailActions) {
          try {
            const accLink = `${smtpSettings.appUrl}/review-prosedur/acc/${nextAction.token}`;
            const emailParams = {
              nama: nextAction.nama,
              role: nextRole,
              namaDokumen: action.nama_dokumen,
              nomorDokumen: action.nomor_dokumen,
              accLink,
              rejectionNote,
            };
            const emailSubject = rejectionNote
              ? `[Review Prosedur] [Revisi] Permintaan Approval Dokumen Prosedur (${STAGE_DISPLAY[nextRole]}) - ${action.nomor_dokumen}`
              : `[Review Prosedur] Permintaan Approval Dokumen Prosedur (${STAGE_DISPLAY[nextRole]}) - ${action.nomor_dokumen}`;
            await sendMail(
              smtpSettings,
              nextAction.email,
              emailSubject,
              buildAccEmailHtml(emailParams),
              buildAccEmailText(emailParams)
            );
            await client.query(
              `UPDATE procedure_approval_actions SET email_sent_at = NOW() WHERE id = $1`,
              [nextAction.actionId]
            );
            sentCount++;
          } catch (emailErr) {
            console.error(`Gagal kirim email ACC ke ${nextAction.email}:`, emailErr);
          }
        }
        if (sentCount < pendingEmailActions.length) {
          emailWarning = `Berhasil ACC, tapi hanya ${sentCount}/${pendingEmailActions.length} email tahap ${STAGE_DISPLAY[nextRole]} yang berhasil terkirim.`;
        }
      }
    }

    return NextResponse.json({
      success: true,
      cycleCompleted,
      nextRole,
      emailWarning,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error processing ACC:', error);
    return NextResponse.json({ error: 'Gagal memproses persetujuan. Silakan coba lagi.' }, { status: 500 });
  } finally {
    client.release();
  }
}