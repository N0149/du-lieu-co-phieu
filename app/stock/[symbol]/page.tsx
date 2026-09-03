import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { StockDetailView } from '@/components/stock-detail-view'
import {
  getAllStocks,
  getStockByTicker,
  fetchStockDetailData,
  type StockDetailData,
} from '@/lib/longlivestock'
import { getReportsForTicker } from '@/lib/report-stocks'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>
}): Promise<Metadata> {
  const { symbol } = await params
  const ticker = symbol.toUpperCase().trim()
  const manifestStock = getStockByTicker(ticker)

  if (!manifestStock) {
    return {
      title: `${ticker} · Tra Cứu Cổ Phiếu Việt Nam`,
    }
  }

  return {
    title: `${ticker} · ${manifestStock.n} · Phân Tích Chuyên Sâu & BCTC 16 Năm`,
    description: `Hồ sơ tài chính, báo cáo tài chính đa năm, P/E, P/B, ROE, cơ cấu cổ đông của ${ticker} (${manifestStock.n}) - ngành ${manifestStock.s}.`,
  }
}

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params
  const ticker = symbol.toUpperCase().trim()

  const allStocks = getAllStocks()
  const manifestItem = allStocks.find((s) => s.t.toUpperCase() === ticker)

  // Fetch full detailed data and core-card intelligence
  const stockData = await fetchStockDetailData(ticker)

  if (!stockData) {
    notFound()
  }

  // Lấy các bài báo cáo phân tích thực tế của mã từ kho dữ liệu
  const reports = getReportsForTicker(ticker)

  // Đọc dữ liệu chi tiết BCTC cục bộ áp dụng cho TẤT CẢ các mã cổ phiếu
  const detailedSnapshot = await (async () => {
    try {
      const { getLocalFinancialSnapshot } = await import('@/lib/local-financials')
      return getLocalFinancialSnapshot(
        ticker,
        stockData.company.name,
        stockData.company.exchange,
        stockData.financials
      )
    } catch {
      return null
    }
  })()

  // Find related stocks in same sector or group
  const relatedStocks = allStocks
    .filter(
      (s) =>
        s.t !== ticker &&
        !s.st &&
        (s.s === stockData?.company.sector || s.g === stockData?.company.icb_l1),
    )
    .sort((a, b) => (b.cap || 0) - (a.cap || 0))

  // Dữ liệu phân tích & so sánh chuyên sâu ngành Ngân hàng (nếu là bank)
  const { getBankAnalysisData } = await import('@/lib/banking-service')
  const bankAnalysisData = getBankAnalysisData(ticker)

  // Dữ liệu Đánh giá 360 & định giá P/E, P/B forward tổng hợp
  const { getStockEvaluation } = await import('@/lib/stock-evaluation-service')
  const evaluationData = await getStockEvaluation(ticker)

  // Dữ liệu Hồ sơ doanh nghiệp mở rộng (Cổ đông, Công ty con/liên kết, Giao dịch nội bộ)
  const { getCompanyFullProfile } = await import('@/lib/company-profile-service')
  const companyProfileData = await getCompanyFullProfile(ticker)

  // Dữ liệu Biểu đồ tài chính chuyên sâu (Quý & Năm)
  const { getFinancialChartData } = await import('@/lib/financial-charts-service')
  const { getValuationHistory } = await import('@/lib/valuation-history-service')
  const { getDividendHistory } = await import('@/lib/dividend-history-service')

  const [
    financialChartQuarter,
    financialChartAnnual,
    valuationHistory,
    dividendHistory,
  ] = await Promise.all([
    getFinancialChartData(ticker, 'quarter'),
    getFinancialChartData(ticker, 'annual'),
    getValuationHistory(ticker),
    getDividendHistory(ticker),
  ])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="w-full px-3 sm:px-6 lg:px-8 py-5">
        <StockDetailView
          stockData={stockData}
          relatedStocks={relatedStocks}
          reports={reports}
          detailedSnapshot={detailedSnapshot}
          bankAnalysisData={bankAnalysisData}
          evaluationData={evaluationData}
          companyProfileData={companyProfileData}
          financialChartQuarter={financialChartQuarter}
          financialChartAnnual={financialChartAnnual}
          valuationHistory={valuationHistory}
          dividendHistory={dividendHistory}
        />
      </main>
    </div>
  )
}
