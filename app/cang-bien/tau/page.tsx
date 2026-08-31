import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { getDashboardSummary, formatDWT } from '@/lib/maritime'
import { Ship, Search, ChevronRight, Anchor, Navigation, ArrowLeft, LayoutGrid, Database, Activity } from 'lucide-react'
import { VesselSearchClient } from './vessel-search-client'

export const metadata: Metadata = {
  title: 'Tra Cứu Tàu Biển & Lịch Sử Cập Cảng Việt Nam | Dữ Liệu Cảng Biển',
  description:
    'Tìm kiếm thông tin tàu biển qua các cảng Việt Nam: Chiều dài (LOA), Mớn nước, Trọng tải (DWT, GRT), Cảng thường ghé và lịch sử điều động.',
}

export default function VesselSearchPage() {
  const summary = getDashboardSummary()
  const calls = summary?.recent_port_calls || []

  // Aggregate unique vessels from recent calls
  const vesselMap = new Map<string, any>()
  calls.forEach((c: any) => {
    if (!vesselMap.has(c.vessel_name)) {
      vesselMap.set(c.vessel_name, {
        name: c.vessel_name,
        dwt: c.dwt || 0,
        gt: c.gt || 0,
        loa: c.loa || 0,
        draft: c.draft || 0,
        lastBerth: c.berth_name || '—',
        stockTicker: c.stock_ticker || null,
        authority: c.authority_id || 'haiphong',
        lastDate: c.call_date,
        callsCount: 1,
      })
    } else {
      const existing = vesselMap.get(c.vessel_name)
      existing.callsCount += 1
      if (!existing.dwt && c.dwt) existing.dwt = c.dwt
    }
  })

  const vessels = Array.from(vesselMap.values()).sort((a, b) => b.dwt - a.dwt)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 selection:bg-teal-500 selection:text-slate-950">
      {/* Site Header */}
      <SiteHeader />

      {/* Top Banner */}
      <div className="relative border-b border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8 sm:py-10 overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/3 -translate-x-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-[1600px] px-4 space-y-6 relative z-10">
          {/* Breadcrumb & Sub-nav */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Link href="/" className="hover:text-slate-200 transition-colors">
                Trang chủ
              </Link>
              <ChevronRight className="size-3 text-slate-600" />
              <Link href="/cang-bien" className="hover:text-slate-200 transition-colors">
                Cảng Biển
              </Link>
              <ChevronRight className="size-3 text-slate-600" />
              <span className="text-teal-400 font-bold">Tra cứu tàu</span>
            </div>

            {/* Maritime Sub-navigation Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-semibold shadow-inner">
              <Link
                href="/cang-bien"
                className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all font-bold"
              >
                <LayoutGrid className="size-3.5" />
                <span>Tổng quan &amp; Cổ phiếu</span>
              </Link>
              <Link
                href="/cang-bien/tau"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 px-3.5 py-1.5 font-black shadow-md shadow-teal-500/20"
              >
                <Search className="size-3.5" />
                <span>Tra cứu tàu</span>
              </Link>
              <Link
                href="/cang-bien/nguon-du-lieu"
                className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all font-bold"
              >
                <Database className="size-3.5 text-sky-400" />
                <span>Nguồn dữ liệu</span>
              </Link>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-black text-teal-300 mb-2.5">
                <Ship className="size-3.5 text-teal-400" />
                <span>HỒ SƠ TÀU BIỂN TOÀN CẦU &amp; VIỆT NAM</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                Tra Cứu Tàu Biển Cập Cảng Việt Nam
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
                Thông số kích thước chiều dài LOA, mớn nước, trọng tải thiết kế DWT và lịch sử điều động
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container with Search Client */}
      <div className="mx-auto max-w-[1600px] px-4 pt-8">
        <VesselSearchClient initialVessels={vessels} />
      </div>
    </div>
  )
}
