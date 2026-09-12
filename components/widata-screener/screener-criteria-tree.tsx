'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  ChevronDown,
  ChevronRight,
  Info,
  Check,
} from 'lucide-react'
import {
  type ScreenerCriterion,
  SCREENER_CRITERIA,
} from './screener-constants'
import { cn } from '@/lib/utils'

interface ScreenerCriteriaTreeProps {
  activeCriterionIds: Set<string>
  onToggleCriterion: (criterion: ScreenerCriterion) => void
}

const CATEGORY_GROUPS = [
  {
    id: 'chung',
    label: 'Chỉ số chung',
    subCategories: [
      'Báo cáo phân tích',
      'Báo cáo tài chính',
      'Tỷ lệ LNST không thuộc cổ đông',
      'Cổ tức',
      'Định giá',
      'Hiệu quả hoạt động',
      'Kế hoạch kinh doanh',
      'Phân tích kỹ thuật',
      'Sức khỏe tài chính',
      'Tăng trưởng cùng kỳ',
      'Tăng trưởng kỳ trước',
      'Khác',
    ],
  },
  {
    id: 'phi_tai_chinh',
    label: 'Phi tài chính',
    subCategories: ['Báo cáo tài chính (Sản xuất)', 'Đánh giá AI', 'Cơ cấu cổ đông'],
  },
  {
    id: 'ngan_hang',
    label: 'Ngân hàng',
    subCategories: ['Báo cáo tài chính (Ngân hàng)', 'Chỉ số Ngân hàng'],
  },
  {
    id: 'bao_hiem',
    label: 'Bảo hiểm',
    subCategories: ['Báo cáo tài chính (Bảo hiểm)', 'Chỉ số Bảo hiểm'],
  },
  {
    id: 'chung_khoan',
    label: 'Chứng khoán',
    subCategories: ['Báo cáo tài chính (Chứng khoán)', 'Chỉ số Chứng khoán'],
  },
]

export function ScreenerCriteriaTree({
  activeCriterionIds,
  onToggleCriterion,
}: ScreenerCriteriaTreeProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('Cổ tức')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    chung: true,
    phi_tai_chinh: false,
    ngan_hang: false,
    bao_hiem: false,
    chung_khoan: false,
  })

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  // Danh sách các chỉ tiêu thuộc sub-category đang được chọn
  const activeSubCategoryCriteria = useMemo(() => {
    return SCREENER_CRITERIA.filter((c) => c.subCategory === selectedSubCategory)
  }, [selectedSubCategory])

  // Lọc chỉ tiêu khi người dùng gõ tìm kiếm
  const isSearching = searchQuery.trim().length > 0
  const searchResults = useMemo(() => {
    if (!isSearching) return []
    const q = searchQuery.toLowerCase().trim()
    return SCREENER_CRITERIA.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.subCategory.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    )
  }, [searchQuery, isSearching])

  return (
    <div className="flex h-full w-full flex-col border-r border-white/10 bg-[#161a23] text-foreground">
      {/* Ô tìm kiếm điều kiện lọc */}
      <div className="border-b border-white/10 bg-[#121620] p-2.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm điều kiện lọc..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-full rounded border border-white/15 bg-[#1a202c] pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Nội dung: Nếu đang Search thì hiện kết quả, nếu không thì hiện 2 sub-panel chuẩn WiData */}
      {isSearching ? (
        <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
          <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase">
            Kết quả tìm kiếm ({searchResults.length})
          </div>
          {searchResults.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Không tìm thấy chỉ tiêu nào.
            </div>
          ) : (
            searchResults.map((criterion) => {
              const isChecked = activeCriterionIds.has(criterion.id)
              return (
                <label
                  key={criterion.id}
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded p-2 text-xs transition-colors',
                    isChecked
                      ? 'bg-primary/20 text-primary font-medium'
                      : 'hover:bg-white/5 text-foreground',
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleCriterion(criterion)}
                      className="size-3.5 rounded border-white/20 bg-[#121620] accent-primary"
                    />
                    <span className="truncate">{criterion.label}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                    {criterion.subCategory}
                  </span>
                </label>
              )
            })
          )}
        </div>
      ) : (
        /* Giao diện chuẩn WiData: 2 cột chia đôi (Cây bên trái | Checkbox list bên phải) */
        <div className="flex flex-1 overflow-hidden divide-x divide-white/10 text-xs">
          {/* CỘT CÂY DANH MỤC (BÊN TRÁI) */}
          <div className="w-1/2 overflow-y-auto p-1.5 space-y-0.5">
            {CATEGORY_GROUPS.map((group) => {
              const isExpanded = expandedGroups[group.id] ?? false
              return (
                <div key={group.id} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="flex w-full items-center gap-1 rounded px-2 py-1.5 text-left text-xs font-semibold text-foreground hover:bg-white/5"
                  >
                    {isExpanded ? (
                      <ChevronDown className="size-3 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-3 text-muted-foreground" />
                    )}
                    <span className="truncate">{group.label}</span>
                  </button>

                  {isExpanded && (
                    <div className="ml-3 border-l border-white/10 pl-1 space-y-0.5">
                      {group.subCategories.map((sub) => {
                        const isSelected = selectedSubCategory === sub
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => setSelectedSubCategory(sub)}
                            className={cn(
                              'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[11px] transition-colors',
                              isSelected
                                ? 'bg-[#20293a] text-white font-medium shadow-xs'
                                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                            )}
                          >
                            <span className="truncate">{sub}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* CỘT DANH SÁCH CHECKBOX CHỈ TIÊU (BÊN PHẢI) */}
          <div className="w-1/2 overflow-y-auto p-2 space-y-1 bg-[#141822]">
            <div className="mb-2 px-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-white/10 pb-1">
              {selectedSubCategory}
            </div>

            {activeSubCategoryCriteria.length === 0 ? (
              <div className="p-4 text-center text-[11px] text-muted-foreground">
                Chưa có chỉ tiêu lọc cho mục này.
              </div>
            ) : (
              activeSubCategoryCriteria.map((criterion) => {
                const isChecked = activeCriterionIds.has(criterion.id)
                return (
                  <label
                    key={criterion.id}
                    className={cn(
                      'group flex cursor-pointer items-center justify-between rounded px-2 py-1.5 transition-colors',
                      isChecked
                        ? 'bg-primary/20 text-primary font-medium'
                        : 'hover:bg-white/5 text-foreground',
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleCriterion(criterion)}
                        className="size-3.5 rounded border-white/20 bg-[#121620] accent-primary"
                      />
                      <span className="text-[11px] leading-snug line-clamp-2">
                        {criterion.label}
                      </span>
                    </div>

                    <span
                      title={criterion.description}
                      className="text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 cursor-help"
                    >
                      <Info className="size-3" />
                    </span>
                  </label>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
