import smtplib
import psycopg2
import hashlib
import os
from email.message import EmailMessage
from apscheduler.schedulers.blocking import BlockingScheduler
from datetime import datetime, timedelta
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
# KONFIGURASI EMAIL
# ==============================

EMAIL_SENDER   = "untuksemua0309@gmail.com"
EMAIL_PASSWORD = "cchs eoit qlgs imsx"
SMTP_SERVER    = "smtp.gmail.com"
SMTP_PORT      = 587

APP_URL = "https://postneuralgic-interveinal-robbie.ngrok-free.dev"

# ==============================
# GENERATE OTP
# ==============================

def generate_monthly_otp(pic):
    """
    OTP 6 digit numerik berdasarkan PIC + bulan + tahun.
    Sama untuk satu PIC selama satu bulan penuh.
    """
    now     = datetime.now()
    raw     = f"{pic}-{now.year}-{now.month}"
    hash_hex = hashlib.sha256(raw.encode()).hexdigest()
    hash_int = int(hash_hex, 16)
    otp_num  = hash_int % 1_000_000
    return str(otp_num).zfill(6)

# ==============================
# SIMPAN OTP KE DATABASE
# ==============================

def save_otp_to_db(conn, pic, otp_code, expires_at):
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO pic_otp (pic, otp_code, expires_at)
        VALUES (%s, %s, %s)
    """, (pic, otp_code, expires_at))
    conn.commit()
    cur.close()

# ==============================
# UPDATE STATUS SETELAH TERKIRIM
# ==============================

def mark_emails_sent(conn, nomor_list):
    """
    Setelah email berhasil dikirim ke satu PIC:
    1. Update email_schedules → email_status = 'sent', last_sent_at = NOW()
    2. Update procedure_documents → status = 'Telah terkirim'
       HANYA jika status belum lebih maju (bukan Relevan/Revisi/Obsolete/Telah dibaca)

    Keduanya dalam satu transaction agar konsisten.
    last_sent_at dibutuhkan frontend untuk menghitung batas visibilitas dokumen
    di halaman /review-page-owner/[pic] (expiry = last_sent_at + 2 bulan).
    """
    cur = conn.cursor()
    try:
        # 1. Update jadwal email
        cur.execute("""
            UPDATE email_schedules
            SET
                email_status = 'sent',
                last_sent_at = NOW(),
                updated_at   = NOW()
            WHERE nomor_dokumen = ANY(%s)
        """, (nomor_list,))

        # 2. Update status dokumen ke 'Telah terkirim'
        #    Proteksi: jangan timpa status yang sudah lebih maju
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
# KIRIM EMAIL
# ==============================

def send_email(receiver, pic, dokumen_list, otp_code):
    print(f"[{datetime.now()}] Mengirim email ke {receiver} (PIC: {pic})")

    link = f"{APP_URL}/review-page-owner/{pic}"

    dokumen_text = ""
    for i, doc in enumerate(dokumen_list, 1):
        dokumen_text += f"  {i}. {doc['nama']} ({doc['nomor']})\n"

    msg = EmailMessage()
    msg["Subject"] = "🔐 Reminder Review Prosedur"
    msg["From"]    = EMAIL_SENDER
    msg["To"]      = receiver

    msg.set_content(f"""\
Yth. PIC {pic},

Silakan melakukan review dokumen berikut:

{dokumen_text}
🔐 KODE OTP ANDA: {otp_code}
⏰ Berlaku hingga akhir bulan ini.

Klik link berikut untuk review:
{link}

Cara menggunakan:
  1. Buka link di atas
  2. Masukkan kode OTP
  3. Buka dan review setiap dokumen
  4. Pilih status (Relevan / Revisi / Obsolete)
  5. Klik Selesai

Terima kasih.
""")

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as smtp:
        smtp.starttls()
        smtp.login(EMAIL_SENDER, EMAIL_PASSWORD)
        smtp.send_message(msg)

    print(f"  ✅ Email berhasil dikirim ke {receiver}")

# ==============================
# CEK DAN KIRIM EMAIL
# ==============================

def check_and_send_emails():
    print(f"\n[{datetime.now()}] Memeriksa jadwal email...")

    conn = psycopg2.connect(**DB_CONFIG)
    cur  = conn.cursor()

    # ──────────────────────────────────────────────────────────────────────────
    # QUERY UTAMA
    #
    # Kondisi: email_status = 'pending' DAN scheduled_email_at <= NOW()
    #
    # Tidak ada filter bulan tambahan. Ini mencakup semua kondisi:
    #   - Kondisi 1 (needsReview=true): scheduledAt = waktu buat dokumen → sudah <= NOW
    #   - Kondisi 2 (auto reached):     scheduledAt = NOW saat GET pertama → sudah <= NOW
    #   - Kondisi 3 (auto future):      scheduledAt = tanggal otomatis → diproses saat tiba
    # ──────────────────────────────────────────────────────────────────────────
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

    # ──────────────────────────────────────────────────────────────────────────
    # KELOMPOKKAN BERDASARKAN PIC
    # Satu PIC = satu email berisi semua dokumennya
    # ──────────────────────────────────────────────────────────────────────────
    grouped = defaultdict(list)
    for nomor, sched, nama, pic, email in rows:
        grouped[(pic, email)].append({"nomor": nomor, "nama": nama})

    # ──────────────────────────────────────────────────────────────────────────
    # KIRIM EMAIL PER PIC
    # ──────────────────────────────────────────────────────────────────────────
    for (pic, email), dokumen_list in grouped.items():
        nomor_list = [d["nomor"] for d in dokumen_list]

        print(f"\n  {'='*60}")
        print(f"  📧 PIC  : {pic}")
        print(f"  📬 Email: {email}")
        print(f"  📄 Docs : {len(dokumen_list)}")

        try:
            # Generate OTP bulanan untuk PIC ini
            otp_code = generate_monthly_otp(pic)

            # Simpan OTP ke DB (berlaku sampai akhir bulan)
            now      = datetime.now()
            last_day = datetime(now.year, now.month, 28) + timedelta(days=4)
            last_day = last_day - timedelta(days=last_day.day)
            expires_at = datetime(last_day.year, last_day.month, last_day.day, 23, 59, 59)
            save_otp_to_db(conn, pic, otp_code, expires_at)

            # Kirim email
            send_email(email, pic, dokumen_list, otp_code)

            # Update status di DB (email_schedules + procedure_documents)
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
print(f"Interval  : 2 menit")
print(f"App URL   : {APP_URL}")
print(f"Filter    : scheduled_email_at <= NOW() (tanpa filter bulan tambahan)")
print(f"Mode      : 1 PIC = 1 Email (semua dokumen digabung)")
print("=" * 70)

check_and_send_emails()
scheduler.start()