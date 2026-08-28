'use client'

import { useMemo, useState, useCallback } from 'react'
import {
  BarChart,
  Bar,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Search,
  Download,
  Eye,
  EyeOff,
  Plus,
  Check,
  X,
  Sparkles,
  BarChart2,
  TrendingUp,
  Scale,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtInt, fmtNum } from '@/lib/format'
import { TradeBalanceChart, type TradeBalancePoint } from './TradeBalanceChart'

export type CustomsTradeRow = {
  period_type: 'KY_1' | 'KY_2' | 'THANG' | 'QUY'
  period_date: string // ISO YYYY-MM-DD
  trade_type: 'EXPORT' | 'IMPORT'
  status: 'SO_BO' | 'CHINH_THUC'
  dim_kind: string
  name: string
  unit: string | null
  quantity: number | null
  value_usd: number | null
  quantity_acc: number | null
  value_acc: number | null
  code: string | null
  category: string | null
  dataset_category?: string
}

// Bảng màu 12 màu nổi bật cho các đường/cột biểu đồ đa chuỗi
const PALETTE = [
  '#10b981', // Emerald
  '#0ea5e9', // Sky
  '#f43f5e', // Rose
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#84cc16', // Lime
  '#06b6d4', // Cyan
  '#d946ef', // Fuchsia
]

type TradeType = 'EXPORT' | 'IMPORT' | 'BALANCE'
type PeriodType = 'THANG' | 'KY' | 'QUY'
type ValueDisplayType = 'value' | 'quantity' | 'mom'
type ChartType = 'bar' | 'line'
type ChartMode = 'value' | 'pct'
type DatasetCategory = 'main' | 'fdi' | 'ALL'
type ChartView = 'commodity' | 'balance'

interface PivotCell {
  exportValue: number | null
  importValue: number | null
  balanceValue: number | null
  exportQty: number | null
  importQty: number | null
  unit: string | null
  exportMoM: number | null
  importMoM: number | null
  balanceMoM: number | null
}

interface CommodityRowData {
  name: string
  unit: string | null
  category: string | null
  code: string | null
  datasetCategory: string
  values: Record<string, PivotCell>
  latestValue: number
  totalValue: number
}

interface PeriodColumn {
  key: string
  date: string
  periodType: string
  label: string
  shortLabel: string
  fullLabel: string
}

function calcPctChange(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (current == null || previous == null || previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

export function CustomsCommodityMatrix({
  rows,
  tradeBalanceData = [],
}: {
  rows: CustomsTradeRow[]
  tradeBalanceData?: TradeBalancePoint[]
}) {
  // Bộ lọc chính
  const [tradeType, setTradeType] = useState<TradeType>('EXPORT')
  const [periodType, setPeriodType] = useState<PeriodType>('THANG')
  const [datasetCategory, setDatasetCategory] = useState<DatasetCategory>('main')
  const [valueType, setValueType] = useState<ValueDisplayType>('value')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [search, setSearch] = useState<string>('')

  // Trạng thái biểu đồ DUY NHẤT (Chuyển đổi giữa Theo Mặt Hàng & Cán Cân)
  const [chartView, setChartView] = useState<ChartView>('commodity')
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [chartRange, setChartRange] = useState<'all' | 'recent12' | '2026' | '2025'>('all')
  const [isChartVisible, setIsChartVisible] = useState<boolean>(true)
  const [chartMode, setChartMode] = useState<ChartMode>('value')
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>([
    'Hàng dệt, may',
  ])

  // Phân trang bảng ma trận
  const [page, setPage] = useState<number>(1)
  const pageSize = 30

  // Danh mục nhóm ngành có trong dữ liệu
  const categoryOptions = useMemo(() => {
    const cats = new Set<string>()
    for (const r of rows) {
      if (r.category) cats.add(r.category)
    }
    return Array.from(cats).sort()
  }, [rows])

  // Lọc raw rows theo Khung thời gian & Phân loại dữ liệu
  const relevantRows = useMemo(() => {
    return rows.filter((r) => {
      // Khung thời gian
      if (periodType === 'THANG' && r.period_type !== 'THANG') return false
      if (periodType === 'KY' && r.period_type !== 'KY_1' && r.period_type !== 'KY_2') return false
      if (periodType === 'QUY' && r.period_type !== 'QUY') return false

      // Phân loại FDI/Main
      if (datasetCategory !== 'ALL' && (r.dataset_category ?? 'main') !== datasetCategory) return false

      // Chỉ lấy cấp mặt hàng (dim_kind == 'commodity' hoặc null)
      if (r.dim_kind && r.dim_kind !== 'commodity') return false

      return true
    })
  }, [rows, periodType, datasetCategory])

  // Danh sách các mốc thời gian (cột), sắp xếp theo thời gian tăng dần
  const periodColumns = useMemo(() => {
    const periodMap = new Map<string, PeriodColumn>()

    for (const r of relevantRows) {
      const key = `${r.period_date}|${r.period_type}`
      if (!periodMap.has(key)) {
        const [y, m] = r.period_date.split('-')
        const yShort = y.slice(2)
        let label = `${m}-${y}`
        let shortLabel = `${m}/${yShort}`
        let fullLabel = `Tháng ${m}/${y}`

        if (r.period_type === 'KY_1') {
          label = `${m}-${y} (K1)`
          shortLabel = `${m}/${yShort}-K1`
          fullLabel = `Kỳ 1 Tháng ${m}/${y}`
        } else if (r.period_type === 'KY_2') {
          label = `${m}-${y} (K2)`
          shortLabel = `${m}/${yShort}-K2`
          fullLabel = `Kỳ 2 Tháng ${m}/${y}`
        } else if (r.period_type === 'QUY') {
          const q = Math.floor((Number(m) - 1) / 3) + 1
          label = `Q${q}-${y}`
          shortLabel = `Q${q}/${yShort}`
          fullLabel = `Quý ${q}/${y}`
        }

        periodMap.set(key, {
          key,
          date: r.period_date,
          periodType: r.period_type,
          label,
          shortLabel,
          fullLabel,
        })
      }
    }

    // Sort theo date và period_type
    const rank: Record<string, number> = { KY_1: 1, KY_2: 2, THANG: 3, QUY: 4 }
    return Array.from(periodMap.values()).sort((a, b) => {
      const d = a.date.localeCompare(b.date)
      if (d !== 0) return d
      return (rank[a.periodType] ?? 0) - (rank[b.periodType] ?? 0)
    })
  }, [relevantRows])

  // Danh sách cột hiển thị trên bảng (Đảo ngược để tháng mới nhất nằm bên trái)
  const displayColumns = useMemo(() => {
    return [...periodColumns].reverse()
  }, [periodColumns])

  // Pivot dữ liệu: Map từng Mặt hàng -> Dữ liệu theo từng kỳ
  const pivotData = useMemo(() => {
    const map = new Map<string, CommodityRowData>()

    for (const r of relevantRows) {
      const name = r.name?.trim()
      if (!name) continue

      let item = map.get(name)
      if (!item) {
        item = {
          name,
          unit: r.unit ?? null,
          category: r.category ?? null,
          code: r.code ?? null,
          datasetCategory: r.dataset_category ?? 'main',
          values: {},
          latestValue: 0,
          totalValue: 0,
        }
        map.set(name, item)
      } else {
        if (!item.unit && r.unit) item.unit = r.unit
        if (!item.category && r.category) item.category = r.category
      }

      const pKey = `${r.period_date}|${r.period_type}`
      if (!item.values[pKey]) {
        item.values[pKey] = {
          exportValue: null,
          importValue: null,
          balanceValue: null,
          exportQty: null,
          importQty: null,
          unit: r.unit ?? null,
          exportMoM: null,
          importMoM: null,
          balanceMoM: null,
        }
      }

      const cell = item.values[pKey]
      const isMain = (r.dataset_category ?? 'main') === 'main'

      if (r.trade_type === 'EXPORT') {
        if (cell.exportValue == null || isMain) {
          cell.exportValue = r.value_usd ?? null
          cell.exportQty = r.quantity ?? null
        }
      } else if (r.trade_type === 'IMPORT') {
        if (cell.importValue == null || isMain) {
          cell.importValue = r.value_usd ?? null
          cell.importQty = r.quantity ?? null
        }
      }

      // Tính cán cân
      const exp = cell.exportValue ?? 0
      const imp = cell.importValue ?? 0
      if (cell.exportValue != null || cell.importValue != null) {
        cell.balanceValue = exp - imp
      }
    }

    // Tính MoM % theo chuỗi thời gian tăng dần
    for (const item of map.values()) {
      let latestVal = 0
      let totalVal = 0

      for (let i = 0; i < periodColumns.length; i++) {
        const curKey = periodColumns[i].key
        const curCell = item.values[curKey]
        if (!curCell) continue

        const prevKey = i > 0 ? periodColumns[i - 1].key : null
        const prevCell = prevKey ? item.values[prevKey] : null

        curCell.exportMoM = calcPctChange(curCell.exportValue, prevCell?.exportValue)
        curCell.importMoM = calcPctChange(curCell.importValue, prevCell?.importValue)
        curCell.balanceMoM = calcPctChange(curCell.balanceValue, prevCell?.balanceValue)

        const val =
          tradeType === 'EXPORT'
            ? curCell.exportValue
            : tradeType === 'IMPORT'
              ? curCell.importValue
              : curCell.balanceValue

        if (val != null) {
          totalVal += Math.abs(val)
          latestVal = val
        }
      }

      item.latestValue = latestVal
      item.totalValue = totalVal
    }

    return Array.from(map.values())
  }, [relevantRows, periodColumns, tradeType])

  // Lọc theo tìm kiếm & danh mục
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return pivotData.filter((r) => {
      if (selectedCategory !== 'ALL' && r.category !== selectedCategory) return false
      if (q && !r.name.toLowerCase().includes(q)) return false
      return true
    }).sort((a, b) => Math.abs(b.latestValue) - Math.abs(a.latestValue))
  }, [pivotData, search, selectedCategory])

  // Tổng cộng toàn bộ mặt hàng theo từng cột thời gian
  const columnTotals = useMemo(() => {
    const totals: Record<string, { value: number; count: number }> = {}
    for (const col of periodColumns) {
      totals[col.key] = { value: 0, count: 0 }
    }

    for (const row of filteredRows) {
      for (const col of periodColumns) {
        const cell = row.values[col.key]
        if (!cell) continue
        const val =
          tradeType === 'EXPORT'
            ? cell.exportValue
            : tradeType === 'IMPORT'
              ? cell.importValue
              : cell.balanceValue
        if (val != null) {
          totals[col.key].value += val
          totals[col.key].count += 1
        }
      }
    }
    return totals
  }, [filteredRows, periodColumns, tradeType])

  // Màu sắc gán cho từng mặt hàng đang chọn
  const commodityColorMap = useMemo(() => {
    const map = new Map<string, string>()
    selectedCommodities.forEach((name, idx) => {
      map.set(name, PALETTE[idx % PALETTE.length])
    })
    return map
  }, [selectedCommodities])

  // Chuẩn bị dữ liệu cho biểu đồ Recharts (lọc theo chartRange)
  const chartData = useMemo(() => {
    if (periodColumns.length === 0) return []

    // Lọc các cột thời gian theo khung chọn
    let targetCols = periodColumns
    if (chartRange === 'recent12') {
      targetCols = periodColumns.slice(-12)
    } else if (chartRange === '2026') {
      targetCols = periodColumns.filter((c) => c.date.startsWith('2026'))
    } else if (chartRange === '2025') {
      targetCols = periodColumns.filter((c) => c.date.startsWith('2025'))
    }

    if (targetCols.length === 0) return []

    const baseValues: Record<string, number | null> = {}
    if (chartMode === 'pct') {
      for (const name of selectedCommodities) {
        const row = pivotData.find((r) => r.name === name)
        if (row) {
          for (const col of targetCols) {
            const cell = row.values[col.key]
            const val =
              tradeType === 'EXPORT'
                ? cell?.exportValue
                : tradeType === 'IMPORT'
                  ? cell?.importValue
                  : cell?.balanceValue
            if (val != null && val !== 0) {
              baseValues[name] = val
              break
            }
          }
        }
      }
    }

    return targetCols.map((col) => {
      const pt: Record<string, any> = {
        key: col.key,
        label: col.shortLabel ?? col.label,
        fullLabel: col.fullLabel,
        date: col.date,
      }

      for (const name of selectedCommodities) {
        const row = pivotData.find((r) => r.name === name)
        const cell = row?.values[col.key]
        const rawVal =
          tradeType === 'EXPORT'
            ? cell?.exportValue
            : tradeType === 'IMPORT'
              ? cell?.importValue
              : cell?.balanceValue

        if (rawVal != null) {
          if (chartMode === 'pct') {
            const base = baseValues[name]
            if (base && base !== 0) {
              pt[name] = Number((((rawVal - base) / Math.abs(base)) * 100).toFixed(1))
            } else {
              pt[name] = 0
            }
          } else {
            pt[name] = Number((rawVal / 1e6).toFixed(1))
          }
        } else {
          pt[name] = null
        }
      }

      return pt
    })
  }, [periodColumns, selectedCommodities, pivotData, tradeType, chartMode, chartRange])

  // Bật/tắt chọn mặt hàng vào biểu đồ -> tự động bật biểu đồ mặt hàng
  const toggleCommodity = useCallback((name: string) => {
    setChartView('commodity')
    setIsChartVisible(true)
    setSelectedCommodities((prev) => {
      if (prev.includes(name)) {
        return prev.filter((item) => item !== name)
      } else {
        if (prev.length >= 10) {
          return [...prev.slice(1), name]
        }
        return [...prev, name]
      }
    })
  }, [])

  // Nút chọn Top 5 mặt hàng lớn nhất
  const selectTop5 = useCallback(() => {
    setChartView('commodity')
    setIsChartVisible(true)
    const top5 = filteredRows.slice(0, 5).map((r) => r.name)
    setSelectedCommodities(top5)
  }, [filteredRows])

  // Nút bỏ chọn tất cả
  const clearAllSelected = useCallback(() => {
    setSelectedCommodities([])
  }, [])

  // Xuất file CSV
  const exportToCsv = useCallback(() => {
    if (filteredRows.length === 0) return

    const typeTitle =
      tradeType === 'EXPORT'
        ? 'XUAT_KHAU'
        : tradeType === 'IMPORT'
          ? 'NHAP_KHAU'
          : 'CAN_CAN'

    const headers = ['Mặt hàng', 'ĐVT', 'Nhóm ngành', ...displayColumns.map((c) => c.label)]
    const rowsCsv = filteredRows.map((r) => {
      const rowCells = [
        `"${r.name.replace(/"/g, '""')}"`,
        `"${(r.unit ?? '').replace(/"/g, '""')}"`,
        `"${(r.category ?? '').replace(/"/g, '""')}"`,
      ]

      for (const col of displayColumns) {
        const cell = r.values[col.key]
        if (!cell) {
          rowCells.push('')
          continue
        }

        if (valueType === 'value') {
          const val =
            tradeType === 'EXPORT'
              ? cell.exportValue
              : tradeType === 'IMPORT'
                ? cell.importValue
                : cell.balanceValue
          rowCells.push(val != null ? (val / 1e6).toFixed(2) : '')
        } else if (valueType === 'quantity') {
          const qty = tradeType === 'EXPORT' ? cell.exportQty : cell.importQty
          rowCells.push(qty != null ? String(qty) : '')
        } else if (valueType === 'mom') {
          const mom =
            tradeType === 'EXPORT'
              ? cell.exportMoM
              : tradeType === 'IMPORT'
                ? cell.importMoM
                : cell.balanceMoM
          rowCells.push(mom != null ? `${mom.toFixed(1)}%` : '')
        }
      }

      return rowCells.join(',')
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rowsCsv].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Thong_ke_${typeTitle}_theo_mat_hang_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [filteredRows, displayColumns, tradeType, valueType])

  // Phân trang
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page, pageSize])

  // Tiêu đề bảng hiện tại
  const tableTitle = useMemo(() => {
    const typeStr =
      tradeType === 'EXPORT'
        ? 'XUẤT KHẨU'
        : tradeType === 'IMPORT'
          ? 'NHẬP KHẨU'
          : 'CÁN CÂN THƯƠNG MẠI'
    const unitStr =
      valueType === 'value'
        ? '(TRIỆU USD)'
        : valueType === 'quantity'
          ? '(LƯỢNG)'
          : '(TĂNG TRƯỞNG MoM %)'
    return `${typeStr} THEO MẶT HÀNG ${unitStr}`
  }, [tradeType, valueType])

  return (
    <div className="space-y-4">
      {/* ── DUY NHẤT 1 BIỂU ĐỒ TẠI MỘT THỜI ĐIỂM (CÁN CÂN HOẶC THEO MẶT HÀNG) ── */}
      {isChartVisible && (
        <div>
          {/* Chuyển đổi giữa 2 chế độ biểu đồ */}
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1 text-xs">
              <button
                type="button"
                onClick={() => setChartView('commodity')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all',
                  chartView === 'commodity'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <BarChart2 className="size-3.5 text-primary" />
                <span>Biểu đồ So sánh theo Mặt hàng</span>
              </button>
              <button
                type="button"
                onClick={() => setChartView('balance')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all',
                  chartView === 'balance'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Scale className="size-3.5 text-amber-500" />
                <span>Cán cân thương mại Tổng thể</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsChartVisible(false)}
              className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <EyeOff className="size-3.5" />
              <span>Ẩn đồ thị</span>
            </button>
          </div>

          {/* CHẾ ĐỘ 1: BIỂU ĐỒ CÁN CÂN THƯƠNG MẠI (DẠNG CỘT SẠCH SẼ) */}
          {chartView === 'balance' && (
            <TradeBalanceChart data={tradeBalanceData} />
          )}

          {/* CHẾ ĐỘ 2: BIỂU ĐỒ SO SÁNH THEO MẶT HÀNG (DẠNG CỘT MẶC ĐỊNH) */}
          {chartView === 'commodity' && (
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
              {/* Header biểu đồ mặt hàng */}
              <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="size-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground sm:text-base">
                      Biến động Mặt hàng Xuất Nhập Khẩu
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ({selectedCommodities.length} mặt hàng đang chọn ·{' '}
                    {chartMode === 'value' ? 'Trị giá Triệu USD' : '% Biến động'})
                  </span>
                </div>

                {/* Điều khiển biểu đồ */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Chuyển đổi Dạng Cột / Dạng Đường */}
                  <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setChartType('bar')}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors',
                        chartType === 'bar'
                          ? 'bg-background text-foreground shadow-xs font-semibold'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <BarChart2 className="size-3" />
                      <span>Dạng Cột</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartType('line')}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors',
                        chartType === 'line'
                          ? 'bg-background text-foreground shadow-xs font-semibold'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <TrendingUp className="size-3" />
                      <span>Dạng Đường</span>
                    </button>
                  </div>

                  {/* Nút chuyển Giá trị / % Biến động */}
                  <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setChartMode('value')}
                      className={cn(
                        'rounded-md px-2.5 py-1 font-medium transition-colors',
                        chartMode === 'value'
                          ? 'bg-background text-foreground shadow-xs font-semibold'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Trị giá (Triệu USD)
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMode('pct')}
                      className={cn(
                        'rounded-md px-2.5 py-1 font-medium transition-colors',
                        chartMode === 'pct'
                          ? 'bg-background text-foreground shadow-xs font-semibold'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      % Biến động
                    </button>
                  </div>

                  {/* Lọc khung thời gian biểu đồ */}
                  <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
                    {[
                      { key: 'all', label: 'Tất cả' },
                      { key: 'recent12', label: '12 kỳ gần nhất' },
                      { key: '2026', label: 'Năm 2026' },
                      { key: '2025', label: 'Năm 2025' },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setChartRange(opt.key as typeof chartRange)}
                        className={cn(
                          'rounded-md px-2 py-1 font-medium transition-colors',
                          chartRange === opt.key
                            ? 'bg-background text-foreground shadow-xs font-semibold'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={selectTop5}
                    className="h-7.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Top 5 lớn nhất
                  </button>

                  {selectedCommodities.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllSelected}
                      className="h-7.5 rounded-lg border border-border bg-background px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-rose-500"
                    >
                      Bỏ chọn
                    </button>
                  )}
                </div>
              </div>

              {/* Series Pills */}
              {selectedCommodities.length > 0 ? (
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  {selectedCommodities.map((name) => {
                    const color = commodityColorMap.get(name) ?? '#10b981'
                    return (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-2xs backdrop-blur"
                      >
                        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                        <span className="max-w-[150px] truncate sm:max-w-[220px]">{name}</span>
                        <button
                          type="button"
                          onClick={() => toggleCommodity(name)}
                          className="ml-0.5 text-muted-foreground hover:text-foreground"
                          title="Bỏ khỏi đồ thị"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              ) : (
                <div className="mb-3 rounded-lg border border-dashed border-border bg-muted/20 p-3 text-center text-xs text-muted-foreground">
                  Chưa có mặt hàng nào được chọn. Nhấn vào dấu <span className="font-semibold text-primary">+</span> trên
                  bảng để thêm mặt hàng vào biểu đồ.
                </div>
              )}

              {/* Vùng vẽ đồ thị */}
              {selectedCommodities.length > 0 && chartData.length > 0 && (
                <div className="h-64 w-full sm:h-76">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                      <BarChart data={chartData} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} vertical={false} />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          interval={chartData.length > 24 ? 'preserveEnd' : 0}
                          angle={chartData.length > 10 ? -30 : 0}
                          textAnchor={chartData.length > 10 ? 'end' : 'middle'}
                          height={chartData.length > 10 ? 38 : 24}
                          tick={{ fontSize: chartData.length > 20 ? 10 : 11 }}
                          dy={chartData.length > 10 ? 4 : 6}
                        />
                        <YAxis
                          tickFormatter={(v) => (chartMode === 'pct' ? `${v}%` : fmtInt(v))}
                          tickLine={false}
                          axisLine={false}
                          width={48}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          content={<MatrixChartTooltip chartMode={chartMode} colorMap={commodityColorMap} />}
                          cursor={{ fill: 'currentColor', opacity: 0.05 }}
                        />
                        <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.25} />
                        {selectedCommodities.map((name) => (
                          <Bar
                            key={name}
                            dataKey={name}
                            name={name}
                            fill={commodityColorMap.get(name) ?? '#10b981'}
                            radius={[3, 3, 0, 0]}
                            maxBarSize={40}
                          />
                        ))}
                      </BarChart>
                    ) : (
                      <LineChart data={chartData} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} vertical={false} />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          interval={chartData.length > 24 ? 'preserveEnd' : 0}
                          angle={chartData.length > 10 ? -30 : 0}
                          textAnchor={chartData.length > 10 ? 'end' : 'middle'}
                          height={chartData.length > 10 ? 38 : 24}
                          tick={{ fontSize: chartData.length > 20 ? 10 : 11 }}
                          dy={chartData.length > 10 ? 4 : 6}
                        />
                        <YAxis
                          tickFormatter={(v) => (chartMode === 'pct' ? `${v}%` : fmtInt(v))}
                          tickLine={false}
                          axisLine={false}
                          width={48}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          content={<MatrixChartTooltip chartMode={chartMode} colorMap={commodityColorMap} />}
                          cursor={{ stroke: 'currentColor', strokeDasharray: '3 3', opacity: 0.3 }}
                        />
                        <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.25} />
                        {selectedCommodities.map((name) => (
                          <Line
                            key={name}
                            type="monotone"
                            dataKey={name}
                            name={name}
                            stroke={commodityColorMap.get(name) ?? '#10b981'}
                            strokeWidth={2.2}
                            dot={{ r: 3, strokeWidth: 1.5 }}
                            activeDot={{ r: 5 }}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── THANH CÔNG CỤ BỘ LỌC (TOOLBAR) ─────────────────────────────────── */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          {/* Ô tìm kiếm */}
          <div className="flex min-w-[220px] flex-1 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Tìm kiếm mặt hàng…"
              className="h-9 w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Bộ điều khiển nhanh */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Loại giao dịch: Xuất khẩu / Nhập khẩu / Cán cân */}
            <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setTradeType('EXPORT')}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  tradeType === 'EXPORT'
                    ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Xuất khẩu
              </button>
              <button
                type="button"
                onClick={() => setTradeType('IMPORT')}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  tradeType === 'IMPORT'
                    ? 'bg-background text-rose-600 dark:text-rose-400 shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Nhập khẩu
              </button>
              <button
                type="button"
                onClick={() => setTradeType('BALANCE')}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  tradeType === 'BALANCE'
                    ? 'bg-background text-amber-600 dark:text-amber-400 shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Cán cân (XK-NK)
              </button>
            </div>

            {/* Khung thời gian: Tháng / Kỳ / Quý */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Khung:</span>
              <select
                value={periodType}
                onChange={(e) => {
                  setPeriodType(e.target.value as PeriodType)
                  setPage(1)
                }}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground outline-none focus:border-ring"
              >
                <option value="THANG">Monthly (Tháng)</option>
                <option value="KY">Kỳ 15 ngày</option>
                <option value="QUY">Quý (Quarterly)</option>
              </select>
            </div>

            {/* Kiểu giá trị: Trị giá / Lượng / MoM% */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Kiểu:</span>
              <select
                value={valueType}
                onChange={(e) => setValueType(e.target.value as ValueDisplayType)}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground outline-none focus:border-ring"
              >
                <option value="value">Trị giá (Triệu USD)</option>
                <option value="quantity">Lượng (ĐVT)</option>
                <option value="mom">Tăng trưởng MoM (%)</option>
              </select>
            </div>

            {/* Nhóm ngành */}
            {categoryOptions.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value)
                  setPage(1)
                }}
                className="h-8 max-w-[150px] truncate rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground outline-none focus:border-ring"
              >
                <option value="ALL">Tất cả nhóm ngành</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}

            {/* Phân loại FDI/Main */}
            <select
              value={datasetCategory}
              onChange={(e) => {
                setDatasetCategory(e.target.value as DatasetCategory)
                setPage(1)
              }}
              className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground outline-none focus:border-ring"
            >
              <option value="main">Tổng thể (Mặt hàng)</option>
              <option value="fdi">Khối FDI</option>
              <option value="ALL">Tất cả phân loại</option>
            </select>
          </div>
        </div>

        {/* Hàng 2: Tiêu đề + Nút Xuất Excel + Nút Ẩn/Hiện đồ thị */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
              {tableTitle}
            </span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {filteredRows.length} mặt hàng
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportToCsv}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <Download className="size-3.5 text-muted-foreground" />
              <span>Xuất Excel</span>
            </button>

            <button
              type="button"
              onClick={() => setIsChartVisible((v) => !v)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
            >
              {isChartVisible ? (
                <>
                  <EyeOff className="size-3.5 text-muted-foreground" />
                  <span>Ẩn đồ thị</span>
                </>
              ) : (
                <>
                  <Eye className="size-3.5 text-muted-foreground" />
                  <span>Hiện đồ thị</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── BẢNG MA TRẬN THEO THÁNG (PIVOT TABLE) ───────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/80 text-muted-foreground">
                <th className="sticky left-0 z-20 w-10 bg-secondary/95 px-2 py-3 text-center font-medium backdrop-blur">
                  #
                </th>
                <th className="sticky left-10 z-20 min-w-[200px] max-w-[260px] bg-secondary/95 px-3 py-3 text-left font-semibold uppercase tracking-wider text-foreground backdrop-blur sm:min-w-[240px]">
                  Mặt hàng
                </th>
                <th className="min-w-[70px] px-2.5 py-3 text-left font-medium uppercase tracking-wider">
                  ĐVT
                </th>
                {displayColumns.map((col) => (
                  <th
                    key={col.key}
                    className="min-w-[105px] px-3 py-3 text-right font-mono font-semibold uppercase tracking-wider text-foreground"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredRows.length > 0 && valueType === 'value' && (
                <tr className="border-b-2 border-border bg-primary/5 font-semibold">
                  <td className="sticky left-0 z-10 bg-card px-2 py-2.5 text-center text-primary">
                    ∑
                  </td>
                  <td className="sticky left-10 z-10 bg-card px-3 py-2.5 text-primary">
                    TỔNG CỘNG ({filteredRows.length} mặt hàng)
                  </td>
                  <td className="px-2.5 py-2.5 text-muted-foreground">Triệu USD</td>
                  {displayColumns.map((col) => {
                    const tot = columnTotals[col.key]?.value ?? 0
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'px-3 py-2.5 text-right font-mono tabular-nums font-bold',
                          tradeType === 'BALANCE'
                            ? tot >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                            : 'text-foreground',
                        )}
                      >
                        {fmtNum(tot / 1e6, 1)}
                      </td>
                    )
                  })}
                </tr>
              )}

              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={displayColumns.length + 3}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    Không tìm thấy mặt hàng nào khớp bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => {
                  const isSelected = selectedCommodities.includes(row.name)
                  const seriesColor = commodityColorMap.get(row.name)

                  return (
                    <tr
                      key={row.name}
                      onClick={() => toggleCommodity(row.name)}
                      className={cn(
                        'group cursor-pointer border-b border-border/70 transition-colors hover:bg-accent/40',
                        isSelected ? 'bg-primary/5 dark:bg-primary/10' : idx % 2 === 1 ? 'bg-muted/20' : '',
                      )}
                    >
                      <td
                        className="sticky left-0 z-10 bg-card group-hover:bg-accent/40 px-2 py-2.5 text-center transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleCommodity(row.name)
                        }}
                      >
                        <button
                          type="button"
                          className={cn(
                            'inline-flex size-5 items-center justify-center rounded border transition-all',
                            isSelected
                              ? 'border-transparent text-white shadow-xs'
                              : 'border-border text-muted-foreground hover:border-primary hover:text-primary',
                          )}
                          style={{
                            backgroundColor: isSelected ? seriesColor : 'transparent',
                          }}
                          title={isSelected ? 'Bỏ khỏi đồ thị' : 'Thêm vào đồ thị'}
                        >
                          {isSelected ? <Check className="size-3 stroke-[3]" /> : <Plus className="size-3" />}
                        </button>
                      </td>

                      <td className="sticky left-10 z-10 bg-card group-hover:bg-accent/40 px-3 py-2.5 font-medium text-foreground transition-colors">
                        <div className="flex items-center gap-1.5">
                          {isSelected && (
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: seriesColor }}
                            />
                          )}
                          <span className="truncate">{row.name}</span>
                        </div>
                      </td>

                      <td className="px-2.5 py-2.5 text-muted-foreground">
                        {row.unit ?? '—'}
                      </td>

                      {displayColumns.map((col) => {
                        const cell = row.values[col.key]
                        return (
                          <td
                            key={col.key}
                            className="px-3 py-2.5 text-right font-mono tabular-nums text-foreground"
                          >
                            <CellDisplay
                              cell={cell}
                              tradeType={tradeType}
                              valueType={valueType}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        {filteredRows.length > pageSize && (
          <div className="flex flex-col gap-2 border-t border-border bg-card px-4 py-2.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredRows.length)} trên{' '}
              {filteredRows.length} mặt hàng
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={cn(
                  'rounded-md border border-border px-2.5 py-1 font-medium transition-colors hover:text-foreground',
                  page === 1 && 'cursor-not-allowed opacity-40',
                )}
              >
                ← Trước
              </button>
              <span className="font-medium text-foreground">
                Trang {page}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={cn(
                  'rounded-md border border-border px-2.5 py-1 font-medium transition-colors hover:text-foreground',
                  page === totalPages && 'cursor-not-allowed opacity-40',
                )}
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CellDisplay({
  cell,
  tradeType,
  valueType,
}: {
  cell?: PivotCell
  tradeType: TradeType
  valueType: ValueDisplayType
}) {
  if (!cell) return <span className="text-muted-foreground/50">—</span>

  if (valueType === 'value') {
    const val =
      tradeType === 'EXPORT'
        ? cell.exportValue
        : tradeType === 'IMPORT'
          ? cell.importValue
          : cell.balanceValue

    if (val == null) return <span className="text-muted-foreground/50">—</span>

    const inMillions = val / 1e6
    const isNegative = inMillions < 0

    return (
      <span
        className={cn(
          tradeType === 'BALANCE' && isNegative && 'text-rose-600 dark:text-rose-400 font-medium',
          tradeType === 'BALANCE' && !isNegative && val > 0 && 'text-emerald-600 dark:text-emerald-400 font-medium',
        )}
      >
        {fmtNum(inMillions, 1)}
      </span>
    )
  }

  if (valueType === 'quantity') {
    const qty = tradeType === 'EXPORT' ? cell.exportQty : cell.importQty
    if (qty == null) return <span className="text-muted-foreground/50">—</span>
    return <span>{fmtInt(qty)}</span>
  }

  if (valueType === 'mom') {
    const mom =
      tradeType === 'EXPORT'
        ? cell.exportMoM
        : tradeType === 'IMPORT'
          ? cell.importMoM
          : cell.balanceMoM

    if (mom == null) return <span className="text-muted-foreground/50">—</span>

    const isUp = mom >= 0
    return (
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[11px] font-medium',
          isUp
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
        )}
      >
        {isUp ? '+' : ''}
        {mom.toFixed(1)}%
      </span>
    )
  }

  return null
}

function MatrixChartTooltip({
  active,
  payload,
  label,
  chartMode,
  colorMap,
}: {
  active?: boolean
  payload?: any[]
  label?: string
  chartMode: ChartMode
  colorMap: Map<string, string>
}) {
  if (!active || !payload || payload.length === 0) return null

  const fullLabel = payload[0]?.payload?.fullLabel ?? label

  return (
    <div className="min-w-[200px] rounded-lg border border-border bg-card/95 p-3 text-xs shadow-xl backdrop-blur">
      <p className="mb-2 font-semibold text-foreground border-b border-border/70 pb-1">
        {fullLabel}
      </p>
      <div className="space-y-1.5 max-h-56 overflow-y-auto">
        {payload.map((entry) => {
          if (entry.value == null) return null
          const color = colorMap.get(entry.name) ?? entry.color ?? entry.fill
          const formattedVal =
            chartMode === 'pct'
              ? `${entry.value >= 0 ? '+' : ''}${entry.value}%`
              : `${fmtNum(entry.value, 1)} triệu USD`

          return (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="max-w-[160px] truncate">{entry.name}</span>
              </span>
              <span className="font-mono font-medium tabular-nums text-foreground">
                {formattedVal}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
