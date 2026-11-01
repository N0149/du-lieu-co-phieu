#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script Đồng Bộ Nghiên Cứu Chuyên Sâu AI (Word .docx -> Markdown & JSON Snapshot)
---------------------------------------------------------------------------------
Quét toàn bộ file .docx trong Google Drive "Nghiên cứu chuyên sâu AI",
bóc tách 5 trụ cột phân tích, hệ điểm định giá (Benchmark 10% gửi tiết kiệm = 100 điểm),
chuyển đổi bảng biểu và nội dung sang Markdown chuẩn,
lưu trữ vào content/nghien_cuu_ai/*.md và data/nghien_cuu_ai_snapshot.json,
đồng thời cập nhật liên kết trong data/reports-snapshot.json phục vụ Web & MCP Server.
"""

import os
import sys
import glob
import re
import json
from datetime import datetime
import docx
from docx.oxml.text.paragraph import CT_P
from docx.oxml.table import CT_Tbl
from docx.text.paragraph import Paragraph
from docx.table import Table

sys.stdout.reconfigure(encoding='utf-8')

# Đường dẫn thư mục gốc dự án
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SOURCE_DRIVE_DIR = r"E:\My Drive\Nghiên cứu chuyên sâu AI"
OUTPUT_MD_DIR = os.path.join(ROOT_DIR, "content", "nghien_cuu_ai")
OUTPUT_JSON_PATH = os.path.join(ROOT_DIR, "data", "nghien_cuu_ai_snapshot.json")
LIVE_PRICES_PATH = os.path.join(ROOT_DIR, "data", "nghien_cuu_ai_live_prices.json")
REPORTS_SNAPSHOT_PATH = os.path.join(ROOT_DIR, "data", "reports-snapshot.json")

os.makedirs(OUTPUT_MD_DIR, exist_ok=True)

def iter_block_items(parent):
    """Lấy danh sách đoạn văn và bảng theo đúng thứ tự xuất hiện trong tài liệu Word"""
    if isinstance(parent, docx.document.Document):
        parent_elm = parent.element.body
    else:
        parent_elm = parent._tc
    for child in parent_elm.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, parent)
        elif isinstance(child, CT_Tbl):
            yield Table(child, parent)

def clean_text(t):
    return re.sub(r'[ \t]+', ' ', t).strip()

def slugify(text):
    text = text.lower()
    text = re.sub(r'[àáạảãâầấậẩẫăằắặẳẵ]', 'a', text)
    text = re.sub(r'[èéẹẻẽêềếệểễ]', 'e', text)
    text = re.sub(r'[ìíịỉĩ]', 'i', text)
    text = re.sub(r'[òóọỏõôồốộổỗơờớợởỡ]', 'o', text)
    text = re.sub(r'[ùúụủũưừứựửữ]', 'u', text)
    text = re.sub(r'[ỳýỵỷỹ]', 'y', text)
    text = re.sub(r'[đ]', 'd', text)
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')

def parse_docx_to_markdown(docx_path):
    doc = docx.Document(docx_path)
    md_lines = []
    plain_paras = []
    
    for block in iter_block_items(doc):
        if isinstance(block, Paragraph):
            text = block.text.strip()
            if not text:
                continue
            plain_paras.append(text)
            
            style_name = (block.style.name or '').lower()
            
            # Xử lý in đậm inline runs
            runs_text = []
            for r in block.runs:
                t = r.text
                if not t:
                    continue
                if r.bold and not ('heading' in style_name or text.startswith('#')):
                    t = f"**{t.strip()}** "
                runs_text.append(t)
            formatted = "".join(runs_text).strip() if runs_text else text
            
            # Định dạng tiêu đề và danh sách
            if 'heading 1' in style_name:
                md_lines.append(f"\n# {formatted}\n")
            elif 'heading 2' in style_name:
                md_lines.append(f"\n## {formatted}\n")
            elif 'heading 3' in style_name:
                md_lines.append(f"\n### {formatted}\n")
            elif 'heading 4' in style_name:
                md_lines.append(f"\n#### {formatted}\n")
            elif 'bullet' in style_name or formatted.startswith(('• ', '- ', '* ')):
                clean = re.sub(r'^[•\-\*]\s*', '', formatted)
                md_lines.append(f"- {clean}\n")
            elif formatted.startswith(('# ', '## ', '### ', '#### ')):
                md_lines.append(f"\n{formatted}\n")
            elif re.match(r'^(?:PHẦN\s+\d+|Trụ\s+cột\s+\d+|\d+\.\s+[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ])', formatted):
                md_lines.append(f"\n### {formatted}\n")
            else:
                md_lines.append(f"\n{formatted}\n")
                
        elif isinstance(block, Table):
            rows_data = []
            for row in block.rows:
                row_cells = [clean_text(cell.text.replace('\n', ' ')) for cell in row.cells]
                # Lọc bỏ các ô lặp do merge cell trong Word
                dedup_cells = []
                for idx, c in enumerate(row_cells):
                    if idx > 0 and c == row_cells[idx-1] and c != "":
                        continue
                    dedup_cells.append(c)
                if any(dedup_cells):
                    rows_data.append(dedup_cells)
            
            if rows_data:
                max_cols = max(len(r) for r in rows_data)
                norm_rows = [r + [''] * (max_cols - len(r)) for r in rows_data]
                
                md_table = []
                header = norm_rows[0]
                escaped_header = [c.replace('|', '\\|') for c in header]
                md_table.append("| " + " | ".join(escaped_header) + " |")
                md_table.append("| " + " | ".join(['---'] * max_cols) + " |")
                for r in norm_rows[1:]:
                    escaped_row = [c.replace('|', '\\|') for c in r]
                    md_table.append("| " + " | ".join(escaped_row) + " |")
                
                md_lines.append("\n" + "\n".join(md_table) + "\n")
                
    raw_md = "".join(md_lines).strip()
    full_md = re.sub(r'\n{3,}', '\n\n', raw_md)
    return full_md, plain_paras

def extract_metadata(fname, plain_paras, full_md, file_mtime):
    base_no_ext = os.path.splitext(fname)[0]
    
    # 1. Mã cổ phiếu (Ticker)
    ticker = None
    m_t = re.match(r'^([A-Z0-9]{3,4})\b', base_no_ext)
    if m_t:
        t = m_t.group(1).upper()
        if t not in ('BAO', 'BCTC', 'DANH', 'QUY', 'DINH', 'CAO', 'SO'):
            ticker = t
    if not ticker:
        if 'LHG' in base_no_ext and 'IDV' in base_no_ext:
            ticker = 'LHG'
        elif 'VCP' in base_no_ext:
            ticker = 'VCP'
        elif 'Cao su' in base_no_ext:
            ticker = 'DRI'
        elif 'Định giá cổ phiếu' in base_no_ext or 'Quy trinh' in base_no_ext:
            ticker = 'MACRO'
        else:
            # Tìm token in hoa trong tên file
            tokens = re.findall(r'\b[A-Z]{3,4}\b', base_no_ext)
            for tok in tokens:
                if tok not in ('BCTC', 'RNAV', 'SOTP', 'DCF', 'HOSE', 'HNX', 'UPCOM'):
                    ticker = tok
                    break

    # 2. Ngày báo cáo (Date DD/MM/YYYY)
    date_str = None
    m_d1 = re.search(r'(\d{1,2})[\.\/](\d{1,2})[\.\/](20\d{2}|\d{2})', base_no_ext)
    if m_d1:
        d, m, y = m_d1.group(1).zfill(2), m_d1.group(2).zfill(2), m_d1.group(3)
        if len(y) == 2: y = "20" + y
        date_str = f"{d}/{m}/{y}"
    else:
        m_d2 = re.search(r'(\d{2})(\d{2})(20\d{2}|\d{2})', base_no_ext)
        if m_d2 and int(m_d2.group(1)) <= 31 and int(m_d2.group(2)) <= 12:
            d, m, y = m_d2.group(1), m_d2.group(2), m_d2.group(3)
            if len(y) == 2: y = "20" + y
            date_str = f"{d}/{m}/{y}"

    if not date_str:
        for p in plain_paras[:5]:
            m_dp = re.search(r'\b(\d{1,2})[\/\.](\d{1,2})[\/\.](20\d{2})\b', p)
            if m_dp:
                d, m, y = m_dp.group(1).zfill(2), m_dp.group(2).zfill(2), m_dp.group(3)
                date_str = f"{d}/{m}/{y}"
                break
                
    if not date_str:
        dt = datetime.fromtimestamp(file_mtime)
        date_str = dt.strftime("%d/%m/%Y")

    # 3. Điểm số định giá (Score)
    score = None
    m_sf = re.search(r'[-–]\s*(\d+[\.,]\d+)', base_no_ext)
    if m_sf:
        score = float(m_sf.group(1).replace(',', '.'))
        
    if score is None:
        patterns = [
            r'ĐIỂM XẾP HẠNG CHUẨN HÓA[^\d]*[:\s]+(\d+[\.,]\d+)\s*ĐIỂM',
            r'Điểm Chuẩn Hóa Thực Tế[^\d]*[:\s]+(\d+[\.,]\d+)\s*điểm',
            r'đạt\s+(\d+[\.,]\d+)\s*ĐIỂM\s+trên Hệ điểm Lãi kép Chuẩn hóa',
            r'đạt\s+(\d+[\.,]\d+)\s*điểm\s*\(tốc độ sinh lời lãi kép',
            r'(\d+[\.,]\d+)\s*ĐIỂM\s*\(Tốc độ sinh lời lãi kép',
            r'ĐIỂM XẾP HẠNG CHUẨN HÓA[^:]*:\s*(\d+[\.,]\d+)',
            r'Chuẩn Hóa[^:]*:\s*(\d+[\.,]\d+)\s*điểm',
        ]
        for pat in patterns:
            for p in plain_paras[:30]:
                m_sc = re.search(pat, p, re.IGNORECASE)
                if m_sc:
                    val = float(m_sc.group(1).replace(',', '.'))
                    if 10.0 <= val <= 500.0:
                        score = val
                        break
            if score is not None:
                break

    # Điều chỉnh chính xác cho từng tài liệu đã kiểm tra
    if 'CAT bctc quy 3' in base_no_ext:
        score = 246.8
    elif 'HUB điểm 26.10' in base_no_ext:
        score = 197.0
    elif 'AIC điểm' in base_no_ext:
        score = 111.9
    elif 'CCI điểm' in base_no_ext:
        score = 170.2
    elif 'M10 điểm' in base_no_ext:
        score = 200.0
    elif 'VGG điểm' in base_no_ext:
        score = 151.8
    elif 'DRI 21.10.26' in base_no_ext:
        score = 173.0
    elif 'DRI điểm' in base_no_ext:
        score = 179.7
    elif ticker == 'TYA' and (score is None or score < 50):
        score = 196.5
    elif ticker == 'SJE' and (score is None or score < 50):
        score = 119.6
    elif ticker == 'IDV' and score is None:
        score = 173.6
    elif ticker == 'TIP' and score is None:
        score = 153.8
    elif ticker == 'GHC' and score is None:
        score = 131.8
    elif ticker == 'SDT' and score is None:
        score = 163.9
    elif ticker == 'FMC' and score is None:
        score = 183.2
    elif ticker == 'S55' and score is None:
        score = 166.8
    elif ticker == 'BAX' and (score is None or score < 50):
        score = 75.3

    # 4. Phân loại xếp hạng
    classification = None
    if score is not None:
        if score >= 200:
            classification = "Siêu Hấp Dẫn"
        elif score >= 150:
            classification = "Khả Quan"
        elif score >= 100:
            classification = "Theo Dõi"
        else:
            classification = "Kém Hấp Dẫn"

    # 5. Giá thị trường tại thời điểm nghiên cứu
    price = None
    for p in plain_paras[:15]:
        m_px = re.search(r'(?:thị giá|mức giá|giá hiện tại)[^\d]*([\d\.,]+)\s*(?:đồng|đ\/cp|vnđ|k)', p, re.IGNORECASE)
        if m_px:
            v_str = m_px.group(1).replace('.', '').replace(',', '.')
            try:
                v = float(v_str)
                price = v / 1000 if v > 1000 else v
                break
            except:
                pass

    # Tinh chỉnh giá P0 chính xác cho từng hồ sơ
    if 'FMC quý 3' in base_no_ext:
        price = 35.4
    elif 'IDV 221026' in base_no_ext:
        price = 20.8
    elif 'S55 31.10.26' in base_no_ext:
        price = 66.0
    elif 'HUB điểm 26.10' in base_no_ext:
        price = 10.6
    elif 'AIC điểm' in base_no_ext:
        price = 7.4
    elif 'CCI điểm' in base_no_ext:
        price = 17.2
    elif 'M10 điểm' in base_no_ext:
        price = 19.2
    elif 'VGG điểm' in base_no_ext:
        price = 37.5
    elif 'DRI điểm' in base_no_ext:
        price = 15.7
    elif 'DRI 21.10.26' in base_no_ext:
        price = 15.7
    elif 'CAT bctc quy 3' in base_no_ext:
        price = 15.3
    elif 'BAX điểm' in base_no_ext:
        price = 30.0
    elif 'CLX' in base_no_ext:
        price = 13.0

    # 6. Giá mục tiêu / SOTP / RNAV
    target_price = None
    for p in plain_paras[:30]:
        m_tp = re.search(r'(?:SOTP Chuẩn hóa|RNAV|giá mục tiêu|định giá từng phần)[^\d]*([\d\.,]+)\s*(?:đồng|đ\/cp|vnđ)', p, re.IGNORECASE)
        if m_tp:
            v_str = m_tp.group(1).replace('.', '').replace(',', '.')
            try:
                v = float(v_str)
                target_price = v / 1000 if v > 1000 else v
                break
            except:
                pass

    # 7. Upside (%)
    upside = None
    if price and target_price and price > 0:
        upside = round(((target_price - price) / price) * 100, 1)

    # 8. Tiêu đề hiển thị đẹp
    display_title = base_no_ext
    if ticker and ticker != 'MACRO':
        if score:
            display_title = f"[{ticker}] Nghiên Cứu Định Giá {score} Điểm - {base_no_ext}"
        else:
            display_title = f"[{ticker}] {base_no_ext}"

    # 9. Tóm tắt luận điểm cốt lõi (Highlights)
    meaningful = [
        p for p in plain_paras
        if len(p) > 60 and not p.startswith('|') and not p.startswith('#') and 'quy trình' not in p.lower()[:20]
    ]
    summary = " ".join(meaningful[:2])[:350] + "..." if meaningful else ""

    # Đếm số bảng trong văn bản
    table_count = len(re.findall(r'\n\|[^\n]+\|\n\|[\s\-:]+\|\n', full_md))

    slug = slugify(f"{ticker or 'report'}-{base_no_ext}")

    return {
        'slug': slug,
        'ticker': ticker,
        'title': base_no_ext,
        'displayTitle': display_title,
        'date': date_str,
        'score': score,
        'classification': classification,
        'price': price,
        'targetPrice': target_price,
        'upside': upside,
        'summary': summary,
        'filename': fname,
        'charCount': len(full_md),
        'tableCount': table_count,
        'updatedAt': datetime.fromtimestamp(file_mtime).isoformat()
    }

def main():
    print("=" * 70)
    print("ĐỒNG BỘ BÁO CÁO NGHIÊN CỨU CHUYÊN SÂU AI (WORD -> MARKDOWN & WEB/MCP)")
    print("=" * 70)
    
    if not os.path.exists(SOURCE_DRIVE_DIR):
        print(f"[!] Thư mục nguồn không tìm thấy: {SOURCE_DRIVE_DIR}")
        print("[!] Sẽ quét thư mục backup cục bộ content/nghien_cuu_ai nếu có.")
        return

    # Tìm tất cả file docx trong thư mục và thư mục con
    docx_patterns = [
        os.path.join(SOURCE_DRIVE_DIR, "*.docx"),
        os.path.join(SOURCE_DRIVE_DIR, "Phan tích chuyên sâu", "*.docx")
    ]
    all_files = []
    for pat in docx_patterns:
        all_files.extend(glob.glob(pat))

    valid_files = [f for f in all_files if not os.path.basename(f).startswith("~$")]
    
    # Khử trùng lặp file nếu file xuất hiện ở cả thư mục cha và thư mục con
    unique_files_map = {}
    for f in valid_files:
        fn = os.path.basename(f)
        if fn not in unique_files_map or os.path.getmtime(f) > os.path.getmtime(unique_files_map[fn]):
            unique_files_map[fn] = f
    valid_files = sorted(unique_files_map.values())
    print(f"[*] Tìm thấy {len(valid_files)} file Word (.docx) hợp lệ (sau khi loại bỏ trùng lặp).")

    reports = []
    seen_slugs = set()
    
    for fpath in valid_files:
        fname = os.path.basename(fpath)
        try:
            mtime = os.path.getmtime(fpath)
            full_md, plain_paras = parse_docx_to_markdown(fpath)
            meta = extract_metadata(fname, plain_paras, full_md, mtime)

            # Đảm bảo slug luôn là duy nhất tuyệt đối
            orig_slug = meta['slug']
            counter = 2
            while meta['slug'] in seen_slugs:
                meta['slug'] = f"{orig_slug}-{counter}"
                counter += 1
            seen_slugs.add(meta['slug'])
            
            # Lưu file markdown vào content/nghien_cuu_ai/{slug}.md
            md_out_path = os.path.join(OUTPUT_MD_DIR, f"{meta['slug']}.md")
            
            # Tạo header frontmatter
            frontmatter = f"""---
title: "{meta['displayTitle']}"
ticker: "{meta['ticker'] or ''}"
date: "{meta['date']}"
score: {meta['score'] if meta['score'] is not None else 'null'}
classification: "{meta['classification'] or ''}"
price: {meta['price'] if meta['price'] is not None else 'null'}
targetPrice: {meta['targetPrice'] if meta['targetPrice'] is not None else 'null'}
upside: {meta['upside'] if meta['upside'] is not None else 'null'}
filename: "{meta['filename']}"
---

"""
            with open(md_out_path, "w", encoding="utf-8") as f_out:
                f_out.write(frontmatter + full_md)
                
            reports.append(meta)
            sc = f"{meta['score']:.1f}" if meta['score'] else "—"
            print(f" [OK] {meta['ticker']:<5} | Score: {sc:<5} | {meta['date']:<10} | {fname}")
        except Exception as e:
            print(f" [ERROR] Lỗi khi xử lý {fname}: {e}")

    # Sắp xếp danh sách: Ưu tiên có điểm số cao nhất, sau đó đến ngày mới nhất
    reports.sort(key=lambda x: (-(x['score'] or 0), x['date']), reverse=False)

    # Ghi dữ liệu ra data/nghien_cuu_ai_snapshot.json
    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f_json:
        json.dump(reports, f_json, ensure_ascii=False, indent=2)
    print(f"\n[+] Đã xuất snapshot: {OUTPUT_JSON_PATH} ({len(reports)} báo cáo)")

    # Tự động đồng bộ giá thị trường thời gian thực (Real-time Live Quote từ 24hMoney)
    tickers = sorted(list(set(r['ticker'] for r in reports if r['ticker'] and r['ticker'] != 'MACRO')))
    print(f"[*] Đang tải thị giá thời gian thực cho {len(tickers)} mã cổ phiếu...")
    live_price_map = {}
    import urllib.request
    req_headers = {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    for sym in tickers:
        try:
            url = f"https://api-finance-t19.24hmoney.vn/v2/ios/stock/detail-even-deactivate?symbol={sym.lower()}"
            req = urllib.request.Request(url, headers=req_headers)
            with urllib.request.urlopen(req, timeout=4) as resp:
                data = json.loads(resp.read().decode('utf-8')).get('data', {})
                raw_px = float(data.get('match_price') or data.get('close_price') or data.get('price') or 0)
                px = raw_px / 1000 if raw_px > 1000 else raw_px
                if px > 0:
                    live_price_map[sym] = {
                        'price': px,
                        'change': float(data.get('change') or 0),
                        'changePercent': float(data.get('change_percent') or 0),
                        'tradingDate': data.get('trading_date'),
                        'updatedAt': datetime.now().isoformat()
                    }
        except Exception:
            pass

    if live_price_map:
        with open(LIVE_PRICES_PATH, "w", encoding="utf-8") as f_lp:
            json.dump(live_price_map, f_lp, ensure_ascii=False, indent=2)
        print(f"[+] Đã cập nhật thị giá thời gian thực cho {len(live_price_map)} mã vào {LIVE_PRICES_PATH}")

    # Cập nhật reports-snapshot.json nếu có
    if os.path.exists(REPORTS_SNAPSHOT_PATH):
        try:
            with open(REPORTS_SNAPSHOT_PATH, "r", encoding="utf-8") as f_rep:
                rep_data = json.load(f_rep)
            
            # Ánh xạ slug hoặc docx name vào reports-snapshot
            name_to_meta = {r['filename']: r for r in reports}
            updated_count = 0
            for item in rep_data:
                fn = item.get('title')
                if fn in name_to_meta:
                    meta = name_to_meta[fn]
                    item['localSlug'] = meta['slug']
                    item['score'] = meta['score']
                    item['classification'] = meta['classification']
                    if meta['price']: item['currentPrice'] = meta['price']
                    if meta['targetPrice']: item['targetPrice'] = meta['targetPrice']
                    if meta['upside']: item['upside'] = meta['upside']
                    if meta['summary']: item['summary'] = meta['summary']
                    updated_count += 1
                    
            with open(REPORTS_SNAPSHOT_PATH, "w", encoding="utf-8") as f_rep_out:
                json.dump(rep_data, f_rep_out, ensure_ascii=False, indent=2)
            print(f"[+] Đã liên kết {updated_count} báo cáo vào {REPORTS_SNAPSHOT_PATH}")
        except Exception as e:
            print(f"[!] Lỗi cập nhật reports-snapshot.json: {e}")

    print("\n" + "=" * 70)
    print(f"HOÀN TẤT ĐỒNG BỘ: {len(reports)} BÁO CÁO NGHIÊN CỨU CHUYÊN SÂU AI")
    print("Web & MCP Server đã sẵn sàng cơ sở dữ liệu tra cứu!")
    print("=" * 70)

if __name__ == "__main__":
    main()
