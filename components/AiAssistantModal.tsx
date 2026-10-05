'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { marked } from 'marked'
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
  Key,
  Check,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Building2,
  ShieldCheck,
  SlidersHorizontal,
  ChevronRight,
  HelpCircle,
} from 'lucide-react'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export type AiAssistantModalProps = {
  open: boolean
  onClose: () => void
  initialTicker?: string
  initialCompanyName?: string
  initialPrompt?: string
}

const STORAGE_KEY = 'user_gemini_api_key'

const GENERAL_PROMPTS = [
  'Top cổ phiếu có upside cao nhất trong kho báo cáo?',
  'Soi chất lượng LNST & dòng tiền CFO mã DXP',
  'Doanh nghiệp ngành Cảng biển nào tiền mặt nhiều, nợ vay ít?',
  'Cổ phiếu ngành Bất động sản KCN nào đáng chú ý?',
]

export function AiAssistantModal({
  open,
  onClose,
  initialTicker,
  initialCompanyName,
  initialPrompt,
}: AiAssistantModalProps) {
  const [mounted, setMounted] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [testingKey, setTestingKey] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const [activeTicker, setActiveTicker] = useState<string | undefined>(initialTicker)
  const [activeCompanyName, setActiveCompanyName] = useState<string | undefined>(initialCompanyName)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false)
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    limit?: number
    message?: string
  } | null>(null)
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null)
  const [copiedPrompt, setCopiedPrompt] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load API key from localStorage
  useEffect(() => {
    setMounted(true)
    try {
      const savedKey = localStorage.getItem(STORAGE_KEY) || ''
      setApiKey(savedKey)
      setKeyInput(savedKey)
    } catch {
      // Ignore localStorage read errors
    }
  }, [])

  // Update ticker state when props change
  useEffect(() => {
    if (initialTicker) {
      setActiveTicker(initialTicker.toUpperCase().trim())
      setActiveCompanyName(initialCompanyName)
    }
  }, [initialTicker, initialCompanyName])

  // Initialize messages based on activeTicker
  const initMessages = useCallback(() => {
    if (activeTicker) {
      return [
        {
          id: 'welcome-ticker',
          role: 'assistant' as const,
          content: `Xin chào! Tôi đã nạp **Hồ sơ tài chính 16 năm BCTC, Thuyết minh CAPEX & Lãi vay, cùng Nghị quyết ĐHĐCĐ & Kế hoạch SXKD** của mã **${activeTicker}${activeCompanyName ? ` (${activeCompanyName})` : ''}** từ dulieudautu.com.\n\nBạn muốn tôi bóc tách sâu về **Chất lượng dòng tiền CFO**, **Rủi ro nợ vay**, **Kế hoạch ĐHĐCĐ & Tỷ lệ trích Quỹ KTPL**, hay **Định giá RNAV** của ${activeTicker}?`,
        },
      ]
    }
    return [
      {
        id: 'welcome-general',
        role: 'assistant' as const,
        content:
          'Xin chào! Tôi là **Trợ lý AI Phân Tích Chuyên Sâu** của **dulieudautu.com**. Tôi được kết nối trực tiếp với **Kho 94 Báo Cáo Phân Tích Nội Bộ**, **Dữ liệu 16 năm BCTC & Thuyết minh**, và công cụ **Tìm kiếm Tin Tức Thời Gian Thực**.\n\nBạn muốn tìm hiểu thông tin hoặc định giá về mã cổ phiếu hay ngành hàng nào hôm nay?',
      },
    ]
  }, [activeTicker, activeCompanyName])

  // Reset or initialize messages when modal opens or ticker changes
  useEffect(() => {
    if (open) {
      setMessages(initMessages())
      setRateLimitExceeded(false)
      if (initialPrompt) {
        setInput(initialPrompt)
      }
    }
  }, [open, activeTicker, initMessages, initialPrompt])

  // Auto scroll to bottom
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  // Focus input on open
  useEffect(() => {
    if (open && !showKeyModal) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [open, showKeyModal])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showKeyModal) {
          setShowKeyModal(false)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, showKeyModal, onClose])

  // Lock body scroll
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Save API key
  function handleSaveKey(keyToSave: string) {
    const trimmed = keyToSave.trim()
    try {
      if (trimmed) {
        localStorage.setItem(STORAGE_KEY, trimmed)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
      setApiKey(trimmed)
      setShowKeyModal(false)
      setRateLimitExceeded(false)
    } catch (err) {
      console.error('Lỗi lưu key:', err)
    }
  }

  // Remove API key
  function handleRemoveKey() {
    try {
      localStorage.removeItem(STORAGE_KEY)
      setApiKey('')
      setKeyInput('')
      setTestResult(null)
    } catch (err) {
      console.error('Lỗi xóa key:', err)
    }
  }

  // Test API key via backend
  async function handleTestKey() {
    const keyToTest = keyInput.trim()
    if (!keyToTest) {
      setTestResult({ success: false, message: 'Vui lòng nhập API Key để kiểm tra.' })
      return
    }

    setTestingKey(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test-key',
          apiKey: keyToTest,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.valid) {
        setTestResult({
          success: true,
          message: '✓ Key Google Gemini hợp lệ! Tốc độ phản hồi cực nhanh.',
        })
      } else {
        setTestResult({
          success: false,
          message: data.message || 'Key không hợp lệ hoặc tài khoản Google AI Studio chưa bật quyền.',
        })
      }
    } catch {
      setTestResult({
        success: false,
        message: 'Lỗi kiểm tra kết nối mạng. Vui lòng thử lại.',
      })
    } finally {
      setTestingKey(false)
    }
  }

  // Copy assistant response
  async function handleCopyMessage(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMsgId(id)
      setTimeout(() => setCopiedMsgId(null), 2000)
    } catch {
      // Ignore copy error
    }
  }

  // Copy Mega Prompt for external tools (ChatGPT, Claude)
  async function handleCopyPrompt() {
    if (!activeTicker) return
    try {
      const res = await fetch(`/api/stock/${activeTicker}/ai-bundle`)
      const data = await res.json().catch(() => ({}))
      if (data && data.compactPrompt) {
        await navigator.clipboard.writeText(data.compactPrompt)
        setCopiedPrompt(true)
        setTimeout(() => setCopiedPrompt(false), 2500)
      }
    } catch (err) {
      console.error('Lỗi lấy compact prompt:', err)
    }
  }

  // Send message to AI
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
      // Build history excluding welcome messages
      const history = messages
        .filter((m) => !m.id.startsWith('welcome'))
        .slice(-6)
        .map((m) => ({
          role: m.role === 'user' ? ('user' as const) : ('model' as const),
          text: m.content,
        }))

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (apiKey) {
        headers['x-gemini-key'] = apiKey
      }

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: textToSend,
          history,
          ticker: activeTicker,
          apiKey: apiKey || undefined,
        }),
      })

      if (res.status === 429) {
        const errorData = await res.json().catch(() => ({}))
        setRateLimitExceeded(true)
        setRateLimitInfo({
          limit: errorData.limit ?? 5,
          message:
            errorData.message ||
            'Bạn đã sử dụng hết hạn mức hỏi đáp AI miễn phí hôm nay từ hệ thống.',
        })
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId))
        setLoading(false)
        return
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        if (errorData.requiresByok || errorData.error === 'MISSING_API_KEY') {
          setShowKeyModal(true)
        }
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
                content: `⚠️ Không thể hoàn thành câu trả lời: ${errorMsg}. Vui lòng thử lại hoặc kết nối Google Gemini Key cá nhân miễn phí.`,
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
    setMessages(initMessages())
    setRateLimitExceeded(false)
  }

  // Ticker-specific quick prompts
  const tickerPrompts = activeTicker
    ? [
        `🔍 Soi dòng tiền CFO vs LNST ${activeTicker}`,
        `💳 Nợ vay & áp lực chi phí lãi vay của ${activeTicker}`,
        `🏛️ ĐHĐCĐ & Tỷ lệ trích quỹ KTPL ${activeTicker}`,
        `🎯 Định giá RNAV, P/E & biên an toàn ${activeTicker}`,
      ]
    : GENERAL_PROMPTS

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-2 backdrop-blur-xs sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex h-[92vh] max-h-[820px] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-2xl transition-all overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/40 px-3 py-2.5 sm:px-5 sm:py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/20">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground text-sm sm:text-base leading-tight">
                  Trợ Lý AI Phân Tích Chuyên Sâu
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Zap className="size-2.5" /> Gemini 3.5 Flash
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                16 năm BCTC · Thuyết minh CAPEX · ĐHĐCĐ · Tin tức realtime
              </p>
            </div>
          </div>

          {/* Right actions: BYOK Key Status & Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* BYOK Key Status Badge */}
            <button
              type="button"
              onClick={() => {
                setKeyInput(apiKey)
                setShowKeyModal(true)
              }}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                apiKey
                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                  : 'border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
              }`}
              title={
                apiKey
                  ? 'Đã kết nối Gemini Key cá nhân: Hỏi không giới hạn · 0đ phí'
                  : 'Kết nối Google Gemini Key miễn phí để hỏi không giới hạn'
              }
            >
              <Key className="size-3" />
              <span className="hidden sm:inline">
                {apiKey ? 'Key cá nhân: Đã kết nối' : 'Nhập Gemini Key (0đ)'}
              </span>
              <span className="sm:hidden">{apiKey ? 'Key OK' : 'Nhập Key'}</span>
            </button>

            {/* Reset Chat */}
            <button
              type="button"
              onClick={handleResetChat}
              title="Làm mới đoạn chat"
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <RotateCcw className="size-4" />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
              aria-label="Đóng"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Active Stock Context Banner (nếu đang soi cổ phiếu cụ thể) */}
        {activeTicker && (
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-primary/5 px-3 py-1.5 sm:px-5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/20 text-primary">
                <Building2 className="size-3" />
              </span>
              <div className="text-xs truncate">
                <span className="font-bold text-primary">{activeTicker}</span>
                {activeCompanyName && (
                  <span className="text-muted-foreground ml-1.5 hidden sm:inline">
                    — {activeCompanyName}
                  </span>
                )}
                <span className="ml-2 text-[10px] text-muted-foreground">
                  (Đã nạp 16 năm BCTC & ĐHĐCĐ)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                title="Sao chép Mega-Prompt hoàn chỉnh để dán vào ChatGPT hoặc Claude ngoài web"
              >
                {copiedPrompt ? (
                  <>
                    <Check className="size-3 text-emerald-500" />
                    <span className="text-emerald-500 font-semibold">Đã chép prompt!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span className="hidden sm:inline">Chép Prompt ngoài</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTicker(undefined)
                  setActiveCompanyName(undefined)
                }}
                className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10.5px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Bỏ chọn mã này để chuyển sang hỏi chung toàn thị trường"
              >
                <X className="size-3" />
                <span className="hidden sm:inline">Hỏi chung</span>
              </button>
            </div>
          </div>
        )}

        {/* Chat message body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3.5 sm:p-5 sm:space-y-4">
          {messages.map((m) => {
            const isUser = m.role === 'user'
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 sm:gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="flex size-7 sm:size-8 shrink-0 select-none items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                    <Bot className="size-4" />
                  </div>
                )}

                <div
                  className={`group relative max-w-[88%] sm:max-w-[84%] rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-primary text-primary-foreground rounded-tr-xs'
                      : 'bg-muted/50 text-foreground border border-border/60 rounded-tl-xs shadow-xs'
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
                        Đang phân tích 16 năm BCTC & suy nghĩ...
                      </span>
                    </div>
                  ) : isUser ? (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  ) : (
                    <div>
                      <div
                        className="space-y-2 text-xs sm:text-sm leading-relaxed [&>h1]:text-base [&>h1]:font-bold [&>h2]:text-sm [&>h2]:font-bold [&>h3]:text-xs sm:[&>h3]:text-sm [&>h3]:font-bold [&>h3]:text-primary [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:space-y-1 [&>ol]:list-decimal [&>ol]:pl-4 [&>ol]:space-y-1 [&>table]:w-full [&>table]:my-2 [&>table]:text-xs [&>th]:border [&>th]:border-border/60 [&>th]:bg-muted/40 [&>th]:px-2.5 [&>th]:py-1.5 [&>td]:border [&>td]:border-border/40 [&>td]:px-2.5 [&>td]:py-1.5 [&>hr]:my-3 [&>hr]:border-border/60 [&>strong]:font-semibold [&>strong]:text-foreground"
                        dangerouslySetInnerHTML={{
                          __html: marked.parse(m.content || '', { gfm: true, breaks: true }) as string,
                        }}
                      />
                      {m.isStreaming && (
                        <span className="inline-block w-1.5 h-4 ml-1 translate-y-0.5 bg-primary animate-pulse" />
                      )}
                    </div>
                  )}

                  {/* Copy message button */}
                  {!isUser && !m.isStreaming && m.content && (
                    <div className="mt-2 flex items-center justify-end pt-1 border-t border-border/30">
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(m.id, m.content)}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-background/80 cursor-pointer"
                        title="Sao chép nội dung phản hồi"
                      >
                        {copiedMsgId === m.id ? (
                          <>
                            <Check className="size-3 text-emerald-500" />
                            <span className="text-emerald-500">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="flex size-7 sm:size-8 shrink-0 select-none items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <User className="size-4" />
                  </div>
                )}
              </div>
            )
          })}

          {/* Rate Limit Exceeded Banner (Khuyến khích nhập key BYOK) */}
          {rateLimitExceeded && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 sm:p-4 text-amber-900 dark:text-amber-200 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-2 text-xs sm:text-sm">
                  <p className="font-semibold text-amber-800 dark:text-amber-300">
                    Đã hết lượt hỏi miễn phí từ hệ thống hôm nay!
                  </p>
                  <p className="leading-relaxed text-muted-foreground text-xs">
                    {rateLimitInfo?.message ||
                      'Hệ thống cung cấp 5 lượt hỏi/ngày cho khách vãng lai để bảo toàn chi phí server.'}
                    {' '}Bạn có thể kết nối <strong>Google Gemini API Key miễn phí</strong> để hỏi <strong>KHÔNG GIỚI HẠN</strong> (Google tặng miễn phí 15 câu/phút, 1 triệu tokens).
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setKeyInput(apiKey)
                        setShowKeyModal(true)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 shadow-xs cursor-pointer"
                    >
                      <Key className="size-3.5" /> Nhập Google Gemini Key miễn phí ngay (30 giây)
                    </button>
                    <a
                      href="https://zalo.me/0983627018"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <MessageSquare className="size-3.5 text-emerald-500" /> Hỗ trợ Zalo: 0983.627.018
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompt suggestions */}
        {messages.length <= 3 && !rateLimitExceeded && (
          <div className="shrink-0 border-t border-border/50 bg-muted/20 px-3 py-2 sm:px-5">
            <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Sparkles className="size-3 text-primary" /> Gợi ý câu hỏi nhanh:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tickerPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  disabled={loading}
                  className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] sm:text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-50 cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="shrink-0 border-t border-border bg-muted/40 p-2.5 sm:p-4">
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
                  ? 'Vui lòng kết nối Gemini Key cá nhân để tiếp tục...'
                  : activeTicker
                  ? `Hỏi bất kỳ điều gì về ${activeTicker} (CFO, nợ vay, ĐHĐCĐ, định giá)...`
                  : 'Hỏi về định giá, mã CP, ngành hàng, vĩ mô, XNK...'
              }
              disabled={loading || rateLimitExceeded}
              className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || rateLimitExceeded}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 sm:px-4 text-xs sm:text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              <span className="hidden sm:inline">{loading ? 'Đang soi...' : 'Gửi'}</span>
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-2 flex items-center justify-between text-[10.5px] text-muted-foreground">
            <span className="flex items-center gap-1">
              {apiKey ? (
                <span className="text-emerald-500 font-medium">✓ Đang dùng Key cá nhân (Không giới hạn)</span>
              ) : (
                <span>
                  Chế độ khách vãng lai ·{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setKeyInput(apiKey)
                      setShowKeyModal(true)
                    }}
                    className="text-primary hover:underline font-medium cursor-pointer"
                  >
                    Nhập Key miễn phí để hỏi không giới hạn
                  </button>
                </span>
              )}
            </span>
            <span className="hidden sm:inline">Dữ liệu phân tích mang tính chất tham khảo</span>
          </div>
        </div>

        {/* Modal Cài Đặt Google Gemini API Key (BYOK) */}
        {showKeyModal && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs"
            onClick={() => setShowKeyModal(false)}
          >
            <div
              className="w-full max-w-lg rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-2xl text-foreground space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                    <Key className="size-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm sm:text-base leading-tight">
                      Cấu Hình Google Gemini API Key
                    </h4>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <ShieldCheck className="size-3" /> 100% Miễn phí · Riêng tư trên trình duyệt
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* 3-Step Simple Guide */}
              <div className="rounded-xl border border-border/70 bg-muted/30 p-3 sm:p-3.5 space-y-2 text-xs">
                <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider text-muted-foreground">
                  3 Bước lấy API Key miễn phí (mất 30 giây):
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground leading-relaxed">
                  <li>
                    Nhấp vào liên kết:{' '}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    >
                      Google AI Studio <ExternalLink className="size-3" />
                    </a>{' '}
                    và đăng nhập Gmail.
                  </li>
                  <li>
                    Bấm nút xanh <strong className="text-foreground">"Create API key"</strong> ➔ Sao chép đoạn mã (bắt đầu bằng <code className="bg-muted px-1 py-0.5 rounded text-[11px]">AIza...</code>).
                  </li>
                  <li>
                    Dán vào ô bên dưới rồi nhấn <strong className="text-foreground">"Lưu vào máy"</strong>.
                  </li>
                </ol>
              </div>

              {/* Key Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Google Gemini API Key của bạn:
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-3 pr-20 text-xs sm:text-sm font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowSecret((v) => !v)}
                      className="p-1.5 text-muted-foreground hover:text-foreground rounded-md cursor-pointer"
                      title={showSecret ? 'Ẩn key' : 'Hiện key'}
                    >
                      {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                    {keyInput && (
                      <button
                        type="button"
                        onClick={() => setKeyInput('')}
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded-md cursor-pointer"
                        title="Xóa ô nhập"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Test Result Message */}
              {testResult && (
                <div
                  className={`rounded-lg p-2.5 text-xs font-medium ${
                    testResult.success
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-destructive/10 text-destructive border border-destructive/30'
                  }`}
                >
                  {testResult.message}
                </div>
              )}

              {/* Security statement */}
              <p className="text-[11px] text-muted-foreground leading-normal">
                🔒 <strong>Cam kết bảo mật:</strong> API Key chỉ được lưu trữ trong bộ nhớ trình duyệt cá nhân (<code>localStorage</code>) của bạn. Chúng tôi không bao giờ lưu key vào cơ sở dữ liệu server.
              </p>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                <div>
                  {apiKey && (
                    <button
                      type="button"
                      onClick={handleRemoveKey}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3.5" /> Xóa key đã lưu
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestKey}
                    disabled={testingKey || !keyInput.trim()}
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50 cursor-pointer"
                  >
                    {testingKey ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    <span>Kiểm tra kết nối</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveKey(keyInput)}
                    disabled={!keyInput.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                  >
                    <span>Lưu & Kích hoạt</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
