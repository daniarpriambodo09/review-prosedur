// lib/picUserHelper.ts
import { PoolClient } from 'pg';
import bcryptjs from 'bcryptjs';

export interface PicUserRecord {
  id: number;
  email: string;
  fullName: string;
  username: string;
  role: string;
  picId: number;
}

const DEFAULT_PASSWORD = 'jai1234';
let defaultHashedPasswordCache: string | null = null;

async function getDefaultHashedPassword(): Promise<string> {
  if (!defaultHashedPasswordCache) {
    defaultHashedPasswordCache = await bcryptjs.hash(DEFAULT_PASSWORD, 10);
  }
  return defaultHashedPasswordCache;
}

/**
 * Memastikan approver (Prepared, Checked, Approved) terdaftar di tabel pic_users.
 * Jika belum ada, otomatis membuat akun baru dengan password default 'jai1234'.
 */
export async function ensurePicUserExists(
  client: PoolClient,
  email: string | null | undefined,
  fullName: string | null | undefined
): Promise<PicUserRecord | null> {
  if (!email || !email.trim()) return null;
  const cleanEmail = email.trim().toLowerCase();
  const cleanFullName = (fullName && fullName.trim()) ? fullName.trim() : cleanEmail.split('@')[0];

  // 1. Cek apakah sudah ada di pic_users
  const existingRes = await client.query(
    `SELECT id, email, full_name, role, is_active FROM pic_users WHERE LOWER(TRIM(email)) = $1 LIMIT 1`,
    [cleanEmail]
  );

  if (existingRes.rows.length > 0) {
    const p = existingRes.rows[0];
    // Jika tidak aktif, aktifkan agar dapat login
    if (!p.is_active) {
      await client.query(`UPDATE pic_users SET is_active = true WHERE id = $1`, [p.id]);
    }
    return {
      id: p.id,
      email: p.email,
      fullName: p.full_name || cleanFullName,
      username: p.email,
      role: 'pic',
      picId: p.id,
    };
  }

  // 2. Buat akun baru dengan password default 'jai1234'
  const hashedPassword = await getDefaultHashedPassword();
  const insertRes = await client.query(
    `INSERT INTO pic_users (email, full_name, password, role, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, 'pic', true, NOW(), NOW())
     RETURNING id, email, full_name, role, is_active`,
    [cleanEmail, cleanFullName, hashedPassword]
  );

  const newPic = insertRes.rows[0];
  return {
    id: newPic.id,
    email: newPic.email,
    fullName: newPic.full_name,
    username: newPic.email,
    role: 'pic',
    picId: newPic.id,
  };
}
