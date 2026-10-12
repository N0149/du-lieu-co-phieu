@echo off
chcp 65001 >nul
title HỆ THỐNG GIÁM SÁT BCTC Q3/2026 - NHÓM 1 (115 MÃ ĐẦU TIÊN)
color 0B

echo ===============================================================================
echo      HỆ THỐNG GIÁM SÁT BCTC QUÝ 3/2026 - NHÓM 1: 115 MÃ ĐẦU TIÊN (STT 1 -> 115)
echo ===============================================================================
echo  Mã theo dõi: STT 1 (VRG) đến STT 115 (TNG) (Batch 01 -> Batch 05, từ 15 - 23/10)
echo  TÍNH NĂNG TỐI ƯU HÓA:
echo   [+] Mã đã có BCTC ĐẦY ĐỦ / HỢP NHẤT -> Tự động BỎ QUA quét mạng (tiết kiệm thời gian)
echo   [+] Mã mới chỉ có BCTC RIÊNG -> Vẫn tiếp tục quét kiểm tra chờ BCTC HỢP NHẤT
echo   [+] Bắn thông báo tức thì lên Discord (Điện thoại & PC)
echo   [+] Tự động cập nhật file Excel + Deploy ngay lên web dulieudautu.com
echo ===============================================================================
echo.
echo  [1] Quét kiểm tra ngay 1 lần (Nhấn 1 hoặc Enter để chạy)
echo  [2] Chạy ngầm tự động định kỳ liên tục (Cứ 15 phút quét 1 lần)
echo  [0] Thoát
echo.
set /p opt="Lựa chọn của bạn [Mặc định 1]: "
if "%opt%"=="" set opt=1

if "%opt%"=="1" (
    echo.
    echo Đang quét Nhóm 1 (115 mã đầu tiên: STT 1 -> 115)...
    python -X utf8 scripts\bctc_monitor_115.py --group 1
    echo.
    echo Hoàn tất lượt quét Nhóm 1! Bấm phím bất kỳ để đóng cửa sổ...
    pause >nul
    exit
)

if "%opt%"=="2" (
    echo.
    echo Khởi động chế độ quét ngầm tự động Nhóm 1 (chu kỳ 15 phút/lần)...
    echo Anh có thể thu nhỏ cửa sổ này để máy tính tự động theo dõi và báo chuông.
    echo.
    python -X utf8 scripts\bctc_monitor_115.py --group 1 --loop --interval 900
    pause
    exit
)

if "%opt%"=="0" (
    exit
)
