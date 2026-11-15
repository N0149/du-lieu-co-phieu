# GEMINI_CONTEXT.md — Ngữ cảnh đồng bộ dự án

> **Mục đích**: File duy nhất để mọi AI agent (Gemini, Copilot, Claude, Cursor...) nắm được 100% hiện trạng code của dự án **Phân Tích Chuyên Sâu Cổ Phiếu (dulieudautu.com / dulieucophieu.com)**.
>
> **Quy tắc cập nhật (CẬP NHẬT 2026-08-15, theo `AGENTS.md`)**: **KHÔNG tự động cập nhật/đồng bộ/nhắc tới file này** sau mỗi lần sửa code — **CHỈ cập nhật khi người dùng yêu cầu đích danh** (vd "cập nhật GEMINI_CONTEXT.md", "đồng bộ ngữ cảnh", "cập nhật changelog").

---

## 1. Tổng quan

| Mục | Chi tiết |
|---|---|
| **Tên dự án** | Phân Tích Chuyên Sâu Cổ Phiếu — Cổng Dữ Liệu & Báo Cáo Đầu Tư (`dulieudautu.com` / `dulieucophieu.com`) |
| **Sáng lập / Người phụ trách** | Nguyễn Trung Nhật · Zalo **0983.627.018** · trungnhat232@gmail.com |
| **Tech stack** | Next.js **16.3.0** (App Router, Turbopack), React **19**, TypeScript **5.7.3**, Tailwind CSS **v4** (OKLCH, chủ đạo emerald / teal / dark oceanic), Node.js **22.x**, pnpm |
| **Model Context Protocol (MCP)** | Server MCP chuẩn hóa (`/api/mcp`, `/mcp`, `/ket-noi-mcp`) hỗ trợ kết nối trực tiếp các AI client (Gemini, Claude, Cursor, ChatGPT). Tuân thủ OAuth 2.0 RFC 8414 & RFC 9728 (`/.well-known/oauth-*`, `/oauth/*`). Gồm 4 công cụ hợp nhất: `tra_cuu_ho_so_tai_chinh`, `bo_loc_co_phieu`, `so_sanh_co_phieu`, `su_kien_va_cong_bo_thong_tin`. Quota: Free Member 5 câu/ngày, VIP không giới hạn |
| **Phân quyền VIP & AuthGate** | **Supabase Auth & Database** (`@supabase/ssr`): Đăng nhập Google/Email, hệ thống cấp quyền 3 tầng: Khách vãng lai, Free Member và Hội viên VIP. Quản trị kích hoạt/thu hồi VIP nhanh qua email tại `/admin` (`/api/admin/vip`), webhook cổng thanh toán (`/api/payment/webhook`). Khóa mở tính năng thông minh bằng component `AuthGate` |
| **Dữ liệu Giá Live 24hMoney** | Realtime Ticker API từ **24hMoney** (`lib/live-quote-service.ts` → `/api/stock/[symbol]/live-quote`), cache 60s in-memory, client polling tự động mỗi 60s, tính toán động P/E, P/B và vốn hóa theo thị giá |
| **Công Bố Thông Tin 3 Sàn** | Tích hợp tab Công Bố 3 Sàn (HOSE, HNX, UPCOM) tại trang chủ `/`, tự động revalidate ngầm, lọc theo sàn, loại tài liệu & Watchlist cá nhân → `/api/disclosures` |
| **Bộ Lọc Cổ Phiếu WiData** | `/bo-loc`: Sàng lọc 1.530+ mã (HOSE, HNX, UPCOM) chuẩn WiData: P/E, P/B, ROE, biên LN, dòng tiền OCF, nợ/VCSH, tăng trưởng và tín hiệu kỹ thuật |
| **Tình Báo Cổ Phiếu Chuyên Sâu** | `/stock/[symbol]`: Header giá realtime, 7 tab phân tích: Đánh giá 360, BCTC chi tiết 16 năm (kèm thuyết minh bóc tách nợ vay, hàng tồn kho, dở dang), Kế hoạch kinh doanh 10 năm, Biểu đồ giao dịch nội bộ, Đồng thuận giá CTCK, Định giá P/E-P/B Bands + EPS, Báo cáo ĐHĐCĐ 2026 (867+ mã), Báo cáo phân tích CTCK |
| **Hệ Thống Hub Ngành Chuyên Sâu** | **Ngành Điện** (`/nganh-dien`): 36 mã, LNST thực tế, tỷ lệ hoàn thành, Quy hoạch Điện VIII.<br>**Đấu Thầu Y Tế & ĐTC** (`/dau-thau`): Bóc tách gói thầu trúng ETC của DP1, DTP, DAN, TRA, CDP, DTG và 3.736 dự án ĐTC quy mô ≥ 500 tỷ.<br>**Ngành Thủy Sản** (`/thuy-san`): Dữ liệu VASEP 10T/2026, giá nguyên liệu cá tra/tôm hàng tuần, so sánh BCTC Q3 của 12 cổ phiếu.<br>**Nghiên Cứu Định Giá AI & RNAV** (`/nghien-cuu-ai`): Bóc tách giá trị ròng tài sản, mô hình RNAV, tính điểm định giá realtime |
| **Báo Cáo Phân Tích & Kho BCTC** | 4.900+ snapshot báo cáo phân tích CTCK (`data/company_reports_snapshot.json`), 490+ báo cáo ngành (`data/industry-reports.json`), báo cáo vĩ mô, trái phiếu, tin IR. Kho tài liệu thuyết minh BCTC Q3/2026 chuẩn Markdown trong `content/bctc/` |
| **Tình Báo Cảng Biển & Hàng Hải** | SQLite `data/maritime.db` + Snapshots `data/maritime/dashboard_summary.json` (15 cảng vụ, 12 mã niêm yết: `PHP`, `GMD`, `DVP`, `DXP`, `MIPEC`, `SGP`, `PDN`, `CDN`, `HAH`, `VGR`, `CQN`, `PSP`, 147+ hồ sơ tàu, khử trùng lặp tự động, theo dõi cước vận tải biển BDI, WCI, BDTI, BCTI) |
| **Thống Kê XNK Hải Quan 7 Năm** | Snapshot 2020–2026 `data/customs_trade_snapshot.json` + `data/customs_matrix_detail.json` → `/api/customs-trade` |
| **Bảo Mật & Tối Ưu Tải** | `middleware.ts` tách biệt bucket rate-limit cho prefetch (`isPrefetchRequest`) tránh khóa nhầm truy cập thật; hạn chế cào hàng loạt `/stock/[symbol]`; Cloudflare IP header priority; chặn bot cào trộm; security trap routes |
| **UI & UX Responsive** | **Dark Oceanic Fintech Aesthetic**: Nền Deep Slate 950, hiệu ứng ngọc bích / lục bảo (Teal & Cyan Glow), bảng kính mờ Glassmorphism. Hỗ trợ **Mobile Bottom Navigation Bar**, touch-friendly docking tabs, scroll chevrons, Command Palette (`Ctrl+K`) |
| **Export sang AI Cá Nhân** | Tích hợp tính năng 1-click xuất toàn bộ dữ liệu tài chính BCTC và báo cáo ĐHĐCĐ sang Markdown nạp vào Gemini, Google NotebookLM, ChatGPT, Claude, DeepSeek |

### Cách chạy dev & Build
- **Lệnh chạy local**: `pnpm dev` hoặc `pnpm run build` (kiểm tra TypeScript & Turbopack build)
- `next.config.mjs`:
  - `poweredByHeader: false`, `serverExternalPackages: ['node:sqlite']`.
  - `outputFileTracingIncludes`: Tự động bundle các file JSON và content markdown cho các dynamic route.
  - `outputFileTracingExcludes`: Loại trừ các cache nặng cục bộ (`evaluation_cache`, `shareholder_cache`, `notes-cache`, `*.db`).
- **Tự động hóa CI/CD**: GitHub Actions tự động đồng bộ báo cáo phân tích hàng ngày, đồng bộ công bố thông tin và cache BCTC completed.
- **Vercel Deployment**: domain `dulieudautu.com` / `du-lieu-co-phieu-grtq.vercel.app`, tự động deploy production khi push nhánh `main`.

---

## 2. Kiến trúc & Luồng dữ liệu

### 2.1 Sơ đồ luồng tổng quan

```mermaid
flowchart TD
  subgraph AuthVIP [1. Supabase Auth, VIP & Phân Quyền]
    USER[Người dùng / Nhà đầu tư] --> AUTH_MODAL[AuthModal / Google OAuth / Magic Link]
    AUTH_MODAL --> SB_AUTH[Supabase Auth - @supabase/ssr]
    SB_AUTH --> USER_TIER{Phân tầng hội viên}
    USER_TIER -->|Khách vãng lai| TIER_GUEST[Xem dữ liệu cơ bản]
    USER_TIER -->|Free Member| TIER_MEMBER[Xem Kế hoạch KD, Đấu thầu, 5 MCP queries/ngày]
    USER_TIER -->|VIP Member| TIER_VIP[Thuyết minh 34 quý, RNAV, DWT bến cảng, Không giới hạn MCP]
    ADMIN[Quản trị viên] --> ADMIN_PAGE[/admin Kích hoạt/Thu hồi VIP nhanh]
    ADMIN_PAGE --> API_VIP[/api/admin/vip]
    WEBHOOK[Cổng thanh toán] --> API_PAYMENT[/api/payment/webhook]
  end

  subgraph MCP_Ecosystem [2. Model Context Protocol Server & OAuth 2.0]
    AI_CLIENTS[Gemini / Claude / Cursor / ChatGPT] --> OAUTH_EP[/.well-known/oauth-* & /oauth/*]
    OAUTH_EP --> MCP_CORE[/api/mcp & lib/mcp/server.ts]
    MCP_CORE --> T1[tra_cuu_ho_so_tai_chinh]
    MCP_CORE --> T2[bo_loc_co_phieu]
    MCP_CORE --> T3[so_sanh_co_phieu]
    MCP_CORE --> T4[su_kien_va_cong_bo_thong_tin]
  end

  subgraph Industry_Hubs [3. Các Hub Ngành & Tình Báo Chuyên Sâu]
    DIEN_DATA[Dữ liệu 36 mã Điện & QHĐ VIII] --> PAGE_DIEN[/nganh-dien Hub Ngành Điện]
    ETC_DATA[Dữ liệu MPI & Đấu thầu ETC] --> PAGE_ETC[/dau-thau Hub Đấu Thầu Y Tế & ĐTC]
    VASEP_DATA[Dữ liệu VASEP 10T/2026] --> PAGE_TS[/thuy-san Hub Thủy Sản]
    RNAV_DATA[Bóc tách tài sản & BCTC] --> PAGE_RNAV[/nghien-cuu-ai Định Giá RNAV]
    MACRO_DATA[Vĩ mô, Lãi suất, Tín dụng] --> PAGE_MACRO[/vi-mo & /quy-mo]
  end

  subgraph Core_Analytics [4. Tình Báo Cổ Phiếu 360 & Thị Trường]
    LIVE_API[24hMoney Realtime Ticker] --> API_QUOTE[/api/stock/symbol/live-quote]
    FIN_DATA[Kho BCTC 16 năm + Thuyết minh Q3/2026] --> PAGE_STOCK[/stock/symbol Deep Dive]
    DISC_DATA[Công bố thông tin 3 sàn] --> PAGE_HOME[Trang Chủ / Công Bố & Tin Tức]
    WIDATA_SRC[WiData 1.530+ mã] --> PAGE_SCREENER[/bo-loc Bộ Lọc Cổ Phiếu]
    MARITIME_DB[(data/maritime.db 15 Cảng vụ)] --> PAGE_CANGBIEN[/cang-bien Tình Báo Hàng Hải]
  end
```

### 2.2 Model Context Protocol (MCP) Server & OAuth 2.0
- **Tiêu chuẩn triển khai**:
  - Route `/api/mcp` triển khai qua `lib/mcp/server.ts` sử dụng thư viện `@modelcontextprotocol/sdk`.
  - Hỗ trợ Dynamic Client Registration và RFC 8414 OAuth 2.0 Authorization Server Metadata (`/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`).
- **4 Công cụ AI hợp nhất**:
  1. `tra_cuu_ho_so_tai_chinh`: Nạp trọn bộ hồ sơ cổ phiếu (giá realtime, BCTC tóm tắt, thuyết minh chuyên sâu Q3/2026, nghị quyết ĐHĐCĐ 2026, nghiên cứu định giá AI).
  2. `bo_loc_co_phieu`: Sàng lọc 1.530+ mã theo tiêu chí cơ bản, định giá, ngành nghề, điểm sức khỏe tài chính.
  3. `so_sanh_co_phieu`: So sánh trực diện nhóm đối thủ cùng ngành về định giá P/E, P/B, ROE, đòn bẩy tài chính.
  4. `su_kien_va_cong_bo_thong_tin`: Tra cứu công bố thông tin mới nhất 3 sàn và giao dịch người nội bộ.
- **Quota & Kiểm soát tần suất**:
  - Free User: Giới hạn tối đa 5 câu hỏi/ngày.
  - VIP Member: Không giới hạn truy vấn dữ liệu.

### 2.3 Phân Tầng Quyền Hạn Hội Viên & Quản Trị VIP
- **Kiến trúc AuthGate 3 tầng**:
  - `tier="guest"`: Mở công khai cho mọi người dùng (giá realtime, tin tức, công bố thông tin, bộ lọc cơ bản).
  - `tier="member"`: Yêu cầu đăng nhập tài khoản miễn phí (Kế hoạch kinh doanh ĐHĐCĐ 10 năm, dữ liệu Đấu thầu ETC, tra cứu danh mục Watchlist cá nhân).
  - `tier="vip"`: Dành riêng cho Hội viên VIP (Thuyết minh BCTC chi tiết 34 quý, Định giá tài sản RNAV, Tình báo hàng hải bóc tách DWT từng bến cảng, P/E thực tế & Tỷ lệ trích ngoài cổ đông, truy cập MCP không giới hạn).
- **Trang Quản Trị Admin (`/admin` & `/api/admin/vip`)**:
  - Phân quyền theo email admin (`lib/admin-auth.ts`).
  - Hỗ trợ gõ tìm kiếm gợi ý email khách hàng, chọn gói (1 tháng, 6 tháng, 1 năm, tùy chỉnh số ngày) và kích hoạt hoặc thu hồi VIP ngay lập tức.
  - Cập nhật trực tiếp `app_metadata` của Supabase User, client đồng bộ lại session tức thì mà không cần đăng xuất đăng nhập lại.

### 2.4 Cơ Chế Bảo Mật, Rate Limiting & Tối Ưu Prefetch (`middleware.ts`)
- **Tách riêng bucket prefetch**: Nhận diện header `next-router-prefetch`, `purpose: prefetch`, `sec-purpose: prefetch` và `pathname.startsWith('/.well-known/')`. Cho phép prefetch tối đa 120 req/phút/IP để không chặn nhầm trình duyệt của người dùng thực.
- **Chống cào dữ liệu hàng loạt**: Giới hạn tối đa 30 mã cổ phiếu/phút/IP cho các request xem chi tiết `/stock/[symbol]`.
- **Tối ưu Link Prefetch**: Đặt `prefetch={false}` trên các component hiển thị danh sách nhiều mã cổ phiếu (`stock-card-grid.tsx`, `stock-link.tsx`, `WatchlistManager.tsx`, `market-treemap.tsx`, `IndustryTable.tsx`) để triệt tiêu tình trạng gửi hàng chục request ngầm cùng lúc làm nghẽn kết nối và kích hoạt rate limit.

---

## 3. Danh mục Component & Trang

### 3.1 Pages (`app/`)

| File | Loại | Trạng thái & Mô tả |
|---|---|---|
| `app/layout.tsx` | Server (root) | ✅ Layout toàn site: fonts Inter/JetBrains, `themeScript`, `<VerticalSidebarNav/>`, `<MobileBottomNav/>`, `<GlobalSearchModal/>`, `<SiteFooter/>`, `@vercel/analytics`. |
| `app/page.tsx` | Server | ✅ **Trang chủ**: Mặc định hiển thị tab **Công Bố Thông Tin 3 Sàn** (HOSE, HNX, UPCOM) & tab **Tin Tức Thị Trường** realtime (`NewsDashboard`), tự động revalidate ngầm và lọc theo Watchlist cá nhân. |
| `app/admin/page.tsx` | Client | ✅ **Trang Quản Trị**: Thống kê người dùng, lưu lượng truy cập pageview, giao diện kích hoạt/thu hồi quyền VIP nhanh cho khách hàng bằng email. |
| `app/ket-noi-mcp/page.tsx` | Server | ✅ **Trang Hướng Dẫn Kết Nối MCP**: Hướng dẫn 1-click tích hợp Model Context Protocol vào Gemini CLI, Claude Desktop, Cursor, ChatGPT. |
| `app/mcp/page.tsx` | Server | ✅ **Trang Giới Thiệu MCP Server**: Mô tả chuẩn giao thức, danh sách 4 công cụ AI hợp nhất và chính sách quota. |
| `app/nganh-dien/page.tsx` | Server | ✅ **Hub Ngành Điện**: Bóc tách 36 mã cổ phiếu ngành điện, LNST thực tế, tiến độ hoàn thành kế hoạch năm và Quy hoạch Điện VIII. |
| `app/dau-thau/page.tsx` | Server | ✅ **Hub Đấu Thầu Y Tế & ĐTC**: Theo dõi trúng thầu ETC của các doanh nghiệp Dược niêm yết (DP1, DTP, DAN, TRA, CDP, DTG) và 3.736 dự án đầu tư công quy mô ≥ 500 tỷ. |
| `app/thuy-san/page.tsx` | Server | ✅ **Hub Ngành Thủy Sản**: Kết nối số liệu VASEP 10T/2026, giá nguyên liệu hàng tuần (cá tra, tôm, nghêu) và KQKD BCTC Q3/2026 của 12 cổ phiếu tiêu biểu. |
| `app/nghien-cuu-ai/page.tsx` | Server | ✅ **Hub Nghiên Cứu Định Giá RNAV**: Bóc tách giá trị ròng tài sản doanh nghiệp, mô hình RNAV và định giá chuyên sâu. |
| `app/vi-mo/page.tsx` | Server | ✅ **Hub Dữ Liệu Vĩ Mô**: Lãi suất, tăng trưởng tín dụng, cung tiền M2, lạm phát CPI và tỷ giá. |
| `app/quy-mo/page.tsx` | Server | ✅ **Hub Quy Mô Vốn Hóa**: Phân lớp cổ phiếu Large-Cap, Mid-Cap, Small-Cap và Penny trên 3 sàn. |
| `app/danh-muc/page.tsx` | Server (async) | ✅ **Trang Watchlist Cá Nhân**: Nạp SSR 0ms, bảng compact hiển thị 100+ mã cổ phiếu, quản lý danh mục, bulk import hàng loạt mã. |
| `app/bo-loc/page.tsx` | Server | ✅ **Bộ Lọc Cổ Phiếu WiData**: Sàng lọc 1.530+ mã theo P/E, P/B, ROE, biên LN, dòng tiền, nợ vay và tín hiệu kỹ thuật. |
| `app/stock/[symbol]/page.tsx` | Server (async) | ✅ **Trang Chi Tiết Cổ Phiếu Chuyên Sâu**: Header giá realtime 24hMoney, 7 tab phân tích chuyên sâu (Đánh giá 360, BCTC 16 năm kèm thuyết minh chi tiết 34 quý, Kế hoạch KD 10 năm, Cổ đông & Giao dịch nội bộ, Định giá P/E-P/B Bands + EPS, ĐHĐCĐ 2026, Báo cáo CTCK). |
| `app/cang-bien/page.tsx` | Server | ✅ **Trang Chủ Tình Báo Cảng Biển**: Giao diện Dark Oceanic, KPI cảng biển, 12 mã niêm yết, nhật ký tàu realtime, 15 cảng vụ, theo dõi cước vận tải biển. |
| `app/cang/[ticker]/page.tsx` | Server (async) | ✅ **Trang Phân Tích Cảng Biển Từng Mã**: KPI sản lượng, biểu đồ SVG gradient, bảng so sánh cùng kỳ YoY 12 tháng, danh mục cầu bến và nhật ký tàu. |
| `app/thi-truong/page.tsx` | Server (async) | ✅ **Trang Thị Trường Vĩ Mô**: Biến động thế giới, hàng hóa, tỷ giá, crypto, biểu đồ định giá P/E-P/B VN-Index từ 2005, dư nợ margin 41 CTCK. |
| `app/nganh/page.tsx` | Server (async) | ✅ **Trang Bản Đồ Ngành & Vốn Hóa**: Cơ cấu vốn hóa, lợi nhuận, định giá P/E, P/B, ROE toàn bộ các ngành cấp 1 & cấp 2 ICB. |
| `app/bao-cao/page.tsx` | Client (Suspense) | ✅ Kho 4.900+ báo cáo phân tích: tìm kiếm, sort, lọc theo mã và ngành. |
| `app/bao-cao/[slug]/page.tsx` | Server (async) | ✅ Viewer báo cáo + `<ReportAudioPlayer/>` (Google Translate TTS) + `<DriveDocViewer/>`. |
| `app/xuat-nhap-khau/page.tsx` | Server | ✅ Thống Kê XNK Hải quan 7 năm (2020-2026): Cán cân và ma trận xuất nhập khẩu qua `<TradeBalanceChart/>` + `<CustomsTradeViewer/>`. |

### 3.2 Key API Routes (`app/api/`)

| File | Loại | Trạng thái & Mô tả |
|---|---|---|
| `app/api/mcp/route.ts` | POST/GET | ✅ **MCP Server Endpoint**: Tiếp nhận truy vấn JSON-RPC từ các AI client qua giao thức Model Context Protocol. |
| `app/api/admin/vip/route.ts` | POST | ✅ **API Quản Trị VIP**: Kích hoạt và thu hồi quyền VIP cho người dùng qua email, hỗ trợ các gói thời hạn linh hoạt. |
| `app/api/admin/overview/route.ts` | GET | ✅ **API Thống Kê Admin**: Cung cấp tổng số người dùng, tỷ lệ hoạt động và các chỉ số vận hành hệ thống. |
| `app/api/payment/webhook/route.ts` | POST | ✅ **Webhook Cổng Thanh Toán**: Xử lý callback thanh toán tự động nâng cấp VIP cho khách hàng. |
| `app/api/disclosures/route.ts` | GET | ✅ **API Công Bố Thông Tin 3 Sàn**: Cung cấp danh sách công bố HOSE, HNX, UPCOM, hỗ trợ phân trang, lọc sàn, loại tài liệu và mã cổ phiếu. |
| `app/api/stock/[symbol]/live-quote/route.ts` | GET | ✅ **API Giá Realtime**: Tích hợp 24hMoney Ticker API, cache 60s, cung cấp giá khớp, biên độ, % thay đổi và ngày giao dịch. |
| `app/api/reports/company/[symbol]/route.ts` | GET | ✅ **API Báo Cáo Phân Tích Doanh Nghiệp**: Tổng hợp báo cáo phân tích theo từng mã từ các CTCK lớn (VNDirect, SSI, HSC, Vietcap...), cache server-side. |
| `app/api/screener/stocks/route.ts` | GET | ✅ **API Bộ Lọc WiData**: Truy xuất dữ liệu lọc của 1.530+ mã cổ phiếu với đầy đủ chỉ số cơ bản, định giá và kỹ thuật. |
| `app/api/reports/[id]/audio/route.ts` | GET | ✅ **API TTS Google Translate**: Trích xuất nội dung văn bản báo cáo, chunking câu <= 180 ký tự, tải song song đa luồng và ghép buffer MP3 trả về audio stream. |
| `app/api/customs-trade/route.ts` | GET | ✅ **API Dữ Liệu XNK**: Phục vụ dữ liệu cán cân thương mại và ma trận mặt hàng xuất nhập khẩu 7 năm (2020-2026). |
| `app/api/analytics/track/route.ts` | POST | ✅ **API Theo Dõi Pageview**: Ghi nhận lượt truy cập trang web phục vụ thống kê nội bộ trên trang quản trị. |

### 3.3 Components Nổi Bật

| Thư mục / File | Trạng thái & Tính năng |
|---|---|
| `components/auth/AuthGate.tsx` | ✅ Component cổng bảo vệ nội dung phân cấp (Guest / Member / VIP), hiển thị giao diện mờ (blur), danh sách quyền lợi và nút kêu gọi hành động (CTA). |
| `components/auth/VipUpgradeModal.tsx` | ✅ Modal nâng cấp VIP hiển thị chi tiết các đặc quyền cao cấp (thuyết minh 34 quý, định giá RNAV, tình báo DWT cảng biển, MCP không giới hạn). |
| `components/auth/UserNav.tsx` | ✅ Điều hướng người dùng trên Header: hiển thị avatar, email, huy hiệu VIP, trạng thái đăng nhập, menu nhanh và tự động đồng bộ metadata mới nhất. |
| `components/thuy-san/ThuySanDashboard.tsx` | ✅ Bảng điều khiển ngành thủy sản: kim ngạch xuất khẩu 10T/2026, giá nguyên liệu cá tra/tôm hàng tuần, so sánh KQKD BCTC Q3 của 12 doanh nghiệp. |
| `components/bidding/BiddingDashboard.tsx` | ✅ Bảng điều khiển đấu thầu y tế & đầu tư công: chi tiết các gói thầu trúng ETC theo quý và tiến độ hấp thụ vốn 3.736 dự án ĐTC. |
| `components/stock/StockEvaluationHeader.tsx` | ✅ Thanh tiêu đề cổ phiếu: logo, tên công ty, giá realtime (polling 60s), badge biến động, giá trần/sàn, P/E, P/B forward. |
| `components/stock/StockBctcReportView.tsx` | ✅ Trình xem báo cáo tài chính chuyên sâu và thuyết minh BCTC chi tiết 34 quý (bóc tách nợ vay, dự án dở dang, hàng tồn kho). |
| `components/stock/BusinessPlanComparison.tsx` | ✅ Đối chiếu chi tiết chỉ tiêu kế hoạch kinh doanh ĐHĐCĐ giao và kết quả thực hiện thực tế qua các năm (1 năm / 3 năm / 5 năm / 10 năm). |
| `components/stock/StockAgmReportView.tsx` | ✅ Trình xem báo cáo Đại hội đồng Cổ đông (AGM) 2026 chi tiết cho 867+ mã cổ phiếu. |
| `components/watchlist/WatchlistTable.tsx` | ✅ Bảng theo dõi cổ phiếu rút gọn (Compact View), tối ưu cho danh mục từ 20 đến 100+ mã. |
| `components/watchlist/BulkImportModal.tsx` | ✅ Modal dán và nhập danh sách cổ phiếu hàng loạt vào Watchlist chỉ trong 1 thao tác. |
| `components/navigation/VerticalSidebarNav.tsx` | ✅ Sidebar dọc cố định, hỗ trợ thu nhỏ/mở rộng, lưu trạng thái vào `localStorage` và đồng bộ `data-sidebar` trên `<html>`. |
| `components/navigation/MobileBottomNav.tsx` | ✅ Thanh điều hướng đáy dành riêng cho điện thoại, tối ưu thao tác một tay. |
| `components/navigation/GlobalSearchModal.tsx` | ✅ Command Palette (`Ctrl+K` / `Cmd+K`) tìm kiếm toàn diện mã cổ phiếu, báo cáo, ngành, cảng biển. |

---

## 4. Tiến độ chi tiết (Status Checklist)

### ✅ Đã hoàn thành (Done)
- [x] **Hệ Thống Model Context Protocol (MCP) Server & OAuth 2.0 (2026-10-31 → 2026-11-10)**:
  - [x] Xây dựng server MCP chuẩn hóa tại `/api/mcp` với thư viện `@modelcontextprotocol/sdk`.
  - [x] Triển khai RFC 8414 & RFC 9728 OAuth 2.0 Authorization Server và Dynamic Client Registration.
  - [x] Hợp nhất thành 4 công cụ AI trọng tâm: `tra_cuu_ho_so_tai_chinh`, `bo_loc_co_phieu`, `so_sanh_co_phieu`, `su_kien_va_cong_bo_thong_tin`.
  - [x] Cài đặt chính sách hạn mức: Free Member tối đa 5 câu hỏi/ngày, Hội viên VIP không giới hạn.
  - [x] Trang giới thiệu và hướng dẫn kết nối 1-click cho Gemini CLI, Claude, Cursor, ChatGPT tại `/ket-noi-mcp` và `/mcp`.
- [x] **Hệ Thống Hội Viên VIP & Quản Trị Admin (2026-10-25 → 2026-11-12)**:
  - [x] Thiết lập cơ chế phân tầng quyền hạn với component `AuthGate` (Guest / Member / VIP).
  - [x] Xây dựng modal nâng cấp VIP `VipUpgradeModal` với đầy đủ đặc quyền phân tích chuyên sâu.
  - [x] Xây dựng trang quản trị `/admin` và API `/api/admin/vip`: kích hoạt hoặc thu hồi VIP nhanh theo email, hỗ trợ gói 1 tháng, 6 tháng, 1 năm hoặc số ngày tùy chỉnh.
  - [x] Tích hợp webhook cổng thanh toán tự động `/api/payment/webhook`.
  - [x] Tự động làm mới và đồng bộ Supabase metadata trên client trong `UserNav.tsx` ngay khi Admin kích hoạt quyền VIP.
- [x] **Tối Ưu Bảo Mật, Rate Limiting & Link Prefetch (2026-10-26 → 2026-11-12)**:
  - [x] Nâng cấp `middleware.ts`: Tách riêng bucket rate-limit cho request prefetch ngầm (`isPrefetchRequest`) với hạn mức 120 req/phút/IP để chống chặn nhầm người dùng.
  - [x] Giới hạn tốc độ chống cào hàng loạt trang `/stock/[symbol]` (30 mã/phút/IP).
  - [x] Gắn `prefetch={false}` cho toàn bộ link mã cổ phiếu trên các bảng biểu lớn (`stock-card-grid.tsx`, `stock-link.tsx`, `WatchlistManager.tsx`, `market-treemap.tsx`, `IndustryTable.tsx`).
  - [x] Thiết lập Cloudflare IP header priority, chặn bot cào dữ liệu và các bẫy bảo mật `api/security/trap`.
- [x] **Hệ Thống Hub Ngành & Tình Báo Chuyên Sâu (2026-09-26 → 2026-11-12)**:
  - [x] **Ngành Điện (`/nganh-dien`)**: Dữ liệu 36 mã, bóc tách LNST thực tế, tỷ lệ hoàn thành kế hoạch năm và Quy hoạch Điện VIII.
  - [x] **Đấu Thầu Y Tế & Đầu Tư Công (`/dau-thau`)**: Theo dõi các gói thầu ETC của doanh nghiệp Dược (DP1, DTP, DAN, TRA, CDP, DTG) và 3.736 dự án ĐTC quy mô ≥ 500 tỷ.
  - [x] **Ngành Thủy Sản VASEP (`/thuy-san`)**: Cập nhật kim ngạch xuất khẩu 10T/2026, giá cá tra/tôm hàng tuần đầu T11/2026 và KQKD BCTC Q3 của 12 cổ phiếu.
  - [x] **Nghiên Cứu Định Giá AI & RNAV (`/nghien-cuu-ai`)**: Bóc tách tài sản ròng, mô hình RNAV, tính điểm định giá động theo giá realtime 24hMoney.
  - [x] **Vĩ Mô & Quy Mô (`/vi-mo`, `/quy-mo`)**: Dữ liệu vĩ mô và phân lớp quy mô vốn hóa thị trường.
- [x] **Kho Báo Cáo Tài Chính & Thuyết Minh BCTC Q3/2026 (2026-10-02 → 2026-11-12)**:
  - [x] Bổ sung hàng trăm báo cáo thuyết minh BCTC Q3/2026 chi tiết (nợ vay, hàng tồn kho, dở dang) cho các doanh nghiệp lớn.
  - [x] Mở rộng 867+ báo cáo ĐHĐCĐ 2026 (`StockAgmReportView.tsx`).
  - [x] Đối chiếu Kế hoạch kinh doanh ĐHĐCĐ 10 năm liên tục (`BusinessPlanComparison.tsx`).
  - [x] Tính năng nạp hồ sơ BCTC và ĐHĐCĐ vào AI cá nhân (Gemini, NotebookLM, ChatGPT, Claude, DeepSeek).
- [x] **Tình Báo Cảng Biển & Hàng Hải Nâng Cấp (2026-09-17 → 2026-11-13)**:
  - [x] Đồng bộ số liệu DWT chuẩn cho Cảng Hải Phòng (`PHP`) và Cảng MIPEC khớp 100% DLCB.
  - [x] Thiết lập cron và script tự động cập nhật dữ liệu cảng biển 1 lần/ngày khi khởi động máy.
  - [x] Theo dõi biến động chỉ số cước vận tải biển quốc tế (BDI, WCI, BDTI, BCTI).
- [x] **Hợp Nhất Dữ Liệu Báo Cáo & Tối Ưu Vercel Build (2026-11-12)**:
  - [x] Hợp nhất an toàn 7 file báo cáo JSON (`company_reports_snapshot.json` 4.947 báo cáo, `industry-reports.json` 491 báo cáo, cùng báo cáo trái phiếu, IR, vĩ mô, chiến lược) không làm mất dữ liệu.
  - [x] Kiểm tra và hoàn tất build local Next.js 16 Turbopack (68/68 static pages, exit code 0) và deploy thành công lên Vercel production.

---

## 5. Nhật ký thay đổi kỹ thuật (Changelog)

> Ghi theo thứ tự mới → cũ. **Quy tắc (2026-08-15)**: chỉ cập nhật khi người dùng yêu cầu đích danh — thêm dòng mới vào đầu danh sách này.

| Timestamp | File(s) sửa | Nội dung thay đổi |
|---|---|---|
| 2026-11-14 | `GEMINI_CONTEXT.md` | **Đồng bộ toàn diện ngữ cảnh dự án (theo yêu cầu đích danh của người dùng)**: <br>1. Cập nhật tổng quan kiến trúc hệ thống: Chuẩn Model Context Protocol (MCP) Server & OAuth 2.0 (RFC 8414/9728), phân tầng quyền hạn Hội viên VIP & AuthGate 3 tầng, hệ thống Hub ngành chuyên sâu (Ngành Điện, Đấu Thầu Y Tế & ĐTC, Thủy Sản VASEP, Nghiên Cứu Định Giá RNAV, Vĩ Mô & Quy Mô).<br>2. Cập nhật sơ đồ luồng dữ liệu kiến trúc Mermaid tích hợp phân tầng VIP, MCP ecosystem và các Hub chuyên sâu.<br>3. Bổ sung danh mục chi tiết các Pages mới, API routes mới (`/api/mcp`, `/api/admin/vip`, `/api/payment/webhook`...) và Components mới.<br>4. Cập nhật Status Checklist và tổng hợp toàn bộ các mốc phát triển kỹ thuật từ 2026-09-10 đến 2026-11-14. |
| 2026-11-13 | `app/admin/page.tsx` | **Thêm nút Về trang chủ trên thanh Header trang quản trị**: Bổ sung liên kết điều hướng nhanh từ trang Admin quay lại trang chủ. Push `e33106b`. |
| 2026-11-12 (Tối) | `components/stock/StockBctcReportView.tsx` · `content/bctc/Quy_3_2026/**` | **Khắc phục ReferenceError khởi tạo biến trong StockBctcReportView & Bổ sung thuyết minh BCTC Q3**: Sửa lỗi tham chiếu trước khi khởi tạo trong view BCTC, cập nhật thuyết minh Q3/2026 cho các mã DRI, DSN. Push `ad5a504`. |
| 2026-11-12 | `app/api/admin/vip/route.ts` (mới) · `app/admin/page.tsx` · `middleware.ts` · `components/auth/**` · `components/stock-detail-view.tsx` · `app/dau-thau/**` · `app/thuy-san/**` · `data/**` | **Nâng cấp kích hoạt VIP Admin, tối ưu rate-limit prefetch, cập nhật dữ liệu Thủy sản, Đấu thầu & Báo cáo**: <br>1. Xây dựng API `/api/admin/vip` và giao diện admin kích hoạt/thu hồi VIP nhanh theo email với các gói linh hoạt (1 tháng, 6 tháng, 1 năm, tùy chỉnh).<br>2. Tối ưu `middleware.ts` tách riêng bucket cho `isPrefetchRequest` (max 120 req/phút/IP), đặt `prefetch={false}` trên các bảng cổ phiếu chống nghẽn kết nối.<br>3. Điều chỉnh `AuthGate` phần Kế hoạch kinh doanh 10 năm sang tier `member` (đăng nhập miễn phí).<br>4. Cập nhật dữ liệu VASEP 10T/2026 ngành Thủy sản, dữ liệu Đấu thầu Y tế ETC & 3.736 dự án ĐTC.<br>5. Hợp nhất an toàn 7 file báo cáo JSON (giữ trọn vẹn 4.947 báo cáo doanh nghiệp và 491 báo cáo ngành). Push `9f7144c`. |
| 2026-11-10 | `app/nganh-dien/**` · `lib/nganh-dien-data.ts` · `data/nganh_dien_snapshot.json` | **Cập nhật dữ liệu LNST thực tế và bộ lọc đánh giá triển vọng 36 mã cổ phiếu ngành điện**: Bổ sung tiến độ hoàn thành kế hoạch năm và tác động Quy hoạch Điện VIII. Push `d185649`. |
| 2026-11-10 | `lib/mcp/server.ts` · `app/ket-noi-mcp/page.tsx` | **Thiết lập hạn mức truy vấn MCP**: Giới hạn tối đa 5 câu hỏi/ngày đối với tài khoản Free Member và không giới hạn đối với Hội viên VIP; chuẩn hóa danh sách 4 công cụ AI hợp nhất. Push `e075d8f`, `c1f73af`. |
| 2026-11-10 | `app/api/payment/webhook/route.ts` (mới) · `components/auth/VipUpgradeModal.tsx` (mới) · `lib/supabase/**` | **Tích hợp webhook cổng thanh toán & Modal nâng cấp VIP**: Xử lý tự động nâng cấp VIP khi nhận webhook thanh toán, xây dựng modal chi tiết đặc quyền VIP. Push `65c36e2`. |
| 2026-11-09 | `data/maritime/**` · `scripts/cangbien/**` | **Bổ sung số liệu DWT chuẩn cho Cảng Hải Phòng (PHP)**: Đồng bộ số liệu cầu bến và năng lực đón tàu khớp 100% dữ liệu hàng hải thực tế. Push `8ca04c7`. |
| 2026-11-08 | `components/auth/**` · `lib/financial-charts-service.ts` · `lib/valuation-history-service.ts` | **Nâng cấp hệ thống xác thực miễn phí & Cập nhật biểu đồ tài chính quý**: Tối ưu trải nghiệm đăng nhập Google/Email và cập nhật chuỗi định giá P/E-P/B. Push `0177d20`. |
| 2026-11-07 | `scripts/cangbien/**` | **Tự động cập nhật dữ liệu cảng biển 1 lần/ngày**: Thiết lập script tự động chạy khi khởi động máy để đồng bộ lịch trình tàu. Push `3b7ead4`. |
| 2026-11-07 | `lib/mcp/**` · `app/api/mcp/**` | **Tối ưu hóa công cụ MCP Server**: Tinh giản bundle dữ liệu cổ phiếu tập trung vào BCTC Q3, AGM 2026 và AI Deep Research; hoàn thiện công cụ lọc và so sánh cổ phiếu. Push `bcb4015`, `bd38372`, `8c99ecc`. |
| 2026-11-07 | `app/vi-mo/**` · `app/quy-mo/**` · `content/bctc/**` | **Tích hợp Hub Vĩ Mô & Quy Mô Doanh Nghiệp**: Chuẩn hóa cấu trúc tài liệu BCTC và phân lớp quy mô thị trường. Push `07af495`. |
| 2026-11-01 | `app/nghien-cuu-ai/**` · `lib/ai-research-service.ts` | **Tính điểm định giá RNAV động theo giá realtime 24hMoney**: Kết nối giá live thời gian thực cho toàn bộ danh mục cổ phiếu phân tích định giá tài sản ròng. Push `85a0f02`, `72ed643`, `02726e9`. |
| 2026-10-31 | `lib/mcp/**` (mới) · `app/api/mcp/**` (mới) · `app/oauth/**` (mới) · `app/.well-known/**` (mới) | **Triển khai Model Context Protocol (MCP) Server & OAuth 2.0**: Xây dựng máy chủ MCP hoàn chỉnh hỗ trợ kết nối trực tiếp các AI client (Gemini, Claude, Cursor, ChatGPT) với kho dữ liệu đầu tư. Push `57685e2`, `6f43f8e`. |
| 2026-10-25 | `app/admin/**` (mới) · `lib/analytics-service.ts` · `app/api/analytics/**` | **Bổ sung trang Quản trị Admin & Hệ thống phân tích Pageview**: Theo dõi người dùng, phiên truy cập và lượt xem trang. Push `e3ed8c5`, `c4f70e6`. |
| 2026-10-12 → 2026-10-22 | `scripts/monitor/**` · `data/evaluation_cache/**` · `content/bctc/**` | **Xây dựng hệ thống Bot Radar quét và phát hiện BCTC Q3/2026 tự động**: Quét liên tục các nguồn công bố Vietstock, FPTS và website doanh nghiệp, gửi thông báo Discord và cập nhật thuyết minh BCTC. Push `b6a0291`, `7baacf2`, `cddba17`. |
| 2026-09-26 → 2026-09-29 | `app/nganh-dien/**` (mới) · `app/dau-thau/**` (mới) · `app/thuy-san/**` (mới) | **Tích hợp các Hub ngành chuyên sâu: Ngành Điện, Đấu Thầu Y Tế & Thủy Sản VASEP**: Mở rộng hệ sinh thái phân tích chuyên ngành phục vụ nhà đầu tư. Push `872d499`, `d9f5b2e`. |
| 2026-09-10 (Tối) | `components/watchlist/BulkImportModal.tsx` (mới) · `components/watchlist/WatchlistTable.tsx` · `components/news-dashboard.tsx` · `app/danh-muc/page.tsx` · `lib/supabase/client.ts` | **Bổ sung tính năng Bulk Import vào Watchlist, tối ưu bảng 100+ mã, sync bộ lọc vào Tin tức/Công bố & chuẩn hóa Redirect**: Xây dựng `BulkImportModal`, thiết kế bảng compact, đồng bộ Watchlist vào trang chủ và chuẩn hóa redirect OAuth. Push `a3174ed`. |
| 2026-09-09 | `lib/supabase/**` (mới) · `components/auth/**` (mới) · `app/auth/**` (mới) · `app/danh-muc/page.tsx` (mới) | **Tích hợp Supabase Auth & Hệ thống Watchlist cá nhân**: Tích hợp `@supabase/ssr`, tạo trang `/danh-muc` nạp SSR 0ms, bảo vệ bằng Supabase RLS. Push `b5ff28c`. |
| 2026-09-08 | `app/page.tsx` · `components/news-dashboard.tsx` · `app/api/disclosures/route.ts` · `data/agm_reports/**` | **Tích hợp Tab Công Bố Thông Tin 3 Sàn vào Trang Chủ & Mở rộng Báo Cáo ĐHĐCĐ 2026**: Đưa tab Công Bố 3 Sàn làm mặc định, mở rộng kho báo cáo ĐHĐCĐ chi tiết. Push `367e6be`. |
| 2026-09-07 | `components/mobile-bottom-nav.tsx` (mới) · `components/site-header.tsx` · `app/layout.tsx` | **Tối ưu hóa giao diện đa thiết bị**: Xây dựng Mobile Bottom Navigation Bar, touch docking tabs, scroll chevrons và tối ưu chuyển tab 0ms. Push `3109a20`, `dd9a884`. |
| 2026-09-06 | `components/vertical-sidebar-nav.tsx` · `components/global-search-modal.tsx` · `components/stock/**` | **Phục hồi toàn diện giao diện & Tính năng chuyên sâu**: Khôi phục sidebar dọc, Command Palette `Ctrl+K`, 7 biểu đồ BCTC chuyên sâu 16 năm và bộ lọc WiData. Push `fb18180`, `a6cd741`. |
| 2026-09-04 → 2026-09-05 | `scripts/customs_etl/**` · `data/customs_trade_snapshot.json` · `data/maritime/dashboard_summary.json` | **Tích hợp Dữ Liệu XNK Lịch Sử 7 Năm (2020-2026) & Cập Nhật Sản Lượng Cảng MIPEC Tháng 8**: Nhập dữ liệu XNK 7 năm và cập nhật nhật ký tàu cảng biển. Push `244b5a8`, `6dcfdc2`. |
| 2026-09-03 | `lib/live-quote-service.ts` (mới) · `app/api/stock/[symbol]/live-quote/route.ts` (mới) · `components/stock/StockEvaluationHeader.tsx` | **Tích hợp API cập nhật giá thời gian thực (Live Quote) từ 24hMoney**: Polling 60s ngầm, hiển thị giá biến động realtime, tối ưu hóa bundle Vercel deploy ổn định. Push `935051f`. |
| 2026-08-29 → 2026-09-02 | `scripts/cangbien/**` (mới) · `app/cang-bien/**` (mới) · `app/thi-truong/**` (mới) · `app/nganh/**` (mới) · `app/bo-loc/**` (mới) | **Triển khai Hệ Thống Dữ Liệu Cảng Biển, Thị Trường Vĩ Mô, Bản Đồ Ngành và Tách Bộ Lọc WiData**: Xây dựng tình báo hàng hải, trang thị trường vĩ mô và phân ngành ICB. Push `d710fab`, `8e1ec7d`. |

---
*Cập nhật lần cuối: 2026-11-14 · Người duy trì: Nguyễn Trung Nhật (trungnhat232@gmail.com)*
