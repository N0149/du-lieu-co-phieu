import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import {
  getHealthcareContractors,
  getInfrastructureData,
  getMacroForecastData,
  getBiddingSummaryKPIs,
} from '@/lib/bidding-service';
import { BiddingDashboard } from '@/components/bidding/BiddingDashboard';
import {
  ChevronRight,
  Gavel,
  Sparkles,
  Building2,
  TrendingUp,
  Activity,
  FileCheck2,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Đấu Thầu Y Tế (ETC), Cổ Phiếu Dược & Đại Dự Án ĐTC | Dữ Liệu Cổ Phiếu',
  description:
    'Hệ thống đấu thầu Quốc gia: Theo dõi chi tiết các gói thầu trúng kênh ETC của các doanh nghiệp Dược niêm yết (DP1, DTP, DAN, TRA, CDP, DTG) dự phóng kết quả kinh doanh quý 3/2026, cùng tiến độ 71 đại dự án đầu tư công ≥ 1.000 tỷ và điểm đảo chiều lãi suất vĩ mô.',
};

export default function DauThauPage() {
  const contractors = getHealthcareContractors();
  const infrastructure = getInfrastructureData();
  const macroForecast = getMacroForecastData();
  const summaryKPIs = getBiddingSummaryKPIs();

  return (
    <div className="flex min-h-screen flex-col bg-[#0f1218] text-[#F0F3F6] selection:bg-emerald-500 selection:text-slate-950">
      {/* Site Navigation Header */}
      <SiteHeader />

      <main className="flex-1 pb-24">
        {/* Hero Banner with Ambient Glow */}
        <div className="relative border-b border-[#1e2430] bg-gradient-to-b from-[#0f1218] via-[#141822] to-[#0f1218] py-8 sm:py-12 overflow-hidden">
          {/* Ambient Lighting Gradients */}
          <div className="absolute top-0 left-1/4 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-12 right-1/4 translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/20 via-transparent to-transparent pointer-events-none" />

          <div className="mx-auto max-w-[1600px] px-4 relative z-10 space-y-6 sm:space-y-8">
            {/* Breadcrumb Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2430] pb-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Link href="/" className="hover:text-slate-200 transition-colors">
                  Trang chủ
                </Link>
                <ChevronRight className="size-3 text-slate-600" />
                <span className="text-emerald-400 font-bold">Đấu Thầu &amp; Đầu Tư Công</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Dữ liệu Mua Sắm Công MPI 2026
                </span>
              </div>
            </div>

            {/* Hero Headline & Intro */}
            <div className="max-w-4xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-black text-emerald-400 shadow-sm shadow-emerald-500/10">
                <Gavel className="size-3.5" />
                <span>HỆ THỐNG MẠNG ĐẤU THẦU QUỐC GIA (MPI) &amp; PHÂN TÍCH TÀI CHÍNH</span>
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                Đấu Thầu Y Tế, Cổ Phiếu Dược &amp; Đại Dự Án ĐTC
              </h1>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-3xl">
                Bóc tách chi tiết backlog trúng thầu kênh bệnh viện (ETC) của 6 cổ phiếu Dược tiêu biểu{' '}
                <strong className="text-emerald-400">DP1</strong>, <strong className="text-emerald-400">DTP</strong>,{' '}
                <strong className="text-emerald-400">DAN</strong>, <strong className="text-emerald-400">TRA</strong>,{' '}
                <strong className="text-emerald-400">CDP</strong>, <strong className="text-emerald-400">DTG</strong> năm 2026{' '}
                để dự phóng KQKD Quý 3/2026; kết hợp mô hình hấp thụ vốn 71 đại dự án đầu tư công và điểm đảo chiều lãi suất vĩ mô.
              </p>
            </div>
          </div>
        </div>

        {/* Main Interactive Dashboard */}
        <div className="mx-auto max-w-[1600px] px-4 py-8">
          <BiddingDashboard
            contractors={contractors}
            infrastructure={infrastructure}
            macroForecast={macroForecast}
            summaryKPIs={summaryKPIs}
          />
        </div>
      </main>
    </div>
  );
}
