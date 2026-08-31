// lib/mailer.ts
//
// Helper pengiriman email generik, dipakai oleh alur approval cycle
// (prepared/checked/approved). Konfigurasi SMTP dibaca dari tabel
// smtp_settings, sama seperti yang dipakai app/api/smtp-settings/test/route.ts
// dan scripts/send_email.py — supaya satu sumber konfigurasi untuk semua
// jalur pengiriman email di aplikasi ini.

import nodemailer from 'nodemailer';
import type { PoolClient } from 'pg';

export interface SmtpSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  emailSender: string;
  useTls: boolean;
  useSsl: boolean;
  appUrl: string;
}

/**
 * Pastikan URL punya skema (http:// atau https://) — tanpa ini, link di
 * body email tidak akan dikenali sebagai link oleh sebagian mail client.
 * Default http:// karena aplikasi ini biasanya diakses di jaringan
 * internal tanpa sertifikat SSL.
 */
function ensureScheme(url: string): string {
  const trimmed = (url || '').trim().replace(/\/+$/, '');
  if (!trimmed) return trimmed;
  if (!/^https?:\/\//i.test(trimmed)) return `http://${trimmed}`;
  return trimmed;
}

/**
 * Ambil konfigurasi SMTP aktif dari database. Mengembalikan null jika
 * belum ada konfigurasi tersimpan (admin belum mengisi halaman SMTP Settings).
 */
export async function getActiveSmtpSettings(client: PoolClient): Promise<SmtpSettings | null> {
  const result = await client.query(
    `SELECT smtp_host, smtp_port, smtp_username, smtp_password,
            email_sender, use_tls, use_ssl, app_url
     FROM smtp_settings
     WHERE is_active = TRUE
     ORDER BY updated_at DESC
     LIMIT 1`
  );
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    smtpHost:     row.smtp_host,
    smtpPort:     row.smtp_port,
    smtpUsername: row.smtp_username ?? '',
    smtpPassword: row.smtp_password ?? '',
    emailSender:  row.email_sender,
    useTls:       row.use_tls,
    useSsl:       row.use_ssl,
    appUrl:       ensureScheme(row.app_url || ''),
  };
}

/**
 * Kirim satu email. Melempar error jika gagal — caller bertanggung jawab
 * menangani (mis. mencatat gagal kirim tapi tidak membatalkan proses ACC
 * yang sudah tersimpan di database).
 */
export async function sendMail(
  settings: SmtpSettings,
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const hasAuth = !!(settings.smtpUsername?.trim() && settings.smtpPassword?.trim());

  const transportConfig: any = {
    host:   settings.smtpHost,
    port:   settings.smtpPort,
    secure: settings.useSsl,
  };

  if (hasAuth) {
    transportConfig.auth = {
      user: settings.smtpUsername.trim(),
      pass: settings.smtpPassword.trim(),
    };
  }

  if (settings.useTls && !settings.useSsl) {
    transportConfig.requireTLS = true;
    transportConfig.tls = { rejectUnauthorized: false };
  }
  if (!settings.useSsl && !settings.useTls) {
    // SMTP internal tanpa enkripsi — matikan verifikasi TLS agar tidak error
    transportConfig.tls = { rejectUnauthorized: false };
  }

  const transporter = nodemailer.createTransport(transportConfig);

  await transporter.sendMail({
    from: settings.emailSender,
    to,
    subject,
    text,
    html,
  });
}