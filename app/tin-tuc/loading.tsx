import { SiteHeader } from '@/components/site-header'

export default function TinTucLoading() {
  return (
    <div className="min-h-screen bg-[#0f1218] text-[#F0F3F6] flex flex-col">
      <SiteHeader />

      <main className="flex-1 mx-auto w-full max-w-[1720px] px-3 sm:px-6 py-4 space-y-4">
        {/* News Top Filter Tabs Skeleton */}
        <div className="flex items-center gap-2 overflow-x-hidden border-b border-white/10 pb-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`h-8 rounded-lg animate-pulse ${
                i === 0
                  ? 'w-24 bg-emerald-500/15 border border-emerald-500/30'
                  : 'w-28 bg-white/5'
              }`}
            />
          ))}
        </div>

        {/* News Feed Stream Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-3">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/8 bg-[#141822] p-4 flex gap-4 items-start"
              >
                <div className="size-16 sm:size-20 rounded-lg bg-white/5 shrink-0 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-16 rounded bg-emerald-500/15 animate-pulse" />
                    <div className="h-3 w-20 rounded bg-white/5 animate-pulse" />
                  </div>
                  <div className="h-4 w-full max-w-xl rounded bg-white/10 animate-pulse" />
                  <div className="h-3 w-3/4 rounded bg-white/5 animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          {/* Right Sidebar Widget Skeleton */}
          <div className="hidden lg:block space-y-4">
            <div className="rounded-xl border border-white/8 bg-[#141822] p-4 space-y-3">
              <div className="h-4 w-32 rounded bg-white/10 animate-pulse" />
              {[...Array(5)].map((_, i) => (
                <div key={i} className="py-2 border-t border-white/5 flex justify-between">
                  <div className="h-3 w-24 rounded bg-white/5 animate-pulse" />
                  <div className="h-3 w-12 rounded bg-white/5 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
