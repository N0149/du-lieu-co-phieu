'use client'

import { useState, useMemo, useCallback } from 'react'
import { Search, Sparkles, X } from 'lucide-react'
import {
  type StockManifestItem,
  type MarketIndicesData,
  type MarketManifestData,
  removeVietnameseAccents,
} from '@/lib/longlivestock'
import { MarketIndicesStrip } from './market-indices-strip'
import { SectorChipsBrowser } from './sector-chips-browser'
import { StockScreenerBar, type ScreenerFilterState } from './stock-screener-bar'
import { MarketTreemap } from './market-treemap'
import { TopMoversPanel } from './top-movers-panel'
import { StockCardGrid } from './stock-card-grid'

interface LongLiveStockExplorerProps {
  manifestData: MarketManifestData
  indicesData: MarketIndicesData
}

const INITIAL_FILTER_STATE: ScreenerFilterState = {
  roeMin: null,
  peMax: null,
  pbMax: null,
  capMin: null,
  dyMin: null,
  w1Min: null,
  sector: '',
}

export function LongLiveStockExplorer({
  manifestData,
  indicesData,
}: LongLiveStockExplorerProps) {
  const [isSectorPanelOpen, setIsSectorPanelOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSector, setSelectedSector] = useState('')
  const [filterState, setFilterState] = useState<ScreenerFilterState>(INITIAL_FILTER_STATE)

  const allStocks = manifestData.items || []

  // All distinct ICB level 2 sectors for screener dropdown
  const sectorOptions = useMemo(() => {
    const set = new Set<string>()
    for (const s of allStocks) {
      if (s.s2) set.add(s.s2)
    }
    return Array.from(set).sort()
  }, [allStocks])

  // Screener filter change handler
  const handleFilterChange = useCallback((key: keyof ScreenerFilterState, value: any) => {
    setFilterState((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleResetFilters = useCallback(() => {
    setFilterState(INITIAL_FILTER_STATE)
    setSelectedSector('')
    setSearchQuery('')
  }, [])

  const handleSelectSector = useCallback((sector: string) => {
    setSelectedSector(sector)
    setFilterState((prev) => ({ ...prev, sector }))
    if (sector) {
      setIsSectorPanelOpen(false)
    }
  }, [])

  // Filter stocks based on search + sector + screener parameters
  const filteredStocks = useMemo(() => {
    const qNorm = removeVietnameseAccents(searchQuery.trim().toLowerCase())

    return allStocks.filter((x) => {
      // 1. Sector filter
      if (selectedSector && x.s2 !== selectedSector) return false
      if (filterState.sector && x.s2 !== filterState.sector) return false

      // 2. Search query (ticker, company name, sector)
      if (qNorm) {
        const textTarget = removeVietnameseAccents(`${x.t} ${x.n} ${x.s} ${x.s2} ${x.g}`.toLowerCase())
        if (!textTarget.includes(qNorm)) return false
      }

      // 3. Screener numeric criteria
      if (filterState.roeMin != null && (x.roe == null || isNaN(x.roe) || x.roe < filterState.roeMin))
        return false
      if (filterState.peMax != null && (x.pe == null || isNaN(x.pe) || x.pe <= 0 || x.pe > filterState.peMax))
        return false
      if (filterState.pbMax != null && (x.pb == null || isNaN(x.pb) || x.pb > filterState.pbMax))
        return false
      if (filterState.capMin != null && (x.cap == null || isNaN(x.cap) || x.cap < filterState.capMin))
        return false
      if (filterState.dyMin != null && (x.dy == null || isNaN(x.dy) || x.dy < filterState.dyMin))
        return false
      if (filterState.w1Min != null && (x.w1 == null || isNaN(x.w1) || x.w1 < filterState.w1Min))
        return false

      return true
    })
  }, [allStocks, searchQuery, selectedSector, filterState])

  const hasSearchOrFilter =
    searchQuery.trim().length > 0 ||
    selectedSector.length > 0 ||
    filterState.roeMin != null ||
    filterState.peMax != null ||
    filterState.pbMax != null ||
    filterState.capMin != null ||
    filterState.dyMin != null ||
    filterState.w1Min != null ||
    filterState.sector !== ''

  return (
    <div className="min-h-screen">
      {/* 1. Market Indices Strip */}
      <MarketIndicesStrip
        indicesData={indicesData}
        manifestData={manifestData}
        isSectorPanelOpen={isSectorPanelOpen}
        onToggleSectorPanel={() => setIsSectorPanelOpen((o) => !o)}
        totalSectorsCount={sectorOptions.length}
      />

      {/* 2. Sector Chips Dropdown Panel */}
      {isSectorPanelOpen && (
        <SectorChipsBrowser
          stocks={allStocks}
          selectedSector={selectedSector}
          onSelectSector={handleSelectSector}
        />
      )}

      {/* 3. Main Workspace */}
      <div className="mx-auto max-w-[1600px] px-4 py-6 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm nhanh 1.530 mã cổ phiếu (VD: HPG, FPT, VNM, Thép, Ngân hàng, Cảng biển)..."
            className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-sm text-foreground shadow-2xs placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Screener Bar */}
        <StockScreenerBar
          filterState={filterState}
          onChangeFilter={handleFilterChange}
          onResetFilters={handleResetFilters}
          sectorOptions={sectorOptions}
          filteredStocks={filteredStocks}
        />

        {/* Bento Row: Treemap Heatmap + Top Movers (Only shown when not actively searching to avoid clutter) */}
        {!hasSearchOrFilter && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <MarketTreemap
                stocks={allStocks}
                manifestData={manifestData}
                onSelectSector={handleSelectSector}
              />
            </div>
            <div>
              <TopMoversPanel stocks={allStocks} />
            </div>
          </div>
        )}

        {/* Stock Cards Grid */}
        <StockCardGrid
          stocks={filteredStocks}
          searchQuery={searchQuery}
          selectedSector={selectedSector}
        />
      </div>
    </div>
  )
}
