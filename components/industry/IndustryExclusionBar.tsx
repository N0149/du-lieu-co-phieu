'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { X, Search, Sparkles, Plus, RotateCcw } from 'lucide-react'
import {
  VIN_GROUP_SYMBOLS,
  SUGGESTED_EXCLUDE_SYMBOLS,
  type StockSearchItem,
} from '@/lib/industry-types'
import { cn } from '@/lib/utils'

interface IndustryExclusionBarProps {
  excludedSymbols: string[]
  onChange: (symbols: string[]) => void
  allStocks?: StockSearchItem[]
}

export function IndustryExclusionBar({
  excludedSymbols,
  onChange,
  allStocks = [],
}: IndustryExclusionBarProps) {
  const [inputValue, setInputValue] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Kiểm tra xem toàn bộ nhóm Vin đã được loại trừ hay chưa
  const isVinFullyExcluded = useMemo(() => {
    return VIN_GROUP_SYMBOLS.every((sym) => excludedSymbols.includes(sym))
  }, [excludedSymbols])

  // Lọc gợi ý tìm kiếm theo từ khóa
  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) return []
    const q = inputValue.toUpperCase().trim()
    return allStocks
      .filter((s) => !excludedSymbols.includes(s.symbol) && (s.symbol.includes(q) || s.name.toUpperCase().includes(q)))
      .slice(0, 8)
  }, [inputValue, allStocks, excludedSymbols])

  // Thêm một mã vào danh sách loại trừ
  const addStock = (sym: string) => {
    const s = sym.toUpperCase().trim()
    if (!s || excludedSymbols.includes(s)) return
    onChange([...excludedSymbols, s])
    setInputValue('')
    setIsDropdownOpen(false)
    setHighlightIdx(-1)
  }

  // Xóa một mã khỏi danh sách loại trừ
  const removeStock = (sym: string) => {
    onChange(excludedSymbols.filter((s) => s !== sym))
  }

  // Bật/tắt nhanh toàn bộ nhóm Vin
  const toggleVinGroup = () => {
    if (isVinFullyExcluded) {
      // Bỏ nhóm Vin
      onChange(excludedSymbols.filter((s) => !VIN_GROUP_SYMBOLS.includes(s)))
    } else {
      // Thêm nhóm Vin (tránh trùng lặp)
      const merged = Array.from(new Set([...excludedSymbols, ...VIN_GROUP_SYMBOLS]))
      onChange(merged)
    }
  }

  // Xóa toàn bộ danh sách loại trừ
  const clearAll = () => {
    onChange([])
    setInputValue('')
    setIsDropdownOpen(false)
  }

  // Click outside để đóng dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
        setHighlightIdx(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Phím mũi tên lên/xuống/enter trong dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen || filteredSuggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx((prev) => Math.min(prev + 1, filteredSuggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx((prev) => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIdx >= 0 && filteredSuggestions[highlightIdx]) {
        addStock(filteredSuggestions[highlightIdx].symbol)
      } else if (filteredSuggestions.length > 0) {
        addStock(filteredSuggestions[0].symbol)
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false)
      setHighlightIdx(-1)
    }
  }

  // Các gợi ý đơn lẻ chưa bị loại (như +GVR, +SAB)
  const remainingSuggestions = SUGGESTED_EXCLUDE_SYMBOLS.filter(
    (sym) => !excludedSymbols.includes(sym) && !VIN_GROUP_SYMBOLS.includes(sym)
  )

  return (
    <div
      ref={containerRef}
      className="relative flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3.5 py-2.5 shadow-sm backdrop-blur-sm sm:px-4"
    >
      {/* Cụm bên trái: Nhãn + Các Chip đã chọn + Ô tìm mã */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-amber-300 whitespace-nowrap">
          Loại trừ khỏi tổng hợp:
        </span>

        {/* Danh sách các Chip đã loại trừ */}
        {excludedSymbols.map((sym) => (
          <span
            key={sym}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/15 px-2.5 py-1 text-xs font-bold text-amber-200 shadow-sm"
          >
            <span>{sym}</span>
            <button
              type="button"
              onClick={() => removeStock(sym)}
              className="flex size-3.5 items-center justify-center rounded hover:bg-amber-400/30 text-amber-300 hover:text-white transition-colors"
              title={`Bỏ loại trừ ${sym}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}

        {/* Ô nhập tìm mã nhanh */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
              setInputValue(val)
              setIsDropdownOpen(true)
              setHighlightIdx(-1)
            }}
            onFocus={() => setIsDropdownOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm mã…"
            maxLength={8}
            className="h-7 w-24 rounded-lg border border-amber-500/30 bg-[#12151c]/80 px-2.5 text-xs font-semibold text-[#F0F3F6] placeholder-amber-200/40 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 sm:w-28"
          />

          {/* Dropdown gợi ý */}
          {isDropdownOpen && filteredSuggestions.length > 0 && (
            <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-60 overflow-y-auto rounded-xl border border-white/10 bg-[#1a1f2c] p-1 shadow-2xl backdrop-blur-md">
              {filteredSuggestions.map((item, idx) => (
                <button
                  key={item.symbol}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    addStock(item.symbol)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors',
                    idx === highlightIdx
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-[#F0F3F6] hover:bg-white/5'
                  )}
                >
                  <span className="font-bold text-amber-400">{item.symbol}</span>
                  <span className="ml-2 truncate text-[11px] text-[#8B98A5] max-w-[140px]">
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cụm bên phải: Nút chọn nhanh Nhóm Vin + gợi ý khác + Xóa tất cả */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Nút Nhóm Vin chuyên biệt */}
        <button
          type="button"
          onClick={toggleVinGroup}
          className={cn(
            'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all shadow-sm cursor-pointer',
            isVinFullyExcluded
              ? 'border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
              : 'border-amber-400/50 bg-amber-400/15 text-amber-300 hover:bg-amber-400/25 hover:border-amber-300'
          )}
        >
          {isVinFullyExcluded ? (
            <>
              <RotateCcw className="size-3" />
              <span>Khôi phục nhóm Vin</span>
            </>
          ) : (
            <>
              <Plus className="size-3" />
              <span>+Nhóm Vin (4 mã)</span>
            </>
          )}
        </button>

        {/* Các gợi ý riêng lẻ: +GVR, +SAB */}
        {remainingSuggestions.map((sym) => (
          <button
            key={sym}
            type="button"
            onClick={() => addStock(sym)}
            className="hidden sm:inline-flex items-center gap-0.5 rounded-lg border border-amber-500/30 bg-white/5 px-2 py-1 text-xs font-semibold text-amber-300/80 hover:border-amber-400/60 hover:text-amber-200 hover:bg-amber-400/10 transition-all cursor-pointer"
          >
            <span>+{sym}</span>
          </button>
        ))}

        {/* Nút Xóa tất cả */}
        {excludedSymbols.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-semibold text-[#8B98A5] hover:text-rose-400 underline underline-offset-2 transition-colors ml-1 cursor-pointer"
          >
            Xóa tất cả
          </button>
        )}
      </div>
    </div>
  )
}
