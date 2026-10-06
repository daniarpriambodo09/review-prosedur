@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: Review Prosedur - Auto-Start Setup for Windows
:: Menambahkan start-server.bat ke Windows Task Scheduler & Startup Folder
:: ============================================================================

title Review Prosedur - Registrasi Auto Start Windows
echo =====================================================================
echo   PENGATURAN AUTO-START SETELAH LISTRIK PADAM / PC REBOOT
echo =====================================================================
echo.

cd /d "%~dp0\.."
set "APP_DIR=%CD%"
set "START_SCRIPT=%APP_DIR%\scripts\start-server.bat"

echo Target Script: %START_SCRIPT%
echo.

:: 1. Buat Task Scheduler agar langsung jalan saat komputer menyala (ON BOOT)
echo [1/2] Mendaftarkan ke Windows Task Scheduler (ReviewProsedur-AutoStart)...
schtasks /create /tn "ReviewProsedur-AutoStart" /tr "\"%START_SCRIPT%\"" /sc onlogon /rl highest /f >nul 2>&1
if %errorlevel% equ 0 (
    echo    [OK] Task Scheduler berhasil dibuat (dijalankan otomatis setiap kali login/boot).
) else (
    echo    [INFO] Memerlukan hak administrator untuk Task Scheduler tingkat tinggi.
    echo    Melanjutkan pembuatan shortcut di folder Startup...
)

:: 2. Salin shortcut atau VBS runner ke shell:startup user
echo.
echo [2/2] Mendaftarkan ke Startup folder pengguna...
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

:: Buat VBScript kecil agar start-server.bat berjalan di background tanpa jendela hitam pop-up yang mengganggu
set "VBS_LAUNCHER=%APP_DIR%\scripts\run-hidden-autostart.vbs"
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.Run chr(34^) ^& "%START_SCRIPT%" ^& Chr(34^), 0
echo Set WshShell = Nothing
) > "%VBS_LAUNCHER%"

:: Buat shortcut VBS di Startup Folder
set "SHORTCUT_PATH=%STARTUP_DIR%\ReviewProsedur-AutoStart.lnk"
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%VBS_LAUNCHER%\"'; $s.WorkingDirectory = '%APP_DIR%'; $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo    [OK] Shortcut startup berhasil dipasang di:
    echo         %SHORTCUT_PATH%
)

echo.
echo =====================================================================
echo   SELESAI!
echo   Sistem Review Prosedur & Email Scheduler kini akan otomatis
echo   menyala kembali saat komputer dinyalakan / setelah listrik hidup.
echo =====================================================================
echo.
pause
