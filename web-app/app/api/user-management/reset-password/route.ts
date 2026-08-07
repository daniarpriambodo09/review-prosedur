// app/api/user-management/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { encryptPassword } from '@/lib/password-encryption';

async function requireAdmin(request: NextRequest) {
  const adminUsername = request.headers.get('x-admin-username');
  if (!adminUsername) return null;
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, role FROM users WHERE username = $1 AND is_active = true`,
      [adminUsername]
    );
    if (rows.length === 0 || rows[0].role !== 'admin') return null;
    return rows[0] as { id: number; role: string };
  } finally {
    client.release();
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const body = await request.json();
    const { id, role, newPassword } = body;

    if (!id || !role || !newPassword) {
      return NextResponse.json(
        { error: 'ID, role, dan password baru wajib diisi' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password minimal 8 karakter' },
        { status: 400 }
      );
    }

    const hashed = await hashPassword(newPassword);
    const encrypted = encryptPassword(newPassword);

    if (role === 'admin') {
      const { rows } = await client.query(
        `UPDATE users
         SET password = $1, password_encrypted = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING id`,
        [hashed, encrypted, id]
      );
      if (rows.length === 0) {
        return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
      }
    } else if (role === 'pic') {
      const { rows } = await client.query(
        `UPDATE pic_users
         SET password = $1, password_encrypted = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING id`,
        [hashed, encrypted, id]
      );
      if (rows.length === 0) {
        return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
      }
    } else {
      return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Password berhasil direset' });

  } finally {
    client.release();
  }
}