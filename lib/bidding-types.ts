export interface BiddingPackage2026 {
  quarter: string;
  code: string;
  name: string;
  client: string;
  pkg_price: number;
  win_price: number;
  award_date: string;
  scope?: string;
  duration_months?: number;
  status: string;
}

export interface QuarterlyFinancialMetrics {
  bidding_value_billion?: number;
  bids_won_count?: number;
  net_revenue_billion?: number;
  revenue_yoy_growth_pct?: number;
  revenue_qoq_growth_pct?: number;
  gross_profit_billion?: number;
  gross_margin_pct?: number;
  npat_billion?: number;
  npat_yoy_growth_pct?: number;
  net_margin_pct?: number;
  eps_4q_trailing_vnd?: number;
  status?: string;
}

export interface QuarterlyBiddingRevenueComparison {
  quarter: string;
  year: number;
  quarter_num: number;
  bidding_value_billion: number;
  bids_won_count: number;
  net_revenue_billion: number;
  npat_billion?: number;
  is_forecast?: boolean;
  note?: string;
}

export interface YearlyBiddingHistory {
  year: number;
  bids_won: number;
  value_billion: number;
}

export interface HealthcareContractor {
  id: string;
  name: string;
  short_name: string;
  stock_code?: string;
  tax_code: string;
  address: string;
  founded_year?: number;
  segment: string;
  segment_group: 'DRUGS' | 'SPECIALTY_DRUGS' | 'HERBAL_DRUGS' | 'MEDICAL_DEVICES' | 'CONSUMABLES' | string;
  is_listed: boolean;
  exchange?: string;
  bids_participated: number;
  bids_won: number;
  bids_lost: number;
  bids_pending: number;
  win_rate: number;
  total_winning_value: number;
  solo_winning_value: number;
  joint_winning_value: number;
  avg_discount_rate: number;
  top_hospital_clients: string[];
  key_products: string[];
  yearly_history: YearlyBiddingHistory[];
  notable_packages?: any[];
  packages_2026?: BiddingPackage2026[];
  quarterly_financials_2026?: {
    Q1_2026?: QuarterlyFinancialMetrics;
    Q2_2026?: QuarterlyFinancialMetrics;
    Q3_2026_FORECAST?: QuarterlyFinancialMetrics;
  };
  quarterly_comparison_series?: QuarterlyBiddingRevenueComparison[];
}

export interface InfrastructureProject {
  id: string;
  code: string;
  name: string;
  investor_name: string;
  location: string;
  total_capital: number;
  capital_unit: string;
  project_group: string;
  status: string;
  start_date: string;
  expected_completion_date: string;
  duration_months: number;
  remaining_months: number;
  sector: string;
  source: string;
  packages_count?: number;
  packages?: any[];
}

export interface InfrastructurePackage {
  id: string;
  notify_no: string;
  project_code: string;
  name: string;
  investor_name: string;
  price: number;
  winning_price: number;
  field: string;
  winning_contractor: string;
  bid_close_date: string;
  award_date: string;
  status_for_notify: string;
}

export interface MacroForecastData {
  forecast: {
    macro_interest_rate_trend: string;
    trend_description: string;
    system_liquidity_status: string;
    pivot_quarter_for_rate_cut: string;
    current_pressure_quarter: string;
    net_capital_requirement_ratio: number;
    absorption_matrix?: any[];
  };
  kpis: {
    total_projects: number;
    total_capital: number;
    status_counts: Record<string, number>;
    group_counts: Record<string, number>;
  };
}
