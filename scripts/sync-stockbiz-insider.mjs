/**
 * Sync Stockbiz Insider Actions Bot
 * Tự động đồng bộ các văn bản công bố giao dịch nội bộ từ Stockbiz / Sở GDCK
 * vào cơ sở dữ liệu SQLite và bộ nhớ đệm cổ phiếu.
 *
 * Chạy:
 *   node scripts/sync-stockbiz-insider.mjs          (đồng bộ ~100 giao dịch mới nhất thị trường)
 *   node scripts/sync-stockbiz-insider.mjs --pages=10 (đồng bộ ~200 giao dịch)
 *   node scripts/sync-stockbiz-insider.mjs --symbol=NTL (đồng bộ riêng mã NTL)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')
const DATA_DIR = path.resolve(ROOT_DIR, 'data')
const CACHE_DIR = path.join(DATA_DIR, 'shareholder_cache')
const DB_PATH = path.join(DATA_DIR, 'company_profiles.db')

const STOCKBIZ_URL = 'http://en.stockbiz.vn/InsiderActionsStats.aspx'
const CTRL_ID = 'ctl00_webPartManager_wp303436996_wp32423248_cbInsiderActions'

function cleanTraderName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function getTradeTimestamp(dStr) {
  if (!dStr) return 0
  if (dStr.includes('/')) {
    const parts = dStr.split('/')
    if (parts.length === 3) {
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime()
    }
  }
  if (dStr.includes('-')) {
    const parts = dStr.split('T')[0].split('-')
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime()
      }
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime()
    }
  }
  return 0
}

function formatVnDate(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const m = parts[0].padStart(2, '0')
    const d = parts[1].padStart(2, '0')
    const y = parts[2]
    return `${d}/${m}/${y}`
  }
  return dateStr
}

const POSITION_MAP = {
  'chairman of board': 'Chủ tịch HĐQT',
  'deputy chairman of board': 'Phó Chủ tịch HĐQT',
  'vice chairman of board': 'Phó Chủ tịch HĐQT',
  'board member': 'Thành viên HĐQT',
  'member of the bod': 'Thành viên HĐQT',
  'chief of executive officer': 'Tổng Giám đốc (CEO)',
  'ceo': 'Tổng Giám đốc (CEO)',
  'general director': 'Tổng Giám đốc',
  'deputy ceo': 'Phó Tổng Giám đốc',
  'deputy general director': 'Phó Tổng Giám đốc',
  'chief accountant': 'Kế toán trưởng',
  'representative spokesman': 'Người đại diện CBTT',
  'spokesman': 'Người đại diện CBTT',
  'control member': 'Thành viên Ban Kiểm soát',
  'head of supervisory board': 'Trưởng Ban Kiểm soát',
  'member of supervisory board': 'Thành viên Ban Kiểm soát',
  'supervisory board member': 'Thành viên Ban Kiểm soát',
  'secretary': 'Thư ký HĐQT',
  'person related to': 'Người có liên quan',
  'related person': 'Người có liên quan',
  'major shareholder': 'Cổ đông lớn',
  'internal shareholder': 'Cổ đông nội bộ',
}

function translatePosition(pos) {
  if (!pos || pos === '---' || pos.trim() === '') return 'Người liên quan / Khác'
  const clean = pos.trim().toLowerCase()
  if (POSITION_MAP[clean]) return POSITION_MAP[clean]
  for (const [k, v] of Object.entries(POSITION_MAP)) {
    if (clean.includes(k)) return v
  }
  return pos
}

function translateTransaction(tx) {
  if (!tx) return { vi: 'Khác', action: 'OTHER', isReg: false }
  const clean = tx.trim().toLowerCase()
  if (clean.includes('purchase') || clean.includes('buy')) {
    return { vi: clean.includes('register') ? 'Đăng ký mua' : 'Đã mua', action: 'BUY', isReg: clean.includes('register') }
  }
  if (clean.includes('sell')) {
    return { vi: clean.includes('register') ? 'Đăng ký bán' : 'Đã bán', action: 'SELL', isReg: clean.includes('register') }
  }
  return { vi: tx, action: 'OTHER', isReg: false }
}

async function fetchStockbizPage(startIndex = 0, symbol = '') {
  const params = new URLSearchParams()
  params.append(`Cart_${CTRL_ID}_Callback_Param`, symbol)
  params.append(`Cart_${CTRL_ID}_Callback_Param`, '-1')
  params.append(`Cart_${CTRL_ID}_Callback_Param`, '1753-01-01')
  params.append(`Cart_${CTRL_ID}_Callback_Param`, '-1')
  params.append(`Cart_${CTRL_ID}_Callback_Param`, String(startIndex))

  try {
    const res = await fetch(STOCKBIZ_URL, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Referer': STOCKBIZ_URL,
      },
      body: params.toString(),
    })
    return res.ok ? await res.text() : ''
  } catch (err) {
    console.warn(`[SyncStockbiz] Fetch error at index ${startIndex}:`, err.message)
    return ''
  }
}

function parseStockbizHtml(html) {
  if (!html) return []
  const items = []
  const trMatches = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || []

  for (const tr of trMatches) {
    const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
    )

    if (tds.length >= 6) {
      const [rawDate, rawSymbol, rawName, rawPos, rawTx, rawShares] = tds
      if (rawDate.toLowerCase() === 'date' || !rawDate.includes('/')) continue

      const symbol = rawSymbol.toUpperCase().trim()
      if (!symbol || !/^[A-Z0-9]{3,4}$/.test(symbol)) continue

      const shares = parseInt(rawShares.replace(/,/g, '').replace(/\./g, ''), 10) || 0
      const txInfo = translateTransaction(rawTx)
      const position = translatePosition(rawPos)
      const date = formatVnDate(rawDate)

      items.push({
        symbol,
        name: rawName,
        position,
        date,
        actionType: txInfo.action,
        isRegistration: txInfo.isReg,
        shares,
      })
    }
  }

  return items
}

function pairStockbizTrades(sbTrades) {
  const paired = []
  const usedRegIndices = new Set()
  const sorted = [...sbTrades].sort((a, b) => getTradeTimestamp(b.date) - getTradeTimestamp(a.date))

  for (let i = 0; i < sorted.length; i++) {
    const it = sorted[i]
    if (it.isRegistration) continue

    let matchedReg = null
    const itTs = getTradeTimestamp(it.date)

    for (let j = 0; j < sorted.length; j++) {
      if (i === j || !sorted[j].isRegistration || usedRegIndices.has(j)) continue
      const reg = sorted[j]
      const regTs = getTradeTimestamp(reg.date)
      if (
        cleanTraderName(reg.name) === cleanTraderName(it.name) &&
        reg.actionType === it.actionType &&
        reg.shares === it.shares &&
        regTs <= itTs &&
        itTs - regTs <= 60 * 86400 * 1000
      ) {
        matchedReg = reg
        usedRegIndices.add(j)
        break
      }
    }

    paired.push({
      traderName: it.name,
      traderPosition: it.position,
      tradeDate: it.date,
      action: it.actionType === 'SELL' ? 'SELL' : it.actionType === 'BUY' ? 'BUY' : 'NONE',
      volumeTraded: it.shares,
      volumeRegistered: matchedReg ? matchedReg.shares : 0,
      planBeginDate: matchedReg ? matchedReg.date : undefined,
      volumeAfter: 0,
    })
  }

  for (let j = 0; j < sorted.length; j++) {
    if (sorted[j].isRegistration && !usedRegIndices.has(j)) {
      const reg = sorted[j]
      paired.push({
        traderName: reg.name,
        traderPosition: reg.position,
        tradeDate: reg.date,
        action: reg.actionType === 'SELL' ? 'SELL' : reg.actionType === 'BUY' ? 'BUY' : 'NONE',
        volumeTraded: 0,
        volumeRegistered: reg.shares,
        volumeAfter: 0,
      })
    }
  }

  return paired
}

function mergeStockbizWithExisting(existing, sbPaired) {
  const result = [...existing]
  let hasNew = false

  for (const sb of sbPaired) {
    const sbTs = getTradeTimestamp(sb.tradeDate)
    const sbName = cleanTraderName(sb.traderName)

    let found = false
    for (let i = 0; i < result.length; i++) {
      const ex = result[i]
      const exTs = getTradeTimestamp(ex.tradeDate)
      const exName = cleanTraderName(ex.traderName)

      if (
        exName === sbName &&
        ex.action === sb.action &&
        (
          (sb.volumeTraded > 0 && ex.volumeTraded === sb.volumeTraded) ||
          (sb.volumeRegistered > 0 && ex.volumeRegistered === sb.volumeRegistered) ||
          (sb.volumeRegistered > 0 && ex.volumeTraded === sb.volumeRegistered)
        ) &&
        Math.abs(exTs - sbTs) <= 45 * 86400 * 1000
      ) {
        if (!ex.traderPosition && sb.traderPosition) ex.traderPosition = sb.traderPosition
        if (!ex.volumeRegistered && sb.volumeRegistered) ex.volumeRegistered = sb.volumeRegistered
        if (!ex.planBeginDate && sb.planBeginDate) ex.planBeginDate = sb.planBeginDate
        found = true
        break
      }
    }

    if (!found) {
      result.push(sb)
      hasNew = true
    }
  }

  return {
    merged: result.sort((a, b) => getTradeTimestamp(b.tradeDate) - getTradeTimestamp(a.tradeDate)),
    hasNew,
  }
}

async function main() {
  const args = process.argv.slice(2)
  const symArg = args.find((a) => a.startsWith('--symbol='))?.split('=')[1]?.toUpperCase()
  const pagesArg = parseInt(args.find((a) => a.startsWith('--pages='))?.split('=')[1] || '5', 10)

  console.log('=== SYNC STOCKBIZ INSIDER TRADES ===')
  const rawFilings = []

  if (symArg) {
    console.log(`Đang cào dữ liệu cho mã: ${symArg}...`)
    const html = await fetchStockbizPage(0, symArg)
    rawFilings.push(...parseStockbizHtml(html))
  } else {
    console.log(`Đang cào ${pagesArg} trang gần nhất toàn thị trường...`)
    const fetches = []
    for (let i = 0; i < pagesArg; i++) {
      fetches.push(fetchStockbizPage(i * 20))
    }
    const htmls = await Promise.all(fetches)
    for (const html of htmls) {
      rawFilings.push(...parseStockbizHtml(html))
    }
  }

  console.log(`Tìm thấy ${rawFilings.length} văn bản công bố giao dịch.`)

  // Nhóm theo mã cổ phiếu
  const filingsBySymbol = new Map()
  for (const item of rawFilings) {
    if (!filingsBySymbol.has(item.symbol)) filingsBySymbol.set(item.symbol, [])
    filingsBySymbol.get(item.symbol).push(item)
  }

  console.log(`Tổng cộng ${filingsBySymbol.size} mã cổ phiếu có giao dịch mới:`, [...filingsBySymbol.keys()].join(', '))

  let profileDb = null
  if (fs.existsSync(DB_PATH)) {
    try {
      profileDb = new DatabaseSync(DB_PATH)
    } catch {}
  }

  let updatedCount = 0

  for (const [sym, sbTrades] of filingsBySymbol.entries()) {
    const cacheFile = path.join(CACHE_DIR, `${sym}.json`)
    let profile = {
      symbol: sym,
      ownership: { foreign: 0, state: 0, other: 100, shareholders: [], pieChartData: [] },
      subsidiaries: [],
      insiderTrades: [],
    }

    if (fs.existsSync(cacheFile)) {
      try {
        const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'))
        if (cached.ownership) profile.ownership = cached.ownership
        if (cached.subsidiaries) profile.subsidiaries = cached.subsidiaries
        if (Array.isArray(cached.insiderTrades)) {
          profile.insiderTrades = cached.insiderTrades
        } else if (Array.isArray(cached.giao_dich_noi_bo)) {
          // Convert from raw format
          profile.insiderTrades = cached.giao_dich_noi_bo.map((t) => ({
            traderName: t.transaction_name || t.traderName || '—',
            traderPosition: t.transaction_position || t.traderPosition || '',
            tradeDate: formatVnDate(t.real_end_date || t.plan_begin_date || t.tradeDate),
            action: (t.real_buy > 0 || t.plan_buy > 0) ? 'BUY' : 'SELL',
            volumeTraded: t.real_buy || t.real_sell || t.volumeTraded || 0,
            volumeRegistered: t.plan_buy || t.plan_sell || t.volumeRegistered || 0,
            volumeAfter: t.volume_after || t.volumeAfter || 0,
          }))
        }
      } catch {}
    }

    const paired = pairStockbizTrades(sbTrades)
    const { merged, hasNew } = mergeStockbizWithExisting(profile.insiderTrades, paired)

    if (hasNew || profile.insiderTrades.length === 0) {
      profile.insiderTrades = merged
      fs.writeFileSync(cacheFile, JSON.stringify(profile, null, 2), 'utf-8')

      if (profileDb) {
        try {
          profileDb
            .prepare(`
              INSERT INTO company_profiles (symbol, foreign_rate, state_rate, other_rate, raw_json, updated_at)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(symbol) DO UPDATE SET
                raw_json=excluded.raw_json,
                updated_at=excluded.updated_at
            `)
            .run(
              sym,
              profile.ownership.foreign || 0,
              profile.ownership.state || 0,
              profile.ownership.other || 100,
              JSON.stringify(profile),
              new Date().toISOString()
            )
        } catch {}
      }

      updatedCount++
      console.log(`  + Đã cập nhật ${sym}: ${merged.length} giao dịch (Giao dịch mới nhất: ${merged[0]?.tradeDate} - ${merged[0]?.traderName})`)
    }
  }

  if (profileDb) {
    try {
      profileDb.close()
    } catch {}
  }

  console.log(`\nHoàn thành! Đã cập nhật ${updatedCount}/${filingsBySymbol.size} mã cổ phiếu vào SQLite và cache disk.`)
}

main()
