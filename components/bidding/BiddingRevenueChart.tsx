'use client';

import React, { useState, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  BarChart3,
  Calendar,
  Layers,
  Sparkles,
  TrendingUp,
  Info,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingDown,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { QuarterlyBiddingRevenueComparison, HealthcareContractor } from '@/lib/bidding-types';
import { cn } from '@/lib/utils';

export type YearFilter = 'ALL' | 'RECENT_3Y' | '2026' | '2025' | '2024' | '2023' | '2022' | '2021';

interface Props {
  contractor?: HealthcareContractor;
  series?: QuarterlyBiddingRevenueComparison[];
  allContractors?: HealthcareContractor[];
  onSelectContractor?: (stockCode: string) => void;
  title?: string;
  isModal?: boolean;
}

const YEAR_OPTIONS: { id: YearFilter; label: string }[] = [
  { id: 'ALL', label: 'Toàn kỳ (2021–2026)' },
  { id: 'RECENT_3Y', label: 'Gần đây (2024–2026)' },
  { id: '2026', label: '2026' },
  { id: '2025', label: '2025' },
  { id: '2024', label: '2024' },
  { id: '2023', label: '2023' },
  { id: '2022', label: '2022' },
  { id: '2021', label: '2021' },
];

export function BiddingRevenueChart({
  contractor,
  series: propSeries,
  allContractors,
  onSelectContractor,
  title,
  isModal = false,
}: Props) {
  const currentContractor = contractor;
  const currentSeries = useMemo(() => {
    return propSeries || currentContractor?.quarterly_comparison_series || [];
  }, [propSeries, currentContractor]);

  // Controls state: default to 'ALL' (6-year complete series)
  const [selectedYear, setSelectedYear] = useState<YearFilter>('ALL');
  const [viewMode, setViewMode] = useState<'COMPOSED' | 'BARS_ONLY' | 'BIDS_COUNT'>('COMPOSED');
  const [showNPAT, setShowNPAT] = useState<boolean>(false);

  // Filter series according to selected option
  const filteredData = useMemo(() => {
    if (!currentSeries || currentSeries.length === 0) return [];
    let list = currentSeries;
    if (selectedYear === 'RECENT_3Y') {
      list = currentSeries.filter((d) => d.year >= 2024);
    } else if (selectedYear !== 'ALL') {
      const yr = parseInt(selectedYear);
      list = currentSeries.filter((d) => d.year === yr);
    }

    // Do not forecast Q3/2026 net revenue; only show actual BCTC quarters
    return list.map((d) => {
      if (d.quarter === 'Q3/2026' || d.is_forecast) {
        return {
          ...d,
          net_revenue_billion: undefined as any,
          npat_billion: undefined as any,
          is_forecast: false,
        };
      }
      return d;
    });
  }, [currentSeries, selectedYear]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        totalBidding: 0,
        totalRev: 0,
        totalBids: 0,
        avgBiddingPerQ: 0,
        avgRevPerQ: 0,
        realizationRatio: 0,
        quartersCount: 0,
      };
    }
    const totalBidding = filteredData.reduce((s, d) => s + (d.bidding_value_billion || 0), 0);
    const revItems = filteredData.filter((d) => d.net_revenue_billion !== undefined && d.net_revenue_billion !== null);
    const totalRev = revItems.reduce((s, d) => s + (d.net_revenue_billion || 0), 0);
    const totalBids = filteredData.reduce((s, d) => s + (d.bids_won_count || 0), 0);
    const count = filteredData.length;
    const revCount = revItems.length;
    const revBiddingTotal = revItems.reduce((s, d) => s + (d.bidding_value_billion || 0), 0);
    const realizationRatio = revBiddingTotal > 0 ? (totalRev / revBiddingTotal) * 100 : 0;

    return {
      totalBidding: Math.round(totalBidding),
      totalRev: Math.round(totalRev),
      totalBids,
      avgBiddingPerQ: Math.round(totalBidding / count),
      avgRevPerQ: revCount > 0 ? Math.round(totalRev / revCount) : 0,
      realizationRatio: Math.round(realizationRatio),
      quartersCount: count,
    };
  }, [filteredData]);

  if (!currentSeries || currentSeries.length === 0) {
    return (
      <div className="rounded-2xl border border-[#232936] bg-[#141822] p-6 text-center text-slate-400">
        <Info className="mx-auto size-6 text-amber-400 mb-2" />
        <p className="text-sm">Chưa có dữ liệu chuỗi đối chiếu theo quý cho đơn vị này.</p>
      </div>
    );
  }

  const isWideSeries = filteredData.length > 14;

  return (
    <div
      className={cn(
        "rounded-2xl border border-[#232936] bg-[#141822] overflow-hidden shadow-xl transition-all",
        isModal ? "p-4 sm:p-6" : "p-5 sm:p-7"
      )}
    >
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#232936] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <BarChart3 className="size-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {title || `Biểu Đồ Đối Chiếu: Giá Trị Trúng Thầu vs Doanh Thu (${currentContractor?.stock_code || 'Toàn kỳ'})`}
            </h3>
            {currentContractor?.stock_code && (
              <span className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-xs font-black text-emerald-400">
                {currentContractor.stock_code}
              </span>
            )}
            <span className="rounded-md bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 text-[11px] font-semibold text-sky-400">
              {currentSeries.length} Quý (2021–2026)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Chuỗi dữ liệu 6 năm (2021 – 2026): Đối chiếu số tiền &amp; số lượng gói trúng thầu kênh bệnh viện (ETC) với Doanh thu thuần BCTC để kiểm định độ khớp và chu kỳ ghi nhận doanh thu.
          </p>
        </div>

        {/* Company Quick-Switch Tabs (if in Dashboard mode with multiple contractors) */}
        {allContractors && onSelectContractor && allContractors.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#0f1218] border border-[#232936]">
            {allContractors.map((c) => {
              const isSelected = c.stock_code === currentContractor?.stock_code;
              return (
                <button
                  key={c.stock_code || c.id}
                  onClick={() => c.stock_code && onSelectContractor(c.stock_code)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                    isSelected
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {c.stock_code}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter and Option Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 pb-2">
        {/* Year Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <Calendar className="size-3.5 text-slate-400" />
            Thời gian:
          </span>
          {YEAR_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedYear(opt.id)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all border",
                selectedYear === opt.id
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold"
                  : "bg-[#181d28] border-transparent text-slate-400 hover:text-slate-200 hover:border-[#2d3545]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* View Mode & Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Selector */}
          <div className="flex items-center rounded-lg bg-[#0f1218] border border-[#232936] p-0.5 text-xs">
            <button
              onClick={() => setViewMode('COMPOSED')}
              className={cn(
                "rounded-md px-2.5 py-1 font-semibold transition-colors",
                viewMode === 'COMPOSED' ? "bg-[#232a39] text-white" : "text-slate-400 hover:text-white"
              )}
            >
              Cột + Số Gói
            </button>
            <button
              onClick={() => setViewMode('BARS_ONLY')}
              className={cn(
                "rounded-md px-2.5 py-1 font-semibold transition-colors",
                viewMode === 'BARS_ONLY' ? "bg-[#232a39] text-white" : "text-slate-400 hover:text-white"
              )}
            >
              Chỉ Cột Giá Trị
            </button>
            <button
              onClick={() => setViewMode('BIDS_COUNT')}
              className={cn(
                "rounded-md px-2.5 py-1 font-semibold transition-colors",
                viewMode === 'BIDS_COUNT' ? "bg-[#232a39] text-white" : "text-slate-400 hover:text-white"
              )}
            >
              Số Gói Thầu
            </button>
          </div>

          {/* Toggle NPAT */}
          {viewMode !== 'BIDS_COUNT' && (
            <button
              onClick={() => setShowNPAT(!showNPAT)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all flex items-center gap-1",
                showNPAT
                  ? "bg-pink-500/20 border-pink-500/50 text-pink-300"
                  : "bg-[#181d28] border-[#232936] text-slate-400 hover:text-slate-200"
              )}
            >
              <span className={cn("size-1.5 rounded-full", showNPAT ? "bg-pink-400" : "bg-slate-500")} />
              {showNPAT ? 'Ẩn LNST' : '+ Xem LNST'}
            </button>
          )}
        </div>
      </div>

      {/* Main Chart Area */}
      <div className={cn("relative mt-2 w-full pt-2", isWideSeries ? "h-[380px] sm:h-[430px]" : "h-[330px] sm:h-[380px]")}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={filteredData}
            margin={{
              top: 20,
              right: viewMode === 'BARS_ONLY' ? 10 : 30,
              left: 10,
              bottom: isWideSeries ? 35 : 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#232936" vertical={false} />
            <XAxis
              dataKey="quarter"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: isWideSeries ? 10 : 11, fontWeight: 500 }}
              tickLine={{ stroke: '#334155' }}
              interval={0}
              angle={isWideSeries ? -35 : 0}
              textAnchor={isWideSeries ? 'end' : 'middle'}
              height={isWideSeries ? 50 : 30}
              dy={isWideSeries ? 8 : 6}
            />

            {/* Primary Left Y-Axis: Billion VND */}
            <YAxis
              yAxisId="left"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${v.toLocaleString('vi-VN')} tỷ`}
              dx={-4}
            />

            {/* Secondary Right Y-Axis: Packages Count */}
            {(viewMode === 'COMPOSED' || viewMode === 'BIDS_COUNT') && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#f59e0b"
                tick={{ fill: '#f59e0b', fontSize: 11 }}
                tickLine={{ stroke: '#f59e0b' }}
                tickFormatter={(v) => `${v} gói`}
                dx={4}
              />
            )}

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
            />

            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
              formatter={(value) => {
                if (value === 'bidding_value_billion') return <span className="text-emerald-400 font-semibold">Giá trị trúng thầu (Tỷ VNĐ)</span>;
                if (value === 'net_revenue_billion') return <span className="text-sky-400 font-semibold">Doanh thu thuần BCTC (Tỷ VNĐ)</span>;
                if (value === 'bids_won_count') return <span className="text-amber-400 font-semibold">Số gói thầu trúng (Gói)</span>;
                if (value === 'npat_billion') return <span className="text-pink-400 font-semibold">Lợi nhuận sau thuế (Tỷ VNĐ)</span>;
                return value;
              }}
            />

            {/* Bar 1: Giá trị trúng thầu (Tỷ VNĐ) */}
            {viewMode !== 'BIDS_COUNT' && (
              <Bar
                yAxisId="left"
                dataKey="bidding_value_billion"
                name="bidding_value_billion"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={isWideSeries ? 22 : 32}
              >
                {filteredData.map((entry, index) => (
                  <Cell
                    key={`cell-bidding-${index}`}
                    fill={entry.is_forecast ? '#059669' : '#10b981'}
                    opacity={entry.is_forecast ? 0.85 : 1}
                    stroke={entry.is_forecast ? '#34d399' : 'none'}
                    strokeDasharray={entry.is_forecast ? '4 2' : 'none'}
                  />
                ))}
              </Bar>
            )}

            {/* Bar 2: Doanh thu thuần BCTC (Tỷ VNĐ) */}
            {viewMode !== 'BIDS_COUNT' && (
              <Bar
                yAxisId="left"
                dataKey="net_revenue_billion"
                name="net_revenue_billion"
                fill="#0284c7"
                radius={[4, 4, 0, 0]}
                maxBarSize={isWideSeries ? 22 : 32}
              >
                {filteredData.map((entry, index) => (
                  <Cell
                    key={`cell-rev-${index}`}
                    fill={entry.is_forecast ? '#0284c7' : '#38bdf8'}
                    opacity={entry.is_forecast ? 0.75 : 1}
                    stroke={entry.is_forecast ? '#7dd3fc' : 'none'}
                    strokeDasharray={entry.is_forecast ? '4 2' : 'none'}
                  />
                ))}
              </Bar>
            )}

            {/* Optional Line: NPAT */}
            {showNPAT && viewMode !== 'BIDS_COUNT' && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="npat_billion"
                name="npat_billion"
                stroke="#ec4899"
                strokeWidth={2.5}
                dot={{ r: isWideSeries ? 2.5 : 4, fill: '#ec4899', strokeWidth: 1, stroke: '#fff' }}
              />
            )}

            {/* Line / Bar for Packages Count */}
            {viewMode === 'BIDS_COUNT' ? (
              <Bar
                yAxisId="right"
                dataKey="bids_won_count"
                name="bids_won_count"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
                maxBarSize={isWideSeries ? 26 : 40}
              />
            ) : viewMode === 'COMPOSED' ? (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="bids_won_count"
                name="bids_won_count"
                stroke="#f59e0b"
                strokeWidth={isWideSeries ? 2 : 2.5}
                dot={{ r: isWideSeries ? 2.5 : 4, fill: '#f59e0b', strokeWidth: 1.5, stroke: '#141822' }}
                activeDot={{ r: 6, fill: '#fbbf24' }}
              />
            ) : null}

            {/* Legend */}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* KPI Stats Strip */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-[#232936] pt-4">
        {/* Total Bidding */}
        <div className="rounded-xl border border-[#232936] bg-[#0f1218]/70 p-3">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Tổng Trúng Thầu ({stats.quartersCount} Quý)</span>
            <span className="size-2 rounded-full bg-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-400 mt-1">
            {stats.totalBidding.toLocaleString('vi-VN')} <span className="text-xs font-semibold text-slate-400">tỷ</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Trung bình: ~{stats.avgBiddingPerQ.toLocaleString('vi-VN')} tỷ/quý
          </div>
        </div>

        {/* Total Net Revenue */}
        <div className="rounded-xl border border-[#232936] bg-[#0f1218]/70 p-3">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Tổng Doanh Thu BCTC</span>
            <span className="size-2 rounded-full bg-sky-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-sky-400 mt-1">
            {stats.totalRev.toLocaleString('vi-VN')} <span className="text-xs font-semibold text-slate-400">tỷ</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Trung bình: ~{stats.avgRevPerQ.toLocaleString('vi-VN')} tỷ/quý
          </div>
        </div>

        {/* Total Bids Count */}
        <div className="rounded-xl border border-[#232936] bg-[#0f1218]/70 p-3">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Tổng Số Gói Trúng</span>
            <span className="size-2 rounded-full bg-amber-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-400 mt-1">
            {stats.totalBids.toLocaleString('vi-VN')} <span className="text-xs font-semibold text-slate-400">gói</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Toàn bộ cơ sở y tế &amp; SYT
          </div>
        </div>

        {/* Realization Ratio */}
        <div className="rounded-xl border border-[#232936] bg-[#0f1218]/70 p-3">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Tỷ Lệ Chuyển Đổi DTT/Thầu</span>
            <Sparkles className="size-3 text-cyan-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-white mt-1">
            {stats.realizationRatio}%
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5 font-medium">
            Hợp đồng kỳ hạn 12–24 tháng
          </div>
        </div>
      </div>

      {/* Analytical Takeaway / Historical Cycles Explanation */}
      <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 sm:p-4 text-xs text-slate-300">
        <div className="flex items-start gap-2.5">
          <Info className="size-4.5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 leading-relaxed">
            <div className="font-bold text-emerald-300 text-sm">
              Diễn biến chu kỳ Đấu thầu &amp; Doanh thu qua các năm 2021 – 2026 ({currentContractor?.stock_code}):
            </div>
            <p>
              • <strong>Giai đoạn 2021–2022 (Dịch &amp; Mở thầu dồn ứ):</strong> Năm 2021 chịu giãn cách xã hội (Q3/2021 doanh thu giảm về 418 tỷ). Bước sang 2022, nhu cầu khám chữa bệnh bùng nổ trở lại và các bệnh viện mở thầu thuốc bù dồn ứ, kéo doanh thu Q2/2022 của DP1 lập đỉnh <strong>740 tỷ</strong>.
            </p>
            <p>
              • <strong>Giai đoạn 2023 (Tháo gỡ điểm nghẽn pháp lý):</strong> Sau giai đoạn thiếu thuốc trầm trọng cuối 2022, Chính phủ ban hành Nghị quyết 30/NQ-CP và Nghị định 07 tháo gỡ điểm nghẽn thanh toán BHYT và mua sắm y tế, dòng tiền đấu thầu được khai thông mạnh mẽ đưa tổng giá trị trúng thầu năm 2023 lên <strong>5.480 tỷ</strong>.
            </p>
            <p>
              • <strong>Giai đoạn 2024–2025 (Chuẩn hóa Luật Đấu thầu 2023):</strong> Hoạt động đấu thầu tập trung quốc gia và địa phương đi vào nền nếp, giá trị trúng thầu đạt <strong>6.250 tỷ (2024)</strong> và <strong>6.650 tỷ (2025)</strong>, tạo bệ phóng backlog vững chắc.
            </p>
            <p>
              • <strong>Giai đoạn 2026 (Tăng tốc bứt phá):</strong> Backlog trúng thầu tiếp tục tăng trưởng mạnh mẽ và ghi nhận các gói thầu lớn trong năm 2026. Doanh thu thuần Quý 3/2026 sẽ được phản ánh thực tế khi doanh nghiệp chính thức công bố BCTC.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom Recharts Tooltip Component
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const data: QuarterlyBiddingRevenueComparison = payload[0]?.payload;
  if (!data) return null;

  const biddingVal = data.bidding_value_billion || 0;
  const revVal = data.net_revenue_billion;
  const hasRev = revVal !== undefined && revVal !== null;
  const diffPct = hasRev && biddingVal > 0 ? ((revVal / biddingVal) * 100).toFixed(1) : null;

  return (
    <div className="rounded-xl border border-[#2d3548] bg-[#0f1218]/95 p-3.5 shadow-2xl backdrop-blur-md min-w-[240px] text-xs">
      <div className="flex items-center justify-between border-b border-[#232936] pb-2 mb-2.5">
        <span className="font-bold text-white text-sm">{data.quarter}</span>
        {hasRev ? (
          <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
            BCTC THỰC TẾ
          </span>
        ) : (
          <span className="rounded-full bg-sky-500/20 border border-sky-500/40 px-2 py-0.5 text-[10px] font-bold text-sky-300">
            CHỜ BCTC CÔNG BỐ
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-400" />
            Trúng thầu ETC:
          </span>
          <span className="font-bold text-emerald-400">
            {biddingVal.toLocaleString('vi-VN')} tỷ
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-sky-400" />
            Doanh thu thuần:
          </span>
          <span className={`font-bold ${hasRev ? 'text-sky-400' : 'text-slate-400 italic'}`}>
            {hasRev ? `${revVal.toLocaleString('vi-VN')} tỷ` : 'Chưa công bố BCTC'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-400" />
            Số gói trúng:
          </span>
          <span className="font-bold text-amber-400">
            {data.bids_won_count} gói
          </span>
        </div>

        {data.npat_billion !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-pink-400" />
              Lợi nhuận sau thuế:
            </span>
            <span className="font-bold text-pink-400">
              {data.npat_billion.toLocaleString('vi-VN')} tỷ
            </span>
          </div>
        )}

        {diffPct && (
          <div className="border-t border-[#232936] pt-1.5 mt-1.5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Tỷ lệ DTT / Trúng thầu:</span>
            <span className="font-bold text-cyan-300">{diffPct}%</span>
          </div>
        )}

        {data.note && (
          <div className="mt-1 text-[10px] text-slate-400 italic bg-white/5 p-1.5 rounded-lg border border-white/5">
            📌 {data.note}
          </div>
        )}
      </div>
    </div>
  );
}
