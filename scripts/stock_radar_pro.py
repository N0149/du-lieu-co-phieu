"""
STOCK RADAR PRO - PHẦN MỀM GIÁM SÁT BÁO CÁO TÀI CHÍNH & TÀI LIỆU DOANH NGHIỆP SỚM NHẤT
Phát triển bởi dulieudautu.com & Pair Programming Assistant
Hỗ trợ:
- Quét BCTC & Tài liệu doanh nghiệp toàn thị trường (938+ mã).
- Bóc tách tự động LNST & % tăng trưởng YoY từ PDF.
- Giám sát ngầm tự động chu kỳ tùy biến (5p/10p/15p).
- Chống Windows Sleep khi người dùng đi làm.
- Cảnh báo âm thanh đa kênh Discord (Điện thoại & Máy tính).
"""

import os
import sys
import json
import time
import datetime
import urllib.request
import urllib.parse
import re
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup

# Đảm bảo hiển thị Unicode tiếng Việt trên Console Windows
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

# Xác định thư mục gốc (xử lý cả khi chạy file .py lẫn khi đóng gói .exe qua PyInstaller)
if getattr(sys, 'frozen', False):
    EXE_DIR = os.path.dirname(sys.executable)
    BUNDLE_DIR = getattr(sys, '_MEIPASS', EXE_DIR)
else:
    EXE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    BUNDLE_DIR = EXE_DIR

# Tìm thư mục data linh hoạt
DATA_DIRS_TO_TRY = [
    os.path.join(EXE_DIR, "data"),
    os.path.join(BUNDLE_DIR, "data"),
    r"D:\hoc\lap trinh\du-lieu-co-phieu\data",
    r"D:\hoc\lap trinh\check BCTC Distill"
]

DATA_DIR = os.path.join(EXE_DIR, "data")
for d in DATA_DIRS_TO_TRY:
    if os.path.exists(d):
        DATA_DIR = d
        break

os.makedirs(DATA_DIR, exist_ok=True)

# Các file dữ liệu
TICKERS_G1_FILE = os.path.join(DATA_DIR, "tickers_group1_115.json")
TICKERS_278_FILE = os.path.join(DATA_DIR, "all_278_group_tickers.json")
TICKERS_938_FILE = os.path.join(DATA_DIR, "all_938_market_tickers.json")
COMPLETED_CACHE_FILE = os.path.join(DATA_DIR, "bctc_completed_cache.json")
ALERTS_FILE = os.path.join(DATA_DIR, "bctc_q3_live_alerts.json")
DISCORD_CONFIG_FILE = os.path.join(DATA_DIR, "discord_config.json")
COMPANY_WEBSITES_FILE = os.path.join(DATA_DIR, "company_websites.json")

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def log(msg):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)

def enable_windows_keep_awake():
    """Ngăn Windows rơi vào chế độ Sleep khi đang chạy giám sát trên máy tính cá nhân"""
    if os.name == 'nt':
        try:
            import ctypes
            ctypes.windll.kernel32.SetThreadExecutionState(0x80000001)
            return True
        except:
            return False
    return False

# ==========================================
# CÁC HÀM XỬ LÝ & BÓC TÁCH BCTC
# ==========================================
def strip_accents(text):
    if not text:
        return ""
    nfkd = unicodedata.normalize('NFKD', text)
    res = ''.join([c for c in nfkd if not unicodedata.combining(c)])
    return res.replace('đ', 'd').replace('Đ', 'D')

def is_valid_recent_bctc_date(date_pub):
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
    return True

IGNORED_DOCS_FILE = os.path.join(DATA_DIR, "ignored_docs.json")

def load_ignored_docs():
    if os.path.exists(IGNORED_DOCS_FILE):
        try:
            with open(IGNORED_DOCS_FILE, "r", encoding="utf-8") as f:
                return set(json.load(f))
        except:
            pass
    return set()

def is_q3_2026(text, ticker=None, doc_url=None, date_pub=None):
    if not text:
        return False, ""
    clean = strip_accents(text).lower()
    if 'tai lieu hop dhedcd' in clean or 'tai lieu hop dhdcd' in clean or 'bien ban hop dhdcd' in clean:
        return False, ""
    if 'nghi quyet hdqt' in clean and not any(k in clean for k in ['bctc', 'tai chinh', 'kqkd']):
        return False, ""

    has_2026 = ('2026' in clean) or ('/26' in clean) or ('-26' in clean) or ('26_' in clean)
    has_q3_keyword = any(k in clean for k in ['quy 3', 'q3', 'quy iii', 'quarter 3', 'quy3'])
    if doc_url:
        u_clean = strip_accents(doc_url).lower()
        if '2026' in u_clean and any(k in u_clean for k in ['q3', 'quy3', 'quy_3', 'quy-3']):
            has_2026 = True
            has_q3_keyword = True
    if not has_2026 and date_pub:
        dp = str(date_pub).strip()
        if any(dp.endswith(yr) for yr in ['/2026', '/26', '-2026', '-26']) or ('2026-' in dp):
            has_2026 = True
    if has_q3_keyword and has_2026:
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
            
            ignored = load_ignored_docs()
            q3_found_items = []
            for item in items:
                title = item.get('Title', '').strip()
                date_pub = item.get('DatePub', '').strip()
                i_raw_url = item.get('URL', '')
                doc_url = i_raw_url.replace('\\', '/').strip() if i_raw_url else f"https://ezir.fpts.com.vn/TinTuc/TinTucDN?code={ticker}"
                if doc_url in ignored or title in ignored or f"{ticker}:{doc_url}" in ignored:
                    continue
                
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
        ignored = load_ignored_docs()
        found_candidates = []
        for a in soup.find_all('a', href=True):
            h = a['href']
            t = a.get_text(strip=True)
            h_full = urllib.parse.urljoin(clean_uri, h)
            if h_full in ignored or h in ignored or t in ignored or f"{ticker}:{h_full}" in ignored:
                continue
            unquote_h = urllib.parse.unquote(h)
            combo = (t + " " + unquote_h).strip()
            
            m_date = re.search(r'(\d{1,2})/(\d{1,2})/(2026|26)', combo)
            if m_date and not is_valid_recent_bctc_date(m_date.group(0)):
                continue
            
            matched, snippet = is_q3_2026(combo, ticker=ticker, doc_url=h)
            if matched:
                is_file = any(h.lower().endswith(ext) for ext in ['.pdf', '.zip', '.rar', '.xlsx', '.docx'])
                is_hop_nhat = any(k in combo.lower() for k in ['hợp nhất', 'hop nhat'])
                found_candidates.append({
                    'text': t,
                    'href': h_full,
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
                final_title = f"Báo cáo tài chính Quý 3/2026 ({ticker})"
                
            return {
                'has_q3': True,
                'bctc_type': classify_bctc_type(final_title),
                'source': 'Company_Web',
                'title': final_title,
                'date': datetime.datetime.now().strftime("%d/%m/%Y"),
                'doc_url': best['href']
            }
            
        return {'has_q3': False, 'source': 'Company_Web'}
    except Exception as e:
        return {'has_q3': False, 'source': 'Company_Web', 'error': str(e)}

def check_cafef_disclosures(ticker):
    url = f"https://cafef.vn/du-lieu/Ajax/Events_RelatedNews_New.aspx?symbol={ticker}&floorID=0&configID=0&PageIndex=1&PageSize=20&Type=2"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://cafef.vn/'})
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            soup = BeautifulSoup(html, 'html.parser')
            for li in soup.find_all('li'):
                time_span = li.find('span', class_='timeTitle')
                a_tag = li.find('a', class_='docnhanhTitle')
                t = time_span.get_text(strip=True) if time_span else ''
                title = a_tag.get('title') or a_tag.get_text(strip=True) if a_tag else ''
                href = a_tag.get('href') if a_tag else ''
                if not href.startswith('http'):
                    href = f"https://cafef.vn{href}"
                    
                matched, snippet = is_q3_2026(title, ticker=ticker)
                if matched:
                    return {
                        'has_q3': True,
                        'bctc_type': classify_bctc_type(title),
                        'source': 'CafeF_CBTT',
                        'title': title,
                        'date': t.split()[0] if t else datetime.datetime.now().strftime("%d/%m/%Y"),
                        'doc_url': href
                    }
    except:
        pass
    return {'has_q3': False, 'source': 'CafeF_CBTT'}

def format_currency_billion(num):
    if num is None:
        return "N/A"
    ty = num / 1_000_000_000
    if abs(ty) >= 1.0:
        return f"{ty:,.2f} tỷ".replace(',', 'X').replace('.', ',').replace('X', '.')
    trieu = num / 1_000_000
    return f"{trieu:,.1f} tr".replace(',', 'X').replace('.', ',').replace('X', '.')

def parse_vietnamese_number(s):
    if not s:
        return None
    s = str(s).strip()
    is_neg = False
    if s.startswith('(') and s.endswith(')'):
        is_neg = True
        s = s[1:-1].strip()
    elif s.startswith('-'):
        is_neg = True
        s = s[1:].strip()
    clean_s = s.replace('.', '').replace(',', '')
    try:
        val = int(clean_s)
        return -val if is_neg else val
    except:
        return None

def extract_lnst_and_yoy(doc_url):
    try:
        import pymupdf
    except ImportError:
        return {"has_data": False, "reason": "Chưa có thư viện pymupdf"}
        
    if not doc_url or not doc_url.lower().endswith('.pdf'):
        return {"has_data": False, "reason": "Tài liệu không phải file PDF trực tiếp"}
        
    try:
        start_t = time.time()
        req = urllib.request.Request(doc_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=6) as resp:
            pdf_bytes = resp.read()
            
        doc = pymupdf.open(stream=pdf_bytes, filetype='pdf')
        kqkd_keywords = ["kết quả hoạt động kinh doanh", "ket qua hoat dong kinh doanh", "báo cáo kết quả kinh doanh", "income statement"]
        target_page_indices = []
        for pno in range(min(len(doc), 15)):
            txt = doc[pno].get_text().lower()
            if any(k in txt for k in kqkd_keywords):
                target_page_indices.append(pno)
                
        if not target_page_indices:
            target_page_indices = list(range(min(len(doc), 5)))
            
        profit_keywords = [
            "lợi nhuận sau thuế của cổ đông công ty mẹ",
            "loi nhuan sau thue cua co dong cong ty me",
            "lợi nhuận sau thuế thu nhập doanh nghiệp",
            "loi nhuan sau thue tndn",
            "lợi nhuận sau thuế",
            "loi nhuan sau thue",
            "net profit after tax"
        ]
        
        for pno in target_page_indices:
            lines = doc[pno].get_text("text").split('\n')
            for i, line in enumerate(lines):
                line_clean = strip_accents(line).lower().strip()
                for kw in profit_keywords:
                    kw_clean = strip_accents(kw)
                    if kw_clean in line_clean:
                        num_candidates = []
                        for offset in range(-1, 3):
                            idx = i + offset
                            if 0 <= idx < len(lines):
                                found_nums = re.findall(r'\(?\d{1,3}(?:[.,]\d{3})+(?:\.\d+)?\)?', lines[idx])
                                for fn in found_nums:
                                    pv = parse_vietnamese_number(fn)
                                    if pv is not None and abs(pv) > 10_000:
                                        num_candidates.append(pv)
                        if len(num_candidates) >= 2:
                            curr_val = num_candidates[0]
                            prev_val = num_candidates[1]
                            if prev_val != 0:
                                yoy = round(((curr_val - prev_val) / abs(prev_val)) * 100, 1)
                                yoy_str = f"+{yoy}% YoY" if yoy > 0 else f"{yoy}% YoY"
                                direction = 'up' if yoy > 0 else 'down'
                            else:
                                yoy_str = "Cùng kỳ = 0"
                                direction = 'neutral'
                            return {
                                "has_data": True,
                                "current_quarter": format_currency_billion(curr_val),
                                "prev_quarter": format_currency_billion(prev_val),
                                "yoy": yoy_str,
                                "direction": direction,
                                "label": line.strip()[:60]
                            }
        return {"has_data": False, "reason": "Bản scan dấu đỏ"}
    except Exception as e:
        return {"has_data": False, "reason": str(e)}

# ==========================================
# QUẢN LÝ DISCORD & CẢNH BÁO
# ==========================================
def get_discord_webhook():
    webhook_url = os.environ.get("DISCORD_WEBHOOK_URL")
    if not webhook_url and os.path.exists(DISCORD_CONFIG_FILE):
        try:
            with open(DISCORD_CONFIG_FILE, "r", encoding="utf-8") as f:
                webhook_url = json.load(f).get("webhook_url")
        except:
            pass
    return webhook_url

def send_discord_alert(alert_payload, is_new_hop_nhat=False):
    webhook_url = get_discord_webhook()
    if not webhook_url:
        return False
        
    ticker = alert_payload.get('ticker')
    company_name = alert_payload.get('company_name', f'Cổ phiếu {ticker}')
    exchange = alert_payload.get('exchange', 'HOSE')
    b_type = alert_payload.get('bctc_type', 'DAY_DU')
    source = alert_payload.get('source', 'Company_Web')
    title = alert_payload.get('title', '')
    date_str = alert_payload.get('release_date', datetime.datetime.now().strftime("%d/%m/%Y"))
    doc_url = alert_payload.get('doc_url', '')

    type_tag = "HỢP NHẤT" if b_type == 'HOP_NHAT' else ("RIÊNG (CTY MẸ)" if b_type == 'RIENG' else "ĐẦY ĐỦ")
    color = 0x10B981 if b_type == 'HOP_NHAT' else 0x3B82F6
    
    fields = [
        {"name": "🏢 Doanh nghiệp", "value": f"**{company_name}** (`{exchange}`)", "inline": True},
        {"name": "📂 Phân loại", "value": f"`{type_tag}`", "inline": True},
        {"name": "📅 Ngày công bố", "value": f"`{date_str}`", "inline": True},
    ]

    if alert_payload.get('net_profit'):
        lbl = alert_payload.get('lnst_label', 'LNST Quý 3/2026')
        np_str = alert_payload.get('net_profit')
        yoy_str = alert_payload.get('growth_rate')
        dir_icon = "📈" if alert_payload.get('growth_direction') == 'up' else "📉"
        fields.append({
            "name": f"📊 {lbl}",
            "value": f"**{np_str}** ({dir_icon} **{yoy_str}**)",
            "inline": False
        })
    elif alert_payload.get('lnst_status'):
        fields.append({
            "name": "📊 Lợi nhuận sau thuế",
            "value": f"*{alert_payload.get('lnst_status')}*",
            "inline": False
        })

    fields.append({
        "name": "🔗 Link xem / Tải BCTC gốc",
        "value": f"[Bấm vào đây để tải tài liệu]({doc_url})",
        "inline": False
    })

    content_msg = f"🔥 **CẢNH BÁO BCTC QUÝ 3/2026: `{ticker}` ĐÃ CÔNG BỐ!** @everyone"
    payload = {
        "content": content_msg,
        "embeds": [{
            "title": f"🚀 [{ticker}] {title}",
            "url": doc_url,
            "color": color,
            "fields": fields,
            "footer": {"text": f"Nguồn: {source} • dulieudautu.com Stock Radar"},
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }]
    }

    try:
        req = urllib.request.Request(
            webhook_url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            log(f"✅ Đã gửi cảnh báo Discord cho {ticker} (Code: {resp.status})")
            return True
    except Exception as e:
        log(f"Lỗi gửi Discord: {e}")
        return False

def send_silent_ping(scan_index, remaining_count, elapsed_sec, session_name=""):
    webhook_url = get_discord_webhook()
    if not webhook_url:
        return
    now_str = datetime.datetime.now().strftime("%H:%M")
    payload = {
        "content": f"🟢 `[{now_str}]` **Hệ thống hoạt động bình thường** • Đã quét **{remaining_count} mã** ({elapsed_sec}s) • Chưa có BCTC mới.",
        "flags": 4096 # SILENT
    }
    try:
        req = urllib.request.Request(
            webhook_url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
        )
        urllib.request.urlopen(req, timeout=8)
    except:
        pass

# ==========================================
# CÁC CHỨC NĂNG CHÍNH
# ==========================================
def load_completed_cache():
    if os.path.exists(COMPLETED_CACHE_FILE):
        try:
            with open(COMPLETED_CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            pass
    return {}

def save_completed_cache(cache):
    try:
        with open(COMPLETED_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        log(f"Lỗi lưu cache: {e}")

def get_company_info(ticker):
    ticker = ticker.upper().strip()
    name = f"Công ty CP {ticker}"
    san = "HOSE"
    uri = ""
    if os.path.exists(COMPANY_WEBSITES_FILE):
        try:
            with open(COMPANY_WEBSITES_FILE, "r", encoding="utf-8") as f:
                m = json.load(f)
                if ticker in m:
                    info = m[ticker]
                    name = info.get('name') or name
                    ws = info.get('website', '')
                    if ws:
                        uri = f"https://{ws}" if not ws.startswith('http') else ws
        except:
            pass
    return {"ticker": ticker, "name": name, "san": san, "uri": uri}

def check_single_ticker(ticker, prompt_discord=True):
    ticker = ticker.upper().strip()
    print("=" * 72)
    print(f"🎯 TRA CỨU TỨC THÌ BÁO CÁO TÀI CHÍNH QUÝ 3/2026: [{ticker}]")
    print("=" * 72)
    
    info = get_company_info(ticker)
    print(f"🏢 Doanh nghiệp: {info['name']}")
    print(f"🏛️ Sàn: {info['san']} | Website IR: {info['uri'] or 'Chưa cấu hình web riêng'}")
    print("\n⏳ Đang rà soát đồng thời các cổng thông tin tài chính...")
    
    start_t = time.time()
    res = None
    
    # 1. EzIR FPTS
    r_ezir = check_fpts_ezir(ticker)
    if r_ezir.get('has_q3'):
        res = r_ezir
    else:
        print(f"   • EzIR FPTS: Chưa có BCTC Q3 ({r_ezir.get('latest_doc', '')})")
        
    # 2. Web riêng
    if not res and info.get('uri'):
        r_web = check_company_website(ticker, info['uri'])
        if r_web and r_web.get('has_q3'):
            res = r_web
        else:
            print(f"   • Website riêng: Chưa tìm thấy tài liệu Q3")
            
    # 3. CafeF CBTT
    if not res:
        r_cf = check_cafef_disclosures(ticker)
        if r_cf and r_cf.get('has_q3'):
            res = r_cf
        else:
            print(f"   • Cổng CBTT CafeF: Chưa có công bố BCTC Q3")
            
    elapsed = round(time.time() - start_t, 2)
    print("-" * 72)
    
    if res and res.get('has_q3'):
        b_type = res.get('bctc_type', 'DAY_DU')
        doc_url = res.get('doc_url', '')
        print(f"🔥 PHÁT HIỆN BCTC QUÝ 3/2026 CHO [{ticker}]!")
        print(f"   • Tiêu đề: {res.get('title')}")
        print(f"   • Phân loại: {b_type}")
        print(f"   • Ngày công bố: {res.get('date')}")
        print(f"   • Nguồn: {res.get('source')}")
        print(f"   • Link file: {doc_url}")
        
        lnst = extract_lnst_and_yoy(doc_url)
        alert_payload = {
            "ticker": ticker,
            "company_name": info['name'],
            "exchange": info['san'],
            "quarter": "Quý 3/2026",
            "release_date": res.get('date'),
            "title": res.get('title'),
            "source": res.get('source'),
            "bctc_type": b_type,
            "doc_url": doc_url,
            "is_hot": True
        }
        if lnst.get('has_data'):
            alert_payload['net_profit'] = lnst.get('current_quarter')
            alert_payload['growth_rate'] = lnst.get('yoy')
            alert_payload['growth_direction'] = lnst.get('direction', 'up')
            alert_payload['lnst_label'] = lnst.get('label')
            print(f"   📊 Bóc tách LNST: {alert_payload['lnst_label']} = {alert_payload['net_profit']} ({alert_payload['growth_rate']})")
        else:
            alert_payload['lnst_status'] = lnst.get('reason')
            print(f"   ℹ️ Ghi chú: {alert_payload['lnst_status']}")
            
        cache = load_completed_cache()
        cache[ticker] = {
            "ticker": ticker,
            "company_name": info['name'],
            "release_date": res.get('date'),
            "title": res.get('title'),
            "doc_url": doc_url,
            "source": res.get('source'),
            "bctc_type": b_type,
            "updated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        save_completed_cache(cache)
        print("   ✅ Đã ghi nhớ vào bộ nhớ đã quét.")
        
        if prompt_discord:
            print("-" * 72)
            c = input("📲 Bắn thông báo ngay về Discord điện thoại? [Y/n]: ").strip().lower()
            if c in ['', 'y', 'yes', '1']:
                send_discord_alert(alert_payload)
                print("🚀 Đã bắn thông báo thành công về Discord!")
        else:
            send_discord_alert(alert_payload)
    else:
        print(f"❄️ [{ticker}] hiện TẠI CHƯA CÓ Báo cáo tài chính Quý 3/2026.")
        print(f"⏱️ Thời gian quét: {elapsed}s.")
        print("💡 Gợi ý: Chọn [5] trong Menu để thêm mã này vào danh sách giám sát tự động hàng ngày.")
    print("=" * 72)

def scan_list_parallel(tickers_list, title="Danh mục"):
    completed_cache = load_completed_cache()
    to_scan = []
    already_done = []
    for it in tickers_list:
        t = it['ticker']
        if t in completed_cache and completed_cache[t].get('bctc_type') in ['HOP_NHAT', 'DAY_DU']:
            already_done.append(t)
        else:
            to_scan.append(it)
            
    print(f"\n🚀 ĐANG QUÉT: {title}")
    print(f"📊 Tổng số: {len(tickers_list)} mã | Đã có BCTC: {len(already_done)} mã | Cần quét: {len(to_scan)} mã\n")
    
    if not to_scan:
        print("🎉 Toàn bộ các mã trong danh sách này đều đã có BCTC đầy đủ!")
        return 0
        
    start_all = time.time()
    new_found = 0
    
    def worker(item):
        t = item['ticker']
        r = check_fpts_ezir(t)
        if r.get('has_q3'):
            return t, item, r
        uri = item.get('uri', '')
        if uri:
            r_w = check_company_website(t, uri)
            if r_w and r_w.get('has_q3'):
                return t, item, r_w
        return t, item, r

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(worker, it) for it in to_scan]
        for fut in futures:
            try:
                t, item, res = fut.result()
                if res.get('has_q3'):
                    new_found += 1
                    b_type = res.get('bctc_type', 'DAY_DU')
                    doc_url = res.get('doc_url', '')
                    print(f"\n🔥 [MỚI] {t} [{b_type}]: {res.get('title')} ({res.get('date')})")
                    lnst = extract_lnst_and_yoy(doc_url)
                    alert_payload = {
                        "ticker": t,
                        "company_name": item.get('name', ''),
                        "exchange": item.get('san', 'UPCOM'),
                        "quarter": "Quý 3/2026",
                        "release_date": res.get('date'),
                        "title": res.get('title'),
                        "source": res.get('source'),
                        "bctc_type": b_type,
                        "doc_url": doc_url,
                        "is_hot": True
                    }
                    if lnst.get('has_data'):
                        alert_payload['net_profit'] = lnst.get('current_quarter')
                        alert_payload['growth_rate'] = lnst.get('yoy')
                        alert_payload['growth_direction'] = lnst.get('direction', 'up')
                        alert_payload['lnst_label'] = lnst.get('label')
                        print(f"   📊 LNST: {alert_payload['net_profit']} ({alert_payload['growth_rate']})")
                    send_discord_alert(alert_payload)
                    completed_cache[t] = {
                        "ticker": t,
                        "company_name": item.get('name', ''),
                        "release_date": res.get('date'),
                        "title": res.get('title'),
                        "doc_url": doc_url,
                        "source": res.get('source'),
                        "bctc_type": b_type,
                        "updated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    }
                    save_completed_cache(completed_cache)
                else:
                    sys.stdout.write(".")
                    sys.stdout.flush()
            except:
                pass
                
    elapsed = round(time.time() - start_all, 2)
    print(f"\n\n⏱️ Hoàn tất quét trong {elapsed}s! Phát hiện {new_found} BCTC mới.")
    return new_found

def run_loop_monitor(interval_sec=300):
    enable_windows_keep_awake()
    
    if os.path.exists(TICKERS_G1_FILE):
        with open(TICKERS_G1_FILE, "r", encoding="utf-8") as f:
            tickers_list = json.load(f)
    else:
        print("❌ Không tìm thấy danh sách mã theo dõi.")
        return
        
    print("=" * 72)
    print(f"🚀 KÍCH HOẠT CHẾ ĐỘ GIÁM SÁT NGẦM TỰ ĐỘNG (CHU KỲ {interval_sec // 60} PHÚT/LẦN)")
    print("=" * 72)
    print("🔋 Windows Keep-Awake: Đã kích hoạt (Màn hình tắt máy tính vẫn chạy liên tục).")
    print(f"📊 Theo dõi: {len(tickers_list)} mã trọng điểm.")
    print("📲 Nhịp đập Discord: Tự động điều tiết 10 phút/lần chống spam.")
    print("🔥 Cảnh báo BCTC mới: Bắn chuông ngay lập tức kèm bóc tách LNST & % YoY.")
    print("Nhấn Ctrl + C để dừng bất kỳ lúc nào.\n")
    
    scan_idx = 0
    last_silent_ping_ts = 0
    
    try:
        while True:
            scan_idx += 1
            start_t = time.time()
            log(f"--- [LƯỢT #{scan_idx}] Bắt đầu quét tự động {len(tickers_list)} mã ---")
            new_found = scan_list_parallel(tickers_list, title=f"Lượt #{scan_idx}")
            elapsed = round(time.time() - start_t, 2)
            
            now_ts = time.time()
            if new_found > 0 or (now_ts - last_silent_ping_ts >= 540):
                send_silent_ping(scan_idx, len(tickers_list), elapsed)
                last_silent_ping_ts = now_ts
                log("🟢 Đã gửi nhịp đập bình thường về Discord.")
            else:
                log(f"ℹ️ Lượt #{scan_idx}: Bình thường ({elapsed}s). Bỏ qua ping Discord để chống spam.")
                
            log(f"💤 Nghỉ ngơi {interval_sec // 60} phút trước lượt quét tiếp theo...")
            time.sleep(interval_sec)
    except KeyboardInterrupt:
        print("\n\n⏹️ Đã dừng chế độ giám sát tự động an toàn.")

def scan_live_disclosures_all_market():
    print("=" * 72)
    print("📡 QUÉT LUỒNG CÔNG BỐ THÔNG TIN TỔNG HỢP TOÀN THỊ TRƯỜNG (3 SÀN)")
    print("=" * 72)
    url = "https://cafef.vn/du-lieu/Ajax/Events_RelatedNews_New.aspx?symbol=&floorID=0&configID=0&PageIndex=1&PageSize=50&Type=2"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://cafef.vn/'})
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            soup = BeautifulSoup(html, 'html.parser')
            items = soup.find_all('li')
            print(f"📊 Tìm thấy {len(items)} công bố thông tin mới nhất trên toàn thị trường:\n")
            for idx, li in enumerate(items[:20], 1):
                t_span = li.find('span', class_='timeTitle')
                a_tag = li.find('a', class_='docnhanhTitle')
                tm = t_span.get_text(strip=True) if t_span else ''
                title = a_tag.get('title') or a_tag.get_text(strip=True) if a_tag else ''
                href = a_tag.get('href') if a_tag else ''
                if not href.startswith('http'):
                    href = f"https://cafef.vn{href}"
                print(f" [{idx:02d}] `[{tm}]` {title}")
                print(f"      🔗 {href}")
    except Exception as e:
        print(f"Lỗi: {e}")
    print("=" * 72)

def add_ticker_to_watchlist():
    tk = input("\n📝 Nhập mã cổ phiếu muốn đưa vào giám sát tự động 5 phút (ví dụ BMP, HPG): ").strip().upper()
    if not tk:
        return
    if not os.path.exists(TICKERS_G1_FILE):
        print("❌ Không tìm thấy file danh mục.")
        return
    with open(TICKERS_G1_FILE, "r", encoding="utf-8") as f:
        items = json.load(f)
    tickers = [it['ticker'] for it in items]
    if tk in tickers:
        print(f"ℹ️ Mã [{tk}] ĐÃ CÓ trong danh sách theo dõi!")
        return
    info = get_company_info(tk)
    items.append({
        'stt': len(items) + 1,
        'ticker': tk,
        'name': info['name'],
        'san': info['san'],
        'batch_file': 'Manual_Added',
        'dot_ra': 'Ưu tiên',
        'uri': info['uri']
    })
    with open(TICKERS_G1_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    print(f"🎉 Đã thêm thành công [{tk}] ({info['name']}) vào danh sách tự động giám sát 5 phút/lần!")

def configure_discord():
    print("=" * 72)
    print("⚙️ CẤU HÌNH DISCORD WEBHOOK")
    print("=" * 72)
    cur = get_discord_webhook()
    print(f"URL hiện tại: {cur or 'Chưa cấu hình'}\n")
    new_url = input("Dán Webhook URL mới (nhấn Enter để giữ nguyên): ").strip()
    if new_url and new_url.startswith('http'):
        with open(DISCORD_CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump({"webhook_url": new_url}, f, indent=2)
        print("✅ Đã cập nhật Webhook thành công!")
    else:
        print("Giữ nguyên cấu hình.")

# ==========================================
# GIAO DIỆN MENU CHÍNH (INTERACTIVE UI)
# ==========================================
def main_menu():
    while True:
        print("\n" + "=" * 76)
        print("            STOCK RADAR PRO - GIÁM SÁT TÀI LIỆU & BCTC DOANH NGHIỆP")
        print("                        Phiên bản Pro • dulieudautu.com")
        print("=" * 76)
        print("  [1] Tra cứu MÃ BẤT KỲ theo yêu cầu (BCTC Q3, LNST & % YoY, link gốc)")
        print("  [2] Quét nhanh 1 lượt danh mục:")
        print("        a. Nhóm 1 Trọng điểm (116 mã có BMP)")
        print("        b. Danh mục 278 mã mở rộng")
        print("        c. TOÀN BỘ 938 mã toàn thị trường chứng khoán")
        print("  [3] KÍCH HOẠT GIÁM SÁT NGẦM TỰ ĐỘNG (Bật máy đi làm, tự chống Sleep)")
        print("  [4] Quét luồng CÔNG BỐ THÔNG TIN TỔNG HỢP toàn thị trường (Live CBTT)")
        print("  [5] Thêm một mã mới vào danh sách giám sát tự động 5 phút")
        print("  [6] Cấu hình Discord Webhook")
        print("  [0] Thoát phần mềm")
        print("=" * 76)
        
        c = input("👉 Lựa chọn của bạn [0-6]: ").strip().lower()
        if c == '1':
            tk = input("\n📝 Nhập mã cổ phiếu cần tra cứu (ví dụ: BMP, HPG, SSI, VNM): ").strip().upper()
            if tk:
                check_single_ticker(tk)
            input("\nNhấn Enter để quay lại Menu...")
        elif c in ['2', '2a', 'a']:
            if os.path.exists(TICKERS_G1_FILE):
                with open(TICKERS_G1_FILE, "r", encoding="utf-8") as f:
                    t_list = json.load(f)
                scan_list_parallel(t_list, title="Nhóm 1 Trọng Điểm (116 mã)")
            input("\nNhấn Enter để quay lại Menu...")
        elif c in ['2b', 'b']:
            if os.path.exists(TICKERS_278_FILE):
                with open(TICKERS_278_FILE, "r", encoding="utf-8") as f:
                    t_list = json.load(f)
                scan_list_parallel(t_list, title="Danh mục 278 mã")
            input("\nNhấn Enter để quay lại Menu...")
        elif c in ['2c', 'c']:
            if os.path.exists(TICKERS_938_FILE):
                with open(TICKERS_938_FILE, "r", encoding="utf-8") as f:
                    t_list = json.load(f)
                scan_list_parallel(t_list, title="Toàn bộ 938 mã toàn thị trường")
            input("\nNhấn Enter để quay lại Menu...")
        elif c == '3':
            print("\nChọn chu kỳ quét ngầm:")
            print("  1. 5 phút/lần (Khuyến nghị tuần cao điểm BCTC)")
            print("  2. 10 phút/lần")
            print("  3. 15 phút/lần")
            f_choice = input("Lựa chọn [Mặc định 1]: ").strip()
            sec = 300 if f_choice in ['', '1'] else (600 if f_choice == '2' else 900)
            run_loop_monitor(interval_sec=sec)
            input("\nNhấn Enter để quay lại Menu...")
        elif c == '4':
            scan_live_disclosures_all_market()
            input("\nNhấn Enter để quay lại Menu...")
        elif c == '5':
            add_ticker_to_watchlist()
            input("\nNhấn Enter để quay lại Menu...")
        elif c == '6':
            configure_discord()
            input("\nNhấn Enter để quay lại Menu...")
        elif c == '0':
            print("\nCảm ơn bạn đã sử dụng Stock Radar Pro. Tạm biệt!")
            break

if __name__ == '__main__':
    if len(sys.argv) > 1:
        if '--ticker' in sys.argv:
            idx = sys.argv.index('--ticker')
            if idx + 1 < len(sys.argv):
                check_single_ticker(sys.argv[idx + 1], prompt_discord=False)
        elif '--loop' in sys.argv:
            sec = 300
            if '--interval' in sys.argv:
                idx = sys.argv.index('--interval')
                if idx + 1 < len(sys.argv):
                    try:
                        sec = int(sys.argv[idx + 1])
                    except:
                        pass
            run_loop_monitor(interval_sec=sec)
    else:
        main_menu()
