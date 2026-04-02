// app/api/auth/register/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { username, password, fullName, email, role = 'admin' } = body;

    // Validasi input
    if (!username || !password || !fullName) {
      return NextResponse.json(
        { error: 'Username, password, dan nama lengkap harus diisi' },
        { status: 400 }
      );
    }

    // Cek apakah username sudah ada
    const checkQuery = 'SELECT id FROM users WHERE username = $1';
    const checkResult = await client.query(checkQuery, [username]);

    if (checkResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Username sudah digunakan' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert user baru
    const insertQuery = `
      INSERT INTO users (username, password, full_name, email, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, full_name, email, role
    `;

    const result = await client.query(insertQuery, [
      username,
      hashedPassword,
      fullName,
      email || null,
      role
    ]);

    return NextResponse.json({
      success: true,
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        fullName: result.rows[0].full_name,
        email: result.rows[0].email,
        role: result.rows[0].role,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat user' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}