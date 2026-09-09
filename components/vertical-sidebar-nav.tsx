'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Newspaper,
  TrendingUp,
  Layers,
  Filter,
  PieChart,
  Anchor,
  Package,
  Search,
  Star,
  FileText,
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  description?: string
}

export type NavGroup = {
  title?: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Dữ liệu & Thị trường',
    items: [
      {
        label: 'Tin Tức',
        href: '/',
        icon: Newspaper,
        badge: 'Live',
        description: 'Dòng tin tức & công bố doanh nghiệp realtime',
      },
      {
        label: 'Doanh nghiệp',
        href: '/stock/MWG',
        icon: Building2,
        badge: 'MWG',
        description: 'Chi tiết tài chính, BCTC & phân tích MWG',
      },
      {
        label: 'Thị Trường',
        href: '/thi-truong',
        icon: TrendingUp,
        description: 'Định giá P/E, P/B, vĩ mô & margin CTCK',
      },
      {
        label: 'Ngành ICB',
        href: '/nganh',
        icon: Layers,
        description: 'Bản đồ nhiệt & phân loại 19 ngành cấp 2',
      },
      {
        label: 'Bộ Lọc Cổ Phiếu',
        href: '/bo-loc',
        icon: Filter,
        badge: 'Pro',
        description: 'Bộ lọc 1.530+ mã chuyên sâu, P/E, ROE & kỹ thuật',
      },
      {
        label: 'Nghiên cứu chuyên sâu AI',
        href: '/nghien-cuu-ai',
        icon: Sparkles,
        badge: 'RNAV',
        description: 'Định giá RNAV & sàng lọc tài sản',
      },
    ],
  },
  {
    title: 'Chuyên đề & Công cụ',
    items: [
      {
        label: 'Cảng Biển',
        href: '/cang-bien',
        icon: Anchor,
        badge: 'Tàu bè',
        description: 'Tình báo hàng hải & sản lượng cảng biển',
      },
      {
        label: 'Xuất nhập khẩu',
        href: '/xuat-nhap-khau',
        icon: Package,
        description: 'Dữ liệu hải quan & 2.500+ dòng hàng hóa',
      },
      {
        label: 'Quỹ Mở',
        href: '/quy-mo',
        icon: PieChart,
        description: 'Top holdings 42 quỹ đầu tư lớn nhất',
      },
    ],
  },
  {
    title: 'Theo dõi & Phân tích',
    items: [
      {
        label: 'Danh Mục Theo Dõi',
        href: '/danh-muc',
        icon: Star,
        description: 'Danh sách cổ phiếu quan tâm của bạn',
      },
      {
        label: 'Báo Cáo Phân Tích',
        href: '/bao-cao',
        icon: FileText,
        description: 'Kho 94+ bài phân tích chuyên sâu & audio',
      },
    ],
  },
]

interface VerticalSidebarNavProps {
  collapsed: boolean
  onToggleCollapse: () => void
  className?: string
}

export function VerticalSidebarNav({
  collapsed,
  onToggleCollapse,
  className,
}: VerticalSidebarNavProps) {
  const pathname = usePathname()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  const isItemActive = (href: string) => {
    const target = pendingHref || pathname
    if (!target) return false

    if (href === '/' || href === '/tin-tuc') {
      return target === '/' || target === '/tin-tuc'
    }
    if (href === '/stock/MWG') {
      return (
        target.startsWith('/stock') ||
        target === '/doanh-nghiep' ||
        target.startsWith('/ticker') ||
        target.startsWith('/tra-cuu')
      )
    }
    if (href === '/cang-bien') {
      return target.startsWith('/cang-bien') || target.startsWith('/cang/')
    }
    return target.startsWith(href)
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-14 bottom-0 z-30 hidden lg:flex flex-col border-r border-white/8 bg-[#10131a] select-none transition-all duration-200 ease-in-out',
        collapsed ? 'w-[68px]' : 'w-60',
        className
      )}
      aria-label="Thanh điều hướng dọc"
    >
      {/* Scrollable Navigation Groups */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent space-y-4">
        {NAV_GROUPS.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {/* Section Heading (Visible when expanded) */}
            {group.title && !collapsed && (
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                {group.title}
              </div>
            )}

            {/* Separator Line (When collapsed) */}
            {group.title && collapsed && groupIdx > 0 && (
              <div className="my-1.5 mx-auto w-6 border-t border-white/10" />
            )}

            {/* Nav Items */}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isItemActive(item.href)
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setPendingHref(item.href)}
                    className={cn(
                      'group relative flex items-center rounded-lg text-xs font-medium transition-all',
                      collapsed
                        ? 'size-11 justify-center mx-auto'
                        : 'w-full gap-2.5 px-3 py-2 text-left',
                      active
                        ? 'bg-emerald-500/15 text-emerald-400 font-semibold shadow-xs'
                        : 'text-[#9EACB9] hover:bg-white/5 hover:text-[#F0F3F6]'
                    )}
                    title={collapsed ? `${item.label} - ${item.description || ''}` : undefined}
                  >
                    {/* Active left indicator bar */}
                    {active && (
                      <span
                        className={cn(
                          'absolute bg-emerald-400 rounded-r-full shadow-[0_0_8px_rgba(52,211,153,0.5)]',
                          collapsed
                            ? 'left-0 top-1.5 bottom-1.5 w-1'
                            : 'left-0 top-1.5 bottom-1.5 w-0.5'
                        )}
                      />
                    )}

                    {/* Icon */}
                    <Icon
                      className={cn(
                        'shrink-0 transition-colors',
                        collapsed ? 'size-5' : 'size-4',
                        active
                          ? 'text-emerald-400'
                          : 'text-[#64748b] group-hover:text-[#94a3b8]'
                      )}
                    />

                    {/* Label & Description when Expanded */}
                    {!collapsed && (
                      <div className="flex flex-1 items-center justify-between min-w-0">
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="ml-1.5 rounded bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Tooltip for collapsed mode */}
                    {collapsed && (
                      <div className="pointer-events-none absolute left-full ml-2 hidden rounded-md border border-white/10 bg-[#1a1f2c] px-2.5 py-1 text-xs font-medium text-white shadow-lg whitespace-nowrap group-hover:block z-50">
                        <div className="flex items-center gap-1.5">
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="rounded bg-emerald-500/20 px-1 text-[9px] text-emerald-400">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Toggle Bar */}
      <div className="border-t border-white/8 p-2 bg-[#0c0e14]">
        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            'flex w-full items-center rounded-lg p-2 text-xs font-medium text-[#8b949e] transition-colors hover:bg-white/5 hover:text-white',
            collapsed ? 'justify-center' : 'gap-2.5 px-3'
          )}
          title={collapsed ? 'Mở rộng menu dọc' : 'Thu gọn menu dọc'}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4 shrink-0 text-emerald-400" />
          ) : (
            <>
              <PanelLeftClose className="size-4 shrink-0 text-[#64748b]" />
              <span className="truncate">Thu gọn menu</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
