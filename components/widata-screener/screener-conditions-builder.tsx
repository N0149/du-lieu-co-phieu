'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { RotateCcw, Save, Filter, X } from 'lucide-react'
import {
  type ActiveCondition,
  type ScreenerCriterion,
  CRITERIA_MAP,
} from './screener-constants'
import type { ScreenerStockItem } from '@/lib/screener-data-service'
import { cn } from '@/lib/utils'

interface ScreenerConditionsBuilderProps {
  conditions: ActiveCondition[]
  stocks?: ScreenerStockItem[]
  onUpdateCondition: (
    criterionId: string,
    updates: Partial<ActiveCondition>,
  ) => void
  onRemoveCondition: (criterionId: string) => void
  onResetConditions: () => void
  onSavePreset: (name: string) => void
  onRunFilter: () => void
  matchingCount: number
}

/**
 * Thanh trượt 2 đầu (Dual Range Slider) chuẩn WiData
 * - Nút tròn màu trắng ở 2 đầu
 * - Dải màu xanh dương ở giữa
 * - Track mỏng trải dài 100% chiều ngang
 */
function DualRangeSlider({
  min,
  max,
  step,
  val1,
  val2,
  onChange,
}: {
  min: number
  max: number
  step: number
  val1: number
  val2: number
  onChange: (v1: number, v2: number) => void
}) {
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null)
  const rangeSpan = max - min || 1
  const leftPercent = Math.min(100, Math.max(0, ((val1 - min) / rangeSpan) * 100))
  const rightPercent = Math.min(100, Math.max(0, ((val2 - min) / rangeSpan) * 100))
  const widthPercent = Math.max(0, rightPercent - leftPercent)

  return (
    <div className="relative w-full h-5 flex items-center select-none py-1">
      {/* 1. Track nền màu xám/xanh tối */}
      <div className="absolute left-0 right-0 h-[2px] rounded-full bg-[#202b3f]" />

      {/* 2. Dải active màu xanh dương giữa 2 nút */}
      <div
        className="absolute h-[2px] bg-[#2563eb] rounded-full pointer-events-none transition-all duration-75"
        style={{
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
        }}
      />

      {/* 3. Input kéo Min (Bên trái) */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val1}
        onPointerDown={() => setActiveThumb('min')}
        onPointerUp={() => setActiveThumb(null)}
        onChange={(e) => {
          const v = Math.min(Number(e.target.value), val2)
          onChange(v, val2)
        }}
        style={{
          zIndex: activeThumb === 'min' ? 30 : leftPercent > 50 ? 20 : 10,
        }}
        className="widata-range-slider absolute inset-0 w-full h-full appearance-none bg-transparent pointer-events-none cursor-pointer"
      />

      {/* 4. Input kéo Max (Bên phải) */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val2}
        onPointerDown={() => setActiveThumb('max')}
        onPointerUp={() => setActiveThumb(null)}
        onChange={(e) => {
          const v = Math.max(Number(e.target.value), val1)
          onChange(val1, v)
        }}
        style={{
          zIndex: activeThumb === 'max' ? 30 : rightPercent < 50 ? 20 : 15,
        }}
        className="widata-range-slider absolute inset-0 w-full h-full appearance-none bg-transparent pointer-events-none cursor-pointer"
      />
    </div>
  )
}

/**
 * Từng dòng chỉ tiêu đã chọn
 * - Hàng trên: Tên chỉ tiêu bên trái, 2 pill input [val1 %-] [val2 %] + nút (x) bên phải
 * - Hàng dưới: DualRangeSlider full-width
 */
function ConditionRow({
  cond,
  meta,
  actualMin,
  actualMax,
  onUpdate,
  onRemove,
}: {
  cond: ActiveCondition
  meta: ScreenerCriterion
  actualMin: number
  actualMax: number
  onUpdate: (updates: Partial<ActiveCondition>) => void
  onRemove: () => void
}) {
  const minBound = Math.min(actualMin, cond.value1)
  const maxBound = Math.max(actualMax, cond.value2 ?? actualMax)

  // Local state để người dùng gõ số âm, số thập phân không bị giật
  const [text1, setText1] = useState(String(cond.value1))
  const [text2, setText2] = useState(String(cond.value2 ?? maxBound))

  useEffect(() => {
    setText1(String(cond.value1))
  }, [cond.value1])

  useEffect(() => {
    setText2(String(cond.value2 ?? maxBound))
  }, [cond.value2, maxBound])

  const handleBlur1 = () => {
    let num = parseFloat(text1)
    if (isNaN(num)) num = minBound
    const clamped = Math.max(minBound, Math.min(num, cond.value2 ?? maxBound))
    setText1(String(clamped))
    onUpdate({ value1: clamped })
  }

  const handleBlur2 = () => {
    let num = parseFloat(text2)
    if (isNaN(num)) num = maxBound
    const clamped = Math.min(maxBound, Math.max(num, cond.value1))
    setText2(String(clamped))
    onUpdate({ value2: clamped })
  }

  return (
    <div className="group flex flex-col py-2.5 border-b border-white/5 last:border-b-0">
      {/* HÀNG TRÊN: Tên chỉ tiêu (Trái) & 2 ô pill input + nút (x) (Phải) */}
      <div className="flex items-center justify-between gap-3">
        {/* Tên chỉ tiêu */}
        <span className="text-xs md:text-[13px] font-medium text-[#e2e8f0] truncate" title={meta.label}>
          {meta.label}
        </span>

        {/* Cụm input pill & nút xóa */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Ô Min: [ value1 % - ] */}
          <div className="flex items-center rounded bg-[#202737] px-2 py-0.5 border border-white/10 hover:border-white/20 transition-colors">
            <input
              type="text"
              value={text1}
              onChange={(e) => {
                const val = e.target.value
                setText1(val)
                const num = parseFloat(val)
                if (!isNaN(num)) {
                  onUpdate({ value1: num })
                }
              }}
              onBlur={handleBlur1}
              className="w-13 md:w-16 bg-transparent text-right font-mono text-xs font-semibold text-white outline-none"
            />
            <span className="ml-1 text-[11px] font-medium text-slate-400 select-none">
              {meta.unit} -
            </span>
          </div>

          {/* Ô Max: [ value2 % ] */}
          <div className="flex items-center rounded bg-[#202737] px-2 py-0.5 border border-white/10 hover:border-white/20 transition-colors">
            <input
              type="text"
              value={text2}
              onChange={(e) => {
                const val = e.target.value
                setText2(val)
                const num = parseFloat(val)
                if (!isNaN(num)) {
                  onUpdate({ value2: num })
                }
              }}
              onBlur={handleBlur2}
              className="w-13 md:w-16 bg-transparent text-right font-mono text-xs font-semibold text-white outline-none"
            />
            <span className="ml-1 text-[11px] font-medium text-slate-400 select-none">
              {meta.unit}
            </span>
          </div>

          {/* Nút xóa tròn mờ với dấu x */}
          <button
            type="button"
            onClick={onRemove}
            title="Xóa chỉ tiêu này"
            className="flex size-5 items-center justify-center rounded-full bg-white/10 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
          >
            <X className="size-3 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* HÀNG DƯỚI: Thanh trượt 2 đầu (Dual Slider) full-width */}
      <div className="mt-1.5 w-full">
        <DualRangeSlider
          min={minBound}
          max={maxBound}
          step={meta.step}
          val1={cond.value1}
          val2={cond.value2 ?? maxBound}
          onChange={(v1, v2) => {
            onUpdate({ value1: v1, value2: v2 })
          }}
        />
      </div>
    </div>
  )
}

export function ScreenerConditionsBuilder({
  conditions,
  stocks = [],
  onUpdateCondition,
  onRemoveCondition,
  onResetConditions,
  onSavePreset,
  onRunFilter,
  matchingCount,
}: ScreenerConditionsBuilderProps) {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [saveName, setSaveName] = useState('')

  // Tính toán min và max thực tế từ danh sách stocks cho từng chỉ tiêu đã chọn
  const actualBoundsMap = useMemo(() => {
    const map = new Map<string, { min: number; max: number }>()
    if (stocks.length === 0) return map

    for (const cond of conditions) {
      const meta = CRITERIA_MAP.get(cond.criterionId)
      if (!meta) continue

      let minVal = Infinity
      let maxVal = -Infinity
      for (const s of stocks) {
        const v = meta.getter(s)
        if (v != null && !isNaN(v)) {
          if (v < minVal) minVal = v
          if (v > maxVal) maxVal = v
        }
      }

      if (minVal !== Infinity && maxVal !== -Infinity) {
        // Làm tròn 2 chữ số thập phân
        map.set(cond.criterionId, {
          min: Math.floor(minVal * 100) / 100,
          max: Math.ceil(maxVal * 100) / 100,
        })
      }
    }
    return map
  }, [stocks, conditions])

  const handleConfirmSave = () => {
    if (!saveName.trim()) return
    onSavePreset(saveName.trim())
    setSaveName('')
    setIsSaveModalOpen(false)
  }

  return (
    <div className="flex flex-col text-foreground">
      {/* Thẻ style cho range slider chuẩn CSS */}
      <style jsx global>{`
        .widata-range-slider::-webkit-slider-thumb {
          pointer-events: auto !important;
          -webkit-appearance: none !important;
          appearance: none !important;
          width: 14px !important;
          height: 14px !important;
          border-radius: 50% !important;
          background-color: #ffffff !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4) !important;
          cursor: pointer !important;
          transition: transform 0.1s ease;
        }
        .widata-range-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        .widata-range-slider::-moz-range-thumb {
          pointer-events: auto !important;
          width: 14px !important;
          height: 14px !important;
          border-radius: 50% !important;
          background-color: #ffffff !important;
          border: none !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4) !important;
          cursor: pointer !important;
          transition: transform 0.1s ease;
        }
        .widata-range-slider::-moz-range-thumb:hover {
          transform: scale(1.15);
        }
        .widata-range-slider::-webkit-slider-runnable-track {
          -webkit-appearance: none !important;
          background: transparent !important;
          border: none !important;
        }
        .widata-range-slider::-moz-range-track {
          background: transparent !important;
          border: none !important;
        }
      `}</style>

      {/* Khung chứa: Header màu xanh navy chuẩn ảnh WiData */}
      <div className="overflow-hidden rounded-lg border border-[#212c42] bg-[#0e131f] shadow-sm">
        {/* Header: Thanh màu xanh navy "CHỈ TIÊU ĐÃ CHỌN" */}
        <div className="bg-[#1c2e56] px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            CHỈ TIÊU ĐÃ CHỌN
          </span>
          {conditions.length > 0 && (
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white">
              {conditions.length}
            </span>
          )}
        </div>

        {/* Nội dung danh sách điều kiện */}
        <div className="p-3 md:p-4 min-h-[160px]">
          {conditions.length === 0 ? (
            /* Trạng thái chưa có điều kiện */
            <div className="flex h-36 w-full flex-col items-center justify-center p-6 text-center">
              <p className="text-xs font-medium text-[#3b82f6]">
                Chọn các chỉ tiêu ở cây bên trái để thiết lập bộ lọc.
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Hỗ trợ kéo thanh trượt 2 đầu hoặc nhập số trực tiếp.
              </p>
            </div>
          ) : (
            /* Danh sách các dòng chỉ tiêu với slider 2 đầu */
            <div className="space-y-1">
              {conditions.map((cond) => {
                const meta = CRITERIA_MAP.get(cond.criterionId)
                if (!meta) return null

                const bounds = actualBoundsMap.get(cond.criterionId)
                const actualMin = bounds ? bounds.min : meta.min
                const actualMax = bounds ? bounds.max : meta.max

                return (
                  <ConditionRow
                    key={cond.criterionId}
                    cond={cond}
                    meta={meta}
                    actualMin={actualMin}
                    actualMax={actualMax}
                    onUpdate={(updates) => onUpdateCondition(cond.criterionId, updates)}
                    onRemove={() => onRemoveCondition(cond.criterionId)}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Thanh nút công cụ dưới khung điều kiện */}
      <div className="mt-3 flex items-center justify-between">
        {/* Nút Đặt lại bên trái */}
        <button
          type="button"
          onClick={onResetConditions}
          disabled={conditions.length === 0}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <RotateCcw className="size-3.5" />
          <span>Đặt lại</span>
        </button>

        {/* Các nút hành động bên phải */}
        <div className="flex items-center gap-2">
          {/* Nút Lưu bộ lọc */}
          <button
            type="button"
            onClick={() => setIsSaveModalOpen(true)}
            disabled={conditions.length === 0}
            className="flex h-8 items-center gap-1.5 rounded border border-white/15 bg-[#1c222e] px-3 text-xs font-medium text-foreground hover:bg-[#252c3b] disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <Save className="size-3.5 text-muted-foreground" />
            <span>Lưu bộ lọc</span>
          </button>

          {/* Nút Lọc dữ liệu */}
          <button
            type="button"
            onClick={onRunFilter}
            className="flex h-8 items-center gap-2 rounded bg-[#2563eb] px-4 text-xs font-semibold text-white shadow hover:bg-[#1d4ed8] active:scale-95 transition-all"
          >
            <Filter className="size-3.5 fill-current" />
            <span>Lọc dữ liệu</span>
            {matchingCount != null && (
              <span className="ml-0.5 rounded-full bg-black/25 px-1.5 py-0.2 font-mono text-[10px]">
                {matchingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Modal Lưu bộ lọc cá nhân */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-white/15 bg-[#1b202a] p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-foreground">Lưu bộ lọc cá nhân</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Nhập tên gợi nhớ để lưu các điều kiện hiện tại vào tab &quot;Cá nhân&quot;.
            </p>

            <input
              type="text"
              placeholder="VD: Cổ phiếu tăng trưởng dở dang..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              autoFocus
              className="mt-3 h-9 w-full rounded-md border border-white/10 bg-[#12161f] px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="h-8 rounded-lg border border-white/10 px-3 text-xs font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={!saveName.trim()}
                className="h-8 rounded-lg bg-[#2563eb] px-4 text-xs font-bold text-white shadow hover:bg-[#1d4ed8] disabled:opacity-40"
              >
                Lưu lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
