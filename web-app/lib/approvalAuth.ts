// lib/approvalAuth.ts
//
// Utilitas pengecekan kesesuaian identitas user login (PIC)
// dengan pejabat approver yang disetting oleh admin pada alur
// Prepared, Checked, dan Approved.

export interface AuthUserLike {
  id?: number;
  email?: string | null;
  fullName?: string | null;
  username?: string | null;
  role?: string;
}

export interface ApproverLike {
  email?: string | null;
  nama?: string | null;
}

/**
 * Memeriksa apakah user yang sedang login cocok dengan data approver
 * yang disetting oleh admin.
 *
 * Aturan pencocokan:
 * 1. Email (Case-insensitive): Jika kedua email ada, keduanya WAJIB cocok
 *    (atau username prefix sama untuk akun internal vs publik).
 * 2. Kode PIC dalam tanda kurung (misal "(DP)"): Jika kode terdeteksi pada
 *    keduanya, kode harus persis sama.
 * 3. Nama Lengkap: Jika nama persis sama tanpa kode yang berkonflik.
 */
export function checkUserApproverMatch(
  user: AuthUserLike | null | undefined,
  approver: ApproverLike | null | undefined
): boolean {
  if (!user || !approver) return false;

  const uEmail = (user.email || '').trim().toLowerCase();
  const aEmail = (approver.email || '').trim().toLowerCase();

  // 1. Kesesuaian Email Utama (Standar Utama & Terpenting)
  if (uEmail && aEmail) {
    if (uEmail === aEmail) return true;
    const uPrefix = uEmail.split('@')[0].trim();
    const aPrefix = aEmail.split('@')[0].trim();
    if (uPrefix && aPrefix && uPrefix === aPrefix) return true;
    // Jika kedua email ada tetapi berbeda (misal daniarpriambodo11 vs untuksemua0309), return false
    return false;
  }

  // 2. Jika salah satu email kosong, cek kode PIC dalam tanda kurung:
  const uName = (user.fullName || '').trim().toLowerCase();
  const aName = (approver.nama || '').trim().toLowerCase();
  const uUsername = (user.username || '').trim().toLowerCase();

  const uCodeMatch =
    uName.match(/\(([a-z0-9_.\s-]+)\)/i) ||
    uUsername.match(/\(([a-z0-9_.\s-]+)\)/i);
  const aCodeMatch = aName.match(/\(([a-z0-9_.\s-]+)\)/i);

  if (uCodeMatch && aCodeMatch) {
    if (uCodeMatch[1].toLowerCase().trim() === aCodeMatch[1].toLowerCase().trim()) {
      return true;
    }
  }

  // 3. Fallback nama lengkap jika persis sama
  if (uName && aName && uName === aName) return true;

  // 4. Fallback nama dasar bersih jika salah satu email kosong
  if ((!uEmail || !aEmail) && uName && aName) {
    const cleanUName = uName.replace(/\s*\([^)]*\)/g, '').trim();
    const cleanAName = aName.replace(/\s*\([^)]*\)/g, '').trim();
    if (cleanUName && cleanAName && cleanUName.length >= 4 && cleanUName === cleanAName) {
      return true;
    }
  }

  return false;
}
