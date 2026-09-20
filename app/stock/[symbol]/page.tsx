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
import { getLocalFinancialSnapshot } from '@/lib/local-financials'
import { getBankAnalysisData } from '@/lib/banking-service'
import { getStockEvaluation } from '@/lib/stock-evaluation-service'
import { getCompanyFullProfile } from '@/lib/company-profile-service'
import { getFinancialChartData } from '@/lib/financial-charts-service'
import { getValuationHistory } from '@/lib/valuation-history-service'
import { getDividendHistory } from '@/lib/dividend-history-service'
import { getBusinessPlan } from '@/lib/business-plan-db'
import { buildProfitStructureData } from '@/lib/profit-structure-service'
import { buildCostBreakdownData } from '@/lib/cost-breakdown-service'
import { buildDetailedBalanceSheetCashFlowData } from '@/lib/balance-sheet-cashflow-service'
import { buildCapexFinancialData } from '@/lib/capex-financial-service'
import { buildDebtDupontData } from '@/lib/debt-dupont-service'
import { getAgmReport, getAvailableAgmTickers, getAgmKtpl } from '@/lib/agm-service'
import { getBctcReport, getAvailableBctcTickers } from '@/lib/bctc-service'
import { getStockIcbHierarchy } from '@/lib/icb-service'
import { getFinancialStatements } from '@/lib/financial-statements-db'
import { getStockArticles } from '@/lib/stock-articles-service'
import { getLocalPriceWeekly, getStockCandles } from '@/lib/stock-price-history-service'
import { getCompanyWebsiteMeta } from '@/lib/company-website-service'
import { getCompanyBctcDocuments } from '@/lib/bctc-document-service'

// Tối ưu hóa bộ nhớ đệm CDN Edge Vercel (ISR) 60 giây:
// Người dùng tiếp theo truy cập sẽ nhận phản hồi < 50ms từ Edge CDN gần nhất (Singapore/Việt Nam)
export const revalidate = 60

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
  const rawTab = sParams.tab?.toLowerCase()
  let initialTab: 'overview' | 'profile' | 'charts' | 'articles' | 'community' | 'financials' | 'peers' | 'reports' | 'agm' | 'bctc' = 'overview'

  if (rawTab === 'overview' || rawTab === 'tong-quan' || rawTab === 'do-thi' || rawTab === 'chart') initialTab = 'overview'
  else if (rawTab === 'charts' || rawTab === 'financial-charts' || rawTab === 'tai-chinh' || rawTab === 'bctc-chart') initialTab = 'charts'
  else if (rawTab === 'profile') initialTab = 'profile'
  else if (rawTab === 'articles' || rawTab === 'news' || rawTab === 'bai-viet' || rawTab === 'tin-tuc') initialTab = 'articles'
  else if (rawTab === 'community' || rawTab === 'cong-dong' || rawTab === 'thao-luan' || rawTab === 'dien-dan') initialTab = 'community'
  else if (rawTab === 'financials') initialTab = 'financials'
  else if (rawTab === 'peers') initialTab = 'peers'
  else if (rawTab === 'reports') initialTab = 'reports'
  else if (rawTab === 'agm' || rawTab === 'dhcd' || rawTab === 'dhcd-2026' || rawTab === 'dai-hoi-co-dong') initialTab = 'agm'
  else if (rawTab === 'bctc' || rawTab === 'thuyet-minh' || rawTab === 'thuyetminh' || rawTab === 'notes') initialTab = 'bctc'

  const ticker = symbol.toUpperCase().trim()

  const allStocks = getAllStocks()
  const manifestItem = allStocks.find((s) => s.t.toUpperCase() === ticker)

  if (!manifestItem) {
    notFound()
  }

  // Chạy song song toàn bộ các dịch vụ dữ liệu nội bộ (100% Local-First) trong 1 Promise.all duy nhất
  const [
    stockData,
    evaluationData,
    companyProfileData,
    financialChartQuarter,
    financialChartAnnual,
    valuationHistory,
    dividendHistory,
    businessPlanData,
    financialStatementsQuarter,
    financialStatementsAnnual,
    agmData,
    availableAgmTickers,
    bctcDataHopNhat,
    bctcDataCongTyMe,
    availableBctcTickers,
    articlesData,
    companyWebsiteMeta,
    initialCandles,
  ] = await Promise.all([
    fetchStockDetailData(ticker, getLocalPriceWeekly(ticker)),
    getStockEvaluation(ticker),
    getCompanyFullProfile(ticker),
    getFinancialChartData(ticker, 'quarter'),
    getFinancialChartData(ticker, 'annual'),
    getValuationHistory(ticker),
    getDividendHistory(ticker),
    getBusinessPlan(ticker),
    getFinancialStatements(ticker, 'quarter'),
    getFinancialStatements(ticker, 'annual'),
    Promise.resolve(getAgmReport(ticker, 2026)),
    Promise.resolve(getAvailableAgmTickers(2026)),
    Promise.resolve(getBctcReport(ticker, 'HopNhat')),
    Promise.resolve(getBctcReport(ticker, 'CongTyMe')),
    Promise.resolve(getAvailableBctcTickers()),
    Promise.resolve(getStockArticles(ticker, manifestItem.n)),
    Promise.resolve(getCompanyWebsiteMeta(ticker)),
    getStockCandles(ticker, 5).catch(() => []),
  ])

  if (!stockData) {
    notFound()
  }

  // Tự động chuyển đổi dữ liệu chuỗi năm tài chính sang financials nếu financials đang trống
  if (stockData && (!stockData.financials || stockData.financials.length === 0) && financialChartAnnual?.newFiscalDateYear) {
    const years = financialChartAnnual.newFiscalDateYear
    const revs = financialChartAnnual.doanhSoThuan || []
    const profs = financialChartAnnual.lnst || []
    const assets = financialChartAnnual.tongCongTaiSan || []
    const equity = financialChartAnnual.nvVonChuSoHuu || []
    stockData.financials = years.map((yStr: string, idx: number) => {
      const yr = parseInt(yStr.slice(0, 4), 10)
      const r = revs[idx] != null ? Math.round(revs[idx]) : null
      const p = profs[idx] != null ? Math.round(profs[idx]) : null
      const net_margin = r && p != null && r > 0 ? Math.round((p / r) * 1000) / 10 : null
      return {
        year: yr,
        revenue: r,
        profit: p,
        assets: assets[idx] != null ? Math.round(assets[idx]) : null,
        equity: equity[idx] != null ? Math.round(equity[idx]) : null,
        liabilities: null,
        eps: null,
        bvps: null,
        roe: null,
        roa: null,
        gross_margin: null,
        net_margin,
        revenue_growth: null,
        npat_growth: null,
        current_ratio: null,
        debt_to_equity: null,
        operating_cash_flow: null,
        investing_cash_flow: null,
        financing_cash_flow: null,
        free_cash_flow: null,
        dividend: null,
      }
    })
  }

  // Lấy các bài báo cáo phân tích thực tế của mã từ kho dữ liệu
  const reports = getReportsForTicker(ticker)

  // Đọc dữ liệu chi tiết BCTC cục bộ áp dụng cho TẤT CẢ các mã cổ phiếu
  const detailedSnapshot = getLocalFinancialSnapshot(
    ticker,
    stockData.company.name,
    stockData.company.exchange,
    stockData.financials
  )

  // Lấy phân cấp ngành ICB chuyên sâu (Cấp 4, Cấp 2, Cấp 1) & danh sách đối thủ thực thụ
  const icbHierarchy = getStockIcbHierarchy(ticker)
  const relatedStocks = icbHierarchy?.l4Peers && icbHierarchy.l4Peers.length > 0
    ? icbHierarchy.l4Peers
    : allStocks
        .filter(
          (s) =>
            s.t !== ticker &&
            !s.st &&
            (s.s === stockData?.company.sector || s.g === stockData?.company.icb_l1),
        )
        .sort((a, b) => (b.cap || 0) - (a.cap || 0))

  // Dữ liệu phân tích & so sánh chuyên sâu ngành Ngân hàng (nếu là bank)
  const bankAnalysisData = getBankAnalysisData(ticker)

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

  // Danh mục file PDF/ZIP BCTC kiểm toán gốc & các cổng công bố thông tin chính thức
  const bctcDocuments = getCompanyBctcDocuments(ticker, companyWebsiteMeta?.website)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="w-full px-3 sm:px-6 lg:px-8 py-5">
        <StockDetailView
          stockData={stockData}
          relatedStocks={relatedStocks}
          icbHierarchy={icbHierarchy}
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
          bctcDataHopNhat={bctcDataHopNhat}
          bctcDataCongTyMe={bctcDataCongTyMe}
          availableBctcTickers={availableBctcTickers}
          ktplRate={ktplRate}
          articlesData={articlesData}
          initialTab={initialTab}
          companyWebsiteMeta={companyWebsiteMeta}
          bctcDocuments={bctcDocuments}
          initialCandles={initialCandles}
        />
      </main>
    </div>
  )
}
