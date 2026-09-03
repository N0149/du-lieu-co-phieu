import fs from 'fs'
import path from 'path'
import type {
  MarginSummaryItem,
  CompanyPeriodItem,
  Top10PeriodItem,
  BrokerageRow,
  BrokerItem,
  CtckFullData,
} from './ctck-types'

export * from './ctck-types'

let cachedData: CtckFullData | null = null

function loadLocalData(): CtckFullData {
  if (cachedData) return cachedData

  const dataDir = path.join(process.cwd(), 'data')
  const marginFile = path.join(dataDir, 'ctck_margin_lending.json')
  const brokerFile = path.join(dataDir, 'brokerage_share_hose.json')

  let rawMargin: any = null
  let rawBroker: any = null

  try {
    if (fs.existsSync(marginFile)) {
      rawMargin = JSON.parse(fs.readFileSync(marginFile, 'utf-8'))
    }
  } catch (err) {
    console.error('[CTCK Service] Error reading margin file:', err)
  }

  try {
    if (fs.existsSync(brokerFile)) {
      rawBroker = JSON.parse(fs.readFileSync(brokerFile, 'utf-8'))
    }
  } catch (err) {
    console.error('[CTCK Service] Error reading broker file:', err)
  }

  const rawSummary: any[] = rawMargin?.market_summary || []
  const summaryWithGrowth: MarginSummaryItem[] = rawSummary.map((item, idx) => {
    let qoq = 0
    let yoy = 0
    if (idx > 0) {
      const prev = rawSummary[idx - 1]
      if (prev.margin_debt_bn > 0) {
        qoq = Number((((item.margin_debt_bn - prev.margin_debt_bn) / prev.margin_debt_bn) * 100).toFixed(1))
      }
    }
    if (idx >= 4) {
      const prevYear = rawSummary[idx - 4]
      if (prevYear.margin_debt_bn > 0) {
        yoy = Number((((item.margin_debt_bn - prevYear.margin_debt_bn) / prevYear.margin_debt_bn) * 100).toFixed(1))
      }
    }

    const [year, quarter] = item.period.split('-')
    return {
      ...item,
      label: `${year} ${quarter}`,
      qoq_growth: qoq,
      yoy_growth: yoy,
    }
  })

  // Thẻ tóm tắt kỳ gần nhất
  const latestMarket = summaryWithGrowth[summaryWithGrowth.length - 1] || {
    period: '2026-Q2',
    margin_debt_bn: 319868.8,
    vcsh_bn: 331814.63,
    margin_vcsh_pct: 96.4,
    du_dia_bn: 343760.46,
    ctck_reported: 40,
  }

  const overview = {
    marginDebtBn: latestMarket.margin_debt_bn,
    marginDebtFormatted: Math.round(latestMarket.margin_debt_bn).toLocaleString('vi-VN') + ' tỷ',
    vcshBn: latestMarket.vcsh_bn,
    vcshFormatted: Math.round(latestMarket.vcsh_bn).toLocaleString('vi-VN') + ' tỷ',
    marginVcshPct: Number(latestMarket.margin_vcsh_pct.toFixed(1)),
    duDiaBn: latestMarket.du_dia_bn,
    duDiaFormatted: Math.round(latestMarket.du_dia_bn).toLocaleString('vi-VN') + ' tỷ',
    ctckReported: latestMarket.ctck_reported,
    latestPeriod: latestMarket.period,
  }

  // Brokerage Share
  const brokers: BrokerItem[] = (rawBroker?.broker || []).filter((b: any) => b && b.code)
  const rawRows: any[] = rawBroker?.data || []
  const rows: BrokerageRow[] = rawRows
    .slice()
    .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.quarter - b.quarter))
    .map((item) => {
      const row: BrokerageRow = {
        label: `Q${item.quarter} ${item.year}`,
        year: item.year,
        quarter: item.quarter,
      }
      const dataMap = item.data || {}
      brokers.forEach((b) => {
        const val = dataMap[b.code]
        row[b.code] = val != null && !isNaN(val) ? Number(Number(val).toFixed(2)) : null
      })
      return row
    })

  const latestBrokerRow = rows[rows.length - 1]
  const latestBrokerPeriod = latestBrokerRow ? latestBrokerRow.label : 'Q2 2026'
  const latestShares = brokers
    .map((b) => ({
      code: b.code,
      name: b.name || b.code,
      share: latestBrokerRow ? Number(latestBrokerRow[b.code] || 0) : 0,
    }))
    .filter((b) => b.share > 0)
    .sort((a, b) => b.share - a.share)

  cachedData = {
    overview,
    ctckSymbols: rawMargin?.ctck_symbols || [],
    marketSummary: summaryWithGrowth,
    top10ByPeriod: rawMargin?.top10_by_period || [],
    companies: (rawMargin?.companies || []).map((c: any) => ({
      symbol: c.symbol,
      periods: (c.periods || []).map((p: any, idx: number) => {
        let qoq = 0
        let yoy = 0
        if (idx > 0) {
          const prev = c.periods[idx - 1]
          if (prev.margin_debt > 0) {
            qoq = Number((((p.margin_debt - prev.margin_debt) / prev.margin_debt) * 100).toFixed(1))
          }
        }
        if (idx >= 4) {
          const prevYear = c.periods[idx - 4]
          if (prevYear.margin_debt > 0) {
            yoy = Number((((p.margin_debt - prevYear.margin_debt) / prevYear.margin_debt) * 100).toFixed(1))
          }
        }
        const [year, quarter] = p.period.split('-')
        return {
          ...p,
          label: `${year} ${quarter}`,
          qoq_growth: qoq,
          yoy_growth: yoy,
        }
      }),
    })),
    brokerageShare: {
      brokers,
      rows,
      latestPeriod: latestBrokerPeriod,
      latestShares,
    },
  }

  return cachedData
}

export function getCtckFullData(): CtckFullData {
  return loadLocalData()
}
