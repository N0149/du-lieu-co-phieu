import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "financial_statements.db");

const CIPHER_KEY_HEX = "19dd3af428f4cf7d68864cd4c87d8d1c5b489932e84b93ac6528a0dd403a5725";
const API_BASE_URL = "https://api.ruatichsan.com/api/v1/data/public/financial-statements";

export interface RawFinancialStatementData {
  fiscalDates: string[];
  cdkt: Array<[string, number, number, ...Array<number | null>]>;
  kqkd: Array<[string, number, number, ...Array<number | null>]>;
  lctt: Array<[string, number, number, ...Array<number | null>]>;
  dataSource?: string;
}

let cryptoKeyCache: CryptoKey | null = null;
async function getCryptoKey(): Promise<CryptoKey> {
  if (cryptoKeyCache) return cryptoKeyCache;
  const bytes = new Uint8Array(CIPHER_KEY_HEX.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  cryptoKeyCache = await crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["decrypt"]);
  return cryptoKeyCache;
}

async function decryptApiResponse(res: Response): Promise<any> {
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

// Khởi tạo bảng SQLite
export function initFinancialStatementsDb(): DatabaseSync {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);
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
  return db;
}

// Đọc BCTC từ SQLite
export function getLocalFinancialStatements(
  symbol: string,
  periodType: "quarter" | "annual" = "quarter"
): RawFinancialStatementData | null {
  const ticker = symbol.toUpperCase().trim();
  if (!fs.existsSync(DB_PATH)) return null;

  try {
    const db = new DatabaseSync(DB_PATH, { readOnly: true });
    try {
      const row = db
        .prepare(
          `SELECT fiscal_dates, cdkt, kqkd, lctt, data_source 
           FROM financial_statements 
           WHERE symbol = ? AND period_type = ?`
        )
        .get(ticker, periodType) as {
        fiscal_dates: string;
        cdkt: string;
        kqkd: string;
        lctt: string;
        data_source?: string;
      } | undefined;

      if (!row) return null;

      return {
        fiscalDates: JSON.parse(row.fiscal_dates),
        cdkt: JSON.parse(row.cdkt),
        kqkd: JSON.parse(row.kqkd),
        lctt: JSON.parse(row.lctt),
        dataSource: row.data_source,
      };
    } finally {
      db.close();
    }
  } catch (err) {
    console.error(`[getLocalFinancialStatements] Error reading DB for ${ticker}:`, err);
    return null;
  }
}

// Lưu BCTC vào SQLite
export function saveLocalFinancialStatements(
  symbol: string,
  periodType: "quarter" | "annual",
  data: RawFinancialStatementData
): void {
  const ticker = symbol.toUpperCase().trim();
  const db = initFinancialStatementsDb();

  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO financial_statements (
        symbol, period_type, fiscal_dates, cdkt, kqkd, lctt, data_source, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);

    stmt.run(
      ticker,
      periodType,
      JSON.stringify(data.fiscalDates || []),
      JSON.stringify(data.cdkt || []),
      JSON.stringify(data.kqkd || []),
      JSON.stringify(data.lctt || []),
      data.dataSource || "Ruatichsan"
    );
  } finally {
    db.close();
  }
}

// Tải từ nguồn chính thức (Online Fallback) và tự động Cache vào SQLite (Offline-First)
export async function fetchAndCacheFinancialStatements(
  symbol: string,
  periodType: "quarter" | "annual" = "quarter"
): Promise<RawFinancialStatementData | null> {
  const ticker = symbol.toUpperCase().trim();

  // 1. Kiểm tra SQLite nội bộ trước
  const local = getLocalFinancialStatements(ticker, periodType);
  if (local && local.fiscalDates && local.fiscalDates.length > 0) {
    return local;
  }

  // 2. Nếu chưa có, tải online và giải mã
  try {
    const endpoint = `${API_BASE_URL}/${periodType}/${encodeURIComponent(ticker)}`;
    const res = await fetch(endpoint, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Origin": "https://ruatichsan.com",
        "Referer": `https://ruatichsan.com/company?symbol=${ticker}`,
      },
    });

    if (!res.ok) {
      return null;
    }

    const data: RawFinancialStatementData = await decryptApiResponse(res);

    if (data && Array.isArray(data.fiscalDates) && data.fiscalDates.length > 0) {
      // 3. Tự động lưu cache vào SQLite
      saveLocalFinancialStatements(ticker, periodType, data);
      return data;
    }

    return null;
  } catch (err) {
    console.error(`[fetchAndCacheFinancialStatements] Error for ${ticker} (${periodType}):`, err);
    return null;
  }
}
