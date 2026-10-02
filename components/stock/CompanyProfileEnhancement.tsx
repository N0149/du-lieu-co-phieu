'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'
import type { CompanyFullProfileData } from '@/lib/company-profile-types'
import {
  Users,
  GitBranch,
  History,
  ChevronDown,
  ChevronUp,
  Globe,
  Landmark,
  PieChart as PieIcon,
  BellRing,
  Flame,
  Clock,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Search,
  Table,
  LayoutGrid,
  LayoutList,
  Filter,
  ArrowUpRight,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { InsiderTradingPriceChart } from './InsiderTradingPriceChart'

interface CompanyProfileEnhancementProps {
  symbol: string
  data: CompanyFullProfileData | null
}

function fmtNum(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN')
}

function parseTradeDate(dStr: string | null | undefined): Date | null {
  if (!dStr) return null
  const clean = dStr.trim()
  if (clean.includes('/')) {
    const parts = clean.split('/').map(Number)
    if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0])
  }
  if (clean.includes('-')) {
    const parts = clean.split('-').map(Number)
    if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2])
  }
  return null
}

function getDaysAgo(dateStr: string | null | undefined): number {
  const d = parseTradeDate(dateStr)
  if (!d || isNaN(d.getTime())) return 999
  const now = new Date()
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

export function CompanyProfileEnhancement({ symbol, data }: CompanyProfileEnhancementProps) {
  const [profileData, setProfileData] = useState<CompanyFullProfileData | null>(data)
  const [loading, setLoading] = useState(!data)
  const [showAllShareholders, setShowAllShareholders] = useState(false)
  const [showAllSubsidiaries, setShowAllSubsidiaries] = useState(false)
  const [dismissedBanner, setDismissedBanner] = useState(false)
  const [activeRegIndex, setActiveRegIndex] = useState(0)

  useEffect(() => {
    if (data) {
      setProfileData(data)
      setLoading(false)
      return
    }

    let isMounted = true
    setLoading(true)
    fetch(`/api/stock/${encodeURIComponent(symbol)}/profile`)
      .then((r) => r.json())
      .then((res) => {
        if (isMounted && res?.data) {
          setProfileData(res.data)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [symbol, data])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse p-6 rounded-2xl border border-border bg-card">
        <div className="h-6 w-48 rounded bg-muted/60" />
        <div className="h-40 rounded-xl bg-muted/40" />
      </div>
    )
  }

  if (!profileData) return null

  const { ownership, subsidiaries, insiderTrades } = profileData

  // 1. Cổ đông
  const allShareholders = ownership.shareholders || []
  const displayedShareholders = showAllShareholders ? allShareholders : allShareholders.slice(0, 8)

  // 2. Công ty con & liên kết
  const conList = subsidiaries.filter((s) => s.type === 'subsidiary')
  const lkList = subsidiaries.filter((s) => s.type === 'associate')
  const displayedSubsidiaries = showAllSubsidiaries ? subsidiaries : subsidiaries.slice(0, 6)

  // 3. Giao dịch nội bộ - Bộ lọc, Tìm kiếm, Phân trang & Chế độ xem
  const [tradeFilter, setTradeFilter] = useState<'ALL' | 'BUY' | 'SELL' | 'PENDING'>('ALL')
  const [tradeSearch, setTradeSearch] = useState('')
  const [tradeViewMode, setTradeViewMode] = useState<'table' | 'cards'>('table')
  const [tradePageSize, setTradePageSize] = useState<number>(10)
  const [tradePage, setTradePage] = useState(1)

  // Tổng hợp chỉ số KPI cho giao dịch nội bộ
  const tradeKpis = useMemo(() => {
    let totalBuyVol = 0
    let totalSellVol = 0
    let buyCount = 0
    let sellCount = 0
    let pendingCount = 0

    for (const t of insiderTrades || []) {
      const days = getDaysAgo(t.tradeDate)
      const isPending = t.volumeTraded === 0 && t.volumeRegistered > 0 && days <= 45
      if (isPending) {
        pendingCount++
      } else if (t.action === 'BUY' && t.volumeTraded > 0) {
        totalBuyVol += t.volumeTraded
        buyCount++
      } else if (t.action === 'SELL' && t.volumeTraded > 0) {
        totalSellVol += t.volumeTraded
        sellCount++
      }
    }

    return {
      totalBuyVol,
      totalSellVol,
      buyCount,
      sellCount,
      pendingCount,
      netVol: totalBuyVol - totalSellVol,
      totalCount: (insiderTrades || []).length,
    }
  }, [insiderTrades])

  // Lọc và tìm kiếm giao dịch
  const filteredTrades = useMemo(() => {
    return (insiderTrades || []).filter((t) => {
      const days = getDaysAgo(t.tradeDate)
      const isPending = t.volumeTraded === 0 && t.volumeRegistered > 0 && days <= 45

      // Lọc theo loại
      if (tradeFilter === 'BUY' && !(t.action === 'BUY' && (t.volumeTraded > 0 || isPending))) return false
      if (tradeFilter === 'SELL' && !(t.action === 'SELL' && (t.volumeTraded > 0 || isPending))) return false
      if (tradeFilter === 'PENDING' && !isPending) return false

      // Lọc theo từ khóa tìm kiếm
      if (tradeSearch.trim()) {
        const q = tradeSearch.toLowerCase().trim()
        const matchName = (t.traderName || '').toLowerCase().includes(q)
        const matchPos = (t.traderPosition || '').toLowerCase().includes(q)
        const matchLeader = (t.leaderName || '').toLowerCase().includes(q)
        const matchLeaderPos = (t.leaderPosition || '').toLowerCase().includes(q)
        if (!matchName && !matchPos && !matchLeader && !matchLeaderPos) return false
      }

      return true
    })
  }, [insiderTrades, tradeFilter, tradeSearch])

  // Phân trang
  const totalPages = tradePageSize === 0 ? 1 : Math.max(1, Math.ceil(filteredTrades.length / tradePageSize))
  const paginatedTrades = useMemo(() => {
    if (tradePageSize === 0) return filteredTrades
    const start = (tradePage - 1) * tradePageSize
    return filteredTrades.slice(start, start + tradePageSize)
  }, [filteredTrades, tradePage, tradePageSize])

  // 4. Bóc tách các giao dịch đang đăng ký mua/bán còn hiệu lực (trong vòng 45 ngày)
  const activeRegistrations = useMemo(() => {
    return (insiderTrades || []).filter((t) => {
      if (t.action !== 'BUY' && t.action !== 'SELL') return false
      if (t.volumeRegistered <= 0 || t.volumeTraded > 0) return false
      const days = getDaysAgo(t.tradeDate)
      return days >= 0 && days <= 45
    })
  }, [insiderTrades])

  // Giao dịch vừa hoàn tất gần đây (trong vòng 60 ngày)
  const recentCompletedTrades = useMemo(() => {
    return (insiderTrades || []).filter((t) => {
      if (t.action !== 'BUY' && t.action !== 'SELL') return false
      if (t.volumeTraded <= 0) return false
      const days = getDaysAgo(t.tradeDate)
      return days >= 0 && days <= 60
    })
  }, [insiderTrades])

  // Giao dịch mới nhất tổng thể
  const latestTrade = useMemo(() => {
    if (insiderTrades && insiderTrades.length > 0) return insiderTrades[0]
    return null
  }, [insiderTrades])

  return (
    <div className="w-full space-y-6">
      {/* ══════════════════════════════════════════════════════════ */}
      {/* 0. THÔNG BÁO GIAO DỊCH NGƯỜI NỘI BỘ (XỬ LÝ THÔNG MINH)   */}
      {/* ══════════════════════════════════════════════════════════ */}
      {!dismissedBanner && (
        <>
          {/* TRƯỜNG HỢP 1: Có giao dịch ĐANG TRONG THỜI HẠN ĐĂNG KÝ (< 45 ngày) */}
          {activeRegistrations.length > 0 ? (
            (() => {
              const currentReg = activeRegistrations[activeRegIndex] || activeRegistrations[0]
              const isBuy = currentReg.action === 'BUY'
              return (
                <div
                  className={cn(
                    'w-full rounded-2xl border p-4 sm:p-5 transition-all shadow-xs relative overflow-hidden',
                    isBuy
                      ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-card to-card dark:from-emerald-950/25'
                      : 'border-rose-500/40 bg-gradient-to-br from-rose-500/10 via-card to-card dark:from-rose-950/25'
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/50 pb-3 mb-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="relative flex size-2.5">
                        <span
                          className={cn(
                            'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                            isBuy ? 'bg-emerald-400' : 'bg-rose-400'
                          )}
                        />
                        <span
                          className={cn(
                            'relative inline-flex rounded-full size-2.5',
                            isBuy ? 'bg-emerald-500' : 'bg-rose-500'
                          )}
                        />
                      </span>

                      <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-foreground">
                        <BellRing className={cn('size-3.5', isBuy ? 'text-emerald-400' : 'text-rose-400')} />
                        <span>Thông Báo: Đang Trong Thời Hạn Đăng Ký Giao Dịch</span>
                      </span>

                      <span
                        className={cn(
                          'rounded-md px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide border',
                          isBuy
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        )}
                      >
                        {isBuy ? '⏳ ĐANG ĐĂNG KÝ MUA' : '⏳ ĐANG ĐĂNG KÝ BÁN'}
                      </span>

                      {activeRegistrations.length > 1 && (
                        <div className="flex items-center gap-1 bg-muted/60 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
                          <span>
                            {activeRegIndex + 1}/{activeRegistrations.length}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveRegIndex((prev) =>
                                prev > 0 ? prev - 1 : activeRegistrations.length - 1
                              )
                            }
                            className="hover:text-foreground px-0.5 cursor-pointer"
                            title="Lệnh trước"
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveRegIndex((prev) =>
                                prev < activeRegistrations.length - 1 ? prev + 1 : 0
                              )
                            }
                            className="hover:text-foreground px-0.5 cursor-pointer"
                            title="Lệnh tiếp theo"
                          >
                            ›
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="size-3" />
                        <span>Công bố: {currentReg.tradeDate}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDismissedBanner(true)}
                        className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors cursor-pointer"
                        title="Đóng thông báo"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="text-sm sm:text-base font-extrabold text-foreground leading-snug">
                        <span className="text-primary font-black">{currentReg.traderName}</span>
                        {currentReg.traderPosition && (
                          <span className="text-muted-foreground font-semibold ml-1.5">
                            ({currentReg.traderPosition})
                          </span>
                        )}
                        {currentReg.leaderName && (
                          <span className="text-muted-foreground font-normal ml-1">
                            [Liên quan: {currentReg.leaderName}]
                          </span>
                        )}{' '}
                        vừa thông báo{' '}
                        <span
                          className={cn(
                            'font-black underline decoration-2 underline-offset-4',
                            isBuy ? 'text-emerald-400' : 'text-rose-400'
                          )}
                        >
                          {isBuy
                            ? `ĐĂNG KÝ MUA ${fmtNum(currentReg.volumeRegistered)} CP`
                            : `ĐĂNG KÝ BÁN ${fmtNum(currentReg.volumeRegistered)} CP`}
                        </span>{' '}
                        cổ phiếu <span className="font-mono font-black">{symbol}</span>.
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Giao dịch đang trong thời hạn đăng ký thực hiện trên sàn (tối đa 30 ngày theo quy chế UBCKNN). Kết quả khớp lệnh thực tế sẽ được chốt sau ngày báo cáo kết quả.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-center min-w-[95px]">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground">Đăng ký</div>
                        <div className="font-mono text-xs sm:text-sm font-black text-foreground">
                          {fmtNum(currentReg.volumeRegistered)}
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-center min-w-[95px]">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground">Khớp lệnh</div>
                        <div className="font-mono text-xs sm:text-sm font-bold text-amber-400">
                          Đang thực hiện
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-center min-w-[105px]">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground">Sau giao dịch</div>
                        <div className="font-mono text-xs sm:text-sm font-bold text-muted-foreground">
                          {currentReg.volumeAfter > 0 ? fmtNum(currentReg.volumeAfter) : 'Chốt sau GD'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()
          ) : recentCompletedTrades.length > 0 ? (
            /* TRƯỜNG HỢP 2: Giao dịch VỪA HOÀN TẤT gần đây (< 60 ngày) */
            (() => {
              const trade = recentCompletedTrades[0]
              const isBuy = trade.action === 'BUY'
              const pct = trade.volumeRegistered > 0 ? Math.round((trade.volumeTraded / trade.volumeRegistered) * 100) : 100
              return (
                <div className="w-full rounded-2xl border border-border/70 bg-gradient-to-br from-muted/40 via-card to-card p-4 sm:p-5 shadow-xs relative">
                  <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/50 pb-3 mb-3.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-foreground">
                        Kết Quả Giao Dịch Người Nội Bộ Gần Nhất
                      </span>
                      <span className={cn('rounded-md px-2 py-0.5 text-[10.5px] font-extrabold uppercase border', isBuy ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border-rose-500/40')}>
                        {isBuy ? '✅ ĐÃ HOÀN TẤT MUA' : '✅ ĐÃ HOÀN TẤT BÁN'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                      <span>Báo cáo ngày: {trade.tradeDate}</span>
                      <button
                        type="button"
                        onClick={() => setDismissedBanner(true)}
                        className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors cursor-pointer"
                        title="Đóng thông báo"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm sm:text-base font-extrabold text-foreground leading-snug">
                        <span className="text-primary font-black">{trade.traderName}</span>
                        {trade.traderPosition && <span className="text-muted-foreground font-semibold ml-1.5">({trade.traderPosition})</span>}
                        {' '}đã hoàn tất {isBuy ? 'mua' : 'bán'}{' '}
                        <span className={cn('font-black', isBuy ? 'text-emerald-400' : 'text-rose-400')}>
                          {fmtNum(trade.volumeTraded)} CP
                        </span>{' '}
                        {trade.volumeRegistered > 0 && <span className="text-muted-foreground font-normal">(đạt {pct}% kế hoạch đăng ký)</span>}.
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Khối lượng nắm giữ sau giao dịch là {fmtNum(trade.volumeAfter)} CP.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-center min-w-[95px]">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground">Đăng ký</div>
                        <div className="font-mono text-xs sm:text-sm font-black text-foreground">
                          {trade.volumeRegistered > 0 ? fmtNum(trade.volumeRegistered) : '—'}
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-center min-w-[95px]">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground">Đã khớp</div>
                        <div className={cn('font-mono text-xs sm:text-sm font-black', isBuy ? 'text-emerald-400' : 'text-rose-400')}>
                          {fmtNum(trade.volumeTraded)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-center min-w-[105px]">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground">Sau giao dịch</div>
                        <div className="font-mono text-xs sm:text-sm font-black text-foreground">
                          {trade.volumeAfter != null ? `${fmtNum(trade.volumeAfter)} CP` : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()
          ) : latestTrade && (latestTrade.volumeTraded > 0 || latestTrade.volumeRegistered > 0) ? (
            /* TRƯỜNG HỢP 3: Giao dịch đã diễn ra > 60 ngày trước (như SD9 từ tháng 3/2026) -> Thanh tóm tắt gọn gàng, tinh tế! */
            (() => {
              const isBuy = latestTrade.action === 'BUY'
              const actualVol = latestTrade.volumeTraded
              const pct = latestTrade.volumeRegistered > 0 && actualVol > 0
                ? Math.round((actualVol / latestTrade.volumeRegistered) * 100)
                : null

              return (
                <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 text-xs shadow-2xs backdrop-blur transition-all">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1.5 font-bold text-muted-foreground uppercase text-[11px] tracking-wide">
                      <History className="size-3.5 text-amber-500" />
                      <span>Giao dịch nội bộ gần nhất ({latestTrade.tradeDate}):</span>
                    </span>
                    <span className="font-extrabold text-foreground">{latestTrade.traderName}</span>
                    {latestTrade.traderPosition && (
                      <span className="text-muted-foreground text-[11px]">({latestTrade.traderPosition})</span>
                    )}
                    <span
                      className={cn(
                        'font-extrabold px-1.5 py-0.5 rounded text-[11px]',
                        isBuy
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      )}
                    >
                      đã {isBuy ? 'mua' : 'bán'} {fmtNum(actualVol > 0 ? actualVol : latestTrade.volumeRegistered)} CP
                    </span>
                    {pct != null && latestTrade.volumeRegistered !== actualVol && (
                      <span className="text-muted-foreground text-[11px]">
                        (khớp {pct}% trên {fmtNum(latestTrade.volumeRegistered)} CP đăng ký)
                      </span>
                    )}
                    {latestTrade.volumeAfter != null && (
                      <span className="text-muted-foreground text-[11px] hidden sm:inline">
                        → Nắm giữ sau GD:{' '}
                        <strong className="font-mono text-foreground font-bold">
                          {fmtNum(latestTrade.volumeAfter)} CP
                        </strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('insider-history-section')
                        if (el) el.scrollIntoView({ behavior: 'smooth' })
                      }}
                      className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Xem lịch sử chi tiết & biểu đồ</span>
                      <span>↓</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDismissedBanner(true)}
                      className="text-muted-foreground hover:text-foreground text-xs p-0.5 transition-colors cursor-pointer"
                      title="Ẩn thanh tóm tắt này"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })()
          ) : null}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 1. KHỐI CƠ CẤU CỔ ĐÔNG                                   */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="w-full rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs">
        {/* Header khối */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <PieIcon className="size-4.5" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-foreground">
                Cơ Cấu Cổ Đông {symbol}
              </h3>
              <p className="text-xs text-muted-foreground">
                Danh sách các cổ đông lớn và tỷ trọng phân bổ sở hữu
              </p>
            </div>
          </div>
          <span className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {allShareholders.length} cổ đông
          </span>
        </div>

        {/* Nội dung 2 cột: Trái (Pie Chart + Tỷ lệ 38%) & Phải (Bảng cổ đông 62% dàn đều) */}
        <div className="w-full flex flex-col lg:flex-row gap-6 lg:gap-8 items-stretch">
          {/* CỘT TRÁI: BIỂU ĐỒ TRÒN & 3 THẺ TỶ LỆ (38% bề ngang) */}
          <div className="w-full lg:w-[38%] shrink-0 flex flex-col justify-between space-y-5 lg:border-r lg:border-border/60 lg:pr-8">
            {/* Biểu đồ tròn PieChart */}
            <div className="w-full h-[220px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={ownership.pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {ownership.pieChartData.map((entry, index) => (
                      <Cell key={`slice-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [`${Number(val).toFixed(2)}%`, name]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Chú giải Donut Chart gọn gàng */}
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {ownership.pieChartData.slice(0, 6).map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 truncate">
                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="truncate text-muted-foreground" title={item.name}>
                    {item.name}
                  </span>
                  <span className="font-mono font-bold text-foreground text-[11px] ml-auto">
                    {item.value.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>

            {/* 3 Thẻ tỷ lệ sở hữu Nước ngoài / Nhà nước / Khác */}
            <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-border/50">
              <div className="rounded-xl border border-border/80 bg-muted/30 p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <Globe className="size-3 text-sky-400" />
                  <span>Nước ngoài</span>
                </div>
                <div className="mt-1 font-mono text-sm font-black text-sky-400">
                  {ownership.foreign.toFixed(2)}%
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/30 p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <Landmark className="size-3 text-amber-400" />
                  <span>Nhà nước</span>
                </div>
                <div className="mt-1 font-mono text-sm font-black text-amber-400">
                  {ownership.state.toFixed(2)}%
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/30 p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <Users className="size-3 text-emerald-400" />
                  <span>Cổ đông khác</span>
                </div>
                <div className="mt-1 font-mono text-sm font-black text-emerald-400">
                  {ownership.other.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: BẢNG CHI TIẾT CỔ ĐÔNG LỚN (62% dàn đều toàn màn hình) */}
          <div className="w-full lg:w-[62%] flex-1 min-w-0 flex flex-col justify-between">
            <div className="w-full overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 w-[45%]">Cổ đông</th>
                    <th className="px-4 py-3 w-[25%] text-right">Số cổ phiếu</th>
                    <th className="px-4 py-3 w-[15%] text-right">Tỷ lệ</th>
                    <th className="px-4 py-3 w-[15%] text-right">Cập nhật</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {displayedShareholders.map((sh, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {sh.name}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground whitespace-nowrap">
                        {sh.shares}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-500 dark:text-emerald-400 whitespace-nowrap">
                        {sh.rate.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {sh.updated}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {allShareholders.length > 8 && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowAllShareholders(!showAllShareholders)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-4 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-muted cursor-pointer"
                >
                  {showAllShareholders ? (
                    <>
                      <span>Thu gọn</span>
                      <ChevronUp className="size-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Xem thêm ({allShareholders.length - 8} cổ đông)</span>
                      <ChevronDown className="size-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 2. CÔNG TY CON & CÔNG TY LIÊN KẾT                         */}
      {/* ══════════════════════════════════════════════════════════ */}
      {subsidiaries.length > 0 && (
        <div className="w-full rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
                <GitBranch className="size-4.5" />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-foreground">
                  Công Ty Con & Công Ty Liên Kết
                </h3>
                <p className="text-xs text-muted-foreground">
                  Mạng lưới công ty thành viên, tỷ lệ sở hữu và vốn điều lệ
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {conList.length > 0 && (
                <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 font-bold text-indigo-400">
                  {conList.length} công ty con
                </span>
              )}
              {lkList.length > 0 && (
                <span className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 font-bold text-violet-400">
                  {lkList.length} liên kết
                </span>
              )}
            </div>
          </div>

          <div className="w-full overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 w-[15%] min-w-[110px]">Loại hình</th>
                  <th className="px-4 py-3 w-[35%] min-w-[260px]">Đơn vị</th>
                  <th className="px-4 py-3 w-[15%] text-right min-w-[120px]">Vốn điều lệ (tỷ)</th>
                  <th className="px-4 py-3 w-[15%] text-right min-w-[120px]">Vốn góp (tỷ)</th>
                  <th className="px-4 py-3 w-[15%] text-right min-w-[160px]">Tỷ lệ sở hữu (%)</th>
                  <th className="px-4 py-3 w-[10%] text-center min-w-[90px]">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {displayedSubsidiaries.map((sub, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 align-middle font-bold">
                      <span
                        className={cn(
                          'inline-block rounded-md px-2 py-0.5 text-[10.5px]',
                          sub.type === 'subsidiary'
                            ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                            : 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                        )}
                      >
                        {sub.type === 'subsidiary' ? 'Công ty con' : 'Liên kết'}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle font-semibold text-foreground">
                      {sub.name}
                    </td>
                    <td className="px-4 py-3 align-middle text-right font-mono text-muted-foreground">
                      {sub.charterCapital > 0 ? fmtNum(sub.charterCapital) : '—'}
                    </td>
                    <td className="px-4 py-3 align-middle text-right font-mono text-muted-foreground">
                      {sub.contributedCapital > 0 ? fmtNum(sub.contributedCapital) : '—'}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center justify-end gap-2.5">
                        <div className="w-20 h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${Math.min(100, Math.max(2, sub.ownershipRate))}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-foreground text-[12px] w-14 text-right">
                          {sub.ownershipRate.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle text-center font-mono text-[11px] text-muted-foreground">
                      {sub.note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {subsidiaries.length > 6 && (
            <div className="flex justify-center pt-3">
              <button
                type="button"
                onClick={() => setShowAllSubsidiaries(!showAllSubsidiaries)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-4 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-muted cursor-pointer"
              >
                {showAllSubsidiaries ? (
                  <>
                    <span>Thu gọn</span>
                    <ChevronUp className="size-3.5" />
                  </>
                ) : (
                  <>
                    <span>Xem thêm ({subsidiaries.length - 6} đơn vị)</span>
                    <ChevronDown className="size-3.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 3. LỊCH SỬ GIAO DỊCH NỘI BỘ (BIỂU ĐỒ & BẢNG KÊ ĐẦY ĐỦ)    */}
      {/* ══════════════════════════════════════════════════════════ */}
      {insiderTrades.length > 0 && (
        <div id="insider-history-section" className="space-y-6">
          <InsiderTradingPriceChart symbol={symbol} trades={insiderTrades} />

          <div className="w-full rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8.5 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <History className="size-4.5" />
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-foreground">
                    Lịch Sử Giao Dịch Nội Bộ & Cổ Đông Lớn
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Nhật ký đăng ký và thực hiện giao dịch của ban lãnh đạo & người có liên quan
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-semibold text-muted-foreground font-mono">
                  {insiderTrades.length} giao dịch ghi nhận
                </span>
              </div>
            </div>

            {/* Thống kê nhanh 4 thẻ KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                <div className="text-[10.5px] uppercase font-bold text-muted-foreground tracking-wide">
                  Mua vào (Khớp)
                </div>
                <div className="text-sm sm:text-base font-mono font-black text-emerald-500 dark:text-emerald-400 mt-0.5">
                  {fmtNum(tradeKpis.totalBuyVol)} <span className="text-[11px] font-sans font-normal text-muted-foreground">CP</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {tradeKpis.buyCount} đợt mua thành công
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                <div className="text-[10.5px] uppercase font-bold text-muted-foreground tracking-wide">
                  Bán ra (Khớp)
                </div>
                <div className="text-sm sm:text-base font-mono font-black text-rose-500 dark:text-rose-400 mt-0.5">
                  {fmtNum(tradeKpis.totalSellVol)} <span className="text-[11px] font-sans font-normal text-muted-foreground">CP</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {tradeKpis.sellCount} đợt bán thành công
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                <div className="text-[10.5px] uppercase font-bold text-muted-foreground tracking-wide">
                  Giao dịch ròng
                </div>
                <div
                  className={cn(
                    'text-sm sm:text-base font-mono font-black mt-0.5',
                    tradeKpis.netVol > 0
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : tradeKpis.netVol < 0
                      ? 'text-rose-500 dark:text-rose-400'
                      : 'text-foreground'
                  )}
                >
                  {tradeKpis.netVol > 0 ? '+' : ''}
                  {fmtNum(tradeKpis.netVol)} <span className="text-[11px] font-sans font-normal text-muted-foreground">CP</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {tradeKpis.netVol > 0 ? 'Mua ròng' : tradeKpis.netVol < 0 ? 'Bán ròng' : 'Cân bằng'}
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                <div className="text-[10.5px] uppercase font-bold text-muted-foreground tracking-wide">
                  Đang đăng ký / Chờ khớp
                </div>
                <div
                  className={cn(
                    'text-sm sm:text-base font-mono font-black mt-0.5',
                    tradeKpis.pendingCount > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground'
                  )}
                >
                  {tradeKpis.pendingCount} <span className="text-[11px] font-sans font-normal text-muted-foreground">đợt</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {tradeKpis.pendingCount > 0 ? 'Còn thời hạn thực hiện' : 'Hiện không có lệnh chờ'}
                </div>
              </div>
            </div>

            {/* Thanh công cụ: Bộ lọc, Tìm kiếm & Chế độ xem */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
              {/* Tabs lọc */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setTradeFilter('ALL')
                    setTradePage(1)
                  }}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer',
                    tradeFilter === 'ALL'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  Tất cả ({insiderTrades.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTradeFilter('BUY')
                    setTradePage(1)
                  }}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer',
                    tradeFilter === 'BUY'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-muted/60 text-muted-foreground hover:text-emerald-400 hover:bg-muted'
                  )}
                >
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  <span>Mua ({tradeKpis.buyCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTradeFilter('SELL')
                    setTradePage(1)
                  }}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer',
                    tradeFilter === 'SELL'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-muted/60 text-muted-foreground hover:text-rose-400 hover:bg-muted'
                  )}
                >
                  <span className="size-1.5 rounded-full bg-rose-400" />
                  <span>Bán ({tradeKpis.sellCount})</span>
                </button>
                {tradeKpis.pendingCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setTradeFilter('PENDING')
                      setTradePage(1)
                    }}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer',
                      tradeFilter === 'PENDING'
                        ? 'bg-amber-500 text-black shadow-xs'
                        : 'bg-muted/60 text-muted-foreground hover:text-amber-400 hover:bg-muted'
                    )}
                  >
                    <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>Đang ĐK ({tradeKpis.pendingCount})</span>
                  </button>
                )}
              </div>

              {/* Tìm kiếm & Switcher */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:w-60">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={tradeSearch}
                    onChange={(e) => {
                      setTradeSearch(e.target.value)
                      setTradePage(1)
                    }}
                    placeholder="Tìm tên, chức vụ..."
                    className="w-full rounded-lg border border-border bg-muted/40 pl-8 pr-7 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
                  />
                  {tradeSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setTradeSearch('')
                        setTradePage(1)
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-0.5 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
                  <button
                    type="button"
                    onClick={() => setTradeViewMode('table')}
                    className={cn(
                      'rounded p-1 text-xs transition-colors cursor-pointer',
                      tradeViewMode === 'table' ? 'bg-card text-foreground shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
                    )}
                    title="Xem dạng Bảng chi tiết"
                  >
                    <Table className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTradeViewMode('cards')}
                    className={cn(
                      'rounded p-1 text-xs transition-colors cursor-pointer',
                      tradeViewMode === 'cards' ? 'bg-card text-foreground shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
                    )}
                    title="Xem dạng Thẻ"
                  >
                    <LayoutGrid className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* DỮ LIỆU GIAO DỊCH: BẢNG HOẶC THẺ */}
            {filteredTrades.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-muted-foreground text-xs">
                Không tìm thấy giao dịch nào phù hợp với bộ lọc.
              </div>
            ) : tradeViewMode === 'table' ? (
              /* DẠNG BẢNG CHI TIẾT (FULL DATA TABLE) */
              <div className="w-full overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                    <tr>
                      <th className="px-3.5 py-3 w-[12%] min-w-[110px]">Ngày thực hiện</th>
                      <th className="px-3.5 py-3 w-[26%] min-w-[220px]">Người thực hiện & Quan hệ</th>
                      <th className="px-3.5 py-3 w-[12%] text-right min-w-[110px]">Trước GD</th>
                      <th className="px-3.5 py-3 w-[14%] text-right min-w-[130px]">Đăng ký GD</th>
                      <th className="px-3.5 py-3 w-[14%] text-right min-w-[135px]">Thực hiện (Khớp)</th>
                      <th className="px-3.5 py-3 w-[12%] text-right min-w-[125px]">Sau GD</th>
                      <th className="px-3.5 py-3 w-[14%] text-center min-w-[155px]">Thời gian thực hiện</th>
                      <th className="px-3.5 py-3 w-[10%] text-center min-w-[100px]">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {paginatedTrades.map((trade, idx) => {
                      const isBuy = trade.action === 'BUY'
                      const isSell = trade.action === 'SELL'
                      const daysAgo = getDaysAgo(trade.tradeDate)
                      const isPending = trade.volumeTraded === 0 && trade.volumeRegistered > 0 && daysAgo <= 45
                      const isExpiredWithoutTrade = trade.volumeTraded === 0 && trade.volumeRegistered > 0 && daysAgo > 45
                      const pct =
                        trade.volumeRegistered > 0 && trade.volumeTraded > 0
                          ? Math.round((trade.volumeTraded / trade.volumeRegistered) * 100)
                          : null
                      const diff =
                        trade.volumeBefore != null && trade.volumeAfter != null
                          ? trade.volumeAfter - trade.volumeBefore
                          : null

                      return (
                        <tr
                          key={idx}
                          className={cn(
                            'hover:bg-muted/40 transition-colors',
                            isPending && 'bg-amber-500/5'
                          )}
                        >
                          {/* Cột 1: Ngày thực hiện */}
                          <td className="px-3.5 py-3.5 align-middle">
                            <div className="font-mono font-bold text-foreground text-xs whitespace-nowrap">
                              {trade.tradeDate || trade.realEndDate || trade.planEndDate || '—'}
                            </div>
                            {trade.publishedDate && trade.publishedDate !== trade.tradeDate && (
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5 whitespace-nowrap">
                                BC: {trade.publishedDate}
                              </div>
                            )}
                          </td>

                          {/* Cột 2: Người thực hiện & Quan hệ */}
                          <td className="px-3.5 py-3.5 align-middle">
                            <div className="font-extrabold text-foreground text-xs sm:text-[13px] leading-snug">
                              {trade.traderName}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {trade.traderPosition && (
                                <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground border border-border/70">
                                  {trade.traderPosition}
                                </span>
                              )}
                              {trade.leaderName && (
                                <span className="text-[11px] text-muted-foreground font-medium">
                                  <span className="text-amber-500/90 font-semibold">Liên quan:</span> {trade.leaderName}
                                  {trade.leaderPosition ? ` (${trade.leaderPosition})` : ''}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Cột 3: Trước GD */}
                          <td className="px-3.5 py-3.5 align-middle text-right font-mono">
                            {trade.volumeBefore != null ? (
                              <div className="font-semibold text-foreground text-xs">
                                {fmtNum(trade.volumeBefore)} CP
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>

                          {/* Cột 4: Đăng ký GD */}
                          <td className="px-3.5 py-3.5 align-middle text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <span
                                className={cn(
                                  'rounded px-1.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider',
                                  isBuy
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                    : isSell
                                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                    : 'bg-muted text-muted-foreground'
                                )}
                              >
                                {isBuy ? 'MUA' : isSell ? 'BÁN' : '—'}
                              </span>
                              <span className="font-mono font-bold text-foreground text-xs">
                                {trade.volumeRegistered > 0 ? fmtNum(trade.volumeRegistered) : '—'}
                              </span>
                            </div>
                          </td>

                          {/* Cột 5: Thực hiện (Đã khớp) */}
                          <td className="px-3.5 py-3.5 align-middle text-right">
                            {isPending ? (
                              <div className="inline-flex items-center gap-1 font-mono text-xs font-bold text-amber-500 dark:text-amber-400">
                                <Clock className="size-3" />
                                <span>Chờ khớp</span>
                              </div>
                            ) : isExpiredWithoutTrade ? (
                              <div className="font-mono text-xs text-muted-foreground font-medium">
                                0 CP (0%)
                              </div>
                            ) : (
                              <div>
                                <div
                                  className={cn(
                                    'font-mono text-xs font-black',
                                    isBuy
                                      ? 'text-emerald-500 dark:text-emerald-400'
                                      : isSell
                                      ? 'text-rose-500 dark:text-rose-400'
                                      : 'text-foreground'
                                  )}
                                >
                                  {trade.volumeTraded > 0 ? `${fmtNum(trade.volumeTraded)} CP` : '0 CP'}
                                </div>
                                {pct != null && (
                                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                    Khớp {pct}%
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Cột 6: Sau GD */}
                          <td className="px-3.5 py-3.5 align-middle text-right font-mono">
                            {trade.volumeAfter != null ? (
                              <div>
                                <div className="font-bold text-foreground text-xs">
                                  {fmtNum(trade.volumeAfter)} CP
                                </div>
                                <div className="flex items-center justify-end gap-1.5 text-[10px] mt-0.5">
                                  {trade.ownershipRate != null && trade.ownershipRate > 0 && (
                                    <span className="text-muted-foreground">({trade.ownershipRate.toFixed(2)}%)</span>
                                  )}
                                  {diff != null && diff !== 0 && (
                                    <span
                                      className={cn(
                                        'font-semibold',
                                        diff > 0 ? 'text-emerald-400' : 'text-rose-400'
                                      )}
                                    >
                                      {diff > 0 ? '+' : ''}
                                      {fmtNum(diff)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>

                          {/* Cột 7: Thời gian thực hiện */}
                          <td className="px-3.5 py-3.5 align-middle text-center font-mono text-[11px] text-muted-foreground">
                            {trade.planBeginDate && trade.planEndDate ? (
                              <div className="whitespace-nowrap">
                                <span>{trade.planBeginDate}</span>
                                <span className="mx-1 text-muted-foreground/60">→</span>
                                <span>{trade.planEndDate}</span>
                              </div>
                            ) : (
                              <span>{trade.tradeDate || '—'}</span>
                            )}
                          </td>

                          {/* Cột 8: Trạng thái */}
                          <td className="px-3.5 py-3.5 align-middle text-center">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-2xs">
                                <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                                <span>ĐANG ĐK</span>
                              </span>
                            ) : isExpiredWithoutTrade ? (
                              <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase bg-muted text-muted-foreground border border-border">
                                HẾT HẠN
                              </span>
                            ) : trade.volumeTraded > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="size-3" />
                                <span>ĐÃ KHỚP</span>
                              </span>
                            ) : (
                              <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-medium uppercase bg-muted text-muted-foreground">
                                HOÀN TẤT
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* DẠNG THẺ (CARD VIEW) CHO THIẾT BỊ DI ĐỘNG */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {paginatedTrades.map((trade, idx) => {
                  const isBuy = trade.action === 'BUY'
                  const isSell = trade.action === 'SELL'
                  const daysAgo = getDaysAgo(trade.tradeDate)
                  const isPending = trade.volumeTraded === 0 && trade.volumeRegistered > 0 && daysAgo <= 45
                  const isExpiredWithoutTrade = trade.volumeTraded === 0 && trade.volumeRegistered > 0 && daysAgo > 45
                  const pct =
                    trade.volumeRegistered > 0 && trade.volumeTraded > 0
                      ? Math.round((trade.volumeTraded / trade.volumeRegistered) * 100)
                      : null
                  const diff =
                    trade.volumeBefore != null && trade.volumeAfter != null
                      ? trade.volumeAfter - trade.volumeBefore
                      : null

                  return (
                    <div
                      key={idx}
                      className={cn(
                        'rounded-xl border p-4 transition-all shadow-2xs',
                        isPending
                          ? isBuy
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : 'border-rose-500/30 bg-rose-500/5'
                          : 'border-border/80 bg-card hover:border-border'
                      )}
                    >
                      <div className="flex items-center justify-between border-b border-border/50 pb-2.5 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wide',
                              isBuy
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : isSell
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {isBuy ? 'MUA VÀO' : isSell ? 'BÁN RA' : 'GIAO DỊCH'}
                          </span>
                          <span className="text-xs font-mono font-bold text-muted-foreground">
                            {trade.tradeDate}
                          </span>
                        </div>

                        <div>
                          {isPending ? (
                            <span className="rounded-md px-2 py-0.5 text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40">
                              ⏳ ĐANG ĐK
                            </span>
                          ) : isExpiredWithoutTrade ? (
                            <span className="rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase bg-muted text-muted-foreground border border-border">
                              HẾT HẠN
                            </span>
                          ) : (
                            <span className="rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              ✓ ĐÃ KHỚP
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1 mb-3">
                        <div className="text-sm font-bold text-foreground">{trade.traderName}</div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                          {trade.traderPosition && (
                            <span className="rounded bg-muted px-1.5 py-0.2 font-medium text-muted-foreground">
                              {trade.traderPosition}
                            </span>
                          )}
                          {trade.leaderName && (
                            <span>
                              <span className="text-amber-500/90 font-semibold">Liên quan:</span> {trade.leaderName}
                              {trade.leaderPosition ? ` (${trade.leaderPosition})` : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/30 border border-border/50 p-2.5 text-center font-mono">
                        <div>
                          <div className="text-[10px] uppercase text-muted-foreground font-semibold">Trước GD</div>
                          <div className="text-xs font-bold text-foreground mt-0.5">
                            {trade.volumeBefore != null ? `${fmtNum(trade.volumeBefore)}` : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-muted-foreground font-semibold">ĐK / Khớp</div>
                          <div
                            className={cn(
                              'text-xs font-black mt-0.5',
                              isBuy ? 'text-emerald-400' : isSell ? 'text-rose-400' : 'text-foreground'
                            )}
                          >
                            {fmtNum(trade.volumeTraded)}
                          </div>
                          {pct != null && <div className="text-[9.5px] text-muted-foreground">({pct}%)</div>}
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-muted-foreground font-semibold">Sau GD</div>
                          <div className="text-xs font-bold text-foreground mt-0.5">
                            {trade.volumeAfter != null ? `${fmtNum(trade.volumeAfter)}` : '—'}
                          </div>
                          {diff != null && diff !== 0 && (
                            <div
                              className={cn(
                                'text-[9.5px] font-semibold',
                                diff > 0 ? 'text-emerald-400' : 'text-rose-400'
                              )}
                            >
                              {diff > 0 ? '+' : ''}
                              {fmtNum(diff)}
                            </div>
                          )}
                        </div>
                      </div>

                      {(trade.planBeginDate || trade.publishedDate) && (
                        <div className="mt-2.5 flex items-center justify-between text-[10.5px] text-muted-foreground font-mono">
                          {trade.planBeginDate && trade.planEndDate ? (
                            <span>
                              Thời gian: {trade.planBeginDate} → {trade.planEndDate}
                            </span>
                          ) : (
                            <span />
                          )}
                          {trade.publishedDate && <span>Công bố: {trade.publishedDate}</span>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Phân trang & Điều khiển số lượng */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/60 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Hiển thị</span>
                <select
                  value={tradePageSize}
                  onChange={(e) => {
                    setTradePageSize(Number(e.target.value))
                    setTradePage(1)
                  }}
                  className="rounded-lg border border-border bg-muted/60 px-2 py-1 text-xs font-mono font-bold text-foreground cursor-pointer focus:outline-none"
                >
                  <option value={10}>10 dòng</option>
                  <option value={25}>25 dòng</option>
                  <option value={50}>50 dòng</option>
                  <option value={0}>Tất cả ({filteredTrades.length})</option>
                </select>
                <span>
                  (từ {(tradePage - 1) * tradePageSize + 1} -{' '}
                  {tradePageSize === 0
                    ? filteredTrades.length
                    : Math.min(tradePage * tradePageSize, filteredTrades.length)}{' '}
                  trên tổng {filteredTrades.length} đợt)
                </span>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={tradePage <= 1}
                    onClick={() => setTradePage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs font-bold text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="size-3.5" />
                    <span>Trước</span>
                  </button>
                  <span className="font-mono px-2 text-xs font-bold text-foreground">
                    Trang {tradePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={tradePage >= totalPages}
                    onClick={() => setTradePage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs font-bold text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted cursor-pointer transition-colors"
                  >
                    <span>Sau</span>
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
