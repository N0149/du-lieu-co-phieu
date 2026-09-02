import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { getFreightRates } from '@/lib/maritime'
import { MaritimeSubNav } from '@/components/cang-bien/MaritimeSubNav'
import { FreightRatesChart } from '@/components/cang-bien/FreightRatesChart'
import {
  TrendingUp,
  Globe2,
  Ship,
  Layers,
  ChevronRight,
  Zap,
  ShieldCheck,
  Anchor,
  Sparkles,
  ExternalLink,
  Flame,
  Clock,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Chỉ Số Cước Vận Tải Biển Quốc Tế (BDI, WCI, BDTI, BCTI) 10 Năm | Dữ Liệu Cảng Biển',
  description:
    'Theo dõi biến động chỉ số cước vận tải biển toàn cầu lịch sử 10 năm (2016-2026): Baltic Dry Index (BDI), Drewry World Container (WCI), Baltic Tanker (BDTI, BCTI) và tác động trực tiếp tới cổ phiếu HAH, VOS, PVT, GMD.',
}

export default function CuocVanTaiPage() {
  const freightData = getFreightRates()
  const indices = freightData?.indices || {}

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 selection:bg-teal-500 selection:text-slate-950">
      {/* Site Header */}
      <SiteHeader />

      {/* Hero Header */}
      <div className="relative border-b border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8 sm:py-12 overflow-hidden">
        {/* Ambient Gradient Glow Lights */}
        <div className="absolute top-0 left-1/4 -translate-x-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-12 right-1/4 translate-x-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/15 via-transparent to-transparent pointer-events-none" />

        <div className="mx-auto max-w-[1600px] px-4 relative z-10 space-y-6 sm:space-y-8">
          {/* Breadcrumb & Sub-navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Link href="/" className="hover:text-slate-200 transition-colors">
                Trang chủ
              </Link>
              <ChevronRight className="size-3 text-slate-600" />
              <Link href="/cang-bien" className="hover:text-slate-200 transition-colors">
                Cảng Biển
              </Link>
              <ChevronRight className="size-3 text-slate-600" />
              <span className="text-teal-400 font-bold">Cước Vận Tải Biển Quốc Tế</span>
            </div>

            {/* Maritime Sub-navigation Tabs */}
            <MaritimeSubNav activeTab="cuoc-van-tai" />
          </div>

          {/* Hero Titles */}
          <div className="max-w-4xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-black text-teal-300 shadow-sm shadow-teal-500/10">
              <Globe2 className="size-3.5 text-teal-400" />
              <span>GLOBAL FREIGHT BENCHMARK (2016 – 2026)</span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Chỉ Số Cước Vận Tải Biển Quốc Tế
            </h1>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-3xl">
              Giám sát chu kỳ cước vận tải biển toàn cầu 10 năm: Hàng rời (BDI), Container (Drewry WCI), Dầu thô (BDTI) &amp; Dầu thành phẩm (BCTI) — Kim chỉ nam định giá và dự báo kết quả kinh doanh cho các doanh nghiệp đội tàu Việt Nam.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="mx-auto max-w-[1600px] px-4 pt-8 space-y-12">
        {/* Section 1: Detailed Interactive Chart */}
        <section>
          <FreightRatesChart freightData={freightData} fullPageMode={true} />
        </section>

        {/* Section 2: 4 Key Freight Market Overviews */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
              <Layers className="size-4.5" />
            </span>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Tổng Quan 4 Phân Khúc Cước Biển Trọng Yếu
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ý nghĩa kinh tế và mối tương quan với các nhóm cổ phiếu niêm yết trên sàn chứng khoán
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: BDI */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 hover:border-teal-500/40 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-md border border-teal-500/20">
                    BDI
                  </span>
                  <span className="text-xs font-mono text-slate-400">Hàng Rời (Dry Bulk)</span>
                </div>
                <h4 className="text-base font-bold text-white">Baltic Dry Index</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Đo lường chi phí thuê tàu vận tải nguyên liệu thô (than đá, quặng sắt, bauxit, ngũ cốc). Biên độ biến động cực lớn, phản ánh trực tiếp tốc độ sản xuất công nghiệp và nhu cầu xây dựng hạ tầng của Trung Quốc.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800/80 text-xs">
                <span className="text-[11px] text-slate-500 block mb-1">Cổ phiếu nhạy cảm:</span>
                <div className="flex items-center gap-1.5 font-bold text-teal-300">
                  <Link href="/stock/VOS" className="hover:underline">VOS</Link>
                  <span>·</span>
                  <Link href="/stock/VNA" className="hover:underline">VNA</Link>
                  <span>·</span>
                  <span className="text-slate-400">HNA</span>
                </div>
              </div>
            </div>

            {/* Card 2: WCI */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 hover:border-sky-500/40 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-md border border-sky-500/20">
                    WCI
                  </span>
                  <span className="text-xs font-mono text-slate-400">Container Viễn Dương</span>
                </div>
                <h4 className="text-base font-bold text-white">Drewry World Container</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Giá cước giao ngay cho container 40ft (FEU) trên 8 tuyến hàng hải chính giữa Châu Á, Châu Âu và Bắc Mỹ. Nhạy cảm với các biến cố nghẽn luồng hàng hải (Kênh đào Suez, Biển Đỏ, Kênh đào Panama).
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800/80 text-xs">
                <span className="text-[11px] text-slate-500 block mb-1">Cổ phiếu nhạy cảm:</span>
                <div className="flex items-center gap-1.5 font-bold text-sky-300">
                  <Link href="/cang/hah" className="hover:underline">HAH</Link>
                  <span>·</span>
                  <Link href="/cang/gmd" className="hover:underline">GMD</Link>
                  <span>·</span>
                  <span className="text-slate-400">VSC</span>
                </div>
              </div>
            </div>

            {/* Card 3: BDTI */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 hover:border-amber-500/40 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20">
                    BDTI
                  </span>
                  <span className="text-xs font-mono text-slate-400">Dầu Thô (Crude Oil)</span>
                </div>
                <h4 className="text-base font-bold text-white">Baltic Dirty Tanker</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Giá cước thuê các siêu tàu chở dầu thô (VLCC, Suezmax, Aframax) từ Vịnh Ba Tư, Tây Phi, Nga đến các nhà máy lọc dầu. Tăng vọt khi hải trình vận tải dầu bị kéo dài do lệnh trừng phạt hoặc xung đột.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800/80 text-xs">
                <span className="text-[11px] text-slate-500 block mb-1">Cổ phiếu nhạy cảm:</span>
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <Link href="/stock/PVT" className="hover:underline">PVT</Link>
                  <span>·</span>
                  <Link href="/stock/VTO" className="hover:underline">VTO</Link>
                  <span>·</span>
                  <Link href="/stock/VIP" className="hover:underline">VIP</Link>
                </div>
              </div>
            </div>

            {/* Card 4: BCTI */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                    BCTI
                  </span>
                  <span className="text-xs font-mono text-slate-400">Dầu Thành Phẩm &amp; Hóa Chất</span>
                </div>
                <h4 className="text-base font-bold text-white">Baltic Clean Tanker</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Giá cước vận tải các sản phẩm dầu tinh chế (xăng, diesel, dầu hỏa máy bay Jet-A1) và hóa chất lỏng sạch. Đội tàu MR của PVTrans thường ký kết hợp đồng định hạn liên kết chặt chẽ với chỉ số này.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800/80 text-xs">
                <span className="text-[11px] text-slate-500 block mb-1">Cổ phiếu nhạy cảm:</span>
                <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                  <Link href="/stock/PVT" className="hover:underline">PVT</Link>
                  <span>·</span>
                  <span className="text-slate-400">PVP</span>
                  <span>·</span>
                  <Link href="/stock/VIP" className="hover:underline">VIP</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Historical Shipping Super-Cycles 10-Year Timeline */}
        <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/95 via-slate-900/70 to-slate-950/95 p-6 sm:p-8 shadow-2xl shadow-black/40">
          <div className="space-y-6">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Flame className="size-4.5" />
              </span>
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  Nhìn Lại Các Cột Mốc Siêu Chu Kỳ Cước Biển (2016 – 2026)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Các sự kiện thiên nga đen và chuyển dịch địa chính trị định hình lại cấu trúc thị trường
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-2">
                <div className="text-xs font-bold text-sky-400">GIAI ĐOẠN 2016 – 2019</div>
                <h4 className="text-sm font-extrabold text-slate-100">Đáy Khủng Hoảng Thừa Cung</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Đầu năm 2016, BDI rơi xuống đáy lịch sử 290 điểm do dư thừa tàu đóng mới. Nhiều hãng tàu viễn dương phá sản (Hanjin Shipping). Giai đoạn thanh lọc đội tàu khốc liệt nhất thập kỷ.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-2">
                <div className="text-xs font-bold text-emerald-400">GIAI ĐOẠN 2020 – 2022</div>
                <h4 className="text-sm font-extrabold text-slate-100">Siêu Bão Cước Hậu Đại Dịch COVID-19</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Chuỗi cung ứng toàn cầu đứt gãy, tắc nghẽn cảng biển nghiêm trọng tại Mỹ và Châu Âu. Drewry WCI lập đỉnh lịch sử $10,377/FEU (tháng 9/2021), mang lại mức lợi nhuận kỷ lục chưa từng có cho HAH và các hãng tàu.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-2">
                <div className="text-xs font-bold text-amber-400">GIAI ĐOẠN 2024 – 2026</div>
                <h4 className="text-sm font-extrabold text-slate-100">Khủng Hoảng Biển Đỏ &amp; Tái Định Tuyến</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tàu bè buộc phải vòng qua Mũi Hảo Vọng (Nam Phi), làm kéo dài hành trình thêm 10–14 ngày mỗi chiều. Năng lực chuyên chở container toàn cầu bị hấp thụ mạnh, giữ mặt bằng giá cước ở mức cao $4,000 – $5,000/FEU.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
