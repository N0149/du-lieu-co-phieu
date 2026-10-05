'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Calculator, ArrowRight, Check, Sparkles } from 'lucide-react'
import {
  type CustomRatioConfig,
  FS_RATIO_ITEMS,
  type FsRatioItem,
} from './screener-constants'

interface CustomRatioModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveRatio: (config: CustomRatioConfig) => void
  editingConfig?: CustomRatioConfig | null
}

const GROUPS: Array<FsRatioItem['group']> = ['CĐKT', 'KQKD', 'LCTT', 'Quy mô']

export function CustomRatioModal({
  isOpen,
  onClose,
  onSaveRatio,
  editingConfig,
}: CustomRatioModalProps) {
  const [numeratorId, setNumeratorId] = useState<string>('long_term_debt_q')
  const [denominatorId, setDenominatorId] = useState<string>('equity_q')
  const [operation, setOperation] = useState<'div' | 'sub' | 'mul'>('div')
  const [unit, setUnit] = useState<'Lần' | '%'>('Lần')
  const [customName, setCustomName] = useState<string>('')
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(false)

  // Khởi tạo giá trị khi mở modal hoặc khi sửa
  useEffect(() => {
    if (editingConfig) {
      setNumeratorId(editingConfig.numeratorId)
      setDenominatorId(editingConfig.denominatorId)
      setOperation(editingConfig.operation)
      setUnit(editingConfig.unit)
      setCustomName(editingConfig.name)
      setIsNameManuallyEdited(true)
    } else {
      setNumeratorId('long_term_debt_q')
      setDenominatorId('equity_q')
      setOperation('div')
      setUnit('Lần')
      setIsNameManuallyEdited(false)
    }
  }, [editingConfig, isOpen])

  const numItem = useMemo(
    () => FS_RATIO_ITEMS.find((i) => i.id === numeratorId),
    [numeratorId],
  )
  const denItem = useMemo(
    () => FS_RATIO_ITEMS.find((i) => i.id === denominatorId),
    [denominatorId],
  )

  // Tự động sinh tên gợi ý chuẩn xác theo các mục đã chọn nếu người dùng chưa sửa tay
  useEffect(() => {
    if (!isNameManuallyEdited && numItem && denItem) {
      const opSign = operation === 'div' ? '/' : operation === 'sub' ? '-' : 'x'
      setCustomName(`${numItem.label.replace(/ \(Q\)/g, '')} ${opSign} ${denItem.label.replace(/ \(Q\)/g, '')}`)
    }
  }, [numItem, denItem, operation, isNameManuallyEdited])

  if (!isOpen) return null

  const handleSave = () => {
    if (!numeratorId || !denominatorId) return
    const id = editingConfig?.id || `ratio_${Date.now()}`
    const finalName = customName.trim() || 'Tỷ lệ tùy chỉnh'
    onSaveRatio({
      id,
      name: finalName,
      numeratorId,
      denominatorId,
      operation,
      unit,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl rounded-xl border border-white/15 bg-[#141822] shadow-2xl text-foreground overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#181d2a] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
              <Calculator className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {editingConfig ? 'Chỉnh sửa Tỷ lệ BCTC' : 'Tự thiết kế Tỷ lệ Báo cáo Tài chính'}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Tự do lập công thức tỷ lệ giữa 2 khoản mục bất kỳ trên BCTC theo nhu cầu phân tích
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Nội dung Form */}
        <div className="p-5 space-y-4 text-xs">
          {/* Hàng chọn 2 khoản mục & Phép toán */}
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 items-center">
            {/* 1. Tử số (Khoản mục A) */}
            <div className="sm:col-span-3 space-y-1.5">
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase">
                Khoản mục 1 (Tử số A)
              </label>
              <select
                value={numeratorId}
                onChange={(e) => setNumeratorId(e.target.value)}
                className="w-full h-9 rounded-lg border border-white/15 bg-[#1a202c] px-2.5 text-xs text-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {GROUPS.map((grp) => (
                  <optgroup key={grp} label={`Nhóm ${grp}`}>
                    {FS_RATIO_ITEMS.filter((i) => i.group === grp).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* 2. Phép toán */}
            <div className="sm:col-span-1 flex flex-col items-center justify-center space-y-1.5 pt-4">
              <div className="flex rounded-lg border border-white/10 bg-[#1a202c] p-0.5">
                <button
                  type="button"
                  title="Chia (Tỷ lệ)"
                  onClick={() => {
                    setOperation('div')
                    if (unit !== '%' && unit !== 'Lần') setUnit('Lần')
                  }}
                  className={`size-7 rounded text-xs font-bold transition-colors ${
                    operation === 'div'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  /
                </button>
                <button
                  type="button"
                  title="Trừ (Hiệu số)"
                  onClick={() => {
                    setOperation('sub')
                    setUnit('Lần')
                  }}
                  className={`size-7 rounded text-xs font-bold transition-colors ${
                    operation === 'sub'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  -
                </button>
              </div>
            </div>

            {/* 3. Mẫu số (Khoản mục B) */}
            <div className="sm:col-span-3 space-y-1.5">
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase">
                Khoản mục 2 (Mẫu số B)
              </label>
              <select
                value={denominatorId}
                onChange={(e) => setDenominatorId(e.target.value)}
                className="w-full h-9 rounded-lg border border-white/15 bg-[#1a202c] px-2.5 text-xs text-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {GROUPS.map((grp) => (
                  <optgroup key={grp} label={`Nhóm ${grp}`}>
                    {FS_RATIO_ITEMS.filter((i) => i.group === grp).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* Chọn Đơn vị kết quả */}
          <div className="flex items-center justify-between border-t border-b border-white/10 py-3">
            <span className="text-xs font-semibold text-muted-foreground">Đơn vị đo lường:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUnit('Lần')}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  unit === 'Lần'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                }`}
              >
                Hệ số (Lần)
              </button>
              <button
                type="button"
                onClick={() => setUnit('%')}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  unit === '%'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                }`}
              >
                Tỷ lệ phần trăm (%)
              </button>
            </div>
          </div>

          {/* Xem trước công thức */}
          <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-400">
              <Sparkles className="size-3.5" />
              Công thức được thiết lập:
            </div>
            <div className="text-xs font-mono font-medium text-white flex items-center gap-2">
              <span className="text-indigo-300 font-semibold">{numItem?.label || 'A'}</span>
              <span className="text-amber-400 font-bold">{operation === 'div' ? '÷' : operation === 'sub' ? '−' : '×'}</span>
              <span className="text-indigo-300 font-semibold">{denItem?.label || 'B'}</span>
              {unit === '%' && operation === 'div' && <span className="text-emerald-400">× 100%</span>}
              <span className="text-muted-foreground text-[11px]">({unit})</span>
            </div>
          </div>

          {/* Tên hiển thị của Tỷ lệ */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase">
              Tên hiển thị trên Bộ lọc & Bảng kết quả
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => {
                setCustomName(e.target.value)
                setIsNameManuallyEdited(true)
              }}
              placeholder="Nhập tên tiêu chí tùy chỉnh..."
              className="w-full h-9 rounded-lg border border-white/15 bg-[#1a202c] px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="text-[10px] text-muted-foreground">
              Ví dụ: &ldquo;Vay dài hạn / Vốn chủ sở hữu&rdquo; hoặc &ldquo;Phải thu / Doanh thu&rdquo;
            </p>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#181d2a] px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 active:scale-95 transition-all"
          >
            <Check className="size-3.5" />
            {editingConfig ? 'Cập nhật Tỷ lệ' : 'Tạo tỷ lệ & Đưa vào bộ lọc'}
          </button>
        </div>
      </div>
    </div>
  )
}
