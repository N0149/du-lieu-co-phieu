'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, CornerDownLeft } from 'lucide-react'
import { stocks, upside } from '@/lib/data'
import { fmtPct } from '@/lib/format'
import { cn } from '@/lib/utils'

const QUICK = ['DAN', 'LHG', 'SNZ', 'VNF', 'DC4', 'NT2']

export function StockSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return stocks.slice(0, 6)
    return stocks
      .filter(
        (s) =>
          s.ticker.toLowerCase().includes(term) ||
          s.name.toLowerCase().includes(term),
      )
      .slice(0, 8)
  }, [q])

  function go(ticker: string) {
    setOpen(false)
    setQ('')
    inputRef.current?.blur()
    router.push(`/ticker/${ticker}`)
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
      const pick = results[active]
      if (pick) go(pick.ticker)
    } else if (e.key === 'Escape') {
      setOpen(false)
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
              const up = upside(s)
              return (
                <li key={s.ticker} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(s.ticker)}
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
                    <span className="shrink-0 font-mono text-xs font-medium text-positive">
                      {fmtPct(up, 0)}
                    </span>
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
  const router = useRouter()
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Truy cập nhanh:</span>
      {QUICK.map((t) => (
        <button
          key={t}
          onClick={() => router.push(`/ticker/${t}`)}
          className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {t}
        </button>
      ))}
    </div>
  )
}
