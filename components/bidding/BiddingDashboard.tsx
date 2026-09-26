'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  HealthcareContractor,
  InfrastructureProject,
  InfrastructurePackage,
  MacroForecastData,
  BiddingPackage2026,
} from '@/lib/bidding-types';
import { BiddingRevenueChart } from './BiddingRevenueChart';
import { cn } from '@/lib/utils';
import {
  Activity,
  Award,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  FileText,
  Filter,
  Flame,
  Globe,
  Landmark,
  Layers,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';

interface Props {
  contractors: HealthcareContractor[];
  infrastructure: {
    projects: InfrastructureProject[];
    packages: InfrastructurePackage[];
  };
  macroForecast: MacroForecastData | null;
  summaryKPIs: {
    total_contractors: number;
    total_bids_participated: number;
    total_bids_won: number;
    total_winning_value: number;
    avg_win_rate: number;
    listed_contractors: number;
  };
}

export function BiddingDashboard({
  contractors,
  infrastructure,
  macroForecast,
  summaryKPIs,
}: Props) {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'HEALTHCARE' | 'INFRASTRUCTURE'>('HEALTHCARE');

  // ------------------ HEALTHCARE STATE ------------------
  const [medSegment, setMedSegment] = useState<string>('ALL');
  const [medMinRate, setMedMinRate] = useState<number>(0);
  const [medListedOnly, setMedListedOnly] = useState<boolean>(false);
  const [medSearch, setMedSearch] = useState<string>('');
  const [medSortField, setMedSortField] = useState<string>('total_winning_value');
  const [medSortOrder, setMedSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedContractor, setSelectedContractor] = useState<HealthcareContractor | null>(null);
  const [modalPkgQuarter, setModalPkgQuarter] = useState<string>('ALL');
  const [modalPkgSortField, setModalPkgSortField] = useState<'date' | 'price' | 'none'>('date');
  const [modalPkgSortOrder, setModalPkgSortOrder] = useState<'asc' | 'desc'>('desc');

  // ------------------ INFRASTRUCTURE STATE ------------------
  const [infraStatus, setInfraStatus] = useState<string>('ALL');
  const [infraTime, setInfraTime] = useState<string>('ALL');
  const [infraSearch, setInfraSearch] = useState<string>('');
  const [infraSortField, setInfraSortField] = useState<string>('total_capital');
  const [infraSortOrder, setInfraSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedProject, setSelectedProject] = useState<InfrastructureProject | null>(null);

  // Focus Stocks (The 6 stocks requested)
  const FOCUS_STOCKS = ['DP1', 'DTP', 'DAN', 'TRA', 'CDP', 'DTG'];

  // Chart selection state for overview
  const [selectedChartStock, setSelectedChartStock] = useState<string>('DP1');

  const listedStocksWithSeries = useMemo(() => {
    return contractors.filter(
      (c) => c.is_listed && c.quarterly_comparison_series && c.quarterly_comparison_series.length > 0
    );
  }, [contractors]);

  const chartContractor = useMemo(() => {
    return contractors.find((c) => c.stock_code === selectedChartStock) || listedStocksWithSeries[0];
  }, [contractors, selectedChartStock, listedStocksWithSeries]);

  // Spotlight category filter for all pharma stocks
  const [spotlightCategory, setSpotlightCategory] = useState<'ALL' | 'FOCUS' | 'MANUFACTURERS' | 'HERBAL' | 'DISTRIBUTORS' | 'DEVICES'>('ALL');
  const [spotlightViewMode, setSpotlightViewMode] = useState<'ROW_STRIP' | 'ROW_TABLE'>('ROW_STRIP');
  const spotlightScrollRef = useRef<HTMLDivElement>(null);

  const scrollSpotlight = (direction: 'left' | 'right') => {
    if (spotlightScrollRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      spotlightScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const allListedStocks = useMemo(() => {
    return contractors.filter((c) => c.is_listed && c.stock_code);
  }, [contractors]);

  const displayedSpotlightStocks = useMemo(() => {
    if (spotlightCategory === 'ALL') return allListedStocks;
    if (spotlightCategory === 'FOCUS') {
      return allListedStocks.filter((c) => FOCUS_STOCKS.includes(c.stock_code || ''));
    }
    if (spotlightCategory === 'MANUFACTURERS') {
      const mfg = ['DHG', 'IMP', 'DBD', 'DMC', 'DHT', 'DCL', 'PBC', 'DTG', 'DAN'];
      return allListedStocks.filter((c) => mfg.includes(c.stock_code || ''));
    }
    if (spotlightCategory === 'HERBAL') {
      const herbal = ['TRA', 'OPC', 'DTP', 'DP1'];
      return allListedStocks.filter((c) => herbal.includes(c.stock_code || ''));
    }
    if (spotlightCategory === 'DISTRIBUTORS') {
      const dist = ['DP1', 'CDP', 'DVN', 'DDN'];
      return allListedStocks.filter((c) => dist.includes(c.stock_code || ''));
    }
    if (spotlightCategory === 'DEVICES') {
      const dev = ['VMS', 'JVC', 'DNM'];
      return allListedStocks.filter((c) => dev.includes(c.stock_code || ''));
    }
    return allListedStocks;
  }, [allListedStocks, spotlightCategory]);

  // ------------------ HEALTHCARE FILTERING ------------------
  const filteredContractors = useMemo(() => {
    return contractors
      .filter((c) => {
        if (medSegment !== 'ALL' && c.segment_group !== medSegment) return false;
        if (medMinRate > 0 && c.win_rate < medMinRate) return false;
        if (medListedOnly && !c.is_listed) return false;
        if (medSearch.trim()) {
          const q = medSearch.toLowerCase();
          const match =
            c.name.toLowerCase().includes(q) ||
            c.short_name.toLowerCase().includes(q) ||
            (c.stock_code && c.stock_code.toLowerCase().includes(q)) ||
            c.tax_code.includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA = (a as any)[medSortField];
        let valB = (b as any)[medSortField];
        if (valA === undefined) valA = 0;
        if (valB === undefined) valB = 0;
        return medSortOrder === 'desc' ? (valB > valA ? 1 : -1) : valA > valB ? 1 : -1;
      });
  }, [contractors, medSegment, medMinRate, medListedOnly, medSearch, medSortField, medSortOrder]);

  // ------------------ INFRASTRUCTURE FILTERING ------------------
  const filteredProjects = useMemo(() => {
    return (infrastructure.projects || [])
      .filter((p) => {
        if (infraStatus !== 'ALL' && p.status !== infraStatus) return false;
        if (infraSearch.trim()) {
          const q = infraSearch.toLowerCase();
          const match =
            p.name.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q) ||
            (p.investor_name && p.investor_name.toLowerCase().includes(q)) ||
            (p.location && p.location.toLowerCase().includes(q));
          if (!match) return false;
        }
        if (infraTime === 'SOON_COMPLETING') {
          if (p.status !== 'Đang thi công' || p.remaining_months > 12) return false;
        } else if (infraTime === 'YEAR_2026') {
          if (!p.expected_completion_date?.startsWith('2026')) return false;
        } else if (infraTime === 'RECENT_STARTED') {
          const year = parseInt(p.start_date?.slice(0, 4) || '0');
          if (year < 2024) return false;
        } else if (infraTime === 'RECENT_COMPLETED') {
          if (p.status !== 'Đã hoàn thành') return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA = (a as any)[infraSortField];
        let valB = (b as any)[infraSortField];
        if (valA === undefined) valA = 0;
        if (valB === undefined) valB = 0;
        return infraSortOrder === 'desc' ? (valB > valA ? 1 : -1) : valA > valB ? 1 : -1;
      });
  }, [infrastructure.projects, infraStatus, infraTime, infraSearch, infraSortField, infraSortOrder]);

  const sortedModalPackages = useMemo(() => {
    if (!selectedContractor?.packages_2026) return [];
    const list = selectedContractor.packages_2026.filter(
      (p) => modalPkgQuarter === 'ALL' || p.quarter === modalPkgQuarter
    );

    return [...list].sort((a, b) => {
      if (modalPkgSortField === 'date') {
        const timeA = a.award_date ? new Date(a.award_date).getTime() : 0;
        const timeB = b.award_date ? new Date(b.award_date).getTime() : 0;
        return modalPkgSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      }
      if (modalPkgSortField === 'price') {
        const priceA = a.win_price || a.pkg_price || 0;
        const priceB = b.win_price || b.pkg_price || 0;
        return modalPkgSortOrder === 'desc' ? priceB - priceA : priceA - priceB;
      }
      return 0;
    });
  }, [selectedContractor, modalPkgQuarter, modalPkgSortField, modalPkgSortOrder]);

  // Helper formatters
  const formatBillion = (val: number) => {
    if (!val) return '0 tỷ';
    const b = val / 1e9;
    return `${b.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`;
  };

  const formatDate = (d: string) => {
    if (!d) return '--';
    const parts = d.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* SUB-NAV TABS: HEALTHCARE VS INFRASTRUCTURE               */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2430] pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('HEALTHCARE')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'HEALTHCARE'
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <Activity className="size-4 text-emerald-400" />
            <span>Đấu Thầu Y Tế &amp; Cổ Phiếu Dược (ETC)</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-semibold">
              6 Mã Trọng Điểm
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('INFRASTRUCTURE')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'INFRASTRUCTURE'
                ? 'bg-gradient-to-r from-sky-500/20 to-blue-500/10 text-sky-400 border border-sky-500/30 shadow-lg shadow-sky-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <Landmark className="size-4 text-sky-400" />
            <span>Đại Dự Án ĐTC &amp; Dự Báo Lãi Suất Vĩ Mô</span>
            <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded-full font-semibold">
              ≥ 1.000 Tỷ
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Dữ liệu đối soát chuẩn hóa Hệ thống Mua sắm công (Bộ KH&amp;ĐT)
        </div>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: HEALTHCARE BIDDING & PHARMA STOCKS               */}
      {/* ======================================================== */}
      {activeTab === 'HEALTHCARE' && (
        <div className="space-y-6">
          {/* ALL LISTED PHARMA STOCKS SPOTLIGHT CARD (HIỂN THỊ THEO HÀNG CHO GỌN) */}
          <div className="relative rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#121820] via-[#151c27] to-[#10151e] p-4 sm:p-5 shadow-xl shadow-black/40 overflow-hidden">
            <div className="absolute -right-16 -top-16 size-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/5 pb-3 mb-3.5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                  <Flame className="size-4.5" />
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>TÂM ĐIỂM: TOÀN BỘ CỔ PHIẾU DƯỢC PHẨM &amp; Y TẾ NIÊM YẾT ({allListedStocks.length} MÃ)</span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-1">
                    Đối soát tiến độ trúng thầu 2026 với dự phóng KQKD Quý 3/2026 và chuỗi đối chiếu 23 quý cho toàn bộ cổ phiếu Dược trên sàn
                  </p>
                </div>
              </div>

              {/* Sub-category Filter Tabs & View Mode Switcher */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#0f1218] border border-[#232936] text-xs">
                  {[
                    { id: 'ALL', label: `Tất cả (${allListedStocks.length})` },
                    { id: 'FOCUS', label: '⭐ Trọng điểm (6)' },
                    { id: 'MANUFACTURERS', label: '💊 Tân dược' },
                    { id: 'HERBAL', label: '🌿 Đông dược' },
                    { id: 'DISTRIBUTORS', label: '🚚 Phân phối' },
                    { id: 'DEVICES', label: '🩺 Thiết bị y tế' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSpotlightCategory(cat.id as any)}
                      className={cn(
                        "px-2.5 py-1 font-semibold rounded-lg transition-all",
                        spotlightCategory === cat.id
                          ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* View Mode Toggle: Row Strip vs Compact Row Table */}
                <div className="flex items-center gap-0.5 p-1 rounded-xl bg-[#0f1218] border border-[#232936] text-xs">
                  <button
                    type="button"
                    onClick={() => setSpotlightViewMode('ROW_STRIP')}
                    title="Hiển thị theo dải hàng ngang cuộn (1 dòng gọn)"
                    className={cn(
                      "px-2 py-1 font-semibold rounded-lg transition-all flex items-center gap-1",
                      spotlightViewMode === 'ROW_STRIP'
                        ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-xs"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <span>↔ Hàng ngang</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpotlightViewMode('ROW_TABLE')}
                    title="Hiển thị theo danh sách bảng dòng"
                    className={cn(
                      "px-2 py-1 font-semibold rounded-lg transition-all flex items-center gap-1",
                      spotlightViewMode === 'ROW_TABLE'
                        ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-xs"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <span>☰ Bảng dòng</span>
                  </button>
                </div>
              </div>
            </div>

            {/* VIEW 1: HORIZONTAL ROW STRIP (CHỈ HIỂN THỊ THEO HÀNG GỌN) */}
            {spotlightViewMode === 'ROW_STRIP' && (
              <div className="relative group/strip">
                {/* Left Scroll Arrow */}
                <button
                  type="button"
                  onClick={() => scrollSpotlight('left')}
                  aria-label="Cuộn sang trái"
                  className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 size-7 sm:size-8 rounded-full bg-[#0c1017]/90 hover:bg-emerald-600 border border-emerald-500/30 text-white flex items-center justify-center shadow-lg opacity-80 group-hover/strip:opacity-100 transition-all hover:scale-105"
                >
                  <ChevronLeft className="size-4" />
                </button>

                <div
                  ref={spotlightScrollRef}
                  className="flex items-center gap-2.5 overflow-x-auto py-1 px-1 scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent scroll-smooth"
                >
                  {displayedSpotlightStocks.map((c) => {
                    const total2026Val = (c.packages_2026 || []).reduce((acc, p) => acc + p.win_price, 0);

                    return (
                      <button
                        key={c.stock_code || c.id}
                        type="button"
                        onClick={() => {
                          setSelectedContractor(c);
                          setModalPkgQuarter('ALL');
                        }}
                        className="shrink-0 group/item flex items-center gap-2.5 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all text-left shadow-sm"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-emerald-400 group-hover/item:text-emerald-300">
                            {c.stock_code}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                            {c.exchange || 'UPCoM'}
                          </span>
                        </div>

                        <span className="text-xs font-semibold text-slate-200 max-w-[100px] truncate" title={c.short_name}>
                          {c.short_name}
                        </span>

                        <div className="flex items-center gap-2 border-l border-white/10 pl-2 text-[11px] text-slate-400 whitespace-nowrap">
                          <span>Trúng: <strong className="text-slate-200 font-bold">{c.win_rate}%</strong></span>
                          <span>2026: <strong className="text-emerald-400 font-bold">{formatBillion(total2026Val)}</strong></span>
                        </div>

                        <span className="text-xs font-bold text-sky-400 group-hover/item:text-sky-300 flex items-center pl-1 group-hover/item:translate-x-0.5 transition-transform" title="Dự báo Q3 & Gói thầu">
                          →
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Right Scroll Arrow */}
                <button
                  type="button"
                  onClick={() => scrollSpotlight('right')}
                  aria-label="Cuộn sang phải"
                  className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 size-7 sm:size-8 rounded-full bg-[#0c1017]/90 hover:bg-emerald-600 border border-emerald-500/30 text-white flex items-center justify-center shadow-lg opacity-80 group-hover/strip:opacity-100 transition-all hover:scale-105"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}

            {/* VIEW 2: COMPACT ROW TABLE (DANH SÁCH THEO HÀNG) */}
            {spotlightViewMode === 'ROW_TABLE' && (
              <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#141a24] z-10">
                      <tr className="border-b border-white/10 text-slate-400 font-semibold">
                        <th className="py-2.5 px-3">Mã CK</th>
                        <th className="py-2.5 px-3">Sàn</th>
                        <th className="py-2.5 px-3 min-w-[130px]">Doanh Nghiệp</th>
                        <th className="py-2.5 px-3">Phân Khúc</th>
                        <th className="py-2.5 px-3 text-right">Tỷ Lệ Trúng</th>
                        <th className="py-2.5 px-3 text-right">Trúng Thầu 2026</th>
                        <th className="py-2.5 px-3 text-center">Chi Tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {displayedSpotlightStocks.map((c) => {
                        const total2026Val = (c.packages_2026 || []).reduce((acc, p) => acc + p.win_price, 0);

                        return (
                          <tr
                            key={c.stock_code || c.id}
                            onClick={() => {
                              setSelectedContractor(c);
                              setModalPkgQuarter('ALL');
                            }}
                            className="cursor-pointer hover:bg-emerald-500/[0.08] transition-colors group/row"
                            title={`Nhấp để xem chi tiết gói thầu & hồ sơ của ${c.short_name}`}
                          >
                            <td className="py-2 px-3 font-black text-emerald-400 text-sm group-hover/row:text-emerald-300">
                              {c.stock_code}
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-[10px] font-semibold text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                {c.exchange || 'UPCoM'}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-200">
                              {c.short_name}
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-400">
                              {c.segment}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-200">
                              {c.win_rate}%
                            </td>
                            <td className="py-2 px-3 text-right font-extrabold text-emerald-400">
                              {formatBillion(total2026Val)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold inline-flex items-center gap-1 group-hover/row:bg-emerald-500/20">
                                <span>Xem gói thầu</span>
                                <span>→</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-xl border border-[#1e2430] bg-[#141822]">
              <div className="text-xs text-slate-400 font-semibold mb-1">TỔNG GIÁ TRỊ TRÚNG THẦU</div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-400">
                {formatBillion(summaryKPIs.total_winning_value)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Kênh bệnh viện công lập toàn quốc</div>
            </div>

            <div className="p-4 rounded-xl border border-[#1e2430] bg-[#141822]">
              <div className="text-xs text-slate-400 font-semibold mb-1">TỶ LỆ TRÚNG THẦU TB</div>
              <div className="text-xl sm:text-2xl font-extrabold text-teal-400">
                {summaryKPIs.avg_win_rate}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Tỷ lệ áp đảo ở các hãng dược lớn</div>
            </div>

            <div className="p-4 rounded-xl border border-[#1e2430] bg-[#141822]">
              <div className="text-xs text-slate-400 font-semibold mb-1">TỔNG SỐ GÓI ĐÃ TRÚNG</div>
              <div className="text-xl sm:text-2xl font-extrabold text-sky-400">
                {summaryKPIs.total_bids_won.toLocaleString('vi-VN')} gói
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Trên {summaryKPIs.total_bids_participated.toLocaleString('vi-VN')} gói tham dự</div>
            </div>

            <div className="p-4 rounded-xl border border-[#1e2430] bg-[#141822]">
              <div className="text-xs text-slate-400 font-semibold mb-1">DOANH NGHIỆP NIÊM YẾT</div>
              <div className="text-xl sm:text-2xl font-extrabold text-amber-400">
                {summaryKPIs.listed_contractors} / {summaryKPIs.total_contractors}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Có mã chứng khoán (HOSE, HNX, UPCoM)</div>
            </div>
          </div>

          {/* FILTER BAR */}
          <div className="p-4 rounded-xl border border-[#1e2430] bg-[#141822] space-y-3">
            {/* Segment Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 font-bold mr-1">PHÂN KHÚC:</span>
              {[
                { id: 'ALL', label: 'Tất Cả' },
                { id: 'DRUGS', label: '💊 Thuốc Tân Dược' },
                { id: 'SPECIALTY_DRUGS', label: '🧬 Ung Thư / BFS / Tiêm' },
                { id: 'HERBAL_DRUGS', label: '🌿 Đông Dược KCNC' },
                { id: 'MEDICAL_DEVICES', label: '🩺 Thiết Bị Y Tế' },
                { id: 'CONSUMABLES', label: '🩹 Vật Tư Tiêu Hao' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMedSegment(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    medSegment === tab.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-slate-200 bg-white/[0.03] border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Quick Win Rate & Search */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 font-bold">TỶ LỆ TRÚNG:</span>
                {[
                  { rate: 0, label: 'Tất cả' },
                  { rate: 85, label: '🌟 Siêu cao (> 85%)' },
                  { rate: 80, label: '⭐ Cao (80% - 85%)' },
                  { rate: 70, label: '📊 Trên 70%' },
                ].map((chip) => (
                  <button
                    key={chip.rate}
                    type="button"
                    onClick={() => setMedMinRate(chip.rate)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      medMinRate === chip.rate
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : 'text-slate-400 hover:text-slate-200 bg-white/[0.03] border border-transparent'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}

                <label className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold cursor-pointer ml-3">
                  <input
                    type="checkbox"
                    checked={medListedOnly}
                    onChange={(e) => setMedListedOnly(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Chỉ mã niêm yết</span>
                </label>
              </div>

              {/* Search Box */}
              <div className="relative min-w-[240px]">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={medSearch}
                  onChange={(e) => setMedSearch(e.target.value)}
                  placeholder="Tìm theo tên, mã CK, MST..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* CONTRACTORS TABLE */}
          <div className="rounded-xl border border-[#1e2430] bg-[#141822] overflow-hidden">
            <div className="px-4 py-2.5 bg-black/20 border-b border-white/5 flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">
                Danh Sách Nhà Thầu &amp; Doanh Nghiệp Niêm Yết ({filteredContractors.length})
              </span>
              <span className="text-[11px] text-emerald-400/90 flex items-center gap-1 font-medium">
                <span>💡 Nhấp vào bất kỳ dòng nào để xem chi tiết toàn bộ gói thầu &amp; hồ sơ</span>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1e2430] bg-black/20 text-slate-400 font-semibold select-none">
                    <th className="py-3 px-3 w-12 text-center">#</th>
                    <th className="py-3 px-3 min-w-[200px]">Doanh Nghiệp / Mã CK</th>
                    <th className="py-3 px-3">MST</th>
                    <th className="py-3 px-3">Phân Khúc</th>
                    <th className="py-3 px-3 text-right">Gói Tham Gia</th>
                    <th className="py-3 px-3 text-right">Gói Trúng</th>
                    <th className="py-3 px-3 min-w-[140px]">Tỷ Lệ Trúng Thầu</th>
                    <th className="py-3 px-3 text-right">Doanh Số Trúng</th>
                    <th className="py-3 px-3">Bệnh Viện Tiêu Biểu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredContractors.map((c, idx) => {
                    const isFocus = FOCUS_STOCKS.includes(c.stock_code || '');
                    const barColor =
                      c.win_rate >= 85
                        ? '#10b981'
                        : c.win_rate >= 80
                        ? '#38bdf8'
                        : '#f59e0b';

                    return (
                      <tr
                        key={c.id}
                        onClick={() => {
                          setSelectedContractor(c);
                          setModalPkgQuarter('ALL');
                        }}
                        className={`cursor-pointer hover:bg-emerald-500/[0.08] transition-all group/row ${
                          isFocus ? 'bg-emerald-500/[0.02]' : ''
                        }`}
                        title={`Nhấp để xem danh sách gói thầu & hồ sơ của ${c.short_name}`}
                      >
                        <td className="py-3 px-3 text-center text-slate-500 font-bold group-hover/row:text-emerald-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm group-hover/row:text-emerald-300 transition-colors">
                              {c.short_name}
                            </span>
                            {c.stock_code ? (
                              <span className="px-1.5 py-0.5 rounded text-[10.5px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                {c.stock_code} • {c.exchange || 'UPCoM'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">Chưa niêm yết</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {c.name}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                          {c.tax_code}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] bg-white/5 text-slate-300 border border-white/5">
                            {c.segment}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-300">
                          {c.bids_participated.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-400">
                          {c.bids_won.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="font-extrabold" style={{ color: barColor }}>
                                {c.win_rate}%
                              </span>
                              <span className="text-slate-500 text-[10px]">
                                Giảm TB {c.avg_discount_rate}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${c.win_rate}%`, backgroundColor: barColor }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-white text-xs">
                          {formatBillion(c.total_winning_value)}
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-400 max-w-[200px]">
                          {(c.top_hospital_clients || []).slice(0, 2).join(', ')}
                          {(c.top_hospital_clients || []).length > 2 ? '...' : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* INTERACTIVE COLUMN CHART: PHARMA STOCKS BIDDING VS REVENUE BY QUARTER */}
          {chartContractor && (
            <div className="pt-2">
              <BiddingRevenueChart
                contractor={chartContractor}
                allContractors={listedStocksWithSeries}
                onSelectContractor={(code) => setSelectedChartStock(code)}
                title={`Biểu Đồ Đối Chiếu Chu Kỳ: Giá Trị & Số Gói Trúng Thầu vs Doanh Thu Thuần (${chartContractor.stock_code})`}
              />
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: INFRASTRUCTURE & MACRO INTEREST RATE FORECAST    */}
      {/* ======================================================== */}
      {activeTab === 'INFRASTRUCTURE' && (
        <div className="space-y-6">
          {/* MACRO HERO CARD */}
          {macroForecast && (
            <div className="relative rounded-2xl border border-sky-500/30 bg-gradient-to-br from-[#101726] via-[#141b2c] to-[#0f1422] p-6 shadow-xl shadow-black/40 overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10.5px] font-extrabold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      MÔ HÌNH DỰ BÁO VĨ MÔ
                    </span>
                    <span className="text-xs text-slate-400">
                      Điểm rơi hoàn thành dự án ĐTC &amp; Xu hướng lãi suất
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>{macroForecast.forecast.macro_interest_rate_trend}</span>
                    <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Thanh khoản: {macroForecast.forecast.system_liquidity_status}
                    </span>
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 text-right">
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="text-[10.5px] text-slate-400">Điểm đảo chiều nới lỏng (Pivot)</div>
                    <div className="text-sm font-extrabold text-emerald-400">
                      {macroForecast.forecast.pivot_quarter_for_rate_cut}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="text-[10.5px] text-slate-400">Áp lực thâm dụng vốn</div>
                    <div className="text-sm font-extrabold text-amber-400">
                      {macroForecast.forecast.current_pressure_quarter}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
                {macroForecast.forecast.trend_description}
              </p>
            </div>
          )}

          {/* INFRASTRUCTURE KPIS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-xl border border-[#1e2430] bg-[#141822]">
              <div className="text-xs text-slate-400 font-semibold mb-1">TỔNG VỐN THEO DÕI</div>
              <div className="text-xl sm:text-2xl font-extrabold text-sky-400">
                {formatBillion(macroForecast?.kpis?.total_capital || 0)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {infrastructure.projects.length} Đại dự án ≥ 1.000 tỷ
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#1e2430] bg-[#141822]">
              <div className="text-xs text-slate-400 font-semibold mb-1">ĐANG THI CÔNG</div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-400">
                {macroForecast?.kpis?.status_counts?.['Đang thi công'] || 0} Dự án
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Đã có nhà thầu xây lắp chính</div>
            </div>

            <div className="p-4 rounded-xl border border-[#1e2430] bg-[#141822]">
              <div className="text-xs text-slate-400 font-semibold mb-1">ĐÃ HOÀN THÀNH</div>
              <div className="text-xl sm:text-2xl font-extrabold text-teal-400">
                {macroForecast?.kpis?.status_counts?.['Đã hoàn thành'] || 0} Dự án
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Hết giai đoạn thâm dụng vốn</div>
            </div>

            <div className="p-4 rounded-xl border border-[#1e2430] bg-[#141822]">
              <div className="text-xs text-slate-400 font-semibold mb-1">ĐANG CHUẨN BỊ</div>
              <div className="text-xl sm:text-2xl font-extrabold text-amber-400">
                {macroForecast?.kpis?.status_counts?.['Đang chuẩn bị'] || 0} Dự án
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Chuẩn bị đấu thầu gói xây lắp</div>
            </div>
          </div>

          {/* INFRASTRUCTURE FILTERS */}
          <div className="p-4 rounded-xl border border-[#1e2430] bg-[#141822] space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-bold mr-1">TRẠNG THÁI:</span>
              {['ALL', 'Đang thi công', 'Đang chuẩn bị', 'Đã hoàn thành'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setInfraStatus(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    infraStatus === st
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'text-slate-400 hover:text-slate-200 bg-white/[0.03] border border-transparent'
                  }`}
                >
                  {st === 'ALL' ? 'Tất cả trạng thái' : st}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-400 font-bold mr-1">LỌC THỜI GIAN:</span>
                {[
                  { id: 'ALL', label: 'Mọi thời gian' },
                  { id: 'SOON_COMPLETING', label: '⚡ Sắp hoàn thành (< 12 tháng)' },
                  { id: 'YEAR_2026', label: '🎯 Hoàn thành trong năm 2026' },
                  { id: 'RECENT_STARTED', label: '🚀 Mới khởi công (2024-2026)' },
                  { id: 'RECENT_COMPLETED', label: '✅ Mới hoàn thành gần đây' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setInfraTime(t.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      infraTime === t.id
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                        : 'text-slate-400 hover:text-slate-200 bg-white/[0.03] border border-transparent'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[240px]">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={infraSearch}
                  onChange={(e) => setInfraSearch(e.target.value)}
                  placeholder="Tìm theo tên dự án, mã, chủ đầu tư..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* PROJECTS TABLE */}
          <div className="rounded-xl border border-[#1e2430] bg-[#141822] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1e2430] bg-black/20 text-slate-400 font-semibold">
                    <th className="py-3 px-3">Mã Dự Án</th>
                    <th className="py-3 px-3 min-w-[260px]">Tên Đại Dự Án</th>
                    <th className="py-3 px-3">Chủ Đầu Tư</th>
                    <th className="py-3 px-3 text-right">Tổng Mức Đầu Tư</th>
                    <th className="py-3 px-3">Trạng Thái</th>
                    <th className="py-3 px-3">Khởi Công</th>
                    <th className="py-3 px-3">Dự Kiến Hoàn Thành</th>
                    <th className="py-3 px-3 text-right">Còn Lại</th>
                    <th className="py-3 px-3 text-center">Chi Tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredProjects.map((p) => {
                    const statusColor =
                      p.status === 'Đã hoàn thành'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : p.status === 'Đang thi công'
                        ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30';

                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3 font-mono text-[11px] text-sky-400 font-bold">
                          {p.code}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-white text-xs">{p.name}</div>
                          <div className="text-[11px] text-slate-400">{p.location || 'Toàn quốc'}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-300 text-[11px] max-w-[200px] truncate">
                          {p.investor_name}
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-white text-xs">
                          {formatBillion(p.total_capital)}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${statusColor}`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-[11px]">
                          {formatDate(p.start_date)}
                        </td>
                        <td className="py-3 px-3 text-slate-200 font-semibold text-[11px]">
                          {formatDate(p.expected_completion_date)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-teal-400 text-[11px]">
                          {p.status === 'Đã hoàn thành'
                            ? '0 thg'
                            : p.remaining_months > 0
                            ? `${p.remaining_months} thg`
                            : '--'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedProject(p)}
                            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold transition-all"
                          >
                            Hồ Sơ
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* HEALTHCARE MODAL: 2026 PACKAGES & Q3 FINANCIAL FORECAST  */}
      {/* ======================================================== */}
      {selectedContractor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#121620] p-6 shadow-2xl text-slate-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white">
                    {selectedContractor.name} ({selectedContractor.short_name})
                  </h3>
                  {selectedContractor.stock_code && (
                    <span className="px-2 py-0.5 rounded text-xs font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {selectedContractor.stock_code} • {selectedContractor.exchange || 'UPCoM'}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  MST: <span className="font-mono text-sky-400">{selectedContractor.tax_code}</span> • Trụ sở: {selectedContractor.address} • Thành lập: {selectedContractor.founded_year || '--'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContractor(null)}
                className="size-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* SPECIAL SECTION: NEW FACTORY & DRUG REGISTRATIONS (EU-GMP) */}
            {(selectedContractor as any).new_factory && (
              <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 via-[#131b26] to-[#0f141e] p-5 mb-6 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏭</span>
                    <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wide">
                      Tiến Độ Nhà Máy Mới &amp; Cấp Phép Cục Quản Lý Dược (DAV)
                    </h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {(selectedContractor as any).new_factory.approved_drugs_at_new_factory} Thuốc Đã Cấp Phép Tại KCNC
                  </span>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  <p className="font-semibold text-white">{(selectedContractor as any).new_factory.name}</p>
                  <p className="text-slate-400 mt-0.5">
                    📍 {(selectedContractor as any).new_factory.location} • Vốn: <strong className="text-amber-400">{(selectedContractor as any).new_factory.investment_billion} tỷ</strong> • Tiêu chuẩn: <strong className="text-emerald-400">{(selectedContractor as any).new_factory.target_standard}</strong>
                  </p>
                </div>
                <div className="pt-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Các dòng thuốc công nghệ cao tiêu biểu đã được cấp phép:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {((selectedContractor as any).new_factory.key_approved_drugs || []).map((drug: string, idx: number) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-[11px] font-medium bg-white/5 text-slate-200 border border-white/10">
                        💊 {drug}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SPECIAL SECTION: 2026 PACKAGES & BCTC STATUS */}
            {selectedContractor.packages_2026 && selectedContractor.packages_2026.length > 0 && (
              <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-[#131b26] to-[#0f141e] p-5 mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wide">
                      Phân Tích Gói Thầu Kênh ETC Năm 2026 &amp; Tình Hình Tài Chính ({selectedContractor.stock_code || selectedContractor.short_name})
                    </h4>
                  </div>
                  <span className="text-[11px] text-emerald-400/90 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 self-start sm:self-auto">
                    ⚡ Backlog Hợp Đồng ETC 2026
                  </span>
                </div>

                {/* 3-Quarter Cards */}
                {selectedContractor.quarterly_financials_2026 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Q1 */}
                    {selectedContractor.quarterly_financials_2026.Q1_2026 && (
                      <div className="p-3.5 rounded-lg border border-white/10 bg-white/[0.02]">
                        <div className="flex items-center justify-between text-xs font-bold text-sky-400 mb-2">
                          <span>QUÝ 1/2026</span>
                          <span className="text-[10px] bg-sky-500/15 text-sky-300 px-1.5 py-0.5 rounded">
                            BCTC Đã Công Bố
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 space-y-1">
                          <div>Trúng thầu ETC: <strong className="text-white">{selectedContractor.quarterly_financials_2026.Q1_2026.bidding_value_billion} tỷ</strong> ({selectedContractor.quarterly_financials_2026.Q1_2026.bids_won_count} gói)</div>
                          <div>Doanh thu thuần: <strong className="text-teal-300">{selectedContractor.quarterly_financials_2026.Q1_2026.net_revenue_billion} tỷ</strong></div>
                          <div>Lợi nhuận ròng (LNST): <strong className="text-emerald-400 font-bold">{selectedContractor.quarterly_financials_2026.Q1_2026.npat_billion} tỷ</strong></div>
                          <div className="pt-1.5 mt-1.5 border-t border-white/5 text-[11px] text-slate-500">
                            Biên gộp: {selectedContractor.quarterly_financials_2026.Q1_2026.gross_margin_pct}% • Biên ròng: {selectedContractor.quarterly_financials_2026.Q1_2026.net_margin_pct}%
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Q2 */}
                    {selectedContractor.quarterly_financials_2026.Q2_2026 && (
                      <div className="p-3.5 rounded-lg border border-white/10 bg-white/[0.02]">
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-400 mb-2">
                          <span>QUÝ 2/2026</span>
                          <span className="text-[10px] bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded">
                            {selectedContractor.quarterly_financials_2026.Q2_2026.status || 'BCTC Đã Công Bố'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 space-y-1">
                          <div>Trúng thầu ETC: <strong className="text-white">{selectedContractor.quarterly_financials_2026.Q2_2026.bidding_value_billion} tỷ</strong> ({selectedContractor.quarterly_financials_2026.Q2_2026.bids_won_count} gói)</div>
                          <div>Doanh thu thuần: <strong className="text-teal-300">{selectedContractor.quarterly_financials_2026.Q2_2026.net_revenue_billion} tỷ</strong></div>
                          <div>Lợi nhuận ròng (LNST): <strong className="text-emerald-400 font-bold">{selectedContractor.quarterly_financials_2026.Q2_2026.npat_billion} tỷ</strong></div>
                          <div className="pt-1.5 mt-1.5 border-t border-white/5 text-[11px] text-slate-500">
                            Biên gộp: {selectedContractor.quarterly_financials_2026.Q2_2026.gross_margin_pct}% • Biên ròng: {selectedContractor.quarterly_financials_2026.Q2_2026.net_margin_pct}%
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Q3 Actual Bidding Status */}
                    {selectedContractor.quarterly_financials_2026.Q3_2026_FORECAST && (
                      <div className="p-3.5 rounded-lg border border-sky-500/30 bg-sky-500/[0.03]">
                        <div className="flex items-center justify-between text-xs font-bold text-sky-400 mb-2">
                          <span>QUÝ 3/2026</span>
                          <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-extrabold">
                            CHỜ BCTC CÔNG BỐ
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 space-y-1">
                          <div>Trúng thầu ETC: <strong className="text-white">{selectedContractor.quarterly_financials_2026.Q3_2026_FORECAST.bidding_value_billion} tỷ</strong> (Dữ liệu đấu thầu thực tế)</div>
                          <div>Doanh thu thuần BCTC: <strong className="text-slate-300 italic">Chưa công bố BCTC Q3</strong></div>
                          <div>Lợi nhuận ròng (LNST): <strong className="text-slate-300 italic">Chưa công bố BCTC Q3</strong></div>
                          <div className="pt-1.5 mt-1.5 border-t border-white/5 text-[11px] text-slate-500">
                            Số liệu tài chính sẽ được cập nhật khi doanh nghiệp công bố BCTC Quý 3/2026.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* INTERACTIVE COLUMN CHART: QUARTERLY BIDDING VS REVENUE ACROSS YEARS */}
                {selectedContractor.quarterly_comparison_series && selectedContractor.quarterly_comparison_series.length > 0 && (
                  <div className="pt-2">
                    <BiddingRevenueChart
                      contractor={selectedContractor}
                      isModal={true}
                      title={`Biểu Đồ Đối Chiếu: Giá Trị & Số Gói Trúng Thầu vs Doanh Thu (${selectedContractor.stock_code})`}
                    />
                  </div>
                )}

                {/* Filter Chips & Sort Controls for 2026 Packages */}
                <div className="pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                    {/* Quarter Filter Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-slate-400 font-bold mr-1">LỌC GÓI THẦU 2026:</span>
                      {['ALL', 'Q1/2026', 'Q2/2026', 'Q3/2026'].map((q) => {
                        const count =
                          q === 'ALL'
                            ? selectedContractor.packages_2026?.length
                            : selectedContractor.packages_2026?.filter((p) => p.quarter === q).length;

                        return (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setModalPkgQuarter(q)}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                              modalPkgQuarter === q
                                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                                : 'bg-white/5 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            {q === 'ALL' ? `Tất cả 2026 (${count})` : `${q} (${count})`}
                          </button>
                        );
                      })}
                    </div>

                    {/* Sắp Xếp Options */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-slate-400 font-bold mr-1">SẮP XẾP:</span>

                      {/* Sort: Thời gian từ gần đến xa */}
                      <button
                        type="button"
                        onClick={() => {
                          if (modalPkgSortField === 'date') {
                            setModalPkgSortOrder(modalPkgSortOrder === 'desc' ? 'asc' : 'desc');
                          } else {
                            setModalPkgSortField('date');
                            setModalPkgSortOrder('desc');
                          }
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all border ${
                          modalPkgSortField === 'date'
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-xs'
                            : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'
                        }`}
                        title="Sắp xếp theo ngày quyết định trúng thầu"
                      >
                        <span>📅 Thời gian:</span>
                        <strong className={modalPkgSortField === 'date' ? 'text-sky-300' : 'text-slate-300'}>
                          {modalPkgSortField === 'date' && modalPkgSortOrder === 'asc' ? 'Xa → Gần' : 'Gần → Xa'}
                        </strong>
                        <span className="font-bold text-sky-400">
                          {modalPkgSortField === 'date' ? (modalPkgSortOrder === 'desc' ? '↓' : '↑') : '⇅'}
                        </span>
                      </button>

                      {/* Sort: Giá trị gói thầu từ lớn đến bé */}
                      <button
                        type="button"
                        onClick={() => {
                          if (modalPkgSortField === 'price') {
                            setModalPkgSortOrder(modalPkgSortOrder === 'desc' ? 'asc' : 'desc');
                          } else {
                            setModalPkgSortField('price');
                            setModalPkgSortOrder('desc');
                          }
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all border ${
                          modalPkgSortField === 'price'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                            : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'
                        }`}
                        title="Sắp xếp theo giá trị gói trúng thầu"
                      >
                        <span>💰 Giá trị gói:</span>
                        <strong className={modalPkgSortField === 'price' ? 'text-emerald-300' : 'text-slate-300'}>
                          {modalPkgSortField === 'price' && modalPkgSortOrder === 'asc' ? 'Bé → Lớn' : 'Lớn → Bé'}
                        </strong>
                        <span className="font-bold text-emerald-400">
                          {modalPkgSortField === 'price' ? (modalPkgSortOrder === 'desc' ? '↓' : '↑') : '⇅'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Packages Table */}
                  <div className="max-h-72 overflow-y-auto rounded-lg border border-white/10 bg-black/30">
                    <table className="w-full text-left text-[11.5px] border-collapse">
                      <thead className="sticky top-0 bg-[#161c28] text-slate-400 font-semibold border-b border-white/10 select-none">
                        <tr>
                          <th className="py-2 px-2.5">Quý</th>
                          <th className="py-2 px-2.5">Số TBMT</th>
                          <th className="py-2 px-2.5 min-w-[220px]">Tên Gói Thầu &amp; Bệnh Viện</th>
                          <th className="py-2 px-2.5">Hoạt Chất / Phạm Vi</th>
                          <th className="py-2 px-2.5 text-right">Giá Gói</th>
                          <th
                            onClick={() => {
                              if (modalPkgSortField === 'price') {
                                setModalPkgSortOrder(modalPkgSortOrder === 'desc' ? 'asc' : 'desc');
                              } else {
                                setModalPkgSortField('price');
                                setModalPkgSortOrder('desc');
                              }
                            }}
                            className={`py-2 px-2.5 text-right cursor-pointer hover:bg-white/5 transition-colors ${
                              modalPkgSortField === 'price' ? 'text-emerald-300 font-bold bg-emerald-500/10' : 'text-emerald-400'
                            }`}
                            title="Nhấp để sắp xếp giá trị gói thầu (lớn đến bé / bé đến lớn)"
                          >
                            <span className="inline-flex items-center gap-1 justify-end">
                              <span>Giá Trúng</span>
                              <span className="text-[11px] font-bold">
                                {modalPkgSortField === 'price' ? (modalPkgSortOrder === 'desc' ? '↓' : '↑') : '⇅'}
                              </span>
                            </span>
                          </th>
                          <th
                            onClick={() => {
                              if (modalPkgSortField === 'date') {
                                setModalPkgSortOrder(modalPkgSortOrder === 'desc' ? 'asc' : 'desc');
                              } else {
                                setModalPkgSortField('date');
                                setModalPkgSortOrder('desc');
                              }
                            }}
                            className={`py-2 px-2.5 text-center cursor-pointer hover:bg-white/5 transition-colors ${
                              modalPkgSortField === 'date' ? 'text-sky-300 font-bold bg-sky-500/10' : ''
                            }`}
                            title="Nhấp để sắp xếp thời gian (gần đến xa / xa đến gần)"
                          >
                            <span className="inline-flex items-center gap-1 justify-center">
                              <span>Ngày QĐ</span>
                              <span className="text-[11px] font-bold">
                                {modalPkgSortField === 'date' ? (modalPkgSortOrder === 'desc' ? '↓' : '↑') : '⇅'}
                              </span>
                            </span>
                          </th>
                          <th className="py-2 px-2.5 text-center">Trạng Thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {sortedModalPackages.map((pkg, pIdx) => {
                          return (
                            <tr key={pkg.code || pIdx} className="hover:bg-white/[0.02]">
                              <td className="py-2 px-2.5 font-bold text-sky-400">{pkg.quarter}</td>
                              <td className="py-2 px-2.5 font-mono text-teal-400">{pkg.code}</td>
                              <td className="py-2 px-2.5">
                                <div className="font-semibold text-white">{pkg.name}</div>
                                <div className="text-[10.5px] text-slate-400">{pkg.client}</div>
                              </td>
                              <td className="py-2 px-2.5 text-slate-400">{pkg.scope || '--'}</td>
                              <td className="py-2 px-2.5 text-right text-slate-400">
                                {formatBillion(pkg.pkg_price)}
                              </td>
                              <td className="py-2 px-2.5 text-right font-bold text-emerald-400">
                                {formatBillion(pkg.win_price)}
                              </td>
                              <td className="py-2 px-2.5 text-center text-slate-400 whitespace-nowrap">
                                {formatDate(pkg.award_date)}
                              </td>
                              <td className="py-2 px-2.5 text-center">
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-slate-300">
                                  {pkg.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* General Contractor Profile Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-2">
                <h5 className="font-bold text-sky-400 uppercase text-[11px]">Thông số năng lực đấu thầu</h5>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Tổng doanh số trúng thầu:</span>
                  <span className="font-bold text-white text-sm">{formatBillion(selectedContractor.total_winning_value)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Tỷ lệ trúng thầu (Win rate):</span>
                  <span className="font-bold text-emerald-400 text-sm">{selectedContractor.win_rate}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Số gói đã trúng:</span>
                  <span className="font-semibold text-white">{selectedContractor.bids_won.toLocaleString('vi-VN')} gói</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Số gói tham gia:</span>
                  <span className="font-semibold text-slate-300">{selectedContractor.bids_participated.toLocaleString('vi-VN')} gói</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Tỷ lệ giảm giá TB so với giá gói:</span>
                  <span className="font-semibold text-amber-400">-{selectedContractor.avg_discount_rate}%</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-3">
                <h5 className="font-bold text-teal-400 uppercase text-[11px]">Thế mạnh hoạt chất &amp; Khách hàng bệnh viện</h5>
                <div>
                  <div className="text-slate-400 mb-1.5">Sản phẩm / Dược phẩm chủ lực:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedContractor.key_products || []).map((p, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-[10.5px] bg-teal-500/10 text-teal-300 border border-teal-500/20">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 mb-1">Top bệnh viện khách hàng:</div>
                  <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                    {(selectedContractor.top_hospital_clients || []).map((h, idx) => (
                      <li key={idx}>{h}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* INFRASTRUCTURE PROJECT DETAIL MODAL                      */}
      {/* ======================================================== */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#121620] p-6 shadow-2xl text-slate-200">
            <div className="flex items-start justify-between border-b border-white/10 pb-4 mb-4">
              <div>
                <span className="font-mono text-xs text-sky-400 font-bold">{selectedProject.code}</span>
                <h3 className="text-lg font-bold text-white mt-1">{selectedProject.name}</h3>
                <div className="text-xs text-slate-400">Địa điểm: {selectedProject.location || 'Toàn quốc'}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="size-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <span className="text-slate-400">Tổng mức đầu tư:</span>
                  <div className="text-lg font-bold text-sky-400">{formatBillion(selectedProject.total_capital)}</div>
                </div>
                <div>
                  <span className="text-slate-400">Trạng thái:</span>
                  <div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300">
                      {selectedProject.status}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Chủ đầu tư:</span>
                  <div className="font-semibold text-white">{selectedProject.investor_name}</div>
                </div>
                <div>
                  <span className="text-slate-400">Lĩnh vực:</span>
                  <div className="font-semibold text-slate-300">{selectedProject.sector || 'Hạ tầng giao thông'}</div>
                </div>
                <div>
                  <span className="text-slate-400">Ngày khởi công:</span>
                  <div className="font-semibold text-slate-300">{formatDate(selectedProject.start_date)}</div>
                </div>
                <div>
                  <span className="text-slate-400">Dự kiến hoàn thành:</span>
                  <div className="font-semibold text-emerald-400">{formatDate(selectedProject.expected_completion_date)}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                <div className="font-bold text-teal-400 text-xs">Ý nghĩa đối với vòng quay vốn &amp; Lãi suất:</div>
                <p className="text-slate-300 leading-relaxed">
                  Khi dự án chuyển trạng thái từ &quot;Đang thi công&quot; sang &quot;Đã hoàn thành&quot;, nhu cầu hấp thụ vốn xây lắp ngắn hạn được giải tỏa, dòng tiền thanh quyết toán được giải phóng vào hệ thống ngân hàng, góp phần tạo dư địa hạ lãi suất tiền gửi và cho vay.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
