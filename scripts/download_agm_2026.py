"""
Script tự động tải tài liệu Nghị quyết Đại hội đồng cổ đông thường niên năm 2026 cho 21 mã cổ phiếu:
ABT, AIC, AMS, ANV, ASP, BAX, BCC, BLI, BMI, BTD, BTP, CAT, CBS, CCI, CCS, CDN, CKD, CLX, CMW, CNT, DAN
Nguồn: Vietstock Finance (https://finance.vietstock.vn/{ticker}/tai-tai-lieu.htm)
Thư mục lưu: D:\hoc\lap trinh\tai-lieu-PDF
"""

import os
import sys
import io
import time
import zipfile
import urllib.parse
from playwright.sync_api import sync_playwright
import requests
import urllib3

urllib3.disable_warnings()

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Danh sách 21 mã theo yêu cầu người dùng
TARGET_TICKERS = [
    'ABT', 'AIC', 'AMS', 'ANV', 'ASP', 'BAX', 'BCC', 'BLI', 'BMI', 'BTD',
    'BTP', 'CAT', 'CBS', 'CCI', 'CCS', 'CDN', 'CKD', 'CLX', 'CMW', 'CNT', 'DAN'
]

TARGET_DIR = r"D:\hoc\lap trinh\tai-lieu-PDF"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
}


def download_and_save(ticker: str, download_url: str, output_dir: str):
    """
    Tải file từ download_url. Nếu là PDF thì lưu trực tiếp, nếu là ZIP thì giải nén lấy các file PDF.
    """
    resp = requests.get(download_url, headers=HEADERS, verify=False, timeout=60)
    resp.raise_for_status()
    content = resp.content

    is_zip = download_url.lower().endswith('.zip') or content[:4] == b'PK\x03\x04'

    saved_files = []
    if is_zip:
        with zipfile.ZipFile(io.BytesIO(content)) as z:
            for name in z.namelist():
                if name.lower().endswith('.pdf'):
                    base_name = os.path.basename(name)
                    if not base_name:
                        continue
                    clean_name = f"{ticker}_{base_name}"
                    dest_path = os.path.join(output_dir, clean_name)
                    with open(dest_path, 'wb') as f_out:
                        f_out.write(z.read(name))
                    f_size = os.path.getsize(dest_path)
                    saved_files.append((clean_name, f_size))
    else:
        dest_filename = f"{ticker}_NQ_DHDCD_2026.pdf"
        dest_path = os.path.join(output_dir, dest_filename)
        with open(dest_path, 'wb') as f_out:
            f_out.write(content)
        f_size = os.path.getsize(dest_path)
        saved_files.append((dest_filename, f_size))

    return saved_files


def run_crawler():
    os.makedirs(TARGET_DIR, exist_ok=True)
    print("=" * 70)
    print("BẮT ĐẦU TỰ ĐỘNG TẢI NGHỊ QUYẾT ĐHĐCĐ 2026 CHO 21 MÃ DOANH NGHIỆP")
    print(f"Thư mục lưu trữ: {TARGET_DIR}")
    print("=" * 70)

    results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(user_agent=HEADERS['User-Agent'])

        for idx, ticker in enumerate(TARGET_TICKERS, 1):
            url = f"https://finance.vietstock.vn/{ticker}/tai-tai-lieu.htm"
            print(f"\n[{idx}/{len(TARGET_TICKERS)}] Đang xử lý {ticker}: {url}")
            doc_url = None

            try:
                page.goto(url, timeout=30000, wait_until='domcontentloaded')
                page.wait_for_timeout(2000)

                # Tìm và click bộ lọc 'Nghị quyết ĐHĐCĐ'
                spans = page.locator("span:has-text('Nghị quyết ĐHĐCĐ')")
                clicked = False
                for i in range(spans.count()):
                    s = spans.nth(i)
                    if s.is_visible():
                        s.click()
                        clicked = True
                        page.wait_for_timeout(1800)
                        break

                if clicked:
                    links = page.query_selector_all("a[href*='static2.vietstock.vn']")
                    candidates = []
                    for a in links:
                        t = a.inner_text().strip().replace('\n', ' ')
                        h = a.get_attribute('href') or ''
                        if '2026' in t or '2026' in h:
                            candidates.append((t, h))

                    # Ưu tiên nghị quyết thường niên
                    tn_matches = [c for c in candidates if 'thường niên' in c[0].lower() or 'thuong nien' in c[1].lower()]
                    if tn_matches:
                        doc_url = tn_matches[0][1]
                        print(f"  -> Tìm thấy Nghị quyết ĐHĐCĐ thường niên: {tn_matches[0][0][:65]}...")
                    elif candidates:
                        doc_url = candidates[0][1]
                        print(f"  -> Tìm thấy tài liệu 2026: {candidates[0][0][:65]}...")

            except Exception as e:
                print(f"  [!] Trình duyệt gặp lỗi khi truy cập {ticker}: {e}")

            # Tiến hành tải và lưu trữ nếu tìm thấy
            if doc_url:
                try:
                    print(f"  -> Đang tải: {doc_url}")
                    saved = download_and_save(ticker, doc_url, TARGET_DIR)
                    results[ticker] = saved
                    for fn, sz in saved:
                        print(f"     [OK] Đã lưu: {fn} ({sz / (1024*1024):.2f} MB)")
                except Exception as e:
                    print(f"     [LỖI] Không thể tải {ticker}: {e}")
                    results[ticker] = []
            else:
                print(f"  [X] Không tìm thấy Nghị quyết ĐHĐCĐ 2026 cho mã {ticker}")
                results[ticker] = []

        browser.close()

    print("\n" + "=" * 70)
    print("HOÀN THÀNH TẢI TÀI LIỆU 2026")
    print("=" * 70)
    success_count = sum(1 for t, files in results.items() if len(files) > 0)
    print(f"Tổng số mã thành công: {success_count}/{len(TARGET_TICKERS)}")
    print(f"Tất cả các file đã được lưu tại: {TARGET_DIR}")


if __name__ == "__main__":
    run_crawler()
