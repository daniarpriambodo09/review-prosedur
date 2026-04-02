// lib/otpGenerator.ts
import { createHash } from 'crypto';

// Secret key untuk generate OTP (simpan di .env.local)
const OTP_SECRET = process.env.OTP_SECRET || 'your-super-secret-key-change-this-in-production';

/**
 * Generate OTP 6 digit yang unik per PIC per bulan
 * @param pic - Nama PIC (contoh: "ENS", "TWI")
 * @param year - Tahun (contoh: 2026)
 * @param month - Bulan (1-12)
 * @returns OTP 6 digit sebagai string
 */
export function generateMonthlyOTP(pic: string, year: number, month: number): string {
  // Normalisasi PIC ke uppercase
  const normalizedPic = pic.trim().toUpperCase();
  
  // Seed: kombinasi PIC + bulan + tahun + secret key
  const seed = `${normalizedPic}:${year}:${String(month).padStart(2, '0')}:${OTP_SECRET}`;
  
  // Hash dengan SHA256
  const hash = createHash('sha256').update(seed).digest('hex');
  
  // Ambil 8 karakter pertama, konversi ke integer, modulo 1.000.000 untuk 6 digit
  const otpInt = parseInt(hash.substring(0, 8), 16) % 1000000;
  
  // Format dengan leading zero (contoh: 42 → "000042")
  return otpInt.toString().padStart(6, '0');
}

/**
 * Validasi format OTP (6 digit angka)
 */
export function isValidOTPFormat(otp: string): boolean {
  return /^\d{6}$/.test(otp);
}

/**
 * Hitung expiry OTP: end of month jam 23:59:59
 */
export function getOTPExpiry(year: number, month: number): Date {
  // Bulan berikutnya, hari 0 = hari terakhir bulan saat ini
  return new Date(year, month, 0, 23, 59, 59);
}