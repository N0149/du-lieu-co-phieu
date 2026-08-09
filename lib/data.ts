export type Stock = {
  ticker: string
  name: string
  exchange: string
  sector: string
  marketPrice: number // nghìn đồng / cổ phiếu
  rnav: number // định giá RNAV, nghìn đồng
  forwardPE: number
  dividendYield: number // %
  marketCap: number // tỷ đồng
  status: string
  updated: boolean
}

export const SECTORS = [
  'Tất cả ngành',
  'Bất động sản KCN',
  'Dược phẩm',
  'Điện & Tiện ích',
  'Bất động sản',
  'Vật liệu xây dựng',
  'Logistics & Cảng',
] as const

export const stocks: Stock[] = [
  {
    ticker: 'DAN',
    name: 'Dược Danapha',
    exchange: 'UPCOM',
    sector: 'Dược phẩm',
    marketPrice: 42.5,
    rnav: 118.0,
    forwardPE: 6.2,
    dividendYield: 9.4,
    marketCap: 1360,
    status: 'Đã cập nhật BCTC Q1/2026',
    updated: true,
  },
  {
    ticker: 'LHG',
    name: 'Long Hậu',
    exchange: 'HOSE',
    sector: 'Bất động sản KCN',
    marketPrice: 34.2,
    rnav: 92.5,
    forwardPE: 5.4,
    dividendYield: 8.8,
    marketCap: 1720,
    status: 'Đã cập nhật BCTC Q1/2026',
    updated: true,
  },
  {
    ticker: 'SNZ',
    name: 'Sonadezi',
    exchange: 'UPCOM',
    sector: 'Bất động sản KCN',
    marketPrice: 31.8,
    rnav: 78.4,
    forwardPE: 6.8,
    dividendYield: 8.9,
    marketCap: 12400,
    status: 'Đã cập nhật BCTC Q1/2026',
    updated: true,
  },
  {
    ticker: 'VNF',
    name: 'Vinafreight',
    exchange: 'HNX',
    sector: 'Logistics & Cảng',
    marketPrice: 28.6,
    rnav: 64.0,
    forwardPE: 5.9,
    dividendYield: 10.2,
    marketCap: 880,
    status: 'Đã cập nhật BCTC Q1/2026',
    updated: true,
  },
  {
    ticker: 'DC4',
    name: 'DIC Holdings',
    exchange: 'HOSE',
    sector: 'Vật liệu xây dựng',
    marketPrice: 12.4,
    rnav: 31.2,
    forwardPE: 6.5,
    dividendYield: 8.7,
    marketCap: 640,
    status: 'Đã cập nhật BCTC Q1/2026',
    updated: true,
  },
  {
    ticker: 'NT2',
    name: 'Điện lực Dầu khí Nhơn Trạch 2',
    exchange: 'HOSE',
    sector: 'Điện & Tiện ích',
    marketPrice: 19.8,
    rnav: 42.6,
    forwardPE: 6.9,
    dividendYield: 11.5,
    marketCap: 5700,
    status: 'Đã cập nhật BCTC Q1/2026',
    updated: true,
  },
  {
    ticker: 'IDC',
    name: 'IDICO',
    exchange: 'HNX',
    sector: 'Bất động sản KCN',
    marketPrice: 48.9,
    rnav: 96.5,
    forwardPE: 6.4,
    dividendYield: 8.7,
    marketCap: 16100,
    status: 'Đã cập nhật BCTC Q4/2025',
    updated: false,
  },
  {
    ticker: 'BCM',
    name: 'Becamex IDC',
    exchange: 'HOSE',
    sector: 'Bất động sản KCN',
    marketPrice: 58.3,
    rnav: 132.0,
    forwardPE: 6.7,
    dividendYield: 8.9,
    marketCap: 60300,
    status: 'Đã cập nhật BCTC Q1/2026',
    updated: true,
  },
  {
    ticker: 'DPR',
    name: 'Cao su Đồng Phú',
    exchange: 'HOSE',
    sector: 'Bất động sản KCN',
    marketPrice: 39.5,
    rnav: 88.2,
    forwardPE: 6.1,
    dividendYield: 9.1,
    marketCap: 4300,
    status: 'Đã cập nhật BCTC Q1/2026',
    updated: true,
  },
  {
    ticker: 'PPC',
    name: 'Nhiệt điện Phả Lại',
    exchange: 'HOSE',
    sector: 'Điện & Tiện ích',
    marketPrice: 13.9,
    rnav: 27.4,
    forwardPE: 6.6,
    dividendYield: 9.8,
    marketCap: 4450,
    status: 'Đã cập nhật BCTC Q1/2026',
    updated: true,
  },
  {
    ticker: 'TIP',
    name: 'Phát triển KCN Tín Nghĩa',
    exchange: 'HOSE',
    sector: 'Bất động sản KCN',
    marketPrice: 22.1,
    rnav: 51.8,
    forwardPE: 5.7,
    dividendYield: 8.8,
    marketCap: 690,
    status: 'Đã cập nhật BCTC Q1/2026',
    updated: true,
  },
  {
    ticker: 'HND',
    name: 'Nhiệt điện Hải Phòng',
    exchange: 'UPCOM',
    sector: 'Điện & Tiện ích',
    marketPrice: 15.6,
    rnav: 30.9,
    forwardPE: 6.3,
    dividendYield: 10.6,
    marketCap: 7800,
    status: 'Đã cập nhật BCTC Q1/2026',
    updated: true,
  },
  {
    ticker: 'SZC',
    name: 'Sonadezi Châu Đức',
    exchange: 'HOSE',
    sector: 'Bất động sản KCN',
    marketPrice: 36.4,
    rnav: 61.2,
    forwardPE: 6.9,
    dividendYield: 6.4,
    marketCap: 4380,
    status: 'Đã cập nhật BCTC Q4/2025',
    updated: false,
  },
  {
    ticker: 'KBC',
    name: 'Đô thị Kinh Bắc',
    exchange: 'HOSE',
    sector: 'Bất động sản KCN',
    marketPrice: 26.8,
    rnav: 55.0,
    forwardPE: 8.4,
    dividendYield: 4.2,
    marketCap: 20600,
    status: 'Đã cập nhật BCTC Q4/2025',
    updated: false,
  },
]

export function upside(s: Stock): number {
  return ((s.rnav - s.marketPrice) / s.marketPrice) * 100
}

export function priceToRnav(s: Stock): number {
  return s.marketPrice / s.rnav
}

export function marginOfSafety(s: Stock): number {
  return ((s.rnav - s.marketPrice) / s.rnav) * 100
}

export function getStock(ticker: string): Stock | undefined {
  return stocks.find((s) => s.ticker.toLowerCase() === ticker.toLowerCase())
}

// ---- Deep-dive data ----

export type AssetRow = {
  name: string
  bookValue: number // tỷ đồng
  marketValue: number // tỷ đồng
  note: string
}

export type ForecastRow = {
  metric: string
  y2025: string
  y2026: string
  y2027: string
}

export type DeepDive = {
  thesis: string[]
  moat: string[]
  management: string[]
  assets: AssetRow[]
  rnavTotal: { equity: number; shares: number } // vốn CSH điều chỉnh (tỷ), số cổ phiếu (triệu)
  forecast: ForecastRow[]
  peForecast: ForecastRow[]
  risks: string[]
  buyZone: { deepValue: number; accumulate: number; fair: number }
}

const deepDives: Record<string, DeepDive> = {
  DAN: {
    thesis: [
      'Danapha sở hữu quỹ đất vàng tại trung tâm Đà Nẵng với giá trị thị trường vượt xa giá trị sổ sách, tạo biên an toàn RNAV lớn.',
      'Mảng dược Đông dược & tân dược duy trì biên lợi nhuận gộp trên 45%, dòng tiền hoạt động ổn định tài trợ cổ tức tiền mặt đều đặn.',
      'Kỳ vọng tái định giá khi dự án Danapha Tower đi vào khai thác thương mại, mở khóa giá trị bất động sản ngầm trong 2-3 năm tới.',
      'Định giá hiện tại Giá/RNAV chỉ 0,36 lần — dư địa tăng giá trên 170% nếu thị trường phản ánh đúng giá trị tài sản.',
    ],
    moat: [
      'Thương hiệu dược phẩm lâu đời (thành lập 1965), hệ thống phân phối phủ khắp miền Trung.',
      'Danh mục sản phẩm đăng ký độc quyền, rào cản pháp lý và chi phí chuyển đổi cao với hệ thống bệnh viện.',
      'Quỹ đất lịch sử giá vốn thấp tại vị trí không thể tái tạo — lợi thế cạnh tranh bền vững.',
    ],
    management: [
      'Ban lãnh đạo nắm giữ trên 18% cổ phần, lợi ích gắn chặt với cổ đông thiểu số.',
      'Lịch sử chi trả cổ tức tiền mặt liên tục 10 năm, tỷ lệ chi trả 55-65% lợi nhuận.',
      'Chính sách phân bổ vốn thận trọng, không pha loãng cổ phần, tỷ lệ nợ vay/vốn CSH dưới 0,3 lần.',
    ],
    assets: [
      {
        name: 'Quỹ đất KCN & nhà xưởng',
        bookValue: 210,
        marketValue: 680,
        note: 'Định giá lại theo giá thị trường 2025',
      },
      {
        name: 'Danapha Tower (CIP)',
        bookValue: 320,
        marketValue: 720,
        note: 'Chi phí xây dựng dở dang, dự án TTTM',
      },
      {
        name: 'Bất động sản trung tâm Đà Nẵng',
        bookValue: 95,
        marketValue: 540,
        note: 'Đất vàng đường Trưng Nữ Vương',
      },
      {
        name: 'Đầu tư tài chính dài hạn',
        bookValue: 140,
        marketValue: 185,
        note: 'Danh mục cổ phiếu niêm yết',
      },
      {
        name: 'Tiền & tương đương tiền',
        bookValue: 260,
        marketValue: 260,
        note: 'Tiền mặt ròng sau trừ nợ vay',
      },
    ],
    rnavTotal: { equity: 3775, shares: 32 },
    forecast: [
      { metric: 'Doanh thu thuần', y2025: '1.240', y2026: '1.410', y2027: '1.620' },
      { metric: 'Lợi nhuận gộp', y2025: '558', y2026: '640', y2027: '745' },
      { metric: 'LNST', y2025: '198', y2026: '232', y2027: '278' },
      { metric: 'EPS (đồng)', y2025: '6.190', y2026: '7.250', y2027: '8.690' },
      { metric: 'Cổ tức tiền mặt (đồng)', y2025: '4.000', y2026: '4.500', y2027: '5.000' },
    ],
    peForecast: [
      { metric: 'P/E tương lai (x)', y2025: '6,9', y2026: '5,9', y2027: '4,9' },
      { metric: 'P/B (x)', y2025: '0,9', y2026: '0,8', y2027: '0,7' },
      { metric: 'Tỷ suất cổ tức (%)', y2025: '9,4', y2026: '10,6', y2027: '11,8' },
      { metric: 'ROE (%)', y2025: '13,2', y2026: '14,8', y2027: '16,1' },
    ],
    risks: [
      'Tính thanh khoản cổ phiếu thấp trên sàn UPCOM, chênh lệch giá mua-bán cao.',
      'Tiến độ pháp lý và khai thác Danapha Tower có thể chậm hơn dự kiến.',
      'Rủi ro chính sách giá thuốc và đấu thầu bệnh viện ảnh hưởng biên lợi nhuận.',
    ],
    buyZone: { deepValue: 38, accumulate: 48, fair: 118 },
  },
}

const defaultDeepDive: DeepDive = {
  thesis: [
    'Doanh nghiệp giao dịch dưới giá trị tài sản ròng điều chỉnh (RNAV), tạo biên an toàn hấp dẫn cho nhà đầu tư giá trị.',
    'Dòng tiền hoạt động ổn định hỗ trợ chính sách cổ tức tiền mặt cao hơn mặt bằng ngành.',
    'Kỳ vọng tái định giá khi các tài sản ngầm được thị trường ghi nhận đúng giá trị trong 2-3 năm tới.',
  ],
  moat: [
    'Vị thế ngành vững chắc với thị phần ổn định và rào cản gia nhập cao.',
    'Tài sản cốt lõi khó tái tạo tạo lợi thế cạnh tranh dài hạn.',
  ],
  management: [
    'Ban lãnh đạo có tỷ lệ sở hữu đáng kể, lợi ích gắn với cổ đông.',
    'Lịch sử phân bổ vốn kỷ luật và chi trả cổ tức đều đặn.',
  ],
  assets: [
    { name: 'Quỹ đất & bất động sản', bookValue: 180, marketValue: 520, note: 'Định giá lại theo thị trường' },
    { name: 'Xây dựng cơ bản dở dang (CIP)', bookValue: 240, marketValue: 430, note: 'Dự án đang triển khai' },
    { name: 'Đầu tư tài chính', bookValue: 90, marketValue: 130, note: 'Danh mục dài hạn' },
    { name: 'Tiền ròng', bookValue: 160, marketValue: 160, note: 'Sau trừ nợ vay' },
  ],
  rnavTotal: { equity: 1240, shares: 40 },
  forecast: [
    { metric: 'Doanh thu thuần', y2025: '2.100', y2026: '2.360', y2027: '2.640' },
    { metric: 'LNST', y2025: '320', y2026: '380', y2027: '445' },
    { metric: 'EPS (đồng)', y2025: '5.100', y2026: '6.050', y2027: '7.100' },
    { metric: 'Cổ tức tiền mặt (đồng)', y2025: '3.000', y2026: '3.400', y2027: '3.800' },
  ],
  peForecast: [
    { metric: 'P/E tương lai (x)', y2025: '6,8', y2026: '5,8', y2027: '4,9' },
    { metric: 'P/B (x)', y2025: '1,0', y2026: '0,9', y2027: '0,8' },
    { metric: 'Tỷ suất cổ tức (%)', y2025: '8,9', y2026: '9,8', y2027: '11,0' },
    { metric: 'ROE (%)', y2025: '14,0', y2026: '15,2', y2027: '16,4' },
  ],
  risks: [
    'Thanh khoản cổ phiếu ở mức trung bình, biến động giá ngắn hạn.',
    'Tiến độ triển khai các dự án tài sản ngầm phụ thuộc pháp lý.',
    'Rủi ro chu kỳ ngành và biến động vĩ mô ảnh hưởng dòng tiền.',
  ],
  buyZone: { deepValue: 0, accumulate: 0, fair: 0 },
}

export function getDeepDive(s: Stock): DeepDive {
  const dd = deepDives[s.ticker]
  if (dd) return dd
  // scale default buy zone to the stock's own prices
  return {
    ...defaultDeepDive,
    buyZone: {
      deepValue: Math.round(s.marketPrice * 0.9 * 10) / 10,
      accumulate: Math.round(s.marketPrice * 1.15 * 10) / 10,
      fair: s.rnav,
    },
  }
}
