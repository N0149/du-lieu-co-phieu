import os
import sys
import json
import time
import datetime
import urllib.request
import urllib.parse
import http.cookiejar
import re
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

DATA_DIR = r"D:\hoc\lap trinh\du-lieu-co-phieu\data"
os.makedirs(DATA_DIR, exist_ok=True)

TICKERS_G1_FILE = os.path.join(DATA_DIR, "tickers_group1_115.json")
TICKERS_G2_FILE = os.path.join(DATA_DIR, "tickers_group2_69.json")
TICKERS_G3_FILE = os.path.join(DATA_DIR, "tickers_group3_94.json")
TICKERS_938_FILE = os.path.join(DATA_DIR, "all_938_market_tickers.json")
COMPLETED_CACHE_FILE = os.path.join(DATA_DIR, "bctc_completed_cache.json")
DISCORD_CONFIG_FILE = os.path.join(DATA_DIR, "discord_config.json")
COMPANY_WEBSITES_FILE = os.path.join(DATA_DIR, "company_websites.json")

import threading

# Giữ hệ thống luôn thức (Anti-Sleep) cho tiến trình chạy ngầm 24/7 (màn hình vẫn tắt bình thường)
try:
    import ctypes
    ES_CONTINUOUS = 0x80000000
    ES_SYSTEM_REQUIRED = 0x00000001
    ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)
except Exception:
    pass

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

SCAN_LOCK = threading.Lock()
AUTO_SCAN_ENABLED = True
AUTO_SCAN_INTERVAL = 600 # 10 phút mặc định (600s)
LAST_AUTO_SCAN_TIME = 0
NEXT_AUTO_SCAN_TIME = 0

def load_discord_config():
    if os.path.exists(DISCORD_CONFIG_FILE):
        try:
            with open(DISCORD_CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if not data.get("channel_id"):
                    data["channel_id"] = "1559224302669398108"
                return data
        except:
            pass
    return {
        "webhook_url": "",
        "bot_token": "",
        "channel_id": "1559224302669398108",
        "bot_enabled": True
    }

def get_discord_webhook():
    return load_discord_config().get("webhook_url")

def send_discord_bot_msg(channel_id, bot_token, text, embeds=None):
    if channel_id and bot_token:
        url = f"https://discord.com/api/v10/channels/{channel_id}/messages"
        payload = {"content": text}
        if embeds:
            payload["embeds"] = embeds
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Authorization': f'Bot {bot_token}',
                'Content-Type': 'application/json',
                'User-Agent': 'DiscordBot (https://dulieudautu.com, 1.0)'
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=8) as resp:
                return True
        except:
            pass

    # Fallback sang webhook nếu có
    webhook_url = get_discord_webhook()
    if webhook_url:
        payload = {"content": text}
        if embeds:
            payload["embeds"] = embeds
        try:
            req = urllib.request.Request(
                webhook_url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
            )
            urllib.request.urlopen(req, timeout=8)
            return True
        except:
            pass
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

import socket

BOT_LOCK_SOCKET = None

def acquire_bot_listener_lock(port=45889):
    global BOT_LOCK_SOCKET
    if BOT_LOCK_SOCKET is not None:
        return True
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.bind(('127.0.0.1', port))
        s.listen(1)
        BOT_LOCK_SOCKET = s
        return True
    except socket.error:
        return False

def try_claim_message(message_id):
    claim_file = os.path.join(DATA_DIR, "bot_claimed_msg_ids.json")
    try:
        claimed = []
        if os.path.exists(claim_file):
            with open(claim_file, "r", encoding="utf-8") as f:
                claimed = json.load(f)
        if message_id in claimed:
            return False
        claimed.append(message_id)
        if len(claimed) > 200:
            claimed = claimed[-100:]
        with open(claim_file, "w", encoding="utf-8") as f:
            json.dump(claimed, f)
        return True
    except:
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

def save_ignored_docs(ignored_set):
    try:
        with open(IGNORED_DOCS_FILE, "w", encoding="utf-8") as f:
            json.dump(list(ignored_set), f, ensure_ascii=False, indent=2)
    except:
        pass

def ignore_document_for_ticker(ticker):
    cache = load_completed_cache()
    doc_info = cache.get(ticker, {})
    doc_url = doc_info.get('doc_url', '')
    title = doc_info.get('title', '')
    
    ignored = load_ignored_docs()
    if doc_url:
        ignored.add(doc_url)
    if title:
        ignored.add(title)
    ignored.add(f"{ticker}:{doc_url}")
    save_ignored_docs(ignored)
    
    if ticker in cache:
        del cache[ticker]
        save_completed_cache(cache)
    return doc_url or title

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
        return True, "Quý 3/2026"
    return False, ""

def classify_bctc_type(title_text):
    if not title_text:
        return "DAY_DU"
    t_clean = strip_accents(title_text).lower()
    if 'hop nhat' in t_clean or 'hn' in t_clean:
        return "HOP_NHAT"
    if 'cong ty me' in t_clean or 'rieng' in t_clean:
        return "RIENG"
    return "DAY_DU"

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

def is_bctc_fully_completed(ticker, cache):
    if ticker not in cache:
        return False
    entry = cache[ticker]
    b_type = entry.get('bctc_type', '')
    return b_type in ['HOP_NHAT', 'DAY_DU']

def get_company_info(ticker):
    ticker = ticker.upper().strip()
    name = f"Công ty CP {ticker}"
    san = "HOSE"
    uri = ""
    for it in get_default_tickers():
        if it.get('ticker') == ticker:
            name = it.get('name', name)
            san = it.get('san', san)
            uri = it.get('uri', uri)
            break
    if not uri and os.path.exists(COMPANY_WEBSITES_FILE):
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
                    'doc_url': best_item['doc_url']
                }
            return {'has_q3': False, 'source': 'EzIR_FPTS', 'latest_doc': f"[{latest_date}] {latest_title}"}
    except Exception as e:
        return {'has_q3': False, 'source': 'EzIR_FPTS', 'latest_doc': str(e)}

def resolve_direct_pdf(url):
    """Nếu URL là trang web bài viết/thông báo, thử tìm link file đính kèm PDF/ZIP bên trong bài viết"""
    if not url:
        return url
    if any(url.lower().endswith(ext) for ext in ['.pdf', '.zip', '.rar', '.xlsx', '.docx']):
        return url
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=4) as resp:
            soup = BeautifulSoup(resp.read().decode('utf-8', errors='ignore'), 'html.parser')
            for a in soup.find_all('a', href=True):
                h = a['href']
                if any(h.lower().endswith(ext) for ext in ['.pdf', '.zip', '.rar', '.xlsx', '.docx']):
                    return urllib.parse.urljoin(url, h)
    except:
        pass
    return url

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
            combo = (t + " " + urllib.parse.unquote(h)).strip()
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
                    'is_hop_nhat': is_hop_nhat
                })
        if found_candidates:
            target = next((c for c in found_candidates if c['is_file'] and c['is_hop_nhat']), None)
            if not target:
                target = next((c for c in found_candidates if c['is_file']), None)
            if not target:
                target = found_candidates[0]
            b_type = 'HOP_NHAT' if target['is_hop_nhat'] else 'DAY_DU'
            title = target['text'] if len(target['text']) >= 6 else f"Báo cáo tài chính Quý 3/2026 ({ticker})"
            return {
                'has_q3': True,
                'bctc_type': b_type,
                'source': 'Company_Web',
                'title': title,
                'date': datetime.datetime.now().strftime("%d/%m/%Y"),
                'doc_url': resolve_direct_pdf(target['href'])
            }
        return None
    except:
        return None


class VietstockScanner:
    """Quét dữ liệu công bố thông tin & BCTC niêm yết từ sàn HOSE, HNX, UPCoM qua hệ thống Vietstock"""
    def __init__(self):
        self.cj = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cj))
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        self.token = None
        self.token_time = 0
        self.lock = threading.Lock()
        
    def _ensure_token(self):
        with self.lock:
            if self.token and (time.time() - self.token_time < 1800):
                return self.token
                
            url_page = "https://finance.vietstock.vn/PDV/tai-lieu.htm"
            try:
                req = urllib.request.Request(url_page, headers=self.headers)
                with self.opener.open(req, timeout=8) as resp:
                    html = resp.read().decode('utf-8', errors='ignore')
                soup = BeautifulSoup(html, 'html.parser')
                tag = soup.find('input', {'name': '__RequestVerificationToken'})
                if tag and tag.get('value'):
                    self.token = tag.get('value')
                    self.token_time = time.time()
                    return self.token
            except Exception as e:
                pass
            return None

    def check_vietstock(self, ticker):
        token = self._ensure_token()
        if not token:
            return {'has_q3': False, 'source': 'Vietstock', 'error': 'No token'}
            
        api_url = "https://finance.vietstock.vn/data/GetDocument"
        post_data = urllib.parse.urlencode({
            'code': str(ticker).upper(),
            'page': 1,
            'pageSize': 20,
            '__RequestVerificationToken': token
        }).encode('utf-8')
        
        api_headers = {
            'User-Agent': self.headers['User-Agent'],
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': f"https://finance.vietstock.vn/{str(ticker).upper()}/tai-lieu.htm",
            'Origin': 'https://finance.vietstock.vn'
        }
        
        try:
            req = urllib.request.Request(api_url, data=post_data, headers=api_headers)
            with self.opener.open(req, timeout=6) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                
            if not isinstance(data, list):
                return {'has_q3': False, 'source': 'Vietstock'}
                
            candidates = []
            for item in data:
                title = item.get('Title', '').strip()
                raw_url = item.get('Url', '').strip()
                doc_url = urllib.parse.quote(raw_url, safe=':/?&=%') if raw_url else ''
                
                # Check LastUpdate timestamp
                last_up = item.get('LastUpdate', '')
                date_str = ""
                m_ts = re.search(r'\d+', last_up)
                if m_ts:
                    ts = int(m_ts.group(0)) / 1000.0
                    dt = datetime.datetime.fromtimestamp(ts)
                    date_str = dt.strftime("%d/%m/%Y")
                    # Chỉ nhận BCTC công bố từ cuối tháng 9/2026 trở đi
                    if dt.year < 2026 or (dt.month < 9) or (dt.month == 9 and dt.day < 20):
                        continue
                        
                matched, snippet = is_q3_2026(title, ticker=ticker, doc_url=doc_url)
                if matched:
                    b_type = classify_bctc_type(title)
                    candidates.append({
                        'title': title,
                        'date': date_str or datetime.datetime.now().strftime("%d/%m/%Y"),
                        'doc_url': doc_url,
                        'bctc_type': b_type
                    })
                    
            if candidates:
                hop_nhat = next((c for c in candidates if c['bctc_type'] == 'HOP_NHAT'), None)
                best = hop_nhat or candidates[0]
                return {
                    'has_q3': True,
                    'bctc_type': best['bctc_type'],
                    'source': 'Vietstock',
                    'title': best['title'],
                    'date': best['date'],
                    'doc_url': best['doc_url']
                }
                
            return {'has_q3': False, 'source': 'Vietstock'}
        except Exception as e:
            return {'has_q3': False, 'source': 'Vietstock', 'error': str(e)}

VIETSTOCK_SCANNER = VietstockScanner()

def check_vietstock(ticker):
    return VIETSTOCK_SCANNER.check_vietstock(ticker)

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
            "footer": {"text": f"Nguồn: {source} • Stock Radar Pro"},
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

def get_current_scan_interval():
    now_vn = datetime.datetime.now()
    cur_min = now_vn.hour * 60 + now_vn.minute
    # Sau 15:30: 30 phút/lần (1800s)
    if cur_min >= 15 * 60 + 30:
        return 30 * 60
    # Trước 15:30: 10 phút/lần (600s)
    return 10 * 60

def send_silent_ping(remaining_count, elapsed_sec, new_count=0):
    """Gửi nhịp đập trạng thái của máy tính ở nhà (không chuông, không rung điện thoại)"""
    webhook_url = get_discord_webhook()
    if not webhook_url:
        return
    now_vn = datetime.datetime.now()
    cur_min = now_vn.hour * 60 + now_vn.minute
    interval_min = 30 if cur_min >= 15 * 60 + 30 else 10
    now_str = now_vn.strftime("%H:%M")
    if new_count > 0:
        content = f"🔥 `[{now_str}]` **Máy tính ở nhà:** Phát hiện **{new_count} BCTC MỚI**! Đã gửi thông báo chi tiết."
    else:
        content = f"🟢 `[{now_str}]` **Máy tính ở nhà hoạt động bình thường** • Đã quét **{remaining_count} mã** ({elapsed_sec}s, chu kỳ {interval_min}p) • Chưa có BCTC mới."
    payload = {
        "content": content,
        "flags": 4096 # SUPPRESS_NOTIFICATIONS
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

def get_default_tickers():
    selected = []
    seen = set()
    for fpath in [TICKERS_G1_FILE, TICKERS_G2_FILE, TICKERS_G3_FILE]:
        if os.path.exists(fpath):
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
                for it in data:
                    t = it['ticker']
                    if t not in seen:
                        seen.add(t)
                        selected.append(it)
    return selected

def execute_remote_scan(reply_func=None):
    if not SCAN_LOCK.acquire(blocking=False):
        if reply_func:
            reply_func("⏳ Hệ thống đang trong một lượt quét khác, vui lòng đợi vài giây...")
        return

    try:
        tickers_list = get_default_tickers()
        if not tickers_list:
            if reply_func:
                reply_func("⚠️ Không tìm thấy danh sách cổ phiếu trong thư mục data.")
            return

        completed_cache = load_completed_cache()
        to_scan = [it for it in tickers_list if not is_bctc_fully_completed(it['ticker'], completed_cache)]
        skipped_cnt = len(tickers_list) - len(to_scan)

        start_t = time.time()
        new_found_cnt = 0

        def sub_worker(item):
            t = item['ticker']
            uri = item.get('uri', '')
            if uri:
                r_w = check_company_website(t, uri)
                if r_w and r_w.get('has_q3'):
                    return t, item, r_w
            r_vts = check_vietstock(t)
            if r_vts and r_vts.get('has_q3'):
                return t, item, r_vts
            r = check_fpts_ezir(t)
            if r.get('has_q3'):
                return t, item, r
            return t, item, r

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(sub_worker, it) for it in to_scan]
            for fut in futures:
                try:
                    t, item, res = fut.result()
                    if res.get('has_q3'):
                        b_type = res.get('bctc_type', 'DAY_DU')
                        doc_url = res.get('doc_url', '')
                        date_str = res.get('date', datetime.datetime.now().strftime("%d/%m/%Y"))

                        old_cache = completed_cache.get(t)
                        old_type = old_cache.get('bctc_type') if old_cache else None
                        is_brand_new = (t not in completed_cache)
                        is_new_hop_nhat = (old_type == 'RIENG' and b_type == 'HOP_NHAT')

                        if is_brand_new or is_new_hop_nhat:
                            new_found_cnt += 1
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

        elapsed = round(time.time() - start_t, 1)
        if reply_func:
            reply_func(f"✅ **ĐÃ QUÉT XONG THEO LỆNH TỪ ĐIỆN THOẠI!**\n• Đã kiểm tra: `{len(to_scan)} mã` (Đã bỏ qua {skipped_cnt} mã hoàn tất)\n• Thời gian quét: `{elapsed}s`\n• Phát hiện mới: `{new_found_cnt} BCTC`.")
        else:
            # Gửi nhịp đập Silent Ping (không chuông) để người dùng mở Discord lúc nào cũng thấy máy tính đang hoạt động
            send_silent_ping(len(to_scan), elapsed, new_count=new_found_cnt)
    finally:
        SCAN_LOCK.release()

def auto_monitor_worker():
    global LAST_AUTO_SCAN_TIME, NEXT_AUTO_SCAN_TIME
    time.sleep(15)  # Chờ 15s sau khi bot khởi động
    while True:
        try:
            if AUTO_SCAN_ENABLED:
                interval_sec = get_current_scan_interval()
                NEXT_AUTO_SCAN_TIME = time.time() + interval_sec
                print(f"[AUTO-MONITOR] Bắt đầu lượt quét ngầm tự động (chu kỳ {interval_sec//60}p)...")
                execute_remote_scan(reply_func=None)
                LAST_AUTO_SCAN_TIME = time.time()
                print(f"[AUTO-MONITOR] Hoàn tất lượt quét lúc {datetime.datetime.now().strftime('%H:%M:%S')}. Lượt kế tiếp sau {interval_sec//60} phút.")
        except Exception as e:
            print("[AUTO-MONITOR Error]:", e)

        interval_sec = get_current_scan_interval()
        for _ in range(interval_sec):
            if not AUTO_SCAN_ENABLED:
                break
            time.sleep(1)
        if not AUTO_SCAN_ENABLED:
            time.sleep(5)

def execute_remote_check_ticker(ticker, reply_func):
    info = get_company_info(ticker)
    res = None
    if info.get('uri'):
        r_web = check_company_website(ticker, info['uri'])
        if r_web and r_web.get('has_q3'):
            res = r_web
    if not res:
        r_vts = check_vietstock(ticker)
        if r_vts and r_vts.get('has_q3'):
            res = r_vts
    if not res:
        r_ezir = check_fpts_ezir(ticker)
        if r_ezir.get('has_q3'):
            res = r_ezir

    if res and res.get('has_q3'):
        doc_url = res.get('doc_url', '')
        b_type = res.get('bctc_type', 'DAY_DU')
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
        send_discord_alert(alert_payload)
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
        reply_func(f"🔥 **ĐÃ CÓ BCTC QUÝ 3/2026 CHO [{ticker}]!**\nChi tiết báo cáo và link tải đã được gửi lên kênh.")
    else:
        reply_func(f"❄️ **[{ticker}] ({info['name']})** hiện **CHƯA CÓ** Báo cáo tài chính Quý 3/2026.")

def handle_command(content, username, reply_func):
    global AUTO_SCAN_ENABLED, AUTO_SCAN_INTERVAL
    cmd = strip_accents(content.strip().lower()).replace('đ', 'd').replace('Đ', 'd')

    # 1. Trạng thái: status, stt, tt, ping
    if cmd in ['status', '!status', '/status', 'stt', 'tt', 'ping', '!ping']:
        cache = load_completed_cache()
        total_comp = len(cache)
        hn_cnt = sum(1 for it in cache.values() if it.get('bctc_type') in ['HOP_NHAT', 'DAY_DU'])
        rieng_cnt = sum(1 for it in cache.values() if it.get('bctc_type') == 'RIENG')
        now_str = datetime.datetime.now().strftime("%H:%M:%S %d/%m/%Y")

        next_sec = max(0, int(NEXT_AUTO_SCAN_TIME - time.time())) if AUTO_SCAN_ENABLED and NEXT_AUTO_SCAN_TIME > 0 else 0
        next_m = next_sec // 60
        next_s = next_sec % 60
        cur_int = get_current_scan_interval()
        auto_info = f"🟢 Đang bật (tự quét mỗi {cur_int//60}p - lượt tới sau {next_m}m{next_s}s)" if AUTO_SCAN_ENABLED else "⚪ Đang tắt"

        msg = (
            f"🟢 **STOCK RADAR PRO - TRẠNG THÁI MÁY TÍNH Ở NHÀ**\n"
            f"• **Thời gian:** `{now_str}`\n"
            f"• **Tình trạng máy:** Đang trực tuyến & Giám sát 24/7\n"
            f"• **Tự động quét ngầm:** {auto_info}\n"
            f"• **Tổng số mã đã ra BCTC:** `{total_comp} mã` (🟢 {hn_cnt} Hợp nhất / 🟡 {rieng_cnt} Riêng)\n\n"
            f"👉 Nhắn `scan` để ép quét ngay lập tức.\n"
            f"👉 Nhắn `auto 5` hoặc `auto 10` để đổi chu kỳ tự quét.\n"
            f"👉 Nhắn mã cổ phiếu (ví dụ: `BMP`, `HPG`) để tra cứu riêng 1 mã."
        )
        reply_func(msg)

    # 1.1 Quản lý tự động quét ngầm: auto on, auto off, auto 5, auto 10
    elif cmd in ['auto on', 'bat auto', 'auto bat']:
        AUTO_SCAN_ENABLED = True
        reply_func(f"🟢 **ĐÃ BẬT TỰ ĐỘNG GIÁM SÁT NGẦM!**\n• Máy tính sẽ tự động quét danh mục mỗi `{AUTO_SCAN_INTERVAL//60} phút`.\n• Có BCTC mới sẽ lập tức phát cảnh báo lên Discord.")

    elif cmd in ['auto off', 'tat auto', 'auto tat']:
        AUTO_SCAN_ENABLED = False
        reply_func("⚪ **ĐÃ TẮT TỰ ĐỘNG GIÁM SÁT NGẦM!**\n• Bot sẽ chỉ quét khi bạn nhắn lệnh `scan` từ điện thoại.")

    elif cmd.startswith('auto ') and any(c.isdigit() for c in cmd):
        nums = re.findall(r'\d+', cmd)
        if nums:
            mins = max(1, min(120, int(nums[0])))
            AUTO_SCAN_INTERVAL = mins * 60
            AUTO_SCAN_ENABLED = True
            reply_func(f"⏱️ **ĐÃ ĐẶT CHU KỲ TỰ QUÉT LÀ `{mins} PHÚT/LẦN`!**\n• Chế độ tự động giám sát ngầm đang hoạt động.")

    # 2. Quét: scan, quet
    elif cmd in ['scan', '!scan', '/scan', 'quet', '!quet', '/quet']:
        reply_func(f"🚀 **[{username}]** đã ra lệnh quét từ xa qua điện thoại!\n👉 Máy tính ở nhà đang tiến hành quét các nhóm cổ phiếu...")
        execute_remote_scan(reply_func)

    # 3. Lệnh bỏ qua tài liệu & quét tiếp: bo qua <MÃ>, boqua <MÃ>, skip <MÃ>, ignore <MÃ>, xoa <MÃ>
    elif any(cmd.startswith(prefix) for prefix in ['bo qua', 'boqua', 'skip', 'ignore', 'xoa']):
        clean_content = content
        for pfx in ['bo qua', 'boqua', 'skip', 'ignore', 'xoa']:
            if cmd.startswith(pfx):
                clean_content = content[len(pfx):]
                break
        tickers = [t.upper() for t in re.findall(r'\b[A-Za-z]{3}\b', clean_content) if t.lower() not in ['all', 'yes', 'non']]
        if tickers:
            for t in tickers:
                ignore_document_for_ticker(t)
            t_str = ", ".join(tickers)
            reply_func(f"🗑️ **ĐÃ BỎ QUA TÀI LIỆU CỦA [{t_str}]!**\n• Đã xóa khỏi danh sách hoàn tất và đưa vào danh sách bỏ qua.\n🚀 Đang tự động quét tiếp các mã còn lại...")
            execute_remote_scan(reply_func)
        else:
            reply_func("⚠️ Vui lòng nhập mã cổ phiếu cần bỏ qua. Ví dụ: `bo qua ICN, SPB` hoặc `skip SGC`")

    # 4. Tra cứu mã: check <MÃ>, bctc <MÃ> hoặc gõ thẳng 3 chữ cái (VD: BMP, HPG)
    elif any(cmd.startswith(prefix) for prefix in ['check', '!check', '/check', 'bctc', '!bctc']):
        clean_content = content
        for pfx in ['check', '!check', '/check', 'bctc', '!bctc']:
            if cmd.startswith(pfx):
                clean_content = content[len(pfx):]
                break
        tickers = [t.upper() for t in re.findall(r'\b[A-Za-z]{3}\b', clean_content) if t.lower() not in ['all', 'yes', 'non']]
        if tickers:
            for t in tickers:
                reply_func(f"🔍 **[{username}]** yêu cầu kiểm tra BCTC Quý 3/2026 cho mã `{t}`. Đang tra cứu...")
                execute_remote_check_ticker(t, reply_func)
        else:
            reply_func("⚠️ Vui lòng nhập kèm mã cổ phiếu. Ví dụ: `check BMP, HPG` hoặc `BMP`")

    elif len(cmd) == 3 and cmd.isalpha() and cmd not in ['all', 'yes', 'non']:
        ticker = cmd.upper()
        reply_func(f"🔍 **[{username}]** yêu cầu kiểm tra BCTC Quý 3/2026 cho mã `{ticker}`. Đang tra cứu...")
        execute_remote_check_ticker(ticker, reply_func)

    # 4.1 Lệnh tắt máy từ xa
    elif cmd in ['tat may', 'tatmay', 'shutdown', '!shutdown']:
        reply_func(
            "🛑 **NHẬN LỆNH TẮT MÁY TỪ XA!**\n"
            "• Máy tính ở nhà sẽ tự động tắt nguồn sau 60 giây.\n"
            "• Hệ thống **Đám Mây (GitHub Actions)** sẽ tiếp tục giám sát độc lập đến 20:00 tối nay!"
        )
        os.system("shutdown /s /f /t 60 /c \"Tat may tu xa qua Discord\"")

    # 5. Trợ giúp & Danh sách lệnh
    elif cmd in ['help', '!help', '/help', 'huongdan', 'huong dan', 'lenh', 'cac lenh', 'danh sach lenh', 'ds lenh', 'menu', 'tro giup', '?']:
        msg = (
            f"📋 **DANH SÁCH LỆNH ĐIỀU KHIỂN TỪ ĐIỆN THOẠI:**\n"
            f"• `status` hoặc `stt`: Kiểm tra tình trạng máy tính, chu kỳ quét & số mã đã ra BCTC.\n"
            f"• `scan` hoặc `quet`: Ép máy tính quét toàn bộ danh mục ngay lập tức.\n"
            f"• `check <MÃ>` hoặc nhắn mã 3 chữ cái (VD: `NT2`, `BMP`, `HPG`): Tra cứu ngay BCTC của mã đó.\n"
            f"• `bo qua <MÃ>` (VD: `bo qua ICN, SPB`): Bỏ qua tài liệu nhận nhầm và tự động quét tiếp.\n"
            f"• `auto 5` hoặc `auto 10`: Đổi chu kỳ tự động quét ngầm (phút).\n"
            f"• `auto on` / `auto off`: Bật hoặc tắt tự động quét ngầm.\n"
            f"• `tat may` / `shutdown`: Tắt máy tính ở nhà từ xa.\n"
            f"• `lenh` / `help`: Xem lại danh sách hướng dẫn này."

        )
        reply_func(msg)

def main():
    if not acquire_bot_listener_lock():
        print("[INFO] Trợ lý ảo Discord đã đang chạy bởi một tiến trình khác trên máy tính. Dừng tiến trình này để tránh gửi tin lặp lại.")
        return

    cfg = load_discord_config()
    token = cfg.get("bot_token")
    channel_id = cfg.get("channel_id")
    if not token or not channel_id:
        print("Missing bot_token or channel_id in discord_config.json")
        return

    headers = {
        'Authorization': f'Bot {token}',
        'User-Agent': 'DiscordBot (https://dulieudautu.com, 1.0)'
    }

    processed_ids = set()
    # Nạp 15 tin gần nhất
    try:
        url = f'https://discord.com/api/v10/channels/{channel_id}/messages?limit=15'
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as resp:
            msgs = json.loads(resp.read().decode('utf-8'))
            now_utc = datetime.datetime.now(datetime.timezone.utc)
            if msgs and isinstance(msgs, list):
                for i, m in enumerate(msgs):
                    author = m.get('author', {})
                    # Nếu tin nhắn của user gửi trong vòng 15 phút gần nhất, không đánh dấu đã xử lý để vòng lặp xử lý ngay
                    if not author.get('bot'):
                        try:
                            ts_str = m.get('timestamp', '')[:19]
                            m_time = datetime.datetime.fromisoformat(ts_str).replace(tzinfo=datetime.timezone.utc)
                            if (now_utc - m_time).total_seconds() < 900:
                                continue
                        except:
                            pass
                    processed_ids.add(m['id'])
    except Exception as e:
        print("Init error:", e)

    # Khởi chạy luồng tự động quét ngầm định kỳ (24/7)
    auto_thread = threading.Thread(target=auto_monitor_worker, daemon=True)
    auto_thread.start()

    print(f"Discord Bot Service started for channel {channel_id}. Waiting for commands...")

    while True:
        try:
            time.sleep(2)
            fetch_url = f'https://discord.com/api/v10/channels/{channel_id}/messages?limit=5'
            req = urllib.request.Request(fetch_url, headers=headers)
            with urllib.request.urlopen(req, timeout=8) as resp:
                new_msgs = json.loads(resp.read().decode('utf-8'))
                if new_msgs and isinstance(new_msgs, list):
                    new_msgs.sort(key=lambda m: int(m['id']))
                    for msg in new_msgs:
                        mid = msg['id']
                        if mid in processed_ids:
                            continue
                        processed_ids.add(mid)

                        author = msg.get('author', {})
                        if author.get('bot'):
                            continue

                        # Deduplication chống trùng lặp đa tiến trình
                        if not try_claim_message(mid):
                            continue

                        content = msg.get('content', '').strip()
                        if content:
                            def make_reply(text, embeds=None):
                                send_discord_bot_msg(channel_id, token, text, embeds)
                            user_name = author.get('username', 'Bạn')
                            print(f"Received command '{content}' from {user_name}")
                            handle_command(content, user_name, make_reply)
        except Exception as e:
            time.sleep(3)

if __name__ == '__main__':
    main()
