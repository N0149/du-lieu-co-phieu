'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TrendingUp } from 'lucide-react'
import { StockSearch } from '@/components/stock-search'
import { ThemeToggle } from '@/components/theme-toggle'
import { TrialBadge } from '@/components/TrialBadge'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Bộ Lọc Cổ Phiếu', href: '/' },
  { label: 'Danh Mục Theo Dõi', href: '/danh-muc' },
  { label: 'Báo Cáo Phân Tích', href: '/bao-cao' },
]

export function SiteHeader() {
  const pathname = usePathname()

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
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
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
          <TrialBadge />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile search row */}
      <div className="border-t border-border px-4 py-2 md:hidden">
        <StockSearch />
      </div>
    </header>
  )
}
