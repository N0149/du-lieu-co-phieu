'use client'

import React, { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import {
  Coins,
  TrendingUp,
  Banknote,
  Layers,
  Award,
  ShieldCheck,
  Sparkles,
  Scale,
  CalendarCheck,
  CheckCircle2,
  Globe2,
  History,
} from 'lucide-react'
import type { DividendHistoryPayload } from '@/lib/dividend-history-service'
import type { CompanyFullProfileData } from '@/lib/company-profile-types'
import { StockShareholdersAndInsidersCard } from './StockShareholdersAndInsidersCard'
import { cn } from '@/lib/utils'

function formatEventTitle(text: string, cashVnd: number | null, stockPct: number | null): string {
  if (!text) {
    if (cashVnd && cashVnd > 0) return `Cổ tức bằng tiền, tỷ lệ ${cashVnd.toLocaleString('vi-VN')}đ/CP`
    if (stockPct && stockPct > 0) {
      const p = stockPct <= 1 ? stockPct * 100 : stockPct
      return `Cổ tức bằng cổ phiếu, tỷ lệ ${Math.round(p)}%`
    }
    return 'Sự kiện doanh nghiệp'
  }

  // Khớp mẫu: "Trả cổ tức bằng tiền mặt - Đợt 2 2025 - 500 VND"
  const m1 = text.match(/Trả cổ tức bằng tiền mặt\s*-\s*Đợt\s*(\d+)\s*(\d{4})\s*-\s*([\d,.]+)\s*VND/i)
  if (m1) {
    const val = m1[3].replace(/,/g, '.')
    return `Cổ tức đợt ${m1[1]}/${m1[2]} bằng tiền, tỷ lệ ${val}đ/CP`
  }

  // Khớp mẫu: "Trả cổ tức bằng tiền mặt - Cả năm 2024 - 2,000 VND"
  const m2 = text.match(/Trả cổ tức bằng tiền mặt\s*-\s*Cả năm\s*(\d{4})\s*-\s*([\d,.]+)\s*VND/i)
  if (m2) {
    const val = m2[2].replace(/,/g, '.')
    return `Cổ tức năm ${m2[1]} bằng tiền, tỷ lệ ${val}đ/CP`
  }

  // Khớp mẫu quyền mua: "Phát hành cổ phiếu - Quyền mua CP cho Cổ đông hiện hữu tỉ lệ 50.0%"
  const m3 = text.match(/Quyền mua CP cho Cổ đông hiện hữu\s*tỉ lệ\s*([\d.]+)%/i)
  if (m3) {
    const pct = parseFloat(m3[1])
    let ratio = `${pct}%`
    if (Math.abs(pct - 50) < 0.1) ratio = '2:1'
    else if (Math.abs(pct - 100) < 0.1) ratio = '1:1'
    else if (Math.abs(pct - 20) < 0.1) ratio = '5:1'
    else if (Math.abs(pct - 25) < 0.1) ratio = '4:1'
    return `Phát hành CP cho CĐHH, tỷ lệ ${ratio}, giá 10000đ/CP`
  }

  // Khớp mẫu: "Trả cổ tức bằng cổ phiếu - Tỷ lệ 10%"
  const m4 = text.match(/Trả cổ tức bằng cổ phiếu\s*-\s*(.*)/i)
  if (m4) {
    return `Cổ tức bằng cổ phiếu, ${m4[1].trim()}`
  }

  return text
    .replace(/^Trả cổ tức bằng tiền mặt - /i, 'Cổ tức bằng tiền: ')
    .replace(/^Trả cổ tức bằng cổ phiếu - /i, 'Cổ tức bằng cổ phiếu: ')
    .replace(/^Phát hành cổ phiếu - /i, 'Phát hành CP: ')
}

interface StockDividendsTabProps {
  symbol: string
  companyName?: string
  dividendData: DividendHistoryPayload | null
  dividendYield?: number | null
  currentPrice?: number | null
  companyProfileData?: CompanyFullProfileData | null
}

function fmtNum(n: number | null | undefined, dec = 0): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })
}

function normalizeStockPct(val: number | null | undefined): number {
  if (val == null || isNaN(val) || val <= 0) return 0
  return val <= 1 ? Math.round(val * 100) : Math.round(val)
}

export function StockDividendsTab({
  symbol,
  companyName,
  dividendData,
  dividendYield,
  currentPrice,
  companyProfileData,
}: StockDividendsTabProps) {
  const [filterType, setFilterType] = useState<'all' | 'cash' | 'stock'>('all')

  // 1. Chuẩn hóa & bóc tách danh sách sự kiện cổ tức (mới nhất lên đầu)
  const processedEvents = useMemo(() => {
    if (!dividendData?.events || dividendData.events.length === 0) return []

    return [...dividendData.events]
      .filter((e) => {
        const hasCash = e.cashVnd != null && e.cashVnd > 0
        const hasStock = e.stockPct != null && e.stockPct > 0
        const hasTexts = Array.isArray(e.texts) && e.texts.length > 0
        return hasCash || hasStock || hasTexts
      })
      .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0))
      .map((e, idx) => {
        const hasCash = e.cashVnd != null && e.cashVnd > 0
        const stockPctNorm = normalizeStockPct(e.stockPct)
        const hasStock = stockPctNorm > 0

        const rawText = e.texts?.[0] || ''
        const isRightsIssue =
          e.eventType === 'rights' ||
          rawText.toLowerCase().includes('quyền mua') ||
          rawText.toLowerCase().includes('phát hành') ||
          rawText.toLowerCase().includes('cđhh')

        let eventType: 'cash' | 'stock' | 'rights' = 'cash'
        let typeBadge = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
        let typeLabel = 'Tiền mặt'

        if (isRightsIssue) {
          eventType = 'rights'
          typeBadge = 'bg-amber-500/15 text-amber-400 border-amber-500/30'
          typeLabel = 'Tăng vốn'
        } else if (hasCash && hasStock) {
          eventType = 'cash'
          typeBadge = 'bg-sky-500/15 text-sky-400 border-sky-500/30'
          typeLabel = 'Tiền & Cổ phiếu'
        } else if (hasStock) {
          eventType = 'stock'
          typeBadge = 'bg-blue-500/15 text-blue-400 border-blue-500/30'
          typeLabel = 'Cổ phiếu'
        }

        // Tiêu đề sự kiện chuẩn format như ảnh mẫu
        const displayTitle = e.eventTitle || formatEventTitle(rawText, e.cashVnd, e.stockPct)

        // Ngày thực hiện chi trả / thanh toán
        let displayExecDate = e.execDate || '—'
        if (!e.execDate && hasCash) {
          // Ước tính ~20 ngày sau ngày GDKHQ theo chuẩn thị trường VN
          try {
            const d = new Date(e.date)
            if (!isNaN(d.getTime())) {
              d.setDate(d.getDate() + 20)
              displayExecDate = d.toISOString().slice(0, 10)
            }
          } catch {}
        }

        return {
          id: `${e.date}-${idx}`,
          date: e.date,
          execDate: displayExecDate,
          title: displayTitle,
          eventType,
          typeLabel,
          typeBadge,
          cashVnd: e.cashVnd || 0,
          stockPct: stockPctNorm,
          year: e.date.slice(0, 4),
        }
      })
  }, [dividendData])

  // Lọc theo bộ lọc người dùng chọn
  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return processedEvents
    if (filterType === 'cash') return processedEvents.filter((e) => e.cashVnd > 0)
    if (filterType === 'stock') return processedEvents.filter((e) => e.stockPct > 0 || e.eventType === 'rights')
    return processedEvents
  }, [processedEvents, filterType])

  // 2. Dữ liệu biểu đồ tổng hợp theo năm (tối đa 6 năm gần nhất)
  const chartAnnualData = useMemo(() => {
    if (!dividendData?.events || dividendData.events.length === 0) return []

    const yearMap = new Map<string, { year: string; cashTotal: number; stockTotal: number }>()

    for (const e of dividendData.events) {
      if (!e.date || e.date.length < 4) continue
      const y = e.date.slice(0, 4)
      const cur = yearMap.get(y) || { year: y, cashTotal: 0, stockTotal: 0 }

      if (e.cashVnd && e.cashVnd > 0) {
        cur.cashTotal += e.cashVnd
      }
      if (e.stockPct && e.stockPct > 0) {
        cur.stockTotal += normalizeStockPct(e.stockPct)
      }
      yearMap.set(y, cur)
    }

    const allYears = Array.from(yearMap.values()).sort((a, b) => (a.year > b.year ? 1 : -1))

    if (allYears.length > 6) {
      return allYears.slice(-6)
    }
    return allYears
  }, [dividendData])

  // 3. Các chỉ số KPI tổng hợp và phân tích chính sách
  const stats = useMemo(() => {
    const totalEvents = processedEvents.length
    const cashEvents = processedEvents.filter((e) => e.cashVnd > 0)
    const rightsEvents = processedEvents.filter((e) => e.eventType === 'rights')
    const cumulativeCash = processedEvents.reduce((acc, e) => acc + (e.cashVnd || 0), 0)

    // Năm gần nhất và số tiền năm gần nhất
    const latestYear = chartAnnualData.length > 0 ? chartAnnualData[chartAnnualData.length - 1] : null
    const latestCashYear = latestYear?.cashTotal || 0

    // Đếm số năm trả tiền mặt trong 6 năm gần nhất
    const recentCashYearsCount = chartAnnualData.filter((c) => c.cashTotal > 0).length
    const totalRecentYears = chartAnnualData.length

    return {
      totalEvents,
      cashCount: cashEvents.length,
      rightsCount: rightsEvents.length,
      latestYear: latestYear?.year || '',
      latestCashYear,
      cumulativeCash,
      cashConsistency: `${recentCashYearsCount}/${totalRecentYears || 1}`,
      isRegular: recentCashYearsCount >= Math.min(4, totalRecentYears),
    }
  }, [processedEvents, chartAnnualData])

  // Tỷ suất cổ tức thực tế
  const effectiveDy = useMemo(() => {
    if (dividendYield != null && dividendYield > 0) return dividendYield
    if (currentPrice && currentPrice > 0 && stats.latestCashYear > 0) {
      return (stats.latestCashYear / currentPrice) * 100
    }
    return null
  }, [dividendYield, currentPrice, stats.latestCashYear])

  // Đánh giá chính sách phân phối
  const policyAssessment = useMemo(() => {
    const dy = effectiveDy || 0
    if (stats.rightsCount > stats.cashCount && dy < 3) {
      return {
        badge: 'Ưu tiên Tăng trưởng & Mở rộng',
        badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        desc: `Doanh nghiệp ưu tiên giữ lại dòng tiền và phát hành tăng vốn / ESOP để đầu tư phát triển quy mô, phù hợp trường phái đầu tư tăng trưởng (Growth Stock).`,
      }
    }
    if (dy >= 6) {
      return {
        badge: 'Cổ tức Tiền mặt Hấp dẫn',
        badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        desc: `Tỷ suất cổ tức ${dy.toFixed(1)}% vượt trội so với lãi suất tiết kiệm ngân hàng (~5.0%/năm). Dòng tiền chi trả dồi dào, phù hợp trường phái phòng thủ tích sản.`,
      }
    }
    return {
      badge: 'Cân bằng Chi trả & Tái đầu tư',
      badgeColor: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      desc: `Duy trì chi trả cổ tức tiền mặt đều đặn hàng năm song song với tái đầu tư mở rộng chuỗi hoạt động kinh doanh cốt lõi.`,
    }
  }, [effectiveDy, stats.rightsCount, stats.cashCount])

  if (!dividendData || processedEvents.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-xs">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-4">
          <Coins className="size-7" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Chưa Có Dữ Liệu Lịch Sử Cổ Tức</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
          Mã cổ phiếu <span className="font-mono font-bold text-foreground">{symbol}</span> chưa ghi nhận sự kiện chi trả cổ tức tiền mặt hoặc phát hành cổ phiếu thưởng trong hệ thống.
        </p>
      </div>
    )
  }

  const foreignRate = companyProfileData?.ownership?.foreign ?? null
  const insiderTradesCount = companyProfileData?.insiderTrades?.length ?? null

  return (
    <div className="space-y-4 w-full">
      {/* ── 1. CÁC THẺ KPI TÓM TẮT CỔ TỨC (4 THẺ CÂN XỨNG TRÊN 1160PX) ── */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {/* Tỷ suất cổ tức */}
        <div className="rounded-xl border border-border/70 bg-card/90 p-3 sm:p-3.5 shadow-2xs hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tỷ suất cổ tức (DY)</span>
            <div className="flex size-6 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <TrendingUp className="size-3" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="font-mono text-xl sm:text-2xl font-black text-emerald-500 dark:text-emerald-400">
              {effectiveDy != null && effectiveDy > 0 ? `${effectiveDy.toFixed(1)}%` : '—'}
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground">/ năm</span>
          </div>
          <p className="mt-0.5 text-[10.5px] text-muted-foreground truncate">
            {currentPrice ? `Giá: ${fmtNum(currentPrice)}đ` : 'Trên thị giá hiện tại'}
          </p>
        </div>

        {/* Cổ tức tiền mặt năm gần nhất */}
        <div className="rounded-xl border border-border/70 bg-card/90 p-3 sm:p-3.5 shadow-2xs hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cổ tức tiền {stats.latestYear}</span>
            <div className="flex size-6 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
              <Banknote className="size-3" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="font-mono text-xl sm:text-2xl font-black text-foreground">
              {fmtNum(stats.latestCashYear)}
            </span>
            <span className="text-xs font-bold text-muted-foreground">đ/CP</span>
          </div>
          <p className="mt-0.5 text-[10.5px] text-muted-foreground truncate">
            {stats.latestCashYear > 0 ? `Đã chi trả năm ${stats.latestYear}` : 'Chưa công bố đợt mới'}
          </p>
        </div>

        {/* Tổng số đợt chi trả */}
        <div className="rounded-xl border border-border/70 bg-card/90 p-3 sm:p-3.5 shadow-2xs hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tổng đợt sự kiện</span>
            <div className="flex size-6 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
              <Layers className="size-3" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="font-mono text-xl sm:text-2xl font-black text-foreground">
              {stats.totalEvents}
            </span>
            <span className="text-xs font-bold text-muted-foreground">lần</span>
          </div>
          <p className="mt-0.5 text-[10.5px] text-muted-foreground truncate">
            {stats.cashCount} lần trả tiền mặt
          </p>
        </div>

        {/* Đợt phát hành tăng vốn */}
        <div className="rounded-xl border border-border/70 bg-card/90 p-3 sm:p-3.5 shadow-2xs hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Phát hành tăng vốn</span>
            <div className="flex size-6 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
              <Award className="size-3" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="font-mono text-xl sm:text-2xl font-black text-purple-400">
              {stats.rightsCount}
            </span>
            <span className="text-xs font-bold text-muted-foreground">đợt</span>
          </div>
          <p className="mt-0.5 text-[10.5px] text-muted-foreground truncate">
            ESOP / Quyền mua / Cổ phiếu
          </p>
        </div>
      </div>

      {/* ── 2. BỐ CỤC CHÍNH CÂN BẰNG TOÀN DIỆN: CỔ TỨC (TRÁI) & CỔ ĐÔNG + MUA BÁN NỘI BỘ (PHẢI) ── */}
      <div className="grid grid-cols-1 2xl:grid-cols-12 gap-4 items-stretch">
        
        {/* ── KHỐI TRÁI (2XL: 7 CỘT, ~58%): LỊCH SỬ CỔ TỨC & BIỂU ĐỒ + NHẬN ĐỊNH ── */}
        <div className="2xl:col-span-7 flex flex-col md:flex-row gap-3.5 items-stretch">
          
          {/* Bảng Sự Kiện Cổ Tức (Chuẩn 1 dòng duy nhất, không rớt dòng) */}
          <div className="w-full md:w-[58%] shrink-0 flex flex-col rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden h-[630px]">
          {/* Header bảng & bộ lọc */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-3.5 border-b border-border/60 bg-muted/20 shrink-0">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-tight text-foreground flex items-center gap-1.5">
                <span>Lịch Sử Cổ Tức & Sự Kiện</span>
                <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 font-mono text-[10.5px] font-bold">
                  {symbol}
                </span>
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Chi tiết ngày GDKHQ, nội dung chia cổ tức & ngày thực hiện
              </p>
            </div>

            {/* Nút lọc: Tất cả | Tiền mặt | Cổ phiếu & Tăng vốn */}
            <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/50 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={cn(
                  'px-2.5 py-1 rounded-md transition-all cursor-pointer text-xs',
                  filterType === 'all'
                    ? 'bg-background text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Tất cả ({processedEvents.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('cash')}
                className={cn(
                  'px-2.5 py-1 rounded-md transition-all cursor-pointer text-xs',
                  filterType === 'cash'
                    ? 'bg-background text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Tiền mặt ({stats.cashCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('stock')}
                className={cn(
                  'px-2.5 py-1 rounded-md transition-all cursor-pointer text-xs',
                  filterType === 'stock'
                    ? 'bg-background text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Cổ phiếu & Vốn ({stats.rightsCount})
              </button>
            </div>
          </div>

          {/* Vùng cuộn bảng cố định: Header dính, các hàng cuộn mượt */}
          <div className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40">
            <table className="w-full text-left border-collapse text-xs">
              <colgroup>
                <col className="w-[105px]" />
                <col className="w-auto" />
                <col className="w-[115px]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-md shadow-2xs">
                <tr className="border-b border-border/80 text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-9">
                  <th className="py-2.5 px-3 sm:px-3.5 whitespace-nowrap w-[105px]">
                    GD KHQ
                  </th>
                  <th className="py-2.5 px-3 whitespace-nowrap">
                    SỰ KIỆN
                  </th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-left w-[115px]">
                    THỰC HIỆN
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredEvents.map((evt) => (
                  <tr
                    key={evt.id}
                    className="hover:bg-muted/40 transition-colors group cursor-default h-10"
                  >
                    {/* Ngày GD KHQ */}
                    <td className="py-2 px-3 sm:px-3.5 font-mono font-medium text-foreground/85 whitespace-nowrap align-middle">
                      {evt.date}
                    </td>

                    {/* Sự kiện (Tiêu đề + Tag cùng dòng, KHÔNG BAO GIỜ XUỐNG DÒNG, ĐỒNG ĐỀU ĐẸP) */}
                    <td className="py-2 px-3 align-middle">
                      <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden">
                        <span
                          className="font-semibold text-foreground text-xs group-hover:text-primary transition-colors truncate"
                          title={evt.title}
                        >
                          {evt.title}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase shrink-0',
                            evt.typeBadge
                          )}
                        >
                          {evt.typeLabel}
                        </span>
                      </div>
                    </td>

                    {/* Ngày thực hiện (Nằm ngay sát cột Sự Kiện, căn trái) */}
                    <td className="py-2 px-3 font-mono font-medium text-muted-foreground whitespace-nowrap text-left align-middle">
                      {evt.execDate !== '—' ? (
                        <span className="text-foreground/85">{evt.execDate}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer bảng tóm tắt */}
          <div className="flex items-center justify-between px-3.5 py-2 border-t border-border/60 bg-muted/20 text-[11px] text-muted-foreground shrink-0">
            <span>Hiển thị <strong>{filteredEvents.length}</strong> / {processedEvents.length} sự kiện</span>
            <span className="font-mono text-[10.5px]">Cuộn danh sách để xem thêm các năm trước ↓</span>
          </div>
        </div>

        {/* ── CỘT PHẢI: 2 BIỂU ĐỒ + THẺ PHÂN TÍCH CHÍNH SÁCH (ĐƯA HẲN SANG BÊN NÀY, LIỀN KỀ BẢNG) ── */}
        <div className="w-full lg:flex-1 xl:w-[490px] xl:flex-none shrink-0 flex flex-col justify-between space-y-3.5 h-[630px]">
          
          {/* ── Biểu đồ 1: Cổ tức bằng tiền (đ) ── */}
          <div className="rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-xs flex flex-col h-[215px]">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border/50 shrink-0">
              <h4 className="text-xs sm:text-sm font-extrabold text-sky-500 dark:text-sky-400 tracking-tight flex items-center gap-1.5">
                <Banknote className="size-3.5" />
                <span>Cổ tức bằng tiền (đ)</span>
              </h4>
              <span className="text-[10.5px] font-mono text-muted-foreground font-semibold">
                Đơn vị: VNĐ/CP
              </span>
            </div>

            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartAnnualData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(148, 163, 184, 0.15)"
                  />
                  <XAxis
                    dataKey="year"
                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickFormatter={(v) => (v >= 1000 ? `${v.toLocaleString('vi-VN')}` : `${v}`)}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null
                      const d = payload[0].payload
                      return (
                        <div className="rounded-xl border border-border/80 bg-background/95 p-2.5 shadow-lg backdrop-blur-md">
                          <p className="font-mono text-xs font-bold text-muted-foreground">
                            Năm {d.year}
                          </p>
                          <p className="mt-0.5 font-mono text-xs font-extrabold text-[#e05e54]">
                            Cổ tức tiền: {fmtNum(d.cashTotal)} đ/CP
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Bar
                    dataKey="cashTotal"
                    fill="#e05e54"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={38}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Biểu đồ 2: Cổ tức bằng CP (%) ── */}
          <div className="rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-xs flex flex-col h-[185px]">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border/50 shrink-0">
              <h4 className="text-xs sm:text-sm font-extrabold text-sky-500 dark:text-sky-400 tracking-tight flex items-center gap-1.5">
                <Award className="size-3.5" />
                <span>Cổ tức bằng CP (%)</span>
              </h4>
              <span className="text-[10.5px] font-mono text-muted-foreground font-semibold">
                Đơn vị: %
              </span>
            </div>

            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartAnnualData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(148, 163, 184, 0.15)"
                  />
                  <XAxis
                    dataKey="year"
                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    domain={[0, (dataMax: number) => Math.max(1, dataMax)]}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null
                      const d = payload[0].payload
                      return (
                        <div className="rounded-xl border border-border/80 bg-background/95 p-2.5 shadow-lg backdrop-blur-md">
                          <p className="font-mono text-xs font-bold text-muted-foreground">
                            Năm {d.year}
                          </p>
                          <p className="mt-0.5 font-mono text-xs font-extrabold text-sky-400">
                            Cổ tức cổ phiếu: {d.stockTotal}%
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Bar
                    dataKey="stockTotal"
                    fill="#38bdf8"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={38}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Thẻ Phân Tích Thông Minh: Triệt tiêu hoàn toàn khoảng trống đen thừa ── */}
          <div className="rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-xs flex flex-col justify-between h-[200px]">
            <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
              <h4 className="text-xs sm:text-sm font-extrabold text-foreground tracking-tight flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-emerald-400" />
                <span>Nhận Định Chính Sách Cổ Tức</span>
              </h4>
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', policyAssessment.badgeColor)}>
                {policyAssessment.badge}
              </span>
            </div>

            {/* 4 Chỉ số nhanh */}
            <div className="grid grid-cols-2 gap-2 my-1">
              <div className="rounded-lg bg-muted/40 p-2 border border-border/50">
                <span className="text-[10px] font-medium text-muted-foreground block">Lũy kế tiền mặt đã trả</span>
                <span className="font-mono text-sm font-bold text-foreground">
                  {fmtNum(stats.cumulativeCash)} <span className="text-[10px] font-normal text-muted-foreground">đ/CP</span>
                </span>
              </div>
              <div className="rounded-lg bg-muted/40 p-2 border border-border/50">
                <span className="text-[10px] font-medium text-muted-foreground block">Mức độ chi trả đều đặn</span>
                <span className="font-mono text-sm font-bold text-emerald-400">
                  {stats.cashConsistency} <span className="text-[10px] font-normal text-muted-foreground">năm gần nhất</span>
                </span>
              </div>
              <div className="rounded-lg bg-muted/40 p-2 border border-border/50">
                <span className="text-[10px] font-medium text-muted-foreground block">So sánh Lãi suất NH (12T)</span>
                <span className="font-mono text-xs font-bold text-foreground">
                  {effectiveDy ? `${effectiveDy.toFixed(1)}%` : '—'} <span className="text-[10px] font-normal text-muted-foreground">vs 5.2%</span>
                </span>
              </div>
              <div className="rounded-lg bg-muted/40 p-2 border border-border/50">
                <span className="text-[10px] font-medium text-muted-foreground block">Cơ cấu chính sách vốn</span>
                <span className="font-mono text-xs font-bold text-purple-400">
                  {stats.cashCount} tiền · {stats.rightsCount} vốn
                </span>
              </div>
            </div>

            {/* Lời nhận định */}
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 bg-muted/20 rounded-md p-1.5 border border-border/40">
              {policyAssessment.desc}
            </p>
          </div>
          </div>
        </div>

        {/* ── KHỐI PHẢI (2XL: 5 CỘT, ~42%): CƠ CẤU CỔ ĐÔNG & GIAO DỊCH NỘI BỘ (LẤP ĐẦY TOÀN BỘ KHOẢNG TRỐNG BÊN PHẢI) ── */}
        <div className="2xl:col-span-5 w-full flex flex-col h-[630px]">
          <StockShareholdersAndInsidersCard
            symbol={symbol}
            companyProfileData={companyProfileData}
            className="h-full"
          />
        </div>

      </div>
    </div>
  )
}
