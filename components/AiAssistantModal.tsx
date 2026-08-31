'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  MessageSquare,
  Zap,
  Loader2,
} from 'lucide-react'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

type AiAssistantModalProps = {
  open: boolean
  onClose: () => void
}

const QUICK_PROMPTS = [
  'Phân tích định giá & triển vọng HPG',
  'Top cổ phiếu có upside cao nhất trong kho báo cáo?',
  'Tình hình cán cân xuất nhập khẩu gần đây thế nào?',
  'Cổ phiếu ngành Bất động sản KCN nào đáng chú ý?',
]

export function AiAssistantModal({ open, onClose }: AiAssistantModalProps) {
  const [mounted, setMounted] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Xin chào! Tôi là Trợ lý AI Phân Tích Chuyên Sâu của **dulieudautu.com**. Tôi được kết nối trực tiếp với **Kho 94 Báo Cáo Phân Tích Nội Bộ** và công cụ **Tìm kiếm Tin Tức Thời Gian Thực**.\n\nBạn muốn tìm hiểu thông tin hoặc định giá về mã cổ phiếu hay ngành hàng nào hôm nay?',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false)
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    limit?: number
    message?: string
  } | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [open])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Lock body scroll
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  async function handleSend(queryText?: string) {
    const textToSend = (queryText ?? input).trim()
    if (!textToSend || loading) return

    setInput('')
    setRateLimitExceeded(false)

    const userMessageId = `user-${Date.now()}`
    const assistantMessageId = `ai-${Date.now()}`

    const newMessages: Message[] = [
      ...messages,
      { id: userMessageId, role: 'user', content: textToSend },
      { id: assistantMessageId, role: 'assistant', content: '', isStreaming: true },
    ]

    setMessages(newMessages)
    setLoading(true)

    try {
      // Build history excluding welcome and current prompt
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({
          role: m.role === 'user' ? ('user' as const) : ('model' as const),
          text: m.content,
        }))

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: textToSend,
          history,
        }),
      })

      if (res.status === 429) {
        const errorData = await res.json().catch(() => ({}))
        setRateLimitExceeded(true)
        setRateLimitInfo({
          limit: errorData.limit ?? 5,
          message: errorData.message || 'Bạn đã sử dụng hết hạn mức hỏi đáp AI trong ngày.',
        })
        // Remove the empty streaming assistant message
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId))
        setLoading(false)
        return
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || `Lỗi server (${res.status})`)
      }

      if (!res.body) {
        throw new Error('Không nhận được dữ liệu phản hồi.')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        accumulatedText += chunk

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: accumulatedText, isStreaming: true }
              : m
          )
        )
      }

      // Mark streaming as complete
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId ? { ...m, isStreaming: false } : m
        )
      )
    } catch (err: unknown) {
      console.error('[AiAssistantModal] Lỗi gửi tin nhắn:', err)
      const errorMsg = err instanceof Error ? err.message : 'Đã có lỗi xảy ra'
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                content: `⚠️ Không thể hoàn thành câu trả lời: ${errorMsg}. Vui lòng thử lại sau.`,
                isStreaming: false,
              }
            : m
        )
      )
    } finally {
      setLoading(false)
    }
  }

  function handleResetChat() {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          'Đã đặt lại cuộc trò chuyện. Bạn có thắc mắc gì về cổ phiếu hoặc thị trường hôm nay?',
      },
    ])
    setRateLimitExceeded(false)
  }

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/65 p-3 backdrop-blur-xs sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex h-[88vh] max-h-[780px] w-full max-w-3xl flex-col rounded-xl border border-border bg-card shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/40 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground sm:text-base">
                  Trợ Lý AI Phân Tích Cổ Phiếu
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  <Zap className="size-2.5" /> Hybrid RAG + Search
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Dữ liệu 94 báo cáo nội bộ · Tìm kiếm thời gian thực
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleResetChat}
              title="Làm mới đoạn chat"
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="size-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Đóng"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Chat message body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 sm:p-5">
          {messages.map((m) => {
            const isUser = m.role === 'user'
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="flex size-8 shrink-0 select-none items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Bot className="size-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-primary text-primary-foreground rounded-tr-xs'
                      : 'bg-muted/60 text-foreground border border-border/60 rounded-tl-xs shadow-xs'
                  }`}
                >
                  {m.isStreaming && !m.content ? (
                    <div className="flex items-center gap-2.5 py-1 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                        <span className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                        <span className="size-2 rounded-full bg-primary animate-bounce" />
                      </div>
                      <span className="text-xs font-medium text-primary/80 animate-pulse">
                        Đang tra cứu dữ liệu & suy nghĩ...
                      </span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap space-y-2">
                      {m.content}
                      {m.isStreaming && (
                        <span className="inline-block w-1.5 h-4 ml-1 translate-y-0.5 bg-primary animate-pulse" />
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="flex size-8 shrink-0 select-none items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <User className="size-4" />
                  </div>
                )}
              </div>
            )
          })}

          {/* Rate Limit Exceeded Banner */}
          {rateLimitExceeded && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-2 text-xs sm:text-sm">
                  <p className="font-semibold text-amber-800 dark:text-amber-300">
                    Đã dùng hết hạn mức câu hỏi hôm nay!
                  </p>
                  <p className="leading-relaxed text-muted-foreground">
                    {rateLimitInfo?.message ||
                      'Khách vãng lai được hỏi tối đa 5 câu/ngày. Thành viên VIP / Dùng thử được hỏi 50 câu/ngày.'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href="https://zalo.me/0983627018"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                    >
                      <MessageSquare className="size-3.5" /> Liên hệ Zalo: 0983.627.018 (Nguyễn Trung Nhật)
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompt suggestions (chỉ hiện khi chưa chat nhiều) */}
        {messages.length <= 2 && !rateLimitExceeded && (
          <div className="shrink-0 border-t border-border/50 bg-muted/20 px-4 py-2 sm:px-5">
            <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Sparkles className="size-3 text-primary" /> Gợi ý câu hỏi nhanh:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  disabled={loading}
                  className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="shrink-0 border-t border-border bg-muted/40 p-3 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                rateLimitExceeded
                  ? 'Đã hết lượt hỏi trong ngày...'
                  : 'Hỏi về định giá, mã CP, ngành hàng, vĩ mô, XNK...'
              }
              disabled={loading || rateLimitExceeded}
              className="flex-1 rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || rateLimitExceeded}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              <span className="hidden sm:inline">{loading ? 'Đang xử lý...' : 'Gửi'}</span>
            </button>
          </form>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Powered by Gemini 3.6 Flash + Kho Dữ Liệu Báo Cáo</span>
            <span>Hỏi đáp không thay thế tư vấn tài chính</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
