'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Search,
  X,
  ExternalLink,
  Newspaper,
  FileText,
  ThumbsUp,
  MessageSquare,
  Building2,
  Filter,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Eye,
  Calendar,
  Share2,
  Check,
  Send,
  Trash2,
  LogIn,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CompanyArticleItem, StockArticlesPayload } from '@/lib/stock-articles-service'
import { createClient } from '@/lib/supabase/client'
import { AuthModal } from '@/components/auth/AuthModal'

interface StockArticlesTabProps {
  symbol: string
  companyName?: string
  initialArticles?: StockArticlesPayload | null
}

interface ArticleCommentItem {
  id: string
  articleId: string
  userId: string
  userEmail: string
  userName: string
  userAvatar?: string
  content: string
  createdAt: string
}

interface ArticleEngagementItem {
  articleId: string
  likesCount: number
  commentsCount: number
  isLiked: boolean
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr.replace(' ', 'T'))
    if (isNaN(d.getTime())) return dateStr
    const now = new Date()
    const diffSec = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000))
    if (diffSec < 45) return 'vừa xong'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`
    if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)} ngày trước`
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
  } catch {
    return dateStr
  }
}

function ArticleThumbnail({
  imageUrl,
  title,
  ticker,
  type,
  onClick,
}: {
  imageUrl?: string
  title: string
  ticker: string
  type: 'disclosure' | 'news'
  onClick?: () => void
}) {
  const [hasError, setHasError] = useState(false)

  if (imageUrl && !hasError) {
    return (
      <div
        onClick={onClick}
        className="relative size-16 sm:size-20 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted/40 shadow-2xs cursor-pointer group/thumb"
      >
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
          onError={() => setHasError(true)}
        />
      </div>
    )
  }

  // Fallback nếu không có ảnh hoặc ảnh bị lỗi: Render icon nhận diện
  const isDisc = type === 'disclosure'
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative flex size-16 sm:size-20 shrink-0 flex-col items-center justify-center rounded-xl border p-2 text-center shadow-2xs transition-colors cursor-pointer',
        isDisc
          ? 'border-sky-500/25 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20'
          : 'border-indigo-500/25 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
      )}
    >
      {isDisc ? (
        <>
          <FileText className="size-5 mb-0.5" />
          <span className="font-mono text-[10px] font-black uppercase tracking-wider">{ticker}</span>
        </>
      ) : (
        <>
          <Newspaper className="size-5 mb-0.5" />
          <span className="font-mono text-[10px] font-black uppercase tracking-wider">{ticker}</span>
        </>
      )}
    </div>
  )
}

export function StockArticlesTab({
  symbol,
  companyName,
  initialArticles,
}: StockArticlesTabProps) {
  const [filterType, setFilterType] = useState<'all' | 'disclosure' | 'news'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(15)
  const [selectedArticle, setSelectedArticle] = useState<CompanyArticleItem | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  // Quản lý thông tin xác thực User
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalTitle, setAuthModalTitle] = useState('Đăng nhập tài khoản')
  const [authModalSubtitle, setAuthModalSubtitle] = useState('Đăng nhập để like và bình luận bài viết')

  // Quản lý tương tác (Likes & Comments) thời gian thực
  const [engagements, setEngagements] = useState<Record<string, ArticleEngagementItem>>({})

  // Quản lý bình luận trong modal đọc chi tiết
  const [comments, setComments] = useState<ArticleCommentItem[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const [articlesData, setArticlesData] = useState<StockArticlesPayload | null>(initialArticles || null)
  const items = useMemo(() => articlesData?.items || [], [articlesData])

  // Client-side fallback: Nếu danh sách bài viết đang rỗng, tự động fetch từ /api/stock/[symbol]/articles
  useEffect(() => {
    if (!articlesData || articlesData.items.length === 0) {
      fetch(`/api/stock/${encodeURIComponent(symbol)}/articles`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data && res.data.items?.length > 0) {
            setArticlesData(res.data)
          }
        })
        .catch(() => {})
    }
  }, [symbol, articlesData])

  // Khởi tạo trạng thái đăng nhập
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    if (supabase) {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (cancelled) return
        if (session?.user) {
          setCurrentUser({
            id: session.user.id,
            email: session.user.email,
            name:
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              session.user.email?.split('@')[0],
            avatar:
              session.user.user_metadata?.avatar_url ||
              session.user.user_metadata?.picture,
          })
        } else {
          // Fallback cookie session nếu có
          try {
            const res = await fetch('/api/auth/session')
            if (res.ok) {
              const data = await res.json()
              if (data?.user) {
                setCurrentUser(data.user)
              }
            }
          } catch {}
        }
      })

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (cancelled) return
        if (session?.user) {
          setCurrentUser({
            id: session.user.id,
            email: session.user.email,
            name:
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              session.user.email?.split('@')[0],
            avatar:
              session.user.user_metadata?.avatar_url ||
              session.user.user_metadata?.picture,
          })
          setAuthModalOpen(false)
        } else {
          setCurrentUser(null)
        }
      })

      return () => {
        cancelled = true
        subscription.unsubscribe()
      }
    } else {
      fetch('/api/auth/session')
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled && data?.user) {
            setCurrentUser(data.user)
          }
        })
        .catch(() => {})
    }
  }, [])

  // Tải thông tin tương tác batch (số Like, số Comment, trạng thái Like của người dùng)
  useEffect(() => {
    if (items.length === 0) return

    const articleIds = items.map((it) => it.id)

    async function loadBatchEngagements() {
      try {
        const supabase = createClient()
        const session = (await supabase?.auth.getSession())?.data?.session
        const token = session?.access_token

        const res = await fetch('/api/articles/batch-engagement', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ articleIds }),
        })

        if (res.ok) {
          const data = await res.json()
          if (data.success && data.engagements) {
            setEngagements((prev) => ({
              ...prev,
              ...data.engagements,
            }))
          }
        }
      } catch (err) {
        console.error('[StockArticlesTab] Lỗi tải batch tương tác:', err)
      }
    }

    loadBatchEngagements()
  }, [items, currentUser?.id])

  // Lọc theo loại bài và từ khóa tìm kiếm
  const filteredItems = useMemo(() => {
    let list = items

    // 1. Lọc theo danh mục bài
    if (filterType === 'disclosure') {
      list = list.filter((it) => it.type === 'disclosure')
    } else if (filterType === 'news') {
      list = list.filter((it) => it.type === 'news')
    }

    // 2. Lọc theo từ khóa tìm kiếm
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          (it.summary && it.summary.toLowerCase().includes(q)) ||
          it.source.toLowerCase().includes(q) ||
          it.categoryLabel.toLowerCase().includes(q) ||
          it.tickers.some((t) => t.ticker.toLowerCase().includes(q) || (t.name && t.name.toLowerCase().includes(q)))
      )
    }

    return list
  }, [items, filterType, searchQuery])

  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, visibleCount)
  }, [filteredItems, visibleCount])

  const counts = useMemo(() => {
    const total = items.length
    const disclosures = items.filter((it) => it.type === 'disclosure').length
    const news = items.filter((it) => it.type === 'news').length
    return { total, disclosures, news }
  }, [items])

  // Xử lý phím ESC để đóng Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedArticle(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Nạp bình luận & tương tác chi tiết khi mở Modal bài viết
  useEffect(() => {
    if (!selectedArticle) {
      setComments([])
      setCommentText('')
      return
    }

    let cancelled = false
    setLoadingComments(true)

    async function fetchDetails() {
      try {
        const supabase = createClient()
        const session = (await supabase?.auth.getSession())?.data?.session
        const token = session?.access_token

        const res = await fetch(`/api/articles/${encodeURIComponent(selectedArticle!.id)}/engagement`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })

        if (!cancelled && res.ok) {
          const data = await res.json()
          if (data.success && data.data) {
            setComments(data.data.comments || [])
            setEngagements((prev) => ({
              ...prev,
              [selectedArticle!.id]: {
                articleId: selectedArticle!.id,
                likesCount: data.data.likesCount ?? 0,
                commentsCount: data.data.commentsCount ?? 0,
                isLiked: data.data.isLiked ?? false,
              },
            }))
          }
        }
      } catch (err) {
        console.error('[StockArticlesTab] Lỗi tải chi tiết bình luận:', err)
      } finally {
        if (!cancelled) setLoadingComments(false)
      }
    }

    fetchDetails()

    return () => {
      cancelled = true
    }
  }, [selectedArticle?.id])

  const handleCopy = (link: string) => {
    if (!link) return
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  // Xử lý Thích / Bỏ thích (Optimistic Update)
  const handleToggleLike = async (articleId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }

    if (!currentUser) {
      setAuthModalTitle('Đăng nhập để thích bài viết')
      setAuthModalSubtitle('Đăng nhập tài khoản để thích bài viết và tương tác với tin tức thị trường')
      setAuthModalOpen(true)
      return
    }

    const currentEng = engagements[articleId] || {
      articleId,
      likesCount: 0,
      commentsCount: 0,
      isLiked: false,
    }

    const nextIsLiked = !currentEng.isLiked
    const nextLikesCount = nextIsLiked ? currentEng.likesCount + 1 : Math.max(0, currentEng.likesCount - 1)

    // Cập nhật giao diện ngay lập tức
    setEngagements((prev) => ({
      ...prev,
      [articleId]: {
        ...currentEng,
        likesCount: nextLikesCount,
        isLiked: nextIsLiked,
      },
    }))

    try {
      const supabase = createClient()
      const session = (await supabase?.auth.getSession())?.data?.session
      const token = session?.access_token

      const res = await fetch(`/api/articles/${encodeURIComponent(articleId)}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!res.ok) {
        if (res.status === 401) {
          // Rollback
          setEngagements((prev) => ({ ...prev, [articleId]: currentEng }))
          setAuthModalTitle('Đăng nhập để thích bài viết')
          setAuthModalSubtitle('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.')
          setAuthModalOpen(true)
          return
        }
        throw new Error('Like request failed')
      }

      const data = await res.json()
      if (data.success) {
        setEngagements((prev) => ({
          ...prev,
          [articleId]: {
            ...prev[articleId],
            likesCount: data.likesCount,
            isLiked: data.liked,
          },
        }))
      }
    } catch (err) {
      console.error('[StockArticlesTab] Lỗi khi toggle like:', err)
      // Rollback nếu thất bại
      setEngagements((prev) => ({ ...prev, [articleId]: currentEng }))
    }
  }

  // Xử lý gửi bình luận mới
  const handleAddComment = async () => {
    if (!selectedArticle) return
    const text = commentText.trim()
    if (!text) return

    if (!currentUser) {
      setAuthModalTitle('Đăng nhập để bình luận')
      setAuthModalSubtitle('Đăng nhập tài khoản để viết bình luận và thảo luận về bài viết này')
      setAuthModalOpen(true)
      return
    }

    setSubmittingComment(true)
    try {
      const supabase = createClient()
      const session = (await supabase?.auth.getSession())?.data?.session
      const token = session?.access_token

      const res = await fetch(`/api/articles/${encodeURIComponent(selectedArticle.id)}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: text }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        if (res.status === 401) {
          setAuthModalTitle('Đăng nhập để bình luận')
          setAuthModalSubtitle('Vui lòng đăng nhập để gửi bình luận.')
          setAuthModalOpen(true)
          return
        }
        alert(data.error || 'Có lỗi xảy ra khi gửi bình luận.')
        return
      }

      // Thêm bình luận vào danh sách hiển thị
      setComments((prev) => [...prev, data.data])
      setCommentText('')

      // Cập nhật số lượng bình luận
      setEngagements((prev) => {
        const curr = prev[selectedArticle.id] || {
          articleId: selectedArticle.id,
          likesCount: 0,
          commentsCount: 0,
          isLiked: false,
        }
        return {
          ...prev,
          [selectedArticle.id]: {
            ...curr,
            commentsCount: data.commentsCount ?? curr.commentsCount + 1,
          },
        }
      })
    } catch (err) {
      console.error('[StockArticlesTab] Lỗi khi gửi bình luận:', err)
      alert('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.')
    } finally {
      setSubmittingComment(false)
    }
  }

  // Xử lý xóa bình luận
  const handleDeleteComment = async (commentId: string) => {
    if (!selectedArticle) return
    if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return

    try {
      const supabase = createClient()
      const session = (await supabase?.auth.getSession())?.data?.session
      const token = session?.access_token

      const res = await fetch(
        `/api/articles/${encodeURIComponent(selectedArticle.id)}/comments?commentId=${encodeURIComponent(commentId)}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      )

      const data = await res.json()
      if (data.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId))
        setEngagements((prev) => {
          const curr = prev[selectedArticle.id] || {
            articleId: selectedArticle.id,
            likesCount: 0,
            commentsCount: 0,
            isLiked: false,
          }
          return {
            ...prev,
            [selectedArticle.id]: {
              ...curr,
              commentsCount: Math.max(0, data.commentsCount ?? curr.commentsCount - 1),
            },
          }
        })
      } else {
        alert(data.error || 'Không thể xóa bình luận.')
      }
    } catch (err) {
      console.error('[StockArticlesTab] Lỗi khi xóa bình luận:', err)
    }
  }

  return (
    <div className="space-y-4">
      {/* ── 1. THANH CÔNG CỤ TÌM KIẾM & BỘ LỌC ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs">
        {/* Nhóm Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
              filterType === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <span>Tất cả</span>
            <span className="rounded-md bg-background/20 px-1.5 py-0.5 text-[10px] font-bold">
              {counts.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('disclosure')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
              filterType === 'disclosure'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <FileText className="size-3.5" />
            <span>Công bố thông tin</span>
            <span className="rounded-md bg-background/20 px-1.5 py-0.5 text-[10px] font-bold">
              {counts.disclosures}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('news')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
              filterType === 'news'
                ? 'bg-indigo-500 text-white shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Newspaper className="size-3.5" />
            <span>Báo chí & Tin tức</span>
            <span className="rounded-md bg-background/20 px-1.5 py-0.5 text-[10px] font-bold">
              {counts.news}
            </span>
          </button>
        </div>

        {/* Ô Tìm kiếm nhanh */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề, nguồn tin..."
            className="w-full rounded-xl border border-border bg-background py-1.5 pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── 2. DANH SÁCH BÀI VIẾT (CHUẨN GIAO DIỆN FIREANT) ── */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <Newspaper className="size-10 mb-2 opacity-40" />
            <p className="text-sm font-semibold text-foreground">Không tìm thấy bài viết hoặc công bố nào</p>
            <p className="text-xs text-muted-foreground mt-1">
              Thử tìm kiếm với từ khóa khác hoặc chuyển sang xem tất cả danh mục.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {displayedItems.map((item) => {
              const isDisclosure = item.type === 'disclosure'
              const eng = engagements[item.id] || {
                articleId: item.id,
                likesCount: item.engagement?.likes ?? 0,
                commentsCount: item.engagement?.comments ?? 0,
                isLiked: false,
              }

              return (
                <div
                  key={item.id}
                  className="group flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 transition-colors hover:bg-muted/40"
                >
                  {/* Cột 1: Ảnh đại diện Thumbnail bên trái */}
                  <ArticleThumbnail
                    imageUrl={item.imageUrl}
                    title={item.title}
                    ticker={symbol}
                    type={item.type}
                    onClick={() => {
                      if (item.link && item.link.startsWith('http')) {
                        window.open(item.link, '_blank', 'noopener,noreferrer')
                      } else {
                        setSelectedArticle(item)
                      }
                    }}
                  />

                  {/* Cột 2: Nội dung bài viết */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {/* Dòng 1: Huy hiệu các mã cổ phiếu kèm % biến động + Nhãn phân loại */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {item.tickers && item.tickers.length > 0 ? (
                        item.tickers.map((t, idx) => {
                          const isNegative = t.changePercent != null && t.changePercent < 0
                          const isPositive = t.changePercent != null && t.changePercent > 0

                          return (
                            <Link
                              key={`${t.ticker}-${idx}`}
                              href={`/stock/${encodeURIComponent(t.ticker)}`}
                              className="inline-flex items-center gap-1 rounded-md bg-secondary/80 hover:bg-secondary px-1.5 py-0.5 font-mono text-[11px] sm:text-xs font-bold text-foreground transition-colors"
                            >
                              <span>{t.ticker}</span>
                              {t.changePercent != null && (
                                <span
                                  className={cn(
                                    'font-semibold text-[10.5px] sm:text-[11px]',
                                    isNegative
                                      ? 'text-rose-500 dark:text-rose-400'
                                      : isPositive
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-muted-foreground'
                                  )}
                                >
                                  {isPositive ? `+${t.changePercent}%` : `${t.changePercent}%`}
                                </span>
                              )}
                            </Link>
                          )
                        })
                      ) : (
                        <span className="font-mono text-xs font-bold text-foreground">{symbol}</span>
                      )}

                      {/* Nhãn loại tài liệu / công bố */}
                      <span
                        className={cn(
                          'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                          isDisclosure
                            ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                            : 'bg-muted text-muted-foreground border border-border/60'
                        )}
                      >
                        {item.categoryLabel}
                      </span>

                      {/* Huy hiệu tin nhạy cảm giá */}
                      {item.isImportant && (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-700 dark:text-amber-300">
                          ⚡ Nhạy cảm
                        </span>
                      )}
                    </div>

                    {/* Dòng 2: Tiêu đề bài viết */}
                    <div>
                      {item.link && item.link.startsWith('http') ? (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-left text-[13.5px] sm:text-[14.5px] font-bold text-foreground/95 leading-snug hover:text-primary transition-colors line-clamp-2 block"
                          title={item.title}
                        >
                          {item.title}
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedArticle(item)}
                          className="text-left text-[13.5px] sm:text-[14.5px] font-bold text-foreground/95 leading-snug hover:text-primary transition-colors line-clamp-2 cursor-pointer"
                          title={item.title}
                        >
                          {item.title}
                        </button>
                      )}
                    </div>

                    {/* Dòng 3: Thời gian, Nguồn tin, Lượt tương tác (Like & Comment) & Nút mở */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2.5">
                        {/* Thời gian hiển thị */}
                        <span className="font-medium text-foreground/75">
                          {item.formattedTime || item.publishedAt}
                        </span>

                        {/* Nguồn báo / sở */}
                        {item.source && (
                          <>
                            <span className="text-border">•</span>
                            <span className="text-muted-foreground/90 font-medium">
                              {item.source}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Tương tác Like, Comment và Chi tiết (Phong cách mạng xã hội đầu tư FireAnt) */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {/* Nút Like tương tác */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleLike(item.id, e)}
                          title={eng.isLiked ? 'Bỏ thích bài viết' : 'Thích bài viết này'}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-all cursor-pointer active:scale-95',
                            eng.isLiked
                              ? 'text-sky-500 bg-sky-500/15 border border-sky-500/30 font-bold'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                          )}
                        >
                          <ThumbsUp className={cn('size-3.5', eng.isLiked && 'fill-sky-500')} />
                          <span>{eng.likesCount > 0 ? eng.likesCount : 'Thích'}</span>
                        </button>

                        {/* Nút Bình luận tương tác (bấm để mở modal thảo luận) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedArticle(item)
                            setTimeout(() => {
                              commentInputRef.current?.focus()
                            }, 250)
                          }}
                          title="Xem và gửi bình luận"
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer active:scale-95"
                        >
                          <MessageSquare className="size-3.5" />
                          <span>{eng.commentsCount > 0 ? eng.commentsCount : 'Bình luận'}</span>
                        </button>

                        {/* Nút đọc nhanh Popup */}
                        <button
                          type="button"
                          onClick={() => setSelectedArticle(item)}
                          className="inline-flex items-center gap-1 rounded-md bg-muted/60 hover:bg-muted px-2 py-1 text-[11px] font-medium text-foreground transition-colors cursor-pointer"
                        >
                          <Eye className="size-3" />
                          <span>Chi tiết</span>
                        </button>

                        {/* Nút mở liên kết ngoài */}
                        {item.link && item.link.startsWith('http') ? (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline ml-1"
                          >
                            <span>{isDisclosure ? 'Văn bản' : 'Link báo'}</span>
                            <ArrowUpRight className="size-3" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60 ml-1">
                            {isDisclosure ? 'Chưa có file' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Nút tải thêm nếu còn bài */}
        {filteredItems.length > visibleCount && (
          <div className="border-t border-border/60 bg-muted/20 p-4 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 15)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-all cursor-pointer"
            >
              <span>Xem thêm bài viết ({filteredItems.length - visibleCount} bài còn lại)</span>
            </button>
          </div>
        )}
      </div>

      {/* ── 3. POPUP MODAL ĐỌC NHANH CHI TIẾT BÀI VIẾT + KHU VỰC BÌNH LUẬN & LIKE (FIREANT STYLE) ── */}
      {selectedArticle && (() => {
        const currentEng = engagements[selectedArticle.id] || {
          articleId: selectedArticle.id,
          likesCount: 0,
          commentsCount: 0,
          isLiked: false,
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-in fade-in-50 duration-150">
            <div
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="flex items-start justify-between gap-3 border-b border-border pb-3.5">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedArticle.tickers.map((t, idx) => (
                      <span
                        key={idx}
                        className="rounded bg-secondary px-2 py-0.5 font-mono text-xs font-bold text-foreground"
                      >
                        {t.ticker}
                        {t.changePercent != null && (
                          <span
                            className={cn(
                              'ml-1 text-[11px]',
                              t.changePercent < 0 ? 'text-rose-500' : 'text-emerald-500'
                            )}
                          >
                            {t.changePercent > 0 ? `+${t.changePercent}%` : `${t.changePercent}%`}
                          </span>
                        )}
                      </span>
                    ))}

                    <span className="rounded bg-primary/10 border border-primary/25 px-2 py-0.5 text-xs font-semibold text-primary">
                      {selectedArticle.categoryLabel}
                    </span>

                    {selectedArticle.isImportant && (
                      <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                        ⚡ Nhạy cảm giá
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                    <Calendar className="size-3.5" />
                    <span>{selectedArticle.formattedTime || selectedArticle.publishedAt}</span>
                    <span>•</span>
                    <span className="font-semibold text-foreground/80">{selectedArticle.source}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedArticle(null)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
                  title="Đóng (ESC)"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Nội dung tiêu đề */}
              <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-black text-foreground leading-snug">
                  {selectedArticle.title}
                </h3>

                {/* Ảnh đại diện nếu có */}
                {selectedArticle.imageUrl && (
                  <div className="relative w-full max-h-72 overflow-hidden rounded-xl border border-border bg-muted/30">
                    <img
                      src={selectedArticle.imageUrl}
                      alt={selectedArticle.title}
                      className="size-full max-h-72 object-contain mx-auto"
                    />
                  </div>
                )}

                {/* Tóm tắt nội dung */}
                <div className="rounded-xl border border-border/80 bg-muted/30 p-4 text-xs sm:text-sm text-foreground/90 leading-relaxed space-y-2">
                  <div className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Nội dung tóm tắt & Trích yếu
                  </div>
                  <p>
                    {selectedArticle.summary ||
                      'Thông tin chi tiết về sự kiện công bố hoặc bài viết phân tích của doanh nghiệp. Bạn có thể mở liên kết gốc bên dưới để xem toàn văn văn bản hoặc bản tin đầy đủ từ nguồn chính thức.'}
                  </p>
                </div>
              </div>

              {/* ── THANH TƯƠNG TÁC THÍCH & BÌNH LUẬN KIỂU MẠNG XÃ HỘI FIREANT ── */}
              <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 px-3.5 rounded-xl border border-border/70 bg-muted/25">
                <div className="flex items-center gap-2">
                  {/* Nút Thích to nổi bật */}
                  <button
                    type="button"
                    onClick={() => handleToggleLike(selectedArticle.id)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95',
                      currentEng.isLiked
                        ? 'bg-sky-500/15 text-sky-500 border border-sky-500/30'
                        : 'bg-muted/60 text-muted-foreground border border-border/60 hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <ThumbsUp className={cn('size-4', currentEng.isLiked && 'fill-sky-500')} />
                    <span>{currentEng.isLiked ? 'Đã thích' : 'Thích'}</span>
                    <span className="ml-0.5 rounded-md bg-background/60 px-1.5 py-0.5 text-[11px] font-black">
                      {currentEng.likesCount}
                    </span>
                  </button>

                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">
                    <MessageSquare className="size-4" />
                    <span>{currentEng.commentsCount} thảo luận</span>
                  </div>
                </div>

                {selectedArticle.link && selectedArticle.link.startsWith('http') && (
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedArticle.link)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check className="size-3.5 text-emerald-500" /> : <Share2 className="size-3.5" />}
                    <span>{copiedLink ? 'Đã sao chép' : 'Chia sẻ'}</span>
                  </button>
                )}
              </div>

              {/* ── KHU VỰC THẢO LUẬN & BÌNH LUẬN ── */}
              <div id="article-comments-section" className="space-y-3 pt-1">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <MessageSquare className="size-3.5 text-sky-500" />
                    <span>Ý kiến cộng đồng ({currentEng.commentsCount})</span>
                  </h4>
                  <span className="text-[11px] text-muted-foreground">Thảo luận theo thời gian thực</span>
                </div>

                {/* Khung nhập bình luận nếu đã đăng nhập */}
                {currentUser ? (
                  <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 font-bold text-xs border border-sky-500/30">
                        {(currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase()}
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {currentUser.name || currentUser.email?.split('@')[0] || 'Bạn'}
                      </span>
                    </div>
                    <div className="relative">
                      <textarea
                        ref={commentInputRef}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Viết bình luận, chia sẻ góc nhìn hoặc đặt câu hỏi về tin này..."
                        rows={2}
                        maxLength={2000}
                        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault()
                            handleAddComment()
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[10.5px] text-muted-foreground/70">
                        Nhấn Ctrl + Enter để gửi nhanh
                      </span>
                      <button
                        type="button"
                        disabled={!commentText.trim() || submittingComment}
                        onClick={handleAddComment}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 px-3.5 py-1.5 text-xs font-bold text-white transition-all cursor-pointer shadow-xs disabled:cursor-not-allowed active:scale-95"
                      >
                        {submittingComment ? (
                          <span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Send className="size-3.5" />
                        )}
                        <span>Gửi bình luận</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Đăng nhập để tham gia bình luận & thảo luận
                      </p>
                      <p className="text-[11px] text-muted-foreground pt-0.5">
                        Chia sẻ góc nhìn phân tích hoặc đặt câu hỏi với cộng đồng nhà đầu tư.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthModalTitle('Đăng nhập để bình luận')
                        setAuthModalSubtitle('Đăng nhập tài khoản để viết bình luận và tương tác với tin tức cổ phiếu')
                        setAuthModalOpen(true)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 px-3.5 py-1.5 text-xs font-bold text-white transition-all cursor-pointer shadow-xs whitespace-nowrap active:scale-95"
                    >
                      <LogIn className="size-3.5" />
                      <span>Đăng nhập ngay</span>
                    </button>
                  </div>
                )}

                {/* Danh sách bình luận đã gửi */}
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {loadingComments ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      <span className="inline-block size-4 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mr-2" />
                      Đang tải thảo luận...
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/80 p-5 text-center text-xs text-muted-foreground">
                      Chưa có bình luận nào cho bài viết này. Hãy là người đầu tiên chia sẻ nhận định!
                    </div>
                  ) : (
                    comments.map((cmt) => {
                      const isOwner =
                        currentUser &&
                        (currentUser.id === cmt.userId || currentUser.email === cmt.userEmail)
                      const initial = (cmt.userName || cmt.userEmail || 'U').charAt(0).toUpperCase()

                      return (
                        <div
                          key={cmt.id}
                          className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-3 text-xs group/cmt hover:border-border transition-colors"
                        >
                          {cmt.userAvatar ? (
                            <img
                              src={cmt.userAvatar}
                              alt={cmt.userName}
                              className="size-7 shrink-0 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                              {initial}
                            </span>
                          )}

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-foreground truncate max-w-[150px]">
                                  {cmt.userName}
                                </span>
                                {isOwner && (
                                  <span className="rounded bg-sky-500/15 px-1.5 py-0.2 text-[9px] font-semibold text-sky-400">
                                    Bạn
                                  </span>
                                )}
                                <span className="text-[10.5px] text-muted-foreground">
                                  • {formatRelativeTime(cmt.createdAt)}
                                </span>
                              </div>

                              {isOwner && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(cmt.id)}
                                  title="Xóa bình luận"
                                  className="opacity-0 group-hover/cmt:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-rose-400 rounded cursor-pointer"
                                >
                                  <Trash2 className="size-3" />
                                </button>
                              )}
                            </div>

                            <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap break-words text-[12px]">
                              {cmt.content}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Nút hành động chân modal */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-border">
                {selectedArticle.link && selectedArticle.link.startsWith('http') ? (
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedArticle.link)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/50 px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check className="size-3.5 text-emerald-500" /> : <Share2 className="size-3.5" />}
                    <span>{copiedLink ? 'Đã sao chép link' : 'Sao chép link'}</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedArticle(null)}
                    className="rounded-xl border border-border bg-muted/40 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>

                  {selectedArticle.link && selectedArticle.link.startsWith('http') && (
                    <a
                      href={selectedArticle.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
                    >
                      <span>
                        {selectedArticle.type === 'disclosure'
                          ? 'Mở văn bản gốc (Sở GDCK)'
                          : 'Đọc bài gốc trên báo'}
                      </span>
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal đăng nhập khi người dùng thao tác like hoặc comment mà chưa đăng nhập */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        title={authModalTitle}
        subtitle={authModalSubtitle}
      />
    </div>
  )
}
