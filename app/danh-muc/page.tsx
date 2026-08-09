import Link from 'next/link'
import { ArrowUpRight, Star } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { StatusTag } from '@/components/badges'
import { stocks, upside, marginOfSafety } from '@/lib/data'
import { fmtPrice, fmtNum, fmtPct } from '@/lib/format'

const WATCH = ['DAN', 'LHG', 'SNZ', 'VNF', 'DC4', 'NT2']

export default function WatchlistPage() {
  const list = WATCH.map((t) => stocks.find((s) => s.ticker === t)!).filter(Boolean)

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-[1600px] px-4 py-6">
        <div className="mb-5 border-b border-border pb-5">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-primary">
            <Star className="size-3.5" /> Theo dõi
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            Danh Mục Theo Dõi
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Các cổ phiếu giá trị trọng tâm đang được theo dõi sát để chờ điểm giải ngân trong vùng biên an toàn.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => {
            const up = upside(s)
            const mos = marginOfSafety(s)
            return (
              <Link
                key={s.ticker}
                href={`/ticker/${s.ticker}`}
                className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold text-foreground">{s.ticker}</span>
                      <span className="rounded bg-secondary px-1 py-0.5 text-[10px] text-muted-foreground">
                        {s.exchange}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{s.name}</p>
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Thị giá</p>
                    <p className="font-mono text-sm font-semibold text-foreground">{fmtPrice(s.marketPrice)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">RNAV</p>
                    <p className="font-mono text-sm font-semibold text-foreground">{fmtPrice(s.rnav)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Upside</p>
                    <p className="font-mono text-sm font-semibold text-positive">{fmtPct(up, 0)}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">
                    Cổ tức {fmtNum(s.dividendYield, 1)}% · Biên AT {fmtNum(mos, 0)}%
                  </span>
                </div>
                <div className="mt-2">
                  <StatusTag updated={s.updated} label={s.status} />
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
