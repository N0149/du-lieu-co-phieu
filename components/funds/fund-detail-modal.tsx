'use client'

import { X, ExternalLink, Calendar, PieChart, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { Fund } from '@/lib/funds-data'
import { fmtNum } from '@/lib/format'

interface FundDetailModalProps {
  fund: Fund | null
  onClose: () => void
}

export function FundDetailModal({ fund, onClose }: FundDetailModalProps) {
  if (!fund) return null

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'equity':
        return 'Quỹ Cổ Phiếu'
      case 'bond':
        return 'Quỹ Trái Phiếu'
      case 'balanced':
        return 'Quỹ Cân Bằng'
      default:
        return category
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[#161922] shadow-2xl overflow-hidden text-[#D0D7DE]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header modal */}
        <div className="flex items-start justify-between border-b border-white/8 bg-[#1A1E29] p-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400 border border-emerald-500/30">
                {fund.code}
              </span>
              <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-[#9EACB9]">
                {getCategoryLabel(fund.category)}
              </span>
            </div>
            <h2 className="mt-1.5 text-lg font-bold text-[#F0F3F6] sm:text-xl">
              {fund.name}
            </h2>
            <p className="text-xs text-[#9EACB9]">
              Quản lý bởi: <span className="font-semibold text-emerald-400">{fund.issuer}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#9EACB9] transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Thông tin thống kê nhanh */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3 text-center">
              <div className="text-[11px] text-[#9EACB9]">Giá NAV gần nhất</div>
              <div className="mt-1 font-mono text-base font-bold text-[#F0F3F6]">
                {fmtNum(fund.nav, 0)} đ
              </div>
              <div className="text-[10px] text-[#8B949E] mt-0.5">Ngày {fund.navDate}</div>
            </div>

            <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3 text-center">
              <div className="text-[11px] text-[#9EACB9]">Lợi nhuận YTD</div>
              <div
                className={`mt-1 font-mono text-base font-bold ${
                  fund.ytdReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {fund.ytdReturn >= 0 ? `+${fund.ytdReturn.toFixed(2)}%` : `${fund.ytdReturn.toFixed(2)}%`}
              </div>
              <div className="text-[10px] text-[#8B949E] mt-0.5">Từ đầu năm</div>
            </div>

            <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3 text-center">
              <div className="text-[11px] text-[#9EACB9]">Lợi nhuận 1 năm</div>
              <div
                className={`mt-1 font-mono text-base font-bold ${
                  fund.return1Y >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {fund.return1Y >= 0 ? `+${fund.return1Y.toFixed(2)}%` : `${fund.return1Y.toFixed(2)}%`}
              </div>
              <div className="text-[10px] text-[#8B949E] mt-0.5">12 tháng gần nhất</div>
            </div>

            <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3 text-center">
              <div className="text-[11px] text-[#9EACB9]">Lợi nhuận 3 năm</div>
              <div
                className={`mt-1 font-mono text-base font-bold ${
                  fund.return3Y >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {fund.return3Y >= 0 ? `+${fund.return3Y.toFixed(2)}%` : `${fund.return3Y.toFixed(2)}%`}
              </div>
              <div className="text-[10px] text-[#8B949E] mt-0.5">Tích lũy 36 tháng</div>
            </div>
          </div>

          {/* Mô tả & Thông tin quy mô */}
          <div className="rounded-xl border border-white/6 bg-white/[0.02] p-4 text-xs">
            <p className="leading-relaxed text-[#D0D7DE]">{fund.description}</p>
            <div className="mt-3 flex flex-wrap gap-4 pt-3 border-t border-white/6 text-[#9EACB9]">
              {fund.aumBillionVnd && (
                <div>
                  Quy mô tài sản (AUM):{' '}
                  <span className="font-semibold text-[#F0F3F6]">
                    ~{fmtNum(fund.aumBillionVnd, 0)} tỷ VNĐ
                  </span>
                </div>
              )}
              {fund.managementFee && (
                <div>
                  Phí quản lý:{' '}
                  <span className="font-semibold text-[#F0F3F6]">
                    {fund.managementFee}% / năm
                  </span>
                </div>
              )}
              {fund.inceptionDate && (
                <div>
                  Ngày thành lập:{' '}
                  <span className="font-semibold text-[#F0F3F6]">
                    {fund.inceptionDate}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Top danh mục nắm giữ */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-bold text-[#F0F3F6]">
                <PieChart className="size-4 text-emerald-400" />
                Danh mục tài sản & Top cổ phiếu nắm giữ
              </h4>
              <span className="text-xs text-[#9EACB9]">
                {fund.holdings.length} tài sản chính
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/8 bg-[#141720]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/6 bg-white/[0.02] text-[11px] text-[#9EACB9]">
                    <th className="py-2.5 pl-4 pr-2">Mã tài sản</th>
                    <th className="py-2.5 px-3">Tên tài sản</th>
                    <th className="py-2.5 px-3">Ngành nghề</th>
                    <th className="py-2.5 pl-3 pr-4 text-right">Tỷ trọng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6">
                  {fund.holdings.map((h) => {
                    const isStock = !h.symbol.startsWith('TP-')
                    return (
                      <tr key={h.symbol} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 pl-4 pr-2 font-mono font-bold">
                          {isStock ? (
                            <Link
                              href={`/stock/${h.symbol}`}
                              className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                            >
                              {h.symbol}
                              <ExternalLink className="size-2.5 opacity-70" />
                            </Link>
                          ) : (
                            <span className="text-amber-400">{h.symbol}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[#F0F3F6]">{h.name}</td>
                        <td className="py-2.5 px-3 text-[#9EACB9]">{h.industry}</td>
                        <td className="py-2.5 pl-3 pr-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${Math.min(100, h.weight * 5)}%` }}
                              />
                            </div>
                            <span className="font-mono font-semibold text-emerald-400">
                              {h.weight.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer modal */}
        <div className="flex items-center justify-between border-t border-white/8 bg-[#1A1E29] px-5 py-3 text-xs text-[#9EACB9]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-emerald-400" />
            <span>Quỹ mở được UBCKNN cấp phép hoạt động</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/10 px-4 py-1.5 font-medium text-white transition-colors hover:bg-white/20"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
