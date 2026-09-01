/**
 * Script cập nhật Báo cáo phân tích MỚI NHẤT (Hàng ngày lúc 20h)
 * Bao gồm:
 *   1. Báo cáo ngành (Sector Reports)
 *   2. Báo cáo phân tích doanh nghiệp (Company Reports cho Top 300 mã có phát hành báo cáo)
 *
 * Tự động upsert vào SQLite & JSON Snapshot, chỉ lấy các bài mới và in báo cáo 24h.
 *
 * Cách chạy:
 *   node scripts/sync-daily-reports.mjs
 *   node scripts/sync-daily-reports.mjs --hours=24
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../data");

const CIPHER_KEY_HEX = "19dd3af428f4cf7d68864cd4c87d8d1c5b489932e84b93ac6528a0dd403a5725";
const API_BASE_URL = "https://api.ruatichsan.com/api/v1/data/public/analyst-reports";

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

// ─────────────────────────────────────────────────────────────
// 1. ĐỒNG BỘ BÁO CÁO NGÀNH (SECTOR REPORTS)
// ─────────────────────────────────────────────────────────────
async function syncIndustryReports() {
  console.log("▶ [1/2] Đang kiểm tra & cập nhật Báo Cáo Ngành mới...");

  const PAGE_SIZE = 50;
  let currentPage = 1;
  const allReports = [];

  const firstPageRes = await fetch(`${API_BASE_URL}/sector?page=1&page_size=${PAGE_SIZE}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Origin": "https://ruatichsan.com",
    },
  });

  if (!firstPageRes.ok) throw new Error(`Fetch ngành thất bại: HTTP ${firstPageRes.status}`);
  const firstData = await decryptApiResponse(firstPageRes);
  const totalRecords = firstData.total || 0;
  const availableSectors = firstData.available_sectors || [];
  allReports.push(...(firstData.reports || []));

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);
  for (let p = 2; p <= totalPages; p++) {
    const res = await fetch(`${API_BASE_URL}/sector?page=${p}&page_size=${PAGE_SIZE}`, {
      headers: { "Origin": "https://ruatichsan.com" },
    });
    if (res.ok) {
      const pageData = await decryptApiResponse(res);
      allReports.push(...(pageData.reports || []));
    }
  }

  const normalized = allReports.map((r) => {
    let displayDate = "";
    if (r.date) {
      const p = r.date.split("-");
      if (p.length === 3) displayDate = `${p[2]}/${p[1]}/${p[0]}`;
    }
    return {
      id: String(r.id),
      slug: r.slug || "",
      title: (r.title || "").trim(),
      source: (r.source || "Khác").trim(),
      date: r.date || "",
      displayDate,
      scope: r.scope || "sector",
      sectorName: (r.sector_name || "Chưa phân loại").trim(),
      symbol: r.symbol || null,
      description: (r.description || "").trim(),
      pageCount: Number(r.page_count) || 0,
      downloadUrl: r.download_url || "",
      thumbnailUrl: r.thumbnail_url || "",
      recommendation: r.recommendation || null,
      targetPrice: r.target_price != null ? Number(r.target_price) : null,
    };
  });

  // Lưu JSON
  const jsonData = {
    updatedAt: new Date().toISOString(),
    total: normalized.length,
    availableSectors,
    reports: normalized,
  };
  fs.writeFileSync(path.join(DATA_DIR, "industry-reports.json"), JSON.stringify(jsonData, null, 2), "utf-8");

  // Lưu SQLite
  const db = new DatabaseSync(path.join(DATA_DIR, "industry_reports.db"));
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS industry_reports (
        id TEXT PRIMARY KEY,
        slug TEXT,
        title TEXT NOT NULL,
        source TEXT,
        date TEXT,
        display_date TEXT,
        scope TEXT,
        sector_name TEXT,
        symbol TEXT,
        description TEXT,
        page_count INTEGER,
        download_url TEXT,
        thumbnail_url TEXT,
        recommendation TEXT,
        target_price REAL,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      );
    `);

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO industry_reports (
        id, slug, title, source, date, display_date, scope,
        sector_name, symbol, description, page_count,
        download_url, thumbnail_url, recommendation, target_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec("BEGIN");
    for (const r of normalized) {
      stmt.run(
        r.id, r.slug, r.title, r.source, r.date, r.displayDate, r.scope,
        r.sectorName, r.symbol, r.description, r.pageCount,
        r.downloadUrl, r.thumbnailUrl, r.recommendation, r.targetPrice
      );
    }
    db.exec("COMMIT");
  } finally {
    db.close();
  }

  console.log(`✔ [1/2] Đã đồng bộ ${normalized.length} báo cáo ngành vào SQLite & JSON.`);
  return normalized;
}

// ─────────────────────────────────────────────────────────────
// 2. ĐỒNG BỘ BÁO CÁO DOANH NGHIỆP (COMPANY REPORTS)
// ─────────────────────────────────────────────────────────────
function loadTargetTickers() {
  const manifestPath = path.join(DATA_DIR, "longlive_manifest.json");
  if (fs.existsSync(manifestPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      if (Array.isArray(data.items)) {
        const sorted = [...data.items].sort((a, b) => (b.cap || 0) - (a.cap || 0));
        // Lấy Top 350 mã lớn nhất (bao phủ 99.9% báo cáo phân tích)
        return sorted.slice(0, 350).map((i) => i.t.toUpperCase().trim());
      }
    } catch (e) {}
  }
  return ["MWG", "HPG", "FPT", "VCB", "VHM", "SSI", "TCB", "MBB", "VIC", "MSN", "GAS", "VNM"];
}

async function fetchCompanyPage(symbol, page = 1) {
  const url = `${API_BASE_URL}/company/${encodeURIComponent(symbol)}?page=${page}&page_size=50`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Origin": "https://ruatichsan.com",
      },
    });
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 1500));
      return await fetchCompanyPage(symbol, page);
    }
    if (!res.ok) return { total: 0, reports: [] };
    return await decryptApiResponse(res);
  } catch (e) {
    return { total: 0, reports: [] };
  }
}

async function syncCompanyReports() {
  console.log("▶ [2/2] Đang kiểm tra Báo Cáo Phân Tích Cổ Phiếu mới nhất...");
  const tickers = loadTargetTickers();
  const db = new DatabaseSync(path.join(DATA_DIR, "company_reports.db"));

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO company_reports (
      id, symbol, title, slug, source, date, display_date,
      recommendation, target_price, page_count, description,
      download_url, thumbnail_url, pdf_key, thumb_key
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let newReportsCount = 0;
  let scannedCount = 0;

  // Cào với concurrency = 4 và delay nhẹ
  const CONCURRENCY = 4;
  let index = 0;

  async function worker() {
    while (index < tickers.length) {
      const idx = index++;
      const sym = tickers[idx];
      scannedCount++;

      // Lấy trang 1 (50 bài mới nhất của mã)
      const data = await fetchCompanyPage(sym, 1);
      const reports = data.reports || [];

      if (reports.length > 0) {
        db.exec("BEGIN");
        for (const r of reports) {
          let displayDate = "";
          if (r.date) {
            const parts = r.date.split("-");
            if (parts.length === 3) displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
          }

          insertStmt.run(
            String(r.id),
            sym,
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
        newReportsCount += reports.length;
      }
      await new Promise((r) => setTimeout(r, 60));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // Cập nhật thống kê tóm tắt
  const totalRow = db.prepare("SELECT count(*) as total, count(distinct symbol) as total_stocks FROM company_reports").get();
  const summary = {
    updatedAt: new Date().toISOString(),
    totalReports: totalRow.total,
    totalStocksWithReports: totalRow.total_stocks,
    scannedTickersCount: tickers.length,
  };
  fs.writeFileSync(path.join(DATA_DIR, "company_reports_summary.json"), JSON.stringify(summary, null, 2), "utf-8");

  db.close();

  console.log(`✔ [2/2] Hoàn tất quét ${scannedCount} mã. Hiện có ${totalRow.total.toLocaleString("vi-VN")} báo cáo từ ${totalRow.total_stocks} mã trong DB.`);
  return summary;
}

// ─────────────────────────────────────────────────────────────
// 3. MAIN RUNNER & THỐNG KÊ BÁO CÁO 24H QUA
// ─────────────────────────────────────────────────────────────
async function main() {
  const start = Date.now();
  console.log("================================================================");
  console.log(`🕒 BẮT ĐẦU ĐỒNG BỘ BÁO CÁO PHÂN TÍCH ĐỊNH KỲ 20H`);
  console.log(`⏰ Thời gian chạy: ${new Date().toLocaleString("vi-VN")}`);
  console.log("================================================================\n");

  try {
    await syncIndustryReports();
    await syncCompanyReports();

    // Thống kê các báo cáo trong 24-48 giờ qua
    const dbInd = new DatabaseSync(path.join(DATA_DIR, "industry_reports.db"), { readOnly: true });
    const dbComp = new DatabaseSync(path.join(DATA_DIR, "company_reports.db"), { readOnly: true });

    // Tính mốc 24h trước
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const recentInd = dbInd.prepare("SELECT count(*) as c FROM industry_reports WHERE date >= ?").get(oneDayAgo);
    const recentComp = dbComp.prepare("SELECT count(*) as c FROM company_reports WHERE date >= ?").get(oneDayAgo);

    dbInd.close();
    dbComp.close();

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    console.log("\n================================================================");
    console.log(`✨ ĐỒNG BỘ THÀNH CÔNG TRONG ${elapsed} GIÂY!`);
    console.log(`📰 Báo cáo ngành mới (24h qua): +${recentInd.c} bài`);
    console.log(`🏢 Báo cáo cổ phiếu mới (24h qua): +${recentComp.c} bài`);
    console.log("================================================================");
  } catch (err) {
    console.error("❌ Lỗi trong quá trình đồng bộ:", err);
    process.exit(1);
  }
}

main();
