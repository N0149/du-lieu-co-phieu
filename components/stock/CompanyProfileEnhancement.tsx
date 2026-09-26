'use client'

import React, { useState, useMemo } from 'react'
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
  const [showAllShareholders, setShowAllShareholders] = useState(false)
  const [showAllSubsidiaries, setShowAllSubsidiaries] = useState(false)
  const [showAllTrades, setShowAllTrades] = useState(false)
  const [dismissedBanner, setDismissedBanner] = useState(false)
  const [activeRegIndex, setActiveRegIndex] = useState(0)

  if (!data) return null

  const { ownership, subsidiaries, insiderTrades } = data

  // 1. Cổ đông
  const allShareholders = ownership.shareholders || []
  const displayedShareholders = showAllShareholders ? allShareholders : allShareholders.slice(0, 8)

  // 2. Công ty con & liên kết
  const conList = subsidiaries.filter((s) => s.type === 'subsidiary')
  const lkList = subsidiaries.filter((s) => s.type === 'associate')
  const displayedSubsidiaries = showAllSubsidiaries ? subsidiaries : subsidiaries.slice(0, 6)

  // 3. Giao dịch nội bộ
  const displayedTrades = showAllTrades ? insiderTrades : insiderTrades.slice(0, 6)

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
                          {trade.volumeAfter > 0 ? fmtNum(trade.volumeAfter) : '—'}
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
                    {latestTrade.volumeAfter > 0 && (
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
      {/* 3. LỊCH SỬ GIAO DỊCH NỘI BỘ (BIỂU ĐỒ & BẢNG KÊ)          */}
      {/* ══════════════════════════════════════════════════════════ */}
      {insiderTrades.length > 0 && (
        <div id="insider-history-section" className="space-y-6">
          <InsiderTradingPriceChart symbol={symbol} trades={insiderTrades} />

          <div className="w-full rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <History className="size-4.5" />
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-foreground">
                    Lịch Sử Giao Dịch Nội Bộ Gần Đây
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Nhật ký mua bán cổ phiếu của ban lãnh đạo và người có liên quan
                  </p>
                </div>
              </div>
              <span className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                {insiderTrades.length} giao dịch gần nhất
              </span>
            </div>

            <div className="w-full divide-y divide-border/60">
              {displayedTrades.map((trade, idx) => {
                const isBuy = trade.action === 'BUY'
                const isSell = trade.action === 'SELL'
                const daysAgo = getDaysAgo(trade.tradeDate)
                const isPending = trade.volumeTraded === 0 && trade.volumeRegistered > 0 && daysAgo <= 45
                const isExpiredWithoutTrade = trade.volumeTraded === 0 && trade.volumeRegistered > 0 && daysAgo > 45
                const dotColor = isPending
                  ? isBuy
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-rose-500 animate-pulse'
                  : isBuy
                  ? 'bg-emerald-500'
                  : isSell
                  ? 'bg-rose-500'
                  : 'bg-slate-500'

                return (
                  <div
                    key={idx}
                    className={cn(
                      'flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 px-3 rounded-xl transition-colors',
                      isPending
                        ? isBuy
                          ? 'bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20'
                          : 'bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20'
                        : 'hover:bg-muted/30'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className={cn('size-2 rounded-full mt-1.5 shrink-0', dotColor)} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-muted-foreground font-semibold">
                            {trade.tradeDate}
                          </span>
                          {isPending && (
                            <span className="rounded-sm bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.2 text-[9.5px] font-black uppercase text-amber-400">
                              Đang đăng ký
                            </span>
                          )}
                          {isExpiredWithoutTrade && (
                            <span className="rounded-sm bg-muted border border-border px-1.5 py-0.2 text-[9.5px] font-medium uppercase text-muted-foreground">
                              Hết hạn
                            </span>
                          )}
                        </div>
                        <div className="text-xs sm:text-[13px] font-bold text-foreground">
                          {trade.traderName}
                          {trade.leaderName && (
                            <span className="text-muted-foreground font-normal ml-1">
                              ({trade.leaderName})
                            </span>
                          )}
                        </div>
                        {trade.traderPosition && (
                          <div className="text-[11px] text-muted-foreground">
                            {trade.traderPosition}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="sm:text-right pl-5 sm:pl-0">
                      <div className="flex items-center sm:justify-end gap-2">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs sm:text-sm font-bold text-amber-500 dark:text-amber-400">
                            <Clock className="size-3.5" />
                            <span>Chờ khớp ({fmtNum(trade.volumeRegistered)} CP)</span>
                          </span>
                        ) : isExpiredWithoutTrade ? (
                          <span className="font-mono text-xs text-muted-foreground font-medium">
                            0 CP (Không khớp)
                          </span>
                        ) : (
                          <span
                            className={cn(
                              'font-mono text-xs sm:text-sm font-black',
                              isBuy
                                ? 'text-emerald-500 dark:text-emerald-400'
                                : isSell
                                ? 'text-rose-500 dark:text-rose-400'
                                : 'text-muted-foreground'
                            )}
                          >
                            {trade.volumeTraded > 0
                              ? `${fmtNum(trade.volumeTraded)} CP`
                              : '0 CP'}
                          </span>
                        )}

                        {isPending ? (
                          <span
                            className={cn(
                              'rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide',
                              isBuy
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-xs'
                            )}
                          >
                            {isBuy ? 'ĐĂNG KÝ MUA' : 'ĐĂNG KÝ BÁN'}
                          </span>
                        ) : isExpiredWithoutTrade ? (
                          <span className="rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase bg-muted text-muted-foreground border border-border">
                            HẾT HẠN ĐK
                          </span>
                        ) : (
                          trade.action !== 'NONE' && (
                            <span
                              className={cn(
                                'rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase',
                                isBuy
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              )}
                            >
                              {trade.action === 'BUY' ? 'MUA (ĐÃ KHỚP)' : 'BÁN (ĐÃ KHỚP)'}
                            </span>
                          )
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {trade.volumeRegistered > 0 && trade.volumeTraded > 0 && (
                          <span>
                            ĐK: {fmtNum(trade.volumeRegistered)} CP ({Math.round((trade.volumeTraded / trade.volumeRegistered) * 100)}%) &bull;{' '}
                          </span>
                        )}
                        <span>
                          Nắm giữ sau GD:{' '}
                          {trade.volumeAfter > 0 ? `${fmtNum(trade.volumeAfter)} CP` : 'Chưa chốt'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {insiderTrades.length > 6 && (
              <div className="flex justify-center pt-4 border-t border-border/60 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAllTrades(!showAllTrades)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-4 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-muted cursor-pointer"
                >
                  {showAllTrades ? (
                    <>
                      <span>Thu gọn</span>
                      <ChevronUp className="size-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Xem thêm ({insiderTrades.length - 6} giao dịch)</span>
                      <ChevronDown className="size-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
