// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { logActivity } from '@/lib/activityLogger';

export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password harus diisi' }, { status: 400 });
    }

    // 1. Coba cari di tabel users (admin biasa)
    const userResult = await client.query(
      `SELECT id, username, password, full_name, email, role, is_active FROM users WHERE username = $1`,
      [username]
    );

    let account: any = null;
    let source: 'users' | 'pic_users' = 'users';

    if (userResult.rows.length > 0) {
      account = userResult.rows[0];
      source = 'users';
    } else {
      // 2. Kalau tidak ketemu, cek pic_users yang role-nya mengandung 'admin'
      const picResult = await client.query(
        `SELECT id, email, password, full_name, role, is_active FROM pic_users WHERE email = $1`,
        [username]
      );

      if (picResult.rows.length > 0 && picResult.rows[0].role?.includes('admin')) {
        account = picResult.rows[0];
        source = 'pic_users';
      }
    }

    if (!account) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    if (!account.is_active) {
      return NextResponse.json({ error: 'Akun tidak aktif. Hubungi administrator.' }, { status: 403 });
    }

    const isPasswordValid = await verifyPassword(password, account.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    const loginUsername = source === 'users' ? account.username : account.email;

    await logActivity({
      userId: account.id,
      username: loginUsername,
      activityType: 'login',
      activityDescription: `User ${loginUsername} login sebagai admin`,
      targetType: 'user',
      targetId: account.id.toString(),
    });

    return NextResponse.json({
      success: true,
      user: {
        id: account.id,
        username: loginUsername,
        fullName: account.full_name,
        email: account.email,
        role: source === 'users' ? account.role : 'admin',
        ...(source === 'pic_users' ? { picId: account.id } : {}),
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat login' }, { status: 500 });
  } finally {
    client.release();
  }
}