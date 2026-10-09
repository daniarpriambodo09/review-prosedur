// lib/pdfDecrypt.ts
//
// Utility untuk mendekripsi PDF yang memiliki proteksi hak akses
// (permissions-only standard encryption / empty user password, mis. pembatasan cetak/salin).
// Mengubah dokumen terenkripsi menjadi dokumen unencrypted yang valid sehingga
// pdf-lib dapat mengedit (merge/draw) dan PDFViewer browser dapat merender
// seluruh halaman dan teks aslinya tanpa halaman menjadi putih/kosong (blank).

import { decryptPDF, isEncrypted } from '@pdfsmaller/pdf-decrypt';

/**
 * Jika PDF terenkripsi (misal permissions-locked tanpa user password),
 * buka enkripsinya menggunakan password kosong ('') sehingga menghasilkan
 * Uint8Array dokumen PDF yang bersih (unencrypted).
 * Jika dokumen tidak terenkripsi, kembalikan bytes asli.
 */
export async function ensureDecryptedPdf(pdfBytes: Uint8Array | Buffer): Promise<Uint8Array> {
  const bytes = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
  try {
    const info = await isEncrypted(bytes);
    if (!info?.encrypted) {
      return bytes;
    }
    // Coba dekripsi dengan empty password (standar dokumen dengan pembatasan hak akses/print saja)
    const decrypted = await decryptPDF(bytes, '');
    return decrypted;
  } catch (err: any) {
    if (err?.message?.includes('No /Encrypt dictionary found')) {
      return bytes;
    }
    console.warn('[pdfDecrypt] Dokumen terenkripsi tidak dapat didekripsi dengan empty password:', err);
    return bytes;
  }
}
