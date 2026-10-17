@echo off
chcp 65001 > nul
title THỬ NGHIỆM GIÁM SÁT BCTC (10:05 - 10:30)
color 0B

echo ======================================================================
echo    PHIÊN THỬ NGHIỆM GIÁM SÁT BCTC (10:05 - 10:30 HÔM NAY)
echo ======================================================================
echo.
echo [!] Tần suất quét ngầm: 5 phút/lần
echo [!] Báo nhịp đập Discord: 10 phút/lần (Chống spam)
echo [!] Cảnh báo BCTC mới: Bắn chuông ngay lập tức kèm LNST và %% YoY
echo [!] Tự động kết thúc an toàn lúc: 10:30
echo.

cd /d "D:\hoc\lap trinh\du-lieu-co-phieu"
python scripts/bctc_monitor_cloud.py --loop --start 10:05 --until 10:30

echo.
echo ======================================================================
echo    ĐÃ HOÀN TẤT PHIÊN THỬ NGHIỆM. NHẤN PHÍM BẤT KỲ ĐỂ THOÁT.
echo ======================================================================
pause
