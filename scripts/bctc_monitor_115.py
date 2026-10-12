"""
HỆ THỐNG GIÁM SÁT & BÓC TÁCH BCTC QUÝ 3/2026 TỰ ĐỘNG - PHÂN 3 NHÓM THÔNG MINH
- Nhóm 1: 115 mã đầu tiên (STT 1 -> 115, Batch 01 -> Batch 05, từ 15 - 23/10)
- Nhóm 2: Từ mã 116 đến 184 (STT 116 -> 184, Batch 06 -> Batch 08, từ 23 - 29/10)
- Nhóm 3: Những mã còn lại (STT 185 -> 278, Batch 09 -> Batch 12, từ 29 - 30/10)
TÍNH NĂNG TỐI ƯU HÓA:
1. Mã đã có BCTC Hợp nhất / Đầy đủ -> Tự động ghi nhớ vào Cache, lần sau BỎ QUA không quét mạng (tiết kiệm thời gian tối đa).
2. Mã mới chỉ có BCTC Riêng -> Ghi nhận cảnh báo nhưng VẪN TIẾP TỤC QUÉT các lần sau cho đến khi có BCTC Hợp nhất.
3. Tự động bắn thông báo tức thì lên Discord (điện thoại & PC), đồng bộ Excel và deploy web dulieudautu.com.
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
COMPLETED_CACHE_FILE = os.path.join(BASE_DIR, "data", "bctc_completed_cache.json")
DISCORD_CONFIG_FILE = os.path.join(BASE_DIR, "data", "discord_config.json")

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

def load_completed_cache():
    if os.path.exists(COMPLETED_CACHE_FILE):
        try:
            with open(COMPLETED_CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_completed_cache(cache):
    try:
        os.makedirs(os.path.dirname(COMPLETED_CACHE_FILE), exist_ok=True)
        with open(COMPLETED_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        log(f"Lỗi lưu completed cache: {e}")

def classify_bctc_type(title):
    """
    Phân loại BCTC:
    - 'HOP_NHAT': Báo cáo tài chính Hợp nhất (hoàn tất đầy đủ cho tập đoàn / cty có cty con)
    - 'RIENG': Báo cáo tài chính riêng / cty mẹ (phải tiếp tục quét chờ bản Hợp nhất)
    - 'GIAI_TRINH': Chỉ mới có công văn giải trình kết quả kinh doanh
    - 'DAY_DU': BCTC không phân biệt riêng/hợp nhất (doanh nghiệp đơn lẻ không có cty con)
    """
    if not title:
        return 'DAY_DU'
    lower = title.lower()
    
    if 'giải trình' in lower or 'giai trinh' in lower:
        return 'GIAI_TRINH'
        
    is_hop_nhat = any(k in lower for k in ['hợp nhất', 'hop nhat', 'consolidated', 'toàn tập', 'toan tap', 'hopnhat', 'cty me va cty con'])
    is_rieng = any(k in lower for k in ['riêng', 'rieng', 'công ty mẹ', 'cty mẹ', 'cty me', 'cong ty me', 'parent', 'đơn lẻ', 'don le'])
    
    if is_hop_nhat:
        return 'HOP_NHAT'
    if is_rieng:
        return 'RIENG'
    return 'DAY_DU'

def load_tickers_from_excel(group='1', start_stt=None, end_stt=None):
    """
    Đọc danh sách mã theo 3 nhóm hoặc khoảng STT tùy chọn:
    - Nhóm 1: STT 1 đến 115 (115 mã, Batch 01 -> 05, từ 15 - 23/10)
    - Nhóm 2: STT 116 đến 184 (69 mã, Batch 06 -> 08, từ 23 - 29/10)
    - Nhóm 3: STT 185 đến 278 (94 mã, Batch 09 -> 12, từ 29 - 30/10)
    - all: STT 1 đến 278 (toàn bộ)
    """
    if start_stt is not None and end_stt is not None:
        range_start, range_end = start_stt, end_stt
    elif str(group) == '1':
        range_start, range_end = 1, 115
    elif str(group) == '2':
        range_start, range_end = 116, 184
    elif str(group) == '3':
        range_start, range_end = 185, 278
    else:
        range_start, range_end = 1, 278

    excel_file = EXCEL_PATH if os.path.exists(EXCEL_PATH) else EXCEL_FALLBACK
    if not os.path.exists(excel_file):
        log(f"LỖI: Không tìm thấy file Excel tại {excel_file}")
        return [], range_start, range_end
        
    wb = openpyxl.load_workbook(excel_file, data_only=True)
    ws = wb.active
    
    tickers = []
    for r in range(2, ws.max_row + 1):
        stt_val = ws.cell(row=r, column=1).value
        try:
            stt_num = int(stt_val)
        except (TypeError, ValueError):
            continue
            
        if not (range_start <= stt_num <= range_end):
            continue
            
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
            'stt': stt_num,
            'ticker': ticker,
            'name': str(name).strip() if name else '',
            'san': str(san).strip() if san else 'UPCOM',
            'batch_file': str(batch_file).strip() if batch_file else '',
            'dot_ra': str(dot_ra).strip() if dot_ra else '',
            'uri': final_link
        })
        
    return tickers, range_start, range_end

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
        
    # Loại bỏ ngay lập tức nếu là Quý 3 của các năm cũ (2018-2025)
    if re.search(r'(?:quý\s*3|q3|quy\s*3|quý\s*iii|quy\s*iii|quarter\s*3)[_\s\-/]*(?:201[89]|202[0-5])(?!\d)', lower):
        return False, ""
        
    old_years = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025']
    if any(y in lower for y in old_years) and not re.search(r'(?<!\d)(?:2026|\'26)(?!\d)', lower):
        return False, ""
        
    pattern1 = r'(?:báo\s*cáo\s*tài\s*chính|bctc|financial\s*statements|kqkd|giải\s*trình\s*(?:chênh\s*lệch\s*)?lợi\s*nhuận)[^,\n\r]{0,35}(?:quý\s*3|quy\s*3|q3|quý\s*iii|quy\s*iii|quarter\s*3)[^,\n\r]{0,25}(?:(?<!\d)2026(?!\d)|[\'/\-]26\b)'
    pattern2 = r'(?:quý\s*3|quy\s*3|q3|quý\s*iii|quy\s*iii|quarter\s*3)[^,\n\r]{0,15}(?:(?<!\d)2026(?!\d)|[\'/\-]26\b)[^,\n\r]{0,35}(?:báo\s*cáo\s*tài\s*chính|bctc|financial\s*statements)'
    pattern3 = r'(?:bctc|fs)[_\-\s]*(?:q3|quy3|quyi?ii)[_\-\s]*(?<!\d)2026(?!\d)'

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
    - Phát hiện BCTC Quý 3/2026 (Ưu tiên BCTC Hợp nhất nếu có cả riêng lẫn hợp nhất).
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
            
            q3_found_items = []
            for item in items:
                title = item.get('Title', '').strip()
                date_pub = item.get('DatePub', '').strip()
                i_raw_url = item.get('URL', '')
                doc_url = i_raw_url.replace('\\', '/').strip() if i_raw_url else f"https://ezir.fpts.com.vn/TinTuc/TinTucDN?code={ticker}"
                
                is_recent = '10/2026' in date_pub or '10/26' in date_pub or '11/2026' in date_pub
                matched, snippet = is_q3_2026(title)
                if matched and is_recent:
                    b_type = classify_bctc_type(title)
                    q3_found_items.append({
                        'title': title,
                        'date': date_pub,
                        'doc_url': doc_url,
                        'bctc_type': b_type
                    })
                    
            if q3_found_items:
                # Ưu tiên BCTC Hợp nhất nếu có cả hai
                hop_nhat_item = next((it for it in q3_found_items if it['bctc_type'] == 'HOP_NHAT'), None)
                best_item = hop_nhat_item or q3_found_items[0]
                
                return {
                    'has_q3': True,
                    'bctc_type': best_item['bctc_type'],
                    'source': 'EzIR_FPTS',
                    'title': best_item['title'],
                    'date': best_item['date'],
                    'doc_url': best_item['doc_url'],
                    'latest_title': best_item['title'],
                    'latest_date': best_item['date'],
                    'latest_url': best_item['doc_url']
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
        
        matched, snippet = is_q3_2026(full_text)
        if matched:
            doc_url = clean_uri
            for a in soup.find_all('a', href=True):
                h = a['href']
                t = a.get_text(strip=True)
                m_t, _ = is_q3_2026(t)
                if m_t:
                    doc_url = urllib.parse.urljoin(clean_uri, h)
                    break
                elif any(h.lower().endswith(ext) for ext in ['.pdf', '.zip', '.rar', '.xlsx']):
                    m_h, _ = is_q3_2026(urllib.parse.unquote(h))
                    if m_h:
                        doc_url = urllib.parse.urljoin(clean_uri, h)
                        break
                    
            final_title = snippet or "Báo cáo tài chính Quý 3/2026"
            return {
                'has_q3': True,
                'bctc_type': classify_bctc_type(final_title),
                'source': 'Company_Web',
                'title': final_title,
                'date': datetime.datetime.now().strftime("%d/%m/%Y"),
                'doc_url': doc_url
            }
            
        for a in soup.find_all('a', href=True):
            h = a['href']
            t = a.get_text(strip=True)
            matched_t, snippet_t = is_q3_2026(t)
            if matched_t:
                final_title = t or snippet_t
                return {
                    'has_q3': True,
                    'bctc_type': classify_bctc_type(final_title),
                    'source': 'Company_Web',
                    'title': final_title,
                    'date': datetime.datetime.now().strftime("%d/%m/%Y"),
                    'doc_url': urllib.parse.urljoin(clean_uri, h)
                }
            elif any(h.lower().endswith(ext) for ext in ['.pdf', '.zip', '.rar', '.xlsx', '.docx']):
                matched_h, snippet_h = is_q3_2026(urllib.parse.unquote(h))
                if matched_h:
                    final_title = snippet_h or "Báo cáo tài chính Quý 3/2026"
                    return {
                        'has_q3': True,
                        'bctc_type': classify_bctc_type(final_title),
                        'source': 'Company_Web',
                        'title': final_title,
                        'date': datetime.datetime.now().strftime("%d/%m/%Y"),
                        'doc_url': urllib.parse.urljoin(clean_uri, h)
                    }
                
        return {'has_q3': False, 'source': 'Company_Web'}
    except Exception as e:
        return {'has_q3': False, 'source': 'Company_Web', 'error': str(e)}

def scan_single_ticker(item, completed_cache):
    """
    Kiểm tra đa tầng cho 1 mã cổ phiếu:
    - Nếu đã có BCTC Hợp nhất hoặc BCTC Đầy đủ trong cache -> BỎ QUA QUÉT MẠNG (0s).
    - Nếu mới có BCTC Riêng -> TIẾP TỤC QUÉT MẠNG xem đã có BCTC Hợp nhất chưa.
    """
    ticker = item['ticker']
    uri = item['uri']
    start_t = time.time()
    
    # 1. KIỂM TRA BỎ QUA NẾU ĐÃ HOÀN TẤT ĐẦY ĐỦ (HOP_NHAT HOẶC DAY_DU)
    if ticker in completed_cache:
        cached_info = completed_cache[ticker]
        c_type = cached_info.get('bctc_type', '')
        if c_type in ['HOP_NHAT', 'DAY_DU']:
            return ticker, item, {
                'has_q3': True,
                'is_cached': True,
                'bctc_type': c_type,
                'title': cached_info.get('title', ''),
                'date': cached_info.get('date', ''),
                'doc_url': cached_info.get('doc_url', ''),
                'latest_title': cached_info.get('title', ''),
                'latest_date': cached_info.get('date', ''),
                'latest_url': cached_info.get('doc_url', ''),
                'source': cached_info.get('source', 'Cache'),
                'elapsed': 0.0
            }
            
    # 2. Thu thập dữ liệu tài liệu mới nhất từ EzIR FPTS
    res_ezir = check_fpts_ezir(ticker)
    
    # 3. Kiểm tra bổ sung trên Web riêng của công ty
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
    - Cột 12: Trạng Thái BCTC Q3/2026 (Phân biệt Hợp nhất, Riêng, Đầy đủ)
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
        ws.column_dimensions['L'].width = 28
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
                bctc_type = res.get('bctc_type', '')
                
                # Cột 10: Ngày CB Gần Nhất
                c10 = ws.cell(row=r, column=10)
                c10.value = latest_date
                c10.alignment = Alignment(horizontal='center', vertical='center')
                c10.border = thin_border
                
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
                    if bctc_type == 'HOP_NHAT':
                        c12.value = "🔥 ĐÃ CÓ BCTC HỢP NHẤT"
                        c12.font = Font(name="Calibri", size=10, bold=True, color="006100")
                        c12.fill = PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid")
                    elif bctc_type == 'RIENG':
                        c12.value = "⚡ MỚI CÓ BCTC RIÊNG (Chờ HN)"
                        c12.font = Font(name="Calibri", size=10, bold=True, color="B25900")
                        c12.fill = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
                    elif bctc_type == 'GIAI_TRINH':
                        c12.value = "📝 ĐÃ CÓ GIẢI TRÌNH (Chờ BCTC)"
                        c12.font = Font(name="Calibri", size=10, bold=True, color="003366")
                        c12.fill = PatternFill(start_color="DDEBF7", end_color="DDEBF7", fill_type="solid")
                    else:
                        c12.value = "🔥 ĐÃ CÓ BCTC ĐẦY ĐỦ"
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

def auto_deploy_to_web():
    """Tự động commit và push dữ liệu lên GitHub & Vercel deploy lên dulieudautu.com"""
    import subprocess
    try:
        files = [
            "data/bctc_q3_live_alerts.json",
            "data/bctc_completed_cache.json",
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
            log("🚀 Đang tự động deploy lên website dulieudautu.com...")
            commit_msg = f"feat(bctc): auto deploy live Q3 BCTC alerts [{datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}]"
            subprocess.run(["git", "commit", "-m", commit_msg], cwd=BASE_DIR, check=True, capture_output=True, text=True)
            log("-> Đã commit cập nhật BCTC Quý 3 mới.")
            
            push_res = subprocess.run(["git", "push", "origin", "main"], cwd=BASE_DIR, capture_output=True, text=True)
            if push_res.returncode == 0:
                log("✅ Deploy thành công lên dulieudautu.com (GitHub & Vercel)!")
            else:
                log(f"⚠️ Push GitHub: {push_res.stderr.strip() if push_res.stderr else 'OK'}")
        else:
            log("-> Dữ liệu web đã ở trạng thái mới nhất.")
    except Exception as e:
        log(f"Lỗi deploy lên web: {e}")

def send_discord_alert(alert_data, is_new_hop_nhat=False):
    """Gửi thông báo tức thì đến Discord qua Webhook (Điện thoại & PC reo chuông ngay)"""
    url = os.environ.get("DISCORD_WEBHOOK_URL")
    if not url and os.path.exists(DISCORD_CONFIG_FILE):
        try:
            with open(DISCORD_CONFIG_FILE, "r", encoding="utf-8") as f:
                d = json.load(f)
                url = d.get("webhook_url")
        except:
            pass
            
    if not url:
        return False
        
    ticker = alert_data.get("ticker", "")
    company = alert_data.get("company_name", "")
    exchange = alert_data.get("exchange", "UPCOM")
    title = alert_data.get("title", "Báo cáo tài chính Quý 3/2026")
    profit = alert_data.get("net_profit", "Đang cập nhật...")
    growth = alert_data.get("growth_rate", "Đang tính...")
    doc_url = alert_data.get("doc_url", "")
    date_pub = alert_data.get("release_date", "")
    bctc_type = alert_data.get("bctc_type", "DAY_DU")
    
    if is_new_hop_nhat:
        header_title = f"🌟 ĐÃ CÓ BCTC HỢP NHẤT: {ticker} (BỔ SUNG SAU BCTC RIÊNG)"
        color = 0x10B981 # Xanh ngọc nổi bật
    elif bctc_type == 'RIENG':
        header_title = f"⚡ PHÁT HIỆN BCTC RIÊNG QUÝ 3: {ticker} (ĐANG CHỜ HỢP NHẤT)"
        color = 0xF59E0B # Vàng cam
    elif bctc_type == 'HOP_NHAT':
        header_title = f"🚨 PHÁT HIỆN BCTC HỢP NHẤT QUÝ 3: {ticker}"
        color = 0x22C55E # Xanh lá cây
    else:
        header_title = f"🚨 PHÁT HIỆN BCTC QUÝ 3/2026: {ticker}"
        color = 0x22C55E if "+" in str(growth) else 0x3B82F6
        
    embed = {
        "title": header_title,
        "description": f"🏢 **{company}** (`{exchange}`)\n📄 *{title}*",
        "color": color,
        "fields": [
            {
                "name": "💰 LNST Quý 3/2026",
                "value": f"**{profit}**",
                "inline": True
            },
            {
                "name": "📈 Tăng Trưởng YoY",
                "value": f"**{growth}**",
                "inline": True
            },
            {
                "name": "⏰ Giờ Công Bố",
                "value": f"`{date_pub}`",
                "inline": True
            }
        ],
        "footer": {
            "text": "Radar BCTC Quý 3 • dulieudautu.com"
        },
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    
    if doc_url:
        embed["fields"].append({
            "name": "📥 Tải & Xem BCTC Gốc (PDF)",
            "value": f"[👉 Bấm vào đây để mở trực tiếp file PDF]({doc_url})",
            "inline": False
        })
        
    payload = {
        "content": f"🔔 **CẢNH BÁO BCTC QUÝ 3:** `{ticker}` vừa công bố tài liệu mới! @everyone",
        "username": "Radar BCTC Quý 3 (dulieudautu.com)",
        "avatar_url": "https://dulieudautu.com/icon.svg",
        "embeds": [embed]
    }
    
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status in [200, 204]:
                log(f"🔔 Đã bắn thông báo tức thì lên Discord cho mã [{ticker}]!")
                return True
    except Exception as e:
        log(f"Lỗi gửi Discord webhook: {e}")
        return False

def run_scan(group='1', start_stt=None, end_stt=None):
    """Thực hiện quét danh sách mã theo nhóm và đồng bộ Discord + Excel + Web"""
    tickers, range_start, range_end = load_tickers_from_excel(group=group, start_stt=start_stt, end_stt=end_stt)
    if not tickers:
        log("Không tìm thấy danh sách mã để quét.")
        return {}
        
    group_name = {
        '1': "NHÓM 1 (STT 1 -> 115, Batch 01 -> 05)",
        '2': "NHÓM 2 (STT 116 -> 184, Batch 06 -> 08)",
        '3': "NHÓM 3 (STT 185 -> 278, Batch 09 -> 12)",
        'all': "TOÀN BỘ 278 MÃ (STT 1 -> 278)"
    }.get(str(group), f"DÃY TÙY CHỌN (STT {range_start} -> {range_end})")
    
    log(f"=== BẮT ĐẦU QUÉT {group_name} ({len(tickers)} MÃ) ===")
    
    alerts_dict = load_alerts_history()
    completed_cache = load_completed_cache()
    new_alerts_count = 0
    cache_updated = False
    
    # Đếm số mã đã hoàn tất để hiển thị
    already_done = [t['ticker'] for t in tickers if completed_cache.get(t['ticker'], {}).get('bctc_type') in ['HOP_NHAT', 'DAY_DU']]
    if already_done:
        log(f"💡 Đã phát hiện {len(already_done)} mã có BCTC đầy đủ từ trước (sẽ tự động BỎ QUA quét mạng để tiết kiệm thời gian).")
        
    start_total = time.time()
    results = {}
    
    with ThreadPoolExecutor(max_workers=25) as executor:
        futures = {executor.submit(scan_single_ticker, item, completed_cache): item['ticker'] for item in tickers}
        for f in futures:
            ticker, item, res = f.result()
            results[ticker] = (item, res)
            
    total_time = round(time.time() - start_total, 2)
    log(f"-> Hoàn tất kiểm tra {len(results)} mã trong {total_time} giây!")
    
    print("-" * 115)
    print(f"{'STT':<4} | {'MÃ CP':<7} | {'SÀN':<6} | {'NGÀY CB':<16} | {'TIẾN ĐỘ BCTC Q3':<25} | {'TÀI LIỆU MỚI NHẤT / PHÁT HIỆN':<40}")
    print("-" * 115)
    
    sorted_tickers = sorted(results.keys(), key=lambda t: results[t][0]['stt'])
    q3_count = 0
    
    for ticker in sorted_tickers:
        item, res = results[ticker]
        stt = item['stt']
        san = item['san']
        date_str = res.get('latest_date', '') or res.get('date', '')
        bctc_type = res.get('bctc_type', '')
        is_cached = res.get('is_cached', False)
        
        if res.get('has_q3'):
            q3_count += 1
            if is_cached:
                status_str = "🔥 ĐÃ XONG (Bỏ qua)"
            elif bctc_type == 'HOP_NHAT':
                status_str = "🔥 CÓ BCTC HỢP NHẤT"
            elif bctc_type == 'RIENG':
                status_str = "⚡ MỚI CÓ RIÊNG (Chờ HN)"
            elif bctc_type == 'GIAI_TRINH':
                status_str = "📝 CÓ GIẢI TRÌNH"
            else:
                status_str = "🔥 ĐÃ CÓ BCTC ĐẦY ĐỦ"
                
            title_str = (res.get('title') or '')[:40]
            print(f"\033[92m{stt:<4} | {ticker:<7} | {san:<6} | {date_str:<16} | {status_str:<25} | {title_str:<40}\033[0m")
            
            # Đánh giá cảnh báo Discord thông minh:
            # 1. Chưa có alert nào -> Phát hiện mới
            # 2. Trước đó chỉ có GIẢI TRÌNH -> Nay đã có BCTC thực tế (RIENG / HOP_NHAT / DAY_DU)
            # 3. Trước đó chỉ có BCTC RIÊNG -> Nay đã có BCTC HỢP NHẤT
            existing_alert = alerts_dict.get(ticker)
            old_bctc_type = existing_alert.get('bctc_type') if existing_alert else None
            
            is_first_detection = (existing_alert is None)
            is_upgrade_from_giai_trinh = (old_bctc_type == 'GIAI_TRINH' and bctc_type != 'GIAI_TRINH')
            is_new_hop_nhat = (old_bctc_type == 'RIENG' and bctc_type == 'HOP_NHAT')
            
            should_alert = (is_first_detection or is_upgrade_from_giai_trinh or is_new_hop_nhat)
            
            if should_alert and not is_cached:
                alerts_dict[ticker] = {
                    'ticker': ticker,
                    'company_name': item['name'],
                    'exchange': san,
                    'quarter': 'Quý 3/2026',
                    'release_date': res.get('date', datetime.datetime.now().strftime("%d/%m/%Y %H:%M")),
                    'title': res.get('title'),
                    'source': res.get('source'),
                    'bctc_type': bctc_type,
                    'net_profit': existing_alert.get('net_profit', 'Đang cập nhật...') if existing_alert else 'Đang cập nhật...',
                    'growth_rate': existing_alert.get('growth_rate', 'Đang tính...') if existing_alert else 'Đang tính...',
                    'growth_direction': 'up',
                    'explanation': existing_alert.get('explanation', '') if existing_alert else '',
                    'doc_url': res.get('doc_url'),
                    'is_hot': True,
                    'detected_at': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                new_alerts_count += 1
                log(f"🚨 PHÁT HIỆN BCTC QUÝ 3: [{ticker}] - {res.get('title')} ({bctc_type})")
                send_discord_alert(alerts_dict[ticker], is_new_hop_nhat=is_new_hop_nhat)
                
            # Lưu vào cache:
            # - HOP_NHAT hoặc DAY_DU: Lưu để lần sau BỎ QUA QUÉT MẠNG
            # - RIENG: Lưu trạng thái RIENG (không bỏ qua, vẫn quét tiếp)
            if bctc_type in ['HOP_NHAT', 'DAY_DU', 'RIENG'] and not is_cached:
                completed_cache[ticker] = {
                    'ticker': ticker,
                    'bctc_type': bctc_type,
                    'title': res.get('title'),
                    'date': res.get('date'),
                    'doc_url': res.get('doc_url'),
                    'source': res.get('source'),
                    'updated_at': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                cache_updated = True
        else:
            status_str = "Chưa có"
            doc_str = (res.get('latest_title') or res.get('latest_doc') or '')[:40]
            if '12/10' in date_str:
                print(f"\033[93m{stt:<4} | {ticker:<7} | {san:<6} | {date_str:<16} | {status_str:<25} | {doc_str:<40}\033[0m")
            else:
                print(f"{stt:<4} | {ticker:<7} | {san:<6} | {date_str:<16} | {status_str:<25} | {doc_str:<40}")
            
    print("-" * 115)
    log(f"Tổng kết lượt quét {group_name}: {q3_count} / {len(tickers)} mã đã ghi nhận BCTC Quý 3.")
    
    # 1. Lưu cache hoàn tất
    if cache_updated:
        save_completed_cache(completed_cache)
        
    # 2. Lưu cảnh báo lên website nếu có phát hiện mới
    if new_alerts_count > 0:
        save_alerts_history(alerts_dict)
        log(f"Đã cập nhật {new_alerts_count} cảnh báo mới lên website dulieudautu.com!")
        
    # 3. Đồng bộ trực tiếp vào cả 2 file Excel theo dõi
    for target_excel in [EXCEL_PATH, EXCEL_FALLBACK]:
        if os.path.exists(target_excel):
            write_results_to_excel(results, target_excel)
            
    # 4. Tự động deploy ngay lên dulieudautu.com (qua GitHub & Vercel)
    auto_deploy_to_web()
            
    return results

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Hệ Thống Giám Sát BCTC Quý 3/2026 - Phân 3 Nhóm Thông Minh")
    parser.add_argument("--group", choices=['1', '2', '3', 'all'], default=None, help="Chọn nhóm: 1 (1-115), 2 (116-184), 3 (185-278), all (1-278)")
    parser.add_argument("--all", action="store_true", dest="run_all", help="Quét toàn bộ 278 mã (tương đương --group all)")
    parser.add_argument("--limit", type=int, help="Số lượng mã (tương thích lệnh cũ)")
    parser.add_argument("--start", type=int, help="STT bắt đầu tùy chỉnh")
    parser.add_argument("--end", type=int, help="STT kết thúc tùy chỉnh")
    parser.add_argument("--loop", action="store_true", help="Chạy vòng lặp ngầm liên tục định kỳ")
    parser.add_argument("--interval", type=int, default=900, help="Thời gian nghỉ giữa các lần quét (giây, mặc định 900s = 15 phút)")
    args = parser.parse_args()
    
    selected_group = args.group
    if args.run_all:
        selected_group = 'all'
    elif selected_group is None:
        if args.limit and args.limit <= 115:
            selected_group = '1'
        else:
            selected_group = '1'
            
    group_desc = {
        '1': "Nhóm 1 (STT 1 -> 115, Batch 01 -> 05)",
        '2': "Nhóm 2 (STT 116 -> 184, Batch 06 -> 08)",
        '3': "Nhóm 3 (STT 185 -> 278, Batch 09 -> 12)",
        'all': "Toàn bộ 278 mã"
    }.get(str(selected_group))
    
    if args.loop:
        log(f"Khởi động chế độ quét ngầm tự động {group_desc} (chu kỳ {args.interval} giây / {args.interval/60:.1f} phút)...")
        while True:
            try:
                run_scan(group=selected_group, start_stt=args.start, end_stt=args.end)
            except Exception as e:
                log(f"Lỗi trong vòng lặp quét: {e}")
            log(f"Nghỉ ngơi {args.interval} giây trước lượt quét tiếp theo...")
            time.sleep(args.interval)
    else:
        run_scan(group=selected_group, start_stt=args.start, end_stt=args.end)
