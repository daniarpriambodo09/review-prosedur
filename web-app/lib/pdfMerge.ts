// lib/pdfMerge.ts
//
// Gabungkan halaman 1 baru (hasil generateFirstPage) — dan sekarang juga
// halaman TERAKHIR baru (hasil generateLastPage) — dengan halaman-halaman
// lain dari file dokumen asli. Caller (approvalFinalize.ts) yang menyimpan
// hasilnya ke disk sebagai versi baru.

import { PDFDocument } from 'pdf-lib';

/** Dipertahankan untuk kompatibilitas — hanya mengganti halaman 1. */
export async function replaceFirstPage(
  originalPdfBytes: Uint8Array,
  newFirstPageBytes: Uint8Array
): Promise<Uint8Array> {
  const originalPdf     = await PDFDocument.load(originalPdfBytes);
  const newFirstPagePdf = await PDFDocument.load(newFirstPageBytes);

  const mergedPdf = await PDFDocument.create();

  const [copiedFirstPage] = await mergedPdf.copyPages(newFirstPagePdf, [0]);
  mergedPdf.addPage(copiedFirstPage);

  const totalPages = originalPdf.getPageCount();
  if (totalPages > 1) {
    const remainingIndices = Array.from({ length: totalPages - 1 }, (_, i) => i + 1);
    const copiedRest = await mergedPdf.copyPages(originalPdf, remainingIndices);
    copiedRest.forEach(p => mergedPdf.addPage(p));
  }

  return mergedPdf.save();
}

/**
 * Gabungkan halaman 1 BARU + halaman-halaman tengah dari dokumen asli +
 * halaman TERAKHIR baru (Catatan Perubahan), dalam satu dokumen final.
 *
 * @param originalPdfBytes    Bytes file aktif saat ini (versi sebelum approval selesai).
 * @param newFirstPageBytes   Hasil generateFirstPage() — approval Prepared/Checked/Approved.
 * @param newLastPageBytes    Hasil generateLastPage() — Catatan Perubahan / block activity.
 * @param hadLastPageTemplate `true` kalau dokumen ini SEBELUMNYA sudah pernah memakai
 *                            template halaman terakhir (procedure_documents.uses_last_page_template).
 *                            Kalau true, halaman terakhir file asli (yang berarti halaman
 *                            template versi lama) DIBUANG dan diganti dengan yang baru.
 *                            Kalau false, halaman baru cukup DITAMBAHKAN di akhir — tidak
 *                            ada halaman lama yang perlu dibuang.
 */
export async function assembleFinalDocument(
  originalPdfBytes: Uint8Array,
  newFirstPageBytes: Uint8Array,
  newLastPageBytes: Uint8Array,
  hadLastPageTemplate: boolean
): Promise<Uint8Array> {
  const originalPdf    = await PDFDocument.load(originalPdfBytes);
  const newFirstPdf    = await PDFDocument.load(newFirstPageBytes);
  const newLastPdf     = await PDFDocument.load(newLastPageBytes);

  const mergedPdf = await PDFDocument.create();

  // 1) Halaman pertama baru
  const [copiedFirst] = await mergedPdf.copyPages(newFirstPdf, [0]);
  mergedPdf.addPage(copiedFirst);

  // 2) Halaman "tengah" dari dokumen asli — semua kecuali halaman pertama
  //    (selalu dibuang, diganti di atas), dan kecuali halaman terakhir KALAU
  //    halaman terakhir itu adalah template lama yang harus diganti.
  const totalPages = originalPdf.getPageCount();
  const firstMiddleIndex = 1;
  const lastMiddleIndex  = hadLastPageTemplate ? totalPages - 2 : totalPages - 1; // inklusif

  if (lastMiddleIndex >= firstMiddleIndex) {
    const middleIndices = Array.from(
      { length: lastMiddleIndex - firstMiddleIndex + 1 },
      (_, i) => firstMiddleIndex + i
    );
    const copiedMiddle = await mergedPdf.copyPages(originalPdf, middleIndices);
    copiedMiddle.forEach(p => mergedPdf.addPage(p));
  }

  // 3) Halaman terakhir baru (Catatan Perubahan)
  const [copiedLast] = await mergedPdf.copyPages(newLastPdf, [0]);
  mergedPdf.addPage(copiedLast);

  return mergedPdf.save();
}