// app/api/approval-dokumen/stamp-date/route.ts
//
// Endpoint API untuk membubuhkan teks tanggal selesai approval ke posisi bounding box
// yang di-drag oleh admin pada halaman dokumen PDF (misalnya kolom Tanggal Selesai Approval
// pada tabel Catatan Perubahan).
//

import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import pool from '@/lib/db';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { logActivity } from '@/lib/activityLogger';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'documents');

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const {
      nomorDokumen,
      pageNumber,   // 1-indexed (halaman ke berapa)
      box,          // { x, y, width, height } koordinat bounding box pada canvas browser
      canvasSize,   // { width, height } dimensi canvas saat di-drag
      text,         // teks tanggal yang akan dicetak, mis. "28 Apr 2025"
      fontSize,     // opsional: ukuran font yang diinginkan
    } = body;

    if (!nomorDokumen || typeof nomorDokumen !== 'string') {
      return NextResponse.json({ error: 'Nomor dokumen wajib diisi.' }, { status: 400 });
    }

    if (!pageNumber || pageNumber < 1) {
      return NextResponse.json({ error: 'Nomor halaman tidak valid.' }, { status: 400 });
    }

    if (!box || typeof box.x !== 'number' || typeof box.y !== 'number' || !box.width || !box.height) {
      return NextResponse.json({ error: 'Koordinat bounding box tidak lengkap.' }, { status: 400 });
    }

    if (!canvasSize || !canvasSize.width || !canvasSize.height) {
      return NextResponse.json({ error: 'Dimensi canvas tidak valid.' }, { status: 400 });
    }

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Teks tanggal selesai approval tidak boleh kosong.' }, { status: 400 });
    }

    // 1. Ambil file aktif saat ini
    const fileResult = await client.query(
      `SELECT id, file_name, file_path, version
       FROM active_procedure_files
       WHERE nomor_dokumen = $1 LIMIT 1`,
      [nomorDokumen]
    );

    if (fileResult.rows.length === 0) {
      return NextResponse.json({ error: 'Dokumen tidak memiliki file PDF aktif.' }, { status: 404 });
    }

    const activeFile = fileResult.rows[0];
    const relativePath = activeFile.file_path.startsWith('/')
      ? activeFile.file_path.slice(1)
      : activeFile.file_path;
    const absolutePath = path.join(process.cwd(), 'public', relativePath);

    if (!existsSync(absolutePath)) {
      return NextResponse.json({ error: 'File PDF fisik tidak ditemukan di server.' }, { status: 404 });
    }

    // 2. Baca PDF bytes dan load ke pdf-lib
    const originalBytes = await readFile(absolutePath);
    const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });

    const totalPages = pdfDoc.getPageCount();
    if (pageNumber > totalPages) {
      return NextResponse.json(
        { error: `Halaman ${pageNumber} melebihi jumlah halaman dokumen (${totalPages} halaman).` },
        { status: 400 }
      );
    }

    const page = pdfDoc.getPage(pageNumber - 1);
    const pdfPageWidth = page.getWidth();
    const pdfPageHeight = page.getHeight();

    // 3. Konversi koordinat dari browser canvas ke PDF points
    const scaleX = pdfPageWidth / canvasSize.width;
    const scaleY = pdfPageHeight / canvasSize.height;

    const targetX = box.x * scaleX;
    const targetW = box.width * scaleX;
    const targetH = box.height * scaleY;

    // PDF coordinate system memiliki origin (0,0) di POJOK KIRI BAWAH halaman.
    // Browser canvas memiliki origin (0,0) di POJOK KIRI ATAS.
    const targetY = pdfPageHeight - ((box.y + box.height) * scaleY);

    // 4. Gunakan font Arial Narrow dengan ukuran tetap 11 (Fixed)
    pdfDoc.registerFontkit(fontkit);

    let font;
    const localFontPath = path.join(process.cwd(), 'public', 'fonts', 'ArialNarrow.ttf');
    const winFontPath = 'C:\\Windows\\Fonts\\ARIALN.TTF';

    if (existsSync(localFontPath)) {
      const fontBytes = await readFile(localFontPath);
      font = await pdfDoc.embedFont(fontBytes);
    } else if (existsSync(winFontPath)) {
      const fontBytes = await readFile(winFontPath);
      font = await pdfDoc.embedFont(fontBytes);
    } else {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    const FIXED_FONT_SIZE = 11;
    const textToDraw = text.trim();
    const textWidth = font.widthOfTextAtSize(textToDraw, FIXED_FONT_SIZE);
    const textHeight = font.heightAtSize(FIXED_FONT_SIZE);

    // Posisikan teks center horizontal & vertical di dalam kotak seleksi
    const drawX = targetX + Math.max(0, (targetW - textWidth) / 2);
    const drawY = targetY + Math.max(0, (targetH - textHeight) / 2) + (FIXED_FONT_SIZE * 0.15);

    // 5. Gambar teks tanggal warna hitam pekat persis di gambar
    page.drawText(textToDraw, {
      x: drawX,
      y: drawY,
      size: FIXED_FONT_SIZE,
      font: font,
      color: rgb(0, 0, 0),
    });

    const stampedPdfBytes = await pdfDoc.save();

    // 6. Simpan sebagai versi baru di database dan disk
    await client.query('BEGIN');

    const versionQuery = `
      SELECT COALESCE(MAX(version), 0) + 1 AS next_version
      FROM procedure_files WHERE nomor_dokumen = $1
    `;
    const versionRes = await client.query(versionQuery, [nomorDokumen]);
    const nextVersion = versionRes.rows[0].next_version;

    await client.query(
      `UPDATE procedure_files SET is_active = false WHERE nomor_dokumen = $1`,
      [nomorDokumen]
    );

    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const sanitizedName = (activeFile.file_name as string)
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .replace(/\.pdf$/i, '');
    const diskFileName = `v${nextVersion}_${nomorDokumen}_${sanitizedName}_${timestamp}_stamped.pdf`;

    const docDir = path.join(UPLOAD_DIR, nomorDokumen);
    if (!existsSync(docDir)) {
      await mkdir(docDir, { recursive: true });
    }

    const newFilePath = path.join(docDir, diskFileName);
    await writeFile(newFilePath, stampedPdfBytes);

    const dbPath = `/uploads/documents/${nomorDokumen}/${diskFileName}`;

    const insertResult = await client.query(
      `INSERT INTO procedure_files
         (nomor_dokumen, file_name, file_path, file_size, mime_type, version, uploaded_by)
       VALUES ($1, $2, $3, $4, 'application/pdf', $5, 'admin')
       RETURNING id, file_name, file_path, version, uploaded_at`,
      [nomorDokumen, activeFile.file_name, dbPath, stampedPdfBytes.length, nextVersion]
    );

    // Tandai bahwa dokumen ini sudah ditempatkan tanggal approval pada catatan perubahan
    await client.query(
      `UPDATE procedure_documents SET is_date_stamped = TRUE WHERE nomor_dokumen = $1`,
      [nomorDokumen]
    );

    await client.query('COMMIT');

    // Catat log aktivitas
    await logActivity({
      username: 'admin',
      activityType: 'update',
      activityDescription: `Membubuhkan tanggal approval "${textToDraw}" ke halaman ${pageNumber} untuk dokumen ${nomorDokumen} — versi ${nextVersion}`,
      targetType: 'file',
      targetId: nomorDokumen,
    });

    return NextResponse.json({
      success: true,
      message: `Tanggal selesai approval "${textToDraw}" berhasil dibubuhkan ke halaman ${pageNumber}.`,
      file: insertResult.rows[0],
    });
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error stamping approval date to PDF:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal membubuhkan tanggal approval ke PDF.' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
