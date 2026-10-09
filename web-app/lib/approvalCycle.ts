// lib/approvalCycle.ts
//
// Logika inti alur approval berjenjang: Prepared -> Checked -> Approved.
// Dipicu saat admin mengupload ulang dokumen yang statusnya 'Revisi'
// (lihat app/api/files/upload/route.ts). Setiap kali satu role SELESAI
// (semua orang di role itu sudah ACC), sistem otomatis maju ke role
// berikutnya dan mengirim email baru. Ketika role terakhir (approved)
// selesai, cycle ditandai 'completed' — caller (upload route atau
// acc route) bertanggung jawab men-generate PDF final & set status
// dokumen menjadi 'Relevan' pada titik itu.

import crypto from 'crypto';
import type { PoolClient } from 'pg';

export type ApprovalRole = 'prepared' | 'checked' | 'approved';

export function generateToken(): string {
  return crypto.randomBytes(24).toString('hex'); // 48 karakter hex, dipakai di link email
}

export function generateVerificationCode(): string {
  return crypto.randomBytes(8).toString('hex'); // 16 karakter hex, dipakai di QR code hasil akhir
}

export const NEXT_STAGE: Record<ApprovalRole, ApprovalRole | 'completed'> = {
  prepared: 'checked',
  checked:  'approved',
  approved: 'completed',
};

// Status yang tampil di kolom Status halaman status-review selama cycle berjalan.
// Ditambahkan ke StatusType di data/procedures/all-procedures.ts.
export const STAGE_STATUS_LABEL: Record<ApprovalRole, string> = {
  prepared: 'Menunggu ACC Prepared',
  checked:  'Menunggu ACC Checked',
  approved: 'Menunggu ACC Approved',
};

export const STAGE_DISPLAY: Record<ApprovalRole, string> = {
  prepared: 'Prepared',
  checked:  'Checked',
  approved: 'Approved',
};

export interface PendingAction {
  actionId:   number;
  approverId: number;
  nama:       string | null;
  email:      string;
  token:      string;
}

interface ApproverRow {
  id: number;
  nama: string | null;
  email: string;
}

async function fetchApprovers(
  client: PoolClient,
  nomorDokumen: string,
  role: ApprovalRole
): Promise<ApproverRow[]> {
  const result = await client.query(
    `SELECT id, nama, email FROM procedure_approvers
     WHERE nomor_dokumen = $1 AND role = $2
     ORDER BY grup, urutan, id`,
    [nomorDokumen, role]
  );
  return result.rows;
}

async function insertStageActions(
  client: PoolClient,
  cycleId: number,
  role: ApprovalRole,
  approverRows: ApproverRow[]
): Promise<PendingAction[]> {
  const actions: PendingAction[] = [];
  for (const approver of approverRows) {
    const token = generateToken();
    const verificationCode = generateVerificationCode();
    const result = await client.query(
      `INSERT INTO procedure_approval_actions
         (cycle_id, approver_id, role, nama, email, token, verification_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [cycleId, approver.id, role, approver.nama, approver.email, token, verificationCode]
    );
    actions.push({
      actionId:   result.rows[0].id,
      approverId: approver.id,
      nama:       approver.nama,
      email:      approver.email,
      token,
    });
  }
  return actions;
}

export type StartCycleResult =
  | { started: true; cycleId: number; actions: PendingAction[] }
  | { started: false; reason: 'no_prepared_approvers' };

/**
 * Mulai siklus approval baru untuk sebuah dokumen. Dipanggil dari upload
 * route SETELAH status dokumen di-cek 'Revisi' (pengecekan dilakukan oleh
 * caller). Fungsi ini HANYA menulis ke database (insert cycle + actions,
 * update status dokumen) — pengiriman email dilakukan oleh caller di luar
 * transaksi DB, menggunakan `actions` yang dikembalikan.
 *
 * Jika tidak ada approver 'prepared' terdaftar untuk dokumen ini, cycle
 * TIDAK dimulai (`started: false`) — caller sebaiknya fallback ke perilaku
 * lama (langsung set status 'Relevan'), supaya dokumen tidak "macet"
 * menunggu approval yang tidak akan pernah datang.
 */
export async function startApprovalCycle(
  client: PoolClient,
  nomorDokumen: string,
  triggeredByFileId: number | null
): Promise<StartCycleResult> {
  const preparedApprovers = await fetchApprovers(client, nomorDokumen, 'prepared');

  if (preparedApprovers.length === 0) {
    return { started: false, reason: 'no_prepared_approvers' };
  }

  // Batalkan siklus aktif sebelumnya jika ada, agar tidak ada siklus tumpang-tindih/orphan
  await client.query(
    `UPDATE procedure_approval_cycles
     SET status = 'cancelled'
     WHERE nomor_dokumen = $1 AND status = 'in_progress'`,
    [nomorDokumen]
  );

  const cycleResult = await client.query(
    `INSERT INTO procedure_approval_cycles
       (nomor_dokumen, triggered_by_file_id, current_stage, status)
     VALUES ($1, $2, 'prepared', 'in_progress')
     RETURNING id`,
    [nomorDokumen, triggeredByFileId]
  );
  const cycleId = cycleResult.rows[0].id;

  const actions = await insertStageActions(client, cycleId, 'prepared', preparedApprovers);

  await client.query(
    `UPDATE procedure_documents
     SET status = $1, is_date_stamped = FALSE, updated_at = CURRENT_TIMESTAMP
     WHERE nomor_dokumen = $2`,
    [STAGE_STATUS_LABEL.prepared, nomorDokumen]
  );

  return { started: true, cycleId, actions };
}

export type AdvanceResult =
  | { advanced: false } // masih ada approver di stage sekarang yang belum ACC
  | { advanced: true; completed: true; nomorDokumen: string; cycleId: number }
  | {
      advanced: true;
      completed: false;
      nextRole: ApprovalRole;
      nomorDokumen: string;
      cycleId: number;
      actions: PendingAction[];
    };

/**
 * Dipanggil setelah seseorang ACC (dari acc route). Mengecek apakah SEMUA
 * approver di role yang sama untuk cycle ini sudah ACC:
 *  - Belum semua       -> { advanced: false }, tidak ada yang perlu dilakukan lagi.
 *  - Sudah semua       -> majukan current_stage ke role berikutnya, insert
 *                          action baru untuk role tsb (caller mengirim email
 *                          memakai `actions` yang dikembalikan).
 *  - Approved selesai  -> cycle ditandai 'completed'. Caller bertanggung
 *                          jawab men-generate PDF final & set status dokumen
 *                          'Relevan' setelah ini.
 *
 * Jika role berikutnya kebetulan tidak punya approver terdaftar sama sekali
 * (mis. dokumen tidak punya 'checked'), stage tsb otomatis dilewati
 * (rekursif) supaya cycle tidak macet.
 */
export async function checkAndAdvanceStage(
  client: PoolClient,
  cycleId: number
): Promise<AdvanceResult> {
  const cycleResult = await client.query(
    `SELECT nomor_dokumen, current_stage FROM procedure_approval_cycles WHERE id = $1`,
    [cycleId]
  );
  if (cycleResult.rows.length === 0) return { advanced: false };

  const nomorDokumen = cycleResult.rows[0].nomor_dokumen;
  const currentStage: ApprovalRole = cycleResult.rows[0].current_stage;

  const pendingCountResult = await client.query(
    `SELECT COUNT(*)::int AS count FROM procedure_approval_actions
     WHERE cycle_id = $1 AND role = $2 AND acc_status = 'pending'`,
    [cycleId, currentStage]
  );
  if (pendingCountResult.rows[0].count > 0) {
    return { advanced: false };
  }

  const next = NEXT_STAGE[currentStage];

  if (next === 'completed') {
    await client.query(
      `UPDATE procedure_approval_cycles
       SET current_stage = 'completed', status = 'completed', completed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [cycleId]
    );
    return { advanced: true, completed: true, nomorDokumen, cycleId };
  }

  const nextApprovers = await fetchApprovers(client, nomorDokumen, next);

  if (nextApprovers.length === 0) {
    // Role berikutnya tidak punya approver terdaftar — lewati, coba maju lagi.
    await client.query(
      `UPDATE procedure_approval_cycles SET current_stage = $1 WHERE id = $2`,
      [next, cycleId]
    );
    return checkAndAdvanceStage(client, cycleId);
  }

  const actions = await insertStageActions(client, cycleId, next, nextApprovers);

  await client.query(
    `UPDATE procedure_approval_cycles SET current_stage = $1 WHERE id = $2`,
    [next, cycleId]
  );
  await client.query(
    `UPDATE procedure_documents
     SET status = $1, updated_at = CURRENT_TIMESTAMP
     WHERE nomor_dokumen = $2`,
    [STAGE_STATUS_LABEL[next], nomorDokumen]
  );

  return { advanced: true, completed: false, nextRole: next, nomorDokumen, cycleId, actions };
}

// ─────────────────────────────────────────────────────────────────────────────
// 🆕 Penolakan (reject) — dipanggil dari POST /api/acc/[token] saat approver
// klik "Tolak Dokumen". Satu penolakan dari SIAPAPUN di stage yang sedang
// berjalan langsung MENGHENTIKAN seluruh cycle (bukan cuma stage itu) — admin
// harus perbaiki dokumen & upload ulang untuk memulai cycle baru dari awal.
// ─────────────────────────────────────────────────────────────────────────────
export interface RejectResult {
  cycleId: number;
  nomorDokumen: string;
  role: ApprovalRole;
  nama: string | null;
  email: string;
}

export async function rejectApprovalAction(
  client: PoolClient,
  actionId: number,
  reason: string
): Promise<RejectResult> {
  const actionResult = await client.query(
    `SELECT cycle_id, role, nama, email FROM procedure_approval_actions WHERE id = $1`,
    [actionId]
  );
  const row = actionResult.rows[0];
  const cycleId: number = row.cycle_id;
  const role: ApprovalRole = row.role;

  await client.query(
    `UPDATE procedure_approval_actions
     SET acc_status = 'rejected', acc_at = NOW(), reject_reason = $2
     WHERE id = $1`,
    [actionId, reason]
  );

  const cycleResult = await client.query(
    `UPDATE procedure_approval_cycles
     SET status = 'rejected'
     WHERE id = $1
     RETURNING nomor_dokumen`,
    [cycleId]
  );
  const nomorDokumen: string = cycleResult.rows[0].nomor_dokumen;

  await client.query(
    `UPDATE procedure_documents
     SET status = 'Ditolak', updated_at = CURRENT_TIMESTAMP
     WHERE nomor_dokumen = $1`,
    [nomorDokumen]
  );

  return { cycleId, nomorDokumen, role, nama: row.nama, email: row.email };
}