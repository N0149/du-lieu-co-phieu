import React from 'react'
import { formatBillionVnd, type MarketSummary } from '@/lib/industry-types'
import { TrendingUp, Layers, DollarSign, PieChart, Activity, Building2, Percent } from 'lucide-react'

interface IndustryOverviewCardsProps {
  summary: MarketSummary
  isExcluded?: boolean
}

export function IndustryOverviewCards({ summary, isExcluded = false }: IndustryOverviewCardsProps) {
  const cards = [
    {
      label: 'SL CỔ PHIẾU',
      value: summary.trackedSymbols.toLocaleString('vi-VN'),
      subLabel: `Tổng ${summary.totalSymbols.toLocaleString('vi-VN')} mã niêm yết`,
      icon: Layers,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    {
      label: 'TỔNG VỐN HÓA',
      value: formatBillionVnd(summary.marketCap),
      subLabel: isExcluded ? 'Đã loại trừ cổ phiếu chọn' : 'Toàn bộ 3 sàn (HOSE, HNX, UPCoM)',
      icon: Building2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: isExcluded ? 'border-amber-500/40' : 'border-emerald-500/20',
    },
    {
      label: 'P/E THỊ TRƯỜNG',
      value: summary.pe.toFixed(2),
      subLabel: isExcluded ? 'P/E sau khi loại trừ' : 'Định giá P/E vốn hóa bình quân',
      icon: Activity,
      color: isExcluded ? 'text-emerald-400' : 'text-amber-400',
      bgColor: isExcluded ? 'bg-emerald-500/10' : 'bg-amber-500/10',
      borderColor: isExcluded ? 'border-emerald-500/40' : 'border-amber-500/20',
    },
    {
      label: 'P/B THỊ TRƯỜNG',
      value: summary.pb.toFixed(2),
      subLabel: isExcluded ? 'P/B sau khi loại trừ' : 'Định giá P/B vốn hóa bình quân',
      icon: PieChart,
      color: isExcluded ? 'text-emerald-400' : 'text-purple-400',
      bgColor: isExcluded ? 'bg-emerald-500/10' : 'bg-purple-500/10',
      borderColor: isExcluded ? 'border-emerald-500/40' : 'border-purple-500/20',
    },
    {
      label: `DOANH THU KỲ ${summary.latestQuarter || 'GẦN NHẤT'}`,
      value: formatBillionVnd(summary.revenue),
      subLabel:
        summary.revenueYoy != null
          ? `Tăng trưởng YoY: ${summary.revenueYoy > 0 ? '+' : ''}${summary.revenueYoy}%`
          : 'Tổng doanh thu quý',
      icon: DollarSign,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20',
    },
    {
      label: `LNST KỲ ${summary.latestQuarter || 'GẦN NHẤT'}`,
      value: formatBillionVnd(summary.lnst),
      subLabel:
        summary.lnstYoy != null
          ? `Tăng trưởng YoY: ${summary.lnstYoy > 0 ? '+' : ''}${summary.lnstYoy}%`
          : 'Lợi nhuận sau thuế quý',
      icon: TrendingUp,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
    },
  ]

  const hasRatios = summary.roe != null || summary.roa != null || summary.grossMargin != null || summary.netMargin != null

  return (
    <div className="space-y-3">
      {/* 6 thẻ chính */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className={`flex flex-col justify-between rounded-xl border ${card.borderColor} bg-[#161a23] p-3.5 shadow-sm transition-all hover:border-white/20`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold tracking-wider text-[#8B98A5] uppercase">
                  {card.label}
                </span>
                <span
                  className={`flex size-6 items-center justify-center rounded-lg ${card.bgColor} ${card.color}`}
                >
                  <Icon className="size-3.5" />
                </span>
              </div>

              <div className="mt-2">
                <div className="text-lg font-extrabold tracking-tight text-[#F0F3F6] sm:text-xl">
                  {card.value}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-[#8B98A5]">{card.subLabel}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Dải chỉ số sinh lời bổ sung (ROE, ROA, Biên LNG, Biên LN ròng) */}
      {hasRatios && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 rounded-xl border border-white/8 bg-[#161a23]/60 p-2.5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between px-3 py-1 border-r border-white/5 last:border-none">
            <span className="text-[11px] font-semibold text-[#8B98A5]">ROE:</span>
            <span className="text-xs font-bold text-emerald-400">{summary.roe?.toFixed(2)}%</span>
          </div>
          <div className="flex items-center justify-between px-3 py-1 border-r border-white/5 last:border-none">
            <span className="text-[11px] font-semibold text-[#8B98A5]">ROA:</span>
            <span className="text-xs font-bold text-emerald-400">{summary.roa?.toFixed(2)}%</span>
          </div>
          <div className="flex items-center justify-between px-3 py-1 border-r border-white/5 last:border-none">
            <span className="text-[11px] font-semibold text-[#8B98A5]">BIÊN LNG:</span>
            <span className="text-xs font-bold text-emerald-400">{summary.grossMargin?.toFixed(2)}%</span>
          </div>
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-[11px] font-semibold text-[#8B98A5]">BIÊN LN RÒNG:</span>
            <span className="text-xs font-bold text-emerald-400">{summary.netMargin?.toFixed(2)}%</span>
          </div>
        </div>
      )}
    </div>
  )
}
