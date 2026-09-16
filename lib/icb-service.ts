import fs from 'node:fs'
import path from 'node:path'
import { getAllStocks, type StockManifestItem } from './longlivestock'

export interface IcbLevel {
  code: string
  name: string
}

export interface PeerScopeOption {
  id: 'l4' | 'l2' | 'custom'
  label: string
  fullName: string
  count: number
  peers: string[]
}

export interface StockIcbHierarchy {
  ticker: string
  l1: IcbLevel
  l2: IcbLevel
  l4: IcbLevel
  subGroup?: string
  l4Peers: StockManifestItem[]
  l2Peers: StockManifestItem[]
  defaultPeerTickers: string[]
  quickSuggestions: string[]
  scopeOptions: PeerScopeOption[]
}

interface RawIcbHierarchy {
  level1: Array<{
    code: string
    name_vi: string
    level2?: Array<{
      code: string
      name_vi: string
      level4?: Array<{
        code: string
        name_vi: string
        symbols?: string[]
      }>
    }>
  }>
}

// Nhóm các mã Thủy sản chuyên biệt trong L4 Nuôi trồng nông & hải sản
const SEAFOOD_TICKERS = new Set([
  'FMC', 'VHC', 'MPC', 'ANV', 'IDI', 'CMX', 'ACL', 'ABT', 'SEA', 'SJ1',
  'DAT', 'AAM', 'BLF', 'CAD', 'TS4', 'ICF', 'AGF', 'APT', 'AVF', 'CAT',
  'CCA', 'FDG', 'HVG', 'JOS', 'NGC', 'SPD', 'SPH', 'SPV'
])

let cachedHierarchy: RawIcbHierarchy | null = null

function loadHierarchy(): RawIcbHierarchy | null {
  if (cachedHierarchy) return cachedHierarchy
  try {
    const filePath = path.join(process.cwd(), 'data', 'industry', 'icb_hierarchy.json')
    if (fs.existsSync(filePath)) {
      cachedHierarchy = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      return cachedHierarchy
    }
  } catch (err) {
    console.error('[icb-service] Error reading icb_hierarchy.json:', err)
  }
  return null
}

export function getStockIcbHierarchy(ticker: string): StockIcbHierarchy | null {
  const sym = ticker.toUpperCase().trim()
  const allStocks = getAllStocks()
  const manifestMap = new Map<string, StockManifestItem>()
  for (const s of allStocks) {
    manifestMap.set(s.t.toUpperCase(), s)
  }

  const currentItem = manifestMap.get(sym)
  const hierarchy = loadHierarchy()

  let match: {
    l1: { code: string; name_vi: string }
    l2: {
      code: string
      name_vi: string
      level4?: Array<{
        code: string
        name_vi: string
        symbols?: string[]
      }>
    }
    l4: { code: string; name_vi: string; symbols?: string[] }
  } | null = null

  if (hierarchy && Array.isArray(hierarchy.level1)) {
    for (const l1 of hierarchy.level1) {
      for (const l2 of l1.level2 || []) {
        for (const l4 of l2.level4 || []) {
          if (l4.symbols && l4.symbols.map((s) => s.toUpperCase()).includes(sym)) {
            match = { l1, l2, l4 }
            break
          }
        }
        if (match) break
      }
      if (match) break
    }
  }

  // Fallback nếu không có trong file icb_hierarchy
  if (!match) {
    const g = currentItem?.g || 'Khác'
    const s2 = currentItem?.s2 || g
    const s = currentItem?.s || s2

    const sameS = allStocks
      .filter((x) => x.t !== sym && (!x.st || x.st === 'active') && (x.s === s || x.s2 === s2 || x.g === g))
      .sort((a, b) => (b.cap || 0) - (a.cap || 0))

    const peerTickers = sameS.slice(0, 5).map((x) => x.t)

    return {
      ticker: sym,
      l1: { code: '0000', name: g },
      l2: { code: '0000', name: s2 },
      l4: { code: '0000', name: s },
      l4Peers: sameS,
      l2Peers: sameS,
      defaultPeerTickers: peerTickers,
      quickSuggestions: sameS.slice(0, 10).map((x) => x.t),
      scopeOptions: [
        {
          id: 'l4',
          label: 'Phân ngành chuyên sâu',
          fullName: s,
          count: sameS.length,
          peers: peerTickers,
        },
      ],
    }
  }

  const { l1, l2, l4 } = match
  const isTargetSeafood = SEAFOOD_TICKERS.has(sym)

  // 1. Danh sách đối thủ L4 (Cùng phân ngành chuyên sâu)
  const rawL4Items = (l4.symbols || [])
    .map((s) => manifestMap.get(s.toUpperCase()))
    .filter((x): x is StockManifestItem => Boolean(x && x.t !== sym && (!x.st || x.st === 'active')))

  // Sắp xếp L4: nếu là doanh nghiệp thủy sản, ưu tiên các mã thủy sản lên trước
  rawL4Items.sort((a, b) => {
    if (isTargetSeafood) {
      const aSea = SEAFOOD_TICKERS.has(a.t) ? 1 : 0
      const bSea = SEAFOOD_TICKERS.has(b.t) ? 1 : 0
      if (aSea !== bSea) return bSea - aSea
    }
    return (b.cap || 0) - (a.cap || 0)
  })

  // 2. Danh sách đối thủ L2 (Cùng nhóm ngành lớn)
  const allL2Symbols: string[] = (l2.level4 || []).flatMap((x) => x.symbols || [])
  const rawL2Items = Array.from(new Set(allL2Symbols))
    .map((s) => manifestMap.get(s.toUpperCase()))
    .filter((x): x is StockManifestItem => Boolean(x && x.t !== sym && (!x.st || x.st === 'active')))
    .sort((a, b) => (b.cap || 0) - (a.cap || 0))

  const defaultPeerTickers = rawL4Items.slice(0, 5).map((x) => x.t)
  const quickSuggestions = rawL4Items.slice(0, 10).map((x) => x.t)

  const scopeOptions: PeerScopeOption[] = [
    {
      id: 'l4',
      label: 'Phân ngành chuyên sâu',
      fullName: isTargetSeafood ? 'Thủy sản & Nuôi trồng hải sản' : l4.name_vi,
      count: rawL4Items.length,
      peers: defaultPeerTickers,
    },
    {
      id: 'l2',
      label: 'Nhóm ngành lớn',
      fullName: l2.name_vi,
      count: rawL2Items.length,
      peers: rawL2Items.slice(0, 5).map((x) => x.t),
    },
  ]

  return {
    ticker: sym,
    l1: { code: l1.code, name: l1.name_vi },
    l2: { code: l2.code, name: l2.name_vi },
    l4: { code: l4.code, name: l4.name_vi },
    subGroup: isTargetSeafood ? 'Thủy sản & Nuôi trồng hải sản' : undefined,
    l4Peers: rawL4Items,
    l2Peers: rawL2Items,
    defaultPeerTickers,
    quickSuggestions,
    scopeOptions,
  }
}
