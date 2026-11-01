@echo off
chcp 65001 >nul
echo ======================================================================
echo    ĐỒNG BỘ NGHIÊN CỨU CHUYÊN SÂU AI (WORD -^> MARKDOWN & WEB/MCP)
echo ======================================================================
echo.
echo Đang quét thư mục: E:\My Drive\Nghiên cứu chuyên sâu AI
echo.
python scripts/sync_nghien_cuu_ai.py
echo.
echo ======================================================================
echo    Hoàn tất đồng bộ! Bạn có thể tải lại trang web hoặc tra cứu MCP.
echo ======================================================================
pause
