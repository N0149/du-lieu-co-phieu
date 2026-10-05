'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import type { ScreenerStockItem } from '@/lib/screener-data-service'
import { ScreenerTopBar } from './screener-top-bar'
import { ScreenerSavedFiltersPanel } from './screener-saved-filters-panel'
import { ScreenerCriteriaTree } from './screener-criteria-tree'
import { ScreenerConditionsBuilder } from './screener-conditions-builder'
import { ScreenerResultsTable } from './screener-results-table'
import { CustomRatioModal } from './custom-ratio-modal'
import {
  type ActiveCondition,
  type PresetFilter,
  type ScreenerCriterion,
  type CustomRatioConfig,
  CRITERIA_MAP,
  calcCustomRatioValue,
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
  const [isSavedPanelOpen, setIsSavedPanelOpen] = useState<boolean>(true)
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(true)

  // Trạng thái điều kiện lọc
  const [conditions, setConditions] = useState<ActiveCondition[]>([])
  const [activePresetId, setActivePresetId] = useState<string | null>(null)

  // Trạng thái modal thiết kế tỷ lệ tùy chỉnh
  const [isCustomRatioModalOpen, setIsCustomRatioModalOpen] = useState<boolean>(false)
  const [editingCustomRatio, setEditingCustomRatio] = useState<CustomRatioConfig | null>(null)

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
          // Tính cận biên min và max thực tế từ danh sách stocks hiện có
          let actualMin = criterion.min
          let actualMax = criterion.max

          if (stocks.length > 0) {
            let minVal = Infinity
            let maxVal = -Infinity
            for (const s of stocks) {
              const v = criterion.getter(s)
              if (v != null && !isNaN(v)) {
                if (v < minVal) minVal = v
                if (v > maxVal) maxVal = v
              }
            }
            if (minVal !== Infinity && maxVal !== -Infinity) {
              actualMin = Math.floor(minVal * 100) / 100
              actualMax = Math.ceil(maxVal * 100) / 100
            }
          }

          return [
            ...prev,
            {
              criterionId: criterion.id,
              operator: 'between',
              value1: actualMin,
              value2: actualMax,
            },
          ]
        }
      })
      setActivePresetId(null)
    },
    [stocks],
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

  // Lưu hoặc cập nhật tỷ lệ BCTC tự thiết kế
  const handleSaveCustomRatio = useCallback(
    (config: CustomRatioConfig) => {
      let actualMin = 0
      let actualMax = 10
      if (stocks.length > 0) {
        let minVal = Infinity
        let maxVal = -Infinity
        for (const s of stocks) {
          const v = calcCustomRatioValue(s, config)
          if (v != null && !isNaN(v)) {
            if (v < minVal) minVal = v
            if (v > maxVal) maxVal = v
          }
        }
        if (minVal !== Infinity && maxVal !== -Infinity) {
          actualMin = Math.floor(minVal * 100) / 100
          actualMax = Math.ceil(maxVal * 100) / 100
        }
      }

      setConditions((prev) => {
        const existingIndex = prev.findIndex((c) => c.criterionId === config.id)
        if (existingIndex >= 0) {
          const next = [...prev]
          next[existingIndex] = {
            ...next[existingIndex],
            customRatio: config,
          }
          return next
        }
        return [
          ...prev,
          {
            criterionId: config.id,
            operator: 'between',
            value1: actualMin,
            value2: actualMax,
            customRatio: config,
          },
        ]
      })
      setActivePresetId(null)
    },
    [stocks],
  )

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
        let val: number | null = null
        if (cond.customRatio) {
          val = calcCustomRatioValue(stock, cond.customRatio)
        } else {
          const meta = CRITERIA_MAP.get(cond.criterionId)
          if (!meta) continue
          val = meta.getter(stock)
        }

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
      {/* 1. TOP BAR: Lọc Sàn, Ngành, Mã CK, Bật/Tắt Bộ lọc cá nhân, Ẩn/Hiện Bộ lọc */}
      <ScreenerTopBar
        selectedExchange={selectedExchange}
        onChangeExchange={setSelectedExchange}
        selectedSector={selectedSector}
        onChangeSector={setSelectedSector}
        selectedTickers={selectedTickers}
        onToggleTicker={handleToggleTicker}
        onClearTickers={handleClearTickers}
        allTickers={allTickerOptions}
        isSavedPanelOpen={isSavedPanelOpen}
        onToggleSavedPanel={() => setIsSavedPanelOpen((prev) => !prev)}
        savedCount={customPresets.length}
        totalCount={filteredStocks.length}
        isFilterPanelOpen={isFilterPanelOpen}
        onToggleFilterPanel={() => setIsFilterPanelOpen((prev) => !prev)}
      />

      {/* 2. KHU VỰC THIẾT LẬP BỘ LỌC (CÂY CHỈ TIÊU TRÁI -> KHUNG ĐIỀU KIỆN GIỮA -> BỘ LỌC CÁ NHÂN PHẢI) */}
      {isFilterPanelOpen && (
        <div className="flex flex-col lg:flex-row border-b border-white/10 bg-[#0f1218] shrink-0 h-auto lg:h-[450px]">
          {/* CỘT 1 (BÊN TRÁI): CÂY CHỈ TIÊU LỌC */}
          <aside className="w-full shrink-0 border-b border-white/10 lg:w-[380px] xl:w-[420px] lg:border-b-0 lg:border-r overflow-hidden">
            <ScreenerCriteriaTree
              activeCriterionIds={activeCriterionIds}
              onToggleCriterion={handleToggleCriterion}
              onOpenCustomRatioModal={() => {
                setEditingCustomRatio(null)
                setIsCustomRatioModalOpen(true)
              }}
            />
          </aside>

          {/* CỘT 2 (Ở GIỮA): KHUNG THIẾT LẬP ĐIỀU KIỆN & THANH TRƯỢT */}
          <div className="flex-1 min-w-0 overflow-y-auto p-4 border-b border-white/10 lg:border-b-0 lg:border-r">
            <ScreenerConditionsBuilder
              conditions={conditions}
              stocks={stocks}
              onUpdateCondition={handleUpdateCondition}
              onRemoveCondition={handleRemoveCondition}
              onResetConditions={handleResetConditions}
              onSavePreset={handleSavePreset}
              onRunFilter={handleRunFilter}
              onOpenCustomRatioModal={() => {
                setEditingCustomRatio(null)
                setIsCustomRatioModalOpen(true)
              }}
              onEditCustomRatio={(cfg) => {
                setEditingCustomRatio(cfg)
                setIsCustomRatioModalOpen(true)
              }}
              matchingCount={filteredStocks.length}
            />
          </div>

          {/* CỘT 3 (BÊN PHẢI): BỘ LỌC CÁ NHÂN ĐÃ LƯU (GỌN GÀNG, TIỆN DỤNG) */}
          {isSavedPanelOpen && (
            <aside className="w-full shrink-0 lg:w-64 xl:w-72 overflow-y-auto bg-[#141822]">
              <ScreenerSavedFiltersPanel
                customPresets={customPresets}
                activePresetId={activePresetId}
                onSelectPreset={handleSelectPreset}
                onDeleteCustomPreset={handleDeleteCustomPreset}
              />
            </aside>
          )}
        </div>
      )}

      {/* 3. BẢNG KẾT QUẢ LỌC CỔ PHIẾU (RỘNG TOÀN MÀN HÌNH - FULL WIDTH) */}
      <div ref={tableRef} className="w-full p-4 bg-[#0f1218] flex-1">
        <ScreenerResultsTable
          stocks={filteredStocks}
          conditions={conditions}
          isFilterPanelOpen={isFilterPanelOpen}
          onToggleFilterPanel={() => setIsFilterPanelOpen((prev) => !prev)}
        />
      </div>

      {/* 4. MODAL THIẾT KẾ TỶ LỆ BCTC TÙY CHỈNH */}
      <CustomRatioModal
        isOpen={isCustomRatioModalOpen}
        onClose={() => setIsCustomRatioModalOpen(false)}
        onSaveRatio={handleSaveCustomRatio}
        editingConfig={editingCustomRatio}
      />
    </div>
  )
}
