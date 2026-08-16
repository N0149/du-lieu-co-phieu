#!/usr/bin/env node
/**
 * Tạo lại static snapshot từ Google Drive (chạy qua dev server local).
 *
 * Cách dùng:
 *   node scripts/refresh-snapshot.mjs
 *
 * Script tự kiểm tra http://localhost:3000/api/reports?live=1 (bắt buộc đúng folder/env
 * trong .env.local). Nếu server chưa chạy, script tự khởi động dev server, đợi sẵn sàng,
 * lấy dữ liệu, ghi vào data/reports-snapshot.json rồi tự tắt server.
 *
 * Sau khi chạy xong: commit file data/reports-snapshot.json mới lên GitHub.
 */
import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "data", "reports-snapshot.json");
const BASE = process.env.SNAPSHOT_API ?? "http://localhost:3000";
// ?live=1 ép route chạy chế độ LIVE (lấy mới từ Drive) thay vì trả snapshot cũ.
const LIVE_API = `${BASE}/api/reports?live=1`;

async function getJson(url, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// Kiểm tra server đã sẵn sàng chưa: hit trang chủ `/` (trả nhanh, KHÔNG chạy live-fetch
// Drive) → hoạt động đúng cả khi env REPORTS_SOURCE=live (trong GitHub Actions CI).
async function isServerUp() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    try {
      const res = await fetch(`${BASE}/`, { signal: ctrl.signal });
      return res.ok;
    } finally {
      clearTimeout(t);
    }
  } catch {
    return false;
  }
}

// Lấy dữ liệu LIVE từ Drive (mất ~10-15s vì phải đọc nội dung từng báo cáo).
async function fetchLiveReports() {
  const data = await getJson(LIVE_API, 60000);
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("API trả về danh sách rỗng — kiểm tra env GOOGLE_DRIVE_* trong .env.local");
  }
  // BẢO VỆ: nếu dữ liệu trông giống fallback tĩnh (≤20 mục, không có reportDate — ví dụ khi
  // thiếu secret GOOGLE_DRIVE_* trong GitHub Actions) thì KHÔNG ghi đè snapshot tốt đang có.
  const looksLikeStaticFallback =
    data.length <= 20 && data.every((r) => !r || !r.reportDate);
  if (looksLikeStaticFallback) {
    throw new Error(
      "API trả về danh sách fallback tĩnh (có thể thiếu secret GOOGLE_DRIVE_* trong GitHub Actions) — không ghi đè snapshot.",
    );
  }
  return data;
}

let child = null; // dev server do script tự khởi động (cần tắt khi xong)

async function main() {
  let data;
  if (await isServerUp()) {
    console.log(`✓ Dùng server đang chạy tại ${BASE}`);
    data = await fetchLiveReports();
  } else {
    console.log(`⚠  Không thấy server tại ${BASE} — tự khởi động dev server...`);
    child = spawn(
      process.execPath,
      [path.join(ROOT, "node_modules", "next", "dist", "bin", "next"), "dev"],
      { cwd: ROOT, stdio: ["ignore", "pipe", "inherit"] },
    );

    const deadline = Date.now() + 120_000;
    while (!(await isServerUp())) {
      if (Date.now() > deadline) {
        throw new Error("Không thể khởi động dev server trong 120s");
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    data = await fetchLiveReports();
  }

  const pretty = JSON.stringify(data, null, 2);
  await writeFile(OUT, pretty, "utf8");
  const rel = path.relative(ROOT, OUT);
  console.log(`✓ Đã lưu ${data.length} báo cáo → ${rel}`);
  console.log(`  (${(pretty.length / 1024).toFixed(1)} KB, lúc ${new Date().toISOString()})`);
  console.log("  Nhớ commit file snapshot mới để Vercel deploy lại.");
}

main()
  .catch((err) => {
    console.error(`✗ Thất bại: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    if (child) {
      console.log("Đang tắt dev server do script tự khởi động...");
      child.kill();
    }
  });
