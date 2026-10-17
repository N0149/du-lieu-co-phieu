@echo off
chcp 65001 > nul
title GIAM SAT BCTC Q3 - CHU KY 5 PHUT (BAT MAY DI LAM)
color 0A

echo ======================================================================
echo    HE THONG GIAM SAT BCTC Q3 - CHU KY 5 PHUT (BAT MAY DI LAM)
echo ======================================================================
echo.
echo [!] Che do: Tu dong ngan may tinh Sleep khi ban di lam.
echo [!] Tan suat: 5 phut/lan (Sang: 08:00-11:30, Chieu: 13:00-15:30, Trua: 10p).
echo [!] Thong bao kem LNST va %% YoY se ban truc tiep vao Discord dien thoai.
echo.
echo Dang khoi dong trinh giam sat tren may tinh...
echo (Neu bat may truoc 08:00 sang, he thong se tu dem nguoc den 08:00)
echo.

python scripts\bctc_monitor_cloud.py --loop

echo.
echo ======================================================================
echo Phien giam sat ngay hom nay da ket thuc luc 15:30.
echo ======================================================================
pause
