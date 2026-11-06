'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Maximize2, Download, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ValuationFilterResult } from '@/lib/pe-pb-service'
import { ValuationCanvasChart, exportCanvasToPng } from './ValuationCanvasChart'

interface ValuationChartsSectionProps {
  initialValuation?: ValuationFilterResult | null
}

const PRESETS = [
  { key: 'ytd', label: 'YTD' },
  { key: '6m', label: '6M' },
  { key: '1y', label: '1Y' },
  { key: '3y', label: '3Y' },
  { key: '5y', label: '5Y' },
  { key: '10y', label: '10Y' },
  { key: 'all', label: 'All' },
]

export function ValuationChartsSection({ initialValuation }: ValuationChartsSectionProps) {
  const [data, setData] = useState<ValuationFilterResult | null>(initialValuation || null)
  const [period, setPeriod] = useState<string>('10y')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  const [modalChart, setModalChart] = useState<'PE' | 'PB' | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (initialValuation?.current?.ymd && initialValuation?.points?.length) {
      setFromDate(initialValuation.points[0]?.ymd || '')
      setToDate(initialValuation.current.ymd || '')
    }
  }, [initialValuation])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalChart(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!modalChart) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [modalChart])

  const handlePeriodChange = async (newPeriod: string) => {
    setPeriod(newPeriod)
    setLoading(true)

    try {
      const res = await fetch(`/api/market/pe-pb?period=${newPeriod}`)
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
        if (json.data.points?.length) {
          setFromDate(json.data.points[0]?.ymd || '')
          setToDate(json.data.current?.ymd || '')
        }
      }
    } catch (err) {
      console.error('[Valuation] Period change error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCustomDateFilter = async () => {
    if (!fromDate || !toDate) return
    setPeriod('')
    setLoading(true)

    try {
      const res = await fetch(`/api/market/pe-pb?from=${fromDate}&to=${toDate}`)
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
      }
    } catch (err) {
      console.error('[Valuation] Date filter error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleModalDownload = () => {
    if (!modalChart) return
    const modalCanvas = document.querySelector('#modal-chart-container canvas') as HTMLCanvasElement
    const fileName = `${modalChart}_VNINDEX_EXPANDED_${new Date().toISOString().slice(0, 10)}`
    exportCanvasToPng(modalCanvas, fileName)
  }

  return (
    <div className="space-y-4">
      {/* Top Filter & Date Range Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-[#161a23] p-1 shadow-sm">
          {PRESETS.map((p) => {
            const active = period === p.key
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => handlePeriodChange(p.key)}
                className={cn(
                  'rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer',
                  active
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-[#9EACB9] hover:bg-white/5 hover:text-[#F0F3F6]'
                )}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        {/* Date Inputs & Latest Date Info */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#8B98A5]">Từ</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#161a23] px-2 py-1 text-xs text-[#F0F3F6] focus:border-emerald-500 focus:outline-none"
            />
            <span className="text-[#8B98A5]">đến</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#161a23] px-2 py-1 text-xs text-[#F0F3F6] focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCustomDateFilter}
              className="rounded-lg border border-white/10 bg-[#212631] px-2.5 py-1 text-xs font-semibold text-[#F0F3F6] hover:bg-white/10 transition-colors cursor-pointer"
            >
              Lọc
            </button>
          </div>

          {data?.latestDate && (
            <span className="text-xs text-[#9EACB9]">
              Dữ liệu cập nhật đến ngày: <strong className="font-mono text-[#F0F3F6]">{data.latestDate}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Grid 2 Biểu Đồ PE & PB Canvas GPU Sắc Nét */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ValuationCanvasChart
          type="PE"
          titleSummary={data?.peTitleSummary || ''}
          stats={data?.peStats || null}
          dataPoints={data?.points || []}
          loading={loading}
          onMaximize={() => setModalChart('PE')}
        />
        <ValuationCanvasChart
          type="PB"
          titleSummary={data?.pbTitleSummary || ''}
          stats={data?.pbStats || null}
          dataPoints={data?.points || []}
          loading={loading}
          onMaximize={() => setModalChart('PB')}
        />
      </div>

      {/* MODAL PHÓNG TO TOÀN MÀN HÌNH (POPUP MODAL) */}
      {modalChart && mounted && createPortal(
        <div
          className="portal-modal-overlay fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          style={{ zIndex: 999999 }}
          onClick={() => setModalChart(null)}
        >
          <div
            className="portal-modal-content relative flex flex-col w-full max-w-5xl rounded-3xl border border-white/20 bg-[#161a23] p-5 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto"
            style={{ zIndex: 1000000 }}
            onClick={(e) => e.stopPropagation()}
            id="modal-chart-container"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Maximize2 className="size-4" />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#F0F3F6]">
                    {modalChart === 'PE' ? 'PE VN-Index Lịch Sử' : 'PB VN-Index Lịch Sử'}
                  </h3>
                  <p className="text-xs text-[#9EACB9]">
                    {modalChart === 'PE' ? data?.peTitleSummary : data?.pbTitleSummary}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Tải về + Đóng */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleModalDownload}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#F0F3F6] hover:bg-white/15 transition-colors cursor-pointer shadow-sm"
                  title="Tải ảnh PNG"
                >
                  <Download className="size-3.5" />
                  <span className="hidden sm:inline">Tải về</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalChart(null)}
                  className="flex size-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#9EACB9] hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
                  title="Đóng (Esc)"
                  aria-label="Đóng popup"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Modal Chart Body */}
            <div className="w-full">
              {modalChart === 'PE' ? (
                <ValuationCanvasChart
                  type="PE"
                  titleSummary={data?.peTitleSummary || ''}
                  stats={data?.peStats || null}
                  dataPoints={data?.points || []}
                  loading={loading}
                  isModal={true}
                />
              ) : (
                <ValuationCanvasChart
                  type="PB"
                  titleSummary={data?.pbTitleSummary || ''}
                  stats={data?.pbStats || null}
                  dataPoints={data?.points || []}
                  loading={loading}
                  isModal={true}
                />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
