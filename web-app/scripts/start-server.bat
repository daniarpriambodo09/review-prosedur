@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: Review Prosedur - Server & Scheduler Auto-Start Script
:: Digunakan untuk menyalakan server secara otomatis saat Windows boot/restart
:: ============================================================================

title Review Prosedur - Auto Start Service
echo =======================================================
echo   SISTEM REVIEW PROSEDUR - AUTO START SERVICE
echo =======================================================
echo.

:: Pindah ke folder web-app
cd /d "%~dp0\.."
echo [1/4] Direktori kerja: %CD%

:: Pastikan folder logs dan backups tersedia
if not exist "logs" mkdir "logs"
if not exist "backups" mkdir "backups"
echo [2/4] Folder logs & backups telah dipastikan siap.

:: Cek status PostgreSQL service di Windows (opsional tapi aman)
echo [3/4] Memastikan service PostgreSQL aktif...
net start postgresql-x64-16 >nul 2>&1
if %errorlevel% neq 0 (
    net start postgresql >nul 2>&1
)

:: Jalankan PM2 dengan file ecosystem.config.js
echo [4/4] Memulai aplikasi Next.js (port 3090) dan Python Email Scheduler...
where pm2 >nul 2>&1
if %errorlevel% equ 0 (
    pm2 start ecosystem.config.js
    pm2 save
    echo.
    echo [SUKSES] Aplikasi dan scheduler berhasil dijalankan via PM2.
) else (
    echo PM2 belum terpasang secara global. Menggunakan npx pm2...
    call npx pm2 start ecosystem.config.js
    call npx pm2 save
    echo.
    echo [SUKSES] Aplikasi dan scheduler berhasil dijalankan via npx pm2.
)

echo.
echo =======================================================
echo   Server berjalan di background!
echo   Akses Web: http://localhost:3090/review-prosedur
echo =======================================================
echo.
timeout /t 5
