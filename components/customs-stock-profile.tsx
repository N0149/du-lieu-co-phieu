'use client'

import React from 'react'
import Link from 'next/link'
import { Building2, ExternalLink, ArrowUpRight, BarChart3, Globe, ShieldAlert, Sparkles, FileText, CheckCircle } from 'lucide-react'
import { CustomsDriverProfile } from '@/lib/customs-profiles'
import { cn } from '@/lib/utils'

interface CustomsStockProfileProps {
  ticker: string
  profile: CustomsDriverProfile
  onSelectCommodity?: (commodityQuery: string) => void
  showFullPageLink?: boolean
  className?: string
}

export function CustomsStockProfile({
  ticker,
  profile,
  onSelectCommodity,
  showFullPageLink = true,
  className,
}: CustomsStockProfileProps) {
  if (!profile) return null

  const handleCommodityClick = (pillText: string) => {
    if (!onSelectCommodity) return
    // Extract base commodity name from pill e.g. "Xơ, sợi × Xuất khẩu" -> "Xơ, sợi"
    const baseName = pillText.split('×')[0].split('-')[0].trim()
    onSelectCommodity(baseName)
  }

  return (
    <div className={cn('rounded-2xl border border-border/80 bg-card/80 p-5 sm:p-7 shadow-xl space-y-6', className)}>
      {/* 1. Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-start gap-3.5">
          {/* Logo / Ticker badge */}
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-500/5 text-teal-400 border border-teal-500/30 font-mono font-bold text-lg shadow-sm">
            {ticker}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-bold text-foreground">{ticker}</span>
              <span className="text-muted-foreground font-medium">·</span>
              <h3 className="text-base sm:text-lg font-bold text-foreground">{profile.name}</h3>
              {profile.nganh && (
                <span className="rounded-full bg-secondary/80 border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  {profile.nganh}
                </span>
              )}
            </div>

            {profile.sub_head && (
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                {profile.sub_head}
              </p>
            )}
          </div>
        </div>

        {/* Main market tag */}
        {profile.main_market && (
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-500/10 px-3.5 py-2 text-xs font-semibold text-teal-300 self-start lg:self-auto">
            <Globe className="size-3.5 text-teal-400 shrink-0" />
            <span>Thị trường chính: {profile.main_market}</span>
          </div>
        )}
      </div>

      {/* 2. Reservation / Alert warning if any */}
      {profile.reservation && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-300 leading-relaxed">
          <ShieldAlert className="size-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <b>Bảo lưu tín hiệu (đọc trước khi dùng):</b> {profile.reservation}
          </div>
        </div>
      )}

      {/* 3. Mảng kinh doanh cốt lõi (Core Business Segments Table) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-md bg-teal-500/10 text-teal-400">
            <FileText className="size-3.5" />
          </span>
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Mảng Kinh Doanh Cốt Lõi
          </h4>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/70 bg-background/50">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/60 text-muted-foreground border-b border-border/80 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-4 w-[50%]">Mảng sản phẩm</th>
                <th className="py-3 px-4 w-[22%]">Vai trò</th>
                <th className="py-3 px-4 w-[28%] text-right sm:text-left">Chuỗi data hải quan theo dõi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-sans">
              {profile.segments?.map((seg, idx) => (
                <tr key={idx} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4 align-top">
                    <div className="font-semibold text-foreground text-xs sm:text-sm leading-snug">
                      {seg.ten}
                    </div>
                    {seg.chitiet && (
                      <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        {seg.chitiet}
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-4 align-top">
                    <span className="inline-flex rounded-md bg-secondary/80 border border-border px-2 py-0.5 text-[11px] font-medium text-foreground">
                      {seg.vaitro}
                    </span>
                  </td>

                  <td className="py-3 px-4 align-top text-right sm:text-left">
                    {seg.pill ? (
                      onSelectCommodity ? (
                        <button
                          type="button"
                          onClick={() => handleCommodityClick(seg.pill)}
                          className="inline-flex items-center gap-1 rounded-md bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 px-2.5 py-1 text-[11px] font-bold text-teal-300 hover:text-teal-200 transition-all cursor-pointer group"
                          title="Bấm để xem chuỗi số liệu Hải quan thực tế"
                        >
                          <BarChart3 className="size-3 text-teal-400 group-hover:scale-110 transition-transform" />
                          <span>{seg.pill}</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-teal-500/15 border border-teal-500/30 px-2.5 py-1 text-[11px] font-bold text-teal-300">
                          {seg.pill}
                        </span>
                      )
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Hai Cột Chuyên Sâu: Thị trường đầu ra & Động lực ảnh hưởng */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* Cột 1: Thị trường đầu ra */}
        <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-2.5 shadow-sm">
          <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-foreground">
            <span>🎯</span>
            <span>Thị trường đầu ra</span>
          </div>

          <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground list-disc pl-4 marker:text-teal-400">
            {profile.markets?.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
            ))}
          </ul>
        </div>

        {/* Cột 2: Động lực ảnh hưởng */}
        <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-2.5 shadow-sm">
          <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-foreground">
            <span>⚙️</span>
            <span>Động lực ảnh hưởng</span>
          </div>

          <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground list-disc pl-4 marker:text-sky-400">
            {profile.drivers?.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
            ))}
          </ul>
        </div>
      </div>

      {/* 5. Cột không có data (No data caveat if any) */}
      {profile.no_data && (
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
          <span className="text-base leading-none">ℹ️</span>
          <div>
            <b>Đặc thù số liệu Hải quan:</b> {profile.no_data}
          </div>
        </div>
      )}

      {/* 6. Footer Citation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border/60 pt-4 text-xs text-muted-foreground">
        <div className="italic leading-relaxed">
          {profile.cite ? `Nguồn: ${profile.cite}` : 'Nguồn: Báo cáo thường niên & Công bố thông tin chính thức của doanh nghiệp.'}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {showFullPageLink && (
            <Link
              href={`/ticker/${ticker}`}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <span>Xem trang cổ phiếu {ticker}</span>
              <ArrowUpRight className="size-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
