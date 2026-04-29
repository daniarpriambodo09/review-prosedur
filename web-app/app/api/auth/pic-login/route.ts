import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcryptjs from 'bcryptjs';

export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const { email, password } = body;

    // Validasi input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email dan password harus diisi' },
        { status: 400 }
      );
    }

    // Cari PIC user berdasarkan email
    const query = `
      SELECT id, email, password, full_name, is_active 
      FROM pic_users 
      WHERE email = $1
    `;

    const result = await client.query(query, [email]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    const pic = result.rows[0];

    // Cek apakah akun aktif
    if (!pic.is_active) {
      return NextResponse.json(
        { error: 'Akun tidak aktif. Hubungi administrator.' },
        { status: 403 }
      );
    }

    // Verifikasi password
    const isPasswordValid = await bcryptjs.compare(password, pic.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // =========================
    // Ambil IP Address & User Agent
    // =========================
    const rawIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      '';

    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : 'Unknown';

    const userAgent =
      request.headers.get('user-agent') || 'Unknown';

    // =========================
    // Insert log activity (FIXED)
    // =========================
    const logQuery = `
      INSERT INTO pic_activities 
      (pic_id, activity_type, description, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `;

    await client.query(logQuery, [
      pic.id,
      'login',
      'PIC login',
      ipAddress,
      userAgent
    ]);

    // =========================
    // Return response
    // =========================
    return NextResponse.json({
      success: true,
      user: {
        id: pic.id,
        username: pic.email,
        fullName: pic.full_name,
        email: pic.email,
        role: 'pic',
        picId: pic.id,
      }
    });

  } catch (error) {
    console.error('Error during PIC login:', error);

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat login' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}