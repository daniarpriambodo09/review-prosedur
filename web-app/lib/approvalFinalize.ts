// lib/approvalFinalize.ts
//
// Dipanggil dari app/api/acc/[token]/route.ts saat cycle approval mencapai
// status 'completed' (Approved sudah ACC semua). Tugasnya:
//   1. Ambil semua orang yang sudah ACC di cycle ini, per role.
//   2. Generate halaman 1 baru (template + QR code + nama, baris dinamis).
//   3. 🆕 Ambil block_activity + riwayat Catatan Perubahan (procedure_revision_notes),
//      lalu generate halaman TERAKHIR baru (template Catatan Perubahan).
//   4. Gabungkan: halaman 1 baru + halaman tengah dari file aktif + halaman
//      terakhir baru — mengganti halaman terakhir LAMA kalau dokumen ini
//      sebelumnya sudah pernah memakai template tsb (uses_last_page_template),
//      atau menambahkannya kalau belum pernah.
//   5. Simpan hasil gabungan sebagai VERSI BARU di procedure_files
//      (mengikuti pola versioning yang sama dengan upload manual admin).
//   6. Set procedure_approval_cycles.final_file_id ke versi baru itu, dan
//      set procedure_documents.uses_last_page_template = true.
//   7. Set status dokumen jadi 'Relevan' + sync document_reviews.
//
// Kalau proses generate PDF gagal (mis. file asli corrupt), fungsi ini TIDAK
// membuat dokumen macet — tetap set status 'Relevan' memakai file yang sudah
// ada (tanpa halaman diganti), lalu mencatat activity log berisi peringatan
// supaya admin tahu perlu upload ulang manual.

import type { PoolClient } from 'pg';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { logActivity } from './activityLogger';
import { getActiveSmtpSettings } from './mailer';
import { generateFirstPage, type ApprovalPerson } from './pdfFirstPage';
import { generateLastPage, type RevisionEntry } from './pdfLastPage';
import { assembleFinalDocument } from './pdfMerge';
import { incrementRevision } from './revisionHelper';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'documents');

async function syncRelevanStatus(
  client: PoolClient,
  nomorDokumen: string,
  tanggalSelesaiApproval: string | null,
  nextRevisi: string
): Promise<void> {
  // Tanggal Selesai Approval otomatis terisi tanggal hari ini saat semua tahap approval selesai
  // dan nomor revisi otomatis bertambah 1
  await client.query(
    `UPDATE procedure_documents
     SET status = 'Relevan',
         revisi = $1,
         tanggal_selesai_approval = COALESCE(tanggal_selesai_approval, CURRENT_DATE),
         last_reviewed_at = NOW(),
         review_seen_at = NOW(),
         updated_at = CURRENT_TIMESTAMP
     WHERE nomor_dokumen = $2`,
    [nextRevisi, nomorDokumen]
  );

  const todayIso = new Date().toISOString().slice(0, 10);
  const effectiveTanggal = (tanggalSelesaiApproval && String(tanggalSelesaiApproval).trim())
    ? String(tanggalSelesaiApproval).slice(0, 10)
    : todayIso;

  const docDate = new Date(effectiveTanggal);
  const approvalMonth = isNaN(docDate.getTime()) ? new Date().getMonth() : docDate.getMonth();
  const revisiValue = nextRevisi || '0';

  await client.query(
    `INSERT INTO document_reviews
       (nomor_dokumen, status, revisi, last_reviewed_month, updated_at)
     VALUES ($1, 'Relevan', $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (nomor_dokumen, last_reviewed_month)
     DO UPDATE SET status = 'Relevan', revisi = $2, updated_at = CURRENT_TIMESTAMP`,
    [nomorDokumen, revisiValue, approvalMonth]
  );

  await client.query(
    `UPDATE document_reviews
     SET status = 'Relevan', revisi = $1, updated_at = CURRENT_TIMESTAMP
     WHERE nomor_dokumen = $2`,
    [revisiValue, nomorDokumen]
  );

  // Update tanggal_selesai_approval pada catatan revisi jika belum ada
  await client.query(
    `UPDATE procedure_revision_notes
     SET tanggal_selesai_approval = COALESCE(tanggal_selesai_approval, CURRENT_DATE)
     WHERE nomor_dokumen = $1 AND (rev_no = $2 OR rev_no = '0') AND tanggal_selesai_approval IS NULL`,
    [nomorDokumen, revisiValue]
  );

  // 🆕 Selesaikan permintaan revisi aktif untuk dokumen ini
  await client.query(
    `UPDATE pic_review_requests
     SET status = 'completed', updated_at = CURRENT_TIMESTAMP
     WHERE nomor_dokumen = $1 AND status = 'pending'`,
    [nomorDokumen]
  );
}

/** 🆕 Ambil semua entri Catatan Perubahan milik dokumen, urut kronologis menaik. */
async function fetchRevisionEntries(client: PoolClient, nomorDokumen: string): Promise<RevisionEntry[]> {
  const result = await client.query(
    `SELECT rev_no, catatan_perubahan, tanggal_selesai_approval, oleh
     FROM procedure_revision_notes
     WHERE nomor_dokumen = $1
     ORDER BY urutan ASC, id ASC`,
    [nomorDokumen]
  );
  return result.rows.map((row) => ({
    revNo: row.rev_no,
    catatanPerubahan: row.catatan_perubahan,
    tanggalSelesaiApproval: row.tanggal_selesai_approval,
    oleh: row.oleh,
  }));
}

export async function finalizeApprovalCycle(
  client: PoolClient,
  cycleId: number,
  nomorDokumen: string
): Promise<void> {
  const docResult = await client.query(
    `SELECT nama_dokumen, level_dokumen, tanggal_selesai_approval, revisi,
            block_activity, uses_last_page_template
     FROM procedure_documents WHERE nomor_dokumen = $1`,
    [nomorDokumen]
  );
  if (docResult.rows.length === 0) return;

  const namaDokumen             = docResult.rows[0].nama_dokumen;
  const levelDokumen            = docResult.rows[0].level_dokumen;
  const currentRevisi           = docResult.rows[0].revisi;
  const nextRevisi              = incrementRevision(currentRevisi);
  const blockActivity           = docResult.rows[0].block_activity;
  const hadLastPageTemplate     = docResult.rows[0].uses_last_page_template === true;

  // Tanggal Selesai Approval otomatis terisi tanggal hari ini saat semua tahap approval selesai
  const todayIso = new Date().toISOString().slice(0, 10);
  const tanggalSelesaiApproval = docResult.rows[0].tanggal_selesai_approval
    ? String(docResult.rows[0].tanggal_selesai_approval).slice(0, 10)
    : todayIso;

  await client.query(
    `UPDATE procedure_documents
     SET tanggal_selesai_approval = COALESCE(tanggal_selesai_approval, CURRENT_DATE)
     WHERE nomor_dokumen = $1`,
    [nomorDokumen]
  );

  // Ambil semua approver yang sudah ACC di cycle ini, per role, beserta jabatan & unit (section/department)
  // Aturan unit: jika ada section & department, ambil section saja. Jika hanya salah satu, ambil yang ada.
  const actionsResult = await client.query(
    `SELECT
       a.role,
       COALESCE(NULLIF(TRIM(a.nama), ''), NULLIF(TRIM(st.nama), ''), a.email) AS nama,
       a.email,
       a.verification_code,
       st.jabatan,
       st.unit
     FROM procedure_approval_actions a
     LEFT JOIN LATERAL (
       SELECT
         s.nama,
         COALESCE(NULLIF(TRIM(s.jabatan), ''), NULLIF(TRIM(s.jabatan_raw), '')) AS jabatan,
         COALESCE(
           (
             SELECT sc.nama
             FROM staff_sections ss
             JOIN sections sc ON sc.id = ss.section_id
             WHERE ss.staff_kode = s.kode
             ORDER BY sc.nama
             LIMIT 1
           ),
           sec.nama,
           d1.nama,
           d2.nama
         ) AS unit
       FROM staff_directory s
       LEFT JOIN sections sec ON s.unit_type = 'section' AND s.unit_id = sec.id
       LEFT JOIN departments d1 ON s.unit_type = 'department' AND d1.id = s.unit_id
       LEFT JOIN departments d2 ON sec.department_id = d2.id
       WHERE (s.email IS NOT NULL AND a.email IS NOT NULL AND LOWER(TRIM(s.email)) = LOWER(TRIM(a.email)))
          OR (s.nama IS NOT NULL AND a.nama IS NOT NULL AND LOWER(TRIM(s.nama)) = LOWER(TRIM(a.nama)))
       ORDER BY
         CASE WHEN LOWER(TRIM(s.email)) = LOWER(TRIM(a.email)) THEN 0 ELSE 1 END,
         s.updated_at DESC
       LIMIT 1
     ) st ON true
     WHERE a.cycle_id = $1 AND a.acc_status = 'acc'
     ORDER BY a.role, a.id`,
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
      jabatan: row.jabatan || null,
      unit: row.unit || null,
    });
  }

  // Ambil file aktif saat ini (yang akan diganti halaman pertama & terakhirnya)
  const activeFileResult = await client.query(
    `SELECT id, file_name, file_path FROM active_procedure_files WHERE nomor_dokumen = $1`,
    [nomorDokumen]
  );

  if (activeFileResult.rows.length === 0) {
    // Tidak ada file aktif sama sekali — tidak ada yang bisa digabung.
    // Tetap set Relevan supaya dokumen tidak macet, tapi catat peringatan.
    await syncRelevanStatus(client, nomorDokumen, tanggalSelesaiApproval, nextRevisi);
    await logActivity({
      username: 'system',
      activityType: 'update',
      activityDescription: `Approval selesai untuk ${namaDokumen}, tapi tidak ada file PDF aktif untuk diperbarui halaman 1 & halaman terakhirnya. Status tetap diubah ke Relevan.`,
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
    // 1. Generate halaman 1 baru (Cover approval Prepared/Checked/Approved)
    const newFirstPageBytes = await generateFirstPage({
      nomorDokumen,
      namaDokumen,
      levelDokumen,
      approved: byRole.approved,
      checked:  byRole.checked,
      prepared: byRole.prepared,
      appUrl,
    });

    // 2. Baca file aktif saat ini dari disk, ganti HANYA halaman pertama secara in-place.
    // Sesuai permintaan update: halaman terakhir TIDAK perlu penambahan template halaman.
    const relativePath = activeFile.file_path.startsWith('/')
      ? activeFile.file_path.slice(1)
      : activeFile.file_path;
    const originalAbsolutePath = path.join(process.cwd(), 'public', relativePath);
    const originalBytes = await readFile(originalAbsolutePath);

    const mergedBytes = await assembleFinalDocument(
      originalBytes,
      newFirstPageBytes,
      hadLastPageTemplate
    );

    // 4. Simpan sebagai versi baru (mengikuti pola versioning upload manual)
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

    // Pastikan tidak ada siklus in_progress lain yang tertinggal untuk dokumen ini
    await client.query(
      `UPDATE procedure_approval_cycles
       SET status = 'cancelled'
       WHERE nomor_dokumen = $1 AND status = 'in_progress' AND id != $2`,
      [nomorDokumen, cycleId]
    );

    // Sesuai update: template halaman terakhir tidak dipakai lagi (hanya halaman 1)
    await client.query(
      `UPDATE procedure_documents SET uses_last_page_template = FALSE WHERE nomor_dokumen = $1`,
      [nomorDokumen]
    );

    await syncRelevanStatus(client, nomorDokumen, tanggalSelesaiApproval, nextRevisi);

    await logActivity({
      username: 'system',
      activityType: 'upload',
      activityDescription: `Halaman 1 (cover approval) dokumen ${namaDokumen} otomatis diperbarui dengan hasil approval (Prepared/Checked/Approved) — versi ${nextVersion}`,
      targetType: 'file',
      targetId: nomorDokumen,
    });
  } catch (err) {
    // Generate/gabung PDF gagal — jangan biarkan dokumen macet, tapi JANGAN
    // ganti file aktif. Tetap set Relevan pakai file yang sudah ada.
    console.error('Gagal generate/gabung PDF final untuk', nomorDokumen, err);
    await syncRelevanStatus(client, nomorDokumen, tanggalSelesaiApproval, nextRevisi);
    await logActivity({
      username: 'system',
      activityType: 'update',
      activityDescription: `Approval selesai untuk ${namaDokumen}, tapi GAGAL memperbarui halaman 1/halaman terakhir dokumen (error teknis). Status tetap diubah ke Relevan menggunakan file lama — mohon cek/upload ulang manual jika perlu.`,
      targetType: 'procedure',
      targetId: nomorDokumen,
    });
  }
}