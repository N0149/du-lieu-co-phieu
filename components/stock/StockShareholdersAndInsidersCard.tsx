'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  Users,
  History,
  Building2,
  Landmark,
  User,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Globe2,
} from 'lucide-react'
import type {
  CompanyFullProfileData,
  ShareholderItem,
  InsiderTradeItem,
} from '@/lib/company-profile-types'
import { cn } from '@/lib/utils'

interface StockShareholdersAndInsidersCardProps {
  symbol: string
  companyProfileData?: CompanyFullProfileData | null
  className?: string
}

function fmtNum(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN')
}

// Phân biệt cá nhân hay tổ chức dựa trên tên
function isOrganization(name: string): boolean {
  if (!name) return false
  const lower = name.toLowerCase()
  return (
    lower.includes('công ty') ||
    lower.includes('tổng công ty') ||
    lower.includes('tập đoàn') ||
    lower.includes('quỹ') ||
    lower.includes('fund') ||
    lower.includes('bank') ||
    lower.includes('ngân hàng') ||
    lower.includes('ltd') ||
    lower.includes('pte') ||
    lower.includes('invest') ||
    lower.includes('corp') ||
    lower.includes('chứng khoán') ||
    lower.includes('bảo hiểm') ||
    lower.includes('scic') ||
    lower.includes('trust') ||
    lower.includes('holding') ||
    lower.includes('capital')
  )
}

// Lấy chữ cái đại diện tên
function getInitials(name: string): string {
  if (!name) return 'CD'
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

export function StockShareholdersAndInsidersCard({
  symbol,
  companyProfileData: initialData,
  className,
}: StockShareholdersAndInsidersCardProps) {
  const [profileData, setProfileData] = useState<CompanyFullProfileData | null>(initialData || null)
  const [loading, setLoading] = useState<boolean>(!initialData)
  
  // Tab chính: Cổ đông lớn ('shareholders') hoặc Giao dịch nội bộ ('trades')
  const [activeTab, setActiveTab] = useState<'shareholders' | 'trades'>('shareholders')
  
  // Bộ lọc cổ đông: Tất cả | Cá nhân | Tổ chức
  const [shFilter, setShFilter] = useState<'all' | 'individual' | 'org'>('all')
  
  // Bộ lọc giao dịch nội bộ: Tất cả | Mua | Bán | Đăng ký
  const [tradeFilter, setTradeFilter] = useState<'all' | 'buy' | 'sell' | 'plan'>('all')

  // Tự động nạp dữ liệu từ API nếu chưa có qua props
  useEffect(() => {
    if (initialData) {
      setProfileData(initialData)
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
  }, [symbol, initialData])

  // 1. Phân loại danh sách cổ đông
  const rawShareholders = profileData?.ownership?.shareholders || []
  
  const filteredShareholders = useMemo(() => {
    return rawShareholders.filter((sh) => {
      const isOrg = isOrganization(sh.name)
      if (shFilter === 'individual') return !isOrg
      if (shFilter === 'org') return isOrg
      return true
    })
  }, [rawShareholders, shFilter])

  // Tính toán tỷ trọng các nhóm cổ đông quan trọng
  const ownershipGroups = useMemo(() => {
    const foreign = profileData?.ownership?.foreign ?? 0
    const state = profileData?.ownership?.state ?? 0

    let leadershipRate = 0
    let orgRate = 0

    for (const sh of rawShareholders) {
      if (isOrganization(sh.name)) {
        orgRate += sh.rate || 0
      } else {
        leadershipRate += sh.rate || 0
      }
    }

    // Làm tròn 2 chữ số
    const roundedLead = Math.min(100, Math.round(leadershipRate * 100) / 100)
    const roundedOrg = Math.min(100, Math.round(orgRate * 100) / 100)
    const roundedForeign = Math.round(foreign * 100) / 100
    const otherRate = Math.max(0, Math.round((100 - (roundedLead + roundedOrg + roundedForeign)) * 100) / 100)

    return {
      leadershipRate: roundedLead > 0 ? roundedLead : (state > 0 ? state : 0),
      orgRate: roundedOrg,
      foreignRate: roundedForeign,
      otherRate,
    }
  }, [profileData, rawShareholders])

  // 2. Xử lý danh sách giao dịch nội bộ
  const rawTrades = profileData?.insiderTrades || []

  const tradeStats = useMemo(() => {
    let buyVol = 0
    let sellVol = 0
    let buyCount = 0
    let sellCount = 0

    for (const t of rawTrades) {
      if (t.action === 'BUY' && t.volumeTraded > 0) {
        buyVol += t.volumeTraded
        buyCount++
      } else if (t.action === 'SELL' && t.volumeTraded > 0) {
        sellVol += t.volumeTraded
        sellCount++
      }
    }

    return {
      buyVol,
      sellVol,
      buyCount,
      sellCount,
      netVol: buyVol - sellVol,
      totalCount: rawTrades.length,
    }
  }, [rawTrades])

  const filteredTrades = useMemo(() => {
    return rawTrades.filter((t) => {
      const isPlan = t.volumeTraded === 0 && t.volumeRegistered > 0
      if (tradeFilter === 'buy') return t.action === 'BUY' && t.volumeTraded > 0
      if (tradeFilter === 'sell') return t.action === 'SELL' && t.volumeTraded > 0
      if (tradeFilter === 'plan') return isPlan
      return true
    })
  }, [rawTrades, tradeFilter])

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden h-[630px]',
        className
      )}
    >
      {/* ── HEADER: SWITCHER CỔ ĐÔNG LỚN vs GIAO DỊCH NỘI BỘ & BỘ LỌC ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 sm:p-3.5 border-b border-border/60 bg-muted/20 shrink-0">
        {/* Nút chuyển đổi Tab chính */}
        <div className="flex items-center rounded-xl bg-muted/70 p-1 border border-border/60 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('shareholders')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer text-xs font-bold',
              activeTab === 'shareholders'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Users className="size-3.5 text-primary" />
            <span>Cổ Đông Lớn</span>
            {rawShareholders.length > 0 && (
              <span className="rounded-full bg-primary/15 text-primary px-1.5 py-0.2 text-[10px] font-mono">
                {rawShareholders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trades')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer text-xs font-bold',
              activeTab === 'trades'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <History className="size-3.5 text-amber-500" />
            <span>Giao Dịch Nội Bộ</span>
            {rawTrades.length > 0 && (
              <span className="rounded-full bg-amber-500/15 text-amber-500 px-1.5 py-0.2 text-[10px] font-mono">
                {rawTrades.length}
              </span>
            )}
          </button>
        </div>

        {/* Nút lọc phụ theo từng tab */}
        {activeTab === 'shareholders' ? (
          <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/50 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setShFilter('all')}
              className={cn(
                'px-2 py-0.5 rounded-md transition-all cursor-pointer',
                shFilter === 'all'
                  ? 'bg-background text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setShFilter('individual')}
              className={cn(
                'px-2 py-0.5 rounded-md transition-all cursor-pointer',
                shFilter === 'individual'
                  ? 'bg-background text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Cá nhân
            </button>
            <button
              type="button"
              onClick={() => setShFilter('org')}
              className={cn(
                'px-2 py-0.5 rounded-md transition-all cursor-pointer',
                shFilter === 'org'
                  ? 'bg-background text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Tổ chức
            </button>
          </div>
        ) : (
          <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/50 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setTradeFilter('all')}
              className={cn(
                'px-2 py-0.5 rounded-md transition-all cursor-pointer',
                tradeFilter === 'all'
                  ? 'bg-background text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setTradeFilter('buy')}
              className={cn(
                'px-2 py-0.5 rounded-md transition-all cursor-pointer',
                tradeFilter === 'buy'
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Mua ({tradeStats.buyCount})
            </button>
            <button
              type="button"
              onClick={() => setTradeFilter('sell')}
              className={cn(
                'px-2 py-0.5 rounded-md transition-all cursor-pointer',
                tradeFilter === 'sell'
                  ? 'bg-rose-500/20 text-rose-400 font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Bán ({tradeStats.sellCount})
            </button>
          </div>
        )}
      </div>

      {/* ── NỘI DUNG CHÍNH (THEO TAB) ── */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs text-muted-foreground">Đang tải danh sách cổ đông & giao dịch {symbol}...</p>
        </div>
      ) : activeTab === 'shareholders' ? (
        /* ══════════════════════════════════════════════════════════ */
        /* TAB 1: CỔ ĐÔNG LỚN & NHÓM CỔ ĐÔNG QUAN TRỌNG (CHUẨN ẢNH MẪU) */
        /* ══════════════════════════════════════════════════════════ */
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* Cột trái mini: NHÓM CỔ ĐÔNG QUAN TRỌNG */}
          <div className="w-full md:w-[170px] lg:w-[185px] shrink-0 border-b md:border-b-0 md:border-r border-border/60 bg-muted/10 p-3 sm:p-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground pb-1 border-b border-border/40">
                Nhóm Cổ Đông Quan Trọng
              </div>

              <div className="space-y-2.5">
                {/* Ban lãnh đạo */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <User className="size-3 text-amber-400" />
                    <span>Ban lãnh đạo</span>
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {ownershipGroups.leadershipRate > 0 ? `${ownershipGroups.leadershipRate.toFixed(2)}%` : '—'}
                  </span>
                </div>

                {/* Tổ chức */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Building2 className="size-3 text-sky-400" />
                    <span>Tổ chức</span>
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {ownershipGroups.orgRate > 0 ? `${ownershipGroups.orgRate.toFixed(2)}%` : '—'}
                  </span>
                </div>

                {/* Nước ngoài */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Globe2 className="size-3 text-emerald-400" />
                    <span>Nước ngoài</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-500 dark:text-emerald-400">
                    {ownershipGroups.foreignRate > 0 ? `${ownershipGroups.foreignRate.toFixed(2)}%` : '—'}
                  </span>
                </div>

                {/* Cổ đông khác */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                  <span className="text-muted-foreground/80 font-medium text-[11px]">
                    Trôi nổi tự do
                  </span>
                  <span className="font-mono text-xs font-semibold text-muted-foreground">
                    {ownershipGroups.otherRate > 0 ? `${ownershipGroups.otherRate.toFixed(2)}%` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Chú thích thông minh */}
            <div className="pt-3 border-t border-border/40 text-[10.5px] text-muted-foreground leading-relaxed hidden md:block">
              <span className="font-semibold text-foreground/90">Lưu ý:</span> Tỷ lệ được tổng hợp từ dữ liệu công bố thông tin và danh sách chốt cổ đông gần nhất của {symbol}.
            </div>
          </div>

          {/* Cột phải: BẢNG CỔ ĐÔNG LỚN */}
          <div className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 min-h-0">
            {filteredShareholders.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <Users className="size-8 mb-2 opacity-40" />
                <p className="text-xs">Chưa ghi nhận cổ đông lớn phù hợp với bộ lọc.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <colgroup>
                  <col className="w-auto" />
                  <col className="w-[105px]" />
                  <col className="w-[85px]" />
                  <col className="w-[90px]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-md shadow-2xs">
                  <tr className="border-b border-border/80 text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-9">
                    <th className="py-2.5 px-3 sm:px-3.5 whitespace-nowrap">
                      TÊN
                    </th>
                    <th className="py-2.5 px-2 whitespace-nowrap text-right">
                      SỐ CP
                    </th>
                    <th className="py-2.5 px-2 whitespace-nowrap text-right">
                      TỶ LỆ (%)
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right">
                      CẬP NHẬT
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredShareholders.map((sh, idx) => {
                    const isOrg = isOrganization(sh.name)
                    return (
                      <tr
                        key={idx}
                        className="hover:bg-muted/40 transition-colors group cursor-default h-11"
                      >
                        {/* Avatar & Tên Cổ đông */}
                        <td className="py-2 px-3 sm:px-3.5 align-middle">
                          <div className="flex items-center gap-2.5">
                            {/* Avatar icon */}
                            <div
                              className={cn(
                                'flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-[10px] font-bold border',
                                isOrg
                                  ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              )}
                            >
                              {isOrg ? (
                                <Landmark className="size-3.5" />
                              ) : (
                                <span>{getInitials(sh.name)}</span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1 leading-tight">
                              <p className="font-bold text-foreground text-xs group-hover:text-primary transition-colors truncate" title={sh.name}>
                                {sh.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                {isOrg ? 'Tổ chức / Quỹ đầu tư' : 'Cổ đông cá nhân / Lãnh đạo'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Số CP */}
                        <td className="py-2 px-2 font-mono text-xs font-semibold text-foreground/90 whitespace-nowrap text-right align-middle">
                          {sh.shares}
                        </td>

                        {/* Tỷ lệ % */}
                        <td className="py-2 px-2 font-mono text-xs font-bold text-emerald-500 dark:text-emerald-400 whitespace-nowrap text-right align-middle">
                          {sh.rate > 0 ? `${sh.rate.toFixed(2)}%` : '—'}
                        </td>

                        {/* Ngày cập nhật */}
                        <td className="py-2 px-3 font-mono text-[10.5px] text-muted-foreground whitespace-nowrap text-right align-middle">
                          {sh.updated || '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════ */
        /* TAB 2: GIAO DỊCH NGƯỜI NỘI BỘ (INSIDER TRADES)            */
        /* ══════════════════════════════════════════════════════════ */
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Thanh tóm tắt Mua / Bán */}
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-border/50 bg-muted/15 text-xs shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-500 font-semibold text-[11px]">
                <ArrowUpRight className="size-3.5" />
                <span>Mua: <b>+{fmtNum(tradeStats.buyVol)}</b> CP</span>
              </span>
              <span className="flex items-center gap-1 text-rose-500 font-semibold text-[11px]">
                <ArrowDownRight className="size-3.5" />
                <span>Bán: <b>-{fmtNum(tradeStats.sellVol)}</b> CP</span>
              </span>
            </div>

            <div className="font-mono text-[11px] font-bold">
              {tradeStats.netVol >= 0 ? (
                <span className="text-emerald-400">Mua ròng: +{fmtNum(tradeStats.netVol)} CP</span>
              ) : (
                <span className="text-rose-400">Bán ròng: {fmtNum(tradeStats.netVol)} CP</span>
              )}
            </div>
          </div>

          {/* Bảng giao dịch */}
          <div className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 min-h-0">
            {filteredTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <History className="size-8 mb-2 opacity-40" />
                <p className="text-xs">Chưa có giao dịch nội bộ phù hợp với bộ lọc này.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <colgroup>
                  <col className="w-[90px]" />
                  <col className="w-auto" />
                  <col className="w-[75px]" />
                  <col className="w-[105px]" />
                  <col className="w-[85px]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-md shadow-2xs">
                  <tr className="border-b border-border/80 text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-9">
                    <th className="py-2.5 px-3 whitespace-nowrap">
                      NGÀY
                    </th>
                    <th className="py-2.5 px-2 whitespace-nowrap">
                      NGƯỜI GIAO DỊCH
                    </th>
                    <th className="py-2.5 px-2 whitespace-nowrap text-center">
                      LOẠI
                    </th>
                    <th className="py-2.5 px-2 whitespace-nowrap text-right">
                      KHỐI LƯỢNG
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right">
                      SAU GD
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredTrades.map((t, idx) => {
                    const isBuy = t.action === 'BUY'
                    const isPlan = t.volumeTraded === 0 && t.volumeRegistered > 0

                    return (
                      <tr
                        key={idx}
                        className="hover:bg-muted/40 transition-colors group cursor-default h-11"
                      >
                        {/* Ngày */}
                        <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap align-middle">
                          {t.tradeDate}
                        </td>

                        {/* Người giao dịch & chức vụ */}
                        <td className="py-2 px-2 align-middle">
                          <div className="leading-tight">
                            <p className="font-semibold text-foreground text-xs truncate max-w-[200px]" title={t.traderName}>
                              {t.traderName}
                            </p>
                            {(t.traderPosition || t.leaderPosition || t.leaderName) && (
                              <p className="text-[10px] text-muted-foreground truncate max-w-[200px] mt-0.5">
                                {t.traderPosition || (t.leaderPosition ? `${t.leaderPosition} (${t.leaderName})` : t.leaderName)}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Loại giao dịch */}
                        <td className="py-2 px-2 text-center align-middle whitespace-nowrap">
                          {isPlan ? (
                            <span className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase text-amber-400">
                              Đăng ký
                            </span>
                          ) : isBuy ? (
                            <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase text-emerald-400">
                              MUA
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase text-rose-400">
                              BÁN
                            </span>
                          )}
                        </td>

                        {/* Khối lượng */}
                        <td className="py-2 px-2 font-mono text-xs font-bold whitespace-nowrap text-right align-middle">
                          <span className={isBuy ? 'text-emerald-400' : 'text-rose-400'}>
                            {fmtNum(isPlan ? t.volumeRegistered : t.volumeTraded)}
                          </span>
                        </td>

                        {/* Tỷ lệ sau GD */}
                        <td className="py-2 px-3 font-mono text-xs text-muted-foreground whitespace-nowrap text-right align-middle">
                          {t.ownershipRate != null && t.ownershipRate > 0 ? (
                            <span>{t.ownershipRate < 1 ? (t.ownershipRate * 100).toFixed(2) : t.ownershipRate.toFixed(2)}%</span>
                          ) : t.volumeAfter != null && t.volumeAfter > 0 ? (
                            <span title={`${fmtNum(t.volumeAfter)} CP`}>{fmtNum(t.volumeAfter)}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── FOOTER THÔNG TIN ── */}
      <div className="flex items-center justify-between px-3.5 py-2 border-t border-border/60 bg-muted/20 text-[11px] text-muted-foreground shrink-0">
        <span>
          {activeTab === 'shareholders'
            ? `Hiển thị ${filteredShareholders.length} / ${rawShareholders.length} cổ đông`
            : `Hiển thị ${filteredTrades.length} / ${rawTrades.length} giao dịch`}
        </span>
        <span className="font-mono text-[10.5px]">100% dữ liệu quản trị doanh nghiệp</span>
      </div>
    </div>
  )
}
