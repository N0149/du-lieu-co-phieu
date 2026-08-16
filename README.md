# Phân Tích Chuyên Sâu Cổ Phiếu — dulieucophieu.com

Cổng dữ liệu đầu tư giá trị: bộ lọc cổ phiếu định giá hấp dẫn + kho báo cáo phân tích (cổ phiếu, hàng hóa & ngành, kinh tế vĩ mô) đồng bộ trực tiếp từ Google Drive.

## Tech stack

- **Next.js 16** (App Router) · React 19 · TypeScript 5.7 · Tailwind CSS v4
- **Package manager**: pnpm (`pnpm-lock.yaml` + `pnpm-workspace.yaml`)
- **Dữ liệu**: Google Drive API v3 — folder báo cáo công khai, export Google Docs → text/plain

## Cài đặt & chạy local

```bash
# 1. Cài biến môi trường (sao chép từ .env.example)
cp .env.example .env.local
# rồi điền GOOGLE_DRIVE_API_KEY

# 2. Cài dependencies & chạy dev
pnpm install
pnpm dev          # → http://localhost:3000
```

> Lưu ý: nếu `pnpm install` gặp lỗi mạng khi tải package, dùng dependencies có sẵn trong `node_modules`:
> `node node_modules\next\dist\bin\next dev`

## Build production

```bash
pnpm build   # type-check + tối ưu + prerender 23 trang (bao gồm /ticker/[symbol] SSG)
pnpm start   # chạy bản production
```

Build **có bật type validation** (không dùng `ignoreBuildErrors`) — lỗi TypeScript sẽ chặn build.

## Biến môi trường

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `GOOGLE_DRIVE_API_KEY` | ✅ | API key Google Drive (console.cloud.google.com) |
| `GOOGLE_DRIVE_FOLDER_ID` | ✅ | ID folder chứa báo cáo (đã có giá trị mặc định trong route) |

`.env*.local` bị gitignore — **không** commit. Trên môi trường deploy phải đặt thủ công.

## Triển khai lên Vercel

1. **Push repo** lên GitHub/GitLab (pnpm-lock.yaml phải được commit — đã xóa package-lock.json để Vercel tự nhận pnpm).
2. **Import project** tại vercel.com → framework tự nhận **Next.js**, build command `pnpm build`.
3. **Đặt Environment Variables** trong Vercel (Settings → Environment Variables):
   - `GOOGLE_DRIVE_API_KEY` (giá trị trong `.env.local`)
   - `GOOGLE_DRIVE_FOLDER_ID` (`1eI8C_uDJlKDvNbzF9YOOr6QNCUIdw7o8`)
4. **Deploy** → nhận URL `*.vercel.app`.
5. **Gắn tên miền** `dulieucophieu.com` tại Vercel (Settings → Domains) + trỏ DNS (A/ALIAS/CNAME theo hướng dẫn Vercel).
   - `metadataBase` đã được cấu hình `https://dulieucophieu.com` cho SEO.
6. Kiểm tra: `/`, `/bao-cao`, `/ticker/DAN`, `/api/reports`.

> API báo cáo đọc Google Drive tại **request time** (không cần API key lúc build). Folder & file báo cáo phải **chia sẻ công khai** ("Anyone with the link → Viewer").

## Cấu trúc thư mục

- `app/` — routing (trang chủ bộ lọc, `/bao-cao`, `/ticker/[symbol]`, API `/api/reports`)
- `components/` — Screener, site-header/footer, stock-search, ticker-tabs, DriveDocViewer…
- `lib/` — data.ts, report.ts, report-stocks.ts, use-reports.ts, format.ts
- `data/` & `content/` — BCTC JSON + báo cáo MDX
