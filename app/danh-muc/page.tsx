import type { Metadata } from 'next'
import { Star } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { WatchlistManager } from '@/components/watchlist/WatchlistManager'
import { getAllStocks } from '@/lib/longlivestock'
import { stocks, upside, marginOfSafety } from '@/lib/data'
import { getUserWatchlist } from '@/lib/watchlist-service'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Danh Mục Theo Dõi (Watchlist) · Dữ Liệu Đầu Tư',
  description: 'Tự tạo và quản lý danh mục cổ phiếu theo dõi cá nhân, đồng bộ tức thì trên mọi thiết bị.',
}

export default async function WatchlistPage() {
  const allStocks = getAllStocks()

  // 1. Tải trước Watchlist từ Server (SSR) để hiển thị tức thì 0ms, triệt tiêu hoàn toàn spinner
  const serverWatchlist = await getUserWatchlist()
  const initialTickers = serverWatchlist.items.map((it) => it.ticker)
  const initialUser = serverWatchlist.isAuthenticated
    ? { email: serverWatchlist.userEmail || '', id: serverWatchlist.userId || '' }
    : null

  // 2. Thu nhỏ payload manifest gửi sang Client
  const allManifestStocks = allStocks.map((s) => ({
    t: s.t,
    n: s.n,
    e: s.e,
    px: s.px,
    pe: s.pe,
    pb: s.pb,
    roe: s.roe,
    dy: s.dy ?? null,
    w1: s.w1 ?? null,
  }))

  // 3. Map thông tin cổ phiếu định giá chuyên sâu
  const curatedStocks: Record<
    string,
    { rnav: number; upside: number; mos: number; status: string; updated: boolean }
  > = {}

  for (const s of stocks) {
    curatedStocks[s.ticker] = {
      rnav: s.rnav,
      upside: upside(s),
      mos: marginOfSafety(s),
      status: s.status,
      updated: s.updated,
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <SiteHeader />
      <main className="mx-auto max-w-[1600px] px-3 sm:px-6 py-6">
        <div className="mb-6 border-b border-white/8 pb-5">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-400">
            <Star className="size-3.5 fill-emerald-400 text-emerald-400" /> Watchlist
          </p>
          <h1 className="text-2xl font-black tracking-tight text-white lg:text-3xl">
            Danh Mục Theo Dõi Cá Nhân
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-[#9EACB9] leading-relaxed">
            Thêm, theo dõi và quản lý các cổ phiếu bạn quan tâm với dữ liệu định giá, thị giá và chỉ số tài chính cập nhật tự động.
          </p>
        </div>

        <WatchlistManager
          allManifestStocks={allManifestStocks}
          curatedStocks={curatedStocks}
          initialTickers={initialTickers}
          initialUser={initialUser}
        />
      </main>
    </div>
  )
}
