// app/api/approval-dokumen/stamp-date/route.ts
//
// Endpoint API untuk membubuhkan / mengedit teks tanggal selesai approval ke posisi bounding box
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
import { ensureDecryptedPdf } from '@/lib/pdfDecrypt';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'documents');

/**
 * Parsing teks tanggal yang dicap admin (mis. "3 Nov 2026", "28 Apr 2025", "2026-11-03")
 * ke format standar database YYYY-MM-DD
 */
function parseDateFromStampText(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // Cek jika sudah ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Cek format Indonesia atau Inggris, contoh: "3 Nov 2026", "28 Apr 2025", "03 November 2026"
  const match = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const monthStr = match[2].toLowerCase();
  const year = parseInt(match[3], 10);

  const monthMap: Record<string, string> = {
    jan: '01', januari: '01', january: '01',
    feb: '02', februari: '02', february: '02',
    mar: '03', maret: '03', march: '03',
    apr: '04', april: '04',
    mei: '05', may: '05',
    jun: '06', juni: '06', june: '06',
    jul: '07', juli: '07', july: '07',
    agu: '08', agt: '08', agustus: '08', aug: '08', august: '08',
    sep: '09', september: '09',
    okt: '10', oktober: '10', oct: '10', october: '10',
    nov: '11', november: '11',
    des: '12', desember: '12', dec: '12', december: '12',
  };

  const month = monthMap[monthStr];
  if (!month || isNaN(day) || isNaN(year) || day < 1 || day > 31) return null;

  return `${year}-${month}-${String(day).padStart(2, '0')}`;
}

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
      isEdit,       // boolean: true jika mengedit cap yang sudah pernah disimpan
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

    // 1. Cari base file PDF yang bersih (tanpa cap lama)
    // Jika dokumen sudah pernah dicap sebelumnya atau sedang diedit, kita utamakan file final bersih
    // (bukan file _stamped) agar cap lama tidak bertumpuk / berbayang di file PDF baru.
    let baseFile = null;

    // Prioritas 1: Ambil file dari final_file_id pada cycle completed terbaru
    const cycleFileRes = await client.query(
      `SELECT pf.id, pf.file_name, pf.file_path, pf.version
       FROM procedure_approval_cycles pac
       JOIN procedure_files pf ON pf.id = pac.final_file_id
       WHERE pac.nomor_dokumen = $1 AND pac.status = 'completed'
       ORDER BY pac.id DESC LIMIT 1`,
      [nomorDokumen]
    );
    if (cycleFileRes.rows.length > 0) {
      baseFile = cycleFileRes.rows[0];
    }

    // Prioritas 2: Ambil file terbaru yang bukan _stamped.pdf
    if (!baseFile) {
      const nonStampedRes = await client.query(
        `SELECT id, file_name, file_path, version
         FROM procedure_files
         WHERE nomor_dokumen = $1 AND file_path NOT LIKE '%_stamped.pdf%'
         ORDER BY version DESC, id DESC LIMIT 1`,
        [nomorDokumen]
      );
      if (nonStampedRes.rows.length > 0) {
        baseFile = nonStampedRes.rows[0];
      }
    }

    // Prioritas 3: Fallback ke active file jika tidak ditemukan
    if (!baseFile) {
      const activeRes = await client.query(
        `SELECT id, file_name, file_path, version
         FROM active_procedure_files
         WHERE nomor_dokumen = $1 LIMIT 1`,
        [nomorDokumen]
      );
      if (activeRes.rows.length > 0) {
        baseFile = activeRes.rows[0];
      }
    }

    if (!baseFile) {
      return NextResponse.json({ error: 'Dokumen tidak memiliki file PDF aktif.' }, { status: 404 });
    }

    const targetFile = baseFile;
    const relativePath = targetFile.file_path.startsWith('/')
      ? targetFile.file_path.slice(1)
      : targetFile.file_path;
    const absolutePath = path.join(process.cwd(), 'public', relativePath);

    if (!existsSync(absolutePath)) {
      return NextResponse.json({ error: 'File PDF fisik tidak ditemukan di server.' }, { status: 404 });
    }

    // 2. Baca PDF bytes dan load ke pdf-lib
    const originalBytes = await readFile(absolutePath);
    const cleanBytes = await ensureDecryptedPdf(originalBytes);
    const pdfDoc = await PDFDocument.load(cleanBytes);

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
    const sanitizedName = (targetFile.file_name as string)
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
      [nomorDokumen, targetFile.file_name, dbPath, stampedPdfBytes.length, nextVersion]
    );

    const parsedDate = parseDateFromStampText(text);

    const stampMeta = {
      pageNumber,
      box,
      canvasSize,
      text: textToDraw,
      isEdit: Boolean(isEdit),
      stampedAt: new Date().toISOString(),
    };

    if (parsedDate) {
      await client.query(
        `UPDATE procedure_documents
         SET is_date_stamped = TRUE,
             date_stamp_meta = $1,
             tanggal_selesai_approval = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE nomor_dokumen = $3`,
        [JSON.stringify(stampMeta), parsedDate, nomorDokumen]
      );

      // Sinkronkan ke procedure_revision_notes jika ada record revisi aktif dokumen ini
      await client.query(
        `UPDATE procedure_revision_notes
         SET tanggal_selesai_approval = $1
         WHERE nomor_dokumen = $2 AND rev_no = (SELECT revisi FROM procedure_documents WHERE nomor_dokumen = $2)`,
        [parsedDate, nomorDokumen]
      );
    } else {
      await client.query(
        `UPDATE procedure_documents
         SET is_date_stamped = TRUE,
             date_stamp_meta = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE nomor_dokumen = $2`,
        [JSON.stringify(stampMeta), nomorDokumen]
      );
    }

    await client.query('COMMIT');

    // Catat log aktivitas
    const activityDesc = isEdit
      ? `Mengedit letak tanggal approval "${textToDraw}" pada halaman ${pageNumber} untuk dokumen ${nomorDokumen} — versi ${nextVersion}`
      : `Membubuhkan tanggal approval "${textToDraw}" ke halaman ${pageNumber} untuk dokumen ${nomorDokumen} — versi ${nextVersion}`;

    await logActivity({
      username: 'admin',
      activityType: 'update',
      activityDescription: activityDesc,
      targetType: 'file',
      targetId: nomorDokumen,
    });

    return NextResponse.json({
      success: true,
      message: isEdit
        ? `Tanggal selesai approval "${textToDraw}" berhasil diperbarui ke halaman ${pageNumber}.`
        : `Tanggal selesai approval "${textToDraw}" berhasil dibubuhkan ke halaman ${pageNumber}.`,
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
