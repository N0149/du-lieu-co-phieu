@echo off
chcp 65001 >nul
title Cai Dat Lich Tu Dong Chay Khi Bat May
cd /d "%~dp0"

echo ========================================================
echo   CÀI ĐẶT LẬP LỊCH ĐỒNG BỘ DỮ LIỆU TỰ ĐỘNG
echo ========================================================
echo.
echo Đang đăng ký tác vụ chạy ngầm vào Windows Task Scheduler...
echo Tác vụ: Tự động chạy ngầm mỗi khi bạn đăng nhập Windows.
echo.

schtasks /create /tn "StockDataSync_OnLogon" /tr "wscript.exe \"%~dp0run_local_sync_silent.vbs\"" /sc onlogon /f

if %ERRORLEVEL% equ 0 (
  echo.
  echo ========================================================
  echo [THÀNH CÔNG] ĐÃ CÀI ĐẶT LẬP LỊCH TỰ ĐỘNG!
  echo ========================================================
  echo Kể từ bây giờ, mỗi khi bạn bật máy tính, Windows sẽ tự động:
  echo   1. Kéo cập nhật BCTC mới nhất từ GitHub Actions về
  echo   2. Cập nhật Biến động giá, Định giá P/E/P/B, Cảng biển, Drive
  echo   3. Đẩy dữ liệu mới nhất lên GitHub (hoàn toàn chạy ngầm)
  echo.
) else (
  echo.
  echo ========================================================
  echo [LƯU Ý] NẾU GẶP LỖI PHÂN QUYỀN
  echo ========================================================
  echo Vui lòng click chuột phải vào file này và chọn:
  echo "Run as administrator" (Chạy dưới quyền quản trị viên)
  echo.
)

echo Nhấn phím bất kỳ để đóng cửa sổ này...
pause >nul
