"""
STOCK RADAR PRO - GIAO DIỆN ĐỒ HỌA (WINDOWS GUI APPLICATION)
Phát triển bởi dulieudautu.com
- Giao diện đồ họa chuyên nghiệp, hiện đại, không cần màn hình dòng lệnh đen.
- Đầy đủ 3 nhóm:
  + Nhóm 1: 116 mã trọng điểm (Ra BCTC từ 15 - 23/10, đã có BMP)
  + Nhóm 2: 69 mã (Ra BCTC từ 23 - 28/10: TTT -> HSM)
  + Nhóm 3: 94 mã (Ra BCTC từ 29 - 30/10: SJD -> VTB)
  + Mở rộng 278 mã & 938 mã toàn thị trường
- Bóc tách LNST & % YoY trực tiếp từ PDF
- Giám sát ngầm tự động, chống Windows Sleep khi đi làm
- Tự động gửi cảnh báo Discord điện thoại
"""

import os
import sys
import json
import time
import datetime
import threading
import urllib.request
import urllib.parse
import re
import unicodedata
import webbrowser
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext

# Xác định thư mục dữ liệu
if getattr(sys, 'frozen', False):
    EXE_DIR = os.path.dirname(sys.executable)
    BUNDLE_DIR = getattr(sys, '_MEIPASS', EXE_DIR)
else:
    EXE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    BUNDLE_DIR = EXE_DIR

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

TICKERS_G1_FILE = os.path.join(DATA_DIR, "tickers_group1_115.json")
TICKERS_G2_FILE = os.path.join(DATA_DIR, "tickers_group2_69.json")
TICKERS_G3_FILE = os.path.join(DATA_DIR, "tickers_group3_94.json")
TICKERS_278_FILE = os.path.join(DATA_DIR, "all_278_group_tickers.json")
TICKERS_938_FILE = os.path.join(DATA_DIR, "all_938_market_tickers.json")
COMPLETED_CACHE_FILE = os.path.join(DATA_DIR, "bctc_completed_cache.json")
DISCORD_CONFIG_FILE = os.path.join(DATA_DIR, "discord_config.json")
COMPANY_WEBSITES_FILE = os.path.join(DATA_DIR, "company_websites.json")

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def enable_windows_keep_awake():
    if os.name == 'nt':
        try:
            import ctypes
            ctypes.windll.kernel32.SetThreadExecutionState(0x80000001)
            return True
        except:
            return False
    return False

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
        if any(k in clean for k in ['bctc', 'tai chinh', 'financial', 'kqkd', 'giai trinh']):
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
                    'doc_url': best_item['doc_url']
                }
            return {
                'has_q3': False,
                'source': 'EzIR_FPTS',
                'latest_doc': f"[{latest_date}] {latest_title}" if latest_title else "Chưa có tài liệu mới"
            }
    except Exception as e:
        return {'has_q3': False, 'source': 'EzIR_FPTS', 'latest_doc': str(e)}

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
                    'is_hop_nhat': is_hop_nhat
                })
        if found_candidates:
            found_candidates.sort(key=lambda x: (x['is_file'], x['is_hop_nhat']), reverse=True)
            best = found_candidates[0]
            title = best['text'] if len(best['text']) >= 6 else "Báo cáo tài chính Quý 3/2026"
            return {
                'has_q3': True,
                'bctc_type': classify_bctc_type(title),
                'source': 'Company_Web',
                'title': title,
                'date': datetime.datetime.now().strftime("%d/%m/%Y"),
                'doc_url': best['href']
            }
        return {'has_q3': False, 'source': 'Company_Web'}
    except:
        return {'has_q3': False, 'source': 'Company_Web'}

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
        return {"has_data": False, "reason": "Chưa có pymupdf"}
        
    if not doc_url or not doc_url.lower().endswith('.pdf'):
        return {"has_data": False, "reason": "Tài liệu không phải file PDF trực tiếp"}
        
    try:
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

def get_discord_webhook():
    webhook_url = os.environ.get("DISCORD_WEBHOOK_URL")
    if not webhook_url and os.path.exists(DISCORD_CONFIG_FILE):
        try:
            with open(DISCORD_CONFIG_FILE, "r", encoding="utf-8") as f:
                webhook_url = json.load(f).get("webhook_url")
        except:
            pass
    return webhook_url

def send_discord_alert(alert_payload):
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
            return True
    except:
        return False

def send_silent_ping(scan_index, remaining_count, elapsed_sec):
    webhook_url = get_discord_webhook()
    if not webhook_url:
        return
    now_str = datetime.datetime.now().strftime("%H:%M")
    payload = {
        "content": f"🟢 `[{now_str}]` **Hệ thống hoạt động bình thường** • Đã quét **{remaining_count} mã** ({elapsed_sec}s) • Chưa có BCTC mới.",
        "flags": 4096
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
    except:
        pass

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


# ==========================================
# GIAO DIỆN ĐỒ HỌA CHÍNH (TKINTER GUI)
# ==========================================
class StockRadarGUI(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Stock Radar Pro - Giám Sát Báo Cáo Tài Chính & Tài Liệu Doanh Nghiệp")
        self.geometry("1080x720")
        self.minsize(960, 640)
        
        # Biến trạng thái
        self.is_monitoring = False
        self.monitor_thread = None
        self.last_result = None
        
        self.setup_styles()
        self.create_widgets()
        enable_windows_keep_awake()

    def setup_styles(self):
        self.style = ttk.Style(self)
        try:
            self.style.theme_use('vista')
        except:
            pass
        self.configure(bg="#F1F5F9")
        
        self.style.configure("TNotebook", background="#F1F5F9", borderwidth=0)
        self.style.configure("TNotebook.Tab", font=("Segoe UI", 10, "bold"), padding=[16, 8])
        self.style.configure("Header.TLabel", font=("Segoe UI", 16, "bold"), foreground="#0F172A", background="#F1F5F9")
        self.style.configure("SubHeader.TLabel", font=("Segoe UI", 10), foreground="#64748B", background="#F1F5F9")
        self.style.configure("Accent.TButton", font=("Segoe UI", 10, "bold"))

    def create_widgets(self):
        # Header banner
        header_frame = tk.Frame(self, bg="#1E293B", height=68)
        header_frame.pack(fill=tk.X, side=tk.TOP)
        header_frame.pack_propagate(False)
        
        title_lbl = tk.Label(header_frame, text="⚡ STOCK RADAR PRO", font=("Segoe UI", 15, "bold"), fg="#38BDF8", bg="#1E293B")
        title_lbl.pack(side=tk.LEFT, padx=20, pady=12)
        
        subtitle_lbl = tk.Label(header_frame, text="Hệ thống quét & bóc tách BCTC tự động siêu tốc • dulieudautu.com", font=("Segoe UI", 10), fg="#94A3B8", bg="#1E293B")
        subtitle_lbl.pack(side=tk.LEFT, pady=12)

        self.status_badge = tk.Label(header_frame, text="🟢 SẴN SÀNG", font=("Segoe UI", 9, "bold"), fg="#10B981", bg="#0F172A", padx=12, pady=4)
        self.status_badge.pack(side=tk.RIGHT, padx=20, pady=16)

        # Tabs container
        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=16, pady=12)

        # Tab 1: Tra cứu tức thì
        self.tab_single = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_single, text="🔍 Tra cứu MÃ BẤT KỲ")
        self.build_tab_single()

        # Tab 2: Quét theo 3 Nhóm & Toàn thị trường
        self.tab_groups = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_groups, text="📊 Quét theo Nhóm (1, 2, 3)")
        self.build_tab_groups()

        # Tab 3: Giám sát ngầm tự động
        self.tab_monitor = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_monitor, text="⏰ Giám sát tự động (Đi làm)")
        self.build_tab_monitor()

        # Tab 4: Luồng Công bố thông tin 3 sàn
        self.tab_live = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_live, text="📡 Luồng CBTT 3 sàn (Live)")
        self.build_tab_live()

        # Tab 5: Cài đặt
        self.tab_settings = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_settings, text="⚙️ Cài đặt & Discord")
        self.build_tab_settings()

    # ==========================
    # TAB 1: TRA CỨU TỨC THÌ
    # ==========================
    def build_tab_single(self):
        p = ttk.Frame(self.tab_single, padding=20)
        p.pack(fill=tk.BOTH, expand=True)

        lbl = ttk.Label(p, text="Nhập mã cổ phiếu để kiểm tra BCTC Quý 3/2026 ngay lập tức:", font=("Segoe UI", 11, "bold"))
        lbl.pack(anchor=tk.W, pady=(0, 10))

        bar = ttk.Frame(p)
        bar.pack(fill=tk.X, pady=(0, 15))

        self.txt_single = ttk.Entry(bar, font=("Segoe UI", 13, "bold"), width=15)
        self.txt_single.pack(side=tk.LEFT, ipady=4, padx=(0, 10))
        self.txt_single.insert(0, "BMP")
        self.txt_single.bind("<Return>", lambda e: self.on_check_single())

        btn_search = tk.Button(bar, text="🔍 Kiểm Tra Tức Thì", font=("Segoe UI", 11, "bold"), bg="#0284C7", fg="white", activebackground="#0369A1", padx=16, pady=4, relief=tk.FLAT, command=self.on_check_single)
        btn_search.pack(side=tk.LEFT)

        # Card hiển thị kết quả
        self.card_single = tk.Frame(p, bg="white", relief=tk.SOLID, bd=1, padx=20, pady=20)
        self.card_single.pack(fill=tk.BOTH, expand=True, pady=10)

        self.lbl_res_title = tk.Label(self.card_single, text="Vui lòng nhập mã và nhấn 'Kiểm Tra Tức Thì'", font=("Segoe UI", 12), bg="white", fg="#475569")
        self.lbl_res_title.pack(anchor=tk.W, pady=(0, 8))

        self.txt_res_details = scrolledtext.ScrolledText(self.card_single, font=("Segoe UI", 10), height=14, relief=tk.FLAT, bg="#F8FAFC")
        self.txt_res_details.pack(fill=tk.BOTH, expand=True, pady=10)

        # Action bar
        act_bar = ttk.Frame(p)
        act_bar.pack(fill=tk.X, pady=(10, 0))

        self.btn_open_pdf = tk.Button(act_bar, text="📄 Mở File BCTC Gốc", font=("Segoe UI", 10, "bold"), bg="#475569", fg="white", padx=12, pady=6, relief=tk.FLAT, state=tk.DISABLED, command=self.on_open_pdf)
        self.btn_open_pdf.pack(side=tk.LEFT, padx=(0, 10))

        self.btn_send_discord = tk.Button(act_bar, text="📲 Bắn Cảnh Báo Về Discord", font=("Segoe UI", 10, "bold"), bg="#10B981", fg="white", padx=12, pady=6, relief=tk.FLAT, state=tk.DISABLED, command=self.on_send_discord_single)
        self.btn_send_discord.pack(side=tk.LEFT)

    def on_check_single(self):
        tk_code = self.txt_single.get().strip().upper()
        if not tk_code:
            messagebox.showwarning("Thiếu mã", "Vui lòng nhập mã cổ phiếu!")
            return
            
        self.lbl_res_title.config(text=f"⏳ Đang kiểm tra mã [{tk_code}] trên tất cả các cổng thông tin...", fg="#0284C7")
        self.txt_res_details.delete("1.0", tk.END)
        self.txt_res_details.insert(tk.END, "Đang kết nối EzIR FPTS, Website công ty và Cổng CBTT CafeF...\n")
        self.btn_open_pdf.config(state=tk.DISABLED)
        self.btn_send_discord.config(state=tk.DISABLED)
        
        def run():
            start_t = time.time()
            info = get_company_info(tk_code)
            res = None
            
            # EzIR
            r_ezir = check_fpts_ezir(tk_code)
            if r_ezir.get('has_q3'):
                res = r_ezir
                
            # Web riêng
            if not res and info.get('uri'):
                r_web = check_company_website(tk_code, info['uri'])
                if r_web and r_web.get('has_q3'):
                    res = r_web
                    
            # CafeF
            if not res:
                r_cf = check_cafef_disclosures(tk_code)
                if r_cf and r_cf.get('has_q3'):
                    res = r_cf
                    
            elapsed = round(time.time() - start_t, 2)
            
            self.after(0, lambda: self.render_single_result(tk_code, info, res, r_ezir, elapsed))

        threading.Thread(target=run, daemon=True).start()

    def render_single_result(self, ticker, info, res, r_ezir, elapsed):
        self.txt_res_details.delete("1.0", tk.END)
        if res and res.get('has_q3'):
            b_type = res.get('bctc_type', 'DAY_DU')
            type_str = "HỢP NHẤT" if b_type == 'HOP_NHAT' else ("RIÊNG (CTY MẸ)" if b_type == 'RIENG' else "ĐẦY ĐỦ")
            doc_url = res.get('doc_url', '')
            
            self.lbl_res_title.config(text=f"🔥 ĐÃ PHÁT HIỆN BCTC QUÝ 3/2026 CHO [{ticker}]!", fg="#059669")
            
            lines = [
                f"🏢 Doanh nghiệp: {info['name']} (Sàn: {info['san']})",
                f"📂 Phân loại báo cáo: {type_str} [{b_type}]",
                f"📑 Tiêu đề: {res.get('title')}",
                f"📅 Ngày công bố: {res.get('date')}",
                f"🌐 Nguồn phát hiện: {res.get('source')}",
                f"🔗 Đường dẫn tài liệu: {doc_url}\n",
                "📊 BÓC TÁCH LỢI NHUẬN SAU THUẾ & TĂNG TRƯỞNG:"
            ]
            
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
                "doc_url": doc_url
            }
            if lnst.get('has_data'):
                alert_payload['net_profit'] = lnst.get('current_quarter')
                alert_payload['growth_rate'] = lnst.get('yoy')
                alert_payload['growth_direction'] = lnst.get('direction', 'up')
                alert_payload['lnst_label'] = lnst.get('label')
                lines.append(f"   • {lnst.get('label')}: {lnst.get('current_quarter')} (Tăng trưởng: {lnst.get('yoy')})")
            else:
                lines.append(f"   • Ghi chú: {lnst.get('reason', 'Đang cập nhật số liệu')}")
                alert_payload['lnst_status'] = lnst.get('reason')
                
            self.last_result = alert_payload
            self.txt_res_details.insert(tk.END, "\n".join(lines))
            self.btn_open_pdf.config(state=tk.NORMAL)
            self.btn_send_discord.config(state=tk.NORMAL)
        else:
            self.lbl_res_title.config(text=f"❄️ [{ticker}] CHƯA CÓ Báo cáo tài chính Quý 3/2026 (Quét xong trong {elapsed}s)", fg="#64748B")
            self.txt_res_details.insert(tk.END, f"• Doanh nghiệp: {info['name']} (Sàn {info['san']})\n")
            self.txt_res_details.insert(tk.END, f"• EzIR FPTS: {r_ezir.get('latest_doc', 'Chưa có tài liệu mới')}\n")
            self.txt_res_details.insert(tk.END, f"• Website riêng ({info.get('uri')}): Chưa có file Q3/2026\n")
            self.txt_res_details.insert(tk.END, f"• Cổng CBTT CafeF: Chưa có thông báo BCTC Q3\n\n")
            self.txt_res_details.insert(tk.END, "💡 Để tự động theo dõi mã này mỗi 5 phút khi có BCTC, hãy chuyển sang tab 'Cài đặt' hoặc nhấn thêm vào danh sách theo dõi.")
            self.btn_open_pdf.config(state=tk.DISABLED)
            self.btn_send_discord.config(state=tk.DISABLED)

    def on_open_pdf(self):
        if self.last_result and self.last_result.get('doc_url'):
            webbrowser.open(self.last_result['doc_url'])

    def on_send_discord_single(self):
        if self.last_result:
            if send_discord_alert(self.last_result):
                messagebox.showinfo("Thành công", f"Đã bắn cảnh báo [{self.last_result['ticker']}] thành công về Discord điện thoại!")
            else:
                messagebox.showwarning("Lỗi", "Không thể gửi cảnh báo Discord. Vui lòng kiểm tra lại Webhook URL trong tab Cài đặt.")

    # ==========================
    # TAB 2: QUÉT THEO 3 NHÓM
    # ==========================
    def build_tab_groups(self):
        p = ttk.Frame(self.tab_groups, padding=16)
        p.pack(fill=tk.BOTH, expand=True)

        lbl = ttk.Label(p, text="Chọn nhóm cổ phiếu để bắt đầu quét đối chiếu song song:", font=("Segoe UI", 11, "bold"))
        lbl.pack(anchor=tk.W, pady=(0, 10))

        # Khung nút bấm các nhóm
        btn_box = tk.Frame(p, bg="#F1F5F9")
        btn_box.pack(fill=tk.X, pady=(0, 12))

        b1 = tk.Button(btn_box, text="📌 Nhóm 1 (15 - 23/10)\n116 mã trọng điểm (Có BMP)", font=("Segoe UI", 9, "bold"), bg="#0284C7", fg="white", padx=12, pady=6, relief=tk.FLAT, command=lambda: self.start_group_scan(TICKERS_G1_FILE, "Nhóm 1: 15 - 23/10 (116 mã)"))
        b1.pack(side=tk.LEFT, padx=(0, 8))

        b2 = tk.Button(btn_box, text="📌 Nhóm 2 (23 - 28/10)\n69 mã (TTT -> HSM)", font=("Segoe UI", 9, "bold"), bg="#D97706", fg="white", padx=12, pady=6, relief=tk.FLAT, command=lambda: self.start_group_scan(TICKERS_G2_FILE, "Nhóm 2: 23 - 28/10 (69 mã)"))
        b2.pack(side=tk.LEFT, padx=(0, 8))

        b3 = tk.Button(btn_box, text="📌 Nhóm 3 (29 - 30/10)\n94 mã (SJD -> VTB)", font=("Segoe UI", 9, "bold"), bg="#7C3AED", fg="white", padx=12, pady=6, relief=tk.FLAT, command=lambda: self.start_group_scan(TICKERS_G3_FILE, "Nhóm 3: 29 - 30/10 (94 mã)"))
        b3.pack(side=tk.LEFT, padx=(0, 8))

        b4 = tk.Button(btn_box, text="📋 Toàn Bộ 278 Mã\n(Nhóm 1 + 2 + 3)", font=("Segoe UI", 9, "bold"), bg="#334155", fg="white", padx=12, pady=6, relief=tk.FLAT, command=lambda: self.start_group_scan(TICKERS_278_FILE, "Toàn bộ 278 mã rút gọn"))
        b4.pack(side=tk.LEFT, padx=(0, 8))

        b5 = tk.Button(btn_box, text="🌐 Toàn Bộ 938 Mã\nThị trường (co phieu loc)", font=("Segoe UI", 9, "bold"), bg="#0F172A", fg="white", padx=12, pady=6, relief=tk.FLAT, command=lambda: self.start_group_scan(TICKERS_938_FILE, "Toàn bộ 938 mã thị trường"))
        b5.pack(side=tk.LEFT)

        # Progress bar
        self.progress_bar = ttk.Progressbar(p, orient="horizontal", mode="determinate")
        self.progress_bar.pack(fill=tk.X, pady=(0, 6))

        self.lbl_progress = ttk.Label(p, text="Sẵn sàng quét.", font=("Segoe UI", 9), foreground="#64748B")
        self.lbl_progress.pack(anchor=tk.W, pady=(0, 10))

        # Table kết quả
        cols = ("stt", "ticker", "name", "date", "bctc_type", "profit", "yoy", "source")
        self.tree_groups = ttk.Treeview(p, columns=cols, show="headings", height=14)
        
        self.tree_groups.heading("stt", text="STT")
        self.tree_groups.heading("ticker", text="Mã")
        self.tree_groups.heading("name", text="Tên Doanh Nghiệp")
        self.tree_groups.heading("date", text="Ngày Ra")
        self.tree_groups.heading("bctc_type", text="Loại BCTC")
        self.tree_groups.heading("profit", text="LNST Q3")
        self.tree_groups.heading("yoy", text="% YoY")
        self.tree_groups.heading("source", text="Nguồn")

        self.tree_groups.column("stt", width=45, anchor=tk.CENTER)
        self.tree_groups.column("ticker", width=70, anchor=tk.CENTER)
        self.tree_groups.column("name", width=220)
        self.tree_groups.column("date", width=85, anchor=tk.CENTER)
        self.tree_groups.column("bctc_type", width=95, anchor=tk.CENTER)
        self.tree_groups.column("profit", width=90, anchor=tk.E)
        self.tree_groups.column("yoy", width=90, anchor=tk.CENTER)
        self.tree_groups.column("source", width=100)

        scrollbar = ttk.Scrollbar(p, orient=tk.VERTICAL, command=self.tree_groups.yview)
        self.tree_groups.configure(yscroll=scrollbar.set)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree_groups.pack(fill=tk.BOTH, expand=True)
        self.tree_groups.bind("<Double-1>", self.on_double_click_row)

    def start_group_scan(self, file_path, group_name):
        if not os.path.exists(file_path):
            messagebox.showerror("Thiếu file", f"Không tìm thấy file dữ liệu: {file_path}")
            return
            
        with open(file_path, "r", encoding="utf-8") as f:
            tickers_list = json.load(f)
            
        for item in self.tree_groups.get_children():
            self.tree_groups.delete(item)
            
        self.lbl_progress.config(text=f"Đang chuẩn bị quét {len(tickers_list)} mã của {group_name}...")
        self.progress_bar["maximum"] = len(tickers_list)
        self.progress_bar["value"] = 0

        def run():
            completed_cache = load_completed_cache()
            to_scan = []
            for it in tickers_list:
                t = it['ticker']
                if t in completed_cache and completed_cache[t].get('bctc_type') in ['HOP_NHAT', 'DAY_DU']:
                    c_info = completed_cache[t]
                    self.after(0, lambda it=it, c_info=c_info: self.add_tree_row(it['ticker'], it.get('name', ''), c_info.get('release_date', ''), c_info.get('bctc_type', ''), "Đã có sẵn", "-", c_info.get('source', ''), c_info.get('doc_url', '')))
                else:
                    to_scan.append(it)
                    
            start_t = time.time()
            done_cnt = len(tickers_list) - len(to_scan)
            self.after(0, lambda: self.progress_bar.configure(value=done_cnt))
            
            def scan_worker(item):
                t = item['ticker']
                res = check_fpts_ezir(t)
                if res.get('has_q3'):
                    return t, item, res
                uri = item.get('uri', '')
                if uri:
                    res_w = check_company_website(t, uri)
                    if res_w and res_w.get('has_q3'):
                        return t, item, res_w
                return t, item, res

            new_cnt = 0
            with ThreadPoolExecutor(max_workers=10) as executor:
                futures = [executor.submit(scan_worker, it) for it in to_scan]
                for fut in futures:
                    done_cnt += 1
                    self.after(0, lambda dc=done_cnt: self.progress_bar.configure(value=dc))
                    try:
                        t, item, res = fut.result()
                        if res.get('has_q3'):
                            new_cnt += 1
                            b_type = res.get('bctc_type', 'DAY_DU')
                            doc_url = res.get('doc_url', '')
                            date_str = res.get('date', datetime.datetime.now().strftime("%d/%m/%Y"))
                            
                            lnst = extract_lnst_and_yoy(doc_url)
                            np_str = lnst.get('current_quarter', '-') if lnst.get('has_data') else '-'
                            yoy_str = lnst.get('yoy', '-') if lnst.get('has_data') else '-'
                            
                            self.after(0, lambda t=t, item=item, date_str=date_str, b_type=b_type, np_str=np_str, yoy_str=yoy_str, src=res.get('source', ''), doc_url=doc_url: self.add_tree_row(t, item.get('name', ''), date_str, b_type, np_str, yoy_str, src, doc_url))
                            
                            alert_payload = {
                                "ticker": t,
                                "company_name": item.get('name', ''),
                                "exchange": item.get('san', 'UPCOM'),
                                "quarter": "Quý 3/2026",
                                "release_date": date_str,
                                "title": res.get('title'),
                                "source": res.get('source'),
                                "bctc_type": b_type,
                                "doc_url": doc_url
                            }
                            if lnst.get('has_data'):
                                alert_payload['net_profit'] = lnst.get('current_quarter')
                                alert_payload['growth_rate'] = lnst.get('yoy')
                                alert_payload['growth_direction'] = lnst.get('direction', 'up')
                                alert_payload['lnst_label'] = lnst.get('label')
                            send_discord_alert(alert_payload)
                            
                            completed_cache[t] = {
                                "ticker": t,
                                "company_name": item.get('name', ''),
                                "release_date": date_str,
                                "title": res.get('title'),
                                "doc_url": doc_url,
                                "source": res.get('source'),
                                "bctc_type": b_type,
                                "updated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                            }
                            save_completed_cache(completed_cache)
                    except:
                        pass
                        
            elapsed = round(time.time() - start_t, 2)
            self.after(0, lambda: self.lbl_progress.config(text=f"✅ Hoàn tất quét {group_name} trong {elapsed}s! Phát hiện mới: {new_cnt} mã."))

        threading.Thread(target=run, daemon=True).start()

    def add_tree_row(self, ticker, name, date_str, bctc_type, profit, yoy, source, doc_url):
        idx = len(self.tree_groups.get_children()) + 1
        tag = "even" if idx % 2 == 0 else "odd"
        self.tree_groups.insert("", tk.END, values=(idx, ticker, name, date_str, bctc_type, profit, yoy, source), tags=(doc_url,))

    def on_double_click_row(self, event):
        item_id = self.tree_groups.focus()
        if not item_id:
            return
        tags = self.tree_groups.item(item_id, "tags")
        if tags and tags[0] and tags[0].startswith("http"):
            webbrowser.open(tags[0])

    # ==========================
    # TAB 3: GIÁM SÁT TỰ ĐỘNG
    # ==========================
    def build_tab_monitor(self):
        p = ttk.Frame(self.tab_monitor, padding=20)
        p.pack(fill=tk.BOTH, expand=True)

        lbl = ttk.Label(p, text="Cấu hình chế độ Giám sát ngầm tự động (Chạy suốt ngày khi bạn đi làm):", font=("Segoe UI", 11, "bold"))
        lbl.pack(anchor=tk.W, pady=(0, 15))

        cfg_box = tk.Frame(p, bg="white", relief=tk.SOLID, bd=1, padx=20, pady=16)
        cfg_box.pack(fill=tk.X, pady=(0, 15))

        # Chọn chu kỳ
        r1 = tk.Frame(cfg_box, bg="white")
        r1.pack(fill=tk.X, pady=6)
        tk.Label(r1, text="Tần suất quét ngầm:", font=("Segoe UI", 10, "bold"), bg="white", width=20, anchor=tk.W).pack(side=tk.LEFT)
        self.var_interval = tk.StringVar(value="300")
        tk.Radiobutton(r1, text="5 phút/lần (Khuyên dùng tuần cao điểm)", variable=self.var_interval, value="300", bg="white").pack(side=tk.LEFT, padx=10)
        tk.Radiobutton(r1, text="10 phút/lần", variable=self.var_interval, value="600", bg="white").pack(side=tk.LEFT, padx=10)
        tk.Radiobutton(r1, text="15 phút/lần", variable=self.var_interval, value="900", bg="white").pack(side=tk.LEFT, padx=10)

        # Chọn nhóm
        r2 = tk.Frame(cfg_box, bg="white")
        r2.pack(fill=tk.X, pady=6)
        tk.Label(r2, text="Danh mục theo dõi:", font=("Segoe UI", 10, "bold"), bg="white", width=20, anchor=tk.W).pack(side=tk.LEFT)
        self.var_group_choice = tk.StringVar(value="g1")
        tk.Radiobutton(r2, text="Nhóm 1 (116 mã trọng điểm)", variable=self.var_group_choice, value="g1", bg="white").pack(side=tk.LEFT, padx=10)
        tk.Radiobutton(r2, text="Nhóm 2 (69 mã)", variable=self.var_group_choice, value="g2", bg="white").pack(side=tk.LEFT, padx=10)
        tk.Radiobutton(r2, text="Nhóm 3 (94 mã)", variable=self.var_group_choice, value="g3", bg="white").pack(side=tk.LEFT, padx=10)
        tk.Radiobutton(r2, text="Toàn bộ 278 mã", variable=self.var_group_choice, value="all278", bg="white").pack(side=tk.LEFT, padx=10)

        # Chống Sleep & Discord
        r3 = tk.Frame(cfg_box, bg="white")
        r3.pack(fill=tk.X, pady=6)
        self.var_keep_awake = tk.BooleanVar(value=True)
        tk.Checkbutton(r3, text="🔋 Bật Windows Keep-Awake (Ngăn máy tính tự ngủ khi màn hình tắt)", variable=self.var_keep_awake, bg="white", font=("Segoe UI", 9, "bold")).pack(side=tk.LEFT)

        r4 = tk.Frame(cfg_box, bg="white")
        r4.pack(fill=tk.X, pady=6)
        self.var_throttle = tk.BooleanVar(value=True)
        tk.Checkbutton(r4, text="🔕 Điều tiết nhịp đập Discord 10 phút/lần (Chống spam, còi hú ngay khi có BCTC)", variable=self.var_throttle, bg="white", font=("Segoe UI", 9, "bold")).pack(side=tk.LEFT)

        # Control buttons
        ctl_bar = tk.Frame(p)
        ctl_bar.pack(fill=tk.X, pady=10)

        self.btn_start_monitor = tk.Button(ctl_bar, text="▶️ BẮT ĐẦU GIÁM SÁT NGẦM", font=("Segoe UI", 11, "bold"), bg="#10B981", fg="white", activebackground="#059669", padx=20, pady=8, relief=tk.FLAT, command=self.on_start_monitoring)
        self.btn_start_monitor.pack(side=tk.LEFT, padx=(0, 10))

        self.btn_stop_monitor = tk.Button(ctl_bar, text="⏹️ DỪNG GIÁM SÁT", font=("Segoe UI", 11, "bold"), bg="#EF4444", fg="white", padx=20, pady=8, relief=tk.FLAT, state=tk.DISABLED, command=self.on_stop_monitoring)
        self.btn_stop_monitor.pack(side=tk.LEFT)

        # Log output
        lbl_log = ttk.Label(p, text="Nhật ký chu kỳ quét ngầm:", font=("Segoe UI", 10, "bold"))
        lbl_log.pack(anchor=tk.W, pady=(15, 6))

        self.txt_monitor_log = scrolledtext.ScrolledText(p, font=("Consolas", 10), height=11, bg="#0F172A", fg="#38BDF8")
        self.txt_monitor_log.pack(fill=tk.BOTH, expand=True)

    def on_start_monitoring(self):
        self.is_monitoring = True
        self.btn_start_monitor.config(state=tk.DISABLED)
        self.btn_stop_monitor.config(state=tk.NORMAL)
        self.status_badge.config(text="🔴 ĐANG GIÁM SÁT NGẦM", fg="#EF4444")
        
        interval = int(self.var_interval.get())
        g_choice = self.var_group_choice.get()
        if g_choice == 'g2':
            f_path = TICKERS_G2_FILE
            g_name = "Nhóm 2 (69 mã)"
        elif g_choice == 'g3':
            f_path = TICKERS_G3_FILE
            g_name = "Nhóm 3 (94 mã)"
        elif g_choice == 'all278':
            f_path = TICKERS_278_FILE
            g_name = "Toàn bộ 278 mã"
        else:
            f_path = TICKERS_G1_FILE
            g_name = "Nhóm 1 (116 mã có BMP)"
            
        with open(f_path, "r", encoding="utf-8") as f:
            tickers_list = json.load(f)
            
        self.log_monitor(f"🚀 Kích hoạt chế độ giám sát tự động: {g_name} (Chu kỳ {interval//60} phút/lần)")
        if self.var_keep_awake.get():
            enable_windows_keep_awake()
            self.log_monitor("🔋 Đã kích hoạt Windows Keep-Awake: Màn hình tắt máy vẫn chạy liên tục.")

        def loop_worker():
            scan_idx = 0
            last_silent_ping = 0
            while self.is_monitoring:
                scan_idx += 1
                start_t = time.time()
                self.log_monitor(f"\n--- [LƯỢT #{scan_idx}] Bắt đầu quét {len(tickers_list)} mã ---")
                
                new_cnt = 0
                completed_cache = load_completed_cache()
                to_scan = [it for it in tickers_list if it['ticker'] not in completed_cache or completed_cache[it['ticker']].get('bctc_type') not in ['HOP_NHAT', 'DAY_DU']]
                
                def sub_worker(item):
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
                    futures = [executor.submit(sub_worker, it) for it in to_scan]
                    for fut in futures:
                        if not self.is_monitoring:
                            break
                        try:
                            t, item, res = fut.result()
                            if res.get('has_q3'):
                                new_cnt += 1
                                b_type = res.get('bctc_type', 'DAY_DU')
                                doc_url = res.get('doc_url', '')
                                self.log_monitor(f"🔥 [BCTC MỚI] {t} [{b_type}]: {res.get('title')}")
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
                                    "doc_url": doc_url
                                }
                                if lnst.get('has_data'):
                                    alert_payload['net_profit'] = lnst.get('current_quarter')
                                    alert_payload['growth_rate'] = lnst.get('yoy')
                                    alert_payload['growth_direction'] = lnst.get('direction', 'up')
                                    alert_payload['lnst_label'] = lnst.get('label')
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
                        except:
                            pass
                            
                elapsed = round(time.time() - start_t, 2)
                now_ts = time.time()
                if new_cnt > 0 or (now_ts - last_silent_ping >= 540):
                    send_silent_ping(scan_idx, len(tickers_list), elapsed)
                    last_silent_ping = now_ts
                    self.log_monitor(f"🟢 Quét xong {len(to_scan)} mã ({elapsed}s) • Đã gửi nhịp đập Discord.")
                else:
                    self.log_monitor(f"ℹ️ Quét xong {len(to_scan)} mã ({elapsed}s) • Bỏ qua Discord để chống spam.")
                    
                if not self.is_monitoring:
                    break
                self.log_monitor(f"💤 Nghỉ {interval//60} phút trước lượt kế tiếp...")
                for _ in range(interval):
                    if not self.is_monitoring:
                        break
                    time.sleep(1)

        self.monitor_thread = threading.Thread(target=loop_worker, daemon=True)
        self.monitor_thread.start()

    def on_stop_monitoring(self):
        self.is_monitoring = False
        self.btn_start_monitor.config(state=tk.NORMAL)
        self.btn_stop_monitor.config(state=tk.DISABLED)
        self.status_badge.config(text="🟢 SẴN SÀNG", fg="#10B981")
        self.log_monitor("⏹️ Đã dừng chế độ giám sát tự động an toàn.")

    def log_monitor(self, msg):
        ts = datetime.datetime.now().strftime("%H:%M:%S")
        self.txt_monitor_log.insert(tk.END, f"[{ts}] {msg}\n")
        self.txt_monitor_log.see(tk.END)

    # ==========================
    # TAB 4: LUỒNG CBTT 3 SÀN
    # ==========================
    def build_tab_live(self):
        p = ttk.Frame(self.tab_live, padding=16)
        p.pack(fill=tk.BOTH, expand=True)

        bar = ttk.Frame(p)
        bar.pack(fill=tk.X, pady=(0, 10))

        lbl = ttk.Label(bar, text="Luồng Công Bố Thông Tin & Báo Cáo Doanh Nghiệp (Cập nhật trực tiếp 3 sàn):", font=("Segoe UI", 11, "bold"))
        lbl.pack(side=tk.LEFT)

        btn_refresh = tk.Button(bar, text="🔄 Làm Mới Ngay", font=("Segoe UI", 9, "bold"), bg="#0284C7", fg="white", padx=12, pady=4, relief=tk.FLAT, command=self.load_live_disclosures)
        btn_refresh.pack(side=tk.RIGHT)

        cols = ("idx", "time", "ticker", "title", "link")
        self.tree_live = ttk.Treeview(p, columns=cols, show="headings", height=18)
        self.tree_live.heading("idx", text="#")
        self.tree_live.heading("time", text="Thời Gian")
        self.tree_live.heading("ticker", text="Mã")
        self.tree_live.heading("title", text="Tiêu Đề Công Bố Thông Tin")
        self.tree_live.heading("link", text="Link Xem")

        self.tree_live.column("idx", width=40, anchor=tk.CENTER)
        self.tree_live.column("time", width=120, anchor=tk.CENTER)
        self.tree_live.column("ticker", width=70, anchor=tk.CENTER)
        self.tree_live.column("title", width=620)
        self.tree_live.column("link", width=100)

        scrollbar = ttk.Scrollbar(p, orient=tk.VERTICAL, command=self.tree_live.yview)
        self.tree_live.configure(yscroll=scrollbar.set)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree_live.pack(fill=tk.BOTH, expand=True)
        self.tree_live.bind("<Double-1>", self.on_double_click_live)

    def load_live_disclosures(self):
        for item in self.tree_live.get_children():
            self.tree_live.delete(item)
            
        def run():
            url = "https://cafef.vn/du-lieu/Ajax/Events_RelatedNews_New.aspx?symbol=&floorID=0&configID=0&PageIndex=1&PageSize=50&Type=2"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://cafef.vn/'})
            try:
                with urllib.request.urlopen(req, timeout=8) as resp:
                    html = resp.read().decode('utf-8', errors='ignore')
                    soup = BeautifulSoup(html, 'html.parser')
                    items = soup.find_all('li')
                    for i, li in enumerate(items, 1):
                        t_span = li.find('span', class_='timeTitle')
                        a_tag = li.find('a', class_='docnhanhTitle')
                        tm = t_span.get_text(strip=True) if t_span else ''
                        title = a_tag.get('title') or a_tag.get_text(strip=True) if a_tag else ''
                        href = a_tag.get('href') if a_tag else ''
                        if not href.startswith('http'):
                            href = f"https://cafef.vn{href}"
                        m_tk = re.search(r'^([A-Z0-9]{3,4})[:\s\-]', title)
                        tk_str = m_tk.group(1) if m_tk else "-"
                        self.after(0, lambda i=i, tm=tm, tk_str=tk_str, title=title, href=href: self.tree_live.insert("", tk.END, values=(i, tm, tk_str, title, "Xem chi tiết"), tags=(href,)))
            except:
                pass
        threading.Thread(target=run, daemon=True).start()

    def on_double_click_live(self, event):
        item_id = self.tree_live.focus()
        if not item_id:
            return
        tags = self.tree_live.item(item_id, "tags")
        if tags and tags[0] and tags[0].startswith("http"):
            webbrowser.open(tags[0])

    # ==========================
    # TAB 5: CÀI ĐẶT
    # ==========================
    def build_tab_settings(self):
        p = ttk.Frame(self.tab_settings, padding=20)
        p.pack(fill=tk.BOTH, expand=True)

        lbl1 = ttk.Label(p, text="⚙️ Cấu hình Discord Webhook nhận thông báo điện thoại:", font=("Segoe UI", 11, "bold"))
        lbl1.pack(anchor=tk.W, pady=(0, 8))

        cur_hook = get_discord_webhook() or ""
        self.entry_webhook = ttk.Entry(p, font=("Segoe UI", 10), width=80)
        self.entry_webhook.pack(fill=tk.X, pady=(0, 10), ipady=4)
        self.entry_webhook.insert(0, cur_hook)

        btn_box = tk.Frame(p)
        btn_box.pack(anchor=tk.W, pady=(0, 20))

        btn_save_hook = tk.Button(btn_box, text="💾 Lưu Cấu Hình Webhook", font=("Segoe UI", 9, "bold"), bg="#0284C7", fg="white", padx=12, pady=4, relief=tk.FLAT, command=self.on_save_webhook)
        btn_save_hook.pack(side=tk.LEFT, padx=(0, 10))

        btn_test_hook = tk.Button(btn_box, text="🔔 Bắn Thử Thông Báo Discord", font=("Segoe UI", 9, "bold"), bg="#10B981", fg="white", padx=12, pady=4, relief=tk.FLAT, command=self.on_test_webhook)
        btn_test_hook.pack(side=tk.LEFT)

        sep = ttk.Separator(p, orient=tk.HORIZONTAL)
        sep.pack(fill=tk.X, pady=20)

        lbl2 = ttk.Label(p, text="➕ Thêm mã cổ phiếu vào danh sách giám sát tự động 5 phút/lần:", font=("Segoe UI", 11, "bold"))
        lbl2.pack(anchor=tk.W, pady=(0, 8))

        bar_add = tk.Frame(p)
        bar_add.pack(anchor=tk.W, pady=(0, 10))

        self.entry_add_ticker = ttk.Entry(bar_add, font=("Segoe UI", 11, "bold"), width=15)
        self.entry_add_ticker.pack(side=tk.LEFT, ipady=3, padx=(0, 10))

        btn_add = tk.Button(bar_add, text="Thêm Mã Vào Giám Sát", font=("Segoe UI", 9, "bold"), bg="#334155", fg="white", padx=12, pady=4, relief=tk.FLAT, command=self.on_add_ticker)
        btn_add.pack(side=tk.LEFT)

    def on_save_webhook(self):
        new_hook = self.entry_webhook.get().strip()
        if new_hook:
            with open(DISCORD_CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump({"webhook_url": new_hook}, f, indent=2)
            messagebox.showinfo("Thành công", "Đã lưu Discord Webhook URL thành công!")
        else:
            messagebox.showwarning("Trống", "Vui lòng nhập Webhook URL.")

    def on_test_webhook(self):
        dummy_alert = {
            "ticker": "TEST",
            "company_name": "Kiểm Tra Kết Nối Stock Radar Pro",
            "exchange": "HOSE",
            "quarter": "Quý 3/2026",
            "release_date": datetime.datetime.now().strftime("%d/%m/%Y"),
            "title": "Thông báo kiểm tra kết nối Discord từ Stock Radar Pro",
            "source": "Stock_Radar_Pro_App",
            "bctc_type": "HOP_NHAT",
            "doc_url": "https://dulieudautu.com"
        }
        if send_discord_alert(dummy_alert):
            messagebox.showinfo("Thành công", "Đã bắn thông báo thử nghiệm thành công về Discord điện thoại!")
        else:
            messagebox.showerror("Thất bại", "Không thể gửi tin nhắn. Vui lòng kiểm tra lại đường link Webhook URL.")

    def on_add_ticker(self):
        tk_str = self.entry_add_ticker.get().strip().upper()
        if not tk_str:
            return
        if not os.path.exists(TICKERS_G1_FILE):
            return
        with open(TICKERS_G1_FILE, "r", encoding="utf-8") as f:
            items = json.load(f)
        tickers = [it['ticker'] for it in items]
        if tk_str in tickers:
            messagebox.showinfo("Đã có", f"Mã [{tk_str}] đã có sẵn trong danh sách theo dõi!")
            return
        info = get_company_info(tk_str)
        items.append({
            'stt': len(items) + 1,
            'ticker': tk_str,
            'name': info['name'],
            'san': info['san'],
            'batch_file': 'Manual_Added',
            'dot_ra': 'Ưu tiên',
            'uri': info['uri']
        })
        with open(TICKERS_G1_FILE, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
        messagebox.showinfo("Thành công", f"Đã thêm mã [{tk_str}] ({info['name']}) vào danh sách giám sát tự động 5 phút/lần!")
        self.entry_add_ticker.delete(0, tk.END)

if __name__ == '__main__':
    app = StockRadarGUI()
    app.mainloop()
