"""
HỆ THỐNG GIÁM SÁT CÔNG BỐ THÔNG TIN BẤT THƯỜNG & GIAO DỊCH NỘI BỘ (CLOUD MONITOR)
- Quét các tài liệu / tin tức công bố bất thường của 280 mã cổ phiếu:
  + Giao dịch cổ phiếu của cổ đông nội bộ, người có liên quan, cổ đông lớn (mua/bán).
  + Nghị quyết HĐQT, Quyết định HĐQT, ĐHĐCĐ bất thường, lấy ý kiến cổ đông.
  + Công bố thông tin bất thường, sự kiện ảnh hưởng SXKD, doanh thu, lợi nhuận, hợp đồng lớn.
  + Thông báo chi trả cổ tức, thưởng cổ phiếu, ngày ĐKCC.
- Nguồn quét đa tầng:
  1. Vietstock API (GetDocument, GetNews, EventsTypeData)
  2. FPTS EzIR API
  3. Website Công ty (Trang quan hệ cổ đông / công bố thông tin)
- Vận hành trên GitHub Actions (18:00 hàng ngày mùa BCTC, hỗ trợ tăng tần suất sau này).
- Tự động lọc trùng qua cache: data/cbtt_completed_cache.json
- Gửi cảnh báo tức thì về Discord với Embed phân loại trực quan.
"""

import os
import sys
import json
import re
import time
import datetime
import urllib.request
import urllib.parse
import http.cookiejar
import threading
import unicodedata
import hashlib
import random
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except:
    pass

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPTS_DIR not in sys.path:
    sys.path.append(SCRIPTS_DIR)
from anti_block_protection import (
    get_browser_headers,
    FPTS_BREAKER,
    VIETSTOCK_BREAKER,
    FPTS_LIMITER,
    VIETSTOCK_LIMITER,
    safe_read_response
)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")
TICKERS_ALL_FILE = os.path.join(DATA_DIR, "tickers_all_278.json")
TICKERS_G1_FILE = os.path.join(DATA_DIR, "tickers_group1_115.json")
TICKERS_G2_FILE = os.path.join(DATA_DIR, "tickers_group2_69.json")
TICKERS_G3_FILE = os.path.join(DATA_DIR, "tickers_group3_94.json")
COMPANY_WEBSITES_FILE = os.path.join(DATA_DIR, "company_websites.json")
CBTT_CACHE_FILE = os.path.join(DATA_DIR, "cbtt_completed_cache.json")
CBTT_ALERTS_FILE = os.path.join(DATA_DIR, "cbtt_live_alerts.json")
DISCORD_CONFIG_FILE = os.path.join(DATA_DIR, "discord_config.json")

HEADERS = get_browser_headers()

def log(msg):
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        print(f"[{now_str}] {msg}")
    except:
        safe_msg = msg.encode('ascii', errors='replace').decode('ascii')
        print(f"[{now_str}] {safe_msg}")

def strip_accents(text):
    if not text:
        return ""
    res = ''.join(c for c in unicodedata.normalize('NFD', str(text)) if unicodedata.category(c) != 'Mn')
    return res.replace('đ', 'd').replace('Đ', 'D')

def load_discord_webhook():
    env_hook = os.environ.get("DISCORD_WEBHOOK_URL")
    if env_hook:
        return env_hook.strip()
    if os.path.exists(DISCORD_CONFIG_FILE):
        try:
            with open(DISCORD_CONFIG_FILE, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                return cfg.get("webhook_url", "").strip()
        except:
            pass
    return ""

def load_cbtt_cache():
    if os.path.exists(CBTT_CACHE_FILE):
        try:
            with open(CBTT_CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            pass
    return {}

def save_cbtt_cache(cache):
    try:
        with open(CBTT_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        log(f"Lỗi lưu cbtt_completed_cache: {e}")

def load_all_tickers():
    """Tải toàn bộ 280 mã cổ phiếu từ file tổng hợp hoặc gộp các nhóm 1, 2, 3"""
    if os.path.exists(TICKERS_ALL_FILE):
        try:
            with open(TICKERS_ALL_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    return data
        except:
            pass

    tickers = []
    seen = set()
    for fpath in [TICKERS_G1_FILE, TICKERS_G2_FILE, TICKERS_G3_FILE]:
        if os.path.exists(fpath):
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    batch = json.load(f)
                    for item in batch:
                        sym = item.get("ticker", "").upper().strip()
                        if sym and sym not in seen:
                            seen.add(sym)
                            tickers.append(item)
            except:
                pass
    return tickers

def classify_cbtt_item(title, doc_url=""):
    """
    Phân loại tài liệu / tin tức công bố bất thường:
    Trả về: (is_relevant, category, category_label, color, icon)
    """
    if not title:
        return False, "", "", 0, ""
    raw = (title + " " + (doc_url or "")).lower()
    clean = strip_accents(raw)

    # Loại trừ BCTC định kỳ thông thường (đã có hệ thống riêng xử lý)
    is_pure_bctc = any(k in clean for k in ['bao cao tai chinh', 'bctc quy', 'bctc nam', 'bctc ban nien', 'financial statement'])
    if is_pure_bctc and not any(k in clean for k in ['nq', 'nghi quyet', 'giai trinh', 'noi bo', 'bat thuong', 'uoc dat', 'dam va', 'su co']):
        return False, "", "", 0, ""

    # Loại trừ thông tin tài liệu đại hội cổ đông thường niên cũ
    if 'tai lieu hop dhdcd thuong nien' in clean and '2026' not in clean:
        return False, "", "", 0, ""

    # 1. Bán cổ phiếu nội bộ / Thoái vốn
    if any(k in clean for k in ['dang ky ban', 'ban co phieu', 'ban cp', 'thoai von', 'giam ty le so huu', 'giam so huu', 'da ban']) or ('ket qua giao dich' in clean and 'ban' in clean):
        return True, 'INSIDER_SELL', 'CỔ ĐÔNG NỘI BỘ BÁN RA', 0xEF4444, '🔴'

    # 2. Mua cổ phiếu nội bộ / Tăng sở hữu
    if any(k in clean for k in ['dang ky mua', 'mua co phieu', 'mua cp', 'tang ty le so huu', 'tang so huu', 'da mua']) or ('ket qua giao dich' in clean and 'mua' in clean):
        return True, 'INSIDER_BUY', 'CỔ ĐÔNG NỘI BỘ MUA VÀO', 0x10B981, '🟢'

    # 3. Giao dịch người nội bộ / Cổ đông lớn chung
    if any(k in clean for k in ['nguoi noi bo', 'co dong noi bo', 'nguoi co lien quan', 'co dong lon', 'giao dich co phieu', 'giao dich cp', 'thay doi so huu', 'to chuc co lien quan']):
        return True, 'INSIDER_TRADE', 'GIAO DỊCH CỔ ĐÔNG / NỘI BỘ', 0x3B82F6, '👥'

    # 4. Nghị quyết HĐQT / Quyết định HĐQT
    if any(k in clean for k in ['nghi quyet hdqt', 'quyet dinh hdqt', 'nghi quyet hoi dong quan tri', 'quyet dinh hoi dong quan tri', 'nq hdqt', 'hdqt thong qua', 'hdqt phe duyet', 'nghi quyet so']):
        return True, 'RESOLUTION_HDQT', 'NGHỊ QUYẾT HĐQT', 0x8B5CF6, '📜'

    # 5. ĐHĐCĐ bất thường / Lấy ý kiến cổ đông
    if any(k in clean for k in ['dhdcd bat thuong', 'dai hoi dong co dong bat thuong', 'lay y kien co dong', 'bien ban kiem phieu', 'y kien bang van ban']):
        return True, 'EGM_EXTRAORDINARY', 'ĐHĐCĐ BẤT THƯỜNG / LẤY Ý KIẾN', 0xF59E0B, '🏛️'

    # 6. Cổ tức & Sự kiện quyền
    if any(k in clean for k in ['tra co tuc', 'tam ung co tuc', 'chot danh sach co dong', 'ngay dkcc', 'ngay dang ky cuoi cung', 'thuong co phieu', 'phat hanh co phieu', 'quyen mua', 'tang von dieu le']):
        return True, 'DIVIDEND_RIGHTS', 'CỔ TỨC & QUYỀN DOANH NGHIỆP', 0xEAB308, '💰'

    # 7. Công bố thông tin bất thường / Biến động tổ chức
    if any(k in clean for k in ['bat thuong', 'cbtt bat thuong', 'su kien', 'tam ngung', 'chay no', 'xu phat', 'thay doi dang ky kinh doanh', 'giay chung nhan dang ky doanh nghiep', 'bo nhiem', 'mien nhiem', 'tong giam doc', 'chu tich hdqt', 'chu tich']):
        return True, 'EXTRAORDINARY_EVENT', 'CÔNG BỐ BẤT THƯỜNG', 0xEC4899, '⚠️'

    # 8. Tin SXKD, doanh thu, lợi nhuận, trúng thầu, sự kiện lớn
    if any(k in clean for k in ['san xuat kinh doanh', 'sxkd', 'ket qua kinh doanh', 'uoc dat', 'san luong', 'trung thau', 'hop dong lon', 'khoi cong', 'khanh thanh', 'dam va', 'bat giu', 'gop von thanh lap']):
        return True, 'BUSINESS_NEWS', 'TÌNH HÌNH SẢN XUẤT KINH DOANH', 0x06B6D4, '📈'

    return False, '', '', 0, ''

def is_recent_timestamp(dt, lookback_days=3):
    """Kiểm tra thời điểm có nằm trong khoảng lookback_days (mặc định 3 ngày) trở lại đây hay không"""
    if not dt:
        return False
    now = datetime.datetime.now()
    diff_sec = (now - dt).total_seconds()
    # Chấp nhận chênh lệch tối đa lookback_days + 12h đệm (để bao trọn cuối tuần)
    return -86400 <= diff_sec <= (lookback_days * 86400 + 43200)

def is_recent_date_str(date_str, lookback_days=3):
    """Kiểm tra chuỗi ngày tháng có nằm trong lookback_days hay không"""
    if not date_str:
        return False
    # Check dd/mm/yyyy
    m1 = re.search(r'(\d{1,2})/(\d{1,2})/(20\d\d)', date_str)
    if m1:
        d, m, y = int(m1.group(1)), int(m1.group(2)), int(m1.group(3))
        try:
            dt = datetime.datetime(y, m, d)
            return is_recent_timestamp(dt, lookback_days)
        except:
            return False
    # Check yyyy-mm-dd
    m2 = re.search(r'(20\d\d)-(\d{1,2})-(\d{1,2})', date_str)
    if m2:
        y, m, d = int(m2.group(1)), int(m2.group(2)), int(m2.group(3))
        try:
            dt = datetime.datetime(y, m, d)
            return is_recent_timestamp(dt, lookback_days)
        except:
            return False
    # Check YYYYMMDD
    m3 = re.search(r'(20\d\d)(0[1-9]|1[0-2])([0-3]\d)', date_str)
    if m3:
        y, m, d = int(m3.group(1)), int(m3.group(2)), int(m3.group(3))
        try:
            dt = datetime.datetime(y, m, d)
            return is_recent_timestamp(dt, lookback_days)
        except:
            return False
    return False


class VietstockDisclosureScanner:
    """Quét tài liệu công bố thông tin, tin tức doanh nghiệp và sự kiện quyền từ Vietstock"""
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
            url_page = "https://finance.vietstock.vn/HPG/tai-lieu.htm"
            try:
                headers = get_browser_headers(referer="https://finance.vietstock.vn", is_api=False)
                req = urllib.request.Request(url_page, headers=headers)
                with self.opener.open(req, timeout=8) as resp:
                    raw_bytes = safe_read_response(resp)
                    html = raw_bytes.decode('utf-8', errors='ignore')
                soup = BeautifulSoup(html, 'html.parser')
                tag = soup.find('input', {'name': '__RequestVerificationToken'})
                if tag and tag.get('value'):
                    self.token = tag.get('value')
                    self.token_time = time.time()
                    return self.token
            except Exception as e:
                pass
            return None

    def scan_ticker(self, ticker, lookback_days=3):
        if not VIETSTOCK_BREAKER.can_request():
            return []

        token = self._ensure_token()
        if not token:
            return []

        VIETSTOCK_LIMITER.wait()
        ticker = str(ticker).upper().strip()
        found_items = []
        api_headers = get_browser_headers(
            referer=f"https://finance.vietstock.vn/{ticker}/tai-lieu.htm",
            is_api=True,
            custom_headers={
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': 'https://finance.vietstock.vn'
            }
        )

        # 1. Quét GetDocument (Nghị quyết, CBTT bất thường, Báo cáo giao dịch cổ phiếu)
        try:
            doc_url = "https://finance.vietstock.vn/data/GetDocument"
            post_data = urllib.parse.urlencode({
                'code': ticker,
                'page': 1,
                'pageSize': 15,
                '__RequestVerificationToken': token
            }).encode('utf-8')
            req = urllib.request.Request(doc_url, data=post_data, headers=api_headers)
            with self.opener.open(req, timeout=8) as resp:
                docs = json.loads(resp.read().decode('utf-8'))
            if isinstance(docs, list):
                for item in docs:
                    title = item.get('Title', '').strip()
                    raw_url = item.get('Url', '').strip()
                    last_up = item.get('LastUpdate', '')
                    m_ts = re.search(r'\d+', last_up)
                    date_obj = None
                    date_str = ""
                    if m_ts:
                        ts = int(m_ts.group(0)) / 1000.0
                        date_obj = datetime.datetime.fromtimestamp(ts)
                        date_str = date_obj.strftime("%d/%m/%Y %H:%M")

                    if not is_recent_timestamp(date_obj, lookback_days):
                        continue

                    matched, cat, label, col, icon = classify_cbtt_item(title, raw_url)
                    if matched:
                        found_items.append({
                            'ticker': ticker,
                            'title': title,
                            'url': raw_url,
                            'date': date_str,
                            'source': 'Vietstock_Document',
                            'category': cat,
                            'category_label': label,
                            'color': col,
                            'icon': icon,
                            'unique_id': f"vts_doc_{hashlib.md5((title + raw_url).encode('utf-8')).hexdigest()[:12]}"
                        })
        except:
            pass

        # 2. Quét GetNews (Tin tức doanh nghiệp, mua bán cổ phiếu lãnh đạo, biến động SXKD)
        try:
            news_url = "https://finance.vietstock.vn/data/GetNews"
            post_news = urllib.parse.urlencode({
                'code': ticker,
                'type': 1,
                'page': 1,
                'pageSize': 10,
                '__RequestVerificationToken': token
            }).encode('utf-8')
            req_news = urllib.request.Request(news_url, data=post_news, headers=api_headers)
            with self.opener.open(req_news, timeout=8) as resp:
                news_list = json.loads(resp.read().decode('utf-8'))
            if isinstance(news_list, list):
                for item in news_list:
                    title = item.get('Title', '').strip()
                    art_id = item.get('ArticleID', '')
                    raw_url = item.get('URL', '')
                    full_url = f"https://vietstock.vn{raw_url}" if raw_url.startswith('/') else raw_url
                    pub_time = item.get('PublishTime', '')
                    m_ts = re.search(r'\d+', pub_time)
                    date_obj = None
                    date_str = ""
                    if m_ts:
                        ts = int(m_ts.group(0)) / 1000.0
                        date_obj = datetime.datetime.fromtimestamp(ts)
                        date_str = date_obj.strftime("%d/%m/%Y %H:%M")

                    if not is_recent_timestamp(date_obj, lookback_days):
                        continue

                    matched, cat, label, col, icon = classify_cbtt_item(title, full_url)
                    if matched:
                        found_items.append({
                            'ticker': ticker,
                            'title': title,
                            'url': full_url,
                            'date': date_str,
                            'source': 'Vietstock_News',
                            'category': cat,
                            'category_label': label,
                            'color': col,
                            'icon': icon,
                            'unique_id': f"vts_news_{art_id}" if art_id else f"vts_news_{hashlib.md5(title.encode('utf-8')).hexdigest()[:12]}"
                        })
        except:
            pass

        # 3. Quét EventsTypeData (Sự kiện quyền, cổ tức, chốt danh sách)
        try:
            event_url = "https://finance.vietstock.vn/data/EventsTypeData"
            post_event = urllib.parse.urlencode({
                'eventTypeID': 0,
                'channelID': 0,
                'code': ticker,
                'catID': -1,
                'page': 1,
                'pageSize': 5,
                'orderBy': 'Date1',
                'orderDir': 'DESC',
                '__RequestVerificationToken': token
            }).encode('utf-8')
            req_event = urllib.request.Request(event_url, data=post_event, headers=api_headers)
            with self.opener.open(req_event, timeout=8) as resp:
                events = json.loads(resp.read().decode('utf-8'))
            if isinstance(events, list):
                for ev in events:
                    title = ev.get('Title', '').strip() or ev.get('Note', '').strip()
                    ev_id = ev.get('EventID', '')
                    file_url = ev.get('FileUrl', '').strip()
                    gdk_hq = ev.get('DateOrder', '') or ev.get('GDKHQDate', '')
                    m_ts = re.search(r'\d+', gdk_hq)
                    date_obj = None
                    date_str = ""
                    if m_ts:
                        ts = int(m_ts.group(0)) / 1000.0
                        date_obj = datetime.datetime.fromtimestamp(ts)
                        date_str = date_obj.strftime("%d/%m/%Y")

                    # Sự kiện quyền: chấp nhận nếu ngày sự kiện trong vòng 7 ngày tới hoặc 3 ngày qua
                    if date_obj:
                        diff_sec = (datetime.datetime.now() - date_obj).total_seconds()
                        if diff_sec > lookback_days * 86400 or diff_sec < -14 * 86400:
                            continue

                    matched, cat, label, col, icon = classify_cbtt_item(title, file_url)
                    if not matched:
                        cat, label, col, icon = 'DIVIDEND_RIGHTS', 'CỔ TỨC & QUYỀN DOANH NGHIỆP', 0xEAB308, '💰'
                        matched = True

                    found_items.append({
                        'ticker': ticker,
                        'title': title,
                        'url': file_url,
                        'date': date_str,
                        'source': 'Vietstock_Event',
                        'category': cat,
                        'category_label': label,
                        'color': col,
                        'icon': icon,
                        'unique_id': f"vts_ev_{ev_id}" if ev_id else f"vts_ev_{hashlib.md5(title.encode('utf-8')).hexdigest()[:12]}"
                    })
        except:
            pass

        return found_items


def scan_fpts_ezir(ticker, lookback_days=3):
    """Quét tin tức doanh nghiệp & công bố thông tin từ FPTS EzIR"""
    if not FPTS_BREAKER.can_request():
        return []
    FPTS_LIMITER.wait()

    url = f"https://gateway.fpts.com.vn/news/api/gateway/v1/mobile/list?code={ticker}&pageSize=10&selectedPage=1"
    found_items = []
    try:
        headers = get_browser_headers(referer=f"https://ezir.fpts.com.vn/TinTuc/TinTucDN?code={ticker}", is_api=True)
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as resp:
            raw_bytes = safe_read_response(resp)
            data = json.loads(raw_bytes.decode('utf-8', errors='ignore'))
            FPTS_BREAKER.record_success()

            items = data.get('Data', {}).get('Table1', [])
            for it in items:
                title = it.get('Title', '').strip()
                date_pub = it.get('DatePub', '').strip()
                raw_url = it.get('URL', '')
                doc_url = raw_url.replace('\\', '/').strip() if raw_url else f"https://ezir.fpts.com.vn/TinTuc/TinTucDN?code={ticker}"

                if not is_recent_date_str(date_pub, lookback_days):
                    continue

                matched, cat, label, col, icon = classify_cbtt_item(title, doc_url)
                if matched:
                    found_items.append({
                        'ticker': ticker,
                        'title': title,
                        'url': doc_url,
                        'date': date_pub,
                        'source': 'EzIR_FPTS',
                        'category': cat,
                        'category_label': label,
                        'color': col,
                        'icon': icon,
                        'unique_id': f"ezir_{hashlib.md5((title + date_pub).encode('utf-8')).hexdigest()[:12]}"
                    })
    except Exception as e:
        FPTS_BREAKER.record_failure(str(e))
    return found_items


def scan_company_website(ticker, uri, lookback_days=3):
    """Quét trực tiếp trang web quan hệ cổ đông của công ty để tìm công bố thông tin bất thường mới nhất"""
    if not uri or 'ezir.fpts.com.vn' in uri.lower():
        return []

    found_items = []
    try:
        clean_uri = uri
        if clean_uri.startswith('https://lixco.com'):
            clean_uri = clean_uri.replace('https://', 'http://')

        headers = get_browser_headers(referer=clean_uri, is_api=False)
        req = urllib.request.Request(clean_uri, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as resp:
            raw_bytes = safe_read_response(resp)
            html = raw_bytes.decode('utf-8', errors='ignore')

        soup = BeautifulSoup(html, 'html.parser')
        for a in soup.find_all('a', href=True):
            h = a['href']
            t = a.get_text(strip=True)
            h_full = urllib.parse.urljoin(clean_uri, h)
            p_text = a.parent.get_text(separator=' ', strip=True) if a.parent else ''
            if len(p_text) > 300:
                p_text = ''
            combo = (p_text + " " + t + " " + urllib.parse.unquote(h)).strip()

            # Trích xuất ngày từ combo text hoặc URL
            m_date = re.search(r'(?<!\d)(\d{1,2}/\d{1,2}/\d{2,4})(?!\d)', combo) or re.search(r'(?<!\d)(20\d\d-\d{1,2}-\d{1,2})(?!\d)', combo) or re.search(r'(?<!\d)(20\d{6})(?!\d)', combo)
            date_str = m_date.group(1) if m_date else ''

            # BẮT BUỘC có ngày gần đây trên web công ty để tránh bắt nhầm link lịch sử cũ
            if not date_str or not is_recent_date_str(date_str, lookback_days):
                continue

            matched, cat, label, col, icon = classify_cbtt_item(combo, h_full)
            if matched:
                cand_title = t if len(t) >= 10 else p_text[:120]
                cand_title = re.sub(r'(\.pdf|pdf|\(\d{1,2}/\d{1,2}/\d{2,4}\))', '', cand_title, flags=re.I).strip()
                if len(cand_title) < 6:
                    cand_title = f"Công bố thông tin bất thường ({ticker})"

                found_items.append({
                    'ticker': ticker,
                    'title': cand_title,
                    'url': h_full,
                    'date': date_str,
                    'source': 'Company_Web',
                    'category': cat,
                    'category_label': label,
                    'color': col,
                    'icon': icon,
                    'unique_id': f"web_{hashlib.md5((ticker + cand_title + date_str).encode('utf-8')).hexdigest()[:12]}"
                })
    except:
        pass
    return found_items


def send_discord_raw_message(content, flags=0):
    """Gửi tin nhắn văn bản thông báo hoặc nhịp đập trạng thái lên Discord"""
    webhook_url = load_discord_webhook()
    if not webhook_url:
        return False
    payload = {"content": content}
    if flags:
        payload["flags"] = flags
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

def send_discord_alert(item):
    """Gửi cảnh báo tài liệu / tin tức công bố bất thường lên Discord qua Webhook kèm @everyone"""
    webhook_url = load_discord_webhook()
    if not webhook_url:
        return False

    ticker = item.get('ticker', '')
    company_name = item.get('company_name', f'Cổ phiếu {ticker}')
    exchange = item.get('exchange', 'HOSE')
    category_label = item.get('category_label', 'CÔNG BỐ BẤT THƯỜNG')
    color = item.get('color', 0x3B82F6)
    icon = item.get('icon', '📢')
    title = item.get('title', '')
    date_str = item.get('date', datetime.datetime.now().strftime("%d/%m/%Y"))
    source = item.get('source', 'Vietstock')
    doc_url = item.get('url', '')

    fields = [
        {"name": "🏢 Doanh nghiệp", "value": f"**{company_name}** (`{exchange}`)", "inline": True},
        {"name": "📂 Phân loại", "value": f"`{icon} {category_label}`", "inline": True},
        {"name": "📅 Ngày công bố", "value": f"`{date_str}`", "inline": True},
    ]
    if doc_url:
        fields.append({
            "name": "🔗 Link xem / Tải tài liệu gốc",
            "value": f"[Bấm vào đây để xem chi tiết]({doc_url})",
            "inline": False
        })

    content_msg = f"{icon} **CÔNG BỐ THÔNG TIN BẤT THƯỜNG: `{ticker}` - {category_label}!** @everyone"
    payload = {
        "content": content_msg,
        "embeds": [{
            "title": f"🚀 [{ticker}] {title[:240]}",
            "url": doc_url or "https://vietstock.vn",
            "color": color,
            "fields": fields,
            "footer": {"text": f"Nguồn: {source} • Radar Công bố Bất thường (Cloud)"},
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
    except Exception as e:
        log(f"Lỗi gửi Discord webhook cho [{ticker}]: {e}")
        return False


def run_full_scan(lookback_days=3, single_symbol=None, limit=None, dry_run=False):
    """Thực thi quét toàn diện công bố thông tin bất thường cho danh mục cổ phiếu"""
    start_time = time.time()
    log(f"🚀 Bắt đầu quét Công Bố Bất Thường & Giao Dịch Nội Bộ (Lookback: {lookback_days} ngày)...")

    all_tickers = load_all_tickers()
    if single_symbol:
        sym_clean = single_symbol.upper().strip()
        matched = [t for t in all_tickers if t.get('ticker') == sym_clean]
        if matched:
            all_tickers = matched
        else:
            all_tickers = [{'ticker': sym_clean, 'name': f'Công ty CP {sym_clean}', 'san': 'HOSE', 'uri': ''}]
    elif limit and limit > 0:
        all_tickers = all_tickers[:limit]

    total_count = len(all_tickers)
    log(f"📋 Danh mục quét: {total_count} mã cổ phiếu.")

    cache = load_cbtt_cache()
    log(f"💾 Số lượng tin đã lưu trong bộ nhớ cache: {len(cache)} tin.")

    vts_scanner = VietstockDisclosureScanner()
    token = vts_scanner._ensure_token()
    if token:
        log("🔑 Đã kết nối thành công Vietstock Data Gateway.")
    else:
        log("⚠️ Không thể lấy token Vietstock, quét qua EzIR & Web.")

    new_discoveries = []
    lock = threading.Lock()

    def process_ticker(item):
        ticker = item.get('ticker', '').upper().strip()
        name = item.get('name', f'CTCP {ticker}')
        san = item.get('san', 'HOSE')
        uri = item.get('uri', '')

        time.sleep(random.uniform(0.1, 0.35)) # Jitter ngẫu nhiên giữa các luồng

        ticker_items = []

        # 1. Quét Vietstock
        v_items = vts_scanner.scan_ticker(ticker, lookback_days)
        ticker_items.extend(v_items)

        # 2. Quét FPTS EzIR
        e_items = scan_fpts_ezir(ticker, lookback_days)
        ticker_items.extend(e_items)

        # 3. Quét Company Website
        if uri:
            w_items = scan_company_website(ticker, uri, lookback_days)
            ticker_items.extend(w_items)

        # Lọc trùng lặp ngay trong lượt quét của mã
        unique_for_ticker = []
        seen_keys = set()
        for it in ticker_items:
            k = it.get('unique_id') or f"{it['ticker']}:{it.get('url')}"
            if k not in seen_keys and k not in cache:
                seen_keys.add(k)
                it['company_name'] = name
                it['exchange'] = san
                unique_for_ticker.append(it)

        if unique_for_ticker:
            with lock:
                new_discoveries.extend(unique_for_ticker)

    # Sử dụng ThreadPoolExecutor 4 workers kết hợp Jitter để chống nghẽn và chống bị khóa IP
    workers = min(3, total_count) if total_count > 0 else 1
    with ThreadPoolExecutor(max_workers=workers) as executor:
        list(executor.map(process_ticker, all_tickers))

    elapsed = time.time() - start_time
    log(f"⏱️ Quét hoàn tất {total_count} mã sau {elapsed:.1f} giây.")

    if new_discoveries:
        log(f"🔥 Phát hiện {len(new_discoveries)} CÔNG BỐ THÔNG TIN / GIAO DỊCH MỚI!")
        sent_count = 0
        for disc in new_discoveries:
            key = disc.get('unique_id') or f"{disc['ticker']}:{disc.get('url')}"
            log(f"  -> [{disc['ticker']}] {disc['category_label']}: {disc['title'][:70]} ({disc.get('date')})")

            if not dry_run:
                ok = send_discord_alert(disc)
                if ok:
                    sent_count += 1
                    time.sleep(0.5) # Tránh rate limit của Discord webhook
            else:
                sent_count += 1

            # Cập nhật cache
            cache[key] = {
                'ticker': disc['ticker'],
                'category': disc['category'],
                'category_label': disc['category_label'],
                'title': disc['title'],
                'date': disc.get('date'),
                'url': disc.get('url'),
                'source': disc.get('source'),
                'alerted_at': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }

        if not dry_run:
            save_cbtt_cache(cache)
            # Lưu lịch sử cảnh báo gần nhất
            try:
                with open(CBTT_ALERTS_FILE, "w", encoding="utf-8") as f_al:
                    json.dump(new_discoveries, f_al, ensure_ascii=False, indent=2)
            except:
                pass
            log(f"✅ Đã gửi {sent_count} thông báo lên Discord và cập nhật cache thành công.")
            summary_msg = f"🔔 **[Cloud Radar 18:00]** Đã hoàn tất quét {total_count} doanh nghiệp • Phát hiện **{sent_count} công bố bất thường & giao dịch mới** hôm nay!"
            send_discord_raw_message(summary_msg)
        else:
            log(f"🔍 Chế độ Dry-Run: Đã tìm thấy {sent_count} tin mới, không gửi Discord.")
    else:
        log("🟢 Không có công bố thông tin bất thường nào mới trong khoảng thời gian này.")
        if not dry_run and not single_symbol:
            now_vn_str = datetime.datetime.now().strftime("%H:%M")
            silent_msg = f"🟢 `[{now_vn_str}]` **Cloud Radar Công bố Bất thường:** Đã rà soát {total_count} doanh nghiệp • Chưa có công bố thông tin bất thường nào mới."
            send_discord_raw_message(silent_msg, flags=4096)

    return len(new_discoveries)


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Radar Giám sát Công bố Bất thường & Giao dịch Nội bộ trên Cloud")
    parser.add_argument("--symbol", type=str, help="Quét riêng 1 mã cổ phiếu (VD: --symbol=HPG)")
    parser.add_argument("--limit", type=int, help="Giới hạn số mã quét (VD: --limit=10)")
    parser.add_argument("--days", type=int, default=3, help="Số ngày nhìn lại (mặc định: 3 ngày)")
    parser.add_argument("--dry-run", action="store_true", help="Chỉ kiểm tra, không gửi cảnh báo Discord")
    args = parser.parse_args()

    run_full_scan(
        lookback_days=args.days,
        single_symbol=args.symbol,
        limit=args.limit,
        dry_run=args.dry_run
    )

if __name__ == '__main__':
    main()
