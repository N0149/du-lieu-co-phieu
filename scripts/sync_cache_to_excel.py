"""
ĐỒNG BỘ DỮ LIỆU BCTC TỪ CLOUD VỀ FILE EXCEL TRÊN Ổ D
- Chạy siêu nhanh trong 1 giây (không quét mạng).
- Lấy toàn bộ các mã BCTC mới phát hiện từ đám mây ghi thẳng vào file Excel.
"""

import os
import sys
import json
import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
EXCEL_PATH = r"D:\hoc\lap trinh\check BCTC Distill\Danh_sach_tong_hop_278_ma_BCTC.xlsx"
EXCEL_FALLBACK = r"D:\hoc\lap trinh\check BCTC Distill\Danh_sach_sua_link_BCTC_Batch_04_den_12.xlsx"
COMPLETED_CACHE_FILE = os.path.join(BASE_DIR, "data", "bctc_completed_cache.json")

def main():
    print("=== ĐỒNG BỘ BCTC TỪ CLOUD VỀ EXCEL ===")
    if not os.path.exists(COMPLETED_CACHE_FILE):
        print("Chưa có file cache.")
        return
        
    with open(COMPLETED_CACHE_FILE, "r", encoding="utf-8") as f:
        cache = json.load(f)
        
    target_file = EXCEL_PATH if os.path.exists(EXCEL_PATH) else EXCEL_FALLBACK
    if not os.path.exists(target_file):
        print(f"Không tìm thấy file Excel tại {target_file}")
        return
        
    try:
        wb = openpyxl.load_workbook(target_file)
        ws = wb.active
        
        thin_border = Border(
            left=Side(style='thin', color='D9D9D9'),
            right=Side(style='thin', color='D9D9D9'),
            top=Side(style='thin', color='D9D9D9'),
            bottom=Side(style='thin', color='D9D9D9')
        )
        
        updated = 0
        now_str = datetime.datetime.now().strftime("%d/%m %H:%M")
        
        for r in range(2, ws.max_row + 1):
            t_val = ws.cell(row=r, column=2).value
            if not t_val:
                continue
            ticker = str(t_val).strip()
            
            if ticker in cache:
                info = cache[ticker]
                b_type = info.get('bctc_type', 'DAY_DU')
                title = info.get('title', '')
                date_pub = info.get('date', '')
                doc_url = info.get('doc_url', '')
                
                # Cột 10: Ngày CB
                c10 = ws.cell(row=r, column=10)
                c10.value = date_pub
                c10.alignment = Alignment(horizontal='center', vertical='center')
                c10.border = thin_border
                c10.fill = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
                c10.font = Font(name="Calibri", size=10, bold=True, color="B25900")
                
                # Cột 11: Tài liệu
                c11 = ws.cell(row=r, column=11)
                c11.value = title
                c11.alignment = Alignment(horizontal='left', vertical='center')
                c11.border = thin_border
                if doc_url:
                    c11.hyperlink = doc_url
                    c11.font = Font(name="Calibri", size=10, color="0563C1", underline="single")
                    
                # Cột 12: Trạng thái
                c12 = ws.cell(row=r, column=12)
                c12.alignment = Alignment(horizontal='center', vertical='center')
                c12.border = thin_border
                if b_type == 'HOP_NHAT':
                    c12.value = "🔥 ĐÃ CÓ BCTC HỢP NHẤT"
                    c12.font = Font(name="Calibri", size=10, bold=True, color="006100")
                    c12.fill = PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid")
                elif b_type == 'RIENG':
                    c12.value = "⚡ MỚI CÓ BCTC RIÊNG (Chờ HN)"
                    c12.font = Font(name="Calibri", size=10, bold=True, color="B25900")
                    c12.fill = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
                else:
                    c12.value = "🔥 ĐÃ CÓ BCTC ĐẦY ĐỦ"
                    c12.font = Font(name="Calibri", size=10, bold=True, color="006100")
                    c12.fill = PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid")
                    
                # Cột 13: Giờ
                c13 = ws.cell(row=r, column=13)
                c13.value = now_str
                c13.alignment = Alignment(horizontal='center', vertical='center')
                c13.border = thin_border
                c13.font = Font(name="Calibri", size=9, color="8C8C8C")
                
                updated += 1
                
        wb.save(target_file)
        print(f"✅ Đã đồng bộ thành công {updated} mã vào Excel: {os.path.basename(target_file)}")
    except PermissionError:
        print("⚠️ Vui lòng đóng file Excel trước khi chạy đồng bộ!")
    except Exception as e:
        print(f"Lỗi đồng bộ: {e}")

if __name__ == '__main__':
    main()
