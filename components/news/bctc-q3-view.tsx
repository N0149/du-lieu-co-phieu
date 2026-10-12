'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  FileText,
  Download,
  ExternalLink,
  TrendingUp,
  Search,
  Sparkles,
  RefreshCw,
  Clock,
  Building2,
  CheckCircle2,
  Rocket,
  ShieldCheck,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BctcAlertItem } from '@/lib/bctc-alerts-service'

interface BctcQ3ViewProps {
  initialAlerts?: BctcAlertItem[]
  stockPriceMap?: Record<string, { px: number | null; w1: number | null }>
  userWatchlist?: string[]
}

export function BctcQ3View({
  initialAlerts = [],
  stockPriceMap = {},
  userWatchlist = [],
}: BctcQ3ViewProps) {
  const [alerts, setAlerts] = useState<BctcAlertItem[]>(initialAlerts)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedExchange, setSelectedExchange] = useState<string>('ALL')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/bctc-alerts')
      if (res.ok) {
        const data = await res.json()
        if (data.items) {
          setAlerts(data.items)
          setLastUpdated(new Date())
        }
      }
    } catch (err) {
      console.error('Lỗi làm mới BCTC alerts:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      // Tìm kiếm mã hoặc tên công ty
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTicker = item.ticker.toLowerCase().includes(q)
        const matchName = item.company_name?.toLowerCase().includes(q)
        const matchTitle = item.title?.toLowerCase().includes(q)
        if (!matchTicker && !matchName && !matchTitle) return false
      }

      // Lọc theo sàn
      if (selectedExchange !== 'ALL') {
        if ((item.exchange || 'UPCOM').toUpperCase() !== selectedExchange) {
          return false
        }
      }

      return true
    })
  }, [alerts, searchQuery, selectedExchange])

  return (
    <div className="w-full space-y-4">
      {/* ── 1. BANNER THÔNG BÁO TRỰC TIẾP & TRẠNG THÁI CAO ĐIỂM ── */}
      <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[#131924] to-[#0d1117] p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/40">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-amber-500"></span>
                </span>
                LIVE RADAR BCTC QUÝ 3/2026
              </span>
              <span className="text-xs font-mono text-[#8b949e]">
                Hệ thống quét 2 lớp Web Doanh nghiệp & EzIR FPTS
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>Báo Cáo Tài Chính Quý 3/2026 Mới Nhận</span>
              <span className="text-xs font-normal text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Cập nhật tự động thời gian thực
              </span>
            </h2>

            <p className="text-xs text-[#94a3b8] max-w-2xl">
              Hệ thống tự động phát hiện, trích xuất con số <strong className="text-amber-300">Lợi nhuận sau thuế (LNST)</strong>, tỷ lệ tăng trưởng YoY và cung cấp trực tiếp file PDF gốc ngay khi doanh nghiệp vừa nộp báo cáo.
            </p>
          </div>

          {/* Nút làm mới & Thống kê nhanh */}
          <div className="flex items-center gap-2 sm:self-center shrink-0">
            <div className="text-right hidden sm:block pr-2 border-r border-[#262f40]">
              <div className="text-xs text-[#64748b]">Đã phát hiện</div>
              <div className="text-lg font-bold font-mono text-emerald-400">{alerts.length} mã</div>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
              <span>{isRefreshing ? 'Đang quét...' : 'Quét BCTC Mới'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. BỘ LỌC TÌM KIẾM ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#1f242d] bg-[#12161f] p-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Lọc theo sàn */}
          <div className="flex items-center gap-1 bg-[#0b0d11] p-1 rounded-md border border-[#1f242d]">
            {['ALL', 'HOSE', 'HNX', 'UPCOM'].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setSelectedExchange(ex)}
                className={cn(
                  'rounded px-2.5 py-1 text-xs font-semibold transition-all',
                  selectedExchange === ex
                    ? 'bg-amber-500 text-black shadow-xs'
                    : 'text-[#8b949e] hover:text-white'
                )}
              >
                {ex === 'ALL' ? 'Tất cả sàn' : ex}
              </button>
            ))}
          </div>

          {/* Đếm số lượng */}
          <span className="text-xs text-[#64748b] ml-1">
            Hiển thị <strong className="text-white">{filteredAlerts.length}</strong> báo cáo
          </span>
        </div>

        {/* Ô tìm kiếm mã */}
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#64748b]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm mã CP (ví dụ: CMD)..."
            className="h-8 w-full rounded border border-[#232a36] bg-[#0b0d11] pl-8 pr-3 text-xs text-white placeholder:text-[#64748b] outline-none focus:border-amber-500 transition-colors"
          />
        </div>
      </div>

      {/* ── 3. DANH SÁCH BCTC MỚI PHÁT HIỆN ── */}
      {filteredAlerts.length === 0 ? (
        <div className="rounded-xl border border-[#1f242d] bg-[#12161f] p-12 text-center">
          <FileText className="mx-auto size-12 text-[#475569] mb-3 opacity-50" />
          <p className="text-sm font-semibold text-white">Chưa tìm thấy báo cáo tài chính phù hợp</p>
          <p className="text-xs text-[#64748b] mt-1 max-w-md mx-auto">
            Đợt công bố BCTC Quý 3/2026 sẽ diễn ra cao điểm từ ngày 15/10 đến 30/10/2026. Hệ thống sẽ tự động hiển thị ngay khi có báo cáo mới.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredAlerts.map((item, idx) => {
            const priceInfo = stockPriceMap[item.ticker]
            const inWatchlist = userWatchlist.includes(item.ticker.toUpperCase())

            return (
              <div
                key={`${item.ticker}-${idx}`}
                className="group relative overflow-hidden rounded-xl border border-amber-500/30 bg-[#12161f] hover:border-amber-400/60 transition-all p-4 sm:p-5 shadow-md hover:shadow-amber-500/5"
              >
                {/* Viền trái màu sắc tạo điểm nhấn */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-emerald-400" />

                <div className="space-y-3 pl-1">
                  {/* Dòng 1: Mã CK, Tên công ty, Sàn, Badge thời gian */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Mã cổ phiếu */}
                      <Link
                        href={`/stock/${encodeURIComponent(item.ticker)}`}
                        className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/20 px-2.5 py-1 font-mono text-sm font-black text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
                      >
                        <span>{item.ticker}</span>
                        <ExternalLink className="size-3 text-amber-400/70" />
                      </Link>

                      {/* Thị giá nếu có */}
                      {priceInfo && priceInfo.px != null && (
                        <span className="text-xs font-mono text-[#cbd5e1] font-semibold bg-[#181d26] px-2 py-0.5 rounded border border-[#262f40]">
                          {priceInfo.px}
                          {priceInfo.w1 != null && (
                            <span className={cn('ml-1 text-[11px]', priceInfo.w1 > 0 ? 'text-emerald-400' : priceInfo.w1 < 0 ? 'text-rose-400' : 'text-slate-400')}>
                              {priceInfo.w1 > 0 ? `+${priceInfo.w1}%` : `${priceInfo.w1}%`}
                            </span>
                          )}
                        </span>
                      )}

                      {/* Sàn */}
                      <span className="rounded bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold font-mono text-blue-400 border border-blue-500/30 uppercase">
                        {item.exchange || 'UPCOM'}
                      </span>

                      {/* Watchlist star */}
                      {inWatchlist && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/40">
                          ★ Watchlist
                        </span>
                      )}

                      {/* Tên công ty */}
                      <span className="text-xs text-[#cbd5e1] font-medium hidden md:inline">
                        {item.company_name}
                      </span>
                    </div>

                    {/* Ngày giờ công bố */}
                    <div className="flex items-center gap-1.5 text-xs text-[#94a3b8] font-mono shrink-0">
                      <Clock className="size-3.5 text-amber-400" />
                      <span>Công bố: <strong className="text-white">{item.release_date}</strong></span>
                    </div>
                  </div>

                  {/* Dòng 2: Tiêu đề báo cáo */}
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                      {item.title}
                    </h3>
                  </div>

                  {/* ── DÒNG 3: KHỐI THÔNG TIN LỢI NHUẬN SAU THUẾ & TĂNG TRƯỞNG (ĐÚNG THEO YÊU CẦU NGƯỜI DÙNG) ── */}
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/15 p-3 sm:p-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* LNST Quý 3/2026 */}
                      <div className="space-y-0.5">
                        <div className="text-[11px] font-medium text-[#94a3b8]">
                          LNST Quý 3/2026:
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
                            {item.net_profit || 'Đang cập nhật'}
                          </span>
                          {item.prev_profit && (
                            <span className="text-xs text-[#64748b] font-mono">
                              (Cùng kỳ: <span className="text-slate-300">{item.prev_profit}</span>)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tăng trưởng YoY */}
                      <div className="space-y-0.5">
                        <div className="text-[11px] font-medium text-[#94a3b8]">
                          Tăng trưởng:
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base sm:text-lg font-black font-mono text-emerald-400 flex items-center gap-1">
                            {item.growth_rate || 'N/A'}
                            <Rocket className="size-4 text-emerald-400 animate-bounce" />
                          </span>
                          <span className="text-xs font-bold text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            YoY
                          </span>
                        </div>
                      </div>

                      {/* Giải trình sơ bộ */}
                      {item.explanation && (
                        <div className="space-y-0.5 sm:col-span-2 lg:col-span-1">
                          <div className="text-[11px] font-medium text-[#94a3b8]">
                            Nguyên nhân biến động:
                          </div>
                          <p className="text-xs text-[#cbd5e1] line-clamp-2 italic">
                            &quot;{item.explanation}&quot;
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dòng 4: Các nút hành động tải PDF và đối soát */}
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#1a212d] flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Link xem BCTC: [Tải file PDF] */}
                      {item.doc_url && (
                        <a
                          href={item.doc_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all cursor-pointer shadow-xs"
                        >
                          <Download className="size-3.5" />
                          <span>Tải BCTC Quý 3 (File PDF)</span>
                        </a>
                      )}

                      {/* Link công văn giải trình */}
                      {item.explanation_doc_url && (
                        <a
                          href={item.explanation_doc_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#182234] px-3 py-1.5 text-xs font-bold text-[#38bdf8] border border-[#0284c7]/40 hover:bg-[#202e46] transition-all cursor-pointer"
                        >
                          <FileText className="size-3.5" />
                          <span>Xem Công văn giải trình LNST</span>
                        </a>
                      )}
                    </div>

                    {/* Nguồn phát hiện */}
                    <div className="text-[11px] text-[#64748b] font-mono flex items-center gap-1">
                      <ShieldCheck className="size-3 text-emerald-500" />
                      <span>Nguồn: {item.source || 'Website & EzIR'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
