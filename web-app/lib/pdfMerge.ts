// lib/pdfMerge.ts
//
// Gabungkan halaman 1 baru (hasil generateFirstPage) dengan halaman 2 dst.
// dari file dokumen asli. Mengembalikan bytes PDF hasil gabungan — caller
// (approvalFinalize.ts) yang menyimpannya ke disk sebagai versi baru.

import { PDFDocument } from 'pdf-lib';

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
  // Jika dokumen asli cuma 1 halaman, hasil akhirnya ya cuma halaman baru ini saja.

  return mergedPdf.save();
}