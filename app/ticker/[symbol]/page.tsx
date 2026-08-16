import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { TickerTabs } from '@/components/ticker-tabs'
import { MosBadge, StatusTag } from '@/components/badges'
import { getStock, getDeepDive, upside, priceToRnav, marginOfSafety, stocks } from '@/lib/data'
import type { TickerReport, TickerReportContent } from '@/lib/report'
import { getTickerReport, getTickerContent } from '@/lib/report'
import { fmtPrice, fmtNum, fmtPct, fmtInt } from '@/lib/format'

export function generateStaticParams() {
  return stocks.map((s) => ({ symbol: s.ticker }))
}

export default async function TickerPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params
  const stock = getStock(symbol)
  if (!stock) notFound()

  const report = await getTickerReport(symbol)
  const reportContent = await getTickerContent(symbol)
  const dd = getDeepDive(stock)
  const up = upside(stock)
  const mos = marginOfSafety(stock)
  const pr = priceToRnav(stock)

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-[1600px] px-4 py-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Quay lại bộ lọc
        </Link>

        {/* Stock header */}
        <div className="rounded-lg border border-border bg-card p-4 lg:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
                  {stock.ticker}
                </h1>
                <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                  {stock.exchange}
                </span>
                <span className="text-lg text-muted-foreground">·</span>
                <span className="text-lg font-medium text-foreground">{stock.name}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
                  {stock.sector}
                </span>
                <StatusTag updated={stock.updated} label={stock.status} />
              </div>
            </div>
            <div className="lg:text-right">
              <MosBadge value={mos} />
            </div>
          </div>

          {/* Metric grid */}
          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-3 lg:grid-cols-6">
            <Metric label="Giá thị trường" value={fmtPrice(stock.marketPrice)} unit="nghìn đ" />
            <Metric label="Giá trị hợp lý RNAV" value={fmtPrice(stock.rnav)} unit="nghìn đ" accent />
            <Metric label="Tỷ lệ tăng giá" value={fmtPct(up, 0)} tone="positive" big />
            <Metric label="Giá / RNAV" value={`${fmtNum(pr, 2)}x`} />
            <Metric label="P/E tương lai" value={fmtNum(stock.forwardPE, 1)} />
            <Metric label="Tỷ suất cổ tức" value={`${fmtNum(stock.dividendYield, 1)}%`} tone="positive" />
          </div>

          {/* Price vs fair value bar */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Thị giá{' '}
                <span className="font-mono text-foreground">{fmtPrice(stock.marketPrice)}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-positive">
                <ArrowUpRight className="size-3.5" />
                Dư địa {fmtPct(up, 0)} tới RNAV
              </span>
              <span>
                RNAV <span className="font-mono text-foreground">{fmtPrice(stock.rnav)}</span>
              </span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, (stock.marketPrice / stock.rnav) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Vốn hóa thị trường: <span className="font-mono">{fmtInt(stock.marketCap)}</span> tỷ đồng
            </p>
          </div>
        </div>

        <TickerTabs
          stock={stock}
          dd={dd}
          report={report ?? undefined}
          reportContent={reportContent ?? undefined}
        />

        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Ghi chú: Số liệu mang tính minh họa. Đây không phải là khuyến nghị đầu tư.
        </p>
      </main>
    </div>
  )
}

function Metric({
  label,
  value,
  unit,
  tone,
  accent,
  big,
}: {
  label: string
  value: string
  unit?: string
  tone?: 'positive'
  accent?: boolean
  big?: boolean
}) {
  return (
    <div className={accent ? 'bg-accent p-3' : 'bg-card p-3'}>
      <p className={`text-[11px] ${accent ? 'text-accent-foreground/80' : 'text-muted-foreground'}`}>
        {label}
      </p>
      <p
        className={`mt-1 font-mono font-bold tabular-nums ${big ? 'text-xl' : 'text-lg'} ${
          tone === 'positive' ? 'text-positive' : accent ? 'text-primary' : 'text-foreground'
        }`}
      >
        {value}
        {unit && (
          <span className="ml-1 text-[11px] font-normal text-muted-foreground">{unit}</span>
        )}
      </p>
    </div>
  )
}
