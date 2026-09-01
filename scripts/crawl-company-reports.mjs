/**
 * Script cào và lưu trữ toàn bộ Báo cáo phân tích doanh nghiệp (Company Analyst Reports)
 * trong 3 năm gần nhất (2023 - 2026) vào cơ sở dữ liệu SQLite nội bộ (data/company_reports.db).
 *
 * Tính năng:
 *   - Ưu tiên cào theo vốn hóa từ lớn đến nhỏ (Top VN30, VN100, Midcap, Smallcap).
 *   - Tự động phân trang khi mã có > 50 báo cáo (như MWG 104 bài, HPG 102 bài).
 *   - Tự động xử lý Rate Limit (429 Backoff & Retry) thông minh.
 *   - Lưu trữ trực tiếp vào SQLite (data/company_reports.db) và xuất file tóm tắt JSON.
 *
 * Cách dùng:
 *   node scripts/crawl-company-reports.mjs                     # Cào toàn bộ (mặc định 3 năm gần nhất)
 *   node scripts/crawl-company-reports.mjs --top=300           # Cào Top 300 mã vốn hóa lớn nhất
 *   node scripts/crawl-company-reports.mjs --years=3           # Lọc số năm (mặc định 3 năm)
 *   node scripts/crawl-company-reports.mjs --symbols=MWG,HPG   # Chỉ cào các mã chỉ định
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../data");

// Key giải mã chuẩn
const CIPHER_KEY_HEX = "19dd3af428f4cf7d68864cd4c87d8d1c5b489932e84b93ac6528a0dd403a5725";
const API_BASE_URL = "https://api.ruatichsan.com/api/v1/data/public/analyst-reports/company";

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

// Lấy danh sách mã sắp xếp theo vốn hóa giảm dần
function loadSortedTickers() {
  const manifestPath = path.join(DATA_DIR, "longlive_manifest.json");
  if (fs.existsSync(manifestPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      if (Array.isArray(data.items)) {
        const sorted = [...data.items].sort((a, b) => (b.cap || 0) - (a.cap || 0));
        return sorted.map((i) => i.t.toUpperCase().trim()).filter(Boolean);
      }
    } catch (e) {
      console.warn("Không đọc được longlive_manifest.json...");
    }
  }

  return [
    "MWG", "HPG", "FPT", "VCB", "VHM", "SSI", "TCB", "MBB", "VIC", "MSN",
    "GAS", "BID", "CTG", "STB", "HDB", "VIB", "TPB", "DGC", "PVD", "VNM",
    "DCM", "DPM", "DXG", "KDH", "NLG", "PDR", "GEX", "VRE", "KBC", "IDC"
  ];
}

// Khởi tạo SQLite database
function initDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const dbPath = path.join(DATA_DIR, "company_reports.db");
  const db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS company_reports (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT,
      source TEXT,
      date TEXT,
      display_date TEXT,
      recommendation TEXT,
      target_price REAL,
      page_count INTEGER,
      description TEXT,
      download_url TEXT,
      thumbnail_url TEXT,
      pdf_key TEXT,
      thumb_key TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_company_symbol ON company_reports (symbol);
    CREATE INDEX IF NOT EXISTS idx_company_date ON company_reports (date);
    CREATE INDEX IF NOT EXISTS idx_company_source ON company_reports (source);
    CREATE INDEX IF NOT EXISTS idx_company_rec ON company_reports (recommendation);
  `);

  return { db, dbPath };
}

// Fetch 1 trang với cơ chế tự động Retry khi gặp Rate Limit (429)
async function fetchCompanyPageWithRetry(symbol, page = 1, pageSize = 50, maxRetries = 3) {
  const url = `${API_BASE_URL}/${encodeURIComponent(symbol)}?page=${page}&page_size=${pageSize}`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Origin": "https://ruatichsan.com",
          "Referer": `https://ruatichsan.com/company?symbol=${symbol}`,
        },
      });

      if (res.status === 429) {
        const waitMs = attempt * 1500;
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (res.status === 404) {
        return { total: 0, reports: [] };
      }

      if (!res.ok) {
        return { total: 0, reports: [] };
      }

      return await decryptApiResponse(res);
    } catch (err) {
      if (attempt === maxRetries) return { total: 0, reports: [] };
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  return { total: 0, reports: [] };
}

// Fetch toàn bộ báo cáo trong 3 năm của 1 mã (kèm phân trang)
async function fetchAllReportsForSymbol(symbol, cutoffDateStr) {
  const PAGE_SIZE = 50;
  const allReports = [];

  const p1 = await fetchCompanyPageWithRetry(symbol, 1, PAGE_SIZE);
  const total = p1.total || 0;
  const reports1 = p1.reports || [];
  allReports.push(...reports1);

  if (total > PAGE_SIZE) {
    const totalPages = Math.ceil(total / PAGE_SIZE);
    for (let p = 2; p <= totalPages; p++) {
      const lastInPrev = allReports[allReports.length - 1];
      if (lastInPrev?.date && lastInPrev.date < cutoffDateStr) {
        break; // Dừng nếu đã quá mốc 3 năm
      }
      const nextData = await fetchCompanyPageWithRetry(symbol, p, PAGE_SIZE);
      allReports.push(...(nextData.reports || []));
    }
  }

  return allReports.filter((r) => {
    if (!r.date) return true;
    return r.date >= cutoffDateStr;
  });
}

// Worker Pool kiểm soát lưu lượng mượt mà (3 workers + 60ms delay)
async function runPacedWorkerPool(items, concurrency, delayMs, workerFn) {
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
  const yearsArg = Number(args.find((a) => a.startsWith("--years="))?.split("=")[1]) || 3;
  const topArg = Number(args.find((a) => a.startsWith("--top="))?.split("=")[1]);
  const symbolsArg = args.find((a) => a.startsWith("--symbols="))?.split("=")[1];
  const concurrencyArg = Number(args.find((a) => a.startsWith("--concurrency="))?.split("=")[1]) || 4;

  const currentYear = new Date().getFullYear();
  const startYear = currentYear - yearsArg;
  const cutoffDateStr = `${startYear}-01-01`;

  console.log("================================================================");
  console.log(`🚀 CÀO TOÀN BỘ BÁO CÁO PHÂN TÍCH DOANH NGHIỆP TRONG ${yearsArg} NĂM GẦN NHẤT`);
  console.log(`📅 Mốc thời gian: Từ ngày ${cutoffDateStr} đến nay`);
  console.log(`⚡ Luồng cào đồng thời: ${concurrencyArg}`);
  console.log("================================================================\n");

  let tickers = [];
  if (symbolsArg) {
    tickers = symbolsArg.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    console.log(`🎯 Chỉ cào ${tickers.length} mã chỉ định: ${tickers.join(", ")}`);
  } else {
    tickers = loadSortedTickers();
    if (topArg && topArg > 0) {
      tickers = tickers.slice(0, topArg);
      console.log(`📋 Cào Top ${tickers.length} mã cổ phiếu vốn hóa lớn nhất`);
    } else {
      console.log(`📋 Tổng số mã cổ phiếu trên sàn: ${tickers.length} mã (xếp theo vốn hóa)`);
    }
  }

  const { db, dbPath } = initDatabase();

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO company_reports (
      id, symbol, title, slug, source, date, display_date,
      recommendation, target_price, page_count, description,
      download_url, thumbnail_url, pdf_key, thumb_key
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  let totalSavedReports = 0;
  let stocksWithReports = 0;
  const stockReportCounts = {};

  // Mutex ghi SQLite an toàn
  let dbLock = Promise.resolve();
  function saveReportsToDb(symbol, reports) {
    dbLock = dbLock.then(() => {
      try {
        db.exec("BEGIN");
        for (const r of reports) {
          let displayDate = "";
          if (r.date) {
            const parts = r.date.split("-");
            if (parts.length === 3) displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
          }

          insertStmt.run(
            String(r.id),
            symbol,
            (r.title || "").trim(),
            r.slug || "",
            (r.source || "Khác").trim(),
            r.date || "",
            displayDate,
            r.recommendation || null,
            r.target_price != null ? Number(r.target_price) : null,
            Number(r.page_count) || 0,
            (r.description || "").trim(),
            r.download_url || "",
            r.thumbnail_url || "",
            r.pdf_key || "",
            r.thumb_key || ""
          );
        }
        db.exec("COMMIT");
      } catch (e) {
        try { db.exec("ROLLBACK"); } catch (rbErr) {}
        console.error(`Lỗi ghi DB cho ${symbol}:`, e.message);
      }
    });
    return dbLock;
  }

  const startTime = Date.now();

  await runPacedWorkerPool(tickers, concurrencyArg, 70, async (symbol, current, total) => {
    try {
      const reports = await fetchAllReportsForSymbol(symbol, cutoffDateStr);
      if (reports.length > 0) {
        await saveReportsToDb(symbol, reports);

        totalSavedReports += reports.length;
        stocksWithReports++;
        stockReportCounts[symbol] = reports.length;

        const percent = ((current / total) * 100).toFixed(1);
        console.log(`[${String(current).padStart(4)}/${total} - ${percent.padStart(5)}%] ✅ ${symbol.padEnd(5)} : +${String(reports.length).padStart(3)} báo cáo | Tổng DB: ${totalSavedReports.toLocaleString("vi-VN")}`);
      } else {
        if (current % 100 === 0 || current === total) {
          const percent = ((current / total) * 100).toFixed(1);
          console.log(`[${String(current).padStart(4)}/${total} - ${percent.padStart(5)}%] ⏳ Đang quét... | Tổng DB: ${totalSavedReports.toLocaleString("vi-VN")} báo cáo (${stocksWithReports} mã)`);
        }
      }
    } catch (err) {
      console.warn(`[${current}/${total}] ⚠️ ${symbol}: ${err.message}`);
    }
  });

  await dbLock;

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

  // Thống kê tóm tắt JSON
  const summary = {
    updatedAt: new Date().toISOString(),
    cutoffDate: cutoffDateStr,
    totalReports: totalSavedReports,
    totalStocksWithReports: stocksWithReports,
    scannedTickersCount: tickers.length,
    elapsedSeconds: Number(elapsedSec),
    topStocksByReportCount: Object.entries(stockReportCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([sym, count]) => ({ symbol: sym, reportsCount: count })),
  };

  const summaryPath = path.join(DATA_DIR, "company_reports_summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf-8");

  db.close();

  console.log("\n================================================================");
  console.log(`🎉 HOÀN THÀNH CÀO VÀ LƯU TRỮ TOÀN BỘ BÁO CÁO PHÂN TÍCH DOANH NGHIỆP!`);
  console.log(`⏱️ Thời gian thực thi: ${elapsedSec} giây`);
  console.log(`📊 Tổng số báo cáo 3 năm đã lưu trữ: ${totalSavedReports.toLocaleString("vi-VN")} báo cáo`);
  console.log(`🏢 Số mã doanh nghiệp có báo cáo: ${stocksWithReports} mã`);
  console.log(`💾 Cơ sở dữ liệu SQLite: ${dbPath}`);
  console.log(`📄 File tóm tắt: ${summaryPath}`);
  console.log("================================================================");
}

main().catch((err) => {
  console.error("Lỗi nghiêm trọng:", err);
  process.exit(1);
});
