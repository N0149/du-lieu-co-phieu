'use client'

import React, { useCallback, useRef } from 'react'
import Link, { type LinkProps } from 'next/link'
import { useRouter } from 'next/navigation'

// Global cache lưu danh sách các URL đã được prefetch trong phiên lướt web
// Giúp tránh lặp lại network request không cần thiết
const prefetchedUrls = new Set<string>()

/**
 * Hàm hỗ trợ kích hoạt prefetch một URL thủ công (dùng cho phím mũi tên bàn phím, search modal...)
 */
export function prefetchStockUrl(router: { prefetch: (url: string) => void }, href: string) {
  if (!href || prefetchedUrls.has(href)) return
  prefetchedUrls.add(href)
  try {
    router.prefetch(href)
  } catch {
    // Tránh crash nếu route không hợp lệ
  }
}

export interface StockLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>, LinkProps {
  ticker?: string
  debounceMs?: number
  children: React.ReactNode
}

/**
 * StockLink - Component liên kết thông minh chuẩn WiData & Koyfin:
 * - Tự động prefetch trước 80ms khi người dùng rê chuột lên mã cổ phiếu (Hover Intent)
 * - Tải trước tức thì khi chạm ngón tay trên màn hình điện thoại (Touch Start)
 * - Khi người dùng bấm click, dữ liệu đã nằm trong cache trình duyệt -> Mở trang ngay 0ms!
 */
export function StockLink({
  href,
  ticker,
  debounceMs = 80,
  prefetch = false,
  children,
  onPointerEnter,
  onPointerLeave,
  onTouchStart,
  ...rest
}: StockLinkProps) {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const targetHref = typeof href === 'string' ? href : (href.pathname || '')

  const triggerPrefetch = useCallback(() => {
    if (!targetHref || prefetchedUrls.has(targetHref)) return
    prefetchedUrls.add(targetHref)
    try {
      router.prefetch(targetHref)
    } catch {
      // Ignored
    }
  }, [router, targetHref])

  const handlePointerEnter = (e: React.PointerEvent<HTMLAnchorElement>) => {
    onPointerEnter?.(e)
    if (prefetchedUrls.has(targetHref)) return

    timeoutRef.current = setTimeout(() => {
      triggerPrefetch()
    }, debounceMs)
  }

  const handlePointerLeave = (e: React.PointerEvent<HTMLAnchorElement>) => {
    onPointerLeave?.(e)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLAnchorElement>) => {
    onTouchStart?.(e)
    triggerPrefetch()
  }

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onTouchStart={handleTouchStart}
      {...rest}
    >
      {children}
    </Link>
  )
}
