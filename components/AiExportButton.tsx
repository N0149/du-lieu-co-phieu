'use client'

import Link from 'next/link'
import { Bot } from 'lucide-react'

interface AiExportButtonProps {
  ticker?: string
  companyName?: string
  className?: string
  variant?: 'outline' | 'primary' | 'subtle'
}

export function AiExportButton({
  ticker,
  className = '',
}: AiExportButtonProps) {
  return (
    <Link
      href="/ket-noi-mcp"
      className={`inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 shadow-2xs transition-all cursor-pointer ${className}`}
      title={
        ticker
          ? `Kết nối dữ liệu BCTC 16 năm của ${ticker} vào Claude, ChatGPT & Gemini qua giao thức MCP`
          : 'Kết nối Dữ Liệu Đầu Tư vào Claude, ChatGPT & Gemini qua giao thức MCP'
      }
    >
      <Bot className="size-3.5 text-emerald-400" />
      <span>Kết nối MCP (AI)</span>
    </Link>
  )
}

// Alias thuận tiện cho các thành phần khác
export const StockAiChatButton = AiExportButton
