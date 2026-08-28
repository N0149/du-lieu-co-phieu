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
| **Tech stack** | Next.js **16.3.0** (App Router), React **19**, TypeScript **5.7.3**, Tailwind CSS **v4** (OKLCH, chủ đạo emerald), pnpm |
| **Dữ liệu** | Google Drive API **v3** (folder ID `1eI8C_uDJlKDvNbzF9YOOr6QNCUIdw7o8`), file báo cáo là Google Docs (export text/plain). **Cơ chế hiện tại: STATIC SNAPSHOT** — `data/reports-snapshot.json` (**94 báo cáo, 81 mã unique** — đã parse) phục vụ trực tiếp; Drive chỉ gọi khi bật live / chạy script refresh. **XNK**: `data/customs_trade_snapshot.json` = `{generated_at, rows, matrix_rows, trade_balance}` (2511 rows + 5108 ma trận + 13 kỳ cán cân) → `/api/customs-trade` |
| **UI** | shadcn/ui (`@base-ui/react`, cva, clsx, tailwind-merge), lucide-react, `tw-animate-css`, **Recharts 3.10.1** (biểu đồ cán cân thương mại) |
| **Fonts** | Inter (latin + vietnamese), JetBrains Mono |
| **Format số** | vi-VN: dấu chấm nghìn, dấu phẩy thập phân; giá theo **nghìn đồng/cổ phiếu**; vốn hóa tỷ đồng |
| **Định vị sản phẩm** | Bộ lọc cổ phiếu định giá hấp dẫn + kho báo cáo phân tích (cổ phiếu, hàng hóa & ngành, kinh tế vĩ mô) |

### Cách chạy dev
- **Lệnh dùng được**: `pnpm dev` hoặc `node node_modules\next\dist\bin\next dev` (chạy tại `localhost:3000`) — **xác minh OK 2026-08-22** (Next.js 16.3.0 Turbopack, ready ~7.7s).
- `next.config.mjs`: `images.unoptimized: true` (đã **bỏ** `typescript.ignoreBuildErrors` — build production validate TypeScript).
- `package.json`: `engines.node >=20`, `packageManager: pnpm@11.20.0`; `pnpm-workspace.yaml` chứa `overrides: {hono: 4.12.25}` + `allowBuilds: {msw: true}` (pnpm 11 bỏ qua field `pnpm` trong package.json). Lockfile: **chỉ `pnpm-lock.yaml`** (đã xóa `package-lock.json`).
- Biến môi trường: `GOOGLE_DRIVE_API_KEY` + `GOOGLE_DRIVE_FOLDER_ID` trong `.env.local` (đã gitignore; template ở `.env.example`).
- **Cập nhật dữ liệu**: `node scripts/refresh-snapshot.mjs` → lấy mới từ Drive (qua local, `?live=1`), ghi `data/reports-snapshot.json`, rồi **commit + push** để Vercel deploy lại.
- **Vercel**: domain `dulieucophieu.com`, `metadataBase` = https://dulieucophieu.com, tự deploy khi push `main`. LƯU Ý env `GOOGLE_DRIVE_FOLDER_ID` trên Vercel từng bị gõ sai (lỗi 400) → đã vô hiệu hóa bằng cơ chế snapshot.

---

## 2. Kiến trúc & Luồng dữ liệu

### 2.1 Sơ đồ luồng

```mermaid
flowchart LR
  SNAP[data/reports-snapshot.json<br/>94 báo cáo đã parse] -->|import tĩnh, MẶC ĐỊNH| API[/api/reports<br/>app/api/reports/route.ts/]
  REFRESH[scripts/refresh-snapshot.mjs<br/>node scripts/refresh-snapshot.mjs] -. ?live=1 .-> API
  DRIVE[Google Drive folder<br/>1eI8C_uDJlKDvNbzF9YOOr6QNCUIdw7o8] -. live mode<br/>REPORTS_SOURCE=live / ?live=1 .-> API
  API -->|JSON: slug, ticker, title, category, date,<br/>reportDate, summary?, targetPrice?, currentPrice?,<br/>recommendation?, upside?, bonusWelfareRate?| HOOK[useReports hook<br/>lib/use-reports.ts]
  HOOK --> SCREENER[Screener<br/>components/screener.tsx]
  HOOK --> KPI[HomeKpis<br/>components/home-kpis.tsx]
  HOOK --> QJ[QuickJump<br/>components/stock-search.tsx]
  HOOK --> SEARCH[StockSearch header]
  HOOK --> BAOCAO[/bao-cao page<br/>app/bao-cao/page.tsx/]
  BAOCAO --> DETAIL[/bao-cao/[slug]/<br/>DriveDocViewer iframe/]
```

### 2.2 API dữ liệu báo cáo — `app/api/reports/route.ts`

**Cơ chế STATIC SNAPSHOT (MẶC ĐỊNH — hiện tại):**
- `GET` phục vụ file `data/reports-snapshot.json` (snapshot đã parse sẵn, hiện **94 báo cáo — 81 mã unique**) → **KHÔNG gọi Google Drive lúc chạy**, không cần env → hoạt động ổn định tuyệt đối trên Vercel.
- Header response `x-reports-source: snapshot`; `export const dynamic = "force-dynamic"` (chống static-cache lúc build).

**Chế độ LIVE (tùy chọn — gọi Drive API lúc chạy):**
- Kích hoạt khi env `REPORTS_SOURCE=live` **hoặc** query `?live=1` (script refresh dùng cách này).
- `GET` quét **toàn bộ** file trong folder bằng vòng lặp `pageToken`/`nextPageToken` (`pageSize: 1000`), `orderBy: modifiedTime desc`, lọc `trashed = false`.
- **Bóc nội dung**: `getDocContent(docId)` export `text/plain` qua `https://www.googleapis.com/drive/v3/files/{id}/export?mimeType=text/plain` (`cache: "no-store"`).
- **Log lỗi chi tiết** `[reports] ...`: log số file Drive trả về, in **full JSON lỗi** + URL đã gọi (che API key), cảnh báo khi env folder khác folder mặc định, gợi ý sửa env khi gặp 400.
- **Fallback**: thiếu API key / Drive lỗi → `STATIC_REPORTS` (14 báo cáo cổ phiếu, không có trường định giá).
- **Phân loại báo cáo theo tiền tố tên file** (type `ParsedReport`, regex `/^\s*\[([A-Za-z0-9_]{1,16})\]\s*(.+)$/`):
  - `[VIMO_...]` → `category: 'macro'`, `ticker: null`
  - `[HANGHOA_...]` → `category: 'commodity'`, `ticker: null`
  - `[MÃ_CK]` → `category: CATEGORY_BY_TICKER[mã] ?? "Phân Tích"`, `ticker: mã`
  - Tên không ngoặc vuông → heuristic cũ (token in hoa 2–5 ký tự + số, kể cả mã 1 chữ+số như `S55`/`M10`, trừ `TICKER_STOP_WORDS`: RNAV, BCTC, CTY, KCN, BĐS, YOY, TNDN, LNST, EPS, PE, PB, Q1..Q4, NĐT, ROE; bỏ prefix "Bản sao của ").
- **Dedupe**: key = `ticker ?? category` + `title` chuẩn hóa, ưu tiên file mới nhất.
- `summary` chỉ tính cho bài macro/commodity (qua `extractSummary`); `parseValuation` chỉ chạy cho cổ phiếu.

### 2.3 Logic Regex bóc tách định giá (mẫu chuẩn UIC)

Chạy trên **5000 ký tự đầu** nội dung, sau khi `stripAnnotations()` (lọc ¹²³ / [1] / *).

| Trường | Pattern / Logic |
|---|---|
| **Giá TT** (giá hiện tại) | `CURRENT_PRICE_PATTERNS`: "giá đóng cửa hiện tại" → "thị giá hiện tại" → "giá thị trường" → "giá hiện tại", hỗ trợ khoảng giá & "xoay quanh mốc/ở mức/khoảng" |
| **Giá MT** (giá mục tiêu) | `TARGET_PRICE_PATTERNS`: "giá mục tiêu (Target Price)" / "mức giá mục tiêu", **xử lý cụm thời hạn** `\d+ (năm|tháng|thang)` (vd "GIÁ MỤC TIÊU 1 NĂM: 38.500" → 38.5, tránh bắt nhầm "1" của "1 NĂM") |
| **Chống bắt nhầm tỷ lệ** | `extractPrice()` kiểm tra ký tự ngay sau số trong văn bản gốc: nếu là `x`/`%` (P/B 1.0x, P/E 10x, 10%) → **loại bỏ** (chỉ loại khi số không kết thúc bằng dấu ngăn cách câu `,`/`.`); kèm **backstop** trong `parseValuation()`: `target < current * 0.3` → coi là nhiễu, trả null |
| **Upside** | `UPSIDE_PATTERNS`: "tỷ suất sinh lời kỳ vọng" (chuẩn FPTS) / "mức sinh lời kỳ vọng (Upside)" / "upside" / "tiềm năng tăng giá" → **ưu tiên bóc trực tiếp**, fallback tự tính `((target-current)/current)*100` |
| **Khuyến nghị** | `extractRecommendation()`: sau "khuyến nghị" → fallback từ khóa in hoa (`MUA | KHẢ QUAN | NẮM GIỮ | THEO DÕI`), xử lý "MUA (Chiến lược Trend Trade)" → MUA |
| **Ngày báo cáo** | `createdTime` (thời gian TẠO file) + 7h (GMT+7) → `toReportDate()` → **DD/MM/YYYY**, alias `reportDate` |
| **Trích quỹ KTPL** (tỷ lệ khen thưởng phúc lợi) | `extractBonusWelfareRate()` — **quy chuẩn đơn giản 1 regex**: `/(?:KTPL|Khen thưởng phúc lợi|Quỹ KTPL)\s*[:=-]\s*(\d+(?:[.,]\d+)?)\s*%/i` (vd "KTPL: 10%" / "Khen thưởng phúc lợi = 4,93%"); số VN/international (7,5 / 7.5 / 10) → %; **không khớp → null** (Screener hiển thị "—"). Chạy trên toàn văn, chỉ báo cáo cổ phiếu (vĩ mô/hàng hóa = null). |

Hỗ trợ số VN: `parseVnd()` ("55.000"/"55,000" → 55000; "82.5"/"82,5" → 82.5); `resolvePrice()` xử lý khoảng "34.100 - 34.500" → trung bình, quy đổi nghìn (số > 1000 chia 1000), loại dấu câu cuối `[.,]$`.

### 2.4 Layer ghép dữ liệu hiển thị

- `lib/use-reports.ts`: `useReports()` → `{ reports: Report[], byTicker: Map, loading }`; `reportHref(ticker)` → luôn `/bao-cao?ticker=MÃ`. **`Report.ticker` là `string | null`** (null với bài vĩ mô/hàng hóa); `byTicker` bỏ qua bài không có mã.
- `lib/report-stocks.ts`: `reportTickers()` (mã unique, bỏ null), `buildReportStocks()` ghép báo cáo + dữ liệu tài chính `lib/data.ts` (mã chưa có data → name=ticker, sector="Chưa phân loại", số liệu null); `marketPriceOf()` = currentPrice(báo cáo) ?? marketPrice(stocks); `upsideOf()` = `((target-price)/price)*100` (target = targetPrice ?? rnav); `priceToRnavOf()` an toàn null.
- `lib/data.ts`: **14 cổ phiếu** DAN, LHG, SNZ, VNF, DC4, NT2, IDC, BCM, DPR, PPC, TIP, HND, SZC, KBC + `SECTORS` + `upside()/priceToRnav()/marginOfSafety()/getStock()/getDeepDive()`. **NT2: `marketPrice: 21.2`** (đã cập nhật từ 19.8).
- `lib/report.ts`: đọc `data/{TICKER}.json` + `content/{TICKER}-*.mdx`; `RESEARCH_REPORTS[]` (metadata tĩnh trùng API); `getResearchReportBySlug`.

---

## 3. Danh mục Component & Trang

### 3.1 Pages (`app/`)

| File | Loại | Trạng thái & Mô tả |
|---|---|---|
| `app/layout.tsx` | Server (root) | ✅ Layout toàn site: fonts Inter/JetBrains, `themeScript` (localStorage `rnav-theme` + prefers-color-scheme), `<SiteFooter/>`, `@vercel/analytics` (chỉ production). Metadata: "Phân Tích Chuyên Sâu Cổ Phiếu - Cổng Dữ Liệu & Báo Cáo Đầu Tư". |
| `app/page.tsx` | Server | ✅ Trang chủ: `SiteHeader` + `HomeKpis` + `Screener` + ghi chú (đã ẩn khối tiêu đề/giới thiệu). |
| `app/bao-cao/page.tsx` | Client (Suspense) | ✅ Kho báo cáo: tìm kiếm + sort + **4 Tab lọc** (Tất cả / Cổ phiếu / Hàng hóa & Ngành / Kinh tế Vĩ mô). Card cổ phiếu: badge mã emerald + Giá MT + Upside. Card macro/commodity: badge tím/cam + title + summary + ngày. Đọc `?ticker=`/`?search=`. |
| `app/bao-cao/[slug]/page.tsx` | Server (async) | ✅ `await params`, slug = `driveDocId`. **BẢO VỆ PAYWALL**: server đọc cookie qua `getCurrentUser()` + `checkUserAccess()` — nếu `TRIAL_ACTIVE`/`SUBSCRIPTION_ACTIVE` hoặc `PAYWALL_ENABLED=false` → render `<ReportAudioPlayer/>` (Nghe đọc báo cáo — Google Translate TTS server-side) + `<DriveDocViewer/>` iframe Google Docs; ngược lại (`UNAUTHENTICATED`/`EXPIRED`) → render `<Paywall status>` thay nội dung tài liệu (không thể bypass từ client). |
| `app/ticker/[symbol]/page.tsx` | Server (async) | ✅ `generateStaticParams` từ `stocks`; header cổ phiếu + metric grid + giá vs RNAV bar + `<TickerTabs/>`. |
| `app/danh-muc/page.tsx` | Server | ✅ Watchlist tĩnh: DAN, LHG, SNZ, VNF, DC4, NT2 → link `/ticker/{MÃ}`. |
| `app/dieu-khoan/page.tsx` | Server | ✅ Trang Điều khoản sử dụng (tĩnh). |
| `app/chinh-sach-bao-mat/page.tsx` | Server | ✅ Trang Chính sách bảo mật (tĩnh). |
| `app/lien-he/page.tsx` | Server | ✅ Liên hệ: thẻ người phụ trách, Zalo, Email, thẻ ngân hàng BIDV (1260202954 — NGUYEN TRUNG NHAT) + `CopyButton`. |
| `app/api/reports/route.ts` | Route handler | ✅ API báo cáo — **phục vụ static snapshot** mặc định (`data/reports-snapshot.json`), chế độ live qua `REPORTS_SOURCE=live`/`?live=1` (xem mục 2.2). |
| `app/api/auth/session/route.ts` | Route handler | ✅ API session (**DEMO — thay bằng auth thật sau**): `GET` → `{user, access}`; `POST` action `start_trial` (tạo 7 ngày dùng thử) / `activate` (VIP — cho admin) / `logout`. `force-dynamic`, set cookie httpOnly `dulieucophieu_session`. |
| `app/xuat-nhap-khau/page.tsx` | Server | ✅ **Trang Thống Kê XNK**: `<TradeBalanceChart/>` (biểu đồ cán cân — truyền `snapshot.trade_balance` server→client) phía trên `<CustomsTradeViewer/>` (bảng dữ liệu 2511 dòng). |
| `app/api/customs-trade/route.ts` | Route handler | ✅ API snapshot XNK: trả `{generated_at, rows, trade_balance}` mặc định (bỏ `matrix_rows` để nhẹ), `?include_matrix=1` kèm ma trận 5108 dòng. `force-dynamic`. |
| `app/api/reports/[id]/content/route.ts` | Route handler | ✅ **API nội dung báo cáo (TTS text)**: export Google Doc `text/plain` (`drive/v3/files/{id}/export?mimeType=text/plain&key=GOOGLE_DRIVE_API_KEY`) → `{content}`; `force-dynamic`, cache no-store; 400 thiếu id / 500 thiếu key. |
| `app/api/reports/[id]/audio/route.ts` | Route handler | ✅ **API TTS Audio (Server-side)**: Bóc text báo cáo, cắt câu <= 180 ký tự (max 2500 ký tự đầu), tải song song 8 requests Google Translate TTS (`translate.google.com/translate_tts`), ghép MP3 trả về client (`audio/mpeg`). `maxDuration = 60`. |

### 3.2 Components (`components/`)

| File | Loại | Trạng thái & Mô tả |
|---|---|---|
| `site-header.tsx` | Client | ✅ Header sticky: brand "Phân Tích Chuyên Sâu **Cổ Phiếu**" (responsive: mobile `text-lg` hiển thị ngắn "Phân Tích Chuyên Sâu", sm+ `text-xl` hiển thị đầy đủ; icon TrendingUp emerald giữ nguyên), `StockSearch`, nav **4 mục** (Bộ Lọc Cổ Phiếu / Danh Mục Theo Dõi / Báo Cáo Phân Tích / **Thống Kê XNK** → `/xuat-nhap-khau`), **`TrialBadge`** (cạnh `ThemeToggle`), mobile search row. |
| `stock-search.tsx` | Client | ✅ `StockSearch`: dropdown gợi ý (searchPool = mã báo cáo + stocks, keyboard nav, Enter/submit). `QuickJump`: tag `<Link>` tới `/bao-cao?ticker=MÃ`. |
| `screener.tsx` | Client | ✅ Bảng **7 cột**: Mã CK (link + badge "Báo cáo" → `/bao-cao?ticker=MÃ`, stretched-link phủ cả dòng), Tên doanh nghiệp (`w-[140px] max-w-[150px] truncate`), Ngày báo cáo (vị trí 3, DD/MM/YYYY), Giá TT, Giá MT, Trích quỹ KTPL (`fmtRate`), Upside (`fmtPct`). **ĐÃ XÓA sidebar bộ lọc + 3 cột Ngành/Khuyến nghị/Trạng thái**. Nguồn = `buildReportStocks(reports)`. State mặc định `sortKey='reportDate'` + `sortOrder='desc'` (đổi tên từ `sortDir`); comparator `reportDateToTimestamp()` parse DD/MM/YYYY → timestamp để mã mới nhất lên đầu. `ITEMS_PER_PAGE = 20`. 3 hàng fallback Loading (khi `loading`) / No data / Empty page đều `colSpan={7}`. |
| `home-kpis.tsx` | Client | ✅ KPI **1 card duy nhất** "Cổ phiếu trong danh mục" (số mã = `buildReportStocks(reports).length`, font-mono lớn `fmtInt`) — đã bỏ undervalued / avgUpside / avgDiv + component Kpi (tinh gọn trang chủ). |
| `ticker-tabs.tsx` | Client | ✅ 3 tabs: Tổng quan & Luận điểm / Báo cáo Tài chính / Thuyết minh BCTC. |
| `DriveDocViewer.tsx` | Client | ✅ **Viewer** Google Docs (iframe preview + spinner + nút "Mở trong Google Docs"). |
| `site-footer.tsx` | Server | ✅ Footer: khung "Tuyên bố miễn trách nhiệm" (3 đoạn), người phụ trách + Zalo/Email, bản quyền © 2026, nav link phụ. |
| `badges.tsx` | — | ✅ `StatusTag` (Cập nhật BCTC) + `MosBadge` (biên an toàn 4 bậc). |
| `theme-toggle.tsx` | Client | ✅ Toggle light/dark, localStorage `rnav-theme`. |
| `copy-button.tsx` | Client | ✅ Nút copy (Clipboard API + fallback execCommand, "Đã sao chép"). |
| `ui/button.tsx` | — | ✅ shadcn Button (Base UI), variants + sizes. |
| `TrialBadge.tsx` | Client | ✅ Badge trạng thái dùng thử/VIP trên header: fetch `GET /api/auth/session` sau mount → UNAUTH: outline "Dùng thử 7 ngày" (mở modal); TRIAL_ACTIVE: emerald "Dùng thử: còn X ngày"; SUBSCRIPTION_ACTIVE: primary "Thành viên VIP"; EXPIRED: warning "Hết hạn dùng thử" (click mở modal nâng cấp). `hidden sm:inline-flex` (ẩn mobile); skeleton khi loading. |
| `Paywall.tsx` | Client | ✅ Khối nâng cấp / khóa nội dung: TPBank 0000 4944 263 / NGUYEN TRUNG NHAT / cú pháp [DULIEUCOPHIEU - Email hoặc Mã User] + ảnh **mã VietQR** `public/qr-tpbank.jpg` (next/image) + CopyButton + Zalo 0983.627.018 + nút "Bắt đầu 7 ngày dùng thử" (POST start_trial + router.refresh()). Prop `variant='page'|'modal'` (page = card độc lập trên [slug]; modal = phẳng trong PaywallModal). Heading phân biệt EXPIRED ("...đã kết thúc") / UNAUTH ("Vui lòng đăng nhập..."). |
| `PaywallModal.tsx` | Client | ✅ Modal nâng cấp VIP: backdrop `fixed inset-0 ... bg-black/60 backdrop-blur-xs` + khung `my-auto max-h-[90vh] flex-col` + header cố định (tiêu đề + badge "7 ngày dùng thử" + nút X) + nội dung `overflow-y-auto p-6 space-y-4`. **Render qua `createPortal(document.body)`** (header sticky có backdrop-filter tạo containing block → kẹt fixed modal; xem Changelog 2026-08-22). Đóng bằng X / Escape / click nền, khóa scroll body. |
| `TradeBalanceChart.tsx` | Client | ✅ **Biểu đồ Cán cân thương mại** (Recharts 3): prop `data: TradeBalancePoint[]` từ `snapshot.trade_balance`; tabs khu vực Tổng thể/Trong nước/FDI/So sánh; toggle **Dạng Cột** (cột XK emerald + NK rose trục trái, đường Cán cân amber trục phải) / **Dạng Đường** (đường XK/NK trục trái + **vùng Cán cân âm dương quanh trục 0** qua 2 `Area baseValue=0` cắt clipPath emerald/rose trục phải); khung thời gian **tách dứt chu kỳ**: `15d` chỉ Kỳ 1/2 · `month` chỉ THANG · `quarter`/`year` gộp THANG. Trục kép (trái XK/NK, phải cán cân), legend Recharts duy nhất (Area fill `legendType="none"`), tooltip custom (XK/NK/CB + % biến động). |
| `customs-trade-viewer.tsx` | Client | ✅ **Bảng dữ liệu thống kê XNK**: fetch `/api/customs-trade` → `data.rows`; lọc loại XK/NK, **phân loại** (Tổng thể/FDI/Theo Tỉnh/Thành/Vận tải/Chi tiết), kỳ (KY_1/KY_2/THANG/QUY — nhãn "Quý 1/2026"), tìm kiếm; **phân trang 50 dòng** (PAGE_SIZE=50), 3 SummaryCard, 8 cột. |
| `report-audio-player.tsx` | Client | ✅ **Nghe đọc báo cáo (TTS)**: Phát audio từ `/api/reports/[id]/audio` qua thẻ `<audio>` HTML5 (thay thế Web Speech API phụ thuộc thiết bị); điều khiển play/pause, seek tua tiến/lùi, tốc độ 0.75x–2.0x, thanh tiến trình thời gian. |

### 3.3 Libraries (`lib/`)

`data.ts` (14 mã + sectors + hàm định giá) · `report.ts` (BCTC JSON + MDX + RESEARCH_REPORTS) · `report-stocks.ts` (ghép dữ liệu bảng, có `bonusWelfareRate`) · `use-reports.ts` (hook + type `Report` có `bonusWelfareRate?`) · `format.ts` (fmtPrice/fmtNum/fmtInt/fmtPct/fmtBillion) · `utils.ts` (`cn()`) · **`auth-check.ts`** (logic thuần dùng chung client/server: `AccessStatus`, `UserProfile`, `TRIAL_DAYS=7`, `PAYWALL_ENABLED=false` tạm tắt paywall, `checkUserAccess()`, `canAccessReport()`, `SESSION_COOKIE_NAME`) · **`session.ts`** (SERVER-ONLY — import `next/headers`; `getCurrentUser()`, `setSessionCookie()` httpOnly, `clearSessionCookie()`, `parseUserProfile()`).

### 3.4 Ghi chú quan trọng
- **KHÔNG tồn tại** trong codebase: `ProtectedContent` (đề xuất trong yêu cầu gốc nhưng **chưa implement** → nằm Backlog). **`Paywall` đã implement (2026-08-22)** — khóa nội dung báo cáo chi tiết + hướng dẫn nâng cấp VIP. "Viewer" = `DriveDocViewer`.
- **Backend ETL (2026-08-22)**: `scripts/customs_etl/` — module Python (Giai đoạn 1: Backfill lịch sử) cào/bóc/nạp thống kê XNK TCHQ → PostgreSQL/Supabase (crawler/parser/loader/main + `database/schema.sql` + `mappings/*.json`). Chi tiết ở mục 5 Changelog.
- **XNK & TTS (2026-08-23)**: web `/xuat-nhap-khau` (bảng XNK + biểu đồ Cán cân) + TTS nghe đọc báo cáo (`ReportAudioPlayer`) — xem mục 3.1/3.2 + Changelog 2026-08-23.
- `data/VNF.json`: BCTC hợp nhất Q2/2026 đầy đủ (financialHighlights, balanceSheet, incomeStatement6M2026) — mẫu cho các mã khác.
- `content/VNF-Q2-2026.mdx`: bài phân tích MDX mẫu; chưa có bước parse MDX → tab Notes có thể hiện fallback.

---

## 4. Tiến độ chi tiết (Status Checklist)

### ✅ Đã hoàn thành (Done)
- [x] Dựng khung Next.js 16 App Router + Tailwind v4 theme emerald + dark mode
- [x] API `/api/reports`: quét Google Drive toàn bộ (pageToken loop), phân loại báo cáo, dedupe, cache 60s
- [x] Parser regex bóc tách định giá (Giá TT, Giá MT, Upside, Khuyến nghị, Ngày BC) — mẫu chuẩn UIC (current=55, target=82.5, rec=MUA, upside=50)
- [x] Hỗ trợ **Báo cáo Vĩ mô & Hàng hóa**: tiền tố `[VIMO_...]`/`[HANGHOA_...]` → category macro/commodity, `ticker: null`
- [x] `extractSummary()` — tóm tắt tự động cho bài macro/commodity
- [x] Trang `/bao-cao`: tìm kiếm + sort + **4 Tab lọc** + card phân biệt (cổ phiếu: Giá MT/Upside; macro/commodity: badge tím/cam + summary)
- [x] Trang chủ: `HomeKpis` (tự đếm từ kho báo cáo) + `Screener` + `QuickJump`
- [x] Bảng `Screener`: **7 cột** (Mã CK, Tên DN, Ngày báo cáo, Giá TT, Giá MT, Trích quỹ KTPL, Upside) — bỏ sidebar bộ lọc + 3 cột Ngành/Khuyến nghị/Trạng thái; sort mặc định `reportDate` desc; phân trang 20 mã/trang; hàng Loading/No data/Empty đều `colSpan={7}`
- [x] Tìm kiếm header hoạt động (Enter/submit, dropdown keyboard nav, điều hướng)
- [x] Đổi thương hiệu RNAV Value Capital → **Value Capital**
- [x] **Đổi thương hiệu → Phân Tích Chuyên Sâu Cổ Phiếu**: Header brand (responsive mobile/desktop) + `metadata.title` layout + title 3 trang tĩnh (Điều khoản/Bảo mật/Liên hệ) + **footer** (bản quyền "© 2026 Phân Tích Chuyên Sâu Cổ Phiếu", tuyên bố "được Phân Tích Chuyên Sâu Cổ Phiếu tổng hợp...") — **KHÔNG còn "Value Capital" trong code** (app/components/lib)
- [x] Footer mới + 3 trang tĩnh (Điều khoản, Bảo mật, Liên hệ)
- [x] Thông tin sáng lập + tài khoản ngân hàng + `CopyButton`
- [x] Cập nhật NT2 `marketPrice = 21.2` → bảng hiển thị Giá TT 21,2 / Giá MT 30,2 / Upside +42% / MUA
- [x] Bóc tách **tỷ lệ trích quỹ KTPL** (`extractBonusWelfareRate`) + thêm cột "Trích quỹ KTPL" trên Screener (9 → 10 cột, colSpan=10, SortKey `bonusWelfareRate`)
- [x] **Chuẩn bị deploy Vercel**: bỏ `typescript.ignoreBuildErrors`, `metadataBase` = dulieucophieu.com, `README.md`, `engines.node >=20`, xóa `package-lock.json`
- [x] **Fix `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`**: chuyển `overrides`/`allowBuilds` sang `pnpm-workspace.yaml`, thêm `packageManager: pnpm@11.20.0`, chạy `pnpm install --no-frozen-lockfile`
- [x] **Fix static-cache 14 mã trên Vercel**: `export const dynamic = "force-dynamic"`, bỏ `revalidate=60`, fetch `cache: "no-store"`
- [x] **Log lỗi Drive chi tiết** + cảnh báo folder ID sai — phát hiện `GOOGLE_DRIVE_FOLDER_ID` trên Vercel gõ sai → 400
- [x] **Chuyển cơ chế STATIC SNAPSHOT**: `data/reports-snapshot.json` (59 báo cáo) + `scripts/refresh-snapshot.mjs` + header `x-reports-source`
- [x] **Cập nhật dữ liệu mới (lịch sử)**: 59 báo cáo (thêm QTP, MCF có đầy đủ định giá); 15 targetPrice / 16 recommendation / 8 KTPL
- [x] **Cập nhật snapshot tự động (CI auto-refresh)**: **94 báo cáo (81 mã unique)**; 45 targetPrice / 29 recommendation / 15 KTPL / 39 currentPrice; ngày mới nhất 16/08/2026
- [x] **Tinh gọn trang chủ (3fa3193)**: `home-kpis.tsx` còn 1 card; `screener.tsx` bỏ sidebar + bỏ 3 cột Ngành/Khuyến nghị/Trạng thái → 7 cột; `PAGE_SIZE = 20`
- [x] **Đồng bộ bảng Screener (2d6b5d3 + 50d5674)**: sort mặc định `reportDate` desc; đổi tên state `sortDir`→`sortOrder`, `PAGE_SIZE`→`ITEMS_PER_PAGE`; cột Tên DN `w-[140px] max-w-[150px]`; Ngày báo cáo lên vị trí 3; thêm hàng Loading/No data/Empty `colSpan={7}`
- [x] **Khôi phục `pnpm dev`** (xác minh OK 2026-08-22)
- [x] **Trial 7 ngày + Paywall (2026-08-22)**: `lib/auth-check.ts` + `lib/session.ts` (server-only, cookie httpOnly `dulieucophieu_session`) + `app/api/auth/session` (demo: start_trial/activate/logout) + `components/Paywall.tsx`/`PaywallModal.tsx`/`TrialBadge.tsx`; bảo vệ `/bao-cao/[slug]` server-side (UNAUTH/EXPIRED → Paywall); header thêm TrialBadge. Production build: chỉ [slug] + /api/auth/session dynamic, còn lại static.
- [x] **Sửa UI Paywall (2026-08-22)**: modal chống che phần đầu (backdrop overflow-y-auto + khung my-auto + header cố định); thêm ảnh **mã VietQR TPBank** `public/qr-tpbank.jpg`; tên NH "TPBank (Ngân hàng TMCP Tiên Phong)"; **`createPortal`** thoát containing block của header (backdrop-filter).
- [x] **Backend ETL thống kê XNK (2026-08-22)**: `scripts/customs_etl/` (crawler/parser/loader/main + schema + mappings) — Giai đoạn 1 Backfill lịch sử TCHQ → PostgreSQL/Supabase. Smoke test parser PASS; chưa cài psycopg2 (trong requirements).
- [x] **Trang Thống Kê XNK + biểu đồ Cán cân (2026-08-23)**: `/api/customs-trade` (snapshot object `{generated_at, rows, matrix_rows?, trade_balance}`), trang `/xuat-nhap-khau`, `CustomsTradeViewer` (phân trang 50 + lọc phân loại/kỳ QUY), `TradeBalanceChart` (Recharts: Dạng Cột/Dạng Đường, vùng âm dương quanh trục 0, tách chu kỳ 15 ngày vs tháng), nav "Thống Kê XNK" trong header.
- [x] **ETL nâng cấp filename parsing + dataset category (2026-08-23)**: `detect_dataset_category` (main/fdi/matrix/province/transport — CHỈ main+fdi tham gia cán cân), `PERIOD_RE` hỗ trợ QUY + năm fallback từ nội dung PDF, `parse_province_rows` (xnktheotinh tách 2 chiều XK/NK), `parse_matrix_file` (Mặt hàng×Thị trường 5108 dòng), `_plausible` chặn nhiễu >1e15; snapshot **2511 rows + 5108 matrix + 13 kỳ cán cân**; `main.py --export-json` in summary theo kỳ.
- [x] **Nghe đọc báo cáo (TTS, 2026-08-23)**: `/api/reports/[id]/content` (export text/plain qua Drive) + `ReportAudioPlayer` (Web Speech API `vi-VN`, chunking chống dừng, tốc độ 1x/1.5x/2x, gán voice tiếng Việt) tích hợp `/bao-cao/[slug]` sau Paywall.
- [x] **Nâng cấp TTS Google Translate Server-side (2026-08-23)**: xây dựng `/api/reports/[id]/audio` ghép MP3 đa luồng (<4s) + `ReportAudioPlayer` phát thẻ `<audio>` HTML5 chuẩn.
- [x] **Tạm tắt Paywall (2026-08-27)**: thêm hằng số `PAYWALL_ENABLED = false` trong `lib/auth-check.ts` cho phép đọc trực tiếp báo cáo mà không bắt buộc đăng nhập/dùng thử.
- [x] **Ẩn tiêu đề bộ lọc trang chủ (2026-08-27)**: ẩn khối H1 "Bộ Lọc Cổ Phiếu Giá Trị" và đoạn giới thiệu trong `app/page.tsx` giúp trang chủ tinh gọn hơn.

### 🔄 Đang xử lý (In Progress)
- [ ] (Trống — không có tác vụ đang dở)

### 📋 Kế hoạch tiếp theo (Backlog)
- [ ] Chia sẻ công khai (Anyone with the link → Viewer) **các Google Doc còn lại bị 403** → chạy `node scripts/refresh-snapshot.mjs` để snapshot đủ định giá
- [ ] (Tùy chọn) Cập nhật `GOOGLE_DRIVE_FOLDER_ID` trên Vercel cho đúng (`1eI8C_uDJlKDvNbzF9YOOr6QNCUIdw7o8`) nếu muốn bật chế độ live `REPORTS_SOURCE=live`
- [ ] Thêm báo cáo thực tế `[VIMO_...]` / `[HANGHOA_...]` vào Drive để chứng thực luồng macro/commodity end-to-end
- [ ] `ProtectedContent` (nội dung bảo vệ) — chưa có trong code
- [ ] Parser MDX `content/{TICKER}-*.mdx` → hiển thị đầy đủ tab Thuyết minh BCTC
- [ ] Bổ sung `data/{TICKER}.json` cho các mã còn lại (hiện chỉ có VNF)

---

## 5. Nhật ký thay đổi kỹ thuật (Changelog)

> Ghi theo thứ tự mới → cũ. **Quy tắc (2026-08-15)**: chỉ cập nhật khi người dùng yêu cầu đích danh — thêm dòng mới vào đầu danh sách này.

| Timestamp | File(s) sửa | Nội dung thay đổi |
|---|---|---|
| 2026-08-27 | `app/page.tsx` | **Ẩn phần tiêu đề và giới thiệu ở trang chủ**: Xóa khối heading chứa "Trang chủ · Sàng lọc định giá", H1 "Bộ Lọc Cổ Phiếu Giá Trị" và đoạn mô tả đồng bộ kho báo cáo để trang gọn gàng hơn. Push `f0f20d9`. |
| 2026-08-27 | `lib/auth-check.ts` | **Tạm tắt Paywall truy cập báo cáo**: Thêm hằng số `PAYWALL_ENABLED = false` làm công tắc linh hoạt cho phép mở toàn bộ bài phân tích trực tiếp mà không cần đăng nhập / kích hoạt dùng thử. Push `da5b2ea`. |
| 2026-08-23 | `app/api/reports/[id]/audio/route.ts` (mới) · `components/report-audio-player.tsx` | **Nâng cấp TTS sang Google Translate TTS Server-side (<4s)**: Xây dựng route `/api/reports/[id]/audio` trích xuất text báo cáo, cắt câu chunking <= 180 ký tự (giới hạn 2500 ký tự đầu), tải song song 8 luồng từ Google Translate TTS, ghép buffer MP3 trả về `audio/mpeg` (`maxDuration=60`); nâng cấp `ReportAudioPlayer` dùng thẻ `<audio>` HTML5 phát âm thanh trực tiếp, có seek tua, tốc độ 0.75x–2.0x, hoạt động đồng nhất trên mọi trình duyệt/thiết bị. Push `8e1e870`. |
| 2026-08-23 | `components/report-audio-player.tsx` (mới) · `app/api/reports/[id]/content/route.ts` (mới) · `app/bao-cao/[slug]/page.tsx` | **Nghe đọc báo cáo (TTS — Web Speech API)**: route export Google Doc text/plain (`GOOGLE_DRIVE_API_KEY`) → `{content}`; component `ReportAudioPlayer`: `speechSynthesis` `lang=vi-VN`, **gán voice tiếng Việt** (`pickVietnameseVoice` ưu tiên Google tiếng Việt — fix đọc tiếng Anh), `chunkText` tách câu + bảo vệ dấu chấm/phẩy trong số, đọc nối tiếp qua `onend` + keepalive 10s chống dừng giữa chừng, nút Phát/Tạm dừng/Dừng + tốc độ 1.0x/1.5x/2.0x đổi tức thì, cảnh báo khi thiếu giọng vi. Đặt phía trên `<DriveDocViewer>` trong nhánh `allowed` (sau Paywall). tsc+build EXIT 0. |
| 2026-08-23 | `components/TradeBalanceChart.tsx` | **Rework biểu đồ Cán cân**: tách dứt chu kỳ — `15d` chỉ hiển thị Kỳ 1/2 (bỏ Tháng khỏi trục), `month` chỉ THANG, `quarter`/`year` gộp THANG; thay `viewMode` bằng toggle **Dạng Cột** (cột XK emerald/NK rose trục trái + đường Cán cân amber trục phải) / **Dạng Đường** (đường XK/NK + **vùng Cán cân âm dương quanh trục 0**: 2 `Area baseValue={0}` cắt qua clipPath emerald/rose, zeroY tính xác định từ domain tường minh + ResizeObserver vì Recharts 3 không hỗ trợ function-child); trục kép; bỏ legend chân cũ → dùng Recharts `<Legend>` duy nhất (Area fill `legendType="none"` tránh trùng nhãn). tsc+build EXIT 0. |
| 2026-08-23 | `scripts/customs_etl/parser.py` · `analysis.py` · `main.py` · `database/schema.sql` · `data/customs_trade_snapshot.json` | **ETL nâng cấp filename parsing + dataset category (43 file)**: `detect_dataset_category` (main/fdi/matrix/province/transport — CHỈ main+fdi tham gia trade_balance); `PERIOD_RE` viết lại (year tùy chọn + `t<month>[k1\|k2]` + `Q<1-4>` → QUY, năm thiếu fallback `_year_from_content` scan text PDF); `detect_trade_type` thêm token xk/nk; `parse_province_rows` (xnktheotinh 5 cột → mỗi tỉnh 2 dòng EXPORT+IMPORT); `parse_matrix_file` (chitiet giữ cấu trúc dòng → 5108 dòng Mặt hàng×TT, để riêng `matrix_rows`); `_plausible` chặn giá trị >1e15; ParsedRow thêm `dataset_category`. Snapshot: **2511 rows (main 1625, fdi 234, province 204, transport 448) + 5108 matrix + 13 kỳ cán cân**; `--export-json` in summary theo kỳ. |
| 2026-08-23 | `app/xuat-nhap-khau/page.tsx` (mới) · `app/api/customs-trade/route.ts` (mới) · `components/customs-trade-viewer.tsx` (mới) · `components/TradeBalanceChart.tsx` (mới) · `components/site-header.tsx` | **Trang Thống Kê XNK + biểu đồ Cán cân**: route `/api/customs-trade` trả snapshot XNK; trang `/xuat-nhap-khau` render `TradeBalanceChart` (Recharts — tabs khu vực, Đường cán cân/Cột XK–NK, khung thời gian) + `CustomsTradeViewer` (bảng 8 cột, lọc loại/kỳ/tìm kiếm); nav "Thống Kê XNK" thêm vào header (4 mục). cài `recharts@3.10.1`. |
| 2026-08-22 | `scripts/customs_etl/**` (mới) · `.gitignore` | **Backend ETL thống kê XNK (Giai đoạn 1: Backfill lịch sử)**: module Python `crawler.py`/`parser.py`/`loader.py`/`main.py` + `database/schema.sql` (dim_commodities/dim_countries/fact_customs_trade, UNIQUE NULLS NOT DISTINCT PG15+) + `mappings/*.json` + `requirements.txt` + `data_raw/README.md`. Crawler: UA rotation/retry/rate-limit, `CRAWL_CONFIG` đầu file. Parser: map cột STT/Tên/ĐVT/Lượng/Trị giá/Lũy kế, `parse_number` đa định dạng số, lọc dòng Tổng, chuẩn hóa qua mappings. Loader: DATABASE_URL từ .env/.env.local, ensure dim + execute_values ON CONFLICT. CLI: --crawl/--parse-and-load/--all/--init-db/--from-year/--to-year. Smoke test parser PASS; chưa cài psycopg2. |
| 2026-08-22 | `components/PaywallModal.tsx` | **Fix modal bị kẹt 56px (bảng bị che)**: header sticky dùng `backdrop-blur` (backdrop-filter) tạo containing block cho `position: fixed` descendants → modal bị neo theo header. **Fix: render qua `createPortal(document.body)`** + `useState(mounted)` guard SSR + `z-[100]`. Xác minh backdrop phủ toàn viewport, đóng X/Escape OK. Push `c32b7cb`. |
| 2026-08-22 | `components/Paywall.tsx` · `components/PaywallModal.tsx` · `public/qr-tpbank.jpg` (mới) | **Sửa UI Paywall**: modal chống che phần đầu (backdrop `overflow-y-auto` + khung `my-auto max-h-[90vh]` + header cố định tiêu đề/badge dùng thử/X + body `overflow-y-auto p-6 space-y-4`); Paywall thêm prop `variant='page'|'modal'`; thêm ảnh **mã VietQR TPBank** `public/qr-tpbank.jpg` + `bankFullName: 'Ngân hàng TMCP Tiên Phong'` + copy label "Sao chép nội dung". Push `720d644`. |
| 2026-08-22 | `lib/auth-check.ts` · `lib/session.ts` · `app/api/auth/session/route.ts` · `components/Paywall.tsx` · `components/PaywallModal.tsx` · `components/TrialBadge.tsx` (mới) · `components/site-header.tsx` · `app/bao-cao/[slug]/page.tsx` | **Trial 7 ngày + Paywall**: `checkUserAccess()` (UNAUTHENTICATED/TRIAL_ACTIVE/SUBSCRIPTION_ACTIVE/EXPIRED), cookie httpOnly `dulieucophieu_session` (API session demo: start_trial/activate/logout), `TrialBadge` trên header, bảo vệ `/bao-cao/[slug]` server-side (UNAUTH/EXPIRED → `<Paywall>`). Push `6bd81a7`. |
| 2026-08-22 | `components/screener.tsx` | **Đồng bộ hoàn thiện bảng Screener**: sort mặc định `reportDate` desc (comparator `reportDateToTimestamp()` parse DD/MM/YYYY→timestamp); đổi tên state `sortDir`→`sortOrder`, hằng `PAGE_SIZE`→`ITEMS_PER_PAGE=20`; cột Tên DN thu gọn `w-[140px] max-w-[150px] truncate`; thêm hàng Loading/No data/Empty đều `colSpan={7}` (lấy `loading` từ `useReports`); đổi text empty state cho khớp (bỏ sidebar). `tsc --noEmit` EXIT 0; browser xác minh "Hiển thị 1–20 trên ... mã". Push `50d5674`. |
| 2026-08-22 | `data/reports-snapshot.json` | **Auto-refresh snapshot (CI, commit `[skip ci]`)**: **94 báo cáo (81 mã unique)**; 45 targetPrice / 29 recommendation / 15 KTPL / 39 currentPrice; ngày mới nhất 16/08/2026. Push `c9feca4` → `8d036be`. |
| 2026-08-17 | `components/screener.tsx` | **Đưa "Ngày báo cáo" lên vị trí cột 3** + thu gọn cột Tên doanh nghiệp + sort mặc định theo ngày giảm dần. Push `2d6b5d3`. |
| 2026-08-16 | `components/screener.tsx` · `components/home-kpis.tsx` | **Tinh gọn trang chủ (3fa3193)**: `home-kpis.tsx` chỉ còn 1 card "Cổ phiếu trong danh mục" (bỏ undervalued/avgUpside/avgDiv + component Kpi); `screener.tsx` bỏ toàn bộ sidebar "Bộ lọc định giá" (bỏ prOn/pr/sector state, FilterRow, Slider, SECTORS, priceToRnavOf) → bảng full-width; bỏ 3 cột Ngành/Khuyến nghị/Trạng thái (bỏ RecommendBadge/RECOMMEND_STYLES, StatusTag import, sector khỏi SortKey) → còn **7 cột**; empty `colSpan=7`; `PAGE_SIZE = 20`. |
| 2026-08-16 | `data/reports-snapshot.json` | **Cập nhật dữ liệu mới**: 59 báo cáo (+1 QTP; QTP target=14/MUA, MCF target=11.8/KHẢ QUAN); 15 có targetPrice, 16 có recommendation, 8 có KTPL. Push `462702b`. |
| 2026-08-16 | `app/api/reports/route.ts` · `data/reports-snapshot.json` (mới) · `scripts/refresh-snapshot.mjs` (mới) | **Chuyển cơ chế dữ liệu sang STATIC SNAPSHOT**: GET trả snapshot import mặc định (+ header `x-reports-source: snapshot`); giữ chế độ LIVE qua `REPORTS_SOURCE=live` / `?live=1`; script `refresh-snapshot.mjs` tự phát hiện/khởi động dev server, fetch `?live=1`, ghi snapshot pretty. Build EXIT 0. Push `39222cf`. |
| 2026-08-16 | `app/api/reports/route.ts` | **Log lỗi Drive chi tiết**: in full JSON lỗi + URL (che key), log số file Drive trả về, cảnh báo khi env folder khác default, gợi ý sửa env khi 400. Phát hiện `GOOGLE_DRIVE_FOLDER_ID` trên Vercel gõ sai (`1eIBC_...` thay vì `1eI8C_...`) → Drive 400. Push `0294c7a`. |
| 2026-08-16 | `app/api/reports/route.ts` | **Fix static-cache 14 mã lúc build**: thay `revalidate=60` bằng `export const dynamic = "force-dynamic"`, fetch `cache: "no-store"` — route luôn chạy lúc request, không đóng băng fallback 14 mã lên Vercel. Push `9496833`. |
| 2026-08-16 | `package.json` · `pnpm-workspace.yaml` · `pnpm-lock.yaml` | **Fix `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` cho Vercel**: chuyển `overrides: {hono: 4.12.25}` + `allowBuilds: {msw: true}` sang `pnpm-workspace.yaml` (pnpm 11 bỏ qua field `pnpm` trong package.json), xóa field `pnpm`, thêm `packageManager: pnpm@11.20.0`, chạy `pnpm install --no-frozen-lockfile`. Đã xóa `package-lock.json`. Push `e85ea25`. |
| 2026-08-15 | `components/site-header.tsx` · `app/layout.tsx` · `app/dieu-khoan` · `app/chinh-sach-bao-mat` · `app/lien-he` · `components/site-footer.tsx` | **Đổi thương hiệu → "Phân Tích Chuyên Sâu Cổ Phiếu"**: brand header responsive (mobile "Phân Tích Chuyên Sâu" / sm+ đầy đủ, icon TrendingUp giữ nguyên), `metadata.title` layout "Phân Tích Chuyên Sâu Cổ Phiếu - Cổng Dữ Liệu & Báo Cáo Đầu Tư", title 3 trang tĩnh + **footer** (bản quyền "© 2026 Phân Tích Chuyên Sâu Cổ Phiếu", tuyên bố "được Phân Tích Chuyên Sâu Cổ Phiếu tổng hợp...") đồng bộ hoàn toàn — **KHÔNG còn "Value Capital" trong code**. |
| 2026-08-15 | `app/api/reports/route.ts` | **Đơn giản hóa logic KTPL**: xóa toàn bộ 7 pattern phức tạp + guard "lên tới", giữ 1 regex duy nhất `/(?:KTPL|Khen thưởng phúc lợi|Quỹ KTPL)\s*[:=-]\s*(\d+(?:[.,]\d+)?)\s*%/i`; không khớp → `bonusWelfareRate: null` (Screener hiển thị "—"). Dọn file test tạm. |
| 2026-08-15 | `app/api/reports/route.ts` | **Fix lỗi bóc nhầm Giá MT/Giá TT** (HCC target=1 → 38.5, upside -96% → +38%): `TARGET_PRICE_PATTERNS` xử lý cụm thời hạn "1 NĂM"/"12 THÁNG"; `extractPrice()` chống bắt nhầm tỷ lệ (ký tự sau số là `x`/`%` → bỏ qua); thêm pattern upside "tỷ suất sinh lời kỳ vọng"; backstop `target < current*0.3` → null. |
| 2026-08-15 | `app/api/reports/route.ts` · `lib/use-reports.ts` · `lib/report-stocks.ts` · `components/screener.tsx` | Thêm `extractBonusWelfareRate()` (bóc tỷ lệ trích quỹ KTPL, hỗ trợ 7,5/7.5/10/15.0%) + trường `bonusWelfareRate` (chỉ cổ phiếu, vĩ mô/hàng hóa=null); `Report`/`ReportStock` thêm `bonusWelfareRate?`; Screener thêm cột "Trích quỹ KTPL" (9→10 cột, colSpan=10, SortKey `bonusWelfareRate`, format `fmtRate`). |
| 2026-08-15 | `app/api/reports/route.ts` | Thêm phân loại `[VIMO_...]`→macro / `[HANGHOA_...]`→commodity (type `ParsedReport`), `ticker: null`; thêm `extractSummary()`; chỉ parse valuation cho stock; dedupe dùng `ticker ?? category`. |
| 2026-08-15 | `lib/use-reports.ts` | `Report.ticker` → `string \| null`; thêm `summary?`; `byTicker` bỏ qua bài không có mã. |
| 2026-08-15 | `app/bao-cao/page.tsx` | Thêm 4 Tab lọc (Tất cả/Cổ phiếu/Hàng hóa & Ngành/Kinh tế Vĩ mô) + `TabButton`; card macro/commodity (badge tím/cam + summary); card cổ phiếu thêm dòng Giá MT/Upside; search chống null ticker. |
| 2026-08-15 | `lib/data.ts` | NT2 `marketPrice` 19.8 → **21.2**. |
| 2026-08-15 | `components/screener.tsx` | Xóa cột P/E FW & Cổ tức (colSpan 11→9); bỏ slider Forward P/E & Tỷ suất cổ tức; bỏ state `peOn/pe/divOn/div`; bỏ `forwardPE/dividendYield` khỏi `SortKey`. |
| 2026-08-15 | `components/site-footer.tsx` + `app/dieu-khoan` + `app/chinh-sach-bao-mat` + `app/lien-he` | Footer mới (tuyên bố miễn trách nhiệm, bản quyền, link phụ); 3 trang tĩnh; thông tin sáng lập + tài khoản ngân hàng + `CopyButton`. |
| 2026-08-15 | `components/stock-search.tsx`, `components/site-header.tsx`, `components/home-kpis.tsx`, `components/screener.tsx` | Tìm kiếm hoạt động (Enter/submit, dropdown); đổi brand "Value Capital"; trang chủ + bảng bộ lọc đồng bộ kho báo cáo. |
| 2026-08-15 | `app/api/reports/route.ts` | Xây dựng API báo cáo Drive ban đầu: pageToken loop, heuristic parse tên file, regex bóc tách định giá (Giá TT/MT/Upside/Khuyến nghị). |

---
*Cập nhật lần cuối: 2026-08-28 · Người duy trì: Nguyễn Trung Nhật (trungnhat232@gmail.com)*
