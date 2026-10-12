@echo off
chcp 65001 >nul
title HỆ THỐNG GIÁM SÁT BCTC Q3/2026 - NHÓM 2 (TỪ MÃ 116 ĐẾN 184)
color 0E

echo ===============================================================================
echo   HỆ THỐNG GIÁM SÁT BCTC QUÝ 3/2026 - NHÓM 2: TỪ MÃ 116 ĐẾN 184 (69 MÃ CỔ PHIẾU)
echo ===============================================================================
echo  Mã theo dõi: STT 116 (TTT) đến STT 184 (HSM) (Batch 06 -> Batch 08, từ 23 - 29/10)
echo  TÍNH NĂNG TỐI ƯU HÓA:
echo   [+] Mã đã có BCTC ĐẦY ĐỦ / HỢP NHẤT -> Tự động BỎ QUA quét mạng (tiết kiệm thời gian)
echo   [+] Mã mới chỉ có BCTC RIÊNG (như RTB) -> Vẫn tiếp tục quét kiểm tra chờ BCTC HỢP NHẤT
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
    echo Đang quét Nhóm 2 (Mã 116 đến 184: STT 116 -> 184)...
    python -X utf8 scripts\bctc_monitor_115.py --group 2
    echo.
    echo Hoàn tất lượt quét Nhóm 2! Bấm phím bất kỳ để đóng cửa sổ...
    pause >nul
    exit
)

if "%opt%"=="2" (
    echo.
    echo Khởi động chế độ quét ngầm tự động Nhóm 2 (chu kỳ 15 phút/lần)...
    echo Anh có thể thu nhỏ cửa sổ này để máy tính tự động theo dõi và báo chuông.
    echo.
    python -X utf8 scripts\bctc_monitor_115.py --group 2 --loop --interval 900
    pause
    exit
)

if "%opt%"=="0" (
    exit
)
