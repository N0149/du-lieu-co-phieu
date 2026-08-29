'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, CornerDownLeft, FileText } from 'lucide-react'
import { stocks, upside } from '@/lib/data'
import { fmtPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useReports, reportHref } from '@/lib/use-reports'
import { reportTickers, buildReportStocks } from '@/lib/report-stocks'
import { getAllStocks, removeVietnameseAccents } from '@/lib/longlivestock'

type SearchEntry = {
  ticker: string
  name: string
  hasReport: boolean
}

export function StockSearch() {
  const router = useRouter()
  const { reports, byTicker } = useReports()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Nguồn tìm kiếm: toàn bộ mã báo cáo (từ kho) + các mã có tên công ty (stocks)
  const searchPool = useMemo<SearchEntry[]>(() => {
    const seen = new Set<string>()
    const pool: SearchEntry[] = []
    const reportStocks = buildReportStocks(reports)
    // Ưu tiên các mã trong kho báo cáo (đã có bài viết)
    for (const r of reportStocks) {
      const t = r.ticker.toUpperCase()
      if (seen.has(t)) continue
      seen.add(t)
      pool.push({ ticker: r.ticker, name: r.name, hasReport: true })
    }
    // Bổ sung các mã còn lại trong stocks (để tìm được theo tên công ty)
    for (const s of stocks) {
      const t = s.ticker.toUpperCase()
      if (seen.has(t)) continue
      seen.add(t)
      pool.push({ ticker: s.ticker, name: s.name, hasReport: byTicker.has(t) })
    }

    // Bổ sung toàn bộ 1.530 mã từ danh mục thị trường
    try {
      const allM = getAllStocks()
      for (const m of allM) {
        const t = m.t.toUpperCase()
        if (seen.has(t)) continue
        seen.add(t)
        pool.push({ ticker: m.t, name: m.n, hasReport: byTicker.has(t) })
      }
    } catch {}

    return pool
  }, [reports, byTicker])

  const stockMap = useMemo(
    () => new Map(stocks.map((s) => [s.ticker.toUpperCase(), s])),
    [],
  )

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    const termNorm = removeVietnameseAccents(term)
    if (!term) return searchPool.slice(0, 6)
    return searchPool
      .filter((s) => {
        const tNorm = removeVietnameseAccents(`${s.ticker} ${s.name}`.toLowerCase())
        return tNorm.includes(termNorm)
      })
      .slice(0, 8)
  }, [q, searchPool])

  // Mở thẳng báo cáo của mã cổ phiếu (từ dropdown gợi ý)
  function go(ticker: string, hasReport: boolean) {
    setOpen(false)
    setQ('')
    inputRef.current?.blur()
    if (hasReport) {
      router.push(reportHref(ticker))
    } else {
      router.push(`/stock/${encodeURIComponent(ticker)}`)
    }
  }

  // Xử lý Enter/Submit: chuẩn hóa keyword (trim + toUpperCase)
  function submitSearch() {
    const keyword = q.trim().toUpperCase()
    if (!keyword) return

    // Nếu đang có gợi ý được highlight hợp lệ (dùng phím mũi tên hoặc khớp chính xác mã)
    const pick = results[active]
    const exactItem = searchPool.find((p) => p.ticker.toUpperCase() === keyword)

    setOpen(false)
    inputRef.current?.blur()

    if (pick && (active > 0 || pick.ticker.toUpperCase() === keyword)) {
      if (pick.hasReport) {
        router.push(reportHref(pick.ticker))
      } else {
        router.push(`/stock/${encodeURIComponent(pick.ticker)}`)
      }
      return
    }
    if (exactItem) {
      if (exactItem.hasReport) {
        router.push(`/bao-cao?ticker=${encodeURIComponent(keyword)}`)
      } else {
        router.push(`/stock/${encodeURIComponent(keyword)}`)
      }
      return
    }
    // Tên công ty hoặc từ khóa tự do → tìm trong kho báo cáo
    router.push(`/bao-cao?search=${encodeURIComponent(keyword)}`)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.nativeEvent.isComposing || (e as unknown as { keyCode: number }).keyCode === 229) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      submitSearch()
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder="Tìm nhanh theo Mã CK hoặc tên doanh nghiệp…"
          aria-label="Tìm kiếm cổ phiếu"
          className="h-9 w-full rounded-md border border-input bg-card pl-8 pr-16 font-mono text-sm text-foreground outline-none transition-colors placeholder:font-sans placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:flex">
          <CornerDownLeft className="size-3" /> Enter
        </kbd>
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
          <ul role="listbox" className="max-h-80 overflow-y-auto py-1">
            {results.map((s, i) => {
              const stock = stockMap.get(s.ticker.toUpperCase())
              const up = stock ? upside(stock) : null
              return (
                <li key={s.ticker} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(s.ticker, s.hasReport)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2 text-left',
                      i === active ? 'bg-accent' : 'hover:bg-muted',
                    )}
                  >
                    <span className="w-12 font-mono text-sm font-semibold text-foreground">
                      {s.ticker}
                    </span>
                    <span className="flex-1 truncate text-sm text-muted-foreground">
                      {s.name}
                    </span>
                    {s.hasReport ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
                        <FileText className="size-3" /> Báo cáo
                      </span>
                    ) : up != null ? (
                      <span className="shrink-0 font-mono text-xs font-medium text-positive">
                        {fmtPct(up, 0)}
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export function QuickJump() {
  const { reports } = useReports()
  const tickers = useMemo(() => reportTickers(reports), [reports])
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Truy cập nhanh:</span>
      {tickers.map((t) => (
        <Link
          key={t}
          href={reportHref(t)}
          title={`Mở báo cáo phân tích ${t}`}
          className="inline-flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 font-mono text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <FileText className="size-3 text-primary" />
          {t}
        </Link>
      ))}
    </div>
  )
}
