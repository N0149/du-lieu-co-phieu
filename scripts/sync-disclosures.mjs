/**
 * Corporate Disclosures Synchronization Engine (CBTT 3 Sàn: HOSE · HNX · UPCOM)
 * 
 * Tự động cào, phân loại thông minh và lưu trữ toàn bộ công bố thông tin doanh nghiệp
 * (BCTC soát xét, Giải trình biến động KQKD, Cổ tức, Nghị quyết HĐQT/ĐHĐCĐ, Cảnh báo Sở)
 * trên cả 3 sàn HOSE, HNX và UPCoM vào SQLite nội bộ (data/corporate_disclosures.db).
 * 
 * Nguồn dữ liệu kết hợp:
 *   1. CafeF Real-time Disclosures Stream (Bao phủ cả 3 sàn HOSE, HNX, UPCoM)
 *   2. Vietcap IQ / FiinGroup News Service (Bao quát chuyên sâu theo từng mã cổ phiếu)
 * 
 * Cách dùng:
 *   node scripts/sync-disclosures.mjs                     # Cập nhật luồng CBTT mới nhất thị trường + watchlist
 *   node scripts/sync-disclosures.mjs --symbol=BMI        # Cào toàn bộ lịch sử CBTT của 1 mã
 *   node scripts/sync-disclosures.mjs --symbols=BMI,DAN   # Cào các mã chỉ định
 *   node scripts/sync-disclosures.mjs --watchlist         # Cào sâu danh mục 21 mã nòng cốt + VN30
 *   node scripts/sync-disclosures.mjs --market-pages=5    # Cào sâu 5 trang tin toàn thị trường (~250 văn bản)
 *   node scripts/sync-disclosures.mjs --daemon            # Chạy nền tự động mỗi 5 phút
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.resolve(ROOT_DIR, "data");

const DB_PATH = path.join(DATA_DIR, "corporate_disclosures.db");
const SNAPSHOT_PATH = path.join(DATA_DIR, "disclosures_snapshot.json");

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

// 21 mã danh mục nòng cốt của dulieudautu.com
export const CORE_WATCHLIST = [
  "ABT", "AIC", "AMS", "ANV", "ASP", "BAX", "BCC", "BLI", "BMI", "BTD",
  "BTP", "CAT", "CBS", "CCI", "CCS", "CDN", "CKD", "CLX", "CMW", "CNT", "DAN"
];

let stockExchanges = {};
let stockNames = {};

function loadMetaMaps() {
  try {
    const exPath = path.join(DATA_DIR, "stock_exchanges.json");
    if (fs.existsSync(exPath)) {
      stockExchanges = JSON.parse(fs.readFileSync(exPath, "utf-8"));
    }
  } catch (e) {
    console.warn("Could not load stock_exchanges.json:", e.message);
  }

  try {
    const mfPath = path.join(DATA_DIR, "longlive_manifest.json");
    if (fs.existsSync(mfPath)) {
      const mf = JSON.parse(fs.readFileSync(mfPath, "utf-8"));
      if (Array.isArray(mf.items)) {
        for (const it of mf.items) {
          if (it.t) {
            stockNames[it.t.toUpperCase()] = it.n || "";
            if (it.e && !stockExchanges[it.t.toUpperCase()]) {
              stockExchanges[it.t.toUpperCase()] = it.e.toUpperCase();
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn("Could not load longlive_manifest.json:", e.message);
  }
}

// Khởi tạo Database SQLite
export function initDisclosuresDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS disclosures (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      exchange TEXT,
      company_name TEXT,
      title TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      doc_type_label TEXT,
      published_at TEXT NOT NULL,
      file_url TEXT,
      source TEXT NOT NULL,
      is_important INTEGER DEFAULT 0,
      raw_json TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_disclosures_symbol ON disclosures(symbol);
    CREATE INDEX IF NOT EXISTS idx_disclosures_published ON disclosures(published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_disclosures_doc_type ON disclosures(doc_type);
    CREATE INDEX IF NOT EXISTS idx_disclosures_important ON disclosures(is_important);
  `);
  return db;
}

/**
 * Phân loại thông minh (Smart Classifier)
 * Nhận diện loại văn bản pháp lý và gắn cờ is_important cho tin nhạy cảm giá
 */
export function classifyDisclosure(title) {
  const t = (title || "").toLowerCase();

  // 1. Cảnh báo / Kiểm soát / Đình chỉ (Rất quan trọng - thay đổi trạng thái giao dịch)
  if (
    t.includes("cảnh báo") ||
    t.includes("kiểm soát") ||
    t.includes("ra khỏi diện") ||
    t.includes("đưa vào diện") ||
    t.includes("hạn chế giao dịch") ||
    t.includes("đình chỉ giao dịch") ||
    t.includes("hủy niêm yết")
  ) {
    return {
      docType: "CANH_BAO_KIEM_SOAT",
      label: "Cảnh báo & Kiểm soát",
      isImportant: 1,
    };
  }

  // 2. Giải trình KQKD (Cực kỳ giá trị để bắt sóng lợi nhuận / đảo chiều)
  if (
    t.includes("giải trình") ||
    t.includes("chênh lệch") ||
    t.includes("biến động kqkd") ||
    t.includes("kết quả kinh doanh") ||
    t.includes("chuyển từ lỗ sang lãi")
  ) {
    return {
      docType: "GIAI_TRINH_KQKD",
      label: "Giải trình KQKD",
      isImportant: 1,
    };
  }

  // 3. Báo cáo tài chính & Soát xét bán niên / Kiểm toán
  if (
    t.includes("bctc") ||
    t.includes("báo cáo tài chính") ||
    t.includes("soát xét") ||
    t.includes("kiểm toán") ||
    t.includes("bán niên")
  ) {
    return {
      docType: "BCTC_SOAT_XET",
      label: "BCTC & Soát xét",
      isImportant: 1,
    };
  }

  // 4. Cổ tức & Quyền (Tiền mặt / Cổ phiếu / Thưởng)
  if (
    t.includes("cổ tức") ||
    t.includes("đkcc") ||
    t.includes("đăng ký cuối cùng") ||
    t.includes("chi trả") ||
    t.includes("tạm ứng cổ tức") ||
    t.includes("thưởng cổ phiếu")
  ) {
    return {
      docType: "CO_TUC",
      label: "Cổ tức & Quyền",
      isImportant: 1,
    };
  }

  // 5. ĐHĐCĐ (Đại hội đồng cổ đông thường niên / bất thường)
  if (
    t.includes("đhđcđ") ||
    t.includes("đhcđ") ||
    t.includes("đại hội đồng cổ đông") ||
    t.includes("nghị quyết đhđcđ") ||
    t.includes("tài liệu đhđcđ") ||
    t.includes("lấy ý kiến cổ đông")
  ) {
    const imp = t.includes("bất thường") || t.includes("kế hoạch") ? 1 : 0;
    return {
      docType: "DHDCD",
      label: "ĐHĐCĐ",
      isImportant: imp,
    };
  }

  // 6. Nghị quyết HĐQT / Ban Giám đốc (Nhân sự, Dự án, Kế hoạch)
  if (
    t.includes("hđqt") ||
    t.includes("hội đồng quản trị") ||
    t.includes("bổ nhiệm") ||
    t.includes("miễn nhiệm") ||
    t.includes("tổng giám đốc") ||
    t.includes("chủ tịch")
  ) {
    return {
      docType: "NGHI_QUYET_HDQT",
      label: "Nghị quyết HĐQT",
      isImportant: 0,
    };
  }

  // 7. Giao dịch người nội bộ & Cổ đông lớn
  if (
    t.includes("giao dịch") ||
    t.includes("nội bộ") ||
    t.includes("cổ đông lớn") ||
    t.includes("người có liên quan")
  ) {
    return {
      docType: "GIAO_DICH_NOI_BO",
      label: "Giao dịch nội bộ",
      isImportant: 0,
    };
  }

  return {
    docType: "KHAC",
    label: "Công bố thông tin",
    isImportant: 0,
  };
}

/**
 * Tách mã cổ phiếu từ tiêu đề
 */
export function extractTickerFromTitle(title, fallback = null) {
  if (fallback) return fallback.toUpperCase();
  if (!title) return null;
  const match = title.match(/^([A-Za-z0-9]{3,5})\s*[:\-\.]/);
  if (match) {
    const candidate = match[1].toUpperCase();
    if (stockExchanges[candidate] || stockNames[candidate] || candidate.length === 3) {
      return candidate;
    }
  }
  return null;
}

/**
 * Chuyển DD/MM/YYYY HH:mm sang ISO YYYY-MM-DD HH:mm:ss
 */
function parseVnDateTime(str) {
  if (!str) return new Date().toISOString().replace("T", " ").slice(0, 19);
  const match = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})/);
  if (match) {
    const [, d, m, y, h, min] = match;
    const pad = (n) => String(n).padStart(2, "0");
    return `${y}-${pad(m)}-${pad(d)} ${pad(h)}:${pad(min)}:00`;
  }
  return str.replace("T", " ").slice(0, 19);
}

/**
 * Lưu 1 danh sách item chuẩn hóa vào SQLite
 */
function insertDisclosures(db, records) {
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  const stmt = db.prepare(`
    INSERT INTO disclosures (
      id, symbol, exchange, company_name, title, doc_type, doc_type_label,
      published_at, file_url, source, is_important, raw_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      doc_type = excluded.doc_type,
      doc_type_label = excluded.doc_type_label,
      file_url = excluded.file_url,
      is_important = excluded.is_important,
      raw_json = excluded.raw_json
  `);

  let count = 0;
  for (const r of records) {
    if (!r.symbol || !r.title) continue;
    stmt.run(
      r.id,
      r.symbol,
      r.exchange,
      r.company_name,
      r.title,
      r.doc_type,
      r.doc_type_label,
      r.published_at,
      r.file_url,
      r.source,
      r.is_important,
      r.raw_json || "{}",
      now
    );
    count++;
  }
  return count;
}

/**
 * Nguồn 1: Thu thập từ CafeF Disclosures Stream (Bao gồm cả 3 sàn HOSE, HNX, UPCoM)
 */
async function fetchCafefDisclosures(page = 1, pageSize = 50) {
  const url = `https://cafef.vn/du-lieu/Ajax/Events_RelatedNews_New.aspx?symbol=&floorID=0&configID=0&PageIndex=${page}&PageSize=${pageSize}&Type=2`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Referer: "https://cafef.vn/",
    },
  });

  if (!res.ok) {
    throw new Error(`CafeF HTTP ${res.status}: ${res.statusText}`);
  }

  const html = await res.text();
  const records = [];

  // Parse từng thẻ li
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let liMatch;
  while ((liMatch = liRegex.exec(html)) !== null) {
    const liContent = liMatch[1];
    const timeMatch = liContent.match(/<span class=["']timeTitle["']>([^<]+)<\/span>/i);
    const linkMatch = liContent.match(/<a class=['"]docnhanhTitle['"][^>]*href=['"]([^'"]+)['"][^>]*title=['"]([^'"]*)['"][^>]*>([\s\S]*?)<\/a>/i);

    if (!timeMatch || !linkMatch) continue;

    const rawTime = timeMatch[1].trim();
    const publishedAt = parseVnDateTime(rawTime);
    let rawHref = linkMatch[1].trim();
    const fileUrl = rawHref.startsWith("http") ? rawHref : `https://cafef.vn${rawHref}`;
    const rawTitle = (linkMatch[2] || linkMatch[3] || "").replace(/<[^>]+>/g, "").trim();

    const symbol = extractTickerFromTitle(rawTitle);
    if (!symbol) continue;

    const exchange = stockExchanges[symbol] || "UPCOM";
    const companyName = stockNames[symbol] || "";
    const { docType, label, isImportant } = classifyDisclosure(rawTitle);

    const titleHash = crypto.createHash("md5").update(rawTitle).digest("hex").slice(0, 10);
    const id = `cf_${symbol}_${publishedAt.slice(0, 10)}_${titleHash}`;

    records.push({
      id,
      symbol,
      exchange,
      company_name: companyName,
      title: rawTitle,
      doc_type: docType,
      doc_type_label: label,
      published_at: publishedAt,
      file_url: fileUrl,
      source: "CafeF_Sở",
      is_important: isImportant,
      raw_json: JSON.stringify({ rawTime, rawHref, rawTitle }),
    });
  }

  return records;
}

/**
 * Nguồn 2: Thu thập từ Vietcap IQ / FiinGroup News Service (Theo từng mã)
 */
async function fetchVietcapNews(ticker, page = 0, size = 50) {
  const today = new Date();
  const toDate = today.toISOString().slice(0, 10).replace(/-/g, "");
  // Lấy dữ liệu 5 năm gần nhất
  const fromDate = new Date(today.getTime() - 365 * 5 * 86400000)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const url = `https://iq.vietcap.com.vn/api/iq-insight-service/v1/news?ticker=${ticker}&fromDate=${fromDate}&toDate=${toDate}&languageId=1&page=${page}&size=${size}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Vietcap HTTP ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  const content = json.data?.content || [];
  const records = [];

  for (const item of content) {
    const rawTitle = (item.newsTitle || item.title || "").trim();
    if (!rawTitle) continue;

    const symbol = ticker.toUpperCase();
    const exchange = stockExchanges[symbol] || "HOSE";
    const companyName = stockNames[symbol] || "";
    const publishedAt = (item.publicDate || item.publishedDate || "").replace("T", " ").slice(0, 19);
    const fileUrl = item.newsSourceLink || item.newsImageUrl || "";

    const { docType, label, isImportant } = classifyDisclosure(rawTitle);
    const id = item.newsId ? `vci_${item.newsId}` : `${symbol}_${publishedAt.slice(0, 10)}_${crypto.createHash("md5").update(rawTitle).digest("hex").slice(0, 10)}`;

    records.push({
      id,
      symbol,
      exchange,
      company_name: companyName,
      title: rawTitle,
      doc_type: docType,
      doc_type_label: label,
      published_at: publishedAt,
      file_url: fileUrl,
      source: "Vietcap_FiinGroup",
      is_important: isImportant,
      raw_json: JSON.stringify(item),
    });
  }

  return records;
}

/**
 * Đồng bộ luồng toàn thị trường (cả HOSE, HNX, UPCoM)
 */
async function syncMarketDisclosures(db, pages = 4) {
  console.log(`\n=== ĐỒNG BỘ LUỒNG CÔNG BỐ THÔNG TIN 3 SÀN (HOSE · HNX · UPCOM) ===`);
  let totalSaved = 0;

  for (let page = 1; page <= pages; page++) {
    try {
      const records = await fetchCafefDisclosures(page, 50);
      const saved = insertDisclosures(db, records);
      totalSaved += saved;
      console.log(`  -> Trang ${page}: Nạp ${saved}/${records.length} văn bản công bố mới`);
      await new Promise((r) => setTimeout(r, 150));
    } catch (err) {
      console.error(`  [!] Lỗi cào trang ${page}:`, err.message);
    }
  }

  console.log(`-> Đã lưu thành công ${totalSaved} văn bản toàn thị trường vào SQLite!`);
}

/**
 * Đồng bộ chuyên sâu theo danh sách mã
 */
async function syncTickersDisclosures(db, tickers) {
  console.log(`\n=== ĐỒNG BỘ CHUYÊN SÂU THEO MÃ (${tickers.length} MÃ) ===`);
  let totalSaved = 0;

  for (let i = 0; i < tickers.length; i++) {
    const sym = tickers[i].toUpperCase().trim();
    process.stdout.write(`[${i + 1}/${tickers.length}] Quét ${sym}... `);

    try {
      const records = await fetchVietcapNews(sym, 0, 50);
      const saved = insertDisclosures(db, records);
      totalSaved += saved;
      console.log(`OK (${saved} văn bản)`);
    } catch (err) {
      console.log(`Lỗi: ${err.message}`);
    }

    if (i < tickers.length - 1) {
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  console.log(`-> Hoàn tất quét theo mã! Tổng số văn bản cập nhật: ${totalSaved}`);
}

/**
 * Xuất file JSON Snapshot nhanh phục vụ Website
 */
export function exportSnapshot(db, limit = 200) {
  const rows = db.prepare(`
    SELECT id, symbol, exchange, company_name, title, doc_type, doc_type_label,
           published_at, file_url, source, is_important
    FROM disclosures
    ORDER BY published_at DESC
    LIMIT ?
  `).all(limit);

  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(rows, null, 2), "utf-8");
  console.log(`[Snapshot] Đã xuất ${rows.length} tin CBTT mới nhất sang: ${SNAPSHOT_PATH}`);
  return rows;
}

// Main CLI Runner
async function main() {
  loadMetaMaps();
  const db = initDisclosuresDb();

  const args = process.argv.slice(2);
  const symbolArg = args.find((a) => a.startsWith("--symbol="))?.split("=")[1];
  const symbolsArg = args.find((a) => a.startsWith("--symbols="))?.split("=")[1];
  const pagesArg = args.find((a) => a.startsWith("--market-pages="))?.split("=")[1];
  const isWatchlist = args.includes("--watchlist");
  const isDaemon = args.includes("--daemon");

  const marketPages = pagesArg ? parseInt(pagesArg, 10) : 4;

  if (symbolArg) {
    await syncTickersDisclosures(db, [symbolArg]);
  } else if (symbolsArg) {
    const list = symbolsArg.split(",").map((s) => s.trim()).filter(Boolean);
    await syncTickersDisclosures(db, list);
  } else if (isWatchlist) {
    await syncTickersDisclosures(db, CORE_WATCHLIST);
    await syncMarketDisclosures(db, 3);
  } else if (isDaemon) {
    console.log("=== BẬT CHẾ ĐỘ DAEMON: TỰ ĐỘNG QUÉT CBTT MỖI 5 PHÚT ===");
    const runCycle = async () => {
      console.log(`\n[${new Date().toLocaleTimeString("vi-VN")}] Bắt đầu chu kỳ quét CBTT...`);
      await syncMarketDisclosures(db, 2);
      await syncTickersDisclosures(db, CORE_WATCHLIST);
      exportSnapshot(db);
    };

    await runCycle();
    setInterval(runCycle, 5 * 60 * 1000);
    return;
  } else {
    // Mặc định: Quét luồng thị trường mới nhất + quét danh mục nòng cốt
    await syncMarketDisclosures(db, marketPages);
    await syncTickersDisclosures(db, CORE_WATCHLIST);
  }

  exportSnapshot(db);
}

if (process.argv[1] && process.argv[1].endsWith("sync-disclosures.mjs")) {
  main().catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  });
}
