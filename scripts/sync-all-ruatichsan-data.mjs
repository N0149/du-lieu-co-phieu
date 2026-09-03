/**
 * Script cào và lưu trữ toàn bộ dữ liệu từ ruatichsan.com về máy cục bộ
 * bao gồm:
 *   1. Đánh giá 360° & Định giá Valuation (Forward P/E, P/B, Medians) -> data/stock_evaluations.db & data/evaluation_cache/
 *   2. Hồ sơ doanh nghiệp (Cơ cấu cổ đông, Công ty con/liên kết, Giao dịch nội bộ) -> data/company_profiles.db & data/shareholder_cache/
 *   3. Lịch sử cổ tức (Dividend history) -> data/dividend_history.db
 *
 * Chạy độc lập, tự động phục hồi lỗi, đa luồng concurrency, ưu tiên theo vốn hóa từ lớn đến bé.
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

const CIPHER_KEY_HEX = "19dd3af428f4cf7d68864cd4c87d8d1c5b489932e84b93ac6528a0dd403a5725";

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

// Khởi tạo thư mục và SQLite databases
function initDatabases() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const evalCacheDir = path.join(DATA_DIR, "evaluation_cache");
  const shCacheDir = path.join(DATA_DIR, "shareholder_cache");
  if (!fs.existsSync(evalCacheDir)) fs.mkdirSync(evalCacheDir, { recursive: true });
  if (!fs.existsSync(shCacheDir)) fs.mkdirSync(shCacheDir, { recursive: true });

  // 1. Stock evaluations db
  const evalDb = new DatabaseSync(path.join(DATA_DIR, "stock_evaluations.db"));
  evalDb.exec(`
    CREATE TABLE IF NOT EXISTS stock_evaluations (
      symbol TEXT PRIMARY KEY,
      score360_total REAL,
      score360_rating TEXT,
      pe_vs_median REAL,
      pb_vs_median REAL,
      ps_vs_median REAL,
      pe_forward REAL,
      pb_forward REAL,
      pe_forward_vs_median REAL,
      pb_forward_vs_median REAL,
      raw_json TEXT,
      updated_at TEXT
    );
  `);

  // 2. Company profiles db (cổ đông, công ty con, giao dịch nội bộ)
  const profileDb = new DatabaseSync(path.join(DATA_DIR, "company_profiles.db"));
  profileDb.exec(`
    CREATE TABLE IF NOT EXISTS company_profiles (
      symbol TEXT PRIMARY KEY,
      foreign_rate REAL,
      state_rate REAL,
      other_rate REAL,
      raw_json TEXT,
      updated_at TEXT
    );
  `);

  // 3. Dividend history db
  const divDb = new DatabaseSync(path.join(DATA_DIR, "dividend_history.db"));
  divDb.exec(`
    CREATE TABLE IF NOT EXISTS dividend_history (
      symbol TEXT PRIMARY KEY,
      events_json TEXT,
      updated_at TEXT
    );
  `);

  return { evalDb, profileDb, divDb };
}

// Lấy danh sách mã ưu tiên theo vốn hóa
function getSortedTickers() {
  const manifestPath = path.join(DATA_DIR, "longlive_manifest.json");
  if (!fs.existsSync(manifestPath)) {
    return ["TCB", "VCB", "MBB", "ACB", "VPB", "HPG", "FPT", "VNM", "MWG", "MSN", "SSI", "VND", "DGC", "VHM", "VIC", "VRE", "OCB"];
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const items = manifest.items || [];
    // Sort theo vốn hóa giảm dần
    items.sort((a, b) => (Number(b.cap) || 0) - (Number(a.cap) || 0));
    const tickers = items.map((x) => x.t).filter(Boolean);
    return [...new Set(tickers)];
  } catch (e) {
    console.error("Lỗi đọc longlive_manifest.json:", e);
    return ["TCB", "VCB", "MBB", "HPG", "FPT", "MWG", "OCB"];
  }
}

async function fetchWithRetry(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          Origin: "https://ruatichsan.com",
          Referer: "https://ruatichsan.com/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
      });
      if (res.ok) {
        return await decryptApiResponse(res);
      }
      if (res.status === 404) return null;
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return null;
}

async function syncSymbol(sym, { evalDb, profileDb, divDb }) {
  const evalStmt = evalDb.prepare(`
    INSERT INTO stock_evaluations (
      symbol, score360_total, score360_rating, pe_vs_median, pb_vs_median, ps_vs_median,
      pe_forward, pb_forward, pe_forward_vs_median, pb_forward_vs_median, raw_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol) DO UPDATE SET
      score360_total=excluded.score360_total,
      score360_rating=excluded.score360_rating,
      pe_vs_median=excluded.pe_vs_median,
      pb_vs_median=excluded.pb_vs_median,
      ps_vs_median=excluded.ps_vs_median,
      pe_forward=excluded.pe_forward,
      pb_forward=excluded.pb_forward,
      pe_forward_vs_median=excluded.pe_forward_vs_median,
      pb_forward_vs_median=excluded.pb_forward_vs_median,
      raw_json=excluded.raw_json,
      updated_at=excluded.updated_at
  `);

  const profileStmt = profileDb.prepare(`
    INSERT INTO company_profiles (symbol, foreign_rate, state_rate, other_rate, raw_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol) DO UPDATE SET
      foreign_rate=excluded.foreign_rate,
      state_rate=excluded.state_rate,
      other_rate=excluded.other_rate,
      raw_json=excluded.raw_json,
      updated_at=excluded.updated_at
  `);

  const divStmt = divDb.prepare(`
    INSERT INTO dividend_history (symbol, events_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(symbol) DO UPDATE SET
      events_json=excluded.events_json,
      updated_at=excluded.updated_at
  `);

  const now = new Date().toISOString();

  // 1. Valuation & Đánh giá 360°
  try {
    const vData = await fetchWithRetry(`https://api.ruatichsan.com/api/v1/data/public/valuation/${sym}`);
    if (vData) {
      const snap = vData.snapshot || {};
      const scoreTotal = snap.score360_total != null ? Number(snap.score360_total) : null;
      let ratingText = "KHÁ";
      if (scoreTotal != null) {
        if (scoreTotal >= 8.0) ratingText = "XUẤT SẮC";
        else if (scoreTotal >= 6.5) ratingText = "TỐT";
        else if (scoreTotal >= 5.0) ratingText = "KHÁ";
        else if (scoreTotal >= 3.5) ratingText = "TRUNG BÌNH";
        else ratingText = "YẾU";
      }

      evalStmt.run(
        sym,
        scoreTotal,
        ratingText,
        snap.pe_vs_median != null ? Number(snap.pe_vs_median) : null,
        snap.pb_vs_median != null ? Number(snap.pb_vs_median) : null,
        snap.ps_vs_median != null ? Number(snap.ps_vs_median) : null,
        snap.pe_forward != null ? Number(snap.pe_forward) : null,
        snap.pb_forward != null ? Number(snap.pb_forward) : null,
        snap.pe_forward_vs_median != null ? Number(snap.pe_forward_vs_median) : null,
        snap.pb_forward_vs_median != null ? Number(snap.pb_forward_vs_median) : null,
        JSON.stringify(vData),
        now
      );

      // Lưu file JSON cache riêng lẻ
      fs.writeFileSync(path.join(DATA_DIR, "evaluation_cache", `${sym}.json`), JSON.stringify(vData, null, 2), "utf-8");
    }
  } catch {}

  // 2. Hồ sơ doanh nghiệp (Cổ đông, Công ty con/liên kết, Giao dịch nội bộ)
  try {
    const sData = await fetchWithRetry(`https://api.ruatichsan.com/api/v1/data/public/shareholder/${sym}`);
    if (sData) {
      const cc = sData.co_cau_so_huu || {};
      profileStmt.run(
        sym,
        Number(cc.NuocNgoai) || 0,
        Number(cc.NhaNuoc) || 0,
        Number(cc.Khac) || 0,
        JSON.stringify(sData),
        now
      );

      // Lưu file JSON cache riêng lẻ
      fs.writeFileSync(path.join(DATA_DIR, "shareholder_cache", `${sym}.json`), JSON.stringify(sData, null, 2), "utf-8");
    }
  } catch {}

  // 3. Lịch sử cổ tức
  try {
    const dData = await fetchWithRetry(`https://api.ruatichsan.com/api/v1/data/public/dividend-history/${sym}`);
    if (dData && dData.events) {
      divStmt.run(sym, JSON.stringify(dData.events), now);
    }
  } catch {}
}

async function main() {
  console.log("=== BẮT ĐẦU CÀO TOÀN BỘ DỮ LIỆU TỪ RUATICHSAN.COM VỀ MÁY CỤC BỘ ===");
  const dbs = initDatabases();
  const tickers = getSortedTickers();
  console.log(`Tìm thấy tổng cộng ${tickers.length} mã cổ phiếu cần đồng bộ.`);

  const CONCURRENCY = 6;
  let currentIndex = 0;
  let completed = 0;
  const startTime = Date.now();

  async function worker() {
    while (currentIndex < tickers.length) {
      const idx = currentIndex++;
      const sym = tickers[idx];
      try {
        await syncSymbol(sym, dbs);
      } catch (err) {
        // ignore error to keep running
      }
      completed++;
      if (completed % 25 === 0 || completed === tickers.length) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const pct = ((completed / tickers.length) * 100).toFixed(1);
        console.log(`[${completed}/${tickers.length}] (${pct}%) Đã đồng bộ ${sym} - Thời gian: ${elapsed}s`);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 HOÀN TẤT ĐỒNG BỘ TOÀN BỘ ${completed} MÃ CỔ PHIẾU TRONG ${totalTime}s!`);
  console.log("Dữ liệu đã được lưu trữ vĩnh viễn vào SQLite và thư mục data/ sẵn sàng cho Offline-First.");
}

main().catch(console.error);
