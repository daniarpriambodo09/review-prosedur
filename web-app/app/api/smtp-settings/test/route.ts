// app/api/smtp-settings/test/route.ts
//
// Endpoint: POST /api/smtp-settings/test
// Test koneksi ke SMTP server menggunakan konfigurasi yang diberikan.
// Menggunakan Nodemailer di sisi server.

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      smtpHost,
      smtpPort,
      smtpUsername,
      smtpPassword,
      emailSender,
      useTls,
      useSsl,
    } = body;

    if (!smtpHost || !smtpPort || !emailSender) {
      return NextResponse.json(
        { success: false, message: 'Host, port, dan email pengirim wajib diisi sebelum test' },
        { status: 400 }
      );
    }

    // Build transporter config
    const transportConfig: any = {
      host:   smtpHost.trim(),
      port:   parseInt(smtpPort),
      secure: Boolean(useSsl), // true = SSL (port 465), false = STARTTLS atau plain
    };

    const hasCredentials =
      smtpUsername && smtpUsername.trim().length > 0 &&
      smtpPassword && smtpPassword.trim().length > 0;

    if (hasCredentials) {
      transportConfig.auth = {
        user: smtpUsername.trim(),
        pass: smtpPassword.trim(),
      };
    } else {
      // SMTP internal tanpa autentikasi
      transportConfig.auth = false;
    }

    if (useTls && !useSsl) {
      transportConfig.requireTLS = true;
      transportConfig.tls = { rejectUnauthorized: false };
    }

    if (!useSsl && !useTls) {
      // Plain SMTP internal — matikan TLS agar tidak error
      transportConfig.tls = { rejectUnauthorized: false };
    }

    // Set timeout singkat untuk test
    transportConfig.connectionTimeout = 8000;
    transportConfig.greetingTimeout   = 5000;
    transportConfig.socketTimeout     = 10000;

    const transporter = nodemailer.createTransport(transportConfig);

    // Verifikasi koneksi
    await transporter.verify();

    return NextResponse.json({
      success: true,
      message: `Koneksi ke ${smtpHost}:${smtpPort} berhasil. SMTP server siap digunakan.`,
    });
  } catch (error: any) {
    console.error('SMTP test error:', error);

    let message = 'Koneksi SMTP gagal.';

    if (error.code === 'ECONNREFUSED') {
      message = `Koneksi ditolak oleh ${error.address || 'host'}:${error.port || 'port'}. Pastikan SMTP server aktif dan port benar.`;
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
      message = 'Koneksi timeout. Periksa host, port, dan firewall.';
    } else if (error.code === 'ENOTFOUND') {
      message = 'Host tidak ditemukan. Periksa kembali SMTP Host.';
    } else if (error.responseCode === 535 || error.responseCode === 534) {
      message = 'Autentikasi gagal. Periksa username dan password.';
    } else if (error.message) {
      message = `Error: ${error.message}`;
    }

    return NextResponse.json({ success: false, message }, { status: 200 });
    // Status 200 agar frontend bisa baca body response-nya
  }
}