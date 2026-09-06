import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { getStockPriceHistory, type DailyPricePoint } from './stock-price-history-service'

export interface BrokerReportTarget {
  id: string
  date: string // YYYY-MM-DD
  source: string // CTCK (SSI, HSC, Vietcap...)
  recommendation: string | null
  targetPrice: number // VNĐ
  title: string
}

export interface TargetPriceTimelinePoint {
  date: string // DD/MM/YYYY
  timestamp: number // seconds
  marketPrice: number // VNĐ
  targetPrice: number | null // VNĐ
  upsidePercent: number | null // %
  reportsOnDate?: BrokerReportTarget[]
}

export interface ConsensusTargetPayload {
  symbol: string
  currentPrice: number
  consensusTargetPrice: number | null
  upsidePercent: number | null
  highestTarget: number | null
  lowestTarget: number | null
  totalReportsCount: number
  activeBrokersCount: number
  recommendationSummary: {
    buy: number
    hold: number
    sell: number
  }
  latestReports: BrokerReportTarget[]
  timeline: TargetPriceTimelinePoint[]
}

const DB_PATH = path.join(process.cwd(), 'data', 'company_reports.db')

function parseDateToTimestamp(dateStr: string): number {
  if (!dateStr) return 0
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime() / 1000
  }
  return 0
}

export async function getConsensusTargetPriceData(
  symbol: string,
  years: number = 2
): Promise<ConsensusTargetPayload | null> {
  const sym = symbol.toUpperCase().trim()
  if (!sym) return null

  // 1. Nạp lịch sử giá
  const priceData = await getStockPriceHistory(sym, years)
  if (!priceData || priceData.points.length === 0) return null

  const pricePoints = priceData.points
  const currentPrice = pricePoints[pricePoints.length - 1].close

  // 2. Lấy các báo cáo phân tích có giá mục tiêu từ SQLite
  let reports: BrokerReportTarget[] = []
  if (fs.existsSync(DB_PATH)) {
    try {
      const db = new DatabaseSync(DB_PATH)
      const stmt = db.prepare(`
        SELECT id, date, source, recommendation, target_price, title
        FROM company_reports
        WHERE symbol = ? AND target_price IS NOT NULL AND target_price > 0
        ORDER BY date ASC
      `)
      const rows = stmt.all(sym) as any[]
      reports = rows.map((r) => ({
        id: String(r.id),
        date: String(r.date || ''),
        source: String(r.source || 'CTCK'),
        recommendation: r.recommendation ? String(r.recommendation) : null,
        targetPrice: Math.round(Number(r.target_price) < 1000 ? Number(r.target_price) * 1000 : Number(r.target_price)),
        title: String(r.title || ''),
      }))
    } catch (e) {
      console.warn(`[ConsensusTargetPrice] Lỗi đọc company_reports.db:`, e)
    }
  }

  // 3. Map báo cáo vào chuỗi thời gian của đường giá
  const reportsByDate: Record<string, BrokerReportTarget[]> = {}
  for (const rep of reports) {
    if (!rep.date) continue
    // rep.date is YYYY-MM-DD -> convert to DD/MM/YYYY
    const parts = rep.date.split('-')
    const key = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : rep.date
    if (!reportsByDate[key]) reportsByDate[key] = []
    reportsByDate[key].push(rep)
  }

  // Chu kỳ hiệu lực của báo cáo: 180 ngày (6 tháng)
  const WINDOW_SEC = 180 * 86400

  const timeline: TargetPriceTimelinePoint[] = []
  let lastKnownTarget: number | null = null

  // Sắp xếp báo cáo theo timestamp
  const reportsWithTs = reports.map((r) => ({
    ...r,
    ts: parseDateToTimestamp(r.date),
  }))

  for (const pt of pricePoints) {
    const ptSec = pt.time
    // Lọc các báo cáo còn hiệu lực tính đến ngày ptSec
    const activeInWindow = reportsWithTs.filter(
      (r) => r.ts <= ptSec && ptSec - r.ts <= WINDOW_SEC
    )

    let consensusTarget: number | null = null
    if (activeInWindow.length > 0) {
      // Nhóm theo CTCK gần nhất (mỗi CTCK chỉ lấy báo cáo mới nhất của họ trong cửa sổ)
      const latestBySource: Record<string, BrokerReportTarget> = {}
      for (const r of activeInWindow) {
        if (!latestBySource[r.source] || parseDateToTimestamp(latestBySource[r.source].date) < parseDateToTimestamp(r.date)) {
          latestBySource[r.source] = r
        }
      }
      const uniqueSourceReports = Object.values(latestBySource)
      const sum = uniqueSourceReports.reduce((acc, cur) => acc + cur.targetPrice, 0)
      consensusTarget = Math.round(sum / uniqueSourceReports.length)
      lastKnownTarget = consensusTarget
    } else if (lastKnownTarget != null) {
      // Giữ giá trị mục tiêu gần nhất nếu tạm thời chưa có báo cáo mới
      consensusTarget = lastKnownTarget
    }

    const upside =
      consensusTarget != null && pt.close > 0
        ? parseFloat((((consensusTarget - pt.close) / pt.close) * 100).toFixed(1))
        : null

    timeline.push({
      date: pt.date,
      timestamp: pt.time,
      marketPrice: pt.close,
      targetPrice: consensusTarget,
      upsidePercent: upside,
      reportsOnDate: reportsByDate[pt.date],
    })
  }

  // 4. Thống kê tóm tắt hiện tại
  const latestPoint = timeline[timeline.length - 1]
  const currentConsensus = latestPoint?.targetPrice || null
  const currentUpside =
    currentConsensus != null && currentPrice > 0
      ? parseFloat((((currentConsensus - currentPrice) / currentPrice) * 100).toFixed(1))
      : null

  // Lọc các báo cáo trong 1 năm gần nhất để thống kê
  const oneYearAgoSec = Math.floor(Date.now() / 1000) - 365 * 86400
  const recentReports = reportsWithTs.filter((r) => r.ts >= oneYearAgoSec)
  const targets = recentReports.map((r) => r.targetPrice).filter((t) => t > 0)
  const highestTarget = targets.length > 0 ? Math.max(...targets) : null
  const lowestTarget = targets.length > 0 ? Math.min(...targets) : null

  // Đếm khuyến nghị
  let buyCount = 0
  let holdCount = 0
  let sellCount = 0
  const uniqueBrokers = new Set<string>()

  for (const r of recentReports) {
    uniqueBrokers.add(r.source)
    const rec = (r.recommendation || '').toUpperCase()
    if (rec.includes('MUA') || rec.includes('BUY') || rec.includes('KHẢ QUAN') || rec.includes('TĂNG TỶ TRỌNG')) {
      buyCount++
    } else if (rec.includes('BÁN') || rec.includes('SELL') || rec.includes('GIẢM TỶ TRỌNG')) {
      sellCount++
    } else {
      holdCount++
    }
  }

  return {
    symbol: sym,
    currentPrice,
    consensusTargetPrice: currentConsensus,
    upsidePercent: currentUpside,
    highestTarget,
    lowestTarget,
    totalReportsCount: reports.length,
    activeBrokersCount: uniqueBrokers.size,
    recommendationSummary: {
      buy: buyCount,
      hold: holdCount,
      sell: sellCount,
    },
    latestReports: reports.slice(-8).reverse(),
    timeline,
  }
}
