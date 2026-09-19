export default function StockDetailLoading() {
  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#c9d1d9] antialiased">
      {/* Top Navigation Bar Skeleton */}
      <div className="border-b border-[#1f242d] bg-[#0d1117]/80 backdrop-blur sticky top-0 z-30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-[#1a2130] animate-pulse" />
            <div className="h-6 w-20 rounded-md bg-[#1a2130] animate-pulse" />
            <div className="hidden sm:block h-4 w-40 rounded-md bg-[#161b26] animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 rounded-lg bg-[#1a2130] animate-pulse" />
            <div className="h-8 w-8 rounded-lg bg-[#1a2130] animate-pulse" />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-5 space-y-5">
        {/* Header Profile & Valuation Banner Skeleton */}
        <div className="rounded-xl border border-[#1f242d] bg-[#11151f] p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="size-12 rounded-xl bg-[#1c2436] animate-pulse shrink-0" />
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-20 rounded-md bg-[#1c2436] animate-pulse" />
                  <div className="h-5 w-14 rounded-full bg-[#182030] animate-pulse" />
                  <div className="h-5 w-24 rounded-full bg-[#182030] animate-pulse" />
                </div>
                <div className="h-4 w-56 rounded bg-[#161b26] animate-pulse" />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right space-y-1.5">
                <div className="h-8 w-28 rounded bg-[#1c2436] animate-pulse ml-auto" />
                <div className="h-4 w-20 rounded bg-[#161b26] animate-pulse ml-auto" />
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar Skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-2 border-t border-[#1a2130]">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-lg bg-[#151a26] border border-[#1e2738] p-2.5 space-y-1.5">
                <div className="h-3 w-14 rounded bg-[#1f283a] animate-pulse" />
                <div className="h-5 w-20 rounded bg-[#243047] animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Tab Navigation Skeleton */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={`h-9 rounded-lg animate-pulse shrink-0 ${
                i === 0 ? 'w-28 bg-[#1e293b]' : 'w-24 bg-[#141924]'
              }`}
            />
          ))}
        </div>

        {/* Main Chart / Content Area Skeleton */}
        <div className="rounded-xl border border-[#1f242d] bg-[#11151f] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-44 rounded bg-[#1c2436] animate-pulse" />
            <div className="flex items-center gap-2">
              <div className="h-7 w-16 rounded bg-[#161b26] animate-pulse" />
              <div className="h-7 w-16 rounded bg-[#161b26] animate-pulse" />
            </div>
          </div>

          {/* Large Chart Canvas Skeleton */}
          <div className="h-[360px] w-full rounded-lg bg-[#0e121a] border border-[#181f2c] flex items-center justify-center relative overflow-hidden">
            <div className="flex flex-col items-center gap-2 text-[#475569]">
              <div className="h-4 w-32 rounded bg-[#182030] animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
