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
    }
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return await decryptApiResponse(res);
}

async function syncSymbol(symbol) {
  const sym = symbol.toUpperCase().trim();
  let qSuccess = false;
  let aSuccess = false;

  // 1. Quý
  try {
    const qData = await fetchChartData(sym, "quarter");
    if (qData) {
      const qPath = path.join(QUARTER_DIR, `${sym}.json`);
      fs.writeFileSync(qPath, JSON.stringify(qData, null, 2), "utf-8");
      qSuccess = true;
    }
  } catch (e) {
    console.error(`  [${sym}] Lỗi tải dữ liệu Quý:`, e.message);
  }

  // 2. Năm
  try {
    const aData = await fetchChartData(sym, "annual");
    if (aData) {
      const aPath = path.join(ANNUAL_DIR, `${sym}.json`);
      fs.writeFileSync(aPath, JSON.stringify(aData, null, 2), "utf-8");
      aSuccess = true;
    }
  } catch (e) {
    console.error(`  [${sym}] Lỗi tải dữ liệu Năm:`, e.message);
  }

  return qSuccess && aSuccess;
}

async function main() {
  const args = process.argv.slice(2);
  let targets = [];

  const symArg = args.find((a) => a.startsWith("--symbol="));
  if (symArg) {
    targets = [symArg.split("=")[1].toUpperCase().trim()];
  } else if (args.includes("--banks") || args.length === 0) {
    targets = BANK_SYMBOLS;
  } else if (args.includes("--all")) {
    const manifestPath = path.join(DATA_DIR, "longlive_manifest.json");
    if (fs.existsSync(manifestPath)) {
      const mf = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      targets = (mf.tickers || []).map((t) => (typeof t === "string" ? t : t.symbol));
    } else {
      targets = BANK_SYMBOLS;
    }
  }

  console.log("===================================================================");
  console.log(`   🚀 BẮT ĐẦU TẢI DỮ LIỆU BIỂU ĐỒ TÀI CHÍNH (${targets.length} MÃ)`);
  console.log("===================================================================");

  const startTime = Date.now();
  let successCount = 0;

  for (let i = 0; i < targets.length; i++) {
    const sym = targets[i];
    process.stdout.write(`[${i + 1}/${targets.length}] Đang đồng bộ ${sym}... `);
    const ok = await syncSymbol(sym);
    if (ok) {
      successCount++;
      console.log("✅ OK (Đã lưu Quý & Năm)");
    } else {
      console.log("⚠️ Có lỗi");
    }

    // Nghỉ nhẹ 150ms để tải mượt mà
    if (i < targets.length - 1) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("===================================================================");
  console.log(`🎉 HOÀN THÀNH: Đã lưu thành công ${successCount}/${targets.length} mã trong ${duration}s!`);
  console.log(`📁 Thư mục Quý: ${QUARTER_DIR}`);
  console.log(`📁 Thư mục Năm: ${ANNUAL_DIR}`);
  console.log("===================================================================");
}

main().catch(console.error);
