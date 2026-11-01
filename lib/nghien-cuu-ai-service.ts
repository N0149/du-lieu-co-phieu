import fs from 'fs'
import path from 'path'
import { marked } from 'marked'
import nghienCuuAiSnapshot from '@/data/nghien_cuu_ai_snapshot.json'
import livePricesSnapshot from '@/data/nghien_cuu_ai_live_prices.json'
import { getAllStocks } from '@/lib/longlivestock'

export interface NghienCuuAiReport {
  slug: string
  ticker: string | null
  title: string
  displayTitle: string
  date: string
  score: number | null // Điểm gốc lúc nghiên cứu (Score0)
  classification: string | null // 'Siêu Hấp Dẫn' | 'Khả Quan' | 'Theo Dõi' | 'Kém Hấp Dẫn'
  price: number | null // Giá lúc nghiên cứu (P0) tính bằng k VND (VD: 50.0 = 50.000đ)
  targetPrice: number | null
  upside: number | null
  summary: string
  filename: string
  charCount: number
  tableCount: number
  updatedAt: string

  // Dữ liệu điều chỉnh theo giá thị trường hiện tại (Real-time dynamic)
  currentPrice: number | null // Giá thị trường hiện tại (k VND)
  currentScore: number | null // Điểm điều chỉnh = Điểm gốc * (Giá gốc / Giá hiện tại)
  scoreDelta: number | null // Biến động điểm (currentScore - score)
  currentClassification: string | null // Xếp hạng theo điểm hiện tại
}

export interface NghienCuuAiDetail extends NghienCuuAiReport {
  markdown: string
  contentHtml: string
}

const CONTENT_DIR = path.join(process.cwd(), 'content', 'nghien_cuu_ai')

/**
 * Xếp hạng định giá theo thang điểm chuẩn hóa (Benchmark 10% gửi tiết kiệm = 100 điểm)
 */
export function getScoreClassification(score: number | null): string | null {
  if (score == null) return null
  if (score >= 200) return 'Siêu Hấp Dẫn'
  if (score >= 150) return 'Khả Quan'
  if (score >= 100) return 'Theo Dõi'
  return 'Kém Hấp Dẫn'
}

/**
 * Tính điểm hiện tại điều chỉnh theo thị giá:
 * Điểm hiện tại = Điểm gốc * (Giá gốc / Giá hiện tại)
 */
export function calculateCurrentScore(
  baseScore: number | null,
  basePrice: number | null,
  currentPrice: number | null
): { currentScore: number | null; scoreDelta: number | null } {
  if (baseScore == null) return { currentScore: null, scoreDelta: null }
  if (!basePrice || !currentPrice || currentPrice <= 0 || basePrice <= 0) {
    return { currentScore: baseScore, scoreDelta: 0 }
  }
  const adjusted = Math.round(baseScore * (basePrice / currentPrice) * 10) / 10
  const delta = Math.round((adjusted - baseScore) * 10) / 10
  return { currentScore: adjusted, scoreDelta: delta }
}

/**
 * Format Markdown thành HTML chuẩn, hỗ trợ bảng biểu số liệu (tabular numerals)
 */
export function formatReportMarkdownToHtml(markdown: string): string {
  // Loại bỏ frontmatter nếu có
  const cleanMarkdown = markdown.replace(/^---[\s\S]*?---\s*/, '')
  
  let html = marked.parse(cleanMarkdown, { gfm: true, breaks: true }) as string

  // Xử lý bảng biểu tài chính: bọc trong responsive wrapper và thêm styles
  html = html.replace(/<table>([\s\S]*?)<\/table>/gi, (_match, tableInner) => {
    return `<div class="overflow-x-auto my-4 rounded-xl border border-white/10 bg-[#161a23] shadow-md"><table class="w-full border-collapse text-xs sm:text-sm">${tableInner}</table></div>`
  })

  // Định dạng các thẻ bảng
  html = html
    .replace(/<thead[^>]*>/gi, '<thead class="bg-white/[0.04] border-b border-white/10 text-slate-300 font-semibold uppercase tracking-wider">')
    .replace(/<th([^>]*)>/gi, '<th$1 class="px-3 py-2.5 text-left font-semibold border-b border-white/10">')
    .replace(/<td([^>]*)>/gi, '<td$1 class="px-3 py-2 border-b border-white/5 text-slate-200">')
    .replace(/<tr([^>]*)>/gi, '<tr$1 class="hover:bg-white/[0.02] transition-colors">')

  return html
}

/**
 * Lấy toàn bộ danh sách báo cáo nghiên cứu chuyên sâu AI kèm theo Điểm điều chỉnh theo giá thị trường hiện tại
 */
export function getAllNghienCuuAiReports(): NghienCuuAiReport[] {
  const priceMap = new Map<string, number | null>()

  // 1. Ưu tiên cao nhất: Thị giá thời gian thực từ 24hMoney Live Quote
  try {
    const liveObj = livePricesSnapshot as Record<string, { price: number }>
    for (const [sym, item] of Object.entries(liveObj)) {
      if (item && typeof item.price === 'number' && item.price > 0) {
        priceMap.set(sym.toUpperCase(), item.price)
      }
    }
  } catch {}

  // 2. Dự phòng: Bổ sung từ manifest nếu mã nào chưa có
  const stocks = getAllStocks()
  for (const s of stocks) {
    if (s.t && s.px != null && !priceMap.has(s.t.toUpperCase())) {
      priceMap.set(s.t.toUpperCase(), s.px)
    }
  }

  const seenSlugs = new Set<string>()
  const uniqueReports: NghienCuuAiReport[] = []

  for (const r of (nghienCuuAiSnapshot as any[])) {
    if (!r.slug || seenSlugs.has(r.slug)) continue
    seenSlugs.add(r.slug)

    const tickerUpper = (r.ticker || '').toUpperCase()
    const livePx = tickerUpper ? (priceMap.get(tickerUpper) ?? null) : null
    const { currentScore, scoreDelta } = calculateCurrentScore(r.score, r.price, livePx)
    const currentClassification = getScoreClassification(currentScore)

    uniqueReports.push({
      ...r,
      currentPrice: livePx,
      currentScore: currentScore,
      scoreDelta: scoreDelta,
      currentClassification: currentClassification,
    } as NghienCuuAiReport)
  }

  return uniqueReports
}

/**
 * Lấy báo cáo theo slug và đọc nội dung toàn văn Markdown/HTML
 */
export function getNghienCuuAiReportBySlug(slug: string): NghienCuuAiDetail | null {
  const normSlug = slug.toLowerCase().trim()
  const allReports = getAllNghienCuuAiReports()
  const report = allReports.find(
    (r) => r.slug.toLowerCase() === normSlug || r.filename.toLowerCase() === normSlug
  )

  if (!report) return null

  const filePath = path.join(CONTENT_DIR, `${report.slug}.md`)
  let markdown = ''
  if (fs.existsSync(filePath)) {
    markdown = fs.readFileSync(filePath, 'utf-8')
  } else {
    // Thử tìm theo filename
    const candidateFiles = fs.readdirSync(CONTENT_DIR)
    const matched = candidateFiles.find((f) => f.includes(report.slug) || f.startsWith(report.ticker || 'NONE'))
    if (matched) {
      markdown = fs.readFileSync(path.join(CONTENT_DIR, matched), 'utf-8')
    }
  }

  const contentHtml = formatReportMarkdownToHtml(markdown)

  return {
    ...report,
    markdown,
    contentHtml,
  }
}

/**
 * Lấy danh sách báo cáo theo mã cổ phiếu
 */
export function getNghienCuuAiReportsForTicker(ticker: string): NghienCuuAiReport[] {
  const tNorm = ticker.toUpperCase().trim()
  return getAllNghienCuuAiReports().filter(
    (r) => (r.ticker || '').toUpperCase() === tNorm
  )
}

/**
 * Tính các chỉ số KPI cho trang nghiên cứu chuyên sâu AI
 */
export function getNghienCuuAiKpis() {
  const list = getAllNghienCuuAiReports()
  const total = list.length
  
  // KPI tính theo điểm thực tế hiện tại
  const superAttractive = list.filter((r) => (r.currentScore ?? r.score) != null && (r.currentScore ?? r.score)! >= 200).length
  const favorable = list.filter((r) => (r.currentScore ?? r.score) != null && (r.currentScore ?? r.score)! >= 150 && (r.currentScore ?? r.score)! < 200).length
  const watchlist = list.filter((r) => (r.currentScore ?? r.score) != null && (r.currentScore ?? r.score)! >= 100 && (r.currentScore ?? r.score)! < 150).length
  
  const scoresOnly = list.map((r) => r.currentScore ?? r.score).filter((s): s is number => s != null)
  const avgScore = scoresOnly.length > 0 ? (scoresOnly.reduce((a, b) => a + b, 0) / scoresOnly.length).toFixed(1) : '—'
  const maxScore = scoresOnly.length > 0 ? Math.max(...scoresOnly).toFixed(1) : '—'
  
  const topReport = list.find((r) => (r.currentScore ?? r.score)?.toFixed(1) === maxScore)

  return {
    total,
    superAttractive,
    favorable,
    watchlist,
    avgScore,
    maxScore,
    topReport,
  }
}
