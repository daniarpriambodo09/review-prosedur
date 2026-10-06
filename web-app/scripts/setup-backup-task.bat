@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: Review Prosedur - Setup Daily Database Backup Windows Task
:: Menjadwalkan backup otomatis setiap malam pukul 00:00 WIB
:: ============================================================================

title Review Prosedur - Registrasi Jadwal Backup Database
echo =====================================================================
echo   PENGATURAN TUGAS BACKUP DATABASE OTOMATIS (WINDOWS TASK SCHEDULER)
echo =====================================================================
echo.

cd /d "%~dp0\.."
set "APP_DIR=%CD%"
set "BACKUP_SCRIPT=%APP_DIR%\scripts\backup-db.bat"

echo Target Backup Script: %BACKUP_SCRIPT%
echo Jadwal Pelaksanaan : Setiap hari pukul 00:00 (Tengah Malam)
echo Retensi File       : Otomatis hapus backup lama > 30 hari
echo.

:: Buat Task Scheduler harian jam 00:00
schtasks /create /tn "ReviewProsedur-DailyDBBackup" /tr "\"%BACKUP_SCRIPT%\"" /sc daily /st 00:00 /rl highest /f

if %errorlevel% equ 0 (
    echo.
    echo =====================================================================
    echo   [SUKSES] Jadwal backup harian berhasil didaftarkan!
    echo   Nama Tugas : ReviewProsedur-DailyDBBackup
    echo   Waktu      : Pukul 00:00 setiap hari
    echo =====================================================================
) else (
    echo.
    echo [INFO] Jika gagal, pastikan Command Prompt dijalankan dengan "Run as Administrator".
)

echo.
pause
