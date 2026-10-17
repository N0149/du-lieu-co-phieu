@echo off
chcp 65001 > nul
title GIAM SAT BCTC Q3 - QUET 5 PHUT/LAN (BAT MAY DI LAM)
color 0A

echo ======================================================================
echo    HE THONG GIAM SAT BCTC Q3 - CHU KY 5 PHUT (BAT MAY DI LAM)
echo ======================================================================
echo.
echo [!] Che do: Tu dong ngan may tinh Sleep khi ban di lam.
echo [!] Tan suat quet ngam: 5 phut/lan (Phat hien BCTC sieu toc).
echo [!] Thong bao Discord: 10 phut/lan (Bao he thong binh thuong, chong spam).
echo [!] Canh bao BCTC moi: Ban chuong tuc thi ngay khi phat hien!
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
