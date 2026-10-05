'use client'

import { useState } from 'react'
import { Sparkles, Bot } from 'lucide-react'
import { AiAssistantModal } from '@/components/AiAssistantModal'

interface AiExportButtonProps {
  ticker: string
  companyName?: string
  className?: string
  variant?: 'outline' | 'primary' | 'subtle'
}

export function AiExportButton({
  ticker,
  companyName,
  className = '',
  variant = 'primary',
}: AiExportButtonProps) {
  const [open, setOpen] = useState(false)

  let baseStyle =
    'inline-flex items-center gap-1.5 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer select-none'

  if (variant === 'primary') {
    baseStyle +=
      ' border border-primary/40 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent px-3 py-1.5 text-primary hover:bg-primary/20 hover:border-primary/60'
  } else if (variant === 'outline') {
    baseStyle +=
      ' border border-border bg-card px-3 py-1.5 text-foreground hover:bg-muted hover:border-border/80'
  } else {
    baseStyle += ' px-2.5 py-1 text-primary hover:bg-primary/10 rounded-lg'
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${baseStyle} ${className}`}
        title={`Hỏi đáp chuyên sâu BCTC 16 năm, Thuyết minh & ĐHĐCĐ của ${ticker} bằng Trợ lý AI`}
      >
        <Sparkles className="size-3.5 text-primary animate-pulse" />
        <span>Hỏi AI về {ticker}</span>
      </button>

      <AiAssistantModal
        open={open}
        onClose={() => setOpen(false)}
        initialTicker={ticker}
        initialCompanyName={companyName}
      />
    </>
  )
}

// Alias thuận tiện cho các thành phần khác
export const StockAiChatButton = AiExportButton
