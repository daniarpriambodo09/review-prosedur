import smtplib
import ssl
import psycopg2
from email.message import EmailMessage
from apscheduler.schedulers.blocking import BlockingScheduler
from datetime import datetime
from collections import defaultdict

# ==============================
# KONFIGURASI DATABASE
# ==============================

DB_CONFIG = {
    "dbname": "procedure_management",
    "user": "postgres",
    "password": "J41pens123",
    "host": "localhost",
    "port": "5432"
}

# ==============================
# LOAD KONFIGURASI SMTP DARI DB
# ==============================

def load_smtp_settings():
    """
    Ambil konfigurasi SMTP aktif dari tabel smtp_settings.
    Return dict berisi semua field, atau None jika tidak ada.
    """
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

        return {
            "smtp_host":     row[0],
            "smtp_port":     row[1],
            "smtp_username": row[2],   # bisa None
            "smtp_password": row[3],   # bisa None
            "email_sender":  row[4],
            "use_tls":       row[5],
            "use_ssl":       row[6],
            "app_url":       row[7],
        }

    except Exception as e:
        print(f"  ❌ Gagal membaca konfigurasi SMTP dari database: {e}")
        return None

# ==============================
# UPDATE STATUS SETELAH TERKIRIM
# ==============================

def mark_emails_sent(conn, nomor_list):
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE email_schedules
            SET
                email_status = 'sent',
                last_sent_at = NOW(),
                updated_at   = NOW()
            WHERE nomor_dokumen = ANY(%s)
        """, (nomor_list,))

        cur.execute("""
            UPDATE procedure_documents
            SET
                status     = 'Telah terkirim',
                updated_at = NOW()
            WHERE nomor_dokumen = ANY(%s)
              AND status NOT IN ('Relevan', 'Revisi', 'Obsolete', 'Telah dibaca')
        """, (nomor_list,))

        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()

# ==============================
# TANDAI GAGAL
# ==============================

def mark_emails_failed(conn, nomor_list, error_msg):
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE email_schedules
            SET
                email_status  = 'failed',
                error_message = %s,
                retry_count   = retry_count + 1,
                updated_at    = NOW()
            WHERE nomor_dokumen = ANY(%s)
        """, (str(error_msg)[:500], nomor_list))
        conn.commit()
    except Exception:
        conn.rollback()
    finally:
        cur.close()

# ==============================
# KIRIM EMAIL (UPDATED)
# ==============================

def send_email(smtp_cfg, receiver, pic, dokumen_list):
    """
    Kirim email menggunakan konfigurasi SMTP dari database.
    Mendukung: plain (tanpa login), login biasa, TLS (STARTTLS), SSL.
    """
    smtp_host    = smtp_cfg["smtp_host"]
    smtp_port    = smtp_cfg["smtp_port"]
    email_sender = smtp_cfg["email_sender"]
    app_url      = smtp_cfg["app_url"]
    use_tls      = smtp_cfg["use_tls"]
    use_ssl      = smtp_cfg["use_ssl"]
    username     = smtp_cfg["smtp_username"]
    password     = smtp_cfg["smtp_password"]
    has_auth     = bool(username and password)

    print(f"[{datetime.now()}] Mengirim email ke {receiver} (PIC: {pic})")
    print(f"  📡 SMTP: {smtp_host}:{smtp_port} | TLS={use_tls} | SSL={use_ssl} | Auth={has_auth}")

    link = f"{app_url}/review-page-owner/{pic}"

    dokumen_text = ""
    for i, doc in enumerate(dokumen_list, 1):
        dokumen_text += f"{i}. {doc['nama']} ({doc['nomor']})\n"

    msg = EmailMessage()
    msg["Subject"] = "Reminder Review Prosedur"
    msg["From"]    = email_sender
    msg["To"]      = receiver
    msg.set_content(f"""\
Yth. PIC {pic},

Terdapat dokumen prosedur yang perlu Anda review:

{dokumen_text}
Silakan akses melalui link berikut:
{link}

Cara penggunaan:
1. Login ke sistem
2. Klik tombol "Review Dokumen Saya"

Terima kasih.
""")

    # ── Pilih metode pengiriman ─────────────────────────────────────────────
    if use_ssl:
        # Koneksi SSL penuh (port 465)
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode    = ssl.CERT_NONE
        with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context) as smtp:
            if has_auth:
                smtp.login(username, password)
            smtp.send_message(msg)

    elif use_tls:
        # STARTTLS (port 587)
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode    = ssl.CERT_NONE
        with smtplib.SMTP(smtp_host, smtp_port) as smtp:
            smtp.ehlo()
            smtp.starttls(context=context)
            smtp.ehlo()
            if has_auth:
                smtp.login(username, password)
            smtp.send_message(msg)

    else:
        # Plain SMTP tanpa enkripsi — cocok untuk SMTP internal
        with smtplib.SMTP(smtp_host, smtp_port) as smtp:
            if has_auth:
                smtp.login(username, password)
            smtp.send_message(msg)

    print(f"  ✅ Email berhasil dikirim ke {receiver}")

# ==============================
# CEK DAN KIRIM EMAIL
# ==============================

def check_and_send_emails():
    print(f"\n[{datetime.now()}] Memeriksa jadwal email...")

    # ── 1. Load konfigurasi SMTP dari database ──────────────────────────────
    smtp_cfg = load_smtp_settings()

    if smtp_cfg is None:
        print("  ⚠️  Konfigurasi SMTP belum tersedia di database.")
        print("       Buka halaman admin → Pengaturan SMTP dan simpan konfigurasi.")
        print("       Scheduler tetap berjalan dan akan mencoba kembali pada interval berikutnya.")
        return

    print(f"  ✅ Konfigurasi SMTP aktif: {smtp_cfg['smtp_host']}:{smtp_cfg['smtp_port']}")

    # ── 2. Ambil daftar email yang perlu dikirim ────────────────────────────
    conn = psycopg2.connect(**DB_CONFIG)
    cur  = conn.cursor()

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
    cur.close()

    print(f"  Ditemukan {len(rows)} dokumen yang perlu dikirim")

    if not rows:
        conn.close()
        return

    # ── 3. Grup per PIC ─────────────────────────────────────────────────────
    grouped = defaultdict(list)
    for nomor, sched, nama, pic, email in rows:
        grouped[(pic, email)].append({"nomor": nomor, "nama": nama})

    # ── 4. Kirim satu per PIC ───────────────────────────────────────────────
    for (pic, email), dokumen_list in grouped.items():
        nomor_list = [d["nomor"] for d in dokumen_list]

        print(f"\n  {'='*60}")
        print(f"  📧 PIC  : {pic}")
        print(f"  📬 Email: {email}")
        print(f"  📄 Docs : {len(dokumen_list)}")

        try:
            send_email(smtp_cfg, email, pic, dokumen_list)
            mark_emails_sent(conn, nomor_list)
            print(f"  ✅ Selesai untuk {pic}")

        except Exception as e:
            print(f"  ❌ Gagal untuk {pic}: {e}")
            try:
                mark_emails_failed(conn, nomor_list, str(e))
            except Exception as e2:
                print(f"  ❌ Gagal update status failed: {e2}")

    conn.close()
    print(f"\n[{datetime.now()}] Selesai.")

# ==============================
# SCHEDULER
# ==============================

scheduler = BlockingScheduler()

scheduler.add_job(
    check_and_send_emails,
    "interval",
    minutes=2
)

# ==============================
# START
# ==============================

print("=" * 70)
print("EMAIL SCHEDULER AKTIF")
print(f"Konfigurasi SMTP: dibaca dari database (tabel smtp_settings)")
print(f"Interval        : 2 menit")
print(f"Database        : {DB_CONFIG['dbname']} @ {DB_CONFIG['host']}")
print("=" * 70)

check_and_send_emails()
scheduler.start()