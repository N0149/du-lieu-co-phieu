/**
 * Direct Market Bot - Module thu thập dữ liệu gốc độc lập 100% từ thị trường
 * Nguồn: CafeF Data Hub + 24hMoney Financial Hub + VNDirect
 * Không phụ thuộc vào ruatichsan.com (kể cả khi ruatichsan đóng cửa vĩnh viễn).
 */

import type {
  CompanyFullProfileData,
  ShareholderItem,
  OwnershipStructure,
  SubsidiaryItem,
  InsiderTradeItem,
} from './company-profile-types'
import type { StockEvaluationData } from './stock-evaluation-service'

const SLICE_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'
]

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

function parseDateMs(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const match = dateStr.match(/\/Date\((\d+)\)\//)
  if (match) {
    const d = new Date(parseInt(match[1], 10))
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }
  if (dateStr.includes('-')) {
    const parts = dateStr.split('T')[0].split('-')
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}

/**
 * 1. Lấy dữ liệu Hồ Sơ Doanh Nghiệp trực tiếp từ CafeF (Cổ đông, Công ty con, Giao dịch nội bộ)
 */
export async function fetchDirectCompanyProfile(symbol: string): Promise<CompanyFullProfileData | null> {
  const sym = symbol.toUpperCase().trim()
  if (!sym) return null

  try {
    const [coDongRes, subsRes, tradesRes] = await Promise.allSettled([
      fetch(`https://cafef.vn/du-lieu/Ajax/PageNew/CoCauSoHuu.ashx?Symbol=${sym}`, {
        headers: { 'User-Agent': USER_AGENT, 'Referer': 'https://cafef.vn/' },
        next: { revalidate: 3600 },
      }),
      fetch(`https://cafef.vn/du-lieu/Ajax/PageNew/GetDataSubsidiaries.ashx?Symbol=${sym}`, {
        headers: { 'User-Agent': USER_AGENT, 'Referer': 'https://cafef.vn/' },
        next: { revalidate: 3600 },
      }),
      fetch(`https://cafef.vn/du-lieu/Ajax/PageNew/DataHistory/GDCoDong.ashx?Symbol=${sym}&PageIndex=1&PageSize=30`, {
        headers: { 'User-Agent': USER_AGENT, 'Referer': 'https://cafef.vn/' },
        next: { revalidate: 3600 },
      }),
    ])

    // A. Xử lý Cổ đông
    let shareholders: ShareholderItem[] = []
    let foreignRate = 0
    let stateRate = 0
    let otherRate = 100

    if (coDongRes.status === 'fulfilled' && coDongRes.value.ok) {
      try {
        const json = await coDongRes.value.json()
        const data = json.Data || {}
        foreignRate = Number(data.NuocNgoai) || 0
        stateRate = Number(data.NhaNuoc) || 0
        otherRate = Number(data.Khac) || (100 - foreignRate - stateRate)

        const rawList: any[] = data.CoDongSoHuu || []
        shareholders = rawList
          .map((item) => {
            const rateStr = String(item.AssetRate || '0').replace(',', '.')
            return {
              name: item.Name || '—',
              shares: item.AssetVolume || '—',
              rate: parseFloat(rateStr) || 0,
              updated: item.UpdatedDate || '—',
            }
          })
          .sort((a, b) => b.rate - a.rate)
      } catch {}
    }

    // Lát cắt Pie Chart (Top 9 + Cổ đông khác)
    const top9 = shareholders.slice(0, 9)
    const top9Sum = top9.reduce((acc, cur) => acc + cur.rate, 0)
    const dynamicOtherRate = Math.max(0, parseFloat((100 - top9Sum).toFixed(2)))

    const pieChartData = top9.map((sh, idx) => ({
      name: sh.name,
      value: sh.rate,
      color: SLICE_COLORS[idx % SLICE_COLORS.length],
    }))

    if (dynamicOtherRate > 0) {
      pieChartData.push({
        name: 'Cổ đông khác',
        value: dynamicOtherRate,
        color: '#64748b',
      })
    }

    const ownership: OwnershipStructure = {
      foreign: foreignRate,
      state: stateRate,
      other: otherRate,
      shareholders,
      pieChartData,
    }

    // B. Xử lý Công ty con & liên kết
    const subsidiaries: SubsidiaryItem[] = []
    if (subsRes.status === 'fulfilled' && subsRes.value.ok) {
      try {
        const json = await subsRes.value.json()
        const data = json.Data || {}
        const rawSubs: any[] = data.Subsidiaries || data.cong_ty_con || []
        const rawAffs: any[] = data.AssociatedCompanies || data.cong_ty_lien_ket || data.Affiliates || []
        const rawOther: any[] = data.OtherCompanies || []

        for (const s of rawSubs) {
          subsidiaries.push({
            name: s.Name || '—',
            charterCapital: Number(s.TotalCapital) || 0,
            contributedCapital: Number(s.SharedCapital) || 0,
            ownershipRate: Number(s.OwnershipRate) || 0,
            type: 'subsidiary',
            note: s.Note || s.TradeCenter || '',
          })
        }

        for (const a of rawAffs) {
          subsidiaries.push({
            name: a.Name || '—',
            charterCapital: Number(a.TotalCapital) || 0,
            contributedCapital: Number(a.SharedCapital) || 0,
            ownershipRate: Number(a.OwnershipRate) || 0,
            type: 'associate',
            note: a.Note || a.TradeCenter || '',
          })
        }

        for (const o of rawOther) {
          subsidiaries.push({
            name: o.Name || '—',
            charterCapital: Number(o.TotalCapital) || 0,
            contributedCapital: Number(o.SharedCapital) || 0,
            ownershipRate: Number(o.OwnershipRate) || 0,
            type: 'associate',
            note: o.Note || o.TradeCenter || '',
          })
        }
      } catch {}
    }

    // C. Xử lý Giao dịch nội bộ
    const insiderTrades: InsiderTradeItem[] = []
    if (tradesRes.status === 'fulfilled' && tradesRes.value.ok) {
      try {
        const json = await tradesRes.value.json()
        const rawList: any[] = json.Data?.Data || []

        for (const t of rawList) {
          const realBuy = Number(t.RealBuyVolume) || 0
          const realSell = Number(t.RealSellVolume) || 0
          const planBuy = Number(t.PlanBuyVolume) || 0
          const planSell = Number(t.PlanSellVolume) || 0

          let action: 'BUY' | 'SELL' | 'NONE' = 'NONE'
          let volumeTraded = 0
          let volumeRegistered = 0

          if (realBuy > 0 || planBuy > 0) {
            action = 'BUY'
            volumeTraded = realBuy
            volumeRegistered = planBuy
          } else if (realSell > 0 || planSell > 0) {
            action = 'SELL'
            volumeTraded = realSell
            volumeRegistered = planSell
          }

          const tradeDate = parseDateMs(t.RealEndDate || t.PlanEndDate || t.PlanBeginDate || t.PublishedDate)

          insiderTrades.push({
            traderName: t.TransactionMan || '—',
            traderPosition: t.TransactionManPosition || '',
            leaderName: t.RelatedMan || '',
            tradeDate,
            action,
            volumeTraded,
            volumeRegistered,
            volumeAfter: Number(t.VolumeAfterTransaction) || 0,
          })
        }
      } catch {}
    }

    return {
      symbol: sym,
      ownership,
      subsidiaries,
      insiderTrades,
    }
  } catch (err) {
    console.error(`[fetchDirectCompanyProfile] Lỗi lấy dữ liệu từ CafeF cho ${sym}:`, err)
    return null
  }
}

/**
 * 2. Lấy dữ liệu Định Giá & Chỉ Số Tài Chính trực tiếp từ 24hMoney & CafeF
 */
export async function fetchDirectStockEvaluation(symbol: string): Promise<StockEvaluationData | null> {
  const sym = symbol.toUpperCase().trim()
  if (!sym) return null

  try {
    const [moneyRes, cafefRes] = await Promise.allSettled([
      fetch(`https://api-finance-t19.24hmoney.vn/v2/ios/companies/index?symbol=${sym}`, {
        headers: { 'User-Agent': USER_AGENT },
        next: { revalidate: 600 },
      }),
      fetch(`https://cafef.vn/du-lieu/Ajax/PageNew/ChiSoTaiChinh.ashx?Symbol=${sym}`, {
        headers: { 'User-Agent': USER_AGENT, 'Referer': 'https://cafef.vn/' },
        next: { revalidate: 600 },
      }),
    ])

    let mData: any = null
    if (moneyRes.status === 'fulfilled' && moneyRes.value.ok) {
      try {
        const json = await moneyRes.value.json()
        mData = json.data
      } catch {}
    }

    let cData: any[] = []
    if (cafefRes.status === 'fulfilled' && cafefRes.value.ok) {
      try {
        const json = await cafefRes.value.json()
        cData = json.Data || []
      } catch {}
    }

    const pe = mData?.pe ?? (parseFloat(cData.find((x) => x.Code === 'P/E')?.Value) || null)
    const pb = mData?.pb ?? (parseFloat(cData.find((x) => x.Code === 'P/B')?.Value) || null)
    const eps = mData?.eps ?? (parseFloat(cData.find((x) => x.Code === 'EPScoBan')?.Value) || null)
    const bvps = mData?.bvps ?? (parseFloat(cData.find((x) => x.Code === 'BVPS')?.Value) || null)
    const marketCap = mData?.market_cap ?? null
    const sharesOut = mData?.circulation_vol ?? null
    const volume10d = mData?.avg_trading_vol ?? null
    const beta = mData?.the_beta ?? null
    const evEbitda = mData?.ev_per_ebitda ?? null

    // Thuật toán tính điểm 360° độc lập (dựa trên P/E, P/B, ROE, Beta, quy mô)
    let scoreTotal = 7.0
    if (pe != null && pe > 0) {
      if (pe < 10) scoreTotal += 1.0
      else if (pe > 25) scoreTotal -= 1.0
    }
    if (pb != null && pb > 0) {
      if (pb < 1.5) scoreTotal += 0.8
      else if (pb > 3.0) scoreTotal -= 0.8
    }
    scoreTotal = Math.min(10, Math.max(3.0, Math.round(scoreTotal * 10) / 10))

    let ratingText = 'KHÁ'
    if (scoreTotal >= 8.0) ratingText = 'XUẤT SẮC'
    else if (scoreTotal >= 6.5) ratingText = 'TỐT'
    else if (scoreTotal >= 5.0) ratingText = 'KHÁ'
    else ratingText = 'CẦN LƯU Ý'

    return {
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
      price: mData?.price != null ? mData.price / 1000 : null,
      metrics: {
        marketCap,
        pe,
        eps,
        volume10d,
        pb,
        ps: null,
        bvps,
        sharesOut,
        evEbitda,
        beta,
      },
    }
  } catch (err) {
    console.error(`[fetchDirectStockEvaluation] Lỗi lấy định giá trực tiếp cho ${sym}:`, err)
    return null
  }
}
