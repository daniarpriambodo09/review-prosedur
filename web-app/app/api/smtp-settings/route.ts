// app/api/smtp-settings/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// ── Validasi payload ──────────────────────────────────────────────────────────
function validatePayload(body: any): string | null {
  if (!body.smtpHost || typeof body.smtpHost !== 'string' || !body.smtpHost.trim()) {
    return 'SMTP Host wajib diisi';
  }
  const port = parseInt(body.smtpPort);
  if (isNaN(port) || port < 1 || port > 65535) {
    return 'SMTP Port harus berupa angka antara 1–65535';
  }
  if (!body.emailSender || typeof body.emailSender !== 'string') {
    return 'Email pengirim wajib diisi';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.emailSender.trim())) {
    return 'Format email pengirim tidak valid';
  }
  if (body.useTls && body.useSsl) {
    return 'TLS dan SSL tidak boleh aktif bersamaan';
  }
  if (!body.appUrl || typeof body.appUrl !== 'string' || !body.appUrl.trim()) {
    return 'App URL wajib diisi';
  }
  return null;
}

// ── GET — ambil konfigurasi aktif ─────────────────────────────────────────────
export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, smtp_host, smtp_port, smtp_username, smtp_password,
              email_sender, use_tls, use_ssl, app_url, is_active,
              created_at, updated_at
       FROM smtp_settings
       ORDER BY is_active DESC, updated_at DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ data: null }, { status: 200 });
    }

    const row = result.rows[0];
    return NextResponse.json({
      data: {
        id:           row.id,
        smtpHost:     row.smtp_host,
        smtpPort:     row.smtp_port,
        smtpUsername: row.smtp_username ?? '',
        smtpPassword: row.smtp_password ?? '',
        emailSender:  row.email_sender,
        useTls:       row.use_tls,
        useSsl:       row.use_ssl,
        appUrl:       row.app_url,
        isActive:     row.is_active,
        createdAt:    row.created_at,
        updatedAt:    row.updated_at,
      },
    });
  } catch (error) {
    console.error('Error fetching smtp_settings:', error);
    return NextResponse.json({ error: 'Gagal mengambil konfigurasi SMTP' }, { status: 500 });
  } finally {
    client.release();
  }
}

// ── POST — buat konfigurasi baru (mengganti yang lama jika ada) ───────────────
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const err  = validatePayload(body);
    if (err) return NextResponse.json({ error: err }, { status: 400 });

    await client.query('BEGIN');

    // Non-aktifkan semua yang lama
    await client.query(
      `UPDATE smtp_settings SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP`
    );

    const result = await client.query(
      `INSERT INTO smtp_settings
         (smtp_host, smtp_port, smtp_username, smtp_password,
          email_sender, use_tls, use_ssl, app_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
       RETURNING *`,
      [
        body.smtpHost.trim(),
        parseInt(body.smtpPort),
        body.smtpUsername?.trim() || null,
        body.smtpPassword?.trim() || null,
        body.emailSender.trim(),
        Boolean(body.useTls),
        Boolean(body.useSsl),
        body.appUrl.trim(),
      ]
    );

    await client.query('COMMIT');

    const row = result.rows[0];
    return NextResponse.json(
      {
        success: true,
        data: {
          id:           row.id,
          smtpHost:     row.smtp_host,
          smtpPort:     row.smtp_port,
          smtpUsername: row.smtp_username ?? '',
          smtpPassword: row.smtp_password ?? '',
          emailSender:  row.email_sender,
          useTls:       row.use_tls,
          useSsl:       row.use_ssl,
          appUrl:       row.app_url,
          isActive:     row.is_active,
          createdAt:    row.created_at,
          updatedAt:    row.updated_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error creating smtp_settings:', error);
    return NextResponse.json({ error: 'Gagal menyimpan konfigurasi SMTP' }, { status: 500 });
  } finally {
    client.release();
  }
}

// ── PUT — update konfigurasi berdasarkan id ───────────────────────────────────
export async function PUT(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'ID wajib disertakan' }, { status: 400 });

    const err = validatePayload(body);
    if (err) return NextResponse.json({ error: err }, { status: 400 });

    const result = await client.query(
      `UPDATE smtp_settings
       SET smtp_host     = $1,
           smtp_port     = $2,
           smtp_username = $3,
           smtp_password = $4,
           email_sender  = $5,
           use_tls       = $6,
           use_ssl       = $7,
           app_url       = $8,
           updated_at    = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [
        body.smtpHost.trim(),
        parseInt(body.smtpPort),
        body.smtpUsername?.trim() || null,
        body.smtpPassword?.trim() || null,
        body.emailSender.trim(),
        Boolean(body.useTls),
        Boolean(body.useSsl),
        body.appUrl.trim(),
        body.id,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Konfigurasi tidak ditemukan' }, { status: 404 });
    }

    const row = result.rows[0];
    return NextResponse.json({
      success: true,
      data: {
        id:           row.id,
        smtpHost:     row.smtp_host,
        smtpPort:     row.smtp_port,
        smtpUsername: row.smtp_username ?? '',
        smtpPassword: row.smtp_password ?? '',
        emailSender:  row.email_sender,
        useTls:       row.use_tls,
        useSsl:       row.use_ssl,
        appUrl:       row.app_url,
        isActive:     row.is_active,
        createdAt:    row.created_at,
        updatedAt:    row.updated_at,
      },
    });
  } catch (error) {
    console.error('Error updating smtp_settings:', error);
    return NextResponse.json({ error: 'Gagal memperbarui konfigurasi SMTP' }, { status: 500 });
  } finally {
    client.release();
  }
}