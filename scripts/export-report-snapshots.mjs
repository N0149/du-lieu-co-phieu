import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../data");

export function exportSnapshots() {
  console.log("📦 Bắt đầu xuất snapshot JSON cho Vercel / Production...");

  // 1. Export company_reports_snapshot.json
  const compDbPath = path.join(DATA_DIR, "company_reports.db");
  if (fs.existsSync(compDbPath)) {
    const compDb = new DatabaseSync(compDbPath, { readOnly: true });
    const compRows = compDb.prepare(`
      SELECT id, symbol, title, slug, source, date, display_date as displayDate,
             recommendation, target_price as targetPrice, page_count as pageCount,
             description, download_url as downloadUrl, thumbnail_url as thumbnailUrl
      FROM company_reports
      ORDER BY date DESC, id DESC
    `).all();
    compDb.close();

    const compSnapshotPath = path.join(DATA_DIR, "company_reports_snapshot.json");
    fs.writeFileSync(compSnapshotPath, JSON.stringify(compRows, null, 2), "utf8");
    console.log(`✅ Xuất thành công company_reports_snapshot.json: ${compRows.length} báo cáo`);
  }

  // 2. Export industry_reports_snapshot.json
  const indDbPath = path.join(DATA_DIR, "industry_reports.db");
  if (fs.existsSync(indDbPath)) {
    const indDb = new DatabaseSync(indDbPath, { readOnly: true });
    const indRows = indDb.prepare(`
      SELECT id, title, slug, source, date, display_date as displayDate,
             page_count as pageCount, description, download_url as downloadUrl,
             thumbnail_url as thumbnailUrl, sector_name as sectorName
      FROM industry_reports
      ORDER BY date DESC, id DESC
    `).all();
    indDb.close();

    const indSnapshotPath = path.join(DATA_DIR, "industry_reports_snapshot.json");
    fs.writeFileSync(indSnapshotPath, JSON.stringify(indRows, null, 2), "utf8");
    console.log(`✅ Xuất thành công industry_reports_snapshot.json: ${indRows.length} báo cáo`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  exportSnapshots();
}
