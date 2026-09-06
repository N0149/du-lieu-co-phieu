'use client'

import { useState } from 'react'
import {
  Search,
  Share2,
  Trash2,
  Bookmark,
  Sparkles,
  Users,
  Check,
  PlusCircle,
  CheckCircle2,
} from 'lucide-react'
import {
  type PresetFilter,
  PRESET_FILTERS,
} from './screener-constants'
import { cn } from '@/lib/utils'

interface ScreenerPresetSidebarProps {
  customPresets: PresetFilter[]
  activePresetId: string | null
  onSelectPreset: (preset: PresetFilter) => void
  onDeleteCustomPreset: (id: string) => void
}

export function ScreenerPresetSidebar({
  customPresets,
  activePresetId,
  onSelectPreset,
  onDeleteCustomPreset,
}: ScreenerPresetSidebarProps) {
  const [activeTab, setActiveTab] = useState<'ca_nhan' | 'goi_y' | 'cong_dong'>('goi_y')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const allPresets = [...PRESET_FILTERS, ...customPresets]

  const currentTabPresets = allPresets.filter((p) => {
    if (p.category !== activeTab) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    )
  })

  // Preset đang được chọn hiện tại
  const activePreset = allPresets.find((p) => p.id === activePresetId)

  const handleShare = (preset: PresetFilter, e: React.MouseEvent) => {
    e.stopPropagation()
    const encoded = encodeURIComponent(JSON.stringify(preset.conditions))
    const url = `${window.location.origin}/bo-loc?filter=${encoded}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(preset.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  return (
    <div className="flex h-full w-full flex-col border-r border-white/10 bg-[#161a23] text-foreground">
      {/* 3 Tabs: Cá nhân | Gợi ý | Cộng đồng */}
      <div className="flex border-b border-white/10 bg-[#121620] p-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('ca_nhan')}
          className={cn(
            'flex-1 rounded py-1.5 text-center transition-all',
            activeTab === 'ca_nhan'
              ? 'bg-[#20293a] text-white shadow font-semibold'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Cá nhân
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('goi_y')}
          className={cn(
            'flex-1 rounded py-1.5 text-center transition-all',
            activeTab === 'goi_y'
              ? 'bg-[#20293a] text-white shadow font-semibold'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Gợi ý
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cong_dong')}
          className={cn(
            'flex-1 rounded py-1.5 text-center transition-all',
            activeTab === 'cong_dong'
              ? 'bg-[#20293a] text-white shadow font-semibold'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Cộng đồng
        </button>
      </div>

      {/* Ô tìm kiếm bộ lọc */}
      <div className="p-2.5 border-b border-white/10 bg-[#121620]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm bộ lọc..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-full rounded border border-white/15 bg-[#1a202c] pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Danh sách bộ lọc */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {currentTabPresets.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            {activeTab === 'ca_nhan' ? (
              <div className="space-y-2">
                <Bookmark className="mx-auto size-6 text-muted-foreground/40" />
                <p>Bạn chưa lưu bộ lọc cá nhân nào.</p>
                <p className="text-[11px] text-muted-foreground/70">
                  Hãy thiết lập các điều kiện lọc và bấm &quot;Lưu bộ lọc&quot; để lưu lại chiến lược của bạn.
                </p>
              </div>
            ) : (
              <p>Không tìm thấy bộ lọc phù hợp.</p>
            )}
          </div>
        ) : (
          currentTabPresets.map((preset) => {
            const isActive = activePresetId === preset.id
            return (
              <div
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                className={cn(
                  'group flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 transition-all',
                  isActive
                    ? 'bg-[#1e293b] text-primary font-medium border border-primary/40 shadow-xs'
                    : 'hover:bg-white/5 text-foreground/90 border border-transparent',
                )}
              >
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  {isActive ? (
                    <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                  ) : (
                    <PlusCircle className="size-3.5 text-primary/70 shrink-0" />
                  )}
                  <span className="truncate text-xs">{preset.name}</span>
                </div>

                {/* Nút chia sẻ & xóa */}
                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleShare(preset, e)}
                    title="Chia sẻ bộ lọc"
                    className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  >
                    {copiedId === preset.id ? (
                      <Check className="size-3 text-positive" />
                    ) : (
                      <Share2 className="size-3" />
                    )}
                  </button>

                  {preset.category === 'ca_nhan' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteCustomPreset(preset.id)
                      }}
                      title="Xóa bộ lọc cá nhân"
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}

        {/* Khối Ghi chú của bộ lọc đang chọn (y hệt ảnh WiData) */}
        {activePreset && activePreset.note && (
          <div className="mt-4 rounded-md border border-white/10 bg-[#121620] p-3 text-xs">
            <div className="font-bold text-foreground mb-1">Ghi chú:</div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {activePreset.note}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
