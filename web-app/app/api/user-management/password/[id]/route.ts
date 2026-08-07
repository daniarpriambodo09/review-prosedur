// app/api/user-management/password/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { decryptPassword } from '@/lib/password-encryption';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const targetId = parseInt(id);
  const role = request.nextUrl.searchParams.get('role') ?? 'admin';

  if (isNaN(targetId)) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    let encryptedPassword: string | null = null;

    if (role === 'admin') {
      const { rows } = await client.query(
        'SELECT password_encrypted FROM users WHERE id = $1',
        [targetId]
      );
      if (rows.length === 0) {
        return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
      }
      encryptedPassword = rows[0].password_encrypted;
    } else if (role === 'pic') {
      const { rows } = await client.query(
        'SELECT password_encrypted FROM pic_users WHERE id = $1',
        [targetId]
      );
      if (rows.length === 0) {
        return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
      }
      encryptedPassword = rows[0].password_encrypted;
    } else {
      return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
    }

    // User lama — password_encrypted belum tersedia
    if (!encryptedPassword) {
      return NextResponse.json(
        { error: 'PASSWORD_UNAVAILABLE', message: 'Password belum tersedia. Lakukan reset password.' },
        { status: 422 }
      );
    }

    // Decrypt
    let plaintext: string;
    try {
      plaintext = decryptPassword(encryptedPassword);
    } catch {
      return NextResponse.json(
        { error: 'Gagal mendekripsi password' },
        { status: 500 }
      );
    }

    // Catat audit log
    const rawIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      '';
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : 'Unknown';

    await client.query(
      `INSERT INTO user_password_views (admin_id, target_user_id, target_role, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [admin.id, targetId, role, ipAddress]
    );

    return NextResponse.json({ success: true, password: plaintext });

  } finally {
    client.release();
  }
}