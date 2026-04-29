import smtplib
from email.message import EmailMessage

SMTP_SERVER = "10.62.231.17"
SMTP_PORT = 25

msg = EmailMessage()
msg["Subject"] = "Test SMTP Relay"
msg["From"] = "daniarpriambodo11@gmail.com"
msg["To"] = "untuksemua0309@gmail.com"
msg.set_content("Test email dari SMTP relay")

try:
    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as smtp:
        smtp.ehlo()

        # ❗ TANPA login
        smtp.send_message(msg)

    print("✅ EMAIL BERHASIL DIKIRIM (RELAY)")

except Exception as e:
    print("❌ GAGAL:", e)