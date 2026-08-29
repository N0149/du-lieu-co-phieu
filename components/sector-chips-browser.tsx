'use client'

import { useMemo } from 'react'
import type { StockManifestItem } from '@/lib/longlivestock'
import { cn } from '@/lib/utils'

interface SectorChipsBrowserProps {
  stocks: StockManifestItem[]
  selectedSector: string
  onSelectSector: (sector: string) => void
}

type GroupInfo = {
  g: string
  cap: number
  secs: {
    s: string
    n: number
    cap: number
  }[]
}

export function SectorChipsBrowser({
  stocks,
  selectedSector,
  onSelectSector,
}: SectorChipsBrowserProps) {
  const groups = useMemo(() => {
    const secMap: Record<string, { n: number; cap: number; g: string }> = {}
    for (const s of stocks) {
      const s2 = s.s2
      if (!s2) continue
      if (!secMap[s2]) {
        secMap[s2] = { n: 0, cap: 0, g: s.g || 'Khác' }
      }
      secMap[s2].n += 1
      secMap[s2].cap += s.cap || 0
    }

    const groupMap: Record<string, { cap: number; secs: { s: string; n: number; cap: number }[] }> = {}
    for (const [s2, info] of Object.entries(secMap)) {
      if (!groupMap[info.g]) {
        groupMap[info.g] = { cap: 0, secs: [] }
      }
      groupMap[info.g].cap += info.cap
      groupMap[info.g].secs.push({ s: s2, n: info.n, cap: info.cap })
    }

    const groupList: GroupInfo[] = Object.entries(groupMap).map(([g, val]) => ({
      g,
      cap: val.cap,
      secs: val.secs.sort((a, b) => b.cap - a.cap),
    }))

    return groupList.sort((a, b) => b.cap - a.cap)
  }, [stocks])

  return (
    <div className="border-b border-border bg-card/90 px-4 py-4 backdrop-blur shadow-inner">
      <div className="mx-auto max-w-[1600px]">
        {/* All sectors chip */}
        <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2">
          <button
            type="button"
            onClick={() => onSelectSector('')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-semibold transition-all',
              selectedSector === ''
                ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                : 'border-border bg-background text-foreground hover:border-primary',
            )}
          >
            <span>Tất cả ngành</span>
            <span className="font-mono text-[11px] opacity-80">{stocks.length} mã</span>
          </button>
          <span className="text-[11px] text-muted-foreground">
            Xếp theo tổng vốn hóa thị trường
          </span>
        </div>

        {/* Multi-column layout */}
        <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4">
          {groups.map((grp) => (
            <div key={grp.g} className="mb-4 break-inside-avoid rounded-lg border border-border/60 bg-background/60 p-3">
              <div className="flex items-baseline justify-between border-b border-border/40 pb-1.5 text-xs">
                <span className="font-bold text-foreground">{grp.g}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {(grp.cap / 1000).toFixed(0)}k tỷ
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {grp.secs.map((sec) => {
                  const active = selectedSector === sec.s
                  return (
                    <button
                      key={sec.s}
                      type="button"
                      onClick={() => onSelectSector(active ? '' : sec.s)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all',
                        active
                          ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/60 hover:text-foreground',
                      )}
                    >
                      <span>{sec.s}</span>
                      <span className="font-mono text-[10px] opacity-75">{sec.n}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
