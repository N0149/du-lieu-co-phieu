'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import {
  FileText,
  Download,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnalystReportItem, MarketReportsResult } from '@/lib/reports-service'

interface MarketReportsSectionProps {
  initialReports?: MarketReportsResult | null
}

export function MarketReportsSection({ initialReports }: MarketReportsSectionProps) {
  const [data, setData] = useState<MarketReportsResult | null>(initialReports || null)
  const [page, setPage] = useState<number>(initialReports?.page || 1)
  const [search, setSearch] = useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = useState<string>('')
  const [sourceFilter, setSourceFilter] = useState<string>('ALL')
  const [loading, setLoading] = useState<boolean>(false)

  // Debounce ô tìm kiếm 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // Reset về trang 1 khi gõ tìm kiếm
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  const fetchReports = useCallback(
    async (targetPage: number, searchVal: string, sourceVal: string) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          page_size: '20',
        })
        if (searchVal.trim()) params.append('search', searchVal.trim())
        if (sourceVal && sourceVal !== 'ALL') params.append('source', sourceVal)

        const res = await fetch(`/api/market/reports?${params.toString()}`)
        const json = await res.json()
        if (json.success && json.data) {
          setData(json.data)
        }
      } catch (err) {
        console.error('[MarketReports] Error loading reports:', err)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Trigger fetch khi thay đổi trang, từ khóa hoặc nguồn
  useEffect(() => {
    fetchReports(page, debouncedSearch, sourceFilter)
  }, [page, debouncedSearch, sourceFilter, fetchReports])

  const reports = data?.reports || []
  const total = data?.total || 0
  const totalPages = data?.totalPages || 1
  const sources = data?.availableSources || []

  // Màu sắc badge nguồn CTCK
  const getSourceBadgeClass = (source: string | null) => {
    if (!source || source === '—') return 'bg-white/5 text-[#8B98A5] border-white/10'
    const s = source.toUpperCase()
    if (s.includes('SSI')) return 'bg-rose-500/15 text-rose-300 border-rose-500/30'
    if (s.includes('VND')) return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    if (s.includes('ACBS')) return 'bg-blue-500/15 text-blue-300 border-blue-500/30'
    if (s.includes('HSC')) return 'bg-purple-500/15 text-purple-300 border-purple-500/30'
    if (s.includes('VIETSTOCK')) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    if (s.includes('MIRAE') || s.includes('MAS')) return 'bg-orange-500/15 text-orange-300 border-orange-500/30'
    if (s.includes('KB')) return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  }

  return (
    <div className="space-y-4">
      {/* Top Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#161a23] p-3 sm:p-4 shadow-md">
        {/* Search input */}
        <div className="relative min-w-[240px] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B98A5]" />
          <input
            type="text"
            placeholder="Tìm kiếm tiêu đề, nội dung báo cáo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#12151c] py-2 pl-9 pr-3 text-xs text-[#F0F3F6] placeholder-[#64748b] transition-colors focus:border-emerald-500 focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8B98A5] hover:text-white"
            >
              ×
            </button>
          )}
        </div>

        {/* Filters and Stats */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Lọc nguồn CTCK */}
          <div className="flex items-center gap-1.5 text-xs text-[#9EACB9]">
            <Filter className="size-3.5 text-[#8B98A5]" />
            <span>Nguồn:</span>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value)
                setPage(1)
              }}
              className="rounded-lg border border-white/10 bg-[#12151c] px-2.5 py-1.5 text-xs text-[#F0F3F6] focus:border-emerald-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả nguồn ({sources.length})</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Tổng số báo cáo */}
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-[#F0F3F6]">
            <BookOpen className="size-3.5 text-emerald-400" />
            <span>
              Tổng cộng: <strong className="font-mono text-emerald-400">{total.toLocaleString('vi-VN')}</strong> báo cáo
            </span>
          </div>

          {/* Nút làm mới */}
          <button
            type="button"
            onClick={() => fetchReports(page, debouncedSearch, sourceFilter)}
            disabled={loading}
            className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#9EACB9] hover:bg-white/15 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            title="Tải lại danh sách"
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin text-emerald-400')} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-white/10 bg-[#161a23] shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-[#1c222e] text-[11px] font-semibold text-[#8B98A5]">
                <th className="py-3 px-3 w-[100px] text-center">Ngày</th>
                <th className="py-3 px-3 w-[260px]">Tiêu đề</th>
                <th className="py-3 px-3">Mô tả</th>
                <th className="py-3 px-3 w-[90px] text-center">Nguồn</th>
                <th className="py-3 px-3 w-[85px] text-center">Số trang</th>
                <th className="py-3 px-3 w-[70px] text-center">Tải về</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading && reports.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-4 px-4">
                      <div className="h-10 w-full bg-white/5 rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#8B98A5]">
                    {search ? 'Không tìm thấy báo cáo nào phù hợp với từ khóa.' : 'Chưa có dữ liệu báo cáo thị trường.'}
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr
                    key={report.id}
                    className="group transition-colors hover:bg-white/[0.03]"
                  >
                    {/* Ngày phát hành */}
                    <td className="py-3.5 px-3 text-center font-mono text-[11px] text-[#9EACB9] align-top whitespace-nowrap">
                      {report.date}
                    </td>

                    {/* Tiêu đề & Thumbnail */}
                    <td className="py-3.5 px-3 align-top">
                      <div className="flex items-start gap-3">
                        {/* Ảnh bìa xem trước (Kích thước chuẩn sách nhỏ 48x64px) */}
                        {report.thumbnailUrl ? (
                          <a
                            href={report.downloadUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              width: '48px',
                              height: '64px',
                              minWidth: '48px',
                              maxWidth: '48px',
                              minHeight: '64px',
                              maxHeight: '64px',
                            }}
                            className="relative block shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#12151c] shadow-sm transition-transform hover:scale-105"
                            title="Bấm để đọc file PDF"
                          >
                            <img
                              src={report.thumbnailUrl}
                              alt={report.title}
                              style={{
                                width: '48px',
                                height: '64px',
                                objectFit: 'cover',
                                objectPosition: 'top',
                              }}
                              className="block"
                              loading="lazy"
                            />
                          </a>
                        ) : (
                          <div
                            style={{
                              width: '48px',
                              height: '64px',
                              minWidth: '48px',
                              maxWidth: '48px',
                            }}
                            className="flex shrink-0 items-center justify-center rounded-md border border-white/10 bg-[#12151c] text-[#8B98A5]"
                          >
                            <FileText className="size-5 text-emerald-400/60" />
                          </div>
                        )}

                        {/* Tên báo cáo */}
                        <div className="min-w-0 flex-1">
                          <a
                            href={report.downloadUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-[#F0F3F6] hover:text-emerald-400 transition-colors line-clamp-2"
                            title={report.title}
                          >
                            {report.title}
                          </a>
                        </div>
                      </div>
                    </td>

                    {/* Mô tả tóm tắt nội dung */}
                    <td className="py-3.5 px-3 align-top text-[#9EACB9] text-[11px] leading-relaxed">
                      <p className="line-clamp-3" title={report.description}>
                        {report.description || 'Chưa có phần tóm tắt cho báo cáo này.'}
                      </p>
                    </td>

                    {/* Nguồn CTCK */}
                    <td className="py-3.5 px-3 text-center align-top whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide',
                          getSourceBadgeClass(report.source)
                        )}
                      >
                        {report.source || '—'}
                      </span>
                    </td>

                    {/* Số trang */}
                    <td className="py-3.5 px-3 text-center align-top font-mono text-[11px] text-[#9EACB9] whitespace-nowrap">
                      {report.pageCount > 0 ? `${report.pageCount} trang` : '—'}
                    </td>

                    {/* Nút Đọc / Tải về PDF */}
                    <td className="py-3.5 px-3 text-center align-top">
                      {report.downloadUrl ? (
                        <a
                          href={report.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#9EACB9] transition-all hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:text-emerald-300"
                          title="Tải / Đọc file PDF"
                          download
                        >
                          <Download className="size-4" />
                        </a>
                      ) : (
                        <span className="text-[#64748b]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Thanh phân trang Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#1c222e] px-4 py-3 text-xs">
            <span className="text-[#9EACB9]">
              Trang <strong className="font-mono text-[#F0F3F6]">{page}</strong> /{' '}
              <strong className="font-mono text-[#F0F3F6]">{totalPages}</strong> ({total} báo cáo)
            </span>

            <div className="flex items-center gap-1">
              {/* Trang trước */}
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#9EACB9] hover:bg-white/15 hover:text-white transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                title="Trang trước"
              >
                <ChevronLeft className="size-4" />
              </button>

              {/* Các nút số trang */}
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pNum = page
                if (page <= 3) pNum = i + 1
                else if (page >= totalPages - 2) pNum = totalPages - 4 + i
                else pNum = page - 2 + i

                if (pNum < 1 || pNum > totalPages) return null

                const active = pNum === page
                return (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => setPage(pNum)}
                    disabled={loading}
                    className={cn(
                      'flex size-8 items-center justify-center rounded-lg text-xs font-semibold transition-all cursor-pointer font-mono',
                      active
                        ? 'bg-emerald-500 text-white shadow-sm font-bold'
                        : 'border border-white/10 bg-white/5 text-[#9EACB9] hover:bg-white/15 hover:text-white'
                    )}
                  >
                    {pNum}
                  </button>
                )
              })}

              {/* Trang sau */}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#9EACB9] hover:bg-white/15 hover:text-white transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                title="Trang sau"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
