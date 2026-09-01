/**
 * Script cào và lưu trữ Báo Cáo Tài Chính chi tiết (CĐKT, KQKD, LCTT đa năm & đa quý)
 * theo kiến trúc Offline-First vào SQLite (data/financial_statements.db).
 *
 * Tính năng:
 *   - Lấy cả Theo Quý (tới 34 quý) và Theo Năm (tới 16 năm).
 *   - Ưu tiên cào theo vốn hóa từ lớn đến nhỏ (Top VN30, VN100, Midcap...).
 *   - Tự động giải mã AES-GCM và lưu trữ vào SQLite nội bộ.
 *   - Hỗ trợ chạy nền, tự động phục hồi khi gặp rate-limit.
 *
 * Cách dùng:
 *   node scripts/crawl-financial-statements.mjs                     # Cào Top 350 mã lớn nhất
 *   node scripts/crawl-financial-statements.mjs --all              # Cào toàn bộ 1.530 mã
 *   node scripts/crawl-financial-statements.mjs --top=100          # Cào Top 100 mã
 *   node scripts/crawl-financial-statements.mjs --symbols=MWG,HPG  # Chỉ cào mã chỉ định
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../data");

const CIPHER_KEY_HEX = "19dd3af428f4cf7d68864cd4c87d8d1c5b489932e84b93ac6528a0dd403a5725";
const API_BASE_URL = "https://api.ruatichsan.com/api/v1/data/public/financial-statements";

let cryptoKeyCache = null;
async function getCryptoKey() {
  if (cryptoKeyCache) return cryptoKeyCache;
  const bytes = new Uint8Array(CIPHER_KEY_HEX.match(/.{2}/g).map((h) => parseInt(h, 16)));
  cryptoKeyCache = await crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["decrypt"]);
  return cryptoKeyCache;
}

async function decryptApiResponse(res) {
  if (res.headers.get("X-Encrypted") !== "1") {
    return await res.json();
  }
  const buf = await res.arrayBuffer();
  const key = await getCryptoKey();
  const rawBytes = new Uint8Array(buf);
  const iv = rawBytes.slice(0, 12);
  const ciphertext = rawBytes.slice(12);
  const decryptedBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(decryptedBuf));
}

function initDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const dbPath = path.join(DATA_DIR, "financial_statements.db");
  const db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS financial_statements (
      symbol TEXT NOT NULL,
      period_type TEXT NOT NULL,
      fiscal_dates TEXT NOT NULL,
      cdkt TEXT NOT NULL,
      kqkd TEXT NOT NULL,
      lctt TEXT NOT NULL,
      data_source TEXT,
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      PRIMARY KEY (symbol, period_type)
    );

    CREATE INDEX IF NOT EXISTS idx_fin_stmt_symbol ON financial_statements (symbol);
  `);

  return { db, dbPath };
}

function loadSortedTickers() {
  const manifestPath = path.join(DATA_DIR, "longlive_manifest.json");
  if (fs.existsSync(manifestPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      if (Array.isArray(data.items)) {
        const sorted = [...data.items].sort((a, b) => (b.cap || 0) - (a.cap || 0));
        return sorted.map((i) => i.t.toUpperCase().trim()).filter(Boolean);
      }
    } catch (e) {}
  }
  return ["MWG", "HPG", "FPT", "VCB", "VHM", "SSI", "TCB", "MBB", "VIC", "MSN", "GAS", "VNM"];
}

async function fetchStatement(symbol, periodType, retries = 3) {
  const url = `${API_BASE_URL}/${periodType}/${encodeURIComponent(symbol)}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Origin": "https://ruatichsan.com",
          "Referer": `https://ruatichsan.com/company?symbol=${symbol}`,
        },
      });

      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, attempt * 1500));
        continue;
      }

      if (!res.ok) return null;
      return await decryptApiResponse(res);
    } catch (e) {
      if (attempt === retries) return null;
      await new Promise((r) => setTimeout(r, 600));
    }
  }
  return null;
}

async function runWorkerPool(items, concurrency, delayMs, workerFn) {
  let index = 0;
  const total = items.length;

  async function worker() {
    while (index < total) {
      const currentIndex = index++;
      if (currentIndex >= total) break;
      const item = items[currentIndex];
      await workerFn(item, currentIndex + 1, total);
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
}

async function main() {
  const args = process.argv.slice(2);
  const allArg = args.includes("--all");
  const topArg = Number(args.find((a) => a.startsWith("--top="))?.split("=")[1]);
  const symbolsArg = args.find((a) => a.startsWith("--symbols="))?.split("=")[1];
  const concurrencyArg = Number(args.find((a) => a.startsWith("--concurrency="))?.split("=")[1]) || 4;

  let tickers = [];
  if (symbolsArg) {
    tickers = symbolsArg.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  } else {
    tickers = loadSortedTickers();
    if (!allArg) {
      const limit = topArg && topArg > 0 ? topArg : 350;
      tickers = tickers.slice(0, limit);
    }
  }

  console.log("================================================================");
  console.log(`🚀 CÀO VÀ LƯU TRỮ BÁO CÁO TÀI CHÍNH CHI TIẾT (OFFLINE-FIRST)`);
  console.log(`📋 Số lượng mã cổ phiếu: ${tickers.length} mã`);
  console.log(`⚡ Luồng cào đồng thời: ${concurrencyArg}`);
  console.log("================================================================\n");

  const { db, dbPath } = initDatabase();

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO financial_statements (
      symbol, period_type, fiscal_dates, cdkt, kqkd, lctt, data_source, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `);

  let dbLock = Promise.resolve();
  function saveToDb(symbol, periodType, data) {
    dbLock = dbLock.then(() => {
      try {
        db.exec("BEGIN");
        insertStmt.run(
          symbol,
          periodType,
          JSON.stringify(data.fiscalDates || []),
          JSON.stringify(data.cdkt || []),
          JSON.stringify(data.kqkd || []),
          JSON.stringify(data.lctt || []),
          data.dataSource || "Ruatichsan"
        );
        db.exec("COMMIT");
      } catch (e) {
        try { db.exec("ROLLBACK"); } catch (rbErr) {}
        console.error(`Lỗi ghi DB cho ${symbol} (${periodType}):`, e.message);
      }
    });
    return dbLock;
  }

  let totalSuccess = 0;
  const startTime = Date.now();

  await runWorkerPool(tickers, concurrencyArg, 80, async (symbol, current, total) => {
    try {
      // 1. Tải dữ liệu Theo Quý (Quarter)
      const quarterData = await fetchStatement(symbol, "quarter");
      let qCount = 0;
      if (quarterData && quarterData.fiscalDates && quarterData.fiscalDates.length > 0) {
        await saveToDb(symbol, "quarter", quarterData);
        qCount = quarterData.fiscalDates.length;
      }

      // 2. Tải dữ liệu Theo Năm (Annual)
      const annualData = await fetchStatement(symbol, "annual");
      let aCount = 0;
      if (annualData && annualData.fiscalDates && annualData.fiscalDates.length > 0) {
        await saveToDb(symbol, "annual", annualData);
        aCount = annualData.fiscalDates.length;
      }

      if (qCount > 0 || aCount > 0) {
        totalSuccess++;
        const percent = ((current / total) * 100).toFixed(1);
        console.log(`[${String(current).padStart(4)}/${total} - ${percent.padStart(5)}%] ✅ ${symbol.padEnd(5)} : ${qCount} Quý | ${aCount} Năm`);
      } else {
        if (current % 50 === 0 || current === total) {
          const percent = ((current / total) * 100).toFixed(1);
          console.log(`[${String(current).padStart(4)}/${total} - ${percent.padStart(5)}%] ⏳ Đang quét... (Đã lưu: ${totalSuccess} mã)`);
        }
      }
    } catch (err) {
      console.warn(`[${current}/${total}] ⚠️ Lỗi mã ${symbol}: ${err.message}`);
    }
  });

  await dbLock;
  db.close();

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n================================================================");
  console.log(`🎉 HOÀN THÀNH CÀO VÀ LƯU TRỮ BÁO CÁO TÀI CHÍNH!`);
  console.log(`⏱️ Thời gian thực thi: ${elapsedSec} giây`);
  console.log(`📊 Số doanh nghiệp đã lưu BCTC: ${totalSuccess} mã`);
  console.log(`💾 Cơ sở dữ liệu SQLite: ${dbPath}`);
  console.log("================================================================");
}

main().catch(console.error);
