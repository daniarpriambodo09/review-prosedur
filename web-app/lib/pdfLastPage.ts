// lib/pdfLastPage.ts
//
// Generate halaman TERAKHIR dokumen (Catatan Perubahan / record revisi) dari
// nol memakai pdf-lib, mengikuti layout Template_Halaman_Terakhir.pdf —
// koordinat diukur PERSIS dari file template tsb memakai pdfplumber. Ada DUA
// kotak terpisah (masing-masing punya border sendiri) — TIDAK dibungkus
// dalam satu kotak luar:
//
//   Kotak 1 — Header info (top 51.7–145.3):
//     Row1 (51.7–74.4)  : 3 kolom — [PT. JATIM AUTOCOMP INDONESIA + Quality
//                          Management System] | "Dokumen" | [Nomor Dokumen]
//     Row2 (74.4–97.1)  : Block Activity (1 kolom penuh)
//     Row3 (97.1–125.4) : Judul Dokumen, bold center (1 kolom penuh)
//     Row4 (125.4–145.3): Disclaimer italic center (1 kolom penuh)
//
//   (jarak kosong tanpa border 145.3–182.2, cuma judul "Catatan Perubahan")
//
//   Kotak 2 — Tabel Catatan Perubahan (mulai top 215.5):
//     Header row (215.5–243.8) : Rev. | Catatan Perubahan | Tanggal Selesai
//                                 Approval | Oleh
//     4 baris konten TETAP JUMLAHNYA (selalu 4 baris), tapi TINGGI setiap
//     baris kini DINAMIS — menyesuaikan jumlah poin (bullet) di Catatan
//     Perubahan baris tsb, supaya SEMUA poin tampil penuh tanpa dipotong
//     ("+N lainnya" dihapus). Baris dengan 1 poin tetap tampil tinggi normal
//     (~28.3pt, sama seperti template asli); baris dengan lebih banyak poin
//     otomatis menjadi lebih tinggi.
//
// Baris ke-1 = entri PERTAMA (index 0) yang pernah dibuat untuk dokumen ini,
// baris ke-2..4 = 3 entri TERAKHIR (kronologis menaik). Kalau data belum
// cukup 4 entri, slot yang belum terisi ditampilkan kosong ("-").
//
// ── Spesifikasi font (lihat lib/pdfFonts.ts untuk cara embed-nya) ──────────
//   PT. JATIM AUTOCOMP INDONESIA         : Arial Narrow, 10
//   Quality Management System            : Arial Narrow, 10
//   "Dokumen"                            : Arial Narrow, 10
//   [Nomor Dokumen]                      : Arial Narrow, 10
//   Block Activity                       : Century Gothic, 10
//   Judul Dokumen                        : Century Gothic, 16, BOLD
//   Disclaimer "uncontrolled..."         : Century Gothic, 9, italic
//   "Catatan Perubahan" (judul)          : Century Gothic, 12, BOLD
//   Nama kolom tabel (Rev./Catatan/dst.) : Century Gothic, 10, BOLD
//   Isi tabel (semua kolom)              : Arial Narrow, 11

import { PDFDocument, PDFPage, PDFFont, rgb, type RGB } from 'pdf-lib';
import { loadCustomFonts } from './pdfFonts';

export interface RevisionEntry {
  revNo: string;
  /** Satu baris per bullet, dipisah newline ('\n'). */
  catatanPerubahan: string;
  tanggalSelesaiApproval: string | null; // ISO date atau null
  oleh: string | null;
}

export interface GenerateLastPageParams {
  nomorDokumen: string;
  namaDokumen: string;
  blockActivity: string | null;
  /** Semua entri revisi milik dokumen ini, urut kronologis menaik (lama -> baru). */
  entries: RevisionEntry[];
}

const PAGE_WIDTH  = 595.5;
const PAGE_HEIGHT = 842.25;

const OUTER_LEFT  = 56.7;
const OUTER_RIGHT = 538.8;

const BLACK: RGB = rgb(0, 0, 0);
const GRAY:  RGB = rgb(0.4, 0.4, 0.4);

// ── Kotak 1: Header table (3 kolom di row1) ─────────────────────────────────
const HEADER_TOP    = 51.7;
const HEADER_BOTTOM = 74.4;
const HEADER_COL2_X = 424.8; // batas kolom "Dokumen"
const HEADER_COL3_X = 483.9; // batas kolom nilai nomor dokumen

const BLOCK_ACTIVITY_BOTTOM = 97.1;
const JUDUL_BOTTOM          = 125.4;
const DISCLAIMER_BOTTOM     = 145.3;

const CATATAN_HEADING_BOTTOM = 196.2;

// ── Kotak 2: Tabel Catatan Perubahan ────────────────────────────────────────
const COL_BOUNDS = [56.7, 113.4, 339.6, 467.7, 538.8]; // Rev | Catatan Perubahan | Tgl Selesai Approval | Oleh

const TABLE_HEADER_TOP    = 215.5;
const TABLE_HEADER_HEIGHT = 28.3;
const ROW_COUNT             = 4;

// Tinggi baris minimum (dipakai kalau catatan cuma 1 baris — sama seperti
// tinggi baris template asli), plus parameter untuk menghitung tinggi baris
// yang isinya lebih dari 1 poin.
const ROW_HEIGHT_MIN   = 28.35;
const BULLET_LINE_STEP = 13;  // jarak antar baris bullet
const ROW_VPADDING     = 14;  // total padding atas+bawah di dalam satu baris

const CONTENT_SIZE = 11; // Arial Narrow — isi tabel

function fromTop(top: number): number {
  return PAGE_HEIGHT - top;
}

function drawCentered(
  page: PDFPage, text: string, centerX: number, baselineTop: number,
  size: number, font: PDFFont, color: RGB, maxWidth?: number
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
  page.drawText(displayText, { x: centerX - textWidth / 2, y: fromTop(baselineTop), size, font, color });
}

function drawLeft(
  page: PDFPage, text: string, x: number, baselineTop: number,
  size: number, font: PDFFont, color: RGB, maxWidth?: number
) {
  let displayText = text || '-';
  if (maxWidth) {
    let textWidth = font.widthOfTextAtSize(displayText, size);
    while (displayText.length > 1 && textWidth > maxWidth) {
      displayText = displayText.slice(0, -1);
      textWidth = font.widthOfTextAtSize(displayText + '…', size);
    }
    if (font.widthOfTextAtSize(displayText, size) > maxWidth - 0.01 && displayText !== (text || '-')) {
      displayText = displayText + '…';
    }
  }
  page.drawText(displayText, { x, y: fromTop(baselineTop), size, font, color });
}

/**
 * Pecah satu baris teks panjang menjadi beberapa baris agar muat dalam
 * maxWidth (word-wrap sederhana), TANPA memotong/menghilangkan kata apapun —
 * dipakai supaya poin Catatan Perubahan yang panjang tetap tampil penuh
 * (turun ke baris berikutnya), bukan dipotong dengan "…".
 */
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

function formatTanggal(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${d.getDate()}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
}

/**
 * Pilih 4 baris yang ditampilkan di PDF: entri pertama (index 0) + 3 entri
 * terakhir. Kalau total entri < 4, slot "terakhir" yang belum ada data
 * diletakkan kosong (null) di AWAL kelompok 3-terakhir, supaya slot yang
 * TERISI selalu berada paling bawah/dekat baris "Terakhir".
 */
function selectDisplayRows(entries: RevisionEntry[]): (RevisionEntry | null)[] {
  const total = entries.length;
  const first: RevisionEntry | null = total > 0 ? entries[0] : null;

  const lastThreeRaw = entries.slice(Math.max(0, total - 3));
  const lastThree: (RevisionEntry | null)[] = [null, null, null];
  for (let i = 0; i < lastThreeRaw.length; i++) {
    lastThree[3 - lastThreeRaw.length + i] = lastThreeRaw[i];
  }

  return [first, ...lastThree];
}

export async function generateLastPage(params: GenerateLastPageParams): Promise<Uint8Array> {
  const { nomorDokumen, namaDokumen, blockActivity, entries } = params;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const { arialNarrow, centuryGothic, centuryGothicBold, centuryGothicItalic } = await loadCustomFonts(pdfDoc);

  const centerX = (OUTER_LEFT + OUTER_RIGHT) / 2;

  // ═══════════════════════════════════════════════════════════════════════
  // KOTAK 1 — Header info (border sendiri, TIDAK terhubung ke kotak tabel)
  // ═══════════════════════════════════════════════════════════════════════

  const box1Rows = [HEADER_TOP, HEADER_BOTTOM, BLOCK_ACTIVITY_BOTTOM, JUDUL_BOTTOM, DISCLAIMER_BOTTOM];
  for (const top of box1Rows) {
    page.drawLine({ start: { x: OUTER_LEFT, y: fromTop(top) }, end: { x: OUTER_RIGHT, y: fromTop(top) }, thickness: 0.75, color: BLACK });
  }
  for (const x of [OUTER_LEFT, OUTER_RIGHT]) {
    page.drawLine({ start: { x, y: fromTop(HEADER_TOP) }, end: { x, y: fromTop(DISCLAIMER_BOTTOM) }, thickness: 0.75, color: BLACK });
  }
  for (const x of [HEADER_COL2_X, HEADER_COL3_X]) {
    page.drawLine({ start: { x, y: fromTop(HEADER_TOP) }, end: { x, y: fromTop(HEADER_BOTTOM) }, thickness: 0.75, color: BLACK });
  }

  page.drawText('PT. JATIM AUTOCOMP INDONESIA', {
    x: 62.5, y: fromTop(63.9), size: 10, font: arialNarrow, color: BLACK,
  });
  drawLeft(page, 'Quality Management System', 297.7, 61.5, 10, arialNarrow, BLACK, HEADER_COL2_X - 297.7 - 6);

  drawLeft(page, 'Dokumen', 429.2, 63.9, 10, arialNarrow, BLACK, HEADER_COL3_X - 429.2 - 4);

  drawCentered(page, nomorDokumen, (HEADER_COL3_X + OUTER_RIGHT) / 2, 63.9, 10, arialNarrow, BLACK, OUTER_RIGHT - HEADER_COL3_X - 10);

  drawLeft(page, `Block Activity : ${blockActivity?.trim() || '-'}`, 62.5, 88.6, 10, centuryGothic, BLACK, OUTER_RIGHT - 62.5 - 10);

  drawCentered(page, namaDokumen, centerX, 115.5, 16, centuryGothicBold, BLACK, OUTER_RIGHT - OUTER_LEFT - 40);

  drawCentered(
    page,
    'Dokumen ini "uncontrolled" jika dicetak atau dicopy tanpa stamp "controller" oleh dept. yang berwenang',
    centerX, 138.1, 9, centuryGothicItalic, GRAY, OUTER_RIGHT - OUTER_LEFT - 20
  );

  // ═══════════════════════════════════════════════════════════════════════
  // Judul "Catatan Perubahan" — DI LUAR kedua kotak, tanpa border
  // ═══════════════════════════════════════════════════════════════════════
  drawLeft(page, 'CATATAN PERUBAHAN', OUTER_LEFT, CATATAN_HEADING_BOTTOM, 12, centuryGothicBold, BLACK);

  // ═══════════════════════════════════════════════════════════════════════
  // KOTAK 2 — Tabel Catatan Perubahan (border sendiri, terpisah dari kotak 1)
  // Tinggi tiap baris konten DIHITUNG DULU (dinamis) sebelum menggambar apapun.
  // ═══════════════════════════════════════════════════════════════════════
  const displayRows = selectDisplayRows(entries);

  const catatanX     = COL_BOUNDS[1] + 14;
  const catatanWidth = COL_BOUNDS[2] - COL_BOUNDS[1] - 20;

  // Untuk tiap baris: pecah SETIAP poin (bullet) jadi beberapa baris kalau
  // teksnya kepanjangan untuk lebar kolom, lalu hitung total baris & tinggi
  // baris tabel yang dibutuhkan.
  const rowWrappedLines: string[][] = displayRows.map((entry) => {
    if (!entry) return ['-'];
    const bulletLines = entry.catatanPerubahan.split('\n').map(s => s.trim()).filter(Boolean);
    if (bulletLines.length === 0) return ['-'];
    const wrapped: string[] = [];
    for (const bullet of bulletLines) {
      wrapped.push(...wrapText(bullet, arialNarrow, CONTENT_SIZE, catatanWidth));
    }
    return wrapped;
  });

  const rowHeights = rowWrappedLines.map((lines) => {
    const needed = lines.length * BULLET_LINE_STEP + ROW_VPADDING;
    return Math.max(ROW_HEIGHT_MIN, needed);
  });

  const contentTop0 = TABLE_HEADER_TOP + TABLE_HEADER_HEIGHT;
  const rowTopOffsets: number[] = [];
  let runningTop = contentTop0;
  for (let r = 0; r < ROW_COUNT; r++) {
    rowTopOffsets.push(runningTop);
    runningTop += rowHeights[r];
  }
  const tableBottom = runningTop;

  // Garis vertikal kolom (sepanjang seluruh tabel, tinggi sekarang dinamis)
  for (const x of COL_BOUNDS) {
    page.drawLine({ start: { x, y: fromTop(TABLE_HEADER_TOP) }, end: { x, y: fromTop(tableBottom) }, thickness: 0.75, color: BLACK });
  }
  // Garis horizontal: atas header, bawah header, lalu tiap batas baris
  const horizontalLineTops = [TABLE_HEADER_TOP, contentTop0, ...rowTopOffsets.slice(1), tableBottom];
  for (const top of horizontalLineTops) {
    page.drawLine({ start: { x: COL_BOUNDS[0], y: fromTop(top) }, end: { x: COL_BOUNDS[COL_BOUNDS.length - 1], y: fromTop(top) }, thickness: 0.75, color: BLACK });
  }

  // Header kolom — Century Gothic 10 Bold
  for (let i = 0; i < 4; i++) {
    const colCenterX = (COL_BOUNDS[i] + COL_BOUNDS[i + 1]) / 2;
    if (i === 0) {
      drawCentered(page, 'Rev.', colCenterX, 230.6, 10, centuryGothicBold, BLACK);
    } else if (i === 1) {
      drawCentered(page, 'Catatan Perubahan', colCenterX, 230.7, 10, centuryGothicBold, BLACK);
    } else if (i === 2) {
      drawCentered(page, 'Tanggal Selesai', colCenterX, 229.6, 10, centuryGothicBold, BLACK);
      drawCentered(page, 'Approval', colCenterX, 243.1, 10, centuryGothicBold, BLACK);
    } else {
      drawCentered(page, 'Oleh', colCenterX, 233.8, 10, centuryGothicBold, BLACK);
    }
  }

  // ── Baris konten — Arial Narrow 11 ─────────────────────────────────────────
  for (let r = 0; r < ROW_COUNT; r++) {
    const rowTop    = rowTopOffsets[r];
    const rowHeight = rowHeights[r];
    const rowCenter = rowTop + rowHeight / 2;
    const entry     = displayRows[r];
    const lines     = rowWrappedLines[r];

    // Kolom Rev., Tanggal, Oleh — selalu 1 baris, di-center vertikal terhadap
    // TINGGI BARIS INI (yang bisa lebih tinggi kalau catatan-nya panjang).
    const revCenterX = (COL_BOUNDS[0] + COL_BOUNDS[1]) / 2;
    drawCentered(page, entry ? entry.revNo : '-', revCenterX, rowCenter + 4, CONTENT_SIZE, arialNarrow, entry ? BLACK : GRAY, COL_BOUNDS[1] - COL_BOUNDS[0] - 6);

    const tglCenterX = (COL_BOUNDS[2] + COL_BOUNDS[3]) / 2;
    drawCentered(page, entry ? formatTanggal(entry.tanggalSelesaiApproval) : '-', tglCenterX, rowCenter + 4, CONTENT_SIZE, arialNarrow, entry ? BLACK : GRAY, COL_BOUNDS[3] - COL_BOUNDS[2] - 6);

    const olehCenterX = (COL_BOUNDS[3] + COL_BOUNDS[4]) / 2;
    drawCentered(page, entry?.oleh?.trim() || '-', olehCenterX, rowCenter + 4, CONTENT_SIZE, arialNarrow, entry ? BLACK : GRAY, COL_BOUNDS[4] - COL_BOUNDS[3] - 6);

    // Kolom Catatan Perubahan — SEMUA baris ditampilkan penuh, di-tengah
    // secara vertikal terhadap tinggi baris (bukan cuma maks 2 baris lagi).
    const blockHeight  = lines.length * BULLET_LINE_STEP;
    const firstLineTop = rowTop + (rowHeight - blockHeight) / 2 + BULLET_LINE_STEP - 3;
    const color        = entry ? BLACK : GRAY;
    lines.forEach((line, i) => {
      drawLeft(page, line, catatanX, firstLineTop + i * BULLET_LINE_STEP, CONTENT_SIZE, arialNarrow, color, catatanWidth);
    });
  }

  return pdfDoc.save();
}