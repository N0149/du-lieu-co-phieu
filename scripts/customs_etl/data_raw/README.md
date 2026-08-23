# data_raw/ — Dữ liệu thô thống kê Xuất nhập khẩu (TCHQ)

Thư mục lưu các file tải về từ web Tổng cục Hải quan (`.xlsx`, `.xls`, `.pdf`).

## Quy ước đặt thư mục kỳ

Mỗi kỳ báo cáo là một thư mục con, định dạng:

```
data_raw/YYYY_MM_KY1/
data_raw/YYYY_MM_KY2/
data_raw/YYYY_MM_THANG/   (hoặc data_raw/YYYY_MM/ cho báo cáo tháng)
```

Ví dụ:
```
data_raw/
├── 2024_01_KY1/  xuat_khau_hang_hoa_ky_1_thang_1_nam_2024.xlsx
├── 2024_01_KY1/  nhap_khau_hang_hoa_ky_1_thang_1_nam_2024.xlsx
├── 2024_01_KY2/  ...
├── 2024_02_KY1/  ...
└── 2024_THANG_03/ ...
```

> `parser.py` đọc chuỗi `YYYY_MM_KY1` (hoặc `KY2`/`THANG`) từ **đường dẫn** để suy ra
> `period_type` và `period_date`. Nếu file nằm sai cấu trúc, parser sẽ báo lỗi rõ ràng.

## Cách nạp file thủ công (khi crawler không tự tải được)

1. Truy cập chuyên trang thống kê Hải quan:
   - https://www.customs.gov.vn
   - https://tongcuchaiquan.gov.vn
2. Tải các file `.xlsx` / `.xls` (ưu tiên) hoặc `.pdf` công bố số liệu XNK theo kỳ/tháng.
3. Đặt vào thư mục theo đúng quy ước trên.
4. Chạy `python main.py --parse-and-load` (đã cấu hình `DATABASE_URL`).
