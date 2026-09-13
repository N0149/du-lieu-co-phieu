'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  MessageSquare,
  ThumbsUp,
  Share2,
  Send,
  Trash2,
  Sparkles,
  Lightbulb,
  Edit3,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  LogIn,
  AlertCircle,
  MoreHorizontal,
  ChevronDown,
  Flame,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { AuthModal } from '@/components/auth/AuthModal'
import type {
  CommunityPost,
  CommunityComment,
  MarketSentiment,
} from '@/lib/stock-community-service'

interface StockCommunityTabProps {
  symbol: string
  companyName?: string
  currentPrice?: number | null
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

export function StockCommunityTab({
  symbol,
  companyName,
  currentPrice,
}: StockCommunityTabProps) {
  const ticker = symbol.toUpperCase().trim()

  // Danh sách bài viết & trạng thái tải
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'newest' | 'most_liked'>('newest')

  // Quản lý người dùng & Modal đăng nhập
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalTitle, setAuthModalTitle] = useState('Đăng nhập tài khoản')
  const [authModalSubtitle, setAuthModalSubtitle] = useState(
    'Đăng nhập để tham gia thảo luận và đăng bài phân tích cùng cộng đồng'
  )

  // Modal tạo bài viết mới
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newSentiment, setNewSentiment] = useState<MarketSentiment | ''>('bullish')
  const [newTickersInput, setNewTickersInput] = useState(ticker)
  const [submittingPost, setSubmittingPost] = useState(false)

  // Quản lý bình luận mở rộng từng bài viết (Map postId -> { open, comments, loading, text, submitting })
  const [expandedComments, setExpandedComments] = useState<
    Record<
      string,
      {
        open: boolean
        comments: CommunityComment[]
        loading: boolean
        text: string
        submitting: boolean
      }
    >
  >({})

  const [copiedId, setCopiedId] = useState<string | null>(null)

  // 1. Khởi tạo phiên đăng nhập người dùng (Supabase / Cookie Session)
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
          try {
            const res = await fetch('/api/auth/session')
            if (res.ok) {
              const data = await res.json()
              if (data?.user) setCurrentUser(data.user)
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
          if (!cancelled && data?.user) setCurrentUser(data.user)
        })
        .catch(() => {})
    }
  }, [])

  // 2. Tải danh sách bài đăng cộng đồng
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function loadPosts() {
      try {
        const supabase = createClient()
        const session = (await supabase?.auth.getSession())?.data?.session
        const token = session?.access_token

        const res = await fetch(
          `/api/stock/${encodeURIComponent(ticker)}/community?sort=${sortBy}`,
          {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        )

        if (!cancelled && res.ok) {
          const data = await res.json()
          if (data.success && data.data) {
            setPosts(data.data)
          }
        }
      } catch (err) {
        console.error('[StockCommunityTab] Lỗi tải bài viết:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPosts()

    return () => {
      cancelled = true
    }
  }, [ticker, sortBy, currentUser?.id])

  // 3. Xử lý Thích / Bỏ thích bài đăng (Optimistic Update)
  const handleToggleLike = async (postId: string) => {
    if (!currentUser) {
      setAuthModalTitle('Đăng nhập để thích bài viết')
      setAuthModalSubtitle('Đăng nhập tài khoản để thả tim và tương tác với các phân tích của cộng đồng')
      setAuthModalOpen(true)
      return
    }

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p
        const nextIsLiked = !p.isLiked
        const nextLikesCount = nextIsLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1)
        return {
          ...p,
          isLiked: nextIsLiked,
          likesCount: nextLikesCount,
        }
      })
    )

    try {
      const supabase = createClient()
      const session = (await supabase?.auth.getSession())?.data?.session
      const token = session?.access_token

      const res = await fetch(`/api/community/${encodeURIComponent(postId)}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!res.ok) {
        if (res.status === 401) {
          setAuthModalTitle('Đăng nhập để thích bài viết')
          setAuthModalSubtitle('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.')
          setAuthModalOpen(true)
        }
        throw new Error('Lỗi like')
      }

      const data = await res.json()
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, isLiked: data.liked, likesCount: data.likesCount }
              : p
          )
        )
      }
    } catch (err) {
      console.error('[StockCommunityTab] Lỗi toggle like:', err)
      // Rollback
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p
          const nextIsLiked = !p.isLiked
          const nextLikesCount = nextIsLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1)
          return {
            ...p,
            isLiked: nextIsLiked,
            likesCount: nextLikesCount,
          }
        })
      )
    }
  }

  // 4. Mở / Đóng khu vực bình luận inline của bài viết
  const handleToggleComments = async (postId: string) => {
    const current = expandedComments[postId]
    if (current && current.open) {
      setExpandedComments((prev) => ({
        ...prev,
        [postId]: { ...current, open: false },
      }))
      return
    }

    // Đang mở ra: nếu chưa tải bình luận thì fetch từ API
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: {
        open: true,
        comments: current?.comments || [],
        loading: !current?.comments || current.comments.length === 0,
        text: current?.text || '',
        submitting: false,
      },
    }))

    try {
      const res = await fetch(`/api/community/${encodeURIComponent(postId)}/comments`)
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          setExpandedComments((prev) => ({
            ...prev,
            [postId]: {
              ...prev[postId],
              comments: data.data,
              loading: false,
            },
          }))
        }
      }
    } catch (err) {
      console.error('[StockCommunityTab] Lỗi tải bình luận bài:', err)
      setExpandedComments((prev) => ({
        ...prev,
        [postId]: { ...prev[postId], loading: false },
      }))
    }
  }

  // 5. Gửi bình luận vào bài đăng
  const handleAddComment = async (postId: string) => {
    const slot = expandedComments[postId]
    const text = (slot?.text || '').trim()
    if (!text) return

    if (!currentUser) {
      setAuthModalTitle('Đăng nhập để bình luận')
      setAuthModalSubtitle('Đăng nhập tài khoản để viết bình luận và thảo luận cùng tác giả')
      setAuthModalOpen(true)
      return
    }

    setExpandedComments((prev) => ({
      ...prev,
      [postId]: { ...prev[postId], submitting: true },
    }))

    try {
      const supabase = createClient()
      const session = (await supabase?.auth.getSession())?.data?.session
      const token = session?.access_token

      const res = await fetch(`/api/community/${encodeURIComponent(postId)}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: text }),
      })

      const data = await res.json()
      if (data.success && data.data) {
        setExpandedComments((prev) => ({
          ...prev,
          [postId]: {
            ...prev[postId],
            comments: [...prev[postId].comments, data.data],
            text: '',
            submitting: false,
          },
        }))

        // Tăng đếm commentsCount trên bài viết
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, commentsCount: data.commentsCount ?? p.commentsCount + 1 }
              : p
          )
        )
      } else {
        alert(data.error || 'Không thể gửi bình luận.')
        setExpandedComments((prev) => ({
          ...prev,
          [postId]: { ...prev[postId], submitting: false },
        }))
      }
    } catch (err) {
      console.error('[StockCommunityTab] Lỗi gửi comment:', err)
      setExpandedComments((prev) => ({
        ...prev,
        [postId]: { ...prev[postId], submitting: false },
      }))
    }
  }

  // 6. Xóa bình luận bài đăng
  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return

    try {
      const supabase = createClient()
      const session = (await supabase?.auth.getSession())?.data?.session
      const token = session?.access_token

      const res = await fetch(
        `/api/community/${encodeURIComponent(postId)}/comments?commentId=${encodeURIComponent(commentId)}`,
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
        setExpandedComments((prev) => ({
          ...prev,
          [postId]: {
            ...prev[postId],
            comments: prev[postId].comments.filter((c) => c.id !== commentId),
          },
        }))

        // Giảm commentsCount
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, commentsCount: Math.max(0, data.commentsCount ?? p.commentsCount - 1) }
              : p
          )
        )
      } else {
        alert(data.error || 'Không thể xóa bình luận.')
      }
    } catch (err) {
      console.error('[StockCommunityTab] Lỗi xóa comment:', err)
    }
  }

  // 7. Xóa bài đăng (chỉ tác giả)
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Bạn có chắc muốn xóa bài đăng phân tích này?')) return

    try {
      const supabase = createClient()
      const session = (await supabase?.auth.getSession())?.data?.session
      const token = session?.access_token

      const res = await fetch(
        `/api/stock/${encodeURIComponent(ticker)}/community?postId=${encodeURIComponent(postId)}`,
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
        setPosts((prev) => prev.filter((p) => p.id !== postId))
      } else {
        alert(data.error || 'Không thể xóa bài đăng.')
      }
    } catch (err) {
      console.error('[StockCommunityTab] Lỗi xóa post:', err)
    }
  }

  // 8. Đăng bài phân tích mới
  const handleCreatePost = async () => {
    const text = newContent.trim()
    if (!text) {
      alert('Vui lòng nhập nội dung phân tích bài viết.')
      return
    }

    if (!currentUser) {
      setAuthModalTitle('Đăng nhập để đăng bài')
      setAuthModalSubtitle('Đăng nhập tài khoản để chia sẻ góc nhìn và thảo luận cùng cộng đồng')
      setAuthModalOpen(true)
      return
    }

    setSubmittingPost(true)
    try {
      const supabase = createClient()
      const session = (await supabase?.auth.getSession())?.data?.session
      const token = session?.access_token

      const tickers = newTickersInput
        .split(/[,;\s]+/)
        .map((t) => t.toUpperCase().trim())
        .filter((t) => t.length >= 3 && t.length <= 5)

      const payload = {
        title: newTitle.trim() || undefined,
        content: text,
        sentiment: newSentiment || null,
        tickers: tickers.length > 0 ? tickers : [ticker],
      }

      const res = await fetch(`/api/stock/${encodeURIComponent(ticker)}/community`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (data.success && data.data) {
        setPosts((prev) => [data.data, ...prev])
        setCreateModalOpen(false)
        setNewTitle('')
        setNewContent('')
        setNewSentiment('bullish')
        setNewTickersInput(ticker)
      } else {
        alert(data.error || 'Có lỗi xảy ra khi đăng bài.')
      }
    } catch (err) {
      console.error('[StockCommunityTab] Lỗi tạo bài:', err)
      alert('Không thể kết nối máy chủ. Vui lòng thử lại sau.')
    } finally {
      setSubmittingPost(false)
    }
  }

  const handleShare = (postId: string) => {
    if (typeof window !== 'undefined') {
      const shareUrl = `${window.location.origin}/stock/${encodeURIComponent(ticker)}?tab=community#${postId}`
      navigator.clipboard.writeText(shareUrl)
      setCopiedId(postId)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  return (
    <div className="space-y-4">
      {/* ── BỐ CỤC 2 CỘT CHUẨN FIREANT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ════ CỘT TRÁI (8 COLS): FEED BÀI VIẾT CỘNG ĐỒNG ════ */}
        <div className="lg:col-span-8 space-y-4">
          {/* Thanh công cụ lọc & Sắp xếp bài viết */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSortBy('newest')}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                  sortBy === 'newest'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                Mới nhất
              </button>

              <button
                type="button"
                onClick={() => setSortBy('most_liked')}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                  sortBy === 'most_liked'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                Nhiều tương tác nhất
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {posts.length} bài thảo luận
              </span>

              {/* Nút đăng bài nhanh hiển thị trên mobile */}
              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    setAuthModalTitle('Đăng nhập để đăng bài')
                    setAuthModalSubtitle('Đăng nhập để viết bài phân tích và thảo luận cùng cộng đồng')
                    setAuthModalOpen(true)
                  } else {
                    setCreateModalOpen(true)
                  }
                }}
                className="inline-flex lg:hidden items-center gap-1 rounded-xl bg-sky-500 hover:bg-sky-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <Edit3 className="size-3.5" />
                <span>Đăng bài</span>
              </button>
            </div>
          </div>

          {/* Hộp viết bài nhanh (Quick post prompt) */}
          <div
            onClick={() => {
              if (!currentUser) {
                setAuthModalTitle('Đăng nhập để đăng bài')
                setAuthModalSubtitle('Đăng nhập để viết bài phân tích và thảo luận cùng cộng đồng')
                setAuthModalOpen(true)
              } else {
                setCreateModalOpen(true)
              }
            }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-xs hover:border-border/80 transition-colors cursor-pointer group/prompt"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-400 font-bold text-sm border border-sky-500/25">
              {(currentUser?.name || currentUser?.email || ticker).charAt(0).toUpperCase()}
            </span>
            <div className="flex-1 rounded-xl bg-muted/40 px-3.5 py-2 text-xs text-muted-foreground group-hover/prompt:bg-muted/60 transition-colors">
              Chia sẻ đánh giá, nhận định của bạn về mã {ticker}...
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Edit3 className="size-3.5" />
              <span>Đăng bài</span>
            </button>
          </div>

          {/* Danh sách các bài đăng cộng đồng */}
          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center text-xs text-muted-foreground shadow-xs">
              <span className="inline-block size-5 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mr-2" />
              Đang tải thảo luận cộng đồng mã {ticker}...
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-xs">
              <MessageSquare className="size-10 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm font-semibold text-foreground">Chưa có bài viết phân tích nào về {ticker}</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Hãy là người đầu tiên đưa ra nhận định, chia sẻ thông tin kỹ thuật hoặc định giá về cổ phiếu này!
              </p>
              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    setAuthModalTitle('Đăng nhập để đăng bài')
                    setAuthModalSubtitle('Đăng nhập để viết bài phân tích và thảo luận cùng cộng đồng')
                    setAuthModalOpen(true)
                  } else {
                    setCreateModalOpen(true)
                  }
                }}
                className="inline-flex items-center gap-1.5 mt-4 rounded-xl bg-sky-500 hover:bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <Edit3 className="size-3.5" />
                <span>Viết bài ngay</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {posts.map((post) => {
                const isOwner = currentUser && (currentUser.id === post.userId || currentUser.email === post.userEmail)
                const initial = (post.userName || post.userEmail || 'U').charAt(0).toUpperCase()
                const cmtSlot = expandedComments[post.id]

                return (
                  <div
                    key={post.id}
                    id={post.id}
                    className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3 transition-colors hover:border-border/80"
                  >
                    {/* Header bài đăng: Avatar, Tên tác giả, Thời gian, Sentiment, Tùy chọn */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        {post.userAvatar ? (
                          <img
                            src={post.userAvatar}
                            alt={post.userName}
                            className="size-9 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-sky-500/20 text-sky-400 font-black text-xs border border-sky-500/30">
                            {initial}
                          </span>
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-[13px] font-black text-foreground">
                              {post.userName}
                            </span>
                            {isOwner && (
                              <span className="rounded bg-sky-500/15 px-1.5 py-0.2 text-[9.5px] font-bold text-sky-400">
                                Bạn
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span>{formatRelativeTime(post.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Nhãn khuyến nghị / xu hướng nhận định */}
                        {post.sentiment === 'bullish' && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="size-3" />
                            <span>Tích cực / Mua</span>
                          </span>
                        )}
                        {post.sentiment === 'neutral' && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            <Minus className="size-3" />
                            <span>Theo dõi</span>
                          </span>
                        )}
                        {post.sentiment === 'bearish' && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            <TrendingDown className="size-3" />
                            <span>Thận trọng / Bán</span>
                          </span>
                        )}

                        {/* Nút xóa bài nếu là chính chủ */}
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                            title="Xóa bài viết này"
                            className="p-1 text-muted-foreground hover:text-rose-400 transition-colors rounded cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tiêu đề bài viết nếu có */}
                    {post.title && (
                      <h4 className="text-[13.5px] sm:text-sm font-black text-foreground leading-snug">
                        {post.title}
                      </h4>
                    )}

                    {/* Nội dung bài viết */}
                    <p className="text-xs sm:text-[13px] text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
                      {post.content}
                    </p>

                    {/* Ảnh đính kèm nếu có */}
                    {post.imageUrl && (
                      <div className="relative max-h-80 overflow-hidden rounded-xl border border-border bg-muted/20">
                        <img
                          src={post.imageUrl}
                          alt={post.title || 'Ảnh bài viết'}
                          className="size-full object-contain max-h-80 mx-auto"
                        />
                      </div>
                    )}

                    {/* Thẻ mã cổ phiếu liên quan (gắn tags chuẩn FireAnt) */}
                    {post.tickers && post.tickers.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {post.tickers.map((t, idx) => (
                          <Link
                            key={`${t}-${idx}`}
                            href={`/stock/${encodeURIComponent(t)}?tab=community`}
                            className="inline-flex items-center rounded-md bg-secondary/80 hover:bg-secondary px-2 py-0.5 font-mono text-[10.5px] font-bold text-foreground transition-colors"
                          >
                            <span>#{t}</span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Dòng thống kê số lượt thích và bình luận (chuẩn FireAnt: "2 thích   6 bình luận") */}
                    <div className="flex items-center justify-between border-t border-border/60 pt-2.5 text-[11px] text-muted-foreground">
                      <span>{post.likesCount} thích</span>
                      <button
                        type="button"
                        onClick={() => handleToggleComments(post.id)}
                        className="hover:underline cursor-pointer"
                      >
                        {post.commentsCount} bình luận
                      </button>
                    </div>

                    {/* Thanh nút hành động tương tác: Thích | Bình luận | Chia sẻ */}
                    <div className="grid grid-cols-3 gap-1 border-t border-border/60 pt-1.5">
                      {/* Nút Thích */}
                      <button
                        type="button"
                        onClick={() => handleToggleLike(post.id)}
                        className={cn(
                          'inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer active:scale-95',
                          post.isLiked
                            ? 'text-sky-500 bg-sky-500/10 font-black'
                            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                        )}
                      >
                        <ThumbsUp className={cn('size-4', post.isLiked && 'fill-sky-500')} />
                        <span>{post.isLiked ? 'Đã thích' : 'Thích'}</span>
                      </button>

                      {/* Nút Bình luận (Mở rộng khu vực bình luận) */}
                      <button
                        type="button"
                        onClick={() => handleToggleComments(post.id)}
                        className={cn(
                          'inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors cursor-pointer active:scale-95',
                          cmtSlot?.open
                            ? 'text-foreground bg-muted/80'
                            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                        )}
                      >
                        <MessageSquare className="size-4" />
                        <span>Bình luận</span>
                      </button>

                      {/* Nút Chia sẻ link */}
                      <button
                        type="button"
                        onClick={() => handleShare(post.id)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors cursor-pointer active:scale-95"
                      >
                        {copiedId === post.id ? (
                          <>
                            <Check className="size-4 text-emerald-500" />
                            <span className="text-emerald-500">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="size-4" />
                            <span>Chia sẻ</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* ── KHU VỰC BÌNH LUẬN MỞ RỘNG DƯỚI BÀI VIẾT (INLINE COMMENTS) ── */}
                    {cmtSlot?.open && (
                      <div className="pt-2 border-t border-border/60 space-y-3">
                        {/* Khung gõ bình luận */}
                        <div className="flex items-start gap-2.5">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-400 font-bold text-xs border border-sky-500/25 mt-0.5">
                            {(currentUser?.name || currentUser?.email || 'U').charAt(0).toUpperCase()}
                          </span>

                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="relative">
                              <textarea
                                value={cmtSlot.text || ''}
                                onChange={(e) => {
                                  const val = e.target.value
                                  setExpandedComments((prev) => ({
                                    ...prev,
                                    [post.id]: { ...prev[post.id], text: val },
                                  }))
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleAddComment(post.id)
                                  }
                                }}
                                placeholder="Viết phản hồi cho bài này... (Enter để gửi)"
                                rows={2}
                                maxLength={2000}
                                className="w-full resize-none rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground/70">
                                Nhấn Enter để gửi phản hồi
                              </span>
                              <button
                                type="button"
                                disabled={!cmtSlot.text?.trim() || cmtSlot.submitting}
                                onClick={() => handleAddComment(post.id)}
                                className="inline-flex items-center gap-1 rounded-lg bg-sky-500 hover:bg-sky-600 disabled:opacity-50 px-3 py-1 text-xs font-bold text-white transition-all cursor-pointer shadow-xs disabled:cursor-not-allowed"
                              >
                                {cmtSlot.submitting ? (
                                  <span className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <Send className="size-3" />
                                )}
                                <span>Gửi</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Danh sách bình luận đã có */}
                        {cmtSlot.loading ? (
                          <div className="py-3 text-center text-xs text-muted-foreground">
                            <span className="inline-block size-3.5 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mr-1.5" />
                            Đang tải thảo luận...
                          </div>
                        ) : cmtSlot.comments.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground/80 italic py-1">
                            Chưa có bình luận nào. Hãy là người đầu tiên phản hồi bài viết này!
                          </p>
                        ) : (
                          <div className="space-y-2 pt-1">
                            {cmtSlot.comments.map((comment) => {
                              const isCommentOwner =
                                currentUser &&
                                (currentUser.id === comment.userId ||
                                  currentUser.email === comment.userEmail)

                              return (
                                <div
                                  key={comment.id}
                                  className="flex items-start gap-2 rounded-xl bg-muted/30 p-2.5 text-xs group/item"
                                >
                                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground font-bold text-[10px] mt-0.5">
                                    {(comment.userName || 'U').charAt(0).toUpperCase()}
                                  </span>

                                  <div className="min-w-0 flex-1 space-y-0.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-foreground">
                                          {comment.userName}
                                        </span>
                                        {isCommentOwner && (
                                          <span className="rounded bg-sky-500/15 px-1 text-[9px] font-semibold text-sky-400">
                                            Bạn
                                          </span>
                                        )}
                                        <span className="text-[10px] text-muted-foreground">
                                          • {formatRelativeTime(comment.createdAt)}
                                        </span>
                                      </div>

                                      {isCommentOwner && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteComment(post.id, comment.id)}
                                          title="Xóa bình luận này"
                                          className="opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-rose-400 cursor-pointer"
                                        >
                                          <Trash2 className="size-3" />
                                        </button>
                                      )}
                                    </div>
                                    <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap break-words text-[11.5px]">
                                      {comment.content}
                                    </p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ════ CỘT PHẢI (4 COLS): WIDGET CHIA SẺ Ý KIẾN CHUẨN FIREANT ════ */}
        <div className="lg:col-span-4 space-y-4">
          {/* Widget 1: "Chia sẻ ý kiến" (Chuẩn thiết kế hộp bóng đèn 💡 của FireAnt) */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs text-center space-y-4">
            <div className="flex size-14 mx-auto items-center justify-center rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/25 shadow-xs">
              <Lightbulb className="size-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-foreground">Chia sẻ ý kiến</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Bạn hãy đưa ra đánh giá, nhận định của mình về mã chứng khoán {ticker}.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!currentUser) {
                  setAuthModalTitle('Đăng nhập để đăng bài')
                  setAuthModalSubtitle('Đăng nhập tài khoản để chia sẻ nhận định và phân tích của bạn')
                  setAuthModalOpen(true)
                } else {
                  setCreateModalOpen(true)
                }
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Edit3 className="size-4" />
              <span>Đăng bài</span>
            </button>
          </div>

          {/* Widget 2: Thông tin nhanh cổ phiếu đang xem */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Mã cổ phiếu
              </span>
              <span className="font-mono text-sm font-black text-foreground">{ticker}</span>
            </div>

            {companyName && (
              <div className="text-xs text-foreground/90 font-medium leading-snug">
                {companyName}
              </div>
            )}

            {currentPrice != null && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">Thị giá hiện tại</span>
                <span className="font-mono text-xs font-extrabold text-foreground">
                  {currentPrice.toLocaleString('vi-VN')} đ
                </span>
              </div>
            )}
          </div>

          {/* Widget 3: Quy tắc cộng đồng nhà đầu tư */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-2.5 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <ShieldCheck className="size-4 text-emerald-500" />
              <span>Quy tắc thảo luận văn minh</span>
            </div>
            <ul className="space-y-1.5 text-muted-foreground leading-relaxed text-[11px] list-disc list-inside">
              <li>Đưa ra nhận định dựa trên số liệu & góc nhìn khách quan.</li>
              <li>Tôn trọng các góc nhìn trái chiều của cộng đồng.</li>
              <li>Không đăng tin giả, khuyến nghị lôi kéo hoặc spam link.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── MODAL ĐĂNG BÀI PHÂN TÍCH MỚI ── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-in fade-in-50 duration-150">
          <div
            className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="size-4 text-sky-500" />
                <h3 className="text-sm sm:text-base font-black text-foreground">
                  Chia sẻ nhận định - #{ticker}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Form nội dung */}
            <div className="space-y-3.5 text-xs">
              {/* Chọn góc nhìn xu hướng */}
              <div className="space-y-1.5">
                <label className="font-bold text-foreground block">Góc nhìn xu hướng</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewSentiment('bullish')}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-xl border py-2 font-bold transition-all cursor-pointer',
                      newSentiment === 'bullish'
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500 shadow-xs'
                        : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <TrendingUp className="size-3.5" />
                    <span>Tích cực / Mua</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewSentiment('neutral')}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-xl border py-2 font-bold transition-all cursor-pointer',
                      newSentiment === 'neutral'
                        ? 'border-amber-500 bg-amber-500/15 text-amber-500 shadow-xs'
                        : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <Minus className="size-3.5" />
                    <span>Theo dõi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewSentiment('bearish')}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-xl border py-2 font-bold transition-all cursor-pointer',
                      newSentiment === 'bearish'
                        ? 'border-rose-500 bg-rose-500/15 text-rose-500 shadow-xs'
                        : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <TrendingDown className="size-3.5" />
                    <span>Thận trọng / Bán</span>
                  </button>
                </div>
              </div>

              {/* Tiêu đề bài viết */}
              <div className="space-y-1">
                <label className="font-bold text-foreground block">
                  Tiêu đề nhận định <span className="text-muted-foreground font-normal">(tùy chọn)</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Phân tích kỹ thuật & điểm mua gom cổ phiếu..."
                  maxLength={200}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                />
              </div>

              {/* Nội dung chi tiết */}
              <div className="space-y-1">
                <label className="font-bold text-foreground block">
                  Nội dung phân tích <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Đưa ra luận điểm đầu tư, phân tích kỹ thuật, cập nhật kết quả kinh doanh hoặc tin tức liên quan..."
                  rows={6}
                  maxLength={3000}
                  className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                />
                <div className="text-right text-[10.5px] text-muted-foreground">
                  {newContent.length} / 3000 ký tự
                </div>
              </div>

              {/* Gắn thẻ mã cổ phiếu */}
              <div className="space-y-1">
                <label className="font-bold text-foreground block">
                  Gắn thẻ mã liên quan
                </label>
                <input
                  type="text"
                  value={newTickersInput}
                  onChange={(e) => setNewTickersInput(e.target.value)}
                  placeholder="Ví dụ: MWG, DGW, FRT"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground font-mono placeholder:text-muted-foreground/60 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30 uppercase"
                />
                <span className="text-[10px] text-muted-foreground block">
                  Cách nhau bởi dấu phẩy hoặc khoảng trắng.
                </span>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-xl border border-border bg-muted/40 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="button"
                disabled={!newContent.trim() || submittingPost}
                onClick={handleCreatePost}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 px-5 py-2 text-xs font-bold text-white shadow-xs transition-all cursor-pointer active:scale-95 disabled:cursor-not-allowed"
              >
                {submittingPost ? (
                  <span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Edit3 className="size-3.5" />
                )}
                <span>Đăng bài ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal đăng nhập */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        title={authModalTitle}
        subtitle={authModalSubtitle}
      />
    </div>
  )
}
