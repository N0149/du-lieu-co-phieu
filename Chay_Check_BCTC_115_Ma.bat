@echo off
chcp 65001 >nul
title HỆ THỐNG GIÁM SÁT BCTC QUÝ 3/2026 - TỰ ĐỘNG ĐỒNG BỘ EXCEL & WEB
color 0B

echo ===============================================================================
echo          HỆ THỐNG GIÁM SÁT BCTC QUÝ 3/2026 TỰ ĐỘNG - ĐỒNG BỘ EXCEL & WEB
echo ===============================================================================
echo.
echo  [1] Quét 115 mã ưu tiên (Batch 01 -> 05, từ 15 - 23/10) & Cập nhật Excel (~18 giây)
echo  [2] Quét TOÀN BỘ 278 mã cổ phiếu & Cập nhật Excel (~35 giây)
echo  [3] Chạy ngầm tự động định kỳ liên tục (Cứ 15 phút tự quét 1 lần & cập nhật)
echo  [4] Thoát
echo.
set /p opt="Vui lòng chọn chế độ (1, 2, 3 hoặc 4): "

if "%opt%"=="1" (
    echo.
    echo Đang thực hiện quét 115 mã ưu tiên và cập nhật file Excel...
    python -X utf8 scripts\bctc_monitor_115.py --limit 115
    echo.
    echo Hoàn tất! Bấm phím bất kỳ để đóng...
    pause >nul
    exit
)

if "%opt%"=="2" (
    echo.
    echo Đang thực hiện quét TOÀN BỘ 278 mã và cập nhật file Excel...
    python -X utf8 scripts\bctc_monitor_115.py --all
    echo.
    echo Hoàn tất! Bấm phím bất kỳ để đóng...
    pause >nul
    exit
)

if "%opt%"=="3" (
    echo.
    echo Đang khởi động chế độ tự động chạy ngầm định kỳ 115 mã (15 phút/lần)...
    echo Cửa sổ này sẽ tự động kiểm tra, cập nhật file Excel và đẩy cảnh báo lên web.
    echo Anh có thể thu nhỏ cửa sổ này để máy tính tự động giám sát.
    echo.
    python -X utf8 scripts\bctc_monitor_115.py --loop --interval 900
    pause
    exit
)

if "%opt%"=="4" (
    exit
)
