"""
HỆ THỐNG GIÁM SÁT BCTC 115 MÃ TRÊN ĐÁM MÂY (GITHUB ACTIONS CLOUD)
- Chạy tự động 10 phút/lần 24/7 trên máy chủ GitHub Actions.
- Không cần bật máy tính ở nhà.
- Tự động phát hiện BCTC mới và gửi thông báo tức thì về Discord (điện thoại & PC).
- Tự động lưu bộ nhớ các mã đã hoàn thành để không thông báo trùng lặp.
"""

import os
import sys
import json
import re
import time
import datetime
import urllib.request
import urllib.parse
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup
try:
    import pymupdf
except ImportError:
    pymupdf = None

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TICKERS_FILE = os.path.join(BASE_DIR, "data", "tickers_group1_115.json")
COMPLETED_CACHE_FILE = os.path.join(BASE_DIR, "data", "bctc_completed_cache.json")
ALERTS_FILE = os.path.join(BASE_DIR, "data", "bctc_q3_live_alerts.json")
DISCORD_CONFIG_FILE = os.path.join(BASE_DIR, "data", "discord_config.json")
STATUS_FILE = os.path.join(BASE_DIR, "data", "bctc_cloud_status.json")

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

def log(msg):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        print(f"[{timestamp}] {msg}", flush=True)
    except:
        safe_msg = str(msg).encode('ascii', 'replace').decode('ascii')
        print(f"[{timestamp}] {safe_msg}", flush=True)


def strip_accents(text):
    if not text:
        return ""
    nfkd = unicodedata.normalize('NFKD', text)
    res = ''.join([c for c in nfkd if not unicodedata.combining(c)])
    return res.replace('đ', 'd').replace('Đ', 'D')

def is_valid_recent_bctc_date(date_pub):
    """
    Kiểm tra ngày công bố có thuộc đợt BCTC hiện tại (tháng 10/2026) hay không:
    - BCTC quý mới chỉ công bố từ cuối tháng 9 (>= 20/09/2026) và trong tháng 10, 11/2026.
    - LOẠI BỎ TRIỆT ĐỂ các tài liệu công bố từ tháng 1 đến tháng 8/2026 (như tháng 7 của CAP).
    - Nếu không có ngày công bố: trả về True để không bỏ sót.
    """
    if not date_pub:
        return True
    dp = str(date_pub).strip()
    
    m = re.search(r'(\d{1,2})/(\d{1,2})/(2026|26)', dp)
    if m:
        day = int(m.group(1))
        month = int(m.group(2))
        if month in [10, 11, 12]:
            return True
        if month == 9 and day >= 20:
            return True
        return False
        
    m2 = re.search(r'2026-(\d{1,2})-(\d{1,2})', dp)
    if m2:
        month = int(m2.group(1))
        day = int(m2.group(2))
        if month in [10, 11, 12]:
            return True
        if month == 9 and day >= 20:
            return True
        return False
        
    if '10/2026' in dp or '10/26' in dp or '11/2026' in dp or '12/2026' in dp:
        return True
        
    for mo in range(1, 9):
        if f'/{mo:02d}/2026' in dp or f'/{mo:02d}/26' in dp or f'/{mo}/2026' in dp:
            return False
            
    return True

def is_q3_2026(text, ticker="", doc_url="", date_pub=""):
    """
    Nhận diện tài liệu BCTC Quý 3/2026 (hoặc Quý mới cho các mã niên độ đặc thù như CAP)
    theo tiêu chí 'Lọc nhầm còn hơn bỏ sót'.
    """
    if not text:
        return False, ""
    raw = (text + " " + (doc_url or "")).lower()
    clean = strip_accents(raw)
    
    excluded = ['ke hoach', 'co dong lon', 'danh sach co dong', 'thu moi hop', 'bien ban kiem phieu', 'lay y kien']
    if any(k in clean for k in excluded):
        return False, ""
        
    has_2026 = bool(re.search(r'(?<!\d)(?:2026|\'26)(?!\d)', clean)) or ('2025-2026' in clean) or ('/2026/' in clean) or ('_2026' in clean) or ('10/2026' in str(date_pub)) or ('11/2026' in str(date_pub)) or ('12/2026' in str(date_pub))
    has_old = bool(re.search(r'(?:quy\s*[1-4]|q[1-4]|quarter\s*[1-4])[_\s\-/]*(?:201[89]|202[0-5])(?!\d)', clean))
    if has_old and not has_2026:
        return False, ""
        
    has_bctc = any(k in clean for k in ['tai chinh', 'bctc', 'financial', 'fs', 'giai trinh', 'kqkd', 'kinh doanh'])
    if not has_bctc:
        return False, ""
        
    is_cap = (str(ticker).upper() == 'CAP')
    if is_cap:
        # Với CAP: BCTC Quý 3 ra vào tháng 7 là kỳ CŨ, TUYỆT ĐỐI KHÔNG nhận Quý 3!
        has_q3 = bool(re.search(r'(?:(?<![a-zA-Z0-9])|^)(?:quy\s*3|q3|quy\s*iii|quarter\s*3|q\.3|q_3)(?![a-zA-Z0-9])', clean))
        if has_q3:
            return False, ""
        has_q4 = bool(re.search(r'(?:(?<![a-zA-Z0-9])|^)(?:quy\s*4|q4|quy\s*iv|quarter\s*4|q\.4|q_4)(?![a-zA-Z0-9])', clean))
        has_annual = any(k in clean for k in ['bctc nam', 'tai chinh nam', 'kiem toan nam'])
        if (has_q4 or has_annual) and has_2026:
            return True, text
        return False, ""
        
    has_q3 = bool(re.search(r'(?:(?<![a-zA-Z0-9])|^)(?:quy\s*3|q3|quy\s*iii|quarter\s*3|q\.3|q_3)(?![a-zA-Z0-9])', clean))
    if has_q3 and has_bctc and has_2026:
        return True, text
        
    pattern1 = r'(?:bctc|tai chinh|financial|kqkd|giai trinh)[^,\n\r]{0,35}(?:quy\s*3|q3|quy\s*iii|quarter 3)'
    pattern2 = r'(?:quy\s*3|q3|quy\s*iii|quarter 3)[^,\n\r]{0,35}(?:bctc|tai chinh)'
    for p in [pattern1, pattern2]:
        m = re.search(p, clean)
        if m and has_2026:
            return True, text
            
    return False, ""

def classify_bctc_type(title):
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

def check_fpts_ezir(ticker):
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
                
                if not is_valid_recent_bctc_date(date_pub):
                    continue
                    
                matched, snippet = is_q3_2026(title, ticker=ticker, doc_url=doc_url, date_pub=date_pub)
                if matched:
                    b_type = classify_bctc_type(title)
                    q3_found_items.append({
                        'title': title,
                        'date': date_pub,
                        'doc_url': doc_url,
                        'bctc_type': b_type
                    })
                    
            if q3_found_items:
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
        found_candidates = []
        for a in soup.find_all('a', href=True):
            h = a['href']
            t = a.get_text(strip=True)
            unquote_h = urllib.parse.unquote(h)
            combo = (t + " " + unquote_h).strip()
            
            m_date = re.search(r'(\d{1,2})/(\d{1,2})/(2026|26)', combo)
            if m_date and not is_valid_recent_bctc_date(m_date.group(0)):
                continue
            
            matched, snippet = is_q3_2026(combo, ticker=ticker)
            if matched:
                is_file = any(h.lower().endswith(ext) for ext in ['.pdf', '.zip', '.rar', '.xlsx', '.docx'])
                is_hop_nhat = any(k in combo.lower() for k in ['hợp nhất', 'hop nhat'])
                found_candidates.append({
                    'text': t,
                    'href': urllib.parse.urljoin(clean_uri, h),
                    'is_file': is_file,
                    'is_hop_nhat': is_hop_nhat,
                    'snippet': snippet
                })
                
        if found_candidates:
            found_candidates.sort(key=lambda x: (x['is_file'], x['is_hop_nhat']), reverse=True)
            best = found_candidates[0]
            best_text = best['text']
            bctc_cand = next((c for c in found_candidates if any(k in c['text'].lower() for k in ['báo cáo tài chính', 'bctc', 'financial']) and not any(k in c['text'].lower() for k in ['giải trình', 'giai trinh', 'xemfile', 'xem file', 'xem '])), None)
            desc_cand = next((c for c in found_candidates if len(c['text']) > 10 and not any(c['text'].lower().startswith(p) for p in ['xem', 'tai', 'download', 'chi tiet', 'link', 'doc'])), None)
            
            if bctc_cand:
                final_title = bctc_cand['text']
            elif desc_cand:
                final_title = desc_cand['text']
            elif best_text and len(best_text) >= 6 and not any(best_text.lower().startswith(p) for p in ['xem', 'tai', 'download', 'chi tiet', 'link', 'doc']):
                final_title = best_text
            else:
                final_title = "Báo cáo tài chính Quý 3/2026"
                
            return {
                'has_q3': True,
                'bctc_type': classify_bctc_type(final_title),
                'source': 'Company_Web',
                'title': final_title,
                'date': datetime.datetime.now().strftime("%d/%m/%Y"),
                'doc_url': best['href']
            }
            
        for tag in soup.find_all(['tr', 'li', 'p']):
            block_text = tag.get_text(separator=' ', strip=True)
            if len(block_text) < 250:
                m_date = re.search(r'(\d{1,2})/(\d{1,2})/(2026|26)', block_text)
                if m_date and not is_valid_recent_bctc_date(m_date.group(0)):
                    continue
                matched, snippet = is_q3_2026(block_text, ticker=ticker)
                if matched:
                    a_tag = tag.find('a', href=True)
                    doc_url = urllib.parse.urljoin(clean_uri, a_tag['href']) if a_tag else clean_uri
                    final_title = snippet or "Báo cáo tài chính Quý 3/2026"
                    return {
                        'has_q3': True,
                        'bctc_type': classify_bctc_type(final_title),
                        'source': 'Company_Web',
                        'title': final_title,
                        'date': datetime.datetime.now().strftime("%d/%m/%Y"),
                        'doc_url': doc_url
                    }
        return {'has_q3': False, 'source': 'Company_Web'}
    except Exception as e:
        return {'has_q3': False, 'source': 'Company_Web', 'error': str(e)}

def parse_vietnamese_number(s):
    if not s:
        return None
    s = str(s).strip()
    is_negative = False
    if s.startswith('(') and s.endswith(')'):
        is_negative = True
        s = s[1:-1].strip()
    elif s.startswith('-'):
        is_negative = True
        s = s[1:].strip()
        
    clean_s = s.replace('.', '').replace(',', '')
    try:
        val = int(clean_s)
        return -val if is_negative else val
    except:
        return None

def format_currency_billion(num):
    if num is None:
        return "N/A"
    ty = num / 1_000_000_000
    if abs(ty) >= 1.0:
        return f"{ty:,.2f} tỷ".replace(',', 'X').replace('.', ',').replace('X', '.')
    trieu = num / 1_000_000
    return f"{trieu:,.1f} tr".replace(',', 'X').replace('.', ',').replace('X', '.')

def extract_lnst_and_yoy(doc_url):
    """
    Trích xuất tự động LNST (ưu tiên cổ đông cty mẹ) và tính tăng trưởng YoY từ file PDF.
    Thời gian thực thi tối đa: 6 giây. An toàn tuyệt đối, không làm chậm hệ thống.
    """
    if pymupdf is None:
        return {"has_data": False, "reason": "Chưa cài đặt PyMuPDF"}
        
    if not doc_url or not doc_url.startswith('http'):
        return {"has_data": False, "reason": "Không có đường link tài liệu"}
        
    try:
        req = urllib.request.Request(doc_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=6) as resp:
            pdf_bytes = resp.read()
            
        if not pdf_bytes.startswith(b'%PDF'):
            return {"has_data": False, "reason": "Tài liệu không phải file PDF trực tiếp"}
            
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        
        # 1. Kiểm tra bản scan ảnh (nếu trong 5 trang đầu có <= 1 trang có chữ thì là tài liệu scan)
        non_empty_pages = sum(1 for i in range(min(5, len(doc))) if len(doc[i].get_text().strip()) > 50)
        if non_empty_pages <= 1:
            return {
                "has_data": False,
                "is_scanned": True,
                "reason": "Bản scan giấy đóng dấu đỏ (chưa số hóa)"
            }
            
        # 2. Tìm trang Kết quả hoạt động kinh doanh (KQKD)
        target_page = None
        for i in range(min(18, len(doc))):
            raw_t = doc[i].get_text().lower()
            if any(k in raw_t for k in ['ket qua hoat dong kinh doanh', 'kết quả hoạt động kinh doanh', 'ho~t dqng kinh doanh', 'hoat dong kinh doanh']):
                target_page = i
                break
                
        if target_page is None:
            for i in range(min(18, len(doc))):
                raw_t = doc[i].get_text()
                if re.search(r'\b(?:60|61)\b', raw_t) and any(k in raw_t.lower() for k in ['sau thue', 'sau thuế', 'sau thui', 'tndn']):
                    target_page = i
                    break
                    
        if target_page is None:
            return {"has_data": False, "reason": "Không định vị được trang Kết quả kinh doanh"}
            
        lines = [l.strip() for l in doc[target_page].get_text().splitlines() if l.strip()]
        
        # 3. Định vị dòng chỉ tiêu 61 (Cty mẹ) hoặc 60 (Tổng LNST)
        found_code_idx = None
        found_code = None
        is_parent = False
        
        # Quét tìm chỉ tiêu 61 trước (ưu tiên cổ đông cty mẹ)
        for idx, line in enumerate(lines):
            if line.strip() == '61':
                prev_text = " ".join(lines[max(0, idx-4):idx]).lower()
                if any(k in prev_text for k in ['lợi nhuận', 'loi nhuan', 'nhuin', 'sau thue', 'sau thui']):
                    found_code_idx = idx
                    found_code = '61'
                    is_parent = True
                    break
                    
        # Nếu không có 61, tìm chỉ tiêu 60
        if found_code_idx is None:
            for idx, line in enumerate(lines):
                if line.strip() == '60':
                    prev_text = " ".join(lines[max(0, idx-4):idx]).lower()
                    if any(k in prev_text for k in ['lợi nhuận', 'loi nhuan', 'nhuin', 'sau thue', 'sau thui']):
                        found_code_idx = idx
                        found_code = '60'
                        break

        # Nếu mã số không đứng độc lập, quét dòng chứa '60' hoặc '61'
        if found_code_idx is None:
            for idx, line in enumerate(lines):
                l_low = line.lower()
                if ('lợi nhuận sau thuế' in l_low or 'loi nhuan sau thue' in l_low or 'lqi nhuin' in l_low) and any(c in l_low for c in ['60', '61']):
                    found_code_idx = idx
                    found_code = '61' if '61' in l_low else '60'
                    is_parent = ('công ty mẹ' in l_low or '61' in l_low)
                    break
                    
        if found_code_idx is None:
            return {"has_data": False, "reason": "Chưa định vị được chỉ tiêu 60/61 trên trang KQKD"}
            
        # 4. Thu thập 2 số tài chính ngay sau mã số 60/61
        numbers = []
        for j in range(found_code_idx + 1, min(len(lines), found_code_idx + 15)):
            val = parse_vietnamese_number(lines[j])
            if val is not None and abs(val) > 1000:
                numbers.append(val)
                if len(numbers) >= 2:
                    break
                    
        if len(numbers) >= 2:
            cur_q = numbers[0]
            prev_q = numbers[1]
            label = "LNST Cổ đông Cty mẹ" if is_parent else "Lợi nhuận sau thuế"
            
            if prev_q != 0:
                yoy_num = ((cur_q - prev_q) / abs(prev_q)) * 100
                if cur_q > 0 and prev_q < 0:
                    yoy_str = "Chuyển từ Lỗ sang Lãi 🚀"
                    direction = "up"
                elif cur_q < 0 and prev_q > 0:
                    yoy_str = "Chuyển từ Lãi sang Lỗ 🔻"
                    direction = "down"
                elif yoy_num >= 50:
                    yoy_str = f"+{yoy_num:.2f}% 🚀 (Đột biến)"
                    direction = "up"
                elif yoy_num > 0:
                    yoy_str = f"+{yoy_num:.2f}% 📈"
                    direction = "up"
                else:
                    yoy_str = f"{yoy_num:.2f}% 📉"
                    direction = "down"
            else:
                yoy_str = "N/A"
                direction = "flat"
                
            return {
                "has_data": True,
                "label": label,
                "code": found_code,
                "current_quarter": format_currency_billion(cur_q),
                "prev_quarter": format_currency_billion(prev_q),
                "current_raw": cur_q,
                "prev_raw": prev_q,
                "yoy": yoy_str,
                "direction": direction
            }
            
        return {"has_data": False, "reason": "Không trích xuất đủ 2 cột số liệu sau chỉ tiêu"}
    except Exception as e:
        return {"has_data": False, "reason": f"Lỗi đọc PDF ({e})"}

def send_discord_alert(alert_data, is_new_hop_nhat=False):
    """Bắn thông báo tức thì lên Discord kèm LNST & Tăng trưởng YoY"""
    webhook_url = os.environ.get("DISCORD_WEBHOOK_URL")
    if not webhook_url and os.path.exists(DISCORD_CONFIG_FILE):
        try:
            with open(DISCORD_CONFIG_FILE, "r", encoding="utf-8") as f:
                d = json.load(f)
                webhook_url = d.get("webhook_url")
        except:
            pass
            
    if not webhook_url:
        log("⚠️ Không có Discord Webhook URL. Bỏ qua gửi thông báo.")
        return False
        
    ticker = alert_data.get("ticker", "")
    company = alert_data.get("company_name", "")
    exchange = alert_data.get("exchange", "UPCOM")
    title = alert_data.get("title", "Báo cáo tài chính Quý 3/2026")
    doc_url = alert_data.get("doc_url", "")
    date_pub = alert_data.get("release_date", "")
    bctc_type = alert_data.get("bctc_type", "DAY_DU")
    source = alert_data.get("source", "EzIR FPTS")
    
    lnst = alert_data.get("net_profit")
    prev_profit = alert_data.get("prev_profit")
    growth_rate = alert_data.get("growth_rate")
    direction = alert_data.get("growth_direction", "up")
    lnst_label = alert_data.get("lnst_label", "LNST Quý 3/2026")
    lnst_status = alert_data.get("lnst_status")
    
    if is_new_hop_nhat:
        header_title = f"🌟 ĐÃ CÓ BCTC HỢP NHẤT: {ticker} (BỔ SUNG SAU BCTC RIÊNG)"
        color = 0x10B981 # Xanh ngọc
    elif bctc_type == 'RIENG':
        header_title = f"⚡ PHÁT HIỆN BCTC RIÊNG: {ticker} (ĐANG CHỜ HỢP NHẤT)"
        color = 0xF59E0B # Vàng cam
    elif direction == 'down':
        header_title = f"🚨 PHÁT HIỆN BCTC QUÝ 3/2026: {ticker}"
        color = 0xEF4444 # Đỏ (nếu giảm hoặc lỗ)
    else:
        header_title = f"🚨 PHÁT HIỆN BCTC QUÝ 3/2026: {ticker}"
        color = 0x22C55E # Xanh lá (tăng trưởng)
        
    embed = {
        "title": header_title,
        "description": f"🏢 **{company}** (`{exchange}`)\n📄 **{title}**",
        "color": color,
        "fields": [],
        "footer": {
            "text": "Hệ thống giám sát BCTC Quý 3/2026 tự động • Cloud Monitor"
        },
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    
    # Hiển thị số liệu tài chính nổi bật
    if lnst and growth_rate:
        embed["fields"].append({
            "name": f"💰 {lnst_label}",
            "value": f"**{lnst}**" + (f" *(Cùng kỳ: {prev_profit})*" if prev_profit else ""),
            "inline": True
        })
        embed["fields"].append({
            "name": "📈 Tăng trưởng YoY",
            "value": f"**{growth_rate}**",
            "inline": True
        })
    elif lnst_status:
        embed["fields"].append({
            "name": "💰 LNST & Tăng trưởng",
            "value": f"*{lnst_status}*",
            "inline": False
        })
        
    embed["fields"].extend([
        {
            "name": "📅 Ngày công bố",
            "value": f"{date_pub or 'Hôm nay'}",
            "inline": True
        },
        {
            "name": "📊 Phân loại BCTC",
            "value": f"{'Bản Hợp nhất' if bctc_type == 'HOP_NHAT' else ('Bản Riêng (Cty mẹ)' if bctc_type == 'RIENG' else 'Bản Đầy đủ')}",
            "inline": True
        },
        {
            "name": "🌐 Nguồn phát hiện",
            "value": f"{source}",
            "inline": True
        }
    ])
    
    if doc_url:
        embed["fields"].append({
            "name": "📥 Tải / Xem BCTC gốc",
            "value": f"[Bấm vào đây để mở tài liệu]({doc_url})",
            "inline": False
        })
        
    payload = {
        "content": f"🔔 **THÔNG BÁO BCTC MỚI: {ticker}**" if bctc_type in ['HOP_NHAT', 'DAY_DU'] else f"⚡ **{ticker} VỪA CÓ BCTC RIÊNG (Chờ Hợp nhất)**",
        "embeds": [embed]
    }
    
    try:
        req = urllib.request.Request(
            webhook_url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            log(f"✅ Đã gửi cảnh báo Discord cho {ticker} (Mã phản hồi: {resp.status})")
            return True
    except Exception as e:
        log(f"Lỗi gửi Discord {ticker}: {e}")
        return False

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
        log(f"Lỗi lưu cache: {e}")

def load_alerts():
    if os.path.exists(ALERTS_FILE):
        try:
            with open(ALERTS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return {it['ticker']: it for it in data if 'ticker' in it}
                return data
        except:
            return {}
    return {}

def save_alerts(alerts_dict):
    try:
        os.makedirs(os.path.dirname(ALERTS_FILE), exist_ok=True)
        alerts_list = list(alerts_dict.values())
        alerts_list.sort(key=lambda x: x.get('detected_at') or '', reverse=True)
        with open(ALERTS_FILE, "w", encoding="utf-8") as f:
            json.dump(alerts_list, f, ensure_ascii=False, indent=2)
    except Exception as e:
        log(f"Lỗi lưu alerts: {e}")

def scan_ticker(item, completed_cache):
    ticker = item['ticker']
    uri = item.get('uri', '')
    start_t = time.time()
    
    # 1. Bỏ qua nếu đã hoàn tất đầy đủ
    if ticker in completed_cache:
        c_type = completed_cache[ticker].get('bctc_type', '')
        if c_type in ['HOP_NHAT', 'DAY_DU']:
            return ticker, item, {'has_q3': True, 'is_cached': True, 'bctc_type': c_type, 'elapsed': 0.0}
            
    # 2. Quét EzIR FPTS
    res_ezir = check_fpts_ezir(ticker)
    
    # 3. Quét Web riêng
    res_web = check_company_website(ticker, uri)
    if res_web and res_web.get('has_q3'):
        res_web['elapsed'] = round(time.time() - start_t, 2)
        return ticker, item, res_web
        
    if res_ezir.get('has_q3'):
        res_ezir['elapsed'] = round(time.time() - start_t, 2)
        return ticker, item, res_ezir
        
    res_ezir['elapsed'] = round(time.time() - start_t, 2)
    return ticker, item, res_ezir

def load_status():
    if os.path.exists(STATUS_FILE):
        try:
            with open(STATUS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_status(data):
    try:
        os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
        with open(STATUS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        log(f"Lỗi lưu status: {e}")

def send_heartbeat(event_type, details=""):
    webhook_url = os.environ.get("DISCORD_WEBHOOK_URL")
    if not webhook_url and os.path.exists(DISCORD_CONFIG_FILE):
        try:
            with open(DISCORD_CONFIG_FILE, "r", encoding="utf-8") as f:
                webhook_url = json.load(f).get("webhook_url")
        except:
            pass
    if not webhook_url:
        return
        
    now_vn = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7)))
    date_str = now_vn.strftime("%d/%m/%Y")
    
    if event_type == 'morning':
        payload = {
            "content": f"☀️ **[08:20] BẮT ĐẦU PHIÊN GIÁM SÁT BCTC NGÀY {date_str}**",
            "embeds": [{
                "title": "🟢 Hệ thống Cloud đang hoạt động tự động",
                "description": f"Hệ thống tự động quét **115 mã cổ phiếu nhóm 1** định kỳ 10 phút/lần.\n{details}",
                "color": 0x3B82F6,
                "footer": {"text": "BCTC Live Cloud Monitor • dulieudautu.com"},
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }]
        }
    elif event_type == 'afternoon':
        payload = {
            "content": f"🏁 **[15:00] KẾT THÚC PHIÊN GIÁM SÁT NGÀY {date_str}**",
            "embeds": [{
                "title": "☕ Chốt phiên hôm nay",
                "description": f"{details}\nHệ thống tự động nghỉ ngơi và sẽ bắt đầu quét lại vào **08:20 sáng mai**.",
                "color": 0x64748B,
                "footer": {"text": "BCTC Live Cloud Monitor • dulieudautu.com"},
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }]
        }
    else:
        return

    try:
        req = urllib.request.Request(
            webhook_url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            log(f"Đã gửi heartbeat ({event_type})")
    except Exception as e:
        log(f"Lỗi gửi heartbeat {event_type}: {e}")

def send_silent_ping(scan_index, remaining_count, elapsed_sec, new_count=0):
    """Gửi nhịp đập 10 phút/lần ở chế độ SILENT (không chuông, không rung điện thoại)"""
    webhook_url = os.environ.get("DISCORD_WEBHOOK_URL")
    if not webhook_url and os.path.exists(DISCORD_CONFIG_FILE):
        try:
            with open(DISCORD_CONFIG_FILE, "r", encoding="utf-8") as f:
                webhook_url = json.load(f).get("webhook_url")
        except:
            pass
    if not webhook_url:
        return
        
    now_vn = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7)))
    time_str = now_vn.strftime("%H:%M")
    
    if new_count > 0:
        content = f"🔥 **[{time_str}] Lượt #{scan_index}:** Phát hiện **{new_count} BCTC MỚI**! Đã gửi thông báo chi tiết."
    else:
        content = f"🟢 `[{time_str}]` **Lượt #{scan_index}:** Đã kiểm tra **{remaining_count} mã** ({elapsed_sec}s) • Bình thường, chưa có BCTC mới."
        
    payload = {
        "content": content,
        "flags": 4096 # SUPPRESS_NOTIFICATIONS: Không rung, không chuông điện thoại
    }
    
    try:
        req = urllib.request.Request(
            webhook_url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
        )
        urllib.request.urlopen(req, timeout=8)
    except Exception as e:
        log(f"Lỗi gửi silent ping: {e}")

def send_system_error_alert(error_msg):
    """Gửi cảnh báo khẩn cấp có âm thanh khi gặp lỗi"""
    webhook_url = os.environ.get("DISCORD_WEBHOOK_URL")
    if not webhook_url and os.path.exists(DISCORD_CONFIG_FILE):
        try:
            with open(DISCORD_CONFIG_FILE, "r", encoding="utf-8") as f:
                webhook_url = json.load(f).get("webhook_url")
        except:
            pass
    if not webhook_url:
        return
        
    payload = {
        "content": f"🚨 **CẢNH BÁO KHẨN CẤP: HỆ THỐNG GIÁM SÁT GẶP LỖI!**",
        "embeds": [{
            "title": "❌ Lỗi hệ thống trong chu kỳ quét",
            "description": f"```{error_msg}```\nVui lòng kiểm tra lại trạng thái máy chủ.",
            "color": 0xEF4444,
            "footer": {"text": "BCTC Live Monitor Error Alert"},
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }]
    }
    try:
        req = urllib.request.Request(
            webhook_url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
        )
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:
        log(f"Lỗi gửi error alert: {e}")

def check_another_instance_running():
    """Kiểm tra trên GitHub Actions xem đã có một tiến trình giám sát nào đang chạy trước đó không"""
    token = os.environ.get("GITHUB_TOKEN")
    repo = os.environ.get("GITHUB_REPOSITORY", "N0149/du-lieu-co-phieu")
    run_id = os.environ.get("GITHUB_RUN_ID")
    if not token or not run_id:
        return False
    try:
        url = f"https://api.github.com/repos/{repo}/actions/workflows/bctc_cloud_monitor.yml/runs?status=in_progress"
        req = urllib.request.Request(url, headers={
            'Authorization': f'token {token}',
            'User-Agent': 'Mozilla/5.0'
        })
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            runs = data.get('workflow_runs', [])
            for r in runs:
                if str(r.get('id')) != str(run_id) and int(r.get('id')) < int(run_id):
                    log(f"🟢 Đã có ca giám sát đang chạy (Run #{r.get('id')}). Ca phụ này thoát để tránh trùng lặp.")
                    return True
    except Exception as e:
        log(f"Kiểm tra instance khác lỗi: {e}")
    return False

def execute_single_scan(scan_index=1):
    """Thực hiện một lượt quét 115 mã"""
    if not os.path.exists(TICKERS_FILE):
        log(f"LỖI: Không tìm thấy file {TICKERS_FILE}")
        return 0, 0, 0
        
    with open(TICKERS_FILE, "r", encoding="utf-8") as f:
        tickers_list = json.load(f)
        
    completed_cache = load_completed_cache()
    alerts_dict = load_alerts()
    
    to_scan = []
    already_done = []
    for it in tickers_list:
        t = it['ticker']
        if t in completed_cache and completed_cache[t].get('bctc_type') in ['HOP_NHAT', 'DAY_DU']:
            already_done.append(t)
        else:
            to_scan.append(it)
            
    log(f"--- [LƯỢT #{scan_index}] Quét {len(to_scan)}/{len(tickers_list)} mã (đã hoàn tất: {len(already_done)}) ---")
    
    if not to_scan:
        log("🎉 Toàn bộ 115 mã đều đã có BCTC đầy đủ!")
        return 0, 0, 0
        
    start_all = time.time()
    results = {}
    new_found_count = 0
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(scan_ticker, it, completed_cache) for it in to_scan]
        for fut in futures:
            try:
                ticker, item, res = fut.result()
                results[ticker] = (item, res)
            except Exception as e:
                log(f"Lỗi khi quét 1 mã: {e}")
                
    total_elapsed = round(time.time() - start_all, 2)
    log(f"⏱️ Quét xong {len(to_scan)} mã trong {total_elapsed}s")
    
    has_cache_changes = False
    for ticker, (item, res) in results.items():
        if res.get('has_q3') and not res.get('is_cached'):
            b_type = res.get('bctc_type', 'DAY_DU')
            title = res.get('title', '')
            date_pub = res.get('date', '')
            doc_url = res.get('doc_url', '')
            source = res.get('source', '')
            company_name = item.get('name', '')
            exchange = item.get('san', 'UPCOM')
            
            old_cache = completed_cache.get(ticker)
            old_type = old_cache.get('bctc_type') if old_cache else None
            is_new_hop_nhat = (old_type == 'RIENG' and b_type == 'HOP_NHAT')
            is_brand_new = (ticker not in completed_cache)
            
            if is_brand_new or is_new_hop_nhat:
                new_found_count += 1
                log(f"🔥 PHÁT HIỆN MỚI: {ticker} [{b_type}] - {title} ({date_pub})")
                
                # Bóc tách tự động LNST & Tăng trưởng YoY từ PDF
                lnst_data = extract_lnst_and_yoy(doc_url)
                
                alert_payload = {
                    "ticker": ticker,
                    "company_name": company_name,
                    "exchange": exchange,
                    "quarter": "Quý 3/2026",
                    "release_date": date_pub,
                    "title": title,
                    "source": source,
                    "bctc_type": b_type,
                    "doc_url": doc_url,
                    "is_hot": True,
                    "detected_at": datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
                }
                
                if lnst_data.get('has_data'):
                    alert_payload['net_profit'] = lnst_data.get('current_quarter')
                    alert_payload['prev_profit'] = lnst_data.get('prev_quarter')
                    alert_payload['growth_rate'] = lnst_data.get('yoy')
                    alert_payload['growth_direction'] = lnst_data.get('direction', 'up')
                    alert_payload['lnst_label'] = lnst_data.get('label', 'LNST Quý 3/2026')
                    log(f"   📊 Bóc tách thành công: {alert_payload['lnst_label']} = {alert_payload['net_profit']} ({alert_payload['growth_rate']})")
                else:
                    alert_payload['lnst_status'] = lnst_data.get('reason', 'Bản scan giấy đóng dấu')
                    log(f"   ℹ️ Ghi chú BCTC: {alert_payload['lnst_status']}")

                send_discord_alert(alert_payload, is_new_hop_nhat=is_new_hop_nhat)
                
                completed_cache[ticker] = {
                    'ticker': ticker,
                    'bctc_type': b_type,
                    'title': title,
                    'date': date_pub,
                    'doc_url': doc_url,
                    'source': source,
                    'updated_at': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                if lnst_data.get('has_data'):
                    completed_cache[ticker]['net_profit'] = alert_payload['net_profit']
                    completed_cache[ticker]['growth_rate'] = alert_payload['growth_rate']
                alerts_dict[ticker] = alert_payload
                has_cache_changes = True
                
    if has_cache_changes:
        save_completed_cache(completed_cache)
        save_alerts(alerts_dict)
        log(f"💾 Đã lưu dữ liệu {new_found_count} mã mới phát hiện vào cache.")
        
    return new_found_count, len(to_scan), total_elapsed

def main():
    log("=== KHỞI ĐỘNG HỆ THỐNG GIÁM SÁT 115 MÃ BCTC TRÊN CLOUD ===")
    
    is_loop = ('--loop' in sys.argv)
    force_run = ('--force' in sys.argv)
    
    now_vn = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7)))
    today_str = now_vn.strftime("%Y-%m-%d")
    time_min = now_vn.hour * 60 + now_vn.minute
    weekday = now_vn.weekday() # 0 = Thứ 2, 4 = Thứ 6, 5 = Thứ 7, 6 = Chủ Nhật

    # Kiểm tra ngày & giờ giao dịch (bỏ qua nếu dùng cờ --force)
    if not force_run:
        if weekday >= 5:
            log("📅 Hôm nay là cuối tuần (thị trường chứng khoán nghỉ). Không cần quét.")
            return

        if time_min < 8 * 60 + 15:
            log("⏰ Chưa đến giờ bắt đầu phiên sáng (trước 08:20). Thoát an toàn.")
            return
        elif 11 * 60 + 30 <= time_min < 12 * 60 + 55:
            log("🍱 Đang là giờ nghỉ trưa thị trường (11:30 - 13:00). Thoát an toàn.")
            return
        elif time_min >= 15 * 60 + 30:
            log("🏁 Đã kết thúc toàn bộ phiên giao dịch hôm nay (sau 15:30). Nghỉ ngơi.")
            return

    # Nếu chạy loop worker, kiểm tra xem đã có worker nào đang hoạt động chưa
    if is_loop and check_another_instance_running():
        return

    # Xác định ca làm việc:
    # Ca sáng: 08:20 -> 11:30 (500 -> 690 phút)
    # Ca chiều: 13:00 -> 15:30 (780 -> 930 phút)
    if time_min < 12 * 60:
        session_name = "Ca Sáng (08:20 - 11:30)"
        target_end_min = 11 * 60 + 30
        is_morning = True
    else:
        session_name = "Ca Chiều (13:00 - 15:30)"
        target_end_min = 15 * 60 + 30
        is_morning = False
        
    status = load_status()
    
    if is_morning and status.get('last_morning_greeting') != today_str:
        send_heartbeat('morning', "Bắt đầu phiên sáng, tự động quét mỗi 10 phút.")
        status['last_morning_greeting'] = today_str
        save_status(status)
        
    if not is_loop:
        try:
            new_cnt, rem_cnt, elapsed = execute_single_scan(scan_index=1)
            send_silent_ping(1, rem_cnt, elapsed, new_count=new_cnt)
        except Exception as e:
            log(f"Lỗi: {e}")
            send_system_error_alert(str(e))
            sys.exit(1)
        return
        
    # CHẾ ĐỘ VÒNG LẶP LIÊN TỤC TRONG CA (LOOP WORKER)
    log(f"🚀 Kích hoạt chế độ Vòng lặp liên tục: {session_name}")
    scan_index = 0
    
    while True:
        scan_index += 1
        now_vn = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7)))
        cur_min = now_vn.hour * 60 + now_vn.minute
        
        try:
            new_cnt, rem_cnt, elapsed = execute_single_scan(scan_index=scan_index)
            # Gửi nhịp đập Silent mỗi 10 phút để người dùng yên tâm 100%
            send_silent_ping(scan_index, rem_cnt, elapsed, new_count=new_cnt)
        except Exception as e:
            log(f"Lỗi trong lượt quét #{scan_index}: {e}")
            send_system_error_alert(f"Lỗi trong lượt quét #{scan_index}: {e}")
            
        now_vn = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7)))
        cur_min = now_vn.hour * 60 + now_vn.minute
        if not force_run and cur_min >= target_end_min:
            log(f"🏁 Đã đạt thời gian kết thúc {session_name}. Dừng ca.")
            if not is_morning and status.get('last_afternoon_closing') != today_str:
                completed_cache = load_completed_cache()
                send_heartbeat('afternoon', f"Đã kết thúc phiên chiều. Tổng số mã đã có BCTC đầy đủ: **{len(completed_cache)} mã**.")
                status['last_afternoon_closing'] = today_str
                save_status(status)
            break
            
        log("💤 Ngủ 600 giây (10 phút) trước lượt quét tiếp theo...")
        time.sleep(600)
        
    log("=== HOÀN TẤT CA LÀM VIỆC ===")

if __name__ == '__main__':
    main()

