'use client'

import { useState, useMemo } from 'react'
import { Activity, FileText, LayoutList, Bell, ExternalLink } from 'lucide-react'
import type { Stock, DeepDive } from '@/lib/data'
import type { TickerReport, TickerReportContent } from '@/lib/report'
import type { CorporateDisclosure } from '@/lib/disclosures'
import { fmtBillion, fmtInt, fmtNum, fmtPct, fmtPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'overview', label: 'Tổng quan & Luận điểm', icon: Activity },
  { id: 'financial', label: 'Báo cáo Tài chính Đầy đủ', icon: FileText },
  { id: 'notes', label: 'Thuyết minh BCTC Chi tiết', icon: LayoutList },
  { id: 'disclosures', label: 'Công bố Thông tin & Sự kiện', icon: Bell },
] as const

type TabId = (typeof TABS)[number]['id']

export function TickerTabs({
  stock,
  dd,
  report,
  reportContent,
  disclosures = [],
}: {
  stock: Stock
  dd: DeepDive
  report?: TickerReport
  reportContent?: TickerReportContent
  disclosures?: CorporateDisclosure[]
}) {
  const [tab, setTab] = useState<TabId>('overview')

  return (
    <div className="mt-6">
      <div className="sticky top-16 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:top-20">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((item) => {
            const Icon = item.icon
            const active = tab === item.id
            const count = item.id === 'disclosures' ? disclosures.length : undefined
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-4" />
                {item.label}
                {count !== undefined && count > 0 && (
                  <span className={cn('ml-1 rounded-full px-1.5 py-0.2 text-[11px]', active ? 'bg-primary/20 text-primary font-bold' : 'bg-muted text-muted-foreground')}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-b-lg border border-border border-t-0 bg-card p-6">
        {tab === 'overview' && (
          <OverviewTab stock={stock} dd={dd} report={report} reportContent={reportContent} />
        )}
        {tab === 'financial' && <FinancialReportTab report={report} />}
        {tab === 'notes' && <NotesTab reportContent={reportContent} />}
        {tab === 'disclosures' && (
          <DisclosuresTab symbol={stock.ticker} disclosures={disclosures} />
        )}
      </div>
    </div>
  )
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{children}</h2>
      {sub && <p className="mt-2 text-sm text-muted-foreground">{sub}</p>}
    </div>
  )
}

function InfoCard({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: 'positive' | 'muted' }) {
  return (
    <div className={cn('rounded-3xl border border-border bg-background p-4', tone === 'positive' ? 'shadow-sm shadow-primary/10' : '')}>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={cn('mt-3 font-mono text-lg font-semibold tracking-tight', tone === 'positive' ? 'text-positive' : 'text-foreground')}>
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
      </p>
    </div>
  )
}

function OverviewTab({
  stock,
  dd,
  report,
  reportContent,
}: {
  stock: Stock
  dd: DeepDive
  report?: TickerReport
  reportContent?: TickerReportContent
}) {
  const highlights = report?.financialHighlights

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle sub="Tập trung vào điểm nổi bật của BCTC Quý 2/2026 và luận điểm đầu tư chính.">
          Tổng quan & Luận điểm
        </SectionTitle>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="Giá thị trường" value={fmtPrice(stock.marketPrice)} unit="nghìn đ" />
          <InfoCard label="RNAV" value={fmtPrice(stock.rnav)} unit="nghìn đ" tone="positive" />
          <InfoCard
            label="Tăng trưởng lợi nhuận"
            value={highlights?.profitGrowthYoY != null ? fmtPct(highlights.profitGrowthYoY) : '-'}
            tone="positive"
          />
          <InfoCard
            label="EPS 6 tháng"
            value={highlights?.eps6M2026 != null ? fmtNum(highlights.eps6M2026, 0) : '-'}
            unit="đ"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-background p-5">
            <p className="text-sm font-semibold text-foreground">Mốc thời gian báo cáo</p>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Chu kỳ:</span>{' '}
                {report?.reportPeriod ?? 'Không có dữ liệu'}
              </p>
              <p>
                <span className="font-medium text-foreground">Kết thúc:</span>{' '}
                {report?.reportPeriodEndDate ?? 'Không có dữ liệu'}
              </p>
              <p>
                <span className="font-medium text-foreground">Công bố:</span>{' '}
                {report?.disclosureDate ?? 'Không có dữ liệu'}
              </p>
              <p>
                <span className="font-medium text-foreground">Trạng thái:</span>{' '}
                {report?.updateStatus ?? 'Chưa có cập nhật'}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-background p-5">
            <p className="text-sm font-semibold text-foreground">Tóm tắt đầu tư</p>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-card-foreground">
              {reportContent?.overview?.length ? (
                reportContent.overview.map((item, index) => (
                  <p key={index} className="flex gap-2">
                    <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                    {item}
                  </p>
                ))
              ) : (
                <p>Không có tóm tắt tổng quan.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-border bg-background p-5">
          <h3 className="text-base font-semibold text-foreground">Luận điểm đầu tư</h3>
          <div className="mt-4 space-y-3">
            {dd.thesis.map((item, index) => (
              <div key={index} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Luận điểm {index + 1}</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-background p-5">
          <h3 className="text-base font-semibold text-foreground">Cạnh tranh & Ban lãnh đạo</h3>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground">Lợi thế cạnh tranh</p>
              <ul className="mt-3 space-y-2">
                {dd.moat.map((item, index) => (
                  <li key={index} className="flex gap-2 text-sm text-card-foreground">
                    <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Quản trị & đồng thuận lợi ích</p>
              <ul className="mt-3 space-y-2">
                {dd.management.map((item, index) => (
                  <li key={index} className="flex gap-2 text-sm text-card-foreground">
                    <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FinancialReportTab({ report }: { report?: TickerReport }) {
  const summary = report?.financialHighlights

  return (
    <div className="space-y-8">
      <SectionTitle sub="Báo cáo tài chính chi tiết dựa trên dữ liệu BCTC hợp nhất.">
        Báo cáo Tài chính Đầy đủ
      </SectionTitle>

      {!report ? (
        <div className="rounded-3xl border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          Dữ liệu BCTC chưa sẵn sàng cho mã này.
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InfoCard
              label="Doanh thu Q2/2026"
              value={summary?.netRevenueQ2_2026 != null ? fmtBillion(summary.netRevenueQ2_2026 / 1_000_000_000) : '-'}
              unit="tỷ"
            />
            <InfoCard
              label="LNST Q2/2026"
              value={summary?.netProfitAfterTaxQ2_2026 != null ? fmtBillion(summary.netProfitAfterTaxQ2_2026 / 1_000_000_000) : '-'}
              unit="tỷ"
              tone="positive"
            />
            <InfoCard
              label="LNST cổ đông mẹ"
              value={summary?.netProfitParentQ2_2026 != null ? fmtBillion(summary.netProfitParentQ2_2026 / 1_000_000_000) : '-'}
              unit="tỷ"
            />
            <InfoCard
              label="LNST YoY"
              value={summary?.profitGrowthYoY != null ? fmtPct(summary.profitGrowthYoY, 1) : '-'}
              tone="positive"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <FinancialSection title="Bảng cân đối kế toán" values={buildBalanceRows(report.balanceSheet)} />
            <FinancialSection title="Kết quả kinh doanh 6T2026" values={buildIncomeRows(report.incomeStatement6M2026)} />
          </div>
        </>
      )}
    </div>
  )
}

function buildBalanceRows(balanceSheet?: Record<string, any>) {
  if (!balanceSheet) return []
  return [
    { label: 'Tổng tài sản ngắn hạn', value: balanceSheet.shortTermAssets?.total },
    { label: 'Tổng tài sản dài hạn', value: balanceSheet.longTermAssets?.total },
    { label: 'Tổng nợ phải trả', value: balanceSheet.liabilities?.total },
    { label: 'Vốn chủ sở hữu', value: balanceSheet.equity?.total },
  ]
}

function buildIncomeRows(income?: Record<string, any>) {
  if (!income) return []
  return [
    { label: 'Doanh thu thuần', value: income.netRevenue },
    { label: 'Lợi nhuận gộp', value: income.grossProfit },
    { label: 'Lợi nhuận từ hoạt động', value: income.operatingProfit },
    { label: 'LNST cổ đông mẹ', value: income.netProfitParent },
  ]
}

function FinancialSection({
  title,
  values,
}: {
  title: string
  values: { label: string; value?: number }[]
}) {
  return (
    <div className="rounded-3xl border border-border bg-background p-5">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <div className="mt-4 space-y-3">
        {values.length ? (
          values.map((row) => (
            <div key={row.label} className="flex items-center justify-between rounded-2xl border border-border/80 bg-card px-4 py-3">
              <span className="text-sm text-foreground">{row.label}</span>
              <span className="font-mono text-sm font-semibold text-foreground">
                {row.value != null ? `${fmtBillion(row.value / 1_000_000_000)} tỷ` : '-'}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Không có dữ liệu tài chính chi tiết.</p>
        )}
      </div>
    </div>
  )
}

function NotesTab({ reportContent }: { reportContent?: TickerReportContent }) {
  return (
    <div className="space-y-8">
      <SectionTitle sub="Chuyển hóa nội dung MDX thành bản thuyết minh chi tiết, bao gồm bảng số liệu và nhận định.">
        Thuyết minh BCTC Chi tiết
      </SectionTitle>

      {!reportContent ? (
        <div className="rounded-3xl border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          Chưa có thuyết minh BCTC cho mã này.
        </div>
      ) : (
        <>
          <div className="rounded-3xl border border-border bg-background p-5">
            <p className="text-sm font-semibold text-foreground">
              {reportContent.title ?? 'Thuyết minh BCTC'}
            </p>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              {reportContent.overview?.length ? (
                reportContent.overview.map((item, index) => (
                  <p key={`overview-${index}`} className="flex gap-2">
                    <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                    {item}
                  </p>
                ))
              ) : (
                <p>Không có thuyết minh tổng quan.</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <DetailPanel title="Nguyên nhân & Động lực" items={reportContent.keyDrivers ?? []} />
            <DetailPanel title="Ghi chú nhà đầu tư" items={reportContent.investorNotes ?? []} />
          </div>

          {reportContent.tableRows?.length ? (
            <div className="overflow-hidden rounded-3xl border border-border bg-background">
              <div className="border-b border-border bg-secondary/60 px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">Bảng số liệu BCTC</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-background text-left text-xs uppercase tracking-[0.15em] text-muted-foreground">
                      <th className="px-4 py-3">Chỉ tiêu tài chính</th>
                      <th className="px-4 py-3 text-right">Q2/2026</th>
                      <th className="px-4 py-3 text-right">Q2/2025</th>
                      <th className="px-4 py-3 text-right">Chênh lệch</th>
                      <th className="px-4 py-3 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportContent.tableRows.map((row, index) => (
                      <tr
                        key={`${row.metric}-${index}`}
                        className={cn('border-t border-border/70', index % 2 === 1 && 'bg-muted/40')}
                      >
                        <td className="px-4 py-3 align-top text-sm text-foreground">{row.metric}</td>
                        <td className="px-4 py-3 align-top text-right font-mono text-sm text-muted-foreground">
                          {row.q2_2026}
                        </td>
                        <td className="px-4 py-3 align-top text-right font-mono text-sm text-muted-foreground">
                          {row.q2_2025}
                        </td>
                        <td className="px-4 py-3 align-top text-right font-mono text-sm text-foreground">
                          {row.difference}
                        </td>
                        <td className="px-4 py-3 align-top text-right font-mono text-sm text-foreground">
                          {row.percent}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function DetailPanel({
  title,
  items,
}: {
  title: string
  items: string[]
}) {
  return (
    <div className="rounded-3xl border border-border bg-background p-5">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <div className="mt-4 space-y-3 text-sm text-card-foreground">
        {items.length ? (
          items.map((item, index) => (
            <div key={index} className="rounded-2xl border border-border/80 bg-card p-3">
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                <p>{item}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Không có nội dung.</p>
        )}
      </div>
    </div>
  )
}

function BadgeCategory({ docType, label }: { docType: string; label: string }) {
  let style = 'bg-secondary text-secondary-foreground border-border'
  if (docType === 'BCTC_SOAT_XET') {
    style = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
  } else if (docType === 'GIAI_TRINH_KQKD') {
    style = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold'
  } else if (docType === 'CO_TUC') {
    style = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  } else if (docType === 'CANH_BAO_KIEM_SOAT') {
    style = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-semibold'
  } else if (docType === 'DHDCD') {
    style = 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
  }
  return (
    <span className={cn('rounded px-2 py-0.5 text-xs font-medium border', style)}>
      {label || 'Công bố thông tin'}
    </span>
  )
}

function DisclosuresTab({
  symbol,
  disclosures,
}: {
  symbol: string
  disclosures: CorporateDisclosure[]
}) {
  const [filterType, setFilterType] = useState<string>('ALL')
  const [onlyImportant, setOnlyImportant] = useState<boolean>(false)

  // Count items by category
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: disclosures.length, IMPORTANT: 0 }
    for (const d of disclosures) {
      c[d.doc_type] = (c[d.doc_type] || 0) + 1
      if (d.is_important) c.IMPORTANT++
    }
    return c
  }, [disclosures])

  const filtered = useMemo(() => {
    return disclosures.filter((d) => {
      if (onlyImportant && !d.is_important) return false
      if (filterType !== 'ALL' && d.doc_type !== filterType) return false
      return true
    })
  }, [disclosures, filterType, onlyImportant])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle sub={`Văn bản pháp lý, BCTC soát xét, giải trình KQKD và quyết định công bố chính thức của ${symbol}.`}>
            Công bố Thông tin & Dòng Sự kiện Chính thức
          </SectionTitle>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Đồng bộ thời gian thực (3 Sàn)
          </span>
        </div>

        {/* Filter Bar */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: 'Tất cả', count: counts.ALL || 0 },
            { id: 'BCTC_SOAT_XET', label: 'BCTC & Soát xét', count: counts.BCTC_SOAT_XET || 0 },
            { id: 'GIAI_TRINH_KQKD', label: 'Giải trình KQKD', count: counts.GIAI_TRINH_KQKD || 0 },
            { id: 'CO_TUC', label: 'Cổ tức & Quyền', count: counts.CO_TUC || 0 },
            { id: 'CANH_BAO_KIEM_SOAT', label: 'Cảnh báo / Kiểm soát', count: counts.CANH_BAO_KIEM_SOAT || 0 },
            { id: 'DHDCD', label: 'ĐHĐCĐ', count: counts.DHDCD || 0 },
            { id: 'NGHI_QUYET_HDQT', label: 'Nghị quyết HĐQT', count: counts.NGHI_QUYET_HDQT || 0 },
          ]
            .filter((cat) => cat.id === 'ALL' || (cat.count && cat.count > 0))
            .map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterType(cat.id)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-all border',
                  filterType === cat.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                )}
              >
                {cat.label} ({cat.count})
              </button>
            ))}

          {counts.IMPORTANT > 0 && (
            <button
              type="button"
              onClick={() => setOnlyImportant(!onlyImportant)}
              className={cn(
                'ml-auto rounded-full px-3 py-1.5 text-xs font-medium transition-all border flex items-center gap-1',
                onlyImportant
                  ? 'bg-amber-500 text-black border-amber-500 shadow-sm font-semibold'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
              )}
            >
              <span>⚡</span> Chỉ tin quan trọng ({counts.IMPORTANT})
            </button>
          )}
        </div>
      </div>

      {/* Disclosures List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          <p className="text-base font-medium">Chưa có văn bản công bố nào trong mục này.</p>
          <p className="mt-1 text-xs">Vui lòng chọn bộ lọc khác hoặc kiểm tra lại sau.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isImportant = Boolean(item.is_important)
            return (
              <div
                key={item.id}
                className={cn(
                  'group relative rounded-2xl border p-4 sm:p-5 transition-all duration-200',
                  isImportant
                    ? 'border-amber-500/40 bg-card hover:border-amber-500/70 hover:shadow-md hover:shadow-amber-500/5'
                    : 'border-border/80 bg-card hover:border-border hover:bg-muted/20'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <BadgeCategory docType={item.doc_type} label={item.doc_type_label} />
                    {isImportant && (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        ⚡ Nhạy cảm giá
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground font-mono">
                      {item.published_at}
                    </span>
                  </div>

                  {item.file_url && (
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg bg-secondary/80 hover:bg-secondary px-2.5 py-1 text-xs font-medium text-foreground transition-colors border border-border/60"
                    >
                      <span>Xem tài liệu gốc</span>
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>

                <h3 className="mt-2 text-sm sm:text-base font-medium text-foreground leading-snug">
                  {item.title}
                </h3>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
