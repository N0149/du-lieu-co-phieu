# Script đăng ký lịch tự động vào Windows Task Scheduler
# Chạy một lần duy nhất với quyền Administrator:
# powershell -ExecutionPolicy Bypass -File scripts/register-windows-tasks.ps1

$nodePath = (Get-Command node).Source
$workingDir = (Get-Item .).FullName
$scriptDir = Join-Path $workingDir "scripts"

Write-Host "=== ĐĂNG KÝ LỊCH TỰ ĐỘNG CẬP NHẬT DỮ LIỆU CHỨNG KHOÁN VÀO WINDOWS TASK SCHEDULER ===" -ForegroundColor Cyan
Write-Host "Thư mục làm việc: $workingDir"
Write-Host "Node.js path: $nodePath"

# 1. Giao dịch nội bộ Lần 1: 12:06 trưa hàng ngày (Bắt tin sáng, đón đầu phiên chiều)
$action1 = New-ScheduledTaskAction -Execute $nodePath -Argument "$scriptDir\crawl-direct-market.mjs --mode=insider" -WorkingDirectory $workingDir
$trigger1 = New-ScheduledTaskTrigger -Daily -At 12:06
Register-ScheduledTask -TaskName "StockData-Insider-1206" -Action $action1 -Trigger $trigger1 -Description "Cập nhật Giao dịch nội bộ lúc 12:06 hàng ngày" -Force
Write-Host "  -> [OK] Đã đăng ký tác vụ: StockData-Insider-1206 (12:06 trưa hàng ngày)" -ForegroundColor Green

# 2. Chỉ số định giá: 16:16 hàng ngày (Sau phiên ATC)
$action2 = New-ScheduledTaskAction -Execute $nodePath -Argument "$scriptDir\crawl-direct-market.mjs --mode=valuation" -WorkingDirectory $workingDir
$trigger2 = New-ScheduledTaskTrigger -Daily -At 16:16
Register-ScheduledTask -TaskName "StockData-Valuation-1616" -Action $action2 -Trigger $trigger2 -Description "Cập nhật định giá P/E, P/B, Điểm 360 lúc 16:16 hàng ngày" -Force
Write-Host "  -> [OK] Đã đăng ký tác vụ: StockData-Valuation-1616 (16:16 hàng ngày)" -ForegroundColor Green

# 3. Giao dịch nội bộ Lần 2: 18:36 tối hàng ngày (Chốt tin chiều & cả ngày)
$action3 = New-ScheduledTaskAction -Execute $nodePath -Argument "$scriptDir\crawl-direct-market.mjs --mode=insider" -WorkingDirectory $workingDir
$trigger3 = New-ScheduledTaskTrigger -Daily -At 18:36
Register-ScheduledTask -TaskName "StockData-Insider-1836" -Action $action3 -Trigger $trigger3 -Description "Cập nhật Giao dịch nội bộ lúc 18:36 hàng ngày" -Force
Write-Host "  -> [OK] Đã đăng ký tác vụ: StockData-Insider-1836 (18:36 tối hàng ngày)" -ForegroundColor Green

# 4. Cổ đông lớn & Công ty con: 23:00 ngày 1 hàng tháng
$action4 = New-ScheduledTaskAction -Execute $nodePath -Argument "$scriptDir\crawl-direct-market.mjs --mode=shareholders" -WorkingDirectory $workingDir
$trigger4 = New-ScheduledTaskTrigger -Daily -At 23:00
Register-ScheduledTask -TaskName "StockData-Shareholders-Monthly" -Action $action4 -Trigger $trigger4 -Description "Cập nhật Cổ đông & Công ty con ngày 1 hàng tháng" -Force
Write-Host "  -> [OK] Đã đăng ký tác vụ: StockData-Shareholders-Monthly (Ngày 1 hàng tháng)" -ForegroundColor Green

Write-Host "`nHoàn tất cài đặt vào Windows Task Scheduler! Các tác vụ sẽ tự động chạy đúng giờ." -ForegroundColor Yellow
