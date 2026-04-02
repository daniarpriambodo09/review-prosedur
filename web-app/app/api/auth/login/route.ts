// app/api/auth/login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { logActivity } from '@/lib/activityLogger'; // ✅ Tambahan

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username dan password harus diisi' },
        { status: 400 }
      );
    }

    // Cari user berdasarkan username
    const query = `
      SELECT id, username, password, full_name, email, role, is_active 
      FROM users 
      WHERE username = $1
    `;
    
    const result = await client.query(query, [username]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Username atau password salah' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Cek apakah user aktif
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Akun tidak aktif. Hubungi administrator.' },
        { status: 403 }
      );
    }

    // Verifikasi password
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Username atau password salah' },
        { status: 401 }
      );
    }

    // ✅ Log aktivitas login setelah password valid
    await logActivity({
      userId: user.id,
      username: user.username,
      activityType: 'login',
      activityDescription: `User ${user.username} login`,
      targetType: 'user',
      targetId: user.id.toString(),
    });

    // Return user data (tanpa password)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat login' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}