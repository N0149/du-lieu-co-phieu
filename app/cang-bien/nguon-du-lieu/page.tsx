import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { MaritimeSubNav } from '@/components/cang-bien/MaritimeSubNav'
import { Database, ShieldCheck, RefreshCw, CheckCircle, ChevronRight, ArrowLeft, Anchor, Cpu, Ship, LayoutGrid, Search, Lock, Layers } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Nguồn Dữ Liệu Cảng Biển & Phương Pháp Luận | Phân Tích Chuyên Sâu',
  description:
    'Tìm hiểu nguồn gốc dữ liệu lịch điều động tàu từ 15 Cảng vụ Hàng hải, quy trình chuẩn hóa UN/LOCODE, khử trùng lặp và làm sạch tên tàu hằng ngày.',
}

export default function NguonDuLieuPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 selection:bg-teal-500 selection:text-slate-950">
      {/* Site Header */}
      <SiteHeader />

      {/* Header */}
      <div className="relative border-b border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8 sm:py-10 overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-1/3 translate-x-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-[1200px] px-4 space-y-6 relative z-10">
          {/* Breadcrumb & Sub-nav */}
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
              <span className="text-teal-400 font-bold">Nguồn dữ liệu</span>
            </div>

            {/* Maritime Sub-navigation Tabs */}
            <MaritimeSubNav activeTab="nguon-du-lieu" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-black text-teal-300 mb-2.5">
                <Database className="size-3.5 text-teal-400" />
                <span>MINH BẠCH &amp; CHUẨN HOÁ DỮ LIỆU</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                Nguồn Dữ Liệu &amp; Quy Trình Xử Lý
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
                Nguyên tắc thu thập, làm sạch và chuẩn hoá dữ liệu vận hành cảng biển Việt Nam
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Cards */}
      <div className="mx-auto max-w-[1200px] px-4 pt-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Cảng vụ hàng hải */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/95 via-slate-900/80 to-slate-950/95 p-6 shadow-xl space-y-3.5 hover:border-teal-500/40 transition-all">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
                <Anchor className="size-5" />
              </span>
              <h3 className="text-base font-extrabold text-white">1. Cảng Vụ Hàng Hải Việt Nam</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Lịch tàu vào/ra cảng được công bố công khai bởi các Cảng vụ Hàng hải Việt Nam (Hải Phòng,
              TP.HCM, Cái Mép, Đà Nẵng, Quảng Ninh, Đồng Nai...). Dữ liệu bao gồm tên tàu, trọng tải DWT,
              chiều dài LOA, mớn nước, giờ điều động và cầu bến tiếp nhận cụ thể.
            </p>
          </div>

          {/* Card 2: Hoa tiêu và cảng quốc tế */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/95 via-slate-900/80 to-slate-950/95 p-6 shadow-xl space-y-3.5 hover:border-sky-500/40 transition-all">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
                <Ship className="size-5" />
              </span>
              <h3 className="text-base font-extrabold text-white">2. Hoa Tiêu &amp; Cổng Điều Động</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Dữ liệu dẫn tàu trực tiếp từ các đơn vị Hoa tiêu Hàng hải (Hoa tiêu Miền Bắc, Hoa tiêu Miền Nam)
              và các cổng thông tin hàng hải quốc tế, cung cấp dữ liệu tức thời về các lượt tàu đang cập bến
              hoặc chuẩn bị rời bến trong ngày.
            </p>
          </div>

          {/* Card 3: Xử lý và làm sạch */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/95 via-slate-900/80 to-slate-950/95 p-6 shadow-xl space-y-3.5 hover:border-emerald-500/40 transition-all">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Cpu className="size-5" />
              </span>
              <h3 className="text-base font-extrabold text-white">3. Pipeline Xử Lý &amp; Làm Sạch</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Dữ liệu thô trải qua hệ thống chuẩn hoá tên tàu theo chuẩn IMO/Call Sign, chuyển đổi ngày giờ
              thực tế GMT+7, và đối soát chéo cầu bến để loại bỏ các bản ghi trùng lặp do tàu đổi ca hoa tiêu.
            </p>
          </div>

          {/* Card 4: Ánh xạ mã cổ phiếu */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/95 via-slate-900/80 to-slate-950/95 p-6 shadow-xl space-y-3.5 hover:border-amber-500/40 transition-all">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <ShieldCheck className="size-5" />
              </span>
              <h3 className="text-base font-extrabold text-white">4. Ánh Xạ Mã Cổ Phiếu Niêm Yết</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Mỗi bến cảng tiếp nhận được đối chiếu tự động vào danh mục tài sản của từng mã cổ phiếu (PHP, GMD,
              DVP, DXP, MIPEC, SGP, PDN, CDN...) thông qua bản đồ bến chuẩn xác, đảm bảo dữ liệu phản ánh sát hoạt động kinh doanh.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
