import { Suspense } from 'react'
import { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { MarketTabsContainer } from '@/components/market/MarketTabsContainer'
import { fetchWorldMarketData } from '@/lib/market-service'
import { getPePbRawData, filterValuationData } from '@/lib/pe-pb-service'
import { fetchMarketReports } from '@/lib/reports-service'
import { getCtckFullData } from '@/lib/ctck-service'

// Tối ưu hóa bộ nhớ đệm CDN Edge Vercel (ISR) 60 giây:
// Giúp trang tải tức thì < 50ms cho người dùng, tự động cập nhật nền định kỳ 1 phút
export const revalidate = 60

export const metadata: Metadata = {
  title: 'Thị Trường Tài Chính, Định Giá & Dư Nợ Margin CTCK | Dữ Liệu Đầu Tư',
  description:
    'Theo dõi biến động thị trường thế giới, hàng hóa, tỷ giá, biểu đồ định giá P/E, P/B VN-Index, báo cáo phân tích và thống kê dư nợ Margin 41 CTCK niêm yết.',
}

export default async function MarketPage() {
  // Chạy song song tất cả các nguồn dữ liệu bằng Promise.allSettled để đạt tốc độ tối đa
  const [worldDataRes, rawPePbRes, reportsRes, ctckDataRes] = await Promise.allSettled([
    fetchWorldMarketData(),
    getPePbRawData(),
    fetchMarketReports(1, 20),
    Promise.resolve().then(() => getCtckFullData()),
  ])

  // 1. Dữ liệu Hàng 1: Thế giới, Hàng hóa, Tỷ giá, Vàng, Crypto (SSR)
  const initialWorldData = worldDataRes.status === 'fulfilled' ? worldDataRes.value : null

  // 2. Dữ liệu Hàng 2: Định giá VN-Index P/E, P/B từ 2005 (SSR khung 10Y mặc định)
  let initialValuation = null
  if (rawPePbRes.status === 'fulfilled' && rawPePbRes.value) {
    try {
      initialValuation = filterValuationData(rawPePbRes.value, '10y')
    } catch (err) {
      console.error('[MarketPage SSR] Error filtering PE-PB data:', err)
    }
  }

  // 3. Dữ liệu Báo cáo thị trường (SSR Trang 1)
  const initialReports = reportsRes.status === 'fulfilled' ? reportsRes.value : null

  // 4. Dữ liệu Thống kê CTCK (SSR)
  const initialCtckData = ctckDataRes.status === 'fulfilled' ? ctckDataRes.value : null

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-[#0f1218] pb-16 text-[#F0F3F6]">
        <div className="mx-auto max-w-[1720px] px-3 sm:px-6">
          <Suspense
            fallback={
              <div className="flex h-96 items-center justify-center text-xs text-[#8B98A5]">
                Đang tải dữ liệu thị trường và báo cáo...
              </div>
            }
          >
            <MarketTabsContainer
              initialWorldData={initialWorldData}
              initialValuation={initialValuation}
              initialReports={initialReports}
              initialCtckData={initialCtckData}
            />
          </Suspense>
        </div>
      </main>
    </>
  )
}
