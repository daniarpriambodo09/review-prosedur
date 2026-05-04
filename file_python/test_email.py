import smtplib
from email.message import EmailMessage

# ======================
# KONFIGURASI EMAIL
# ======================
EMAIL_SENDER = "emailkamu@gmail.com"
EMAIL_PASSWORD = "app_password_kamu"  # gunakan App Password Gmail
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

# ======================
# LIST EMAIL TUJUAN
# ======================
email_list = [
    "daniarpriambodo11@gmail.com",
    "user2@gmail.com",
    "user3@gmail.com"
]

# ======================
# ISI EMAIL
# ======================
subject = "Test Email"
body = """Halo,

Ini adalah email percobaan.

Terima kasih.
"""

# ======================
# LOOP KIRIM EMAIL
# ======================
def send_bulk_email():
    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as smtp:
        smtp.starttls()
        smtp.login(EMAIL_SENDER, EMAIL_PASSWORD)

        for receiver in email_list:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = EMAIL_SENDER
            msg["To"] = receiver
            msg.set_content(body)

            try:
                smtp.send_message(msg)
                print(f"✅ Berhasil kirim ke {receiver}")
            except Exception as e:
                print(f"❌ Gagal kirim ke {receiver}: {e}")

# ======================
# JALANKAN
# ======================
if __name__ == "__main__":
    send_bulk_email()