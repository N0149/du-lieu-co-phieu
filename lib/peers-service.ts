import { fetchAndCacheFinancialStatements } from "./financial-statements-db";
import { getAllStocks } from "./longlivestock";

export interface PeerMetricItem {
  ticker: string;
  name: string;
  sector: string;
  price: number | null;
  marketCap: number | null; // Tỷ đồng
  pe: number | null;
  pb: number | null;
  lastDate: string;
  periodLabel: string;
  
  // Chỉ số tài chính (Tỷ đồng)
  equity: number | null; // Vốn chủ sở hữu
  assets: number | null; // Tổng tài sản
  inventory: number | null; // Hàng tồn kho
  receivables: number | null; // Khoản phải thu
  liabilities: number | null; // Nợ phải trả
  
  // Chỉ số kinh doanh (Tỷ đồng)
  revenue: number | null; // Doanh thu thuần
  grossProfit: number | null; // Lợi nhuận gộp
  netProfit: number | null; // Lợi nhuận sau thuế của CĐ công ty mẹ
  
  // Tỷ suất (%)
  grossMargin: number | null; // Biên LN gộp (%)
  netMargin: number | null; // Biên LN ròng (%)
  roe: number | null; // ROE (%)
  roa: number | null; // ROA (%)

  // Lịch sử các kỳ gần đây cho biểu đồ xu hướng
  history?: {
    date: string;
    label: string;
    revenue: number | null;
    netProfit: number | null;
    roe: number | null;
    roa: number | null;
    grossMargin: number | null;
    netMargin: number | null;
    equity: number | null;
    inventory: number | null;
    receivables: number | null;
    assets: number | null;
  }[];
}

function formatPeriodLabel(isoDate: string, mode: "quarter" | "annual"): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length < 2) return isoDate;
  const year = parts[0];
  const month = parseInt(parts[1], 10);

  if (mode === "annual") return `${year}`;

  let q = "Q1";
  if (month >= 1 && month <= 3) q = "Q1";
  else if (month >= 4 && month <= 6) q = "Q2";
  else if (month >= 7 && month <= 9) q = "Q3";
  else q = "Q4";

  return `${q}/${year.slice(-2)}`;
}

// Tìm dòng chính xác nhất theo ưu tiên
function findRow(
  rows: Array<[string, number, number, ...Array<number | null>]> | undefined,
  exactOrPriorityNames: string[]
): number[] | null {
  if (!rows || !Array.isArray(rows)) return null;

  // 1. Tìm exact match trước (không phân biệt hoa thường)
  for (const target of exactOrPriorityNames) {
    const row = rows.find((r) => r[0] && r[0].trim().toLowerCase() === target.toLowerCase());
    if (row && row.length > 3) {
      return row.slice(3) as number[];
    }
  }

  // 2. Tìm contains match với level 0 hoặc ưu tiên chuỗi ngắn
  for (const target of exactOrPriorityNames) {
    const matched = rows.filter((r) => r[0] && r[0].toLowerCase().includes(target.toLowerCase()));
    if (matched.length > 0) {
      // Ưu tiên dòng có level 0 nếu có
      const level0 = matched.find((r) => r[1] === 0);
      const chosen = level0 || matched[0];
      if (chosen && chosen.length > 3) {
        return chosen.slice(3) as number[];
      }
    }
  }

  return null;
}

export async function getSingleStockPeerMetrics(
  ticker: string,
  period: "quarter" | "annual" = "quarter"
): Promise<PeerMetricItem | null> {
  const symbol = ticker.toUpperCase().trim();
  const allStocks = getAllStocks();
  const manifestItem = allStocks.find((s) => s.t === symbol);

  try {
    const data = await fetchAndCacheFinancialStatements(symbol, period);
    if (!data || !data.fiscalDates || data.fiscalDates.length === 0) {
      // Nếu chưa có BCTC chi tiết, fallback dữ liệu cơ bản từ manifest
      if (manifestItem) {
        return {
          ticker: symbol,
          name: manifestItem.n,
          sector: manifestItem.s || manifestItem.g || "Khác",
          price: manifestItem.px,
          marketCap: manifestItem.cap,
          pe: manifestItem.pe,
          pb: manifestItem.pb,
          lastDate: "",
          periodLabel: "",
          equity: null,
          assets: null,
          inventory: null,
          receivables: null,
          liabilities: null,
          revenue: null,
          grossProfit: null,
          netProfit: null,
          grossMargin: null,
          netMargin: null,
          roe: manifestItem.roe,
          roa: null,
        };
      }
      return null;
    }

    const dates = data.fiscalDates;
    const cdkt = data.cdkt || [];
    const kqkd = data.kqkd || [];

    const lastIdx = dates.length - 1;
    const lastDate = dates[lastIdx];
    const periodLabel = formatPeriodLabel(lastDate, period);

    // Lấy các chuỗi số liệu
    const equitySeries = findRow(cdkt, ["Vốn chủ sở hữu", "VỐN CHỦ SỞ HỮU", "Vốn và các quỹ"]);
    const assetsSeries = findRow(cdkt, ["TỔNG CỘNG TÀI SẢN", "Tổng cộng tài sản", "Tổng tài sản"]);
    const inventorySeries = findRow(cdkt, ["Hàng tồn kho", "HÀNG TỒN KHO"]);
    const receivablesSeries = findRow(cdkt, [
      "Các khoản phải thu ngắn hạn",
      "Phải thu ngắn hạn",
      "Các khoản phải thu",
    ]);
    const liabilitiesSeries = findRow(cdkt, ["NỢ PHẢI TRẢ", "Nợ phải trả", "Tổng nợ"]);

    const revenueSeries = findRow(kqkd, [
      "Doanh thu thuần về bán hàng và cung cấp dịch vụ",
      "Doanh thu thuần",
      "Tổng thu nhập hoạt động",
      "Thu nhập lãi thuần",
    ]);
    const grossProfitSeries = findRow(kqkd, [
      "Lợi nhuận gộp về bán hàng và cung cấp dịch vụ",
      "Lợi nhuận gộp",
    ]);
    const netProfitSeries = findRow(kqkd, [
      "Lợi nhuận của Cổ đông của Công ty mẹ",
      "Lãi/(lỗ) thuần sau thuế",
      "Lợi nhuận sau thuế thu nhập doanh nghiệp",
      "Lợi nhuận sau thuế",
    ]);

    // Giá trị kỳ gần nhất
    const equityVal = equitySeries ? equitySeries[lastIdx] : null;
    const assetsVal = assetsSeries ? assetsSeries[lastIdx] : null;
    const inventoryVal = inventorySeries ? inventorySeries[lastIdx] : null;
    const receivablesVal = receivablesSeries ? receivablesSeries[lastIdx] : null;
    const liabilitiesVal = liabilitiesSeries ? liabilitiesSeries[lastIdx] : null;

    const revenueVal = revenueSeries ? revenueSeries[lastIdx] : null;
    const grossProfitVal = grossProfitSeries ? grossProfitSeries[lastIdx] : null;
    const netProfitVal = netProfitSeries ? netProfitSeries[lastIdx] : null;

    // TTM profit cho ROE / ROA
    let netProfitTTM = 0;
    if (period === "quarter" && netProfitSeries) {
      const last4 = netProfitSeries.slice(-4);
      netProfitTTM = last4.reduce((sum, v) => sum + (v || 0), 0);
    } else {
      netProfitTTM = netProfitVal || 0;
    }

    const grossMargin =
      revenueVal && grossProfitVal && revenueVal > 0 ? (grossProfitVal / revenueVal) * 100 : null;
    const netMargin =
      revenueVal && netProfitVal && revenueVal > 0 ? (netProfitVal / revenueVal) * 100 : null;
    const roe =
      equityVal && netProfitTTM && equityVal > 0
        ? (netProfitTTM / equityVal) * 100
        : manifestItem?.roe || null;
    const roa =
      assetsVal && netProfitTTM && assetsVal > 0 ? (netProfitTTM / assetsVal) * 100 : null;

    // Xây dựng chuỗi lịch sử lên tới 16 kỳ gần nhất cho biểu đồ xu hướng
    const historyCount = Math.min(16, dates.length);
    const startHIdx = dates.length - historyCount;
    const history: PeerMetricItem["history"] = [];

    for (let i = startHIdx; i < dates.length; i++) {
      const d = dates[i];
      const r = revenueSeries ? revenueSeries[i] : null;
      const np = netProfitSeries ? netProfitSeries[i] : null;
      const gp = grossProfitSeries ? grossProfitSeries[i] : null;
      const eq = equitySeries ? equitySeries[i] : null;
      const inv = inventorySeries ? inventorySeries[i] : null;
      const rec = receivablesSeries ? receivablesSeries[i] : null;
      const ass = assetsSeries ? assetsSeries[i] : null;

      history.push({
        date: d,
        label: formatPeriodLabel(d, period),
        revenue: r != null ? r / 1e9 : null,
        netProfit: np != null ? np / 1e9 : null,
        equity: eq != null ? eq / 1e9 : null,
        inventory: inv != null ? inv / 1e9 : null,
        receivables: rec != null ? rec / 1e9 : null,
        assets: ass != null ? ass / 1e9 : null,
        grossMargin: r && gp && r > 0 ? (gp / r) * 100 : null,
        netMargin: r && np && r > 0 ? (np / r) * 100 : null,
        roe: eq && np && eq > 0 ? ((np * 4) / eq) * 100 : null,
        roa: ass && np && ass > 0 ? ((np * 4) / ass) * 100 : null,
      });
    }

    return {
      ticker: symbol,
      name: manifestItem?.n || symbol,
      sector: manifestItem?.s || manifestItem?.g || "Khác",
      price: manifestItem?.px || null,
      marketCap: manifestItem?.cap || null,
      pe: manifestItem?.pe || null,
      pb: manifestItem?.pb || null,
      lastDate,
      periodLabel,
      equity: equityVal != null ? equityVal / 1e9 : null,
      assets: assetsVal != null ? assetsVal / 1e9 : null,
      inventory: inventoryVal != null ? inventoryVal / 1e9 : null,
      receivables: receivablesVal != null ? receivablesVal / 1e9 : null,
      liabilities: liabilitiesVal != null ? liabilitiesVal / 1e9 : null,
      revenue: revenueVal != null ? revenueVal / 1e9 : null,
      grossProfit: grossProfitVal != null ? grossProfitVal / 1e9 : null,
      netProfit: netProfitVal != null ? netProfitVal / 1e9 : null,
      grossMargin,
      netMargin,
      roe,
      roa,
      history,
    };
  } catch (err) {
    console.error(`[getSingleStockPeerMetrics] Error for ${symbol}:`, err);
    return null;
  }
}

export async function getPeersComparisonData(
  symbols: string[],
  period: "quarter" | "annual" = "quarter"
): Promise<PeerMetricItem[]> {
  const uniqueSymbols = Array.from(new Set(symbols.map((s) => s.toUpperCase().trim())));
  const results = await Promise.all(
    uniqueSymbols.map((sym) => getSingleStockPeerMetrics(sym, period))
  );
  return results.filter((r): r is PeerMetricItem => r !== null);
}
