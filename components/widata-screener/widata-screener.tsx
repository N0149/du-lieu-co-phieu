'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import type { ScreenerStockItem } from '@/lib/screener-data-service'
import { ScreenerTopBar } from './screener-top-bar'
import { ScreenerPresetSidebar } from './screener-preset-sidebar'
import { ScreenerCriteriaTree } from './screener-criteria-tree'
import { ScreenerConditionsBuilder } from './screener-conditions-builder'
import { ScreenerResultsTable } from './screener-results-table'
import {
  type ActiveCondition,
  type PresetFilter,
  type ScreenerCriterion,
  CRITERIA_MAP,
} from './screener-constants'

interface WiDataScreenerProps {
  initialStocks: ScreenerStockItem[]
}

const STORAGE_KEY = 'widata_screener_custom_presets'

export function WiDataScreener({ initialStocks }: WiDataScreenerProps) {
  // Toàn bộ dữ liệu cổ phiếu (1.530 mã)
  const [stocks, setStocks] = useState<ScreenerStockItem[]>(initialStocks || [])
  const [loading, setLoading] = useState(stocks.length === 0)

  // Trạng thái thanh Top Bar
  const [selectedExchange, setSelectedExchange] = useState<string>('')
  const [selectedSector, setSelectedSector] = useState<string>('')
  const [selectedTickers, setSelectedTickers] = useState<string[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true)

  // Trạng thái điều kiện lọc
  const [conditions, setConditions] = useState<ActiveCondition[]>([])
  const [activePresetId, setActivePresetId] = useState<string | null>(null)

  // Bộ lọc cá nhân lưu trong LocalStorage
  const [customPresets, setCustomPresets] = useState<PresetFilter[]>([])

  const tableRef = useRef<HTMLDivElement>(null)

  // Tải bộ lọc cá nhân từ LocalStorage khi khởi động
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setCustomPresets(JSON.parse(raw))
      }
    } catch {}
  }, [])

  // Nếu initialStocks rỗng, fetch từ API /api/screener/stocks
  useEffect(() => {
    if (stocks.length === 0) {
      setLoading(true)
      fetch('/api/screener/stocks')
        .then((r) => r.json())
        .then((d) => {
          if (d.success && Array.isArray(d.data)) {
            setStocks(d.data)
          }
        })
        .catch((err) => console.error('Lỗi tải dữ liệu cổ phiếu:', err))
        .finally(() => setLoading(false))
    }
  }, [stocks.length])

  // Danh sách các ID chỉ tiêu đang được kích hoạt
  const activeCriterionIds = useMemo(() => {
    return new Set(conditions.map((c) => c.criterionId))
  }, [conditions])

  // Toggle chỉ tiêu từ Cột cây chỉ tiêu (Cột 2)
  const handleToggleCriterion = useCallback(
    (criterion: ScreenerCriterion) => {
      setConditions((prev) => {
        const exists = prev.find((c) => c.criterionId === criterion.id)
        if (exists) {
          // Bỏ chọn chỉ tiêu
          return prev.filter((c) => c.criterionId !== criterion.id)
        } else {
          // Thêm chỉ tiêu với giá trị mặc định
          return [
            ...prev,
            {
              criterionId: criterion.id,
              operator: criterion.defaultValue.operator,
              value1: criterion.defaultValue.value1,
              value2: criterion.defaultValue.value2,
            },
          ]
        }
      })
      setActivePresetId(null)
    },
    [],
  )

  // Cập nhật giá trị hoặc toán tử của điều kiện
  const handleUpdateCondition = useCallback(
    (criterionId: string, updates: Partial<ActiveCondition>) => {
      setConditions((prev) =>
        prev.map((c) => (c.criterionId === criterionId ? { ...c, ...updates } : c)),
      )
      setActivePresetId(null)
    },
    [],
  )

  // Xóa một điều kiện
  const handleRemoveCondition = useCallback((criterionId: string) => {
    setConditions((prev) => prev.filter((c) => c.criterionId !== criterionId))
    setActivePresetId(null)
  }, [])

  // Đặt lại toàn bộ điều kiện
  const handleResetConditions = useCallback(() => {
    setConditions([])
    setSelectedExchange('')
    setSelectedSector('')
    setSelectedTickers([])
    setActivePresetId(null)
  }, [])

  // Chọn bộ lọc mẫu (Gợi ý, Cá nhân, Cộng đồng)
  const handleSelectPreset = useCallback((preset: PresetFilter) => {
    setConditions([...preset.conditions])
    if (preset.exchange != null) setSelectedExchange(preset.exchange)
    if (preset.sector != null) setSelectedSector(preset.sector)
    setActivePresetId(preset.id)
  }, [])

  // Lưu bộ lọc vào tab Cá nhân
  const handleSavePreset = useCallback(
    (name: string) => {
      const newPreset: PresetFilter = {
        id: `custom-${Date.now()}`,
        name,
        description: `Bộ lọc cá nhân gồm ${conditions.length} điều kiện tùy chỉnh`,
        category: 'ca_nhan',
        icon: '⭐',
        conditions: [...conditions],
        exchange: selectedExchange,
        sector: selectedSector,
      }

      setCustomPresets((prev) => {
        const next = [newPreset, ...prev]
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        } catch {}
        return next
      })

      setActivePresetId(newPreset.id)
    },
    [conditions, selectedExchange, selectedSector],
  )

  // Xóa bộ lọc cá nhân
  const handleDeleteCustomPreset = useCallback((id: string) => {
    setCustomPresets((prev) => {
      const next = prev.filter((p) => p.id !== id)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  // Cuộn tới bảng kết quả khi bấm Lọc dữ liệu
  const handleRunFilter = useCallback(() => {
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  // Chọn/bỏ chọn mã chứng khoán cụ thể
  const handleToggleTicker = useCallback((ticker: string) => {
    setSelectedTickers((prev) => {
      if (prev.includes(ticker)) return prev.filter((t) => t !== ticker)
      return [...prev, ticker]
    })
  }, [])

  // Bỏ chọn tất cả mã
  const handleClearTickers = useCallback(() => {
    setSelectedTickers([])
  }, [])

  // Thuật toán LỌC DỮ LIỆU trực tiếp trong bộ nhớ (Client-side fast in-memory filtering)
  const filteredStocks = useMemo(() => {
    return stocks.filter((stock) => {
      // 1. Lọc theo sàn
      if (selectedExchange && stock.exchange !== selectedExchange) {
        return false
      }

      // 2. Lọc theo ngành
      if (selectedSector) {
        const target = `${stock.sector} ${stock.icbL1} ${stock.icbL2}`.toLowerCase()
        if (!target.includes(selectedSector.toLowerCase())) {
          return false
        }
      }

      // 3. Lọc theo mã chỉ định
      if (selectedTickers.length > 0 && !selectedTickers.includes(stock.ticker)) {
        return false
      }

      // 4. Lọc theo từng điều kiện chỉ tiêu
      for (const cond of conditions) {
        const meta = CRITERIA_MAP.get(cond.criterionId)
        if (!meta) continue

        const val = meta.getter(stock)
        // Nếu cổ phiếu thiếu dữ liệu chỉ tiêu này -> không thỏa mãn
        if (val == null || isNaN(val)) {
          return false
        }

        switch (cond.operator) {
          case 'gt':
            if (val < cond.value1) return false
            break
          case 'lt':
            if (val > cond.value1) return false
            break
          case 'between': {
            const v2 = cond.value2 ?? cond.value1
            const minV = Math.min(cond.value1, v2)
            const maxV = Math.max(cond.value1, v2)
            if (val < minV || val > maxV) return false
            break
          }
          case 'eq':
            if (Math.abs(val - cond.value1) > 0.05) return false
            break
        }
      }

      return true
    })
  }, [stocks, selectedExchange, selectedSector, selectedTickers, conditions])

  const allTickerOptions = useMemo(() => {
    return stocks.map((s) => ({ ticker: s.ticker, name: s.name }))
  }, [stocks])

  return (
    <div className="flex min-h-screen flex-col bg-[#0f1218] text-foreground">
      {/* 1. TOP BAR: Lọc Sàn, Ngành, Mã CK, Bật/Tắt Sidebar */}
      <ScreenerTopBar
        selectedExchange={selectedExchange}
        onChangeExchange={setSelectedExchange}
        selectedSector={selectedSector}
        onChangeSector={setSelectedSector}
        selectedTickers={selectedTickers}
        onToggleTicker={handleToggleTicker}
        onClearTickers={handleClearTickers}
        allTickers={allTickerOptions}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        totalCount={filteredStocks.length}
      />

      {/* 2. MAIN 3-COLUMN WORKSPACE THEO MẪU WIDATA */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* CỘT 1: BỘ LỌC CÓ SẴN & CÁ NHÂN (Sidebar Trái) */}
        {isSidebarOpen && (
          <aside className="w-full shrink-0 border-b border-white/10 lg:w-56 lg:border-b-0 lg:border-r">
            <ScreenerPresetSidebar
              customPresets={customPresets}
              activePresetId={activePresetId}
              onSelectPreset={handleSelectPreset}
              onDeleteCustomPreset={handleDeleteCustomPreset}
            />
          </aside>
        )}

        {/* CỘT 2: CÂY CHỈ TIÊU LỌC (Cột giữa chia đôi chuẩn WiData) */}
        <aside className="w-full shrink-0 border-b border-white/10 lg:w-[380px] xl:w-[420px] lg:border-b-0 lg:border-r">
          <ScreenerCriteriaTree
            activeCriterionIds={activeCriterionIds}
            onToggleCriterion={handleToggleCriterion}
          />
        </aside>

        {/* CỘT 3: KHUNG THIẾT LẬP ĐIỀU KIỆN & BẢNG KẾT QUẢ (Không gian chính bên phải) */}
        <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-4">
          {/* Phía trên: Khung thiết lập điều kiện lọc (Conditions Builder) */}
          <ScreenerConditionsBuilder
            conditions={conditions}
            onUpdateCondition={handleUpdateCondition}
            onRemoveCondition={handleRemoveCondition}
            onResetConditions={handleResetConditions}
            onSavePreset={handleSavePreset}
            onRunFilter={handleRunFilter}
            matchingCount={filteredStocks.length}
          />

          {/* Phía dưới: Bảng kết quả lọc thông minh (Results Table) */}
          <div ref={tableRef} className="pt-2">
            <ScreenerResultsTable
              stocks={filteredStocks}
              conditions={conditions}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
