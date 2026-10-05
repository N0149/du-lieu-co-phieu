'use client'

import { useState } from 'react'
import {
  Bookmark,
  BookmarkPlus,
  Trash2,
  Share2,
  Check,
  CheckCircle2,
  Search,
  Filter,
} from 'lucide-react'
import type { PresetFilter } from './screener-constants'
import { cn } from '@/lib/utils'

interface ScreenerSavedFiltersPanelProps {
  customPresets: PresetFilter[]
  activePresetId: string | null
  onSelectPreset: (preset: PresetFilter) => void
  onDeleteCustomPreset: (id: string) => void
}

export function ScreenerSavedFiltersPanel({
  customPresets,
  activePresetId,
  onSelectPreset,
  onDeleteCustomPreset,
}: ScreenerSavedFiltersPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filteredPresets = customPresets.filter((p) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    )
  })

  const handleShare = (preset: PresetFilter, e: React.MouseEvent) => {
    e.stopPropagation()
    const encoded = encodeURIComponent(JSON.stringify(preset.conditions))
    const url = `${window.location.origin}/bo-loc?filter=${encoded}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(preset.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Bạn có chắc muốn xóa bộ lọc cá nhân này?')) {
      onDeleteCustomPreset(id)
    }
  }

  return (
    <div className="flex h-full w-full flex-col border-l border-white/10 bg-[#141822] text-foreground">
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#121620] px-3.5 py-3">
        <div className="flex items-center gap-2">
          <Bookmark className="size-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Bộ lọc của tôi
          </span>
        </div>
        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[11px] font-bold text-primary">
          {customPresets.length}
        </span>
      </div>

      {/* Ô tìm kiếm bộ lọc (chỉ hiện khi có từ 3 bộ lọc trở lên) */}
      {customPresets.length >= 3 && (
        <div className="border-b border-white/10 bg-[#121620] p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm bộ lọc đã lưu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-full rounded border border-white/15 bg-[#1a202c] pl-7 pr-2.5 text-[11px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Danh sách các bộ lọc cá nhân đã lưu */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {customPresets.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center p-4 text-center">
            <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-white/5 text-muted-foreground">
              <BookmarkPlus className="size-5" />
            </div>
            <p className="text-xs font-semibold text-foreground">Chưa có bộ lọc cá nhân</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Hãy chọn các tiêu chí BCTC và bấm nút &ldquo;Lưu bộ lọc&rdquo; để lưu lại vào đây sử dụng bất cứ lúc nào.
            </p>
          </div>
        ) : filteredPresets.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            Không tìm thấy bộ lọc phù hợp.
          </div>
        ) : (
          filteredPresets.map((preset) => {
            const isActive = preset.id === activePresetId
            return (
              <div
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                className={cn(
                  'group relative flex cursor-pointer flex-col rounded-lg border p-2.5 text-xs transition-all',
                  isActive
                    ? 'border-primary/50 bg-primary/10 shadow-xs'
                    : 'border-white/10 bg-[#1a202c] hover:border-white/20 hover:bg-[#202737]',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isActive ? (
                      <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                    ) : (
                      <Filter className="size-3 text-muted-foreground shrink-0" />
                    )}
                    <span
                      className={cn(
                        'font-bold truncate text-xs',
                        isActive ? 'text-primary' : 'text-white',
                      )}
                    >
                      {preset.name}
                    </span>
                  </div>

                  {/* Nút hành động: Chia sẻ & Xóa */}
                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => handleShare(preset, e)}
                      title="Sao chép liên kết chia sẻ bộ lọc"
                      className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
                    >
                      {copiedId === preset.id ? (
                        <Check className="size-3 text-positive" />
                      ) : (
                        <Share2 className="size-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(preset.id, e)}
                      title="Xóa bộ lọc này"
                      className="rounded p-1 text-muted-foreground hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>

                {/* Thông tin số lượng tiêu chí */}
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{preset.conditions.length} điều kiện lọc</span>
                  {preset.exchange && (
                    <span className="rounded bg-white/10 px-1.5 py-0.2 text-[10px] font-medium text-slate-300">
                      {preset.exchange}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
