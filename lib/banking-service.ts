import fs from 'node:fs'
import path from 'node:path'
import type {
  BankAnalysisData,
  BankSpiderOverview,
  BankRadarItem,
  BankPeerChartData,
  BankPeerBarItem,
} from './banking-types'

const METRIC_LABELS: Record<string, { label: string; unit: string; higherBetter: boolean }> = {
  roe: { label: 'ROE trượt 4 quý', unit: '%', higherBetter: true },
  casa: { label: 'Tỷ lệ CASA', unit: '%', higherBetter: true },
  nim: { label: 'NIM', unit: '%', higherBetter: true },
  cof: { label: 'Chi phí vốn (COF)', unit: '%', higherBetter: false },
  llr25: { label: 'Dự phòng / Nợ nhóm 2-5', unit: '%', higherBetter: true },
  llr35: { label: 'Dự phòng / Nợ nhóm 3-5 (LLR)', unit: '%', higherBetter: true },
  loanGrowth: { label: 'Tăng trưởng cho vay KH', unit: '%', higherBetter: true },
  leverage: { label: 'Đòn bẩy Tổng TS / VCSH', unit: 'x', higherBetter: false },
  npl25: { label: 'Tỷ lệ nợ nhóm 2-5', unit: '%', higherBetter: false },
  npl35: { label: 'Tỷ lệ nợ xấu (NPL nhóm 3-5)', unit: '%', higherBetter: false },
  accrual: { label: 'Lãi & phí phải thu / Tổng TS', unit: '%', higherBetter: false },
}

export function getBankAnalysisData(symbol: string): BankAnalysisData {
  const sym = symbol.toUpperCase().trim()
  const emptyRes: BankAnalysisData = { isBank: false, symbol: sym }

  const spiderPath = path.join(process.cwd(), 'data', 'industry', 'spider', 'banking_spider.json')
  const benchPath = path.join(process.cwd(), 'data', 'industry', 'banking_benchmark.json')

  if (!fs.existsSync(spiderPath) || !fs.existsSync(benchPath)) {
    return emptyRes
  }

  try {
    const spiderJson = JSON.parse(fs.readFileSync(spiderPath, 'utf-8'))
    const benchJson = JSON.parse(fs.readFileSync(benchPath, 'utf-8'))

    const bankSpider = spiderJson.banks?.[sym]
    if (!bankSpider) {
      return emptyRes
    }

    const totalBanks = spiderJson.metadata?.banks_count || 27
    const industryMedians = spiderJson.industry || {}

    // 1. Chuẩn bị Radar Data cho 11 trục
    const radarData: BankRadarItem[] = []
    const rawMetrics = bankSpider.raw || {}
    const ranks = bankSpider.ranks || {}

    for (const key of Object.keys(METRIC_LABELS)) {
      const meta = METRIC_LABELS[key]
      const rawVal = rawMetrics[key] != null ? Number(rawMetrics[key]) : null
      const rank = ranks[key] != null ? Number(ranks[key]) : 14
      const med = industryMedians[key]?.median != null ? Number(industryMedians[key].median) : null

      // Điểm chuẩn hóa trên thang 0 - 100 để vẽ radar cân đối:
      // rank 27 là top 1 -> ~100 điểm, rank 1 -> ~10 điểm
      const normalizedScore = Math.max(10, Math.min(100, Math.round((rank / totalBanks) * 100)))

      let formattedValue = '—'
      if (rawVal != null && Number.isFinite(rawVal)) {
        formattedValue = `${rawVal.toFixed(1)}${meta.unit}`
      }

      radarData.push({
        key,
        label: meta.label,
        unit: meta.unit,
        rawValue: rawVal,
        formattedValue,
        rank,
        totalBanks,
        industryMedian: med,
        higherBetter: meta.higherBetter,
        normalizedScore,
      })
    }

    const spiderOverview: BankSpiderOverview = {
      symbol: sym,
      name: bankSpider.name || sym,
      overall_points: bankSpider.overall_points || 0,
      overall_place: bankSpider.overall_place || 0,
      max_points: spiderJson.metadata?.overall_points_max || 297,
      period: spiderJson.metadata?.period || 'Q2/2026',
      totalBanks,
      radarData,
    }

    // 2. Chuẩn bị biểu đồ Cơ cấu cho vay theo kỳ hạn
    const kyHanSymbols: string[] = benchJson.nhnxKyHanS || []
    const kyHanNH: any[] = benchJson.nhnxKyHanNH || []
    const kyHanDH: any[] = benchJson.nhnxKyHanDH || []

    const loanTermItems: BankPeerBarItem[] = kyHanSymbols.map((s, idx) => {
      const nhRaw = kyHanNH[idx]
      const nhVal = typeof nhRaw === 'object' && nhRaw !== null ? Number(nhRaw.y) : Number(nhRaw)
      const dhRaw = kyHanDH[idx]
      const dhVal = typeof dhRaw === 'object' && dhRaw !== null ? Number(dhRaw.y) : Number(dhRaw)

      const safeNh = Number.isFinite(nhVal) ? nhVal : 50
      const safeDh = Number.isFinite(dhVal) ? dhVal : 100 - safeNh

      return {
        symbol: s,
        primaryPct: parseFloat(safeNh.toFixed(1)),
        secondaryPct: parseFloat(safeDh.toFixed(1)),
        isCurrent: s.toUpperCase() === sym,
      }
    })

    const loanTermChart: BankPeerChartData = {
      title: 'CƠ CẤU CHO VAY THEO KỲ HẠN',
      primaryLabel: 'Tỷ trọng Cho vay Ngắn hạn (%)',
      secondaryLabel: 'Tỷ trọng Cho vay Trung, Dài hạn (%)',
      items: loanTermItems,
      periodLabel: spiderJson.metadata?.period || 'Q2/2026',
    }

    // 3. Chuẩn bị biểu đồ Cơ cấu cho vay theo nhóm khách hàng
    const nKhachSymbols: string[] = benchJson.nhnxNKhachS || []
    const nKhachCN: any[] = benchJson.nhnxNKhachCN || []
    const nKhachTC: any[] = benchJson.nhnxNKhachTC || []

    const customerGroupItems: BankPeerBarItem[] = nKhachSymbols.map((s, idx) => {
      const cnRaw = nKhachCN[idx]
      const cnVal = typeof cnRaw === 'object' && cnRaw !== null ? Number(cnRaw.y) : Number(cnRaw)
      const tcRaw = nKhachTC[idx]
      const tcVal = typeof tcRaw === 'object' && tcRaw !== null ? Number(tcRaw.y) : Number(tcRaw)

      const safeCn = Number.isFinite(cnVal) ? cnVal : 50
      const safeTc = Number.isFinite(tcVal) ? tcVal : 100 - safeCn

      return {
        symbol: s,
        primaryPct: parseFloat(safeCn.toFixed(1)),
        secondaryPct: parseFloat(safeTc.toFixed(1)),
        isCurrent: s.toUpperCase() === sym,
      }
    })

    const customerGroupChart: BankPeerChartData = {
      title: 'CƠ CẤU CHO VAY THEO NHÓM KHÁCH HÀNG',
      primaryLabel: 'Tỷ lệ cho vay Khách hàng cá nhân (%)',
      secondaryLabel: 'Tỷ lệ cho vay Khách hàng tổ chức (%)',
      items: customerGroupItems,
      periodLabel: spiderJson.metadata?.period || 'Q2/2026',
    }

    return {
      isBank: true,
      symbol: sym,
      spider: spiderOverview,
      loanTermChart,
      customerGroupChart,
    }
  } catch (err) {
    console.error(`[getBankAnalysisData] Lỗi xử lý dữ liệu ngân hàng ${sym}:`, err)
    return emptyRes
  }
}
