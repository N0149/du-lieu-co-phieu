'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CopyButton({
  value,
  label = 'Sao chép',
  className,
}: {
  value: string
  label?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Fallback cho môi trường không có Clipboard API
      const ta = document.createElement('textarea')
      ta.value = value
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`${label} ${value}`}
      title={copied ? 'Đã sao chép' : label}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors',
        copied
          ? 'border-positive/40 bg-positive-muted text-positive'
          : 'hover:border-primary hover:text-primary',
        className,
      )}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? 'Đã sao chép' : label}
    </button>
  )
}
