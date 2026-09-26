import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { NganhDienDashboard } from '@/components/nganh-dien/NganhDienDashboard';
import {
  ChevronRight,
  Zap,
  Activity,
  Waves,
  ShieldCheck,
  Compass,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dữ Liệu Ngành Điện NSMO & EAV | Dự Báo Lợi Nhuận 36 Cổ Phiếu Điện | Dữ Liệu Cổ Phiếu',
  description:
    'Hệ thống giám sát dữ liệu ngành Điện kết nối trực tiếp dữ liệu điều độ NSMO và thủy văn hồ chứa EAV: Giám sát giá cận biên thị trường SMP 48 chu kỳ, quan trắc 16 hồ thủy điện trọng điểm và dự báo doanh thu, lợi nhuận 36 cổ phiếu điện (POW, PGV, NT2, QTP, HND, PPC, BTP, NBP, VSH, TMP, SHP, SJD, SBA, TBC, GHC, DRL, VPD, VCP, HJS, NED, SEB, EIC, BSA, REE, GEG, HDG, TTA, SBH, HPD, GSM, SJE, SD9, SD3, TV1, S55, SDT).',
};

export default function NganhDienPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0f1218] text-[#F0F3F6] selection:bg-amber-500 selection:text-slate-950">
      {/* Site Header */}
      <SiteHeader />

      <main className="flex-1 pb-24">
        {/* Hero Banner with Energy Amber/Cyan Glow */}
        <div className="relative border-b border-[#1e2430] bg-gradient-to-b from-[#0f1218] via-[#151926] to-[#0f1218] py-8 sm:py-12 overflow-hidden">
          {/* Ambient Lighting Gradients */}
          <div className="absolute top-0 left-1/4 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-12 right-1/4 translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-transparent to-transparent pointer-events-none" />

          <div className="mx-auto max-w-[1600px] px-4 relative z-10 space-y-6 sm:space-y-8">
            {/* Breadcrumb Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2430] pb-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Link href="/" className="hover:text-slate-200 transition-colors">
                  Trang chủ
                </Link>
                <ChevronRight className="size-3 text-slate-600" />
                <span className="text-amber-400 font-bold">Ngành Điện &amp; Dữ Liệu NSMO - EAV</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-amber-400">
                  <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Dữ Liệu Điều Độ NSMO &amp; Hồ Chứa EAV
                </span>
              </div>
            </div>

            {/* Hero Headline & Intro */}
            <div className="max-w-4xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-black text-amber-400 shadow-sm shadow-amber-500/10">
                <Zap className="size-3.5" />
                <span>CHỈ BÁO SỚM KẾT QUẢ KINH DOANH TỪ HỆ THỐNG ĐIỀU ĐỘ &amp; THỦY VĂN HỒ CHỨA</span>
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                Dữ Liệu Ngành Điện &amp; Dự Báo Lợi Nhuận 36 Cổ Phiếu Niêm Yết
              </h1>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-3xl">
                Bóc tách trực tiếp số liệu điều độ từ <strong className="text-white">NSMO</strong> (sản lượng phát theo loại hình, sản lượng theo chủ đầu tư, giá cận biên SMP 48 chu kỳ)
                và dữ liệu thủy văn 16 hồ chứa trọng điểm từ <strong className="text-white">EAV / EVN</strong>.
                Giám sát chính xác từng nhà máy và liên kết bậc thang hạ lưu của 36 cổ phiếu điện:{' '}
                <strong className="text-white">POW</strong>, <strong className="text-white">PGV</strong>,{' '}
                <strong className="text-white">NT2</strong>, <strong className="text-white">QTP</strong>,{' '}
                <strong className="text-white">HND</strong>, <strong className="text-white">PPC</strong>,{' '}
                <strong className="text-white">VSH</strong>, <strong className="text-white">TMP</strong>,{' '}
                <strong className="text-white">REE</strong>, <strong className="text-white">HDG</strong>,{' '}
                <strong className="text-white">SBH</strong>, <strong className="text-white">BSA</strong>,{' '}
                <strong className="text-white">DRL</strong>, <strong className="text-white">VPD</strong>...
              </p>
            </div>
          </div>
        </div>

        {/* Main Interactive Dashboard */}
        <div className="mx-auto max-w-[1600px] px-4 py-8">
          <NganhDienDashboard />
        </div>
      </main>
    </div>
  );
}
