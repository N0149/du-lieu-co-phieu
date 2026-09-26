import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

export const dynamic = "force-dynamic";

const DATA_DIR = path.resolve(process.cwd(), "data");
const COMPANY_DB_PATH = path.join(DATA_DIR, "company_reports.db");
const INDUSTRY_DB_PATH = path.join(DATA_DIR, "industry_reports.db");
const WIDATA_REPORTS_DIR = path.join(DATA_DIR, "widata_archive", "reports");

function loadJsonFile(filename: string): any[] {
  const p = path.join(WIDATA_REPORTS_DIR, filename);
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) || [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "company"; // 'company' | 'industry' | 'macro' | 'strategy' | 'bond' | 'ir' | 'stats'
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const symbol = (searchParams.get("symbol") || "").trim().toUpperCase();
  const source = (searchParams.get("source") || "").trim();
  const recommendation = (searchParams.get("recommendation") || "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(5, parseInt(searchParams.get("limit") || "20", 10)));
  const offset = (page - 1) * limit;

  // 1. Thống kê tổng quan số lượng báo cáo các tab
  if (type === "stats") {
    let companyTotal = 0;
    let companyStocks = 0;
    let industryTotal = 0;

    try {
      if (fs.existsSync(COMPANY_DB_PATH)) {
        const compDb = new DatabaseSync(COMPANY_DB_PATH, { readOnly: true });
        const cRow = compDb.prepare("SELECT count(*) as total, count(distinct symbol) as stocks FROM company_reports").get() as any;
        compDb.close();
        if (cRow) {
          companyTotal = cRow.total || 0;
          companyStocks = cRow.stocks || 0;
        }
      }
    } catch {}

    try {
      if (fs.existsSync(INDUSTRY_DB_PATH)) {
        const indDb = new DatabaseSync(INDUSTRY_DB_PATH, { readOnly: true });
        const iRow = indDb.prepare("SELECT count(*) as total FROM industry_reports").get() as any;
        indDb.close();
        if (iRow) {
          industryTotal = iRow.total || 0;
        }
      }
    } catch {}

    const macroList = loadJsonFile("macro_reports.json");
    const strategyList = loadJsonFile("strategy_reports.json");
    const bondList = loadJsonFile("bond_reports.json");
    const irList = loadJsonFile("ir_news.json");

    return Response.json({
      success: true,
      stats: {
        company: companyTotal,
        companyStocks,
        industry: industryTotal,
        macro: macroList.length,
        strategy: strategyList.length,
        bond: bondList.length,
        ir: irList.length,
        macroStrategyTotal: macroList.length + strategyList.length,
        bondIrTotal: bondList.length + irList.length,
      },
    });
  }

  // 2. Tab Báo cáo Doanh nghiệp (từ company_reports.db)
  if (type === "company") {
    if (!fs.existsSync(COMPANY_DB_PATH)) {
      return Response.json({ success: true, total: 0, reports: [], page, limit });
    }

    try {
      const db = new DatabaseSync(COMPANY_DB_PATH, { readOnly: true });

      const conditions: string[] = [];
      const params: any[] = [];

      if (symbol) {
        conditions.push("symbol = ?");
        params.push(symbol);
      }
      if (source && source !== "all") {
        conditions.push("source = ?");
        params.push(source);
      }
      if (recommendation && recommendation !== "all") {
        conditions.push("recommendation = ?");
        params.push(recommendation);
      }
      if (search) {
        conditions.push("(symbol LIKE ? OR title LIKE ? OR description LIKE ?)");
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const countSql = `SELECT count(*) as count FROM company_reports ${whereClause}`;
      const totalRow = db.prepare(countSql).get(...params) as any;
      const total = totalRow?.count || 0;

      const dataSql = `
        SELECT id, symbol, title, slug, source, date, display_date as displayDate,
               recommendation, target_price as targetPrice, page_count as pageCount,
               description, download_url as downloadUrl, thumbnail_url as thumbnailUrl
        FROM company_reports
        ${whereClause}
        ORDER BY date DESC, id DESC
        LIMIT ? OFFSET ?
      `;
      const rows = db.prepare(dataSql).all(...params, limit, offset) as any[];

      // Lấy danh sách nguồn CTCK và khuyến nghị có sẵn
      const sourcesRows = db.prepare("SELECT DISTINCT source FROM company_reports WHERE source IS NOT NULL ORDER BY source ASC").all() as any[];
      const recsRows = db.prepare("SELECT DISTINCT recommendation FROM company_reports WHERE recommendation IS NOT NULL ORDER BY recommendation ASC").all() as any[];

      db.close();

      return Response.json({
        success: true,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        reports: rows,
        availableSources: sourcesRows.map((r) => r.source).filter(Boolean),
        availableRecommendations: recsRows.map((r) => r.recommendation).filter(Boolean),
      });
    } catch (err: any) {
      return Response.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  // 3. Tab Báo cáo Vĩ mô & Thị trường (Macro & Strategy)
  if (type === "macro" || type === "strategy" || type === "macro_strategy") {
    const macroList = loadJsonFile("macro_reports.json");
    const strategyList = loadJsonFile("strategy_reports.json");
    let combined = type === "macro" ? macroList : type === "strategy" ? strategyList : [...macroList, ...strategyList];

    // Sắp xếp ngày mới nhất
    combined.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    if (search) {
      combined = combined.filter((r) =>
        `${r.title || ""} ${r.source || ""} ${r.category || ""}`.toLowerCase().includes(search)
      );
    }
    if (source && source !== "all") {
      combined = combined.filter((r) => r.source === source);
    }

    const total = combined.length;
    const paginated = combined.slice(offset, offset + limit);

    const sources = Array.from(new Set(combined.map((r) => r.source).filter(Boolean))).sort();

    return Response.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      reports: paginated,
      availableSources: sources,
    });
  }

  // 4. Tab Trái phiếu & Bản tin IR (Bond & IR News)
  if (type === "bond" || type === "ir" || type === "bond_ir") {
    const bondList = loadJsonFile("bond_reports.json");
    const irList = loadJsonFile("ir_news.json");
    let combined = type === "bond" ? bondList : type === "ir" ? irList : [...bondList, ...irList];

    combined.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    if (search) {
      combined = combined.filter((r) =>
        `${r.title || ""} ${r.source || ""} ${r.category || ""}`.toLowerCase().includes(search)
      );
    }
    if (source && source !== "all") {
      combined = combined.filter((r) => r.source === source);
    }

    const total = combined.length;
    const paginated = combined.slice(offset, offset + limit);

    const sources = Array.from(new Set(combined.map((r) => r.source).filter(Boolean))).sort();

    return Response.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      reports: paginated,
      availableSources: sources,
    });
  }

  return Response.json({ success: false, error: "Loại báo cáo không hợp lệ" }, { status: 400 });
}
