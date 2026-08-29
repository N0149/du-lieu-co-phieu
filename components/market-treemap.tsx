'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { LayoutGrid } from 'lucide-react'
import type { StockManifestItem, MarketManifestData } from '@/lib/longlivestock'
import { cn } from '@/lib/utils'

interface MarketTreemapProps {
  stocks: StockManifestItem[]
  manifestData: MarketManifestData
  onSelectSector?: (sector: string) => void
}

type TreemapTile = {
  ticker: string
  name: string
  cap: number
  w1: number | null
  x: number
  y: number
  w: number
  h: number
  color: string
}

type TreemapGroup = {
  groupName: string
  cap: number
  w1: number
  x: number
  y: number
  w: number
  h: number
  tiles: TreemapTile[]
}

function getChgColor(chg: number | null | undefined): string {
  if (chg == null) return '#475569'
  if (chg >= 6.5) return '#9333ea' // Purple / trần
  if (chg >= 3) return '#10b981' // Strong green
  if (chg > 0) return '#059669' // Green
  if (chg <= -6.5) return '#0284c7' // Floor / sàn
  if (chg <= -3) return '#e11d48' // Strong red
  if (chg < 0) return '#dc2626' // Red
  return '#64748b' // Neutral / flat
}

export function MarketTreemap({ stocks, manifestData, onSelectSector }: MarketTreemapProps) {
  const [hoveredTicker, setHoveredTicker] = useState<string | null>(null)

  // Top groups by cap with top stocks
  const groups = useMemo(() => {
    const groupMap: Record<string, StockManifestItem[]> = {}
    for (const s of stocks) {
      const g = s.g || 'Khác'
      if (!groupMap[g]) groupMap[g] = []
      groupMap[g].push(s)
    }

    const groupEntries = Object.entries(groupMap)
      .map(([name, list]) => {
        const totalCap = list.reduce((sum, item) => sum + (item.cap || 0), 0)
        const validW1 = list.filter((it) => it.w1 != null)
        const avgW1 =
          validW1.length > 0
            ? validW1.reduce((sum, it) => sum + (it.w1 || 0), 0) / validW1.length
            : 0
        const sortedStocks = [...list].sort((a, b) => (b.cap || 0) - (a.cap || 0))
        return {
          name,
          totalCap,
          avgW1,
          stocks: sortedStocks.slice(0, 6),
        }
      })
      .filter((g) => g.totalCap > 0)
      .sort((a, b) => b.totalCap - a.totalCap)

    return groupEntries.slice(0, 8) // Top 8 major sectors
  }, [stocks])

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <LayoutGrid className="size-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Bản Đồ Nhiệt Thị Trường Theo Nhóm Ngành
          </h3>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Độ lớn = Vốn hóa · Màu sắc = Biến động tuần
        </span>
      </div>

      {/* Grid of Sector Treemap Cards */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((grp) => {
          const isUp = grp.avgW1 > 0
          return (
            <div
              key={grp.name}
              className="flex flex-col justify-between rounded-lg border border-border/80 bg-background/50 p-2.5"
            >
              {/* Sector Header */}
              <div className="flex items-baseline justify-between border-b border-border/40 pb-1.5 text-xs">
                <span className="font-bold text-foreground">{grp.name}</span>
                <span
                  className={cn(
                    'font-mono text-[11px] font-semibold',
                    isUp ? 'text-emerald-500' : 'text-rose-500',
                  )}
                >
                  {isUp ? '+' : ''}
                  {grp.avgW1.toFixed(2)}%
                </span>
              </div>

              {/* Stock Tiles in this sector */}
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {grp.stocks.map((stk) => {
                  const bg = getChgColor(stk.w1)
                  return (
                    <Link
                      key={stk.t}
                      href={`/stock/${stk.t}`}
                      onMouseEnter={() => setHoveredTicker(stk.t)}
                      onMouseLeave={() => setHoveredTicker(null)}
                      style={{ backgroundColor: bg }}
                      className="group flex flex-col items-center justify-center rounded-md p-1.5 text-white transition-all hover:scale-105 hover:shadow-md"
                      title={`${stk.t} · ${stk.n} · Vốn hóa: ${(stk.cap || 0).toLocaleString()} tỷ · Biến động: ${stk.w1 != null ? `${stk.w1 > 0 ? '+' : ''}${stk.w1}%` : '—'}`}
                    >
                      <span className="font-mono text-xs font-bold leading-tight drop-shadow-xs">
                        {stk.t}
                      </span>
                      <span className="font-mono text-[10px] font-semibold text-white/90 drop-shadow-xs">
                        {stk.w1 != null ? `${stk.w1 > 0 ? '+' : ''}${stk.w1.toFixed(1)}%` : '—'}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
