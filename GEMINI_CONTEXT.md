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
| **Tech stack** | Next.js **16.3.0** (App Router, Turbopack), React **19**, TypeScript **5.7.3**, Tailwind CSS **v4** (OKLCH, chủ đạo emerald / teal), pnpm |
| **Dữ liệu Báo cáo** | Google Drive API **v3** (folder ID `1eI8C_uDJlKDvNbzF9YOOr6QNCUIdw7o8`), file báo cáo là Google Docs (export text/plain). **STATIC SNAPSHOT** — `data/reports-snapshot.json` (**94 báo cáo, 81 mã unique**) |
| **Dữ liệu XNK** | `data/customs_trade_snapshot.json` (2511 rows + 5108 ma trận + 13 kỳ cán cân) → `/api/customs-trade` |
| **Dữ liệu Cảng Biển** | SQLite `data/maritime.db` (WAL mode) + JSON Snapshots `data/maritime/` (15 cảng vụ, 12 mã cổ phiếu cảng biển & vận tải biển: `PHP`, `GMD`, `DVP`, `DXP`, `MIPEC`, `SGP`, `PDN`, `CDN`, `HAH`, `VGR`, `CQN`, `PSP`, 147+ hồ sơ tàu biển, 259+ lượt điều động tàu thực tế) |
| **UI** | shadcn/ui (`@base-ui/react`, cva, clsx, tailwind-merge), lucide-react, `tw-animate-css`, **Recharts 3.10.1** (biểu đồ cán cân XNK), **Custom SVG High-Performance Charts** (biểu đồ sản lượng DWT cảng biển) |
| **Fonts** | Inter (latin + vietnamese), JetBrains Mono |
| **Format số** | vi-VN: dấu chấm nghìn, dấu phẩy thập phân; giá theo **nghìn đồng/cổ phiếu**; vốn hóa tỷ đồng; trọng tải DWT / lượt tàu |
| **Định vị sản phẩm** | Bộ lọc định giá cổ phiếu + kho báo cáo phân tích + thống kê XNK Hải quan + tình báo hàng hải & dữ liệu vận hành cảng biển |

### Cách chạy dev
- **Lệnh dùng được**: `pnpm dev` hoặc `node node_modules\next\dist\bin\next dev` (chạy tại `localhost:3000`)
- `next.config.mjs`: `images.unoptimized: true` (đã validate TypeScript lúc build).
- `package.json`: `engines.node >=20`, `packageManager: pnpm@11.20.0`; lockfile: `pnpm-lock.yaml`.
- **Cập nhật dữ liệu Cảng biển**: `python scripts/cangbien/run_pipeline.py` (quét trực tiếp Cảng vụ Hải Phòng & Hoa tiêu Miền Nam, cập nhật SQLite và JSON snapshots).
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
    CVHH[Cảng vụ Hải Phòng] --> HP_SCRAPER[cvhh_haiphong_scraper.py]
    PILOT[Hoa tiêu Miền Nam] --> SOUTH_SCRAPER[pilot_south_scraper.py]
    DLCB[Dữ liệu DLCB 15 cảng vụ + 12 mã] --> DLCB_COLLECTOR[dlcb_collector.py]
    HP_SCRAPER & SOUTH_SCRAPER & DLCB_COLLECTOR --> M_DB[(data/maritime.db)]
    M_DB --> M_SNAP[data/maritime/*.json]
    M_SNAP --> LIB_M[lib/maritime.ts & lib/maritime-types.ts]
    LIB_M --> PAGE_CANGBIEN[/cang-bien Hub]
    LIB_M --> PAGE_STOCK_PORT[/cang/[ticker] Deep Dive]
    LIB_M --> PAGE_VESSEL[/cang-bien/tau Vessel Search]
    LIB_M --> PAGE_SOURCE[/cang-bien/nguon-du-lieu]
  end
```

### 2.2 Module Cảng Biển & Tình Báo Hàng Hải (`scripts/cangbien/` & `data/maritime/`)
- **Database Schema (`scripts/cangbien/schema.sql`)**: 7 bảng SQLite (`port_authorities`, `stocks`, `berths`, `vessels`, `port_calls`, `stock_metrics_monthly`, `port_authority_metrics_monthly`).
- **Berth Mapper (`scripts/cangbien/berth_mapper.py`)**: Tự động nhận diện tên bến thô từ cảng vụ và map về đúng mã cổ phiếu (`PHP`, `GMD`, `DVP`, `DXP`, `MIPEC`, `SGP`, `PDN`, `CDN`, `HAH`, `VGR`, `CQN`, `PSP`, `TCL`).
- **Data Loaders (`lib/maritime.ts` & `lib/maritime-types.ts`)**: Tách riêng types và client formatters (`formatDWT`, `formatCalls`) khỏi server-only file loader để tối ưu Turbopack.

---

## 3. Danh mục Component & Trang

### 3.1 Pages (`app/`)

| File | Loại | Trạng thái & Mô tả |
|---|---|---|
| `app/layout.tsx` | Server (root) | ✅ Layout toàn site: fonts Inter/JetBrains, `themeScript`, `<SiteFooter/>`, `@vercel/analytics`. |
| `app/page.tsx` | Server | ✅ Trang chủ: `SiteHeader` + `HomeKpis` + `Screener`. |
| `app/bao-cao/page.tsx` | Client (Suspense) | ✅ Kho báo cáo: tìm kiếm, sort, 4 Tab lọc (Tất cả / Cổ phiếu / Hàng hóa / Vĩ mô). |
| `app/bao-cao/[slug]/page.tsx` | Server (async) | ✅ Viewer báo cáo + `<ReportAudioPlayer/>` (TTS) + `<DriveDocViewer/>`. |
| `app/ticker/[symbol]/page.tsx` | Server (async) | ✅ Trang chi tiết cổ phiếu định giá & BCTC. |
| `app/xuat-nhap-khau/page.tsx` | Server | ✅ Trang Thống Kê XNK: `<TradeBalanceChart/>` + `<CustomsTradeViewer/>`. |
| `app/cang-bien/page.tsx` | Server | ✅ **Trang Chủ Tình Báo Cảng Biển**: KPI toàn quốc, `<MaritimeStockGrid/>` (12 mã), `<LivePortCallsTable/>` (nhật ký tàu thực tế), `<PortAuthoritiesStrip/>` (15 Cảng vụ thu gọn/mở rộng ở đáy trang). |
| `app/cang/[ticker]/page.tsx` | Server (async) | ✅ **Trang Phân Tích Cảng Biển Từng Mã**: KPI tháng gần nhất, `<PortThroughputChart/>` (biểu đồ cột 218 tháng không giật), `<YoYThroughputComparison/>` (bảng so sánh 12 tháng cùng kỳ YoY), danh mục cầu bến & bến nước sâu, khung giá bốc dỡ QĐ 810/TT 39, và **Nhật ký 10 chuyến tàu gần nhất** kèm ngày giờ cụ thể. |
| `app/cang-bien/co-phieu/[ticker]/page.tsx` | Server | ✅ Route alias trỏ sang `/cang/[ticker]`. |
| `app/cang-bien/tau/page.tsx` | Server | ✅ **Tra Cứu Tàu Biển**: Lọc theo DWT, LOA, mớn nước, danh bạ 147+ hồ sơ tàu qua `<VesselSearchClient/>`. |
| `app/cang-bien/nguon-du-lieu/page.tsx` | Server | ✅ **Minh Bạch Nguồn Dữ Liệu**: Thuyết minh nguồn 15 Cảng vụ, Hoa tiêu Miền Bắc/Miền Nam, quy trình khử trùng lặp và làm sạch ISO UN/LOCODE. |

### 3.2 Components Cảng Biển (`components/cang-bien/`)

| File | Loại | Trạng thái & Mô tả |
|---|---|---|
| `MaritimeStockGrid.tsx` | Client | ✅ Lưới thẻ 12 mã cổ phiếu cảng biển & vận tải biển (`PHP`, `GMD`, `DVP`, `DXP`, `MIPEC`, `SGP`, `PDN`, `CDN`, `HAH`, `VGR`, `CQN`, `PSP`), gắn nhãn Cảng thuần / Đa cảng / Đội tàu, danh mục bến quản lý. |
| `LivePortCallsTable.tsx` | Client | ✅ Bảng nhật ký điều động tàu thực tế hôm nay từ Cảng vụ Hải Phòng & Hoa tiêu Miền Nam, lọc theo hướng (Vào/Ra/Dời bến) và mã cổ phiếu. |
| `PortThroughputChart.tsx` | Client | ✅ **Biểu đồ Cột SVG Hiệu Năng Cao**: Hiển thị chuỗi 218 tháng sản lượng tàu (Vào/Ra/Cả hai), **tách riêng Hitbox Layer tĩnh** chống hiện tượng giật giật (hover flicker) khi rê chuột, lọc 12m/24m/36m/All. |
| `YoYThroughputComparison.tsx` | Client | ✅ **Bảng So Sánh Cùng Kỳ YoY**: Dải 12 ô tháng `T1..T12` nằm ngang (Xanh ngọc / Vàng hổ phách đang chạy / Xám), bảng 4 cột (Năm trước, Năm nay, Tăng trưởng YoY `%`), hàng tổng kết lũy kế YTD, chuyển đổi Lượt Tàu ⟷ DWT, chọn cặp năm đối soát. |
| `PortAuthoritiesStrip.tsx` | Client | ✅ Khối thẻ 15 Cảng vụ Hàng hải đặt ở đáy trang `/cang-bien`, **thiết kế thu gọn (Collapsible/Accordion)** mặc định đóng gọn, bấm nút Mở rộng mới trải ra, có bộ lọc vùng miền (Bắc, Trung, Nam). |
| `NationalMaritimeMap.tsx` | Client | ✅ Bản đồ bờ biển Việt Nam SVG, thể hiện chủ quyền Hoàng Sa & Trường Sa, cột 3D DWT phát sáng. |

---

## 4. Tiến độ chi tiết (Status Checklist)

### ✅ Đã hoàn thành (Done)
- [x] Dựng khung Next.js 16 App Router + Tailwind v4 theme emerald + dark mode
- [x] API `/api/reports` + static snapshot `data/reports-snapshot.json` (94 báo cáo, 81 mã unique)
- [x] Bảng `Screener` trang chủ 7 cột + QuickJump + tìm kiếm header
- [x] Trang Thống Kê XNK `/xuat-nhap-khau` + biểu đồ cán cân Recharts 3 + module ETL `scripts/customs_etl/`
- [x] TTS nghe đọc báo cáo server-side Google Translate MP3 `/api/reports/[id]/audio`
- [x] Paywall 7 ngày dùng thử + VietQR TPBank (hiện `PAYWALL_ENABLED = false` mở tự do)
- [x] **Module Dữ Liệu Cảng Biển & Tình Báo Hàng Hải (2026-08-29)**:
  - [x] Reverse-engineer & xây dựng Scraper Engine (`scripts/cangbien/`) cào trực tiếp Cảng vụ Hải Phòng & Hoa tiêu Miền Nam
  - [x] Thiết kế SQLite database `data/maritime.db` (7 bảng) + JSON snapshots `data/maritime/`
  - [x] Bộ map bến cảng tự động `berth_mapper.py` sang 12 mã cổ phiếu
  - [x] Trang trung tâm `/cang-bien` với KPI, lưới 12 mã cổ phiếu, nhật ký tàu thật
  - [x] Trang chi tiết cổ phiếu `/cang/[ticker]` với biểu đồ cột SVG không giật + bến nước sâu + khung giá QĐ 810/TT 39
  - [x] **Bảng So Sánh Cùng Kỳ YoY** (`YoYThroughputComparison.tsx`): Dải 12 ô tháng nằm ngang chuẩn thiết kế, bảng 4 cột tăng trưởng `%`, hàng lũy kế YTD
  - [x] **Nhật ký 10 chuyến tàu gần nhất** kèm ngày giờ điều động cụ thể
  - [x] Tích hợp **Cảng MIPEC Hải Phòng (Đình Vũ)** vào danh mục
  - [x] Chuyển khối 15 Cảng vụ xuống đáy trang dạng **Thanh Thu Gọn (Collapsible)** chống chiếm diện tích
  - [x] Trang tra cứu tàu `/cang-bien/tau` (147+ hồ sơ tàu) & trang minh bạch `/cang-bien/nguon-du-lieu`
  - [x] Menu điều hướng "Cảng Biển" trên header
  - [x] Đóng gói, commit và push deploy thành công lên `dulieucophieu.com` (commit `d710fab`)

---

## 5. Nhật ký thay đổi kỹ thuật (Changelog)

> Ghi theo thứ tự mới → cũ. **Quy tắc (2026-08-15)**: chỉ cập nhật khi người dùng yêu cầu đích danh — thêm dòng mới vào đầu danh sách này.

| Timestamp | File(s) sửa | Nội dung thay đổi |
|---|---|---|
| 2026-08-29 | `scripts/cangbien/**` (mới) · `data/maritime/**` (mới) · `app/cang-bien/**` (mới) · `app/cang/**` (mới) · `components/cang-bien/**` (mới) · `lib/maritime*.ts` (mới) · `components/site-header.tsx` | **Triển khai toàn diện Hệ Thống Dữ Liệu Cảng Biển & Tình Báo Hàng Hải (`dulieucophieu.com/cang-bien`)**: <br>1. **Data Engine**: SQLite WAL `maritime.db`, scraper Cảng vụ Hải Phòng (`cvhh_haiphong_scraper.py`), Hoa tiêu Miền Nam (`pilot_south_scraper.py`), đồng bộ 15 cảng vụ & 12 mã cổ phiếu (`PHP`, `GMD`, `DVP`, `DXP`, `MIPEC`, `SGP`, `PDN`, `CDN`, `HAH`, `VGR`, `CQN`, `PSP`), `berth_mapper.py` regex Unicode map bến về mã CP.<br>2. **Trang Chủ `/cang-bien`**: KPI 15 cảng vụ, Lưới 12 mã cổ phiếu, Nhật ký tàu trực tiếp, khối 15 Cảng vụ dạng thanh thu gọn (Collapsible) ở đáy trang.<br>3. **Trang Cổ Phiếu `/cang/[ticker]`**: Biểu đồ cột SVG hiệu năng cao (tách riêng Hitbox chống giật khi hover), **Bảng So Sánh Cùng Kỳ YoY** (12 ô tháng nằm ngang, bảng 4 cột tăng trưởng %, lũy kế YTD), danh mục bến nước sâu & khung giá QĐ 810, **Nhật ký 10 chuyến tàu gần nhất** kèm ngày giờ cụ thể.<br>4. **Trang Bổ Trợ**: Tra cứu tàu `/cang-bien/tau` (147+ tàu), Nguồn dữ liệu `/cang-bien/nguon-du-lieu`. Header thêm menu "Cảng Biển". Đã push và deploy thành công lên Vercel (`d710fab`). |
| 2026-08-27 | `app/page.tsx` | **Ẩn phần tiêu đề và giới thiệu ở trang chủ**: Xóa khối heading chứa "Trang chủ · Sàng lọc định giá", H1 "Bộ Lọc Cổ Phiếu Giá Trị" và đoạn mô tả đồng bộ kho báo cáo để trang gọn gàng hơn. Push `f0f20d9`. |
| 2026-08-27 | `lib/auth-check.ts` | **Tạm tắt Paywall truy cập báo cáo**: Thêm hằng số `PAYWALL_ENABLED = false` làm công tắc linh hoạt cho phép mở toàn bộ bài phân tích trực tiếp mà không cần đăng nhập / kích hoạt dùng thử. Push `da5b2ea`. |
| 2026-08-23 | `app/api/reports/[id]/audio/route.ts` (mới) · `components/report-audio-player.tsx` | **Nâng cấp TTS sang Google Translate TTS Server-side (<4s)**: Xây dựng route `/api/reports/[id]/audio` trích xuất text báo cáo, cắt câu chunking <= 180 ký tự, tải song song 8 luồng từ Google Translate TTS, ghép buffer MP3 trả về `audio/mpeg`. Push `8e1e870`. |
| 2026-08-23 | `components/report-audio-player.tsx` (mới) · `app/api/reports/[id]/content/route.ts` (mới) · `app/bao-cao/[slug]/page.tsx` | **Nghe đọc báo cáo (TTS — Web Speech API)**: route export Google Doc text/plain → `{content}`; component `ReportAudioPlayer` phát âm thanh tiếng Việt. |
| 2026-08-23 | `app/xuat-nhap-khau/page.tsx` (mới) · `app/api/customs-trade/route.ts` (mới) · `components/customs-trade-viewer.tsx` (mới) · `components/TradeBalanceChart.tsx` (mới) · `components/site-header.tsx` | **Trang Thống Kê XNK + biểu đồ Cán cân**: route `/api/customs-trade` trả snapshot XNK; trang `/xuat-nhap-khau` render `TradeBalanceChart` + `CustomsTradeViewer`. |

---
*Cập nhật lần cuối: 2026-08-31 · Người duy trì: Nguyễn Trung Nhật (trungnhat232@gmail.com)*
