// lib/pdfMerge.ts
//
// Gabungkan halaman 1 baru (hasil generateFirstPage) dan halaman TERAKHIR baru
// (hasil generateLastPage) dengan halaman-halaman asli dokumen secara in-place.
//
// PENTING: Jangan membuat dokumen baru kosong (PDFDocument.create()) lalu
// memindahkan halaman asli dengan copyPages(), karena copyPages() pada pdf-lib
// dapat memutus referensi inherited /Resources & font streams di dokumen asli
// yang menyebabkan halaman-halaman tengah menjadi kosong/putih (blank white).
// Sebagai gantinya, kita memodifikasi originalPdf secara in-place:
// mengganti halaman pertama (indeks 0) dan menambah/mengganti halaman terakhir,
// sehingga seluruh halaman tengah dan asetnya tetap 100% utuh tanpa risiko blank page.

import { PDFDocument } from 'pdf-lib';

/** Dipertahankan untuk kompatibilitas — mengganti halaman 1 secara in-place. */
export async function replaceFirstPage(
  originalPdfBytes: Uint8Array,
  newFirstPageBytes: Uint8Array
): Promise<Uint8Array> {
  const originalPdf     = await PDFDocument.load(originalPdfBytes, { ignoreEncryption: true });
  const newFirstPagePdf = await PDFDocument.load(newFirstPageBytes, { ignoreEncryption: true });

  const [copiedFirstPage] = await originalPdf.copyPages(newFirstPagePdf, [0]);
  originalPdf.insertPage(0, copiedFirstPage);
  originalPdf.removePage(1);

  return originalPdf.save();
}

/**
 * Gabungkan halaman 1 BARU (Cover Approval) ke dokumen asli secara in-place.
 * Sesuai permintaan update: halaman terakhir TIDAK ditambah template halaman,
 * hanya halaman pertama saja yang diganti.
 *
 * @param originalPdfBytes    Bytes file aktif saat ini (versi sebelum approval selesai).
 * @param newFirstPageBytes   Hasil generateFirstPage() — approval Prepared/Checked/Approved.
 * @param hadLastPageTemplate `true` jika dokumen sebelumnya pernah memakai template
 *                            halaman terakhir buatan sistem lama. Jika true, halaman
 *                            template terakhir lama tersebut DIBUANG agar dokumen
 *                            kembali ke halaman aslinya.
 */
export async function assembleFinalDocument(
  originalPdfBytes: Uint8Array,
  newFirstPageBytes: Uint8Array,
  hadLastPageTemplate: boolean
): Promise<Uint8Array> {
  // Load dokumen asli sebagai basis dokumen utama (in-place modification)
  const originalPdf = await PDFDocument.load(originalPdfBytes, { ignoreEncryption: true });
  const newFirstPdf = await PDFDocument.load(newFirstPageBytes, { ignoreEncryption: true });

  // 1) Ganti halaman pertama dokumen asli dengan halaman cover approval baru:
  // Sisipkan halaman baru di indeks 0, lalu buang halaman pertama lama (yang sekarang bergeser ke indeks 1)
  const [copiedFirst] = await originalPdf.copyPages(newFirstPdf, [0]);
  originalPdf.insertPage(0, copiedFirst);
  originalPdf.removePage(1);

  // 2) Sesuai permintaan: halaman terakhir TIDAK ditambah template halaman.
  // Jika sebelumnya dokumen pernah memiliki template halaman terakhir buatan sistem lama,
  // buang halaman template tersebut agar dokumen bersih.
  if (hadLastPageTemplate && originalPdf.getPageCount() > 1) {
    originalPdf.removePage(originalPdf.getPageCount() - 1);
  }

  return originalPdf.save();
}