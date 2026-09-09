'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu,
  TrendingUp,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  FileText,
  Newspaper,
} from 'lucide-react'
import { StockSearch } from '@/components/stock-search'
import { ThemeToggle } from '@/components/theme-toggle'
import { TrialBadge } from '@/components/TrialBadge'
import { UserNav } from '@/components/auth/UserNav'
import { VerticalSidebarNav, NAV_GROUPS } from '@/components/vertical-sidebar-nav'
import { cn } from '@/lib/utils'

interface SiteHeaderProps {
  hideSearch?: boolean
}

export function SiteHeader({ hideSearch = false }: SiteHeaderProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // Initialize sidebar collapsed state from localStorage and sync html attribute
  useEffect(() => {
    try {
      const saved = localStorage.getItem('app_sidebar_collapsed')
      const isCol = saved === 'true'
      setCollapsed(isCol)
      document.documentElement.setAttribute('data-sidebar', isCol ? 'collapsed' : 'expanded')
    } catch {}
  }, [])

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('app_sidebar_collapsed', next ? 'true' : 'false')
        document.documentElement.setAttribute('data-sidebar', next ? 'collapsed' : 'expanded')
      } catch {}
      return next
    })
  }, [])

  const isTraCuu = pathname?.startsWith('/tra-cuu')
  const shouldShowSearch = !hideSearch && !isTraCuu

  const isItemActive = (href: string) => {
    if (href === '/' || href === '/tin-tuc') {
      return pathname === '/' || pathname === '/tin-tuc'
    }
    if (href === '/stock/MWG') {
      return (
        pathname?.startsWith('/stock') ||
        pathname === '/doanh-nghiep' ||
        pathname?.startsWith('/ticker') ||
        pathname?.startsWith('/tra-cuu')
      )
    }
    if (href === '/cang-bien') {
      return pathname.startsWith('/cang-bien') || pathname.startsWith('/cang/')
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#14171f]/85 backdrop-blur supports-[backdrop-filter]:bg-[#14171f]/75">
        <div className="mx-auto flex h-14 w-full items-center justify-between gap-3 px-3 sm:px-4">
          {/* Left: Sidebar Toggle Button + Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop Sidebar Toggle Button */}
            <button
              type="button"
              onClick={toggleCollapse}
              className="hidden lg:flex size-8 items-center justify-center rounded-lg text-[#9EACB9] transition-colors hover:bg-white/5 hover:text-[#F0F3F6]"
              title={collapsed ? 'Mở rộng thanh menu dọc' : 'Thu gọn thanh menu dọc'}
              aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4.5 text-emerald-400" />
              ) : (
                <PanelLeftClose className="size-4.5" />
              )}
            </button>

            {/* Brand Logo */}
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <span className="flex size-7.5 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
                <TrendingUp className="size-4" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-base font-bold tracking-tight whitespace-nowrap text-[#F0F3F6] sm:text-lg">
                  Dữ Liệu<span className="text-emerald-400"> Đầu Tư</span>
                </span>
                <span className="mt-0.5 hidden text-[9px] uppercase tracking-wider text-[#9EACB9] sm:block">
                  Cổng dữ liệu & báo cáo
                </span>
              </span>
            </Link>
          </div>

          {/* Center: Global Search Bar (WiData Style Omnibar) */}
          {shouldShowSearch && (
            <div className="flex-1 max-w-xl mx-2 sm:mx-4">
              <StockSearch />
            </div>
          )}

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <TrialBadge />
              <ThemeToggle />
            </div>

            <UserNav />

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[#9EACB9] transition-colors hover:bg-white/5 hover:text-[#F0F3F6] lg:hidden"
              aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer (< lg) with Complete Vertical Tabs */}
        {menuOpen && (
          <nav className="border-t border-border bg-[#0e1117]/95 px-4 py-3 backdrop-blur lg:hidden max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            <div className="flex flex-col gap-4">
              {/* Vertical Navigation Groups in Mobile */}
              {NAV_GROUPS.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1">
                  {group.title && (
                    <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                      {group.title}
                    </div>
                  )}

                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const active = isItemActive(item.href)
                      const Icon = item.icon

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={cn(
                            'flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                            active
                              ? 'bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30 shadow-xs'
                              : 'text-[#9EACB9] hover:bg-white/5 hover:text-white'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon
                              className={cn(
                                'size-4 shrink-0',
                                active ? 'text-emerald-400' : 'text-[#64748b]'
                              )}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>

                          {item.badge && (
                            <span className="rounded bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Desktop Persistent Vertical Sidebar */}
      <VerticalSidebarNav
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/* Mobile Bottom Navigation Bar (< lg) - Thanh điều hướng nhanh dưới ngón tay cái cho điện thoại */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#14171f]/95 pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-1 backdrop-blur-xl supports-[backdrop-filter]:bg-[#14171f]/85 lg:hidden shadow-2xl">
        <div className="grid grid-cols-5 items-center justify-items-center px-1">
          {/* 1. Tin tức thị trường & Công bố thông tin (Mặc định trang chủ) */}
          <Link
            href="/"
            className={cn(
              'flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl text-[10px] sm:text-[10.5px] font-semibold transition-all active:scale-90',
              pathname === '/' || pathname === '/tin-tuc'
                ? 'text-emerald-400'
                : 'text-[#9EACB9] hover:text-[#F0F3F6]'
            )}
          >
            <Newspaper className="size-5 shrink-0" />
            <span className="leading-tight">Tin tức</span>
          </Link>

          {/* 2. Tra cứu Doanh nghiệp / Cổ phiếu (Mặc định MWG) */}
          <Link
            href="/stock/MWG"
            className={cn(
              'flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl text-[10px] sm:text-[10.5px] font-semibold transition-all active:scale-90',
              pathname?.startsWith('/stock') ||
                pathname === '/doanh-nghiep' ||
                pathname?.startsWith('/ticker') ||
                pathname?.startsWith('/tra-cuu')
                ? 'text-emerald-400'
                : 'text-[#9EACB9] hover:text-[#F0F3F6]'
            )}
          >
            <Building2 className="size-5 shrink-0" />
            <span className="leading-tight">Doanh nghiệp</span>
          </Link>

          {/* 3. Thị trường */}
          <Link
            href="/thi-truong"
            className={cn(
              'flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl text-[10px] sm:text-[10.5px] font-semibold transition-all active:scale-90',
              pathname?.startsWith('/thi-truong')
                ? 'text-emerald-400'
                : 'text-[#9EACB9] hover:text-[#F0F3F6]'
            )}
          >
            <TrendingUp className="size-5 shrink-0" />
            <span className="leading-tight">Thị trường</span>
          </Link>

          {/* 4. Báo cáo phân tích */}
          <Link
            href="/bao-cao"
            className={cn(
              'flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl text-[10.5px] font-semibold transition-all active:scale-90',
              pathname?.startsWith('/bao-cao')
                ? 'text-emerald-400'
                : 'text-[#9EACB9] hover:text-[#F0F3F6]'
            )}
          >
            <FileText className="size-5 shrink-0" />
            <span className="leading-tight">Báo cáo</span>
          </Link>

          {/* 5. Menu mở rộng đầy đủ danh mục */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className={cn(
              'flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl text-[10.5px] font-semibold transition-all active:scale-90 cursor-pointer',
              menuOpen ? 'text-emerald-400' : 'text-[#9EACB9] hover:text-[#F0F3F6]'
            )}
            title="Menu mở rộng danh mục"
          >
            <Menu className="size-5 shrink-0" />
            <span className="leading-tight">Thêm</span>
          </button>
        </div>
      </nav>
    </>
  )
}
