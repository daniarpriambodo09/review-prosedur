// app/api/files/upload/route.ts
//
// Perubahan dari versi sebelumnya:
// — Setiap kali admin mengupload ulang file (versi baru) untuk sebuah dokumen,
//   status dokumen tersebut di procedure_documents OTOMATIS diubah menjadi
//   'Relevan'. Ini berlaku terlepas dari status sebelumnya (mis. "Revisi",
//   "Obsolete", "Telah dibaca", dll) — karena upload ulang menandakan admin
//   sudah menindaklanjuti hasil review (misalnya memperbaiki dokumen sesuai
//   catatan revisi dari PIC).
// — Jadwal email yang masih aktif (pending/sent) untuk dokumen tersebut ikut
//   dibatalkan (cancelled), karena siklus review sebelumnya sudah tidak
//   relevan lagi setelah dokumen diperbarui.
// — 🆕 FIX: sync ke tabel document_reviews (bulan approval dokumen) juga
//   diubah menjadi 'Relevan'. Tanpa ini, halaman status-review bisa
//   menampilkan status lama lagi (mis. "Revisi") karena frontend meng-overlay
//   status dari document_reviews per bulan approval untuk status non-workflow
//   — record review lama di bulan yang sama akan menimpa balik status
//   'Relevan' yang baru saja di-set di procedure_documents.

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import pool from '@/lib/db';
import { PDFDocument } from 'pdf-lib';
import { logActivity } from '@/lib/activityLogger';
import {
  startApprovalCycle,
  getLatestRejectionForDocument,
  STAGE_STATUS_LABEL,
  type PendingAction,
} from '@/lib/approvalCycle';
import { getActiveSmtpSettings, sendMail } from '@/lib/mailer';
import { buildAccEmailHtml, buildAccEmailText } from '@/lib/approvalEmailTemplate';
import { ensureDecryptedPdf } from '@/lib/pdfDecrypt';
import { incrementRevision } from '@/lib/revisionHelper';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'documents');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const nomorDokumen = formData.get('nomorDokumen') as string;
    const uploadedBy = formData.get('uploadedBy') as string;

    if (!file || !nomorDokumen) {
      return NextResponse.json(
        { error: 'File dan nomor dokumen harus diisi' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Hanya file PDF yang diperbolehkan' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran file maksimal 10MB' },
        { status: 400 }
      );
    }

    const checkQuery = `
      SELECT nama_dokumen, status, tanggal_selesai_approval, revisi
      FROM procedure_documents
      WHERE nomor_dokumen = $1
    `;
    const checkResult = await client.query(checkQuery, [nomorDokumen]);
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Nomor dokumen tidak ditemukan' },
        { status: 404 }
      );
    }

    const previousStatus          = checkResult.rows[0].status;
    const tanggalSelesaiApproval  = checkResult.rows[0].tanggal_selesai_approval;
    const currentRevisi           = checkResult.rows[0].revisi;

    await client.query('BEGIN');

    // Get current version
    const versionQuery = `
      SELECT COALESCE(MAX(version), 0) + 1 as next_version
      FROM procedure_files
      WHERE nomor_dokumen = $1
    `;
    const versionResult = await client.query(versionQuery, [nomorDokumen]);
    const nextVersion = versionResult.rows[0].next_version;

    // Deactivate previous files
    await client.query(
      'UPDATE procedure_files SET is_active = false WHERE nomor_dokumen = $1',
      [nomorDokumen]
    );

    // ✅ SIMPAN NAMA FILE ASLI (dengan .pdf)
    const originalFileName = file.name.endsWith('.pdf') 
      ? file.name 
      : `${file.name}.pdf`;

    // Generate filename untuk file di disk (dengan versioning)
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const sanitizedName = originalFileName
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .replace(/\.pdf$/i, '');
    const diskFileName = `v${nextVersion}_${nomorDokumen}_${sanitizedName}_${timestamp}.pdf`;

    // Create directory if not exists
    const docDir = path.join(UPLOAD_DIR, nomorDokumen);
    if (!existsSync(docDir)) {
      await mkdir(docDir, { recursive: true });
    }

    // Save file dengan nama versioned di disk
    const filePath = path.join(docDir, diskFileName);
    const bytes = await file.arrayBuffer();
    let buffer = Buffer.from(bytes);

    // 🔒 PENTING: Jika file PDF yang diunggah memiliki enkripsi permissions (misal ReportLab/Adobe locked permissions),
    // buka enkripsinya agar bersih dan bisa dibuka tanpa halaman putih/kosong di browser & pdfjs
    try {
      const decryptedBytes = await ensureDecryptedPdf(buffer);
      buffer = Buffer.from(decryptedBytes);
    } catch (unencryptErr) {
      console.warn('Gagal membersihkan enkripsi PDF saat upload:', unencryptErr);
    }

    await writeFile(filePath, buffer);

    // ✅ Path di database pointing ke file versioned
    const dbPath = `/uploads/documents/${nomorDokumen}/${diskFileName}`;

    // Reset flag is_date_stamped menjadi FALSE agar dokumen baru ini memiliki tombol "Isi Tanggal" di alur approval
    await client.query(
      `UPDATE procedure_documents
       SET is_date_stamped = FALSE
       WHERE nomor_dokumen = $1`,
      [nomorDokumen]
    );

    let namaDokumen = nomorDokumen; // Fallback ke nomor jika tidak ditemukan
    if (checkResult.rows.length > 0) {
      namaDokumen = checkResult.rows[0].nama_dokumen;
    }
    
    // ✅ Insert dengan nama file asli di kolom file_name
    const insertQuery = `
      INSERT INTO procedure_files
      (nomor_dokumen, file_name, file_path, file_size, mime_type, version, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await client.query(insertQuery, [
      nomorDokumen,
      originalFileName, // ✅ NAMA ASLI untuk display
      dbPath,           // ✅ PATH ke file versioned di disk
      buffer.length,    // ✅ Ukuran buffer yang sudah dibersihkan
      file.type,
      nextVersion,
      uploadedBy || 'admin'
    ]);

    const uploadedFileId = result.rows[0].id;

    // ─── Alur approval berjenjang ──────────────────────────────────────────
    // Jika admin mengupload dokumen:
    // 1. Jika startApproval === 'true': Langsung mulai siklus approval (Prepared -> Checked -> Approved).
    // 2. Jika dokumen berstatus 'Revisi' atau 'Ditolak' dan startApproval !== 'true':
    //    TIDAK otomatis mulai approval. Status diubah menjadi 'Menunggu Setting Approver'
    //    sehingga dokumen tersimpan di tab "Perlu Approval" di /approval-dokumen.
    // 3. Status lainnya (mis. dokumen Relevan yang diupdate tanpa request approval):
    //    Perilaku normal, status tetap 'Relevan'.
    let approvalCycleStarted = false;
    let pendingEmailActions: PendingAction[] = [];

    const startApprovalParam = formData.get('startApproval');
    const isApprovalRequested = startApprovalParam === 'true';
    const isRevisiOrRejected =
      previousStatus === 'Revisi' ||
      previousStatus === 'Ditolak' ||
      (typeof previousStatus === 'string' && previousStatus.startsWith('Menunggu ACC'));

    const isWaitingApprover =
      previousStatus === 'Menunggu Setting Approver' ||
      previousStatus === 'Menunggu Approval';

    if (isApprovalRequested) {
      // Admin memilih "Masuk Approval Sekarang"
      const cycleResult = await startApprovalCycle(client, nomorDokumen, uploadedFileId);
      if (cycleResult.started) {
        approvalCycleStarted = true;
        pendingEmailActions = cycleResult.actions;
      }

      // Update request revisi aktif menjadi completed
      await client.query(
        `UPDATE pic_review_requests
         SET status = 'completed', updated_at = CURRENT_TIMESTAMP
         WHERE nomor_dokumen = $1 AND status = 'pending'`,
        [nomorDokumen]
      );
    } else if (isRevisiOrRejected) {
      // Admin memilih "Nanti Saja" pada dokumen revisi/ditolak:
      // Simpan file dan masukkan dokumen ke daftar "Perlu Approval" ('Menunggu Setting Approver')
      await client.query(
        `UPDATE procedure_documents
         SET status = 'Menunggu Setting Approver', updated_at = CURRENT_TIMESTAMP
         WHERE nomor_dokumen = $1`,
        [nomorDokumen]
      );

      // Sync ke document_reviews
      const docDate = new Date(tanggalSelesaiApproval);
      const approvalMonth = isNaN(docDate.getTime())
        ? new Date().getMonth()
        : docDate.getMonth();
      const revisiValue = currentRevisi || '0';

      await client.query(
        `INSERT INTO document_reviews
           (nomor_dokumen, status, revisi, last_reviewed_month, updated_at)
         VALUES ($1, 'Menunggu Setting Approver', $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (nomor_dokumen, last_reviewed_month)
         DO UPDATE SET
           status      = 'Menunggu Setting Approver',
           revisi      = $2,
           updated_at  = CURRENT_TIMESTAMP`,
        [nomorDokumen, revisiValue, approvalMonth]
      );

      // Batalkan siklus lama yang rejected/in_progress agar bersih
      await client.query(
        `UPDATE procedure_approval_cycles
         SET status = 'cancelled'
         WHERE nomor_dokumen = $1 AND status IN ('in_progress', 'rejected')`,
        [nomorDokumen]
      );

      // Selesaikan request revisi aktif dari PIC jika ada
      await client.query(
        `UPDATE pic_review_requests
         SET status = 'completed', updated_at = CURRENT_TIMESTAMP
         WHERE nomor_dokumen = $1 AND status = 'pending'`,
        [nomorDokumen]
      );
    } else if (!isWaitingApprover) {
      // ─── Perilaku LAMA: auto-update status → 'Relevan' ───────────────────
      const finalRevisi = previousStatus === 'Revisi'
        ? incrementRevision(currentRevisi)
        : (currentRevisi || '0');

      await client.query(
        `UPDATE procedure_documents
         SET status = 'Relevan', revisi = $1, updated_at = CURRENT_TIMESTAMP
         WHERE nomor_dokumen = $2`,
        [finalRevisi, nomorDokumen]
      );

      const docDate = new Date(tanggalSelesaiApproval);
      const approvalMonth = isNaN(docDate.getTime())
        ? new Date().getMonth()
        : docDate.getMonth();
      const revisiValue = finalRevisi;

      await client.query(
        `INSERT INTO document_reviews
           (nomor_dokumen, status, revisi, last_reviewed_month, updated_at)
         VALUES ($1, 'Relevan', $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (nomor_dokumen, last_reviewed_month)
         DO UPDATE SET
           status      = 'Relevan',
           revisi      = $2,
           updated_at  = CURRENT_TIMESTAMP`,
        [nomorDokumen, revisiValue, approvalMonth]
      );

      // Update request revisi aktif menjadi completed
      await client.query(
        `UPDATE pic_review_requests
         SET status = 'completed', updated_at = CURRENT_TIMESTAMP
         WHERE nomor_dokumen = $1 AND status = 'pending'`,
        [nomorDokumen]
      );
    }

    // Batalkan jadwal email review yang masih aktif (pending/sent) untuk
    // dokumen ini — siklus review sebelumnya sudah tidak relevan lagi
    // setelah dokumen diupdate.
    await client.query(
      `UPDATE email_schedules
       SET email_status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE nomor_dokumen = $1
         AND email_status IN ('pending', 'sent')`,
      [nomorDokumen]
    );

    await client.query('COMMIT');

    // Log activity — upload file
    await logActivity({
      username: uploadedBy || 'admin',
      activityType: 'upload',
      activityDescription: `Upload file ${originalFileName} untuk ${namaDokumen}`,
      targetType: 'file',
      targetId: nomorDokumen,
    });

    if (approvalCycleStarted) {
      await logActivity({
        username: uploadedBy || 'admin',
        activityType: 'update',
        activityDescription: `Alur approval dimulai (tahap Prepared) untuk ${namaDokumen} setelah upload revisi`,
        targetType: 'procedure',
        targetId: nomorDokumen,
      });
    } else if (isRevisiOrRejected || isWaitingApprover) {
      await logActivity({
        username: uploadedBy || 'admin',
        activityType: 'update',
        activityDescription: `Dokumen revisi ${namaDokumen} diupload ulang dan dimasukkan ke daftar Perlu Approval`,
        targetType: 'procedure',
        targetId: nomorDokumen,
      });
    } else if (previousStatus !== 'Relevan') {
      await logActivity({
        username: uploadedBy || 'admin',
        activityType: 'update',
        activityDescription: `Status ${namaDokumen} otomatis diubah menjadi Relevan setelah upload (sebelumnya: ${previousStatus})`,
        targetType: 'procedure',
        targetId: nomorDokumen,
      });
    }

    // ─── 🆕 Kirim email ACC ke tahap Prepared (di luar transaksi DB) ────────
    // Best-effort: kalau ada email yang gagal terkirim, proses TIDAK
    // dibatalkan (data cycle & action sudah tersimpan). Admin bisa
    // menambahkan endpoint "kirim ulang" nanti jika perlu.
    let emailWarning: string | null = null;
    if (approvalCycleStarted && pendingEmailActions.length > 0) {
      const smtpSettings = await getActiveSmtpSettings(client);
      if (!smtpSettings) {
        emailWarning = 'Alur approval sudah dimulai, tapi konfigurasi SMTP belum diatur — email ke Prepared belum terkirim. Atur di halaman SMTP Settings.';
      } else {
        const rejectionNote = await getLatestRejectionForDocument(client, nomorDokumen);
        let sentCount = 0;
        for (const action of pendingEmailActions) {
          try {
            const accLink = `${smtpSettings.appUrl}/review-prosedur/acc/${action.token}`;
            const emailParams = {
              nama: action.nama,
              role: 'prepared' as const,
              namaDokumen,
              nomorDokumen,
              accLink,
              rejectionNote,
            };
            const emailSubject = rejectionNote
              ? `[Review Prosedur] [Revisi] Permintaan Approval Dokumen Prosedur (Prepared) - ${nomorDokumen}`
              : `[Review Prosedur] Permintaan Approval Dokumen Prosedur (Prepared) - ${nomorDokumen}`;
            await sendMail(
              smtpSettings,
              action.email,
              emailSubject,
              buildAccEmailHtml(emailParams),
              buildAccEmailText(emailParams)
            );
            await client.query(
              `UPDATE procedure_approval_actions SET email_sent_at = NOW() WHERE id = $1`,
              [action.actionId]
            );
            sentCount++;
          } catch (emailErr) {
            console.error(`Gagal kirim email ACC ke ${action.email}:`, emailErr);
          }
        }
        if (sentCount < pendingEmailActions.length) {
          emailWarning = `Alur approval sudah dimulai, tapi hanya ${sentCount}/${pendingEmailActions.length} email Prepared yang berhasil terkirim. Periksa log server untuk detail.`;
        }
      }
    }

    return NextResponse.json({
      success: true,
      file: {
        id: result.rows[0].id,
        fileName: result.rows[0].file_name,      // ✅ Nama asli
        filePath: result.rows[0].file_path,      // ✅ Path versioned
        fileSize: result.rows[0].file_size,
        version: result.rows[0].version,
        uploadedAt: result.rows[0].uploaded_at,
      },
      // ✅ status terbaru dokumen setelah upload, untuk update UI tanpa reload penuh
      status: approvalCycleStarted
        ? STAGE_STATUS_LABEL.prepared
        : (isRevisiOrRejected || isWaitingApprover)
        ? 'Menunggu Setting Approver'
        : 'Relevan',
      approvalCycleStarted,
      emailWarning,
    }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Gagal mengupload file' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}