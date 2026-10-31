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
import subprocess
import ssl
import http.cookiejar
import threading
import random
try:
    import pymupdf
except ImportError:
    pymupdf = None

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

def enable_windows_keep_awake():
    """Ngăn Windows rơi vào chế độ Sleep khi đang chạy giám sát trên máy tính cá nhân"""
    if os.name == 'nt':
        try:
            import ctypes
            # ES_CONTINUOUS (0x80000000) | ES_SYSTEM_REQUIRED (0x00000001)
            # Giữ hệ thống luôn thức, cho phép màn hình tự tắt để tiết kiệm điện
            ctypes.windll.kernel32.SetThreadExecutionState(0x80000001)
            log("🔋 Đã kích hoạt Windows Keep-Awake: Ngăn máy tính tự ngủ (Sleep) khi bạn đi làm.")
        except Exception as e:
            log(f"Không thể kích hoạt Keep-Awake: {e}")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TICKERS_G1_FILE = os.path.join(BASE_DIR, "data", "tickers_group1_115.json")
TICKERS_G2_FILE = os.path.join(BASE_DIR, "data", "tickers_group2_69.json")
TICKERS_G3_FILE = os.path.join(BASE_DIR, "data", "tickers_group3_94.json")
TICKERS_FILE = TICKERS_G1_FILE # Tương thích ngược
COMPLETED_CACHE_FILE = os.path.join(BASE_DIR, "data", "bctc_completed_cache.json")
ALERTS_FILE = os.path.join(BASE_DIR, "data", "bctc_q3_live_alerts.json")
DISCORD_CONFIG_FILE = os.path.join(BASE_DIR, "data", "discord_config.json")
STATUS_FILE = os.path.join(BASE_DIR, "data", "bctc_cloud_status.json")
DATA_DIR = os.path.join(BASE_DIR, "data")
IGNORED_DOCS_FILE = os.path.join(DATA_DIR, "ignored_docs.json")

def load_all_target_tickers():
    """Tải và kết hợp toàn bộ danh mục Nhóm 1 (115 mã) + Nhóm 2 (69 mã)"""
    tickers = []
    seen = set()
    for fpath in [TICKERS_G1_FILE, TICKERS_G2_FILE, TICKERS_G3_FILE]:
        if os.path.exists(fpath):
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for it in data:
                        t = it.get('ticker')
                        if t and t not in seen:
                            seen.add(t)
                            tickers.append(it)
            except Exception as e:
                log(f"Lỗi đọc file {fpath}: {e}")
    return tickers

HEADERS = get_browser_headers()

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
    Kiểm tra ngày công bố:
    - Bắt buộc từ cuối tháng 9/2026 trở đi (mùa BCTC Q3/2026)
    - Loại bỏ triệt để các năm cũ (2015 - 2025)
    - Nếu là năm 2026, chỉ nhận tháng 9 (từ ngày 20), tháng 10, 11, 12.
    """
    if not date_pub:
        return True
    dp = str(date_pub).strip()
    
    # 1. Reject explicit 4-digit past years (2015-2025)
    if re.search(r'(?<!\d)(?:201[5-9]|202[0-5])(?!\d)', dp):
        return False

    # 2. Reject 2-digit past years in dates: e.g. 26/10/22 or 26-10-22
    if re.search(r'(?<!\d)\d{1,2}[/-]\d{1,2}[/-](?:1[5-9]|2[0-5])(?!\d)', dp):
        return False
        
    # 3. YYYYMMDD format (e.g. 20221026, 20260728, 20261020)
    m_ymd = re.search(r'(?<!\d)(20\d\d)(0[1-9]|1[0-2])([0-3]\d)(?!\d)', dp)
    if m_ymd:
        yr = int(m_ymd.group(1))
        mo = int(m_ymd.group(2))
        da = int(m_ymd.group(3))
        if yr < 2026:
            return False
        if yr == 2026:
            if mo in [10, 11, 12]:
                return True
            if mo == 9 and da >= 20:
                return True
            return False

    # 4. dd/mm/yyyy or dd/mm/yy
    m = re.search(r'(?<!\d)(\d{1,2})/(\d{1,2})/(2026|26)(?!\d)', dp)
    if m:
        day = int(m.group(1))
        month = int(m.group(2))
        if month in [10, 11, 12]:
            return True
        if month == 9 and day >= 20:
            return True
        return False

    # 5. yyyy-mm-dd
    m2 = re.search(r'(?<!\d)2026-(\d{1,2})-(\d{1,2})(?!\d)', dp)
    if m2:
        month = int(m2.group(1))
        day = int(m2.group(2))
        if month in [10, 11, 12]:
            return True
        if month == 9 and day >= 20:
            return True
        return False

    # 6. dd-mm-yyyy
    m3 = re.search(r'(?<!\d)(\d{1,2})-(\d{1,2})-(2026|26)(?!\d)', dp)
    if m3:
        day = int(m3.group(1))
        month = int(m3.group(2))
        if month in [10, 11, 12]:
            return True
        if month == 9 and day >= 20:
            return True
        return False

    if '10/2026' in dp or '10/26' in dp or '11/2026' in dp or '12/2026' in dp:
        return True

    for mo in range(1, 9):
        if f'/{mo:02d}/2026' in dp or f'/{mo:02d}/26' in dp or f'/{mo}/2026' in dp or f'-{mo:02d}-2026' in dp:
            return False

    return True

def is_q3_2026(text, ticker="", doc_url="", date_pub=""):
    """
    Nhận diện tài liệu BCTC Quý 3/2026 (hoặc Quý mới cho các mã niên độ đặc thù như CAP, IDV)
    theo tiêu chí 'Lọc nhầm còn hơn bỏ sót'.
    """
    if not text:
        return False, ""
    raw = (text + " " + (doc_url or "")).lower()
    clean = strip_accents(raw)
    
    excluded = ['ke hoach', 'co dong lon', 'danh sach co dong', 'thu moi hop', 'bien ban kiem phieu', 'lay y kien']
    if any(k in clean for k in excluded):
        return False, ""
        
    has_2026 = bool(re.search(r'(?<!\d)(?:2026|\x2726)(?!\d)', clean)) or ('2025-2026' in clean) or ('/2026/' in clean) or ('_2026' in clean) or ('10/2026' in str(date_pub)) or ('11/2026' in str(date_pub)) or ('12/2026' in str(date_pub))
    has_old = bool(re.search(r'(?:quy\s*[1-4]|q[1-4]|quarter\s*[1-4])[_\s\-/]*(?:201[5-9]|202[0-5])(?!\d)', clean))
    if has_old and not has_2026:
        return False, ""
        
    has_bctc = any(k in clean for k in ['tai chinh', 'bctc', 'financial', 'fs', 'giai trinh', 'kqkd', 'kinh doanh'])
    if not has_bctc:
        return False, ""
        
    is_special_fiscal = (str(ticker).upper() in ['CAP', 'IDV'])
    if is_special_fiscal:
        # Với CAP, IDV: BCTC Quý 3 ra vào tháng 7 là kỳ CŨ, TUYỆT ĐỐI KHÔNG nhận Quý 3!
        has_q3 = bool(re.search(r'(?:(?<![a-zA-Z0-9])|^)(?:quy\s*3|q3|quy\s*iii|quarter\s*3|q\.3|q_3)(?![a-zA-Z0-9])', clean))
        if has_q3:
            return False, ""
        has_q4 = bool(re.search(r'(?:(?<![a-zA-Z0-9])|^)(?:quy\s*4|q4|quy\s*iv|quarter\s*4|q\.4|q_4)(?![a-zA-Z0-9])', clean))
        has_annual = any(k in clean for k in ['bctc nam', 'tai chinh nam', 'kiem toan nam', 'ca nam'])
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
    # 1. Cầu dao bảo vệ IP (Circuit Breaker)
    if not FPTS_BREAKER.can_request():
        return {
            'has_q3': False,
            'source': 'EzIR_FPTS',
            'circuit_breaker': True,
            'latest_doc': f"Tạm ngắt FPTS bảo vệ IP ({FPTS_BREAKER.get_status_str()})",
            'latest_title': '',
            'latest_date': '',
            'latest_url': f"https://ezir.fpts.com.vn/TinTuc/TinTucDN?code={ticker}"
        }

    # 2. Rate Limiting & Jitter
    FPTS_LIMITER.wait()

    url = f"https://gateway.fpts.com.vn/news/api/gateway/v1/mobile/list?folder=86&code={ticker}&pageSize=10&selectedPage=1&newsType=2"
    headers = get_browser_headers(referer=f"https://ezir.fpts.com.vn/TinTuc/TinTucDN?code={ticker}", is_api=True)
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=6) as resp:
            raw_bytes = safe_read_response(resp)
            data = json.loads(raw_bytes.decode('utf-8', errors='ignore'))
            FPTS_BREAKER.record_success()

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
        FPTS_BREAKER.record_failure(str(e))
        return {
            'has_q3': False,
            'source': 'EzIR_FPTS',
            'error': str(e),
            'latest_doc': f"Lỗi ({e})",
            'latest_title': '',
            'latest_date': '',
            'latest_url': f"https://ezir.fpts.com.vn/TinTuc/TinTucDN?code={ticker}"
        }

def resolve_direct_pdf(url):
    """Nếu URL là trang web bài viết/thông báo, thử tìm link file đính kèm PDF/ZIP bên trong bài viết"""
    if not url:
        return url
    if any(url.lower().endswith(ext) for ext in ['.pdf', '.zip', '.rar', '.xlsx', '.docx']):
        return url
    try:
        headers = get_browser_headers(referer=url, is_api=False)
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=4) as resp:
            raw_bytes = safe_read_response(resp)
            soup = BeautifulSoup(raw_bytes.decode('utf-8', errors='ignore'), 'html.parser')
            for a in soup.find_all('a', href=True):
                h = a['href']
                if any(h.lower().endswith(ext) for ext in ['.pdf', '.zip', '.rar', '.xlsx', '.docx']):
                    return urllib.parse.urljoin(url, h)
    except:
        pass
    return url

def check_ghc_api(clean_uri):
    """
    Adapter chuyên biệt cho CTCP Thủy điện Gia Lai (GHC) vì website ghc.vn là Single Page Application (AngularJS),
    dữ liệu BCTC được render qua API ngầm thay vì nhúng trực tiếp trong HTML tĩnh.
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Content-Type': 'application/json;charset=UTF-8',
            'Referer': clean_uri
        }
        url_years = 'https://ghc.vn/api/QuanHeCoDong/LayDanhSachBenPhaiAsync'
        req_years = urllib.request.Request(url_years, data=json.dumps({'DanhMuc': 'QHCD_00030'}).encode('utf-8'), headers=headers)
        with urllib.request.urlopen(req_years, timeout=6) as r:
            res_y = json.loads(r.read().decode('utf-8'))
            data_y = res_y.get('Result', {}).get('Data')
            if isinstance(data_y, str):
                data_y = json.loads(data_y)

        target_cat = 'QHCD_00160' # Mặc định 2026
        if isinstance(data_y, list) and len(data_y) > 0:
            for item in data_y:
                if '2026' in str(item.get('TenDanhMuc', '')):
                    target_cat = item.get('MaDanhMuc')
                    break

        api_url = 'https://ghc.vn/api/QuanHeCoDong/LayDanhSachTinAsync'
        payload = {'DanhMuc': target_cat, 'DanhMucCha': 'QHCD_00030', 'PageIndex': 1}
        req = urllib.request.Request(api_url, data=json.dumps(payload).encode('utf-8'), headers=headers)
        with urllib.request.urlopen(req, timeout=6) as r:
            res = json.loads(r.read().decode('utf-8'))
            data = res.get('Result', {}).get('Data')
            if isinstance(data, str):
                data = json.loads(data)

        items = data.get('Items', []) if isinstance(data, dict) else []
        candidates = []
        for it in items:
            t = it.get('TieuDe', '').strip()
            d = it.get('NgayDangText', '').strip() or it.get('NgayDang', '').strip()
            raw_f = it.get('LinkFileDinhKem', '').strip()
            doc_url = urllib.parse.urljoin('https://ghc.vn', urllib.parse.quote(raw_f, safe=':/?&=%')) if raw_f else ''

            matched, snippet = is_q3_2026(t, ticker='GHC', doc_url=doc_url, date_pub=d)
            if matched:
                b_type = classify_bctc_type(t)
                candidates.append({
                    'title': t,
                    'date': d or datetime.datetime.now().strftime("%d/%m/%Y"),
                    'doc_url': doc_url,
                    'bctc_type': b_type
                })
        if candidates:
            hop_nhat = next((c for c in candidates if c['bctc_type'] == 'HOP_NHAT'), None)
            best = hop_nhat or candidates[0]
            return {
                'has_q3': True,
                'bctc_type': best['bctc_type'],
                'source': 'Company_Web',
                'title': best['title'],
                'date': best['date'],
                'doc_url': best['doc_url']
            }
    except:
        pass
    return None

def check_company_website(ticker, uri, max_depth=1):
    if not uri or 'ezir.fpts.com.vn' in uri.lower():
        return None
    clean_uri = uri
    if 'ghc.vn' in clean_uri.lower():
        r_ghc = check_ghc_api(clean_uri)
        if r_ghc and r_ghc.get('has_q3'):
            return r_ghc
    try:
        if clean_uri.startswith('https://lixco.com'):
            clean_uri = clean_uri.replace('https://', 'http://')
            
        headers = get_browser_headers(referer=clean_uri, is_api=False)
        req = urllib.request.Request(clean_uri, headers=headers)
        with urllib.request.urlopen(req, timeout=6) as resp:
            raw_bytes = safe_read_response(resp)
            html = raw_bytes.decode('utf-8', errors='ignore')
            
        soup = BeautifulSoup(html, 'html.parser')
        ignored = set()
        ignored_file = os.path.join(DATA_DIR, "ignored_docs.json")
        if os.path.exists(ignored_file):
            try:
                with open(ignored_file, "r", encoding="utf-8") as f_ig:
                    ignored = set(json.load(f_ig))
            except:
                pass

        found_candidates = []
        for a in soup.find_all('a', href=True):
            h = a['href']
            t = a.get_text(strip=True)
            h_full = urllib.parse.urljoin(clean_uri, h)
            p_text = a.parent.get_text(separator=' ', strip=True) if a.parent else ''
            if len(p_text) > 300:
                p_text = ''
            if h_full in ignored or h in ignored or (t and t in ignored and len(t) > 5) or (p_text and p_text in ignored) or f"{ticker}:{h_full}" in ignored:
                continue
            unquote_h = urllib.parse.unquote(h)
            combo = (p_text + " " + t + " " + unquote_h).strip()
            
            m_date = re.search(r'(?<!\d)(\d{1,2}/\d{1,2}/\d{2,4})(?!\d)', combo) or re.search(r'(?<!\d)(20\d\d-\d{1,2}-\d{1,2})(?!\d)', combo) or re.search(r'(?<!\d)(20\d{6})(?!\d)', combo)
            date_str = m_date.group(1) if m_date else ''
            if date_str and not is_valid_recent_bctc_date(date_str):
                continue
            
            matched, snippet = is_q3_2026(combo, ticker=ticker, doc_url=h, date_pub=date_str)
            if matched:
                is_file = any(h.lower().endswith(ext) for ext in ['.pdf', '.zip', '.rar', '.xlsx', '.docx'])
                is_hop_nhat = any(k in combo.lower() for k in ['hợp nhất', 'hop nhat'])
                cand_title = t
                clean_t = strip_accents(t.lower())
                if len(t) < 6 or any(clean_t.startswith(p) for p in ['xem', 'tai', 'download', 'chi tiet', 'link', 'doc', 'pdf', '.pdf']):
                    if p_text and len(p_text) >= 10:
                        cand_title = re.sub(r'(\.pdf|pdf|\(\d{1,2}/\d{1,2}/\d{2,4}\)|\b\d{1,2}/\d{1,2}/\d{2,4}\b|tải xuống|tai xuong)', '', p_text, flags=re.I).strip()
                if len(cand_title) < 6:
                    cand_title = f"Báo cáo tài chính Quý 3/2026 ({ticker})" if ticker not in ['CAP', 'IDV'] else f"Báo cáo tài chính Quý 4/2026 ({ticker})"

                found_candidates.append({
                    'text': cand_title,
                    'href': h_full,
                    'is_file': is_file,
                    'is_hop_nhat': is_hop_nhat,
                    'date': date_str or datetime.datetime.now().strftime("%d/%m/%Y")
                })
                
        if found_candidates:
            found_candidates.sort(key=lambda x: (x['is_file'], x['is_hop_nhat']), reverse=True)
            best = found_candidates[0]
            b_type = 'HOP_NHAT' if best['is_hop_nhat'] else 'DAY_DU'
            return {
                'has_q3': True,
                'bctc_type': b_type,
                'source': 'Company_Web',
                'title': best['text'],
                'date': best['date'],
                'doc_url': resolve_direct_pdf(best['href'])
            }
            
        for tag in soup.find_all(['tr', 'li', 'p']):
            block_text = tag.get_text(separator=' ', strip=True)
            if len(block_text) < 250:
                m_date = re.search(r'(?<!\d)(\d{1,2}/\d{1,2}/\d{2,4})(?!\d)', block_text) or re.search(r'(?<!\d)(20\d\d-\d{1,2}-\d{1,2})(?!\d)', block_text)
                date_str = m_date.group(1) if m_date else ''
                if date_str and not is_valid_recent_bctc_date(date_str):
                    continue
                matched, snippet = is_q3_2026(block_text, ticker=ticker, date_pub=date_str)
                if matched:
                    a_tag = tag.find('a', href=True)
                    doc_url = urllib.parse.urljoin(clean_uri, a_tag['href']) if a_tag else clean_uri
                    if doc_url in ignored or block_text in ignored or f"{ticker}:{doc_url}" in ignored:
                        continue
                    final_title = snippet or (f"Báo cáo tài chính Quý 3/2026 ({ticker})" if ticker not in ['CAP', 'IDV'] else f"Báo cáo tài chính Quý 4/2026 ({ticker})")
                    return {
                        'has_q3': True,
                        'bctc_type': classify_bctc_type(final_title),
                        'source': 'Company_Web',
                        'title': final_title,
                        'date': date_str or datetime.datetime.now().strftime("%d/%m/%Y"),
                        'doc_url': resolve_direct_pdf(doc_url)
                    }

        # Nếu chưa tìm thấy trên trang chính và max_depth > 0: Quét các link chuyên mục BCTC nội bộ
        if max_depth > 0:
            clean_domain = urllib.parse.urlparse(clean_uri).netloc
            for a in soup.find_all('a', href=True):
                h = a['href'].strip()
                t = a.get_text(strip=True).lower()
                clean_t = strip_accents(t)
                h_lower = h.lower()
                if any(k in clean_t or k in h_lower for k in ['bao cao tai chinh', 'bctc', 'financial statement']):
                    if not any(h_lower.endswith(ext) for ext in ['.pdf', '.zip', '.rar', '.xlsx', '.doc', '.docx']):
                        sub_url = urllib.parse.urljoin(clean_uri, h)
                        if urllib.parse.urlparse(sub_url).netloc == clean_domain and sub_url != clean_uri:
                            sub_res = check_company_website(ticker, sub_url, max_depth=0)
                            if sub_res and sub_res.get('has_q3'):
                                return sub_res

        return {'has_q3': False, 'source': 'Company_Web'}
    except Exception as e:
        return {'has_q3': False, 'source': 'Company_Web', 'error': str(e)}


class VietstockScanner:
    """Quét dữ liệu công bố thông tin & BCTC niêm yết từ sàn HOSE, HNX, UPCoM qua hệ thống Vietstock"""
    def __init__(self):
        self.cj = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cj))
        self.token = None
        self.token_time = 0
        self.lock = threading.Lock()
        
    def _ensure_token(self):
        with self.lock:
            if self.token and (time.time() - self.token_time < 1800):
                return self.token
                
            url_page = "https://finance.vietstock.vn/PDV/tai-lieu.htm"
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

    def check_vietstock(self, ticker):
        # 1. Cầu dao bảo vệ IP
        if not VIETSTOCK_BREAKER.can_request():
            return {'has_q3': False, 'source': 'Vietstock', 'error': f"Vietstock tạm nghỉ ({VIETSTOCK_BREAKER.get_status_str()})"}

        token = self._ensure_token()
        if not token:
            return {'has_q3': False, 'source': 'Vietstock', 'error': 'No token'}
            
        # 2. Rate Limiting & Jitter
        VIETSTOCK_LIMITER.wait()

        api_url = "https://finance.vietstock.vn/data/GetDocument"
        post_data = urllib.parse.urlencode({
            'code': str(ticker).upper(),
            'page': 1,
            'pageSize': 20,
            '__RequestVerificationToken': token
        }).encode('utf-8')
        
        api_headers = get_browser_headers(
            referer=f"https://finance.vietstock.vn/{str(ticker).upper()}/tai-lieu.htm",
            is_api=True,
            custom_headers={
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': 'https://finance.vietstock.vn'
            }
        )
        
        try:
            req = urllib.request.Request(api_url, data=post_data, headers=api_headers)
            with self.opener.open(req, timeout=6) as resp:
                raw_bytes = safe_read_response(resp)
                data = json.loads(raw_bytes.decode('utf-8', errors='ignore'))
            
            # Thành công: Báo Circuit Breaker
            VIETSTOCK_BREAKER.record_success()
                
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
            VIETSTOCK_BREAKER.record_failure(str(e))
            return {'has_q3': False, 'source': 'Vietstock', 'error': str(e)}

VIETSTOCK_SCANNER = VietstockScanner()

def check_vietstock(ticker):
    return VIETSTOCK_SCANNER.check_vietstock(ticker)

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
            
    time.sleep(random.uniform(0.1, 0.35)) # Jitter ngẫu nhiên giữa các luồng
            
    # 2. Quét Vietstock trước tiên (hạ tầng CDN chịu tải cao, đủ 3 sàn)
    # Nếu Vietstock đã có thì TUYỆT ĐỐI KHÔNG gọi FPTS -> Tiết kiệm 80% request tới FPTS!
    res_vts = check_vietstock(ticker)
    if res_vts and res_vts.get('has_q3'):
        res_vts['elapsed'] = round(time.time() - start_t, 2)
        return ticker, item, res_vts

    # 3. Quét Web riêng công ty
    res_web = check_company_website(ticker, uri)
    if res_web and res_web.get('has_q3'):
        res_web['elapsed'] = round(time.time() - start_t, 2)
        return ticker, item, res_web

    # 4. Chỉ khi 2 nguồn trên chưa có thì mới gọi FPTS EzIR làm cứu cánh cuối cùng
    res_ezir = check_fpts_ezir(ticker)
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
            "content": f"☀️ **[08:00] BẮT ĐẦU PHIÊN GIÁM SÁT BCTC NGÀY {date_str}**",
            "embeds": [{
                "title": "🟢 Hệ thống Giám sát đang hoạt động tự động",
                "description": f"Hệ thống tự động quét **{len(load_all_target_tickers())} mã cổ phiếu (Nhóm 1 + Nhóm 2 + Nhóm 3)**:\n• Tần suất quét ngầm: **5 phút/lần** (Phát hiện BCTC tức thì)\n• Báo nhịp đập Discord: **10 phút/lần** (Báo bình thường, chống spam)\n• Cảnh báo BCTC mới: **Ngay lập tức** kèm bóc tách LNST & % YoY\n{details}",
                "color": 0x3B82F6,
                "footer": {"text": "BCTC Live Monitor • dulieudautu.com"},
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }]
        }
    elif event_type == 'afternoon':
        payload = {
            "content": f"🏁 **[20:00] KẾT THÚC PHIÊN GIÁM SÁT NGÀY {date_str}**",
            "embeds": [{
                "title": "☕ Chốt phiên hôm nay",
                "description": f"{details}\nHệ thống tự động nghỉ ngơi và sẽ bắt đầu quét lại vào **08:00 sáng mai**.",
                "color": 0x64748B,
                "footer": {"text": "BCTC Live Monitor • dulieudautu.com"},
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }]
        }
    elif event_type == 'test_start':
        desc = details if isinstance(details, str) else details.get('desc', '')
        payload = {
            "content": f"🧪 **BẮT ĐẦU CHẠY THỬ NGHIỆM GIÁM SÁT BCTC NGÀY {date_str}**",
            "embeds": [{
                "title": "🟢 Kích hoạt Thử Nghiệm Kiểm Tra Nhịp Đập & Chu Kỳ",
                "description": f"Hệ thống đang chạy thử nghiệm theo yêu cầu:\n• Tần suất quét ngầm: **5 phút/lần** (Bắt BCTC tức thì)\n• Báo nhịp đập Discord: **10 phút/lần** (Báo bình thường, chống spam)\n• Cảnh báo BCTC mới: **Ngay lập tức** kèm LNST & % YoY\n{desc}",
                "color": 0x3B82F6,
                "footer": {"text": "BCTC Live Monitor • dulieudautu.com"},
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }]
        }
    elif event_type == 'test_end':
        desc = details if isinstance(details, str) else details.get('desc', '')
        payload = {
            "content": f"🏁 **HOÀN TẤT PHIÊN CHẠY THỬ NGHIỆM NGÀY {date_str}**",
            "embeds": [{
                "title": "✅ Thử Nghiệm Thành Công",
                "description": f"{desc}\nHệ thống đã hoàn tất và dừng an toàn. Sẵn sàng cho tuần mới!",
                "color": 0x10B981,
                "footer": {"text": "BCTC Live Monitor • dulieudautu.com"},
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

def send_silent_ping(scan_index, remaining_count, elapsed_sec, new_count=0, session_tag="", interval_min=5):
    """Gửi nhịp đập ở chế độ SILENT (không chuông, không rung điện thoại)"""
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
    tag_str = f" • [{session_tag}]" if session_tag else ""
    
    if new_count > 0:
        content = f"🔥 **[{time_str}] Lượt #{scan_index}{tag_str}:** Phát hiện **{new_count} BCTC MỚI**! Đã gửi thông báo chi tiết."
    else:
        content = f"🟢 `[{time_str}]` **Hệ thống hoạt động bình thường**{tag_str} • Đã quét **{remaining_count} mã** ({elapsed_sec}s, chu kỳ {interval_min}p) • Chưa có BCTC mới."
        
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
    """Thực hiện một lượt quét Toàn bộ 3 Nhóm (Nhóm 1 + 2 + 3)"""
    tickers_list = load_all_target_tickers()
    if not tickers_list:
        log("LỖI: Không tìm thấy danh sách cổ phiếu trong thư mục data")
        return 0, 0, 0
        
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
        log(f"🎉 Toàn bộ {len(tickers_list)} mã (Nhóm 1 + 2 + 3) đều đã có BCTC đầy đủ!")
        return 0, 0, 0
        
    start_all = time.time()
    results = {}
    new_found_count = 0
    
    with ThreadPoolExecutor(max_workers=3) as executor:
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
        if os.environ.get("GITHUB_ACTIONS") != "true":
            try:
                subprocess.run('git add data/bctc_completed_cache.json data/bctc_q3_live_alerts.json data/bctc_cloud_status.json && git commit -m "chore(bctc): auto sync local completed cache [skip ci]" && git push origin main', shell=True, capture_output=True)
                log("🚀 Đã tự động đồng bộ cache mới lên GitHub repository.")
            except:
                pass
        
    return new_found_count, len(to_scan), total_elapsed

def main():
    log("=== KHỞI ĐỘNG HỆ THỐNG GIÁM SÁT TOÀN DIỆN 3 NHÓM (280 MÃ) BCTC (5 PHÚT/LẦN) ===")
    
    is_loop = ('--loop' in sys.argv)
    force_run = ('--force' in sys.argv)
    is_cloud = (os.environ.get("GITHUB_ACTIONS") == "true")

    start_arg = None
    until_arg = None
    for i, arg in enumerate(sys.argv):
        if arg.startswith('--start='):
            start_arg = arg.split('=')[1]
        elif arg == '--start' and i + 1 < len(sys.argv):
            start_arg = sys.argv[i + 1]
        elif arg.startswith('--until='):
            until_arg = arg.split('=')[1]
        elif arg == '--until' and i + 1 < len(sys.argv):
            until_arg = sys.argv[i + 1]

    if until_arg:
        force_run = True
    
    if not is_cloud:
        enable_windows_keep_awake()
    
    now_vn = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7)))
    today_str = now_vn.strftime("%Y-%m-%d")
    time_min = now_vn.hour * 60 + now_vn.minute
    weekday = now_vn.weekday() # 0 = Thứ 2, 4 = Thứ 6, 5 = Thứ 7, 6 = Chủ Nhật

    # Xử lý tham số chờ bắt đầu phiên thử nghiệm (--start HH:MM)
    if start_arg:
        try:
            sh, sm = map(int, start_arg.split(':'))
            start_min = sh * 60 + sm
            if time_min < start_min:
                wait_sec = (start_min - time_min) * 60 - now_vn.second
                log(f"⏰ Bạn vừa bật phiên thử nghiệm lúc {now_vn.strftime('%H:%M:%S')}. Đang chờ đến {start_arg} để bắt đầu...")
                log(f"⏳ Tự động đếm ngược: còn {wait_sec // 60} phút {wait_sec % 60} giây...")
                time.sleep(max(1, wait_sec))
                now_vn = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7)))
                time_min = now_vn.hour * 60 + now_vn.minute
        except Exception as e:
            log(f"Lỗi phân tích cú pháp --start: {e}")

    # Kiểm tra ngày & giờ giao dịch (bỏ qua nếu dùng cờ --force hoặc --until)
    if not force_run:
        if weekday >= 5:
            log("📅 Hôm nay là cuối tuần (thị trường chứng khoán nghỉ). Dừng quét (dùng --force nếu muốn chạy thử).")
            return

        if time_min < 8 * 60:
            if is_cloud:
                if time_min < 7 * 60 + 50:
                    log("⏰ Chưa đến giờ bắt đầu phiên sáng (trước 07:55). Thoát an toàn.")
                    return
            else:
                # Trên máy tính cá nhân ở nhà: Chờ đếm ngược đến 08:00 sáng
                wait_sec = (8 * 60 - time_min) * 60 - now_vn.second
                log(f"⏰ Bạn vừa bật máy lúc {now_vn.strftime('%H:%M:%S')}. Đang chờ đến 08:00 sáng để mở phiên...")
                log(f"⏳ Tự động đếm ngược: còn {wait_sec // 60} phút {wait_sec % 60} giây...")
                time.sleep(max(1, wait_sec))
                now_vn = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7)))
                time_min = now_vn.hour * 60 + now_vn.minute
        elif time_min >= 20 * 60:
            log("🏁 Đã kết thúc toàn bộ phiên giám sát hôm nay (sau 20:00). Nghỉ ngơi.")
            return

    # Nếu chạy loop worker trên Cloud, kiểm tra xem đã có worker nào đang hoạt động chưa
    if is_cloud and is_loop and check_another_instance_running():
        return

    # Xác định ca làm việc:
    # Trên Cloud: tách ca để tránh vượt quá 6 giờ giới hạn của GitHub runner
    # Trên Local: chạy liên tục toàn ngày từ 08:00 đến 20:00 (hoặc theo khung giờ thử nghiệm --until)
    if until_arg:
        try:
            eh, em = map(int, until_arg.split(':'))
            target_end_min = eh * 60 + em
            session_name = f"Phiên Thử Nghiệm ({start_arg or now_vn.strftime('%H:%M')} - {until_arg})"
            is_morning = False
        except Exception as e:
            log(f"Lỗi phân tích cú pháp --until: {e}")
            target_end_min = 20 * 60
            session_name = "Phiên Giám sát (Local)"
            is_morning = False
    elif is_cloud:
        if time_min < 12 * 60 + 55:
            session_name = "Ca Sáng & Trưa (08:00 - 13:00)"
            target_end_min = 12 * 60 + 55
            is_morning = True
        else:
            session_name = "Ca Chiều & Tối (13:00 - 20:00)"
            target_end_min = 20 * 60
            is_morning = False
    else:
        session_name = "Giám sát Toàn ngày (08:00 - 20:00)"
        target_end_min = 20 * 60
        is_morning = True
        
    status = load_status()
    
    if until_arg:
        send_heartbeat('test_start', f"• Khung giờ thử nghiệm: **{start_arg or now_vn.strftime('%H:%M')} - {until_arg}**")
    elif is_morning and status.get('last_morning_greeting') != today_str:
        send_heartbeat('morning', "Bắt đầu phiên sáng, quét 5 phút/lần (Trưa 10 phút/lần).")
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
    last_silent_ping_ts = 0
    
    while True:
        scan_index += 1
        now_vn = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7)))
        cur_min = now_vn.hour * 60 + now_vn.minute
        
        # Xác định chế độ quét (Trong giờ: 5p, Trưa: 10p, Sau 15:30: 30p)
        if cur_min >= 15 * 60 + 30:
            session_tag = "Tối"
            sleep_sec = 1800 # 30 phút/lần sau 15:30
            interval_min = 30
        elif 11 * 60 + 30 <= cur_min < 13 * 60:
            session_tag = "Trưa"
            sleep_sec = 600 # 10 phút/lần giờ trưa
            interval_min = 10
        elif cur_min < 12 * 60:
            session_tag = "Sáng"
            sleep_sec = 300 # 5 phút/lần ca sáng
            interval_min = 5
        else:
            session_tag = "Chiều"
            sleep_sec = 300 # 5 phút/lần ca chiều
            interval_min = 5

        try:
            new_cnt, rem_cnt, elapsed = execute_single_scan(scan_index=scan_index)
            now_ts = time.time()
            min_ping_interval = 540 if sleep_sec <= 600 else (sleep_sec - 60)
            if new_cnt > 0 or (now_ts - last_silent_ping_ts >= min_ping_interval):
                send_silent_ping(scan_index, rem_cnt, elapsed, new_count=new_cnt, session_tag=session_tag, interval_min=interval_min)
                last_silent_ping_ts = now_ts
            else:
                log(f"ℹ️ Lượt #{scan_index}: Bình thường ({elapsed}s). Bỏ qua ping Discord để duy trì tần suất {interval_min} phút/lần chống spam.")
        except Exception as e:
            log(f"Lỗi trong lượt quét #{scan_index}: {e}")
            send_system_error_alert(f"Lỗi trong lượt quét #{scan_index}: {e}")
            
        now_vn = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7)))
        cur_min = now_vn.hour * 60 + now_vn.minute
        if until_arg:
            if cur_min >= target_end_min or (cur_min + sleep_sec // 60 > target_end_min):
                log(f"🏁 Đã hoàn tất phiên chạy thử nghiệm ({until_arg}). Hoàn thành {scan_index} lượt quét.")
                send_heartbeat('test_end', f"• Đã thực hiện thành công **{scan_index} lượt quét** ngầm (5 phút/lần) trong khung giờ **{start_arg or ''} - {until_arg}**.")
                break
        elif not force_run:
            if cur_min >= target_end_min or (cur_min + sleep_sec // 60 > target_end_min):
                log(f"🏁 Đã hoàn tất lượt quét cuối của {session_name}. Dừng ca.")
                if status.get('last_afternoon_closing') != today_str:
                    completed_cache = load_completed_cache()
                    send_heartbeat('afternoon', f"Đã kết thúc phiên chiều. Tổng số mã đã có BCTC đầy đủ: **{len(completed_cache)} mã**.")
                    status['last_afternoon_closing'] = today_str
                    save_status(status)
                break
            
        sleep_min = sleep_sec // 60
        log(f"💤 [{session_tag}] Ngủ {sleep_sec} giây ({sleep_min} phút) trước lượt quét tiếp theo...")
        time.sleep(sleep_sec)
        
    log("=== HOÀN TẤT CA LÀM VIỆC ===")

if __name__ == '__main__':
    main()

