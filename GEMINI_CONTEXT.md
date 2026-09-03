# GEMINI_CONTEXT.md — Ngữ cảnh đồng bộ dự án

> **Mục đích**: File duy nhất để mọi AI agent (Gemini, Copilot, Claude, Cursor...) nắm được 100% hiện trạng code của dự án **Phân Tích Chuyên Sâu Cổ Phiếu (dulieucophieu.com)**.
>
> **Quy tắc cập nhật (CẬP NHẬT 2026-08-15, theo `AGENTS.md`)**: **KHÔNG tự động cập nhật/đồng bộ/nhắc tới file này** sau mỗi lần sửa code — **CHỈ cập nhật khi người dùng yêu cầu đích danh** (vd "cập nhật GEMINI_CONTEXT.md", "đồng bộ ngữ cảnh", "cập nhật changelog").

---

## 1. Tổng quan

| Mục | Chi tiết |
|---|---|
| **Tên dự án** | Phân Tích Chuyên Sâu Cổ Phiếu — Cổng Dữ Liệu & Báo Cáo Đầu Tư (`dulieucophieu.com`) |
| **Sáng lập / Người phụ trách** | Nguyễn Trung Nhật · Zalo **0983.627.018** · trungnhat232@gmail.com |
| **Tech stack** | Next.js **16.3.0** (App Router, Turbopack), React **19**, TypeScript **5.7.3**, Tailwind CSS **v4** (OKLCH, chủ đạo emerald / teal / dark oceanic), pnpm |
| **Dữ liệu Báo cáo** | Google Drive API **v3** (folder ID `1eI8C_uDJlKDvNbzF9YOOr6QNCUIdw7o8`), file báo cáo là Google Docs (export text/plain). **STATIC SNAPSHOT** — `data/reports-snapshot.json` (**94 báo cáo, 81 mã unique**) |
| **Dữ liệu XNK** | `data/customs_trade_snapshot.json` (2511 rows + 5108 ma trận + 13 kỳ cán cân) → `/api/customs-trade` |
| **Dữ liệu Cảng Biển** | SQLite `data/maritime.db` (WAL mode) + JSON Snapshots `data/maritime/dashboard_summary.json` (15 cảng vụ, 12 mã cổ phiếu cảng biển & vận tải biển: `PHP`, `GMD`, `DVP`, `DXP`, `MIPEC`, `SGP`, `PDN`, `CDN`, `HAH`, `VGR`, `CQN`, `PSP`, 147+ hồ sơ tàu biển, 395+ lượt điều động tàu phân biệt không trùng lặp) |
| **UI Theme** | **Dark Oceanic Fintech Aesthetic**: Nền Deep Slate 950, hiệu ứng ánh sáng ngọc bích / lục bảo (Teal & Cyan Glow), bảng kính mờ Glassmorphism, mã cổ phiếu Neon Gradient |
| **Fonts** | Inter (latin + vietnamese), JetBrains Mono |
| **Format số** | vi-VN: dấu chấm nghìn, dấu phẩy thập phân; giá theo **nghìn đồng/cổ phiếu**; vốn hóa tỷ đồng; trọng tải DWT / lượt tàu |
| **Định vị sản phẩm** | Bộ lọc định giá cổ phiếu + kho báo cáo phân tích + thống kê XNK Hải quan + tình báo hàng hải & dữ liệu vận hành cảng biển |

### Cách chạy dev
- **Lệnh dùng được**: `pnpm dev` hoặc `node node_modules\next\dist\bin\next dev` (chạy tại `localhost:3000`)
- `next.config.mjs`: `images.unoptimized: true` (đã validate TypeScript lúc build).
- `package.json`: `engines.node >=20`, `packageManager: pnpm@11.20.0`; lockfile: `pnpm-lock.yaml`.
- **Cập nhật dữ liệu Cảng biển thủ công**: `python scripts/cangbien/run_pipeline.py` (quét trực tiếp Cảng vụ Hải Phòng & Hoa tiêu Miền Nam, khử trùng lặp, cập nhật SQLite và JSON snapshots).
- **Tự động hóa CI/CD**: GitHub Actions `.github/workflows/sync-market-data.yml` chạy tự động **2 lần mỗi ngày (05:30 sáng và 16:30 chiều GMT+7)**.
- **Vercel**: domain `dulieucophieu.com`, `metadataBase` = https://dulieucophieu.com, tự deploy khi push `main`.

---

## 2. Kiến trúc & Luồng dữ liệu

### 2.1 Sơ đồ luồng tổng quan

```mermaid
flowchart TD
  subgraph Reports [1. Kho Báo Cáo Phân Tích]
    SNAP[data/reports-snapshot.json] --> API_REP[/api/reports/]
    API_REP --> HOOK[useReports hook]
    HOOK --> SCREENER[Screener trang chủ]
    HOOK --> BAOCAO[/bao-cao page]
  end

  subgraph Customs [2. Thống Kê XNK Hải Quan]
    XNK_SNAP[data/customs_trade_snapshot.json] --> API_XNK[/api/customs-trade/]
    API_XNK --> XNK_PAGE[/xuat-nhap-khau page]
  end

  subgraph Maritime [3. Tình Báo Cảng Biển & Hàng Hải]
    CVHH[Cảng vụ Hải Phòng - csdltau] --> HP_SCRAPER[cvhh_haiphong_scraper.py]
    PILOT[Hoa tiêu Miền Nam - pilotcosouth] --> SOUTH_SCRAPER[pilot_south_scraper.py]
    DLCB[Dữ liệu master 15 cảng vụ + 12 mã] --> DLCB_COLLECTOR[dlcb_collector.py]
    HP_SCRAPER & SOUTH_SCRAPER & DLCB_COLLECTOR --> DEDUPE[dedupe_port_calls]
    DEDUPE --> M_DB[(data/maritime.db)]
    M_DB --> M_SNAP[data/maritime/dashboard_summary.json]
    M_SNAP --> LIB_M[lib/maritime.ts & lib/maritime-types.ts]
    LIB_M --> PAGE_CANGBIEN[/cang-bien Hub]
    LIB_M --> PAGE_STOCK_PORT[/cang/[ticker] Deep Dive]
    LIB_M --> PAGE_VESSEL[/cang-bien/tau Vessel Search]
    LIB_M --> PAGE_SOURCE[/cang-bien/nguon-du-lieu]
  end
```

### 2.2 Module Cảng Biển & Tình Báo Hàng Hải (`scripts/cangbien/` & `data/maritime/`)
- **Database Schema (`scripts/cangbien/schema.sql`)**: 7 bảng SQLite (`port_authorities`, `stocks`, `berths`, `vessels`, `port_calls`, `stock_metrics_monthly`, `port_authority_metrics_monthly`).
- **Deduplication Engine (`scripts/cangbien/db.py`)**: Tự động nhận diện và gộp dữ liệu theo `(vessel_name, call_date, call_direction, scheduled_time)`, loại bỏ 100% bản ghi lặp.
- **Berth Mapper (`scripts/cangbien/berth_mapper.py`)**: Tự động nhận diện tên bến thô từ cảng vụ và map về đúng mã cổ phiếu (`PHP`, `GMD`, `DVP`, `DXP`, `MIPEC`, `SGP`, `PDN`, `CDN`, `HAH`, `VGR`, `CQN`, `PSP`, `TCL`).
- **Data Loaders (`lib/maritime.ts` & `lib/maritime-types.ts`)**: Tách riêng types và client formatters (`formatDWT`, `formatCalls`) khỏi server-only file loader để tối ưu Turbopack.

---

## 3. Danh mục Component & Trang

### 3.1 Pages (`app/`)

| File | Loại | Trạng thái & Mô tả |
|---|---|---|
| `app/layout.tsx` | Server (root) | ✅ Layout toàn site: fonts Inter/JetBrains, `themeScript`, `<SiteFooter/>`, `@vercel/analytics`. |
| `app/page.tsx` | Server | ✅ **Trang chủ**: Hiển thị trực tiếp Dòng Tin Tức Thị Trường & Công Bố Doanh Nghiệp realtime (`NewsDashboard`). |
| `app/bo-loc/page.tsx` | Server | ✅ **Bộ Lọc Cổ Phiếu**: `SiteHeader` + `HomeKpis` + `Screener` định giá RNAV & tài sản. |
| `app/tin-tuc/page.tsx` | Server | ✅ **Trang Tin Tức**: Dòng tin tài chính & bóc tách mã cổ phiếu realtime. |
| `app/bao-cao/page.tsx` | Client (Suspense) | ✅ Kho báo cáo: tìm kiếm, sort, 4 Tab lọc (Tất cả / Cổ phiếu / Hàng hóa / Vĩ mô). |
| `app/bao-cao/[slug]/page.tsx` | Server (async) | ✅ Viewer báo cáo + `<ReportAudioPlayer/>` (TTS) + `<DriveDocViewer/>`. |
| `app/ticker/[symbol]/page.tsx` | Server (async) | ✅ Trang chi tiết cổ phiếu định giá & BCTC. |
| `app/xuat-nhap-khau/page.tsx` | Server | ✅ Trang Thống Kê XNK: `<TradeBalanceChart/>` + `<CustomsTradeViewer/>`. |
| `app/cang-bien/page.tsx` | Server | ✅ **Trang Chủ Tình Báo Cảng Biển**: Giao diện Dark Oceanic, `<SiteHeader/>` + Sub-nav, KPI toàn quốc, `<MaritimeStockGrid/>` (12 mã), `<LivePortCallsTable/>` (nhật ký tàu thời gian thực), `<PortAuthoritiesStrip/>` (15 Cảng vụ thu gọn/mở rộng). |
| `app/cang/[ticker]/page.tsx` | Server (async) | ✅ **Trang Phân Tích Cảng Biển Từng Mã**: `<SiteHeader/>` + Sub-nav, KPI tháng gần nhất, `<PortThroughputChart/>` (biểu đồ cột SVG gradient không giật), `<YoYThroughputComparison/>` (bảng so sánh 12 tháng cùng kỳ YoY), danh mục cầu bến & bến nước sâu, khung giá bốc dỡ QĐ 810/TT 39, và **Nhật ký 10 chuyến tàu gần nhất** kèm ngày giờ cụ thể. |
| `app/cang-bien/co-phieu/[ticker]/page.tsx` | Server | ✅ Route alias trỏ sang `/cang/[ticker]`. |
| `app/cang-bien/tau/page.tsx` | Server | ✅ **Tra Cứu Tàu Biển**: `<SiteHeader/>` + Sub-nav, lọc theo DWT, LOA, mớn nước, danh bạ 147+ hồ sơ tàu qua `<VesselSearchClient/>`. |
| `app/cang-bien/nguon-du-lieu/page.tsx` | Server | ✅ **Minh Bạch Nguồn Dữ Liệu**: `<SiteHeader/>` + Sub-nav, thuyết minh nguồn 15 Cảng vụ, Hoa tiêu Miền Bắc/Miền Nam, quy trình khử trùng lặp và làm sạch ISO UN/LOCODE. |

### 3.2 Components Cảng Biển (`components/cang-bien/`)

| File | Loại | Trạng thái & Mô tả |
|---|---|---|
| `MaritimeStockGrid.tsx` | Client | ✅ Lưới thẻ 12 mã cổ phiếu cảng biển & vận tải biển, thiết kế Asset Terminal Dark Oceanic, mã Neon Gradient, nhãn Cảng thuần / Đa cảng / Đội tàu, danh mục bến quản lý. |
| `LivePortCallsTable.tsx` | Client | ✅ Bảng nhật ký điều động tàu thời gian thực Bloomberg-style glassmorphism từ Cảng vụ Hải Phòng & Hoa tiêu Miền Nam, huy hiệu Vào/Ra rực rỡ, lọc theo hướng và mã cổ phiếu. |
| `PortThroughputChart.tsx` | Client | ✅ **Biểu đồ Cột SVG Hiệu Năng Cao**: Hiển thị chuỗi 218 tháng sản lượng tàu (Vào/Ra/Cả hai), linear gradient đa sắc (Emerald In / Sky Out), **tách riêng Hitbox Layer tĩnh** chống hiện tượng giật giật (hover flicker) khi rê chuột, lọc 12m/24m/36m/All. |
| `YoYThroughputComparison.tsx` | Client | ✅ **Bảng So Sánh Cùng Kỳ YoY**: Dải 12 ô tháng `T1..T12` nằm ngang phát sáng (Đã chốt / Đang chạy / Chưa có), bảng 4 cột (Năm trước, Năm nay, Tăng trưởng YoY `%`), hàng tổng kết lũy kế YTD, chuyển đổi Lượt Tàu ⟷ DWT, chọn cặp năm đối soát. |
| `PortAuthoritiesStrip.tsx` | Client | ✅ Khối thẻ 15 Cảng vụ Hàng hải đặt ở đáy trang `/cang-bien`, **thiết kế thu gọn (Collapsible/Accordion)** mặc định đóng gọn, bấm nút Mở rộng mới trải ra, có bộ lọc vùng miền (Bắc, Trung, Nam). |

---

## 4. Tiến độ chi tiết (Status Checklist)

### ✅ Đã hoàn thành (Done)
- [x] Dựng khung Next.js 16 App Router + Tailwind v4 theme emerald + dark mode
- [x] API `/api/reports` + static snapshot `data/reports-snapshot.json` (94 báo cáo, 81 mã unique)
- [x] Bảng `Screener` trang chủ 7 cột + QuickJump + tìm kiếm header
- [x] Trang Thống Kê XNK `/xuat-nhap-khau` + biểu đồ cán cân Recharts 3 + module ETL `scripts/customs_etl/`
- [x] TTS nghe đọc báo cáo server-side Google Translate MP3 `/api/reports/[id]/audio`
- [x] Paywall 7 ngày dùng thử + VietQR TPBank (hiện `PAYWALL_ENABLED = false` mở tự do)
- [x] **Module Dữ Liệu Cảng Biển & Tình Báo Hàng Hải (2026-08-29 → 2026-09-01)**:
  - [x] Scraper Engine (`scripts/cangbien/`) cào trực tiếp Cảng vụ Hải Phòng & Hoa tiêu Miền Nam
  - [x] SQLite database `data/maritime.db` (7 bảng) + JSON snapshots `data/maritime/dashboard_summary.json`
  - [x] Bộ map bến cảng tự động `berth_mapper.py` sang 12 mã cổ phiếu
  - [x] **Đồng bộ Header & Sub-Navigation**: Gắn `SiteHeader` cố định trên tất cả các trang cảng biển kèm thanh Sub-nav tabs (Tổng quan / Tra cứu tàu / Nguồn dữ liệu)
  - [x] **Nâng cấp Theme Dark Oceanic Fintech**: Nền Deep Slate 950, ambient glow Teal & Cyan, thẻ Neon Gradient, bảng glassmorphism
  - [x] **Khử trùng lặp & Cập nhật đa ngày**: `dedupe_port_calls` loại bỏ 100% bản ghi lặp, quét multi-day (30/08, 31/08, 01/09, 02/09) với 395+ chuyến tàu sạch
  - [x] **Tự động hóa Cronjob**: GitHub Actions `.github/workflows/sync-market-data.yml` tự động cào 2 lần/ngày (05:30 và 16:30 GMT+7)
  - [x] Build Next.js 16 Turbopack thành công 100% (31/31 routes) và deploy lên `dulieucophieu.com`

---

## 5. Nhật ký thay đổi kỹ thuật (Changelog)

> Ghi theo thứ tự mới → cũ. **Quy tắc (2026-08-15)**: chỉ cập nhật khi người dùng yêu cầu đích danh — thêm dòng mới vào đầu danh sách này.

| Timestamp | File(s) sửa | Nội dung thay đổi |
|---|---|---|
| 2026-09-02 | `app/page.tsx` · `app/bo-loc/page.tsx` (mới) · `components/site-header.tsx` | **Cấu hình trang chủ (/) hiển thị trực tiếp Tab Tin Tức & di chuyển Bộ Lọc Cổ Phiếu sang (/bo-loc)**: <br>1. Đưa tab **Tin Tức** lên vị trí đầu tiên trên thanh menu điều hướng và trỏ trực tiếp về trang chủ `/`.<br>2. Cấu hình `app/page.tsx` nạp dữ liệu và hiển thị trực tiếp `NewsDashboard` (dòng tin tức tài chính & doanh nghiệp realtime, tự động bóc tách mã CK, lọc nguồn, bookmark, polling 60s).<br>3. Tạo trang `app/bo-loc/page.tsx` lưu giữ nguyên vẹn chức năng Bộ Lọc Cổ Phiếu + KPIs định giá RNAV.<br>4. Đồng bộ active state trên `SiteHeader` chuẩn xác cho cả desktop và mobile (`/` và `/tin-tuc` đều active Tin Tức, `/bo-loc` active Bộ Lọc Cổ Phiếu). |
| 2026-09-01 | `scripts/cangbien/db.py` · `run_pipeline.py` · `.github/workflows/sync-market-data.yml` · `data/maritime/dashboard_summary.json` | **Cập nhật dữ liệu tàu mới nhất (31/08, 01/09, 02/09), xử lý chống trùng lặp và cài đặt cron auto-sync**: <br>1. Thêm hàm `dedupe_port_calls` và nâng cấp `insert_port_call` trong `db.py` chống trùng lặp theo `(Tên tàu, Ngày, Giờ, Hướng, Cầu bến)`.<br>2. Mở rộng `run_pipeline.py` quét multi-day (offset -3 đến 1), cập nhật 395 lượt tàu phân biệt duy nhất.<br>3. Nâng cấp GitHub Actions workflow chạy tự động 2 lần mỗi ngày (05:30 và 16:30 GMT+7) để tự động cào và deploy lên `dulieucophieu.com`. Push `1ba5545`. |
| 2026-08-31 | `app/cang-bien/**` · `app/cang/**` · `components/cang-bien/**` | **Nâng cấp giao diện sang theme Dark Oceanic Fintech & đồng bộ Header toàn site**: <br>1. Gắn `SiteHeader` và thanh Sub-nav tabs (Tổng quan / Tra cứu tàu / Nguồn dữ liệu) trên tất cả các trang cảng biển.<br>2. Chuyển đổi toàn bộ giao diện sang Dark Oceanic: Nền Deep Slate 950, ambient glow Teal & Cyan, thẻ Neon Gradient, bảng Bloomberg Terminal glassmorphism.<br>3. Tối ưu biểu đồ cột SVG gradient đa sắc và dải tháng T1-T12 nằm ngang. Push `6d5f88f` → `d86b78f`. |
| 2026-08-29 | `scripts/cangbien/**` (mới) · `data/maritime/**` (mới) · `app/cang-bien/**` (mới) · `app/cang/**` (mới) · `components/cang-bien/**` (mới) · `lib/maritime*.ts` (mới) · `components/site-header.tsx` | **Triển khai toàn diện Hệ Thống Dữ Liệu Cảng Biển & Tình Báo Hàng Hải (`dulieucophieu.com/cang-bien`)**: Data engine SQLite, scraper Cảng vụ HP & Hoa tiêu Miền Nam, 12 mã cổ phiếu cảng biển, biểu đồ SVG không giật, bảng so sánh cùng kỳ YoY, 10 chuyến tàu gần nhất, Cảng MIPEC Đình Vũ. Push `d710fab`. |
| 2026-08-27 | `app/page.tsx` | **Ẩn phần tiêu đề và giới thiệu ở trang chủ**: Xóa khối heading chứa "Trang chủ · Sàng lọc định giá", H1 "Bộ Lọc Cổ Phiếu Giá Trị" và đoạn mô tả đồng bộ kho báo cáo để trang gọn gàng hơn. Push `f0f20d9`. |
| 2026-08-27 | `lib/auth-check.ts` | **Tạm tắt Paywall truy cập báo cáo**: Thêm hằng số `PAYWALL_ENABLED = false` làm công tắc linh hoạt cho phép mở toàn bộ bài phân tích trực tiếp mà không cần đăng nhập / kích hoạt dùng thử. Push `da5b2ea`. |
| 2026-08-23 | `app/api/reports/[id]/audio/route.ts` (mới) · `components/report-audio-player.tsx` | **Nâng cấp TTS sang Google Translate TTS Server-side (<4s)**: Xây dựng route `/api/reports/[id]/audio` trích xuất text báo cáo, cắt câu chunking <= 180 ký tự, tải song song 8 luồng từ Google Translate TTS, ghép buffer MP3 trả về `audio/mpeg`. Push `8e1e870`. |
| 2026-08-23 | `components/report-audio-player.tsx` (mới) · `app/api/reports/[id]/content/route.ts` (mới) · `app/bao-cao/[slug]/page.tsx` | **Nghe đọc báo cáo (TTS — Web Speech API)**: route export Google Doc text/plain → `{content}`; component `ReportAudioPlayer` phát âm thanh tiếng Việt. |
| 2026-08-23 | `app/xuat-nhap-khau/page.tsx` (mới) · `app/api/customs-trade/route.ts` (mới) · `components/customs-trade-viewer.tsx` (mới) · `components/TradeBalanceChart.tsx` (mới) · `components/site-header.tsx` | **Trang Thống Kê XNK + biểu đồ Cán cân**: route `/api/customs-trade` trả snapshot XNK; trang `/xuat-nhap-khau` render `TradeBalanceChart` + `CustomsTradeViewer`. |

---
*Cập nhật lần cuối: 2026-09-02 · Người duy trì: Nguyễn Trung Nhật (trungnhat232@gmail.com)*
