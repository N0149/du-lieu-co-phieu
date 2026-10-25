'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export function PageViewTracker() {
  const pathname = usePathname()
  const lastTrackedRef = useRef<{ path: string; time: number }>({ path: '', time: 0 })

  useEffect(() => {
    if (!pathname) return

    // Debounce chống duplicate nếu cùng một path trong vòng 1 giây
    const now = Date.now()
    if (lastTrackedRef.current.path === pathname && now - lastTrackedRef.current.time < 1000) {
      return
    }
    lastTrackedRef.current = { path: pathname, time: now }

    // Gửi event ghi nhận lượt xem trang không làm nghẽn main thread
    try {
      const payload = JSON.stringify({
        path: pathname,
        referrer: typeof document !== 'undefined' ? document.referrer : '',
      })

      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon('/api/analytics/track', blob)
      } else {
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {})
      }
    } catch {}
  }, [pathname])

  return null
}
