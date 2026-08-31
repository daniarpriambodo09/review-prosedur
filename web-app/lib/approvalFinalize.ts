// lib/approvalFinalize.ts
//
// Dipanggil dari app/api/acc/[token]/route.ts saat cycle approval mencapai
// status 'completed' (Approved sudah ACC semua). Tugasnya:
//   1. Ambil semua orang yang sudah ACC di cycle ini, per role.
//   2. Generate halaman 1 baru (template + QR code + nama, baris dinamis).
//   3. Gabungkan dengan halaman 2+ dari file dokumen yang sedang aktif.
//   4. Simpan hasil gabungan sebagai VERSI BARU di procedure_files
//      (mengikuti pola versioning yang sama dengan upload manual admin).
//   5. Set procedure_approval_cycles.final_file_id ke versi baru itu.
//   6. Set status dokumen jadi 'Relevan' + sync document_reviews.
//
// Kalau proses generate PDF gagal (mis. file asli corrupt), fungsi ini TIDAK
// membuat dokumen macet — tetap set status 'Relevan' memakai file yang sudah
// ada (tanpa halaman 1 diganti), lalu mencatat activity log berisi peringatan
// supaya admin tahu perlu upload ulang manual.

import type { PoolClient } from 'pg';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { logActivity } from './activityLogger';
import { getActiveSmtpSettings } from './mailer';
import { generateFirstPage, type ApprovalPerson } from './pdfFirstPage';
import { replaceFirstPage } from './pdfMerge';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'documents');

async function syncRelevanStatus(
  client: PoolClient,
  nomorDokumen: string,
  tanggalSelesaiApproval: string,
  currentRevisi: string | null
): Promise<void> {
  await client.query(
    `UPDATE procedure_documents
     SET status = 'Relevan', updated_at = CURRENT_TIMESTAMP
     WHERE nomor_dokumen = $1`,
    [nomorDokumen]
  );

  const docDate = new Date(tanggalSelesaiApproval);
  const approvalMonth = isNaN(docDate.getTime()) ? new Date().getMonth() : docDate.getMonth();
  const revisiValue = currentRevisi || '0';

  await client.query(
    `INSERT INTO document_reviews
       (nomor_dokumen, status, revisi, last_reviewed_month, updated_at)
     VALUES ($1, 'Relevan', $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (nomor_dokumen, last_reviewed_month)
     DO UPDATE SET status = 'Relevan', revisi = $2, updated_at = CURRENT_TIMESTAMP`,
    [nomorDokumen, revisiValue, approvalMonth]
  );
}

export async function finalizeApprovalCycle(
  client: PoolClient,
  cycleId: number,
  nomorDokumen: string
): Promise<void> {
  const docResult = await client.query(
    `SELECT nama_dokumen, level_dokumen, tanggal_selesai_approval, revisi
     FROM procedure_documents WHERE nomor_dokumen = $1`,
    [nomorDokumen]
  );
  if (docResult.rows.length === 0) return;

  const namaDokumen             = docResult.rows[0].nama_dokumen;
  const levelDokumen            = docResult.rows[0].level_dokumen;
  const tanggalSelesaiApproval  = docResult.rows[0].tanggal_selesai_approval;
  const currentRevisi           = docResult.rows[0].revisi;

  // Ambil semua approver yang sudah ACC di cycle ini, per role
  const actionsResult = await client.query(
    `SELECT role, nama, email, verification_code
     FROM procedure_approval_actions
     WHERE cycle_id = $1 AND acc_status = 'acc'
     ORDER BY role, id`,
    [cycleId]
  );

  const byRole: Record<'prepared' | 'checked' | 'approved', ApprovalPerson[]> = {
    prepared: [], checked: [], approved: [],
  };
  for (const row of actionsResult.rows) {
    byRole[row.role as 'prepared' | 'checked' | 'approved'].push({
      nama: row.nama,
      email: row.email,
      verificationCode: row.verification_code,
    });
  }

  // Ambil file aktif saat ini (yang akan diganti halaman 1-nya)
  const activeFileResult = await client.query(
    `SELECT id, file_name, file_path FROM active_procedure_files WHERE nomor_dokumen = $1`,
    [nomorDokumen]
  );

  if (activeFileResult.rows.length === 0) {
    // Tidak ada file aktif sama sekali — tidak ada yang bisa digabung.
    // Tetap set Relevan supaya dokumen tidak macet, tapi catat peringatan.
    await syncRelevanStatus(client, nomorDokumen, tanggalSelesaiApproval, currentRevisi);
    await logActivity({
      username: 'system',
      activityType: 'update',
      activityDescription: `Approval selesai untuk ${namaDokumen}, tapi tidak ada file PDF aktif untuk diperbarui halaman 1-nya. Status tetap diubah ke Relevan.`,
      targetType: 'procedure',
      targetId: nomorDokumen,
    });
    return;
  }

  const activeFile = activeFileResult.rows[0];

  try {
    const smtpSettings = await getActiveSmtpSettings(client);
    const appUrl = smtpSettings?.appUrl || '';

    // 1. Generate halaman 1 baru
    const newFirstPageBytes = await generateFirstPage({
      nomorDokumen,
      namaDokumen,
      levelDokumen,
      approved: byRole.approved,
      checked:  byRole.checked,
      prepared: byRole.prepared,
      appUrl,
    });

    // 2. Baca file aktif saat ini dari disk, gabungkan
    const relativePath = activeFile.file_path.startsWith('/')
      ? activeFile.file_path.slice(1)
      : activeFile.file_path;
    const originalAbsolutePath = path.join(process.cwd(), 'public', relativePath);
    const originalBytes = await readFile(originalAbsolutePath);

    const mergedBytes = await replaceFirstPage(originalBytes, newFirstPageBytes);

    // 3. Simpan sebagai versi baru (mengikuti pola versioning upload manual)
    const versionResult = await client.query(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next_version
       FROM procedure_files WHERE nomor_dokumen = $1`,
      [nomorDokumen]
    );
    const nextVersion = versionResult.rows[0].next_version;

    await client.query(
      `UPDATE procedure_files SET is_active = false WHERE nomor_dokumen = $1`,
      [nomorDokumen]
    );

    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const sanitizedName = (activeFile.file_name as string)
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .replace(/\.pdf$/i, '');
    const diskFileName = `v${nextVersion}_${nomorDokumen}_${sanitizedName}_${timestamp}_final.pdf`;

    const docDir = path.join(UPLOAD_DIR, nomorDokumen);
    if (!existsSync(docDir)) {
      await mkdir(docDir, { recursive: true });
    }
    const newFilePath = path.join(docDir, diskFileName);
    await writeFile(newFilePath, mergedBytes);

    const dbPath = `/uploads/documents/${nomorDokumen}/${diskFileName}`;

    const insertResult = await client.query(
      `INSERT INTO procedure_files
         (nomor_dokumen, file_name, file_path, file_size, mime_type, version, uploaded_by)
       VALUES ($1, $2, $3, $4, 'application/pdf', $5, 'system')
       RETURNING id`,
      [nomorDokumen, activeFile.file_name, dbPath, mergedBytes.length, nextVersion]
    );
    const newFileId = insertResult.rows[0].id;

    await client.query(
      `UPDATE procedure_approval_cycles SET final_file_id = $1 WHERE id = $2`,
      [newFileId, cycleId]
    );

    await syncRelevanStatus(client, nomorDokumen, tanggalSelesaiApproval, currentRevisi);

    await logActivity({
      username: 'system',
      activityType: 'upload',
      activityDescription: `Halaman 1 dokumen ${namaDokumen} otomatis diperbarui dengan hasil approval (Prepared/Checked/Approved) — versi ${nextVersion}`,
      targetType: 'file',
      targetId: nomorDokumen,
    });
  } catch (err) {
    // Generate/gabung PDF gagal — jangan biarkan dokumen macet, tapi JANGAN
    // ganti file aktif. Tetap set Relevan pakai file yang sudah ada.
    console.error('Gagal generate/gabung PDF final untuk', nomorDokumen, err);
    await syncRelevanStatus(client, nomorDokumen, tanggalSelesaiApproval, currentRevisi);
    await logActivity({
      username: 'system',
      activityType: 'update',
      activityDescription: `Approval selesai untuk ${namaDokumen}, tapi GAGAL memperbarui halaman 1 dokumen (error teknis). Status tetap diubah ke Relevan menggunakan file lama — mohon cek/upload ulang manual jika perlu.`,
      targetType: 'procedure',
      targetId: nomorDokumen,
    });
  }
}