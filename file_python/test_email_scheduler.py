import smtplib
from email.message import EmailMessage
from apscheduler.schedulers.blocking import BlockingScheduler
from datetime import datetime

# =========================
# KONFIGURASI EMAIL
# =========================
EMAIL_PENGIRIM = "untuksemua0309@gmail.com"
APP_PASSWORD = "cchs eoit qlgs imsx"
EMAIL_TUJUAN = "daniarpriambodo11@gmail.com"

# =========================
# FUNCTION KIRIM EMAIL
# =========================
def kirim_email():
    print(f"[{datetime.now()}] Menjalankan job kirim email...")

    msg = EmailMessage()
    msg["Subject"] = "Test Email dari APScheduler"
    msg["From"] = EMAIL_PENGIRIM
    msg["To"] = EMAIL_TUJUAN
    msg.set_content("Ini adalah email yang dikirim otomatis menggunakan APScheduler.")

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(EMAIL_PENGIRIM, APP_PASSWORD)
        server.send_message(msg)

    print("✅ Email berhasil dikirim!")

# =========================
# SETUP SCHEDULER
# =========================
scheduler = BlockingScheduler()

scheduler.add_job(
    kirim_email,
    trigger="interval",
    minutes=1
)

print("⏰ Scheduler aktif. Menunggu jadwal...")

scheduler.start()
