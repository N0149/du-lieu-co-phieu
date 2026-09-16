@echo off
title KHOI DONG LOCALHOST - DULIEUDAUTU.COM
cd /d "%~dp0"

echo ========================================================
echo       DANG KHOI DONG LOCALHOST (dulieudautu.com)
echo ========================================================
echo.
echo Thu muc: %CD%
echo Dia chi: http://localhost:3000
echo.
echo Dang mo trinh duyet web...
echo De dung may chu: bam Ctrl + C hoac dong cua so nay.
echo.
echo ========================================================
echo.

:: Them Nodejs va npm/pnpm vao PATH neu chua co
set "PATH=%APPDATA%\npm;C:\Program Files\nodejs;%PATH%"

:: Tu dong mo trinh duyet sau 3 giay
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

:: Kiem tra va chay pnpm dev hoac npm run dev
where pnpm >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Tim thay pnpm. Dang khoi dong Next.js dev server...
    call pnpm dev
) else (
    echo [!] Khong tim thay pnpm, chuyen sang npm run dev...
    call npm run dev
)

echo.
echo ========================================================
echo May chu localhost da dung.
echo ========================================================
pause
