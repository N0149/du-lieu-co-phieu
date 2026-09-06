import fs from 'node:fs'
import path from 'node:path'
import { getStockPriceHistory } from './stock-price-history-service'
import { getValuationHistory } from './valuation-history-service'

export interface ValuationEpsPoint {
  date: string // DD/MM/YYYY
  timestamp: number // seconds
  price: number // Thị giá VNĐ
  eps: number | null // EPS VNĐ
  pe: number | null // P/E hiện tại
  fairPricePe: number | null // Định giá P/E = EPS * Median PE
}

export interface ValuationEpsPayload {
  symbol: string
  currentPrice: number
  currentEps: number | null
  currentPe: number | null
  medianPe: number
  fairValuePe: number | null
  peDiffPercent: number | null
  timeline: ValuationEpsPoint[]
}

function formatDateFromSec(sec: number): string {
  const d = new Date(sec * 1000)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export async function getValuationEpsData(
  symbol: string,
  years: number = 3
): Promise<ValuationEpsPayload | null> {
  const sym = symbol.toUpperCase().trim()
  if (!sym) return null

  // 1. Lấy dữ liệu giá và dữ liệu định giá
  const [priceData, valHistory] = await Promise.all([
    getStockPriceHistory(sym, years),
    getValuationHistory(sym),
  ])

  if (!priceData || priceData.points.length === 0) return null

  const pricePoints = priceData.points
  const currentPrice = pricePoints[pricePoints.length - 1].close

  // Tính median PE từ valuationHistory nếu có
  let medianPe = 12.0
  const peMap: Record<number, number> = {} // dateSec -> pe
  const validPeList: number[] = []

  if (valHistory && valHistory.dates && valHistory.pe) {
    const dates = valHistory.dates
    const peArr = valHistory.pe
    for (let i = 0; i < dates.length; i++) {
      const pe = peArr[i]
      if (pe != null && pe > 0 && pe < 100) {
        peMap[dates[i]] = pe
        validPeList.push(pe)
      }
    }

    if (validPeList.length > 0) {
      const sorted = [...validPeList].sort((a, b) => a - b)
      medianPe = sorted[Math.floor(sorted.length / 2)]
      medianPe = parseFloat(medianPe.toFixed(2))
    }
  }

  const latestEps = Number(valHistory?.lastEps || valHistory?.snapshot?.eps) || (currentPrice > 0 && medianPe > 0 ? Math.round(currentPrice / medianPe) : 2000)

  // 2. Ghép chuỗi timeline
  const timeline: ValuationEpsPoint[] = []

  for (const pt of pricePoints) {
    // Tìm PE gần ngày pt.time nhất
    let pe: number | null = peMap[pt.time] || null
    if (pe == null) {
      // Tìm trong phạm vi 3 ngày
      for (let offset = -2; offset <= 2; offset++) {
        const checkSec = pt.time + offset * 86400
        if (peMap[checkSec]) {
          pe = peMap[checkSec]
          break
        }
      }
    }

    // EPS tại ngày đó: nếu có PE thì EPS = Price / PE, nếu không thì dùng latestEps
    let epsVal: number | null = null
    if (pe != null && pe > 0) {
      epsVal = Math.round(pt.close / pe)
    } else {
      epsVal = latestEps
    }

    const fairPrice = epsVal != null ? Math.round(epsVal * medianPe) : null

    timeline.push({
      date: pt.date,
      timestamp: pt.time,
      price: pt.close,
      eps: epsVal,
      pe: pe != null ? parseFloat(pe.toFixed(2)) : null,
      fairPricePe: fairPrice,
    })
  }

  // 3. Thông số hiện tại
  const latestPt = timeline[timeline.length - 1]
  const currentPe = latestPt?.pe || (latestEps > 0 ? parseFloat((currentPrice / latestEps).toFixed(2)) : null)
  const fairValuePe = latestEps > 0 ? Math.round(latestEps * medianPe) : null
  const peDiffPercent =
    currentPe != null && medianPe > 0
      ? parseFloat((((currentPe - medianPe) / medianPe) * 100).toFixed(1))
      : null

  return {
    symbol: sym,
    currentPrice,
    currentEps: latestEps,
    currentPe,
    medianPe,
    fairValuePe,
    peDiffPercent,
    timeline,
  }
}
