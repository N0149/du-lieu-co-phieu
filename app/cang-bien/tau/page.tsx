import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import { getDashboardSummary, formatDWT } from '@/lib/maritime'
import { Ship, Search, ChevronRight, Anchor, Navigation, ArrowLeft } from 'lucide-react'
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
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Top Banner */}
      <div className="border-b border-border/70 bg-gradient-to-b from-slate-950 via-slate-900/90 to-background py-8 sm:py-10">
        <div className="mx-auto max-w-[1600px] px-4 space-y-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Trang chủ
            </Link>
            <ChevronRight className="size-3" />
            <Link href="/cang-bien" className="hover:text-foreground transition-colors">
              Cảng Biển
            </Link>
            <ChevronRight className="size-3" />
            <span className="text-teal-400 font-semibold">Tra cứu tàu</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-400 mb-2">
                <Ship className="size-3.5" />
                <span>HỒ SƠ TÀU BIỂN</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Tra Cứu Tàu Biển Cập Cảng Việt Nam
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Dữ liệu tàu, kích thước LOA, mớn nước và trọng tải DWT thiết kế
              </p>
            </div>

            <Link
              href="/cang-bien"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:border-teal-500/40 hover:bg-teal-500/10 transition-all self-start md:self-auto"
            >
              <ArrowLeft className="size-3.5" />
              <span>Về Bản đồ Toàn quốc</span>
            </Link>
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
