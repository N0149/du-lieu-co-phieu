import { stocks } from '@/lib/data'
import type { Report } from '@/lib/use-reports'
import reportsSnapshot from '@/data/reports-snapshot.json'
import { getStockByTicker } from '@/lib/longlivestock'

export function getSnapshotReports(): Report[] {
  return reportsSnapshot as unknown as Report[]
}

export function getReportsForTicker(ticker: string): Report[] {
  const tNorm = ticker.toUpperCase().trim()
  const all = getSnapshotReports()
  return all.filter((r) => (r.ticker || '').toUpperCase().trim() === tNorm)
}

/**
 * Dòng dữ liệu hiển thị trên bảng: là các mã cổ phiếu ĐÃ CÓ bài viết trong kho
 * báo cáo. Nếu mã tồn tại trong dữ liệu tài chính (lib/data.ts hoặc longlive manifest)
 * thì bổ sung đầy đủ số liệu; ngược lại hiển thị dạng fallback an toàn.
 */
export type ReportStock = {
  ticker: string
  name: string
  exchange: string
  sector: string
  marketPrice: number | null
  rnav: number | null
  forwardPE: number | null
  dividendYield: number | null
  marketCap: number | null
  status: string
  updated: boolean
  hasReport: boolean
  hasData: boolean
  // Ngày báo cáo (DD/MM/YYYY từ createdTime Google Drive, GMT+7) — null nếu chưa có
  reportDate: string | null
  // Định giá bóc tách từ báo cáo (mẫu chuẩn UIC) — fallback an toàn khi null
  currentPrice: number | null // giá hiện tại, nghìn đồng/cổ phiếu
  targetPrice: number | null // giá mục tiêu, nghìn đồng/cổ phiếu
  recommendation: string | null // MUA | KHẢ QUAN | NẮM GIỮ | THEO DÕI
  bonusWelfareRate?: number | null // % tỷ lệ trích quỹ khen thưởng phúc lợi (KTPL) — từ báo cáo
}

const stockByTicker = new Map(stocks.map((s) => [s.ticker.toUpperCase(), s]))

/** Danh sách mã CK duy nhất có trong kho báo cáo (giữ thứ tự xuất hiện) */
export function reportTickers(reports: Report[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const r of reports) {
    const t = (r.ticker ?? '').toUpperCase().trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

/** Ghép danh sách mã báo cáo với dữ liệu tài chính (nếu có) thành dòng hiển thị */
export function buildReportStocks(reports: Report[]): ReportStock[] {
  // Bản đồ mã → thông tin định giá bóc tách từ báo cáo (ưu tiên báo cáo mới nhất)
  const valuationByTicker = new Map<string, Report>()
  for (const r of reports) {
    const t = (r.ticker ?? '').toUpperCase().trim()
    if (!t) continue
    if (!valuationByTicker.has(t)) valuationByTicker.set(t, r)
  }

  return reportTickers(reports).map((ticker) => {
    const val = valuationByTicker.get(ticker)
    const reportDate = val?.reportDate ?? val?.date ?? null
    const currentPrice = val?.currentPrice ?? null
    const targetPrice = val?.targetPrice ?? null
    const recommendation = val?.recommendation ?? null
    const bonusWelfareRate = val?.bonusWelfareRate ?? null

    const s = stockByTicker.get(ticker)
    const m = getStockByTicker(ticker)

    if (!s) {
      return {
        ticker,
        name: m?.n || ticker,
        exchange: m?.e || '—',
        sector: m?.s || 'Chưa phân loại',
        marketPrice: m?.px ?? null,
        rnav: null,
        forwardPE: m?.pe ?? null,
        dividendYield: m?.dy ?? null,
        marketCap: m?.cap ?? null,
        status: 'Có báo cáo phân tích',
        updated: false,
        hasReport: true,
        hasData: Boolean(m),
        reportDate,
        currentPrice,
        targetPrice,
        recommendation,
        bonusWelfareRate,
      }
    }
    return {
      ticker: s.ticker,
      name: s.name,
      exchange: s.exchange,
      sector: s.sector,
      marketPrice: s.marketPrice,
      rnav: s.rnav,
      forwardPE: s.forwardPE,
      dividendYield: s.dividendYield,
      marketCap: s.marketCap,
      status: s.status,
      updated: s.updated,
      hasReport: true,
      hasData: true,
      reportDate,
      currentPrice,
      targetPrice,
      recommendation,
      bonusWelfareRate,
    }
  })
}

/** Giá thị trường hiển thị — ưu tiên giá bóc tách từ báo cáo, fallback dữ liệu tài chính */
export function marketPriceOf(rs: ReportStock): number | null {
  return rs.currentPrice ?? rs.marketPrice
}

/**
 * Upside (%) — tính theo mẫu chuẩn UIC: ((targetPrice - currentPrice) / currentPrice) * 100.
 * Ưu tiên targetPrice & currentPrice bóc tách từ báo cáo; nếu thiếu, dùng targetPrice &
 * marketPrice; fallback cuối tính theo RNAV. Trả null nếu thiếu dữ liệu.
 */
export function upsideOf(rs: ReportStock): number | null {
  const price = marketPriceOf(rs)
  const target = rs.targetPrice ?? rs.rnav
  if (price != null && price !== 0 && target != null && target !== 0) {
    return ((target - price) / price) * 100
  }
  return null
}

/** Giá / RNAV — trả null nếu thiếu dữ liệu tài chính */
export function priceToRnavOf(rs: ReportStock): number | null {
  const price = marketPriceOf(rs)
  if (price == null || rs.rnav == null || rs.rnav === 0) return null
  return price / rs.rnav
}
