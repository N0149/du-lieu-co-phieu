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
import { ChartWatermark } from '@/components/ChartWatermark'

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

        const rawText = Array.isArray(e.texts) && e.texts.length > 0 ? e.texts.join(' & ') : (e.texts?.[0] || '')
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

  // Chuyển đổi tab con bên cột Cổ tức: Bảng sự kiện ('table') hoặc Biểu đồ & Nhận định ('charts')
  const [dividendSubTab, setDividendSubTab] = useState<'table' | 'charts'>('table')

  // Thống kê nhanh dữ liệu nội bộ cho KPI Card đầu tiên
  const insiderSummary = useMemo(() => {
    const trades = companyProfileData?.insiderTrades || []
    let buyVol = 0
    let sellVol = 0
    let buyCount = 0
    let sellCount = 0
    let planCount = 0

    for (const t of trades) {
      if (t.volumeTraded === 0 && t.volumeRegistered > 0) {
        planCount++
      } else if (t.action === 'BUY') {
        buyCount++
        buyVol += t.volumeTraded || 0
      } else if (t.action === 'SELL') {
        sellCount++
        sellVol += t.volumeTraded || 0
      }
    }

    const netVol = buyVol - sellVol
    const latestTrade = trades[0]

    return {
      totalTrades: trades.length,
      buyCount,
      sellCount,
      planCount,
      buyVol,
      sellVol,
      netVol,
      latestTrade,
    }
  }, [companyProfileData])

  const hasEvents = processedEvents.length > 0

  const foreignRate = companyProfileData?.ownership?.foreign ?? null
  const insiderTradesCount = companyProfileData?.insiderTrades?.length ?? null

  return (
    <div className="space-y-4 w-full">
      {/* ── 1. CÁC THẺ KPI TỔNG HỢP: ƯU TIÊN NỘI BỘ LÊN ĐẦU & CHỈ SỐ CỔ TỨC ── */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {/* THẺ 1: GIAO DỊCH NỘI BỘ (ĐƯA LÊN TRƯỚC HÀNG ĐẦU) */}
        <div className="rounded-xl border border-border/70 bg-card/90 p-3 sm:p-3.5 shadow-2xs hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Giao dịch nội bộ</span>
            <div className="flex size-6 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
              <History className="size-3" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="font-mono text-xl sm:text-2xl font-black text-foreground">
              {insiderSummary.totalTrades > 0 ? insiderSummary.totalTrades : '—'}
            </span>
            <span className="text-xs font-bold text-muted-foreground">giao dịch</span>
          </div>
          <p className="mt-0.5 text-[10.5px] text-muted-foreground truncate">
            {insiderSummary.totalTrades > 0 ? (
              insiderSummary.netVol !== 0 ? (
                <span className={insiderSummary.netVol > 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                  {insiderSummary.netVol > 0 ? 'Mua ròng: +' : 'Bán ròng: '}{fmtNum(insiderSummary.netVol)} CP
                </span>
              ) : (
                <span>{insiderSummary.buyCount} mua · {insiderSummary.sellCount} bán</span>
              )
            ) : (
              'Chưa ghi nhận GD'
            )}
          </p>
        </div>

        {/* THẺ 2: TỶ SUẤT CỔ TỨC (DY) */}
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

        {/* THẺ 3: CỔ TỨC TIỀN MẶT GẦN NHẤT */}
        <div className="rounded-xl border border-border/70 bg-card/90 p-3 sm:p-3.5 shadow-2xs hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cổ tức tiền {stats.latestYear || 'gần nhất'}</span>
            <div className="flex size-6 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
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

        {/* THẺ 4: TỔNG ĐỢT SỰ KIỆN CỔ TỨC & TĂNG VỐN */}
        <div className="rounded-xl border border-border/70 bg-card/90 p-3 sm:p-3.5 shadow-2xs hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tổng đợt sự kiện</span>
            <div className="flex size-6 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
              <Layers className="size-3" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="font-mono text-xl sm:text-2xl font-black text-purple-400">
              {stats.totalEvents}
            </span>
            <span className="text-xs font-bold text-muted-foreground">lần</span>
          </div>
          <p className="mt-0.5 text-[10.5px] text-muted-foreground truncate">
            {stats.cashCount} lần tiền · {stats.rightsCount} đợt vốn
          </p>
        </div>
      </div>

      {/* ── 2. BỐ CỤC 2 CỘT CÂN ĐỐI (ƯU TIÊN NỘI BỘ LÊN ĐẦU/TRÁI, CỔ TỨC BÊN PHẢI) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        
        {/* ── CỘT 1 (BÊN TRÁI, XL: 6 CỘT / 2XL: 7 CỘT): GIAO DỊCH NỘI BỘ & CƠ CẤU CỔ ĐÔNG (ƯU TIÊN HÀNG ĐẦU) ── */}
        <div className="xl:col-span-6 2xl:col-span-7 w-full flex flex-col min-h-[580px] xl:h-[640px]">
          <StockShareholdersAndInsidersCard
            symbol={symbol}
            companyProfileData={companyProfileData}
            className="h-full"
          />
        </div>

        {/* ── CỘT 2 (BÊN PHẢI, XL: 6 CỘT / 2XL: 5 CỘT): LỊCH SỬ CỔ TỨC & CHÍNH SÁCH PHÂN PHỐI ── */}
        <div className="xl:col-span-6 2xl:col-span-5 w-full flex flex-col min-h-[580px] xl:h-[640px] rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
          
          {/* Header Bảng Cổ Tức với Tabs chuyển đổi & Bộ Lọc */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-3.5 border-b border-border/60 bg-muted/20 shrink-0">
            {/* Tabs chuyển đổi giữa Bảng Sự Kiện và Biểu Đồ & Nhận Định */}
            <div className="flex items-center rounded-xl bg-muted/70 p-1 border border-border/60 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDividendSubTab('table')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer text-xs font-bold',
                  dividendSubTab === 'table'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Coins className="size-3.5 text-sky-400" />
                <span>Lịch Sử Cổ Tức</span>
                {processedEvents.length > 0 && (
                  <span className="rounded-full bg-sky-500/15 text-sky-400 px-1.5 py-0.2 text-[10px] font-mono">
                    {processedEvents.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setDividendSubTab('charts')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer text-xs font-bold',
                  dividendSubTab === 'charts'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <TrendingUp className="size-3.5 text-emerald-400" />
                <span>Biểu Đồ & Nhận Định</span>
              </button>
            </div>

            {/* Phía bên phải của Header: Bộ lọc cho Bảng hoặc Huy hiệu cho Biểu đồ */}
            {dividendSubTab === 'table' ? (
              hasEvents && (
                <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/50 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={cn(
                      'px-2 py-0.5 rounded-md transition-all cursor-pointer',
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
                      'px-2 py-0.5 rounded-md transition-all cursor-pointer',
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
                      'px-2 py-0.5 rounded-md transition-all cursor-pointer',
                      filterType === 'stock'
                        ? 'bg-background text-foreground shadow-xs font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Cổ phiếu & Vốn ({stats.rightsCount})
                  </button>
                </div>
              )
            ) : (
              <span className={cn('text-[10px] font-bold px-2.5 py-0.5 rounded-full border', policyAssessment.badgeColor)}>
                {policyAssessment.badge}
              </span>
            )}
          </div>

          {/* Nội dung Tab con Cổ Tức */}
          {!hasEvents ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                <Coins className="size-6" />
              </div>
              <h4 className="text-sm font-bold text-foreground">Chưa có dữ liệu cổ tức</h4>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                Mã <span className="font-mono font-bold text-foreground">{symbol}</span> chưa ghi nhận sự kiện chi trả cổ tức trong hệ thống.
              </p>
            </div>
          ) : dividendSubTab === 'table' ? (
            /* TAB 1: BẢNG SỰ KIỆN CỔ TỨC (RỘNG RÃI, KHÔNG RỚT DÒNG) */
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 min-h-0">
                <table className="w-full text-left border-collapse text-xs">
                  <colgroup>
                    <col className="w-[95px]" />
                    <col className="w-auto" />
                    <col className="w-[105px]" />
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-md shadow-2xs">
                    <tr className="border-b border-border/80 text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-9">
                      <th className="py-2.5 px-3 sm:px-3.5 whitespace-nowrap">GD KHQ</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">SỰ KIỆN</th>
                      <th className="py-2.5 px-3 whitespace-nowrap text-left">THỰC HIỆN</th>
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

                        {/* Sự kiện (Tiêu đề + Tag cùng dòng) */}
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

                        {/* Ngày thực hiện */}
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
          ) : (
            /* TAB 2: BIỂU ĐỒ & NHẬN ĐỊNH CHÍNH SÁCH (TRỰC QUAN, RỘNG RÃI) */
            <div className="flex-1 flex flex-col justify-between p-3.5 sm:p-4 overflow-y-auto space-y-3 min-h-0 scrollbar-thin">
              {/* Biểu đồ 1: Cổ tức bằng tiền (đ) */}
              <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs flex flex-col h-[200px] shrink-0">
                <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-border/40 shrink-0">
                  <h4 className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                    <Banknote className="size-3.5" />
                    <span>Cổ tức bằng tiền mặt (VNĐ/CP)</span>
                  </h4>
                  <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                    Theo năm
                  </span>
                </div>

                <div className="relative flex-1 w-full min-h-0">
                  <ChartWatermark domain="dulieudautu.com" brandName="Dữ Liệu Đầu Tư" size="sm" />
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

              {/* Biểu đồ 2: Cổ tức bằng CP (%) */}
              <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs flex flex-col h-[180px] shrink-0">
                <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-border/40 shrink-0">
                  <h4 className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                    <Award className="size-3.5" />
                    <span>Cổ tức bằng cổ phiếu & Thưởng (%)</span>
                  </h4>
                  <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                    Theo năm
                  </span>
                </div>

                <div className="relative flex-1 w-full min-h-0">
                  <ChartWatermark domain="dulieudautu.com" brandName="Dữ Liệu Đầu Tư" size="sm" />
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

              {/* Thẻ Phân Tích Thông Minh */}
              <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs flex flex-col justify-between shrink-0">
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
                <div className="grid grid-cols-2 gap-2 my-2">
                  <div className="rounded-lg bg-muted/40 p-2 border border-border/50">
                    <span className="text-[10px] font-medium text-muted-foreground block">Lũy kế tiền mặt đã trả</span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-foreground">
                      {fmtNum(stats.cumulativeCash)} <span className="text-[10px] font-normal text-muted-foreground">đ/CP</span>
                    </span>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2 border border-border/50">
                    <span className="text-[10px] font-medium text-muted-foreground block">Mức độ chi trả đều đặn</span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-emerald-400">
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
                <p className="text-[11px] text-muted-foreground leading-relaxed bg-muted/20 rounded-md p-1.5 border border-border/40">
                  {policyAssessment.desc}
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
