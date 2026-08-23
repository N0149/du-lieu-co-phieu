# Customs ETL — Backend ETL Thống kê Xuất nhập khẩu (TCHQ)

Giai đoạn 1: **Backfill dữ liệu lịch sử** — cào, bóc tách và nạp số liệu thống kê
xuất nhập khẩu định kỳ từ Tổng cục Hải quan Việt Nam vào **PostgreSQL / Supabase**.

## Cấu trúc

```
scripts/customs_etl/
├── data_raw/                # file tải về (.xlsx/.xls/.pdf) theo kỳ/năm
├── mappings/
│   ├── commodities.json     # Master Mapping: chuẩn hóa tên mặt hàng
│   └── countries.json       # Master Mapping: chuẩn hóa tên quốc gia/thị trường
├── database/
│   └── schema.sql           # Khởi tạo bảng Fact-Dim (Supabase/PostgreSQL 15+)
├── crawler.py               # cào danh sách + tải file từ web TCHQ
├── parser.py                # đọc/làm sạch Excel/PDF → dòng chuẩn hóa
├── loader.py                # upsert idempotent vào DB (ON CONFLICT DO UPDATE)
├── main.py                  # CLI điều khiển pipeline
└── requirements.txt
```

## Cài đặt

```bash
cd scripts/customs_etl
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

## Cấu hình Database

Tạo/biến env trong `.env` hoặc `.env.local` **ở thư mục gốc dự án** (máy tự đọc):

```
# Cách 1 — chuỗi kết nối
DATABASE_URL=postgresql://postgres.xxxx:password@aws-0-xx.pooler.supabase.com:6543/postgres

# Cách 2 — các thông số riêng
PGHOST=aws-0-xx.pooler.supabase.com
PGUSER=postgres
PGPASSWORD=...
PGPORT=6543
PGDATABASE=postgres
```

Khởi tạo bảng (chạy 1 lần):

```bash
python main.py --init-db --parse-and-load   # --init-db sẽ áp dụng database/schema.sql
# hoặc chạy trực tiếp schema:
# psql "$DATABASE_URL" -f database/schema.sql
```

## Sử dụng CLI

```bash
# Cào file thống kê 2020 → 2026 (retry + UA rotation + rate-limit)
python main.py --crawl --from-year 2020 --to-year 2026

# Chỉ parse data_raw (xem trước, không nạp DB)
python main.py --parse-only

# Parse + nạp vào DB (idempotent, chạy lại an toàn)
python main.py --parse-and-load

# Toàn bộ pipeline
python main.py --all --from-year 2018 --to-year 2026 --init-db

# Tiện ích
python main.py --list-files
python main.py --parse-and-load --limit 100     # chạy thử 100 dòng
```

## Mô hình dữ liệu

- `dim_commodities(id, code, name, category, unit)` — chiều mặt hàng.
- `dim_countries(id, iso_code, name, continent)` — chiều thị trường.
- `fact_customs_trade(id, period_type[KY_1|KY_2|THANG], period_date,
  commodity_id, country_id, trade_type[EXPORT|IMPORT],
  status[SO_BO|CHINH_THUC], quantity, value_usd, created_at, updated_at)`.

Một dòng fact là **theo mặt hàng** (country_id = NULL) **hoặc theo thị trường**
(commodity_id = NULL). Khóa duy nhất `(period_type, period_date, commodity_id,
country_id, trade_type, status)` với `NULLS NOT DISTINCT` hỗ trợ UPSERT idempotent
(yêu cầu PostgreSQL 15+ — đúng chuẩn Supabase hiện tại).

## Lưu ý vận hành

- **Crawler**: website TCHQ có thể đổi cấu trúc HTML. Nếu không tìm thấy bài viết,
  kiểm tra `CRAWL_CONFIG` (index_url, selector, từ khóa) trong `crawler.py`, hoặc
  tải tay file về `data_raw/YYYY_MM_KY1/` (xem `data_raw/README.md`).
- **Mapping**: thêm alias mới vào `mappings/*.json` khi gặp tên chưa chuẩn hóa.
  `canonical_name` là key unique trong bảng dim — không nên đổi sau khi đã nạp DB.
- **Số liệu**: giá trị số xử lý đa định dạng (1.234,56 / 1,234.56 / 1.234); dòng
  tổng cộng và dòng con bị lọc bỏ tự động.
