@echo off
chcp 65001 > nul
title HỆ THỐNG KIỂM TRA BCTC THỦ CÔNG & THEO YÊU CẦU (BCTC QUÝ 3/2026)
color 0B

cd /d "D:\hoc\lap trinh\du-lieu-co-phieu"
python scripts\bctc_manual_checker.py

pause
