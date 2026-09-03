/**
 * Script cào và lưu trữ Kế Hoạch Kinh Doanh (ĐHĐCĐ giao vs Thực hiện theo Quý & Năm)
 * theo kiến trúc Offline-First vào SQLite (data/business_plans.db).
 *
 * Tính năng:
 *   - Lấy toàn bộ lịch sử kế hoạch & thực hiện đa năm (Doanh thu, LNTT, LNST).
 *   - Tự động giải mã AES-GCM và lưu trữ vào SQLite nội bộ.
 *   - Hỗ trợ chạy hàng loạt cho toàn bộ 1.530 mã cổ phiếu.
 *
 * Cách dùng:
 *   node scripts/crawl-business-plans.mjs                    # Cào toàn bộ 1.530 mã
 *   node scripts/crawl-business-plans.mjs --top=250         # Cào Top 250 mã
 *   node scripts/crawl-business-plans.mjs --symbols=MWG,HPG # Chỉ cào mã chỉ định
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../data");

const CIPHER_KEY_HEX = "19dd3af428f4cf7d68864cd4c87d8d1c5b489932e84b93ac6528a0dd403a5725";
const API_BASE_URL = "https://api.ruatichsan.com/api/v1/data/public/business-plan";

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

  const dbPath = path.join(DATA_DIR, "business_plans.db");
  const db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS business_plans (
      symbol TEXT PRIMARY KEY NOT NULL,
      plan_data TEXT NOT NULL,
      updated_source TEXT,
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_business_plans_symbol ON business_plans (symbol);
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

async function fetchBusinessPlan(symbol, retries = 3) {
  const url = `${API_BASE_URL}/${encodeURIComponent(symbol)}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Origin: "https://ruatichsan.com",
          Referer: `https://ruatichsan.com/company?symbol=${symbol}`,
        },
      });

      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, attempt * 1200));
        continue;
      }

      if (!res.ok) return null;
      return await decryptApiResponse(res);
    } catch (e) {
      if (attempt === retries) return null;
      await new Promise((r) => setTimeout(r, 500));
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
  const topArg = Number(args.find((a) => a.startsWith("--top="))?.split("=")[1]);
  const symbolsArg = args.find((a) => a.startsWith("--symbols="))?.split("=")[1];
  const concurrencyArg = Number(args.find((a) => a.startsWith("--concurrency="))?.split("=")[1]) || 6;

  let tickers = [];
  if (symbolsArg) {
    tickers = symbolsArg.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  } else {
    tickers = loadSortedTickers();
    if (topArg && topArg > 0) {
      tickers = tickers.slice(0, topArg);
    }
  }

  console.log("================================================================");
  console.log(`🚀 CÀO VÀ LƯU TRỮ KẾ HOẠCH KINH DOANH CHI TIẾT (OFFLINE-FIRST)`);
  console.log(`📋 Số lượng mã cổ phiếu: ${tickers.length} mã`);
  console.log(`⚡ Luồng cào đồng thời: ${concurrencyArg}`);
  console.log("================================================================\n");

  const { db, dbPath } = initDatabase();

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO business_plans (
      symbol, plan_data, updated_source, updated_at
    ) VALUES (?, ?, ?, datetime('now', 'localtime'))
  `);

  let dbLock = Promise.resolve();
  function saveToDb(symbol, payload) {
    dbLock = dbLock.then(() => {
      try {
        db.exec("BEGIN");
        insertStmt.run(
          symbol,
          JSON.stringify(payload.data || []),
          payload.updated || new Date().toISOString()
        );
        db.exec("COMMIT");
      } catch (e) {
        try { db.exec("ROLLBACK"); } catch (rbErr) {}
        console.error(`Lỗi ghi DB cho ${symbol}:`, e.message);
      }
    });
    return dbLock;
  }

  let totalSuccess = 0;
  const startTime = Date.now();

  await runWorkerPool(tickers, concurrencyArg, 60, async (symbol, current, total) => {
    try {
      const planData = await fetchBusinessPlan(symbol);
      if (planData && Array.isArray(planData.data) && planData.data.length > 0) {
        await saveToDb(symbol, planData);
        totalSuccess++;
        const percent = ((current / total) * 100).toFixed(1);
        console.log(`[${String(current).padStart(4)}/${total} - ${percent.padStart(5)}%] ✅ ${symbol.padEnd(5)} : ${planData.data.length} năm kế hoạch`);
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
  console.log(`🎉 HOÀN THÀNH CÀO VÀ LƯU TRỮ KẾ HOẠCH KINH DOANH!`);
  console.log(`⏱️ Thời gian thực thi: ${elapsedSec} giây`);
  console.log(`📊 Số doanh nghiệp đã lưu Kế hoạch KD: ${totalSuccess} mã`);
  console.log(`💾 Cơ sở dữ liệu SQLite: ${dbPath}`);
  console.log("================================================================");
}

main().catch(console.error);
