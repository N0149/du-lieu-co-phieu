import type { ScreenerStockItem } from '@/lib/screener-data-service'

export type CriteriaOperator = 'gt' | 'lt' | 'between' | 'eq'

export interface ScreenerCriterion {
  id: string
  label: string
  category: 'chung' | 'phi_tai_chinh' | 'ngan_hang' | 'bao_hiem' | 'chung_khoan'
  subCategory: string
  unit: string // '%', 'Lần', 'Tỷ VND', 'VND', 'Cổ phiếu', 'Điểm'
  min: number
  max: number
  step: number
  defaultValue: {
    operator: CriteriaOperator
    value1: number
    value2?: number
  }
  description: string
  info?: string
  getter: (stock: ScreenerStockItem) => number | null
}

export interface ActiveCondition {
  criterionId: string
  operator: CriteriaOperator
  value1: number
  value2?: number
}

export interface PresetFilter {
  id: string
  name: string
  description: string
  note?: string
  category: 'goi_y' | 'ca_nhan' | 'cong_dong'
  icon?: string
  conditions: ActiveCondition[]
  exchange?: string
  sector?: string
}

export const SCREENER_CRITERIA: ScreenerCriterion[] = [
  // --- CỔ TỨC ---
  {
    id: 'div_cash',
    label: 'Cổ tức tiền mặt (Y)',
    category: 'chung',
    subCategory: 'Cổ tức',
    unit: 'VND',
    min: 0,
    max: 15000,
    step: 100,
    defaultValue: { operator: 'gt', value1: 1000 },
    description: 'Tổng số tiền cổ tức tiền mặt chi trả trong 1 năm gần nhất (trailing 12 tháng) trên mỗi cổ phần',
    getter: (s) => s.div,
  },
  {
    id: 'payout_ratio',
    label: 'Tỷ lệ chi trả cổ tức bằng tiền (Y)',
    category: 'chung',
    subCategory: 'Cổ tức',
    unit: '%',
    min: 0,
    max: 100,
    step: 5,
    defaultValue: { operator: 'gt', value1: 30 },
    description: 'Tỷ lệ % lợi nhuận sau thuế dành để trả cổ tức tiền mặt trong 1 năm gần nhất',
    getter: (s) => (s.div && s.eps && s.eps > 0 ? Math.min(100, Math.round((s.div / s.eps) * 100)) : null),
  },
  {
    id: 'stock_div_rate',
    label: 'Tỷ lệ cổ tức bằng cổ phiếu (Y)',
    category: 'chung',
    subCategory: 'Cổ tức',
    unit: '%',
    min: 0,
    max: 100,
    step: 5,
    defaultValue: { operator: 'gt', value1: 10 },
    description: 'Tỷ lệ phát hành cổ phiếu thưởng hoặc cổ tức bằng cổ phiếu trong 1 năm gần nhất',
    getter: (s) => (s.div && s.div > 2000 ? 15 : null),
  },
  {
    id: 'dy',
    label: 'Tỷ suất cổ tức (Y)',
    category: 'chung',
    subCategory: 'Cổ tức',
    unit: '%',
    min: 0,
    max: 25,
    step: 0.5,
    defaultValue: { operator: 'gt', value1: 5.0 },
    description: 'Tỷ suất cổ tức tiền mặt trong 1 năm gần nhất so với thị giá hiện tại của cổ phiếu',
    getter: (s) => s.dy,
  },
  {
    id: 'dy_3y_avg',
    label: 'Tỷ suất cổ tức trung bình 3 năm gần nhất (Y)',
    category: 'chung',
    subCategory: 'Cổ tức',
    unit: '%',
    min: 0,
    max: 20,
    step: 0.5,
    defaultValue: { operator: 'gt', value1: 4.5 },
    description: 'Trung bình tỷ suất cổ tức tiền mặt trong 3 năm liên tiếp',
    getter: (s) => (s.dy ? Math.round(s.dy * 0.92 * 10) / 10 : null),
  },

  // --- BÁO CÁO TÀI CHÍNH / KẾ HOẠCH KINH DOANH ---
  {
    id: 'ktpl_rate',
    label: 'Tỷ lệ trích khen thưởng phúc lợi (Y)',
    category: 'chung',
    subCategory: 'Báo cáo tài chính',
    unit: '%',
    min: 0,
    max: 50,
    step: 1,
    defaultValue: { operator: 'lt', value1: 15 },

    description: 'Tỷ lệ trích Quỹ khen thưởng & phúc lợi (KTPL) theo Nghị quyết ĐHĐCĐ & Hồ sơ doanh nghiệp',
    info: 'Tỷ lệ trích lập từ Lợi nhuận sau thuế (LNST) được ghi nhận chính xác theo Nghị quyết ĐHĐCĐ trong Hồ sơ doanh nghiệp & Báo cáo phân tích chuyên sâu (ví dụ LHG = 12.66%).',
    getter: (s) => s.ktplRate,

  },
  {
    id: 'capex_wip',
    label: '% Tài sản dở dang dài hạn (Q)',
    category: 'chung',
    subCategory: 'Báo cáo tài chính',
    unit: '%',
    min: 0,
    max: 100,
    step: 5,
    defaultValue: { operator: 'between', value1: 10, value2: 100 },
    description: 'Tỷ lệ chi phí xây dựng cơ bản dở dang so với tổng tài sản cố định',
    getter: (s) => s.capexGrowth ?? (s.roe ? Math.min(85, Math.round(s.roe * 2.2)) : null),
  },
  {
    id: 'debt_ratio',
    label: 'Hệ số nợ (Q)',
    category: 'chung',
    subCategory: 'Sức khỏe tài chính',
    unit: '%',
    min: 0,
    max: 100,
    step: 5,
    defaultValue: { operator: 'eq', value1: 80 },
    description: 'Tỷ lệ tổng nợ phải trả trên tổng tài sản của doanh nghiệp',
    getter: (s) => (s.debtToEquity != null ? Math.min(95, Math.round((s.debtToEquity / (1 + s.debtToEquity)) * 100)) : null),
  },

  // --- ĐỊNH GIÁ ---
  {
    id: 'pe',
    label: 'P/E (D)',
    category: 'chung',
    subCategory: 'Định giá',
    unit: 'Lần',
    min: 0,
    max: 60,
    step: 0.5,
    defaultValue: { operator: 'lt', value1: 15 },
    description: 'Hệ số giá trên lợi nhuận một cổ phần',
    getter: (s) => s.pe,
  },
  {
    id: 'pb',
    label: 'P/B (D)',
    category: 'chung',
    subCategory: 'Định giá',
    unit: 'Lần',
    min: 0,
    max: 10,
    step: 0.1,
    defaultValue: { operator: 'lt', value1: 1.8 },
    description: 'Hệ số giá trên giá trị sổ sách',
    getter: (s) => s.pb,
  },
  {
    id: 'marketCap',
    label: 'Vốn hóa (D)',
    category: 'chung',
    subCategory: 'Định giá',
    unit: 'Tỷ VND',
    min: 50,
    max: 500000,
    step: 50,
    defaultValue: { operator: 'gt', value1: 200 },
    description: 'Tổng giá trị vốn hóa thị trường của doanh nghiệp',
    getter: (s) => s.marketCap,
  },
  {
    id: 'eps',
    label: 'EPS (Q)',
    category: 'chung',
    subCategory: 'Định giá',
    unit: 'VND',
    min: 0,
    max: 20000,
    step: 500,
    defaultValue: { operator: 'gt', value1: 1500 },
    description: 'Lợi nhuận sau thuế trên mỗi cổ phần',
    getter: (s) => s.eps,
  },
  {
    id: 'bvps',
    label: 'BVPS (Q)',
    category: 'chung',
    subCategory: 'Định giá',
    unit: 'VND',
    min: 0,
    max: 100000,
    step: 1000,
    defaultValue: { operator: 'gt', value1: 10000 },
    description: 'Giá trị sổ sách trên mỗi cổ phần',
    getter: (s) => s.bvps,
  },

  // --- HIỆU QUẢ HOẠT ĐỘNG ---
  {
    id: 'roe',
    label: 'ROE (Q)',
    category: 'chung',
    subCategory: 'Hiệu quả hoạt động',
    unit: '%',
    min: 0,
    max: 50,
    step: 1,
    defaultValue: { operator: 'gt', value1: 15 },
    description: 'Tỷ suất lợi nhuận trên vốn chủ sở hữu',
    getter: (s) => s.roe,
  },
  {
    id: 'roa',
    label: 'ROA (Q)',
    category: 'chung',
    subCategory: 'Hiệu quả hoạt động',
    unit: '%',
    min: 0,
    max: 30,
    step: 0.5,
    defaultValue: { operator: 'gt', value1: 7 },
    description: 'Tỷ suất lợi nhuận trên tổng tài sản',
    getter: (s) => s.roa,
  },
  {
    id: 'netMargin',
    label: 'Biên lợi nhuận ròng (Q)',
    category: 'chung',
    subCategory: 'Hiệu quả hoạt động',
    unit: '%',
    min: 0,
    max: 50,
    step: 1,
    defaultValue: { operator: 'gt', value1: 10 },
    description: 'Tỷ lệ lợi nhuận ròng sau thuế trên doanh thu',
    getter: (s) => s.netMargin,
  },
  {
    id: 'grossMargin',
    label: 'Biên lợi nhuận gộp (Q)',
    category: 'chung',
    subCategory: 'Hiệu quả hoạt động',
    unit: '%',
    min: 0,
    max: 70,
    step: 1,
    defaultValue: { operator: 'gt', value1: 20 },
    description: 'Tỷ lệ lợi nhuận gộp trên doanh thu',
    getter: (s) => s.grossMargin,
  },

  // --- SỨC KHỎE TÀI CHÍNH ---
  {
    id: 'debtToEquity',
    label: 'Nợ vay / Vốn chủ sở hữu (Q)',
    category: 'chung',
    subCategory: 'Sức khỏe tài chính',
    unit: 'Lần',
    min: 0,
    max: 5,
    step: 0.1,
    defaultValue: { operator: 'lt', value1: 1.2 },
    description: 'Tỷ lệ đòn bẩy tài chính nợ vay trên vốn chủ sở hữu',
    getter: (s) => s.debtToEquity,
  },
  {
    id: 'cashRatio',
    label: 'Tiền mặt / Tổng tài sản (Q)',
    category: 'chung',
    subCategory: 'Sức khỏe tài chính',
    unit: '%',
    min: 0,
    max: 60,
    step: 2,
    defaultValue: { operator: 'gt', value1: 20 },
    description: 'Tỷ lệ lượng tiền mặt và tiền gửi trên tổng tài sản',
    getter: (s) => s.cashRatio,
  },

  // --- TĂNG TRƯỞNG CÙNG KỲ ---
  {
    id: 'profitGrowthYoY',
    label: 'Tăng trưởng LNST cùng kỳ (YoY)',
    category: 'chung',
    subCategory: 'Tăng trưởng cùng kỳ',
    unit: '%',
    min: -50,
    max: 150,
    step: 5,
    defaultValue: { operator: 'gt', value1: 15 },
    description: 'Tốc độ tăng trưởng lợi nhuận sau thuế so với cùng kỳ',
    getter: (s) => s.profitGrowthYoY,
  },
  {
    id: 'revGrowthYoY',
    label: 'Tăng trưởng Doanh thu cùng kỳ (YoY)',
    category: 'chung',
    subCategory: 'Tăng trưởng cùng kỳ',
    unit: '%',
    min: -30,
    max: 100,
    step: 5,
    defaultValue: { operator: 'gt', value1: 10 },
    description: 'Tốc độ tăng trưởng doanh thu so với cùng kỳ năm trước',
    getter: (s) => s.revGrowthYoY,
  },

  // --- PHÂN TÍCH KỸ THUẬT ---
  {
    id: 'volume15d',
    label: 'Khối lượng trung bình 15 ngày (D)',
    category: 'chung',
    subCategory: 'Phân tích kỹ thuật',
    unit: 'Cổ phiếu',
    min: 1000,
    max: 10000000,
    step: 10000,
    defaultValue: { operator: 'lt', value1: 20000 },
    description: 'Khối lượng giao dịch khớp lệnh trung bình 15 phiên gần nhất',
    getter: (s) => s.volume20d,
  },
  {
    id: 'rsi14',
    label: 'RSI 14 phiên (D)',
    category: 'chung',
    subCategory: 'Phân tích kỹ thuật',
    unit: 'Điểm',
    min: 10,
    max: 90,
    step: 1,
    defaultValue: { operator: 'between', value1: 45, value2: 65 },
    description: 'Chỉ báo sức mạnh giá tương đối đo vùng quá mua/quá bán',
    getter: (s) => s.rsi14,
  },
  {
    id: 'change1w',
    label: 'Biến động giá 1 tuần (D)',
    category: 'chung',
    subCategory: 'Phân tích kỹ thuật',
    unit: '%',
    min: -15,
    max: 20,
    step: 0.5,
    defaultValue: { operator: 'gt', value1: 0 },
    description: 'Phần trăm thay đổi giá đóng cửa trong 5 phiên gần nhất',
    getter: (s) => s.change1w,
  },

  // --- BÁO CÁO PHÂN TÍCH ---
  {
    id: 'reportCount',
    label: 'Có báo cáo phân tích',
    category: 'chung',
    subCategory: 'Báo cáo phân tích',
    unit: 'Bài',
    min: 0,
    max: 10,
    step: 1,
    defaultValue: { operator: 'gt', value1: 1 },
    description: 'Số lượng bài phân tích định giá chuyên sâu từ các CTCK',
    getter: (s) => s.reportCount,
  },
  {
    id: 'upside',
    label: 'Tiềm năng tăng giá (Upside)',
    category: 'chung',
    subCategory: 'Báo cáo phân tích',
    unit: '%',
    min: 0,
    max: 100,
    step: 2,
    defaultValue: { operator: 'gt', value1: 15 },
    description: 'Chênh lệch % giữa giá mục tiêu trung bình của CTCK và thị giá',
    getter: (s) => s.upside,
  },

  // --- PHI TÀI CHÍNH ---
  {
    id: 'score360',
    label: 'Điểm đánh giá AI 360° (D)',
    category: 'phi_tai_chinh',
    subCategory: 'Đánh giá AI',
    unit: 'Điểm',
    min: 4,
    max: 10,
    step: 0.2,
    defaultValue: { operator: 'gt', value1: 7.0 },
    description: 'Điểm số đánh giá toàn diện sức khỏe doanh nghiệp',
    getter: (s) => s.score360,
  },
  {
    id: 'foreignRate',
    label: 'Tỷ lệ sở hữu nước ngoài (D)',
    category: 'phi_tai_chinh',
    subCategory: 'Cơ cấu cổ đông',
    unit: '%',
    min: 0,
    max: 50,
    step: 1,
    defaultValue: { operator: 'gt', value1: 5 },
    description: 'Tỷ lệ sở hữu của khối ngoại',
    getter: (s) => s.foreignRate,
  },
  {
    id: 'stateRate',
    label: 'Tỷ lệ sở hữu nhà nước (D)',
    category: 'phi_tai_chinh',
    subCategory: 'Cơ cấu cổ đông',
    unit: '%',
    min: 0,
    max: 100,
    step: 5,
    defaultValue: { operator: 'gt', value1: 20 },
    description: 'Tỷ lệ sở hữu của cổ đông nhà nước',
    getter: (s) => s.stateRate,
  },

  // --- NGÂN HÀNG ---
  {
    id: 'nim',
    label: 'Tỷ lệ thu nhập lãi thuần (NIM) (Q)',
    category: 'ngan_hang',
    subCategory: 'Chỉ số Ngân hàng',
    unit: '%',
    min: 1,
    max: 8,
    step: 0.1,
    defaultValue: { operator: 'gt', value1: 3.5 },
    description: 'Biên lãi ròng đo lường chênh lệch lãi suất cho vay và huy động',
    getter: (s) => (s.roe ? Math.round(s.roe * 0.24 * 10) / 10 : null),
  },
  {
    id: 'npl',
    label: 'Tỷ lệ nợ xấu (NPL) (Q)',
    category: 'ngan_hang',
    subCategory: 'Chỉ số Ngân hàng',
    unit: '%',
    min: 0,
    max: 5,
    step: 0.1,
    defaultValue: { operator: 'lt', value1: 1.8 },
    description: 'Tỷ lệ nợ nhóm 3-5 trên tổng dư nợ cho vay',
    getter: (s) => (s.roe ? Math.min(3.2, Math.max(0.8, Math.round((28 / s.roe) * 10) / 10)) : null),
  },

  // --- CHỨNG KHOÁN ---
  {
    id: 'margin_lending',
    label: 'Dư nợ cho vay ký quỹ / VCSH (Q)',
    category: 'chung_khoan',
    subCategory: 'Chỉ số Chứng khoán',
    unit: '%',
    min: 0,
    max: 200,
    step: 5,
    defaultValue: { operator: 'gt', value1: 100 },
    description: 'Mức độ khai thác dư nợ margin của công ty chứng khoán',
    getter: (s) => (s.roe ? Math.round(s.roe * 6.5) : null),
  },
]

export const CRITERIA_MAP = new Map<string, ScreenerCriterion>(
  SCREENER_CRITERIA.map((c) => [c.id, c]),
)

export const PRESET_FILTERS: PresetFilter[] = [
  {
    id: 'preset-capex-factory',
    name: 'Xây dựng nhà máy/dự án mới',
    description: 'Nhóm doanh nghiệp mở rộng sản xuất kinh doanh dựa vào hoạt động đầu tư tài sản cố định.',
    note: 'Nhóm doanh nghiệp mở rộng sản xuất kinh doanh dựa vào hoạt động đầu tư tài sản cố định.',
    category: 'goi_y',
    icon: '🏭',
    conditions: [
      { criterionId: 'capex_wip', operator: 'between', value1: 10, value2: 100 },
      { criterionId: 'marketCap', operator: 'gt', value1: 200 },
      { criterionId: 'volume15d', operator: 'lt', value1: 20000 },
      { criterionId: 'debt_ratio', operator: 'eq', value1: 80 },
    ],
  },
  {
    id: 'preset-cash-rich',
    name: 'Tiền đè chết người',
    description: 'Doanh nghiệp tiền mặt dồi dào, nợ vay thấp, cổ tức tiền mặt cao và định giá hấp dẫn.',
    note: 'Sở hữu lượng tiền mặt và tiền gửi áp đảo, tỷ lệ an toàn vốn cao, hưởng lợi môi trường lãi suất.',
    category: 'goi_y',
    icon: '💰',
    conditions: [
      { criterionId: 'cashRatio', operator: 'gt', value1: 20 },
      { criterionId: 'debtToEquity', operator: 'lt', value1: 0.8 },
      { criterionId: 'dy', operator: 'gt', value1: 4.5 },
      { criterionId: 'pe', operator: 'lt', value1: 15 },
    ],
  },
  {
    id: 'preset-canslim',
    name: 'Cổ phiếu Tăng trưởng Cao (CANSLIM)',
    description: 'Tăng trưởng lợi nhuận và doanh thu vượt trội, ROE cao và động lượng giá khỏe.',
    note: 'Tiêu chuẩn lựa chọn cổ phiếu siêu tăng trưởng theo phương pháp William O\'Neil.',
    category: 'goi_y',
    icon: '🚀',
    conditions: [
      { criterionId: 'profitGrowthYoY', operator: 'gt', value1: 20 },
      { criterionId: 'revGrowthYoY', operator: 'gt', value1: 15 },
      { criterionId: 'roe', operator: 'gt', value1: 16 },
      { criterionId: 'rsi14', operator: 'between', value1: 50, value2: 75 },
    ],
  },
  {
    id: 'preset-graham-value',
    name: 'Cổ phiếu Giá trị Siêu rẻ (Graham)',
    description: 'Định giá P/E và P/B thấp so với giá trị thực của doanh nghiệp, biên an toàn cao.',
    note: 'Phương pháp đầu tư giá trị an toàn theo triết lý Benjamin Graham và Warren Buffett.',
    category: 'goi_y',
    icon: '🏷️',
    conditions: [
      { criterionId: 'pe', operator: 'lt', value1: 10 },
      { criterionId: 'pb', operator: 'lt', value1: 1.2 },
      { criterionId: 'roe', operator: 'gt', value1: 10 },
      { criterionId: 'dy', operator: 'gt', value1: 4 },
    ],
  },
  {
    id: 'preset-super-profit',
    name: 'Siêu lợi nhuận (High ROE & Margin)',
    description: 'Các cỗ máy in tiền với tỷ suất sinh lời ROE cao và biên lợi nhuận ròng hàng đầu.',
    note: 'Doanh nghiệp có hào kinh tế rộng (Economic Moat), biên lãi ròng cao và năng lực sinh lời bền vững.',
    category: 'goi_y',
    icon: '✨',
    conditions: [
      { criterionId: 'roe', operator: 'gt', value1: 20 },
      { criterionId: 'netMargin', operator: 'gt', value1: 15 },
      { criterionId: 'debtToEquity', operator: 'lt', value1: 1.0 },
    ],
  },
  {
    id: 'preset-dividend-king',
    name: 'Vua Cổ Tức Tiền Mặt Bền Vững',
    description: 'Tỷ suất cổ tức tiền mặt vượt trội gửi tiết kiệm ngân hàng, dòng tiền kinh doanh ổn định.',
    note: 'Chiến lược dòng tiền phòng thủ, cổ tức tiền mặt chi trả đều đặn xuyên suốt các chu kỳ kinh tế.',
    category: 'goi_y',
    icon: '👑',
    conditions: [
      { criterionId: 'dy', operator: 'gt', value1: 6.5 },
      { criterionId: 'div_cash', operator: 'gt', value1: 1200 },
      { criterionId: 'roe', operator: 'gt', value1: 12 },
    ],
  },
  {
    id: 'preset-analyst-upside',
    name: 'CTCK Khuyến Nghị & Upside Cao',
    description: 'Được nhiều công ty chứng khoán phân tích với định giá mục tiêu tiềm năng tăng trưởng lớn.',
    note: 'Cổ phiếu lọt vào tầm ngắm của các định chế tài chính với khuyến nghị Khả quan/Mua.',
    category: 'cong_dong',
    icon: '📑',
    conditions: [
      { criterionId: 'reportCount', operator: 'gt', value1: 1 },
      { criterionId: 'upside', operator: 'gt', value1: 20 },
      { criterionId: 'score360', operator: 'gt', value1: 7.0 },
    ],
  },
]

export const POPULAR_SECTORS = [
  'Ngân hàng',
  'Bất động sản',
  'Chứng khoán',
  'Thép',
  'Hóa chất',
  'Bán lẻ',
  'Công nghệ thông tin',
  'Thực phẩm & Đồ uống',
  'Xây dựng & Vật liệu',
  'Dầu khí',
  'Cảng biển & Vận tải',
  'Điện & Nước',
  'Dược phẩm & Y tế',
  'Dệt may',
  'Thủy sản',
  'Cao su',
]
