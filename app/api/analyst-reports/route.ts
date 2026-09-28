import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

export const dynamic = "force-dynamic";

const DATA_DIR = path.resolve(process.cwd(), "data");
const COMPANY_DB_PATH = path.join(DATA_DIR, "company_reports.db");
const INDUSTRY_DB_PATH = path.join(DATA_DIR, "industry_reports.db");
const COMPANY_SNAPSHOT_PATH = path.join(DATA_DIR, "company_reports_snapshot.json");
const INDUSTRY_SNAPSHOT_PATH = path.join(DATA_DIR, "industry_reports_snapshot.json");
const WIDATA_REPORTS_DIR = path.join(DATA_DIR, "widata_archive", "reports");

let cachedCompanySnapshot: any[] | null = null;
function getCompanySnapshot(): any[] {
  if (cachedCompanySnapshot) return cachedCompanySnapshot;
  if (fs.existsSync(COMPANY_SNAPSHOT_PATH)) {
    try {
      cachedCompanySnapshot = JSON.parse(fs.readFileSync(COMPANY_SNAPSHOT_PATH, "utf8")) || [];
      return cachedCompanySnapshot || [];
    } catch {}
  }
  return [];
}

let cachedIndustrySnapshot: any[] | null = null;
function getIndustrySnapshot(): any[] {
  if (cachedIndustrySnapshot) return cachedIndustrySnapshot;
  if (fs.existsSync(INDUSTRY_SNAPSHOT_PATH)) {
    try {
      cachedIndustrySnapshot = JSON.parse(fs.readFileSync(INDUSTRY_SNAPSHOT_PATH, "utf8")) || [];
      return cachedIndustrySnapshot || [];
    } catch {}
  }
  return [];
}

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

    // Snapshot counts
    const compSnap = getCompanySnapshot();
    if (compSnap.length > 0) {
      companyTotal = compSnap.length;
      companyStocks = new Set(compSnap.map((r) => r.symbol)).size;
    }
    const indSnap = getIndustrySnapshot();
    if (indSnap.length > 0) {
      industryTotal = indSnap.length;
    }

    try {
      if (fs.existsSync(COMPANY_DB_PATH)) {
        const compDb = new DatabaseSync(COMPANY_DB_PATH, { readOnly: true });
        const cRow = compDb.prepare("SELECT count(*) as total, count(distinct symbol) as stocks FROM company_reports").get() as any;
        compDb.close();
        if (cRow && cRow.total) {
          companyTotal = cRow.total;
          companyStocks = cRow.stocks;
        }
      }
    } catch {}

    try {
      if (fs.existsSync(INDUSTRY_DB_PATH)) {
        const indDb = new DatabaseSync(INDUSTRY_DB_PATH, { readOnly: true });
        const iRow = indDb.prepare("SELECT count(*) as total FROM industry_reports").get() as any;
        indDb.close();
        if (iRow && iRow.total) {
          industryTotal = iRow.total;
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

  // 2. Tab Báo cáo Doanh nghiệp (từ company_reports.db hoặc company_reports_snapshot.json)
  if (type === "company") {
    let rows: any[] = [];
    let total = 0;
    let availableSources: string[] = [];
    let availableRecommendations: string[] = [];

    const targetTicker = symbol || (search && search.length <= 4 && !search.includes(" ") ? search.toUpperCase() : "");

    let queriedFromDb = false;
    if (fs.existsSync(COMPANY_DB_PATH)) {
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
        total = totalRow?.count || 0;

        const dataSql = `
          SELECT id, symbol, title, slug, source, date, display_date as displayDate,
                 recommendation, target_price as targetPrice, page_count as pageCount,
                 description, download_url as downloadUrl, thumbnail_url as thumbnailUrl
          FROM company_reports
          ${whereClause}
          ORDER BY date DESC, id DESC
          LIMIT ? OFFSET ?
        `;
        rows = db.prepare(dataSql).all(...params, limit, offset) as any[];

        const sourcesRows = db.prepare("SELECT DISTINCT source FROM company_reports WHERE source IS NOT NULL ORDER BY source ASC").all() as any[];
        const recsRows = db.prepare("SELECT DISTINCT recommendation FROM company_reports WHERE recommendation IS NOT NULL ORDER BY recommendation ASC").all() as any[];
        availableSources = sourcesRows.map((r) => r.source).filter(Boolean);
        availableRecommendations = recsRows.map((r) => r.recommendation).filter(Boolean);

        db.close();
        queriedFromDb = true;
      } catch (err) {
        console.warn("[AnalystReports] SQLite error, falling back to JSON snapshot:", err);
      }
    }

    // Nếu không có SQLite (như trên Vercel Serverless) hoặc SQLite lỗi: Dùng snapshot JSON
    if (!queriedFromDb) {
      let pool = getCompanySnapshot();
      if (symbol) {
        pool = pool.filter((r) => (r.symbol || "").toUpperCase() === symbol);
      }
      if (source && source !== "all") {
        pool = pool.filter((r) => r.source === source);
      }
      if (recommendation && recommendation !== "all") {
        pool = pool.filter((r) => (r.recommendation || "").toUpperCase() === recommendation.toUpperCase());
      }
      if (search) {
        pool = pool.filter((r) =>
          `${r.symbol || ""} ${r.title || ""} ${r.description || ""}`.toLowerCase().includes(search)
        );
      }

      total = pool.length;
      rows = pool.slice(offset, offset + limit);

      const allItems = getCompanySnapshot();
      availableSources = Array.from(new Set(allItems.map((r) => r.source).filter((s): s is string => Boolean(s)))).sort();
      availableRecommendations = Array.from(new Set(allItems.map((r) => r.recommendation).filter((rec): rec is string => Boolean(rec)))).sort();
    }

    // 3. Fallback Online tức thì: Nếu tra cứu theo mã cổ phiếu cụ thể mà kết quả vẫn bằng 0,
    // tự động gọi trực tiếp Ruatichsan API để lấy báo cáo mới nhất và lưu cache!
    if (total === 0 && targetTicker) {
      try {
        const { fetchAndCacheCompanyReports } = await import("@/lib/company-reports-service");
        const liveReports = await fetchAndCacheCompanyReports(targetTicker);
        if (liveReports && liveReports.length > 0) {
          let filteredLive = liveReports;
          if (source && source !== "all") {
            filteredLive = filteredLive.filter((r) => r.source === source);
          }
          if (recommendation && recommendation !== "all") {
            filteredLive = filteredLive.filter((r) => (r.recommendation || "").toUpperCase() === recommendation.toUpperCase());
          }
          total = filteredLive.length;
          rows = filteredLive.slice(offset, offset + limit);
          availableSources = Array.from(new Set(liveReports.map((r) => r.source).filter((s): s is string => Boolean(s)))).sort();
          availableRecommendations = Array.from(new Set(liveReports.map((r) => r.recommendation).filter((rec): rec is string => Boolean(rec)))).sort();
        }
      } catch (err) {
        console.warn(`[AnalystReports] Live fallback failed for ${targetTicker}:`, err);
      }
    }

    return Response.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      reports: rows,
      availableSources,
      availableRecommendations,
    });
  }

  // 3. Tab Báo cáo Ngành (Industry Reports)
  if (type === "industry") {
    let pool = getIndustrySnapshot();

    // Thử truy vấn từ SQLite nếu file DB tồn tại
    if (fs.existsSync(INDUSTRY_DB_PATH)) {
      try {
        const indDb = new DatabaseSync(INDUSTRY_DB_PATH, { readOnly: true });
        const conditions: string[] = [];
        const params: any[] = [];

        if (source && source !== "all") {
          conditions.push("source = ?");
          params.push(source);
        }
        if (search) {
          conditions.push("(title LIKE ? OR description LIKE ? OR sector_name LIKE ?)");
          params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const countSql = `SELECT count(*) as count FROM industry_reports ${whereClause}`;
        const totalRow = indDb.prepare(countSql).get(...params) as any;
        const total = totalRow?.count || 0;

        const dataSql = `
          SELECT id, title, slug, source, date, display_date as displayDate,
                 page_count as pageCount, description, download_url as downloadUrl,
                 thumbnail_url as thumbnailUrl, sector_name as sectorName
          FROM industry_reports
          ${whereClause}
          ORDER BY date DESC, id DESC
          LIMIT ? OFFSET ?
        `;
        const rows = indDb.prepare(dataSql).all(...params, limit, offset) as any[];
        const sourcesRows = indDb.prepare("SELECT DISTINCT source FROM industry_reports WHERE source IS NOT NULL ORDER BY source ASC").all() as any[];
        indDb.close();

        return Response.json({
          success: true,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
          reports: rows,
          availableSources: sourcesRows.map((r) => r.source).filter(Boolean),
        });
      } catch {}
    }

    // Fallback JSON snapshot
    if (search) {
      pool = pool.filter((r) =>
        `${r.title || ""} ${r.source || ""} ${r.sectorName || ""} ${r.description || ""}`.toLowerCase().includes(search)
      );
    }
    if (source && source !== "all") {
      pool = pool.filter((r) => r.source === source);
    }

    const total = pool.length;
    const paginated = pool.slice(offset, offset + limit);
    const sources = Array.from(new Set(getIndustrySnapshot().map((r) => r.source).filter(Boolean))).sort();

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

  // 4. Tab Báo cáo Vĩ mô & Thị trường (Macro & Strategy)
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
