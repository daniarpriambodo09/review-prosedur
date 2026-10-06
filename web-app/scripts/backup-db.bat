@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: Review Prosedur - Automated PostgreSQL Backup Script
:: Melakukan backup database procedure_management secara teratur
:: ============================================================================

title Review Prosedur - Database Backup
cd /d "%~dp0\.."

set "BACKUP_DIR=%CD%\backups"
set "LOG_FILE=%BACKUP_DIR%\backup.log"

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Dapatkan tanggal & jam untuk penamaan file
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set "DT=%%I"
set "TIMESTAMP=%DT:~0,4%%DT:~4,2%%DT:~6,2%_%DT:~8,2%%DT:~10,2%%DT:~12,2%"
set "BACKUP_FILE=%BACKUP_DIR%\procedure_management_backup_%TIMESTAMP%.sql"

echo [%DATE% %TIME%] Memulai backup database procedure_management... >> "%LOG_FILE%"
echo [%DATE% %TIME%] Lokasi file: %BACKUP_FILE% >> "%LOG_FILE%"

:: Set parameter PostgreSQL
set PGPASSWORD=12345678
set PGUSER=postgres
set PGHOST=localhost
set PGPORT=5432
set PGDATABASE=procedure_management

:: Cari pg_dump di PATH atau di direktori standar PostgreSQL Windows
set "PGDUMP_BIN=pg_dump"
where pg_dump >nul 2>&1
if %errorlevel% neq 0 (
    if exist "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" (
        set "PGDUMP_BIN=C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
    ) else if exist "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" (
        set "PGDUMP_BIN=C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"
    ) else if exist "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" (
        set "PGDUMP_BIN=C:\Program Files\PostgreSQL\15\bin\pg_dump.exe"
    ) else if exist "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe" (
        set "PGDUMP_BIN=C:\Program Files\PostgreSQL\14\bin\pg_dump.exe"
    )
)

echo Menggunakan: "%PGDUMP_BIN%"
"%PGDUMP_BIN%" -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% --clean --if-exists --inserts -f "%BACKUP_FILE%"

if %errorlevel% equ 0 (
    echo [%DATE% %TIME%] [SUKSES] Backup berhasil dibuat: %BACKUP_FILE% >> "%LOG_FILE%"
    echo [SUKSES] Backup database selesai: %BACKUP_FILE%
) else (
    echo [%DATE% %TIME%] [GAGAL] Gagal membuat backup dengan pg_dump. Mencoba fallback script... >> "%LOG_FILE%"
    call node "%CD%\scripts\backup-db-node.js" "%BACKUP_FILE%"
)

:: Retention Policy: Bersihkan file backup yang lebih tua dari 30 hari
echo Membersihkan backup yang lebih tua dari 30 hari...
forfiles /p "%BACKUP_DIR%" /m *.sql /d -30 /c "cmd /c del @path" >nul 2>&1
echo [%DATE% %TIME%] Pembersihan backup kadaluarsa (>30 hari) selesai. >> "%LOG_FILE%"
echo.
