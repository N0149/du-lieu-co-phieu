import sys
import os
import time
import json
import urllib.request
import urllib.parse
import datetime
import re
import openpyxl

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, r"D:\hoc\lap trinh\du-lieu-co-phieu\scripts")

from bctc_monitor_cloud import VIETSTOCK_SCANNER, is_q3_2026, classify_bctc_type, safe_read_response, get_browser_headers

def main():
    # 1. Load 278 tickers
    excel_path = r"D:\hoc\lap trinh\check BCTC Distill\Danh_sach_tong_hop_278_ma_BCTC.xlsx"
    wb = openpyxl.load_workbook(excel_path, data_only=True)
    sheet = wb.active
    rows = list(sheet.iter_rows(min_row=2, values_only=True))

    tickers_278_meta = {}
    for r in rows:
        t = str(r[1]).strip().upper() if r[1] else None
        if t:
            tickers_278_meta[t] = {
                'stt': r[0],
                'ticker': t,
                'name': r[2],
                'exchange': r[3],
                'batch': r[4],
                'dot': r[5]
            }

    # 2. Load completed .md
    ext_dir = r"D:\hoc\lap trinh\tai-lieu-BCTC\ket_qua_trich_xuat\Quy_3_2026"
    loc_dir = r"d:\hoc\lap trinh\du-lieu-co-phieu\content\bctc\Quy_3_2026"

    def get_md_tickers(d):
        if not os.path.exists(d): return set()
        res = set()
        for f in os.listdir(d):
            if f.endswith('.md'):
                t = f.split('_')[0].upper()
                if 3 <= len(t) <= 5:
                    res.add(t)
        return res

    completed_tickers = get_md_tickers(ext_dir).union(get_md_tickers(loc_dir))
    pending_tickers = [t for t in tickers_278_meta.keys() if t not in completed_tickers]

    print(f"Tổng số mã trong danh sách 278: {len(tickers_278_meta)}")
    print(f"Số mã đã làm xong thành file .md: {len([t for t in tickers_278_meta if t in completed_tickers])}")
    print(f"Số mã chưa có file .md (cần quét Vietstock): {len(pending_tickers)}")
    print("-" * 70)

    token = VIETSTOCK_SCANNER._ensure_token()
    if not token:
        print("[LỖI] Không thể lấy Verification Token từ Vietstock!")
        return

    def scan_ticker_vietstock(ticker):
        api_url = "https://finance.vietstock.vn/data/GetDocument"
        post_data = urllib.parse.urlencode({
            'code': str(ticker).upper(),
            'page': 1,
            'pageSize': 40,
            '__RequestVerificationToken': token
        }).encode('utf-8')
        
        headers = get_browser_headers(
            referer=f"https://finance.vietstock.vn/{str(ticker).upper()}/tai-lieu.htm",
            is_api=True,
            custom_headers={
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': 'https://finance.vietstock.vn'
            }
        )
        
        req = urllib.request.Request(api_url, data=post_data, headers=headers)
        with VIETSTOCK_SCANNER.opener.open(req, timeout=10) as resp:
            raw_bytes = safe_read_response(resp)
            data = json.loads(raw_bytes.decode('utf-8', errors='ignore'))
            
        if not isinstance(data, list):
            return {'has_q3': False, 'error': 'Invalid format'}
            
        candidates = []
        for item in data:
            title = item.get('Title', '').strip()
            raw_url = item.get('Url', '').strip()
            doc_url = urllib.parse.quote(raw_url, safe=':/?&=%') if raw_url else ''
            
            last_up = item.get('LastUpdate', '')
            date_str = ''
            m_ts = re.search(r'\d+', last_up)
            if m_ts:
                ts = int(m_ts.group(0)) / 1000.0
                dt = datetime.datetime.fromtimestamp(ts)
                date_str = dt.strftime('%d/%m/%Y')
                # Chỉ lọc các văn bản công bố từ cuối tháng 9/2026 trở đi
                if dt.year < 2026 or (dt.month < 9) or (dt.month == 9 and dt.day < 20):
                    continue
                    
            matched, snippet = is_q3_2026(title, ticker=ticker, doc_url=doc_url, date_pub=date_str)
            if matched:
                b_type = classify_bctc_type(title)
                candidates.append({
                    'title': title,
                    'date': date_str or datetime.datetime.now().strftime('%d/%m/%Y'),
                    'doc_url': doc_url,
                    'bctc_type': b_type
                })
                
        if candidates:
            hop_nhat = next((c for c in candidates if c['bctc_type'] == 'HOP_NHAT'), None)
            best = hop_nhat or candidates[0]
            return {
                'has_q3': True,
                'bctc_type': best['bctc_type'],
                'title': best['title'],
                'date': best['date'],
                'doc_url': best['doc_url'],
                'all_docs': candidates
            }
        return {'has_q3': False}

    results = {}
    has_q3_list = []
    no_q3_list = []

    for i, t in enumerate(pending_tickers, 1):
        time.sleep(0.35)
        try:
            r = scan_ticker_vietstock(t)
            r['meta'] = tickers_278_meta[t]
            results[t] = r
            if r.get('has_q3'):
                has_q3_list.append(t)
                print(f"[{i:3d}/{len(pending_tickers)}] {t:<5} | [ĐÃ CÓ BCTC Q3] ({r['date']}): {r['title'][:65]}")
            else:
                no_q3_list.append(t)
                print(f"[{i:3d}/{len(pending_tickers)}] {t:<5} | Chưa có BCTC Q3 trên Vietstock")
        except Exception as e:
            results[t] = {'has_q3': False, 'error': str(e), 'meta': tickers_278_meta[t]}
            no_q3_list.append(t)
            print(f"[{i:3d}/{len(pending_tickers)}] {t:<5} | [LỖI]: {e}")

    print("=" * 70)
    print("TỔNG KẾT KẾT QUẢ QUÉT 147 MÃ CHƯA LÀM TRÊN VIETSTOCK:")
    print(f" + Đã có BCTC Quý 3/2026 trên Vietstock (CẦN LÀM TIẾP): {len(has_q3_list)} mã")
    print(f" + Chưa có BCTC Quý 3/2026 trên Vietstock: {len(no_q3_list)} mã")
    print("=" * 70)

    out_file = os.path.join(r"D:\hoc\lap trinh\du-lieu-co-phieu\data", "vietstock_q3_pending_check.json")
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump({
            'scanned_at': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'total_pending': len(pending_tickers),
            'has_q3_count': len(has_q3_list),
            'no_q3_count': len(no_q3_list),
            'has_q3_tickers': has_q3_list,
            'no_q3_tickers': no_q3_list,
            'details': results
        }, f, ensure_ascii=False, indent=2)
    print(f"Đã lưu kết quả chi tiết vào: {out_file}")

if __name__ == '__main__':
    main()
