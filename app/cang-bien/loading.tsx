import { SiteHeader } from '@/components/site-header'

export default function CangBienLoading() {
  return (
    <div className="min-h-screen bg-[#0f1218] text-[#F0F3F6] flex flex-col">
      <SiteHeader />

      <main className="flex-1 mx-auto w-full max-w-[1720px] px-3 sm:px-6 py-6 space-y-6">
        {/* Maritime KPI Banner Skeleton */}
        <div className="rounded-2xl border border-white/8 bg-[#141822] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="h-6 w-64 rounded bg-white/10 animate-pulse" />
              <div className="h-4 w-96 rounded bg-white/5 animate-pulse" />
            </div>
            <div className="h-8 w-36 rounded-lg bg-teal-500/10 border border-teal-500/20 animate-pulse" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl bg-[#0f1218] border border-white/5 p-3 space-y-2">
                <div className="h-3 w-28 rounded bg-white/5 animate-pulse" />
                <div className="h-6 w-32 rounded bg-white/15 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Port Authorities Strip Skeleton */}
        <div className="flex gap-3 overflow-x-hidden pb-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-56 shrink-0 rounded-xl border border-white/8 bg-[#141822] p-4 space-y-2">
              <div className="h-4 w-32 rounded bg-white/10 animate-pulse" />
              <div className="h-3 w-20 rounded bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Stock Grid & Live Calls Table Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-white/8 bg-[#141822] p-5 space-y-4">
            <div className="h-5 w-48 rounded bg-white/10 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-xl border border-white/5 bg-[#0f1218] p-3 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-16 rounded bg-white/10 animate-pulse" />
                    <div className="h-4 w-12 rounded bg-emerald-500/20 animate-pulse" />
                  </div>
                  <div className="h-3 w-32 rounded bg-white/5 animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#141822] p-5 space-y-4">
            <div className="h-5 w-40 rounded bg-white/10 animate-pulse" />
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg border border-white/5 bg-[#0f1218] animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
