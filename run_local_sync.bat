@echo off
chcp 65001 >nul
title Dong Bo Du Lieu Co Phieu (Local Runner)
cd /d "%~dp0"

echo ========================================================
echo   KHOI DONG DONG BO DU LIEU NEN - DULIEUDAUTU.COM
echo ========================================================
echo.

node scripts/local-sync.mjs %*

echo.
echo ========================================================
echo   HOAN TAT TIEN TRINH DONG BO
echo ========================================================

rem Neu chay bang cach click dup thi giu lai man hinh xem ket qua
if "%1"=="" (
  echo Nhan phim bat ky de thoat...
  pause >nul
)
