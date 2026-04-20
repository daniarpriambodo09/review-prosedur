import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcryptjs from 'bcryptjs';

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { email, password } = body;

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

    // Cek apakah PIC aktif
    if (!pic.is_active) {
      return NextResponse.json(
        { error: 'Akun tidak aktif. Hubungi administrator.' },
        { status: 403 }
      );
    }

    // Verifikasi password dengan bcrypt
    const isPasswordValid = await bcryptjs.compare(password, pic.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // Log aktivitas login untuk PIC
    const logQuery = `
      INSERT INTO pic_activities (pic_id, activity_type, description, ip_address, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `;
    
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    await client.query(logQuery, [pic.id, 'login', 'PIC login', userAgent]);

    // Return PIC user data (tanpa password)
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
