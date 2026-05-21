// app/api/pic/profile/update-name/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PATCH(request: NextRequest) {
  const client = await pool.connect();

  try {
    const picId    = request.headers.get('x-pic-id');
    const picEmail = request.headers.get('x-pic-email');

    if (!picId || !picEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fullName } = await request.json();

    if (!fullName || fullName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nama lengkap tidak boleh kosong' },
        { status: 400 }
      );
    }

    if (fullName.trim().length > 200) {
      return NextResponse.json(
        { error: 'Nama terlalu panjang (maks 200 karakter)' },
        { status: 400 }
      );
    }

    const { rows } = await client.query(
      `UPDATE pic_users
          SET full_name = $1, updated_at = NOW()
        WHERE id = $2 AND email = $3
        RETURNING full_name`,
      [fullName.trim(), picId, picEmail]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      success:  true,
      message:  'Nama berhasil diperbarui',
      fullName: rows[0].full_name,
    });

  } catch (error) {
    console.error('update-name error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}