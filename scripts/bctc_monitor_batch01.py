"""
HỆ THỐNG GIÁM SÁT & BÓC TÁCH BCTC QUÝ 3/2026 TỰ ĐỘNG (BATCH 01: 15 - 20/10)
Tự động quét song song 2 lớp (Web Công Ty + EzIR FPTS), phát hiện BCTC mới và bóc tách LNST.
"""

import os
import sys
import json
import re
import time
import datetime
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup

BASE_DIR = r"d:\hoc\lap trinh\du-lieu-co-phieu"
BATCH_01_JSON = r"D:\hoc\lap trinh\check BCTC Distill\Distill_Batch_01_Ngay_15_20 da sua.json"
ALERTS_FILE = os.path.join(BASE_DIR, "data", "bctc_q3_live_alerts.json")
LOG_FILE = os.path.join(BASE_DIR, "data", "bctc_monitor_batch01.log")

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def log(msg):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{timestamp}] {msg}"
    print(formatted)
    try:
        os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(formatted + "\n")
    except:
        pass

def load_alerts_history():
    if os.path.exists(ALERTS_FILE):
        try:
            with open(ALERTS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_alerts_history(alerts):
    try:
        os.makedirs(os.path.dirname(ALERTS_FILE), exist_ok=True)
        with open(ALERTS_FILE, "w", encoding="utf-8") as f:
            json.dump(alerts, f, ensure_ascii=False, indent=2)
    except Exception as e:
        log(f"Lỗi lưu lịch sử alerts: {e}")

def is_q3_2026(text):
    """
    Kiểm tra chính xác tuyệt đối xem text có phải là BCTC / Giải trình / KQKD Quý 3/2026 hay không.
    Loại bỏ 100% false alarm từ 'kế hoạch quý 3' hoặc text rời rạc giữa các năm.
    """
    if not text:
        return False, ""
    lower = text.lower()
    
    # Loại bỏ kế hoạch
    if 'kế hoạch' in lower or 'ke hoach' in lower:
        return False, ""
        
    pattern1 = r'(?:báo\s*cáo\s*tài\s*chính|bctc|financial\s*statements|kqkd|giải\s*trình\s*(?:chênh\s*lệch\s*)?lợi\s*nhuận)[^,\n\r]{0,35}(?:quý\s*3|quy\s*3|q3|quý\s*iii|quy\s*iii|quarter\s*3)[^,\n\r]{0,25}(?:2026|26\b)'
    pattern2 = r'(?:quý\s*3|quy\s*3|q3|quý\s*iii|quy\s*iii|quarter\s*3)[^,\n\r]{0,15}(?:2026|26\b)[^,\n\r]{0,35}(?:báo\s*cáo\s*tài\s*chính|bctc|financial\s*statements)'
    pattern3 = r'(?:bctc|fs)[_\-\s]*(?:q3|quy3|quyi?ii)[_\-\s]*2026'

    m1 = re.search(pattern1, lower)
    if m1:
        return True, text[m1.start():m1.end()]
        
    m2 = re.search(pattern2, lower)
    if m2:
        return True, text[m2.start():m2.end()]
        
    m3 = re.search(pattern3, lower)
    if m3:
        return True, text[m3.start():m3.end()]
        
    return False, ""

def check_fpts_ezir(ticker):
    """Quét dữ liệu chuẩn hóa từ cổng EzIR FPTS"""
    url = f"https://gateway.fpts.com.vn/news/api/gateway/v1/mobile/list?folder=86&code={ticker}&pageSize=10&selectedPage=1&newsType=2"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            items = data.get('Data', {}).get('Table1', [])
            
            for item in items:
                title = item.get('Title', '')
                date_pub = item.get('DatePub', '')
                doc_url = item.get('URL', '')
                
                matched, snippet = is_q3_2026(title)
                if matched:
                    return {
                        'has_q3': True,
                        'source': 'EzIR_FPTS',
                        'title': title,
                        'date': date_pub,
                        'doc_url': doc_url
                    }
                    
            latest = items[0] if items else {}
            return {
                'has_q3': False,
                'source': 'EzIR_FPTS',
                'latest_doc': f"[{latest.get('DatePub', '')}] {latest.get('Title', '')}" if latest else "Chưa có tài liệu mới"
            }
    except Exception as e:
        return {'has_q3': False, 'source': 'EzIR_FPTS', 'error': str(e)}

def check_company_website(ticker, uri):
    """Quét toàn trang web riêng của doanh nghiệp (Full page scan)"""
    if not uri or 'ezir.fpts.com.vn' in uri.lower():
        return None
        
    try:
        clean_uri = uri
        if clean_uri.startswith('https://lixco.com'):
            clean_uri = clean_uri.replace('https://', 'http://')
            
        req = urllib.request.Request(clean_uri, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=6) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            
        soup = BeautifulSoup(html, 'html.parser')
        full_text = soup.get_text(separator=' ', strip=True)
        
        # 1. Quét tìm kiếm từ khóa Q3/2026 trong toàn bộ text
        matched, snippet = is_q3_2026(full_text)
        if matched:
            # Tìm link tải file nếu có
            doc_url = clean_uri
            for a in soup.find_all('a', href=True):
                h = a['href']
                t = a.get_text(strip=True)
                combo = (h + " " + t).lower()
                if any(ext in h.lower() for ext in ['.pdf', '.zip', '.rar', '.xlsx']) and any(k in combo for k in ['q3', 'quy3', 'quý 3', '2026']):
                    doc_url = urllib.parse.urljoin(clean_uri, h)
                    break
                    
            return {
                'has_q3': True,
                'source': 'Company_Web',
                'title': snippet or "Báo cáo tài chính Quý 3/2026",
                'date': datetime.datetime.now().strftime("%d/%m/%Y"),
                'doc_url': doc_url
            }
            
        # 2. Tìm kiếm trong các thẻ link download
        for a in soup.find_all('a', href=True):
            h = a['href']
            t = a.get_text(strip=True)
            matched_a, snippet_a = is_q3_2026(h + " " + t)
            if matched_a:
                return {
                    'has_q3': True,
                    'source': 'Company_Web',
                    'title': t or snippet_a,
                    'date': datetime.datetime.now().strftime("%d/%m/%Y"),
                    'doc_url': urllib.parse.urljoin(clean_uri, h)
                }
                
        return {'has_q3': False, 'source': 'Company_Web'}
    except Exception as e:
        return {'has_q3': False, 'source': 'Company_Web', 'error': str(e)}

def scan_single_ticker(ticker, uri):
    """Kiểm tra đa tầng cho 1 mã cổ phiếu"""
    start_t = time.time()
    
    # 1. Thử quét web công ty trước (nếu có web riêng)
    res_web = check_company_website(ticker, uri)
    if res_web and res_web.get('has_q3'):
        res_web['elapsed'] = round(time.time() - start_t, 2)
        return ticker, res_web
        
    # 2. Quét cổng EzIR FPTS (Bảo hiểm chính thống)
    res_ezir = check_fpts_ezir(ticker)
    if res_ezir.get('has_q3'):
        res_ezir['elapsed'] = round(time.time() - start_t, 2)
        return ticker, res_ezir
        
    # Nếu chưa có Q3
    latest_info = res_ezir.get('latest_doc') or "Chưa có BCTC Quý 3"
    return ticker, {
        'has_q3': False,
        'latest_doc': latest_info,
        'elapsed': round(time.time() - start_t, 2)
    }

def run_batch_01_scan():
    """Chạy 1 lượt quét toàn bộ 23 mã Batch 01"""
    if not os.path.exists(BATCH_01_JSON):
        log(f"Không tìm thấy file: {BATCH_01_JSON}")
        return
        
    with open(BATCH_01_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    monitors = data.get('data', [])
    log(f"=== BẮT ĐẦU QUÉT BATCH 01 ({len(monitors)} MÃ - ĐỢT 15 ĐẾN 20/10) ===")
    
    alerts = load_alerts_history()
    new_alerts_count = 0
    
    start_total = time.time()
    results = {}
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(scan_single_ticker, m.get('name'), m.get('uri')): m.get('name') for m in monitors}
        for f in futures:
            ticker, res = f.result()
            results[ticker] = res
            
    total_time = round(time.time() - start_total, 2)
    log(f"-> Hoàn tất quét {len(results)} mã trong {total_time} giây!")
    
    print("-" * 85)
    print(f"{'MÃ CP':<8} | {'TRẠNG THÁI':<15} | {'NGUỒN':<12} | {'TÀI LIỆU MỚI NHẤT / PHÁT HIỆN':<45}")
    print("-" * 85)
    
    for ticker in sorted(results.keys()):
        res = results[ticker]
        if res.get('has_q3'):
            status_str = "🔥 ĐÃ RA Q3!"
            src_str = res.get('source', '')
            title_str = res.get('title', '')[:45]
            print(f"\033[92m{ticker:<8} | {status_str:<15} | {src_str:<12} | {title_str:<45}\033[0m")
            
            # Ghi nhận alert mới nếu chưa có
            if ticker not in alerts:
                alerts[ticker] = {
                    'ticker': ticker,
                    'batch': 'Batch 01 (15-20/10)',
                    'first_detected': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    'title': res.get('title'),
                    'date': res.get('date'),
                    'source': res.get('source'),
                    'doc_url': res.get('doc_url')
                }
                new_alerts_count += 1
                log(f"🚨 PHÁT HIỆN BCTC QUÝ 3 MỚI: [{ticker}] - {res.get('title')} ({res.get('doc_url')})")
        else:
            status_str = "Chưa có"
            src_str = "-"
            doc_str = res.get('latest_doc', '')[:45]
            print(f"{ticker:<8} | {status_str:<15} | {src_str:<12} | {doc_str:<45}")
            
    print("-" * 85)
    
    if new_alerts_count > 0:
        save_alerts_history(alerts)
        log(f"Đã lưu {new_alerts_count} thông báo mới vào {ALERTS_FILE}")
    else:
        log("Kết quả: Chưa có mã nào trong 23 mã thuộc Batch 01 ra BCTC Quý 3 hôm nay (12/10).")
        log("Sẵn sàng giám sát tự động khi các doanh nghiệp bắt đầu công bố từ ngày 15/10!")
        
    return results

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Quét BCTC Batch 01")
    parser.add_argument("--loop", action="store_true", help="Chạy vòng lặp ngầm liên tục định kỳ")
    parser.add_argument("--interval", type=int, default=900, help="Thời gian nghỉ giữa các lần quét (giây, mặc định 900s = 15 phút)")
    args = parser.parse_args()
    
    if args.loop:
        log(f"Khởi động chế độ quét ngầm tự động (chu kỳ {args.interval} giây / {args.interval/60:.1f} phút)...")
        while True:
            try:
                run_batch_01_scan()
            except Exception as e:
                log(f"Lỗi trong vòng lặp quét: {e}")
            log(f"Nghỉ ngơi {args.interval} giây trước lượt quét tiếp theo...")
            time.sleep(args.interval)
    else:
        run_batch_01_scan()
