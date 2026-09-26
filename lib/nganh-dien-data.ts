export interface PowerPlantInfo {
  name: string;
  capacityMW: number;
  location: string;
  type: 'Thủy điện' | 'Nhiệt điện Than' | 'Tua bin khí' | 'Điện Mặt Trời' | 'Điện Gió' | 'Nhiệt điện Dầu';
  basinOrFuel: string; // Lưu vực sông hoặc nguồn nhiên liệu
  commercialYear?: number;
  pricingType?: string; // Cơ chế giá áp dụng (ACT, PPA + CGM, FiT...)
  estSellingPrice?: number; // Giá bán điện ước tính bình quân (đ/kWh)
  priceNote?: string; // Ghi chú đặc điểm định giá & trạng thái khấu hao
}

export interface PowerStockIntel {
  ticker: string;
  name: string;
  exchange: 'HOSE' | 'HNX' | 'UPCoM';
  category: 'Thủy điện lớn' | 'Thủy điện vừa & nhỏ' | 'Nhiệt điện Than' | 'Nhiệt điện Khí/Dầu' | 'Năng lượng tái tạo & Đa ngành';
  avatarColor: string;
  marketCap: number; // Tỷ VNĐ
  pe: number;
  peAdjusted: number; // P/E thực tế (sau khi trừ trích lập Quỹ KTPL & thù lao HĐQT/BKS)
  pb: number;
  dividendYield: number; // %
  currentPrice: number; // Nghìn VNĐ
  totalCapacityMW: number; // Tổng công suất sở hữu MW
  powerPlants: PowerPlantInfo[];
  pricingMechanism: string;
  eavTrackingChannel: string; // Kênh hồ chứa EAV hoặc khung giá
  nsmoTrackingChannel: string; // Kênh NSMO (PVN, GENCO 3, JSC, SMP)
  cascadeRole?: string; // Vai trò bậc thang thủy điện (nếu có)
  q3Forecast: {
    rating: 'TĂNG TRƯỞNG MẠNH' | 'TĂNG TRƯỞNG TÍCH CỰC' | 'KHẢ QUAN' | 'ĐI NGANG' | 'THẬN TRỌNG';
    ratingBadgeColor: 'emerald' | 'teal' | 'cyan' | 'amber' | 'rose';
    revenueEst: number; // Tỷ VNĐ
    profitEst: number; // Tỷ VNĐ (LNST)
    revenueGrowthYoY: number; // %
    profitGrowthYoY: number; // %
    drivers: string[];
    headwinds: string[];
    nsmoEavSignal: string;
  };
}

export interface ReservoirHydroData {
  lakeName: string;
  region: 'Tây Bắc Bộ' | 'Đông Bắc Bộ' | 'Bắc Trung Bộ' | 'Duyên Hải Nam Trung Bộ' | 'Tây Nguyên' | 'Đông Nam Bộ';
  htl: number; // Mực nước thượng lưu (m)
  hdbt: number; // Mực nước dâng bình thường (m)
  hc: number; // Mực nước chết (m)
  waterStoragePercent: number; // % tích nước so với Hc -> Hdbt
  qve: number; // Lưu lượng đến hồ (m3/s)
  qxm: number; // Tổng lượng xả qua máy (m3/s)
  qxt: number; // Lưu lượng xả qua tràn (m3/s)
  ncxs: number; // Số cửa xả sâu mở
  ncxm: number; // Số cửa xả mặt mở
  affectedStocks: {
    ticker: string;
    plantName: string;
    relationship: 'Trực tiếp sở hữu' | 'Hạ lưu bậc thang (hưởng nước xả)' | 'Cổ đông chi phối / liên kết';
    note: string;
  }[];
}

export interface HourlySmpPrice {
  time: string; // "00:30", "01:00", ...
  smpMB: number; // VNĐ/kWh
  smpMT: number;
  smpMN: number;
  smpHT: number;
}

export interface FuelGenerationDistribution {
  category: string;
  generationMWh: number;
  sharePercent: number;
  color: string;
}

export interface OwnerGenerationDistribution {
  owner: string;
  generationMWh: number;
  relatedTickers: string[];
  color: string;
}

// -------------------------------------------------------------
// DỮ LIỆU ĐỊNH LƯỢNG 36 MÃ CỔ PHIẾU NGÀNH ĐIỆN THEO DÕI
// -------------------------------------------------------------
export const POWER_STOCKS: PowerStockIntel[] = [
  // 1. POW
  {
    ticker: 'POW',
    name: 'Tổng Công ty Điện lực Dầu khí Việt Nam (PV Power)',
    exchange: 'HOSE',
    category: 'Nhiệt điện Khí/Dầu',
    avatarColor: '#0284c7',
    marketCap: 28540,
    pe: 14.8,
    peAdjusted: 16.8,
    pb: 0.9,
    dividendYield: 3.5,
    currentPrice: 12.2,
    totalCapacityMW: 4205,
    pricingMechanism: 'Hợp đồng PPA + Thị trường điện CGM (SMP)',
    eavTrackingChannel: 'Khung giá điện khí QĐ 1882/QĐ-BCT, lưu vực hồ Hủa Na, ĐakDrinh',
    nsmoTrackingChannel: 'Sản lượng nhóm PVN (GetBcsxChartDataPhanBoTheoChuSoHuu), giá SMP Miền Trung/Nam',
    powerPlants: [
      { name: 'Cà Mau 1 & 2', capacityMW: 1500, location: 'Cà Mau', type: 'Tua bin khí', basinOrFuel: 'Khí mỏ PM3-CAA', pricingType: 'PPA chuyển ngang giá khí + CGM', estSellingPrice: 2420, priceNote: 'Neo theo giá dầu FO Singapore + phí cước đường ống khí' },
      { name: 'Nhơn Trạch 1', capacityMW: 450, location: 'Đồng Nai', type: 'Tua bin khí', basinOrFuel: 'Khí Nam Côn Sơn', pricingType: 'PPA chuyển ngang giá khí + CGM', estSellingPrice: 2420, priceNote: 'Neo theo giá dầu FO Singapore + phí cước đường ống khí' },
      { name: 'Nhơn Trạch 2 (NT2)', capacityMW: 750, location: 'Đồng Nai', type: 'Tua bin khí', basinOrFuel: 'Khí Nam Côn Sơn', pricingType: 'PPA chuyển ngang giá khí + CGM', estSellingPrice: 2340, priceNote: 'Giá khí neo 46% dầu FO Singapore + cước ống; tỷ lệ alpha ~75%' },
      { name: 'Vũng Áng 1', capacityMW: 1200, location: 'Hà Tĩnh', type: 'Nhiệt điện Than', basinOrFuel: 'Than nội địa & trộn', pricingType: 'Hợp đồng PPA 2 thành phần', estSellingPrice: 1780, priceNote: 'Giá cố định công suất + biến đổi pass-through giá than TKV/trộn' },
      { name: 'Thủy điện Hủa Na', capacityMW: 180, location: 'Nghệ An', type: 'Thủy điện', basinOrFuel: 'Sông Chu', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 890, priceNote: 'Tỷ lệ alpha PPA ~75-85%, phần vượt PPA chào giá theo biên SMP sàn NSMO' },
      { name: 'Thủy điện ĐakDrinh', capacityMW: 125, location: 'Quảng Ngãi', type: 'Thủy điện', basinOrFuel: 'Sông Trà Khúc', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 890, priceNote: 'Tỷ lệ alpha PPA ~75-85%, phần vượt PPA chào giá theo biên SMP sàn NSMO' },
    ],
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG TÍCH CỰC',
      ratingBadgeColor: 'emerald',
      revenueEst: 8450,
      profitEst: 420,
      revenueGrowthYoY: 18.2,
      profitGrowthYoY: 85.5,
      drivers: ['Vũng Áng 1 vận hành đủ cả 2 tổ máy ổn định', 'Thủy điện Hủa Na và ĐakDrinh vào chính vụ mùa mưa lưu lượng dồi dào', 'Tiến độ Nhơn Trạch 3 & 4 thử nghiệm hòa lưới'],
      headwinds: ['Nguồn khí tự nhiên bể Nam Côn Sơn suy giảm khiến cụm Nhơn Trạch bị hạn chế sản lượng'],
      nsmoEavSignal: 'Sản lượng PVN trên NSMO tăng trưởng bình quân 45-50 triệu kWh/ngày; hồ Hủa Na và ĐakDrinh đầy nước.',
    },
  },

  // 2. PGV
  {
    ticker: 'PGV',
    name: 'Tổng Công ty Phát điện 3 (EVNGENCO 3)',
    exchange: 'HOSE',
    category: 'Nhiệt điện Khí/Dầu',
    avatarColor: '#2563eb',
    marketCap: 26800,
    pe: 12.4,
    peAdjusted: 13.8,
    pb: 1.8,
    dividendYield: 4.8,
    currentPrice: 23.5,
    totalCapacityMW: 6565,
    pricingMechanism: 'PPA đa dạng + Thị trường điện CGM',
    eavTrackingChannel: 'Quan trắc 3 hồ: Buôn Kuốp, Srêpốk 3, Buôn Tua Srah trên EAV',
    nsmoTrackingChannel: 'Sản lượng nhóm EVNGENCO 3 trên NSMO, giá SMP Miền Nam',
    cascadeRole: 'Thượng nguồn sông Srêpốk: xả máy nuôi trực tiếp BSA (Srepok 4A) và DRL (Đrây H\'linh 2)',
    powerPlants: [
      { name: 'Cụm Phú Mỹ 1, 2.1, 4', capacityMW: 2541, location: 'Bà Rịa - Vũng Tàu', type: 'Tua bin khí', basinOrFuel: 'Khí Đông Nam Bộ', pricingType: 'PPA chuyển ngang giá khí + CGM', estSellingPrice: 2420, priceNote: 'Neo theo giá dầu FO Singapore + phí cước đường ống khí' },
      { name: 'Mông Dương 1', capacityMW: 1080, location: 'Quảng Ninh', type: 'Nhiệt điện Than', basinOrFuel: 'Than nội địa', pricingType: 'Hợp đồng PPA 2 thành phần', estSellingPrice: 1780, priceNote: 'Giá cố định công suất + biến đổi pass-through giá than TKV/trộn' },
      { name: 'Vĩnh Tân 2', capacityMW: 1244, location: 'Bình Thuận', type: 'Nhiệt điện Than', basinOrFuel: 'Than nội địa', pricingType: 'Hợp đồng PPA 2 thành phần', estSellingPrice: 1780, priceNote: 'Giá cố định công suất + biến đổi pass-through giá than TKV/trộn' },
      { name: 'Thủy điện Buôn Kuốp', capacityMW: 280, location: 'Đắk Lắk', type: 'Thủy điện', basinOrFuel: 'Sông Srêpốk', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 890, priceNote: 'Tỷ lệ alpha PPA ~75-85%, phần vượt PPA chào giá theo biên SMP sàn NSMO' },
      { name: 'Thủy điện Srêpốk 3', capacityMW: 220, location: 'Đắk Lắk', type: 'Thủy điện', basinOrFuel: 'Sông Srêpốk', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 890, priceNote: 'Tỷ lệ alpha PPA ~75-85%, phần vượt PPA chào giá theo biên SMP sàn NSMO' },
      { name: 'Thủy điện Buôn Tua Srah', capacityMW: 86, location: 'Đắk Nông', type: 'Thủy điện', basinOrFuel: 'Sông Krông Nô', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 1050, priceNote: 'Hợp đồng PPA dài hạn với EVN, linh hoạt điều độ giờ phụ tải cao' },
    ],
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG TÍCH CỰC',
      ratingBadgeColor: 'emerald',
      revenueEst: 12800,
      profitEst: 680,
      revenueGrowthYoY: 8.5,
      profitGrowthYoY: 42.0,
      drivers: ['Lưu vực Tây Nguyên mưa dồi dào, 3 nhà máy thủy điện chạy full công suất với biên lãi gộp >65%', 'Nhiệt điện than Mông Dương 1 chạy nền ổn định'],
      headwinds: ['Chi phí tài chính vay nợ ngoại tệ và giá khí khu vực Đông Nam Bộ cao'],
      nsmoEavSignal: 'Cả 3 hồ Buôn Kuốp, Srêpốk 3, Buôn Tua Srah trên EAV đều đạt mực nước >95% Hdbt, xả máy liên tục.',
    },
  },

  // 3. NT2
  {
    ticker: 'NT2',
    name: 'CTCP Điện lực Dầu khí Nhơn Trạch 2',
    exchange: 'HOSE',
    category: 'Nhiệt điện Khí/Dầu',
    avatarColor: '#0ea5e9',
    marketCap: 5650,
    pe: 18.2,
    peAdjusted: 19.8,
    pb: 1.4,
    dividendYield: 6.2,
    currentPrice: 19.6,
    totalCapacityMW: 750,
    pricingMechanism: 'Hợp đồng PPA với EVN (tỷ lệ alpha ~75%) + Chào giá CGM',
    eavTrackingChannel: 'Khung giá điện khí tự nhiên năm của EAV (QĐ 1882/QĐ-BCT)',
    nsmoTrackingChannel: 'Sản lượng Tua bin khí hàng ngày và giá SMP Miền Nam trên NSMO',
    powerPlants: [
      { name: 'Nhiệt điện Nhơn Trạch 2', capacityMW: 750, location: 'Đồng Nai', type: 'Tua bin khí', basinOrFuel: 'Khí Nam Côn Sơn & Cửu Long', pricingType: 'PPA chuyển ngang giá khí + CGM', estSellingPrice: 2340, priceNote: 'Giá khí neo 46% dầu FO Singapore + cước ống; tỷ lệ alpha ~75%' },
    ],
    q3Forecast: {
      rating: 'KHẢ QUAN',
      ratingBadgeColor: 'cyan',
      revenueEst: 1850,
      profitEst: 110,
      revenueGrowthYoY: 12.0,
      profitGrowthYoY: 35.0,
      drivers: ['Phục hồi mạnh mẽ sau đợt đại tu lớn năm ngoái', 'Huy động phụ tải cao vào giờ cao điểm chiều/tối miền Nam'],
      headwinds: ['Nguồn cấp khí Nam Côn Sơn khan hiếm, giá khí phối trộn cao'],
      nsmoEavSignal: 'Sản lượng TBK miền Nam ổn định, NT2 được điều độ chạy chu kỳ phụ tải đỉnh.',
    },
  },

  // 4. QTP
  {
    ticker: 'QTP',
    name: 'CTCP Nhiệt điện Quảng Ninh',
    exchange: 'UPCoM',
    category: 'Nhiệt điện Than',
    avatarColor: '#f97316',
    marketCap: 6850,
    pe: 8.5,
    peAdjusted: 9.4,
    pb: 1.1,
    dividendYield: 10.5,
    currentPrice: 15.2,
    totalCapacityMW: 1200,
    pricingMechanism: 'Hợp đồng PPA + Thị trường điện CGM Miền Bắc',
    eavTrackingChannel: 'Khung giá nhiệt điện than nội địa, phê duyệt chi phí cố định EAV',
    nsmoTrackingChannel: 'Phụ tải Miền Bắc (congSuatMB) và giá SMP Miền Bắc trên NSMO',
    powerPlants: [
      { name: 'Quảng Ninh 1 & 2 (4 tổ máy x 300MW)', capacityMW: 1200, location: 'Quảng Ninh', type: 'Nhiệt điện Than', basinOrFuel: 'Than cám TKV', pricingType: 'Hợp đồng PPA 2 thành phần', estSellingPrice: 1680, priceNote: 'Thành phần biến đổi pass-through giá than TKV; khấu hao gần hết' },
    ],
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG MẠNH',
      ratingBadgeColor: 'emerald',
      revenueEst: 3100,
      profitEst: 285,
      revenueGrowthYoY: 15.4,
      profitGrowthYoY: 65.2,
      drivers: ['Phụ tải công nghiệp Miền Bắc tăng 11-13% YoY', 'Nhà máy đã khấu hao gần hết tài sản cố định', 'Cổ tức tiền mặt cao và đều đặn'],
      headwinds: ['Suất hao than tăng nhẹ khi chạy non tải vào ban ngày'],
      nsmoEavSignal: 'Phụ tải Miền Bắc trên NSMO liên tục lập đỉnh >21.000 MW, QTP duy trì huy động 4 tổ máy.',
    },
  },

  // 5. HND
  {
    ticker: 'HND',
    name: 'CTCP Nhiệt điện Hải Phòng',
    exchange: 'UPCoM',
    category: 'Nhiệt điện Than',
    avatarColor: '#ea580c',
    marketCap: 7200,
    pe: 8.9,
    peAdjusted: 9.9,
    pb: 1.2,
    dividendYield: 9.8,
    currentPrice: 14.4,
    totalCapacityMW: 1200,
    pricingMechanism: 'Hợp đồng PPA + Thị trường điện CGM Miền Bắc',
    eavTrackingChannel: 'Khung giá trần nhiệt điện than, tỷ lệ alpha hợp đồng PPA',
    nsmoTrackingChannel: 'Phụ tải Miền Bắc và sản lượng than toàn quốc trên NSMO',
    powerPlants: [
      { name: 'Hải Phòng 1 & 2 (4 tổ máy x 300MW)', capacityMW: 1200, location: 'Hải Phòng', type: 'Nhiệt điện Than', basinOrFuel: 'Than TKV & Đông Bắc', pricingType: 'Hợp đồng PPA 2 thành phần', estSellingPrice: 1690, priceNote: 'Chạy phụ tải nền tam giác kinh tế phía Bắc, giá than pass-through' },
    ],
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG MẠNH',
      ratingBadgeColor: 'emerald',
      revenueEst: 3250,
      profitEst: 295,
      revenueGrowthYoY: 14.2,
      profitGrowthYoY: 58.0,
      drivers: ['Nhu cầu điện tam giác kinh tế Hà Nội - Hải Phòng - Quảng Ninh rất lớn', 'Tài sản khấu hao gần hết giúp dòng tiền dồi dào'],
      headwinds: ['Kiểm soát nghiêm ngặt về phát thải tro xỉ và bụi môi trường'],
      nsmoEavSignal: 'Được NSMO phân bổ sản lượng Qc cao trong các tháng cao điểm nắng nóng và hậu bão.',
    },
  },

  // 6. PPC
  {
    ticker: 'PPC',
    name: 'CTCP Nhiệt điện Phả Lại',
    exchange: 'HOSE',
    category: 'Nhiệt điện Than',
    avatarColor: '#c2410c',
    marketCap: 4500,
    pe: 11.2,
    peAdjusted: 12.5,
    pb: 0.95,
    dividendYield: 6.5,
    currentPrice: 14.0,
    totalCapacityMW: 1040,
    pricingMechanism: 'Hợp đồng PPA + Thị trường điện CGM',
    eavTrackingChannel: 'Quy định giá dịch vụ phát điện nhà máy BOT & chuyển đổi',
    nsmoTrackingChannel: 'Sản lượng than Miền Bắc, chênh lệch giá SMP',
    powerPlants: [
      { name: 'Phả Lại 1 (4 tổ máy x 110MW)', capacityMW: 440, location: 'Hải Dương', type: 'Nhiệt điện Than', basinOrFuel: 'Than nội địa (đã khấu hao hết)', pricingType: 'PPA than & O&M (hết KH)', estSellingPrice: 1390, priceNote: 'Hết khấu hao tài sản cố định, giá PPA chỉ bù than và O&M' },
      { name: 'Phả Lại 2 (2 tổ máy x 300MW)', capacityMW: 600, location: 'Hải Dương', type: 'Nhiệt điện Than', basinOrFuel: 'Than nội địa', pricingType: 'Hợp đồng PPA 2 thành phần', estSellingPrice: 1720, priceNote: 'Công nghệ nhiệt điện than truyền thống, hợp đồng PPA dài hạn' },
    ],
    q3Forecast: {
      rating: 'KHẢ QUAN',
      ratingBadgeColor: 'cyan',
      revenueEst: 1950,
      profitEst: 145,
      revenueGrowthYoY: 9.0,
      profitGrowthYoY: 30.5,
      drivers: ['Dây chuyền Phả Lại 1 hết khấu hao biên lợi nhuận thuần túy theo sản lượng', 'Thu nhập cổ tức từ HND và QTP'],
      headwinds: ['Tổ máy dây chuyền 1 tuổi thọ cao, cần bảo dưỡng định kỳ thường xuyên'],
      nsmoEavSignal: 'Huy động chạy nền ổn định trên lưới điện miền Bắc.',
    },
  },

  // 7. BTP
  {
    ticker: 'BTP',
    name: 'CTCP Nhiệt điện Bà Rịa',
    exchange: 'HOSE',
    category: 'Nhiệt điện Khí/Dầu',
    avatarColor: '#7c3aed',
    marketCap: 950,
    pe: 13.5,
    peAdjusted: 14.7,
    pb: 0.85,
    dividendYield: 7.0,
    currentPrice: 15.8,
    totalCapacityMW: 388.9,
    pricingMechanism: 'Hợp đồng dịch vụ phụ trợ & chạy dự phòng cho EVN',
    eavTrackingChannel: 'Biểu giá dịch vụ dự phòng khởi động đen & chạy phủ đỉnh EAV',
    nsmoTrackingChannel: 'Sản lượng TBK chạy dầu / NĐ Dầu (DO/FO) trên NSMO',
    powerPlants: [
      { name: 'Tua bin khí Bà Rịa', capacityMW: 388.9, location: 'Bà Rịa - Vũng Tàu', type: 'Tua bin khí', basinOrFuel: 'Khí & Dầu DO dự phòng', pricingType: 'PPA chuyển ngang giá khí + CGM', estSellingPrice: 2420, priceNote: 'Neo theo giá dầu FO Singapore + phí cước đường ống khí' },
    ],
    q3Forecast: {
      rating: 'ĐI NGANG',
      ratingBadgeColor: 'amber',
      revenueEst: 180,
      profitEst: 18,
      revenueGrowthYoY: 5.0,
      profitGrowthYoY: 8.0,
      drivers: ['Doanh thu cố định từ hợp đồng sẵn sàng cung cấp công suất cho EVN'],
      headwinds: ['Sản lượng điện thương phẩm phát thực tế thấp do ưu tiên điện mặt trời và khí giá rẻ'],
      nsmoEavSignal: 'Duy trì công suất khả dụng, ít khi phải khởi động chạy dầu khẩn cấp.',
    },
  },

  // 8. NBP
  {
    ticker: 'NBP',
    name: 'CTCP Nhiệt điện Ninh Bình',
    exchange: 'HNX',
    category: 'Nhiệt điện Than',
    avatarColor: '#9a3412',
    marketCap: 410,
    pe: 12.0,
    peAdjusted: 10.6,
    pb: 0.9,
    dividendYield: 8.0,
    currentPrice: 16.5,
    totalCapacityMW: 100,
    pricingMechanism: 'Hợp đồng PPA với EVN',
    eavTrackingChannel: 'Kế hoạch vận hành hệ thống điện quốc gia EAV',
    nsmoTrackingChannel: 'Lệnh điều độ phụ tải miền Bắc',
    powerPlants: [
      { name: 'Nhiệt điện Ninh Bình (4 x 25MW)', capacityMW: 100, location: 'Ninh Bình', type: 'Nhiệt điện Than', basinOrFuel: 'Than nội địa', pricingType: 'Hợp đồng PPA 2 thành phần', estSellingPrice: 1650, priceNote: 'Nhiệt điện than nội địa, hợp đồng PPA dài hạn với EVN' },
    ],
    q3Forecast: {
      rating: 'ĐI NGANG',
      ratingBadgeColor: 'amber',
      revenueEst: 210,
      profitEst: 12,
      revenueGrowthYoY: 2.0,
      profitGrowthYoY: 5.0,
      drivers: ['Máy móc khấu hao hết, cung cấp hơi và điện ổn định'],
      headwinds: ['Quy mô công suất nhỏ, nằm trong kế hoạch chuyển đổi năng lượng xanh lâu dài'],
      nsmoEavSignal: 'Vận hành phụ tải cục bộ theo lệnh NSMO.',
    },
  },

  // 9. VSH
  {
    ticker: 'VSH',
    name: 'CTCP Thủy điện Vĩnh Sơn - Sông Hinh',
    exchange: 'HOSE',
    category: 'Thủy điện lớn',
    avatarColor: '#059669',
    marketCap: 11200,
    pe: 10.5,
    peAdjusted: 11.4,
    pb: 2.1,
    dividendYield: 5.5,
    currentPrice: 47.5,
    totalCapacityMW: 356,
    pricingMechanism: 'PPA Thượng Kon Tum + Thị trường điện CGM',
    eavTrackingChannel: 'Quan trắc 4 hồ trên EAV: Vĩnh Sơn A, B, C; Sông Hinh; Thượng Kon Tum',
    nsmoTrackingChannel: 'Sản lượng thủy điện miền Trung và giá SMP',
    powerPlants: [
      { name: 'Thượng Kon Tum', capacityMW: 220, location: 'Kon Tum / Quảng Ngãi', type: 'Thủy điện', basinOrFuel: 'Sông Đắk Nghé (cột nước 840m)', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 1120, priceNote: 'PPA thỏa thuận bù đắp suất đầu tư lớn, cột nước cao 840m biên lãi vượt trội' },
      { name: 'Sông Hinh', capacityMW: 70, location: 'Phú Yên', type: 'Thủy điện', basinOrFuel: 'Sông Hinh', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 740, priceNote: 'Đã hết khấu hao tổ máy cũ, giá PPA thấp nhưng biên gộp >70%' },
      { name: 'Vĩnh Sơn', capacityMW: 66, location: 'Bình Định', type: 'Thủy điện', basinOrFuel: 'Sông Côn', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 740, priceNote: 'Đã hết khấu hao tổ máy cũ, giá PPA thấp nhưng biên gộp >70%' },
    ],
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG MẠNH',
      ratingBadgeColor: 'emerald',
      revenueEst: 820,
      profitEst: 340,
      revenueGrowthYoY: 32.0,
      profitGrowthYoY: 78.5,
      drivers: ['Thượng Kon Tum cột nước 840m cực kỳ hiệu quả, hồ đầy nước chạy tối đa công suất', 'PPA mới được EVN phê duyệt giá có lợi'],
      headwinds: ['Chi phí nợ vay dự án Thượng Kon Tum (đang giảm dần từng quý)'],
      nsmoEavSignal: 'Hồ Thượng Kon Tum trên EAV đạt 1150m (gần sát Hdbt 1160m), hồ Sông Hinh xả máy liên tục.',
    },
  },

  // 10. TMP
  {
    ticker: 'TMP',
    name: 'CTCP Thủy điện Thác Mơ',
    exchange: 'HOSE',
    category: 'Thủy điện lớn',
    avatarColor: '#10b981',
    marketCap: 3850,
    pe: 9.8,
    peAdjusted: 10.8,
    pb: 1.8,
    dividendYield: 8.5,
    currentPrice: 55.0,
    totalCapacityMW: 275,
    pricingMechanism: 'Hợp đồng PPA + CGM + Giá FIT ĐMT',
    eavTrackingChannel: 'Theo dõi trực tiếp hồ Thác Mơ trên bảng EAV',
    nsmoTrackingChannel: 'Sản lượng thủy điện & ĐMT miền Nam trên NSMO',
    cascadeRole: 'Thượng nguồn sông Bé: xả nước nuôi trực tiếp SJD (Thủy điện Cần Đơn)',
    powerPlants: [
      { name: 'Thác Mơ hiện hữu & mở rộng', capacityMW: 225, location: 'Bình Phước', type: 'Thủy điện', basinOrFuel: 'Sông Bé', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 710, priceNote: 'Đã hết khấu hao tổ máy chính, chi phí tiền mặt cực thấp ~150 đ/kWh' },
      { name: 'Điện mặt trời Thác Mơ', capacityMW: 50, location: 'Bình Phước', type: 'Điện Mặt Trời', basinOrFuel: 'Mặt trời nổi trên hồ', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 710, priceNote: 'Đã hết khấu hao tổ máy chính, chi phí tiền mặt cực thấp ~150 đ/kWh' },
    ],
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG MẠNH',
      ratingBadgeColor: 'emerald',
      revenueEst: 290,
      profitEst: 145,
      revenueGrowthYoY: 28.0,
      profitGrowthYoY: 55.0,
      drivers: ['Mùa mưa Nam Bộ đến sớm, hồ Thác Mơ tích nước lý tưởng', 'ĐMT Thác Mơ có giá FIT 1 ưu đãi bổ sung dòng tiền'],
      headwinds: ['Xả tràn nếu mưa lũ vượt dung tích thiết kế'],
      nsmoEavSignal: 'Hồ Thác Mơ trên EAV mực nước >215.5m (Hdbt 218m), nước về Qve >320 m3/s.',
    },
  },

  // 11. SHP
  {
    ticker: 'SHP',
    name: 'CTCP Thủy điện Miền Nam',
    exchange: 'HOSE',
    category: 'Thủy điện vừa & nhỏ',
    avatarColor: '#14b8a6',
    marketCap: 1520,
    pe: 10.2,
    peAdjusted: 10.9,
    pb: 1.3,
    dividendYield: 7.2,
    currentPrice: 15.0,
    totalCapacityMW: 122.5,
    pricingMechanism: 'Hợp đồng PPA + CGM',
    eavTrackingChannel: 'Lưu vực sông Đồng Nai & Đại Ninh trên EAV',
    nsmoTrackingChannel: 'Sản lượng thủy điện miền Nam',
    powerPlants: [
      { name: 'Đam M\'bri', capacityMW: 75, location: 'Lâm Đồng', type: 'Thủy điện', basinOrFuel: 'Sông Đam M\'bri' },
      { name: 'Đa Dâng 2', capacityMW: 34, location: 'Lâm Đồng', type: 'Thủy điện', basinOrFuel: 'Sông Đa Dâng', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 1050, priceNote: 'Hợp đồng PPA dài hạn với EVN, linh hoạt điều độ giờ phụ tải cao' },
      { name: 'Đa Siat', capacityMW: 13.5, location: 'Lâm Đồng', type: 'Thủy điện', basinOrFuel: 'Sông Đa Siat', pricingType: 'Biểu giá tránh được (ACT)', estSellingPrice: 1150, priceNote: 'Theo Biểu giá ACT (EAV), tối ưu xả nước vào giờ cao điểm ~2.800 đ/kWh' },
    ],
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG TÍCH CỰC',
      ratingBadgeColor: 'emerald',
      revenueEst: 240,
      profitEst: 95,
      revenueGrowthYoY: 22.0,
      profitGrowthYoY: 48.0,
      drivers: ['Tây Nguyên mưa lớn, nhà máy Đam M\'bri chạy hết công suất', 'Chi phí khấu hao ổn định'],
      headwinds: ['Rủi ro sạt lở địa chất mùa mưa tại Lâm Đồng'],
      nsmoEavSignal: 'Lưu vực Đồng Nai 3, 4 trên EAV đều có lưu lượng về dồi dào, hỗ trợ lưu vực SHP.',
    },
  },

  // 12. SJD
  {
    ticker: 'SJD',
    name: 'CTCP Thủy điện Cần Đơn',
    exchange: 'HOSE',
    category: 'Thủy điện vừa & nhỏ',
    avatarColor: '#0d9488',
    marketCap: 1250,
    pe: 8.8,
    peAdjusted: 10.0,
    pb: 1.4,
    dividendYield: 11.0,
    currentPrice: 18.2,
    totalCapacityMW: 65.7,
    pricingMechanism: 'PPA + CGM',
    eavTrackingChannel: 'Theo dõi nước xả hồ Thác Mơ trên EAV (bậc thang ngay trên Cần Đơn)',
    nsmoTrackingChannel: 'Giá SMP Miền Nam và sản lượng thủy điện',
    cascadeRole: 'Hạ lưu bậc thang sông Bé: đón 100% nước xả qua máy và xả tràn từ Thác Mơ (TMP)',
    powerPlants: [
      { name: 'Thủy điện Cần Đơn', capacityMW: 57.6, location: 'Bình Phước', type: 'Thủy điện', basinOrFuel: 'Sông Bé (dưới hồ Thác Mơ)', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 1050, priceNote: 'Hợp đồng PPA dài hạn với EVN, linh hoạt điều độ giờ phụ tải cao' },
      { name: 'Thủy điện Ry Ninh II', capacityMW: 8.1, location: 'Gia Lai', type: 'Thủy điện', basinOrFuel: 'Sông Ry Ninh', pricingType: 'Biểu giá tránh được (ACT)', estSellingPrice: 1150, priceNote: 'Theo Biểu giá ACT (EAV), tối ưu xả nước vào giờ cao điểm ~2.800 đ/kWh' },
    ],
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG TÍCH CỰC',
      ratingBadgeColor: 'emerald',
      revenueEst: 145,
      profitEst: 62,
      revenueGrowthYoY: 19.5,
      profitGrowthYoY: 40.0,
      drivers: ['Hưởng lợi trọn vẹn nước xả chạy máy của Thác Mơ', 'Cổ tức tiền mặt cực kỳ bền vững hàng năm'],
      headwinds: ['Không có dung tích điều tiết lớn nên hoàn toàn phụ thuộc vào điều độ hồ Thác Mơ'],
      nsmoEavSignal: 'Thác Mơ xả máy liên tục >150 m3/s, đảm bảo lưu lượng vào hồ Cần Đơn.',
    },
  },

  // 13. SBA
  {
    ticker: 'SBA',
    name: 'CTCP Sông Ba',
    exchange: 'HOSE',
    category: 'Thủy điện vừa & nhỏ',
    avatarColor: '#047857',
    marketCap: 1100,
    pe: 8.6,
    peAdjusted: 9.3,
    pb: 1.5,
    dividendYield: 9.0,
    currentPrice: 18.0,
    totalCapacityMW: 73,
    pricingMechanism: 'PPA + Chào giá CGM thị trường điện',
    eavTrackingChannel: 'Lưu vực Sông Ba Hạ, Sông Hinh trên bảng EAV',
    nsmoTrackingChannel: 'Giá SMP Miền Trung trên NSMO',
    powerPlants: [
      { name: 'Krông H\'năng', capacityMW: 64, location: 'Đắk Lắk / Phú Yên', type: 'Thủy điện', basinOrFuel: 'Sông Krông H\'năng' },
      { name: 'Khe Diên', capacityMW: 9, location: 'Quảng Nam', type: 'Thủy điện', basinOrFuel: 'Sông Thu Bồn', pricingType: 'Biểu giá tránh được (ACT)', estSellingPrice: 1150, priceNote: 'Theo Biểu giá ACT (EAV), tối ưu xả nước vào giờ cao điểm ~2.800 đ/kWh' },
    ],
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG TÍCH CỰC',
      ratingBadgeColor: 'emerald',
      revenueEst: 135,
      profitEst: 58,
      revenueGrowthYoY: 20.0,
      profitGrowthYoY: 45.0,
      drivers: ['Chiến lược chào giá thị trường điện thông minh giúp giá bán bình quân cao hơn hợp đồng', 'Quý 3-4 là đỉnh điểm mùa mưa miền Trung'],
      headwinds: ['Phụ thuộc mưa lũ cuối năm tại khu vực Phú Yên/Đắk Lắk'],
      nsmoEavSignal: 'Hồ Sông Ba Hạ lân cận đạt Qve >380 m3/s, báo hiệu vùng đón nước của Krông H\'năng rất tốt.',
    },
  },

  // 14. TBC
  {
    ticker: 'TBC',
    name: 'CTCP Thủy điện Thác Bà',
    exchange: 'HOSE',
    category: 'Thủy điện lớn',
    avatarColor: '#065f46',
    marketCap: 2150,
    pe: 9.2,
    peAdjusted: 10.7,
    pb: 1.6,
    dividendYield: 8.0,
    currentPrice: 33.8,
    totalCapacityMW: 120,
    pricingMechanism: 'Hợp đồng PPA với EVN',
    eavTrackingChannel: 'Theo dõi trực tiếp hồ Thác Bà trên bảng EAV (mực nước, Qve, Qxm)',
    nsmoTrackingChannel: 'Sản lượng thủy điện miền Bắc trên NSMO',
    powerPlants: [
      { name: 'Thác Bà', capacityMW: 120, location: 'Yên Bái', type: 'Thủy điện', basinOrFuel: 'Sông Chảy', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 890, priceNote: 'Tỷ lệ alpha PPA ~75-85%, phần vượt PPA chào giá theo biên SMP sàn NSMO' },
    ],
    q3Forecast: {
      rating: 'KHẢ QUAN',
      ratingBadgeColor: 'cyan',
      revenueEst: 165,
      profitEst: 65,
      revenueGrowthYoY: 15.0,
      profitGrowthYoY: 28.0,
      drivers: ['Lưu lượng sông Chảy hồi phục mạnh mẽ sau mùa mưa bão phía Bắc', 'Đang đầu tư dự án Thác Bà 2'],
      headwinds: ['Nhiệm vụ xả lũ cắt lũ cho hạ du theo lệnh điều độ khẩn cấp'],
      nsmoEavSignal: 'Hồ Thác Bà trên EAV duy trì mực nước 55.7m (Hdbt 58m), Qve đạt >230 m3/s.',
    },
  },

  // 15. GHC
  {
    ticker: 'GHC',
    name: 'CTCP Thủy điện Gia Lai (công ty con GEG)',
    exchange: 'UPCoM',
    category: 'Thủy điện vừa & nhỏ',
    avatarColor: '#0f766e',
    marketCap: 1180,
    pe: 8.9,
    peAdjusted: 9.5,
    pb: 1.4,
    dividendYield: 10.0,
    currentPrice: 24.2,
    totalCapacityMW: 85.5,
    pricingMechanism: 'Biểu giá Chi phí tránh được cho thủy điện nhỏ (<=30MW)',
    eavTrackingChannel: 'Biểu giá chi phí tránh được hàng năm của EAV',
    nsmoTrackingChannel: 'Sản lượng khối JSC trên NSMO',
    powerPlants: [
      { name: 'H\'Chan', capacityMW: 12, location: 'Gia Lai', type: 'Thủy điện', basinOrFuel: 'Sông Ayun' },
      { name: 'H\'Mun', capacityMW: 16.2, location: 'Gia Lai', type: 'Thủy điện', basinOrFuel: 'Sông Ayun' },
      { name: 'Ia Đrăng 1 & 2', capacityMW: 8.6, location: 'Gia Lai', type: 'Thủy điện', basinOrFuel: 'Sông Ia Đrăng', pricingType: 'Biểu giá tránh được (ACT)', estSellingPrice: 1150, priceNote: 'Theo Biểu giá ACT (EAV), tối ưu xả nước vào giờ cao điểm ~2.800 đ/kWh' },
      { name: 'Cụm Thủy điện nhỏ Gia Lai', capacityMW: 48.7, location: 'Gia Lai', type: 'Thủy điện', basinOrFuel: 'Sông Sê San & Ba', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 1050, priceNote: 'Hợp đồng PPA dài hạn với EVN, linh hoạt điều độ giờ phụ tải cao' },
    ],
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG TÍCH CỰC',
      ratingBadgeColor: 'emerald',
      revenueEst: 125,
      profitEst: 48,
      revenueGrowthYoY: 18.0,
      profitGrowthYoY: 38.0,
      drivers: ['Tây Nguyên mưa lớn, toàn bộ các nhà máy nhỏ chạy tối đa công suất', 'Bán theo biểu giá chi phí tránh được không bị ép giá CGM'],
      headwinds: ['Chi phí truyền tải và hạn chế lưới điện nông thôn'],
      nsmoEavSignal: 'Thời tiết Tây Nguyên vào chu kỳ La Nina mưa nhiều, các con sông suối Gia Lai đầy nước.',
    },
  },

  // 16. DRL
  {
    ticker: 'DRL',
    name: 'CTCP Thủy điện - Điện lực 3',
    exchange: 'HOSE',
    category: 'Thủy điện vừa & nhỏ',
    avatarColor: '#115e59',
    marketCap: 520,
    pe: 8.4,
    peAdjusted: 9.8,
    pb: 2.2,
    dividendYield: 11.5,
    currentPrice: 53.0,
    totalCapacityMW: 16,
    pricingMechanism: 'Biểu giá Chi phí tránh được',
    eavTrackingChannel: 'Theo dõi nước xả hồ Buôn Kuốp & Srêpốk 3 trên EAV',
    nsmoTrackingChannel: 'Sản lượng thủy điện Tây Nguyên',
    cascadeRole: 'Hạ lưu bậc thang: đón nước xả máy từ cụm hồ Buôn Kuốp và Srêpốk 3 (PGV)',
    powerPlants: [
      { name: 'Đrây H\'linh 2', capacityMW: 16, location: 'Đắk Lắk', type: 'Thủy điện', basinOrFuel: 'Sông Srêpốk' },
    ],
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG TÍCH CỰC',
      ratingBadgeColor: 'emerald',
      revenueEst: 35,
      profitEst: 19,
      revenueGrowthYoY: 16.0,
      profitGrowthYoY: 32.0,
      drivers: ['Không mất chi phí hồ chứa lớn, đón trọn nước xả từ Srêpốk 3', 'Biên lãi ròng thuộc hàng cao nhất sàn (>50%)'],
      headwinds: ['Quy mô công suất nhỏ, không còn dư địa mở rộng'],
      nsmoEavSignal: 'Hồ Srêpốk 3 trên EAV xả máy liên tục giúp tuabin Đrây H\'linh 2 quay hết công suất.',
    },
  },

  // 17. VPD
  {
    ticker: 'VPD',
    name: 'CTCP Phát triển Điện Nông thôn Hải Dương (VND Energy)',
    exchange: 'HOSE',
    category: 'Thủy điện lớn',
    avatarColor: '#15803d',
    marketCap: 2850,
    pe: 11.0,
    peAdjusted: 11.7,
    pb: 1.3,
    dividendYield: 6.0,
    currentPrice: 26.5,
    totalCapacityMW: 136.5,
    pricingMechanism: 'PPA Khe Bố + CGM',
    eavTrackingChannel: 'Theo dõi trực tiếp hồ KHE BỐ trên bảng EAV',
    nsmoTrackingChannel: 'Sản lượng thủy điện Bắc Trung Bộ',
    powerPlants: [
      { name: 'Khe Bố', capacityMW: 100, location: 'Nghệ An', type: 'Thủy điện', basinOrFuel: 'Sông Cả (hồ KHE BỐ trên EAV)', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 1050, priceNote: 'Hợp đồng PPA dài hạn với EVN, linh hoạt điều độ giờ phụ tải cao' },
      { name: 'Nậm La', capacityMW: 27, location: 'Sơn La', type: 'Thủy điện', basinOrFuel: 'Sông Nậm La', pricingType: 'Biểu giá tránh được (ACT)', estSellingPrice: 1150, priceNote: 'Theo Biểu giá ACT (EAV), tối ưu xả nước vào giờ cao điểm ~2.800 đ/kWh' },
      { name: 'Cụm thủy điện nhỏ', capacityMW: 9.5, location: 'Tây Bắc', type: 'Thủy điện', basinOrFuel: 'Suối nhỏ', pricingType: 'Biểu giá tránh được (ACT)', estSellingPrice: 1150, priceNote: 'Theo Biểu giá ACT (EAV), tối ưu xả nước vào giờ cao điểm ~2.800 đ/kWh' },
    ],
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG MẠNH',
      ratingBadgeColor: 'emerald',
      revenueEst: 230,
      profitEst: 95,
      revenueGrowthYoY: 25.0,
      profitGrowthYoY: 62.0,
      drivers: ['Khe Bố (100MW) là cỗ máy in tiền chính, đón lượng nước khổng lồ từ sông Cả', 'Mùa mưa lũ Bắc Trung Bộ giúp sản lượng tăng vọt'],
      headwinds: ['Điều tiết xả lũ an toàn hạ du Nghệ An'],
      nsmoEavSignal: 'Dòng dữ liệu EAV ghi nhận: Hồ KHE BỐ đạt Qve 610 m3/s, Qxm đạt 122.4 m3/s.',
    },
  },

  // 18. VCP
  {
    ticker: 'VCP',
    name: 'CTCP Đầu tư Xây dựng & Phát triển Năng lượng Vinaconex',
    exchange: 'UPCoM',
    category: 'Thủy điện lớn',
    avatarColor: '#166534',
    marketCap: 1650,
    pe: 9.5,
    peAdjusted: 10.2,
    pb: 1.5,
    dividendYield: 9.0,
    currentPrice: 29.0,
    totalCapacityMW: 118,
    pricingMechanism: 'PPA Cửa Đạt + Biểu giá chi phí tránh được',
    eavTrackingChannel: 'Lưu vực sông Chu, hồ Trung Sơn trên EAV',
    nsmoTrackingChannel: 'Sản lượng thủy điện Bắc Trung Bộ',
    powerPlants: [
      { name: 'Cửa Đạt', capacityMW: 97, location: 'Thanh Hóa', type: 'Thủy điện', basinOrFuel: 'Sông Chu', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 1050, priceNote: 'Hợp đồng PPA dài hạn với EVN, linh hoạt điều độ giờ phụ tải cao' },
      { name: 'Xuân Minh', capacityMW: 15, location: 'Thanh Hóa', type: 'Thủy điện', basinOrFuel: 'Sông Chu', pricingType: 'Biểu giá tránh được (ACT)', estSellingPrice: 1150, priceNote: 'Theo Biểu giá ACT (EAV), tối ưu xả nước vào giờ cao điểm ~2.800 đ/kWh' },
      { name: 'Bái Thượng', capacityMW: 6, location: 'Thanh Hóa', type: 'Thủy điện', basinOrFuel: 'Sông Chu', pricingType: 'Biểu giá tránh được (ACT)', estSellingPrice: 1150, priceNote: 'Theo Biểu giá ACT (EAV), tối ưu xả nước vào giờ cao điểm ~2.800 đ/kWh' },
    ],
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG TÍCH CỰC',
      ratingBadgeColor: 'emerald',
      revenueEst: 185,
      profitEst: 72,
      revenueGrowthYoY: 20.0,
      profitGrowthYoY: 42.0,
      drivers: ['Thủy điện Cửa Đạt (97MW) hoạt động tối đa công suất nhờ mưa bão miền Trung', 'Bậc thang Bái Thượng và Xuân Minh tận dụng nước xả'],
      headwinds: ['Phối hợp điều tiết nước tưới tiêu nông nghiệp tỉnh Thanh Hóa'],
      nsmoEavSignal: 'Lưu vực sông Mã - sông Chu nước về đầy ắp, hồ tích nước an toàn ở cao trình cao.',
    },
  },

  // 19. HJS
  {
    ticker: 'HJS',
    name: 'CTCP Thủy điện Nậm Mu',
    exchange: 'HNX',
    category: 'Thủy điện vừa & nhỏ',
    avatarColor: '#14532d',
    marketCap: 580,
    pe: 8.2,
    peAdjusted: 8.9,
    pb: 1.3,
    dividendYield: 10.5,
    currentPrice: 27.5,
    totalCapacityMW: 32.7,
    pricingMechanism: 'Biểu giá Chi phí tránh được',
    eavTrackingChannel: 'Lưu vực Tuyên Quang, Thác Bà (sông Lô, sông Gâm)',
    nsmoTrackingChannel: 'Sản lượng thủy điện miền Bắc',
    powerPlants: [
      { name: 'Nậm Mu', capacityMW: 12, location: 'Hà Giang', type: 'Thủy điện', basinOrFuel: 'Sông Lô', pricingType: 'Biểu giá tránh được (ACT)', estSellingPrice: 1180, priceNote: 'Hồ điều tiết ngày, tối ưu phát 5h cao điểm đạt 2.800 đ/kWh' },
      { name: 'Nậm Ngần', capacityMW: 13.5, location: 'Hà Giang', type: 'Thủy điện', basinOrFuel: 'Sông Lô', pricingType: 'Biểu giá tránh được (ACT)', estSellingPrice: 1160, priceNote: 'Lưu vực sông Lô, phát tối đa công suất vào mùa mưa bão miền Bắc' },
      { name: 'Bản Sáng', capacityMW: 7.2, location: 'Sơn La', type: 'Thủy điện', basinOrFuel: 'Sông Đà', pricingType: 'Biểu giá tránh được (ACT)', estSellingPrice: 1120, priceNote: 'Thủy điện nhỏ Sơn La, biểu giá tránh được vùng Tây Bắc' },
    ],
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG TÍCH CỰC',
      ratingBadgeColor: 'emerald',
      revenueEst: 65,
      profitEst: 28,
      revenueGrowthYoY: 18.0,
      profitGrowthYoY: 35.0,
      drivers: ['Mùa mưa lũ vùng núi Hà Giang/Tây Bắc cung cấp nước dồi dào', 'Suất đầu tư đã khấu hao hết phần lớn'],
      headwinds: ['Rủi ro lũ quét và bồi lắng lòng hồ vùng cao'],
      nsmoEavSignal: 'Hồ Tuyên Quang và Thác Bà ở hạ lưu đều ghi nhận lưu lượng nước về lớn.',
    },
  },

  // 20. NED
  {
    ticker: 'NED',
    name: 'CTCP Đầu tư và Phát triển Điện Tây Bắc',
    exchange: 'UPCoM',
    category: 'Thủy điện vừa & nhỏ',
    avatarColor: '#047857',
    marketCap: 380,
    pe: 11.5,
    peAdjusted: 11.2,
    pb: 0.9,
    dividendYield: 5.0,
    currentPrice: 9.2,
    totalCapacityMW: 40,
    pricingMechanism: 'Biểu giá Chi phí tránh được',
    eavTrackingChannel: 'Lưu vực sông Đà, hồ Sơn La trên EAV',
    nsmoTrackingChannel: 'Sản lượng thủy điện Tây Bắc',
    powerPlants: [
      { name: 'Nậm Chim 1', capacityMW: 16, location: 'Sơn La', type: 'Thủy điện', basinOrFuel: 'Sông Đà', pricingType: 'Biểu giá tránh được (ACT)', estSellingPrice: 1150, priceNote: 'Theo Biểu giá ACT (EAV), tối ưu xả nước vào giờ cao điểm ~2.800 đ/kWh' },
      { name: 'Nậm Chim 1A', capacityMW: 10, location: 'Sơn La', type: 'Thủy điện', basinOrFuel: 'Sông Đà', pricingType: 'Biểu giá tránh được (ACT)', estSellingPrice: 1150, priceNote: 'Theo Biểu giá ACT (EAV), tối ưu xả nước vào giờ cao điểm ~2.800 đ/kWh' },
      { name: 'Suối Chăn 2', capacityMW: 14, location: 'Lào Cai', type: 'Thủy điện', basinOrFuel: 'Sông Chăn', pricingType: 'Biểu giá tránh được (ACT)', estSellingPrice: 1150, priceNote: 'Theo Biểu giá ACT (EAV), tối ưu xả nước vào giờ cao điểm ~2.800 đ/kWh' },
    ],
    q3Forecast: {
      rating: 'KHẢ QUAN',
      ratingBadgeColor: 'cyan',
      revenueEst: 55,
      profitEst: 16,
      revenueGrowthYoY: 12.0,
      profitGrowthYoY: 25.0,
      drivers: ['Thủy văn Tây Bắc thuận lợi trong quý 3', 'Nhà máy vận hành ổn định'],
      headwinds: ['Gánh nặng chi phí lãi vay đầu tư dự án'],
      nsmoEavSignal: 'Dòng chảy Tây Bắc mạnh mẽ, hồ Sơn La tích nước nhanh.',
    },
  },

  // 21. SEB
  {
    ticker: 'SEB',
    name: 'CTCP Đầu tư và Phát triển Điện Miền Trung',
    exchange: 'HNX',
    category: 'Thủy điện vừa & nhỏ',
    avatarColor: '#0f766e',
    marketCap: 620,
    pe: 9.0,
    peAdjusted: 9.0,
    pb: 1.4,
    dividendYield: 9.5,
    currentPrice: 20.0,
    totalCapacityMW: 26,
    pricingMechanism: 'Biểu giá Chi phí tránh được',
    eavTrackingChannel: 'Lưu vực sông Thạch Hãn, hồ Quảng Trị trên EAV',
    nsmoTrackingChannel: 'Sản lượng thủy điện miền Trung',
    powerPlants: [
      { name: 'Đa Krông 3', capacityMW: 8, location: 'Quảng Trị', type: 'Thủy điện', basinOrFuel: 'Sông Đa Krông', pricingType: 'Biểu giá tránh được (ACT)', estSellingPrice: 1150, priceNote: 'Theo Biểu giá ACT (EAV), tối ưu xả nước vào giờ cao điểm ~2.800 đ/kWh' },
      { name: 'Nậm Biền', capacityMW: 10, location: 'Lào Cai', type: 'Thủy điện', basinOrFuel: 'Suối Nậm Biền', pricingType: 'Biểu giá tránh được (ACT)', estSellingPrice: 1150, priceNote: 'Theo Biểu giá ACT (EAV), tối ưu xả nước vào giờ cao điểm ~2.800 đ/kWh' },
      { name: 'Cụm thủy điện nhỏ', capacityMW: 8, location: 'Miền Trung', type: 'Thủy điện', basinOrFuel: 'Suối nhỏ', pricingType: 'Biểu giá tránh được (ACT)', estSellingPrice: 1150, priceNote: 'Theo Biểu giá ACT (EAV), tối ưu xả nước vào giờ cao điểm ~2.800 đ/kWh' },
    ],
    q3Forecast: {
      rating: 'KHẢ QUAN',
      ratingBadgeColor: 'cyan',
      revenueEst: 42,
      profitEst: 18,
      revenueGrowthYoY: 14.0,
      profitGrowthYoY: 28.0,
      drivers: ['Mùa mưa bão miền Trung bước vào giai đoạn đỉnh điểm', 'Chi phí vận hành thấp'],
      headwinds: ['Hồ chứa nhỏ, không tích trữ được nước lâu dài'],
      nsmoEavSignal: 'Hồ Quảng Trị trên EAV lưu lượng về ổn định.',
    },
  },

  // 22. EIC
  {
    ticker: 'EIC',
    name: 'CTCP Đầu tư EVN Quốc tế',
    exchange: 'UPCoM',
    category: 'Thủy điện lớn',
    avatarColor: '#1d4ed8',
    marketCap: 720,
    pe: 10.8,
    peAdjusted: 9.7,
    pb: 1.1,
    dividendYield: 6.5,
    currentPrice: 20.2,
    totalCapacityMW: 400, // Hạ Sê San 2
    pricingMechanism: 'Hợp đồng PPA bán điện cho EDC (Campuchia) và EVN',
    eavTrackingChannel: 'Theo dõi chuỗi hồ Sê San trên EAV: Ialy, Pleikrông, Sê San 3, 3A, 4',
    nsmoTrackingChannel: 'Nhập khẩu điện từ Campuchia trên NSMO',
    cascadeRole: 'Hạ lưu bậc thang quốc tế: nằm trên sông Sê San tại Campuchia, đón toàn bộ nước xả từ chuỗi 5 hồ Sê San của Việt Nam',
    powerPlants: [
      { name: 'Hạ Sê San 2 (Campuchia)', capacityMW: 400, location: 'Stung Treng, Campuchia', type: 'Thủy điện', basinOrFuel: 'Sông Sê San (hạ lưu Ialy & Sê San 4)', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 890, priceNote: 'Tỷ lệ alpha PPA ~75-85%, phần vượt PPA chào giá theo biên SMP sàn NSMO' },
    ],
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG TÍCH CỰC',
      ratingBadgeColor: 'emerald',
      revenueEst: 85,
      profitEst: 32,
      revenueGrowthYoY: 15.0,
      profitGrowthYoY: 35.0,
      drivers: ['Toàn bộ chuỗi hồ thủy điện Tây Nguyên xả nước đổ về lưu vực Hạ Sê San', 'Dòng tiền cổ tức ngoại tệ đều đặn'],
      headwinds: ['Biến động tỷ giá USD và chính sách thị trường điện Campuchia'],
      nsmoEavSignal: 'Các hồ Pleikrông, Ialy, Sê San 3, 4 trên EAV đều có lượng xả qua máy và nước về đạt đỉnh.',
    },
  },

  // 23. BSA
  {
    ticker: 'BSA',
    name: 'CTCP Thủy điện Buôn Đôn',
    exchange: 'UPCoM',
    category: 'Thủy điện vừa & nhỏ',
    avatarColor: '#0284c7',
    marketCap: 890,
    pe: 8.5,
    peAdjusted: 9.2,
    pb: 1.2,
    dividendYield: 10.0,
    currentPrice: 15.5,
    totalCapacityMW: 64,
    pricingMechanism: 'PPA + CGM',
    eavTrackingChannel: 'Theo dõi nước xả hồ Srêpốk 3 và Buôn Kuốp trên EAV',
    nsmoTrackingChannel: 'Sản lượng thủy điện Tây Nguyên',
    cascadeRole: 'Hạ lưu bậc thang trực tiếp: nằm ngay dưới Srêpốk 3, đón 100% nước xả máy để phát điện',
    powerPlants: [
      { name: 'Srepok 4A', capacityMW: 64, location: 'Đắk Lắk', type: 'Thủy điện', basinOrFuel: 'Sông Srêpốk (dưới chân Srêpốk 3)', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 1050, priceNote: 'Hợp đồng PPA dài hạn với EVN, linh hoạt điều độ giờ phụ tải cao' },
    ],
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG MẠNH',
      ratingBadgeColor: 'emerald',
      revenueEst: 110,
      profitEst: 48,
      revenueGrowthYoY: 24.0,
      profitGrowthYoY: 52.0,
      drivers: ['Srêpốk 3 xả bao nhiêu nước thì BSA phát bấy nhiêu, chi phí vận hành cực thấp', 'Cổ tức tiền mặt 10-12% rất hấp dẫn'],
      headwinds: ['Hoàn toàn phụ thuộc vào lịch điều độ chạy máy của GENCO 3 tại Srêpốk 3'],
      nsmoEavSignal: 'Hồ Srêpốk 3 trên EAV mực nước 270.4m (Hdbt 272m), Qve 429 m3/s, xả máy liên tục.',
    },
  },

  // 24. REE
  {
    ticker: 'REE',
    name: 'CTCP Cơ Điện Lạnh',
    exchange: 'HOSE',
    category: 'Năng lượng tái tạo & Đa ngành',
    avatarColor: '#2563eb',
    marketCap: 28900,
    pe: 11.5,
    peAdjusted: 12.2,
    pb: 1.6,
    dividendYield: 3.5,
    currentPrice: 65.5,
    totalCapacityMW: 1250, // Sở hữu gián tiếp qua công ty con/liên kết
    pricingMechanism: 'Đa dạng (PPA FIT, CGM, Chi phí tránh được, Điện than)',
    eavTrackingChannel: 'Theo dõi toàn bộ 6 hồ lớn: Thượng Kon Tum, Vĩnh Sơn, Sông Hinh, Thác Mơ, Thác Bà, Sông Ba Hạ',
    nsmoTrackingChannel: 'Sản lượng khối JSC và sản lượng ĐMT mái nhà toàn quốc trên NSMO',
    powerPlants: [
      { name: 'VSH (Thượng Kon Tum, Sông Hinh, Vĩnh Sơn)', capacityMW: 356, location: 'Bình Định / Kon Tum', type: 'Thủy điện', basinOrFuel: 'Chi phối 50.5%', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 1120, priceNote: 'PPA thỏa thuận bù đắp suất đầu tư lớn, cột nước cao 840m biên lãi vượt trội' },
      { name: 'TMP (Thác Mơ)', capacityMW: 275, location: 'Bình Phước', type: 'Thủy điện', basinOrFuel: 'Sở hữu 43%', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 710, priceNote: 'Đã hết khấu hao tổ máy chính, chi phí tiền mặt cực thấp ~150 đ/kWh' },
      { name: 'TBC (Thác Bà)', capacityMW: 120, location: 'Yên Bái', type: 'Thủy điện', basinOrFuel: 'Sở hữu 60%', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 890, priceNote: 'Tỷ lệ alpha PPA ~75-85%, phần vượt PPA chào giá theo biên SMP sàn NSMO' },
      { name: 'SBH (Sông Ba Hạ)', capacityMW: 220, location: 'Phú Yên', type: 'Thủy điện', basinOrFuel: 'Sở hữu 25%', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 760, priceNote: 'Hết khấu hao phần lớn, hồ điều tiết năm tích nước chào giá NSMO cao' },
      { name: 'Điện gió Trà Vinh & Lợi Hải 2', capacityMW: 78, location: 'Trà Vinh / Ninh Thuận', type: 'Điện Gió', basinOrFuel: 'Gió ven biển & trên bờ', pricingType: 'Giá FiT Gió (8.5 US cents)', estSellingPrice: 2190, priceNote: 'Cố định 20 năm theo QĐ 39/2018/QĐ-TTg cho điện gió trên bờ' },
      { name: 'Điện mặt trời mái nhà REE PRO', capacityMW: 145, location: 'Toàn quốc', type: 'Điện Mặt Trời', basinOrFuel: 'Mái nhà KCN', pricingType: 'Giá FiT 1 (9.35 US cents)', estSellingPrice: 2390, priceNote: 'Cố định 20 năm theo QĐ của Thủ tướng' },
    ],
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG MẠNH',
      ratingBadgeColor: 'emerald',
      revenueEst: 2650,
      profitEst: 720,
      revenueGrowthYoY: 22.5,
      profitGrowthYoY: 65.0,
      drivers: ['Mảng thủy điện bùng nổ khi cả 4 cỗ máy in tiền VSH, TMP, TBC, SBH đều vào đỉnh lũ', 'ĐMT mái nhà tạo dòng tiền ổn định không bị cắt giảm'],
      headwinds: ['Mảng cơ điện M&E tăng trưởng chậm do thị trường bất động sản'],
      nsmoEavSignal: 'Toàn bộ danh mục hồ thủy điện liên kết của REE trên EAV đều đạt tỷ lệ tích nước trên 90%.',
    },
  },

  // 25. GEG
  {
    ticker: 'GEG',
    name: 'CTCP Điện Gia Lai',
    exchange: 'HOSE',
    category: 'Năng lượng tái tạo & Đa ngành',
    avatarColor: '#16a34a',
    marketCap: 4100,
    pe: 16.5,
    peAdjusted: 14.4,
    pb: 1.1,
    dividendYield: 4.0,
    currentPrice: 12.5,
    totalCapacityMW: 450,
    pricingMechanism: 'Giá FIT ưu đãi + Giá chuyển tiếp',
    eavTrackingChannel: 'Khung giá chuyển tiếp NLTT của EAV, cơ chế DPPA',
    nsmoTrackingChannel: 'Sản lượng điện gió và mặt trời (GetTongHopSanLuongNltt) trên NSMO',
    powerPlants: [
      { name: 'Điện gió Tân Phú Đông 1 & 2', capacityMW: 150, location: 'Tiền Giang', type: 'Điện Gió', basinOrFuel: 'Gió gần bờ', pricingType: 'Giá FiT Gió (8.5 US cents)', estSellingPrice: 2190, priceNote: 'Cố định 20 năm theo QĐ 39/2018/QĐ-TTg cho điện gió trên bờ' },
      { name: 'Điện gió Ia Bang 1', capacityMW: 50, location: 'Gia Lai', type: 'Điện Gió', basinOrFuel: 'Gió trên bờ', pricingType: 'Giá FiT Gió (8.5 US cents)', estSellingPrice: 2190, priceNote: 'Cố định 20 năm theo QĐ 39/2018/QĐ-TTg cho điện gió trên bờ' },
      { name: 'ĐMT TTC Krông Pa, Phong Điền, Trúc Sơn', capacityMW: 160, location: 'Gia Lai / Thừa Thiên Huế', type: 'Điện Mặt Trời', basinOrFuel: 'Mặt trời farm', pricingType: 'Giá FiT 1 (9.35 US cents)', estSellingPrice: 2390, priceNote: 'Cố định 20 năm theo QĐ của Thủ tướng' },
      { name: 'Cụm thủy điện GHC', capacityMW: 85.5, location: 'Gia Lai', type: 'Thủy điện', basinOrFuel: 'Suối Tây Nguyên', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 1050, priceNote: 'Hợp đồng PPA dài hạn với EVN, linh hoạt điều độ giờ phụ tải cao' },
    ],
    q3Forecast: {
      rating: 'KHẢ QUAN',
      ratingBadgeColor: 'cyan',
      revenueEst: 640,
      profitEst: 78,
      revenueGrowthYoY: 16.0,
      profitGrowthYoY: 28.0,
      drivers: ['Cụm thủy điện GHC bù đắp mạnh mẽ vào mùa mưa', 'Gió mùa Tây Nam giúp điện gió Tân Phú Đông phát tốt'],
      headwinds: ['Chi phí lãi vay dự án điện gió lớn, nguy cơ nghẽn lưới giờ trưa'],
      nsmoEavSignal: 'Sản lượng điện gió trên NSMO cải thiện đáng kể trong các tháng gió mùa.',
    },
  },

  // 26. HDG
  {
    ticker: 'HDG',
    name: 'CTCP Tập đoàn Hà Đô',
    exchange: 'HOSE',
    category: 'Năng lượng tái tạo & Đa ngành',
    avatarColor: '#059669',
    marketCap: 8650,
    pe: 11.8,
    peAdjusted: 12.6,
    pb: 1.4,
    dividendYield: 4.5,
    currentPrice: 28.2,
    totalCapacityMW: 462,
    pricingMechanism: 'PPA FIT + CGM + Thủy điện',
    eavTrackingChannel: 'Lưu vực hồ A Vương, Sông Bung 2, 4 trên EAV (chung lưu vực Đăk Mi 4, Sông Tranh 4)',
    nsmoTrackingChannel: 'Sản lượng thủy điện & NLTT miền Trung trên NSMO',
    powerPlants: [
      { name: 'Thủy điện Đăk Mi 4', capacityMW: 148, location: 'Quảng Nam', type: 'Thủy điện', basinOrFuel: 'Sông Đăk Mi (cùng lưu vực A Vương)', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 890, priceNote: 'Tỷ lệ alpha PPA ~75-85%, phần vượt PPA chào giá theo biên SMP sàn NSMO' },
      { name: 'Thủy điện Sông Tranh 4', capacityMW: 48, location: 'Quảng Nam', type: 'Thủy điện', basinOrFuel: 'Sông Tranh', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 1050, priceNote: 'Hợp đồng PPA dài hạn với EVN, linh hoạt điều độ giờ phụ tải cao' },
      { name: 'Thủy điện Za Hưng & Nậm Pông', capacityMW: 60, location: 'Quảng Nam / Nghệ An', type: 'Thủy điện', basinOrFuel: 'Suối nhỏ', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 1050, priceNote: 'Hợp đồng PPA dài hạn với EVN, linh hoạt điều độ giờ phụ tải cao' },
      { name: 'Điện gió 7A Thuận Nam', capacityMW: 50, location: 'Ninh Thuận', type: 'Điện Gió', basinOrFuel: 'Gió trên bờ', pricingType: 'Giá FiT Gió (8.5 US cents)', estSellingPrice: 2190, priceNote: 'Cố định 20 năm theo QĐ 39/2018/QĐ-TTg cho điện gió trên bờ' },
      { name: 'ĐMT Hồng Phong 4 & Infra 1', capacityMW: 98, location: 'Bình Thuận / Ninh Thuận', type: 'Điện Mặt Trời', basinOrFuel: 'Mặt trời farm', pricingType: 'Giá FiT 1 (9.35 US cents)', estSellingPrice: 2390, priceNote: 'Cố định 20 năm theo QĐ của Thủ tướng' },
    ],
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG TÍCH CỰC',
      ratingBadgeColor: 'emerald',
      revenueEst: 880,
      profitEst: 260,
      revenueGrowthYoY: 21.0,
      profitGrowthYoY: 46.0,
      drivers: ['Mảng năng lượng đóng góp >70% lợi nhuận, Đăk Mi 4 và Sông Tranh 4 vào đỉnh lũ', 'Điện gió 7A phát huy hiệu quả'],
      headwinds: ['Vướng mắc thanh tra pháp lý ĐMT Hồng Phong 4 (đang hoàn thiện hồ sơ)'],
      nsmoEavSignal: 'Các hồ Quảng Nam (A Vương, Sông Bung) trên EAV lưu lượng về lớn báo hiệu Đăk Mi 4 phát tối đa.',
    },
  },

  // 27. TTA
  {
    ticker: 'TTA',
    name: 'CTCP Đầu tư Xây dựng & Phát triển Trường Thành',
    exchange: 'HOSE',
    category: 'Năng lượng tái tạo & Đa ngành',
    avatarColor: '#d97706',
    marketCap: 1250,
    pe: 12.0,
    peAdjusted: 11.5,
    pb: 0.85,
    dividendYield: 4.0,
    currentPrice: 8.5,
    totalCapacityMW: 194.4,
    pricingMechanism: 'PPA FIT ĐMT + Biểu giá chi phí tránh được',
    eavTrackingChannel: 'Lưu vực sông Chảy / Thác Bà trên EAV, biểu giá chi phí tránh được',
    nsmoTrackingChannel: 'Sản lượng thủy điện Tây Bắc và ĐMT Ninh Thuận',
    powerPlants: [
      { name: 'Thủy điện Ngòi Hút 2 & 2A', capacityMW: 56.4, location: 'Yên Bái', type: 'Thủy điện', basinOrFuel: 'Ngòi Hút', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 1050, priceNote: 'Hợp đồng PPA dài hạn với EVN, linh hoạt điều độ giờ phụ tải cao' },
      { name: 'Thủy điện Pá Hu', capacityMW: 26, location: 'Yên Bái', type: 'Thủy điện', basinOrFuel: 'Suối Pá Hu', pricingType: 'Biểu giá tránh được (ACT)', estSellingPrice: 1150, priceNote: 'Theo Biểu giá ACT (EAV), tối ưu xả nước vào giờ cao điểm ~2.800 đ/kWh' },
      { name: 'ĐMT Bàu Ngứ & Hồ Núi Một', capacityMW: 112, location: 'Ninh Thuận', type: 'Điện Mặt Trời', basinOrFuel: 'Mặt trời farm', pricingType: 'Giá FiT 1 (9.35 US cents)', estSellingPrice: 2390, priceNote: 'Cố định 20 năm theo QĐ của Thủ tướng' },
    ],
    q3Forecast: {
      rating: 'KHẢ QUAN',
      ratingBadgeColor: 'cyan',
      revenueEst: 145,
      profitEst: 42,
      revenueGrowthYoY: 15.0,
      profitGrowthYoY: 30.0,
      drivers: ['Thủy điện Ngòi Hút và Pá Hu tại Yên Bái đón mùa mưa miền Bắc', 'ĐMT vận hành ổn định'],
      headwinds: ['Nợ vay đầu tư xây dựng dự án còn cao'],
      nsmoEavSignal: 'Thủy văn vùng núi Yên Bái nhiều mưa, các hồ tích nước tốt.',
    },
  },

  // 28. SBH
  {
    ticker: 'SBH',
    name: 'CTCP Thủy điện Sông Ba Hạ',
    exchange: 'UPCoM',
    category: 'Thủy điện lớn',
    avatarColor: '#0284c7',
    marketCap: 5200,
    pe: 8.9,
    peAdjusted: 9.7,
    pb: 2.1,
    dividendYield: 12.0,
    currentPrice: 42.0,
    totalCapacityMW: 220,
    pricingMechanism: 'PPA + CGM',
    eavTrackingChannel: 'Theo dõi trực tiếp hồ Sông Ba Hạ trên bảng EAV',
    nsmoTrackingChannel: 'Sản lượng thủy điện miền Trung và giá SMP',
    powerPlants: [
      { name: 'Sông Ba Hạ', capacityMW: 220, location: 'Phú Yên', type: 'Thủy điện', basinOrFuel: 'Sông Ba (hạ lưu Krông H\'năng)' },
    ],
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG MẠNH',
      ratingBadgeColor: 'emerald',
      revenueEst: 310,
      profitEst: 165,
      revenueGrowthYoY: 35.0,
      profitGrowthYoY: 72.0,
      drivers: ['Quý 3-4 là thời điểm thu hoạch vàng của Sông Ba Hạ', 'Cổ tức tiền mặt luôn ở mức 30-40% mệnh giá'],
      headwinds: ['Kiểm soát lưu lượng xả lũ về vùng đồng bằng Tuy Hòa'],
      nsmoEavSignal: 'Hồ Sông Ba Hạ trên EAV đạt mực nước 101.7m (Hdbt 105m), Qve đạt 387 m3/s, xả máy liên tục.',
    },
  },

  // 29. HPD
  {
    ticker: 'HPD',
    name: 'CTCP Thủy điện Đắk Đrinh (công ty con POW)',
    exchange: 'UPCoM',
    category: 'Thủy điện lớn',
    avatarColor: '#0369a1',
    marketCap: 1550,
    pe: 9.8,
    peAdjusted: 9.1,
    pb: 1.3,
    dividendYield: 8.5,
    currentPrice: 18.0,
    totalCapacityMW: 125,
    pricingMechanism: 'PPA + CGM',
    eavTrackingChannel: 'Lưu vực sông Trà Khúc / Kon Tum (gần Thượng Kon Tum trên EAV)',
    nsmoTrackingChannel: 'Sản lượng nhóm PVN trên NSMO',
    powerPlants: [
      { name: 'Đắk Đrinh', capacityMW: 125, location: 'Quảng Ngãi / Kon Tum', type: 'Thủy điện', basinOrFuel: 'Sông Đắk Đrinh', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 890, priceNote: 'Tỷ lệ alpha PPA ~75-85%, phần vượt PPA chào giá theo biên SMP sàn NSMO' },
    ],
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG TÍCH CỰC',
      ratingBadgeColor: 'emerald',
      revenueEst: 175,
      profitEst: 72,
      revenueGrowthYoY: 22.0,
      profitGrowthYoY: 55.0,
      drivers: ['Đóng góp tỷ trọng lợi nhuận lớn cho POW trong mùa mưa', 'Hồ chứa dung tích lớn điều tiết nhiều năm'],
      headwinds: ['Chi phí lãi vay dài hạn đang trong kỳ thanh toán'],
      nsmoEavSignal: 'Mưa lớn tại dải Nam Trung Bộ - Tây Nguyên giúp hồ Đắk Đrinh đầy nước.',
    },
  },

  // 30. GSM
  {
    ticker: 'GSM',
    name: 'CTCP Thủy điện Hương Sơn',
    exchange: 'UPCoM',
    category: 'Thủy điện vừa & nhỏ',
    avatarColor: '#047857',
    marketCap: 450,
    pe: 8.6,
    peAdjusted: 10.1,
    pb: 1.2,
    dividendYield: 9.0,
    currentPrice: 15.8,
    totalCapacityMW: 33,
    pricingMechanism: 'PPA + CGM',
    eavTrackingChannel: 'Lưu vực Bắc Trung Bộ (gần hồ Bản Vẽ, Khe Bố trên EAV)',
    nsmoTrackingChannel: 'Sản lượng thủy điện Bắc Trung Bộ',
    powerPlants: [
      { name: 'Hương Sơn 1', capacityMW: 33, location: 'Hà Tĩnh', type: 'Thủy điện', basinOrFuel: 'Sông Rào Mỹ', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 1050, priceNote: 'Hợp đồng PPA dài hạn với EVN, linh hoạt điều độ giờ phụ tải cao' },
    ],
    q3Forecast: {
      rating: 'KHẢ QUAN',
      ratingBadgeColor: 'cyan',
      revenueEst: 52,
      profitEst: 22,
      revenueGrowthYoY: 15.0,
      profitGrowthYoY: 32.0,
      drivers: ['Hà Tĩnh mưa bão nhiều vào quý 3, nước về hồ dồi dào', 'Biên lãi gộp cao >55%'],
      headwinds: ['Rủi ro thiên tai lũ quét vùng núi cao Hà Tĩnh'],
      nsmoEavSignal: 'Lưu vực Nghệ An - Hà Tĩnh mưa dồn dập, hồ Khe Bố và Bản Vẽ đều tăng lưu lượng.',
    },
  },

  // 31. SJE
  {
    ticker: 'SJE',
    name: 'CTCP Sông Đà 11',
    exchange: 'HNX',
    category: 'Thủy điện vừa & nhỏ',
    avatarColor: '#065f46',
    marketCap: 680,
    pe: 9.8,
    peAdjusted: 10.4,
    pb: 1.0,
    dividendYield: 6.0,
    currentPrice: 28.0,
    totalCapacityMW: 24,
    pricingMechanism: 'Biểu giá Chi phí tránh được',
    eavTrackingChannel: 'Lưu vực hồ Sơn La trên EAV',
    nsmoTrackingChannel: 'Sản lượng thủy điện nhỏ Tây Bắc',
    powerPlants: [
      { name: 'To Buông & Nậm Hóa 1, 2', capacityMW: 24, location: 'Sơn La', type: 'Thủy điện', basinOrFuel: 'Sông Nậm Hóa', pricingType: 'Biểu giá tránh được (ACT)', estSellingPrice: 1150, priceNote: 'Theo Biểu giá ACT (EAV), tối ưu xả nước vào giờ cao điểm ~2.800 đ/kWh' },
    ],
    q3Forecast: {
      rating: 'KHẢ QUAN',
      ratingBadgeColor: 'cyan',
      revenueEst: 280, // Gồm xây lắp + điện
      profitEst: 32,
      revenueGrowthYoY: 18.0,
      profitGrowthYoY: 25.0,
      drivers: ['Mảng bán điện mang lại biên lợi nhuận cao bù đắp cho xây lắp', 'Đường dây 500kV mạch 3 hoàn thành giải tỏa công suất'],
      headwinds: ['Khoản phải thu mảng xây lắp đường dây'],
      nsmoEavSignal: 'Thủy văn Sơn La thuận lợi, phát huy tối đa công suất 3 cụm nhà máy.',
    },
  },

  // 32. SD9
  {
    ticker: 'SD9',
    name: 'CTCP Sông Đà 9',
    exchange: 'HNX',
    category: 'Thủy điện vừa & nhỏ',
    avatarColor: '#0f766e',
    marketCap: 320,
    pe: 14.0,
    peAdjusted: 12.2,
    pb: 0.8,
    dividendYield: 4.0,
    currentPrice: 9.5,
    totalCapacityMW: 42,
    pricingMechanism: 'Biểu giá Chi phí tránh được',
    eavTrackingChannel: 'Lưu vực hồ Tuyên Quang / Thác Bà trên EAV',
    nsmoTrackingChannel: 'Sản lượng thủy điện miền Bắc',
    powerPlants: [
      { name: 'Thủy điện Sông Bạc', capacityMW: 42, location: 'Hà Giang', type: 'Thủy điện', basinOrFuel: 'Sông Bạc (chi lưu sông Lô)', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 1050, priceNote: 'Hợp đồng PPA dài hạn với EVN, linh hoạt điều độ giờ phụ tải cao' },
    ],
    q3Forecast: {
      rating: 'KHẢ QUAN',
      ratingBadgeColor: 'cyan',
      revenueEst: 110,
      profitEst: 14,
      revenueGrowthYoY: 10.0,
      profitGrowthYoY: 22.0,
      drivers: ['Thủy điện Sông Bạc (42MW) tạo dòng tiền lợi nhuận cốt lõi', 'Mùa mưa Đông Bắc'],
      headwinds: ['Chi phí tài chính vay nợ xây lắp'],
      nsmoEavSignal: 'Hồ Tuyên Quang ở hạ nguồn ghi nhận dòng chảy thượng nguồn dồi dào.',
    },
  },

  // 33. SD3
  {
    ticker: 'SD3',
    name: 'CTCP Sông Đà 3',
    exchange: 'UPCoM',
    category: 'Thủy điện vừa & nhỏ',
    avatarColor: '#115e59',
    marketCap: 180,
    pe: 13.0,
    peAdjusted: 12.8,
    pb: 0.7,
    dividendYield: 0.0,
    currentPrice: 7.2,
    totalCapacityMW: 20,
    pricingMechanism: 'Biểu giá Chi phí tránh được',
    eavTrackingChannel: 'Biểu giá chi phí tránh được EAV',
    nsmoTrackingChannel: 'Sản lượng thủy điện Tây Bắc',
    powerPlants: [
      { name: 'Thủy điện Tà Lơi', capacityMW: 20, location: 'Lào Cai', type: 'Thủy điện', basinOrFuel: 'Suối Tà Lơi', pricingType: 'Biểu giá tránh được (ACT)', estSellingPrice: 1150, priceNote: 'Theo Biểu giá ACT (EAV), tối ưu xả nước vào giờ cao điểm ~2.800 đ/kWh' },
    ],
    q3Forecast: {
      rating: 'ĐI NGANG',
      ratingBadgeColor: 'amber',
      revenueEst: 45,
      profitEst: 5,
      revenueGrowthYoY: 5.0,
      profitGrowthYoY: 10.0,
      drivers: ['Mùa mưa Lào Cai tăng sản lượng phát điện'],
      headwinds: ['Quy mô nhỏ, cơ cấu tài chính cần tái cơ cấu'],
      nsmoEavSignal: 'Sản lượng điện phát ổn định theo con nước.',
    },
  },

  // 34. TV1
  {
    ticker: 'TV1',
    name: 'CTCP Tư vấn Xây dựng Điện 1 (PECC1)',
    exchange: 'UPCoM',
    category: 'Thủy điện vừa & nhỏ',
    avatarColor: '#0284c7',
    marketCap: 590,
    pe: 11.0,
    peAdjusted: 12.0,
    pb: 1.1,
    dividendYield: 6.5,
    currentPrice: 22.0,
    totalCapacityMW: 71.4,
    pricingMechanism: 'PPA + CGM',
    eavTrackingChannel: 'Theo dõi xả nước hồ Sông Bung 2, 4 và A Vương trên EAV',
    nsmoTrackingChannel: 'Sản lượng thủy điện miền Trung',
    cascadeRole: 'Hạ lưu bậc thang sông Bung: Sông Bung 5 đón toàn bộ nước xả máy của Sông Bung 2 và Sông Bung 4',
    powerPlants: [
      { name: 'Thủy điện Sông Bung 5', capacityMW: 57, location: 'Quảng Nam', type: 'Thủy điện', basinOrFuel: 'Sông Bung (hạ lưu Sông Bung 4)', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 1050, priceNote: 'Hợp đồng PPA dài hạn với EVN, linh hoạt điều độ giờ phụ tải cao' },
      { name: 'Suối Sập 2', capacityMW: 14.4, location: 'Sơn La', type: 'Thủy điện', basinOrFuel: 'Suối Sập', pricingType: 'Biểu giá tránh được (ACT)', estSellingPrice: 1150, priceNote: 'Theo Biểu giá ACT (EAV), tối ưu xả nước vào giờ cao điểm ~2.800 đ/kWh' },
    ],
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG TÍCH CỰC',
      ratingBadgeColor: 'emerald',
      revenueEst: 165, // Gồm tư vấn + bán điện
      profitEst: 35,
      revenueGrowthYoY: 18.5,
      profitGrowthYoY: 42.0,
      drivers: ['Sông Bung 5 (57MW) tạo ra dòng tiền bền bỉ từ nước xả của các hồ mẹ EVN', 'Mảng tư vấn thiết kế điện hưởng lợi từ Quy hoạch Điện 8'],
      headwinds: ['Chi phí khấu hao dự án Sông Bung 5'],
      nsmoEavSignal: 'Hồ Sông Bung 4 trên EAV lưu lượng về 528 m3/s, xả máy cung cấp nước cho Sông Bung 5.',
    },
  },

  // 35. S55
  {
    ticker: 'S55',
    name: 'CTCP Sông Đà 505',
    exchange: 'HNX',
    category: 'Thủy điện vừa & nhỏ',
    avatarColor: '#0d9488',
    marketCap: 210,
    pe: 9.0,
    peAdjusted: 8.9,
    pb: 0.85,
    dividendYield: 8.0,
    currentPrice: 21.0,
    totalCapacityMW: 15.2,
    pricingMechanism: 'Biểu giá Chi phí tránh được',
    eavTrackingChannel: 'Lưu vực sông Sê San, hồ Pleikrông trên EAV',
    nsmoTrackingChannel: 'Sản lượng thủy điện Tây Nguyên',
    powerPlants: [
      { name: 'Ia Đrăng 2 & Đăk Pru', capacityMW: 15.2, location: 'Gia Lai / Kon Tum', type: 'Thủy điện', basinOrFuel: 'Sông Ia Đrăng', pricingType: 'Biểu giá tránh được (ACT)', estSellingPrice: 1150, priceNote: 'Theo Biểu giá ACT (EAV), tối ưu xả nước vào giờ cao điểm ~2.800 đ/kWh' },
    ],
    q3Forecast: {
      rating: 'KHẢ QUAN',
      ratingBadgeColor: 'cyan',
      revenueEst: 38,
      profitEst: 12,
      revenueGrowthYoY: 12.0,
      profitGrowthYoY: 22.0,
      drivers: ['Doanh thu bán điện ổn định, chi phí khấu hao thấp'],
      headwinds: ['Quy mô vốn nhỏ, thanh khoản thấp'],
      nsmoEavSignal: 'Tây Nguyên mưa nhiều, các con suối nhỏ phát hết công suất.',
    },
  },

  // 36. SDT
  {
    ticker: 'SDT',
    name: 'CTCP Sông Đà 10',
    exchange: 'HNX',
    category: 'Thủy điện vừa & nhỏ',
    avatarColor: '#166534',
    marketCap: 360,
    pe: 15.0,
    peAdjusted: 13.8,
    pb: 0.65,
    dividendYield: 3.0,
    currentPrice: 8.4,
    totalCapacityMW: 35, // Sở hữu qua liên kết
    pricingMechanism: 'PPA + CGM',
    eavTrackingChannel: 'Lưu vực hồ Sơn La, Nậm Chiến trên EAV',
    nsmoTrackingChannel: 'Sản lượng thủy điện Tây Bắc',
    powerPlants: [
      { name: 'Thủy điện Nậm Chiến (liên kết)', capacityMW: 200, location: 'Sơn La', type: 'Thủy điện', basinOrFuel: 'Sông Chiến', pricingType: 'Hợp đồng PPA + Sàn CGM', estSellingPrice: 890, priceNote: 'Tỷ lệ alpha PPA ~75-85%, phần vượt PPA chào giá theo biên SMP sàn NSMO' },
    ],
    q3Forecast: {
      rating: 'KHẢ QUAN',
      ratingBadgeColor: 'cyan',
      revenueEst: 120,
      profitEst: 15,
      revenueGrowthYoY: 10.0,
      profitGrowthYoY: 20.0,
      drivers: ['Thủy điện Nậm Chiến vào mùa nước đổ, chia cổ tức liên kết'],
      headwinds: ['Khoản phải thu và nợ đọng xây dựng công trình ngầm'],
      nsmoEavSignal: 'Hồ Sơn La và lưu vực sông Đà tích nước nhanh chóng.',
    },
  },
];

// -------------------------------------------------------------
// DỮ LIỆU THỦY VĂN HỒ CHỨA THỰC TẾ TỪ EAV (hochuathuydien.evn.com.vn)
// -------------------------------------------------------------
export const RESERVOIRS_HYDRO_DATA: ReservoirHydroData[] = [
  {
    lakeName: 'Thác Bà',
    region: 'Đông Bắc Bộ',
    htl: 55.68,
    hdbt: 58.0,
    hc: 46.0,
    waterStoragePercent: 80.7,
    qve: 232.0,
    qxm: 180.0,
    qxt: 0.0,
    ncxs: 0,
    ncxm: 0,
    affectedStocks: [
      { ticker: 'TBC', plantName: 'Thác Bà (120MW)', relationship: 'Trực tiếp sở hữu', note: 'Chủ sở hữu hồ và nhà máy phát điện chính' },
      { ticker: 'REE', plantName: 'TBC', relationship: 'Cổ đông chi phối / liên kết', note: 'REE sở hữu hơn 60% vốn điều lệ TBC' },
      { ticker: 'TTA', plantName: 'Ngòi Hút 2', relationship: 'Hạ lưu bậc thang (hưởng nước xả)', note: 'Cùng lưu vực dòng chảy Yên Bái' },
    ],
  },
  {
    lakeName: 'KHE BỐ',
    region: 'Bắc Trung Bộ',
    htl: 65.0,
    hdbt: 65.0,
    hc: 50.0,
    waterStoragePercent: 100.0,
    qve: 610.1,
    qxm: 122.4,
    qxt: 487.7,
    ncxs: 2,
    ncxm: 0,
    affectedStocks: [
      { ticker: 'VPD', plantName: 'Khe Bố (100MW)', relationship: 'Trực tiếp sở hữu', note: 'Hồ đạt 100% dung tích, xả qua máy tối đa 122.4 m3/s và xả tràn' },
      { ticker: 'GSM', plantName: 'Hương Sơn 1', relationship: 'Cổ đông chi phối / liên kết', note: 'Cùng dải thủy văn đón mưa lũ Nghệ An - Hà Tĩnh' },
    ],
  },
  {
    lakeName: 'Vĩnh Sơn A',
    region: 'Duyên Hải Nam Trung Bộ',
    htl: 767.4,
    hdbt: 770.0,
    hc: 755.0,
    waterStoragePercent: 82.7,
    qve: 1.43,
    qxm: 1.2,
    qxt: 0.0,
    ncxs: 0,
    ncxm: 0,
    affectedStocks: [
      { ticker: 'VSH', plantName: 'Vĩnh Sơn (66MW)', relationship: 'Trực tiếp sở hữu', note: 'Cột nước cao, hồ tích nước an toàn' },
      { ticker: 'REE', plantName: 'VSH', relationship: 'Cổ đông chi phối / liên kết', note: 'REE sở hữu trên 50% vốn VSH' },
    ],
  },
  {
    lakeName: 'Thượng Kon Tum',
    region: 'Tây Nguyên',
    htl: 1149.75,
    hdbt: 1160.0,
    hc: 1138.0,
    waterStoragePercent: 53.4,
    qve: 26.33,
    qxm: 25.0,
    qxt: 0.0,
    ncxs: 0,
    ncxm: 0,
    affectedStocks: [
      { ticker: 'VSH', plantName: 'Thượng Kon Tum (220MW)', relationship: 'Trực tiếp sở hữu', note: 'Cột nước khổng lồ 840m, chỉ cần 25-30 m3/s là phát full 220MW' },
      { ticker: 'REE', plantName: 'VSH', relationship: 'Cổ đông chi phối / liên kết', note: 'Đóng góp lợi nhuận đột biến nhất cho danh mục năng lượng của REE' },
      { ticker: 'HPD', plantName: 'Đắk Đrinh', relationship: 'Hạ lưu bậc thang (hưởng nước xả)', note: 'Đón dòng nước chuyển lưu vực từ sông Đắk Nghé sang Trà Khúc' },
    ],
  },
  {
    lakeName: 'Sông Hinh',
    region: 'Duyên Hải Nam Trung Bộ',
    htl: 198.32,
    hdbt: 209.0,
    hc: 196.0,
    waterStoragePercent: 17.8,
    qve: 15.98,
    qxm: 14.5,
    qxt: 0.0,
    ncxs: 0,
    ncxm: 0,
    affectedStocks: [
      { ticker: 'VSH', plantName: 'Sông Hinh (70MW)', relationship: 'Trực tiếp sở hữu', note: 'Đang tích nước đón lũ đỉnh điểm tháng 10 - 11' },
      { ticker: 'REE', plantName: 'VSH', relationship: 'Cổ đông chi phối / liên kết', note: 'Hưởng lợi trọn vẹn' },
    ],
  },
  {
    lakeName: 'Sông Ba Hạ',
    region: 'Duyên Hải Nam Trung Bộ',
    htl: 101.73,
    hdbt: 105.0,
    hc: 101.0,
    waterStoragePercent: 18.2,
    qve: 387.0,
    qxm: 78.0,
    qxt: 0.0,
    ncxs: 0,
    ncxm: 0,
    affectedStocks: [
      { ticker: 'SBH', plantName: 'Sông Ba Hạ (220MW)', relationship: 'Trực tiếp sở hữu', note: 'Qve tăng vọt 387 m3/s, nhà máy bắt đầu chạy máy dồn dập' },
      { ticker: 'REE', plantName: 'SBH', relationship: 'Cổ đông chi phối / liên kết', note: 'REE sở hữu 25% vốn' },
      { ticker: 'SBA', plantName: 'Krông H\'năng', relationship: 'Hạ lưu bậc thang (hưởng nước xả)', note: 'Cùng lưu vực dòng sông Ba đón mưa lũ' },
    ],
  },
  {
    lakeName: 'Thác Mơ',
    region: 'Đông Nam Bộ',
    htl: 215.46,
    hdbt: 218.0,
    hc: 198.0,
    waterStoragePercent: 87.3,
    qve: 324.38,
    qxm: 185.0,
    qxt: 0.0,
    ncxs: 0,
    ncxm: 0,
    affectedStocks: [
      { ticker: 'TMP', plantName: 'Thác Mơ (225MW)', relationship: 'Trực tiếp sở hữu', note: 'Hồ tích nước đạt 87%, nước về 324 m3/s, chạy full tải 2 tổ máy' },
      { ticker: 'SJD', plantName: 'Cần Đơn (57.6MW)', relationship: 'Hạ lưu bậc thang (hưởng nước xả)', note: 'Đón 100% nước xả máy 185 m3/s của Thác Mơ chảy xuống' },
      { ticker: 'REE', plantName: 'TMP', relationship: 'Cổ đông chi phối / liên kết', note: 'REE sở hữu 43% vốn TMP' },
    ],
  },
  {
    lakeName: 'Srêpốk 3',
    region: 'Tây Nguyên',
    htl: 270.44,
    hdbt: 272.0,
    hc: 268.0,
    waterStoragePercent: 61.0,
    qve: 429.0,
    qxm: 280.0,
    qxt: 0.0,
    ncxs: 0,
    ncxm: 0,
    affectedStocks: [
      { ticker: 'PGV', plantName: 'Srêpốk 3 (220MW)', relationship: 'Trực tiếp sở hữu', note: 'EVNGENCO 3 vận hành tổ máy full công suất' },
      { ticker: 'BSA', plantName: 'Srepok 4A (64MW)', relationship: 'Hạ lưu bậc thang (hưởng nước xả)', note: 'Hưởng trọn 280 m3/s nước xả máy của Srêpốk 3 chảy thẳng vào tuabin' },
      { ticker: 'DRL', plantName: 'Đrây H\'linh 2 (16MW)', relationship: 'Hạ lưu bậc thang (hưởng nước xả)', note: 'Hạ lưu sông Srêpốk đầy nước' },
    ],
  },
  {
    lakeName: 'Buôn Kuốp',
    region: 'Tây Nguyên',
    htl: 410.73,
    hdbt: 412.0,
    hc: 409.0,
    waterStoragePercent: 57.7,
    qve: 273.0,
    qxm: 180.0,
    qxt: 0.0,
    ncxs: 0,
    ncxm: 0,
    affectedStocks: [
      { ticker: 'PGV', plantName: 'Buôn Kuốp (280MW)', relationship: 'Trực tiếp sở hữu', note: 'Nước về dồi dào, biên lãi gộp >65%' },
      { ticker: 'BSA', plantName: 'Srepok 4A', relationship: 'Hạ lưu bậc thang (hưởng nước xả)', note: 'Cùng cụm hồ bậc thang Srêpốk' },
      { ticker: 'DRL', plantName: 'Đrây H\'linh 2', relationship: 'Hạ lưu bậc thang (hưởng nước xả)', note: 'Tận dụng tối đa dòng chảy' },
    ],
  },
  {
    lakeName: 'Buôn Tua Srah',
    region: 'Tây Nguyên',
    htl: 480.33,
    hdbt: 487.5,
    hc: 465.0,
    waterStoragePercent: 68.1,
    qve: 257.0,
    qxm: 140.0,
    qxt: 0.0,
    ncxs: 0,
    ncxm: 0,
    affectedStocks: [
      { ticker: 'PGV', plantName: 'Buôn Tua Srah (86MW)', relationship: 'Trực tiếp sở hữu', note: 'Hồ đầu nguồn điều tiết cho toàn bộ bậc thang Srêpốk' },
    ],
  },
  {
    lakeName: 'Sông Bung 4',
    region: 'Duyên Hải Nam Trung Bộ',
    htl: 210.04,
    hdbt: 222.5,
    hc: 205.0,
    waterStoragePercent: 28.8,
    qve: 528.22,
    qxm: 160.0,
    qxt: 0.0,
    ncxs: 0,
    ncxm: 0,
    affectedStocks: [
      { ticker: 'TV1', plantName: 'Sông Bung 5 (57MW)', relationship: 'Hạ lưu bậc thang (hưởng nước xả)', note: 'Nằm ngay dưới Sông Bung 4, đón 160 m3/s nước xả máy' },
      { ticker: 'HDG', plantName: 'Đăk Mi 4', relationship: 'Cổ đông chi phối / liên kết', note: 'Cùng lưu vực sông Vu Gia - Thu Bồn' },
    ],
  },
  {
    lakeName: 'A Vương',
    region: 'Duyên Hải Nam Trung Bộ',
    htl: 352.04,
    hdbt: 380.0,
    hc: 340.0,
    waterStoragePercent: 30.1,
    qve: 58.94,
    qxm: 45.0,
    qxt: 0.0,
    ncxs: 0,
    ncxm: 0,
    affectedStocks: [
      { ticker: 'TV1', plantName: 'Sông Bung 5', relationship: 'Hạ lưu bậc thang (hưởng nước xả)', note: 'Hợp lưu dòng nước đổ về Sông Bung' },
      { ticker: 'HDG', plantName: 'Đăk Mi 4', relationship: 'Cổ đông chi phối / liên kết', note: 'Chỉ báo lượng mưa Quảng Nam' },
    ],
  },
  {
    lakeName: 'Ialy',
    region: 'Tây Nguyên',
    htl: 510.85,
    hdbt: 515.0,
    hc: 490.0,
    waterStoragePercent: 83.4,
    qve: 625.0,
    qxm: 350.0,
    qxt: 0.0,
    ncxs: 0,
    ncxm: 0,
    affectedStocks: [
      { ticker: 'EIC', plantName: 'Hạ Sê San 2 (400MW)', relationship: 'Hạ lưu bậc thang (hưởng nước xả)', note: 'Ialy xả nước qua cụm Sê San rồi chảy thẳng vào Hạ Sê San 2 tại Campuchia' },
      { ticker: 'GHC', plantName: 'Cụm Ia Đrăng', relationship: 'Cổ đông chi phối / liên kết', note: 'Cùng lưu vực Tây Nguyên' },
    ],
  },
  {
    lakeName: 'Pleikrông',
    region: 'Tây Nguyên',
    htl: 569.49,
    hdbt: 570.0,
    hc: 537.0,
    waterStoragePercent: 98.5,
    qve: 412.0,
    qxm: 208.0,
    qxt: 0.0,
    ncxs: 0,
    ncxm: 0,
    affectedStocks: [
      { ticker: 'EIC', plantName: 'Hạ Sê San 2', relationship: 'Hạ lưu bậc thang (hưởng nước xả)', note: 'Đầu nguồn chuỗi Sê San đạt 98.5% Hdbt' },
      { ticker: 'S55', plantName: 'Đăk Pru', relationship: 'Cổ đông chi phối / liên kết', note: 'Cùng lưu vực Kon Tum' },
    ],
  },
  {
    lakeName: 'Trung Sơn',
    region: 'Bắc Trung Bộ',
    htl: 155.37,
    hdbt: 160.0,
    hc: 145.0,
    waterStoragePercent: 69.1,
    qve: 380.0,
    qxm: 220.0,
    qxt: 0.0,
    ncxs: 0,
    ncxm: 0,
    affectedStocks: [
      { ticker: 'VCP', plantName: 'Cửa Đạt (97MW)', relationship: 'Cổ đông chi phối / liên kết', note: 'Lưu vực sông Mã - sông Chu nước về lớn' },
      { ticker: 'POW', plantName: 'Hủa Na (180MW)', relationship: 'Cổ đông chi phối / liên kết', note: 'Tín hiệu mưa lớn Thanh Hóa - Nghệ An' },
    ],
  },
  {
    lakeName: 'Trị An',
    region: 'Đông Nam Bộ',
    htl: 60.89,
    hdbt: 62.0,
    hc: 50.0,
    waterStoragePercent: 90.8,
    qve: 1760.0,
    qxm: 586.0,
    qxt: 0.0,
    ncxs: 0,
    ncxm: 0,
    affectedStocks: [
      { ticker: 'PGV', plantName: 'Cụm Phú Mỹ', relationship: 'Cổ đông chi phối / liên kết', note: 'Khi Trị An xả máy full 586 m3/s, điện khí miền Nam bị giảm huy động giờ thấp điểm' },
      { ticker: 'NT2', plantName: 'Nhơn Trạch 2', relationship: 'Cổ đông chi phối / liên kết', note: 'Bị cạnh tranh công suất thủy điện rẻ' },
    ],
  },
];

// -------------------------------------------------------------
// DỮ LIỆU ĐIỀU ĐỘ & THỊ TRƯỜNG ĐIỆN TỪ NSMO
// -------------------------------------------------------------

// 48 chu kỳ 30 phút giá SMP mẫu (VNĐ/kWh)
export const HOURLY_SMP_PRICES: HourlySmpPrice[] = [
  { time: '00:30', smpMB: 1433, smpMT: 1416, smpMN: 1492, smpHT: 1492 },
  { time: '01:00', smpMB: 1410, smpMT: 1405, smpMN: 1480, smpHT: 1480 },
  { time: '01:30', smpMB: 1390, smpMT: 1395, smpMN: 1475, smpHT: 1475 },
  { time: '02:00', smpMB: 1380, smpMT: 1385, smpMN: 1470, smpHT: 1470 },
  { time: '02:30', smpMB: 1375, smpMT: 1380, smpMN: 1465, smpHT: 1465 },
  { time: '03:00', smpMB: 1370, smpMT: 1375, smpMN: 1460, smpHT: 1460 },
  { time: '03:30', smpMB: 1375, smpMT: 1380, smpMN: 1465, smpHT: 1465 },
  { time: '04:00', smpMB: 1385, smpMT: 1390, smpMN: 1470, smpHT: 1470 },
  { time: '04:30', smpMB: 1400, smpMT: 1410, smpMN: 1485, smpHT: 1485 },
  { time: '05:00', smpMB: 1430, smpMT: 1440, smpMN: 1510, smpHT: 1510 },
  { time: '05:30', smpMB: 1490, smpMT: 1495, smpMN: 1560, smpHT: 1560 },
  { time: '06:00', smpMB: 1550, smpMT: 1545, smpMN: 1610, smpHT: 1610 },
  { time: '06:30', smpMB: 1620, smpMT: 1600, smpMN: 1670, smpHT: 1670 },
  { time: '07:00', smpMB: 1710, smpMT: 1680, smpMN: 1740, smpHT: 1740 },
  { time: '07:30', smpMB: 1780, smpMT: 1720, smpMN: 1795, smpHT: 1795 },
  { time: '08:00', smpMB: 1820, smpMT: 1750, smpMN: 1830, smpHT: 1830 },
  { time: '08:30', smpMB: 1860, smpMT: 1780, smpMN: 1850, smpHT: 1850 },
  { time: '09:00', smpMB: 1890, smpMT: 1800, smpMN: 1870, smpHT: 1870 },
  { time: '09:30', smpMB: 1850, smpMT: 1760, smpMN: 1830, smpHT: 1830 },
  { time: '10:00', smpMB: 1790, smpMT: 1710, smpMN: 1780, smpHT: 1780 },
  { time: '10:30', smpMB: 1720, smpMT: 1650, smpMN: 1710, smpHT: 1710 },
  { time: '11:00', smpMB: 1650, smpMT: 1580, smpMN: 1630, smpHT: 1630 },
  { time: '11:30', smpMB: 1580, smpMT: 1510, smpMN: 1560, smpHT: 1560 },
  { time: '12:00', smpMB: 1520, smpMT: 1460, smpMN: 1500, smpHT: 1500 }, // ĐMT đè giá trưa
  { time: '12:30', smpMB: 1510, smpMT: 1450, smpMN: 1490, smpHT: 1490 },
  { time: '13:00', smpMB: 1560, smpMT: 1490, smpMN: 1530, smpHT: 1530 },
  { time: '13:30', smpMB: 1640, smpMT: 1570, smpMN: 1620, smpHT: 1620 },
  { time: '14:00', smpMB: 1720, smpMT: 1660, smpMN: 1710, smpHT: 1710 },
  { time: '14:30', smpMB: 1790, smpMT: 1730, smpMN: 1780, smpHT: 1780 },
  { time: '15:00', smpMB: 1830, smpMT: 1760, smpMN: 1810, smpHT: 1810 },
  { time: '15:30', smpMB: 1850, smpMT: 1780, smpMN: 1830, smpHT: 1830 },
  { time: '16:00', smpMB: 1860, smpMT: 1790, smpMN: 1840, smpHT: 1840 },
  { time: '16:30', smpMB: 1880, smpMT: 1810, smpMN: 1860, smpHT: 1860 },
  { time: '17:00', smpMB: 1910, smpMT: 1840, smpMN: 1890, smpHT: 1890 },
  { time: '17:30', smpMB: 1960, smpMT: 1890, smpMN: 1940, smpHT: 1940 }, // Bắt đầu đỉnh tối
  { time: '18:00', smpMB: 2020, smpMT: 1950, smpMN: 2010, smpHT: 2010 },
  { time: '18:30', smpMB: 2080, smpMT: 2010, smpMN: 2070, smpHT: 2070 }, // Đỉnh điểm SMP tối
  { time: '19:00', smpMB: 2110, smpMT: 2040, smpMN: 2090, smpHT: 2090 },
  { time: '19:30', smpMB: 2090, smpMT: 2020, smpMN: 2070, smpHT: 2070 },
  { time: '20:00', smpMB: 2040, smpMT: 1970, smpMN: 2020, smpHT: 2020 },
  { time: '20:30', smpMB: 1980, smpMT: 1910, smpMN: 1960, smpHT: 1960 },
  { time: '21:00', smpMB: 1900, smpMT: 1840, smpMN: 1890, smpHT: 1890 },
  { time: '21:30', smpMB: 1810, smpMT: 1760, smpMN: 1800, smpHT: 1800 },
  { time: '22:00', smpMB: 1720, smpMT: 1680, smpMN: 1710, smpHT: 1710 },
  { time: '22:30', smpMB: 1630, smpMT: 1590, smpMN: 1620, smpHT: 1620 },
  { time: '23:00', smpMB: 1540, smpMT: 1510, smpMN: 1540, smpHT: 1540 },
  { time: '23:30', smpMB: 1480, smpMT: 1450, smpMN: 1490, smpHT: 1490 },
  { time: '24:00', smpMB: 1440, smpMT: 1420, smpMN: 1470, smpHT: 1470 },
];

// Phân bố sản lượng theo loại hình nguồn phát hàng ngày (MWh)
export const DAILY_GENERATION_BY_FUEL: FuelGenerationDistribution[] = [
  { category: 'Thủy điện', generationMWh: 412370, sharePercent: 49.8, color: '#0ea5e9' },
  { category: 'Nhiệt điện Than', generationMWh: 320945, sharePercent: 38.8, color: '#f97316' },
  { category: 'Mặt trời (Farm + Mái nhà)', generationMWh: 50245, sharePercent: 6.1, color: '#eab308' },
  { category: 'Tua bin khí (TBK)', generationMWh: 36784, sharePercent: 4.4, color: '#8b5cf6' },
  { category: 'Điện Gió', generationMWh: 5922, sharePercent: 0.7, color: '#10b981' },
  { category: 'Sinh khối & Khác', generationMWh: 1721, sharePercent: 0.2, color: '#84cc16' },
];

// Phân bố sản lượng theo chủ đầu tư hàng ngày (MWh)
export const DAILY_GENERATION_BY_OWNER: OwnerGenerationDistribution[] = [
  { owner: 'EVN (Công ty mẹ)', generationMWh: 140295, relatedTickers: [], color: '#3b82f6' },
  { owner: 'EVNGENCO 1', generationMWh: 94901, relatedTickers: [], color: '#6366f1' },
  { owner: 'Khối Công ty Cổ phần (JSC)', generationMWh: 88190, relatedTickers: ['QTP', 'HND', 'VSH', 'TMP', 'REE', 'HDG', 'SBA', 'CHP', 'TBC', 'VPD'], color: '#10b981' },
  { owner: 'EVNGENCO 3 (PGV)', generationMWh: 87545, relatedTickers: ['PGV'], color: '#06b6d4' },
  { owner: 'Nhà máy độc lập (BOT)', generationMWh: 80490, relatedTickers: [], color: '#64748b' },
  { owner: 'PVN (PV Power)', generationMWh: 46605, relatedTickers: ['POW', 'NT2'], color: '#f59e0b' },
  { owner: 'EVNGENCO 2 (GE2)', generationMWh: 44363, relatedTickers: [], color: '#8b5cf6' },
  { owner: 'TKV (Than Khoáng sản)', generationMWh: 16743, relatedTickers: [], color: '#78716c' },
  { owner: 'Nhập khẩu điện (Lào, TQ)', generationMWh: 11450, relatedTickers: ['EIC'], color: '#ec4899' },
];

// -------------------------------------------------------------
// VĂN BẢN VÀ KHUNG GIÁ ĐIỆN TỪ EAV (Cục Điều tiết Điện lực)
// -------------------------------------------------------------
export interface EavRegulationDoc {
  docNumber: string;
  title: string;
  issueDate: string;
  effectiveDate: string;
  scope: string;
  keyNumbers: string;
  impactTickers: string[];
}

export const EAV_REGULATION_DOCS: EavRegulationDoc[] = [
  {
    docNumber: 'Quyết định 1882/QĐ-BCT',
    title: 'Phê duyệt khung giá phát điện nhà máy nhiệt điện tua bin khí chu trình hỗn hợp sử dụng khí thiên nhiên năm 2026',
    issueDate: '23/07/2026',
    effectiveDate: '23/07/2026',
    scope: 'Nhà máy điện khí tự nhiên',
    keyNumbers: 'Trần khung giá: 3.410,64 đ/kWh (chưa VAT)',
    impactTickers: ['POW', 'NT2', 'PGV', 'BTP'],
  },
  {
    docNumber: 'Thông tư 30/2026/TT-BCT',
    title: 'Quy định phương pháp xác định giá dịch vụ phát điện đối với các nhà máy điện BOT ở Việt Nam',
    issueDate: '28/07/2026',
    effectiveDate: '28/07/2026',
    scope: 'Nhà máy điện BOT chuyển giao',
    keyNumbers: 'Công thức chuyển đổi giá điện khi hết hạn BOT sang hợp đồng mua bán với EVN',
    impactTickers: ['PGV', 'PPC', 'POW'],
  },
  {
    docNumber: 'Quyết định 963/QĐ-BCT',
    title: 'Quy định khung giờ cao điểm, thấp điểm và giờ bình thường của hệ thống điện quốc gia',
    issueDate: '22/04/2026',
    effectiveDate: '22/04/2026',
    scope: 'Vận hành hệ thống điện toàn quốc',
    keyNumbers: 'Dịch chuyển giờ cao điểm trưa lùi sang buổi tối (18h-21h30) do dư thừa điện mặt trời',
    impactTickers: ['VSH', 'TMP', 'QTP', 'HND', 'NT2', 'POW', 'SBA', 'DRL', 'BSA'],
  },
  {
    docNumber: 'Thông tư số 20/ERAV',
    title: 'Quy định phương pháp xác định và nguyên tắc áp dụng biểu giá chi phí tránh được cho nhà máy điện năng lượng tái tạo nhỏ (<=30MW)',
    issueDate: '15/03/2026',
    effectiveDate: '01/01/2026',
    scope: 'Thủy điện nhỏ <=30MW',
    keyNumbers: 'Tăng 4.2% biểu giá giờ cao điểm mùa khô, khuyến khích tích nước chạy giờ tối',
    impactTickers: ['HJS', 'GHC', 'DRL', 'NED', 'SEB', 'SD9', 'SD3', 'S55', 'SJE'],
  },
  {
    docNumber: 'Nghị định 80/2024/NĐ-CP',
    title: 'Cơ chế mua bán điện trực tiếp giữa Đơn vị phát điện năng lượng tái tạo với Khách hàng sử dụng điện lớn (DPPA)',
    issueDate: '03/07/2024',
    effectiveDate: '03/07/2024',
    scope: 'Điện gió, điện mặt trời',
    keyNumbers: 'Cho phép bán điện qua đường dây riêng hoặc qua lưới điện quốc gia hưởng chênh lệch CfD',
    impactTickers: ['REE', 'GEG', 'HDG', 'TTA', 'PC1'],
  },
];
