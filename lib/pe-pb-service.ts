import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export interface ValuationDataPoint {
  date: string // DD-MM-YYYY
  ymd: string // YYYY-MM-DD
  pe: number
  pb: number
}

export interface StatsBand {
  mean: number
  median: number
  std: number
  std1Pos: number
  std2Pos: number
  std1Neg: number
  std2Neg: number
  diffMedianPercent: string | null
  diffMeanPercent: string | null
}

export interface ValuationFilterResult {
  points: ValuationDataPoint[]
  peStats: StatsBand | null
  pbStats: StatsBand | null
  current: ValuationDataPoint | null
  peTitleSummary: string
  pbTitleSummary: string
  latestDate: string
  earliestDate: string
}

const AES_KEY_HALF1 = '19dd3af428f4cf7d68864cd4c87d8d1c'
const AES_KEY_HALF2 = '5b489932e84b93ac6528a0dd403a5725'

interface RawPePbData {
  tradingDates: string[]
  PER: number[]
  PBR: number[]
}

let cachedData: RawPePbData | null = null

export async function getPePbRawData(): Promise<RawPePbData> {
  if (cachedData && cachedData.tradingDates?.length > 0) {
    return cachedData
  }

  // 1. Kiểm tra file local data/pe_pb_vnindex.json
  const localFile = path.join(process.cwd(), 'data', 'pe_pb_vnindex.json')
  try {
    if (fs.existsSync(localFile)) {
      const content = fs.readFileSync(localFile, 'utf-8')
      const parsed = JSON.parse(content)
      if (parsed.tradingDates && parsed.PER && parsed.PBR) {
        cachedData = parsed
        return parsed
      }
    }
  } catch (err) {
    console.warn('[PePbService] Read local file error:', err)
  }

  // 2. Fetch từ API ruatichsan và giải mã AES-256-GCM
  try {
    const res = await fetch('https://api.ruatichsan.com/api/v1/data/public/pe-pb', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        Accept: '*/*',
      },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      throw new Error(`Fetch pe-pb API failed: HTTP ${res.status}`)
    }

    const arrayBuffer = await res.arrayBuffer()
    const rawBuf = Buffer.from(arrayBuffer)

    const keyBytes = Buffer.from(AES_KEY_HALF1 + AES_KEY_HALF2, 'hex')
    const iv = rawBuf.subarray(0, 12)
    const ciphertextAndTag = rawBuf.subarray(12)
    const tag = ciphertextAndTag.subarray(ciphertextAndTag.length - 16)
    const ciphertext = ciphertextAndTag.subarray(0, ciphertextAndTag.length - 16)

    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBytes, iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])

    const parsed: RawPePbData = JSON.parse(decrypted.toString('utf-8'))

    // Ghi cache vào local file
    try {
      fs.writeFileSync(localFile, JSON.stringify(parsed), 'utf-8')
    } catch {}

    cachedData = parsed
    return parsed
  } catch (error: any) {
    console.error('[PePbService] Fetch & Decrypt error:', error)
    throw error
  }
}

export function computeStats(values: number[], currentVal?: number): StatsBand | null {
  const r = values.length
  if (!r) return null

  const mean = values.reduce((s, d) => s + d, 0) / r
  const sorted = [...values].sort((s, d) => s - d)
  const median = r % 2 === 0 ? (sorted[r / 2 - 1] + sorted[r / 2]) / 2 : sorted[Math.floor(r / 2)]
  const variance = values.reduce((s, d) => s + (d - mean) ** 2, 0) / r
  const std = Math.sqrt(variance)

  let diffMedianPercent: string | null = null
  let diffMeanPercent: string | null = null

  if (currentVal != null) {
    if (median > 0) {
      const diffMed = ((currentVal - median) / median) * 100
      diffMedianPercent = diffMed.toFixed(1)
    }
    if (mean > 0) {
      const diffMn = ((currentVal - mean) / mean) * 100
      diffMeanPercent = diffMn.toFixed(1)
    }
  }

  return {
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    std: Number(std.toFixed(2)),
    std1Pos: Number((median + std).toFixed(2)),
    std2Pos: Number((median + 2 * std).toFixed(2)),
    std1Neg: Number((median - std).toFixed(2)),
    std2Neg: Number((median - 2 * std).toFixed(2)),
    diffMedianPercent,
    diffMeanPercent,
  }
}

function formatSummary(type: 'PE' | 'PB', currentVal: number, stats: StatsBand | null): string {
  if (!stats) return ''
  const parts: string[] = []

  if (stats.diffMedianPercent != null) {
    const num = Number(stats.diffMedianPercent)
    parts.push(num < 0 ? `THẤP HƠN TRUNG VỊ ${Math.abs(num)}%` : `CAO HƠN TRUNG VỊ ${num}%`)
  }

  if (stats.diffMeanPercent != null) {
    const num = Number(stats.diffMeanPercent)
    parts.push(num < 0 ? `THẤP HƠN TRUNG BÌNH ${Math.abs(num)}%` : `CAO HƠN TRUNG BÌNH ${num}%`)
  }

  const label = type === 'PE' ? 'PE CỦA VN-INDEX' : 'PB CỦA VN-INDEX'
  return `${label} ${currentVal.toFixed(2)} LẦN, ${parts.join(', ')}`
}

function subtractMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const totalMonths = y * 12 + (m - 1) - months
  const newYear = Math.floor(totalMonths / 12)
  const newMonth = (totalMonths % 12) + 1
  const maxDay = new Date(newYear, newMonth, 0).getDate()
  const newDay = Math.min(d, maxDay)
  return `${newYear}-${String(newMonth).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`
}

export function filterValuationData(
  rawData: RawPePbData,
  period = '10y',
  customFrom?: string,
  customTo?: string
): ValuationFilterResult {
  const dates = rawData.tradingDates || []
  const perList = rawData.PER || []
  const pbrList = rawData.PBR || []

  const total = dates.length
  if (total === 0) {
    return {
      points: [],
      peStats: null,
      pbStats: null,
      current: null,
      peTitleSummary: '',
      pbTitleSummary: '',
      latestDate: '',
      earliestDate: '',
    }
  }

  const latestYmd = dates[total - 1]
  const earliestYmd = dates[0]

  let startYmd = earliestYmd
  let endYmd = latestYmd

  if (customFrom && customTo) {
    startYmd = customFrom
    endYmd = customTo
  } else {
    switch (period.toLowerCase()) {
      case 'ytd': {
        const year = latestYmd.slice(0, 4)
        startYmd = `${year}-01-01`
        break
      }
      case '6m':
        startYmd = subtractMonths(latestYmd, 6)
        break
      case '1y':
        startYmd = subtractMonths(latestYmd, 12)
        break
      case '3y':
        startYmd = subtractMonths(latestYmd, 36)
        break
      case '5y':
        startYmd = subtractMonths(latestYmd, 60)
        break
      case '10y':
        startYmd = subtractMonths(latestYmd, 120)
        break
      case 'all':
      default:
        startYmd = earliestYmd
        break
    }
  }

  const allPoints: ValuationDataPoint[] = []
  const peValues: number[] = []
  const pbValues: number[] = []

  for (let i = 0; i < total; i++) {
    const ymd = dates[i]
    if (ymd >= startYmd && ymd <= endYmd) {
      const [y, m, d] = ymd.split('-')
      const formattedDate = `${d}/${m}/${y}`
      const pe = Number(perList[i]) || 0
      const pb = Number(pbrList[i]) || 0

      allPoints.push({
        date: formattedDate,
        ymd,
        pe,
        pb,
      })
      peValues.push(pe)
      pbValues.push(pb)
    }
  }

  const lastPoint = allPoints.length > 0 ? allPoints[allPoints.length - 1] : null
  const currentPe = lastPoint?.pe ?? 0
  const currentPb = lastPoint?.pb ?? 0

  const peStats = computeStats(peValues, currentPe)
  const pbStats = computeStats(pbValues, currentPb)

  const peTitleSummary = lastPoint ? formatSummary('PE', currentPe, peStats) : ''
  const pbTitleSummary = lastPoint ? formatSummary('PB', currentPb, pbStats) : ''

  // Format DD-MM-YYYY cho hiển thị ngày cập nhật
  const [ly, lm, ld] = latestYmd.split('-')
  const displayLatestDate = `${ld}-${lm}-${ly}`

  // Giảm bớt số lượng điểm nếu quá nhiều để biểu đồ mượt (Downsampling)
  // Nếu có hơn 800 điểm, lấy cách quãng hợp lý để giữ đỉnh/đáy mượt mà
  let chartPoints = allPoints
  if (allPoints.length > 800) {
    const step = Math.ceil(allPoints.length / 800)
    chartPoints = allPoints.filter((_, idx) => idx % step === 0 || idx === allPoints.length - 1)
  }

  return {
    points: chartPoints,
    peStats,
    pbStats,
    current: lastPoint,
    peTitleSummary,
    pbTitleSummary,
    latestDate: displayLatestDate,
    earliestDate: earliestYmd,
  }
}
