export interface SeafoodStockIntel {
  ticker: string;
  name: string;
  exchange: 'HOSE' | 'HNX' | 'UPCoM';
  category: 'Cá tra' | 'Tôm' | 'Nghêu & Nhuyễn thể' | 'Surimi & Bột cá';
  avatarColor: string;
  marketCap: number; // Tỷ VNĐ
  pe: number;
  pb: number;
  currentPrice: number; // 1,000 VNĐ
  mainProducts: string[];
  keyMarkets: {
    market: string;
    share: number; // %
    growthYoY: number; // %
    status: 'Tăng mạnh' | 'Tăng ổn định' | 'Đi ngang' | 'Sụt giảm';
    note: string;
  }[];
  farmingAutonomy: {
    rate: string;
    areaHa?: number;
    description: string;
    feedSelfSufficient: boolean;
  };
  q2Actual: {
    revenue: number; // Tỷ VNĐ
    netProfit: number; // Tỷ VNĐ
    growthYoY: number; // %
  };
  q3Forecast: {
    rating: 'TĂNG TRƯỞNG MẠNH' | 'TĂNG TRƯỞNG TÍCH CỰC' | 'KHẢ QUAN' | 'ĐI NGANG' | 'THẬN TRỌNG';
    ratingBadgeColor: 'emerald' | 'teal' | 'cyan' | 'amber' | 'rose';
    revenueEst: number; // Tỷ VNĐ
    profitEst: number; // Tỷ VNĐ
    revenueGrowthYoY: number; // %
    profitGrowthYoY: number; // %
    drivers: string[];
    headwinds: string[];
    vasepSignal: string;
  };
}

export interface RawMaterialWeeklyPrice {
  period: string; // "19/9 – 25/9/2026"
  dateFormatted: string; // "25/09/2026"
  region: string;
  pangasius_white_meat: number; // VNĐ/kg (0.7-1kg/con)
  pangasius_change_wow: number; // VNĐ/kg
  pangasius_fingerling: number; // VNĐ/kg (cá giống 30-35 con/kg)
  white_shrimp_100: number; // VNĐ/kg (tôm thẻ 100 con)
  white_shrimp_50: number; // VNĐ/kg (tôm thẻ 50 con)
  white_shrimp_30: number; // VNĐ/kg (tôm thẻ 30 con)
  black_tiger_shrimp_30: number; // VNĐ/kg (tôm sú 30-40 con)
  clam_mussel: number; // VNĐ/kg (nghêu / hàu thương phẩm)
  tilapia: number; // VNĐ/kg (cá diêu hồng / rô phi)
}

export interface VasepMarketData {
  sector: 'Cá tra' | 'Tôm' | 'Cá ngừ' | 'Surimi & Chả cá' | 'Nhuyễn thể 2 vỏ' | 'Bột cá';
  total8mUSD: number; // Triệu USD (tương thích)
  growth8mYoY: number; // %
  augustUSD: number; // Triệu USD
  augustGrowthYoY: number; // %
  total9mUSD: number; // Triệu USD (Lũy kế 9 tháng 2026)
  growth9mYoY: number; // %
  septemberUSD: number; // Triệu USD (Tháng 9/2026)
  septemberGrowthYoY: number; // %
  total10mUSD: number; // Triệu USD (Lũy kế 10 tháng 2026)
  growth10mYoY: number; // %
  octoberUSD: number; // Triệu USD (Tháng 10/2026)
  octoberGrowthYoY: number; // %
  topMarkets: {
    country: string;
    val8mUSD: number; // Tương thích
    val9mUSD?: number; // Triệu USD (9 tháng 2026)
    val10mUSD?: number; // Triệu USD (10 tháng 2026)
    growthYoY: number;
    sharePercent: number;
  }[];
  marketDrivers: string;
}

// -------------------------------------------------------------
// DỮ LIỆU THỰC TẾ 12 MÃ CỔ PHIẾU THỦY SẢN NIÊM YẾT
// -------------------------------------------------------------
export const SEAFOOD_STOCKS: SeafoodStockIntel[] = [
  // --- NHÓM CÁ TRA ---
  {
    ticker: 'VHC',
    name: 'CTCP Vĩnh Hoàn',
    exchange: 'HOSE',
    category: 'Cá tra',
    avatarColor: 'from-amber-500 to-emerald-600',
    marketCap: 16850,
    pe: 14.8,
    pb: 1.82,
    currentPrice: 75.2,
    mainProducts: ['Cá tra fillet đông lạnh cao cấp', 'Collagen & Gelatin (Vĩnh Hoàn C&G)', 'Sản phẩm giá trị gia tăng (VAP)', 'Bột cá, mỡ cá'],
    keyMarkets: [
      { market: 'Mỹ', share: 48, growthYoY: -4, status: 'Đi ngang', note: 'Chiếm 47% thị phần fillet Mỹ; thuế chống bán phá giá 0 USD/kg' },
      { market: 'Châu Âu (EU)', share: 18, growthYoY: 15, status: 'Tăng ổn định', note: 'Nhu cầu cá thịt trắng tăng do thiếu hụt cá tuyết Na Uy' },
      { market: 'Trung Quốc', share: 12, growthYoY: 22, status: 'Tăng mạnh', note: 'Đơn hàng phục hồi tốt nhưng biên lãi thấp hơn thị trường Mỹ' },
      { market: 'Khác & Nội địa', share: 22, growthYoY: 18, status: 'Tăng ổn định', note: 'Mảng Collagen & Gelatin tăng trưởng biên gộp >35%' },
    ],
    farmingAutonomy: {
      rate: '65% - 70%',
      areaHa: 750,
      description: 'Vùng nuôi đạt chuẩn ASC, GlobalGAP lớn nhất ĐBSCL, tự chủ con giống chất lượng cao Vĩnh Hoàn Sa Đéc.',
      feedSelfSufficient: true,
    },
    q2Actual: { revenue: 3195, netProfit: 334, growthYoY: -2.3 },
    q3Forecast: {
      rating: 'THẬN TRỌNG',
      ratingBadgeColor: 'rose',
      revenueEst: 3316,
      profitEst: 229,
      revenueGrowthYoY: -4.0,
      profitGrowthYoY: -49.0,
      drivers: [
        'BCTC Hợp nhất Q3/2026 chính thức: Doanh thu thuần đạt 3.316 tỷ VNĐ (-4% YoY), LNST hợp nhất đạt 229 tỷ VNĐ (LNST công ty mẹ 213,1 tỷ)',
        'Lũy kế 9T/2026 đạt 9.665,3 tỷ doanh thu thuần và 954,5 tỷ LNST công ty mẹ (~60% kế hoạch năm); Collagen & Gelatin duy trì biên gộp cao',
        'Giá cá tra nguyên liệu đầu tháng 11 lập đỉnh mới 35.000 - 38.000 đ/kg cùng xuất khẩu cá tra toàn ngành tháng 10 +14,9% tạo kỳ vọng cải thiện đơn giá Q4',
      ],
      headwinds: ['Biên lãi gộp Q3 thu hẹp từ 16,8% xuống 14,5%, doanh thu tài chính giảm >70% và trích lập ~15,2 tỷ lỗ chứng khoán khiến LNST công ty mẹ giảm gần 50% YoY'],
      vasepSignal: 'VHC công bố BCTC Q3/2026 đạt 3.316 tỷ doanh thu và 229 tỷ LNST hợp nhất. Xuất khẩu cá tra toàn ngành tháng 10 hồi phục +14,9% YoY (249 tr USD) hỗ trợ triển vọng Q4.',
    },
  },
  {
    ticker: 'ANV',
    name: 'CTCP Nam Việt',
    exchange: 'HOSE',
    category: 'Cá tra',
    avatarColor: 'from-blue-600 to-cyan-500',
    marketCap: 4420,
    pe: 18.2,
    pb: 1.35,
    currentPrice: 33.1,
    mainProducts: ['Cá tra fillet đông lạnh', 'Cá tra xẻ bướm', 'Thức ăn thủy sản (100% tự chủ)', 'Collagen peptide (Amicogen liên doanh)'],
    keyMarkets: [
      { market: 'Trung Quốc', share: 36, growthYoY: 29, status: 'Tăng mạnh', note: 'Thị trường đầu tàu; hưởng lợi lớn từ việc Trung Quốc tăng nhập cá tra' },
      { market: 'Brazil & Nam Mỹ', share: 22, growthYoY: 28, status: 'Tăng mạnh', note: 'Nam Việt là nhà cung cấp cá tra số 1 vào Brazil' },
      { market: 'ASEAN & Trung Đông', share: 20, growthYoY: 12, status: 'Tăng ổn định', note: 'Thị trường quen thuộc của dòng cá xẻ bướm và cắt khoanh' },
      { market: 'Mỹ & Khác', share: 22, growthYoY: 16, status: 'Tăng ổn định', note: 'Xúc tiến mở rộng lại thị trường Mỹ sau các đợt rà soát thuế' },
    ],
    farmingAutonomy: {
      rate: '100%',
      areaHa: 600,
      description: 'Chuỗi giá trị khép kín tuyệt đối: Tự chủ 100% thức ăn chăn nuôi (nhà máy riêng), 100% cá nguyên liệu từ đại dự án Bình Phú.',
      feedSelfSufficient: true,
    },
    q2Actual: { revenue: 1198, netProfit: 17.5, growthYoY: -45.0 },
    q3Forecast: {
      rating: 'KHẢ QUAN',
      ratingBadgeColor: 'teal',
      revenueEst: 2071,
      profitEst: 206.7,
      revenueGrowthYoY: 3.5,
      profitGrowthYoY: -27.0,
      drivers: [
        'BCTC Hợp nhất Q3/2026 chính thức: Doanh thu thuần đạt 2.071,0 tỷ VNĐ (+3,5% YoY), LNST đạt 206,7 tỷ VNĐ (công ty mẹ 206,4 tỷ)',
        'Lũy kế 9T/2026 đạt 5.849,3 tỷ doanh thu (+21,0% YoY) và 536,9 tỷ LNST hợp nhất',
        'Giá cá tra nguyên liệu đầu tháng 11 lập đỉnh mới 35.000 - 38.000 đ/kg (cá giống 50.000 - 55.000 đ/kg), tạo lợi thế lớn nhờ ANV tự chủ 100% thức ăn và vùng nuôi Bình Phú',
      ],
      headwinds: ['Chi phí tài chính Q3 tăng mạnh lên 33 tỷ VNĐ do nhu cầu vay vốn mở rộng quy mô nuôi và giá vốn tăng làm LNST Q3 giảm 27% YoY'],
      vasepSignal: 'Nam Việt (ANV) công bố BCTC Q3/2026 đạt 2.071 tỷ doanh thu; giá cá tra nguyên liệu đầu tháng 11 vọt lên 35.000 - 38.000 đ/kg hỗ trợ đơn hàng Q4.',
    },
  },
  {
    ticker: 'ACL',
    name: 'CTCP XNK Thủy sản Cửu Long An Giang',
    exchange: 'HOSE',
    category: 'Cá tra',
    avatarColor: 'from-teal-600 to-emerald-400',
    marketCap: 610,
    pe: 12.4,
    pb: 0.82,
    currentPrice: 12.1,
    mainProducts: ['Cá tra fillet đông lạnh', 'Cá tra cắt khúc', 'Cá basa nguyên con', 'Bột cá & Mỡ cá'],
    keyMarkets: [
      { market: 'Trung Quốc', share: 38, growthYoY: 31, status: 'Tăng mạnh', note: 'Đối tác nhập khẩu ổn định tại Quảng Châu, Thượng Hải' },
      { market: 'Nam Mỹ (Brazil, Mexico)', share: 25, growthYoY: 24, status: 'Tăng mạnh', note: 'Tiêu thụ dòng cá tra thịt trắng tiêu chuẩn' },
      { market: 'Châu Âu & Nga', share: 17, growthYoY: 10, status: 'Tăng ổn định', note: 'Thị trường truyền thống' },
      { market: 'Trung Đông & ASEAN', share: 20, growthYoY: 15, status: 'Tăng ổn định', note: 'Đơn hàng đều đặn' },
    ],
    farmingAutonomy: {
      rate: '85% - 90%',
      areaHa: 120,
      description: 'Vùng nuôi tập trung tại An Giang, tự chủ hơn 85% nguyên liệu chế biến, không phải tranh mua ngoài thị trường.',
      feedSelfSufficient: true,
    },
    q2Actual: { revenue: 312, netProfit: 11.2, growthYoY: 18.5 },
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG TÍCH CỰC',
      ratingBadgeColor: 'emerald',
      revenueEst: 360,
      profitEst: 19.0,
      revenueGrowthYoY: 14.0,
      profitGrowthYoY: 35.2,
      drivers: [
        'BCTC Hợp nhất Q3/2026 chính thức: Doanh thu tăng ~14% YoY, biên lãi gộp cải thiện kéo LNST hợp nhất đạt ~19 tỷ VNĐ (+35,2% YoY)',
        'Tỷ lệ tự chủ nuôi trên 85% giúp bảo vệ biên lợi nhuận khi giá cá tra thịt trắng đầu tháng 11 bứt phá lên 35.000 - 38.000 đ/kg',
        'Định giá P/B thấp (~0.82x), cơ cấu thị trường Trung Quốc & Nam Mỹ tiếp tục duy trì nhu cầu ổn định',
      ],
      headwinds: ['Thanh khoản cổ phiếu trên sàn ở mức trung bình; cạnh tranh giá tại phân khúc phổ thông'],
      vasepSignal: 'Cửu Long An Giang (ACL) ghi nhận LNST Q3/2026 tăng +35,2% YoY (~19 tỷ VNĐ) nhờ biên gộp cải thiện và tỷ lệ tự chủ vùng nuôi cao.',
    },
  },
  {
    ticker: 'IDI',
    name: 'CTCP Đầu tư & Phát triển Đa Quốc Gia',
    exchange: 'HOSE',
    category: 'Cá tra',
    avatarColor: 'from-indigo-600 to-blue-400',
    marketCap: 2310,
    pe: 26.5,
    pb: 0.76,
    currentPrice: 9.8,
    mainProducts: ['Cá tra fillet', 'Dầu ăn cá cao cấp Ranee', 'Bột cá mỡ cá', 'Thức ăn thủy sản'],
    keyMarkets: [
      { market: 'Trung Quốc', share: 42, growthYoY: 27, status: 'Tăng mạnh', note: 'Hơn 40 đối tác phân phối tại các thành phố lớn Trung Quốc' },
      { market: 'Mexico & Nam Mỹ', share: 24, growthYoY: 19, status: 'Tăng ổn định', note: 'Nhu cầu cá tra bình dân tăng cao' },
      { market: 'Nội địa & Khác', share: 34, growthYoY: 14, status: 'Tăng ổn định', note: 'Doanh thu dầu cá Ranee và bột cá tăng tốt' },
    ],
    farmingAutonomy: {
      rate: '70% - 75%',
      areaHa: 350,
      description: 'Liên kết vùng nuôi bền vững tại Đồng Tháp, An Giang, Cần Thơ kết hợp nhà máy chế biến phụ phẩm dầu cá tinh luyện.',
      feedSelfSufficient: true,
    },
    q2Actual: { revenue: 1780, netProfit: 19.8, growthYoY: -22.0 },
    q3Forecast: {
      rating: 'THẬN TRỌNG',
      ratingBadgeColor: 'rose',
      revenueEst: 1805.1,
      profitEst: 20.0,
      revenueGrowthYoY: 6.0,
      profitGrowthYoY: -44.8,
      drivers: [
        'BCTC Hợp nhất Q3/2026 chính thức: Doanh thu thuần đạt 1.805,1 tỷ VNĐ (+6,0% YoY), lãi gộp đạt 147,8 tỷ (+13,9% YoY)',
        'Xuất khẩu cá tra sang Trung Quốc & HK (toàn ngành 10T +30,3% YoY) hỗ trợ đầu ra tiêu thụ cho nhà máy của IDI',
      ],
      headwinds: ['LNST hợp nhất Q3/2026 giảm -44,8% YoY xuống ~20 tỷ VNĐ do áp lực chi phí lãi vay và chi phí bán hàng duy trì ở mức cao'],
      vasepSignal: 'BCTC Q3/2026 của IDI ghi nhận doanh thu (+6,0%) và lãi gộp (+13,9%) tăng trưởng nhưng LNST hợp nhất giảm 44,8% do gánh nặng chi phí tài chính.',
    },
  },
  {
    ticker: 'AAM',
    name: 'CTCP Thủy sản Mekong (Mekongfish)',
    exchange: 'HOSE',
    category: 'Cá tra',
    avatarColor: 'from-sky-600 to-blue-500',
    marketCap: 135,
    pe: 19.5,
    pb: 0.65,
    currentPrice: 10.9,
    mainProducts: ['Cá tra fillet đông lạnh', 'Cá basa cắt khoanh', 'Bong bóng cá sấy khô'],
    keyMarkets: [
      { market: 'Châu Á & ASEAN', share: 45, growthYoY: 11, status: 'Tăng ổn định', note: 'Thị trường Malaysia, Philippines, Singapore' },
      { market: 'Trung Đông', share: 30, growthYoY: 14, status: 'Tăng ổn định', note: 'Ai Cập, UAE' },
      { market: 'Châu Âu', share: 25, growthYoY: 5, status: 'Đi ngang', note: 'Các đơn hàng chọn lọc' },
    ],
    farmingAutonomy: {
      rate: '30% - 40%',
      description: 'Chủ yếu thu mua ngoài từ các hộ nuôi liên kết tại Cần Thơ, công suất nhà máy 50 tấn nguyên liệu/ngày.',
      feedSelfSufficient: false,
    },
    q2Actual: { revenue: 42.5, netProfit: 0.85, growthYoY: 5.2 },
    q3Forecast: {
      rating: 'THẬN TRỌNG',
      ratingBadgeColor: 'rose',
      revenueEst: 15.8,
      profitEst: 0.22,
      revenueGrowthYoY: -62.7,
      profitGrowthYoY: -45.3,
      drivers: [
        'BCTC Q3/2026 chính thức: Doanh thu thuần giảm mạnh -62,7% YoY xuống 15,8 tỷ VNĐ; LNST đạt 218 triệu VNĐ (-45,3% YoY)',
        'Lượng tiền mặt và tiền gửi ngân hàng dồi dào, không vay nợ ngân hàng giúp doanh nghiệp giữ an toàn tài chính khi sản lượng co hẹp',
      ],
      headwinds: ['Tỷ lệ tự chủ ao nuôi thấp, chịu áp lực ép biên lớn khi giá cá tra thịt trắng đầu tháng 11 nhảy vọt lên 35.000 - 38.000 đ/kg'],
      vasepSignal: 'BCTC Q3/2026 của AAM ghi nhận doanh thu giảm sâu -62,7% YoY; mặt bằng giá cá nguyên liệu đầu tháng 11 lập đỉnh mới tạo thách thức cho đơn vị thu mua ngoài.',
    },
  },
  {
    ticker: 'CCA',
    name: 'CTCP XNK Thủy sản Cần Thơ (Caseamex)',
    exchange: 'UPCoM',
    category: 'Cá tra',
    avatarColor: 'from-cyan-600 to-teal-500',
    marketCap: 210,
    pe: 14.1,
    pb: 0.72,
    currentPrice: 13.5,
    mainProducts: ['Cá tra fillet đông lạnh Caseamex', 'Cá tra cuộn hoa hồng', 'Cá tra tẩm bột'],
    keyMarkets: [
      { market: 'Trung Đông & Châu Phi', share: 40, growthYoY: 18, status: 'Tăng mạnh', note: 'Đơn hàng phục vụ thị trường Halal' },
      { market: 'Nam Mỹ', share: 30, growthYoY: 22, status: 'Tăng mạnh', note: 'Brazil, Colombia' },
      { market: 'Châu Á', share: 30, growthYoY: 12, status: 'Tăng ổn định', note: 'Hàn Quốc, Trung Quốc' },
    ],
    farmingAutonomy: {
      rate: '50% - 60%',
      areaHa: 65,
      description: 'Vùng nuôi ven sông Hậu tại Cần Thơ và Hậu Giang, kết hợp thu mua có hợp đồng bao tiêu.',
      feedSelfSufficient: false,
    },
    q2Actual: { revenue: 98.5, netProfit: 3.1, growthYoY: 8.5 },
    q3Forecast: {
      rating: 'KHẢ QUAN',
      ratingBadgeColor: 'teal',
      revenueEst: 112.0,
      profitEst: 4.8,
      revenueGrowthYoY: 14.0,
      profitGrowthYoY: 35.0,
      drivers: [
        'Xuất khẩu các sản phẩm giá trị gia tăng (cuộn cá, fillet tẩm bột) sang Nam Mỹ và Trung Đông có biên lãi cao hơn cá fillet thô',
        'Đơn hàng Q3 dồi dào chuẩn bị cho mùa tiêu thụ cuối năm',
      ],
      headwinds: ['Thanh khoản giao dịch UPCoM thấp; phụ thuộc vào một phần nguyên liệu thu mua ngoài'],
      vasepSignal: 'Báo cáo VASEP cho thấy phân khúc sản phẩm cá tra chế biến giá trị gia tăng (VAP) có mức tăng trưởng giá bán FOB tốt hơn fillet thông thường.',
    },
  },

  // --- NHÓM TÔM ---
  {
    ticker: 'FMC',
    name: 'CTCP Thực phẩm Sao Ta',
    exchange: 'HOSE',
    category: 'Tôm',
    avatarColor: 'from-orange-500 to-red-500',
    marketCap: 3850,
    pe: 11.8,
    pb: 1.48,
    currentPrice: 53.0,
    mainProducts: ['Tôm chế biến sâu (duỗi, tẩm bột, bao bột Nobashi)', 'Tôm chiên Tempura', 'Nông sản đóng gói (FIMEX)'],
    keyMarkets: [
      { market: 'Nhật Bản', share: 38, growthYoY: 12, status: 'Tăng ổn định', note: 'Nhà cung cấp tôm chế biến hàng đầu thị trường Nhật' },
      { market: 'Mỹ', share: 26, growthYoY: 15, status: 'Tăng ổn định', note: 'Tránh cạnh tranh tôm thô với Ecuador nhờ sản phẩm chế biến sâu' },
      { market: 'EU & Anh', share: 24, growthYoY: 18, status: 'Tăng mạnh', note: 'Đơn vị đạt chứng nhận ASC toàn diện' },
      { market: 'Khác', share: 12, growthYoY: 10, status: 'Tăng ổn định', note: 'Hàn Quốc, Úc' },
    ],
    farmingAutonomy: {
      rate: '35% - 40%',
      areaHa: 525,
      description: 'Vùng nuôi tôm công nghệ cao lớn nhất Việt Nam đạt chứng nhận ASC toàn phần tại Sóc Trăng, tỷ lệ nuôi thành công >85%.',
      feedSelfSufficient: false,
    },
    q2Actual: { revenue: 1650, netProfit: 86.4, growthYoY: 14.2 },
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG MẠNH',
      ratingBadgeColor: 'emerald',
      revenueEst: 2533.6,
      profitEst: 199.5,
      revenueGrowthYoY: -10.1,
      profitGrowthYoY: 78.3,
      drivers: [
        'BCTC Hợp nhất Q3/2026 chính thức: LNST bứt phá +78,3% YoY đạt 199,5 tỷ VNĐ (công ty mẹ 188,5 tỷ); doanh thu thuần đạt 2.533,6 tỷ VNĐ (-10,1% YoY)',
        'Lũy kế 9T/2026 đạt 5.599,6 tỷ doanh thu và 452,4 tỷ LNST (+80,1% YoY), chính thức hoàn thành vượt 100% kế hoạch lợi nhuận cả năm 2026 sớm 1 quý',
        'Doanh số tháng 10/2026 đảo chiều tăng trở lại +6%+ YoY đạt 27,38 triệu USD (2.251 tấn tôm thành phẩm, +5% YoY), chấm dứt chuỗi 4 tháng giảm; đã thả giống vụ mới tại Xuân Phú & Vĩnh Thuận',
      ],
      headwinds: ['Biến động tỷ giá đồng Yên Nhật; áp lực cạnh tranh giá tôm thẻ toàn cầu và rủi ro thuế chống trợ cấp CVD tại Mỹ'],
      vasepSignal: 'Sao Ta (FMC) lãi Q3 +78,3% YoY (199,5 tỷ) vượt kế hoạch năm sau 9T; doanh số tháng 10 đảo chiều tăng +6%+ đạt 27,38 triệu USD tạo đà cho Q4.',
    },
  },
  {
    ticker: 'CMX',
    name: 'CTCP Camimex Group',
    exchange: 'HOSE',
    category: 'Tôm',
    avatarColor: 'from-amber-600 to-rose-500',
    marketCap: 1120,
    pe: 13.5,
    pb: 0.79,
    currentPrice: 8.9,
    mainProducts: ['Tôm sinh thái / tôm hữu cơ rừng ngập mặn Cà Mau', 'Tôm sú sinh thái hữu cơ', 'Tôm thẻ chân trắng chế biến'],
    keyMarkets: [
      { market: 'Châu Âu (EU)', share: 55, growthYoY: 21, status: 'Tăng mạnh', note: 'Đức, Thụy Sĩ, Pháp rất chuộng chứng nhận tôm hữu cơ Naturland' },
      { market: 'Mỹ & Canada', share: 20, growthYoY: 8, status: 'Tăng ổn định', note: 'Phân khúc tôm sinh thái cao cấp' },
      { market: 'Nhật Bản & Hàn Quốc', share: 15, growthYoY: 14, status: 'Tăng ổn định', note: 'Tôm Nobashi, Sushi' },
      { market: 'Khác', share: 10, growthYoY: 10, status: 'Tăng ổn định', note: 'Úc, nội địa' },
    ],
    farmingAutonomy: {
      rate: 'Rừng sinh thái liên kết',
      areaHa: 10000,
      description: 'Mô hình tôm - rừng sinh thái độc quyền tại Cà Mau, chứng nhận hữu cơ quốc tế (Naturland, Bio Suisse, EU Organic).',
      feedSelfSufficient: false,
    },
    q2Actual: { revenue: 685, netProfit: 21.5, growthYoY: 12.0 },
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG MẠNH',
      ratingBadgeColor: 'emerald',
      revenueEst: 1038.3,
      profitEst: 52.1,
      revenueGrowthYoY: 45.0,
      profitGrowthYoY: 58.2,
      drivers: [
        'BCTC Hợp nhất Q3/2026 chính thức: Doanh thu thuần đạt 1.038,3 tỷ VNĐ (+45,0% YoY), LNST hợp nhất đạt 52,1 tỷ (+58,2% YoY; công ty mẹ 38,6 tỷ)',
        'Lũy kế 9T/2026 đạt 3.040,8 tỷ VNĐ doanh thu (+36,1% YoY) và 94,7 tỷ VNĐ LNST hợp nhất',
        'HĐQT thông qua kế hoạch huy động 686 tỷ VNĐ (vay 15 triệu USD Quỹ Proparco Pháp xây kho lạnh và phát hành 200 tỷ trái phiếu) mở rộng chuỗi tôm sinh thái EU',
      ],
      headwinds: ['Cổ phiếu diện cảnh báo do lợi nhuận chưa phân phối năm trước còn âm; theo dõi chi phí lãi vay khi mở rộng quy mô'],
      vasepSignal: 'Camimex (CMX) công bố BCTC Q3/2026 bứt phá cả doanh thu (+45%) lẫn LNST hợp nhất (+58,2% YoY) nhờ phân khúc tôm sinh thái ít chịu áp lực cạnh tranh giá rẻ.',
    },
  },
  {
    ticker: 'MPC',
    name: 'CTCP Tập đoàn Thủy sản Minh Phú',
    exchange: 'UPCoM',
    category: 'Tôm',
    avatarColor: 'from-blue-700 to-indigo-600',
    marketCap: 6420,
    pe: 28.0,
    pb: 1.15,
    currentPrice: 16.1,
    mainProducts: ['Tôm đông lạnh IQF', 'Tôm tẩm bột', 'Tôm Nobashi', 'Tôm sinh thái'],
    keyMarkets: [
      { market: 'Mỹ', share: 38, growthYoY: 6, status: 'Đi ngang', note: 'Cạnh tranh gay gắt về giá với tôm Ecuador và Ấn Độ' },
      { market: 'Nhật Bản', share: 22, growthYoY: 11, status: 'Tăng ổn định', note: 'Thị trường truyền thống' },
      { market: 'Châu Âu & Úc', share: 25, growthYoY: 16, status: 'Tăng mạnh', note: 'Tăng cường hiện diện với công ty con tại Úc' },
      { market: 'Trung Quốc & Nội địa', share: 15, growthYoY: 19, status: 'Tăng mạnh', note: 'Kênh nhà hàng và siêu thị nội địa' },
    ],
    farmingAutonomy: {
      rate: '25% - 30%',
      areaHa: 900,
      description: 'Sở hữu vùng nuôi tôm công nghệ cao Minh Phú Lộc An và Kiên Giang, triển khai công nghệ nuôi tôm sinh học 2-3-4.',
      feedSelfSufficient: false,
    },
    q2Actual: { revenue: 3720, netProfit: 38.2, growthYoY: -15.0 },
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG MẠNH',
      ratingBadgeColor: 'emerald',
      revenueEst: 2817.9,
      profitEst: 135.8,
      revenueGrowthYoY: 36.6,
      profitGrowthYoY: 84.2,
      drivers: [
        'BCTC Riêng Công ty mẹ Q3/2026: Doanh thu đạt 2.817,9 tỷ VNĐ (+36,6% YoY), LNST công ty mẹ tăng vọt +84,2% YoY đạt 135,8 tỷ VNĐ (có đóng góp 190,2 tỷ doanh thu tài chính/cổ tức công ty con)',
        'Lũy kế 9T/2026 LNST công ty mẹ đạt 461,4 tỷ VNĐ (gấp 2,28 lần cùng kỳ); kế hoạch hợp nhất 2026 đặt mục tiêu DT 19.892,1 tỷ và LNST 974,4 tỷ',
        'Tôm xuất khẩu toàn ngành 10T/2026 đạt 4,22 tỷ USD (+9,0% YoY) nhờ tôm sú & tôm hùm giữ nhịp tăng',
      ],
      headwinds: ['Xuất khẩu tôm tháng 10 toàn ngành giảm -4,9% YoY (tôm thẻ -8,3% còn 307 tr USD) do cạnh tranh giá từ Ecuador & Ấn Độ'],
      vasepSignal: 'Minh Phú (MPC) công bố LNST công ty mẹ Q3/2026 tăng +84,2% YoY (135,8 tỷ VNĐ); theo dõi áp lực cạnh tranh giá tôm thẻ tháng 10 tại thị trường Mỹ (-19,1% YoY).',
    },
  },
  {
    ticker: 'CAT',
    name: 'CTCP Thủy sản Cà Mau (Seaprimexco)',
    exchange: 'UPCoM',
    category: 'Tôm',
    avatarColor: 'from-amber-600 to-yellow-500',
    marketCap: 285,
    pe: 9.8,
    pb: 0.68,
    currentPrice: 19.2,
    mainProducts: ['Tôm sú, tôm thẻ đông lạnh (HOSO, HLSO, PTO, PD)', 'Tôm tẩm bột', 'Chả cá surimi'],
    keyMarkets: [
      { market: 'Nhật Bản', share: 42, growthYoY: 9, status: 'Tăng ổn định', note: 'Khách hàng lâu năm tiêu thụ tôm PTO và duỗi' },
      { market: 'EU & Anh', share: 28, growthYoY: 14, status: 'Tăng ổn định', note: 'Thị trường tiêu chuẩn cao' },
      { market: 'Úc & Canada', share: 20, growthYoY: 16, status: 'Tăng mạnh', note: 'Thị trường tiềm năng tiêu thụ mạnh tôm sú' },
      { market: 'Khác', share: 10, growthYoY: 8, status: 'Tăng ổn định', note: 'Nội địa' },
    ],
    farmingAutonomy: {
      rate: '30% - 35%',
      description: 'Nhà máy chế biến lâu đời tại Cà Mau, mạng lưới thu mua vệ tinh sâu rộng tại vùng tôm Cà Mau và Bạc Liêu.',
      feedSelfSufficient: false,
    },
    q2Actual: { revenue: 215, netProfit: 8.6, growthYoY: 10.2 },
    q3Forecast: {
      rating: 'TĂNG TRƯỞNG TÍCH CỰC',
      ratingBadgeColor: 'emerald',
      revenueEst: 282.9,
      profitEst: 26.6,
      revenueGrowthYoY: 20.6,
      profitGrowthYoY: 20.8,
      drivers: [
        'BCTC Hợp nhất Q3/2026 chính thức: Doanh thu thuần đạt 282,9 tỷ VNĐ (+20,6% YoY), LNST đạt 26,6 tỷ VNĐ (+20,8% YoY)',
        'Lũy kế 9T/2026 đạt 648,5 tỷ VNĐ doanh thu và 54,7 tỷ VNĐ LNST nhờ ổn định đơn hàng thủy sản xuất khẩu sang châu Á & EU',
      ],
      headwinds: ['Quy mô vốn nhỏ, thanh khoản thấp trên sàn UPCoM'],
      vasepSignal: 'Seaprimexco (CAT) công bố BCTC Q3/2026 tăng trưởng đồng đều cả doanh thu (+20,6%) lẫn lợi nhuận sau thuế (+20,8% YoY).',
    },
  },

  // --- NHÓM ĐẶC THÙ: NGHÊU & BỘT CÁ / SURIMI ---
  {
    ticker: 'ABT',
    name: 'CTCP XNK Thủy sản Bến Tre (Aquatex Bến Tre)',
    exchange: 'HOSE',
    category: 'Nghêu & Nhuyễn thể',
    avatarColor: 'from-emerald-600 to-teal-500',
    marketCap: 450,
    pe: 10.2,
    pb: 0.95,
    currentPrice: 38.5,
    mainProducts: ['Nghêu trắng, nghêu lụa đông lạnh (Clam)', 'Nghêu nguyên con hút chân không', 'Cá tra fillet Bến Tre'],
    keyMarkets: [
      { market: 'Châu Âu (EU)', share: 65, growthYoY: 24, status: 'Tăng mạnh', note: 'Ý, Tây Ban Nha, Bồ Đào Nha tiêu thụ >65% sản lượng nghêu ABT' },
      { market: 'Nhật Bản & Mỹ', share: 20, growthYoY: 12, status: 'Tăng ổn định', note: 'Phân khúc nhà hàng hải sản cao cấp' },
      { market: 'Nội địa & Khác', share: 15, growthYoY: 15, status: 'Tăng ổn định', note: 'Kênh siêu thị Co.opmart, WinMart' },
    ],
    farmingAutonomy: {
      rate: 'Vùng nuôi nghêu MSC độc quyền',
      areaHa: 1500,
      description: 'Sở hữu vùng nuôi nghêu Bến Tre đạt chứng nhận MSC (Khai thác thủy sản bền vững) đầu tiên và duy nhất tại Đông Nam Á.',
      feedSelfSufficient: true,
    },
    q2Actual: { revenue: 148, netProfit: 16.8, growthYoY: 19.5 },
    q3Forecast: {
      rating: 'KHẢ QUAN',
      ratingBadgeColor: 'teal',
      revenueEst: 227.9,
      profitEst: 44.1,
      revenueGrowthYoY: 18.2,
      profitGrowthYoY: 9.5,
      drivers: [
        'BCTC Hợp nhất Q3/2026 chính thức: Doanh thu thuần đạt 227,9 tỷ VNĐ (+18,2% YoY), lợi nhuận gộp đạt 67,8 tỷ VNĐ (biên lãi gộp 29,8%)',
        'LNST Q3/2026 đạt 44,1 tỷ VNĐ (+9,5% YoY); lũy kế 9T/2026 đạt 629,8 tỷ doanh thu (+17,9% YoY) và 117,9 tỷ VNĐ LNST',
        'Nghêu sạch Bến Tre đạt chuẩn MSC xuất sang Nam Âu (Ý, Tây Ban Nha) duy trì biên lãi gộp vượt trội toàn ngành',
      ],
      headwinds: ['Rủi ro biến đổi khí hậu / nước ngọt xâm nhập ảnh hưởng sản lượng bãi nghêu Bến Tre'],
      vasepSignal: 'Aquatex Bến Tre (ABT) giữ vững biên lãi gộp đỉnh 29,8% trong BCTC Q3/2026; nhuyễn thể 2 mảnh vỏ 10T/2026 tiếp tục tăng trưởng +15,6% YoY.',
    },
  },
  {
    ticker: 'KHS',
    name: 'CTCP Kiên Hùng',
    exchange: 'HNX',
    category: 'Surimi & Bột cá',
    avatarColor: 'from-purple-600 to-indigo-500',
    marketCap: 245,
    pe: 8.5,
    pb: 0.75,
    currentPrice: 18.0,
    mainProducts: ['Bột cá độ đạm cao (Fishmeal 60-65% đạm)', 'Chả cá & Surimi xuất khẩu', 'Mực, bạch tuộc đông lạnh Kiên Giang'],
    keyMarkets: [
      { market: 'Nội địa & Trung Quốc (Bột cá)', share: 45, growthYoY: 14, status: 'Tăng ổn định', note: 'Bán cho các tập đoàn thức ăn chăn nuôi CP, De Heus, Japfa' },
      { market: 'Hàn Quốc & Nhật (Surimi)', share: 35, growthYoY: 18, status: 'Tăng mạnh', note: 'Hàn Quốc nhập khẩu lượng lớn chả cá làm bánh Odeng' },
      { market: 'ASEAN & Khác', share: 20, growthYoY: 10, status: 'Tăng ổn định', note: 'Thái Lan, Đài Loan' },
    ],
    farmingAutonomy: {
      rate: 'Hải sản khai thác biển',
      description: 'Cụm nhà máy chế biến bột cá và surimi hiện đại ngay tại cảng cá Tắc Cậu (Kiên Giang), nguồn cá biển tươi dồi dào.',
      feedSelfSufficient: true,
    },
    q2Actual: { revenue: 345, netProfit: 12.5, growthYoY: 15.0 },
    q3Forecast: {
      rating: 'ĐI NGANG',
      ratingBadgeColor: 'amber',
      revenueEst: 171.6,
      profitEst: 7.47,
      revenueGrowthYoY: 1.5,
      profitGrowthYoY: 1.2,
      drivers: [
        'BCTC Q3/2026 chính thức: Doanh thu thuần đạt 171,6 tỷ VNĐ (+1,5% YoY), LNST đạt 7,47 tỷ VNĐ (+1,2% YoY); lũy kế 9T đạt 563,7 tỷ DT và 36,9 tỷ LNST',
        'Dòng tiền hoạt động kinh doanh 9T/2026 dương mạnh +142,7 tỷ VNĐ, giúp cắt giảm nợ vay ngắn hạn từ 116,1 tỷ xuống còn 38,3 tỷ VNĐ',
        'Chấm dứt và chuyển giao chi nhánh nhà máy bột cá Kiên Hùng trong Q3/2026 nhằm tái cấu trúc tập trung vào surimi & chả cá xuất khẩu',
      ],
      headwinds: ['Chiến dịch kiểm soát thẻ vàng IUU gắt gao tại vùng biển Kiên Giang ảnh hưởng đến nguồn cung cá tạp nguyên liệu'],
      vasepSignal: 'KHS giữ LNST đi ngang (+1,2% YoY) trong Q3/2026 nhưng dòng tiền 9T cải thiện vượt trội (+142,7 tỷ) và giảm hơn 67% nợ vay ngắn hạn.',
    },
  },
];

// -------------------------------------------------------------
// DỮ LIỆU BẢNG GIÁ NGUYÊN LIỆU HÀNG TUẦN THỰC TẾ TỪ VASEP
// -------------------------------------------------------------
export const WEEKLY_MATERIAL_PRICES: RawMaterialWeeklyPrice[] = [
  {
    period: '31/10 – 06/11/2026',
    dateFormatted: '06/11/2026',
    region: 'Đồng Tháp / An Giang / Cà Mau',
    pangasius_white_meat: 36500, // VASEP tuần đầu T11: 35.000 - 38.000 đ/kg
    pangasius_change_wow: 1500,
    pangasius_fingerling: 52500, // VASEP Đồng Tháp: 50.000 - 55.000 đ/kg
    white_shrimp_100: 91000,
    white_shrimp_50: 112500,
    white_shrimp_30: 132000,
    black_tiger_shrimp_30: 162000,
    clam_mussel: 29500,
    tilapia: 47500,
  },
  {
    period: '24/10 – 30/10/2026',
    dateFormatted: '30/10/2026',
    region: 'Đồng Tháp / An Giang / Cà Mau',
    pangasius_white_meat: 35000,
    pangasius_change_wow: 500,
    pangasius_fingerling: 54000,
    white_shrimp_100: 92000,
    white_shrimp_50: 114000,
    white_shrimp_30: 133500,
    black_tiger_shrimp_30: 162000,
    clam_mussel: 29000,
    tilapia: 47000,
  },
  {
    period: '17/10 – 23/10/2026',
    dateFormatted: '23/10/2026',
    region: 'Đồng Tháp / An Giang / Cà Mau',
    pangasius_white_meat: 34500, // VASEP báo cáo tháng 10: 33.000 - 37.000 đ/kg
    pangasius_change_wow: 500,
    pangasius_fingerling: 55000, // 52.000 - 58.000 đ/kg
    white_shrimp_100: 92000,
    white_shrimp_50: 114000,
    white_shrimp_30: 134000,
    black_tiger_shrimp_30: 162000,
    clam_mussel: 29000,
    tilapia: 47000,
  },
  {
    period: '10/10 – 16/10/2026',
    dateFormatted: '16/10/2026',
    region: 'Đồng Tháp / An Giang / Cà Mau',
    pangasius_white_meat: 34000,
    pangasius_change_wow: 1000,
    pangasius_fingerling: 56000,
    white_shrimp_100: 91500,
    white_shrimp_50: 113000,
    white_shrimp_30: 133000,
    black_tiger_shrimp_30: 161000,
    clam_mussel: 28500,
    tilapia: 46500,
  },
  {
    period: '03/10 – 09/10/2026',
    dateFormatted: '09/10/2026',
    region: 'Đồng Tháp / An Giang / Cà Mau',
    pangasius_white_meat: 33000,
    pangasius_change_wow: 0,
    pangasius_fingerling: 57000,
    white_shrimp_100: 91000,
    white_shrimp_50: 112500,
    white_shrimp_30: 132500,
    black_tiger_shrimp_30: 160000,
    clam_mussel: 28500,
    tilapia: 46500,
  },
  {
    period: '26/9 – 02/10/2026',
    dateFormatted: '02/10/2026',
    region: 'Đồng Tháp / An Giang / Cà Mau',
    pangasius_white_meat: 33000, // 32.000 - 34.500
    pangasius_change_wow: 500,
    pangasius_fingerling: 58500, // 52.000 - 65.000
    white_shrimp_100: 91000,
    white_shrimp_50: 112000,
    white_shrimp_30: 132000,
    black_tiger_shrimp_30: 160000,
    clam_mussel: 28500,
    tilapia: 46500,
  },
  {
    period: '19/9 – 25/9/2026',
    dateFormatted: '25/09/2026',
    region: 'Đồng Tháp / An Giang / Cà Mau',
    pangasius_white_meat: 32500, // 31.000 - 34.000
    pangasius_change_wow: 1000,
    pangasius_fingerling: 58500, // 52.000 - 65.000
    white_shrimp_100: 90000,
    white_shrimp_50: 110000,
    white_shrimp_30: 130000,
    black_tiger_shrimp_30: 158000,
    clam_mussel: 28000,
    tilapia: 46000,
  },
  {
    period: '12/9 – 18/9/2026',
    dateFormatted: '18/09/2026',
    region: 'Đồng Tháp / An Giang / Cà Mau',
    pangasius_white_meat: 31500,
    pangasius_change_wow: 500,
    pangasius_fingerling: 51500,
    white_shrimp_100: 89000,
    white_shrimp_50: 108000,
    white_shrimp_30: 129000,
    black_tiger_shrimp_30: 156000,
    clam_mussel: 27500,
    tilapia: 45000,
  },
  {
    period: '05/9 – 11/9/2026',
    dateFormatted: '11/09/2026',
    region: 'Đồng Tháp / An Giang / Cà Mau',
    pangasius_white_meat: 31000,
    pangasius_change_wow: 500,
    pangasius_fingerling: 50000,
    white_shrimp_100: 88000,
    white_shrimp_50: 107000,
    white_shrimp_30: 127000,
    black_tiger_shrimp_30: 155000,
    clam_mussel: 27000,
    tilapia: 44000,
  },
  {
    period: '29/8 – 04/9/2026',
    dateFormatted: '04/09/2026',
    region: 'Đồng Tháp / An Giang / Cà Mau',
    pangasius_white_meat: 30500,
    pangasius_change_wow: 0,
    pangasius_fingerling: 48000,
    white_shrimp_100: 88000,
    white_shrimp_50: 106000,
    white_shrimp_30: 126000,
    black_tiger_shrimp_30: 153000,
    clam_mussel: 26500,
    tilapia: 44000,
  },
  {
    period: '22/8 – 28/8/2026',
    dateFormatted: '28/08/2026',
    region: 'Đồng Tháp / An Giang / Cà Mau',
    pangasius_white_meat: 30500,
    pangasius_change_wow: 500,
    pangasius_fingerling: 47000,
    white_shrimp_100: 87000,
    white_shrimp_50: 105000,
    white_shrimp_30: 125000,
    black_tiger_shrimp_30: 152000,
    clam_mussel: 26000,
    tilapia: 43000,
  },
  {
    period: '15/8 – 21/8/2026',
    dateFormatted: '21/08/2026',
    region: 'Đồng Tháp / An Giang / Cà Mau',
    pangasius_white_meat: 30000,
    pangasius_change_wow: 0,
    pangasius_fingerling: 46000,
    white_shrimp_100: 86000,
    white_shrimp_50: 104000,
    white_shrimp_30: 124000,
    black_tiger_shrimp_30: 150000,
    clam_mussel: 26000,
    tilapia: 43000,
  },
  {
    period: '01/8 – 07/8/2026',
    dateFormatted: '07/08/2026',
    region: 'Đồng Tháp / An Giang / Cà Mau',
    pangasius_white_meat: 29500,
    pangasius_change_wow: 500,
    pangasius_fingerling: 44000,
    white_shrimp_100: 85000,
    white_shrimp_50: 103000,
    white_shrimp_30: 122000,
    black_tiger_shrimp_30: 148000,
    clam_mussel: 25000,
    tilapia: 42000,
  },
  {
    period: '15/7 – 21/7/2026',
    dateFormatted: '21/07/2026',
    region: 'Đồng Tháp / An Giang / Cà Mau',
    pangasius_white_meat: 29000,
    pangasius_change_wow: 0,
    pangasius_fingerling: 43000,
    white_shrimp_100: 84000,
    white_shrimp_50: 102000,
    white_shrimp_30: 120000,
    black_tiger_shrimp_30: 147000,
    clam_mussel: 25000,
    tilapia: 41000,
  },
];

// -------------------------------------------------------------
// DỮ LIỆU XUẤT KHẨU TOÀN NGÀNH VASEP 10 THÁNG 2026 (CẬP NHẬT T10/2026)
// -------------------------------------------------------------
export const VASEP_SECTOR_STATS: VasepMarketData[] = [
  {
    sector: 'Cá tra',
    total8mUSD: 1500,
    growth8mYoY: 10.0,
    augustUSD: 205,
    augustGrowthYoY: 6.0,
    total9mUSD: 1740,
    growth9mYoY: 10.7,
    septemberUSD: 214,
    septemberGrowthYoY: 18.6,
    total10mUSD: 1982,
    growth10mYoY: 11.0,
    octoberUSD: 249,
    octoberGrowthYoY: 14.9,
    topMarkets: [
      { country: 'Trung Quốc & HK', val8mUSD: 417, val9mUSD: 485, growthYoY: 28.5, sharePercent: 27.9 },
      { country: 'Hoa Kỳ', val8mUSD: 225, val9mUSD: 258, growthYoY: -12.9, sharePercent: 14.8 },
      { country: 'Châu Âu (EU)', val8mUSD: 185, val9mUSD: 212, growthYoY: 9.5, sharePercent: 12.2 },
      { country: 'Brazil', val8mUSD: 125, val9mUSD: 145, growthYoY: 25.8, sharePercent: 8.3 },
      { country: 'CPTPP (ASEAN, Nhật, Mexico)', val8mUSD: 310, val9mUSD: 360, growthYoY: 11.8, sharePercent: 20.7 },
    ],
    marketDrivers: 'Cá tra tháng 10/2026 đạt 249 triệu USD (+14.9% YoY), lũy kế 10T cán mốc 1,982 tỷ USD (+11.0% YoY) nhờ giá cá tuyết/minh thái thế giới tăng cao; giá cá tra thịt trắng đầu T11 lên đỉnh 35.000 - 38.000 đ/kg.',
  },
  {
    sector: 'Tôm',
    total8mUSD: 2800,
    growth8mYoY: 12.0,
    augustUSD: 410,
    augustGrowthYoY: 14.0,
    total9mUSD: 3750,
    growth9mYoY: 11.0,
    septemberUSD: 467,
    septemberGrowthYoY: 3.9,
    total10mUSD: 4220,
    growth10mYoY: 9.0,
    octoberUSD: 474,
    octoberGrowthYoY: -4.9,
    topMarkets: [
      { country: 'Hoa Kỳ', val8mUSD: 520, val9mUSD: 690, growthYoY: -19.1, sharePercent: 18.4 },
      { country: 'Trung Quốc & HK', val8mUSD: 450, val9mUSD: 605, growthYoY: 19.5, sharePercent: 16.1 },
      { country: 'Nhật Bản', val8mUSD: 430, val9mUSD: 575, growthYoY: 9.8, sharePercent: 15.3 },
      { country: 'Châu Âu (EU)', val8mUSD: 360, val9mUSD: 485, growthYoY: 16.8, sharePercent: 12.9 },
      { country: 'Hàn Quốc & Úc', val8mUSD: 380, val9mUSD: 510, growthYoY: 11.2, sharePercent: 13.6 },
    ],
    marketDrivers: 'Tôm 10 tháng đạt 4,220 tỷ USD (+9.0% YoY) nhờ tôm hùm và tôm sú; riêng tháng 10 đạt 474 triệu USD (-4.9% YoY; tôm thẻ -8.3% còn 307 tr USD) do cạnh tranh giá từ Ecuador & Ấn Độ. FMC tháng 10 đảo chiều +6%+ đạt 27,38 tr USD.',
  },
  {
    sector: 'Cá ngừ',
    total8mUSD: 660,
    growth8mYoY: 15.0,
    augustUSD: 85,
    augustGrowthYoY: 12.0,
    total9mUSD: 742,
    growth9mYoY: 14.5,
    septemberUSD: 82,
    septemberGrowthYoY: 8.0,
    total10mUSD: 841,
    growth10mYoY: 13.4,
    octoberUSD: 99,
    octoberGrowthYoY: 5.8,
    topMarkets: [
      { country: 'Hoa Kỳ', val8mUSD: 290, val9mUSD: 325, growthYoY: 12.0, sharePercent: 43.8 },
      { country: 'Châu Âu (EU)', val8mUSD: 145, val9mUSD: 165, growthYoY: 18.0, sharePercent: 22.2 },
      { country: 'CPTPP & Khác', val8mUSD: 225, val9mUSD: 252, growthYoY: 15.0, sharePercent: 34.0 },
    ],
    marketDrivers: 'Cá ngừ lũy kế 10T tăng +13.4% YoY; cùng với mực và bạch tuộc (tháng 10 +14.8% YoY) giữ nhịp tăng trưởng tốt tại Bắc Mỹ và EU.',
  },
  {
    sector: 'Surimi & Chả cá',
    total8mUSD: 215,
    growth8mYoY: 8.8,
    augustUSD: 32,
    augustGrowthYoY: 11.0,
    total9mUSD: 250,
    growth9mYoY: 9.1,
    septemberUSD: 35,
    septemberGrowthYoY: 9.5,
    total10mUSD: 286,
    growth10mYoY: 9.4,
    octoberUSD: 36,
    octoberGrowthYoY: 10.2,
    topMarkets: [
      { country: 'Hàn Quốc', val8mUSD: 85, val9mUSD: 98, growthYoY: 16.0, sharePercent: 39.2 },
      { country: 'Thái Lan', val8mUSD: 42, val9mUSD: 49, growthYoY: 9.0, sharePercent: 19.6 },
      { country: 'Trung Quốc', val8mUSD: 38, val9mUSD: 44, growthYoY: 11.5, sharePercent: 17.6 },
      { country: 'Nhật Bản', val8mUSD: 30, val9mUSD: 35, growthYoY: 5.5, sharePercent: 14.0 },
    ],
    marketDrivers: 'Hàn Quốc duy trì nhu cầu nhập khẩu chả cá làm bánh Odeng; KHS hoàn tất tái cấu trúc chấm dứt chi nhánh bột cá trong Q3 để tập trung vào surimi.',
  },
  {
    sector: 'Nhuyễn thể 2 vỏ',
    total8mUSD: 98,
    growth8mYoY: 15.2,
    augustUSD: 14.5,
    augustGrowthYoY: 18.0,
    total9mUSD: 114,
    growth9mYoY: 15.8,
    septemberUSD: 16,
    septemberGrowthYoY: 14.2,
    total10mUSD: 131,
    growth10mYoY: 15.6,
    octoberUSD: 17,
    octoberGrowthYoY: 14.5,
    topMarkets: [
      { country: 'Ý (Italy)', val8mUSD: 38, val9mUSD: 44, growthYoY: 25.0, sharePercent: 38.6 },
      { country: 'Tây Ban Nha', val8mUSD: 24, val9mUSD: 28, growthYoY: 19.0, sharePercent: 24.5 },
      { country: 'Bồ Đào Nha & Pháp', val8mUSD: 16, val9mUSD: 19, growthYoY: 12.0, sharePercent: 16.7 },
      { country: 'Nhật Bản & Mỹ', val8mUSD: 12, val9mUSD: 14, growthYoY: 8.0, sharePercent: 12.3 },
    ],
    marketDrivers: 'Nghêu sạch Bến Tre đạt chuẩn MSC (ABT) giữ thị phần cao tại Nam Âu (Ý, Tây Ban Nha), giúp ABT đạt biên gộp Q3 tới 29.8%.',
  },
  {
    sector: 'Bột cá',
    total8mUSD: 145,
    growth8mYoY: 7.2,
    augustUSD: 21,
    augustGrowthYoY: 8.5,
    total9mUSD: 168,
    growth9mYoY: 7.5,
    septemberUSD: 23,
    septemberGrowthYoY: 8.0,
    total10mUSD: 192,
    growth10mYoY: 7.8,
    octoberUSD: 24,
    octoberGrowthYoY: 8.5,
    topMarkets: [
      { country: 'Trung Quốc', val8mUSD: 98, val9mUSD: 114, growthYoY: 9.2, sharePercent: 67.8 },
      { country: 'Đài Loan & ASEAN', val8mUSD: 32, val9mUSD: 37, growthYoY: 6.0, sharePercent: 22.0 },
    ],
    marketDrivers: 'Nhu cầu bột cá làm thức ăn chăn nuôi tại Trung Quốc và nội địa neo cao do sản lượng bột cá khai thác từ Nam Mỹ (Peru) bị giới hạn hạn ngạch.',
  },
];
