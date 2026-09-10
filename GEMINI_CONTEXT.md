# GEMINI_CONTEXT.md — Ngữ cảnh đồng bộ dự án

> **Mục đích**: File duy nhất để mọi AI agent (Gemini, Copilot, Claude, Cursor...) nắm được 100% hiện trạng code của dự án **Phân Tích Chuyên Sâu Cổ Phiếu (dulieucophieu.com)**.
>
> **Quy tắc cập nhật (CẬP NHẬT 2026-08-15, theo `AGENTS.md`)**: **KHÔNG tự động cập nhật/đồng bộ/nhắc tới file này** sau mỗi lần sửa code — **CHỈ cập nhật khi người dùng yêu cầu đích danh** (vd "cập nhật GEMINI_CONTEXT.md", "đồng bộ ngữ cảnh", "cập nhật changelog").

---

## 1. Tổng quan

| Mục | Chi tiết |
|---|---|
| **Tên dự án** | Phân Tích Chuyên Sâu Cổ Phiếu — Cổng Dữ Liệu & Báo Cáo Đầu Tư (`dulieudautu.com` / `dulieucophieu.com`) |
| **Sáng lập / Người phụ trách** | Nguyễn Trung Nhật · Zalo **0983.627.018** · trungnhat232@gmail.com |
| **Tech stack** | Next.js **16.3.0** (App Router, Turbopack), React **19**, TypeScript **5.7.3**, Tailwind CSS **v4** (OKLCH, chủ đạo emerald / teal / dark oceanic), Node.js **22.x**, pnpm |
| **Xác thực & Watchlist** | **Supabase Auth & Database** (`@supabase/ssr`, `@supabase/supabase-js`): Đăng nhập email/Google, quản lý Watchlist cá nhân, nhập danh sách mã hàng loạt (Bulk Import), SSR tức thì 0ms, lọc tin tức & công bố theo watchlist |
| **Dữ liệu Giá Live** | Realtime Ticker API từ **24hMoney** (`lib/live-quote-service.ts`) → route `/api/stock/[symbol]/live-quote`, cache 60s in-memory, client polling tự động mỗi 60s |
| **Công Bố Thông Tin 3 Sàn** | Tích hợp tab Công Bố 3 Sàn (HOSE, HNX, UPCOM) mặc định tại trang chủ `/`, tự động revalidate ngầm, lọc theo sàn & loại tài liệu (BCTC, Nghị quyết HĐQT, giải trình...) → route `/api/disclosures` |
| **Bộ Lọc Cổ Phiếu WiData** | `/bo-loc` sàng lọc 1.530+ mã (HOSE, HNX, UPCOM) chuẩn WiData: P/E, P/B, ROE, biên LN, dòng tiền OCF, nợ/VCSH, tăng trưởng và tín hiệu kỹ thuật |
| **Tình Báo Cổ Phiếu Chuyên Sâu** | `/stock/[symbol]`: Header giá realtime 24hMoney (polling 60s), Biểu đồ giá & Giao dịch nội bộ (`InsiderTradingPriceChart`), Đồng thuận giá mục tiêu CTCK (`ConsensusTargetPriceChart`), Định giá P/E-P/B kết hợp EPS (`StockValuationEpsChart`), Bóc tách chuỗi/phân khúc kinh doanh (`MWGSegmentCharts`), Chỉ số tài chính chuẩn WiData (`WiDataFinancialRatiosDashboard`), Báo cáo ĐHĐCĐ (AGM) 2026 chi tiết (`StockAgmReportView`), BCTC chi tiết 16 năm |
| **Báo Cáo Phân Tích Doanh Nghiệp** | Tự động cào và cache báo cáo phân tích theo từng mã từ CTCK (`lib/company-reports-service.ts` → `/api/reports/company/[symbol]`), kết hợp kho tĩnh 94 báo cáo vĩ mô/ngành từ Google Drive (`data/reports-snapshot.json`) |
| **Dữ liệu XNK** | Snapshot 7 năm (2020–2026) `data/customs_trade_snapshot.json` + `data/customs_matrix_detail.json` → `/api/customs-trade` |
| **Dữ liệu Cảng Biển** | SQLite `data/maritime.db` (WAL mode) + JSON Snapshots `data/maritime/dashboard_summary.json` (15 cảng vụ, 12 mã cổ phiếu cảng biển & vận tải biển: `PHP`, `GMD`, `DVP`, `DXP`, `MIPEC`, `SGP`, `PDN`, `CDN`, `HAH`, `VGR`, `CQN`, `PSP`, 147+ hồ sơ tàu biển, 600+ lượt điều động tàu phân biệt không trùng lặp, theo dõi cước vận tải biển quốc tế BDI, WCI, BDTI, BCTI) |
| **UI & UX Responsive** | **Dark Oceanic Fintech Aesthetic**: Nền Deep Slate 950, hiệu ứng ngọc bích / lục bảo (Teal & Cyan Glow), bảng kính mờ Glassmorphism, mã cổ phiếu Neon Gradient. Hỗ trợ **Mobile Bottom Navigation Bar**, touch-friendly tabs docking, auto-adapting tab labels, scroll chevrons và mouse wheel navigation cho màn hình laptop |
| **Điều Hướng & Tìm Kiếm** | Sidebar dọc thu gọn/mở rộng (`VerticalSidebarNav` lưu `localStorage` & sync `data-sidebar`), Hộp tìm kiếm toàn diện Command Palette (`GlobalSearchModal`, phím tắt `Ctrl+K`) |
| **Fonts & Format số** | Inter, JetBrains Mono; format vi-VN: dấu chấm nghìn, dấu phẩy thập phân; giá nghìn đồng/cổ phiếu; vốn hóa tỷ đồng |
| **Định vị sản phẩm** | Cổng dữ liệu tài chính & đầu tư toàn diện: Công bố 3 sàn realtime + Bộ lọc WiData 1.530+ mã + Watchlist cá nhân + Tình báo cổ phiếu 360 + BCTC 16 năm + ĐHĐCĐ 2026 + Thống kê XNK Hải quan 7 năm + Tình báo hàng hải cảng biển |

### Cách chạy dev & Build
- **Lệnh dùng được**: `pnpm dev` hoặc `node node_modules\next\dist\bin\next dev` (chạy tại `localhost:3000`)
- `next.config.mjs`:
  - `poweredByHeader: false`, `serverExternalPackages: ['node:sqlite']`.
  - `outputFileTracingIncludes`: Tự động bundle các thư mục dữ liệu JSON (`financial_charts`, `valuation_history`, `dividend_history`, `segments`, `price_history`, `reports-snapshot.json`) cho route `/stock/[symbol]`.
  - `outputFileTracingExcludes`: Loại trừ các cache nặng cục bộ (`evaluation_cache`, `shareholder_cache`, `notes-cache`, `*.db`).
- `package.json`: `engines.node: "22.x"`, `packageManager: pnpm@11.20.0`; lockfile: `pnpm-lock.yaml`.
- **Tự động hóa CI/CD**: GitHub Actions `.github/workflows/sync-market-data.yml` chạy tự động quét thị trường, cảng biển và cập nhật JSON snapshots.
- **Vercel Deployment**: domain `dulieudautu.com`, `metadataBase` = https://dulieudautu.com, tự động deploy khi push lên nhánh `main`.

---

## 2. Kiến trúc & Luồng dữ liệu

### 2.1 Sơ đồ luồng tổng quan

```mermaid
flowchart TD
  subgraph AuthWatchlist [1. Supabase Auth & Watchlist Cá Nhân]
    USER[Người dùng / Nhà đầu tư] --> AUTH_MODAL[AuthModal / Google OAuth / Email Magic Link]
    AUTH_MODAL --> SB_AUTH[Supabase Auth - @supabase/ssr]
    SB_AUTH --> SB_DB[(Supabase DB: watchlists & watchlist_items)]
    SB_DB --> WL_SSR[Server-side SSR 0ms /danh-muc]
    WL_SSR --> WL_TABLE[WatchlistTable compact 100+ mã]
    WL_TABLE --> BULK_IMPORT[BulkImportModal: Nhập mã hàng loạt]
    SB_DB -.-> SYNC_FILTER[Lọc bài viết theo Watchlist tại Trang Chủ]
  end

  subgraph Disclosures [2. Công Bố Thông Tin 3 Sàn]
    EXCH[HOSE / HNX / UPCOM] --> SCRAPE_DISC[Cào & tổng hợp công bố]
    SCRAPE_DISC --> API_DISC[/api/disclosures/]
    API_DISC --> DISC_TAB[Tab Công Bố 3 Sàn mặc định tại Trang Chủ /]
    SYNC_FILTER -.-> DISC_TAB
  end

  subgraph Screener [3. Bộ Lọc Cổ Phiếu WiData 1.530+ Mã]
    WIDATA_SRC[Dữ liệu WiData: BCTC, Định giá, Kỹ thuật] --> API_SCREENER[/api/screener/stocks]
    API_SCREENER --> SCREENER_PAGE[/bo-loc WiData Screener]
  end

  subgraph DeepDive [4. Tình Báo Cổ Phiếu Chuyên Sâu /stock/symbol]
    LIVE_API[24hMoney Live Quote API] --> API_QUOTE[/api/stock/symbol/live-quote]
    API_QUOTE --> STOCK_HEADER[StockEvaluationHeader - polling 60s]
    
    FIN_DATA[data/financial_charts 16 năm] --> FIN_SVC[lib/financial-charts-service.ts]
    FIN_SVC --> FIN_CHARTS[GeneralDetailedFinancialCharts: 7 nhóm biểu đồ]
    
    VAL_DATA[data/valuation_history] --> VAL_SVC[lib/valuation-history-service.ts]
    VAL_SVC --> VAL_CHART[StockValuationEpsChart: P/E-P/B Bands + EPS]
    
    CONS_DATA[data/consensus_target_price] --> CONS_SVC[lib/consensus-target-price-service.ts]
    CONS_SVC --> CONS_CHART[ConsensusTargetPriceChart: Đồng thuận CTCK]
    
    INSIDER_DATA[data/insider_trading] --> INSIDER_SVC[lib/insider-trading-service.ts]
    INSIDER_SVC --> INSIDER_CHART[InsiderTradingPriceChart: Giao dịch nội bộ]
    
    SEGM_DATA[data/segments] --> SEGM_CHARTS[MWGSegmentCharts: Bóc tách chuỗi/phân khúc]
    
    AGM_DATA[data/agm_reports] --> AGM_VIEW[StockAgmReportView: ĐHĐCĐ 2026 chi tiết]
    
    CTCK_SCRAPE[Cào báo cáo phân tích mã] --> API_COMP_REP[/api/reports/company/symbol]
  end

  subgraph Reports [5. Kho Báo Cáo Phân Tích & AI]
    SNAP[data/reports-snapshot.json 94 báo cáo] --> API_REP[/api/reports/]
    API_REP --> BAOCAO[/bao-cao page + TTS Server-side]
    BAOCAO --> AI_RESEARCH[/nghien-cuu-ai Định giá RNAV]
  end

  subgraph Customs [6. Thống Kê XNK Hải Quan 7 Năm]
    XNK_SNAP[data/customs_trade_snapshot.json 2020-2026] --> API_XNK[/api/customs-trade/]
    API_XNK --> XNK_PAGE[/xuat-nhap-khau page]
  end

  subgraph Maritime [7. Tình Báo Cảng Biển & Hàng Hải]
    CVHH[Cảng vụ Hải Phòng & 14 cảng vụ] --> HP_SCRAPER[cvhh_haiphong_scraper.py]
    PILOT[Hoa tiêu Miền Nam - pilotcosouth] --> SOUTH_SCRAPER[pilot_south_scraper.py]
    DLCB[Master 15 cảng vụ + 12 mã niêm yết] --> DLCB_COLLECTOR[dlcb_collector.py]
    HP_SCRAPER & SOUTH_SCRAPER & DLCB_COLLECTOR --> DEDUPE[dedupe_port_calls]
    DEDUPE --> M_DB[(data/maritime.db)]
    M_DB --> M_SNAP[data/maritime/dashboard_summary.json]
    M_SNAP --> LIB_M[lib/maritime.ts & lib/maritime-types.ts]
    LIB_M --> PAGE_CANGBIEN[/cang-bien Hub]
    LIB_M --> PAGE_STOCK_PORT[/cang/ticker Deep Dive]
    LIB_M --> PAGE_VESSEL[/cang-bien/tau Vessel Search]
    LIB_M --> PAGE_SOURCE[/cang-bien/nguon-du-lieu]
  end
```

### 2.2 Hệ Thống Supabase Auth & Watchlist Cá Nhân
- **Kiến trúc Server-Side (`@supabase/ssr`)**: Sử dụng helper Supabase server/client chuẩn Next.js App Router với cơ chế đọc/ghi cookie an toàn (`lib/supabase/server.ts`, `lib/supabase/client.ts`).
- **Database Schema & RLS**:
  - `watchlists`: Lưu thông tin danh mục của từng `user_id`.
  - `watchlist_items`: Lưu các mã cổ phiếu (`symbol`, `added_at`, `target_price`, `notes`) liên kết với `watchlist_id`. Bảo vệ bằng Supabase Row Level Security (RLS) để người dùng chỉ thấy danh mục của chính mình.
- **Tối ưu Tốc Độ SSR 0ms (`/danh-muc`)**: Dữ liệu watchlist được nạp trực tiếp trong server component `app/danh-muc/page.tsx` qua `createServerClient`, chuyển thẳng sang `WatchlistTable` mà không phải chờ client fetch ngầm qua HTTP API.
- **Bulk Import**: Hỗ trợ dán hàng loạt mã cổ phiếu (phân cách bằng dấu phẩy, khoảng trắng, dấu chấm phẩy hoặc xuống dòng), tự động chuẩn hóa chữ hoa, lọc trùng và nhập chỉ trong 1 thao tác.
- **Tích Hợp Đồng Bộ Bộ Lọc Tin Tức**: Tab Tin Tức và Công Bố Thông Tin tại trang chủ `/` hỗ trợ checkbox lọc tin tức chỉ thuộc các mã trong Watchlist của người dùng.

### 2.3 Hệ Thống Giao Diện Đa Thiết Bị (Responsive Layout)
- **Desktop Sidebar Dọc (`VerticalSidebarNav.tsx`)**:
  - Tích hợp thanh điều hướng cố định bên trái, hỗ trợ thu gọn (icon only) hoặc mở rộng (đầy đủ nhãn).
  - Tự động lưu trạng thái đóng/mở vào `localStorage` (`sidebar_collapsed`) và cập nhật thuộc tính `data-sidebar` lên phần tử root `<html>` để tránh chớp giật giao diện khi tải lại trang.
- **Mobile Bottom Navigation Bar (`MobileBottomNav.tsx`)**:
  - Thanh điều hướng cố định sát đáy màn hình trên thiết bị di động, tự động ẩn trên màn hình lớn (`md:hidden`).
  - Các nút truy cập nhanh: Trang chủ / Công bố, Bộ lọc WiData, Watchlist danh mục, Cảng biển, Tài khoản cá nhân.
- **Thanh Tab Trượt Ngang & Chevrons Điều Hướng (`HorizontalTabs`)**:
  - Các trang nhiều tab (`/stock/[symbol]`, `/cang-bien`) trang bị nút chevron trái/phải hỗ trợ cuộn mượt mà trên laptop và màn hình nhỏ, cùng hỗ trợ cuộn con lăn chuột ngang (mouse wheel navigation).
  - Cố định tab khi cuộn trang (touch-friendly docking) giúp người dùng dễ dàng chuyển qua lại giữa các nội dung phân tích.
- **Hộp Tìm Kiếm Toàn Diện Command Palette (`GlobalSearchModal.tsx`)**:
  - Kích hoạt qua tổ hợp phím `Ctrl+K` (hoặc `Cmd+K` trên Mac) hoặc nút tìm kiếm trên header.
  - Tìm kiếm tức thì mã cổ phiếu, doanh nghiệp, báo cáo phân tích, ngành nghề và cảng biển.

### 2.4 Module Cảng Biển & Tình Báo Hàng Hải (`scripts/cangbien/` & `data/maritime/`)
- **Database Schema (`scripts/cangbien/schema.sql`)**: 7 bảng SQLite (`port_authorities`, `stocks`, `berths`, `vessels`, `port_calls`, `stock_metrics_monthly`, `port_authority_metrics_monthly`).
- **Deduplication Engine (`scripts/cangbien/db.py`)**: Tự động nhận diện và gộp dữ liệu theo `(vessel_name, call_date, call_direction, scheduled_time)`, loại bỏ 100% bản ghi lặp.
- **Berth Mapper (`scripts/cangbien/berth_mapper.py`)**: Tự động nhận diện tên bến thô từ cảng vụ và map về đúng mã cổ phiếu (`PHP`, `GMD`, `DVP`, `DXP`, `MIPEC`, `SGP`, `PDN`, `CDN`, `HAH`, `VGR`, `CQN`, `PSP`, `TCL`).
- **Data Loaders (`lib/maritime.ts` & `lib/maritime-types.ts`)**: Tách riêng types và client formatters (`formatDWT`, `formatCalls`) khỏi server-only file loader để tối ưu Turbopack.

---

## 3. Danh mục Component & Trang

### 3.1 Pages (`app/`)

| File | Loại | Trạng thái & Mô tả |
|---|---|---|
| `app/layout.tsx` | Server (root) | ✅ Layout toàn site: fonts Inter/JetBrains, `themeScript`, `<VerticalSidebarNav/>`, `<MobileBottomNav/>`, `<GlobalSearchModal/>`, `<SiteFooter/>`, `@vercel/analytics`. |
| `app/page.tsx` | Server | ✅ **Trang chủ**: Mặc định hiển thị tab **Công Bố Thông Tin 3 Sàn** (HOSE, HNX, UPCOM) & tab **Tin Tức Thị Trường** realtime (`NewsDashboard`), tự động revalidate ngầm và lọc theo Watchlist cá nhân. |
| `app/danh-muc/page.tsx` | Server (async) | ✅ **Trang Watchlist Cá Nhân**: Nạp SSR 0ms, bảng compact tối ưu hiển thị 100+ mã cổ phiếu, quản lý danh mục, thêm/xóa mã, bulk import hàng loạt mã cổ phiếu. |
| `app/auth/login/page.tsx` | Client | ✅ **Trang Đăng Nhập / Đăng Ký**: Xác thực Supabase qua Magic Link Email và Google OAuth, chuẩn hóa callback redirect cho cả localhost và production `dulieudautu.com`. |
| `app/auth/callback/route.ts` | Server (route) | ✅ **OAuth Callback Route**: Trao đổi mã xác thực `code` lấy session Supabase và chuyển hướng người dùng về trang đích mong muốn. |
| `app/bo-loc/page.tsx` | Server | ✅ **Bộ Lọc Cổ Phiếu WiData**: Sàng lọc 1.530+ mã (HOSE, HNX, UPCOM) theo định giá, sinh lời, biên lợi nhuận, dòng tiền, nợ vay và tín hiệu kỹ thuật. |
| `app/tin-tuc/page.tsx` | Server | ✅ **Trang Tin Tức**: Dòng tin tài chính & bóc tách mã cổ phiếu realtime, tự động gắn thẻ doanh nghiệp. |
| `app/stock/[symbol]/page.tsx` | Server (async) | ✅ **Trang Chi Tiết Cổ Phiếu Chuyên Sâu**: Header giá realtime (`StockEvaluationHeader`), 7 tab nội dung chuyên sâu (Đánh giá 360, BCTC chuyên sâu 16 năm, Bóc tách chuỗi/phân khúc kinh doanh, Giao dịch nội bộ & Cổ đông, Định giá P/E-P/B Bands kết hợp EPS, Báo cáo ĐHĐCĐ 2026 chi tiết, Báo cáo phân tích CTCK). |
| `app/nghien-cuu-ai/page.tsx` | Server | ✅ **Trang Nghiên Cứu Định Giá RNAV**: Bóc tách giá trị ròng tài sản doanh nghiệp, mô hình RNAV và định giá chuyên sâu. |
| `app/thi-truong/page.tsx` | Server (async) | ✅ **Trang Thị Trường Tài Chính & Vĩ Mô**: Biến động thế giới, hàng hóa, tỷ giá, crypto, biểu đồ định giá P/E & P/B VN-Index từ 2005, báo cáo thị trường, thống kê dư nợ Margin 41 CTCK. |
| `app/nganh/page.tsx` | Server (async) | ✅ **Trang Bản Đồ Ngành & Vốn Hóa**: Cơ cấu vốn hóa, lợi nhuận, định giá P/E, P/B, ROE toàn bộ các ngành cấp 1 & cấp 2 trên TTCK Việt Nam. |
| `app/bao-cao/page.tsx` | Client (Suspense) | ✅ Kho 94 báo cáo phân tích: tìm kiếm, sort, 4 Tab lọc (Tất cả / Cổ phiếu / Hàng hóa / Vĩ mô). |
| `app/bao-cao/[slug]/page.tsx` | Server (async) | ✅ Viewer báo cáo + `<ReportAudioPlayer/>` (Google Translate TTS) + `<DriveDocViewer/>`. |
| `app/xuat-nhap-khau/page.tsx` | Server | ✅ Trang Thống Kê XNK: Cán cân và ma trận xuất nhập khẩu Hải quan 7 năm (2020-2026) qua `<TradeBalanceChart/>` + `<CustomsTradeViewer/>`. |
| `app/cang-bien/page.tsx` | Server | ✅ **Trang Chủ Tình Báo Cảng Biển**: Giao diện Dark Oceanic, `<SiteHeader/>` + Sub-nav, KPI toàn quốc, `<MaritimeStockGrid/>` (12 mã), `<LivePortCallsTable/>` (nhật ký tàu thời gian thực), `<PortAuthoritiesStrip/>` (15 Cảng vụ thu gọn/mở rộng). |
| `app/cang/[ticker]/page.tsx` | Server (async) | ✅ **Trang Phân Tích Cảng Biển Từng Mã**: KPI tháng gần nhất, `<PortThroughputChart/>` (biểu đồ cột SVG gradient không giật), `<YoYThroughputComparison/>` (bảng so sánh 12 tháng cùng kỳ YoY), danh mục cầu bến & bến nước sâu, khung giá bốc dỡ QĐ 810/TT 39, và **Nhật ký 10 chuyến tàu gần nhất**. |
| `app/cang-bien/tau/page.tsx` | Server | ✅ **Tra Cứu Tàu Biển**: Lọc theo DWT, LOA, mớn nước, danh bạ 147+ hồ sơ tàu qua `<VesselSearchClient/>`. |
| `app/cang-bien/nguon-du-lieu/page.tsx` | Server | ✅ **Minh Bạch Nguồn Dữ Liệu**: Thuyết minh nguồn 15 Cảng vụ, Hoa tiêu Miền Nam, quy trình khử trùng lặp và làm sạch ISO UN/LOCODE. |

### 3.2 Key API Routes (`app/api/`)

| File | Loại | Trạng thái & Mô tả |
|---|---|---|
| `app/api/disclosures/route.ts` | GET | ✅ **API Công Bố Thông Tin 3 Sàn**: Cung cấp danh sách công bố HOSE, HNX, UPCOM, hỗ trợ phân trang, lọc sàn, lọc loại tài liệu (BCTC, Nghị quyết HĐQT, giải trình...) và lọc theo mã cổ phiếu. |
| `app/api/stock/[symbol]/live-quote/route.ts` | GET | ✅ **API Giá Realtime**: Tích hợp 24hMoney Ticker API, cache 60s, cung cấp giá khớp, biên độ, % thay đổi và ngày giao dịch mới nhất. |
| `app/api/reports/company/[symbol]/route.ts` | GET | ✅ **API Báo Cáo Phân Tích Doanh Nghiệp**: Cào và tổng hợp báo cáo phân tích theo từng mã từ các CTCK lớn (VNDirect, SSI, HSC, Vietcap...), cache server-side. |
| `app/api/screener/stocks/route.ts` | GET | ✅ **API Bộ Lọc WiData**: Truy xuất dữ liệu lọc của 1.530+ mã cổ phiếu với đầy đủ chỉ số cơ bản, định giá và kỹ thuật. |
| `app/api/reports/[id]/audio/route.ts` | GET | ✅ **API TTS Google Translate**: Trích xuất nội dung văn bản báo cáo, chunking câu <= 180 ký tự, tải song song đa luồng và ghép buffer MP3 trả về audio stream. |
| `app/api/customs-trade/route.ts` | GET | ✅ **API Dữ Liệu XNK**: Phục vụ dữ liệu cán cân thương mại và ma trận mặt hàng xuất nhập khẩu 7 năm (2020-2026). |

### 3.3 Components Nổi Bật

| Thư mục / File | Trạng thái & Tính năng |
|---|---|
| `components/watchlist/WatchlistTable.tsx` | ✅ Bảng theo dõi cổ phiếu rút gọn (Compact View), tối ưu cho danh mục lớn từ 20 đến 100+ mã, hiển thị giá, biến động, khối lượng, P/E, P/B, ROE, thao tác nhanh. |
| `components/watchlist/BulkImportModal.tsx` | ✅ Modal nhập danh sách cổ phiếu hàng loạt, tự động bóc tách các ký tự ngăn cách, kiểm tra tính hợp lệ và thêm vào Watchlist chỉ trong 1 thao tác. |
| `components/auth/UserNav.tsx` | ✅ Khối điều hướng người dùng trên Header: hiển thị avatar, email, trạng thái đăng nhập, menu nhanh truy cập Watchlist và nút Đăng xuất. |
| `components/auth/AuthModal.tsx` | ✅ Modal đăng nhập nhanh dạng popup hỗ trợ cả đăng nhập qua Google OAuth và nhận Magic Link qua Email. |
| `components/stock/StockEvaluationHeader.tsx` | ✅ Thanh tiêu đề cổ phiếu chuyên sâu: hiển thị logo, tên công ty, giá realtime (polling ngầm 60s), badge % biến động, giá trần/sàn, P/E, P/B forward. |
| `components/stock/StockAgmReportView.tsx` | ✅ Trình xem báo cáo Đại hội đồng Cổ đông (AGM) 2026 chi tiết: bóc tách kế hoạch kinh doanh, cổ tức, ý kiến thảo luận của cổ đông và ban lãnh đạo. |
| `components/stock/ConsensusTargetPriceChart.tsx` | ✅ Biểu đồ đồng thuận giá mục tiêu của các CTCK so với thị giá hiện tại, kèm khuyến nghị Mua/Khả quan/Nắm giữ. |
| `components/stock/InsiderTradingPriceChart.tsx` | ✅ Biểu đồ trực quan hóa các đợt giao dịch của ban lãnh đạo và người nội bộ (Mua/Bán) trên trục thời gian biến động giá cổ phiếu. |
| `components/stock/StockValuationEpsChart.tsx` | ✅ Biểu đồ định giá P/E Bands và P/B Bands kết hợp đường tăng trưởng EPS lịch sử. |
| `components/stock/MWGSegmentCharts.tsx` | ✅ Biểu đồ bóc tách doanh thu, lợi nhuận và số lượng cửa hàng theo từng chuỗi/phân khúc kinh doanh (Thế Giới Di Động, Điện Máy Xanh, Bách Hóa Xanh, An Khang...). |
| `components/stock/WiDataFinancialRatiosDashboard.tsx` | ✅ Bảng chỉ số tài chính chuyên sâu chuẩn WiData: cơ cấu tài sản, nguồn vốn, khả năng thanh toán, vòng quay tài sản và đòn bẩy tài chính. |
| `components/stock/GeneralDetailedFinancialCharts.tsx` | ✅ Bộ 7 biểu đồ phân tích BCTC 16 năm: Cơ cấu doanh thu/LN, Cán cân tài sản, Cấu trúc nợ DuPont, Dòng tiền OCF/ICF/FCF, v.v. |
| `components/navigation/VerticalSidebarNav.tsx` | ✅ Sidebar dọc cố định, hỗ trợ thu nhỏ/mở rộng, lưu trạng thái vào `localStorage` và đồng bộ `data-sidebar` trên `<html>`. |
| `components/navigation/MobileBottomNav.tsx` | ✅ Thanh điều hướng đáy dành riêng cho điện thoại, tối ưu thao tác một tay. |
| `components/navigation/GlobalSearchModal.tsx` | ✅ Command Palette (phím tắt `Ctrl+K` / `Cmd+K`) tìm kiếm toàn diện cổ phiếu, báo cáo, ngành, cảng biển. |
| `components/cang-bien/**` | ✅ Hệ sinh thái trực quan hóa cảng biển: `MaritimeStockGrid`, `LivePortCallsTable`, `PortThroughputChart`, `YoYThroughputComparison`, `PortAuthoritiesStrip`. |

---

## 4. Tiến độ chi tiết (Status Checklist)

### ✅ Đã hoàn thành (Done)
- [x] **Hệ Thống Xác Thực Supabase & Watchlist Cá Nhân (2026-09-09 → 2026-09-10)**:
  - [x] Tích hợp Supabase Auth (`@supabase/ssr`) với Google OAuth & Magic Link Email.
  - [x] Thiết lập Database Supabase (`watchlists`, `watchlist_items`) kèm bảo mật RLS theo từng user.
  - [x] Xây dựng trang `/danh-muc` nạp SSR 0ms tốc độ tối đa, hiển thị bảng Watchlist tối ưu cho 100+ mã cổ phiếu.
  - [x] Tính năng Bulk Import: dán và nhập danh sách cổ phiếu hàng loạt vào danh mục theo định dạng tùy biến.
  - [x] Đồng bộ Watchlist thực tế của người dùng vào bộ lọc Tin Tức & Công Bố Thông Tin tại trang chủ.
  - [x] Chuẩn hóa URL redirect OAuth chính xác cho cả localhost và production domain `dulieudautu.com`.
- [x] **Công Bố Thông Tin 3 Sàn (2026-09-07 → 2026-09-08)**:
  - [x] Tích hợp tab Công Bố Thông Tin 3 Sàn (HOSE, HNX, UPCOM) mặc định ngay tại trang chủ `/`.
  - [x] Cơ chế live revalidation ngầm tự động cập nhật công bố mới nhất không cần tải lại trang.
  - [x] Bộ lọc theo sàn, theo loại tài liệu (BCTC, Nghị quyết, Giải trình...) và tìm kiếm theo mã cổ phiếu.
- [x] **Trang Chi Tiết Cổ Phiếu Chuyên Sâu 7 Tab (`/stock/[symbol]`)**:
  - [x] Header giá realtime từ 24hMoney Ticker API (`lib/live-quote-service.ts`) tự động polling 60s.
  - [x] Mở rộng 50+ Báo Cáo ĐHĐCĐ (AGM) 2026 chi tiết (`StockAgmReportView.tsx`).
  - [x] Biểu đồ Giao dịch nội bộ trực quan hóa trên đường giá (`InsiderTradingPriceChart.tsx`).
  - [x] Biểu đồ Đồng thuận giá mục tiêu các CTCK (`ConsensusTargetPriceChart.tsx`).
  - [x] Biểu đồ Định giá P/E-P/B Bands kết hợp EPS (`StockValuationEpsChart.tsx`).
  - [x] Bóc tách phân khúc chuỗi kinh doanh bán lẻ (`MWGSegmentCharts.tsx`).
  - [x] BCTC chuyên sâu 16 năm với 7 cụm biểu đồ phân tích (`GeneralDetailedFinancialCharts.tsx`).
  - [x] Tự động cào và tổng hợp báo cáo phân tích theo mã từ CTCK (`/api/reports/company/[symbol]`).
- [x] **Bộ Lọc Cổ Phiếu WiData 1.530+ Mã (`/bo-loc`)**:
  - [x] Sàng lọc 1.530+ mã trên cả 3 sàn (HOSE, HNX, UPCOM).
  - [x] Đầy đủ tiêu chuẩn lọc: P/E, P/B, ROE, Biên LN gộp/ròng, Tăng trưởng LN, Tỷ lệ Nợ/VCSH, Tín hiệu kỹ thuật.
- [x] **Tối Ưu Trải Nghiệm Giao Diện Đa Thiết Bị (Responsive UX)**:
  - [x] Mobile Bottom Navigation Bar giúp điều hướng thuận tiện trên điện thoại.
  - [x] Touch-friendly tabs docking, tự động co giãn nhãn tab trên màn hình nhỏ.
  - [x] Nút scroll chevrons và hỗ trợ cuộn con lăn chuột ngang cho người dùng laptop.
  - [x] Tối ưu chuyển tab tức thì 0ms với kiến trúc optimistic UI.
  - [x] Phục hồi Sidebar dọc (`VerticalSidebarNav`), lưu trạng thái đóng/mở trong `localStorage` và chống giật với `data-sidebar`.
  - [x] Command Palette tìm kiếm toàn diện `GlobalSearchModal` kích hoạt bằng `Ctrl+K`.
- [x] **Module Cảng Biển & Tình Báo Hàng Hải (`/cang-bien`)**:
  - [x] SQLite database `data/maritime.db` (7 bảng) + JSON snapshots `data/maritime/dashboard_summary.json`.
  - [x] Scraper engine cào Cảng vụ Hải Phòng, Hoa tiêu Miền Nam, khử trùng lặp `dedupe_port_calls`, 607+ chuyến tàu sạch và 147+ hồ sơ tàu biển.
  - [x] Theo dõi 12 doanh nghiệp cảng & vận tải biển (`PHP`, `GMD`, `DVP`, `DXP`, `MIPEC`, `SGP`, `PDN`, `CDN`, `HAH`, `VGR`, `CQN`, `PSP`).
  - [x] Chốt số liệu sản lượng Cảng MIPEC tháng 8/2026 (+50% YoY), chuyển tháng 9 sang trạng thái đang chạy.
  - [x] Biểu đồ cột SVG không giật (`PortThroughputChart`) và bảng so sánh cùng kỳ YoY 12 tháng.
- [x] **Thống Kê XNK Hải Quan 7 Năm (`/xuat-nhap-khau`)**:
  - [x] Tích hợp toàn bộ dữ liệu lịch sử XNK giai đoạn 2020–2026, cập nhật snapshot 7 năm và bộ lọc năm linh hoạt.
- [x] **Thị Trường Tài Chính & Vĩ Mô (`/thi-truong`) & Bản Đồ Ngành (`/nganh`)**:
  - [x] Định giá P/E-P/B VN-Index từ 2005, thống kê dư nợ margin 41 CTCK, tỷ giá, hàng hóa, crypto, bản đồ ngành cấp 1 & cấp 2.
- [x] **Tối Ưu Hóa Vercel Deployment**:
  - [x] Cấu hình `outputFileTracingIncludes` nạp đủ dữ liệu JSON cho route `/stock/[symbol]`.
  - [x] Loại trừ các thư mục cache nặng (`evaluation_cache`, `shareholder_cache`, `*.db`), kiểm soát payload build <15MB, deploy production Vercel ổn định 100%.

---

## 5. Nhật ký thay đổi kỹ thuật (Changelog)

> Ghi theo thứ tự mới → cũ. **Quy tắc (2026-08-15)**: chỉ cập nhật khi người dùng yêu cầu đích danh — thêm dòng mới vào đầu danh sách này.

| Timestamp | File(s) sửa | Nội dung thay đổi |
|---|---|---|
| 2026-09-10 (Tối) | `components/watchlist/BulkImportModal.tsx` (mới) · `components/watchlist/WatchlistTable.tsx` · `components/news-dashboard.tsx` · `app/danh-muc/page.tsx` · `lib/supabase/client.ts` · `GEMINI_CONTEXT.md` | **Bổ sung tính năng Bulk Import vào Watchlist, tối ưu bảng 100+ mã, sync bộ lọc vào Tin tức/Công bố & chuẩn hóa Redirect**: <br>1. **Bulk Import cổ phiếu**: Xây dựng `BulkImportModal` cho phép người dùng dán hàng loạt mã cổ phiếu (phân tách bởi dấu phẩy, khoảng trắng, xuống dòng...), tự động làm sạch và thêm vào Watchlist nhanh chóng. Push `a3174ed`.<br>2. **Bảng Watchlist Compact**: Tái thiết kế `WatchlistTable` với giao diện bảng tinh gọn, tối ưu hiển thị danh mục từ 20 đến 100+ mã cổ phiếu mà không bị quá tải giao diện. Push `7d928c1`.<br>3. **Đồng bộ Watchlist sang Tin Tức & Công Bố**: Bổ sung checkbox lọc tin tức và công bố thông tin chỉ hiển thị các bài viết liên quan đến danh mục cổ phiếu mà người dùng đang theo dõi trong Supabase Watchlist. Push `57e0a8b`.<br>4. **Chuẩn hóa Redirect Auth**: Cấu hình `redirectTo` nhận diện môi trường localhost (`http://localhost:3000/auth/callback`) hoặc production (`https://dulieudautu.com/auth/callback`). Push `18fac21`.<br>5. **SSR 0ms Watchlist**: Nạp danh mục trực tiếp từ Server Component với cookie session Supabase, render giao diện ngay lập tức mà không có độ trễ client-side. Push `bfb851c`. |
| 2026-09-09 | `lib/supabase/**` (mới) · `components/auth/**` (mới) · `app/auth/**` (mới) · `app/danh-muc/page.tsx` (mới) · `components/site-header.tsx` | **Tích hợp Supabase Auth & Hệ thống Watchlist cá nhân**: <br>1. Tích hợp `@supabase/ssr` và `@supabase/supabase-js`, cấu hình server client, browser client và middleware cookie session.<br>2. Xây dựng trang `/danh-muc` quản lý danh mục cổ phiếu cá nhân, bảo vệ bằng Supabase RLS.<br>3. Tạo `UserNav` trên Header hiển thị avatar, email, trạng thái đăng nhập và menu tài khoản; tích hợp `AuthModal` hỗ trợ Magic Link & Google OAuth. Push `b5ff28c`. |
| 2026-09-08 | `app/page.tsx` · `components/news-dashboard.tsx` · `app/api/disclosures/route.ts` · `data/agm_reports/**` · `components/stock/StockAgmReportView.tsx` | **Tích hợp Tab Công Bố Thông Tin 3 Sàn vào Trang Chủ & Mở rộng 50+ Báo Cáo ĐHĐCĐ 2026**: <br>1. Đưa tab **Công Bố Thông Tin 3 Sàn** (HOSE, HNX, UPCOM) làm tab mặc định trên trang chủ `/`, tích hợp live revalidation tự động cập nhật công bố mới nhất từ doanh nghiệp. Push `367e6be`, `839b943`.<br>2. Bổ sung kho dữ liệu 50+ báo cáo ĐHĐCĐ (AGM) 2026 chi tiết cho các doanh nghiệp lớn, tích hợp bộ lọc mã AGM và trình xem báo cáo ĐHĐCĐ chuyên sâu `StockAgmReportView`. Push `367e6be`. |
| 2026-09-07 | `components/mobile-bottom-nav.tsx` (mới) · `components/site-header.tsx` · `app/layout.tsx` · `components/stock/**` | **Tối ưu hóa giao diện đa thiết bị: Mobile Bottom Navigation, Touch Docking Tabs & Scroll Chevrons**: <br>1. Xây dựng `MobileBottomNav` gắn cố định đáy màn hình điện thoại với các phím tắt truy cập nhanh: Trang chủ, Bộ lọc WiData, Watchlist, Cảng biển, Tài khoản. Push `3109a20`.<br>2. Tối ưu thanh tab trượt ngang (Horizontal Tabs): tự động co giãn nhãn tab, bổ sung 2 nút chevron cuộn trái/phải và hỗ trợ cuộn con lăn chuột ngang trên laptop. Push `dd9a884`.<br>3. Tối ưu kiến trúc chuyển tab optimistic 0ms chống giật lag khi chuyển đổi giữa các màn hình phân tích. Push `3113e80`. |
| 2026-09-06 | `components/vertical-sidebar-nav.tsx` · `components/global-search-modal.tsx` · `components/stock/**` · `lib/financial-charts-service.ts` · `data/customs_trade_snapshot.json` | **Phục hồi toàn diện giao diện & Tính năng chuyên sâu**: <br>1. Khôi phục `VerticalSidebarNav` (sidebar dọc thu gọn/mở rộng, lưu `localStorage`, đồng bộ `data-sidebar` trên root HTML chống flash). Push `fb18180`.<br>2. Tích hợp `GlobalSearchModal` (Command Palette `Ctrl+K` tìm kiếm toàn diện mã cổ phiếu, báo cáo, ngành, cảng biển). Push `a6cd741`.<br>3. Khôi phục trọn vẹn 7 biểu đồ BCTC chuyên sâu 16 năm, biểu đồ định giá P/E-P/B Bands kết hợp EPS, biểu đồ giao dịch nội bộ và phân tích phân khúc chuỗi bán lẻ. Push `fb18180`.<br>4. Đồng bộ Bộ lọc WiData 1.530+ mã tại `/bo-loc`. Push `a6cd741`.<br>5. Cập nhật số liệu điều động tàu mới nhất đến ngày 06/09/2026 cho Cảng MIPEC và các cảng biển, sửa lỗi cú pháp JSON dữ liệu hàng hải. Push `24e6d25`, `b838e59`. |
| 2026-09-04 → 2026-09-05 | `scripts/customs_etl/**` · `data/customs_trade_snapshot.json` · `data/maritime/dashboard_summary.json` | **Tích hợp Dữ Liệu XNK Lịch Sử 7 Năm (2020-2026) & Cập Nhật Sản Lượng Cảng MIPEC Tháng 8**: <br>1. Nhập toàn bộ dữ liệu XNK 2020–2024 vào snapshot 7 năm và nâng cấp bộ lọc năm trên `/xuat-nhap-khau`. Push `244b5a8`.<br>2. Chốt số liệu sản lượng tháng 8/2026 cho Cảng MIPEC (+50% YoY) và chuyển tháng 9 sang trạng thái đang chạy. Push `6dcfdc2`.<br>3. Cập nhật lịch trình điều động tàu tự động qua CI/CD GitHub Actions. Push `8c3f129`, `34f4284`. |
| 2026-09-03 (Tối) | `lib/live-quote-service.ts` (mới) · `app/api/stock/[symbol]/live-quote/route.ts` (mới) · `components/stock/StockEvaluationHeader.tsx` · `lib/stock-evaluation-service.ts` · `lib/longlivestock.ts` · `.vercelignore` (mới) · `next.config.mjs` · `package.json` · `.gitignore` | **Tích hợp API cập nhật giá thời gian thực (Live Quote) & Khắc phục triệt để lỗi deployment Vercel**: <br>1. **Live Quote API**: Kết nối trực tiếp 24hMoney Ticker API qua `lib/live-quote-service.ts` (cache 60s in-memory), bóc tách giá khớp, biên độ, % thay đổi, ngày và giờ giao dịch thực tế.<br>2. **Auto-refresh Frontend**: `StockEvaluationHeader` tự động thăm dò `/api/stock/[symbol]/live-quote` mỗi 60s ngầm khi tab mở, hiển thị giá chuẩn VNĐ, pill % xanh/đỏ và ngày chốt phiên.<br>3. **Đồng bộ tính toán**: Tự động tính lại P/E, P/B và vốn hóa theo giá realtime; cập nhật nốt phiên mới vào chuỗi `price_weekly`.<br>4. **Sửa lỗi Vercel Deployment**: Thêm `.vercelignore` và `outputFileTracingExcludes` trong `next.config.mjs`, nâng cấp engine `node: 22.x`, gỡ bỏ hơn 3.000 file cache nặng (`evaluation_cache`, `shareholder_cache`, `*.db`) khỏi Git tracking, giảm dung lượng build từ >500MB xuống <15MB giúp Vercel build & deploy thành công 100% lên `dulieudautu.com`. Push `935051f`. |
| 2026-09-03 (Chiều) | `app/thi-truong/page.tsx` (mới) · `app/nganh/page.tsx` (mới) · `app/stock/[symbol]/page.tsx` · `components/market/**` · `components/industry/**` · `components/stock/**` · `lib/banking-service.ts` · `lib/ctck-service.ts` · `lib/pe-pb-service.ts` | **Triển khai hệ thống Thị Trường Vĩ Mô, Bản Đồ Ngành và Đánh Giá 360 Doanh Nghiệp**: <br>1. Xây dựng trang `/thi-truong` hiển thị biến động thế giới, hàng hóa, tỷ giá, định giá P/E-P/B VN-Index và thống kê margin 41 CTCK.<br>2. Xây dựng trang `/nganh` trực quan hóa cơ cấu ngành, vốn hóa, lợi nhuận và định giá.<br>3. Tái cấu trúc trang `/stock/[symbol]` thành hệ thống 6 tab chuyên sâu: Đánh giá 360, BCTC chuyên sâu, Kế hoạch KD, Cổ đông, Định giá P/E-P/B Bands, Báo cáo CTCK. Push `8e1ec7d`. |
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
*Cập nhật lần cuối: 2026-09-10 · Người duy trì: Nguyễn Trung Nhật (trungnhat232@gmail.com)*

