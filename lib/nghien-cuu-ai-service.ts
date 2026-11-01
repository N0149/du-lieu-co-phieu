import fs from 'fs'
import path from 'path'
import { marked } from 'marked'
import nghienCuuAiSnapshot from '@/data/nghien_cuu_ai_snapshot.json'

export interface NghienCuuAiReport {
  slug: string
  ticker: string | null
  title: string
  displayTitle: string
  date: string
  score: number | null
  classification: string | null // 'Siêu Hấp Dẫn' | 'Khả Quan' | 'Theo Dõi' | 'Kém Hấp Dẫn'
  price: number | null
  targetPrice: number | null
  upside: number | null
  summary: string
  filename: string
  charCount: number
  tableCount: number
  updatedAt: string
}

export interface NghienCuuAiDetail extends NghienCuuAiReport {
  markdown: string
  contentHtml: string
}

const CONTENT_DIR = path.join(process.cwd(), 'content', 'nghien_cuu_ai')

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
 * Lấy toàn bộ danh sách báo cáo nghiên cứu chuyên sâu AI
 */
export function getAllNghienCuuAiReports(): NghienCuuAiReport[] {
  return nghienCuuAiSnapshot as NghienCuuAiReport[]
}

/**
 * Lấy báo cáo theo slug và đọc nội dung toàn văn Markdown/HTML
 */
export function getNghienCuuAiReportBySlug(slug: string): NghienCuuAiDetail | null {
  const normSlug = slug.toLowerCase().trim()
  const report = (nghienCuuAiSnapshot as NghienCuuAiReport[]).find(
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
  return (nghienCuuAiSnapshot as NghienCuuAiReport[]).filter(
    (r) => (r.ticker || '').toUpperCase() === tNorm
  )
}

/**
 * Tính các chỉ số KPI cho trang nghiên cứu chuyên sâu AI
 */
export function getNghienCuuAiKpis() {
  const list = getAllNghienCuuAiReports()
  const total = list.length
  const superAttractive = list.filter((r) => r.score != null && r.score >= 200).length
  const favorable = list.filter((r) => r.score != null && r.score >= 150 && r.score < 200).length
  const watchlist = list.filter((r) => r.score != null && r.score >= 100 && r.score < 150).length
  
  const scoresOnly = list.map((r) => r.score).filter((s): s is number => s != null)
  const avgScore = scoresOnly.length > 0 ? (scoresOnly.reduce((a, b) => a + b, 0) / scoresOnly.length).toFixed(1) : '—'
  const maxScore = scoresOnly.length > 0 ? Math.max(...scoresOnly).toFixed(1) : '—'
  
  const topReport = list.find((r) => r.score != null && r.score.toFixed(1) === maxScore)

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
