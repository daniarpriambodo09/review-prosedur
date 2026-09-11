// lib/pdfFonts.ts
//
// Helper untuk embed font CUSTOM (bukan 14 font standar bawaan pdf-lib) ke
// dokumen PDF yang di-generate, memakai @pdf-lib/fontkit.
//
// Dipakai oleh lib/pdfLastPage.ts untuk memenuhi spesifikasi font halaman
// terakhir: Arial Narrow untuk header info & isi tabel, Century Gothic untuk
// Block Activity / Judul Dokumen / Disclaimer / judul & header tabel.
//
// File font (.ttf) HARUS disalin manual ke folder `fonts/` di root project
// (bukan folder `public/`, karena tidak perlu diakses browser — cukup dibaca
// server-side saat generate PDF). Kalau salah satu file tidak ditemukan,
// fungsi ini FALLBACK ke font standar pdf-lib yang paling mendekati (supaya
// proses generate PDF tidak gagal total), dan mencetak warning ke console
// sekali saja per proses.

import { PDFDocument, PDFFont, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const FONTS_DIR = path.join(process.cwd(), 'fonts');

const FONT_FILES = {
  arialNarrow:        'ARIALN.TTF',
  centuryGothic:      'GOTHIC.TTF',
  centuryGothicBold:  'GOTHICB.TTF',
  centuryGothicItalic: 'GOTHICI.TTF',
} as const;

export interface CustomFonts {
  arialNarrow: PDFFont;
  centuryGothic: PDFFont;
  centuryGothicBold: PDFFont;
  centuryGothicItalic: PDFFont;
}

let warnedMissing = false;

async function embedOrFallback(
  pdfDoc: PDFDocument,
  fileName: string,
  fallback: StandardFonts,
  label: string
): Promise<PDFFont> {
  const fullPath = path.join(FONTS_DIR, fileName);
  if (existsSync(fullPath)) {
    try {
      const bytes = await readFile(fullPath);
      return await pdfDoc.embedFont(bytes, { subset: true });
    } catch (err) {
      console.warn(`[pdfFonts] Gagal embed font ${label} (${fileName}), pakai fallback:`, err);
    }
  } else if (!warnedMissing) {
    console.warn(
      `[pdfFonts] File font tidak ditemukan: ${fullPath}. ` +
      `Halaman terakhir PDF akan pakai font fallback, bukan ${label}. ` +
      `Salin file .ttf yang sesuai ke folder "fonts/" di root project.`
    );
  }
  return pdfDoc.embedFont(fallback);
}

/** Embed & kembalikan seluruh font custom yang dipakai halaman terakhir. */
export async function loadCustomFonts(pdfDoc: PDFDocument): Promise<CustomFonts> {
  pdfDoc.registerFontkit(fontkit);

  const [arialNarrow, centuryGothic, centuryGothicBold, centuryGothicItalic] = await Promise.all([
    embedOrFallback(pdfDoc, FONT_FILES.arialNarrow, StandardFonts.Helvetica, 'Arial Narrow'),
    embedOrFallback(pdfDoc, FONT_FILES.centuryGothic, StandardFonts.Helvetica, 'Century Gothic'),
    embedOrFallback(pdfDoc, FONT_FILES.centuryGothicBold, StandardFonts.HelveticaBold, 'Century Gothic Bold'),
    embedOrFallback(pdfDoc, FONT_FILES.centuryGothicItalic, StandardFonts.HelveticaOblique, 'Century Gothic Italic'),
  ]);

  warnedMissing = true; // hanya print peringatan detail sekali per proses server

  return { arialNarrow, centuryGothic, centuryGothicBold, centuryGothicItalic };
}