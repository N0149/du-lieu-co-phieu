import { SiteHeader } from '@/components/site-header'

export default function DauThauLoading() {
  return (
    <div className="min-h-screen bg-[#0f1218] text-[#F0F3F6] flex flex-col">
      <SiteHeader />

      <main className="flex-1 mx-auto w-full max-w-[1600px] px-4 py-8 space-y-6">
        {/* Banner Skeleton */}
        <div className="rounded-2xl border border-white/8 bg-[#141822] p-6 space-y-4">
          <div className="space-y-2">
            <div className="h-6 w-72 rounded bg-white/10 animate-pulse" />
            <div className="h-4 w-full max-w-xl rounded bg-white/5 animate-pulse" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl bg-[#0f1218] border border-white/5 p-3 space-y-2">
                <div className="h-3 w-28 rounded bg-white/5 animate-pulse" />
                <div className="h-6 w-28 rounded bg-white/15 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Tab Switcher Skeleton */}
        <div className="flex gap-2 border-b border-white/10 pb-3">
          <div className="h-9 w-44 rounded-lg bg-emerald-500/15 border border-emerald-500/30 animate-pulse" />
          <div className="h-9 w-48 rounded-lg bg-white/5 animate-pulse" />
          <div className="h-9 w-40 rounded-lg bg-white/5 animate-pulse" />
        </div>

        {/* Table / Cards Skeleton */}
        <div className="rounded-2xl border border-white/8 bg-[#141822] p-5 space-y-3">
          <div className="h-5 w-48 rounded bg-white/10 animate-pulse mb-4" />
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg border border-white/5 bg-[#0f1218] animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
