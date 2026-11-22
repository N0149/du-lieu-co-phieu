/**
 * Script c�o to�n b? danh s�ch B�o c�o ph�n t�ch ng�nh & th? tru?ng
 * T? d?ng gi?i m� (AES-GCM), ph�n trang, gom d? 100% b�o c�o v� luu v�o JSON + SQLite.
 *
 * C�ch d�ng:
 *   node scripts/crawl-industry-reports.mjs                  # C�o b�o c�o ng�nh (m?c d?nh)
 *   node scripts/crawl-industry-reports.mjs --scope=market   # C�o b�o c�o th? tru?ng/vi m�
 *   node scripts/crawl-industry-reports.mjs --scope=all      # C�o c? ng�nh v� th? tru?ng
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../data");

// Key gi?i m� chu?n
const CIPHER_KEY_HEX = "fa4abc75c049cac6b2d58d501f183a3f4eeace7d3f79f37724b1737d095371e5";
const API_BASE_URL = "https://api.ruatichsan.com/api/v1/data/public/analyst-reports";

let cryptoKeyCache = null;
const RTZ1_MAGIC = [82, 84, 90, 49];

function isRtz1Compressed(buf) {
  if (!buf || buf.length < RTZ1_MAGIC.length) return false;
  return RTZ1_MAGIC.every((b, i) => buf[i] === b);
}

async function decompressRtz1Gzip(buf) {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(buf);
      controller.close();
    }
  }).pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

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
  const decryptedBytes = new Uint8Array(decryptedBuf);
  const finalBytes = isRtz1Compressed(decryptedBytes)
    ? await decompressRtz1Gzip(decryptedBytes.subarray(RTZ1_MAGIC.length))
    : decryptedBytes;
  return JSON.parse(new TextDecoder().decode(finalBytes));
}

async function fetchPage(scope = "sector", page = 1, pageSize = 50) {
  const url = `${API_BASE_URL}/${scope}?page=${page}&page_size=${pageSize}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Origin": "https://ruatichsan.com",
      "Referer": "https://ruatichsan.com/industry",
    },
  });

  if (!res.ok) {
    throw new Error(`Fetch th?t b?i [${scope}][page ${page}]: HTTP ${res.status} ${res.statusText}`);
  }

  return await decryptApiResponse(res);
}

async function crawlScope(scope = "sector") {
  console.log(`\n========================================`);
  console.log(`?? B?t d?u c�o d? li?u [scope: ${scope}]...`);
  console.log(`========================================`);

  const PAGE_SIZE = 50;
  let currentPage = 1;
  let totalRecords = 0;
  let availableSectors = [];
  const allReports = [];

  // Trang 1
  const firstPageData = await fetchPage(scope, currentPage, PAGE_SIZE);
  totalRecords = firstPageData.total || 0;
  availableSectors = firstPageData.available_sectors || [];
  const reportsP1 = firstPageData.reports || [];
  allReports.push(...reportsP1);

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE) || 1;
  console.log(`?? T?ng s? b�o c�o [${scope}]: ${totalRecords} (D? ki?n: ${totalPages} trang)`);
  console.log(`? [Trang 1/${totalPages}] L?y du?c ${reportsP1.length} b�o c�o.`);

  // Duy?t ti?p
  for (currentPage = 2; currentPage <= totalPages; currentPage++) {
    try {
      const pageData = await fetchPage(scope, currentPage, PAGE_SIZE);
      const reports = pageData.reports || [];
      allReports.push(...reports);
      console.log(`? [Trang ${currentPage}/${totalPages}] L?y du?c ${reports.length} b�o c�o (�� gom: ${allReports.length}/${totalRecords}).`);
    } catch (err) {
      console.error(`? L?i ? trang ${currentPage}:`, err.message);
    }
  }

  // Chu?n h�a d? li?u
  const normalizedReports = allReports.map((r) => {
    let displayDate = "";
    if (r.date) {
      const parts = r.date.split("-");
      if (parts.length === 3) {
        displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`; // YYYY-MM-DD -> DD/MM/YYYY
      }
    }

    return {
      id: String(r.id),
      slug: r.slug || "",
      title: (r.title || "").trim(),
      source: (r.source || "Kh�c").trim(),
      date: r.date || "",
      displayDate,
      scope: r.scope || scope,
      sectorName: (r.sector_name || "Chua ph�n lo?i").trim(),
      symbol: r.symbol || null,
      description: (r.description || "").trim(),
      pageCount: Number(r.page_count) || 0,
      downloadUrl: r.download_url || "",
      thumbnailUrl: r.thumbnail_url || "",
      recommendation: r.recommendation || null,
      targetPrice: r.target_price != null ? Number(r.target_price) : null,
    };
  });

  return {
    scope,
    updatedAt: new Date().toISOString(),
    total: normalizedReports.length,
    availableSectors,
    reports: normalizedReports,
  };
}

function saveToSqlite(data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const dbPath = path.join(DATA_DIR, "industry_reports.db");
  console.log(`\n?? �ang luu v�o SQLite database: ${dbPath}...`);
  const db = new DatabaseSync(dbPath);

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

      CREATE INDEX IF NOT EXISTS idx_industry_sector ON industry_reports (sector_name);
      CREATE INDEX IF NOT EXISTS idx_industry_date ON industry_reports (date);
      CREATE INDEX IF NOT EXISTS idx_industry_source ON industry_reports (source);
      CREATE INDEX IF NOT EXISTS idx_industry_scope ON industry_reports (scope);
    `);

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO industry_reports (
        id, slug, title, source, date, display_date, scope,
        sector_name, symbol, description, page_count,
        download_url, thumbnail_url, recommendation, target_price
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `);

    db.exec("BEGIN");
    let count = 0;
    for (const r of data.reports) {
      insertStmt.run(
        r.id,
        r.slug,
        r.title,
        r.source,
        r.date,
        r.displayDate,
        r.scope,
        r.sectorName,
        r.symbol,
        r.description,
        r.pageCount,
        r.downloadUrl,
        r.thumbnailUrl,
        r.recommendation,
        r.targetPrice
      );
      count++;
    }
    db.exec("COMMIT");

    console.log(`?? �� luu th�nh c�ng ${count} b?n ghi v�o SQLite table [industry_reports]!`);
  } finally {
    db.close();
  }
}

function saveToJson(data, filename = "industry-reports.json") {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const jsonPath = path.join(DATA_DIR, filename);
  console.log(`\n?? �ang luu snapshot JSON: ${jsonPath}...`);
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`?? �� luu file ${filename} (${(fs.statSync(jsonPath).size / 1024).toFixed(1)} KB)!`);
}

async function main() {
  const args = process.argv.slice(2);
  const scopeArg = args.find((a) => a.startsWith("--scope="))?.split("=")[1] || "sector";

  try {
    if (scopeArg === "all") {
      const sectorData = await crawlScope("sector");
      const marketData = await crawlScope("market");

      const combined = {
        updatedAt: new Date().toISOString(),
        total: sectorData.reports.length + marketData.reports.length,
        sectorReportsCount: sectorData.reports.length,
        marketReportsCount: marketData.reports.length,
        availableSectors: sectorData.availableSectors,
        reports: [...sectorData.reports, ...marketData.reports],
      };

      saveToJson(combined, "all-reports-snapshot.json");
      saveToJson(sectorData, "industry-reports.json");
      saveToSqlite(combined);
    } else {
      const result = await crawlScope(scopeArg);
      saveToJson(result, scopeArg === "sector" ? "industry-reports.json" : `${scopeArg}-reports.json`);
      saveToSqlite(result);
    }

    console.log(`\n? HO�N T?T �?NG B? B�O C�O! S?n s�ng dua l�n giao di?n Web.`);
  } catch (err) {
    console.error(`?? L?i nghi�m tr?ng trong qu� tr�nh c�o:`, err);
    process.exit(1);
  }
}

main();
