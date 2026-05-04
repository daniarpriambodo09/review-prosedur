import smtplib
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
    "password": "12345678",
    "host": "localhost",
    "port": "5432"
}

# ==============================
# KONFIGURASI EMAIL (SMTP INTERNAL)
# ==============================

SMTP_SERVER = "IP_SMTP_KAMU"   # contoh: 192.168.1.10
SMTP_PORT   = 25

EMAIL_SENDER = "noreply.pens@jai.co.id"
APP_URL = "10.62.230.51"

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

def send_email(receiver, pic, dokumen_list):
    print(f"[{datetime.now()}] Mengirim email ke {receiver} (PIC: {pic})")

    link = f"{APP_URL}/review-page-owner/{pic}"

    dokumen_text = ""
    for i, doc in enumerate(dokumen_list, 1):
        dokumen_text += f"{i}. {doc['nama']} ({doc['nomor']})\n"

    msg = EmailMessage()
    msg["Subject"] = "Reminder Review Prosedur"
    msg["From"]    = EMAIL_SENDER
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

    # SMTP INTERNAL TANPA LOGIN
    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as smtp:
        smtp.send_message(msg)

    print(f"  ✅ Email berhasil dikirim ke {receiver}")

# ==============================
# CEK DAN KIRIM EMAIL
# ==============================

def check_and_send_emails():
    print(f"\n[{datetime.now()}] Memeriksa jadwal email...")

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

    grouped = defaultdict(list)
    for nomor, sched, nama, pic, email in rows:
        grouped[(pic, email)].append({"nomor": nomor, "nama": nama})

    for (pic, email), dokumen_list in grouped.items():
        nomor_list = [d["nomor"] for d in dokumen_list]

        print(f"\n  {'='*60}")
        print(f"  📧 PIC  : {pic}")
        print(f"  📬 Email: {email}")
        print(f"  📄 Docs : {len(dokumen_list)}")

        try:
            send_email(email, pic, dokumen_list)
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
print(f"Pengirim  : {EMAIL_SENDER}")
print(f"SMTP      : {SMTP_SERVER}:{SMTP_PORT}")
print(f"Interval  : 2 menit")
print(f"App URL   : {APP_URL}")
print("=" * 70)

check_and_send_emails()
scheduler.start()