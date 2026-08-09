'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  RotateCcw,
  Filter,
} from 'lucide-react'
import { stocks, upside, priceToRnav, SECTORS, type Stock } from '@/lib/data'
import { fmtPrice, fmtNum, fmtPct, fmtInt } from '@/lib/format'
import { StatusTag } from '@/components/badges'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type SortKey =
  | 'ticker'
  | 'sector'
  | 'marketPrice'
  | 'rnav'
  | 'upside'
  | 'forwardPE'
  | 'dividendYield'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 8

function FilterRow({
  label,
  enabled,
  onToggle,
  children,
  hint,
}: {
  label: string
  enabled: boolean
  onToggle: (v: boolean) => void
  children: React.ReactNode
  hint: string
}) {
  return (
    <div
      className={cn(
        'rounded-md border p-3 transition-colors',
        enabled ? 'border-primary/40 bg-accent/40' : 'border-border bg-card',
      )}
    >
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="size-3.5 accent-[var(--primary)]"
        />
        <span className="text-sm font-medium text-foreground">{label}</span>
      </label>
      <p className="mt-1 mb-2 pl-5.5 text-[11px] text-muted-foreground">{hint}</p>
      <div className={cn('pl-5.5', !enabled && 'pointer-events-none opacity-40')}>{children}</div>
    </div>
  )
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[var(--primary)]"
    />
  )
}

export function Screener() {
  const router = useRouter()

  const [peOn, setPeOn] = useState(true)
  const [pe, setPe] = useState(7)
  const [prOn, setPrOn] = useState(true)
  const [pr, setPr] = useState(0.5)
  const [divOn, setDivOn] = useState(true)
  const [div, setDiv] = useState(8.6)
  const [sector, setSector] = useState<string>(SECTORS[0])

  const [sortKey, setSortKey] = useState<SortKey>('upside')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const rows = stocks.filter((s) => {
      if (peOn && s.forwardPE >= pe) return false
      if (prOn && priceToRnav(s) >= pr) return false
      if (divOn && s.dividendYield <= div) return false
      if (sector !== SECTORS[0] && s.sector !== sector) return false
      return true
    })

    const val = (s: Stock): number | string => {
      switch (sortKey) {
        case 'ticker':
          return s.ticker
        case 'sector':
          return s.sector
        case 'marketPrice':
          return s.marketPrice
        case 'rnav':
          return s.rnav
        case 'upside':
          return upside(s)
        case 'forwardPE':
          return s.forwardPE
        case 'dividendYield':
          return s.dividendYield
      }
    }

    return [...rows].sort((a, b) => {
      const av = val(a)
      const bv = val(b)
      let cmp = 0
      if (typeof av === 'string' && typeof bv === 'string') cmp = av.localeCompare(bv)
      else cmp = (av as number) - (bv as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [peOn, pe, prOn, pr, divOn, div, sector, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'ticker' || key === 'sector' ? 'asc' : 'desc')
    }
    setPage(1)
  }

  function reset() {
    setPeOn(true)
    setPe(7)
    setPrOn(true)
    setPr(0.5)
    setDivOn(true)
    setDiv(8.6)
    setSector(SECTORS[0])
    setPage(1)
  }

  const avgUpside =
    filtered.length > 0
      ? filtered.reduce((acc, s) => acc + upside(s), 0) / filtered.length
      : 0

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
      {/* Filter panel */}
      <aside className="lg:sticky lg:top-[4.75rem] lg:self-start">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Bộ lọc định giá</h2>
            </div>
            <button
              onClick={reset}
              className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="size-3" /> Đặt lại
            </button>
          </div>

          <div className="flex flex-col gap-2.5 p-3">
            <FilterRow
              label="Forward P/E"
              hint="Chỉ hiển thị cổ phiếu có P/E tương lai thấp hơn ngưỡng."
              enabled={peOn}
              onToggle={(v) => {
                setPeOn(v)
                setPage(1)
              }}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tối đa</span>
                <span className="font-mono font-semibold text-foreground">
                  &lt; {fmtNum(pe, 1)}
                </span>
              </div>
              <Slider value={pe} min={3} max={15} step={0.5} onChange={(v) => { setPe(v); setPage(1) }} />
            </FilterRow>

            <FilterRow
              label="Giá / RNAV"
              hint="Tỷ lệ giá thị trường trên giá trị tài sản ròng điều chỉnh."
              enabled={prOn}
              onToggle={(v) => {
                setPrOn(v)
                setPage(1)
              }}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tối đa</span>
                <span className="font-mono font-semibold text-foreground">
                  &lt; {fmtNum(pr, 2)}x
                </span>
              </div>
              <Slider value={pr} min={0.2} max={1.2} step={0.05} onChange={(v) => { setPr(v); setPage(1) }} />
            </FilterRow>

            <FilterRow
              label="Tỷ suất cổ tức"
              hint="Cổ tức tiền mặt trên thị giá, tối thiểu theo ngưỡng."
              enabled={divOn}
              onToggle={(v) => {
                setDivOn(v)
                setPage(1)
              }}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tối thiểu</span>
                <span className="font-mono font-semibold text-foreground">
                  &gt; {fmtNum(div, 1)}%
                </span>
              </div>
              <Slider value={div} min={0} max={15} step={0.1} onChange={(v) => { setDiv(v); setPage(1) }} />
            </FilterRow>

            <div className="rounded-md border border-border bg-card p-3">
              <div className="mb-2 flex items-center gap-2">
                <Filter className="size-3.5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Ngành nghề</span>
              </div>
              <select
                value={sector}
                onChange={(e) => {
                  setSector(e.target.value)
                  setPage(1)
                }}
                className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px border-t border-border bg-border">
            <div className="bg-card p-3">
              <p className="text-[11px] text-muted-foreground">Số cổ phiếu đạt lọc</p>
              <p className="mt-0.5 font-mono text-lg font-bold text-foreground">
                {fmtInt(filtered.length)}
              </p>
            </div>
            <div className="bg-card p-3">
              <p className="text-[11px] text-muted-foreground">Upside trung bình</p>
              <p className="mt-0.5 font-mono text-lg font-bold text-positive">
                {fmtPct(avgUpside, 0)}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Table */}
      <section className="min-w-0">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/60 text-left">
                  <Th onClick={() => toggleSort('ticker')} active={sortKey === 'ticker'} dir={sortDir}>
                    Mã CK
                  </Th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Tên doanh nghiệp
                  </th>
                  <Th onClick={() => toggleSort('sector')} active={sortKey === 'sector'} dir={sortDir}>
                    Ngành
                  </Th>
                  <Th onClick={() => toggleSort('marketPrice')} active={sortKey === 'marketPrice'} dir={sortDir} right>
                    Giá TT
                  </Th>
                  <Th onClick={() => toggleSort('rnav')} active={sortKey === 'rnav'} dir={sortDir} right>
                    RNAV
                  </Th>
                  <Th onClick={() => toggleSort('upside')} active={sortKey === 'upside'} dir={sortDir} right>
                    Upside
                  </Th>
                  <Th onClick={() => toggleSort('forwardPE')} active={sortKey === 'forwardPE'} dir={sortDir} right>
                    P/E FW
                  </Th>
                  <Th onClick={() => toggleSort('dividendYield')} active={sortKey === 'dividendYield'} dir={sortDir} right>
                    Cổ tức
                  </Th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((s, i) => {
                  const up = upside(s)
                  return (
                    <tr
                      key={s.ticker}
                      onClick={() => router.push(`/ticker/${s.ticker}`)}
                      className={cn(
                        'cursor-pointer border-b border-border/70 transition-colors hover:bg-accent/50',
                        i % 2 === 1 && 'bg-muted/40',
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-foreground">{s.ticker}</span>
                          <span className="rounded bg-secondary px-1 py-0.5 text-[10px] text-muted-foreground">
                            {s.exchange}
                          </span>
                        </div>
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-2.5 text-foreground">{s.name}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{s.sector}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-foreground">
                        {fmtPrice(s.marketPrice)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-foreground">
                        {fmtPrice(s.rnav)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span
                          className={cn(
                            'inline-block rounded px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums',
                            up >= 100
                              ? 'bg-positive-muted text-positive'
                              : up >= 0
                                ? 'text-positive'
                                : 'text-negative',
                          )}
                        >
                          {fmtPct(up, 0)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-foreground">
                        {fmtNum(s.forwardPE, 1)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-positive">
                        {fmtNum(s.dividendYield, 1)}%
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusTag updated={s.updated} label={s.status} />
                      </td>
                    </tr>
                  )
                })}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-12 text-center text-sm text-muted-foreground">
                      Không có cổ phiếu nào thỏa mãn bộ lọc. Hãy nới lỏng tiêu chí.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border px-3 py-2.5">
            <p className="text-xs text-muted-foreground">
              Hiển thị{' '}
              <span className="font-mono text-foreground">
                {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, filtered.length)}
              </span>{' '}
              trên <span className="font-mono text-foreground">{filtered.length}</span> mã
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                aria-label="Trang trước"
              >
                <ChevronLeft className="size-4" />
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <Button
                  key={i}
                  variant={safePage === i + 1 ? 'default' : 'outline'}
                  size="icon-sm"
                  onClick={() => setPage(i + 1)}
                  className="font-mono"
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                aria-label="Trang sau"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function Th({
  children,
  onClick,
  active,
  dir,
  right,
}: {
  children: React.ReactNode
  onClick: () => void
  active: boolean
  dir: SortDir
  right?: boolean
}) {
  return (
    <th className="px-3 py-2.5">
      <button
        onClick={onClick}
        className={cn(
          'flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors',
          right && 'ml-auto flex-row-reverse',
          active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {children}
        {active ? (
          dir === 'asc' ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-50" />
        )}
      </button>
    </th>
  )
}
