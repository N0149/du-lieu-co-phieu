import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { WiDataScreener } from '@/components/widata-screener'
import { getEnrichedScreenerStocks } from '@/lib/screener-data-service'

export const metadata: Metadata = {
  title: 'Bộ Lọc Cổ Phiếu Chuyên Sâu · Sàng Lọc 1.530+ Mã Toàn Thị Trường',
  description:
    'Bộ lọc cổ phiếu chuyên sâu, sàng lọc 1.530+ mã (HOSE, HNX, UPCOM) theo định giá P/E, P/B, ROE, dòng tiền, tăng trưởng lợi nhuận và tín hiệu kỹ thuật.',
  alternates: {
    canonical: '/bo-loc',
  },
}

export const revalidate = 900 // Revalidate mỗi 15 phút

export default function BoLocPage() {
  // Lấy dữ liệu 1.530 mã đã làm giàu trực tiếp trên máy chủ
  const initialStocks = getEnrichedScreenerStocks()

  return (
    <div className="min-h-screen bg-[#0f1218] text-foreground flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <WiDataScreener initialStocks={initialStocks} />
      </main>

      <footer className="border-t border-white/10 bg-[#121620] px-4 py-3 text-center text-[11px] text-muted-foreground">
        Hệ thống Bộ lọc Cổ phiếu Chuyên Sâu · Dữ liệu cập nhật từ các Sở Giao dịch Chứng khoán HOSE, HNX, UPCOM và BCTC doanh nghiệp niêm yết.
      </footer>
    </div>
  )
}
