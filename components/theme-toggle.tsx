'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(next)
    try {
      localStorage.setItem('rnav-theme', next)
    } catch {
      // ignore
    }
    setTheme(next)
  }

  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      title={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
    >
      {mounted && theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}

export function ThemeInitializer() {
  useEffect(() => {
    try {
      const t = localStorage.getItem('rnav-theme')
      if (t === 'light') {
        document.documentElement.classList.remove('dark')
        document.documentElement.classList.add('light')
      } else {
        document.documentElement.classList.add('dark')
      }
      const sb = localStorage.getItem('app_sidebar_collapsed')
      if (sb) {
        document.documentElement.setAttribute('data-sidebar', sb === 'true' ? 'collapsed' : 'expanded')
      }
    } catch {
      document.documentElement.classList.add('dark')
    }
  }, [])

  return null
}
