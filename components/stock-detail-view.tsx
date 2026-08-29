'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  TrendingUp,
  TrendingDown,
  Globe,
  Share2,
  ExternalLink,
  ShieldAlert,
  BarChart3,
  Layers,
  FileText,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import type { StockDetailData, StockManifestItem } from '@/lib/longlivestock'
import type { Report } from '@/lib/use-reports'
import { cn } from '@/lib/utils'

interface StockDetailViewProps {
  stockData: StockDetailData
  relatedStocks?: StockManifestItem[]
  reports?: Report[]
}

function fmt(n: number | null | undefined, dec = 1): string {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('vi-VN', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })
}

export function StockDetailView({
  stockData,
  relatedStocks = [],
  reports = [],
}: StockDetailViewProps) {
  const { ticker, company, profile, market, valuation, financials = [], shareholders = [] } = stockData

  const sortedFinancials = useMemo(() => {
    return [...financials].sort((a, b) => b.year - a.year)
  }, [financials])

  const chartFinancials = useMemo(() => {
    return [...financials].sort((a, b) => a.year - b.year).slice(-16)
  }, [financials])

  // Compute SVG bar dimensions for Revenue / Profit chart
  const maxRev = useMemo(() => {
    const vals = chartFinancials.map((f) => f.revenue || 0)
    return Math.max(...vals, 1) * 1.15
  }, [chartFinancials])

  const isDelisted = company.status === 'delisted'
  const isSuspended = company.status === 'suspended'

  const hasReports = reports.length > 0

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6">
      {/* Back button & Action */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/tra-cuu"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span>Quay lại Tra Cứu 1.530 Mã</span>
        </Link>

        <Link
          href={`/bao-cao?ticker=${encodeURIComponent(ticker.toUpperCase())}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary/90"
        >
          <FileText className="size-3.5" />
          <span>Kho Báo Cáo Phân Tích →</span>
        </Link>
      </div>

      {/* Warning Status Banner if any */}
      {(isDelisted || isSuspended || company.status_note) && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
          <ShieldAlert className="size-4 shrink-0" />
          <span>
            {isDelisted ? 'Cổ phiếu đã HỦY NIÊM YẾT. ' : isSuspended ? 'Cổ phiếu đang bị ĐÌNH CHỈ GIAO DỊCH. ' : ''}
            {company.status_note || ''}
          </span>
        </div>
      )}

      {/* 1. Header Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-mono text-3xl font-bold tracking-tight text-primary">
                {ticker}
              </h1>
              {company.exchange && (
                <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground">
                  {company.exchange}
                </span>
              )}
              {company.sector && (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {company.sector}
                </span>
              )}
              {company.icb_l1 && (
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                  {company.icb_l1}
                </span>
              )}
            </div>

            <h2 className="text-base font-semibold text-foreground sm:text-lg">
              {company.name}
            </h2>
          </div>

          {/* Price Box */}
          <div className="flex flex-col items-start rounded-lg border border-border/80 bg-background/50 p-4 md:items-end">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Giá đóng cửa gần nhất
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-mono text-3xl font-bold text-foreground">
                {market.price != null ? fmt(market.price, 2) : '—'}
              </span>
              <span className="text-xs text-muted-foreground">nghìn VNĐ</span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Vốn hóa: {market.market_cap_ty ? `${fmt(market.market_cap_ty, 0)} tỷ` : '—'}
            </div>
          </div>
        </div>

        {/* 10 Key Metrics Strip */}
        <div className="mt-6 grid grid-cols-2 gap-2 border-t border-border/60 pt-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10">
          <div className="rounded-md bg-secondary/40 p-2 text-center">
            <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">P/E</div>
            <div className="font-mono text-xs font-bold text-foreground">
              {valuation.pe != null && valuation.pe > 0 ? fmt(valuation.pe, 1) : '—'}
            </div>
          </div>

          <div className="rounded-md bg-secondary/40 p-2 text-center">
            <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">P/B</div>
            <div className="font-mono text-xs font-bold text-foreground">
              {valuation.pb != null && valuation.pb > 0 ? fmt(valuation.pb, 1) : '—'}
            </div>
          </div>

          <div className="rounded-md bg-secondary/40 p-2 text-center">
            <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">ROE</div>
            <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {sortedFinancials[0]?.roe != null ? `${fmt(sortedFinancials[0].roe, 1)}%` : '—'}
            </div>
          </div>

          <div className="rounded-md bg-secondary/40 p-2 text-center">
            <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">ROA</div>
            <div className="font-mono text-xs font-bold text-foreground">
              {sortedFinancials[0]?.roa != null ? `${fmt(sortedFinancials[0].roa, 1)}%` : '—'}
            </div>
          </div>

          <div className="rounded-md bg-secondary/40 p-2 text-center">
            <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">EPS (đ)</div>
            <div className="font-mono text-xs font-bold text-foreground">
              {valuation.eps != null ? fmt(valuation.eps, 0) : '—'}
            </div>
          </div>

          <div className="rounded-md bg-secondary/40 p-2 text-center">
            <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">BVPS (đ)</div>
            <div className="font-mono text-xs font-bold text-foreground">
              {valuation.bvps != null ? fmt(valuation.bvps, 0) : '—'}
            </div>
          </div>

          <div className="rounded-md bg-secondary/40 p-2 text-center">
            <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">KL Khối ngoại</div>
            <div className="font-mono text-xs font-bold text-foreground">
              {market.foreign_pct != null ? `${fmt(market.foreign_pct, 1)}%` : '—'}
            </div>
          </div>

          <div className="rounded-md bg-secondary/40 p-2 text-center">
            <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">KL Nhà nước</div>
            <div className="font-mono text-xs font-bold text-foreground">
              {market.state_pct != null ? `${fmt(market.state_pct, 1)}%` : '—'}
            </div>
          </div>

          <div className="rounded-md bg-secondary/40 p-2 text-center">
            <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">Cao 52T</div>
            <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {market.high_1y != null ? fmt(market.high_1y / 1000, 1) : '—'}
            </div>
          </div>

          <div className="rounded-md bg-secondary/40 p-2 text-center">
            <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">Thấp 52T</div>
            <div className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
              {market.low_1y != null ? fmt(market.low_1y / 1000, 1) : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. PROMINENT REPORT SECTION (Báo Cáo Phân Tích & Định Giá Chuyên Sâu) */}
      <div className="rounded-xl border-2 border-primary/40 bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FileText className="size-4" />
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Báo Cáo Phân Tích & Định Giá Chuyên Sâu ({ticker})
            </h3>
          </div>
          <Link
            href={`/bao-cao?ticker=${encodeURIComponent(ticker.toUpperCase())}`}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Xem tất cả trong kho báo cáo →
          </Link>
        </div>

        {hasReports ? (
          <div className="mt-4 space-y-4">
            {reports.map((r, idx) => {
              const hasTarget = r.targetPrice != null && r.targetPrice > 0
              const hasUpside = r.upside != null
              const isBuy = r.recommendation?.toUpperCase() === 'MUA' || r.recommendation?.toUpperCase() === 'KHẢ QUAN'

              return (
                <div
                  key={r.driveDocId || idx}
                  className="flex flex-col justify-between gap-4 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{r.ticker || ticker}</span>
                      <span className="text-[11px] text-muted-foreground">· Ngày: {r.reportDate || r.date || '—'}</span>
                      {r.recommendation && (
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                            isBuy
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                          )}
                        >
                          Khuyến nghị: {r.recommendation}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-foreground hover:text-primary">
                      {r.title}
                    </h4>

                    {/* Valuation summary if available */}
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      {hasTarget && (
                        <span className="text-muted-foreground">
                          Giá mục tiêu: <b className="font-mono text-foreground">{fmt(r.targetPrice, 1)} k₫</b>
                        </span>
                      )}
                      {hasUpside && (
                        <span className="text-muted-foreground">
                          Tiềm năng tăng giá (Upside):{' '}
                          <b className="font-mono text-emerald-600 dark:text-emerald-400">
                            +{fmt(r.upside, 1)}%
                          </b>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Primary CTA Button */}
                  <Link
                    href={`/bao-cao/${r.driveDocId}`}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 hover:shadow-md"
                  >
                    <FileText className="size-4" />
                    <span>ĐỌC BÁO CÁO NGAY →</span>
                  </Link>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-lg border border-dashed border-border p-6 text-center sm:flex-row sm:text-left">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">
                Kho báo cáo đang chuẩn bị bài phân tích chuyên sâu chi tiết riêng cho mã {ticker}.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Bạn có thể tra cứu các bài phân tích ngành {company.sector || company.icb_l1} và các mã cùng ngành.
              </p>
            </div>
            <Link
              href={`/bao-cao?ticker=${encodeURIComponent(ticker.toUpperCase())}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-primary bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <FileText className="size-3.5" />
              <span>Tìm bài phân tích liên quan →</span>
            </Link>
          </div>
        )}
      </div>

      {/* 3. Core Business Profile */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
          <Building2 className="size-4 text-primary" />
          <span>Hồ Sơ & Hoạt Động Kinh Doanh Cốt Lõi</span>
        </h3>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {profile || 'Chưa có thông tin hồ sơ doanh nghiệp.'}
        </p>

        {company.business_lines && company.business_lines.length > 0 && (
          <div className="mt-4 border-t border-border/60 pt-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Ngành nghề kinh doanh chính ({company.business_lines.length} ngành nghề)
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {company.business_lines.map((line, i) => (
                <span
                  key={i}
                  className="rounded-md border border-border bg-secondary/40 px-2 py-0.5 text-[11px] text-foreground/80"
                >
                  • {line}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Revenue & Profit Chart (16 Years) */}
      {chartFinancials.length > 1 && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
              <BarChart3 className="size-4 text-primary" />
              <span>Biểu Đồ Doanh Thu & Lợi Nhuận Sau Thuế ({chartFinancials.length} năm)</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-primary">
                <span className="size-2.5 rounded-xs bg-primary" />
                <span>Doanh thu (tỷ)</span>
              </span>
              <span className="flex items-center gap-1 text-amber-500">
                <span className="size-2.5 rounded-xs bg-amber-500" />
                <span>LNST (tỷ)</span>
              </span>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-16 gap-2 pt-6">
                {chartFinancials.map((f) => {
                  const revH = Math.max(4, ((f.revenue || 0) / maxRev) * 160)
                  const profH = Math.max(2, ((f.profit || 0) / maxRev) * 160)
                  return (
                    <div key={f.year} className="flex flex-col items-center justify-end gap-1">
                      <div className="flex h-[160px] items-end gap-1">
                        {/* Revenue Bar */}
                        <div
                          style={{ height: `${revH}px` }}
                          className="w-4 rounded-t bg-primary transition-all hover:brightness-110"
                          title={`Năm ${f.year}: DT ${fmt(f.revenue, 0)} tỷ`}
                        />
                        {/* Profit Bar */}
                        <div
                          style={{ height: `${profH}px` }}
                          className="w-4 rounded-t bg-amber-500 transition-all hover:brightness-110"
                          title={`Năm ${f.year}: LNST ${fmt(f.profit, 0)} tỷ`}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">{f.year}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Full Financial History Table */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
          <Layers className="size-4 text-primary" />
          <span>Bảng Báo Cáo Tài Chính Đa Năm</span>
        </h3>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">Năm</th>
                <th className="px-3 py-2.5 text-right">Doanh thu (tỷ)</th>
                <th className="px-3 py-2.5 text-right">LNST (tỷ)</th>
                <th className="px-3 py-2.5 text-right">Biên gộp</th>
                <th className="px-3 py-2.5 text-right">Biên ròng</th>
                <th className="px-3 py-2.5 text-right">ROE</th>
                <th className="px-3 py-2.5 text-right">ROA</th>
                <th className="px-3 py-2.5 text-right">Tài sản (tỷ)</th>
                <th className="px-3 py-2.5 text-right">Vốn CSH (tỷ)</th>
                <th className="px-3 py-2.5 text-right">Cổ tức (đ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sortedFinancials.map((row) => (
                <tr key={row.year} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono font-bold text-foreground">{row.year}</td>
                  <td className="px-3 py-2 text-right font-mono text-foreground">
                    {row.revenue != null ? fmt(row.revenue, 0) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-amber-600 dark:text-amber-400">
                    {row.profit != null ? fmt(row.profit, 0) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                    {row.gross_margin != null ? `${fmt(row.gross_margin, 1)}%` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                    {row.net_margin != null ? `${fmt(row.net_margin, 1)}%` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {row.roe != null ? `${fmt(row.roe, 1)}%` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                    {row.roa != null ? `${fmt(row.roa, 1)}%` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                    {row.assets != null ? fmt(row.assets, 0) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                    {row.equity != null ? fmt(row.equity, 0) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-foreground">
                    {row.dividend != null ? fmt(row.dividend, 0) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Major Shareholders Breakdown */}
      {shareholders.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Cơ Cấu Cổ Đông Lớn
          </h3>
          <div className="mt-4 space-y-2.5">
            {shareholders.map((sh, idx) => (
              <div key={idx} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                <div className="w-64 truncate text-xs font-medium text-foreground">{sh.name}</div>
                <div className="flex-1 rounded-full bg-secondary h-2.5 overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, sh.pct)}%` }}
                    className="h-full rounded-full bg-primary"
                  />
                </div>
                <div className="font-mono text-xs font-bold text-primary sm:text-right sm:w-16">
                  {fmt(sh.pct, 2)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Related Peers in Same Sector */}
      {relatedStocks.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Cổ Phiếu Cùng Ngành ({company.sector || company.icb_l1})
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {relatedStocks.slice(0, 6).map((s) => (
              <Link
                key={s.t}
                href={`/stock/${s.t}`}
                className="flex flex-col justify-between rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary"
              >
                <div className="font-mono text-sm font-bold text-primary">{s.t}</div>
                <div className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{s.n}</div>
                <div className="mt-2 font-mono text-xs font-semibold text-foreground">
                  {s.px != null ? `${fmt(s.px, 1)} k₫` : '—'}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
