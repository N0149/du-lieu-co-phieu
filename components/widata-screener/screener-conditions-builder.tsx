'use client'

import { useState } from 'react'
import {
  RotateCcw,
  Save,
  Filter,
  X,
  GripVertical,
  ChevronDown,
} from 'lucide-react'
import {
  type ActiveCondition,
  type CriteriaOperator,
  CRITERIA_MAP,
} from './screener-constants'
import { cn } from '@/lib/utils'

interface ScreenerConditionsBuilderProps {
  conditions: ActiveCondition[]
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

export function ScreenerConditionsBuilder({
  conditions,
  onUpdateCondition,
  onRemoveCondition,
  onResetConditions,
  onSavePreset,
  onRunFilter,
  matchingCount,
}: ScreenerConditionsBuilderProps) {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [saveName, setSaveName] = useState('')

  const handleConfirmSave = () => {
    if (!saveName.trim()) return
    onSavePreset(saveName.trim())
    setSaveName('')
    setIsSaveModalOpen(false)
  }

  return (
    <div className="flex flex-col text-foreground">
      {/* Khung chứa điều kiện: Viền nét đứt màu xanh đậm chuẩn WiData */}
      <div className="rounded-lg border border-dashed border-[#1d3557] bg-[#10141e] p-3 min-h-[200px]">
        {conditions.length === 0 ? (
          /* Trạng thái chưa có điều kiện */
          <div className="flex h-44 w-full items-center justify-center p-6 text-center">
            <p className="text-sm font-medium text-[#3b82f6]">
              Thêm chỉ tiêu bên cạnh để bắt đầu lọc dữ liệu.
            </p>
          </div>
        ) : (
          /* Danh sách các dòng điều kiện xếp dọc y hệt WiData */
          <div className="space-y-2">
            {conditions.map((cond) => {
              const meta = CRITERIA_MAP.get(cond.criterionId)
              if (!meta) return null

              return (
                <div
                  key={cond.criterionId}
                  className="rounded-md border border-white/5 bg-[#171c26] p-2.5 transition-colors hover:border-white/15"
                >
                  {/* Hàng 1: Icon kéo thả :: | Tiêu đề chỉ tiêu | Nút xóa tròn đỏ (x) */}
                  <div className="flex items-center justify-between pb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical className="size-3.5 text-muted-foreground/40 shrink-0 cursor-grab" />
                      <span className="text-xs font-semibold text-foreground truncate">
                        {meta.label}
                      </span>
                    </div>

                    {/* Nút xóa tròn màu đỏ viền đỏ nhạt */}
                    <button
                      type="button"
                      onClick={() => onRemoveCondition(cond.criterionId)}
                      title="Xóa điều kiện này"
                      className="flex size-4.5 items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-colors"
                    >
                      <X className="size-3 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Hàng 2: Dropdown Toán tử (Khoảng / Lớn hơn / Nhỏ hơn / Bằng) + Inputs + Đơn vị */}
                  <div className="flex flex-wrap items-center gap-2 pl-5.5 text-xs">
                    {/* Dropdown Toán tử */}
                    <div className="relative">
                      <select
                        value={cond.operator}
                        onChange={(e) => {
                          const op = e.target.value as CriteriaOperator
                          onUpdateCondition(cond.criterionId, {
                            operator: op,
                            value2: op === 'between' ? (cond.value2 ?? meta.max) : undefined,
                          })
                        }}
                        className="h-8 appearance-none rounded border border-white/15 bg-[#12161f] pl-3 pr-7 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                      >
                        <option value="between">Khoảng</option>
                        <option value="gt">Lớn hơn</option>
                        <option value="lt">Nhỏ hơn</option>
                        <option value="eq">Bằng</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                    </div>

                    {/* Các ô nhập số liệu tương ứng với toán tử */}
                    {cond.operator === 'between' ? (
                      /* Dạng Khoảng: [10] %  [100] % */
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step={meta.step}
                            value={cond.value1}
                            onChange={(e) =>
                              onUpdateCondition(cond.criterionId, {
                                value1: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="h-8 w-20 rounded border border-white/15 bg-[#12161f] px-2 text-center text-xs font-mono font-medium text-foreground focus:border-primary focus:outline-none"
                          />
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {meta.unit}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step={meta.step}
                            value={cond.value2 ?? meta.max}
                            onChange={(e) =>
                              onUpdateCondition(cond.criterionId, {
                                value2: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="h-8 w-20 rounded border border-white/15 bg-[#12161f] px-2 text-center text-xs font-mono font-medium text-foreground focus:border-primary focus:outline-none"
                          />
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {meta.unit}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Dạng Lớn hơn / Nhỏ hơn / Bằng: [200] Tỷ VND */
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step={meta.step}
                          value={cond.value1}
                          onChange={(e) =>
                            onUpdateCondition(cond.criterionId, {
                              value1: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="h-8 w-24 rounded border border-white/15 bg-[#12161f] px-2 text-center text-xs font-mono font-medium text-foreground focus:border-primary focus:outline-none"
                        />
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {meta.unit}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
          {/* Nút Lưu bộ lọc (Nền tối viền mảnh) */}
          <button
            type="button"
            onClick={() => setIsSaveModalOpen(true)}
            disabled={conditions.length === 0}
            className="flex h-8 items-center gap-1.5 rounded border border-white/15 bg-[#1c222e] px-3 text-xs font-medium text-foreground hover:bg-[#252c3b] disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <Save className="size-3.5 text-muted-foreground" />
            <span>Lưu bộ lọc</span>
          </button>

          {/* Nút Lọc dữ liệu (Nút xanh dương solid nổi bật chuẩn WiData) */}
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
