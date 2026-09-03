export interface ShareholderItem {
  name: string
  shares: string
  rate: number
  updated: string
}

export interface OwnershipStructure {
  foreign: number
  state: number
  other: number
  shareholders: ShareholderItem[]
  pieChartData: {
    name: string
    value: number
    color: string
  }[]
}

export interface SubsidiaryItem {
  name: string
  charterCapital: number
  contributedCapital: number
  ownershipRate: number
  type: 'subsidiary' | 'associate'
  note?: string
}

export interface InsiderTradeItem {
  traderName: string
  traderPosition?: string
  leaderName?: string
  tradeDate: string
  action: 'BUY' | 'SELL' | 'NONE'
  volumeTraded: number
  volumeRegistered: number
  volumeAfter: number
}

export interface CompanyFullProfileData {
  symbol: string
  ownership: OwnershipStructure
  subsidiaries: SubsidiaryItem[]
  insiderTrades: InsiderTradeItem[]
}
