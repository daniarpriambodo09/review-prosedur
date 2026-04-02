// app/api/document-read/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logActivity } from '@/lib/activityLogger';

// POST - Tandai dokumen telah dibaca oleh PIC
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { nomorDokumen, pic } = body;

    if (!nomorDokumen || !pic) {
      return NextResponse.json(
        { error: 'nomorDokumen dan pic harus diisi' },
        { status: 400 }
      );
    }

    const docQuery = `
      SELECT nama_dokumen, status, revisi, tanggal_selesai_approval
      FROM procedure_documents
      WHERE nomor_dokumen = $1
    `;
    const docResult = await client.query(docQuery, [nomorDokumen]);

    if (docResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Dokumen tidak ditemukan' },
        { status: 404 }
      );
    }

    const {
      nama_dokumen,
      status: currentStatus,
      revisi: currentRevisi,
      tanggal_selesai_approval,
    } = docResult.rows[0];

    // Hanya update jika status masih eligible (belum final review)
    const eligibleStatuses = ['Belum dikirim', 'Telah terkirim', 'Menunggu', '-', 'Telah dibaca'];
    if (!eligibleStatuses.includes(currentStatus)) {
      return NextResponse.json({
        success: true,
        updated: false,
        currentStatus,
        message: 'Status tidak perlu diubah',
      });
    }

    await client.query('BEGIN');
    try {
      // 1️⃣ Update procedure_documents ke "Telah dibaca"
      await client.query(
        `UPDATE procedure_documents
         SET status = 'Telah dibaca', updated_at = CURRENT_TIMESTAMP
         WHERE nomor_dokumen = $1`,
        [nomorDokumen]
      );

      // 2️⃣ Sync ke document_reviews menggunakan BULAN APPROVAL DOKUMEN
      const docDate = new Date(tanggal_selesai_approval);
      const approvalMonth = isNaN(docDate.getTime())
        ? new Date().getMonth()
        : docDate.getMonth();

      const revisiValue = currentRevisi || '0';

      await client.query(
        `INSERT INTO document_reviews
           (nomor_dokumen, status, revisi, last_reviewed_month, updated_at)
         VALUES ($1, 'Telah dibaca', $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (nomor_dokumen, last_reviewed_month)
         DO UPDATE SET
           status      = 'Telah dibaca',
           revisi      = $2,
           updated_at  = CURRENT_TIMESTAMP`,
        [nomorDokumen, revisiValue, approvalMonth]
      );

      // 3️⃣ Cancel email schedule jika sebelumnya "sent"
      // Karena PIC sudah membaca, status "Telah terkirim" tidak lagi relevan
      await client.query(
        `UPDATE email_schedules
         SET email_status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE nomor_dokumen = $1
           AND email_status = 'sent'`,
        [nomorDokumen]
      );

      await client.query('COMMIT');

      // 3️⃣ Catat ke activity log
      await logActivity({
        username: pic,
        activityType: 'review',
        activityDescription: `PIC ${pic} membaca dokumen ${nama_dokumen}`,
        targetType: 'procedure',
        targetId: nomorDokumen,
      });

      return NextResponse.json({
        success: true,
        updated: true,
        currentStatus: 'Telah dibaca',
        message: 'Status berhasil diupdate menjadi Telah dibaca',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error marking document as read:', error);
    return NextResponse.json(
      { error: 'Gagal mengupdate status dokumen' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}