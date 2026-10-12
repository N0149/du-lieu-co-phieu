"""
HỆ THỐNG GIÁM SÁT & BÓC TÁCH BCTC QUÝ 3/2026 TỰ ĐỘNG
Tự động quét Web Doanh nghiệp + Cổng EzIR FPTS.
Cập nhật Web dulieudautu.com VÀ đồng bộ trực tiếp vào file Excel theo dõi (Tài liệu mới nhất, ngày công bố, link mở trực tiếp).
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
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

BASE_DIR = r"d:\hoc\lap trinh\du-lieu-co-phieu"
EXCEL_PATH = r"D:\hoc\lap trinh\check BCTC Distill\Danh_sach_tong_hop_278_ma_BCTC.xlsx"
EXCEL_FALLBACK = r"D:\hoc\lap trinh\check BCTC Distill\Danh_sach_sua_link_BCTC_Batch_04_den_12.xlsx"
ALERTS_FILE = os.path.join(BASE_DIR, "data", "bctc_q3_live_alerts.json")
LOG_FILE = os.path.join(BASE_DIR, "data", "bctc_monitor_115.log")

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

def load_tickers_from_excel(limit=115):
    """Đọc limit mã đầu tiên từ file Excel (hoặc toàn bộ nếu limit=None)"""
    excel_file = EXCEL_PATH if os.path.exists(EXCEL_PATH) else EXCEL_FALLBACK
    if not os.path.exists(excel_file):
        log(f"LỖI: Không tìm thấy file Excel tại {excel_file}")
        return []
        
    wb = openpyxl.load_workbook(excel_file, data_only=True)
    ws = wb.active
    
    tickers = []
    max_r = ws.max_row
    end_r = (limit + 1) if (limit and limit > 0) else max_r
    end_r = min(end_r, max_r)
    
    for r in range(2, end_r + 1):
        stt = ws.cell(row=r, column=1).value
        ticker = ws.cell(row=r, column=2).value
        name = ws.cell(row=r, column=3).value
        san = ws.cell(row=r, column=4).value
        batch_file = ws.cell(row=r, column=5).value
        dot_ra = ws.cell(row=r, column=6).value
        link_hientai = ws.cell(row=r, column=7).value
        link_moi = ws.cell(row=r, column=8).value
        
        if not ticker:
            continue
            
        ticker = str(ticker).strip()
        final_link = str(link_moi).strip() if (link_moi and str(link_moi).strip()) else (str(link_hientai).strip() if link_hientai else '')
        
        tickers.append({
            'stt': stt,
            'ticker': ticker,
            'name': str(name).strip() if name else '',
            'san': str(san).strip() if san else 'UPCOM',
            'batch_file': str(batch_file).strip() if batch_file else '',
            'dot_ra': str(dot_ra).strip() if dot_ra else '',
            'uri': final_link
        })
        
    return tickers

def load_alerts_history():
    if os.path.exists(ALERTS_FILE):
        try:
            with open(ALERTS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return {item['ticker']: item for item in data if 'ticker' in item}
                elif isinstance(data, dict):
                    return data
        except:
            return {}
    return {}

def save_alerts_history(alerts_dict):
    try:
        os.makedirs(os.path.dirname(ALERTS_FILE), exist_ok=True)
        alerts_list = list(alerts_dict.values())
        alerts_list.sort(key=lambda x: x.get('detected_at') or x.get('first_detected') or '', reverse=True)
        with open(ALERTS_FILE, "w", encoding="utf-8") as f:
            json.dump(alerts_list, f, ensure_ascii=False, indent=2)
    except Exception as e:
        log(f"Lỗi lưu alerts: {e}")

def is_q3_2026(text):
    """
    Nhận diện chính xác 100% tài liệu BCTC Quý 3/2026.
    Lọc bỏ: kế hoạch, danh sách cổ đông, niên độ cũ, các năm cũ 2018-2025.
    """
    if not text:
        return False, ""
    lower = text.lower()
    
    excluded = ['kế hoạch', 'ke hoach', 'cổ đông lớn', 'cổ đông nhà nước', 'danh sách cổ đông', 'niên độ 2025-2026', 'niên độ 2024-2025']
    if any(k in lower for k in excluded):
        return False, ""
        
    # Loại trừ năm cũ (2018 -> 2025) nếu tiêu đề không nói về niên độ/năm 2026
    old_years = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025']
    if any(y in lower for y in old_years) and '2026' not in lower:
        return False, ""
        
    pattern1 = r'(?:báo\s*cáo\s*tài\s*chính|bctc|financial\s*statements|kqkd|giải\s*trình\s*(?:chênh\s*lệch\s*)?lợi\s*nhuận)[^,\n\r]{0,35}(?:quý\s*3|quy\s*3|q3|quý\s*iii|quy\s*iii|quarter\s*3)[^,\n\r]{0,25}(?:2026|[\'/\-]26\b)'
    pattern2 = r'(?:quý\s*3|quy\s*3|q3|quý\s*iii|quy\s*iii|quarter\s*3)[^,\n\r]{0,15}(?:2026|[\'/\-]26\b)[^,\n\r]{0,35}(?:báo\s*cáo\s*tài\s*chính|bctc|financial\s*statements)'
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
    """
    Quét dữ liệu chuẩn hóa từ cổng EzIR FPTS:
    - Thu thập ngày công bố gần nhất, tiêu đề tài liệu mới nhất, và link tải PDF trực tiếp.
    - Phát hiện BCTC Quý 3/2026.
    """
    url = f"https://gateway.fpts.com.vn/news/api/gateway/v1/mobile/list?folder=86&code={ticker}&pageSize=10&selectedPage=1&newsType=2"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            items = data.get('Data', {}).get('Table1', [])
            
            latest = items[0] if items else {}
            latest_title = latest.get('Title', '').strip()
            latest_date = latest.get('DatePub', '').strip()
            raw_url = latest.get('URL', '')
            latest_url = raw_url.replace('\\', '/').strip() if raw_url else f"https://ezir.fpts.com.vn/TinTuc/TinTucDN?code={ticker}"
            
            for item in items:
                title = item.get('Title', '').strip()
                date_pub = item.get('DatePub', '').strip()
                i_raw_url = item.get('URL', '')
                doc_url = i_raw_url.replace('\\', '/').strip() if i_raw_url else f"https://ezir.fpts.com.vn/TinTuc/TinTucDN?code={ticker}"
                
                is_recent = '10/2026' in date_pub or '10/26' in date_pub or '11/2026' in date_pub
                matched, snippet = is_q3_2026(title)
                if matched and is_recent:
                    return {
                        'has_q3': True,
                        'source': 'EzIR_FPTS',
                        'title': title,
                        'date': date_pub,
                        'doc_url': doc_url,
                        'latest_title': title,
                        'latest_date': date_pub,
                        'latest_url': doc_url
                    }
                    
            return {
                'has_q3': False,
                'source': 'EzIR_FPTS',
                'latest_doc': f"[{latest_date}] {latest_title}" if latest_title else "Chưa có tài liệu mới",
                'latest_title': latest_title,
                'latest_date': latest_date,
                'latest_url': latest_url
            }
    except Exception as e:
        return {
            'has_q3': False,
            'source': 'EzIR_FPTS',
            'error': str(e),
            'latest_doc': f"Lỗi ({e})",
            'latest_title': '',
            'latest_date': '',
            'latest_url': f"https://ezir.fpts.com.vn/TinTuc/TinTucDN?code={ticker}"
        }

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
        
        # Quét tìm kiếm từ khóa Q3/2026 trong toàn bộ text
        matched, snippet = is_q3_2026(full_text)
        if matched:
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
            
        # Tìm kiếm trong các thẻ link download
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

def scan_single_ticker(item):
    """Kiểm tra đa tầng cho 1 mã cổ phiếu"""
    ticker = item['ticker']
    uri = item['uri']
    start_t = time.time()
    
    # 1. Thu thập dữ liệu tài liệu mới nhất từ EzIR FPTS
    res_ezir = check_fpts_ezir(ticker)
    
    # 2. Kiểm tra bổ sung trên Web riêng của công ty
    res_web = check_company_website(ticker, uri)
    if res_web and res_web.get('has_q3'):
        res_web['elapsed'] = round(time.time() - start_t, 2)
        res_web['latest_title'] = res_web.get('title')
        res_web['latest_date'] = res_web.get('date')
        res_web['latest_url'] = res_web.get('doc_url')
        return ticker, item, res_web
        
    if res_ezir.get('has_q3'):
        res_ezir['elapsed'] = round(time.time() - start_t, 2)
        return ticker, item, res_ezir
        
    res_ezir['elapsed'] = round(time.time() - start_t, 2)
    return ticker, item, res_ezir

def write_results_to_excel(results, target_file):
    """
    Ghi thông tin tài liệu mới nhất, ngày công bố và link bấm xem PDF vào Excel:
    - Cột 10: Ngày CB Gần Nhất (Highlight nếu là hôm nay hoặc tháng 10)
    - Cột 11: Tài Liệu Mới Nhất Công Bố (Click mở xem PDF)
    - Cột 12: Trạng Thái BCTC Q3/2026
    - Cột 13: Cập Nhật Lúc
    """
    if not os.path.exists(target_file):
        return False
        
    try:
        wb = openpyxl.load_workbook(target_file)
        ws = wb.active
        
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
        thin_border = Border(
            left=Side(style='thin', color='D9D9D9'),
            right=Side(style='thin', color='D9D9D9'),
            top=Side(style='thin', color='D9D9D9'),
            bottom=Side(style='thin', color='D9D9D9')
        )
        
        headers = {
            10: "Ngày CB Gần Nhất",
            11: "Tài Liệu Mới Nhất Công Bố (Click mở xem)",
            12: "Trạng Thái BCTC Q3/2026",
            13: "Cập Nhật Lúc"
        }
        for col_idx, text in headers.items():
            cell = ws.cell(row=1, column=col_idx)
            cell.value = text
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
            cell.border = thin_border
            
        ws.column_dimensions['J'].width = 18
        ws.column_dimensions['K'].width = 52
        ws.column_dimensions['L'].width = 24
        ws.column_dimensions['M'].width = 16
        
        now_str = datetime.datetime.now().strftime("%d/%m %H:%M")
        updated_count = 0
        
        for r in range(2, ws.max_row + 1):
            ticker_val = ws.cell(row=r, column=2).value
            if not ticker_val:
                continue
            ticker_str = str(ticker_val).strip()
            if ticker_str in results:
                item, res = results[ticker_str]
                updated_count += 1
                
                latest_date = res.get('latest_date', '') or res.get('date', '')
                latest_title = res.get('latest_title', '') or res.get('title', '') or res.get('latest_doc', '')
                latest_url = res.get('latest_url', '') or res.get('doc_url', '')
                has_q3 = res.get('has_q3', False)
                
                # Cột 10: Ngày CB Gần Nhất
                c10 = ws.cell(row=r, column=10)
                c10.value = latest_date
                c10.alignment = Alignment(horizontal='center', vertical='center')
                c10.border = thin_border
                
                # Highlight thông minh:
                # Nếu là ngày hôm nay (12/10): Nền vàng nhạt nổi bật
                # Nếu là tháng 10: Chữ xanh đậm
                if '12/10/2026' in latest_date or '12/10/26' in latest_date:
                    c10.fill = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
                    c10.font = Font(name="Calibri", size=10, bold=True, color="B25900")
                elif '10/2026' in latest_date:
                    c10.fill = PatternFill(start_color="F2F2F2", end_color="F2F2F2", fill_type="solid")
                    c10.font = Font(name="Calibri", size=10, bold=False, color="1F4E78")
                else:
                    c10.font = Font(name="Calibri", size=10, color="595959")
                    c10.fill = PatternFill(fill_type=None)
                    
                # Cột 11: Tài Liệu Mới Nhất Công Bố (Click mở xem)
                c11 = ws.cell(row=r, column=11)
                c11.value = latest_title if latest_title else "Chưa có tài liệu mới"
                c11.alignment = Alignment(horizontal='left', vertical='center')
                c11.border = thin_border
                if latest_url:
                    c11.hyperlink = latest_url
                    c11.font = Font(name="Calibri", size=10, color="0563C1", underline="single")
                else:
                    c11.font = Font(name="Calibri", size=10, color="333333")
                    
                # Cột 12: Trạng Thái BCTC Q3/2026
                c12 = ws.cell(row=r, column=12)
                c12.alignment = Alignment(horizontal='center', vertical='center')
                c12.border = thin_border
                if has_q3:
                    c12.value = "🔥 ĐÃ CÓ BCTC Q3"
                    c12.font = Font(name="Calibri", size=10, bold=True, color="006100")
                    c12.fill = PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid")
                else:
                    c12.value = "Đang chờ Q3"
                    c12.font = Font(name="Calibri", size=10, color="7F7F7F")
                    c12.fill = PatternFill(fill_type=None)
                    
                # Cột 13: Cập Nhật Lúc
                c13 = ws.cell(row=r, column=13)
                c13.value = now_str
                c13.alignment = Alignment(horizontal='center', vertical='center')
                c13.font = Font(name="Calibri", size=9, color="8C8C8C")
                c13.border = thin_border
                
        wb.save(target_file)
        log(f"-> Đã đồng bộ thông tin tài liệu mới nhất vào Excel: {os.path.basename(target_file)} ({updated_count} mã)")
        return True
    except PermissionError:
        log(f"⚠️ CẢNH BÁO: File {os.path.basename(target_file)} đang mở trong Excel! Vui lòng lưu và đóng file Excel để ghi cập nhật.")
        # Lưu ra bản phụ an toàn để không mất kết quả quét
        backup_file = target_file.replace(".xlsx", "_CapNhat_MoiNhat.xlsx")
        try:
            wb.save(backup_file)
            log(f"-> Đã lưu bản sao lưu kết quả tại: {os.path.basename(backup_file)}")
        except:
            pass
        return False
    except Exception as e:
        log(f"Lỗi cập nhật Excel {os.path.basename(target_file)}: {e}")
        return False

def run_scan(limit=115):
    """Thực hiện quét danh sách mã cổ phiếu và đồng bộ Excel + Web"""
    tickers = load_tickers_from_excel(limit=limit)
    if not tickers:
        log("Không tìm thấy danh sách mã để quét.")
        return {}
        
    desc = f"{len(tickers)} MÃ ƯU TIÊN (BATCH 01 -> BATCH 05)" if limit == 115 else f"TOÀN BỘ {len(tickers)} MÃ"
    log(f"=== BẮT ĐẦU QUÉT {desc} ===")
    
    alerts_dict = load_alerts_history()
    new_alerts_count = 0
    
    start_total = time.time()
    results = {}
    
    with ThreadPoolExecutor(max_workers=25) as executor:
        futures = {executor.submit(scan_single_ticker, item): item['ticker'] for item in tickers}
        for f in futures:
            ticker, item, res = f.result()
            results[ticker] = (item, res)
            
    total_time = round(time.time() - start_total, 2)
    log(f"-> Hoàn tất quét {len(results)} mã trong {total_time} giây!")
    
    print("-" * 110)
    print(f"{'STT':<4} | {'MÃ CP':<7} | {'SÀN':<6} | {'NGÀY CB':<16} | {'TRẠNG THÁI':<15} | {'TÀI LIỆU MỚI NHẤT / PHÁT HIỆN':<45}")
    print("-" * 110)
    
    sorted_tickers = sorted(results.keys(), key=lambda t: results[t][0]['stt'])
    q3_count = 0
    
    for ticker in sorted_tickers:
        item, res = results[ticker]
        stt = item['stt']
        san = item['san']
        date_str = res.get('latest_date', '') or res.get('date', '')
        
        if res.get('has_q3'):
            q3_count += 1
            status_str = "🔥 ĐÃ RA Q3!"
            title_str = (res.get('title') or '')[:45]
            print(f"\033[92m{stt:<4} | {ticker:<7} | {san:<6} | {date_str:<16} | {status_str:<15} | {title_str:<45}\033[0m")
            
            # Ghi nhận alert mới nếu chưa có
            if ticker not in alerts_dict:
                alerts_dict[ticker] = {
                    'ticker': ticker,
                    'company_name': item['name'],
                    'exchange': san,
                    'quarter': 'Quý 3/2026',
                    'release_date': res.get('date', datetime.datetime.now().strftime("%d/%m/%Y %H:%M")),
                    'title': res.get('title'),
                    'source': res.get('source'),
                    'net_profit': 'Đang cập nhật...',
                    'growth_rate': 'Đang tính...',
                    'growth_direction': 'up',
                    'explanation': '',
                    'doc_url': res.get('doc_url'),
                    'is_hot': True,
                    'detected_at': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                new_alerts_count += 1
                log(f"🚨 PHÁT HIỆN BCTC QUÝ 3 MỚI: [{ticker}] - {res.get('title')} ({res.get('doc_url')})")
        else:
            status_str = "Chưa có"
            doc_str = (res.get('latest_title') or res.get('latest_doc') or '')[:45]
            # Đổi màu nếu là ngày 12/10 hôm nay
            if '12/10' in date_str:
                print(f"\033[93m{stt:<4} | {ticker:<7} | {san:<6} | {date_str:<16} | {status_str:<15} | {doc_str:<45}\033[0m")
            else:
                print(f"{stt:<4} | {ticker:<7} | {san:<6} | {date_str:<16} | {status_str:<15} | {doc_str:<45}")
            
    print("-" * 110)
    log(f"Tổng kết lượt quét: {q3_count} / {len(tickers)} mã đã có BCTC Quý 3/2026.")
    
    # 1. Lưu cảnh báo lên website nếu có phát hiện mới
    if new_alerts_count > 0:
        save_alerts_history(alerts_dict)
        log(f"Đã cập nhật {new_alerts_count} cảnh báo mới lên website dulieudautu.com!")
        
    # 2. Đồng bộ trực tiếp vào cả 2 file Excel theo dõi
    for target_excel in [EXCEL_PATH, EXCEL_FALLBACK]:
        if os.path.exists(target_excel):
            write_results_to_excel(results, target_excel)
            
    # 3. Tự động deploy ngay lên dulieudautu.com (qua GitHub & Vercel)
    auto_deploy_to_web()
            
    return results

def auto_deploy_to_web():
    """
    Tự động đồng bộ và deploy dữ liệu lên website dulieudautu.com:
    - Commit file data/bctc_q3_live_alerts.json và giao diện tab BCTC Quý 3
    - Push lên GitHub origin main -> Vercel tự động kích hoạt deploy bản mới
    - Đồng thời GitHub Raw JSON cập nhật lập tức trong 1 giây để web đọc realtime
    """
    import subprocess
    try:
        log("🚀 Đang tự động deploy lên website dulieudautu.com...")
        files = [
            "data/bctc_q3_live_alerts.json",
            "app/tin-tuc/page.tsx",
            "components/news/news-dashboard.tsx",
            "components/news/bctc-q3-view.tsx",
            "app/api/bctc-alerts/",
            "lib/bctc-alerts-service.ts"
        ]
        for f in files:
            subprocess.run(["git", "add", f], cwd=BASE_DIR, check=False)
            
        diff_res = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=BASE_DIR)
        if diff_res.returncode != 0:
            commit_msg = f"feat(bctc): auto deploy live Q3 BCTC alerts [{datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}]"
            subprocess.run(["git", "commit", "-m", commit_msg], cwd=BASE_DIR, check=True, capture_output=True, text=True)
            log("-> Đã commit cập nhật BCTC Quý 3 mới.")
            
        push_res = subprocess.run(["git", "push", "origin", "main"], cwd=BASE_DIR, capture_output=True, text=True)
        if push_res.returncode == 0:
            log("✅ Deploy thành công lên dulieudautu.com (GitHub & Vercel)!")
        else:
            log(f"⚠️ Push GitHub: {push_res.stderr.strip() if push_res.stderr else 'OK'}")
    except Exception as e:
        log(f"Lỗi deploy lên web: {e}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Hệ Thống Giám Sát BCTC Quý 3/2026 & Cập Nhật Excel")
    parser.add_argument("--all", action="store_true", help="Quét toàn bộ 278 mã thay vì 115 mã ưu tiên")
    parser.add_argument("--limit", type=int, default=115, help="Số lượng mã cần quét (mặc định 115)")
    parser.add_argument("--loop", action="store_true", help="Chạy vòng lặp ngầm liên tục định kỳ")
    parser.add_argument("--interval", type=int, default=900, help="Thời gian nghỉ giữa các lần quét (giây, mặc định 900s = 15 phút)")
    args = parser.parse_args()
    
    scan_limit = None if args.all else args.limit
    
    if args.loop:
        desc = "toàn bộ 278 mã" if args.all else f"{args.limit} mã ưu tiên"
        log(f"Khởi động chế độ quét ngầm tự động {desc} (chu kỳ {args.interval} giây / {args.interval/60:.1f} phút)...")
        while True:
            try:
                run_scan(limit=scan_limit)
            except Exception as e:
                log(f"Lỗi trong vòng lặp quét: {e}")
            log(f"Nghỉ ngơi {args.interval} giây trước lượt quét tiếp theo...")
            time.sleep(args.interval)
    else:
        run_scan(limit=scan_limit)
