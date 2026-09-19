'use client';

import React, { useState, useMemo, useTransition } from 'react';
import {
  TrendingUp,
  BarChart3,
  Landmark,
  Download,
  Search,
  ChevronRight,
  ChevronDown,
  Layers,
  Calendar,
  Filter,
  Eye,
  EyeOff,
  Building2,
  Package,
  CircleDollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  MacroMeta,
  MacroRecord,
  MacroSummaryItem,
  formatMacroValue,
  formatPeriodLabel,
} from '@/lib/macro-types';
import { cn } from '@/lib/utils';

interface MacroDashboardProps {
  initialCatalog: MacroMeta[];
  initialSummary: MacroSummaryItem[];
  initialRecord: MacroRecord;
  initialSlug: string;
}

const GROUP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dautu: Building2,
  hethongnganhang: Landmark,
  thitruongtiente: CircleDollarSign,
  tongsanphamquocnoi: TrendingUp,
  sanxuatvadichvu: Activity,
  tieudung: Layers,
  giaca: ArrowUpRight,
  giaodichquocte: Package,
  taikhoa: BarChart3,
};

const TIMEFRAME_LABELS: Record<string, string> = {
  quarterly: 'Theo Quý',
  monthly: 'Theo Tháng',
  yearly: 'Theo Năm',
  ytd: 'Lũy kế YTD',
};

const VALUE_TYPE_LABELS: Record<string, string> = {
  value: 'Giá trị (Gốc)',
  qoq: '% Tăng trưởng QoQ',
  yoy: '% Tăng trưởng YoY',
  mom: '% Tăng trưởng MoM',
};

export function MacroDashboard({
  initialCatalog,
  initialSummary,
  initialRecord,
  initialSlug,
}: MacroDashboardProps) {
  const [currentSlug, setCurrentSlug] = useState<string>(initialSlug);
  const [currentRecord, setCurrentRecord] = useState<MacroRecord>(initialRecord);
  const [timeFrame, setTimeFrame] = useState<string>(initialRecord.meta.defaultTimeFrame);
  const [valueType, setValueType] = useState<string>(initialRecord.meta.defaultValueType);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [showChart, setShowChart] = useState<boolean>(true);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({ all: true });
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Nhóm các chỉ tiêu trong Catalog theo Group
  const groupedIndicators = useMemo(() => {
    const map = new Map<string, { groupName: string; groupKey: string; items: MacroMeta[] }>();

    initialCatalog.forEach((item) => {
      if (
        searchQuery &&
        !item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.description.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return;
      }

      if (!map.has(item.groupKey)) {
        map.set(item.groupKey, {
          groupName: item.group,
          groupKey: item.groupKey,
          items: [],
        });
      }
      map.get(item.groupKey)!.items.push(item);
    });

    return Array.from(map.values());
  }, [initialCatalog, searchQuery]);

  // Đổi chỉ tiêu vĩ mô khi click ở sidebar
  const handleSelectIndicator = async (slug: string) => {
    if (slug === currentSlug) return;
    setCurrentSlug(slug);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/macro/${slug}`);
        if (res.ok) {
          const data: MacroRecord = await res.json();
          setCurrentRecord(data);
          setTimeFrame(data.meta.defaultTimeFrame);
          setValueType(data.meta.defaultValueType);
          setSelectedMetricId(null);
        }
      } catch (err) {
        console.error('Lỗi tải chỉ tiêu vĩ mô:', err);
      }
    });
  };

  // Trích xuất dataset hiện tại dựa trên timeFrame và valueType
  const activeDataset = useMemo(() => {
    const tfData = currentRecord.datasets?.[timeFrame];
    if (!tfData) {
      // fallback sang khung khả dụng đầu tiên
      const firstTf = Object.keys(currentRecord.datasets || {})[0];
      if (!firstTf) return null;
      const firstVt = Object.keys(currentRecord.datasets[firstTf] || {})[0];
      return currentRecord.datasets[firstTf]?.[firstVt] || null;
    }

    if (tfData[valueType]) {
      return tfData[valueType];
    }

    // fallback sang valueType khả dụng đầu tiên
    const firstVt = Object.keys(tfData)[0];
    return tfData[firstVt] || null;
  }, [currentRecord, timeFrame, valueType]);

  // Các mốc kỳ hiển thị ở header bảng
  const headers = useMemo(() => {
    return activeDataset?.headers || [];
  }, [activeDataset]);

  // Toàn bộ các dòng dữ liệu phẳng để hiển thị
  const tableRows = useMemo(() => {
    if (!activeDataset?.parent) return [];
    const rows: Array<{
      id: string;
      name: string;
      isParentTitle?: boolean;
      level: number;
      data: [number, number | null][];
    }> = [];

    activeDataset.parent.forEach((parentGroup) => {
      if (parentGroup.title) {
        rows.push({
          id: `parent_${parentGroup.title}`,
          name: parentGroup.title,
          isParentTitle: true,
          level: 0,
          data: [],
        });
      }

      parentGroup.child?.forEach((child) => {
        if (tableSearch && !child.name.toLowerCase().includes(tableSearch.toLowerCase())) {
          return;
        }

        rows.push({
          id: child.id || child.name,
          name: child.name,
          level: child.level || 1,
          data: child.data || [],
        });
      });
    });

    return rows;
  }, [activeDataset, tableSearch]);

  // Dữ liệu cho biểu đồ Recharts (lấy theo dòng được chọn hoặc dòng đầu tiên)
  const chartData = useMemo(() => {
    if (!tableRows.length || !headers.length) return null;
    const targetRow = selectedMetricId
      ? tableRows.find((r) => r.id === selectedMetricId && !r.isParentTitle)
      : tableRows.find((r) => !r.isParentTitle && r.data.length > 0);

    if (!targetRow || !targetRow.data) return null;

    // Map dữ liệu từ mới nhất -> cũ nhất sang chiều xuôi thời gian cho biểu đồ
    const points = targetRow.data
      .map((item, idx) => {
        const periodKey = headers[idx] || '';
        const label = formatPeriodLabel(periodKey, timeFrame);
        return {
          period: label,
          timestamp: item[0],
          value: item[1] !== null ? Number(item[1]) : null,
        };
      })
      .filter((p) => p.value !== null)
      .reverse(); // Đảo lại theo thứ tự thời gian từ quá khứ đến hiện tại

    return {
      metricName: targetRow.name,
      points,
    };
  }, [tableRows, headers, selectedMetricId, timeFrame]);

  // Xuất file CSV / Excel
  const handleExportCsv = () => {
    if (!tableRows.length || !headers.length) return;

    const formattedHeaders = ['Chỉ tiêu', ...headers.map((h) => formatPeriodLabel(h, timeFrame))];
    const csvLines = [formattedHeaders.join(',')];

    tableRows.forEach((row) => {
      if (row.isParentTitle) {
        csvLines.push(`"${row.name}"`);
        return;
      }
      const values = row.data.map((d) => (d[1] !== null ? d[1] : ''));
      csvLines.push([`"${row.name}"`, ...values].join(','));
    });

    const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Du-lieu-vi-mo-${currentRecord.meta.slug}-${timeFrame}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-8rem)]">
      {/* 1. THANH MENU BÊN TRÁI: CÂY DANH MỤC VĨ MÔ */}
      <aside className="w-full lg:w-72 shrink-0 bg-[#14171f] border border-white/8 rounded-xl p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/8">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Landmark className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#F0F3F6] leading-tight">Chỉ Số Vĩ Mô</h2>
              <span className="text-[10px] text-[#8B98A5]">Việt Nam & Toàn Cầu</span>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            {initialCatalog.length} chỉ tiêu
          </span>
        </div>

        {/* Ô tìm kiếm danh mục */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-[#8B98A5]" />
          <input
            type="text"
            placeholder="Tìm chỉ số vĩ mô..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0e1117] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#F0F3F6] placeholder-[#64748b] focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        {/* Danh sách các nhóm và chỉ số */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[70vh] lg:max-h-[calc(100vh-16rem)]">
          {groupedIndicators.map((grp) => {
            const GroupIcon = GROUP_ICONS[grp.groupKey] || Layers;
            return (
              <div key={grp.groupKey} className="space-y-1">
                <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold text-[#8B98A5] uppercase tracking-wider">
                  <GroupIcon className="size-3.5 text-emerald-400/70" />
                  <span>{grp.groupName}</span>
                </div>
                <div className="space-y-0.5">
                  {grp.items.map((item) => {
                    const isActive = item.slug === currentSlug;
                    return (
                      <button
                        key={item.slug}
                        onClick={() => handleSelectIndicator(item.slug)}
                        className={cn(
                          'w-full flex items-center justify-between text-left px-2.5 py-2 rounded-lg text-xs transition-all',
                          isActive
                            ? 'bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30 shadow-xs'
                            : 'text-[#9EACB9] hover:bg-white/5 hover:text-[#F0F3F6]'
                        )}
                      >
                        <span className="truncate pr-2">{item.name}</span>
                        {isActive && <ChevronRight className="size-3.5 shrink-0 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* 2. KHU VỰC NỘI DUNG CHÍNH: TIÊU ĐỀ, BỘ LỌC, BIỂU ĐỒ & BẢNG SỐ LIỆU */}
      <section className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Banner tiêu đề chỉ tiêu đang xem */}
        <div className="bg-[#14171f] border border-white/8 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {currentRecord.meta.group}
              </span>
              <span className="text-xs text-[#8B98A5]">Đơn vị: {currentRecord.meta.unit}</span>
              {currentRecord.meta.latestPeriod && (
                <span className="text-[11px] text-[#8B98A5] bg-white/5 px-2 py-0.5 rounded">
                  Kỳ gần nhất: <strong className="text-[#F0F3F6]">{currentRecord.meta.latestPeriod}</strong>
                </span>
              )}
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-[#F0F3F6] tracking-tight">
              {currentRecord.meta.name.toUpperCase()}
            </h1>
            <p className="text-xs text-[#8B98A5] line-clamp-1">{currentRecord.meta.description}</p>
          </div>

          {/* Công cụ thao tác bên phải */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => setShowChart(!showChart)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-[#F0F3F6] transition-colors"
            >
              {showChart ? <EyeOff className="size-3.5 text-amber-400" /> : <Eye className="size-3.5 text-emerald-400" />}
              <span>{showChart ? 'Ẩn đồ thị' : 'Hiện đồ thị'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-400 transition-colors shadow-xs"
            >
              <Download className="size-3.5" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Thanh Điều khiển Bộ lọc: Khung thời gian & Kiểu giá trị */}
        <div className="bg-[#14171f] border border-white/8 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
          {/* Bộ chọn khung thời gian (Quarterly, Monthly, Yearly) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8B98A5] flex items-center gap-1">
              <Calendar className="size-3.5 text-emerald-400" />
              <span>Khung thời gian:</span>
            </span>
            <div className="flex items-center gap-1 bg-[#0e1117] p-0.5 rounded-lg border border-white/8">
              {currentRecord.meta.supportedTimeFrames.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeFrame(tf)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                    timeFrame === tf
                      ? 'bg-emerald-500 text-white shadow-xs font-semibold'
                      : 'text-[#8B98A5] hover:text-[#F0F3F6]'
                  )}
                >
                  {TIMEFRAME_LABELS[tf] || tf}
                </button>
              ))}
            </div>
          </div>

          {/* Bộ chọn kiểu giá trị (Value, QoQ, YoY) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8B98A5] flex items-center gap-1">
              <Filter className="size-3.5 text-emerald-400" />
              <span>Kiểu giá trị:</span>
            </span>
            <div className="flex items-center gap-1 bg-[#0e1117] p-0.5 rounded-lg border border-white/8">
              {currentRecord.meta.supportedValueTypes.map((vt) => (
                <button
                  key={vt}
                  onClick={() => setValueType(vt)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                    valueType === vt
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold'
                      : 'text-[#8B98A5] hover:text-[#F0F3F6]'
                  )}
                >
                  {VALUE_TYPE_LABELS[vt] || vt}
                </button>
              ))}
            </div>
          </div>

          {/* Ô lọc nhanh chỉ tiêu trong bảng */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-2 size-3.5 text-[#8B98A5]" />
            <input
              type="text"
              placeholder="Lọc chỉ tiêu trong bảng..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full bg-[#0e1117] border border-white/10 rounded-lg pl-8 pr-3 py-1 text-xs text-[#F0F3F6] placeholder-[#64748b] focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* 3. BIỂU ĐỒ DIỄN BIẾN LỊCH SỬ (RECHARTS) */}
        {showChart && chartData && chartData.points && chartData.points.length > 0 && (
          <div className="bg-[#14171f] border border-white/8 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-white/8 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400">
                  <BarChart3 className="size-3.5" />
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-[#F0F3F6]">
                  Biểu đồ: {chartData.metricName}
                </h3>
              </div>
              <span className="text-[11px] text-[#8B98A5]">
                {chartData.points.length} kỳ dữ liệu ({TIMEFRAME_LABELS[timeFrame] || timeFrame})
              </span>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.points} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="macroGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis
                    dataKey="period"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#ffffff15' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#ffffff15' }}
                    tickFormatter={(val) =>
                      new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(val)
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#14171f',
                      borderColor: '#ffffff20',
                      borderRadius: '8px',
                      color: '#F0F3F6',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [
                      formatMacroValue(Number(val), currentRecord.meta.unit),
                      chartData.metricName,
                    ]}
                    labelFormatter={(label) => `Kỳ: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#macroGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 4. BẢNG SỐ LIỆU CHUYÊN SÂU (DATA TABLE) */}
        <div className="bg-[#14171f] border border-white/8 rounded-xl overflow-hidden shadow-xs">
          <div className="p-3 border-b border-white/8 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#F0F3F6] uppercase tracking-wider">
                Bảng Số Liệu Chi Tiết ({currentRecord.meta.unit})
              </span>
            </div>
            <span className="text-[11px] text-[#8B98A5]">
              Cuộn ngang để xem đầy đủ các kỳ lịch sử 👉
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-[#0e1117] text-[#8B98A5]">
                  <th className="sticky left-0 z-20 bg-[#0e1117] px-4 py-3 text-left font-semibold min-w-[260px] border-r border-white/8">
                    Chỉ tiêu kinh tế
                  </th>
                  {headers.map((hdr) => (
                    <th
                      key={hdr}
                      className="px-3 py-3 text-right font-semibold whitespace-nowrap min-w-[100px]"
                    >
                      {formatPeriodLabel(hdr, timeFrame)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[#D1D5DB]">
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length + 1} className="px-4 py-8 text-center text-[#64748b]">
                      Không tìm thấy dữ liệu phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  tableRows.map((row) => {
                    if (row.isParentTitle) {
                      return (
                        <tr key={row.id} className="bg-white/[0.04] font-bold text-emerald-400">
                          <td
                            colSpan={headers.length + 1}
                            className="sticky left-0 z-10 px-4 py-2.5 text-left uppercase tracking-wider text-[11px]"
                          >
                            {row.name}
                          </td>
                        </tr>
                      );
                    }

                    const isSelected = selectedMetricId === row.id;

                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedMetricId(row.id)}
                        className={cn(
                          'transition-colors cursor-pointer group',
                          isSelected
                            ? 'bg-emerald-500/10 text-emerald-300 font-semibold'
                            : 'hover:bg-white/[0.03]'
                        )}
                      >
                        {/* Cột tên chỉ tiêu cố định (Sticky left) */}
                        <td
                          className={cn(
                            'sticky left-0 z-10 px-4 py-2.5 text-left border-r border-white/8 transition-colors',
                            isSelected
                              ? 'bg-[#182622] text-emerald-300 font-medium'
                              : 'bg-[#14171f] group-hover:bg-[#191d27] text-[#F0F3F6]'
                          )}
                          style={{ paddingLeft: `${Math.max(16, (row.level || 1) * 16)}px` }}
                        >
                          <div className="flex items-center gap-1.5">
                            {row.level > 1 && <span className="text-[#64748b]">└─</span>}
                            <span className="truncate">{row.name}</span>
                          </div>
                        </td>

                        {/* Các cột số liệu theo từng kỳ */}
                        {headers.map((_, colIdx) => {
                          const point = row.data?.[colIdx];
                          const val = point ? point[1] : null;
                          return (
                            <td
                              key={colIdx}
                              className={cn(
                                'px-3 py-2.5 text-right font-mono whitespace-nowrap',
                                val !== null && val < 0 && 'text-rose-400 font-semibold'
                              )}
                            >
                              {val !== null ? formatMacroValue(val) : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
