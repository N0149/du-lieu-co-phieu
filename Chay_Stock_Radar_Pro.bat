@echo off
chcp 65001 > nul
title STOCK RADAR PRO - PHẦN MỀM GIÁM SÁT BCTC VÀ TÀI LIỆU DOANH NGHIỆP
color 0A

cd /d "%~dp0"
if exist "dist\Stock_Radar_Pro.exe" (
    "dist\Stock_Radar_Pro.exe"
) else if exist "Stock_Radar_Pro.exe" (
    "Stock_Radar_Pro.exe"
) else (
    python scripts\stock_radar_pro.py
)

pause
