// lib/pdfFirstPage.ts
//
// Generate halaman 1 dokumen (menggantikan halaman 1 asli) dari NOL memakai
// pdf-lib, mengikuti layout template yang diberikan:
//   - Font family: Century Gothic (Bold & Regular) dari fonts/GOTHICB.TTF & GOTHIC.TTF
//     via lib/pdfFonts.ts (dengan fallback aman ke Helvetica/HelveticaBold jika file tidak ada)
//   - Header perusahaan (kiri atas) : PT. JATIM AUTOCOMP INDONESIA (Century Gothic Bold, 10pt)
//   - Tipe dokumen (kanan atas)     : Procedure / Quality Manual / Work Instruction (Century Gothic Bold, 18pt)
//   - (Tanpa garis pembatas horizontal di bawah header, sesuai template)
//   - Nomor Dokumen (tengah)        : Century Gothic Bold, 15pt, center
//   - Nama Dokumen (tengah)         : Century Gothic Bold, 18pt, center (wrap multiline jika panjang)
//   - Tabel approval (bawah)        : Kolom APPROVED | CHECKED | PREPARED (Century Gothic Bold, 12pt)
//                                     QR code + Nama Pejabat (Century Gothic Bold, 9.5pt)
//   - Footer                        : Versi Indonesia (Century Gothic Bold, 13pt, center)
//   - Border luar halaman           : Frame kotak mengelilingi konten halaman

import { PDFDocument, PDFPage, PDFFont, rgb, type RGB } from 'pdf-lib';
import QRCode from 'qrcode';
import { loadCustomFonts } from './pdfFonts';

export interface ApprovalPerson {
  nama: string | null;
  email: string;
  verificationCode: string;
}

export interface GenerateFirstPageParams {
  nomorDokumen: string;
  namaDokumen: string;
  /** Dipakai menentukan teks pojok kanan atas: level "1" → Quality Manual,
   *  "2" → Procedure, "3" (atau selain itu) → Work Instruction. */
  levelDokumen: string;
  approved: ApprovalPerson[];
  checked: ApprovalPerson[];
  prepared: ApprovalPerson[];
  /** Base URL aplikasi (tanpa trailing slash), dipakai untuk isi link QR verifikasi. */
  appUrl: string;
}

/** Petakan level dokumen ke label yang tampil di pojok kanan atas halaman.
 *  Dicari digit 1/2/3 di mana pun dalam string levelDokumen (mis. "3",
 *  "Level 3", "LV-3" semua cocok ke "3").
 *  Default: "Work Instruction". */
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
const OUTER_TOP   = 24.0;

const COL_BOUNDS = [85.0, 226.0, 367.0, 508.0]; // 3 kolom sama lebar (~141pt per kolom)

const HEADER_ROW_TOP    = 669.7;
const HEADER_ROW_HEIGHT = 28.3;
const CONTENT_ROW_TOP   = HEADER_ROW_TOP + HEADER_ROW_HEIGHT; // ~698.0

const ENTRY_HEIGHT_DEFAULT = 56.7; // tinggi 1 entri (qr+nama) versi template asli (1 orang/role)
const ENTRY_HEIGHT_MIN     = 40;   // batas bawah tinggi per-entri sebelum dianggap terlalu padat
const TABLE_MAX_BOTTOM     = 800;  // batas bawah tabel sebelum masuk area footer/margin halaman

const BLACK: RGB = rgb(0, 0, 0);
const GRAY:  RGB = rgb(0.45, 0.45, 0.45);

/** Konversi koordinat "top" (jarak dari atas halaman) ke sumbu-y pdf-lib (dari bawah halaman). */
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

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawCenteredMultiline(
  page: PDFPage,
  text: string,
  centerX: number,
  centerTop: number,
  size: number,
  font: PDFFont,
  color: RGB,
  maxWidth: number,
  lineStep = size * 1.28
) {
  const lines = wrapText(text, font, size, maxWidth);
  const totalHeight = (lines.length - 1) * lineStep;
  const startTop = centerTop - totalHeight / 2;

  lines.forEach((line, idx) => {
    const w = font.widthOfTextAtSize(line, size);
    page.drawText(line, {
      x: centerX - w / 2,
      y: fromTop(startTop + idx * lineStep),
      size,
      font,
      color,
    });
  });
}

export async function generateFirstPage(params: GenerateFirstPageParams): Promise<Uint8Array> {
  const { nomorDokumen, namaDokumen, levelDokumen, approved, checked, prepared, appUrl } = params;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // Load custom fonts: Century Gothic (Bold & Regular) dengan fallback ke Helvetica
  const { centuryGothic, centuryGothicBold } = await loadCustomFonts(pdfDoc);

  const centerX = (OUTER_LEFT + OUTER_RIGHT) / 2;

  // ── 1. Header Perusahaan (Top-Left) ────────────────────────────────────────
  // Century Gothic Bold ukuran 10pt
  page.drawText('PT. JATIM AUTOCOMP INDONESIA', {
    x: OUTER_LEFT + 15,
    y: fromTop(43.5),
    size: 10,
    font: centuryGothicBold,
    color: BLACK,
  });

  // ── 2. Header Tipe Dokumen (Top-Right) ──────────────────────────────────────
  // Century Gothic Bold ukuran 18pt, rata-kanan di dalam margin
  const docTypeLabel = getDocumentTypeLabel(levelDokumen);
  const docTypeSize  = 18;
  const docTypeWidth = centuryGothicBold.widthOfTextAtSize(docTypeLabel, docTypeSize);
  page.drawText(docTypeLabel, {
    x: OUTER_RIGHT - 18 - docTypeWidth,
    y: fromTop(45.5),
    size: docTypeSize,
    font: centuryGothicBold,
    color: BLACK,
  });

  // Catatan: Pada template asli, TIDAK ADA garis horizontal pembatas di bawah header.

  // ── 3. Nomor & Nama Dokumen (Tengah Halaman) ────────────────────────────────
  // Nomor dokumen: Century Gothic Bold 15pt
  // Nama dokumen: Century Gothic Bold 18pt (dengan multiline jika judul panjang)
  const maxTitleWidth = OUTER_RIGHT - OUTER_LEFT - 40;
  drawCentered(page, nomorDokumen, centerX, 238, 15, centuryGothicBold, BLACK, maxTitleWidth);
  drawCenteredMultiline(page, namaDokumen, centerX, 272, 18, centuryGothicBold, BLACK, maxTitleWidth);

  // ── 4. Tabel Approval (Bawah Halaman) ───────────────────────────────────────
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

  // Garis-garis vertikal tabel (3 kolom)
  for (const x of COL_BOUNDS) {
    page.drawLine({
      start: { x, y: fromTop(HEADER_ROW_TOP) },
      end:   { x, y: fromTop(contentRowBottom) },
      thickness: 0.75,
      color: BLACK,
    });
  }

  // Garis-garis horizontal tabel
  const tableLinesTops = [HEADER_ROW_TOP, CONTENT_ROW_TOP, contentRowBottom];
  for (const top of tableLinesTops) {
    page.drawLine({
      start: { x: COL_BOUNDS[0], y: fromTop(top) },
      end:   { x: COL_BOUNDS[3], y: fromTop(top) },
      thickness: 0.75,
      color: BLACK,
    });
  }

  // Label header kolom tabel (APPROVED | CHECKED | PREPARED)
  // Century Gothic Bold ukuran 12pt
  for (let i = 0; i < roleColumns.length; i++) {
    const colCenterX = (COL_BOUNDS[i] + COL_BOUNDS[i + 1]) / 2;
    drawCentered(
      page,
      roleColumns[i].label,
      colCenterX,
      HEADER_ROW_TOP + HEADER_ROW_HEIGHT / 2 + 4.5,
      12,
      centuryGothicBold,
      BLACK
    );
  }

  // Isi tiap kolom: QR code verifikasi + nama & jabatan per orang
  // Nama & jabatan menggunakan Century Gothic Bold ukuran 9.5pt
  for (let i = 0; i < roleColumns.length; i++) {
    const { people } = roleColumns[i];
    const colLeft  = COL_BOUNDS[i];
    const colRight = COL_BOUNDS[i + 1];
    const colCenterX = (colLeft + colRight) / 2;
    const colWidth = colRight - colLeft;

    if (people.length === 0) {
      drawCentered(page, '-', colCenterX, CONTENT_ROW_TOP + contentRowHeight / 2 + 4, 11, centuryGothic, GRAY);
      continue;
    }

    for (let p = 0; p < people.length; p++) {
      const person = people[p];
      const entryTop = CONTENT_ROW_TOP + p * entryHeight;

      const qrSize = Math.min(entryHeight * 0.52, 40);
      const qrX = colCenterX - qrSize / 2;
      const qrTopEdge = entryTop + (entryHeight - qrSize) / 2 - 7;

      const verifyUrl = `${appUrl}/review-prosedur/verify/${person.verificationCode}`;
      const qrPngBuffer = await QRCode.toBuffer(verifyUrl, { margin: 0, width: 200, errorCorrectionLevel: 'M' });
      const qrImage = await pdfDoc.embedPng(qrPngBuffer);

      page.drawImage(qrImage, {
        x: qrX,
        y: fromTop(qrTopEdge + qrSize),
        width: qrSize,
        height: qrSize,
      });

      const nameBaselineTop = qrTopEdge + qrSize + 12;
      const displayName = person.nama?.trim() || person.email;
      drawCentered(page, displayName, colCenterX, nameBaselineTop, 9.5, centuryGothicBold, BLACK, colWidth - 8);
    }
  }

  // ── 5. Footer "Versi Indonesia" ───────────────────────────────────────────
  // Century Gothic Bold ukuran 13pt
  const footerTop = contentRowBottom + 26;
  drawCentered(page, 'Versi Indonesia', centerX, footerTop, 13, centuryGothicBold, BLACK);

  // ── 6. Border Luar Halaman ────────────────────────────────────────────────
  const outerBottom = Math.max(818, footerTop + 22);
  page.drawRectangle({
    x: OUTER_LEFT,
    y: fromTop(outerBottom),
    width: OUTER_RIGHT - OUTER_LEFT,
    height: outerBottom - OUTER_TOP,
    borderColor: BLACK,
    borderWidth: 0.75,
  });

  return pdfDoc.save();
}