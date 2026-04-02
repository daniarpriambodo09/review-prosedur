import smtplib
from email.message import EmailMessage

EMAIL_PENGIRIM = "untuksemua0309@gmail.com"
APP_PASSWORD = "cchs eoit qlgs imsx"
EMAIL_TUJUAN = "daniarpriambodo11@gmail.com"

msg = EmailMessage()
msg["Subject"] = "Test Email dari Python"
msg["From"] = EMAIL_PENGIRIM
msg["To"] = EMAIL_TUJUAN
msg.set_content("Ini adalah Prosedur yang perlu direview \n1.Business Plan. \n2. Purchasing")

with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
    server.login(EMAIL_PENGIRIM, APP_PASSWORD)
    server.send_message(msg)

print("Email berhasil dikirim!")