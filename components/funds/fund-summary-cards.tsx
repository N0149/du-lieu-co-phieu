'use client'

import Link from 'next/link'
import { TrendingUp, Layers, ArrowUpRight } from 'lucide-react'
import { TOP_STOCK_HOLDINGS, TOP_INDUSTRY_HOLDINGS } from '@/lib/funds-data'

export function FundSummaryCards() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Cột Trái: Top 10 cổ phiếu được nắm giữ nhiều nhất */}
      <div className="overflow-hidden rounded-xl border border-white/8 bg-[#181C26] shadow-sm">
        <div className="border-b border-white/8 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F0F3F6] sm:text-base">
                Top 10 cổ phiếu được nắm giữ nhiều nhất
              </h3>
              <p className="text-xs text-[#9EACB9]">
                Theo dữ liệu báo cáo danh mục NAV gần nhất từ các quỹ mở
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/6 bg-white/[0.02] text-[11px] font-semibold uppercase tracking-wider text-[#9EACB9]">
                <th className="py-2.5 pl-5 pr-2 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Mã CP</th>
                <th className="py-2.5 px-3">Ngành</th>
                <th className="py-2.5 px-3 text-right">Số quỹ nắm giữ</th>
                <th className="py-2.5 pl-3 pr-5 text-right">Tỷ lệ TB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6 text-[#D0D7DE]">
              {TOP_STOCK_HOLDINGS.map((item) => (
                <tr
                  key={item.symbol}
                  className="transition-colors hover:bg-white/[0.03]"
                >
                  <td className="py-2.5 pl-5 pr-2 text-center text-xs font-semibold text-[#8B949E]">
                    {item.rank}
                  </td>
                  <td className="py-2.5 px-3 font-semibold">
                    <Link
                      href={`/stock/${item.symbol}`}
                      className="group inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline"
                    >
                      <span>{item.symbol}</span>
                      <ArrowUpRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 text-[#9EACB9]">{item.industry}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-[#F0F3F6]">
                    <span className="inline-block rounded-full bg-white/5 px-2 py-0.5 font-mono text-[11px]">
                      {item.fundCount} quỹ
                    </span>
                  </td>
                  <td className="py-2.5 pl-3 pr-5 text-right font-mono font-medium text-emerald-400">
                    {item.avgWeight.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cột Phải: Top 10 ngành được phân bổ nhiều nhất */}
      <div className="overflow-hidden rounded-xl border border-white/8 bg-[#181C26] shadow-sm">
        <div className="border-b border-white/8 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <Layers className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F0F3F6] sm:text-base">
                Top 10 ngành được phân bổ nhiều nhất
              </h3>
              <p className="text-xs text-[#9EACB9]">
                Tỷ trọng danh mục các nhóm ngành theo khẩu vị các tổ chức
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/6 bg-white/[0.02] text-[11px] font-semibold uppercase tracking-wider text-[#9EACB9]">
                <th className="py-2.5 pl-5 pr-2 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Nhóm Ngành</th>
                <th className="py-2.5 px-3 text-right">Số quỹ nắm giữ</th>
                <th className="py-2.5 pl-3 pr-5 text-right">Tỷ lệ TB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6 text-[#D0D7DE]">
              {TOP_INDUSTRY_HOLDINGS.map((item) => (
                <tr
                  key={item.industry}
                  className="transition-colors hover:bg-white/[0.03]"
                >
                  <td className="py-2.5 pl-5 pr-2 text-center text-xs font-semibold text-[#8B949E]">
                    {item.rank}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#F0F3F6]">
                    {item.industry}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-[#9EACB9]">
                    <span className="inline-block rounded-full bg-white/5 px-2 py-0.5 font-mono text-[11px]">
                      {item.fundCount} quỹ
                    </span>
                  </td>
                  <td className="py-2.5 pl-3 pr-5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <div className="hidden sm:block h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${Math.min(100, item.avgWeight * 3)}%` }}
                        />
                      </div>
                      <span className="font-mono font-medium text-blue-400">
                        {item.avgWeight.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
