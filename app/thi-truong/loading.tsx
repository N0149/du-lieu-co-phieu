import { SiteHeader } from '@/components/site-header'

export default function MarketLoading() {
  return (
    <div className="min-h-screen bg-[#0f1218] text-[#F0F3F6] flex flex-col">
      <SiteHeader />

      <main className="flex-1 mx-auto w-full max-w-[1720px] px-3 sm:px-6 py-6 space-y-6">
        {/* World Market Horizontal Ticker Strip Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="rounded-xl border border-white/8 bg-[#141822] p-3 space-y-2">
              <div className="flex justify-between items-center">
                <div className="h-3 w-16 rounded bg-white/10 animate-pulse" />
                <div className="h-3 w-8 rounded bg-white/5 animate-pulse" />
              </div>
              <div className="h-5 w-20 rounded bg-white/15 animate-pulse" />
              <div className="h-3 w-12 rounded bg-emerald-500/20 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Tab switcher Skeleton */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <div className="h-8 w-32 rounded-lg bg-emerald-500/15 border border-emerald-500/30 animate-pulse" />
          <div className="h-8 w-28 rounded-lg bg-white/5 animate-pulse" />
          <div className="h-8 w-36 rounded-lg bg-white/5 animate-pulse" />
          <div className="h-8 w-28 rounded-lg bg-white/5 animate-pulse" />
        </div>

        {/* Valuation Chart Skeleton */}
        <div className="rounded-2xl border border-white/8 bg-[#141822] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1.5">
              <div className="h-5 w-48 rounded bg-white/10 animate-pulse" />
              <div className="h-3 w-64 rounded bg-white/5 animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="h-7 w-12 rounded bg-white/5 animate-pulse" />
              <div className="h-7 w-12 rounded bg-white/5 animate-pulse" />
              <div className="h-7 w-12 rounded bg-white/5 animate-pulse" />
              <div className="h-7 w-14 rounded bg-emerald-500/20 animate-pulse" />
            </div>
          </div>
          <div className="h-[380px] w-full rounded-xl bg-[#0f1218] border border-white/5 flex items-center justify-center animate-pulse">
            <div className="text-xs text-muted-foreground">Đang tải biểu đồ định giá...</div>
          </div>
        </div>

        {/* Reports & Margin Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/8 bg-[#141822] p-5 space-y-3">
            <div className="h-5 w-40 rounded bg-white/10 animate-pulse" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-3 rounded-lg border border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="h-4 w-60 rounded bg-white/10 animate-pulse" />
                  <div className="h-3 w-32 rounded bg-white/5 animate-pulse" />
                </div>
                <div className="h-4 w-12 rounded bg-white/10 animate-pulse" />
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#141822] p-5 space-y-3">
            <div className="h-5 w-44 rounded bg-white/10 animate-pulse" />
            <div className="h-52 rounded-xl bg-[#0f1218] border border-white/5 animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  )
}
