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
| **Dữ liệu** | Google Drive API **v3** (folder ID `1eI8C_uDJlKDvNbzF9YOOr6QNCUIdw7o8`), file báo cáo là Google Docs (export text/plain). **Cơ chế hiện tại: STATIC SNAPSHOT** — `data/reports-snapshot.json` (59 báo cáo đã parse) phục vụ trực tiếp; Drive chỉ gọi khi bật live / chạy script refresh |
| **UI** | shadcn/ui (`@base-ui/react`, cva, clsx, tailwind-merge), lucide-react, `tw-animate-css` |
| **Fonts** | Inter (latin + vietnamese), JetBrains Mono |
| **Format số** | vi-VN: dấu chấm nghìn, dấu phẩy thập phân; giá theo **nghìn đồng/cổ phiếu**; vốn hóa tỷ đồng |
| **Định vị sản phẩm** | Bộ lọc cổ phiếu định giá hấp dẫn + kho báo cáo phân tích (cổ phiếu, hàng hóa & ngành, kinh tế vĩ mô) |

### Cách chạy dev
- **Lệnh dùng được**: `node node_modules\next\dist\bin\next dev` (chạy tại `localhost:3000`)
- `pnpm dev` / `npm run dev` hiện **LỖI** (lỗi mạng khi tải package next) → không dùng.
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
  SNAP[data/reports-snapshot.json<br/>59 báo cáo đã parse] -->|import tĩnh, MẶC ĐỊNH| API[/api/reports<br/>app/api/reports/route.ts/]
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
- `GET` phục vụ file `data/reports-snapshot.json` (snapshot đã parse sẵn, hiện **59 báo cáo**) → **KHÔNG gọi Google Drive lúc chạy**, không cần env → hoạt động ổn định tuyệt đối trên Vercel.
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
| `app/page.tsx` | Server | ✅ Trang chủ: `SiteHeader` + `QuickJump` + `HomeKpis` + `Screener` + ghi chú. H1 "Bộ Lọc Cổ Phiếu Giá Trị". |
| `app/bao-cao/page.tsx` | Client (Suspense) | ✅ Kho báo cáo: tìm kiếm + sort + **4 Tab lọc** (Tất cả / Cổ phiếu / Hàng hóa & Ngành / Kinh tế Vĩ mô). Card cổ phiếu: badge mã emerald + Giá MT + Upside. Card macro/commodity: badge tím/cam + title + summary + ngày. Đọc `?ticker=`/`?search=`. |
| `app/bao-cao/[slug]/page.tsx` | Server (async) | ✅ `await params`, slug = `driveDocId`, render `<DriveDocViewer/>` iframe Google Docs. |
| `app/ticker/[symbol]/page.tsx` | Server (async) | ✅ `generateStaticParams` từ `stocks`; header cổ phiếu + metric grid + giá vs RNAV bar + `<TickerTabs/>`. |
| `app/danh-muc/page.tsx` | Server | ✅ Watchlist tĩnh: DAN, LHG, SNZ, VNF, DC4, NT2 → link `/ticker/{MÃ}`. |
| `app/dieu-khoan/page.tsx` | Server | ✅ Trang Điều khoản sử dụng (tĩnh). |
| `app/chinh-sach-bao-mat/page.tsx` | Server | ✅ Trang Chính sách bảo mật (tĩnh). |
| `app/lien-he/page.tsx` | Server | ✅ Liên hệ: thẻ người phụ trách, Zalo, Email, thẻ ngân hàng BIDV (1260202954 — NGUYEN TRUNG NHAT) + `CopyButton`. |
| `app/api/reports/route.ts` | Route handler | ✅ API báo cáo — **phục vụ static snapshot** mặc định (`data/reports-snapshot.json`), chế độ live qua `REPORTS_SOURCE=live`/`?live=1` (xem mục 2.2). |

### 3.2 Components (`components/`)

| File | Loại | Trạng thái & Mô tả |
|---|---|---|
| `site-header.tsx` | Client | ✅ Header sticky: brand "Phân Tích Chuyên Sâu **Cổ Phiếu**" (responsive: mobile `text-lg` hiển thị ngắn "Phân Tích Chuyên Sâu", sm+ `text-xl` hiển thị đầy đủ; icon TrendingUp emerald giữ nguyên), `StockSearch`, nav 3 mục, `ThemeToggle`, mobile search row. |
| `stock-search.tsx` | Client | ✅ `StockSearch`: dropdown gợi ý (searchPool = mã báo cáo + stocks, keyboard nav, Enter/submit). `QuickJump`: tag `<Link>` tới `/bao-cao?ticker=MÃ`. |
| `screener.tsx` | Client | ✅ Bảng bộ lọc **10 cột**: Mã CK, Tên doanh nghiệp, Ngành, Giá TT, Giá MT, Trích quỹ KTPL, Ngày báo cáo, Upside, Khuyến nghị, Trạng thái (đã xóa P/E FW & Cổ tức, thêm cột KTPL). Sidebar chỉ còn **Giá/RNAV** slider + **Ngành nghề** select. Sort (kể cả `bonusWelfareRate`) + pagination + empty state `colSpan=10`. |
| `home-kpis.tsx` | Client | ✅ KPI tự đếm/tính từ `buildReportStocks`: tổng mã, mã định giá thấp, upside TB, cổ tức TB. |
| `ticker-tabs.tsx` | Client | ✅ 3 tabs: Tổng quan & Luận điểm / Báo cáo Tài chính / Thuyết minh BCTC. |
| `DriveDocViewer.tsx` | Client | ✅ **Viewer** Google Docs (iframe preview + spinner + nút "Mở trong Google Docs"). |
| `site-footer.tsx` | Server | ✅ Footer: khung "Tuyên bố miễn trách nhiệm" (3 đoạn), người phụ trách + Zalo/Email, bản quyền © 2026, nav link phụ. |
| `badges.tsx` | — | ✅ `StatusTag` (Cập nhật BCTC) + `MosBadge` (biên an toàn 4 bậc). |
| `theme-toggle.tsx` | Client | ✅ Toggle light/dark, localStorage `rnav-theme`. |
| `copy-button.tsx` | Client | ✅ Nút copy (Clipboard API + fallback execCommand, "Đã sao chép"). |
| `ui/button.tsx` | — | ✅ shadcn Button (Base UI), variants + sizes. |

### 3.3 Libraries (`lib/`)

`data.ts` (14 mã + sectors + hàm định giá) · `report.ts` (BCTC JSON + MDX + RESEARCH_REPORTS) · `report-stocks.ts` (ghép dữ liệu bảng, có `bonusWelfareRate`) · `use-reports.ts` (hook + type `Report` có `bonusWelfareRate?`) · `format.ts` (fmtPrice/fmtNum/fmtInt/fmtPct/fmtBillion) · `utils.ts` (`cn()`).

### 3.4 Ghi chú quan trọng
- **KHÔNG tồn tại** trong codebase: `ProtectedContent`, `Paywall` (đề xuất trong yêu cầu gốc nhưng **chưa implement** → nằm Backlog). "Viewer" = `DriveDocViewer`.
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
- [x] Bảng `Screener`: 9 cột (bỏ P/E FW & Cổ tức), sidebar chỉ Giá/RNAV + Ngành nghề
- [x] Tìm kiếm header hoạt động (Enter/submit, dropdown keyboard nav, điều hướng)
- [x] Đổi thương hiệu RNAV Value Capital → **Value Capital**
- [x] **Đổi thương hiệu → Phân Tích Chuyên Sâu Cổ Phiếu**: Header brand (responsive mobile/desktop) + `metadata.title` layout + title 3 trang tĩnh (Điều khoản/Bảo mật/Liên hệ); còn lại "Value Capital" trong footer & tài liệu (chưa đổi, chờ quyết định tên pháp lý)
- [x] Footer mới + 3 trang tĩnh (Điều khoản, Bảo mật, Liên hệ)
- [x] Thông tin sáng lập + tài khoản ngân hàng + `CopyButton`
- [x] Cập nhật NT2 `marketPrice = 21.2` → bảng hiển thị Giá TT 21,2 / Giá MT 30,2 / Upside +42% / MUA
- [x] Bóc tách **tỷ lệ trích quỹ KTPL** (`extractBonusWelfareRate`) + thêm cột "Trích quỹ KTPL" trên Screener (9 → 10 cột, colSpan=10, SortKey `bonusWelfareRate`)
- [x] **Chuẩn bị deploy Vercel**: bỏ `typescript.ignoreBuildErrors`, `metadataBase` = dulieucophieu.com, `README.md`, `engines.node >=20`, xóa `package-lock.json`
- [x] **Fix `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`**: chuyển `overrides`/`allowBuilds` sang `pnpm-workspace.yaml`, thêm `packageManager: pnpm@11.20.0`, chạy `pnpm install --no-frozen-lockfile`
- [x] **Fix static-cache 14 mã trên Vercel**: `export const dynamic = "force-dynamic"`, bỏ `revalidate=60`, fetch `cache: "no-store"`
- [x] **Log lỗi Drive chi tiết** + cảnh báo folder ID sai — phát hiện `GOOGLE_DRIVE_FOLDER_ID` trên Vercel gõ sai → 400
- [x] **Chuyển cơ chế STATIC SNAPSHOT**: `data/reports-snapshot.json` (59 báo cáo) + `scripts/refresh-snapshot.mjs` + header `x-reports-source`
- [x] **Cập nhật dữ liệu mới**: 59 báo cáo (thêm QTP, MCF có đầy đủ định giá); 15 targetPrice / 16 recommendation / 8 KTPL

### 🔄 Đang xử lý (In Progress)
- [ ] (Trống — không có tác vụ đang dở)

### 📋 Kế hoạch tiếp theo (Backlog)
- [ ] Chia sẻ công khai (Anyone with the link → Viewer) **các Google Doc còn lại bị 403** → chạy `node scripts/refresh-snapshot.mjs` để snapshot đủ định giá
- [ ] (Tùy chọn) Cập nhật `GOOGLE_DRIVE_FOLDER_ID` trên Vercel cho đúng (`1eI8C_uDJlKDvNbzF9YOOr6QNCUIdw7o8`) nếu muốn bật chế độ live `REPORTS_SOURCE=live`
- [ ] Thêm báo cáo thực tế `[VIMO_...]` / `[HANGHOA_...]` vào Drive để chứng thực luồng macro/commodity end-to-end
- [ ] `ProtectedContent` (nội dung bảo vệ) — chưa có trong code
- [ ] `Paywall` (khóa nội dung trả phí) — chưa có trong code
- [ ] Parser MDX `content/{TICKER}-*.mdx` → hiển thị đầy đủ tab Thuyết minh BCTC
- [ ] Bổ sung `data/{TICKER}.json` cho các mã còn lại (hiện chỉ có VNF)
- [ ] Khôi phục `pnpm dev` / `npm run dev` (lỗi mạng khi tải package next)

---

## 5. Nhật ký thay đổi kỹ thuật (Changelog)

> Ghi theo thứ tự mới → cũ. **Quy tắc (2026-08-15)**: chỉ cập nhật khi người dùng yêu cầu đích danh — thêm dòng mới vào đầu danh sách này.

| Timestamp | File(s) sửa | Nội dung thay đổi |
|---|---|---|
| 2026-08-16 | `data/reports-snapshot.json` | **Cập nhật dữ liệu mới**: 59 báo cáo (+1 QTP; QTP target=14/MUA, MCF target=11.8/KHẢ QUAN); 15 có targetPrice, 16 có recommendation, 8 có KTPL. Push `462702b`. |
| 2026-08-16 | `app/api/reports/route.ts` · `data/reports-snapshot.json` (mới) · `scripts/refresh-snapshot.mjs` (mới) | **Chuyển cơ chế dữ liệu sang STATIC SNAPSHOT**: GET trả snapshot import mặc định (+ header `x-reports-source: snapshot`); giữ chế độ LIVE qua `REPORTS_SOURCE=live` / `?live=1`; script `refresh-snapshot.mjs` tự phát hiện/khởi động dev server, fetch `?live=1`, ghi snapshot pretty. Build EXIT 0. Push `39222cf`. |
| 2026-08-16 | `app/api/reports/route.ts` | **Log lỗi Drive chi tiết**: in full JSON lỗi + URL (che key), log số file Drive trả về, cảnh báo khi env folder khác default, gợi ý sửa env khi 400. Phát hiện `GOOGLE_DRIVE_FOLDER_ID` trên Vercel gõ sai (`1eIBC_...` thay vì `1eI8C_...`) → Drive 400. Push `0294c7a`. |
| 2026-08-16 | `app/api/reports/route.ts` | **Fix static-cache 14 mã lúc build**: thay `revalidate=60` bằng `export const dynamic = "force-dynamic"`, fetch `cache: "no-store"` — route luôn chạy lúc request, không đóng băng fallback 14 mã lên Vercel. Push `9496833`. |
| 2026-08-16 | `package.json` · `pnpm-workspace.yaml` · `pnpm-lock.yaml` | **Fix `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` cho Vercel**: chuyển `overrides: {hono: 4.12.25}` + `allowBuilds: {msw: true}` sang `pnpm-workspace.yaml` (pnpm 11 bỏ qua field `pnpm` trong package.json), xóa field `pnpm`, thêm `packageManager: pnpm@11.20.0`, chạy `pnpm install --no-frozen-lockfile`. Đã xóa `package-lock.json`. Push `e85ea25`. |
| 2026-08-15 | `components/site-header.tsx` · `app/layout.tsx` · `app/dieu-khoan` · `app/chinh-sach-bao-mat` · `app/lien-he` | **Đổi thương hiệu → "Phân Tích Chuyên Sâu Cổ Phiếu"**: brand header responsive (mobile "Phân Tích Chuyên Sâu" / sm+ đầy đủ, icon TrendingUp giữ nguyên), `metadata.title` layout "Phân Tích Chuyên Sâu Cổ Phiếu - Cổng Dữ Liệu & Báo Cáo Đầu Tư", title 3 trang tĩnh đồng bộ. Footer vẫn còn "Value Capital" (chưa đổi). |
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
*Cập nhật lần cuối: 2026-08-16 · Người duy trì: Nguyễn Trung Nhật (trungnhat232@gmail.com)*
