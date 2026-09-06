'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Sparkles,
} from 'lucide-react'
import type { ScreenerStockItem } from '@/lib/screener-data-service'
import { cn } from '@/lib/utils'

type TableViewTab =
  | 'tong_quan'
  | 'dinh_gia'
  | 'hieu_qua'
  | 'tang_truong'
  | 'ky_thuat'
  | 'bao_cao'

type SortKey = keyof ScreenerStockItem
type SortOrder = 'asc' | 'desc'

interface ScreenerResultsTableProps {
  stocks: ScreenerStockItem[]
}

const PAGE_SIZE = 25

export function ScreenerResultsTable({ stocks }: ScreenerResultsTableProps) {
  const [activeTab, setActiveTab] = useState<TableViewTab>('tong_quan')
  const [sortKey, setSortKey] = useState<SortKey>('marketCap')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [copied, setCopied] = useState(false)

  // Sắp xếp dữ liệu
  const sortedStocks = useMemo(() => {
    return [...stocks].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortOrder === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortOrder === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [stocks, sortKey, sortOrder])

  const totalPages = Math.max(1, Math.ceil(sortedStocks.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pageRows = sortedStocks.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortOrder('desc')
    }
    setCurrentPage(1)
  }

  // Sao chép danh sách mã cổ phiếu
  const handleCopyTickers = () => {
    const text = sortedStocks.map((s) => s.ticker).join(', ')
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Xuất file CSV
  const handleExportCsv = () => {
    if (sortedStocks.length === 0) return
    const headers = [
      'Mã CK',
      'Tên công ty',
      'Sàn',
      'Ngành',
      'Giá (k VND)',
      'Vốn hóa (Tỷ)',
      'P/E',
      'P/B',
      'ROE (%)',
      'ROA (%)',
      'Cổ tức (%)',
      'Trích KTPL (%)',
      'Tăng trưởng LNST YoY (%)',
      'RSI (14)',
      'Điểm 360',
      'Upside (%)',
    ]

    const rows = sortedStocks.map((s) => [
      s.ticker,
      `"${(s.name || '').replace(/"/g, '""')}"`,
      s.exchange,
      `"${(s.sector || '').replace(/"/g, '""')}"`,
      s.price ?? '',
      s.marketCap ?? '',
      s.pe ?? '',
      s.pb ?? '',
      s.roe ?? '',
      s.roa ?? '',
      s.dy ?? '',
      s.ktplRate ?? '',
      s.profitGrowthYoY ?? '',
      s.rsi14 ?? '',
      s.score360 ?? '',
      s.upside ?? '',
    ])

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bo_loc_co_phieu_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="size-3 text-muted-foreground/50 ml-1 inline" />
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="size-3 text-primary ml-1 inline" />
    ) : (
      <ArrowDown className="size-3 text-primary ml-1 inline" />
    )
  }

  return (
    <div className="flex flex-col rounded-xl border border-white/10 bg-[#161a23] shadow-md text-foreground overflow-hidden">
      {/* Thanh Tabs góc nhìn + Nút hành động */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#121620] px-4 py-2.5">
        {/* Tabs góc nhìn */}
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {[
            { id: 'tong_quan', label: 'Tổng quan' },
            { id: 'dinh_gia', label: 'Định giá' },
            { id: 'hieu_qua', label: 'Hiệu quả & Tài chính' },
            { id: 'tang_truong', label: 'Tăng trưởng' },
            { id: 'ky_thuat', label: 'Kỹ thuật & Dòng tiền' },
            { id: 'bao_cao', label: 'Báo cáo & AI' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TableViewTab)}
              className={cn(
                'rounded-lg px-3 py-1.5 font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-primary/20 text-primary font-bold'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Nút Xuất CSV & Sao chép mã */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleCopyTickers}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-[#1f2430] px-3 font-medium text-foreground transition-colors hover:bg-white/10"
          >
            {copied ? (
              <Check className="size-3.5 text-positive" />
            ) : (
              <Copy className="size-3.5 text-muted-foreground" />
            )}
            <span>{copied ? 'Đã sao chép' : 'Sao chép mã'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-[#1f2430] px-3 font-medium text-foreground transition-colors hover:bg-white/10"
          >
            <Download className="size-3.5 text-muted-foreground" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* Bảng Dữ Liệu */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-[#1a1f2c] text-muted-foreground font-semibold">
              <th
                onClick={() => handleSort('ticker')}
                className="cursor-pointer px-4 py-3 hover:text-foreground whitespace-nowrap"
              >
                Mã CK {renderSortIcon('ticker')}
              </th>
              <th
                onClick={() => handleSort('name')}
                className="cursor-pointer px-3 py-3 hover:text-foreground min-w-[160px]"
              >
                Tên doanh nghiệp {renderSortIcon('name')}
              </th>
              <th
                onClick={() => handleSort('exchange')}
                className="cursor-pointer px-3 py-3 hover:text-foreground whitespace-nowrap"
              >
                Sàn {renderSortIcon('exchange')}
              </th>
              <th
                onClick={() => handleSort('sector')}
                className="cursor-pointer px-3 py-3 hover:text-foreground whitespace-nowrap"
              >
                Ngành {renderSortIcon('sector')}
              </th>
              <th
                onClick={() => handleSort('price')}
                className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
              >
                Giá (k) {renderSortIcon('price')}
              </th>

              {/* Các cột động tùy theo Tab */}
              {activeTab === 'tong_quan' && (
                <>
                  <th
                    onClick={() => handleSort('change1w')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    1 Tuần (%) {renderSortIcon('change1w')}
                  </th>
                  <th
                    onClick={() => handleSort('marketCap')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    Vốn hóa (Tỷ) {renderSortIcon('marketCap')}
                  </th>
                  <th
                    onClick={() => handleSort('pe')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    P/E {renderSortIcon('pe')}
                  </th>
                  <th
                    onClick={() => handleSort('pb')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    P/B {renderSortIcon('pb')}
                  </th>
                  <th
                    onClick={() => handleSort('roe')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    ROE (%) {renderSortIcon('roe')}
                  </th>
                  <th
                    onClick={() => handleSort('score360')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    Điểm 360 {renderSortIcon('score360')}
                  </th>
                </>
              )}

              {activeTab === 'dinh_gia' && (
                <>
                  <th
                    onClick={() => handleSort('pe')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    P/E {renderSortIcon('pe')}
                  </th>
                  <th
                    onClick={() => handleSort('pb')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    P/B {renderSortIcon('pb')}
                  </th>
                  <th
                    onClick={() => handleSort('eps')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    EPS (VND) {renderSortIcon('eps')}
                  </th>
                  <th
                    onClick={() => handleSort('bvps')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    BVPS (VND) {renderSortIcon('bvps')}
                  </th>
                  <th
                    onClick={() => handleSort('marketCap')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    Vốn hóa (Tỷ) {renderSortIcon('marketCap')}
                  </th>
                  <th
                    onClick={() => handleSort('dy')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    Cổ tức (%) {renderSortIcon('dy')}
                  </th>
                </>
              )}

              {activeTab === 'hieu_qua' && (
                <>
                  <th
                    onClick={() => handleSort('roe')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    ROE (%) {renderSortIcon('roe')}
                  </th>
                  <th
                    onClick={() => handleSort('roa')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    ROA (%) {renderSortIcon('roa')}
                  </th>
                  <th
                    onClick={() => handleSort('netMargin')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    Biên Ròng (%) {renderSortIcon('netMargin')}
                  </th>
                  <th
                    onClick={() => handleSort('grossMargin')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    Biên Gộp (%) {renderSortIcon('grossMargin')}
                  </th>
                  <th
                    onClick={() => handleSort('debtToEquity')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    Nợ / VCSH {renderSortIcon('debtToEquity')}
                  </th>
                  <th
                    onClick={() => handleSort('cashRatio')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    Tiền / TS (%) {renderSortIcon('cashRatio')}
                  </th>
                  <th
                    onClick={() => handleSort('ktplRate')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    Trích KTPL (%) {renderSortIcon('ktplRate')}
                  </th>
                </>
              )}

              {activeTab === 'tang_truong' && (
                <>
                  <th
                    onClick={() => handleSort('profitGrowthYoY')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    LNST YoY (%) {renderSortIcon('profitGrowthYoY')}
                  </th>
                  <th
                    onClick={() => handleSort('revGrowthYoY')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    Doanh thu YoY (%) {renderSortIcon('revGrowthYoY')}
                  </th>
                  <th
                    onClick={() => handleSort('capexGrowth')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    CAPEX Mới (%) {renderSortIcon('capexGrowth')}
                  </th>
                  <th
                    onClick={() => handleSort('change1w')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    Biến động 1W (%) {renderSortIcon('change1w')}
                  </th>
                </>
              )}

              {activeTab === 'ky_thuat' && (
                <>
                  <th
                    onClick={() => handleSort('rsi14')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    RSI (14) {renderSortIcon('rsi14')}
                  </th>
                  <th
                    onClick={() => handleSort('volume20d')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    KL TB 20P (cp) {renderSortIcon('volume20d')}
                  </th>
                  <th
                    onClick={() => handleSort('change1w')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    1 Tuần (%) {renderSortIcon('change1w')}
                  </th>
                  <th
                    onClick={() => handleSort('change1m')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    1 Tháng (%) {renderSortIcon('change1m')}
                  </th>
                </>
              )}

              {activeTab === 'bao_cao' && (
                <>
                  <th
                    onClick={() => handleSort('score360')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    Điểm 360 {renderSortIcon('score360')}
                  </th>
                  <th
                    onClick={() => handleSort('score360Rating')}
                    className="cursor-pointer px-3 py-3 text-center hover:text-foreground whitespace-nowrap"
                  >
                    Đánh giá {renderSortIcon('score360Rating')}
                  </th>
                  <th
                    onClick={() => handleSort('reportCount')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    Báo cáo CTCK {renderSortIcon('reportCount')}
                  </th>
                  <th
                    onClick={() => handleSort('targetPrice')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    Giá MT (k) {renderSortIcon('targetPrice')}
                  </th>
                  <th
                    onClick={() => handleSort('upside')}
                    className="cursor-pointer px-3 py-3 text-right hover:text-foreground whitespace-nowrap"
                  >
                    Upside (%) {renderSortIcon('upside')}
                  </th>
                </>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-8 text-center text-muted-foreground">
                  Không có mã cổ phiếu nào thỏa mãn các điều kiện lọc.
                </td>
              </tr>
            ) : (
              pageRows.map((s) => {
                const stockHref = `/stock/${encodeURIComponent(s.ticker)}`
                return (
                  <tr
                    key={s.ticker}
                    className="transition-colors hover:bg-white/[0.03]"
                  >
                    {/* Mã CK */}
                    <td className="px-4 py-2.5 font-bold">
                      <Link
                        href={stockHref}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <span>{s.ticker}</span>
                        {s.isVN30 && (
                          <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-400">
                            VN30
                          </span>
                        )}
                      </Link>
                    </td>

                    {/* Tên công ty */}
                    <td className="px-3 py-2.5 max-w-[200px] truncate text-muted-foreground">
                      {s.name}
                    </td>

                    {/* Sàn */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                          s.exchange === 'HOSE'
                            ? 'bg-blue-500/15 text-blue-400'
                            : s.exchange === 'HNX'
                            ? 'bg-purple-500/15 text-purple-400'
                            : 'bg-emerald-500/15 text-emerald-400',
                        )}
                      >
                        {s.exchange}
                      </span>
                    </td>

                    {/* Ngành */}
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                      {s.sector}
                    </td>

                    {/* Giá TT */}
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground whitespace-nowrap">
                      {s.price != null ? s.price.toFixed(1) : '—'}
                    </td>

                    {/* Cột theo từng tab */}
                    {activeTab === 'tong_quan' && (
                      <>
                        <td
                          className={cn(
                            'px-3 py-2.5 text-right font-mono font-semibold whitespace-nowrap',
                            s.change1w != null && s.change1w > 0
                              ? 'text-positive'
                              : s.change1w != null && s.change1w < 0
                              ? 'text-negative'
                              : 'text-muted-foreground',
                          )}
                        >
                          {s.change1w != null
                            ? `${s.change1w > 0 ? '+' : ''}${s.change1w.toFixed(1)}%`
                            : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-foreground whitespace-nowrap">
                          {s.marketCap != null ? s.marketCap.toLocaleString('vi-VN') : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-foreground whitespace-nowrap">
                          {s.pe != null ? s.pe.toFixed(1) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-foreground whitespace-nowrap">
                          {s.pb != null ? s.pb.toFixed(2) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                          {s.roe != null ? `${s.roe.toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-primary whitespace-nowrap">
                          {s.score360 != null ? s.score360.toFixed(1) : '—'}
                        </td>
                      </>
                    )}

                    {activeTab === 'dinh_gia' && (
                      <>
                        <td className="px-3 py-2.5 text-right font-mono text-foreground whitespace-nowrap">
                          {s.pe != null ? s.pe.toFixed(1) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-foreground whitespace-nowrap">
                          {s.pb != null ? s.pb.toFixed(2) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-foreground whitespace-nowrap">
                          {s.eps != null ? s.eps.toLocaleString('vi-VN') : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-foreground whitespace-nowrap">
                          {s.bvps != null ? s.bvps.toLocaleString('vi-VN') : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-foreground whitespace-nowrap">
                          {s.marketCap != null ? s.marketCap.toLocaleString('vi-VN') : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-positive whitespace-nowrap">
                          {s.dy != null ? `${s.dy.toFixed(1)}%` : '—'}
                        </td>
                      </>
                    )}

                    {activeTab === 'hieu_qua' && (
                      <>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                          {s.roe != null ? `${s.roe.toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-foreground whitespace-nowrap">
                          {s.roa != null ? `${s.roa.toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-foreground whitespace-nowrap">
                          {s.netMargin != null ? `${s.netMargin.toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-foreground whitespace-nowrap">
                          {s.grossMargin != null ? `${s.grossMargin.toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-foreground whitespace-nowrap">
                          {s.debtToEquity != null ? s.debtToEquity.toFixed(2) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-foreground whitespace-nowrap">
                          {s.cashRatio != null ? `${s.cashRatio.toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-medium text-foreground whitespace-nowrap">
                          {s.ktplRate != null ? `${s.ktplRate.toFixed(1)}%` : '—'}
                        </td>
                      </>
                    )}

                    {activeTab === 'tang_truong' && (
                      <>
                        <td
                          className={cn(
                            'px-3 py-2.5 text-right font-mono font-semibold whitespace-nowrap',
                            s.profitGrowthYoY != null && s.profitGrowthYoY > 0
                              ? 'text-positive'
                              : s.profitGrowthYoY != null && s.profitGrowthYoY < 0
                              ? 'text-negative'
                              : 'text-muted-foreground',
                          )}
                        >
                          {s.profitGrowthYoY != null
                            ? `${s.profitGrowthYoY > 0 ? '+' : ''}${s.profitGrowthYoY.toFixed(1)}%`
                            : '—'}
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2.5 text-right font-mono font-semibold whitespace-nowrap',
                            s.revGrowthYoY != null && s.revGrowthYoY > 0
                              ? 'text-positive'
                              : s.revGrowthYoY != null && s.revGrowthYoY < 0
                              ? 'text-negative'
                              : 'text-muted-foreground',
                          )}
                        >
                          {s.revGrowthYoY != null
                            ? `${s.revGrowthYoY > 0 ? '+' : ''}${s.revGrowthYoY.toFixed(1)}%`
                            : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-foreground whitespace-nowrap">
                          {s.capexGrowth != null ? `+${s.capexGrowth.toFixed(1)}%` : '—'}
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2.5 text-right font-mono font-semibold whitespace-nowrap',
                            s.change1w != null && s.change1w > 0
                              ? 'text-positive'
                              : s.change1w != null && s.change1w < 0
                              ? 'text-negative'
                              : 'text-muted-foreground',
                          )}
                        >
                          {s.change1w != null
                            ? `${s.change1w > 0 ? '+' : ''}${s.change1w.toFixed(1)}%`
                            : '—'}
                        </td>
                      </>
                    )}

                    {activeTab === 'ky_thuat' && (
                      <>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground whitespace-nowrap">
                          {s.rsi14 != null ? s.rsi14 : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-foreground whitespace-nowrap">
                          {s.volume20d != null ? s.volume20d.toLocaleString('vi-VN') : '—'}
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2.5 text-right font-mono font-semibold whitespace-nowrap',
                            s.change1w != null && s.change1w > 0
                              ? 'text-positive'
                              : s.change1w != null && s.change1w < 0
                              ? 'text-negative'
                              : 'text-muted-foreground',
                          )}
                        >
                          {s.change1w != null
                            ? `${s.change1w > 0 ? '+' : ''}${s.change1w.toFixed(1)}%`
                            : '—'}
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2.5 text-right font-mono font-semibold whitespace-nowrap',
                            s.change1m != null && s.change1m > 0
                              ? 'text-positive'
                              : s.change1m != null && s.change1m < 0
                              ? 'text-negative'
                              : 'text-muted-foreground',
                          )}
                        >
                          {s.change1m != null
                            ? `${s.change1m > 0 ? '+' : ''}${s.change1m.toFixed(1)}%`
                            : '—'}
                        </td>
                      </>
                    )}

                    {activeTab === 'bao_cao' && (
                      <>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-primary whitespace-nowrap">
                          {s.score360 != null ? s.score360.toFixed(1) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[10px] font-bold',
                              s.score360Rating === 'XUẤT SẮC'
                                ? 'bg-positive/20 text-positive'
                                : s.score360Rating === 'TỐT'
                                ? 'bg-primary/20 text-primary'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {s.score360Rating || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-foreground whitespace-nowrap">
                          {s.reportCount > 0 ? (
                            <span className="rounded bg-primary/15 px-1.5 py-0.5 font-bold text-primary">
                              {s.reportCount} bài
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-foreground whitespace-nowrap">
                          {s.targetPrice != null ? s.targetPrice.toFixed(1) : '—'}
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2.5 text-right font-mono font-bold whitespace-nowrap',
                            s.upside != null && s.upside > 0
                              ? 'text-positive'
                              : 'text-muted-foreground',
                          )}
                        >
                          {s.upside != null ? `+${s.upside.toFixed(1)}%` : '—'}
                        </td>
                      </>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Phân trang (Pagination) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#121620] px-4 py-2.5 text-xs text-muted-foreground">
        <div>
          Hiển thị {(safePage - 1) * PAGE_SIZE + 1} -{' '}
          {Math.min(safePage * PAGE_SIZE, sortedStocks.length)} trên tổng số{' '}
          <span className="font-bold text-foreground">
            {sortedStocks.length.toLocaleString('vi-VN')}
          </span>{' '}
          mã
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-[#1c212c] transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronLeft className="size-3.5" />
          </button>

          <span className="px-2 font-mono text-xs text-foreground">
            {safePage} / {totalPages}
          </span>

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-[#1c212c] transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
