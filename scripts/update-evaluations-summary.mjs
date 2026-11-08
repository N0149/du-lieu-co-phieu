/**
 * Script cập nhật lại các chỉ số tài chính (EPS TTM, BVPS, P/E, P/B, Vốn hóa)
 * trong data/stock_evaluations_summary.json dựa trên số liệu BCTC Quý 3/2026 mới nhất từ SQLite.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");

const SUMMARY_FILE = path.join(DATA_DIR, "stock_evaluations_summary.json");
const DB_PATH = path.join(DATA_DIR, "financial_statements.db");

function main() {
  if (!fs.existsSync(SUMMARY_FILE) || !fs.existsSync(DB_PATH)) {
    console.error("Thiếu file dữ liệu!");
    process.exit(1);
  }

  const summary = JSON.parse(fs.readFileSync(SUMMARY_FILE, "utf-8"));
  const db = new DatabaseSync(DB_PATH, { readOnly: true });

  const rows = db.prepare(`
    SELECT symbol, fiscal_dates, cdkt, kqkd 
    FROM financial_statements 
    WHERE period_type = 'quarter'
  `).all();

  console.log(`Đã đọc ${rows.length} báo cáo tài chính quý từ SQLite.`);
  let updatedCount = 0;

  for (const row of rows) {
    const sym = row.symbol.toUpperCase().trim();
    let dates = [];
    let cdkt = [];
    let kqkd = [];

    try { dates = JSON.parse(row.fiscal_dates); } catch {}
    try { cdkt = JSON.parse(row.cdkt); } catch {}
    try { kqkd = JSON.parse(row.kqkd); } catch {}

    if (!Array.isArray(dates) || dates.length < 4) continue;

    // Tìm dòng Lợi nhuận sau thuế của cổ đông công ty mẹ
    let profitRow = kqkd.find((r) => {
      const name = (r[0] || "").toLowerCase().trim();
      return name === "lợi nhuận sau thuế của cổ đông công ty mẹ" ||
             name === "lợi nhuận của cổ đông công ty mẹ" ||
             name === "lnst của cđcty mẹ" ||
             name === "lợi nhuận sau thuế thu nhập doanh nghiệp" ||
             name === "lợi nhuận sau thuế";
    });

    if (!profitRow && kqkd.length > 0) {
      profitRow = kqkd.find((r) => (r[0] || "").toLowerCase().includes("cổ đông của công ty mẹ"));
    }

    if (!profitRow) continue;

    const profitVals = profitRow.slice(3).filter((v) => v != null);
    if (profitVals.length < 4) continue;

    const last4 = profitVals.slice(-4);
    const lnstTtmVnd = last4.reduce((sum, v) => sum + (Number(v) || 0), 0);

    // Vốn chủ sở hữu
    const equityRow = cdkt.find((r) => {
      const name = (r[0] || "").toLowerCase().trim();
      return name === "vốn chủ sở hữu" || name === "nguồn vốn chủ sở hữu";
    });

    let latestEquityVnd = null;
    if (equityRow) {
      const eqVals = equityRow.slice(3).filter((v) => v != null);
      if (eqVals.length > 0) {
        latestEquityVnd = Number(eqVals[eqVals.length - 1]) || null;
      }
    }

    const item = summary[sym] || {};
    let shares = item.shares || null;

    if (!shares && Array.isArray(cdkt)) {
      const charterCapRow = cdkt.find((r) => {
        const name = (r[0] || "").toLowerCase().trim();
        return name === "vốn góp" || name === "vốn đầu tư của chủ sở hữu" || name === "vốn điều lệ";
      });
      if (charterCapRow) {
        const capVals = charterCapRow.slice(3).filter((v) => v != null);
        if (capVals.length > 0) {
          const cap = Number(capVals[capVals.length - 1]);
          if (cap > 0) shares = Math.round(cap / 10000);
        }
      }
    }

    if (!shares || shares <= 0) continue;

    const newEps = Math.round((lnstTtmVnd / shares) * 10) / 10;
    const newBvps = latestEquityVnd ? Math.round((latestEquityVnd / shares) * 10) / 10 : item.bvps;
    const price = item.price || null;

    item.eps = newEps;
    if (newBvps) item.bvps = newBvps;
    item.shares = shares;

    if (price && price > 0) {
      if (newEps > 0) {
        item.pe = Math.round((price / newEps) * 100) / 100;
      }
      if (newBvps && newBvps > 0) {
        item.pb = Math.round((price / newBvps) * 100) / 100;
      }
      item.mc = Math.round((price * shares) / 10_000_000) / 100; // tỷ
    }

    item.latestQuarter = dates[dates.length - 1];
    summary[sym] = item;
    updatedCount++;
  }

  db.close();

  fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2), "utf-8");
  console.log(`🎉 Đã tính toán lại và cập nhật chỉ số TTM cho ${updatedCount} mã vào ${SUMMARY_FILE}`);
}

main();
