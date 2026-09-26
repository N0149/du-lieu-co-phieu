import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { ThuySanDashboard } from '@/components/thuy-san/ThuySanDashboard';
import {
  ChevronRight,
  Fish,
  Sparkles,
  TrendingUp,
  Activity,
  Globe2,
  Scale,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Tình Báo Thủy Sản VASEP & So Sánh Dự Báo Lợi Nhuận Quý 3/2026 | Dữ Liệu Cổ Phiếu',
  description:
    'Hệ thống tình báo ngành Thủy sản kết nối trực tiếp dữ liệu VASEP: Bóc tách kim ngạch xuất khẩu 8 tháng, biến động giá nguyên liệu hàng tuần (cá tra, tôm, nghêu) và so sánh dự phóng lợi nhuận Quý 3/2026 của 12 cổ phiếu niêm yết (VHC, ANV, FMC, MPC, IDI, CAT, ABT, CMX, CCA, KHS, AAM, ACL).',
};

export default function ThuySanPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0f1218] text-[#F0F3F6] selection:bg-emerald-500 selection:text-slate-950">
      {/* Site Header */}
      <SiteHeader />

      <main className="flex-1 pb-24">
        {/* Hero Banner with Oceanic Gradient Glow */}
        <div className="relative border-b border-[#1e2430] bg-gradient-to-b from-[#0f1218] via-[#141824] to-[#0f1218] py-8 sm:py-12 overflow-hidden">
          {/* Ambient Lighting Gradients */}
          <div className="absolute top-0 left-1/4 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-12 right-1/4 translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-950/20 via-transparent to-transparent pointer-events-none" />

          <div className="mx-auto max-w-[1600px] px-4 relative z-10 space-y-6 sm:space-y-8">
            {/* Breadcrumb Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2430] pb-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Link href="/" className="hover:text-slate-200 transition-colors">
                  Trang chủ
                </Link>
                <ChevronRight className="size-3 text-slate-600" />
                <span className="text-emerald-400 font-bold">Thủy Sản &amp; Tình Báo VASEP</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Dữ Liệu VASEP &amp; Tổng Cục Hải Quan Q3/2026
                </span>
              </div>
            </div>

            {/* Hero Headline & Intro */}
            <div className="max-w-4xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-black text-emerald-400 shadow-sm shadow-emerald-500/10">
                <Fish className="size-3.5" />
                <span>CHỈ BÁO SỚM KẾT QUẢ KINH DOANH QUÝ 3/2026 TỪ VASEP</span>
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                Tình Báo Thủy Sản &amp; Dự Báo Lợi Nhuận 12 Cổ Phiếu Niêm Yết
              </h1>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-3xl">
                Bóc tách số liệu kim ngạch xuất khẩu 8 tháng đầu năm, diễn biến giá nguyên liệu hàng tuần từ VASEP
                và so sánh trực diện triển vọng kết quả kinh doanh Quý 3/2026 của 12 cổ phiếu tiêu biểu:{' '}
                <strong className="text-white">VHC</strong>, <strong className="text-white">ANV</strong>,{' '}
                <strong className="text-white">FMC</strong>, <strong className="text-white">MPC</strong>,{' '}
                <strong className="text-white">IDI</strong>, <strong className="text-emerald-400">CAT</strong>,{' '}
                <strong className="text-emerald-400">ABT</strong>, <strong className="text-emerald-400">CMX</strong>,{' '}
                <strong className="text-emerald-400">CCA</strong>, <strong className="text-emerald-400">KHS</strong>,{' '}
                <strong className="text-emerald-400">AAM</strong>, <strong className="text-emerald-400">ACL</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Main Interactive Dashboard */}
        <div className="mx-auto max-w-[1600px] px-4 py-8">
          <ThuySanDashboard />
        </div>
      </main>
    </div>
  );
}
