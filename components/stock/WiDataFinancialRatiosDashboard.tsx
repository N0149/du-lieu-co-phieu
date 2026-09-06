'use client'

import React, { useState, useEffect } from 'react'
import { Copy, Check, Info, Loader2, BarChart2, FileSpreadsheet } from 'lucide-react'
import type { WiDataFinancialRatiosPayload, RatioCardGroup, RatioItem } from '@/lib/financial-ratios-service'

interface WiDataFinancialRatiosDashboardProps {
  ticker: string
}

function MetricRow({ item }: { item: RatioItem }) {
  let valColor = 'text-slate-200'
  if (item.isPositive) {
    valColor = 'text-emerald-400'
  } else if (item.isNegative) {
    valColor = 'text-rose-400'
  } else if (item.isPercent) {
    valColor = 'text-slate-400'
  }
  if (item.value === '—') valColor = 'text-slate-500'

  return (
    <div className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-white/[0.04] transition-colors text-[11.5px] leading-tight">
      <span className="text-slate-400 pr-2 select-text">{item.label}</span>
      <span className={`font-mono font-medium whitespace-nowrap select-text ${valColor}`}>
        {item.value}
      </span>
    </div>
  )
}

function DashboardCard({ card }: { card: RatioCardGroup }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const text = card.items.map((it) => `${it.label}: ${it.value}`).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleExportCsv = () => {
    const headers = ['Chỉ tiêu', 'Giá trị']
    const rows = card.items.map((it) => [`"${it.label}"`, `"${it.value}"`])
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${card.title.replace(/\s+/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="rounded-xl border border-[#1f293d] bg-[#0c1017] p-3 sm:p-3.5 shadow-sm transition-all hover:border-[#2d3d5a] flex flex-col justify-between">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-[#1b2334] pb-2 mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
          {card.title}
        </span>
        <div className="flex items-center gap-1.5 text-slate-500">
          <button
            type="button"
            onClick={handleExportCsv}
            className="hover:text-slate-200 transition-colors p-0.5 rounded cursor-pointer"
            title="Xuất nhóm này ra Excel CSV"
          >
            <FileSpreadsheet className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="hover:text-slate-200 transition-colors p-0.5 rounded cursor-pointer"
            title="Sao chép số liệu nhóm này"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-400" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Card Items */}
      <div className="space-y-0.5 divide-y divide-white/[0.02]">
        {card.items.map((it, idx) => (
          <MetricRow key={idx} item={it} />
        ))}
      </div>
    </div>
  )
}

export function WiDataFinancialRatiosDashboard({ ticker }: WiDataFinancialRatiosDashboardProps) {
  const [data, setData] = useState<WiDataFinancialRatiosPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/stock/${encodeURIComponent(ticker)}/ratios`)
      .then((res) => {
        if (!res.ok) throw new Error('Chưa thể tải chỉ số tài chính')
        return res.json()
      })
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Lỗi không xác định')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [ticker])

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-7 animate-spin text-emerald-400" />
        <p>Đang tổng hợp chỉ số tài chính & TTM cho {ticker}...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-border bg-background p-10 text-center text-sm text-muted-foreground">
        <Info className="mx-auto mb-2 size-8 text-muted-foreground/40" />
        <p className="font-semibold text-foreground">Không có dữ liệu chỉ số tài chính cho {ticker}</p>
        <p className="text-xs mt-1">Dữ liệu BCTC đang được cập nhật hoặc mã cổ phiếu chưa công bố.</p>
      </div>
    )
  }

  const { cards, updatedAtPeriod } = data

  return (
    <div className="space-y-4 pt-1 pb-4 animate-in fade-in-50 duration-200">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <BarChart2 className="size-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
              Thống kê chính {data.symbol}
            </h2>
            <p className="text-xs text-slate-400 line-clamp-1">{data.companyName}</p>
          </div>
        </div>

        {updatedAtPeriod && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-white/[0.03] px-2.5 py-1 rounded-md border border-white/[0.05]">
            <span>* Dữ liệu cập nhật đến:</span>
            <span className="text-slate-200 font-semibold">{updatedAtPeriod}</span>
          </div>
        )}
      </div>

      {/* 3-Column Layout chuẩn WiData */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 items-start">
        {/* CỘT 1: Giá & Báo cáo TTM */}
        <div className="space-y-3.5">
          <DashboardCard card={cards.pricePerformance} />
          <DashboardCard card={cards.balanceSheetTTM} />
          <DashboardCard card={cards.incomeStatementTTM} />
          <DashboardCard card={cards.cashFlowTTM} />
        </div>

        {/* CỘT 2: Tăng trưởng YoY & Kế hoạch */}
        <div className="space-y-3.5">
          <DashboardCard card={cards.growthYear} />
          <DashboardCard card={cards.growthQuarter} />
          <DashboardCard card={cards.planExecution} />
        </div>

        {/* CỘT 3: Định giá, Sức khỏe & Hiệu quả */}
        <div className="space-y-3.5">
          <DashboardCard card={cards.valuation} />
          <DashboardCard card={cards.financialHealth} />
          <DashboardCard card={cards.operatingEfficiency} />
        </div>
      </div>
    </div>
  )
}
