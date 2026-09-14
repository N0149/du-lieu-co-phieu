@echo off
chcp 65001 >nul
title Khởi Động Localhost - Phân Tích Cổ Phiếu

:: Chuyển đúng vào thư mục của dự án
cd /d "%~dp0"

echo ========================================================
echo       ĐANG KHỞI ĐỘNG LOCALHOST (dulieudautu.com)
echo ========================================================
echo.
echo  Thư mục: %CD%
echo  Địa chỉ: http://localhost:3000
echo.
echo  Trình duyệt web sẽ tự động mở sau 2 giây...
echo  (Để dừng máy chủ: hãy bấm Ctrl + C hoặc tắt cửa sổ này)
echo.
echo ========================================================
echo.

:: Tự động mở trình duyệt web sau 2 giây
start "" powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:3000'"

:: Chạy server bằng pnpm (hoặc npm nếu chưa có pnpm)
where pnpm >nul 2>&1
if %ERRORLEVEL% equ 0 (
    pnpm dev
) else (
    npm run dev
)

echo.
echo ========================================================
echo  Máy chủ localhost đã dừng.
echo ========================================================
pause
