@echo off
chcp 65001 >nul
title HỆ THỐNG GIÁM SÁT BCTC Q3/2026 - NHÓM 3 (NHỮNG MÃ CÒN LẠI: 185 ĐẾN 278)
color 0A

echo ===============================================================================
echo   HỆ THỐNG GIÁM SÁT BCTC QUÝ 3/2026 - NHÓM 3: NHỮNG MÃ CÒN LẠI (94 MÃ CỔ PHIẾU)
echo ===============================================================================
echo  Mã theo dõi: STT 185 (VPS) đến STT 278 (VNT) (Batch 09 -> Batch 12, từ 29 - 30/10)
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
    echo Đang quét Nhóm 3 (Những mã còn lại: STT 185 -> 278)...
    python -X utf8 scripts\bctc_monitor_115.py --group 3
    echo.
    echo Hoàn tất lượt quét Nhóm 3! Bấm phím bất kỳ để đóng cửa sổ...
    pause >nul
    exit
)

if "%opt%"=="2" (
    echo.
    echo Khởi động chế độ quét ngầm tự động Nhóm 3 (chu kỳ 15 phút/lần)...
    echo Anh có thể thu nhỏ cửa sổ này để máy tính tự động theo dõi và báo chuông.
    echo.
    python -X utf8 scripts\bctc_monitor_115.py --group 3 --loop --interval 900
    pause
    exit
)

if "%opt%"=="0" (
    exit
)
