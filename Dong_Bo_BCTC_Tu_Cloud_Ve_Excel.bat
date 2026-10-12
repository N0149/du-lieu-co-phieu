@echo off
chcp 65001 >nul
title ĐỒNG BỘ BCTC TỪ CLOUD VỀ FILE EXCEL (1 GIÂY)
echo ===============================================================================
echo        HỆ THỐNG ĐỒNG BỘ DỮ LIỆU BCTC TỪ GITHUB CLOUD VỀ FILE EXCEL
echo ===============================================================================
echo.

cd /d "D:\hoc\lap trinh\du-lieu-co-phieu"

echo [1/2] Đang tải dữ liệu BCTC mới nhất từ GitHub Cloud về máy...
git pull origin main
echo.

echo [2/2] Đang cập nhật dữ liệu vào file Excel trên ổ D...
python scripts\sync_cache_to_excel.py
echo.

echo ===============================================================================
echo ĐÃ HOÀN TẤT ĐỒNG BỘ! Bạn có thể mở file Excel để kiểm tra.
echo ===============================================================================
pause
