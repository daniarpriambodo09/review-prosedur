// lib/pdfFirstPage.ts
//
// Generate halaman 1 dokumen (menggantikan halaman 1 asli) dari NOL memakai
// pdf-lib, mengikuti layout template yang diberikan
// (Halaman_Pertama_-_Review_Prosedur__Template_.pdf) — ukuran halaman dan
// posisi elemen diukur langsung dari file template tsb:
//
//   Ukuran halaman : 595.5 x 842.25 pt (A4)
//   [Nomor Dokumen]: center, bottom=262.6 (dari atas halaman)
//   [Nama Dokumen] : center, bottom=294.3
//   Tabel approval : header (APPROVED|CHECKED|PREPARED) top=669.7, tinggi 28.3
//                    konten (barcode+nama) mulai top=698.0
//   Kolom (x)      : 85.0 | 226.8 | 367.4 | 508.0  →  3 kolom sama lebar
//   Footer         : "Versi Indonesia", awalnya di top=777.8
//
// Kenapa digambar dari nol, bukan overlay ke file template langsung?
// Karena jumlah orang per role (Prepared/Checked/Approved) tidak tetap —
// tabel & posisi footer harus bisa "tumbuh" ke bawah kalau satu role
// punya beberapa orang. Elemen statis (header perusahaan, border, dsb)
// tetap direplikasi persis dari koordinat template supaya hasilnya identik
// saat hanya ada 1 orang per role (kasus paling umum).

import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb, type RGB } from 'pdf-lib';
import QRCode from 'qrcode';

export interface ApprovalPerson {
  nama: string | null;
  email: string;
  verificationCode: string;
}

export interface GenerateFirstPageParams {
  nomorDokumen: string;
  namaDokumen: string;
  /** 🆕 Dipakai menentukan teks pojok kanan atas: level "1" → Quality Manual,
   *  "2" → Procedure, "3" (atau selain itu) → Work Instruction. */
  levelDokumen: string;
  approved: ApprovalPerson[];
  checked: ApprovalPerson[];
  prepared: ApprovalPerson[];
  /** Base URL aplikasi (tanpa trailing slash), dipakai untuk isi link QR verifikasi. */
  appUrl: string;
}

/** 🆕 Petakan level dokumen ke label yang tampil di pojok kanan atas halaman.
 *  Dicari digit 1/2/3 di mana pun dalam string levelDokumen (mis. "3",
 *  "Level 3", "LV-3" semua cocok ke "3") — supaya tetap toleran terhadap
 *  variasi cara penulisan level di field yang sifatnya free-text.
 *  Default aman kalau tidak cocok satupun: "Work Instruction" (perilaku lama). */
function getDocumentTypeLabel(levelDokumen: string): string {
  const match = (levelDokumen || '').match(/[123]/);
  const digit = match ? match[0] : '3';
  if (digit === '1') return 'Quality Manual';
  if (digit === '2') return 'Procedure';
  return 'Work Instruction';
}

const PAGE_WIDTH  = 595.5;
const PAGE_HEIGHT = 842.25;

const OUTER_LEFT  = 56.7;
const OUTER_RIGHT = 538.8;
const OUTER_TOP   = 20.5;

const COL_BOUNDS = [85.0, 226.8, 367.4, 508.0]; // 3 kolom: Approved | Checked | Prepared

const HEADER_ROW_TOP    = 669.7;
const HEADER_ROW_HEIGHT = 28.3;
const CONTENT_ROW_TOP   = HEADER_ROW_TOP + HEADER_ROW_HEIGHT; // ~698.0

const ENTRY_HEIGHT_DEFAULT = 56.7; // tinggi 1 entri (qr+nama) versi template asli (1 orang/role)
const ENTRY_HEIGHT_MIN     = 40;   // batas bawah tinggi per-entri sebelum dianggap terlalu padat
const TABLE_MAX_BOTTOM     = 800;  // batas bawah tabel sebelum masuk area footer/margin halaman

const BLACK: RGB = rgb(0, 0, 0);
const GRAY:  RGB = rgb(0.4, 0.4, 0.4);

/** Konversi koordinat "top" (jarak dari atas halaman, seperti hasil ukur pdfplumber)
 *  ke sumbu-y pdf-lib (dari bawah halaman). */
function fromTop(top: number): number {
  return PAGE_HEIGHT - top;
}

function drawCentered(
  page: PDFPage,
  text: string,
  centerX: number,
  baselineTop: number,
  size: number,
  font: PDFFont,
  color: RGB,
  maxWidth?: number
) {
  let displayText = text || '-';
  let textWidth = font.widthOfTextAtSize(displayText, size);

  if (maxWidth && textWidth > maxWidth) {
    while (displayText.length > 1 && font.widthOfTextAtSize(displayText + '…', size) > maxWidth) {
      displayText = displayText.slice(0, -1);
    }
    displayText = displayText + '…';
    textWidth = font.widthOfTextAtSize(displayText, size);
  }

  page.drawText(displayText, {
    x: centerX - textWidth / 2,
    y: fromTop(baselineTop),
    size,
    font,
    color,
  });
}

export async function generateFirstPage(params: GenerateFirstPageParams): Promise<Uint8Array> {
  const { nomorDokumen, namaDokumen, levelDokumen, approved, checked, prepared, appUrl } = params;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const centerX = (OUTER_LEFT + OUTER_RIGHT) / 2;

  // ── Header perusahaan ──────────────────────────────────────────────────────
  page.drawText('PT. JATIM AUTOCOMP INDONESIA', {
    x: 81.8, y: fromTop(42.2), size: 10, font: fontBold, color: BLACK,
  });

  // 🆕 Label kanan atas menyesuaikan level dokumen — rata-kanan (bukan posisi
  // x tetap seperti sebelumnya) supaya label yang lebih panjang ("Quality
  // Manual") tetap rapi dan tidak keluar dari border halaman.
  const docTypeLabel = getDocumentTypeLabel(levelDokumen);
  const docTypeSize  = 16;
  const docTypeWidth = fontBold.widthOfTextAtSize(docTypeLabel, docTypeSize);
  page.drawText(docTypeLabel, {
    x: OUTER_RIGHT - 21 - docTypeWidth, y: fromTop(45.9), size: docTypeSize, font: fontBold, color: BLACK,
  });
  page.drawLine({
    start: { x: OUTER_LEFT, y: fromTop(52) },
    end:   { x: OUTER_RIGHT, y: fromTop(52) },
    thickness: 0.75, color: BLACK,
  });

  // ── Nomor & Nama Dokumen ───────────────────────────────────────────────────
  drawCentered(page, nomorDokumen, centerX, 262.6, 13, fontBold, BLACK, OUTER_RIGHT - OUTER_LEFT - 40);
  drawCentered(page, namaDokumen,  centerX, 294.3, 13, fontBold, BLACK, OUTER_RIGHT - OUTER_LEFT - 40);

  // ── Hitung tinggi baris konten tabel secara dinamis ───────────────────────
  const roleColumns: { label: string; people: ApprovalPerson[] }[] = [
    { label: 'APPROVED', people: approved },
    { label: 'CHECKED',  people: checked  },
    { label: 'PREPARED', people: prepared },
  ];

  const maxCount = Math.max(1, approved.length, checked.length, prepared.length);
  const availableHeight = TABLE_MAX_BOTTOM - CONTENT_ROW_TOP;
  const entryHeight = Math.max(
    ENTRY_HEIGHT_MIN,
    Math.min(ENTRY_HEIGHT_DEFAULT, availableHeight / maxCount)
  );
  const contentRowHeight = entryHeight * maxCount;
  const contentRowBottom = CONTENT_ROW_TOP + contentRowHeight;

  // ── Garis-garis tabel ──────────────────────────────────────────────────────
  for (const x of COL_BOUNDS) {
    page.drawLine({
      start: { x, y: fromTop(HEADER_ROW_TOP) },
      end:   { x, y: fromTop(contentRowBottom) },
      thickness: 0.75, color: BLACK,
    });
  }
  const tableLinesTops = [HEADER_ROW_TOP, CONTENT_ROW_TOP, contentRowBottom];
  for (const top of tableLinesTops) {
    page.drawLine({
      start: { x: COL_BOUNDS[0], y: fromTop(top) },
      end:   { x: COL_BOUNDS[3], y: fromTop(top) },
      thickness: 0.75, color: BLACK,
    });
  }

  // ── Label header kolom (APPROVED / CHECKED / PREPARED) ────────────────────
  for (let i = 0; i < roleColumns.length; i++) {
    const colCenterX = (COL_BOUNDS[i] + COL_BOUNDS[i + 1]) / 2;
    drawCentered(
      page, roleColumns[i].label, colCenterX,
      HEADER_ROW_TOP + HEADER_ROW_HEIGHT / 2 + 5,
      11, fontBold, BLACK
    );
  }

  // ── Isi tiap kolom: QR code + nama per orang (atau "-" jika kosong) ───────
  for (let i = 0; i < roleColumns.length; i++) {
    const { people } = roleColumns[i];
    const colLeft  = COL_BOUNDS[i];
    const colRight = COL_BOUNDS[i + 1];
    const colCenterX = (colLeft + colRight) / 2;
    const colWidth = colRight - colLeft;

    if (people.length === 0) {
      drawCentered(page, '-', colCenterX, CONTENT_ROW_TOP + contentRowHeight / 2 + 4, 10, fontRegular, GRAY);
      continue;
    }

    for (let p = 0; p < people.length; p++) {
      const person = people[p];
      const entryTop = CONTENT_ROW_TOP + p * entryHeight;

      const qrSize = Math.min(entryHeight * 0.5, 40);
      const qrX = colCenterX - qrSize / 2;
      const qrTopEdge = entryTop + (entryHeight - qrSize) / 2 - 6; // sedikit ke atas, sisakan ruang nama

      const verifyUrl = `${appUrl}/review-prosedur/verify/${person.verificationCode}`;
      const qrPngBuffer = await QRCode.toBuffer(verifyUrl, { margin: 0, width: 200, errorCorrectionLevel: 'M' });
      const qrImage = await pdfDoc.embedPng(qrPngBuffer);

      page.drawImage(qrImage, {
        x: qrX,
        y: fromTop(qrTopEdge + qrSize),
        width: qrSize,
        height: qrSize,
      });

      const nameBaselineTop = qrTopEdge + qrSize + 11;
      const displayName = person.nama?.trim() || person.email;
      drawCentered(page, displayName, colCenterX, nameBaselineTop, 8, fontRegular, BLACK, colWidth - 8);
    }
  }

  // ── Footer "Versi Indonesia" ───────────────────────────────────────────────
  const footerTop = contentRowBottom + 24;
  drawCentered(page, 'Versi Indonesia', centerX, footerTop, 11, fontBold, BLACK);

  // ── Border luar halaman (menyesuaikan tinggi tabel dinamis) ────────────────
  const outerBottom = Math.max(820.2, footerTop + 20);
  page.drawRectangle({
    x: OUTER_LEFT,
    y: fromTop(outerBottom),
    width: OUTER_RIGHT - OUTER_LEFT,
    height: outerBottom - OUTER_TOP,
    borderColor: BLACK,
    borderWidth: 1,
  });

  return pdfDoc.save();
}