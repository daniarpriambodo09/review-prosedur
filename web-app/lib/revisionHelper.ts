// lib/revisionHelper.ts
//
// Utility untuk manajemen penomoran revisi dokumen prosedur.
// Jika status dokumen yang awalnya "Revisi" berubah menjadi "Relevan"
// (baik melalui review PIC maupun setelah selesai ketiga approver),
// nomor revisi dokumen otomatis bertambah 1.

/**
 * Naikkan nomor revisi dokumen sebanyak 1.
 * Mendukung format angka tunggal ('0' -> '1', '1' -> '2')
 * maupun format 2-digit dengan leading zero ('00' -> '01', '01' -> '02', '09' -> '10').
 */
export function incrementRevision(currentRevisi: string | null | undefined): string {
  const revStr = (currentRevisi ?? '').trim();
  const num = parseInt(revStr, 10);
  const nextNum = isNaN(num) ? 1 : num + 1;

  // Jika format asli memiliki 2 digit atau lebih dan diawali '0', pertahankan padding
  if (revStr.length >= 2 && revStr.startsWith('0')) {
    return String(nextNum).padStart(revStr.length, '0');
  }
  return String(nextNum);
}
