import { SiteHeader } from '@/components/site-header'

export default function BoLocLoading() {
  return (
    <div className="min-h-screen bg-[#0f1218] text-foreground flex flex-col">
      <SiteHeader />

      <main className="flex-1 flex flex-col">
        {/* 1. TOP BAR SKELETON */}
        <div className="h-14 border-b border-white/10 bg-[#121620] px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-28 rounded bg-white/5 animate-pulse" />
            <div className="h-8 w-36 rounded bg-white/5 animate-pulse" />
            <div className="h-8 w-44 rounded bg-white/5 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 rounded bg-white/5 animate-pulse" />
            <div className="h-8 w-20 rounded bg-white/5 animate-pulse" />
          </div>
        </div>

        {/* 2. 3-COLUMN FILTER PANELS SKELETON */}
        <div className="flex flex-col lg:flex-row border-b border-white/10 bg-[#0f1218] h-auto lg:h-[450px]">
          {/* Cột 1: Cây chỉ tiêu */}
          <div className="w-full lg:w-[380px] xl:w-[420px] border-b lg:border-b-0 lg:border-r border-white/10 p-4 space-y-3">
            <div className="h-8 w-full rounded bg-white/5 animate-pulse mb-4" />
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <div className="h-4 w-40 rounded bg-white/5 animate-pulse" />
                <div className="h-4 w-8 rounded bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>

          {/* Cột 2: Điều kiện lọc */}
          <div className="flex-1 p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="h-5 w-48 rounded bg-white/5 animate-pulse" />
              <div className="h-7 w-24 rounded bg-emerald-500/20 animate-pulse" />
            </div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-3 rounded-lg border border-white/5 bg-white/[0.02] space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-32 rounded bg-white/5 animate-pulse" />
                  <div className="h-4 w-16 rounded bg-white/5 animate-pulse" />
                </div>
                <div className="h-2 w-full rounded bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>

          {/* Cột 3: Bộ lọc đã lưu */}
          <div className="w-full lg:w-64 xl:w-72 bg-[#141822] p-4 space-y-3">
            <div className="h-5 w-28 rounded bg-white/5 animate-pulse" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 rounded bg-white/5 animate-pulse" />
            ))}
          </div>
        </div>

        {/* 3. TABLE SKELETON */}
        <div className="p-4 flex-1">
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-40 rounded bg-white/5 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-7 w-20 rounded bg-white/5 animate-pulse" />
              <div className="h-7 w-20 rounded bg-white/5 animate-pulse" />
            </div>
          </div>
          <div className="rounded border border-white/10 overflow-hidden">
            <div className="h-10 bg-white/5 flex items-center px-4 gap-4">
              <div className="h-4 w-12 rounded bg-white/10 animate-pulse" />
              <div className="h-4 w-28 rounded bg-white/10 animate-pulse" />
              <div className="h-4 w-20 rounded bg-white/10 animate-pulse" />
              <div className="h-4 w-20 rounded bg-white/10 animate-pulse" />
              <div className="h-4 w-20 rounded bg-white/10 animate-pulse" />
            </div>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-11 border-t border-white/5 flex items-center px-4 gap-4">
                <div className="h-4 w-10 rounded bg-white/5 animate-pulse" />
                <div className="h-4 w-32 rounded bg-white/5 animate-pulse" />
                <div className="h-4 w-16 rounded bg-white/5 animate-pulse" />
                <div className="h-4 w-16 rounded bg-white/5 animate-pulse" />
                <div className="h-4 w-16 rounded bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
