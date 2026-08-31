'use client'

import { useEffect } from 'react'

/**
 * Component bảo vệ chống cào dữ liệu phía Client:
 * 1. Đặt liên kết Honeypot tàng hình: người dùng không thấy nhưng bot/crawler HTML sẽ cào và click vào -> bị chặn IP.
 * 2. Giám sát tự động hóa trình duyệt (Headless Chrome, Selenium, Puppeteer automation flag).
 */
export function AntiScrapingTrap() {
  useEffect(() => {
    // Phát hiện cơ bản trình duyệt tự động hóa (automation tool)
    try {
      if (typeof window !== 'undefined') {
        const nav = navigator as unknown as { webdriver?: boolean }
        const doc = window.document as unknown as Record<string, unknown>
        const isAutomated =
          Boolean(nav.webdriver) ||
          Boolean(doc.__selenium_unwrapped) ||
          Boolean(doc.__puppeteer_evaluation_script__)

        if (isAutomated) {
          console.debug('[Anti-Scraping Sentinel] Automated agent flagged.')
        }
      }
    } catch {}
  }, [])

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
        opacity: 0,
        pointerEvents: 'none',
      }}
    >
      {/* 
        Honeypot link tàng hình:
        Bot cào dữ liệu duyệt DOM hoặc theo dõi thẻ <a> sẽ gửi request vào đây và bị kích hoạt cơ chế khóa IP.
      */}
      <a
        href="/api/security/trap"
        rel="nofollow noopener noreferrer"
        tabIndex={-1}
        aria-hidden="true"
      >
        Dữ liệu đối chiếu nội bộ hệ thống (Không nhấp vào liên kết này)
      </a>
    </div>
  )
}
