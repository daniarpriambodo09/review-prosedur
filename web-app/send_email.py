"""
Email Scheduler - Procedure Management System
Mengirim reminder review dokumen secara terjadwal via SMTP.
"""

import html
import io
import smtplib
import ssl
import sys
import psycopg2
from email.message import EmailMessage
from email.utils import make_msgid, formatdate
from apscheduler.schedulers.blocking import BlockingScheduler
from datetime import datetime
from collections import defaultdict
from urllib.parse import quote

# ── Fix encoding Windows (PM2 / cp1252) ────────────────────────────────────
if sys.stdout and hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
if sys.stderr and hasattr(sys.stderr, "buffer"):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

DB_CONFIG = {
    "dbname":   "procedure_management",
    "user":     "postgres",
    "password": "12345678",
    "host":     "localhost",
    "port":     "5432",
}

def log(level: str, message: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{level}] {ts} - {message}", flush=True)

def log_info(msg: str)  -> None: log("INFO",  msg)
def log_error(msg: str) -> None: log("ERROR", msg)
def log_warn(msg: str)  -> None: log("WARN",  msg)

def _ensure_scheme(url: str) -> str:
    """
    Tanpa skema (http:// atau https://), sebagian besar mail client TIDAK
    akan menganggap teks tersebut sebagai link -> tampil sebagai teks biasa.
    """
    url = (url or "").strip()
    if not url:
        return url
    # FIX: sebelumnya ("http://", "http://") -> https:// tidak pernah
    # terdeteksi, sehingga URL yang sudah https:// ditimpa jadi
    # "http://https://..." (rusak).
    # Default http:// (bukan https://) karena app ini diakses di jaringan
    # internal tanpa sertifikat SSL -> https:// akan error di sisi client.
    if not url.lower().startswith(("http://", "https://")):
        url = "http://" + url
    return url

def load_smtp_settings() -> dict | None:
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur  = conn.cursor()
        cur.execute("""
            SELECT smtp_host, smtp_port, smtp_username, smtp_password,
                   email_sender, use_tls, use_ssl, app_url
            FROM smtp_settings
            WHERE is_active = TRUE
            ORDER BY updated_at DESC
            LIMIT 1
        """)
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            return None

        settings = {
            "smtp_host":     row[0],
            "smtp_port":     row[1],
            "smtp_username": row[2],
            "smtp_password": row[3],
            "email_sender":  row[4],
            "use_tls":       row[5],
            "use_ssl":       row[6],
            "app_url":       row[7],
        }

        username = settings["smtp_username"]
        sender   = settings["email_sender"]
        if username and sender and username.strip().lower() != sender.strip().lower():
            log_warn(
                f"email_sender ('{sender}') berbeda dari smtp_username ('{username}'). "
                f"Ini sering menyebabkan email masuk Spam karena SPF/DKIM tidak selaras."
            )

        return settings

    except Exception as e:
        log_error(f"Gagal membaca konfigurasi SMTP dari database: {e}")
        return None

def mark_emails_sent(conn, nomor_list: list) -> None:
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE email_schedules
            SET email_status = 'sent', last_sent_at = NOW(), updated_at = NOW()
            WHERE nomor_dokumen = ANY(%s)
        """, (nomor_list,))
        cur.execute("""
            UPDATE procedure_documents
            SET status = 'Telah terkirim', updated_at = NOW()
            WHERE nomor_dokumen = ANY(%s)
              AND status NOT IN ('Relevan', 'Revisi', 'Obsolete', 'Telah dibaca')
        """, (nomor_list,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()

def mark_emails_failed(conn, nomor_list: list, error_msg: str) -> None:
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE email_schedules
            SET email_status = 'failed', error_message = %s,
                retry_count = retry_count + 1, updated_at = NOW()
            WHERE nomor_dokumen = ANY(%s)
        """, (str(error_msg)[:500], nomor_list))
        conn.commit()
    except Exception:
        conn.rollback()
    finally:
        cur.close()

def _build_html_body(pic: str, dokumen_list: list, review_link: str) -> str:
    rows_html = ""
    for i, doc in enumerate(dokumen_list, 1):
        bg = "#f9f9f9" if i % 2 == 0 else "#ffffff"
        nama_safe  = html.escape(str(doc["nama"]))
        nomor_safe = html.escape(str(doc["nomor"]))
        rows_html += (
            f'<tr style="background-color:{bg};">'
            f'<td style="padding:10px 14px;border-bottom:1px solid #e8e8e8;'
            f'color:#555;font-size:13px;">{i}</td>'
            f'<td style="padding:10px 14px;border-bottom:1px solid #e8e8e8;'
            f'color:#333;font-size:13px;">{nama_safe}</td>'
            f'<td style="padding:10px 14px;border-bottom:1px solid #e8e8e8;'
            f'color:#666;font-size:13px;">{nomor_safe}</td>'
            f'</tr>'
        )

    pic_safe         = html.escape(str(pic))
    review_link_safe = html.escape(review_link, quote=True)

    html_out = f"""\
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Reminder Review Prosedur</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"
         style="background-color:#f4f6f8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background-color:#ffffff;border-radius:8px;
                      box-shadow:0 2px 8px rgba(0,0,0,0.08);
                      max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#1a56db;padding:28px 32px;
                       border-radius:8px 8px 0 0;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;
                         font-weight:700;letter-spacing:0.3px;">
                Reminder Review Prosedur
              </h1>
              <p style="margin:6px 0 0;color:#c7d9ff;font-size:13px;">
                Procedure Management System
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">
                Dear. PIC Review Prosedur,
              </p>
              <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;">
                Terdapat dokumen prosedur yang perlu Anda review.
                Mohon segera tinjau dokumen berikut:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border:1px solid #e0e0e0;border-radius:6px;
                            border-collapse:collapse;margin-bottom:28px;">
                <thead>
                  <tr style="background-color:#f0f4ff;">
                    <th style="padding:10px 14px;text-align:left;color:#444;s
                               font-size:13px;font-weight:700;border-bottom:2px solid #d0d8f0;
                               width:36px;">#</th>
                    <th style="padding:10px 14px;text-align:left;color:#444;
                               font-size:13px;font-weight:700;border-bottom:2px solid #d0d8f0;">
                      Nama Dokumen</th>
                    <th style="padding:10px 14px;text-align:left;color:#444;
                               font-size:13px;font-weight:700;border-bottom:2px solid #d0d8f0;">
                      Nomor</th>
                  </tr>
                </thead>
                <tbody>
                  {rows_html}
                </tbody>
              </table>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td align="center"
                      style="background-color:#1a56db;border-radius:6px;">
                    <a href="{review_link_safe}"
                       target="_blank"
                       rel="noopener noreferrer"
                       style="display:inline-block;padding:13px 32px;
                              color:#ffffff;font-size:15px;font-weight:700;
                              text-decoration:none;letter-spacing:0.3px;">
                      Review Dokumen
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#888;font-size:12px;
                        text-align:center;">
                Apabila tombol tidak dapat diklik, gunakan link berikut:
              </p>
              <p style="margin:0 0 24px;text-align:center;word-break:break-all;">
                <a href="{review_link_safe}"
                   target="_blank"
                   rel="noopener noreferrer"
                   style="color:#1a56db;font-size:12px;text-decoration:underline;">
                  {review_link_safe}
                </a>
              </p>
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background-color:#f8f9ff;border-left:4px solid #1a56db;
                            border-radius:4px;margin-bottom:8px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 8px;color:#333;font-size:13px;font-weight:700;">
                      Cara menggunakan:
                    </p>
                    <ol style="margin:0;padding-left:18px;color:#555;font-size:13px;
                               line-height:1.8;">
                      <li>Login ke sistem menggunakan akun Anda.</li>
                      <li>Klik tombol <em>Review Dokumen Saya</em>.</li>
                      <li>Periksa dan berikan status pada setiap dokumen.</li>
                    </ol>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:18px 32px;
                       border-top:1px solid #e8e8e8;border-radius:0 0 8px 8px;">
              <p style="margin:0;color:#aaa;font-size:12px;text-align:center;
                        line-height:1.6;">
                Email ini dikirim secara otomatis oleh
                <strong style="color:#888;">Procedure Management System</strong>.<br>
                Mohon tidak membalas email ini.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    return html_out


def _build_plain_body(pic: str, dokumen_list: list, review_link: str) -> str:
    lines = [
        f"Dear. PIC Review Prosedur{pic},",
        "",
        "Terdapat dokumen prosedur yang perlu Anda review:",
        "",
    ]
    for i, doc in enumerate(dokumen_list, 1):
        lines.append(f"  {i}. {doc['nama']} ({doc['nomor']})")
    lines += [
        "",
        "Silakan akses melalui link berikut:",
        review_link,
        "",
        "Cara penggunaan:",
        "1. Login ke sistem menggunakan akun Anda.",
        "2. Klik tombol Review Dokumen Saya.",
        "3. Periksa dan berikan status pada setiap dokumen.",
        "",
        "Terima kasih.",
        "Procedure Management System",
    ]
    return "\n".join(lines)

def send_email(smtp_cfg: dict, receiver: str, pic: str, dokumen_list: list) -> None:
    smtp_host    = smtp_cfg["smtp_host"]
    smtp_port    = smtp_cfg["smtp_port"]
    email_sender = smtp_cfg["email_sender"]
    app_url      = _ensure_scheme(smtp_cfg["app_url"].rstrip("/"))
    use_tls      = smtp_cfg["use_tls"]
    use_ssl      = smtp_cfg["use_ssl"]
    username     = smtp_cfg["smtp_username"]
    password     = smtp_cfg["smtp_password"]
    has_auth     = bool(username and password)

    review_link = f"{app_url}/review-prosedur/review-page-owner/{quote(str(pic), safe='')}"

    log_info(
        f"Sending email to {receiver} (PIC: {pic}) | "
        f"SMTP: {smtp_host}:{smtp_port} | TLS={use_tls} | SSL={use_ssl} | Auth={has_auth}"
    )

    sender_domain = email_sender.split("@")[-1] if "@" in email_sender else smtp_host

    msg = EmailMessage()
    msg["Subject"]    = "Reminder Review Prosedur"
    msg["From"]       = email_sender
    msg["To"]         = receiver
    msg["Date"]       = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain=sender_domain)
    msg["Reply-To"] = email_sender
    # List-Unsubscribe SENGAJA TIDAK dipakai: header ini adalah sinyal kuat
    # bagi Gmail bahwa email adalah "bulk mail" (newsletter/marketing),
    # yang membuat Gmail berpotensi men-skip Inbox meski bukan Spam
    # (mail tetap ada, tapi cuma muncul di "Semua Email"). Karena email ini
    # adalah reminder internal (bukan bulk marketing), header ini dihapus.

    plain_body = _build_plain_body(pic, dokumen_list, review_link)
    html_body  = _build_html_body(pic, dokumen_list, review_link)

    msg.set_content(plain_body)
    msg.add_alternative(html_body, subtype="html")

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode    = ssl.CERT_NONE

    if use_ssl:
        with smtplib.SMTP_SSL(smtp_host, smtp_port, context=ssl_ctx) as smtp:
            if has_auth:
                smtp.login(username, password)
            smtp.send_message(msg)
    elif use_tls:
        with smtplib.SMTP(smtp_host, smtp_port) as smtp:
            smtp.ehlo()
            smtp.starttls(context=ssl_ctx)
            smtp.ehlo()
            if has_auth:
                smtp.login(username, password)
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(smtp_host, smtp_port) as smtp:
            if has_auth:
                smtp.login(username, password)
            smtp.send_message(msg)

    log_info(f"Email successfully sent to {receiver}")

def check_and_send_emails() -> None:
    log_info("Checking email schedules...")

    smtp_cfg = load_smtp_settings()
    if smtp_cfg is None:
        log_warn("SMTP configuration not found in database.")
        log_warn("Open admin panel > SMTP Settings and save a configuration.")
        log_warn("Scheduler is still running and will retry on next interval.")
        return

    log_info(f"SMTP loaded: {smtp_cfg['smtp_host']}:{smtp_cfg['smtp_port']}")

    try:
        conn = psycopg2.connect(**DB_CONFIG)
    except Exception as e:
        log_error(f"Cannot connect to database: {e}")
        return

    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT
                es.nomor_dokumen,
                es.scheduled_email_at,
                pd.nama_dokumen,
                pd.pic,
                pd.email
            FROM email_schedules es
            JOIN procedure_documents pd
              ON es.nomor_dokumen = pd.nomor_dokumen
            WHERE es.email_status = 'pending'
              AND es.scheduled_email_at <= NOW()
              AND pd.email IS NOT NULL
              AND pd.email != ''
            ORDER BY es.scheduled_email_at ASC
        """)
        rows = cur.fetchall()
    except Exception as e:
        log_error(f"Failed to fetch pending emails: {e}")
        cur.close()
        conn.close()
        return
    finally:
        cur.close()

    log_info(f"Found {len(rows)} document(s) pending delivery")

    if not rows:
        conn.close()
        return

    grouped: dict = defaultdict(list)
    for nomor, sched, nama, pic, email in rows:
        grouped[(pic, email)].append({"nomor": nomor, "nama": nama})

    for (pic, email), dokumen_list in grouped.items():
        nomor_list = [d["nomor"] for d in dokumen_list]

        log_info(
            f"Processing PIC={pic} | email={email} | docs={len(dokumen_list)}"
        )

        try:
            send_email(smtp_cfg, email, pic, dokumen_list)
            mark_emails_sent(conn, nomor_list)
            log_info(f"Completed for PIC: {pic}")

        except smtplib.SMTPAuthenticationError as e:
            log_error(f"SMTP authentication failed for {email}: {e}")
            try:
                mark_emails_failed(conn, nomor_list, str(e))
            except Exception as e2:
                log_error(f"Failed to update status (failed) for {pic}: {e2}")

        except (smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected,
                ConnectionRefusedError, OSError) as e:
            log_error(f"Cannot connect to SMTP server for {email}: {e}")
            try:
                mark_emails_failed(conn, nomor_list, str(e))
            except Exception as e2:
                log_error(f"Failed to update status (failed) for {pic}: {e2}")

        except Exception as e:
            log_error(f"Failed to send email for PIC {pic}: {e}")
            try:
                mark_emails_failed(conn, nomor_list, str(e))
            except Exception as e2:
                log_error(f"Failed to update status (failed) for {pic}: {e2}")

    conn.close()
    log_info("Email check cycle completed.")

print("=" * 70)
print("EMAIL SCHEDULER - PROCEDURE MANAGEMENT SYSTEM")
print(f"SMTP source  : database (table smtp_settings)")
print(f"Interval     : 2 minutes")
print(f"Database     : {DB_CONFIG['dbname']} @ {DB_CONFIG['host']}")
print(f"Started at   : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 70)

check_and_send_emails()

scheduler = BlockingScheduler()
scheduler.add_job(
    check_and_send_emails,
    "interval",
    minutes=2,
)

log_info("Scheduler started. Press Ctrl+C to stop.")
scheduler.start()