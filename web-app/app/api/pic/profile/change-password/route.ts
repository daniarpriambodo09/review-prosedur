// app/api/pic/profile/change-password/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcryptjs from 'bcryptjs';

export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const picId    = request.headers.get('x-pic-id');
    const picEmail = request.headers.get('x-pic-email');

    if (!picId || !picEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { oldPassword, newPassword, confirmPassword } = await request.json();

    // ── Validasi input ────────────────────────────────────────────────────────
    if (!oldPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'Semua field harus diisi' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password baru minimal 8 karakter' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'Konfirmasi password tidak cocok' },
        { status: 400 }
      );
    }

    // ── Ambil password hash dari DB ───────────────────────────────────────────
    const { rows } = await client.query(
      'SELECT password FROM pic_users WHERE id = $1 AND email = $2',
      [picId, picEmail]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    // ── Verifikasi password lama ───────────────────────────────────────────────
    const isValid = await bcryptjs.compare(oldPassword, rows[0].password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Password lama tidak sesuai' },
        { status: 400 }
      );
    }

    // ── Hash password baru & simpan ───────────────────────────────────────────
    const hashed = await bcryptjs.hash(newPassword, 12);

    await client.query(
      `UPDATE pic_users
         SET password = $1, updated_at = NOW()
       WHERE id = $2`,
      [hashed, picId]
    );

    return NextResponse.json({ success: true, message: 'Password berhasil diubah' });

  } catch (error) {
    console.error('change-password error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}