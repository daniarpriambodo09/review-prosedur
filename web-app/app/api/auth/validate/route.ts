// app/api/auth/validate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // ── 1. Cek tabel users (admin) dulu ──────────────────────────────────────
    const adminQuery = `
      SELECT id, username, full_name, email, role, is_active
      FROM users
      WHERE username = $1
    `;
    const adminResult = await client.query(adminQuery, [username]);

    if (adminResult.rows.length > 0 && adminResult.rows[0].is_active) {
      const u = adminResult.rows[0];
      return NextResponse.json({
        valid: true,
        user: {
          id:       u.id,
          username: u.username,
          fullName: u.full_name,
          email:    u.email,
          role:     u.role,
        },
      });
    }

    // ── 2. Cek tabel pic_users (PIC login pakai email sebagai username) ───────
    // Saat PIC login, `user.username` di localStorage diisi dengan email PIC
    const picQuery = `
      SELECT id, email, full_name, is_active
      FROM pic_users
      WHERE email = $1
    `;
    const picResult = await client.query(picQuery, [username]);

    if (picResult.rows.length > 0 && picResult.rows[0].is_active) {
      const p = picResult.rows[0];
      return NextResponse.json({
        valid: true,
        user: {
          id:       p.id,
          username: p.email,
          fullName: p.full_name,
          email:    p.email,
          role:     'pic',
          picId:    p.id,
        },
      });
    }

    // ── 3. Tidak ditemukan / tidak aktif ──────────────────────────────────────
    return NextResponse.json({ valid: false }, { status: 401 });

  } catch (error) {
    console.error('Error validating session:', error);
    return NextResponse.json({ valid: false }, { status: 500 });
  } finally {
    client.release();
  }
}