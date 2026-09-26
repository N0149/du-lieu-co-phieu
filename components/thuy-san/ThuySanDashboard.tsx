'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  SEAFOOD_STOCKS,
  WEEKLY_MATERIAL_PRICES,
  VASEP_SECTOR_STATS,
  SeafoodStockIntel,
} from '@/lib/thuy-san-data';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Fish,
  Anchor,
  Search,
  Filter,
  BarChart3,
  Calendar,
  Layers,
  ShieldCheck,
  Building2,
  ChevronRight,
  ExternalLink,
  Sparkles,
  ArrowUpRight,
  Globe2,
  CheckCircle2,
  AlertTriangle,
  Scale,
  DollarSign,
  Maximize2,
  Ship,
  FileText,
  Activity,
} from 'lucide-react';

export function ThuySanDashboard() {
  // Main Tab State
  const [activeTab, setActiveTab] = useState<'STOCKS' | 'PRICES' | 'EXPORTS' | 'LOGISTICS'>('STOCKS');

  // Stock Filter State
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedExchange, setSelectedExchange] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [ratingFilter, setRatingFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'marketCap' | 'profitGrowthYoY' | 'pe' | 'revenueEst'>('profitGrowthYoY');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Selected Stock for Detail Modal / Drawer
  const [selectedStock, setSelectedStock] = useState<SeafoodStockIntel | null>(SEAFOOD_STOCKS[0]);

  // Head-to-Head Compare State
  const [compareStock1, setCompareStock1] = useState<string>('ANV');
  const [compareStock2, setCompareStock2] = useState<string>('VHC');

  // Filtered Stocks Memo
  const filteredStocks = useMemo(() => {
    return SEAFOOD_STOCKS.filter((stock) => {
      if (selectedCategory !== 'ALL' && stock.category !== selectedCategory) return false;
      if (selectedExchange !== 'ALL' && stock.exchange !== selectedExchange) return false;
      if (ratingFilter !== 'ALL' && stock.q3Forecast.rating !== ratingFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTicker = stock.ticker.toLowerCase().includes(query);
        const matchName = stock.name.toLowerCase().includes(query);
        const matchProduct = stock.mainProducts.some((p) => p.toLowerCase().includes(query));
        if (!matchTicker && !matchName && !matchProduct) return false;
      }
      return true;
    }).sort((a, b) => {
      let valA: number;
      let valB: number;
      if (sortField === 'profitGrowthYoY') {
        valA = a.q3Forecast.profitGrowthYoY;
        valB = b.q3Forecast.profitGrowthYoY;
      } else if (sortField === 'marketCap') {
        valA = a.marketCap;
        valB = b.marketCap;
      } else if (sortField === 'pe') {
        valA = a.pe;
        valB = b.pe;
      } else {
        valA = a.q3Forecast.revenueEst;
        valB = b.q3Forecast.revenueEst;
      }
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
  }, [selectedCategory, selectedExchange, ratingFilter, searchQuery, sortField, sortOrder]);

  // Chart data for Price Trends (Reverse to show chronological order)
  const priceChartData = useMemo(() => {
    return [...WEEKLY_MATERIAL_PRICES].reverse().map((item) => ({
      date: item.period.split('–')[0].trim(),
      'Cá tra (0.7-1kg)': item.pangasius_white_meat,
      'Cá tra giống': item.pangasius_fingerling,
      'Tôm thẻ 50 con': item.white_shrimp_50,
      'Tôm thẻ 100 con': item.white_shrimp_100,
      'Tôm sú 30 con': item.black_tiger_shrimp_30,
      'Nghêu / Hàu': item.clam_mussel,
    }));
  }, []);

  // Comparison Stock 1 & 2 Objects
  const comp1 = useMemo(() => SEAFOOD_STOCKS.find((s) => s.ticker === compareStock1) || SEAFOOD_STOCKS[0], [compareStock1]);
  const comp2 = useMemo(() => SEAFOOD_STOCKS.find((s) => s.ticker === compareStock2) || SEAFOOD_STOCKS[1], [compareStock2]);

  return (
    <div className="space-y-6">
      {/* 1. TOP KPI STRIP - METRICS CỐT LÕI TỪ VASEP THÁNG 8 & 9/2026 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="rounded-xl border border-white/10 bg-[#141721] p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Xuất Khẩu Thủy Sản 8T</span>
            <span className="flex items-center text-emerald-400 font-semibold text-[11px]">
              <TrendingUp className="size-3 mr-0.5" /> +11.2%
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-white">6,30</span>
            <span className="text-xs text-slate-400">tỷ USD</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 truncate">
            Tháng 8 đạt 950 tr USD (+13% YoY)
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#141721] p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Cá Tra 8T (1,5 tỷ USD)</span>
            <span className="flex items-center text-emerald-400 font-semibold text-[11px]">
              <TrendingUp className="size-3 mr-0.5" /> +10.0%
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-cyan-400">Trung Quốc +29%</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 truncate">
            Brazil +26% | Mỹ chịu áp lực nền cao
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#141721] p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tôm Xuất Khẩu 8T</span>
            <span className="flex items-center text-emerald-400 font-semibold text-[11px]">
              <TrendingUp className="size-3 mr-0.5" /> +12.0%
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-emerald-400">2,80</span>
            <span className="text-xs text-slate-400">tỷ USD</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 truncate">
            FMC tháng 8 tăng vọt +32% YoY
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#141721] p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Giá Cá Tra Nguyên Liệu</span>
            <span className="flex items-center text-amber-400 font-semibold text-[11px]">
              <TrendingUp className="size-3 mr-0.5" /> +1.000 đ
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-amber-400">31 - 34k</span>
            <span className="text-xs text-slate-400">đ/kg</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 truncate">
            Tuần 25/09 | Cá giống +7.000 đ/kg
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-emerald-300">
            <span>Dự Báo Lợi Nhuận Q3/2026</span>
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">VASEP</span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-base font-black text-emerald-400">ANV • FMC • ACL</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-300 truncate">
            Điểm rơi lợi nhuận vượt trội Q3
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('STOCKS')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition-all',
              activeTab === 'STOCKS'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            )}
          >
            <Scale className="size-4" />
            <span>So Sánh 12 Cổ Phiếu Thủy Sản</span>
            <span className={cn(
              'ml-1 rounded px-1.5 py-0.2 text-[10px] font-bold',
              activeTab === 'STOCKS' ? 'bg-slate-950/20 text-slate-950' : 'bg-white/10 text-emerald-400'
            )}>
              12 Mã
            </span>
          </button>

          <button
            onClick={() => setActiveTab('PRICES')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition-all',
              activeTab === 'PRICES'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            )}
          >
            <Calendar className="size-4" />
            <span>Bảng Giá Nguyên Liệu Hàng Tuần</span>
            <span className="ml-1 rounded bg-amber-400/20 text-amber-300 px-1.5 py-0.2 text-[10px] font-bold">
              25/09
            </span>
          </button>

          <button
            onClick={() => setActiveTab('EXPORTS')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition-all',
              activeTab === 'EXPORTS'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            )}
          >
            <Globe2 className="size-4" />
            <span>Kim Ngạch Xuất Khẩu Thị Trường</span>
          </button>

          <button
            onClick={() => setActiveTab('LOGISTICS')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition-all',
              activeTab === 'LOGISTICS'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            )}
          >
            <Ship className="size-4" />
            <span>Cước Tàu &amp; Thuế POR/CVD/IUU</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Dữ liệu VASEP cập nhật mới nhất T9/2026</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: SO SÁNH 12 CỔ PHIẾU THỦY SẢN                           */}
      {/* ============================================================== */}
      {activeTab === 'STOCKS' && (
        <div className="space-y-6">
          {/* Controls Bar: Category Filter, Search & Sorting */}
          <div className="rounded-xl border border-white/10 bg-[#141721] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                  <Filter className="size-3.5" /> Ngành:
                </span>
                {[
                  { id: 'ALL', label: 'Tất cả (12 mã)' },
                  { id: 'Cá tra', label: 'Cá tra (VHC, ANV, ACL, IDI, AAM, CCA)' },
                  { id: 'Tôm', label: 'Tôm (FMC, CMX, MPC, CAT)' },
                  { id: 'Nghêu & Nhuyễn thể', label: 'Nghêu (ABT)' },
                  { id: 'Surimi & Bột cá', label: 'Bột cá & Surimi (KHS)' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                      selectedCategory === cat.id
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Sàn Niêm Yết */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-semibold">Sàn:</span>
                {['ALL', 'HOSE', 'HNX', 'UPCoM'].map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setSelectedExchange(ex)}
                    className={cn(
                      'rounded px-2.5 py-1 text-xs font-semibold',
                      selectedExchange === ex
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-white'
                    )}
                  >
                    {ex === 'ALL' ? 'Tất cả' : ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Search, Rating Filter & Sort */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm mã cổ phiếu (CAT, ABT, CMX, ACL...) hoặc sản phẩm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0c0e14] py-1.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Triển vọng Q3 Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400">Triển vọng Q3:</span>
                  <select
                    value={ratingFilter}
                    onChange={(e) => setRatingFilter(e.target.value)}
                    className="rounded-lg border border-white/10 bg-[#0c0e14] px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="ALL">Tất cả xếp hạng</option>
                    <option value="TĂNG TRƯỞNG MẠNH">TĂNG TRƯỞNG MẠNH (ANV, FMC)</option>
                    <option value="TĂNG TRƯỞNG TÍCH CỰC">TĂNG TRƯỞNG TÍCH CỰC (ACL, ABT)</option>
                    <option value="KHẢ QUAN">KHẢ QUAN (VHC, CMX, IDI, KHS, CAT, CCA)</option>
                    <option value="ĐI NGANG">ĐI NGANG (AAM)</option>
                  </select>
                </div>

                {/* Sắp xếp */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400">Sắp xếp:</span>
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as any)}
                    className="rounded-lg border border-white/10 bg-[#0c0e14] px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="profitGrowthYoY">Tăng trưởng LN Q3 dự kiến (%)</option>
                    <option value="marketCap">Vốn hóa thị trường</option>
                    <option value="revenueEst">Doanh thu dự kiến Q3</option>
                    <option value="pe">P/E định giá</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                    className="rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-300 hover:text-white"
                  >
                    {sortOrder === 'desc' ? '↓ Giảm dần' : '↑ Tăng dần'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Comparison Selector (Head-to-head) */}
          <div className="rounded-xl border border-white/10 bg-gradient-to-r from-emerald-950/20 via-[#141721] to-cyan-950/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Scale className="size-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">So Sánh Đối Đầu Nhanh 2 Cổ Phiếu Thủy Sản</h3>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={compareStock1}
                  onChange={(e) => setCompareStock1(e.target.value)}
                  className="rounded border border-emerald-500/30 bg-[#0c0e14] px-2 py-1 font-bold text-emerald-400"
                >
                  {SEAFOOD_STOCKS.map((s) => (
                    <option key={s.ticker} value={s.ticker}>
                      {s.ticker} - {s.name}
                    </option>
                  ))}
                </select>
                <span className="text-slate-400 font-bold">VS</span>
                <select
                  value={compareStock2}
                  onChange={(e) => setCompareStock2(e.target.value)}
                  className="rounded border border-cyan-500/30 bg-[#0c0e14] px-2 py-1 font-bold text-cyan-400"
                >
                  {SEAFOOD_STOCKS.map((s) => (
                    <option key={s.ticker} value={s.ticker}>
                      {s.ticker} - {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comparison Side-by-side Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-emerald-500/30 bg-[#0e1118] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-black text-emerald-400">
                      {comp1.ticker}
                    </span>
                    <span className="text-xs text-slate-300 font-semibold">{comp1.name} ({comp1.exchange})</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">
                    {comp1.q3Forecast.rating}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t border-white/5">
                  <div className="rounded bg-white/5 p-1.5">
                    <div className="text-[10px] text-slate-400">DT Dự phóng Q3</div>
                    <div className="font-bold text-white">{comp1.q3Forecast.revenueEst.toLocaleString()} tỷ (+{comp1.q3Forecast.revenueGrowthYoY}%)</div>
                  </div>
                  <div className="rounded bg-emerald-500/10 p-1.5 border border-emerald-500/20">
                    <div className="text-[10px] text-emerald-300">LN Dự phóng Q3</div>
                    <div className="font-bold text-emerald-400">{comp1.q3Forecast.profitEst.toLocaleString()} tỷ (+{comp1.q3Forecast.profitGrowthYoY}%)</div>
                  </div>
                  <div className="rounded bg-white/5 p-1.5">
                    <div className="text-[10px] text-slate-400">Tự chủ vùng nuôi</div>
                    <div className="font-bold text-cyan-300">{comp1.farmingAutonomy.rate}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-300">
                  <strong className="text-slate-400">Thị trường chủ lực:</strong> {comp1.keyMarkets.map(m => `${m.market} (${m.share}%)`).join(', ')}
                </div>
                <div className="text-xs text-slate-400 italic">
                  &ldquo;{comp1.q3Forecast.vasepSignal}&rdquo;
                </div>
              </div>

              <div className="rounded-lg border border-cyan-500/30 bg-[#0e1118] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-xs font-black text-cyan-400">
                      {comp2.ticker}
                    </span>
                    <span className="text-xs text-slate-300 font-semibold">{comp2.name} ({comp2.exchange})</span>
                  </div>
                  <span className="text-xs font-bold text-cyan-400">
                    {comp2.q3Forecast.rating}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t border-white/5">
                  <div className="rounded bg-white/5 p-1.5">
                    <div className="text-[10px] text-slate-400">DT Dự phóng Q3</div>
                    <div className="font-bold text-white">{comp2.q3Forecast.revenueEst.toLocaleString()} tỷ (+{comp2.q3Forecast.revenueGrowthYoY}%)</div>
                  </div>
                  <div className="rounded bg-cyan-500/10 p-1.5 border border-cyan-500/20">
                    <div className="text-[10px] text-cyan-300">LN Dự phóng Q3</div>
                    <div className="font-bold text-cyan-400">{comp2.q3Forecast.profitEst.toLocaleString()} tỷ (+{comp2.q3Forecast.profitGrowthYoY}%)</div>
                  </div>
                  <div className="rounded bg-white/5 p-1.5">
                    <div className="text-[10px] text-slate-400">Tự chủ vùng nuôi</div>
                    <div className="font-bold text-cyan-300">{comp2.farmingAutonomy.rate}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-300">
                  <strong className="text-slate-400">Thị trường chủ lực:</strong> {comp2.keyMarkets.map(m => `${m.market} (${m.share}%)`).join(', ')}
                </div>
                <div className="text-xs text-slate-400 italic">
                  &ldquo;{comp2.q3Forecast.vasepSignal}&rdquo;
                </div>
              </div>
            </div>
          </div>

          {/* Master Table of 12 Seafood Stocks */}
          <div className="rounded-xl border border-white/10 bg-[#141721] overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Bảng So Sánh Chỉ Số Chi Tiết 12 Doanh Nghiệp Thủy Sản ({filteredStocks.length} mã phù hợp)
                </h3>
              </div>
              <span className="text-xs text-slate-400">Nhấp vào từng hàng để xem phân tích chi tiết</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Mã CP</th>
                    <th className="py-3 px-3">Phân Ngành</th>
                    <th className="py-3 px-3">Thị Trường Cốt Lõi</th>
                    <th className="py-3 px-3">Tự Chủ Vùng Nuôi</th>
                    <th className="py-3 px-3 text-right">Giá / P/E</th>
                    <th className="py-3 px-3 text-right">Vốn Hóa (Tỷ)</th>
                    <th className="py-3 px-3 text-right">DT Dự kiến Q3</th>
                    <th className="py-3 px-3 text-right">LN Dự kiến Q3 (YoY)</th>
                    <th className="py-3 px-3 text-center">Xếp Hạng Q3</th>
                    <th className="py-3 px-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredStocks.map((stock) => {
                    const isSelected = selectedStock?.ticker === stock.ticker;
                    return (
                      <tr
                        key={stock.ticker}
                        onClick={() => setSelectedStock(stock)}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-white/5',
                          isSelected ? 'bg-emerald-500/10' : ''
                        )}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-emerald-400 text-sm">{stock.ticker}</span>
                            <span className="rounded bg-white/10 px-1.5 py-0.2 text-[9px] text-slate-400 font-semibold">
                              {stock.exchange}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[150px]">{stock.name}</div>
                        </td>

                        <td className="py-3 px-3">
                          <span className={cn(
                            'rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                            stock.category === 'Cá tra' ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' :
                            stock.category === 'Tôm' ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30' :
                            stock.category === 'Nghêu & Nhuyễn thể' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                            'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                          )}>
                            {stock.category}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="text-white font-medium truncate max-w-[170px]">
                            {stock.keyMarkets.slice(0, 2).map((m) => `${m.market} (${m.share}%)`).join(', ')}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {stock.keyMarkets[0]?.status} ({stock.keyMarkets[0]?.growthYoY > 0 ? `+${stock.keyMarkets[0]?.growthYoY}%` : `${stock.keyMarkets[0]?.growthYoY}%`})
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-semibold text-cyan-300">{stock.farmingAutonomy.rate}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                            {stock.farmingAutonomy.feedSelfSufficient ? '100% tự chủ thức ăn' : 'Thu mua ngoài kết hợp'}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="font-bold text-white">{stock.currentPrice.toFixed(1)}k</div>
                          <div className="text-[10px] text-slate-400">P/E: {stock.pe}x | P/B: {stock.pb}x</div>
                        </td>

                        <td className="py-3 px-3 text-right font-medium text-slate-300">
                          {stock.marketCap.toLocaleString()}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="font-bold text-white">{stock.q3Forecast.revenueEst.toLocaleString()} tỷ</div>
                          <div className="text-[10px] text-emerald-400">+{stock.q3Forecast.revenueGrowthYoY}% YoY</div>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="font-black text-emerald-400 text-sm">
                            {stock.q3Forecast.profitEst.toLocaleString()} tỷ
                          </div>
                          <div className={cn(
                            'text-[10px] font-bold',
                            stock.q3Forecast.profitGrowthYoY >= 50 ? 'text-emerald-300' :
                            stock.q3Forecast.profitGrowthYoY > 0 ? 'text-teal-300' : 'text-slate-400'
                          )}>
                            +{stock.q3Forecast.profitGrowthYoY}% YoY
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black',
                            stock.q3Forecast.rating === 'TĂNG TRƯỞNG MẠNH' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                            stock.q3Forecast.rating === 'TĂNG TRƯỞNG TÍCH CỰC' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' :
                            stock.q3Forecast.rating === 'KHẢ QUAN' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                            'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          )}>
                            {stock.q3Forecast.rating}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <Link
                            href={`/stock/${stock.ticker}`}
                            prefetch={false}
                            className="inline-flex items-center gap-1 rounded bg-white/5 hover:bg-emerald-500 hover:text-slate-950 px-2 py-1 text-[10px] font-bold text-slate-300 transition-colors"
                          >
                            <span>BCTC</span>
                            <ArrowUpRight className="size-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Deep-dive Inspection Card for Selected Stock */}
          {selectedStock && (
            <div className="rounded-xl border border-emerald-500/30 bg-[#12151e] p-5 shadow-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 text-slate-950 font-black text-lg shadow-md shadow-emerald-500/20">
                    {selectedStock.ticker}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-white">{selectedStock.name}</h3>
                      <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-bold text-slate-300">
                        {selectedStock.exchange}
                      </span>
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
                        {selectedStock.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sản phẩm cốt lõi: {selectedStock.mainProducts.join(' • ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Dự phóng KQKD Quý 3/2026</div>
                    <div className="text-sm font-black text-emerald-400">
                      DT: {selectedStock.q3Forecast.revenueEst} tỷ | LNST: {selectedStock.q3Forecast.profitEst} tỷ (+{selectedStock.q3Forecast.profitGrowthYoY}%)
                    </div>
                  </div>
                  <Link
                    href={`/stock/${selectedStock.ticker}`}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 shadow-md"
                  >
                    <span>Xem BCTC Full</span>
                    <ExternalLink className="size-3.5" />
                  </Link>
                </div>
              </div>

              {/* 3 Detail Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Col 1: Cơ Cấu Thị Trường & Tự Chủ Ao Nuôi */}
                <div className="rounded-lg border border-white/5 bg-[#0e1017] p-3.5 space-y-3">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe2 className="size-3.5 text-cyan-400" />
                    <span>Cơ Cấu Thị Trường &amp; Vùng Nuôi</span>
                  </div>

                  <div className="space-y-2">
                    {selectedStock.keyMarkets.map((m, idx) => (
                      <div key={idx} className="text-xs">
                        <div className="flex justify-between font-semibold">
                          <span className="text-white">{m.market}</span>
                          <span className={cn(
                            m.status === 'Tăng mạnh' ? 'text-emerald-400 font-bold' :
                            m.status === 'Tăng ổn định' ? 'text-cyan-400' : 'text-slate-400'
                          )}>
                            {m.share}% ({m.growthYoY > 0 ? `+${m.growthYoY}%` : `${m.growthYoY}%`})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 italic">{m.note}</div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-white/5 text-xs">
                    <div className="text-slate-400 font-semibold mb-1">Mức độ tự chủ vùng nuôi:</div>
                    <div className="text-cyan-300 font-bold">{selectedStock.farmingAutonomy.rate} {selectedStock.farmingAutonomy.areaHa ? `(${selectedStock.farmingAutonomy.areaHa} ha)` : ''}</div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{selectedStock.farmingAutonomy.description}</p>
                  </div>
                </div>

                {/* Col 2: Luận Điểm Dự Phóng Tăng Trưởng Lợi Nhuận Q3 */}
                <div className="rounded-lg border border-white/5 bg-[#0e1017] p-3.5 space-y-3">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="size-3.5 text-emerald-400" />
                    <span>Động Lực Tăng Trưởng Q3/2026</span>
                  </div>

                  <ul className="space-y-2 text-xs">
                    {selectedStock.q3Forecast.drivers.map((d, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-200">
                        <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{d}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-2 border-t border-white/5">
                    <div className="text-xs font-semibold text-rose-300 mb-1 flex items-center gap-1">
                      <AlertTriangle className="size-3" /> Thách thức &amp; Rủi ro:
                    </div>
                    <ul className="space-y-1 text-[11px] text-slate-400">
                      {selectedStock.q3Forecast.headwinds.map((h, idx) => (
                        <li key={idx}>• {h}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Col 3: Tín Hiệu Chỉ Báo VASEP & Định Giá */}
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-3">
                  <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-emerald-400" />
                    <span>Tín Hiệu Dữ Liệu VASEP Báo Về</span>
                  </div>

                  <div className="rounded border border-emerald-500/30 bg-[#0e1017] p-3 text-xs text-emerald-200 leading-relaxed font-medium">
                    &ldquo;{selectedStock.q3Forecast.vasepSignal}&rdquo;
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="rounded bg-black/30 p-2">
                      <div className="text-[10px] text-slate-400">P/E Hiện Tại</div>
                      <div className="text-sm font-bold text-white">{selectedStock.pe}x</div>
                    </div>
                    <div className="rounded bg-black/30 p-2">
                      <div className="text-[10px] text-slate-400">P/B Định Giá</div>
                      <div className="text-sm font-bold text-white">{selectedStock.pb}x</div>
                    </div>
                    <div className="rounded bg-black/30 p-2">
                      <div className="text-[10px] text-slate-400">Doanh Thu Q2/2026</div>
                      <div className="text-sm font-bold text-white">{selectedStock.q2Actual.revenue} tỷ</div>
                    </div>
                    <div className="rounded bg-black/30 p-2">
                      <div className="text-[10px] text-slate-400">LNST Q2/2026</div>
                      <div className="text-sm font-bold text-white">{selectedStock.q2Actual.netProfit} tỷ</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: BẢNG GIÁ NGUYÊN LIỆU HÀNG TUẦN (VASEP WEEKLY DATA)     */}
      {/* ============================================================== */}
      {activeTab === 'PRICES' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-[#141721] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="size-4.5 text-amber-400" />
                  <span>Diễn Biến Giá Nguyên Liệu Thủy Sản Nội Địa Hàng Tuần (VASEP)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dữ liệu cập nhật trực tiếp từ các Sở NN&amp;PTNT tỉnh Đồng Tháp, An Giang, Cà Mau, Bạc Liêu được VASEP công bố hàng tuần.
                </p>
              </div>
              <span className="rounded bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 text-xs font-bold text-amber-300">
                Tuần 25/09/2026: Cá tra tăng +1.000 đ/kg | Cá giống tăng +7.000 đ/kg
              </span>
            </div>

            {/* Recharts Price Trends Line Chart */}
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceChartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#252a36" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f1218', borderColor: '#334155', fontSize: '12px' }}
                    formatter={(val: any) => [`${Number(val).toLocaleString()} đ/kg`]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="Cá tra (0.7-1kg)" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Cá tra giống" stroke="#818cf8" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Tôm thẻ 50 con" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Tôm thẻ 100 con" stroke="#facc15" strokeWidth={1.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Tôm sú 30 con" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Nghêu / Hàu" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Historical Weekly Data Table */}
          <div className="rounded-xl border border-white/10 bg-[#141721] overflow-hidden shadow-xl">
            <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Bảng Thống Kê Giá Chi Tiết Theo Tuần (VNĐ/kg)
              </span>
              <span className="text-xs text-slate-400">Đơn vị: Đồng/kg</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Tuần Báo Cáo</th>
                    <th className="py-2.5 px-3">Ngày Cập Nhật</th>
                    <th className="py-2.5 px-3 text-right">Cá Tra Thịt Trắng</th>
                    <th className="py-2.5 px-3 text-right">Biến Động WoW</th>
                    <th className="py-2.5 px-3 text-right">Cá Tra Giống</th>
                    <th className="py-2.5 px-3 text-right">Tôm Thẻ 100c</th>
                    <th className="py-2.5 px-3 text-right">Tôm Thẻ 50c</th>
                    <th className="py-2.5 px-3 text-right">Tôm Thẻ 30c</th>
                    <th className="py-2.5 px-3 text-right">Tôm Sú 30c</th>
                    <th className="py-2.5 px-3 text-right">Nghêu / Hàu</th>
                    <th className="py-2.5 px-3 text-right">Cá Diêu Hồng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {WEEKLY_MATERIAL_PRICES.map((w, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-semibold text-white">{w.period}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-400">{w.dateFormatted}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-cyan-300">
                        {w.pangasius_white_meat.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {w.pangasius_change_wow > 0 ? (
                          <span className="text-emerald-400 font-bold">(+) {w.pangasius_change_wow.toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-indigo-300 font-bold">
                        {w.pangasius_fingerling.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {w.white_shrimp_100.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-300 font-semibold">
                        {w.white_shrimp_50.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-orange-400 font-bold">
                        {w.white_shrimp_30.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-400 font-bold">
                        {w.black_tiger_shrimp_30.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                        {w.clam_mussel.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400">
                        {w.tilapia.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Impact Analysis Guide on Stock Gross Margin */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
              <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-400" />
                <span>Doanh Nghiệp Hưởng Lợi Khi Giá Nguyên Liệu Tăng</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Khi giá cá tra nguyên liệu thị trường tăng vọt lên <strong>31.000 – 34.000 đ/kg</strong> và cá giống tăng vọt lên <strong>58.000 – 65.000 đ/kg</strong>:
              </p>
              <ul className="text-xs space-y-1.5 text-slate-300">
                <li>
                  <strong className="text-emerald-400">ANV (Nam Việt):</strong> Tự chủ 100% thức ăn và ao nuôi $\rightarrow$ Giá vốn không đổi, trong khi đối thủ phải mua cá giá cao $\rightarrow$ <strong>Biên gộp mở rộng mạnh từ 8.5% lên 13-14%</strong>.
                </li>
                <li>
                  <strong className="text-emerald-400">VHC (Vĩnh Hoàn):</strong> Tự chủ 65-70% vùng nuôi chất lượng cao Sa Đéc $\rightarrow$ Duy trì ổn định biên lợi nhuận cao nhất ngành fillet cá tra.
                </li>
                <li>
                  <strong className="text-emerald-400">ACL (Cửu Long An Giang):</strong> Tự chủ &gt;85% ao nuôi $\rightarrow$ Hưởng trọn vẹn sóng tăng giá xuất khẩu sang Trung Quốc và Nam Mỹ mà không bị hụt nguồn cung.
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="size-4 text-amber-400" />
                <span>Doanh Nghiệp Chịu Sức Ép Khi Giá Nguyên Liệu Tăng</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Các doanh nghiệp phụ thuộc tỷ lệ lớn vào thu mua gom bên ngoài đầm:
              </p>
              <ul className="text-xs space-y-1.5 text-slate-300">
                <li>
                  <strong className="text-amber-400">AAM &amp; CCA:</strong> Tỷ lệ tự chủ thấp (chỉ 30-40%), phải mua cá tra thị trường $\rightarrow$ Nếu giá bán xuất khẩu FOB không tăng tương ứng thì <strong>biên lợi nhuận gộp sẽ bị co lại</strong>.
                </li>
                <li>
                  <strong className="text-emerald-400">ABT (Đặc thù ngoại lệ):</strong> Nghêu là nhuyễn thể ăn phù du tự nhiên, không tốn thức ăn công nghiệp $\rightarrow$ Biên lãi gộp miễn nhiễm với giá thức ăn, luôn neo đỉnh <strong>18-22%</strong>.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: KIM NGẠCH XUẤT KHẨU THỊ TRƯỜNG VASEP                    */}
      {/* ============================================================== */}
      {activeTab === 'EXPORTS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {VASEP_SECTOR_STATS.map((sec, idx) => (
              <div key={idx} className="rounded-xl border border-white/10 bg-[#141721] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 font-bold text-xs">
                      {idx + 1}
                    </span>
                    <h3 className="text-base font-bold text-white">{sec.sector}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Lũy kế 8 Tháng: </span>
                    <span className="text-sm font-black text-emerald-400">
                      {sec.total8mUSD.toLocaleString()} tr USD (+{sec.growth8mYoY}%)
                    </span>
                  </div>
                </div>

                {/* Market Breakdown Table */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Thị Trường Nhập Khẩu Trọng Điểm:
                  </div>
                  {sec.topMarkets.map((m, mIdx) => (
                    <div key={mIdx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-200 font-medium">{m.country}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">{m.val8mUSD} tr USD</span>
                          <span className={cn(
                            'text-[11px] font-bold',
                            m.growthYoY > 0 ? 'text-emerald-400' : 'text-rose-400'
                          )}>
                            {m.growthYoY > 0 ? `+${m.growthYoY}%` : `${m.growthYoY}%`}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                          style={{ width: `${Math.min(m.sharePercent * 2, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded border border-white/5 bg-[#0c0e14] p-2.5 text-xs text-slate-300 leading-relaxed">
                  <strong className="text-slate-400">Nhận định VASEP:</strong> {sec.marketDrivers}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: CƯỚC TÀU & THUẾ POR/CVD/IUU                            */}
      {/* ============================================================== */}
      {activeTab === 'LOGISTICS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-white/10 bg-[#141721] p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-white/10 pb-3">
              <Ship className="size-4.5 text-cyan-400" />
              <span>Tình Hình Cước Tàu Container Lạnh (Reefer Freight Rates)</span>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                Thủy sản xuất khẩu chủ yếu sử dụng container lạnh (RF 40ft). Biến động cước vận chuyển ảnh hưởng trực tiếp đến chi phí bán hàng của doanh nghiệp:
              </p>

              <div className="rounded-lg border border-white/10 bg-[#0e1118] p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-white font-semibold">Tuyến Việt Nam $\rightarrow$ Bờ Tây Mỹ (US West Coast):</span>
                  <span className="text-cyan-400 font-bold">~5.200 - 5.800 USD/cont</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white font-semibold">Tuyến Việt Nam $\rightarrow$ Bờ Đông Mỹ (US East Coast):</span>
                  <span className="text-cyan-400 font-bold">~7.000 - 7.500 USD/cont</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white font-semibold">Tuyến Việt Nam $\rightarrow$ Châu Âu (Rotterdam/Hamburg):</span>
                  <span className="text-amber-400 font-bold">~6.500 - 7.200 USD/cont</span>
                </div>
              </div>

              <div className="rounded border border-amber-500/20 bg-amber-500/5 p-3 text-amber-200">
                <strong className="text-amber-300">Tác động cổ phiếu:</strong> CMX (Camimex) xuất hơn 55% sang EU và VHC xuất 48% sang Mỹ là 2 mã chịu ảnh hưởng rõ rệt nhất bởi cước tàu. Nếu cước hạ nhiệt trong quý 4, biên lợi nhuận ròng của CMX và VHC sẽ bung nở mạnh.
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#141721] p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-white/10 pb-3">
              <ShieldCheck className="size-4.5 text-emerald-400" />
              <span>Chính Sách Thuế Phòng Vệ &amp; Thẻ Vàng IUU</span>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="rounded-lg border border-white/5 bg-[#0e1118] p-3 space-y-1.5">
                <div className="font-bold text-white text-xs flex items-center justify-between">
                  <span>Thuế chống bán phá giá Cá tra vào Mỹ (POR19 &amp; POR20)</span>
                  <span className="text-emerald-400">Thuế 0 USD/kg</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  VHC tiếp tục duy trì mức thuế 0 USD/kg, giữ lợi thế cạnh tranh áp đảo. ANV và các doanh nghiệp đang chuẩn bị hồ sơ cho đợt rà soát tiếp theo để mở rộng thị phần.
                </p>
              </div>

              <div className="rounded-lg border border-white/5 bg-[#0e1118] p-3 space-y-1.5">
                <div className="font-bold text-white text-xs flex items-center justify-between">
                  <span>Thuế chống trợ cấp (CVD) Tôm vào Mỹ</span>
                  <span className="text-cyan-400">Mức thuế sơ bộ thấp</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Mức thuế sơ bộ của tôm Việt Nam thấp hơn đáng kể so với đối thủ Ấn Độ và Ecuador, tạo lợi thế lớn cho các lô hàng chế biến sâu của FMC và MPC.
                </p>
              </div>

              <div className="rounded-lg border border-white/5 bg-[#0e1118] p-3 space-y-1.5">
                <div className="font-bold text-white text-xs flex items-center justify-between">
                  <span>Tiến trình gỡ thẻ vàng IUU của EC</span>
                  <span className="text-amber-400">Đoàn EC thanh tra T10</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Tác động trực tiếp đến nhóm hải sản khai thác biển (KHS tại Kiên Giang, hải sản tự nhiên). Nếu gỡ được thẻ vàng, chi phí kiểm tra hồ sơ nguồn gốc sẽ giảm mạnh.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
