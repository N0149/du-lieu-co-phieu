@echo off
chcp 65001 >nul
title HỆ THỐNG GIÁM SÁT BCTC QUÝ 3/2026 - TỔNG HỢP 278 MÃ
color 0B

:MENU
cls
echo ===============================================================================
echo          HỆ THỐNG GIÁM SÁT BCTC QUÝ 3/2026 TỰ ĐỘNG - ĐỒNG BỘ EXCEL & WEB
echo ===============================================================================
echo.
echo  [1] Chạy NHÓM 1: 115 mã đầu tiên (STT 1 -> 115, Batch 01 -> 05, từ 15 - 23/10)
echo  [2] Chạy NHÓM 2: Từ mã 116 đến 184 (STT 116 -> 184, 69 mã, từ 23 - 29/10)
echo  [3] Chạy NHÓM 3: Những mã còn lại (STT 185 -> 278, 94 mã, từ 29 - 30/10)
echo  [4] Chạy TOÀN BỘ 278 mã cổ phiếu (STT 1 -> 278)
echo  [5] Chạy ngầm tự động định kỳ NHÓM 1 (Cứ 15 phút quét 1 lần)
echo  [6] Chạy ngầm tự động định kỳ TOÀN BỘ 278 mã (Cứ 15 phút quét 1 lần)
echo  [0] Thoát
echo.
echo ===============================================================================
echo  LƯU Ý: Mã đã có BCTC Hợp nhất/Đầy đủ sẽ tự động BỎ QUA để tiết kiệm thời gian.
echo         Mã mới có BCTC Riêng sẽ tiếp tục quét kiểm tra cho đến khi có Hợp nhất.
echo ===============================================================================
echo.
set /p opt="Vui lòng chọn chế độ (1-6 hoặc 0) [Mặc định 1]: "
if "%opt%"=="" set opt=1

if "%opt%"=="1" (
    echo.
    echo Đang thực hiện quét NHÓM 1 (115 mã đầu tiên)...
    python -X utf8 scripts\bctc_monitor_115.py --group 1
    echo.
    echo Hoàn tất! Bấm phím bất kỳ để quay lại menu...
    pause >nul
    goto MENU
)

if "%opt%"=="2" (
    echo.
    echo Đang thực hiện quét NHÓM 2 (Từ mã 116 đến 184)...
    python -X utf8 scripts\bctc_monitor_115.py --group 2
    echo.
    echo Hoàn tất! Bấm phím bất kỳ để quay lại menu...
    pause >nul
    goto MENU
)

if "%opt%"=="3" (
    echo.
    echo Đang thực hiện quét NHÓM 3 (Những mã còn lại: 185 đến 278)...
    python -X utf8 scripts\bctc_monitor_115.py --group 3
    echo.
    echo Hoàn tất! Bấm phím bất kỳ để quay lại menu...
    pause >nul
    goto MENU
)

if "%opt%"=="4" (
    echo.
    echo Đang thực hiện quét TOÀN BỘ 278 mã...
    python -X utf8 scripts\bctc_monitor_115.py --group all
    echo.
    echo Hoàn tất! Bấm phím bất kỳ để quay lại menu...
    pause >nul
    goto MENU
)

if "%opt%"=="5" (
    echo.
    echo Đang khởi động chế độ tự động chạy ngầm định kỳ NHÓM 1 (15 phút/lần)...
    echo Cửa sổ này sẽ tự động kiểm tra, báo chuông Discord, cập nhật Excel và web.
    echo Anh có thể thu nhỏ cửa sổ này để máy tính tự động giám sát.
    echo.
    python -X utf8 scripts\bctc_monitor_115.py --group 1 --loop --interval 900
    pause
    goto MENU
)

if "%opt%"=="6" (
    echo.
    echo Đang khởi động chế độ tự động chạy ngầm định kỳ TOÀN BỘ 278 MÃ (15 phút/lần)...
    echo.
    python -X utf8 scripts\bctc_monitor_115.py --group all --loop --interval 900
    pause
    goto MENU
)

if "%opt%"=="0" (
    exit
)

goto MENU
