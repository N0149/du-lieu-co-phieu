import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

export const dynamic = "force-dynamic";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "company_reports.db");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const ticker = symbol?.toUpperCase().trim();

    if (!ticker) {
      return NextResponse.json({ error: "Missing symbol parameter" }, { status: 400 });
    }

    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json({
        symbol: ticker,
        total: 0,
        reports: [],
      });
    }

    const db = new DatabaseSync(DB_PATH, { readOnly: true });

    try {
      const rows = db
        .prepare(
          `
        SELECT 
          id,
          symbol,
          title,
          slug,
          source,
          date,
          display_date as displayDate,
          recommendation,
          target_price as targetPrice,
          page_count as pageCount,
          description,
          download_url as downloadUrl,
          thumbnail_url as thumbnailUrl
        FROM company_reports
        WHERE symbol = ?
        ORDER BY date DESC
      `
        )
        .all(ticker);

      return NextResponse.json({
        symbol: ticker,
        total: rows.length,
        reports: rows,
      });
    } finally {
      db.close();
    }
  } catch (error) {
    console.error(`[api/reports/company] Error querying reports for symbol:`, error);
    return NextResponse.json(
      { error: "Internal Server Error", detail: String(error) },
      { status: 500 }
    );
  }
}
