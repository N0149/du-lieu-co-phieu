/**
 * Script tải và giải mã dữ liệu Biểu đồ tài chính chuyên sâu (Quý & Năm)
 * Lưu trữ vĩnh viễn vào data/financial_charts/quarter/ và data/financial_charts/annual/
 *
 * Cách chạy:
 *   node scripts/sync-financial-charts.mjs --symbol=TCB
 *   node scripts/sync-financial-charts.mjs --banks
 *   node scripts/sync-financial-charts.mjs --all
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");

const QUARTER_DIR = path.join(DATA_DIR, "financial_charts", "quarter");
const ANNUAL_DIR = path.join(DATA_DIR, "financial_charts", "annual");

// Tạo thư mục lưu trữ nếu chưa có
fs.mkdirSync(QUARTER_DIR, { recursive: true });
fs.mkdirSync(ANNUAL_DIR, { recursive: true });

const CIPHER_KEY_HEX = "19dd3af428f4cf7d68864cd4c87d8d1c5b489932e84b93ac6528a0dd403a5725";

// Danh sách 27 ngân hàng niêm yết tại Việt Nam
const BANK_SYMBOLS = [
  "TCB", "VCB", "BID", "CTG", "MBB", "ACB", "VPB", "HDB", "STB", "SHB",
  "LPB", "TPB", "MSB", "OCB", "VIB", "SSB", "EIB", "NAB", "BAB", "BVB",
  "KLB", "NVB", "PGB", "SGB", "VAB", "VBB", "ABB"
];

async function decryptApiResponse(res) {
  if (res.headers.get("X-Encrypted") !== "1") {
    return await res.json();
  }
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(CIPHER_KEY_HEX.match(/.{2}/g).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["decrypt"]);
  const rawBytes = new Uint8Array(buf);
  const iv = rawBytes.slice(0, 12);
  const ciphertext = rawBytes.slice(12);
  const decryptedBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(decryptedBuf));
}

async function fetchChartData(symbol, periodType) {
  const url = `https://api.ruatichsan.com/api/v1/data/public/chart/${periodType}/${symbol}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Origin": "https://ruatichsan.com",
      "Referer": `https://ruatichsan.com/company?symbol=${symbol}`
    },
    signal: AbortSignal.timeout(6000)
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return await decryptApiResponse(res);
}

async function syncSymbol(symbol, force = false) {
  const sym = symbol.toUpperCase().trim();
  const qPath = path.join(QUARTER_DIR, `${sym}.json`);
  const aPath = path.join(ANNUAL_DIR, `${sym}.json`);

  if (!force && fs.existsSync(qPath) && fs.existsSync(aPath)) {
    return true;
  }

  let qSuccess = fs.existsSync(qPath);
  let aSuccess = fs.existsSync(aPath);

  // 1. Quý
  if (!qSuccess) {
    try {
      const qData = await fetchChartData(sym, "quarter");
      if (qData) {
        fs.writeFileSync(qPath, JSON.stringify(qData), "utf-8");
        qSuccess = true;
      }
    } catch {}
  }

  // 2. Năm
  if (!aSuccess) {
    try {
      const aData = await fetchChartData(sym, "annual");
      if (aData) {
        fs.writeFileSync(aPath, JSON.stringify(aData), "utf-8");
        aSuccess = true;
      }
    } catch {}
  }

  return qSuccess || aSuccess;
}

async function runPool(items, limit, workerFn) {
  let index = 0;
  let completed = 0;
  const total = items.length;
  let successCount = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      const item = items[i];
      try {
        const ok = await workerFn(item, i, total);
        if (ok) successCount++;
      } catch (err) {
      } finally {
        completed++;
        if (completed % 25 === 0 || completed === total) {
          process.stdout.write(`\r[${completed}/${total}] (${Math.round((completed / total) * 100)}%) - Thành công: ${successCount} mã`);
        }
      }
    }
  });

  await Promise.all(workers);
  process.stdout.write("\n");
  return successCount;
}

async function main() {
  const args = process.argv.slice(2);
  let targets = [];
  const force = args.includes("--force");
  const concurrencyArg = args.find((a) => a.startsWith("--concurrency="));
  const concurrency = concurrencyArg ? parseInt(concurrencyArg.split("=")[1], 10) : 8;

  const symArg = args.find((a) => a.startsWith("--symbol="));
  const topArg = args.find((a) => a.startsWith("--top="));

  if (symArg) {
    targets = [symArg.split("=")[1].toUpperCase().trim()];
  } else if (topArg) {
    const n = parseInt(topArg.split("=")[1], 10) || 50;
    const manifestPath = path.join(DATA_DIR, "longlive_manifest.json");
    if (fs.existsSync(manifestPath)) {
      const mf = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      const items = (mf.items || []).filter(it => it.t && it.cap > 0).sort((a, b) => (b.cap || 0) - (a.cap || 0));
      targets = items.slice(0, n).map(it => it.t);
    } else {
      targets = BANK_SYMBOLS;
    }
  } else if (args.includes("--banks")) {
    targets = BANK_SYMBOLS;
  } else if (args.includes("--all")) {
    const manifestPath = path.join(DATA_DIR, "longlive_manifest.json");
    if (fs.existsSync(manifestPath)) {
      const mf = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      targets = (mf.items || []).map((it) => it.t).filter(Boolean);
    } else {
      targets = BANK_SYMBOLS;
    }
  } else {
    targets = BANK_SYMBOLS;
  }

  // Khử trùng lặp
  targets = Array.from(new Set(targets.map(t => t.toUpperCase().trim())));

  console.log("===================================================================");
  console.log(`   🚀 BẮT ĐẦU TẢI DỮ LIỆU BIỂU ĐỒ TÀI CHÍNH (${targets.length} MÃ)`);
  console.log(`   ⚡ Số luồng đồng thời: ${concurrency} workers`);
  console.log("===================================================================");

  const startTime = Date.now();
  const successCount = await runPool(targets, concurrency, async (sym) => {
    return await syncSymbol(sym, force);
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("===================================================================");
  console.log(`🎉 HOÀN THÀNH: Đã lưu thành công ${successCount}/${targets.length} mã trong ${duration}s!`);
  console.log(`📁 Thư mục Quý: ${QUARTER_DIR}`);
  console.log(`📁 Thư mục Năm: ${ANNUAL_DIR}`);
  console.log("===================================================================");
}

main().catch(console.error);
