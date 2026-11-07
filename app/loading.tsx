import { SiteHeader } from '@/components/site-header'

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#0f1218] text-[#F0F3F6] flex flex-col">
      <SiteHeader />

      <main className="flex-1 mx-auto w-full max-w-[1720px] px-3 sm:px-6 py-6 space-y-6">
        {/* Banner Skeleton */}
        <div className="rounded-2xl border border-white/8 bg-[#141822] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 w-48 rounded-md bg-white/10 animate-pulse" />
              <div className="h-4 w-80 rounded-md bg-white/5 animate-pulse" />
            </div>
            <div className="h-8 w-28 rounded-lg bg-emerald-500/10 border border-emerald-500/20 animate-pulse" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl bg-[#0f1218] border border-white/5 p-3 space-y-2">
                <div className="h-3 w-20 rounded bg-white/5 animate-pulse" />
                <div className="h-5 w-28 rounded bg-white/10 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Content Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-white/8 bg-[#141822] p-6 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div className="h-5 w-36 rounded bg-white/10 animate-pulse" />
              <div className="h-4 w-20 rounded bg-white/5 animate-pulse" />
            </div>
            <div className="h-64 rounded-xl bg-[#0f1218] border border-white/5 animate-pulse" />
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#141822] p-6 space-y-4">
            <div className="h-5 w-32 rounded bg-white/10 animate-pulse mb-4" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-3 rounded-lg border border-white/5 bg-white/[0.02] space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-28 rounded bg-white/5 animate-pulse" />
                  <div className="h-4 w-12 rounded bg-white/10 animate-pulse" />
                </div>
                <div className="h-2 w-full rounded bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
