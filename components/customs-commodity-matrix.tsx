'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import {
  AreaChart,
  Area,
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
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtInt, fmtNum } from '@/lib/format'
import { getStocksForCustomsCommodity } from '@/lib/tier-a-stocks'
import { TradeBalanceChart, type TradeBalancePoint } from './TradeBalanceChart'

export type CustomsTradeRow = {
  period_type: 'KY_1' | 'KY_2' | 'THANG' | 'QUY'
  period_date: string // ISO YYYY-MM-DD
  trade_type: 'EXPORT' | 'IMPORT'
  status?: string
  dim_kind?: string
  name: string
  unit?: string | null
  quantity?: number | null
  value_usd?: number | null
  quantity_acc?: number | null
  value_acc?: number | null
  code?: string | null
  category?: string | null
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
type ValueDisplayType = 'value' | 'quantity' | 'mom' | 'yoy'
type ChartType = 'line' | 'bar'
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
  exportYoY: number | null
  importYoY: number | null
  balanceYoY: number | null
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
  initialSearch = '',
  onSwitchToTierA,
}: {
  rows: CustomsTradeRow[]
  tradeBalanceData?: TradeBalancePoint[]
  initialSearch?: string
  onSwitchToTierA?: () => void
}) {
  // Bộ lọc chính
  const [tradeType, setTradeType] = useState<TradeType>('EXPORT')
  const [periodType, setPeriodType] = useState<PeriodType>('THANG')
  const [datasetCategory, setDatasetCategory] = useState<DatasetCategory>('main')
  const [valueType, setValueType] = useState<ValueDisplayType>('value')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [search, setSearch] = useState<string>(initialSearch)

  // Cập nhật khi initialSearch thay đổi từ bên ngoài (ví dụ bấm từ Tier A card)
  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch)
    }
  }, [initialSearch])

  const [chartView, setChartView] = useState<ChartView>('commodity')
  const [chartType, setChartType] = useState<ChartType>('line')
  const [chartRange, setChartRange] = useState<string>('3y')
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

      // Loại bỏ tháng chưa trọn vẹn (tháng 8/2026 hiện mới chỉ có 15 ngày Kỳ 1) khi xem ở khung Tháng hoặc Quý
      if ((periodType === 'THANG' || periodType === 'QUY') && r.period_date.startsWith('2026-08')) {
        return false
      }

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
        let label = `${m}-${y}`
        let shortLabel = `${m}/${y}`
        let fullLabel = `Tháng ${m}/${y}`

        if (r.period_type === 'KY_1') {
          label = `${m}-${y} (K1)`
          shortLabel = `${m}/${y}-K1`
          fullLabel = `Kỳ 1 Tháng ${m}/${y}`
        } else if (r.period_type === 'KY_2') {
          label = `${m}-${y} (K2)`
          shortLabel = `${m}/${y}-K2`
          fullLabel = `Kỳ 2 Tháng ${m}/${y}`
        } else if (r.period_type === 'QUY') {
          const q = Math.floor((Number(m) - 1) / 3) + 1
          label = `Q${q}-${y}`
          shortLabel = `Q${q}/${y}`
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
          exportYoY: null,
          importYoY: null,
          balanceYoY: null,
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

        // Tính YoY (cùng kỳ năm trước)
        const yoyOffset = periodType === 'THANG' ? 12 : periodType === 'QUY' ? 4 : 24
        const yoyKey = i >= yoyOffset ? periodColumns[i - yoyOffset].key : null
        const yoyCell = yoyKey ? item.values[yoyKey] : null

        curCell.exportYoY = calcPctChange(curCell.exportValue, yoyCell?.exportValue)
        curCell.importYoY = calcPctChange(curCell.importValue, yoyCell?.importValue)
        curCell.balanceYoY = calcPctChange(curCell.balanceValue, yoyCell?.balanceValue)


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

  // Danh sách các năm có trong dữ liệu (sắp xếp giảm dần)
  const availableYears = useMemo(() => {
    const yrs = new Set<string>()
    for (const c of periodColumns) {
      const y = c.date.slice(0, 4)
      if (y) yrs.add(y)
    }
    return Array.from(yrs).sort().reverse()
  }, [periodColumns])

  // Chuẩn bị dữ liệu cho biểu đồ Recharts (lọc theo chartRange)
  const chartData = useMemo(() => {
    if (periodColumns.length === 0) return []

    // Lọc các cột thời gian theo khung chọn
    let targetCols = periodColumns
    if (chartRange === 'ytd') {
      const maxYear = periodColumns.length > 0 ? periodColumns[periodColumns.length - 1].date.slice(0, 4) : '2026'
      targetCols = periodColumns.filter((c) => c.date.startsWith(maxYear))
      if (targetCols.length === 0) targetCols = periodColumns.slice(-12)
    } else if (chartRange === '3m') {
      targetCols = periodColumns.slice(-3)
    } else if (chartRange === '6m') {
      targetCols = periodColumns.slice(-6)
    } else if (chartRange === '1y' || chartRange === 'recent12') {
      targetCols = periodColumns.slice(-12)
    } else if (chartRange === '2y') {
      targetCols = periodColumns.slice(-24)
    } else if (chartRange === '3y') {
      targetCols = periodColumns.slice(-36)
    } else if (chartRange === '5y') {
      targetCols = periodColumns.slice(-60)
    } else if (chartRange !== 'all') {
      targetCols = periodColumns.filter((c) => c.date.startsWith(chartRange))
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
                    <span className="size-2 rounded-full bg-primary animate-pulse" />
                    <h3 className="text-sm font-semibold text-foreground sm:text-base">
                      {selectedCommodities.length === 0
                        ? `Biểu đồ ${tradeType === 'EXPORT' ? 'Xuất khẩu' : tradeType === 'IMPORT' ? 'Nhập khẩu' : 'Cán cân'} theo Mặt hàng`
                        : selectedCommodities.length === 1
                          ? `[VN] - ${tradeType === 'EXPORT' ? 'Xuất khẩu' : tradeType === 'IMPORT' ? 'Nhập khẩu' : 'Cán cân'} ${selectedCommodities[0]}`
                          : `Biến động ${selectedCommodities.length} mặt hàng ${tradeType === 'EXPORT' ? 'Xuất khẩu' : tradeType === 'IMPORT' ? 'Nhập khẩu' : 'Cán cân'}`}
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ({chartMode === 'value' ? 'Trị giá Triệu USD' : '% Biến động'} · Khung {periodType === 'THANG' ? 'Tháng' : periodType === 'QUY' ? 'Quý' : 'Kỳ 15 ngày'})
                  </span>
                </div>

                {/* Điều khiển biểu đồ */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Chuyển đổi Dạng Cột / Dạng Đường */}
                  <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
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
                      <span>Đường</span>
                    </button>
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
                      <span>Cột</span>
                    </button>
                  </div>

                  {/* Nút chuyển Giá trị ($) / % Biến động */}
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
                      title="Trị giá tính bằng Triệu USD"
                    >
                      $ Trị giá
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
                      title="% Biến động"
                    >
                      %
                    </button>
                  </div>

                  {/* Lọc khung thời gian biểu đồ (Chuẩn WiData: 3Y, 1Y, 6M, YTD, 2Y, 5Y, Tất cả) */}
                  <div className="flex flex-wrap items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
                    {[
                      { key: '3y', label: '3Y' },
                      { key: '1y', label: '1Y' },
                      { key: '6m', label: '6M' },
                      { key: 'ytd', label: 'YTD' },
                      { key: '2y', label: '2Y' },
                      { key: '5y', label: '5Y' },
                      { key: 'all', label: 'Tất cả' },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setChartRange(opt.key)}
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
                    Top 5
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

              {/* Series Legend Pills */}
              {selectedCommodities.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  {selectedCommodities.map((name) => {
                    const color = commodityColorMap.get(name) ?? '#10b981'
                    return (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-2xs backdrop-blur"
                      >
                        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                        <span className="max-w-[160px] truncate sm:max-w-[240px]">{name}</span>
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
              )}

              {/* Vùng vẽ đồ thị Recharts (luôn hiện khung lưới, hiển thị overlay khi chưa tích chọn) */}
              {chartData.length > 0 && (
                <div className="relative h-68 w-full sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                      <BarChart data={chartData} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} vertical={false} />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          interval={chartData.length > 24 ? 'preserveEnd' : 0}
                          angle={chartData.length > 12 ? -30 : 0}
                          textAnchor={chartData.length > 12 ? 'end' : 'middle'}
                          height={chartData.length > 12 ? 38 : 24}
                          tick={{ fontSize: chartData.length > 20 ? 10 : 11 }}
                          dy={chartData.length > 12 ? 4 : 6}
                        />
                        <YAxis
                          tickFormatter={(v) => (chartMode === 'pct' ? `${v}%` : fmtInt(v))}
                          tickLine={false}
                          axisLine={false}
                          width={52}
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
                            maxBarSize={36}
                          />
                        ))}
                      </BarChart>
                    ) : selectedCommodities.length === 1 ? (
                      <AreaChart data={chartData} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                        <defs>
                          <linearGradient id="wiDataAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop
                              offset="5%"
                              stopColor={commodityColorMap.get(selectedCommodities[0]) ?? '#10b981'}
                              stopOpacity={0.32}
                            />
                            <stop
                              offset="95%"
                              stopColor={commodityColorMap.get(selectedCommodities[0]) ?? '#10b981'}
                              stopOpacity={0.0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} vertical={false} />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          interval={chartData.length > 24 ? 'preserveEnd' : 0}
                          angle={chartData.length > 12 ? -30 : 0}
                          textAnchor={chartData.length > 12 ? 'end' : 'middle'}
                          height={chartData.length > 12 ? 38 : 24}
                          tick={{ fontSize: chartData.length > 20 ? 10 : 11 }}
                          dy={chartData.length > 12 ? 4 : 6}
                        />
                        <YAxis
                          tickFormatter={(v) => (chartMode === 'pct' ? `${v}%` : fmtInt(v))}
                          tickLine={false}
                          axisLine={false}
                          width={52}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          content={<MatrixChartTooltip chartMode={chartMode} colorMap={commodityColorMap} />}
                          cursor={{ stroke: 'currentColor', strokeDasharray: '3 3', opacity: 0.3 }}
                        />
                        <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.25} />
                        <Area
                          type="monotone"
                          dataKey={selectedCommodities[0]}
                          name={selectedCommodities[0]}
                          stroke={commodityColorMap.get(selectedCommodities[0]) ?? '#10b981'}
                          strokeWidth={2.5}
                          fill="url(#wiDataAreaGrad)"
                          dot={{ r: 3, strokeWidth: 1.5, fill: commodityColorMap.get(selectedCommodities[0]) ?? '#10b981' }}
                          activeDot={{ r: 6, fill: commodityColorMap.get(selectedCommodities[0]) ?? '#10b981', stroke: '#fff', strokeWidth: 2 }}
                          connectNulls
                        />
                      </AreaChart>
                    ) : (
                      <LineChart data={chartData} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} vertical={false} />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          interval={chartData.length > 24 ? 'preserveEnd' : 0}
                          angle={chartData.length > 12 ? -30 : 0}
                          textAnchor={chartData.length > 12 ? 'end' : 'middle'}
                          height={chartData.length > 12 ? 38 : 24}
                          tick={{ fontSize: chartData.length > 20 ? 10 : 11 }}
                          dy={chartData.length > 12 ? 4 : 6}
                        />
                        <YAxis
                          tickFormatter={(v) => (chartMode === 'pct' ? `${v}%` : fmtInt(v))}
                          tickLine={false}
                          axisLine={false}
                          width={52}
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

                  {selectedCommodities.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className="rounded-xl border border-dashed border-border/80 bg-background/90 px-4 py-3 text-center shadow-xs backdrop-blur-xs">
                        <BarChart2 className="size-6 mx-auto text-primary/70 mb-1.5" />
                        <p className="text-xs font-semibold text-foreground">Chưa có mặt hàng nào được chọn</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Tích vào ô kiểm bên trái từng mặt hàng dưới bảng hoặc bấm nút <b className="text-primary font-medium">Top 5</b> để vẽ đồ thị
                        </p>
                      </div>
                    </div>
                  )}
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

            {/* Kiểu giá trị: Trị giá / Lượng / MoM% / YoY% */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Kiểu giá trị:</span>
              <select
                value={valueType}
                onChange={(e) => setValueType(e.target.value as ValueDisplayType)}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground outline-none focus:border-ring"
              >
                <option value="value">Value (Triệu USD)</option>
                <option value="mom">Tăng trưởng MoM (%)</option>
                <option value="yoy">Tăng trưởng cùng kỳ YoY (%)</option>
                <option value="quantity">Lượng (ĐVT)</option>
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
              onClick={() => {
                if (!isChartVisible) {
                  setIsChartVisible(true)
                  if (chartView === 'commodity' && selectedCommodities.length === 0) {
                    selectTop5()
                  }
                } else if (chartView === 'commodity' && selectedCommodities.length === 0) {
                  selectTop5()
                } else {
                  setIsChartVisible(false)
                }
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
            >
              {isChartVisible && (chartView === 'balance' || selectedCommodities.length > 0) ? (
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
      <div className="overflow-hidden rounded-xl border border-white/8 bg-[#212631] shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/8 bg-[#1a1d26] text-[#9EACB9]">
                <th className="sticky left-0 z-20 w-10 bg-[#1a1d26] px-2 py-3 text-center font-medium backdrop-blur">
                  #
                </th>
                <th className="sticky left-10 z-20 min-w-[200px] max-w-[260px] bg-[#1a1d26] px-3 py-3 text-left font-semibold uppercase tracking-wider text-[#F0F3F6] backdrop-blur sm:min-w-[240px]">
                  Mặt hàng
                </th>
                <th className="min-w-[70px] px-2.5 py-3 text-left font-medium uppercase tracking-wider text-[#9EACB9]">
                  ĐVT
                </th>
                {displayColumns.map((col) => (
                  <th
                    key={col.key}
                    className="min-w-[105px] px-3 py-3 text-right font-mono font-semibold uppercase tracking-wider text-[#F0F3F6]"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredRows.length > 0 && valueType === 'value' && (
                <tr className="border-b border-white/8 bg-emerald-500/5 font-semibold">
                  <td className="sticky left-0 z-10 bg-[#1e2330] px-2 py-2.5 text-center text-emerald-400">
                    ∑
                  </td>
                  <td className="sticky left-10 z-10 bg-[#1e2330] px-3 py-2.5 text-emerald-400">
                    TỔNG CỘNG ({filteredRows.length} mặt hàng)
                  </td>
                  <td className="px-2.5 py-2.5 text-[#9EACB9]">Triệu USD</td>
                  {displayColumns.map((col) => {
                    const tot = columnTotals[col.key]?.value ?? 0
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'px-3 py-2.5 text-right font-mono tabular-nums font-bold',
                          tradeType === 'BALANCE'
                            ? tot >= 0
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                            : 'text-[#F0F3F6]',
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
                    className="px-4 py-12 text-center text-sm text-[#9EACB9]"
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
                        'group cursor-pointer border-b border-white/5 transition-colors',
                        isSelected
                          ? 'bg-primary/15 hover:bg-primary/20 border-l-2 border-l-primary font-medium'
                          : 'hover:bg-white/[0.04]',
                      )}
                    >
                      <td
                        className={cn(
                          'sticky left-0 z-10 px-2.5 py-2.5 text-center cursor-pointer transition-colors',
                          isSelected ? 'bg-[#1e2330]' : 'bg-card group-hover:bg-accent/40',
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleCommodity(row.name)
                        }}
                      >
                        <div className="flex items-center justify-center pointer-events-none">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            tabIndex={-1}
                            className="size-4 rounded border-border text-primary transition-all"
                            style={isSelected && seriesColor ? { accentColor: seriesColor } : undefined}
                            title={isSelected ? 'Bỏ chọn khỏi biểu đồ' : 'Tích chọn để vẽ biểu đồ mặt hàng này'}
                          />
                        </div>
                      </td>

                      <td
                        className={cn(
                          'sticky left-10 z-10 px-3 py-2.5 font-medium transition-colors',
                          isSelected
                            ? 'bg-[#1e2330] text-foreground font-semibold'
                            : 'bg-card group-hover:bg-accent/40 text-foreground',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: seriesColor }}
                            />
                          )}
                          <span className="truncate">{row.name}</span>
                          {(() => {
                            const matched = getStocksForCustomsCommodity(row.name)
                            if (matched.length === 0) return null
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onSwitchToTierA?.()
                                }}
                                className="ml-1 inline-flex shrink-0 items-center gap-0.5 rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/20"
                                title={`Có ${matched.length} mã niêm yết Tier A liên quan: ${matched.map((s) => s.ticker).join(', ')}. Bấm để xem phân loại.`}
                              >
                                <Building2 className="size-2.5" />
                                <span>{matched.length} mã CP</span>
                              </button>
                            )
                          })()}
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

  if (valueType === 'yoy') {
    const yoy =
      tradeType === 'EXPORT'
        ? cell.exportYoY
        : tradeType === 'IMPORT'
          ? cell.importYoY
          : cell.balanceYoY

    if (yoy == null) return <span className="text-muted-foreground/50">—</span>

    const isUp = yoy >= 0
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
        {yoy.toFixed(1)}%
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
