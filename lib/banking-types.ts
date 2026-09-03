export interface BankRadarItem {
  key: string
  label: string
  unit: string
  rawValue: number | null
  formattedValue: string
  rank: number
  totalBanks: number
  industryMedian: number | null
  higherBetter: boolean
  // Điểm số chuẩn hóa 0 - 100 để vẽ trên Radar Recharts
  normalizedScore: number
}

export interface BankSpiderOverview {
  symbol: string
  name: string
  overall_points: number
  overall_place: number
  max_points: number
  period: string
  totalBanks: number
  radarData: BankRadarItem[]
}

export interface BankPeerBarItem {
  symbol: string
  primaryPct: number // % Ngắn hạn hoặc % Cá nhân
  secondaryPct: number // % Trung-dài hạn hoặc % Doanh nghiệp
  isCurrent: boolean
}

export interface BankPeerChartData {
  title: string
  primaryLabel: string
  secondaryLabel: string
  items: BankPeerBarItem[]
  periodLabel: string
}

export interface BankAnalysisData {
  isBank: boolean
  symbol: string
  spider?: BankSpiderOverview | null
  loanTermChart?: BankPeerChartData | null
  customerGroupChart?: BankPeerChartData | null
}
