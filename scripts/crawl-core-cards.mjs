/**
 * Script cào toàn bộ Mảng kinh doanh cốt lõi (Core Business Cards)
 * trích từ Báo cáo thường niên trên LongLiveStock cho toàn bộ 1.530 mã cổ phiếu.
 *
 * Lưu trữ độc lập vào: data/company_core_cards.json
 *
 * Cách dùng:
 *   node scripts/crawl-core-cards.mjs                    # Cào toàn bộ 1.530 mã
 *   node scripts/crawl-core-cards.mjs --top=100          # Cào Top 100 mã vốn hóa lớn nhất
 *   node scripts/crawl-core-cards.mjs --symbols=HPG,VNM  # Chỉ cào mã chỉ định
 *   node scripts/crawl-core-cards.mjs --concurrency=16   # Tùy chỉnh số luồng (mặc định 12)
 *   node scripts/crawl-core-cards.mjs --force            # Cào lại cả những mã đã có
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')
const DATA_DIR = path.resolve(ROOT_DIR, 'data')
const MANIFEST_PATH = path.join(DATA_DIR, 'longlive_manifest.json')
const OUTPUT_FILE = path.join(DATA_DIR, 'company_core_cards.json')

// Bóc tách khối core-card từ HTML
export function parseCoreCardFromHtml(html, ticker) {
  if (!html || !html.includes('core-card')) return null

  try {
    const monoMatch = html.match(/<div class="core-mono"[^>]*>(.*?)<\/div>/)
    const logoMatch = html.match(/<img class="core-logo"[^>]*src="([^"]+)"[^>]*>/)
    const idMatch = html.match(/<div class="core-id">\s*<b>(.*?)<\/b>\s*<span>(.*?)<\/span>/)
    const tagMatch = html.match(/<div class="core-tag">(.*?)<\/div>/)
    const citeMatch = html.match(/<div class="core-cite">([\s\S]*?)<\/div>/)
    const snippetMatch = html.match(/<p class="core-snippet">([\s\S]*?)<\/p>/)

    const rows = []
    const tbodyMatch = html.match(/<table class="core-table">[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/)
    if (tbodyMatch) {
      // Regex linh hoạt: hỗ trợ cả có lẫn không có <small> và <span class="core-pill">
      const trMatches = tbodyMatch[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)
      for (const tr of trMatches) {
        const trContent = tr[1]
        const segMatch = trContent.match(/<td class="core-seg">\s*<b>(.*?)<\/b>(?:\s*<small>([\s\S]*?)<\/small>)?\s*<\/td>/)
        const roleMatch = trContent.match(/<td>([\s\S]*?)<\/td>/g)
        if (segMatch) {
          const segName = segMatch[1].trim()
          const segDesc = segMatch[2] ? segMatch[2].trim() : ''
          // Cột 2: Vai trò, Cột 3: Phân khúc (thường bọc trong core-pill)
          let role = ''
          let tag = ''
          if (roleMatch && roleMatch.length >= 2) {
            role = roleMatch[0].replace(/<\/?td>/g, '').trim()
            tag = roleMatch[1].replace(/<[^>]+>/g, '').trim()
          }
          rows.push({
            segment: segName,
            description: segDesc,
            role: role,
            tag: tag,
          })
        }
      }
    }

    const miniMatches = Array.from(
      html.matchAll(/<div class="core-mini">\s*<h4>(.*?)<\/h4>\s*<ul>([\s\S]*?)<\/ul>\s*<\/div>/g)
    )
    const bentoCards = miniMatches.map((m) => {
      const title = m[1].trim()
      const items = Array.from(m[2].matchAll(/<li>([\s\S]*?)<\/li>/g)).map((li) => li[1].trim())
      return { title, items }
    })

    const pillsMatch = html.match(/<div class="core-bl">([\s\S]*?)<\/div>/)
    let pills = []
    if (pillsMatch) {
      pills = Array.from(pillsMatch[1].matchAll(/<span class="core-pill">(.*?)<\/span>/g)).map((m) =>
        m[1].trim()
      )
    }

    return {
      monogram: monoMatch ? monoMatch[1].trim() : (ticker ? ticker[0] : ''),
      logoUrl: logoMatch ? logoMatch[1].trim() : null,
      companyName: idMatch ? idMatch[1].trim() : null,
      subtitle: idMatch ? idMatch[2].trim() : null,
      mainMarketTag: tagMatch ? tagMatch[1].trim() : null,
      segments: rows,
      bentoCards: bentoCards,
      citation: citeMatch ? citeMatch[1].trim() : null,
      snippet: snippetMatch ? snippetMatch[1].trim() : null,
      pills: pills,
      updated_at: new Date().toISOString(),
    }
  } catch (err) {
    console.error(`Error parsing coreCard for ${ticker}:`, err.message)
    return null
  }
}

// Tải danh sách mã
function loadTargetTickers() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Không tìm thấy file ${MANIFEST_PATH}`)
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'))
  const items = manifest.items || []
  // Sắp xếp theo vốn hóa từ lớn đến bé
  items.sort((a, b) => (b.cap || 0) - (a.cap || 0))
  return items.map((i) => i.t.toUpperCase().trim()).filter(Boolean)
}

// Fetch với timeout và retry
async function fetchWithRetry(url, retries = 2, timeoutMs = 8000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
      })
      if (!res.ok) {
        clearTimeout(timer)
        if (res.status === 404) return null
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
        continue
      }
      const text = await res.text()
      clearTimeout(timer)
      return text
    } catch (err) {
      clearTimeout(timer)
      if (attempt === retries) return null
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
    }
  }
  return null
}

async function main() {
  const args = process.argv.slice(2)
  let symbolsArg = null
  let topArg = null
  let concurrency = 12
  let force = false

  for (const arg of args) {
    if (arg.startsWith('--symbols=')) symbolsArg = arg.split('=')[1].split(',').map((s) => s.trim().toUpperCase())
    else if (arg.startsWith('--top=')) topArg = parseInt(arg.split('=')[1], 10)
    else if (arg.startsWith('--concurrency=')) concurrency = parseInt(arg.split('=')[1], 10)
    else if (arg === '--force') force = true
  }

  console.log('='.repeat(65))
  console.log('🚀 CÀO DỮ LIỆU: MẢNG KINH DOANH CỐT LÕI TRÍCH TỪ BCTN')
  console.log('='.repeat(65))

  const allTickers = loadTargetTickers()
  let targetTickers = allTickers

  if (symbolsArg) {
    targetTickers = symbolsArg
  } else if (topArg) {
    targetTickers = allTickers.slice(0, topArg)
  }

  console.log(`- Tổng số mã cần duyệt: ${targetTickers.length}`)
  console.log(`- Số luồng xử lý: ${concurrency}`)

  // Nạp dữ liệu hiện có nếu có
  let existingData = {}
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'))
      console.log(`- Đã có sẵn dữ liệu của ${Object.keys(existingData).length} mã trong ${OUTPUT_FILE}`)
    } catch (e) {
      existingData = {}
    }
  }

  // Lọc danh sách mã cần tải: chỉ tải mã chưa từng được xử lý
  const toProcess = force
    ? targetTickers
    : targetTickers.filter((t) => !(t in existingData))

  console.log(`- Số mã cần cào thực tế: ${toProcess.length}`)

  let completedCount = targetTickers.length - toProcess.length
  let foundCoreCardCount = Object.values(existingData).filter(Boolean).length
  let emptyCount = completedCount - foundCoreCardCount

  // Hàm lưu dữ liệu an toàn
  let lastSaveTime = Date.now()
  function saveSnapshot() {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existingData, null, 2), 'utf-8')
    lastSaveTime = Date.now()
  }

  const startTime = Date.now()

  // Xử lý đa luồng theo Batch
  for (let i = 0; i < toProcess.length; i += concurrency) {
    const batch = toProcess.slice(i, i + concurrency)
    await Promise.all(
      batch.map(async (ticker) => {
        const url = `https://longlivestock.com/stock/${ticker}`
        const html = await fetchWithRetry(url)
        if (html) {
          const coreCard = parseCoreCardFromHtml(html, ticker)
          if (coreCard) {
            existingData[ticker] = coreCard
            foundCoreCardCount++
            const citeSnippet = coreCard.citation ? coreCard.citation.replace(/<[^>]+>/g, '').slice(0, 45) : 'Không có trích dẫn'
            console.log(`  ✓ [${ticker}] Có BCTN: ${coreCard.segments?.length || 0} mảng SP | ${citeSnippet}...`)
          } else {
            existingData[ticker] = null
            emptyCount++
            console.log(`  - [${ticker}] Không có khối mảng cốt lõi`)
          }
        } else {
          existingData[ticker] = null
          emptyCount++
          console.log(`  ✗ [${ticker}] Không tải được HTML trang stock`)
        }
        completedCount++
      })
    )

    // Lưu snapshot định kỳ mỗi 5 giây
    if (Date.now() - lastSaveTime > 5000) {
      saveSnapshot()
      const pct = ((completedCount / targetTickers.length) * 100).toFixed(1)
      console.log(`  -> Đã lưu tiến độ: ${completedCount}/${targetTickers.length} (${pct}%) - Đã có ${foundCoreCardCount} mã BCTN`)
    }
  }

  // Lưu file cuối cùng
  saveSnapshot()

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log('='.repeat(65))
  console.log(`✅ HOÀN THÀNH trong ${elapsedSec}s`)
  console.log(`- Tổng mã đã xử lý: ${completedCount}/${targetTickers.length}`)
  console.log(`- Số mã CÓ Mảng kinh doanh cốt lõi (BCTN): ${foundCoreCardCount}`)
  console.log(`- Số mã không có: ${emptyCount}`)
  console.log(`- File lưu trữ: ${OUTPUT_FILE} (${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)} KB)`)
  console.log('='.repeat(65))
}

main().catch((err) => {
  console.error('Lỗi nghiêm trọng khi chạy crawler:', err)
  process.exit(1)
})
