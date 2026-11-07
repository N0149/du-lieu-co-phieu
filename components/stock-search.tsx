'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Search } from 'lucide-react'
import { getStoredSearchPool } from '@/lib/stock-search-cache'

// Nạp lười (Lazy load) GlobalSearchModal chỉ khi người dùng mở hộp thoại tìm kiếm (click hoặc Ctrl+K)
// Giúp loại bỏ hoàn toàn ~560 KB bundle dữ liệu cổ phiếu khỏi lượt tải ban đầu của TẤT CẢ các trang trên website
const GlobalSearchModal = dynamic(
  () => import('@/components/global-search-modal').then((m) => m.GlobalSearchModal),
  { ssr: false }
)

export function StockSearch() {
  const [modalOpen, setModalOpen] = useState(false)

  // Tiền tải dữ liệu tìm kiếm ngầm vào IndexedDB khi trình duyệt rảnh rỗi (idle)
  useEffect(() => {
    const timer = setTimeout(() => {
      getStoredSearchPool().catch(() => {})
    }, 2500)
    return () => clearTimeout(timer)
  }, [])

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

      {modalOpen && (
        <GlobalSearchModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
