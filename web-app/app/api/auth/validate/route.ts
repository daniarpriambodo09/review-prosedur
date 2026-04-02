// app/api/auth/validate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Cek apakah user masih aktif
    const query = `
      SELECT id, username, full_name, email, role, is_active 
      FROM users 
      WHERE username = $1
    `;
    
    const result = await client.query(query, [username]);

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return NextResponse.json(
        { valid: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        fullName: result.rows[0].full_name,
        email: result.rows[0].email,
        role: result.rows[0].role,
      }
    });
  } catch (error) {
    console.error('Error validating session:', error);
    return NextResponse.json(
      { valid: false },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}