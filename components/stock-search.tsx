'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, FileText } from 'lucide-react'
import { GlobalSearchModal } from '@/components/global-search-modal'
import { useReports } from '@/lib/use-reports'
import { reportTickers } from '@/lib/report-stocks'

export function StockSearch() {
  const [modalOpen, setModalOpen] = useState(false)

  // Global hotkey Ctrl+K / Cmd+K or "/"
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setModalOpen(true)
      } else if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault()
        setModalOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <div className="relative w-full max-w-xl">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="group flex h-9 w-full items-center justify-between rounded-lg border border-white/10 bg-[#121620] px-3 text-xs text-[#9EACB9] transition-all hover:border-emerald-500/50 hover:bg-[#181d28] hover:text-[#F0F3F6]"
          title="Mở công cụ tìm kiếm toàn diện (Ctrl + K)"
        >
          <div className="flex items-center gap-2.5 truncate">
            <Search className="size-4 shrink-0 text-[#64748b] group-hover:text-emerald-400 transition-colors" />
            <span className="truncate hidden sm:inline">
              Tìm kiếm Biểu đồ, Dữ liệu, Bố cục, Cổ phiếu...
            </span>
            <span className="truncate sm:hidden text-[11.5px]">
              Tìm mã CP, BCTC...
            </span>
          </div>

          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-white/10 bg-[#1e2430] px-1.5 py-0.5 font-mono text-[10px] text-[#8b949e]">
            <span className="text-[11px]">⌘</span>K
          </kbd>
        </button>
      </div>

      <GlobalSearchModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}

export function QuickJump() {
  const { reports } = useReports()
  const tickers = reportTickers(reports)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Truy cập nhanh:</span>
      {tickers.map((t) => (
        <Link
          key={t}
          href={`/stock/${encodeURIComponent(t)}`}
          title={`Xem chi tiết & báo cáo ${t}`}
          className="inline-flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 font-mono text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <FileText className="size-3 text-primary" />
          {t}
        </Link>
      ))}
    </div>
  )
}
