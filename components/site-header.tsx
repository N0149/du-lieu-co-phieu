'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, TrendingUp, X, Sparkles } from 'lucide-react'
import { StockSearch } from '@/components/stock-search'
import { ThemeToggle } from '@/components/theme-toggle'
import { TrialBadge } from '@/components/TrialBadge'
import { AiAssistantModal } from '@/components/AiAssistantModal'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Bộ Lọc Cổ Phiếu', href: '/' },
  { label: 'Cảng Biển', href: '/cang-bien' },
  { label: 'Xuất nhập khẩu', href: '/xuat-nhap-khau' },
  { label: 'Tra Cứu 1.530 Mã', href: '/tra-cuu' },
  { label: 'Danh Mục Theo Dõi', href: '/danh-muc' },
  { label: 'Báo Cáo Phân Tích', href: '/bao-cao' },
]

export function SiteHeader() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [aiModalOpen, setAiModalOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4">
        {/* Brand */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <TrendingUp className="size-4.5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-lg font-bold tracking-tight whitespace-nowrap text-foreground sm:text-xl">
              {/* Mobile: rút gọn để không vỡ layout; sm+: đủ dài với accent */}
              <span className="sm:hidden">Phân Tích Chuyên Sâu</span>
              <span className="hidden sm:inline">
                Phân Tích Chuyên Sâu<span className="text-primary"> Cổ Phiếu</span>
              </span>
            </span>
            <span className="mt-0.5 hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:block">
              Cổng dữ liệu & báo cáo đầu tư
            </span>
          </span>
        </Link>

        {/* Search */}
        <div className="ml-2 hidden flex-1 justify-center md:flex">
          <StockSearch />
        </div>

        {/* Nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-bold transition-colors',
                  active
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <button
            type="button"
            onClick={() => setAiModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
            title="Mở Trợ lý AI Phân Tích Chuyên Sâu"
          >
            <Sparkles className="size-3.5" />
            <span className="hidden sm:inline">Hỏi AI</span>
            <span className="sm:hidden">AI</span>
          </button>
          <TrialBadge />
          <ThemeToggle />
          {/* Hamburger — hiển thị trên mobile/tablet (< lg) khi nav desktop bị ẩn */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu (< lg) — đủ 4 mục điều hướng, đóng khi bấm link */}
      {menuOpen && (
        <nav className="border-t border-border bg-background/95 px-4 py-2 backdrop-blur lg:hidden">
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                setAiModalOpen(true)
              }}
              className="flex items-center justify-between rounded-md bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="size-4" />
                Trợ lý AI Phân Tích Cổ Phiếu
              </span>
              <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary uppercase">
                Mới
              </span>
            </button>
            {NAV.map((item) => {
              const active =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    'flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-bold transition-colors',
                    active
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {item.label}
                  {active && <span className="size-1.5 rounded-full bg-primary" />}
                </Link>
              )
            })}
          </div>
        </nav>
      )}

      {/* Mobile search row */}
      <div className="border-t border-border px-4 py-2 md:hidden">
        <StockSearch />
      </div>

      <AiAssistantModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
      />
    </header>
  )
}
