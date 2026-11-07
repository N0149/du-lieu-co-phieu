import { SiteHeader } from '@/components/site-header'

export default function BaoCaoLoading() {
  return (
    <div className="min-h-screen bg-[#0f1218] text-[#F0F3F6] flex flex-col">
      <SiteHeader />

      <main className="flex-1 mx-auto w-full max-w-[1720px] px-3 sm:px-6 py-6 space-y-6">
        {/* Banner Skeleton */}
        <div className="rounded-2xl border border-white/8 bg-[#141822] p-6 space-y-3">
          <div className="h-6 w-60 rounded bg-white/10 animate-pulse" />
          <div className="h-4 w-96 rounded bg-white/5 animate-pulse" />
        </div>

        {/* Filter Toolbar Skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-36 rounded-lg bg-emerald-500/15 border border-emerald-500/30 animate-pulse" />
            <div className="h-9 w-36 rounded-lg bg-white/5 animate-pulse" />
            <div className="h-9 w-32 rounded-lg bg-white/5 animate-pulse" />
          </div>
          <div className="h-9 w-60 rounded-lg bg-white/5 animate-pulse" />
        </div>

        {/* Reports Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="rounded-xl border border-white/8 bg-[#141822] p-5 space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 w-20 rounded bg-emerald-500/20 animate-pulse" />
                <div className="h-3 w-16 rounded bg-white/5 animate-pulse" />
              </div>
              <div className="h-5 w-full rounded bg-white/10 animate-pulse" />
              <div className="h-3 w-4/5 rounded bg-white/5 animate-pulse" />
              <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                <div className="h-3 w-24 rounded bg-white/5 animate-pulse" />
                <div className="h-4 w-16 rounded bg-white/10 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
