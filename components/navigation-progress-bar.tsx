'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function NavigationProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (loading) {
      setProgress(100)
      const timeout = setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 200)
      return () => clearTimeout(timeout)
    }
  }, [pathname, searchParams])

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a')
      if (
        target &&
        target.href &&
        target.href.startsWith(window.location.origin) &&
        !target.target &&
        !target.hasAttribute('download')
      ) {
        try {
          const targetUrl = new URL(target.href)
          if (
            targetUrl.pathname !== window.location.pathname ||
            targetUrl.search !== window.location.search
          ) {
            setLoading(true)
            setProgress(30)
            const t1 = setTimeout(() => setProgress(70), 120)
            const t2 = setTimeout(() => setProgress(90), 350)
            return () => {
              clearTimeout(t1)
              clearTimeout(t2)
            }
          }
        } catch {}
      }
    }

    document.addEventListener('click', handleDocumentClick)
    return () => document.removeEventListener('click', handleDocumentClick)
  }, [])

  if (!loading && progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[2.5px] pointer-events-none bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.8)] transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  )
}
