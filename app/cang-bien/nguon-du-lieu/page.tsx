import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import { Database, ShieldCheck, RefreshCw, CheckCircle, ChevronRight, ArrowLeft, Anchor, Cpu, Ship } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Nguồn Dữ Liệu Cảng Biển & Phương Pháp Luận | Phân Tích Chuyên Sâu',
  description:
    'Tìm hiểu nguồn gốc dữ liệu lịch điều động tàu từ 15 Cảng vụ Hàng hải, quy trình chuẩn hóa UN/LOCODE, khử trùng lặp và làm sạch tên tàu hằng ngày.',
}

export default function NguonDuLieuPage() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <div className="border-b border-border/70 bg-gradient-to-b from-slate-950 via-slate-900/90 to-background py-8 sm:py-10">
        <div className="mx-auto max-w-[1200px] px-4 space-y-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Trang chủ
            </Link>
            <ChevronRight className="size-3" />
            <Link href="/cang-bien" className="hover:text-foreground transition-colors">
              Cảng Biển
            </Link>
            <ChevronRight className="size-3" />
            <span className="text-teal-400 font-semibold">Nguồn dữ liệu</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-400 mb-2">
                <Database className="size-3.5" />
                <span>MINH BẠCH DỮ LIỆU</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Nguồn Dữ Liệu & Quy Trình Xử Lý
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Nguyên tắc thu thập, làm sạch và chuẩn hoá dữ liệu vận hành cảng biển
              </p>
            </div>

            <Link
              href="/cang-bien"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:border-teal-500/40 hover:bg-teal-500/10 transition-all self-start md:self-auto"
            >
              <ArrowLeft className="size-3.5" />
              <span>Về Bản đồ Toàn quốc</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Cards */}
      <div className="mx-auto max-w-[1200px] px-4 pt-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Cảng vụ hàng hải */}
          <div className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-lg space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Anchor className="size-5" />
              </span>
              <h3 className="text-base font-bold text-foreground">1. Cảng Vụ Hàng Hải Việt Nam</h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Lịch tàu vào/ra cảng được công bố công khai bởi các Cảng vụ Hàng hải Việt Nam (Hải Phòng,
              TP.HCM, Cái Mép, Đà Nẵng, Quảng Ninh, Đồng Nai...). Dữ liệu bao gồm tên tàu, trọng tải DWT,
              chiều dài LOA, mớn nước, giờ điều động và cầu bến tiếp nhận cụ thể.
            </p>
          </div>

          {/* Card 2: Hoa tiêu và cảng quốc tế */}
          <div className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-lg space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Ship className="size-5" />
              </span>
              <h3 className="text-base font-bold text-foreground">2. Hoa Tiêu & Cổng Điều Động</h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Dữ liệu dẫn tàu trực tiếp từ các đơn vị Hoa tiêu Hàng hải (Hoa tiêu Miền Bắc, Hoa tiêu Miền Nam)
              và các cổng thông tin hàng hải quốc tế, cung cấp dữ liệu tức thời về các lượt tàu đang cập bến
              hoặc chuẩn bị rời bến trong ngày.
            </p>
          </div>

          {/* Card 3: Xử lý và làm sạch */}
          <div className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-lg space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Cpu className="size-5" />
              </span>
              <h3 className="text-base font-bold text-foreground">3. Pipeline Xử Lý & Làm Sạch</h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Tên tàu được chuẩn hoá (loại bỏ ký tự rác, ghép các phiên bản trùng lặp), mã cảng đồng nhất
              theo chuẩn ISO UN/LOCODE. Hệ thống tự động quét và cập nhật hàng ngày lúc 05:00 sáng,
              bổ sung backfill dữ liệu 3 ngày gần nhất.
            </p>
          </div>

          {/* Card 4: Hiệu chỉnh số liệu */}
          <div className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-lg space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShieldCheck className="size-5" />
              </span>
              <h3 className="text-base font-bold text-foreground">4. Hiệu Chỉnh & Đối Soát</h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Khi cảng vụ điều chỉnh hoặc đăng lại lịch tàu, hệ thống lưu vết toàn bộ các bản ghi nhận và tính
              toán theo bản cuối cùng trong cửa sổ 7 ngày, đảm bảo số lượt tàu và trọng tải DWT phản ánh
              đúng thực tế từ nguồn công bố chính thức.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
