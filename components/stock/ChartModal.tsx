'use client'

import React, { useEffect, useState } from 'react'
import { X, Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ChartModalProps {
  isOpen: boolean
  onClose: () => void
  title: React.ReactNode
  subtitle?: React.ReactNode
  badge?: React.ReactNode
  headerExtra?: React.ReactNode
  footerExtra?: React.ReactNode
  children: React.ReactNode
}

export function ChartModal({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  headerExtra,
  footerExtra,
  children,
}: ChartModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Lắng nghe phím Escape để đóng modal
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    // Khóa cuộn trang khi modal mở
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 md:p-6 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={cn(
          'relative w-full rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-2xl flex flex-col text-foreground overflow-y-auto transition-all duration-200',
          isFullscreen
            ? 'max-w-[98vw] h-[96vh] max-h-[96vh]'
            : 'max-w-6xl xl:max-w-7xl max-h-[92vh]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-foreground truncate">
                  {title}
                </h3>
                {badge && <div>{badge}</div>}
              </div>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {headerExtra}

            {/* Nút phóng toàn màn hình */}
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="size-8 rounded-lg border border-border/80 bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
              title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>

            {/* Nút đóng */}
            <button
              type="button"
              onClick={onClose}
              className="size-8 rounded-lg border border-border/80 bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
              title="Đóng cửa sổ (Esc)"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Chứa biểu đồ phóng to */}
        <div className="w-full flex-1 min-h-[420px] sm:min-h-[500px]">
          {children}
        </div>

        {/* Modal Footer (nếu có) */}
        {footerExtra && (
          <div className="border-t border-border/60 pt-3 mt-3">
            {footerExtra}
          </div>
        )}
      </div>
    </div>
  )
}
