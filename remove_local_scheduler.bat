@echo off
chcp 65001 >nul
title Huy Cai Dat Lich Tu Dong
cd /d "%~dp0"

echo ========================================================
echo   HỦY TÁC VỤ ĐỒNG BỘ DỮ LIỆU TỰ ĐỘNG KHI BẬT MÁY
echo ========================================================
echo.

schtasks /delete /tn "StockDataSync_OnLogon" /f

if %ERRORLEVEL% equ 0 (
  echo.
  echo ✅ ĐÃ HỦY THÀNH CÔNG TÁC VỤ TỰ ĐỘNG!
) else (
  echo.
  echo ℹ️ Không tìm thấy tác vụ hoặc đã được xóa trước đó.
)

echo.
pause
