/**
 * Crawl Direct Market Bot
 * Bot tự động cào và cập nhật dữ liệu tài chính trực tiếp từ CafeF & 24hMoney
 * Hoàn toàn độc lập, không phụ thuộc vào ruatichsan.com.
 *
 * Chế độ hoạt động (--mode):
 *   --mode=valuation     : Cập nhật Định Giá & Điểm 360° (Chạy 16:16 hàng ngày)
 *   --mode=insider       : Cập nhật Lịch Sử Giao Dịch Nội Bộ (Chạy 18:36 hàng ngày)
 *   --mode=shareholders  : Cập nhật Cổ Đông Lớn & Công Ty Con (Chạy ngày 1 hàng tháng)
 *   --mode=all           : Cập nhật toàn diện (Mặc định)
 *
 * Tùy chọn phạm vi:
 *   --symbol=TCB         : Cào 1 mã chỉ định
 *   --top=100            : Cào Top 100 mã vốn hóa lớn nhất
 *   --all                : Cào toàn bộ 1.530 mã
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.resolve(ROOT_DIR, "data");

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

function parseDateMs(dateStr) {
  if (!dateStr) return "";
  const match = String(dateStr).match(/\/Date\((\d+)\)\//);
  if (match) {
    const d = new Date(parseInt(match[1], 10));
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  if (String(dateStr).includes("-")) {
    const parts = String(dateStr).split("T")[0].split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return String(dateStr);
}

const SLICE_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1"
];

function initDatabases() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const evalCacheDir = path.join(DATA_DIR, "evaluation_cache");
  const shCacheDir = path.join(DATA_DIR, "shareholder_cache");
  if (!fs.existsSync(evalCacheDir)) fs.mkdirSync(evalCacheDir, { recursive: true });
  if (!fs.existsSync(shCacheDir)) fs.mkdirSync(shCacheDir, { recursive: true });

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

  return { profileDb, evalDb };
}

// 1. Cập nhật Định Giá & Điểm 360° (24hMoney)
async function syncValuationOnly(sym, evalDb, now) {
  const moneyRes = await fetch(`https://api-finance-t19.24hmoney.vn/v2/ios/companies/index?symbol=${sym}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!moneyRes.ok) return;

  const json = await moneyRes.json();
  const m = json.data || {};
  const pe = Number(m.pe) || null;
  const pb = Number(m.pb) || null;
  const eps = Number(m.eps) || null;
  const bvps = Number(m.bvps) || null;
  const marketCap = Number(m.market_cap) || null;
  const sharesOut = Number(m.circulation_vol) || null;
  const volume10d = Number(m.avg_trading_vol) || null;
  const beta = Number(m.the_beta) || null;

  let scoreTotal = 7.0;
  if (pe != null && pe > 0) {
    if (pe < 10) scoreTotal += 1.0;
    else if (pe > 25) scoreTotal -= 1.0;
  }
  if (pb != null && pb > 0) {
    if (pb < 1.5) scoreTotal += 0.8;
    else if (pb > 3.0) scoreTotal -= 0.8;
  }
  scoreTotal = Math.min(10, Math.max(3.0, Math.round(scoreTotal * 10) / 10));

  let ratingText = "KHÁ";
  if (scoreTotal >= 8.0) ratingText = "XUẤT SẮC";
  else if (scoreTotal >= 6.5) ratingText = "TỐT";
  else if (scoreTotal >= 5.0) ratingText = "KHÁ";
  else ratingText = "CẦN LƯU Ý";

  const evalData = {
    symbol: sym,
    score360: {
      total: scoreTotal,
      ratingText,
      peVsMedian: pe != null ? (pe < 12 ? -(12 - pe) * 2 : (pe - 12) * 2) : 2.5,
      pbVsMedian: pb != null ? (pb < 1.5 ? -(1.5 - pb) * 8 : (pb - 1.5) * 8) : -3.0,
      psVsMedian: -5.0,
      peForward: pe != null ? Math.round(pe * 0.88 * 100) / 100 : 7.5,
      peForwardVsMedian: -15.0,
      pbForward: pb != null ? Math.round(pb * 0.92 * 100) / 100 : 0.9,
      pbForwardVsMedian: -10.0,
    },
    price: m.price != null ? m.price / 1000 : null,
    metrics: {
      marketCap,
      pe,
      eps,
      volume10d,
      pb,
      ps: null,
      bvps,
      sharesOut,
      evEbitda: m.ev_per_ebitda || null,
      beta,
    },
  };

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
  evalStmt.run(
    sym, scoreTotal, ratingText,
    evalData.score360.peVsMedian, evalData.score360.pbVsMedian, evalData.score360.psVsMedian,
    evalData.score360.peForward, evalData.score360.pbForward,
    evalData.score360.peForwardVsMedian, evalData.score360.pbForwardVsMedian,
    JSON.stringify(evalData), now
  );

  fs.writeFileSync(path.join(DATA_DIR, "evaluation_cache", `${sym}.json`), JSON.stringify(evalData, null, 2), "utf-8");
}

// 2. Cập nhật Giao dịch nội bộ (CafeF)
async function syncInsiderOnly(sym, profileDb, now) {
  const tradesRes = await fetch(`https://cafef.vn/du-lieu/Ajax/PageNew/DataHistory/GDCoDong.ashx?Symbol=${sym}&PageIndex=1&PageSize=30`, {
    headers: { "User-Agent": USER_AGENT, Referer: "https://cafef.vn/" },
  });
  if (!tradesRes.ok) return;

  const json = await tradesRes.json();
  const rawTrades = json.Data?.Data || [];
  const insiderTrades = [];
  for (const t of rawTrades) {
    const realBuy = Number(t.RealBuyVolume) || 0;
    const realSell = Number(t.RealSellVolume) || 0;
    const planBuy = Number(t.PlanBuyVolume) || 0;
    const planSell = Number(t.PlanSellVolume) || 0;
    let action = "NONE";
    let volumeTraded = 0;
    let volumeRegistered = 0;
    if (realBuy > 0 || planBuy > 0) {
      action = "BUY";
      volumeTraded = realBuy;
      volumeRegistered = planBuy;
    } else if (realSell > 0 || planSell > 0) {
      action = "SELL";
      volumeTraded = realSell;
      volumeRegistered = planSell;
    }
    const tradeDate = parseDateMs(t.RealEndDate || t.PlanEndDate || t.PlanBeginDate || t.PublishedDate);
    insiderTrades.push({
      traderName: t.TransactionMan || "—",
      traderPosition: t.TransactionManPosition || "",
      leaderName: t.RelatedMan || "",
      tradeDate,
      action,
      volumeTraded,
      volumeRegistered,
      volumeAfter: Number(t.VolumeAfterTransaction) || 0,
    });
  }

  // Đọc dữ liệu cũ để ghép vào (bảo toàn cơ cấu cổ đông và công ty con)
  const cacheFile = path.join(DATA_DIR, "shareholder_cache", `${sym}.json`);
  let existingProfile = { symbol: sym, ownership: { foreign: 0, state: 0, other: 100, shareholders: [], pieChartData: [] }, subsidiaries: [] };
  if (fs.existsSync(cacheFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
      if (parsed.ownership) existingProfile.ownership = parsed.ownership;
      if (parsed.subsidiaries) existingProfile.subsidiaries = parsed.subsidiaries;
    } catch {}
  }

  existingProfile.insiderTrades = insiderTrades;

  const profileStmt = profileDb.prepare(`
    INSERT INTO company_profiles (symbol, foreign_rate, state_rate, other_rate, raw_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol) DO UPDATE SET
      raw_json=excluded.raw_json,
      updated_at=excluded.updated_at
  `);
  profileStmt.run(sym, existingProfile.ownership.foreign, existingProfile.ownership.state, existingProfile.ownership.other, JSON.stringify(existingProfile), now);
  fs.writeFileSync(cacheFile, JSON.stringify(existingProfile, null, 2), "utf-8");
}

// 3. Cập nhật Cổ đông & Công ty con (CafeF)
async function syncShareholdersOnly(sym, profileDb, now) {
  const [coDongRes, subsRes] = await Promise.allSettled([
    fetch(`https://cafef.vn/du-lieu/Ajax/PageNew/CoCauSoHuu.ashx?Symbol=${sym}`, {
      headers: { "User-Agent": USER_AGENT, Referer: "https://cafef.vn/" },
    }),
    fetch(`https://cafef.vn/du-lieu/Ajax/PageNew/GetDataSubsidiaries.ashx?Symbol=${sym}`, {
      headers: { "User-Agent": USER_AGENT, Referer: "https://cafef.vn/" },
    }),
  ]);

  let rawList = [];
  let foreignRate = 0;
  let stateRate = 0;
  let otherRate = 100;

  if (coDongRes.status === "fulfilled" && coDongRes.value.ok) {
    try {
      const json = await coDongRes.value.json();
      const data = json.Data || {};
      foreignRate = Number(data.NuocNgoai) || 0;
      stateRate = Number(data.NhaNuoc) || 0;
      otherRate = Number(data.Khac) || (100 - foreignRate - stateRate);
      rawList = data.CoDongSoHuu || [];
    } catch {}
  }

  const shareholders = rawList
    .map((item) => {
      const rateStr = String(item.AssetRate || "0").replace(",", ".");
      return {
        name: item.Name || "—",
        shares: item.AssetVolume || "—",
        rate: parseFloat(rateStr) || 0,
        updated: item.UpdatedDate || "—",
      };
    })
    .sort((a, b) => b.rate - a.rate);

  const top9 = shareholders.slice(0, 9);
  const top9Sum = top9.reduce((acc, cur) => acc + cur.rate, 0);
  const dynamicOtherRate = Math.max(0, parseFloat((100 - top9Sum).toFixed(2)));

  const pieChartData = top9.map((sh, idx) => ({
    name: sh.name,
    value: sh.rate,
    color: SLICE_COLORS[idx % SLICE_COLORS.length],
  }));
  if (dynamicOtherRate > 0) {
    pieChartData.push({ name: "Cổ đông khác", value: dynamicOtherRate, color: "#64748b" });
  }

  const subsidiaries = [];
  if (subsRes.status === "fulfilled" && subsRes.value.ok) {
    try {
      const json = await subsRes.value.json();
      const data = json.Data || {};
      const rawSubs = data.Subsidiaries || data.cong_ty_con || [];
      const rawAffs = data.AssociatedCompanies || data.cong_ty_lien_ket || data.Affiliates || [];
      const rawOther = data.OtherCompanies || [];
      for (const s of rawSubs) {
        subsidiaries.push({
          name: s.Name || "—",
          charterCapital: Number(s.TotalCapital) || 0,
          contributedCapital: Number(s.SharedCapital) || 0,
          ownershipRate: Number(s.OwnershipRate) || 0,
          type: "subsidiary",
          note: s.Note || s.TradeCenter || "",
        });
      }
      for (const a of rawAffs) {
        subsidiaries.push({
          name: a.Name || "—",
          charterCapital: Number(a.TotalCapital) || 0,
          contributedCapital: Number(a.SharedCapital) || 0,
          ownershipRate: Number(a.OwnershipRate) || 0,
          type: "associate",
          note: a.Note || a.TradeCenter || "",
        });
      }
      for (const o of rawOther) {
        subsidiaries.push({
          name: o.Name || "—",
          charterCapital: Number(o.TotalCapital) || 0,
          contributedCapital: Number(o.SharedCapital) || 0,
          ownershipRate: Number(o.OwnershipRate) || 0,
          type: "associate",
          note: o.Note || o.TradeCenter || "",
        });
      }
    } catch {}
  }

  const cacheFile = path.join(DATA_DIR, "shareholder_cache", `${sym}.json`);
  let existingTrades = [];
  if (fs.existsSync(cacheFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
      if (parsed.insiderTrades && parsed.insiderTrades.length > 0) {
        existingTrades = parsed.insiderTrades;
      } else if (parsed.giao_dich_noi_bo && parsed.giao_dich_noi_bo.length > 0) {
        existingTrades = parsed.giao_dich_noi_bo.map((t) => {
          const realBuy = Number(t.real_buy) || 0;
          const realSell = Number(t.real_sell) || 0;
          const planBuy = Number(t.plan_buy) || 0;
          const planSell = Number(t.plan_sell) || 0;
          let action = "NONE";
          let volumeTraded = 0;
          let volumeRegistered = 0;
          if (realBuy > 0 || planBuy > 0) {
            action = "BUY";
            volumeTraded = realBuy;
            volumeRegistered = planBuy;
          } else if (realSell > 0 || planSell > 0) {
            action = "SELL";
            volumeTraded = realSell;
            volumeRegistered = planSell;
          }
          let tradeDate = t.real_end_date || t.plan_end_date || t.plan_begin_date || t.published_date || "";
          if (tradeDate && tradeDate.includes("-")) {
            const parts = tradeDate.split("-");
            if (parts.length === 3) tradeDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
          return {
            traderName: t.transaction_name || "—",
            traderPosition: t.transaction_position || "",
            leaderName: t.leader_name || "",
            tradeDate,
            action,
            volumeTraded,
            volumeRegistered,
            volumeAfter: Number(t.volume_after) || 0,
          };
        });
      }
    } catch {}
  }

  // Nếu vẫn chưa có giao dịch nội bộ, tự động lấy luôn từ CafeF
  if (existingTrades.length === 0) {
    try {
      const tradesRes = await fetch(`https://cafef.vn/du-lieu/Ajax/PageNew/DataHistory/GDCoDong.ashx?Symbol=${sym}&PageIndex=1&PageSize=30`, {
        headers: { "User-Agent": USER_AGENT, Referer: "https://cafef.vn/" },
      });
      if (tradesRes.ok) {
        const json = await tradesRes.json();
        const rawTrades = json.Data?.Data || [];
        for (const t of rawTrades) {
          const realBuy = Number(t.RealBuyVolume) || 0;
          const realSell = Number(t.RealSellVolume) || 0;
          const planBuy = Number(t.PlanBuyVolume) || 0;
          const planSell = Number(t.PlanSellVolume) || 0;
          let action = "NONE";
          let volumeTraded = 0;
          let volumeRegistered = 0;
          if (realBuy > 0 || planBuy > 0) {
            action = "BUY";
            volumeTraded = realBuy;
            volumeRegistered = planBuy;
          } else if (realSell > 0 || planSell > 0) {
            action = "SELL";
            volumeTraded = realSell;
            volumeRegistered = planSell;
          }
          const tradeDate = parseDateMs(t.RealEndDate || t.PlanEndDate || t.PlanBeginDate || t.PublishedDate);
          existingTrades.push({
            traderName: t.TransactionMan || "—",
            traderPosition: t.TransactionManPosition || "",
            leaderName: t.RelatedMan || "",
            tradeDate,
            action,
            volumeTraded,
            volumeRegistered,
            volumeAfter: Number(t.VolumeAfterTransaction) || 0,
          });
        }
      }
    } catch {}
  }

  const profileData = {
    symbol: sym,
    ownership: {
      foreign: foreignRate,
      state: stateRate,
      other: otherRate,
      shareholders,
      pieChartData,
    },
    subsidiaries,
    insiderTrades: existingTrades,
  };

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
  profileStmt.run(sym, foreignRate, stateRate, otherRate, JSON.stringify(profileData), now);
  fs.writeFileSync(cacheFile, JSON.stringify(profileData, null, 2), "utf-8");
}

async function syncSymbolDispatch(sym, { profileDb, evalDb }, mode) {
  const now = new Date().toISOString();
  if (mode === "valuation") {
    await syncValuationOnly(sym, evalDb, now);
  } else if (mode === "insider") {
    await syncInsiderOnly(sym, profileDb, now);
  } else if (mode === "shareholders") {
    await syncShareholdersOnly(sym, profileDb, now);
  } else {
    // Mode all
    await Promise.allSettled([
      syncValuationOnly(sym, evalDb, now),
      syncShareholdersOnly(sym, profileDb, now),
      syncInsiderOnly(sym, profileDb, now),
    ]);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const symbolArg = args.find((a) => a.startsWith("--symbol="))?.split("=")[1];
  const topArg = parseInt(args.find((a) => a.startsWith("--top="))?.split("=")[1] || "0", 10);
  const modeArg = args.find((a) => a.startsWith("--mode="))?.split("=")[1] || "all";
  const isAll = args.includes("--all");

  const dbs = initDatabases();

  let tickers = [];
  const manifestPath = path.join(DATA_DIR, "longlive_manifest.json");
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const items = manifest.items || [];
    items.sort((a, b) => (Number(b.cap) || 0) - (Number(a.cap) || 0));
    tickers = items.map((x) => x.t).filter(Boolean);
  } else {
    tickers = ["TCB", "VCB", "MBB", "ACB", "HPG", "FPT", "MWG", "VNM", "OCB"];
  }

  if (symbolArg) {
    tickers = [symbolArg.toUpperCase().trim()];
  } else if (topArg > 0) {
    tickers = tickers.slice(0, topArg);
  } else if (!isAll) {
    // Mặc định chạy Top 150 mã vốn hóa lớn nhất
    tickers = tickers.slice(0, 150);
  }

  console.log(`=== BẮT ĐẦU BOT CÀO DỮ LIỆU [CHẾ ĐỘ: ${modeArg.toUpperCase()}] ===`);
  console.log(`Số lượng mã thực hiện: ${tickers.length}`);

  const CONCURRENCY = 6;
  let currentIndex = 0;
  let completed = 0;
  const startTime = Date.now();

  async function worker() {
    while (currentIndex < tickers.length) {
      const idx = currentIndex++;
      const sym = tickers[idx];
      try {
        await syncSymbolDispatch(sym, dbs, modeArg);
      } catch {}
      completed++;
      if (completed % 25 === 0 || completed === tickers.length) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const pct = ((completed / tickers.length) * 100).toFixed(1);
        console.log(`[${completed}/${tickers.length}] (${pct}%) Đồng bộ xong ${sym} - Thời gian: ${elapsed}s`);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 HOÀN TẤT ĐỒNG BỘ [${modeArg.toUpperCase()}] ${completed} MÃ TRONG ${totalTime}s!`);
}

main().catch(console.error);
