@echo off
chcp 65001 > nul
title Cập Nhật Dữ Liệu Cảng Biển - Dữ Liệu Đầu Tư
echo ======================================================
echo   TIẾN TRÌNH CẬP NHẬT DỮ LIỆU CẢNG BIỂN & HÀNG HẢI
echo ======================================================
cd /d "%~dp0"
python scripts\cangbien\sync_daily.py --force
echo.
echo ======================================================
echo   HOÀN TẤT! NHẤN PHÍM BẤT KỲ ĐỂ ĐÓNG CỬA SỔ...
echo ======================================================
pause > nul
