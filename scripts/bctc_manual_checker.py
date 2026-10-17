"""
CÔNG CỤ KIỂM TRA BCTC THỦ CÔNG & THEO YÊU CẦU (BCTC QUÝ 3/2026)
- Tra cứu tức thì một mã bất kỳ (ví dụ: BMP, HPG, SSI, VNM...).
- Quét theo từng nhóm (Nhóm 1, Nhóm 2, Nhóm 3, 278 mã, hoặc 938 mã toàn thị trường).
- Bóc tách LNST & % YoY tự động từ file PDF.
- Bắn thông báo về Discord điện thoại theo lựa chọn của người dùng.
- Thêm mã mới vào danh sách tự động giám sát 5 phút/lần.
"""

import os
import sys
import json
import time
import datetime
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup
import openpyxl

# Đảm bảo UTF-8
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from bctc_monitor_cloud import (
    check_fpts_ezir,
    check_company_website,
    extract_lnst_and_yoy,
    send_discord_alert,
    load_completed_cache,
    save_completed_cache,
    load_alerts,
    save_alerts,
    is_q3_2026,
    classify_bctc_type,
    HEADERS,
    TICKERS_FILE,
    COMPLETED_CACHE_FILE,
    ALERTS_FILE,
    DISCORD_CONFIG_FILE
)

ALL_MARKET_EXCEL = r"D:\hoc\lap trinh\co phieu loc check bctc.xlsx"
EXCEL_278 = r"D:\hoc\lap trinh\check BCTC Distill\Danh_sach_tong_hop_278_ma_BCTC.xlsx"
COMPANY_WEBSITES_FILE = os.path.join(BASE_DIR, "data", "company_websites.json")

def log(msg):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)

def get_company_info(ticker):
    ticker = ticker.upper().strip()
    name = f"Công ty CP {ticker}"
    san = "HOSE"
    uri = ""
    
    if os.path.exists(COMPANY_WEBSITES_FILE):
        try:
            with open(COMPANY_WEBSITES_FILE, "r", encoding="utf-8") as f:
                websites_map = json.load(f)
                if ticker in websites_map:
                    info = websites_map[ticker]
                    name = info.get('name') or name
                    ws = info.get('website', '')
                    if ws:
                        uri = f"https://{ws}" if not ws.startswith('http') else ws
        except:
            pass
            
    # Tra cứu thêm từ tickers_group1_115.json
    if os.path.exists(TICKERS_FILE):
        try:
            with open(TICKERS_FILE, "r", encoding="utf-8") as f:
                t_list = json.load(f)
                for it in t_list:
                    if it.get('ticker') == ticker:
                        name = it.get('name') or name
                        san = it.get('san') or san
                        if it.get('uri'):
                            uri = it['uri']
                        break
        except:
            pass
            
    return {"ticker": ticker, "name": name, "san": san, "uri": uri}

def check_cafef_disclosures_for_ticker(ticker):
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

def check_single_ticker_detailed(ticker, prompt_discord=True):
    ticker = ticker.upper().strip()
    print("=" * 70)
    print(f"🔎 ĐANG KIỂM TRA DỮ LIỆU BCTC QUÝ 3/2026 CHO MÃ: [{ticker}]")
    print("=" * 70)
    
    comp_info = get_company_info(ticker)
    print(f"🏢 Tên công ty: {comp_info['name']}")
    print(f"🏛️ Sàn: {comp_info['san']} | Website quan hệ CĐ: {comp_info['uri'] or 'Chưa cấu hình web riêng'}")
    print("\n⏳ Đang rà soát dữ liệu từ các nguồn (EzIR FPTS, Website công ty, CafeF CBTT)...")
    
    start_t = time.time()
    res_q3 = None
    
    # 1. Quét EzIR FPTS
    res_ezir = check_fpts_ezir(ticker)
    if res_ezir.get('has_q3'):
        res_q3 = res_ezir
    else:
        print(f"   • EzIR FPTS: Chưa có BCTC Q3 (Văn bản mới nhất: {res_ezir.get('latest_doc', 'N/A')})")
        
    # 2. Quét Website công ty
    if not res_q3 and comp_info.get('uri'):
        res_web = check_company_website(ticker, comp_info['uri'])
        if res_web and res_web.get('has_q3'):
            res_q3 = res_web
        else:
            print(f"   • Website riêng ({comp_info['uri']}): Chưa tìm thấy file BCTC Q3")
            
    # 3. Quét CafeF CBTT
    if not res_q3:
        res_cf = check_cafef_disclosures_for_ticker(ticker)
        if res_cf.get('has_q3'):
            res_q3 = res_cf
        else:
            print(f"   • Cổng CBTT CafeF: Chưa có thông báo BCTC Q3")
            
    elapsed = round(time.time() - start_t, 2)
    print("-" * 70)
    
    if res_q3 and res_q3.get('has_q3'):
        b_type = res_q3.get('bctc_type', 'DAY_DU')
        type_str = "HỢP NHẤT" if b_type == 'HOP_NHAT' else ("CÔNG TY MẸ (RIÊNG)" if b_type == 'RIENG' else "ĐẦY ĐỦ")
        print(f"🔥 KẾT QUẢ: ĐÃ PHÁT HIỆN BCTC QUÝ 3/2026 CHO [{ticker}]!")
        print(f"   • Phân loại: {type_str} [{b_type}]")
        print(f"   • Tiêu đề: {res_q3.get('title')}")
        print(f"   • Ngày công bố: {res_q3.get('date')}")
        print(f"   • Nguồn phát hiện: {res_q3.get('source')}")
        print(f"   • Đường dẫn tài liệu: {res_q3.get('doc_url')}")
        
        # Bóc tách LNST & YoY
        doc_url = res_q3.get('doc_url', '')
        lnst_data = extract_lnst_and_yoy(doc_url)
        alert_payload = {
            "ticker": ticker,
            "company_name": comp_info['name'],
            "exchange": comp_info['san'],
            "quarter": "Quý 3/2026",
            "release_date": res_q3.get('date'),
            "title": res_q3.get('title'),
            "source": res_q3.get('source'),
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
            print(f"   📊 Bóc tách tự động: {alert_payload['lnst_label']} = {alert_payload['net_profit']} ({alert_payload['growth_rate']})")
        else:
            alert_payload['lnst_status'] = lnst_data.get('reason', 'Bản scan dấu đỏ / Đang cập nhật')
            print(f"   ℹ️ Ghi chú: {alert_payload['lnst_status']}")
            
        # Lưu vào Completed Cache
        cache = load_completed_cache()
        cache[ticker] = {
            "ticker": ticker,
            "company_name": comp_info['name'],
            "release_date": res_q3.get('date'),
            "title": res_q3.get('title'),
            "doc_url": doc_url,
            "source": res_q3.get('source'),
            "bctc_type": b_type,
            "updated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        save_completed_cache(cache)
        print("   ✅ Đã tự động ghi nhớ vào bộ nhớ đã quét.")
        
        if prompt_discord:
            print("\n" + "=" * 70)
            choice = input("📲 Bạn có muốn bắn thông báo này về Discord điện thoại không? [Y/n]: ").strip().lower()
            if choice in ['', 'y', 'yes', '1']:
                send_discord_alert(alert_payload)
                print("🚀 Đã bắn thông báo thành công về Discord điện thoại!")
        else:
            send_discord_alert(alert_payload)
            print("🚀 Đã tự động bắn thông báo về Discord điện thoại!")
            
    else:
        print(f"❄️ KẾT QUẢ: [{ticker}] hiện TẠI CHƯA CÓ Báo cáo tài chính Quý 3/2026.")
        print(f"⏱️ Tổng thời gian kiểm tra: {elapsed}s.")
        print("💡 Gợi ý: Nếu bạn muốn hệ thống tự động quét mã này mỗi 5 phút/ngày, hãy chọn [7] để thêm vào danh sách theo dõi.")
    print("=" * 70)

def scan_group_tickers(tickers_list, group_name="Nhóm"):
    completed_cache = load_completed_cache()
    to_scan = []
    already_done = []
    
    for it in tickers_list:
        t = it['ticker']
        if t in completed_cache and completed_cache[t].get('bctc_type') in ['HOP_NHAT', 'DAY_DU']:
            already_done.append(t)
        else:
            to_scan.append(it)
            
    print(f"\n🚀 BẮT ĐẦU QUÉT THỦ CÔNG: {group_name}")
    print(f"📊 Tổng số: {len(tickers_list)} mã | Đã có BCTC trước đó: {len(already_done)} mã | Cần kiểm tra: {len(to_scan)} mã")
    
    if not to_scan:
        print("🎉 Toàn bộ các mã trong danh sách này đều đã có BCTC đầy đủ!")
        return
        
    start_all = time.time()
    new_found = 0
    
    def worker(item):
        t = item['ticker']
        # 1. EzIR
        res = check_fpts_ezir(t)
        if res.get('has_q3'):
            return t, item, res
        # 2. Web riêng
        uri = item.get('uri', '')
        if uri:
            res_web = check_company_website(t, uri)
            if res_web and res_web.get('has_q3'):
                return t, item, res_web
        return t, item, res

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
                    
                    lnst_data = extract_lnst_and_yoy(doc_url)
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
                        "is_hot": True,
                        "detected_at": datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
                    }
                    if lnst_data.get('has_data'):
                        alert_payload['net_profit'] = lnst_data.get('current_quarter')
                        alert_payload['prev_profit'] = lnst_data.get('prev_quarter')
                        alert_payload['growth_rate'] = lnst_data.get('yoy')
                        alert_payload['growth_direction'] = lnst_data.get('direction', 'up')
                        alert_payload['lnst_label'] = lnst_data.get('label', 'LNST Quý 3/2026')
                        print(f"   📊 LNST: {alert_payload['net_profit']} ({alert_payload['growth_rate']})")
                    
                    # Gửi Discord và lưu cache
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
                    sys.stdout.write(f".")
                    sys.stdout.flush()
            except Exception as e:
                pass
                
    elapsed = round(time.time() - start_all, 2)
    print(f"\n\n⏱️ Hoàn tất quét {len(to_scan)} mã trong {elapsed} giây! Phát hiện {new_found} BCTC mới.")

def scan_all_market_938():
    if not os.path.exists(ALL_MARKET_EXCEL):
        print(f"❌ Không tìm thấy file {ALL_MARKET_EXCEL}")
        return
        
    print(f"📂 Đang tải danh sách 938 mã cổ phiếu từ {ALL_MARKET_EXCEL}...")
    wb = openpyxl.load_workbook(ALL_MARKET_EXCEL, data_only=True)
    ws = wb.active
    
    tickers_list = []
    for r in range(1, ws.max_row + 1):
        val = ws.cell(row=r, column=3).value
        if val and len(str(val).strip()) == 3:
            t = str(val).strip().upper()
            tickers_list.append({
                'stt': r,
                'ticker': t,
                'name': f"Cổ phiếu {t}",
                'san': 'HOSE/HNX',
                'uri': ''
            })
            
    print(f"✅ Đã tải thành công {len(tickers_list)} mã từ file Excel.")
    scan_group_tickers(tickers_list, group_name="Toàn bộ 938 mã thị trường")

def add_ticker_to_monitor(ticker):
    ticker = ticker.upper().strip()
    if not os.path.exists(TICKERS_FILE):
        print("❌ Không tìm thấy file cấu hình theo dõi.")
        return
        
    with open(TICKERS_FILE, "r", encoding="utf-8") as f:
        items = json.load(f)
        
    tickers = [it['ticker'] for it in items]
    if ticker in tickers:
        print(f"ℹ️ Mã [{ticker}] ĐÃ CÓ SẴN trong danh sách giám sát tự động 5 phút!")
        return
        
    info = get_company_info(ticker)
    new_item = {
        'stt': len(items) + 1,
        'ticker': ticker,
        'name': info['name'],
        'san': info['san'],
        'batch_file': 'Manual_Added',
        'dot_ra': 'Uu_Tien',
        'uri': info['uri']
    }
    items.append(new_item)
    with open(TICKERS_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
        
    print(f"🎉 THÀNH CÔNG! Đã thêm mã [{ticker}] vào danh sách giám sát tự động hàng ngày.")
    print(f"Từ bây giờ, hệ thống 5 phút/lần sẽ tự động theo dõi {ticker}!")

def interactive_menu():
    while True:
        print("\n" + "=" * 75)
        print("          HỆ THỐNG KIỂM TRA BCTC THỦ CÔNG & THEO YÊU CẦU (QUÝ 3/2026)")
        print("=" * 75)
        print("  [1] Tra cứu MÃ CỤ THỂ bất kỳ (Ví dụ: BMP, HPG, SSI, VNM...)")
        print("  [2] Quét ngay NHÓM 1 (116 mã trọng điểm: VCB, FPT, BMP, MWG, DGC...)")
        print("  [3] Quét ngay NHÓM 2 (Từ mã 116 đến 184 - 69 mã)")
        print("  [4] Quét ngay NHÓM 3 (Những mã còn lại - 94 mã)")
        print("  [5] Quét TOÀN BỘ 278 mã cổ phiếu")
        print("  [6] Quét TOÀN BỘ 938 mã thị trường (từ file co phieu loc check bctc.xlsx)")
        print("  [7] Thêm một mã mới vào danh sách giám sát tự động 5 phút")
        print("  [0] Thoát")
        print("=" * 75)
        
        opt = input("👉 Lựa chọn của bạn [1-7 hoặc 0]: ").strip()
        
        if opt == '1':
            tk = input("\n📝 Nhập mã cổ phiếu cần kiểm tra (ví dụ BMP): ").strip().upper()
            if tk:
                check_single_ticker_detailed(tk)
            input("\nNhấn Enter để quay lại menu...")
        elif opt == '2':
            if os.path.exists(TICKERS_FILE):
                with open(TICKERS_FILE, "r", encoding="utf-8") as f:
                    t_list = json.load(f)
                scan_group_tickers(t_list, group_name="Nhóm 1 Trọng Điểm")
            input("\nNhấn Enter để quay lại menu...")
        elif opt == '3':
            from bctc_monitor_115 import load_tickers_from_excel
            t_list, _, _ = load_tickers_from_excel(group='2')
            scan_group_tickers(t_list, group_name="Nhóm 2 (Mã 116 -> 184)")
            input("\nNhấn Enter để quay lại menu...")
        elif opt == '4':
            from bctc_monitor_115 import load_tickers_from_excel
            t_list, _, _ = load_tickers_from_excel(group='3')
            scan_group_tickers(t_list, group_name="Nhóm 3 (Mã 185 -> 278)")
            input("\nNhấn Enter để quay lại menu...")
        elif opt == '5':
            from bctc_monitor_115 import load_tickers_from_excel
            t_list, _, _ = load_tickers_from_excel(group='all')
            scan_group_tickers(t_list, group_name="Toàn bộ 278 mã")
            input("\nNhấn Enter để quay lại menu...")
        elif opt == '6':
            scan_all_market_938()
            input("\nNhấn Enter để quay lại menu...")
        elif opt == '7':
            tk = input("\n📝 Nhập mã cổ phiếu muốn thêm vào giám sát tự động (ví dụ BMP): ").strip().upper()
            if tk:
                add_ticker_to_monitor(tk)
            input("\nNhấn Enter để quay lại menu...")
        elif opt == '0':
            print("Tạm biệt!")
            break

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if '--ticker' in sys.argv:
            idx = sys.argv.index('--ticker')
            if idx + 1 < len(sys.argv):
                check_single_ticker_detailed(sys.argv[idx + 1], prompt_discord=False)
        elif '--group' in sys.argv:
            idx = sys.argv.index('--group')
            g = sys.argv[idx + 1] if idx + 1 < len(sys.argv) else '1'
            if g == '1':
                with open(TICKERS_FILE, "r", encoding="utf-8") as f:
                    t_list = json.load(f)
                scan_group_tickers(t_list, group_name="Nhóm 1")
            else:
                from bctc_monitor_115 import load_tickers_from_excel
                t_list, _, _ = load_tickers_from_excel(group=g)
                scan_group_tickers(t_list, group_name=f"Nhóm {g}")
        elif '--all-market' in sys.argv:
            scan_all_market_938()
        elif '--add' in sys.argv:
            idx = sys.argv.index('--add')
            if idx + 1 < len(sys.argv):
                add_ticker_to_monitor(sys.argv[idx + 1])
    else:
        interactive_menu()
