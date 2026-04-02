// app/api/otp/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateMonthlyOTP } from '@/lib/otpGenerator';

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { pic, otp } = body;

    if (!pic || !otp) {
      return NextResponse.json(
        { error: 'PIC and OTP are required' },
        { status: 400 }
      );
    }

    // Validasi format OTP
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: 'OTP must be 6 digits' },
        { status: 400 }
      );
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // Cek di database
    const query = `
      SELECT id
      FROM pic_otp
      WHERE pic = $1 
      AND otp_code = $2 
      AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await client.query(query, [
      pic.toUpperCase(),
      otp
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { valid: false, message: 'OTP tidak valid atau sudah expired' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      message: 'OTP verified successfully',
      pic: pic.toUpperCase(),
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}