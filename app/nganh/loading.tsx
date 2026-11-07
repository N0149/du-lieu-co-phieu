import { SiteHeader } from '@/components/site-header'

export default function IndustryLoading() {
  return (
    <div className="min-h-screen bg-[#0f1218] text-[#F0F3F6] flex flex-col">
      <SiteHeader />

      <main className="flex-1 mx-auto w-full max-w-[1720px] px-3 sm:px-6 py-6 space-y-6">
        {/* Industry Market Summary Strip Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-white/8 bg-[#141822] p-4 space-y-2">
              <div className="h-3 w-20 rounded bg-white/10 animate-pulse" />
              <div className="h-6 w-24 rounded bg-white/15 animate-pulse" />
              <div className="h-3 w-16 rounded bg-emerald-500/20 animate-pulse" />
            </div>
          ))}
        </div>

        {/* View Mode & Filter Controls Skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-32 rounded-lg bg-emerald-500/15 border border-emerald-500/30 animate-pulse" />
            <div className="h-9 w-28 rounded-lg bg-white/5 animate-pulse" />
            <div className="h-9 w-28 rounded-lg bg-white/5 animate-pulse" />
          </div>
          <div className="h-9 w-48 rounded-lg bg-white/5 animate-pulse" />
        </div>

        {/* 19 Sectors Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="rounded-xl border border-white/8 bg-[#141822] p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <div className="h-4 w-32 rounded bg-white/10 animate-pulse" />
                  <div className="h-3 w-20 rounded bg-white/5 animate-pulse" />
                </div>
                <div className="h-5 w-14 rounded-full bg-emerald-500/10 animate-pulse" />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                <div className="h-3 w-16 rounded bg-white/5 animate-pulse" />
                <div className="h-3 w-16 rounded bg-white/5 animate-pulse ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
