/**
 * Script cập nhật Báo cáo phân tích MỚI NHẤT (Tự động chạy định kỳ hàng ngày)
 * Bao gồm:
 *   1. Báo cáo ngành (Sector Reports) -> data/industry_reports.db & data/industry-reports.json
 *   2. Báo cáo phân tích doanh nghiệp (Company Reports) -> data/company_reports.db & data/company_reports_summary.json
 *   3. Cào trực tiếp thời gian thực từ cổng phân tích Vietcap Research CMS (không phụ thuộc bên thứ 3)
 *
 * Tự động bóc tách Khuyến nghị & Giá mục tiêu, upsert vào SQLite & JSON Snapshot.
 *
 * Cách chạy:
 *   node scripts/sync-daily-reports.mjs
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
const VIETCAP_CMS_URL = "https://www.vietcap.com.vn/api/cms-service/v1/page/analysis";

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

// Giải mã HTML entities tiếng Việt từ CMS các CTCK
const HTML_ENTITIES = {
  nbsp: " ", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">",
  ndash: "–", mdash: "—", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", hellip: "…",
  agrave: "à", aacute: "á", acirc: "â", atilde: "ã", auml: "ä", aring: "å",
  egrave: "è", eacute: "é", ecirc: "ê", euml: "ë",
  igrave: "ì", iacute: "í", icirc: "î", iuml: "ï",
  ograve: "ò", oacute: "ó", ocirc: "ô", otilde: "õ", ouml: "ö",
  ugrave: "ù", uacute: "ú", ucirc: "û", uuml: "ü",
  yacute: "ý", yuml: "ÿ",
  Agrave: "À", Aacute: "Á", Acirc: "Â", Atilde: "Ã",
  Egrave: "È", Eacute: "É", Ecirc: "Ê",
  Igrave: "Ì", Iacute: "Í", Icirc: "Î",
  Ograve: "Ò", Oacute: "Ó", Ocirc: "Ô", Otilde: "Õ",
  Ugrave: "Ù", Uacute: "Ú", Ucirc: "Û",
  Yacute: "Ý",
};

function decodeHtmlText(html) {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);?/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);?/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => HTML_ENTITIES[name] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.slice(0, 10).split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

// Bóc tách Khuyến nghị & Giá mục tiêu từ tiêu đề + mô tả
function extractRecAndTarget(title, desc, rawRec, rawTarget) {
  let rec = rawRec ? String(rawRec).trim().toUpperCase() : null;
  let target = rawTarget != null && Number(rawTarget) > 0 ? Number(rawTarget) : null;
  const combined = `${title || ""} ${desc || ""}`;
  const upper = combined.toUpperCase();

  if (!rec) {
    const bracketRec = title?.match(/\[(MUA|BÁN|KHẢ QUAN|PHTT|PHÙ HỢP THỊ TRƯỜNG|KÉM KHẢ QUAN|TRUNG LẬP|NẮM GIỮ)[^\]]*\]/i);
    if (bracketRec) {
      const br = bracketRec[1].toUpperCase();
      if (br === "PHTT" || br === "PHÙ HỢP THỊ TRƯỜNG") rec = "NẮM GIỮ";
      else if (br === "KÉM KHẢ QUAN") rec = "BÁN";
      else rec = br;
    } else if (
      upper.includes("KHUYẾN NGHỊ MUA") ||
      upper.includes("KHẢ QUAN") ||
      upper.includes("OUTPERFORM") ||
      upper.includes("KHUYẾN NGHỊ: MUA")
    ) {
      rec = "MUA";
    } else if (upper.includes("TĂNG TỶ TRỌNG") || upper.includes("ACCUMULATE")) {
      rec = "TĂNG TỶ TRỌNG";
    } else if (
      upper.includes("KHUYẾN NGHỊ BÁN") ||
      upper.includes("KÉM KHẢ QUAN") ||
      upper.includes("GIẢM TỶ TRỌNG") ||
      upper.includes("UNDERPERFORM")
    ) {
      rec = "BÁN";
    } else if (
      upper.includes("NẮM GIỮ") ||
      upper.includes("PHÙ HỢP THỊ TRƯỜNG") ||
      upper.includes("TRUNG LẬP") ||
      upper.includes("NEUTRAL")
    ) {
      rec = "NẮM GIỮ";
    }
  }

  if (!target) {
    const m =
      combined.match(
        /giá mục tiêu[^0-9]{0,65}?([0-9]{1,3}(?:[.,][0-9]{3})+)\s*(?:đồng|vnđ|vnd|đ\/cp)/i
      ) ||
      combined.match(
        /giá mục tiêu\s*(?:là|khoảng|lên|xuống|ở mức|đạt|còn)?\s*[:\s]*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,6})/i
      );
    if (m && m[1]) {
      const clean = m[1].replace(/[.,]/g, "");
      const num = Number(clean);
      if (num >= 1000 && num <= 2000000) target = num;
    }
  }

  return { rec, target };
}

// ─────────────────────────────────────────────────────────────
// 1. ĐỒNG BỘ BÁO CÁO NGÀNH (SECTOR REPORTS)
// ─────────────────────────────────────────────────────────────
async function syncIndustryReports() {
  console.log("▶ [1/3] Đang kiểm tra & cập nhật Báo Cáo Ngành mới...");

  const PAGE_SIZE = 50;
  const allReports = [];
  let availableSectors = [];

  try {
    const firstPageRes = await fetch(`${API_BASE_URL}/sector?page=1&page_size=${PAGE_SIZE}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Origin": "https://ruatichsan.com",
      },
    });

    if (firstPageRes.ok) {
      const firstData = await decryptApiResponse(firstPageRes);
      const totalRecords = firstData.total || 0;
      availableSectors = firstData.available_sectors || [];
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
    }
  } catch (err) {
    console.warn("  ⚠️ Cảnh báo khi lấy nguồn ngành tổng hợp:", err.message);
  }

  const normalized = allReports.map((r) => {
    const date = (r.date || "").slice(0, 10);
    return {
      id: String(r.id),
      slug: r.slug || "",
      title: (r.title || "").trim(),
      source: (r.source || "Khác").trim(),
      date,
      displayDate: formatDisplayDate(date),
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

    // Xuất toàn bộ từ SQLite ra JSON để giữ đầy đủ cả các bài từ nguồn trực tiếp CTCK
    const allDbRows = db.prepare(`
      SELECT id, slug, title, source, date, display_date as displayDate, scope,
             sector_name as sectorName, symbol, description, page_count as pageCount,
             download_url as downloadUrl, thumbnail_url as thumbnailUrl,
             recommendation, target_price as targetPrice
      FROM industry_reports
      ORDER BY date DESC, id DESC
    `).all();

    const sectorSet = new Set(availableSectors);
    for (const row of allDbRows) {
      if (row.sectorName && row.sectorName !== "Chưa phân loại") {
        sectorSet.add(row.sectorName);
      }
    }

    const jsonData = {
      updatedAt: new Date().toISOString(),
      total: allDbRows.length,
      availableSectors: Array.from(sectorSet).sort(),
      reports: allDbRows,
    };
    fs.writeFileSync(path.join(DATA_DIR, "industry-reports.json"), JSON.stringify(jsonData, null, 2), "utf-8");
    console.log(`✔ [1/3] Đã đồng bộ ${allDbRows.length} báo cáo ngành vào SQLite & JSON.`);
    return allDbRows;
  } finally {
    db.close();
  }
}

// ─────────────────────────────────────────────────────────────
// 2. ĐỒNG BỘ BÁO CÁO DOANH NGHIỆP (COMPANY REPORTS)
// ─────────────────────────────────────────────────────────────
function loadTargetTickers(db) {
  const tickerSet = new Set([
    "MWG", "HPG", "FPT", "VCB", "VHM", "SSI", "TCB", "MBB", "VIC", "MSN", "GAS", "VNM",
    "SCS", "DCM", "DMX", "DPR", "GMD", "HHV", "KDH", "PHP", "POW", "PVS", "VGC", "BMP", "BWE"
  ]);

  // 1. Lấy tất cả các mã đã từng có báo cáo trong DB (đảm bảo không bỏ sót mã nào)
  try {
    const existingRows = db.prepare("SELECT DISTINCT symbol FROM company_reports WHERE symbol IS NOT NULL").all();
    for (const r of existingRows) {
      if (r.symbol) tickerSet.add(String(r.symbol).toUpperCase().trim());
    }
  } catch {}

  // 2. Lấy thêm Top 450 mã vốn hóa lớn nhất từ longlive_manifest.json
  const manifestPath = path.join(DATA_DIR, "longlive_manifest.json");
  if (fs.existsSync(manifestPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      if (Array.isArray(data.items)) {
        const sorted = [...data.items].sort((a, b) => (b.cap || 0) - (a.cap || 0));
        for (const item of sorted.slice(0, 450)) {
          if (item.t) tickerSet.add(item.t.toUpperCase().trim());
        }
      }
    } catch {}
  }

  return Array.from(tickerSet);
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
  } catch {
    return { total: 0, reports: [] };
  }
}

async function syncCompanyReports() {
  console.log("▶ [2/3] Đang quét Báo Cáo Phân Tích Cổ Phiếu từ hơn 25 CTCK...");
  const db = new DatabaseSync(path.join(DATA_DIR, "company_reports.db"));

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
  `);

  const tickers = loadTargetTickers(db);

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO company_reports (
      id, symbol, title, slug, source, date, display_date,
      recommendation, target_price, page_count, description,
      download_url, thumbnail_url, pdf_key, thumb_key
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let scannedCount = 0;
  const CONCURRENCY = 10;
  let index = 0;

  async function worker() {
    while (index < tickers.length) {
      const idx = index++;
      const sym = tickers[idx];
      scannedCount++;

      const data = await fetchCompanyPage(sym, 1);
      const reports = data.reports || [];

      if (reports.length > 0) {
        db.exec("BEGIN");
        for (const r of reports) {
          const date = (r.date || "").slice(0, 10);
          const displayDate = formatDisplayDate(date);
          const title = (r.title || "").trim();
          const desc = (r.description || "").trim();
          const { rec, target } = extractRecAndTarget(title, desc, r.recommendation, r.target_price);

          insertStmt.run(
            String(r.id),
            sym,
            title,
            r.slug || "",
            (r.source || "Khác").trim(),
            date,
            displayDate,
            rec,
            target,
            Number(r.page_count) || 0,
            desc,
            r.download_url || "",
            r.thumbnail_url || "",
            r.pdf_key || "",
            r.thumb_key || ""
          );
        }
        db.exec("COMMIT");
      }
      await new Promise((r) => setTimeout(r, 25));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  db.close();
  console.log(`✔ [2/3] Đã quét xong ${scannedCount} mã cổ phiếu.`);
}

// ─────────────────────────────────────────────────────────────
// 3. CÀO TRỰC TIẾP TỪ CỔNG PHÂN TÍCH VIETCAP CMS (REALTIME)
// ─────────────────────────────────────────────────────────────
async function syncVietcapDirectReports(pagesToScan = 3) {
  console.log("▶ [3/3] Đang đồng bộ trực tiếp báo cáo mới nhất từ Vietcap Research Portal...");
  const dbComp = new DatabaseSync(path.join(DATA_DIR, "company_reports.db"));
  const dbInd = new DatabaseSync(path.join(DATA_DIR, "industry_reports.db"));

  let addedCompany = 0;
  let addedIndustry = 0;

  try {
    const checkCompStmt = dbComp.prepare(`
      SELECT id, download_url, target_price FROM company_reports
      WHERE symbol = ? AND date = ? AND (source = 'Vietcap' OR source = 'VCSC')
      LIMIT 1
    `);

    const insertCompStmt = dbComp.prepare(`
      INSERT OR REPLACE INTO company_reports (
        id, symbol, title, slug, source, date, display_date,
        recommendation, target_price, page_count, description,
        download_url, thumbnail_url, pdf_key, thumb_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertIndStmt = dbInd.prepare(`
      INSERT OR REPLACE INTO industry_reports (
        id, slug, title, source, date, display_date, scope,
        sector_name, symbol, description, page_count,
        download_url, thumbnail_url, recommendation, target_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let page = 0; page < pagesToScan; page++) {
      const res = await fetch(`${VIETCAP_CMS_URL}?page=${page}&size=30&language=1`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
      });
      if (!res.ok) continue;

      const json = await res.json();
      const items = json.data?.pagingGeneralResponses?.content || [];

      for (const it of items) {
        const title = (it.name || "").trim();
        if (!title) continue;

        const date = (it.date || it.createdDate || "").slice(0, 10);
        const displayDate = formatDisplayDate(date);
        const desc = decodeHtmlText(it.detail || "");
        const slug = (it.link || "").replace(/^trung-tam-phan-tich\//, "");
        const downloadUrl = it.file || (it.link ? `https://www.vietcap.com.vn/${it.link}` : "");
        const thumbUrl = it.images ? (it.images.startsWith("http") ? it.images : `https://www.vietcap.com.vn${it.images}`) : "";
        const { rec, target } = extractRecAndTarget(title, desc, null, null);

        // Xác định mã cổ phiếu nếu là báo cáo doanh nghiệp
        let symbol = it.companyInfo?.code || it.ticker || null;
        if (!symbol && it.pageName === "Doanh Nghiệp") {
          const m = title.match(/^([A-Z0-9]{3})\s*[\[\-\:]/);
          if (m) symbol = m[1].toUpperCase();
        }

        if (symbol) {
          symbol = symbol.toUpperCase().trim();
          const existing = checkCompStmt.get(symbol, date);
          if (!existing) {
            insertCompStmt.run(
              `vc_${it.id}`,
              symbol,
              title,
              slug,
              "Vietcap",
              date,
              displayDate,
              rec,
              target,
              0,
              desc.slice(0, 1200),
              downloadUrl,
              thumbUrl,
              "",
              ""
            );
            addedCompany++;
          } else if (target && !existing.target_price) {
            dbComp.prepare(`UPDATE company_reports SET target_price = ?, recommendation = COALESCE(recommendation, ?) WHERE id = ?`)
              .run(target, rec, existing.id);
          }
        } else if (it.pageName === "Ngành" || it.pageName === "Vĩ Mô" || it.pageLink === "phan-tich-nganh") {
          const sectorName = it.sector?.name || (it.pageName === "Vĩ Mô" ? "Vĩ mô & Chiến lược" : "Báo cáo ngành");
          insertIndStmt.run(
            `vc_${it.id}`,
            slug,
            title,
            "Vietcap",
            date,
            displayDate,
            "sector",
            sectorName,
            null,
            desc.slice(0, 1200),
            0,
            downloadUrl,
            thumbUrl,
            rec,
            target
          );
          addedIndustry++;
        }
      }
    }

    // Cập nhật lại summary của company_reports
    const totalRow = dbComp
      .prepare("SELECT count(*) as total, count(distinct symbol) as total_stocks, max(date) as latest_date FROM company_reports")
      .get();
    const summary = {
      updatedAt: new Date().toISOString(),
      latestReportDate: totalRow.latest_date,
      totalReports: totalRow.total,
      totalStocksWithReports: totalRow.total_stocks,
    };
    fs.writeFileSync(path.join(DATA_DIR, "company_reports_summary.json"), JSON.stringify(summary, null, 2), "utf-8");

    // Nếu có thêm báo cáo ngành từ Vietcap, xuất lại industry-reports.json
    if (addedIndustry > 0) {
      const allDbRows = dbInd.prepare(`
        SELECT id, slug, title, source, date, display_date as displayDate, scope,
               sector_name as sectorName, symbol, description, page_count as pageCount,
               download_url as downloadUrl, thumbnail_url as thumbnailUrl,
               recommendation, target_price as targetPrice
        FROM industry_reports
        ORDER BY date DESC, id DESC
      `).all();
      const sectorSet = new Set();
      for (const row of allDbRows) {
        if (row.sectorName && row.sectorName !== "Chưa phân loại") sectorSet.add(row.sectorName);
      }
      fs.writeFileSync(
        path.join(DATA_DIR, "industry-reports.json"),
        JSON.stringify(
          {
            updatedAt: new Date().toISOString(),
            total: allDbRows.length,
            availableSectors: Array.from(sectorSet).sort(),
            reports: allDbRows,
          },
          null,
          2
        ),
        "utf-8"
      );
    }

    console.log(
      `✔ [3/3] Vietcap Direct: Bổ sung +${addedCompany} báo cáo doanh nghiệp mới, +${addedIndustry} báo cáo ngành/vĩ mô.`
    );
  } catch (err) {
    console.warn("  ⚠️ Lỗi khi quét Vietcap Direct:", err.message);
  } finally {
    dbComp.close();
    dbInd.close();
  }
}

// ─────────────────────────────────────────────────────────────
// 4. MAIN RUNNER & THỐNG KÊ BÁO CÁO MỚI
// ─────────────────────────────────────────────────────────────
async function main() {
  const start = Date.now();
  console.log("================================================================");
  console.log(`🕒 BẮT ĐẦU ĐỒNG BỘ BÁO CÁO PHÂN TÍCH ĐA NGUỒN`);
  console.log(`⏰ Thời gian chạy: ${new Date().toLocaleString("vi-VN")}`);
  console.log("================================================================\n");

  try {
    await syncIndustryReports();
    await syncCompanyReports();
    await syncVietcapDirectReports(3);

    // 4. Đồng bộ bổ sung đa danh mục từ WiData (Vĩ mô, Chiến lược, Trái phiếu, IR, Doanh nghiệp)
    try {
      console.log("\n--- BƯỚC 4: ĐỒNG BỘ ĐA DANH MỤC TỪ WIDATA (AN TOÀN ẨN DANH) ---");
      const { spawnSync } = await import("node:child_process");
      spawnSync(process.execPath, [path.join(__dirname, "sync-widata-reports.mjs")], {
        stdio: "inherit",
        cwd: path.resolve(__dirname, ".."),
      });
    } catch (e) {
      console.warn("⚠️ Bỏ qua bước đồng bộ WiData:", e.message);
    }

    const dbInd = new DatabaseSync(path.join(DATA_DIR, "industry_reports.db"), { readOnly: true });
    const dbComp = new DatabaseSync(path.join(DATA_DIR, "company_reports.db"), { readOnly: true });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const recentInd = dbInd.prepare("SELECT count(*) as c FROM industry_reports WHERE date >= ?").get(sevenDaysAgo);
    const recentComp = dbComp.prepare("SELECT count(*) as c FROM company_reports WHERE date >= ?").get(sevenDaysAgo);
    const compTotal = dbComp.prepare("SELECT count(*) as total, count(distinct symbol) as stocks, max(date) as maxDate FROM company_reports").get();
    const newestSamples = dbComp.prepare("SELECT symbol, date, source, recommendation, target_price, title FROM company_reports ORDER BY date DESC, id DESC LIMIT 8").all();

    dbInd.close();
    dbComp.close();

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    console.log("\n================================================================");
    console.log(`✨ ĐỒNG BỘ THÀNH CÔNG TRONG ${elapsed} GIÂY!`);
    console.log(`📊 Tổng kho Doanh nghiệp: ${compTotal.total.toLocaleString("vi-VN")} báo cáo (${compTotal.stocks} mã) | Mới nhất: ${compTotal.maxDate}`);
    console.log(`📰 Báo cáo ngành mới (7 ngày qua): +${recentInd.c} bài`);
    console.log(`🏢 Báo cáo cổ phiếu mới (7 ngày qua): +${recentComp.c} bài`);
    console.log("----------------------------------------------------------------");
    console.log("🔥 Top báo cáo cổ phiếu mới nhất vừa cập nhật:");
    for (const s of newestSamples) {
      const tpStr = s.target_price ? ` | Giá MT: ${Number(s.target_price).toLocaleString("vi-VN")}đ` : "";
      const recStr = s.recommendation ? ` [${s.recommendation}]` : "";
      console.log(`   • [${s.date}] ${s.symbol} (${s.source})${recStr}${tpStr}: ${s.title.slice(0, 65)}...`);
    }
    console.log("================================================================");
  } catch (err) {
    console.error("❌ Lỗi trong quá trình đồng bộ:", err);
    process.exit(1);
  }
}

main();
