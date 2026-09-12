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
  searchParams,
}: {
  params: Promise<{ symbol: string }>
  searchParams?: Promise<{ tab?: string }>
}) {
  const { symbol } = await params
  const sParams = searchParams ? await searchParams : {}
  const rawTab = sParams?.tab?.toLowerCase()
  let initialTab: 'profile' | 'charts' | 'financials' | 'peers' | 'evaluation' | 'reports' | 'agm' = 'charts'

  if (rawTab === 'profile') initialTab = 'profile'
  else if (rawTab === 'financials') initialTab = 'financials'
  else if (rawTab === 'peers') initialTab = 'peers'
  else if (rawTab === 'evaluation') initialTab = 'evaluation'
  else if (rawTab === 'reports') initialTab = 'reports'
  else if (rawTab === 'agm' || rawTab === 'dhcd' || rawTab === 'dhcd-2026' || rawTab === 'dai-hoi-co-dong') initialTab = 'agm'
  else if (rawTab === 'charts' || rawTab === 'financial-charts') initialTab = 'charts'

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
  const { getBusinessPlan } = await import('@/lib/business-plan-db')
  const { buildProfitStructureData } = await import('@/lib/profit-structure-service')
  const { buildCostBreakdownData } = await import('@/lib/cost-breakdown-service')
  const { buildDetailedBalanceSheetCashFlowData } = await import('@/lib/balance-sheet-cashflow-service')
  const { buildCapexFinancialData } = await import('@/lib/capex-financial-service')
  const { buildDebtDupontData } = await import('@/lib/debt-dupont-service')
  const { getAgmReport, getAvailableAgmTickers, getAgmKtpl } = await import('@/lib/agm-service')
  const { getFinancialStatements } = await import('@/lib/financial-statements-db')

  const [
    financialChartQuarter,
    financialChartAnnual,
    valuationHistory,
    dividendHistory,
    businessPlanData,
    financialStatementsQuarter,
    financialStatementsAnnual,
    agmData,
    availableAgmTickers,
  ] = await Promise.all([
    getFinancialChartData(ticker, 'quarter'),
    getFinancialChartData(ticker, 'annual'),
    getValuationHistory(ticker),
    getDividendHistory(ticker),
    getBusinessPlan(ticker),
    getFinancialStatements(ticker, 'quarter'),
    getFinancialStatements(ticker, 'annual'),
    Promise.resolve(getAgmReport(ticker, 2026)),
    Promise.resolve(getAvailableAgmTickers(2026)),
  ])

  // Tính toán đồng thời các cụm biểu đồ chuyên sâu từ dữ liệu BCTC đã tải (0ms overhead)
  const profitStructureQuarter = buildProfitStructureData(ticker, 'quarter', financialStatementsQuarter)
  const profitStructureAnnual = buildProfitStructureData(ticker, 'annual', financialStatementsAnnual)
  const costBreakdownQuarter = buildCostBreakdownData(ticker, 'quarter', financialStatementsQuarter)
  const costBreakdownAnnual = buildCostBreakdownData(ticker, 'annual', financialStatementsAnnual)
  const balanceSheetQuarter = buildDetailedBalanceSheetCashFlowData(ticker, 'quarter', financialStatementsQuarter)
  const balanceSheetAnnual = buildDetailedBalanceSheetCashFlowData(ticker, 'annual', financialStatementsAnnual)
  const capexFinancialQuarter = buildCapexFinancialData(ticker, 'quarter', financialStatementsQuarter)
  const capexFinancialAnnual = buildCapexFinancialData(ticker, 'annual', financialStatementsAnnual)
  const debtDupontQuarter = buildDebtDupontData(ticker, 'quarter', financialStatementsQuarter)
  const debtDupontAnnual = buildDebtDupontData(ticker, 'annual', financialStatementsAnnual)

  // Tỷ lệ lợi nhuận trích ngoài cổ đông (KTPL, Thưởng BĐH, Thù lao HĐQT)
  const ktplRate = agmData?.ktplRate ?? getAgmKtpl(ticker)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="w-full px-3 sm:px-6 lg:px-8 py-5">
        <StockDetailView
          stockData={stockData}
          relatedStocks={relatedStocks}
          reports={reports}
          detailedSnapshot={detailedSnapshot}
          initialFinancialStatements={financialStatementsQuarter}
          initialFinancialStatementsAnnual={financialStatementsAnnual}
          bankAnalysisData={bankAnalysisData}
          evaluationData={evaluationData}
          companyProfileData={companyProfileData}
          financialChartQuarter={financialChartQuarter}
          financialChartAnnual={financialChartAnnual}
          valuationHistory={valuationHistory}
          dividendHistory={dividendHistory}
          businessPlanData={businessPlanData}
          profitStructureQuarter={profitStructureQuarter}
          profitStructureAnnual={profitStructureAnnual}
          costBreakdownQuarter={costBreakdownQuarter}
          costBreakdownAnnual={costBreakdownAnnual}
          balanceSheetQuarter={balanceSheetQuarter}
          balanceSheetAnnual={balanceSheetAnnual}
          capexFinancialQuarter={capexFinancialQuarter}
          capexFinancialAnnual={capexFinancialAnnual}
          debtDupontQuarter={debtDupontQuarter}
          debtDupontAnnual={debtDupontAnnual}
          agmData={agmData}
          availableAgmTickers={availableAgmTickers}
          ktplRate={ktplRate}
          initialTab={initialTab}
        />
      </main>
    </div>
  )
}
