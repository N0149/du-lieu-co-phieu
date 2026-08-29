import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { LongLiveStockExplorer } from '@/components/longlivestock-explorer'
import { getManifestData, getIndicesData } from '@/lib/longlivestock'

export const metadata: Metadata = {
  title: 'Tra Cứu 1.530 Mã Chứng Khoán · Thị Trường & Báo Cáo Phân Tích',
  description:
    'Tra cứu toàn diện 1.530 mã cổ phiếu Việt Nam (HOSE, HNX, UPCOM) kèm chỉ số VN-Index, bản đồ nhiệt ngành, bộ lọc số liệu và liên kết trực tiếp tới báo cáo phân tích chuyên sâu.',
}

export default function TraCuuPage() {
  const manifestData = getManifestData()
  const indicesData = getIndicesData()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <LongLiveStockExplorer
        manifestData={manifestData}
        indicesData={indicesData}
      />
    </div>
  )
}
