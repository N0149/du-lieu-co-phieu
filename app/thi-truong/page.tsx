import { Suspense } from 'react'
import { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { MarketTabsContainer } from '@/components/market/MarketTabsContainer'
import { fetchWorldMarketData } from '@/lib/market-service'
import { getPePbRawData, filterValuationData } from '@/lib/pe-pb-service'
import { fetchMarketReports } from '@/lib/reports-service'
import { getCtckFullData } from '@/lib/ctck-service'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Thị Trường Tài Chính, Định Giá & Dư Nợ Margin CTCK | Dữ Liệu Đầu Tư',
  description:
    'Theo dõi biến động thị trường thế giới, hàng hóa, tỷ giá, biểu đồ định giá P/E, P/B VN-Index, báo cáo phân tích và thống kê dư nợ Margin 41 CTCK niêm yết.',
}

export default async function MarketPage() {
  // 1. Dữ liệu Hàng 1: Thế giới, Hàng hóa, Tỷ giá, Vàng, Crypto (SSR)
  const initialWorldData = await fetchWorldMarketData()

  // 2. Dữ liệu Hàng 2: Định giá VN-Index P/E, P/B từ 2005 (SSR khung 10Y mặc định)
  let initialValuation = null
  try {
    const rawPePb = await getPePbRawData()
    initialValuation = filterValuationData(rawPePb, '10y')
  } catch (err) {
    console.error('[MarketPage SSR] Error loading PE-PB data:', err)
  }

  // 3. Dữ liệu Báo cáo thị trường (SSR Trang 1)
  let initialReports = null
  try {
    initialReports = await fetchMarketReports(1, 20)
  } catch (err) {
    console.error('[MarketPage SSR] Error loading Reports data:', err)
  }

  // 4. Dữ liệu Thống kê CTCK (SSR)
  let initialCtckData = null
  try {
    initialCtckData = getCtckFullData()
  } catch (err) {
    console.error('[MarketPage SSR] Error loading CTCK data:', err)
  }

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
