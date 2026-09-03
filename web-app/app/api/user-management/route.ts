// app/api/user-management/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { encryptPassword } from '@/lib/password-encryption';
import bcrypt from 'bcryptjs';

// ── Auth guard helper ─────────────────────────────────────────────────────────
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

// ── GET: List all users ───────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const adminUsers = await client.query(`
      SELECT
        id,
        username,
        full_name,
        email,
        role,
        is_active,
        (password_encrypted IS NOT NULL) AS has_encrypted,
        created_at,
        updated_at
      FROM users
      ORDER BY created_at DESC
    `);

    const picUsers = await client.query(`
      SELECT
        id,
        email AS username,
        full_name,
        email,
        'pic' AS role,
        is_active,
        (password_encrypted IS NOT NULL) AS has_encrypted,
        created_at,
        updated_at
      FROM pic_users
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      success: true,
      adminUsers: adminUsers.rows,
      picUsers: picUsers.rows,
    });
  } finally {
    client.release();
  }
}

// ── POST: Create user ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const body = await request.json();
    const { fullName, role, username, email, password } = body;

    if (!fullName || !role || !username || !password) {
      return NextResponse.json(
        { error: 'Nama, role, username, dan password wajib diisi' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const encryptedPassword = encryptPassword(password);

    if (role === 'admin') {
      const { rows: dup } = await client.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );
      if (dup.length > 0) {
        return NextResponse.json(
          { error: 'Username sudah digunakan' },
          { status: 409 }
        );
      }

      const { rows } = await client.query(
        `INSERT INTO users (username, password, password_encrypted, full_name, email, role)
         VALUES ($1, $2, $3, $4, $5, 'admin')
         RETURNING id, username, full_name, email, role`,
        [username, hashedPassword, encryptedPassword, fullName, email || null]
      );

      return NextResponse.json({ success: true, user: rows[0] }, { status: 201 });

    } else if (role === 'pic') {
      if (!email) {
        return NextResponse.json(
          { error: 'Email wajib diisi untuk PIC' },
          { status: 400 }
        );
      }
      const { rows: dup } = await client.query(
        'SELECT id FROM pic_users WHERE email = $1',
        [email]
      );
      if (dup.length > 0) {
        return NextResponse.json(
          { error: 'Email sudah digunakan' },
          { status: 409 }
        );
      }

      const { rows } = await client.query(
        `INSERT INTO pic_users (email, password, password_encrypted, full_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, full_name`,
        [email, hashedPassword, encryptedPassword, fullName]
      );

      return NextResponse.json({ success: true, user: rows[0] }, { status: 201 });
    }

    return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });

  } finally {
    client.release();
  }
}

// ── PUT: Edit user ────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const body = await request.json();
    const { id, role, fullName, username, email, isActive, newPassword } = body;

    if (!id || !role) {
      return NextResponse.json(
        { error: 'ID dan role wajib diisi' },
        { status: 400 }
      );
    }

    if (role === 'admin') {
      if (newPassword && newPassword.length < 6) {
        return NextResponse.json(
          { error: 'Password minimal 6 karakter' },
          { status: 400 }
        );
      }

      let query: string;
      let params: unknown[];

      if (newPassword) {
        const hashed = await hashPassword(newPassword);
        const encrypted = encryptPassword(newPassword);
        query = `
          UPDATE users
          SET full_name = $1, username = $2, email = $3, is_active = $4,
              password = $5, password_encrypted = $6, updated_at = NOW()
          WHERE id = $7
          RETURNING id`;
        params = [fullName, username, email, isActive, hashed, encrypted, id];
      } else {
        query = `
          UPDATE users
          SET full_name = $1, username = $2, email = $3, is_active = $4, updated_at = NOW()
          WHERE id = $5
          RETURNING id`;
        params = [fullName, username, email, isActive, id];
      }

      const { rows } = await client.query(query, params);
      if (rows.length === 0) {
        return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
      }

    } else if (role === 'pic') {
      if (newPassword && newPassword.length < 6) {
        return NextResponse.json(
          { error: 'Password minimal 6 karakter' },
          { status: 400 }
        );
      }

      let query: string;
      let params: unknown[];

      if (newPassword) {
        const hashed = await hashPassword(newPassword);
        const encrypted = encryptPassword(newPassword);
        query = `
          UPDATE pic_users
          SET full_name = $1, email = $2, is_active = $3,
              password = $4, password_encrypted = $5, updated_at = NOW()
          WHERE id = $6
          RETURNING id`;
        params = [fullName, email, isActive, hashed, encrypted, id];
      } else {
        query = `
          UPDATE pic_users
          SET full_name = $1, email = $2, is_active = $3, updated_at = NOW()
          WHERE id = $4
          RETURNING id`;
        params = [fullName, email, isActive, id];
      }

      const { rows } = await client.query(query, params);
      if (rows.length === 0) {
        return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
      }
    }

    return NextResponse.json({ success: true });

  } finally {
    client.release();
  }
}

// ── DELETE: Nonaktifkan (soft) ATAU hapus permanen (hard) ─────────────────────
// Body: { id, role, permanent?: boolean }
// permanent tidak diisi / false → perilaku LAMA: nonaktifkan (is_active=false).
// permanent = true                → 🆕 hapus baris dari database, PERMANEN.
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const body = await request.json();
    const { id, role, permanent } = body;

    if (!id || !role) {
      return NextResponse.json(
        { error: 'ID dan role wajib diisi' },
        { status: 400 }
      );
    }
    if (role !== 'admin' && role !== 'pic') {
      return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
    }

    // ── 🆕 Hapus permanen ────────────────────────────────────────────────────
    if (permanent) {
      if (role === 'admin' && id === admin.id) {
        return NextResponse.json(
          { error: 'Tidak dapat menghapus akun sendiri' },
          { status: 400 }
        );
      }

      try {
        const table = role === 'admin' ? 'users' : 'pic_users';
        const { rows } = await client.query(
          `DELETE FROM ${table} WHERE id = $1 RETURNING id`,
          [id]
        );
        if (rows.length === 0) {
          return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
        }
        return NextResponse.json({ success: true, deleted: true });
      } catch (error: any) {
        // Foreign key constraint — user masih direferensikan tabel lain
        // (mis. log aktivitas, request review). Jangan gagal diam-diam,
        // kasih tahu admin supaya pakai Nonaktifkan sebagai gantinya.
        if (error.code === '23503') {
          return NextResponse.json(
            {
              error:
                'User tidak dapat dihapus permanen karena masih terhubung dengan data lain di sistem ' +
                '(mis. log aktivitas atau riwayat request). Gunakan tombol Nonaktifkan sebagai gantinya.',
            },
            { status: 409 }
          );
        }
        throw error;
      }
    }

    // ── Nonaktifkan (perilaku LAMA, tidak berubah) ────────────────────────────
    if (role === 'admin') {
      if (id === admin.id) {
        return NextResponse.json(
          { error: 'Tidak dapat menonaktifkan akun sendiri' },
          { status: 400 }
        );
      }
      await client.query(
        'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
        [id]
      );
    } else {
      await client.query(
        'UPDATE pic_users SET is_active = false, updated_at = NOW() WHERE id = $1',
        [id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/user-management:', error);
    return NextResponse.json({ error: 'Gagal memproses permintaan' }, { status: 500 });
  } finally {
    client.release();
  }
}