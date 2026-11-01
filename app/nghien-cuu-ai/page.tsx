import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { NghienCuuAiExplorer } from '@/components/nghien-cuu-ai/NghienCuuAiExplorer'
import {
  getAllNghienCuuAiReports,
  getNghienCuuAiKpis,
} from '@/lib/nghien-cuu-ai-service'

export const metadata: Metadata = {
  title: 'Nghiên Cứu Chuyên Sâu AI & Hệ Điểm Định Giá Lãi Kép | Dữ Liệu Đầu Tư',
  description:
    'Kho nghiên cứu chuyên sâu AI, bóc tách 5 trụ cột forensic, rà soát nợ vay, dòng tiền và hệ điểm định giá độc quyền quy chiếu Benchmark gửi tiết kiệm 10%/năm = 100 điểm.',
  alternates: {
    canonical: '/nghien-cuu-ai',
  },
}

export default function NghienCuuAiPage() {
  const reports = getAllNghienCuuAiReports()
  const kpis = getNghienCuuAiKpis()

  return (
    <div className="min-h-screen bg-[#11141c] text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-[1600px] px-4 py-6">
        <NghienCuuAiExplorer initialReports={reports} kpis={kpis} />

        <p className="mt-8 text-[11px] leading-relaxed text-[#64748B] text-center">
          Ghi chú: Toàn bộ báo cáo nghiên cứu và hệ điểm định giá được đồng bộ tự động từ thư mục
          nghiên cứu chuyên sâu AI của Dữ Liệu Đầu Tư. Benchmark quy chuẩn: Gửi tiết kiệm lãi kép 10,0%/năm = 100 điểm.
          Số liệu mang tính chất tham khảo nghiên cứu, không phải là lời mời chào hay khuyến nghị mua bán cổ phiếu.
        </p>
      </main>
    </div>
  )
}
