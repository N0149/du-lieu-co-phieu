#!/usr/bin/env node
/**
 * Tạo lại static snapshot từ Google Drive (chạy qua dev server local).
 *
 * Cách dùng:
 *   node scripts/refresh-snapshot.mjs
 *
 * Script tự kiểm tra http://localhost:3000/api/reports?live=1 (bắt buộc đúng folder/env
 * trong .env.local — hoặc env từ GitHub Actions CI). Nếu server chưa chạy, script tự khởi
 * động dev server (cross-platform: `pnpm exec next dev` — pnpm có sẵn ở local & CI), chờ
 * server sẵn sàng bằng polling health-check, lấy dữ liệu, ghi data/reports-snapshot.json,
 * tắt dev server an toàn rồi exit(0).
 *
 * Sau khi chạy xong: commit file data/reports-snapshot.json mới lên GitHub.
 */
import { writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "data", "reports-snapshot.json");
const BASE = process.env.SNAPSHOT_API ?? "http://localhost:3000";
// ?live=1 ép route chạy chế độ LIVE (lấy mới từ Drive) thay vì trả snapshot cũ.
const LIVE_API = `${BASE}/api/reports?live=1`;
// Thời gian tối đa chờ dev server sẵn sàng (CI cold-compile Turbopack có thể chậm).
const SERVER_WAIT_MS = 180_000;
const POLL_INTERVAL_MS = 2000;
const HEALTH_TIMEOUT_MS = 5000;

// ---- Helper HTTP ----
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
    const t = setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT_MS);
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

// ---- Khởi động dev server (cross-platform) ----
function hasPnpm() {
  try {
    const r = spawnSync(
      process.platform === "win32" ? "pnpm.cmd" : "pnpm",
      ["--version"],
      { stdio: "ignore", shell: process.platform === "win32" },
    );
    return r.status === 0;
  } catch {
    return false;
  }
}

// Cross-platform, KHÔNG dùng shell (tránh cảnh báo DEP0190 + lệch separator):
// - POSIX/Linux (CI): dùng `pnpm exec next dev` — pnpm resolve đúng bin `next`, không hardcode path.
// - Windows: spawn node trực tiếp với bin next qua path.join (đúng separator, không hardcode backslash);
//   tránh phụ thuộc pnpm.cmd cần shell.
function resolveStartCommand() {
  if (process.platform !== "win32" && hasPnpm()) {
    return { command: "pnpm", args: ["exec", "next", "dev"], shell: false };
  }
  return {
    command: process.execPath,
    args: [path.join(ROOT, "node_modules", "next", "dist", "bin", "next"), "dev"],
    shell: false,
  };
}

function spawnDevServer() {
  const { command, args, shell } = resolveStartCommand();
  console.log(`  Lệnh: ${command} ${args.join(" ")}`);
  // stdio: inherit stdout+stderr để toàn bộ log của next dev hiển thị (rất quan trọng khi debug CI).
  return spawn(command, args, {
    cwd: ROOT,
    stdio: ["ignore", "inherit", "inherit"],
    shell,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
}

// Polling health-check cho tới khi server sẵn sàng; fail NHANH nếu server thoát sớm.
function waitForServer(child) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + SERVER_WAIT_MS;
    let settled = false;
    let exitInfo = null;

    child.on("exit", (code, signal) => {
      exitInfo = { code, signal };
    });
    child.on("error", (err) => {
      if (!settled) {
        settled = true;
        reject(new Error(`Không thể khởi động dev server: ${err.message}`));
      }
    });

    (async function poll() {
      while (Date.now() < deadline) {
        if (exitInfo) {
          settled = true;
          reject(
            new Error(
              `Dev server thoát sớm trước khi sẵn sàng (exit=${exitInfo.code}, signal=${exitInfo.signal}) — xem log phía trên.`,
            ),
          );
          return;
        }
        if (await isServerUp()) {
          settled = true;
          resolve();
          return;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      if (!settled) {
        settled = true;
        reject(
          new Error(
            `Hết thời gian chờ ${SERVER_WAIT_MS / 1000}s — dev server không sẵn sàng. Xem log phía trên.`,
          ),
        );
      }
    })();
  });
}

// Tắt dev server an toàn, cross-platform (Windows: giết cả cây tiến trình bằng taskkill).
function killDevServer(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
    setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
    }, 3000).unref();
  }
}

// Lấy dữ liệu LIVE từ Drive (mất ~10-15s vì phải đọc nội dung từng báo cáo).
async function fetchLiveReports() {
  const data = await getJson(LIVE_API, 60000);
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("API trả về danh sách rỗng — kiểm tra env GOOGLE_DRIVE_* trong .env.local");
  }
  // BẢO VỆ: nếu dữ liệu trông giống fallback tĩnh (≤20 mục, không có reportDate — ví dụ khi
  // API key sai hoặc thiếu secret GOOGLE_DRIVE_* trong GitHub Actions) thì KHÔNG ghi đè snapshot tốt.
  const looksLikeStaticFallback =
    data.length <= 20 && data.every((r) => !r || !r.reportDate);
  if (looksLikeStaticFallback) {
    throw new Error(
      "API trả về danh sách fallback tĩnh (thường do API key SAI hoặc thiếu secret GOOGLE_DRIVE_* trong GitHub Actions) — không ghi đè snapshot.",
    );
  }
  return data;
}

let child = null; // dev server do script tự khởi động (cần tắt khi xong)

async function main() {
  if (await isServerUp()) {
    console.log(`✓ Dùng server đang chạy tại ${BASE}`);
  } else {
    console.log(`⚠  Không thấy server tại ${BASE} — tự khởi động dev server...`);
    child = spawnDevServer();
    await waitForServer(child);
    console.log("✓ Dev server đã sẵn sàng.");
  }

  const data = await fetchLiveReports();

  const pretty = JSON.stringify(data, null, 2);
  await writeFile(OUT, pretty, "utf8");
  const rel = path.relative(ROOT, OUT);
  console.log(`✓ Đã lưu ${data.length} báo cáo → ${rel}`);
  console.log(`  (${(pretty.length / 1024).toFixed(1)} KB, lúc ${new Date().toISOString()})`);
  console.log("  Nhớ commit file snapshot mới để Vercel deploy lại.");
}

let exitCode = 0;
main()
  .catch((err) => {
    console.error(`✗ Thất bại: ${err.message}`);
    exitCode = 1;
  })
  .finally(() => {
    if (child) {
      console.log("Đang tắt dev server...");
      killDevServer(child);
    }
    // Chờ ngắn để SIGTERM/taskkill có hiệu lực, rồi thoát đúng mã (0 = thành công).
    setTimeout(() => process.exit(exitCode), 500);
  });
