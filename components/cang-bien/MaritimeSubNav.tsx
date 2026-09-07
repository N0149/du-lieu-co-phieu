'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { LayoutGrid, TrendingUp, Search, Database, Loader2 } from 'lucide-react'

interface Props {
  activeTab: 'tong-quan' | 'cuoc-van-tai' | 'tau' | 'nguon-du-lieu'
}

export function MaritimeSubNav({ activeTab }: Props) {
  const [selectedTab, setSelectedTab] = useState<string>(activeTab)

  useEffect(() => {
    setSelectedTab(activeTab)
  }, [activeTab])

  const tabs = [
    {
      id: 'tong-quan',
      label: 'Tổng quan & Cổ phiếu',
      href: '/cang-bien',
      icon: LayoutGrid,
    },
    {
      id: 'cuoc-van-tai',
      label: 'Cước vận tải biển',
      href: '/cang-bien/cuoc-van-tai',
      icon: TrendingUp,
    },
    {
      id: 'tau',
      label: 'Tra cứu tàu',
      href: '/cang-bien/tau',
      icon: Search,
    },
    {
      id: 'nguon-du-lieu',
      label: 'Nguồn dữ liệu',
      href: '/cang-bien/nguon-du-lieu',
      icon: Database,
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-semibold shadow-inner">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = tab.id === selectedTab
        const isLoadingThis = selectedTab === tab.id && activeTab !== tab.id
        return (
          <Link
            key={tab.id}
            href={tab.href}
            onClick={() => setSelectedTab(tab.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-all cursor-pointer ${
              isActive
                ? 'bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-black shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 font-bold'
            }`}
          >
            {isLoadingThis ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Icon className="size-3.5" />
            )}
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </div>
  )
}

