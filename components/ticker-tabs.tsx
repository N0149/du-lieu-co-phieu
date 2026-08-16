'use client'

import { useState } from 'react'
import { Activity, FileText, LayoutList } from 'lucide-react'
import type { Stock, DeepDive } from '@/lib/data'
import type { TickerReport, TickerReportContent } from '@/lib/report'
import { fmtBillion, fmtInt, fmtNum, fmtPct, fmtPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'overview', label: 'Tổng quan & Luận điểm', icon: Activity },
  { id: 'financial', label: 'Báo cáo Tài chính Đầy đủ', icon: FileText },
  { id: 'notes', label: 'Thuyết minh BCTC Chi tiết', icon: LayoutList },
] as const

type TabId = (typeof TABS)[number]['id']

export function TickerTabs({
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
  const [tab, setTab] = useState<TabId>('overview')

  return (
    <div className="mt-6">
      <div className="sticky top-16 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:top-20">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((item) => {
            const Icon = item.icon
            const active = tab === item.id
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
