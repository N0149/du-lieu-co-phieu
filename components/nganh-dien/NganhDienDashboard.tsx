'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  POWER_STOCKS,
  RESERVOIRS_HYDRO_DATA,
  HOURLY_SMP_PRICES,
  DAILY_GENERATION_BY_FUEL,
  DAILY_GENERATION_BY_OWNER,
  EAV_REGULATION_DOCS,
  PowerStockIntel,
  ReservoirHydroData,
} from '@/lib/nganh-dien-data';
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
  Cell,
} from 'recharts';
import {
  Zap,
  Waves,
  Flame,
  Activity,
  Search,
  Filter,
  BarChart3,
  Calendar,
  Layers,
  ShieldCheck,
  Building2,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Globe2,
  AlertTriangle,
  Scale,
  Maximize2,
  FileText,
  TrendingUp,
  TrendingDown,
  Gauge,
  SunMedium,
  Wind,
  Droplets,
  Calculator,
  Compass,
  ArrowDownRight,
  Radio,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  List,
  Table,
  RefreshCw,
} from 'lucide-react';

export function NganhDienDashboard() {
  // Main Tab State
  const [activeTab, setActiveTab] = useState<'STOCKS' | 'HYDRO' | 'MARKET' | 'SIMULATOR' | 'REGULATIONS'>('STOCKS');

  // Stock Row View Mode: 'table' | 'rows'
  const [rowViewMode, setRowViewMode] = useState<'table' | 'rows'>('table');
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

  // Stock Filter State
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedExchange, setSelectedExchange] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [ratingFilter, setRatingFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'profitGrowthYoY' | 'capacity' | 'marketCap' | 'pe'>('profitGrowthYoY');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Selected Stock for Modal
  const [selectedStock, setSelectedStock] = useState<PowerStockIntel | null>(POWER_STOCKS[0]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Compare State (2 stocks)
  const [compareStock1, setCompareStock1] = useState<string>('VSH');
  const [compareStock2, setCompareStock2] = useState<string>('QTP');

  // Hydro Region Filter
  const [hydroRegion, setHydroRegion] = useState<string>('ALL');

  // Simulator State
  const [simTicker, setSimTicker] = useState<string>('VSH');
  const [simHydrologyScenario, setSimHydrologyScenario] = useState<'LA_NINA' | 'NEUTRAL' | 'EL_NINO'>('LA_NINA');
  const [simSmpPrice, setSimSmpPrice] = useState<number>(1850); // đ/kWh
  const [simAlpha, setSimAlpha] = useState<number>(75); // %

  // Offline Sync State
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('Offline Ready');

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      setSyncStatus('Đang đồng bộ...');
      const res = await fetch('/api/nganh-dien?action=sync');
      if (res.ok) {
        setSyncStatus('Đã cập nhật Offline');
        setTimeout(() => setSyncStatus('Offline Ready'), 3000);
      } else {
        setSyncStatus('Lỗi đồng bộ');
      }
    } catch {
      setSyncStatus('Lỗi kết nối');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtered Stocks Memo
  const filteredStocks = useMemo(() => {
    return POWER_STOCKS.filter((stock) => {
      if (selectedCategory !== 'ALL' && stock.category !== selectedCategory) return false;
      if (selectedExchange !== 'ALL' && stock.exchange !== selectedExchange) return false;
      if (ratingFilter !== 'ALL' && stock.q3Forecast.rating !== ratingFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTicker = stock.ticker.toLowerCase().includes(query);
        const matchName = stock.name.toLowerCase().includes(query);
        const matchPlant = stock.powerPlants.some((p) => p.name.toLowerCase().includes(query));
        if (!matchTicker && !matchName && !matchPlant) return false;
      }
      return true;
    }).sort((a, b) => {
      let valA: number;
      let valB: number;
      if (sortField === 'profitGrowthYoY') {
        valA = a.q3Forecast.profitGrowthYoY;
        valB = b.q3Forecast.profitGrowthYoY;
      } else if (sortField === 'capacity') {
        valA = a.totalCapacityMW;
        valB = b.totalCapacityMW;
      } else if (sortField === 'marketCap') {
        valA = a.marketCap;
        valB = b.marketCap;
      } else {
        valA = a.peAdjusted || a.pe;
        valB = b.peAdjusted || b.pe;
      }
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
  }, [selectedCategory, selectedExchange, ratingFilter, searchQuery, sortField, sortOrder]);

  // Filtered Reservoirs Memo
  const filteredReservoirs = useMemo(() => {
    if (hydroRegion === 'ALL') return RESERVOIRS_HYDRO_DATA;
    return RESERVOIRS_HYDRO_DATA.filter((r) => r.region === hydroRegion);
  }, [hydroRegion]);

  // Compare Objects
  const comp1 = useMemo(() => POWER_STOCKS.find((s) => s.ticker === compareStock1) || POWER_STOCKS[0], [compareStock1]);
  const comp2 = useMemo(() => POWER_STOCKS.find((s) => s.ticker === compareStock2) || POWER_STOCKS[3], [compareStock2]);

  // Simulator Output Memo
  const simStockObj = useMemo(() => POWER_STOCKS.find((s) => s.ticker === simTicker) || POWER_STOCKS[0], [simTicker]);
  const simResults = useMemo(() => {
    // Base quarter production (MWh) based on MW and capacity factor
    let baseCapacityFactor = 0.55; // 55%
    if (simStockObj.category === 'Nhiệt điện Than') baseCapacityFactor = 0.72;
    if (simStockObj.category === 'Nhiệt điện Khí/Dầu') baseCapacityFactor = 0.50;

    let scenarioMultiplier = 1.0;
    if (simHydrologyScenario === 'LA_NINA') {
      scenarioMultiplier = simStockObj.category.includes('Thủy điện') ? 1.25 : 0.9;
    } else if (simHydrologyScenario === 'EL_NINO') {
      scenarioMultiplier = simStockObj.category.includes('Thủy điện') ? 0.75 : 1.15;
    }

    const hoursInQuarter = 2190;
    const estTotalGenMWh = simStockObj.totalCapacityMW * hoursInQuarter * baseCapacityFactor * scenarioMultiplier;
    const qcMWh = estTotalGenMWh * (simAlpha / 100);
    const qmMWh = Math.max(0, estTotalGenMWh - qcMWh);

    // Ppa price assumption
    let ppaPrice = 1100;
    if (simStockObj.category === 'Nhiệt điện Khí/Dầu') ppaPrice = 2100;
    if (simStockObj.category === 'Nhiệt điện Than') ppaPrice = 1450;
    if (simStockObj.category.includes('Năng lượng tái tạo')) ppaPrice = 1750;

    const revPpaBillion = (qcMWh * ppaPrice) / 1000000;
    const revSmpBillion = (qmMWh * simSmpPrice) / 1000000;
    const totalRevBillion = revPpaBillion + revSmpBillion;

    // Gross margin estimate
    let grossMargin = 0.55;
    if (simStockObj.category === 'Nhiệt điện Than') grossMargin = 0.16;
    if (simStockObj.category === 'Nhiệt điện Khí/Dầu') grossMargin = 0.12;
    if (simStockObj.category.includes('Năng lượng tái tạo')) grossMargin = 0.60;

    const grossProfitBillion = totalRevBillion * grossMargin;
    const netProfitBillion = grossProfitBillion * 0.72; // after opex, tax, interest

    return {
      estTotalGenMWh,
      qcMWh,
      qmMWh,
      revPpaBillion,
      revSmpBillion,
      totalRevBillion,
      grossProfitBillion,
      netProfitBillion,
      grossMargin: grossMargin * 100,
    };
  }, [simStockObj, simHydrologyScenario, simSmpPrice, simAlpha]);

  return (
    <div className="space-y-6">
      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="rounded-xl border border-white/10 bg-[#161a23] p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-15">
            <Zap className="size-10 text-amber-400" />
          </div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Danh mục theo dõi</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">36</span>
            <span className="text-xs text-amber-400 font-bold">Cổ phiếu</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Bao phủ HOSE, HNX &amp; UPCoM</span>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#161a23] p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-15">
            <Waves className="size-10 text-cyan-400" />
          </div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Hồ chứa thủy điện EAV</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-cyan-400">16</span>
            <span className="text-xs text-cyan-300 font-bold">Hồ lớn &amp; bậc thang</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Quan trắc lưu lượng &amp; mực nước</span>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#161a23] p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-15">
            <Activity className="size-10 text-emerald-400" />
          </div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sản lượng Thủy điện NSMO</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">49.8%</span>
            <span className="text-xs text-emerald-300 font-bold">Tỷ trọng ngày</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">412.370 MWh / ngày</span>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#161a23] p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-15">
            <Gauge className="size-10 text-purple-400" />
          </div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Giá SMP Đỉnh Tối</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-400">2.110</span>
            <span className="text-xs text-purple-300 font-bold">đ/kWh</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Khung 19h00 (Cao điểm phụ tải)</span>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#161a23] p-4 shadow-sm relative overflow-hidden col-span-2 sm:col-span-1">
          <div className="absolute top-0 right-0 p-3 opacity-15">
            <Compass className="size-10 text-rose-400" />
          </div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Chu kỳ Khí hậu</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">La Niña</span>
            <span className="text-xs text-emerald-400 font-bold">Mưa lũ</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Ưu tiên Thủy điện miền Trung/Nam</span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('STOCKS')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-all',
              activeTab === 'STOCKS'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-[#181d27] text-slate-300 hover:bg-[#202735] hover:text-white'
            )}
          >
            <Zap className="size-4" />
            <span>36 Cổ Phiếu &amp; Dự Báo Q3-Q4</span>
            <span className="ml-1 rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-black">36</span>
          </button>

          <button
            onClick={() => setActiveTab('HYDRO')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-all',
              activeTab === 'HYDRO'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-[#181d27] text-slate-300 hover:bg-[#202735] hover:text-white'
            )}
          >
            <Waves className="size-4" />
            <span>Thủy Văn Hồ Chứa (EAV)</span>
            <span className="ml-1 rounded-full bg-cyan-400/20 text-cyan-300 px-2 py-0.5 text-[10px] font-bold">Live</span>
          </button>

          <button
            onClick={() => setActiveTab('MARKET')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-all',
              activeTab === 'MARKET'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'bg-[#181d27] text-slate-300 hover:bg-[#202735] hover:text-white'
            )}
          >
            <Activity className="size-4" />
            <span>Thị Trường Điện &amp; Điều Độ (NSMO)</span>
          </button>

          <button
            onClick={() => setActiveTab('SIMULATOR')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-all',
              activeTab === 'SIMULATOR'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-[#181d27] text-slate-300 hover:bg-[#202735] hover:text-white'
            )}
          >
            <Calculator className="size-4" />
            <span>Mô Phỏng Doanh Thu &amp; Lợi Nhuận</span>
            <span className="ml-1 rounded-full bg-emerald-400/20 text-emerald-950 px-1.5 py-0.5 text-[10px] font-black">AI</span>
          </button>

          <button
            onClick={() => setActiveTab('REGULATIONS')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-all',
              activeTab === 'REGULATIONS'
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                : 'bg-[#181d27] text-slate-300 hover:bg-[#202735] hover:text-white'
            )}
          >
            <FileText className="size-4" />
            <span>Khung Giá &amp; Chính Sách EAV</span>
          </button>
        </div>

        {/* Offline Status & Sync Button */}
        <div className="flex items-center gap-2.5 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Đã lưu Offline (data/nganh_dien)</span>
          </div>
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#161a23] px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-[#202735] hover:text-white transition-all disabled:opacity-50"
            title="Đồng bộ và cập nhật lại dữ liệu từ NSMO & EAV về máy"
          >
            <RefreshCw className={cn("size-3 text-amber-400", isSyncing && "animate-spin")} />
            <span>{isSyncing ? 'Đang tải...' : syncStatus}</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: 36 CỔ PHIẾU ĐIỆN & DỰ BÁO KẾT QUẢ KINH DOANH              */}
      {/* ============================================================== */}
      {activeTab === 'STOCKS' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="rounded-xl border border-white/10 bg-[#161a23] p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search Bar */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm mã cổ phiếu (POW, VSH, QTP...), tên công ty, tên nhà máy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0f1218] pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0f1218] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="ALL">Tất cả loại hình (36 mã)</option>
                  <option value="Thủy điện lớn">Thủy điện lớn</option>
                  <option value="Thủy điện vừa & nhỏ">Thủy điện vừa &amp; nhỏ</option>
                  <option value="Nhiệt điện Than">Nhiệt điện Than</option>
                  <option value="Nhiệt điện Khí/Dầu">Nhiệt điện Khí / Dầu</option>
                  <option value="Năng lượng tái tạo & Đa ngành">Năng lượng tái tạo &amp; Đa ngành</option>
                </select>
              </div>

              {/* Exchange Filter */}
              <div>
                <select
                  value={selectedExchange}
                  onChange={(e) => setSelectedExchange(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0f1218] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="ALL">Tất cả sàn giao dịch</option>
                  <option value="HOSE">Sàn HOSE</option>
                  <option value="HNX">Sàn HNX</option>
                  <option value="UPCoM">Sàn UPCoM</option>
                </select>
              </div>

              {/* Sort Filter */}
              <div>
                <select
                  value={`${sortField}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortField(field as any);
                    setSortOrder(order as any);
                  }}
                  className="w-full rounded-lg border border-white/10 bg-[#0f1218] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="profitGrowthYoY-desc">Tăng trưởng LN: Cao nhất</option>
                  <option value="capacity-desc">Công suất lắp đặt: Lớn nhất</option>
                  <option value="marketCap-desc">Vốn hóa: Cao nhất</option>
                  <option value="pe-asc">Định giá P/E thực tế: Thấp nhất</option>
                </select>
              </div>
            </div>

            {/* Quick Filter Tags */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5 text-xs text-slate-400">
              <span className="font-semibold text-slate-500">Đánh giá triển vọng:</span>
              {(['ALL', 'TĂNG TRƯỞNG MẠNH', 'TĂNG TRƯỞNG TÍCH CỰC', 'KHẢ QUAN', 'ĐI NGANG'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRatingFilter(r)}
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors',
                    ratingFilter === r
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                      : 'bg-white/5 text-slate-400 hover:text-slate-200'
                  )}
                >
                  {r === 'ALL' ? 'Tất cả' : r}
                </button>
              ))}
            </div>
          </div>

          {/* Head-to-Head Compare Bar */}
          <div className="rounded-xl border border-white/10 bg-[#161a23] p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Scale className="size-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">So sánh trực diện 2 mã:</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={compareStock1}
                  onChange={(e) => setCompareStock1(e.target.value)}
                  className="rounded-lg border border-white/10 bg-[#0f1218] px-3 py-1.5 text-xs font-bold text-cyan-400 focus:outline-none"
                >
                  {POWER_STOCKS.map((s) => (
                    <option key={s.ticker} value={s.ticker}>
                      {s.ticker} - {s.name.slice(0, 25)}...
                    </option>
                  ))}
                </select>
                <span className="text-xs font-black text-slate-500">VS</span>
                <select
                  value={compareStock2}
                  onChange={(e) => setCompareStock2(e.target.value)}
                  className="rounded-lg border border-white/10 bg-[#0f1218] px-3 py-1.5 text-xs font-bold text-amber-400 focus:outline-none"
                >
                  {POWER_STOCKS.map((s) => (
                    <option key={s.ticker} value={s.ticker}>
                      {s.ticker} - {s.name.slice(0, 25)}...
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Comparison Card */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-white/5 text-xs">
              <div className="rounded-lg bg-[#0f1218] p-3 border border-cyan-500/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-black text-cyan-400">{comp1.ticker}</span>
                  <span className="rounded bg-cyan-500/20 text-cyan-300 px-2 py-0.5 text-[10px] font-bold">
                    {comp1.category}
                  </span>
                </div>
                <div className="text-slate-300 font-semibold">{comp1.name}</div>
                <div className="grid grid-cols-4 gap-2 py-1 text-[11px] text-slate-400 border-y border-white/5">
                  <div>Công suất: <strong className="text-white">{comp1.totalCapacityMW.toLocaleString()} MW</strong></div>
                  <div>Vốn hóa: <strong className="text-white">{comp1.marketCap.toLocaleString()} Tỷ</strong></div>
                  <div>P/E thực tế: <strong className="text-amber-300">{comp1.peAdjusted || Math.round(comp1.pe * 1.11 * 10) / 10}x</strong></div>
                  <div>LN Q3 YoY: <strong className="text-emerald-400">+{comp1.q3Forecast.profitGrowthYoY}%</strong></div>
                </div>
                <div className="text-[11px] text-slate-400">
                  <span className="text-cyan-400 font-semibold">Tín hiệu NSMO/EAV:</span> {comp1.q3Forecast.nsmoEavSignal}
                </div>
              </div>

              <div className="rounded-lg bg-[#0f1218] p-3 border border-amber-500/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-black text-amber-400">{comp2.ticker}</span>
                  <span className="rounded bg-amber-500/20 text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                    {comp2.category}
                  </span>
                </div>
                <div className="text-slate-300 font-semibold">{comp2.name}</div>
                <div className="grid grid-cols-4 gap-2 py-1 text-[11px] text-slate-400 border-y border-white/5">
                  <div>Công suất: <strong className="text-white">{comp2.totalCapacityMW.toLocaleString()} MW</strong></div>
                  <div>Vốn hóa: <strong className="text-white">{comp2.marketCap.toLocaleString()} Tỷ</strong></div>
                  <div>P/E thực tế: <strong className="text-amber-300">{comp2.peAdjusted || Math.round(comp2.pe * 1.11 * 10) / 10}x</strong></div>
                  <div>LN Q3 YoY: <strong className="text-emerald-400">+{comp2.q3Forecast.profitGrowthYoY}%</strong></div>
                </div>
                <div className="text-[11px] text-slate-400">
                  <span className="text-amber-400 font-semibold">Tín hiệu NSMO/EAV:</span> {comp2.q3Forecast.nsmoEavSignal}
                </div>
              </div>
            </div>
          </div>

          {/* Header Bar for Stocks Row List */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                Bảng 36 Cổ Phiếu Ngành Điện
              </span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-amber-400 font-mono font-bold">
                {filteredStocks.length} / 36 mã
              </span>
            </div>

            {/* Row Display Mode Switcher */}
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0f1218] p-1 text-xs">
              <button
                type="button"
                onClick={() => setRowViewMode('table')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1 font-semibold transition-all',
                  rowViewMode === 'table'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <Table className="size-3.5" />
                <span>Kiểu Bảng Hàng</span>
              </button>
              <button
                type="button"
                onClick={() => setRowViewMode('rows')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1 font-semibold transition-all',
                  rowViewMode === 'rows'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <List className="size-3.5" />
                <span>Kiểu Hàng Mở Rộng</span>
              </button>
            </div>
          </div>

          {/* VIEW MODE 1: KIỂU BẢNG HÀNG (TABLE VIEW) */}
          {rowViewMode === 'table' && (
            <div className="rounded-xl border border-white/10 bg-[#161a23] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#0f1218] text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="py-3.5 px-4">Mã CP</th>
                      <th className="py-3.5 px-3 min-w-[200px]">Doanh Nghiệp &amp; Loại Hình</th>
                      <th className="py-3.5 px-3 text-right">Công Suất</th>
                      <th className="py-3.5 px-3 text-right">Vốn Hóa</th>
                      <th className="py-3.5 px-3 text-right" title="P/E thực tế sau khi trừ trích lập Quỹ Khen thưởng Phúc lợi &amp; Thù lao HĐQT/BKS">
                        P/E Thực Tế <span className="text-[9px] text-amber-400 font-normal block font-sans lowercase">(trừ trích quỹ)</span>
                      </th>
                      <th className="py-3.5 px-3 text-right">LNST Q3 (Dự phóng)</th>
                      <th className="py-3.5 px-3 text-center">Tăng Trưởng</th>
                      <th className="py-3.5 px-3 text-center">Đánh Giá</th>
                      <th className="py-3.5 px-4 min-w-[220px]">Nhà Máy Chủ Lực</th>
                      <th className="py-3.5 px-3 text-center">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredStocks.map((stock) => {
                      const isExpanded = expandedTicker === stock.ticker;
                      return (
                        <React.Fragment key={stock.ticker}>
                          <tr
                            onClick={() => setExpandedTicker(isExpanded ? null : stock.ticker)}
                            className={cn(
                              'hover:bg-white/5 transition-colors cursor-pointer group',
                              isExpanded && 'bg-white/[0.03]'
                            )}
                          >
                            {/* Mã CP */}
                            <td className="py-3 px-4 font-bold text-white">
                              <Link
                                href={`/stock/${stock.ticker}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 group/ticker hover:opacity-90 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                                title={`Mở tab Doanh nghiệp & BCTC cho mã ${stock.ticker}`}
                              >
                                <div
                                  className="flex size-7 shrink-0 items-center justify-center rounded-md font-black text-white text-xs shadow group-hover/ticker:scale-105 transition-transform"
                                  style={{ backgroundColor: stock.avatarColor }}
                                >
                                  {stock.ticker}
                                </div>
                                <div>
                                  <span className="font-bold text-white group-hover/ticker:text-cyan-400 transition-colors text-sm flex items-center gap-1">
                                    {stock.ticker}
                                    <ArrowUpRight className="size-3 opacity-0 group-hover/ticker:opacity-100 transition-opacity text-cyan-400" />
                                  </span>
                                  <span className="ml-0 rounded bg-white/10 px-1 py-0.2 text-[9px] text-slate-400 font-mono">
                                    {stock.exchange}
                                  </span>
                                </div>
                              </Link>
                            </td>

                            {/* Doanh nghiệp & Loại hình */}
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-200 line-clamp-1" title={stock.name}>
                                {stock.name}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                <span className="rounded bg-white/5 px-1.5 py-0.2 text-[10px] text-slate-400 font-medium">
                                  {stock.category}
                                </span>
                                {stock.cascadeRole && (
                                  <span className="rounded bg-cyan-500/10 text-cyan-400 px-1.5 py-0.2 text-[9px] font-semibold border border-cyan-500/20">
                                    Hạ lưu bậc thang
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Công suất */}
                            <td className="py-3 px-3 text-right font-mono font-bold text-amber-400">
                              ⚡ {stock.totalCapacityMW.toLocaleString()} MW
                            </td>

                            {/* Vốn Hóa */}
                            <td className="py-3 px-3 text-right font-mono">
                              <span className="font-bold text-white">{stock.marketCap.toLocaleString()}</span>
                              <span className="text-[10px] text-slate-500 block">Tỷ VNĐ</span>
                            </td>

                            {/* P/E Thực Tế */}
                            <td className="py-3 px-3 text-right font-mono">
                              <span className="font-black text-amber-300">
                                {stock.peAdjusted || Math.round(stock.pe * 1.11 * 10) / 10}x
                              </span>
                              <span className="text-[9px] text-slate-500 block" title={`P/E báo cáo chưa trừ trích lập: ${stock.pe}x`}>
                                (BC: {stock.pe}x)
                              </span>
                            </td>

                            {/* LNST Q3 Dự phóng */}
                            <td className="py-3 px-3 text-right font-mono">
                              <span className="font-bold text-amber-300">{stock.q3Forecast.profitEst.toLocaleString()}</span>
                              <span className="text-[10px] text-slate-500 block">Tỷ VNĐ</span>
                            </td>

                            {/* Tăng trưởng YoY */}
                            <td className="py-3 px-3 text-center font-mono">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-bold',
                                  stock.q3Forecast.profitGrowthYoY >= 30
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : stock.q3Forecast.profitGrowthYoY > 0
                                    ? 'bg-teal-500/20 text-teal-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                )}
                              >
                                {stock.q3Forecast.profitGrowthYoY > 0 ? '+' : ''}
                                {stock.q3Forecast.profitGrowthYoY}%
                              </span>
                            </td>

                            {/* Đánh giá */}
                            <td className="py-3 px-3 text-center">
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-[9px] font-black uppercase whitespace-nowrap',
                                  stock.q3Forecast.rating === 'TĂNG TRƯỞNG MẠNH' && 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
                                  stock.q3Forecast.rating === 'TĂNG TRƯỞNG TÍCH CỰC' && 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
                                  stock.q3Forecast.rating === 'KHẢ QUAN' && 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
                                  stock.q3Forecast.rating === 'ĐI NGANG' && 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                )}
                              >
                                {stock.q3Forecast.rating}
                              </span>
                            </td>

                            {/* Nhà máy chủ lực */}
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1">
                                {stock.powerPlants.slice(0, 2).map((p, pIdx) => (
                                  <span
                                    key={pIdx}
                                    className="rounded bg-[#1a202c] px-1.5 py-0.5 text-[10px] text-slate-300 border border-white/5 whitespace-nowrap"
                                  >
                                    {p.name} ({p.capacityMW}MW)
                                  </span>
                                ))}
                                {stock.powerPlants.length > 2 && (
                                  <span className="rounded bg-white/5 px-1 py-0.5 text-[10px] text-slate-500">
                                    +{stock.powerPlants.length - 2}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Thao tác */}
                            <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <Link
                                  href={`/stock/${stock.ticker}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:text-white transition-all shadow-sm whitespace-nowrap"
                                  title={`Xem chi tiết Báo cáo tài chính, Biểu đồ kỹ thuật của ${stock.ticker} tại tab Doanh nghiệp`}
                                >
                                  <Building2 className="size-3 text-cyan-400" />
                                  <span>BCTC &amp; Biểu đồ</span>
                                  <ArrowUpRight className="size-3 text-cyan-400" />
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedStock(stock);
                                    setIsDetailOpen(true);
                                  }}
                                  className="rounded p-1.5 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 transition-colors"
                                  title="Xem toàn bộ nhà máy & kịch bản"
                                >
                                  <Sparkles className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExpandedTicker(isExpanded ? null : stock.ticker)}
                                  className="rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                                  title={isExpanded ? 'Thu gọn hàng' : 'Bung mở rộng chi tiết hàng'}
                                >
                                  {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* INLINE EXPANDED ROW ACCORDION */}
                          {isExpanded && (
                            <tr className="bg-[#0b0e14]/90 border-b border-white/10">
                              <td colSpan={10} className="py-4 px-6 space-y-4">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                      <Building2 className="size-3.5" />
                                      <span>Danh Sách Toàn Bộ Nhà Máy Điện &amp; Giá Bán Điện ({stock.powerPlants.length} nhà máy - {stock.totalCapacityMW.toLocaleString()} MW):</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedStock(stock);
                                        setIsDetailOpen(true);
                                      }}
                                      className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1"
                                    >
                                      <span>Mở cửa sổ chi tiết</span>
                                      <ArrowUpRight className="size-3" />
                                    </button>
                                  </div>

                                  <div className="rounded-lg border border-white/10 bg-[#141824] overflow-x-auto">
                                    <table className="w-full text-left text-[11px] min-w-[850px]">
                                      <thead className="bg-[#1a202c] text-slate-400 font-bold border-b border-white/5">
                                        <tr>
                                          <th className="p-2.5">Tên Nhà Máy</th>
                                          <th className="p-2.5">Công Suất</th>
                                          <th className="p-2.5">Loại Hình</th>
                                          <th className="p-2.5">Vị Trí</th>
                                          <th className="p-2.5">Lưu Vực / Nhiên Liệu</th>
                                          <th className="p-2.5">Cơ Chế Giá</th>
                                          <th className="p-2.5 text-right">Giá Bán Ước Tính</th>
                                          <th className="p-2.5 min-w-[220px]">Đặc Điểm Định Giá / Khấu Hao</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-white/5 font-mono">
                                        {stock.powerPlants.map((plant, pIdx) => (
                                          <tr key={pIdx} className="hover:bg-white/5 transition-colors">
                                            <td className="p-2.5 font-sans font-bold text-white whitespace-nowrap">{plant.name}</td>
                                            <td className="p-2.5 text-amber-400 font-bold whitespace-nowrap">⚡ {plant.capacityMW} MW</td>
                                            <td className="p-2.5 font-sans text-slate-300 whitespace-nowrap">{plant.type}</td>
                                            <td className="p-2.5 font-sans text-slate-400 whitespace-nowrap">{plant.location}</td>
                                            <td className="p-2.5 font-sans text-slate-400 whitespace-nowrap">{plant.basinOrFuel}</td>
                                            <td className="p-2.5 font-sans whitespace-nowrap">
                                              <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-cyan-300 font-medium border border-cyan-500/20">
                                                {plant.pricingType || 'Hợp đồng PPA'}
                                              </span>
                                            </td>
                                            <td className="p-2.5 text-right whitespace-nowrap">
                                              {plant.estSellingPrice ? (
                                                <div className="font-mono">
                                                  <span className="font-black text-amber-300">{plant.estSellingPrice.toLocaleString()}</span>
                                                  <span className="text-[10px] text-slate-400 ml-1">đ/kWh</span>
                                                </div>
                                              ) : (
                                                <span className="text-slate-500">Đang cập nhật</span>
                                              )}
                                            </td>
                                            <td className="p-2.5 font-sans text-slate-300 text-[10px] leading-relaxed">
                                              {plant.priceNote || 'Ký hợp đồng PPA dài hạn với EVN'}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Bottom 2 Cards: EAV & NSMO Monitoring */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                                    <div className="rounded-lg bg-[#141824] p-3 border border-white/5 space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <Waves className="size-3.5 text-cyan-400" />
                                        <span className="font-bold text-cyan-400 uppercase tracking-wider text-[10px]">
                                          Kênh Giám Sát Hồ Chứa EAV:
                                        </span>
                                      </div>
                                      <p className="text-slate-300 text-[11px] leading-relaxed">{stock.eavTrackingChannel}</p>
                                    </div>

                                    <div className="rounded-lg bg-[#141824] p-3 border border-white/5 space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <Activity className="size-3.5 text-amber-400" />
                                        <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                                          Kênh Giám Sát Điều Độ NSMO:
                                        </span>
                                      </div>
                                      <p className="text-slate-300 text-[11px] leading-relaxed">{stock.nsmoTrackingChannel}</p>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: KIỂU HÀNG MỞ RỘNG (FULL-WIDTH ROWS) */}
          {rowViewMode === 'rows' && (
            <div className="space-y-3">
              {filteredStocks.map((stock) => {
                const isExpanded = expandedTicker === stock.ticker;
                return (
                  <div
                    key={stock.ticker}
                    className={cn(
                      'rounded-xl border border-white/10 bg-[#161a23] p-4 hover:border-amber-500/40 transition-all space-y-3 cursor-pointer group',
                      isExpanded && 'border-amber-500/50 bg-[#181d28]'
                    )}
                    onClick={() => setExpandedTicker(isExpanded ? null : stock.ticker)}
                  >
                    {/* Top Row: Main Summary */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* Left: Ticker & Name */}
                      <div className="flex items-center gap-3 min-w-[260px]">
                        <div
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg font-black text-white text-sm shadow"
                          style={{ backgroundColor: stock.avatarColor }}
                        >
                          {stock.ticker}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white group-hover:text-amber-400 transition-colors text-base">
                              {stock.ticker}
                            </span>
                            <span className="rounded bg-white/10 px-1.5 py-0.2 text-[10px] text-slate-300 font-mono">
                              {stock.exchange}
                            </span>
                            <span className="rounded bg-white/5 px-2 py-0.2 text-[10px] text-slate-400 font-medium">
                              {stock.category}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 block max-w-sm truncate" title={stock.name}>
                            {stock.name}
                          </span>
                        </div>
                      </div>

                      {/* Middle 1: Metrics */}
                      <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-slate-500 block font-sans">Công suất</span>
                          <strong className="text-amber-400">⚡ {stock.totalCapacityMW.toLocaleString()} MW</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block font-sans">Vốn hóa</span>
                          <strong className="text-white">{stock.marketCap.toLocaleString()} Tỷ</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block font-sans">P/E Thực tế</span>
                          <strong className="text-amber-300 font-bold">
                            {stock.peAdjusted || Math.round(stock.pe * 1.11 * 10) / 10}x
                          </strong>{' '}
                          <span className="text-slate-500 text-[10px]" title={`P/E báo cáo chưa trừ trích lập: ${stock.pe}x`}>({stock.pe}x)</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block font-sans">LN Q3 YoY</span>
                          <strong className="text-emerald-400">+{stock.q3Forecast.profitGrowthYoY}%</strong>
                        </div>
                      </div>

                      {/* Middle 2: Rating & Actions */}
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider',
                            stock.q3Forecast.rating === 'TĂNG TRƯỞNG MẠNH' && 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
                            stock.q3Forecast.rating === 'TĂNG TRƯỞNG TÍCH CỰC' && 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
                            stock.q3Forecast.rating === 'KHẢ QUAN' && 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
                            stock.q3Forecast.rating === 'ĐI NGANG' && 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          )}
                        >
                          {stock.q3Forecast.rating}
                        </span>

                        <Link
                          href={`/stock/${stock.ticker}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:text-white transition-all shadow-sm"
                          title={`Xem chi tiết Báo cáo tài chính & Biểu đồ kỹ thuật của ${stock.ticker} tại tab Doanh nghiệp`}
                        >
                          <Building2 className="size-3.5 text-cyan-400" />
                          <span>BCTC &amp; Biểu đồ</span>
                          <ArrowUpRight className="size-3.5 text-cyan-400" />
                        </Link>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStock(stock);
                            setIsDetailOpen(true);
                          }}
                          className="flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-colors"
                        >
                          <span>Chi tiết</span>
                          <Sparkles className="size-3.5" />
                        </button>

                        <button
                          type="button"
                          className="rounded p-1 text-slate-400 hover:text-white"
                          title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                        >
                          {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Bottom Line: Plant Chips & Signal */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs text-slate-400">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-slate-500 text-[11px]">Nhà máy:</span>
                        {stock.powerPlants.slice(0, 3).map((p, idx) => (
                          <span key={idx} className="rounded bg-[#0f1218] px-2 py-0.5 text-slate-300 border border-white/5 text-[11px]">
                            {p.name} ({p.capacityMW}MW)
                          </span>
                        ))}
                        {stock.powerPlants.length > 3 && (
                          <span className="rounded bg-white/5 px-1.5 py-0.5 text-slate-500 text-[10px]">
                            +{stock.powerPlants.length - 3}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 max-w-xl truncate">
                        <span className="text-amber-400 font-semibold">Tín hiệu: </span>
                        <span>{stock.q3Forecast.nsmoEavSignal}</span>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-3 bg-[#0f1218]/60 -mx-4 -mb-4 p-4 rounded-b-xl">
                        {/* Power Plants Table */}
                        <div className="space-y-1.5">
                          <span className="font-bold text-amber-400 block text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <Building2 className="size-3.5" />
                            <span>Danh Sách Nhà Máy Điện &amp; Giá Bán ({stock.powerPlants.length} nhà máy):</span>
                          </span>
                          <div className="rounded-lg border border-white/10 bg-[#141824] overflow-x-auto">
                            <table className="w-full text-left text-[11px] min-w-[750px]">
                              <thead className="bg-[#1a202c] text-slate-400 font-bold border-b border-white/5">
                                <tr>
                                  <th className="p-2">Tên Nhà Máy</th>
                                  <th className="p-2">Công Suất</th>
                                  <th className="p-2">Loại Hình</th>
                                  <th className="p-2">Vị Trí</th>
                                  <th className="p-2">Lưu Vực / Nhiên Liệu</th>
                                  <th className="p-2">Cơ Chế Giá</th>
                                  <th className="p-2 text-right">Giá Bán Ước Tính</th>
                                  <th className="p-2 min-w-[200px]">Đặc Điểm Định Giá / Khấu Hao</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5 font-mono">
                                {stock.powerPlants.map((plant, pIdx) => (
                                  <tr key={pIdx} className="hover:bg-white/5">
                                    <td className="p-2 font-sans font-bold text-white whitespace-nowrap">{plant.name}</td>
                                    <td className="p-2 text-amber-400 font-bold whitespace-nowrap">⚡ {plant.capacityMW} MW</td>
                                    <td className="p-2 font-sans text-slate-300 whitespace-nowrap">{plant.type}</td>
                                    <td className="p-2 font-sans text-slate-400 whitespace-nowrap">{plant.location}</td>
                                    <td className="p-2 font-sans text-slate-400 whitespace-nowrap">{plant.basinOrFuel}</td>
                                    <td className="p-2 font-sans whitespace-nowrap">
                                      <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-cyan-300 font-medium border border-cyan-500/20">
                                        {plant.pricingType || 'Hợp đồng PPA'}
                                      </span>
                                    </td>
                                    <td className="p-2 text-right whitespace-nowrap">
                                      {plant.estSellingPrice ? (
                                        <div className="font-mono">
                                          <span className="font-black text-amber-300">{plant.estSellingPrice.toLocaleString()}</span>
                                          <span className="text-[10px] text-slate-400 ml-1">đ/kWh</span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-500">Đang cập nhật</span>
                                      )}
                                    </td>
                                    <td className="p-2 font-sans text-slate-300 text-[10px] leading-relaxed">
                                      {plant.priceNote || 'Ký hợp đồng PPA dài hạn với EVN'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                          <div className="space-y-1">
                            <span className="font-bold text-cyan-400 block text-[11px]">Kênh Giám Sát EAV:</span>
                            <p className="text-slate-300">{stock.eavTrackingChannel}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="font-bold text-amber-400 block text-[11px]">Kênh Giám Sát NSMO:</span>
                            <p className="text-slate-300">{stock.nsmoTrackingChannel}</p>
                          </div>
                        </div>

                        <div className="space-y-1 text-xs">
                          <span className="font-bold text-emerald-400 block text-[11px]">Động Lực Tăng Trưởng Q3-Q4:</span>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                            {stock.q3Forecast.drivers.map((d, dIdx) => (
                              <li key={dIdx}>{d}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: THỦY VĂN HỒ CHỨA (EAV & HOCHUATHUYDIEN)                   */}
      {/* ============================================================== */}
      {activeTab === 'HYDRO' && (
        <div className="space-y-6">
          {/* Hydrology Header & Explainer */}
          <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-[#101b2b] via-[#161f2e] to-[#101b2b] p-5 shadow-lg space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-bold text-cyan-400">
                  <Waves className="size-3.5" />
                  <span>DỮ LIỆU ĐỒNG BỘ TRỰC TIẾP TỪ EAV (hochuathuydien.evn.com.vn)</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Quan Trắc 16 Hồ Chứa Trọng Điểm &amp; Nguyên Lý Bậc Thang Thủy Điện
                </h2>
                <p className="text-xs text-slate-300 max-w-4xl leading-relaxed">
                  Lưu lượng xả qua máy (<strong className="text-white">Qxm</strong>) nhân với cột nước hữu dụng (<strong className="text-white">Htl</strong>)
                  cho phép tính toán trực tiếp công suất phát điện hàng ngày. Đặc biệt, các mã thủy điện nhỏ ở hạ lưu (<strong className="text-cyan-400">BSA</strong>,{' '}
                  <strong className="text-cyan-400">DRL</strong>, <strong className="text-cyan-400">SJD</strong>, <strong className="text-cyan-400">TV1</strong>,{' '}
                  <strong className="text-cyan-400">EIC</strong>) hưởng trọn lượng nước xả từ các hồ mẹ ở thượng nguồn.
                </p>
              </div>

              {/* Region Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Khu vực:</span>
                <select
                  value={hydroRegion}
                  onChange={(e) => setHydroRegion(e.target.value)}
                  className="rounded-lg border border-white/10 bg-[#0f1218] px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="ALL">Tất cả vùng miền (16 hồ)</option>
                  <option value="Tây Nguyên">Tây Nguyên (Srêpốk, Buôn Kuốp, Ialy...)</option>
                  <option value="Duyên Hải Nam Trung Bộ">Nam Trung Bộ (Sông Ba Hạ, Sông Hinh...)</option>
                  <option value="Đông Nam Bộ">Đông Nam Bộ (Thác Mơ, Trị An)</option>
                  <option value="Bắc Trung Bộ">Bắc Trung Bộ (Khe Bố, Trung Sơn)</option>
                  <option value="Đông Bắc Bộ">Đông Bắc Bộ (Thác Bà)</option>
                </select>
              </div>
            </div>

            {/* Cascade Architecture Diagram (Infographic Bar) */}
            <div className="rounded-lg bg-[#0b0e14] p-3 border border-white/5 space-y-2">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">
                Chuỗi Liên Kết Bậc Thang Thủy Văn Hạ Lưu:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                <div className="rounded bg-white/5 p-2 border-l-2 border-cyan-400 space-y-1">
                  <div className="font-bold text-white">Lưu vực Sông Srêpốk</div>
                  <div className="text-[11px] text-slate-400">
                    Hồ mẹ: <strong className="text-cyan-300">Srêpốk 3 &amp; Buôn Kuốp (PGV)</strong>
                  </div>
                  <div className="text-[11px] text-emerald-400">
                    ➔ Hạ lưu hưởng nước: <strong>BSA</strong> (Srepok 4A) &amp; <strong>DRL</strong> (Đrây H&apos;linh 2)
                  </div>
                </div>

                <div className="rounded bg-white/5 p-2 border-l-2 border-amber-400 space-y-1">
                  <div className="font-bold text-white">Lưu vực Sông Bé</div>
                  <div className="text-[11px] text-slate-400">
                    Hồ mẹ: <strong className="text-amber-300">Hồ Thác Mơ (TMP)</strong>
                  </div>
                  <div className="text-[11px] text-emerald-400">
                    ➔ Hạ lưu hưởng nước: <strong>SJD</strong> (Thủy điện Cần Đơn 57.6MW)
                  </div>
                </div>

                <div className="rounded bg-white/5 p-2 border-l-2 border-purple-400 space-y-1">
                  <div className="font-bold text-white">Lưu vực Sông Bung</div>
                  <div className="text-[11px] text-slate-400">
                    Hồ mẹ: <strong className="text-purple-300">Sông Bung 2, 4 &amp; A Vương</strong>
                  </div>
                  <div className="text-[11px] text-emerald-400">
                    ➔ Hạ lưu hưởng nước: <strong>TV1</strong> (Sông Bung 5 - 57MW)
                  </div>
                </div>

                <div className="rounded bg-white/5 p-2 border-l-2 border-emerald-400 space-y-1">
                  <div className="font-bold text-white">Lưu vực Quốc Tế Sê San</div>
                  <div className="text-[11px] text-slate-400">
                    Hồ mẹ: <strong className="text-emerald-300">Pleikrông, Ialy, Sê San 3, 4</strong>
                  </div>
                  <div className="text-[11px] text-emerald-400">
                    ➔ Hạ lưu hưởng nước: <strong>EIC</strong> (Hạ Sê San 2 - 400MW)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reservoirs Table */}
          <div className="rounded-xl border border-white/10 bg-[#161a23] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0f1218] text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Tên Hồ Chứa</th>
                    <th className="py-3 px-3">Khu Vực</th>
                    <th className="py-3 px-3">Mực Nước Htl / Hdbt</th>
                    <th className="py-3 px-3">% Tích Nước</th>
                    <th className="py-3 px-3">Nước Về (Qve)</th>
                    <th className="py-3 px-3">Xả Máy (Qxm)</th>
                    <th className="py-3 px-3">Xả Tràn (Qxt)</th>
                    <th className="py-3 px-4">Cổ Phiếu Hưởng Lợi Trực Tiếp &amp; Bậc Thang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {filteredReservoirs.map((res) => (
                    <tr key={res.lakeName} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-sans font-bold text-white flex items-center gap-2">
                        <Droplets className="size-3.5 text-cyan-400 shrink-0" />
                        <span>{res.lakeName}</span>
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-400">{res.region}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-white">{res.htl}m</span> / {res.hdbt}m
                        <span className="text-[10px] text-slate-500 block font-sans">Chết: {res.hc}m</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                res.waterStoragePercent > 80 ? 'bg-emerald-400' : res.waterStoragePercent > 50 ? 'bg-cyan-400' : 'bg-amber-400'
                              )}
                              style={{ width: `${Math.min(100, res.waterStoragePercent)}%` }}
                            />
                          </div>
                          <span className="font-bold text-white text-[11px]">{res.waterStoragePercent}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-cyan-400">
                        {res.qve.toLocaleString()} m³/s
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-400">
                        {res.qxm.toLocaleString()} m³/s
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {res.qxt > 0 ? (
                          <span className="rounded bg-rose-500/20 text-rose-300 px-1.5 py-0.5 text-[10px] font-bold">
                            Xả tràn: {res.qxt} m³/s
                          </span>
                        ) : (
                          <span className="text-slate-500">0 m³/s</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <div className="flex flex-wrap gap-1.5">
                          {res.affectedStocks.map((stk, sIdx) => (
                            <span
                              key={sIdx}
                              title={`${stk.plantName}: ${stk.note}`}
                              className={cn(
                                'rounded px-2 py-0.5 text-[11px] font-bold cursor-pointer transition-all',
                                stk.relationship === 'Trực tiếp sở hữu'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                                  : stk.relationship === 'Hạ lưu bậc thang (hưởng nước xả)'
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30'
                                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30'
                              )}
                            >
                              {stk.ticker} ({stk.relationship === 'Trực tiếp sở hữu' ? 'Sở hữu' : stk.relationship === 'Hạ lưu bậc thang (hưởng nước xả)' ? 'Hạ lưu' : 'Liên kết'})
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: THỊ TRƯỜNG ĐIỆN & ĐIỀU ĐỘ (NSMO / A0)                     */}
      {/* ============================================================== */}
      {activeTab === 'MARKET' && (
        <div className="space-y-6">
          {/* Market Top Banner */}
          <div className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-[#17112b] via-[#1a1435] to-[#17112b] p-5 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-300">
              <Activity className="size-3.5" />
              <span>DỮ LIỆU ĐIỀU ĐỘ &amp; GIÁ CẬN BIÊN THỊ TRƯỜNG TỪ NSMO (A0)</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              Giá Cận Biên Thị Trường Điện (SMP) 48 Chu Kỳ &amp; Cơ Cấu Huy Động Nguồn
            </h2>
            <p className="text-xs text-slate-300 max-w-4xl leading-relaxed">
              Giá cận biên thị trường (<strong className="text-white">SMP</strong>) xác định doanh thu phát điện giao ngay (Qm) của các nhà máy điện.
              Vào khung giờ trưa (11h-13h30), sản lượng điện mặt trời tăng vọt đè bẹp giá SMP. Ngược lại vào khung giờ cao điểm tối (18h-20h30),
              giá SMP leo lên đỉnh điểm &gt; 2.100 đ/kWh, tạo siêu lợi nhuận cho các nhà máy thủy điện có hồ điều tiết và nhiệt điện chạy bù đỉnh.
            </p>
          </div>

          {/* SMP 48-Cycle Chart */}
          <div className="rounded-xl border border-white/10 bg-[#161a23] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 className="size-4 text-purple-400" />
                  <span>Biểu Đồ Giá Cận Biên SMP 48 Chu Kỳ Trong Ngày (VNĐ/kWh)</span>
                </h3>
                <span className="text-xs text-slate-400">
                  Phân tách Miền Bắc (QTP, HND, PPC, NBP) vs Miền Nam (NT2, BTP, Phú Mỹ) vs Miền Trung
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-purple-400">
                  <span className="size-2 rounded-full bg-purple-400" /> Hệ thống
                </span>
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <span className="size-2 rounded-full bg-cyan-400" /> Miền Bắc
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="size-2 rounded-full bg-amber-400" /> Miền Nam
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={HOURLY_SMP_PRICES} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a324b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis domain={[1200, 2300]} stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f1218', borderColor: '#334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    formatter={(val: any) => [`${val.toLocaleString()} đ/kWh`]}
                  />
                  <Line type="monotone" dataKey="smpHT" name="Hệ Thống" stroke="#a855f7" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="smpMB" name="Miền Bắc" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="smpMN" name="Miền Nam" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2-Column: Fuel Distribution & Owner Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Generation by Fuel */}
            <div className="rounded-xl border border-white/10 bg-[#161a23] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Flame className="size-4 text-amber-400" />
                    <span>Sản Lượng Phát Theo Loại Hình Nguồn (MWh)</span>
                  </h3>
                  <span className="text-xs text-slate-400">Cập nhật ngày gần nhất từ NSMO</span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DAILY_GENERATION_BY_FUEL} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a324b" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="category" type="category" stroke="#64748b" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f1218', borderColor: '#334155', borderRadius: '8px' }}
                      formatter={(val: any) => [`${val.toLocaleString()} MWh`, 'Sản lượng']}
                    />
                    <Bar dataKey="generationMWh" radius={[0, 4, 4, 0]}>
                      {DAILY_GENERATION_BY_FUEL.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/5">
                <div className="text-slate-400">
                  Thủy điện chiếm: <strong className="text-cyan-400">49.8%</strong> (Ưu tiên huy động)
                </div>
                <div className="text-slate-400">
                  Nhiệt điện Than: <strong className="text-amber-400">38.8%</strong> (Chạy nền ổn định)
                </div>
              </div>
            </div>

            {/* Generation by Owner */}
            <div className="rounded-xl border border-white/10 bg-[#161a23] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building2 className="size-4 text-emerald-400" />
                    <span>Sản Lượng Theo Chủ Đầu Tư (MWh)</span>
                  </h3>
                  <span className="text-xs text-slate-400">Theo dõi doanh thu thực tế của POW, PGV, Khối CP</span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DAILY_GENERATION_BY_OWNER} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a324b" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="owner" type="category" stroke="#64748b" tick={{ fontSize: 11 }} width={140} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f1218', borderColor: '#334155', borderRadius: '8px' }}
                      formatter={(val: any) => [`${val.toLocaleString()} MWh`, 'Sản lượng']}
                    />
                    <Bar dataKey="generationMWh" radius={[0, 4, 4, 0]}>
                      {DAILY_GENERATION_BY_OWNER.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1 text-xs pt-2 border-t border-white/5">
                <div className="text-slate-400">
                  • <strong className="text-emerald-400">Khối Cổ phần (JSC)</strong> (QTP, HND, VSH, TMP, REE, HDG...): đạt <strong>88.190 MWh/ngày</strong>.
                </div>
                <div className="text-slate-400">
                  • <strong className="text-cyan-400">EVNGENCO 3 (PGV)</strong>: đạt <strong>87.545 MWh/ngày</strong> | <strong className="text-amber-400">PVN (POW)</strong>: đạt <strong>46.605 MWh/ngày</strong>.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: MÔ PHỎNG DOANH THU & LỢI NHUẬN (SIMULATOR)                 */}
      {/* ============================================================== */}
      {activeTab === 'SIMULATOR' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-[#0d1e1c] via-[#112421] to-[#0d1e1c] p-5 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
              <Calculator className="size-3.5" />
              <span>CÔNG CỤ ĐỊNH LƯỢNG DOANH THU &amp; LỢI NHUẬN THEO DỮ LIỆU THỰC TẾ</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              Mô Phỏng Doanh Thu Quý Theo Kịch Bản Thủy Văn &amp; Giá Thị Trường SMP
            </h2>
            <p className="text-xs text-slate-300 max-w-4xl leading-relaxed">
              Chọn bất kỳ mã cổ phiếu nào trong 36 mã để điều chỉnh giả định về hiện tượng thời tiết (La Niña / El Niño),
              tỷ lệ sản lượng hợp đồng (<strong className="text-white">α - Alpha</strong>) và giá cận biên thị trường (<strong className="text-white">SMP</strong>).
              Mô hình sẽ tự động tính toán Doanh thu Hợp đồng PPA, Doanh thu Thị trường giao ngay và Lợi nhuận sau thuế dự phóng.
            </p>
          </div>

          {/* Simulator Control Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Controls */}
            <div className="rounded-xl border border-white/10 bg-[#161a23] p-5 space-y-5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="size-4 text-emerald-400" />
                <span>Thiết Lập Tham Số Mô Phỏng</span>
              </h3>

              {/* Stock Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Chọn Mã Cổ Phiếu Điện:</label>
                <select
                  value={simTicker}
                  onChange={(e) => setSimTicker(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0f1218] px-3 py-2 text-sm font-bold text-white focus:border-emerald-500 focus:outline-none"
                >
                  {POWER_STOCKS.map((s) => (
                    <option key={s.ticker} value={s.ticker}>
                      {s.ticker} - {s.name} ({s.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Climate / Hydrology Scenario */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Kịch Bản Thủy Văn &amp; Mùa Vụ:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimHydrologyScenario('LA_NINA')}
                    className={cn(
                      'rounded-lg py-2 px-1 text-center text-xs font-bold transition-all border',
                      simHydrologyScenario === 'LA_NINA'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-[#0f1218] text-slate-400 border-white/5 hover:text-white'
                    )}
                  >
                    La Niña (Mưa lớn)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimHydrologyScenario('NEUTRAL')}
                    className={cn(
                      'rounded-lg py-2 px-1 text-center text-xs font-bold transition-all border',
                      simHydrologyScenario === 'NEUTRAL'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : 'bg-[#0f1218] text-slate-400 border-white/5 hover:text-white'
                    )}
                  >
                    Trung tính
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimHydrologyScenario('EL_NINO')}
                    className={cn(
                      'rounded-lg py-2 px-1 text-center text-xs font-bold transition-all border',
                      simHydrologyScenario === 'EL_NINO'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-[#0f1218] text-slate-400 border-white/5 hover:text-white'
                    )}
                  >
                    El Niño (Khô hạn)
                  </button>
                </div>
              </div>

              {/* SMP Price Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-400">Giá Thị Trường SMP Bình Quân:</span>
                  <strong className="text-purple-400 font-mono text-sm">{simSmpPrice.toLocaleString()} đ/kWh</strong>
                </div>
                <input
                  type="range"
                  min={1200}
                  max={2300}
                  step={25}
                  value={simSmpPrice}
                  onChange={(e) => setSimSmpPrice(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>1.200 đ</span>
                  <span>1.750 đ (TB)</span>
                  <span>2.300 đ (Đỉnh)</span>
                </div>
              </div>

              {/* Alpha Ratio Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-400">Tỷ Lệ Sản Lượng Hợp Đồng (α):</span>
                  <strong className="text-cyan-400 font-mono text-sm">{simAlpha}%</strong>
                </div>
                <input
                  type="range"
                  min={60}
                  max={95}
                  step={5}
                  value={simAlpha}
                  onChange={(e) => setSimAlpha(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>60% (Thị trường tự do)</span>
                  <span>75% (Tiêu chuẩn EAV)</span>
                  <span>95% (Bao tiêu cao)</span>
                </div>
              </div>
            </div>

            {/* Simulation Results Output */}
            <div className="lg:col-span-2 rounded-xl border border-white/10 bg-[#161a23] p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="size-4 text-emerald-400" />
                  <span>Kết Quả Dự Phóng Tài Chính Quý Cho {simStockObj.ticker}</span>
                </h3>
                <span className="rounded bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-xs font-bold">
                  {simStockObj.name} ({simStockObj.totalCapacityMW} MW)
                </span>
              </div>

              {/* Top Output Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-[#0f1218] p-3 border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Sản lượng phát quý</span>
                  <div className="text-lg font-black text-white font-mono">
                    {(simResults.estTotalGenMWh / 1000).toFixed(1)}k
                  </div>
                  <span className="text-[10px] text-cyan-400">MWh thương phẩm</span>
                </div>

                <div className="rounded-lg bg-[#0f1218] p-3 border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Doanh thu dự phóng</span>
                  <div className="text-lg font-black text-amber-400 font-mono">
                    {simResults.totalRevBillion.toFixed(0)}
                  </div>
                  <span className="text-[10px] text-slate-400">Tỷ VNĐ</span>
                </div>

                <div className="rounded-lg bg-[#0f1218] p-3 border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Lợi nhuận gộp</span>
                  <div className="text-lg font-black text-emerald-400 font-mono">
                    {simResults.grossProfitBillion.toFixed(0)}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold">Biên lãi: {simResults.grossMargin}%</span>
                </div>

                <div className="rounded-lg bg-[#0f1218] p-3 border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">LNST Ước tính</span>
                  <div className="text-lg font-black text-emerald-300 font-mono">
                    {simResults.netProfitBillion.toFixed(0)}
                  </div>
                  <span className="text-[10px] text-slate-400">Tỷ VNĐ</span>
                </div>
              </div>

              {/* Revenue Breakdown Bar */}
              <div className="rounded-lg bg-[#0f1218] p-4 border border-white/5 space-y-3">
                <span className="text-xs font-bold text-slate-300 block">Cấu Trúc Doanh Thu: Hợp Đồng PPA vs Thị Trường SMP</span>
                <div className="h-4 w-full rounded-full bg-slate-800 overflow-hidden flex">
                  <div
                    className="h-full bg-cyan-500 transition-all"
                    style={{ width: `${(simResults.revPpaBillion / simResults.totalRevBillion) * 100}%` }}
                    title={`Doanh thu PPA: ${simResults.revPpaBillion.toFixed(0)} tỷ`}
                  />
                  <div
                    className="h-full bg-purple-500 transition-all"
                    style={{ width: `${(simResults.revSmpBillion / simResults.totalRevBillion) * 100}%` }}
                    title={`Doanh thu Thị trường: ${simResults.revSmpBillion.toFixed(0)} tỷ`}
                  />
                </div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-cyan-400 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-cyan-400" />
                    Doanh thu Hợp đồng PPA ({simAlpha}%): <strong>{simResults.revPpaBillion.toFixed(0)} Tỷ VNĐ</strong>
                  </span>
                  <span className="text-purple-400 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-purple-400" />
                    Doanh thu Thị trường SMP ({100 - simAlpha}%): <strong>{simResults.revSmpBillion.toFixed(0)} Tỷ VNĐ</strong>
                  </span>
                </div>
              </div>

              {/* Expert Insight Note */}
              <div className="rounded bg-white/5 p-3 text-xs text-slate-300 space-y-1.5 border-l-2 border-emerald-400">
                <div className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-400" />
                  <span>Khuyến Nghị Định Giá Đầu Tư Cho {simStockObj.ticker}:</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Ở mức P/E hiện tại là <strong className="text-white">{simStockObj.pe}x</strong> và tỷ suất cổ tức tiền mặt <strong className="text-emerald-400">{simStockObj.dividendYield}%</strong>,{' '}
                  {simStockObj.ticker} đang có biên an toàn tài chính vững chắc. Khi giá SMP duy trì trên 1.700 đ/kWh và lưu lượng nước về hồ đạt trên 80% dung tích thiết kế,{' '}
                  lợi nhuận sau thuế cả năm có thể vượt kế hoạch Đại hội Cổ đông từ 20% đến 35%.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: KHUNG GIÁ & CHÍNH SÁCH EAV                              */}
      {/* ============================================================== */}
      {activeTab === 'REGULATIONS' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-blue-500/30 bg-gradient-to-r from-[#101b2b] via-[#132035] to-[#101b2b] p-5 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-300">
              <FileText className="size-3.5" />
              <span>VĂN BẢN QUY PHẠM PHÁP LUẬT &amp; KHUNG GIÁ TỪ EAV (Cục Điều tiết Điện lực)</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              Khung Giá Trần Phát Điện, Biểu Giá Chi Phí Tránh Được &amp; Cơ Chế DPPA
            </h2>
            <p className="text-xs text-slate-300 max-w-4xl leading-relaxed">
              Các quyết định và thông tư của Bộ Công Thương / Cục Điện lực là nền tảng quy định giá bán trần PPA,
              biểu giá bao tiêu cho các nhà máy thủy điện nhỏ dưới 30MW và cơ chế mua bán điện trực tiếp (DPPA).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EAV_REGULATION_DOCS.map((doc, idx) => (
              <div key={idx} className="rounded-xl border border-white/10 bg-[#161a23] p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-blue-500/20 text-blue-300 px-2 py-0.5 text-xs font-bold font-mono">
                      {doc.docNumber}
                    </span>
                    <span className="text-[11px] text-slate-400">Hiệu lực: {doc.effectiveDate}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white leading-snug">{doc.title}</h3>
                  <div className="rounded bg-[#0f1218] p-3 text-xs border border-white/5 space-y-1.5">
                    <div className="text-slate-400">
                      Phạm vi áp dụng: <strong className="text-white">{doc.scope}</strong>
                    </div>
                    <div className="text-amber-400 font-semibold">
                      Chỉ số then chốt: {doc.keyNumbers}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Cổ phiếu chịu tác động trực tiếp:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {doc.impactTickers.map((t) => (
                      <span key={t} className="rounded bg-amber-500/20 text-amber-300 px-2 py-0.5 text-xs font-bold">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock Detail Modal / Drawer */}
      {isDetailOpen && selectedStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#141824] p-6 shadow-2xl space-y-5 text-slate-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex size-12 items-center justify-center rounded-xl font-black text-white text-lg shadow-md"
                  style={{ backgroundColor: selectedStock.avatarColor }}
                >
                  {selectedStock.ticker}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-white">{selectedStock.ticker}</h2>
                    <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-bold">{selectedStock.exchange}</span>
                    <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 text-xs font-bold">
                      {selectedStock.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedStock.name}</p>
                  <div className="flex items-center gap-4 mt-1.5 text-xs font-mono">
                    <span className="text-slate-400">Vốn hóa: <strong className="text-white">{selectedStock.marketCap.toLocaleString()} Tỷ</strong></span>
                    <span className="text-slate-400">P/E Thực tế: <strong className="text-amber-400">{selectedStock.peAdjusted || Math.round(selectedStock.pe * 1.11 * 10) / 10}x</strong> <span className="text-slate-500 text-[10px]">(Báo cáo: {selectedStock.pe}x)</span></span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Plant Assets Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="size-4" />
                <span>Danh Sách Nhà Máy Điện Sở Hữu (Tổng: {selectedStock.totalCapacityMW.toLocaleString()} MW)</span>
              </h3>
              <div className="rounded-lg border border-white/10 bg-[#0f1218] overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[750px]">
                  <thead className="bg-[#1a202c] text-slate-400 font-bold border-b border-white/5">
                    <tr>
                      <th className="p-2.5">Tên Nhà Máy</th>
                      <th className="p-2.5">Công Suất</th>
                      <th className="p-2.5">Loại Hình</th>
                      <th className="p-2.5">Vị Trí</th>
                      <th className="p-2.5">Lưu Vực / Nhiên Liệu</th>
                      <th className="p-2.5">Cơ Chế Giá</th>
                      <th className="p-2.5 text-right">Giá Bán Ước Tính</th>
                      <th className="p-2.5 min-w-[200px]">Đặc Điểm Định Giá / Khấu Hao</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {selectedStock.powerPlants.map((plant, pIdx) => (
                      <tr key={pIdx} className="hover:bg-white/5 transition-colors">
                        <td className="p-2.5 font-sans font-bold text-white whitespace-nowrap">{plant.name}</td>
                        <td className="p-2.5 text-amber-400 font-bold whitespace-nowrap">⚡ {plant.capacityMW} MW</td>
                        <td className="p-2.5 font-sans text-slate-300 whitespace-nowrap">{plant.type}</td>
                        <td className="p-2.5 font-sans text-slate-400 whitespace-nowrap">{plant.location}</td>
                        <td className="p-2.5 font-sans text-slate-400 whitespace-nowrap">{plant.basinOrFuel}</td>
                        <td className="p-2.5 font-sans whitespace-nowrap">
                          <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-cyan-300 font-medium border border-cyan-500/20">
                            {plant.pricingType || 'Hợp đồng PPA'}
                          </span>
                        </td>
                        <td className="p-2.5 text-right whitespace-nowrap">
                          {plant.estSellingPrice ? (
                            <div className="font-mono">
                              <span className="font-black text-amber-300">{plant.estSellingPrice.toLocaleString()}</span>
                              <span className="text-[10px] text-slate-400 ml-1">đ/kWh</span>
                            </div>
                          ) : (
                            <span className="text-slate-500">Đang cập nhật</span>
                          )}
                        </td>
                        <td className="p-2.5 font-sans text-slate-300 text-[11px] leading-relaxed">
                          {plant.priceNote || 'Ký hợp đồng PPA dài hạn với EVN'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Channels & Drivers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-lg bg-[#0f1218] p-3.5 border border-white/5 space-y-2">
                <span className="font-bold text-cyan-400 block uppercase tracking-wider text-[11px]">Kênh Giám Sát EAV:</span>
                <p className="text-slate-300 leading-relaxed">{selectedStock.eavTrackingChannel}</p>
                <span className="font-bold text-amber-400 block uppercase tracking-wider text-[11px] pt-2 border-t border-white/5">
                  Kênh Giám Sát NSMO:
                </span>
                <p className="text-slate-300 leading-relaxed">{selectedStock.nsmoTrackingChannel}</p>
              </div>

              <div className="rounded-lg bg-[#0f1218] p-3.5 border border-white/5 space-y-2">
                <span className="font-bold text-emerald-400 block uppercase tracking-wider text-[11px]">Động Lực Tăng Trưởng Q3-Q4:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  {selectedStock.q3Forecast.drivers.map((d, dIdx) => (
                    <li key={dIdx}>{d}</li>
                  ))}
                </ul>
                <span className="font-bold text-rose-400 block uppercase tracking-wider text-[11px] pt-2 border-t border-white/5">
                  Rủi Ro / Cơn Gió Ngược:
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  {selectedStock.q3Forecast.headwinds.map((h, hIdx) => (
                    <li key={hIdx}>{h}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
              <Link
                href={`/stock/${selectedStock.ticker}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/25 hover:border-cyan-500/60 hover:text-white transition-all shadow-md"
              >
                <Building2 className="size-4 text-cyan-400" />
                <span>Mở tab Doanh nghiệp ({selectedStock.ticker}): Xem BCTC &amp; Biểu đồ</span>
                <ArrowUpRight className="size-3.5 text-cyan-400" />
              </Link>

              <button
                onClick={() => setIsDetailOpen(false)}
                className="rounded-lg bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
