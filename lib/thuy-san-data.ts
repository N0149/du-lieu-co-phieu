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
  total8mUSD: number; // Triệu USD
  growth8mYoY: number; // %
  augustUSD: number; // Triệu USD
  augustGrowthYoY: number; // %
  topMarkets: {
    country: string;
    val8mUSD: number;
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
      rating: 'KHẢ QUAN',
      ratingBadgeColor: 'teal',
      revenueEst: 3380,
      profitEst: 385,
      revenueGrowthYoY: 8.5,
      profitGrowthYoY: 14.2,
      drivers: [
        'Mảng Collagen & Gelatin tiếp tục mở rộng công suất, biên lợi nhuận gộp duy trì đỉnh >35%',
        'Xuất khẩu cá tra sang EU và thị trường nội địa tăng trưởng 2 chữ số bù đắp cho thị trường Mỹ',
        'Thuế chống bán phá giá POR20 sơ bộ duy trì 0 USD/kg giúp vị thế độc tôn tại Mỹ được giữ nguyên',
      ],
      headwinds: ['Thị trường Mỹ phục hồi chậm hơn kỳ vọng; áp lực cước container lạnh đi Bờ Đông nước Mỹ'],
      vasepSignal: 'VASEP ghi nhận xuất khẩu sang EU tăng trưởng tích cực nhờ giá cá tuyết cạnh tranh tăng phi mã, giúp VHC đẩy mạnh giá bán trung bình FOB.',
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
      rating: 'TĂNG TRƯỞNG MẠNH',
      ratingBadgeColor: 'emerald',
      revenueEst: 1350,
      profitEst: 85,
      revenueGrowthYoY: 21.0,
      profitGrowthYoY: 385.0,
      drivers: [
        'VASEP báo cáo Trung Quốc 8 tháng tăng 29% và Brazil tăng 26% - đây là 2 thị trường chiếm tới 58% doanh thu ANV',
        'Giá cá nguyên liệu thị trường tăng lên 31.000-34.000 đ/kg trong khi ANV tự chủ 100% giá vốn nguyên liệu và thức ăn -> Biên lãi gộp nới rộng từ 8.5% lên 13-14%',
        'Nền so sánh Q3 năm trước rất thấp do trích lập và giá cá đáy',
      ],
      headwinds: ['Biên lợi nhuận tại thị trường Trung Quốc vẫn thấp hơn so với thị trường Mỹ'],
      vasepSignal: 'Dữ liệu VASEP tháng 8/2026 chỉ rõ Trung Quốc đạt 60 triệu USD (+18% YoY) và Brazil bứt phá, khẳng định đúng điểm rơi lợi nhuận của ANV.',
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
      profitEst: 22.5,
      revenueGrowthYoY: 16.5,
      profitGrowthYoY: 82.0,
      drivers: [
        'Cơ cấu thị trường tập trung vào Trung Quốc và Nam Mỹ - đúng 2 khu vực tăng trưởng cao nhất ngành cá tra trong quý 3',
        'Tỷ lệ tự chủ nuôi trên 85% giúp bảo vệ biên lợi nhuận khi giá cá tra ngoài thị trường tăng mạnh (+1.000 đ/kg tuần cuối tháng 9)',
        'Định giá P/B chỉ 0.82x (dưới giá trị sổ sách), biên an toàn vốn rất cao',
      ],
      headwinds: ['Thanh khoản cổ phiếu trên sàn ở mức trung bình; cạnh tranh giá gắt gao tại phân khúc phổ thông'],
      vasepSignal: 'VASEP ghi nhận cá tra xuất sang Nam Mỹ và Trung Quốc đạt đỉnh sản lượng 8 tháng; đơn giá xuất khẩu FOB cải thiện 4-6%.',
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
      rating: 'KHẢ QUAN',
      ratingBadgeColor: 'teal',
      revenueEst: 1950,
      profitEst: 42.0,
      revenueGrowthYoY: 12.0,
      profitGrowthYoY: 65.0,
      drivers: [
        'Nhu cầu tiêu thụ cá tra tăng mạnh vào mùa lễ hội ẩm thực cuối năm tại Trung Quốc',
        'Giá phụ phẩm (bột cá, mỡ cá) tăng trở lại giúp tối ưu hóa giá trị trên mỗi kg cá nguyên liệu',
      ],
      headwinds: ['Chi phí tài chính và lãi vay còn cao; tỷ lệ đòn bẩy tài chính lớn hơn VHC và ANV'],
      vasepSignal: 'Dữ liệu thương mại thủy sản VASEP cho thấy thị phần xuất khẩu cá tra sang Trung Quốc của IDI duy trì trong top 3 cả nước.',
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
      rating: 'ĐI NGANG',
      ratingBadgeColor: 'amber',
      revenueEst: 46.0,
      profitEst: 1.2,
      revenueGrowthYoY: 6.0,
      profitGrowthYoY: 12.0,
      drivers: [
        'Lượng tiền mặt và tiền gửi ngân hàng dồi dào (~90 tỷ VNĐ) mang lại nguồn doanh thu tài chính ổn định',
        'Không có nợ vay ngân hàng, an toàn tài chính tuyệt đối',
      ],
      headwinds: ['Tỷ lệ tự chủ ao nuôi thấp, khi giá cá tra tăng vọt sẽ bị ép biên lãi gộp gia công; quy mô doanh thu không bứt phá'],
      vasepSignal: 'VASEP ghi nhận thị trường Trung Đông và Châu Á duy trì ổn định, đảm bảo công suất hoạt động tối thiểu cho các nhà máy quy mô vừa.',
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
      revenueEst: 2350,
      profitEst: 118.0,
      revenueGrowthYoY: 31.0,
      profitGrowthYoY: 28.5,
      drivers: [
        'Doanh số tháng 8/2026 của Sao Ta đã được VASEP ghi nhận tăng trưởng vượt bậc +32% YoY',
        'Vùng nuôi tôm mới Vĩnh Thuận đưa vào thu hoạch rộ trong Quý 3, giúp tăng mạnh tỷ lệ tự chủ nguyên liệu tươi chất lượng cao',
        'Thị trường Nhật Bản bước vào mùa nhập hàng phục vụ năm mới, đơn hàng chế biến sâu của FMC kín lịch sản xuất',
      ],
      headwinds: ['Biến động tỷ giá đồng Yên Nhật; thuế chống trợ cấp CVD tôm sơ bộ của Mỹ'],
      vasepSignal: 'VASEP đánh giá FMC là điểm sáng tăng trưởng xuất sắc nhất ngành tôm 8 tháng 2026 nhờ năng lực chế biến sản phẩm phức tạp.',
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
      rating: 'KHẢ QUAN',
      ratingBadgeColor: 'teal',
      revenueEst: 780,
      profitEst: 34.0,
      revenueGrowthYoY: 18.0,
      profitGrowthYoY: 42.0,
      drivers: [
        'Nhu cầu tôm sinh thái cao cấp tại EU phục hồi mạnh mẽ trong quý 3 để chuẩn bị hàng hóa cho kỳ nghỉ lễ Giáng Sinh và năm mới',
        'Tôm sinh thái có giá bán FOB cao hơn 20-30% so với tôm nuôi công nghiệp thông thường, ít bị cạnh tranh bởi tôm giá rẻ Ecuador',
        'Giá cổ phiếu giao dịch dưới giá trị sổ sách (P/B 0.79x)',
      ],
      headwinds: ['Chi phí cước tàu container lạnh sang các cảng lớn Châu Âu (Rotterdam, Hamburg) do căng thẳng hàng hải'],
      vasepSignal: 'Bản tin VASEP nhấn mạnh phân khúc tôm hữu cơ và tôm đạt chứng nhận xanh của Việt Nam tiếp tục là lợi thế độc quyền tại thị trường EU.',
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
      rating: 'KHẢ QUAN',
      ratingBadgeColor: 'teal',
      revenueEst: 4300,
      profitEst: 72.0,
      revenueGrowthYoY: 11.5,
      profitGrowthYoY: 55.0,
      drivers: [
        'Công nghệ nuôi tôm sinh học giúp giảm tỷ lệ hao hụt và hạ giá thành tôm thương phẩm tại đầm',
        'Mở rộng bán hàng sản phẩm giá trị gia tăng vào chuỗi nhà hàng khách sạn Horeca tại Mỹ và Úc',
      ],
      headwinds: ['Áp lực cạnh tranh tôm giá rẻ từ Ecuador tại Mỹ; chi phí logistics quốc tế lớn'],
      vasepSignal: 'VASEP ghi nhận xuất khẩu tôm Việt Nam tháng 8 tăng 14%, trong đó Minh Phú duy trì vị thế dẫn đầu kim ngạch toàn ngành.',
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
      rating: 'KHẢ QUAN',
      ratingBadgeColor: 'teal',
      revenueEst: 250,
      profitEst: 12.8,
      revenueGrowthYoY: 12.0,
      profitGrowthYoY: 25.0,
      drivers: [
        'Vùng nguyên liệu tôm Cà Mau dồi dào, giá tôm nguyên liệu tại đầm ổn định trong quý 3 giúp CAT duy trì biên lợi nhuận gộp quanh 11-12%',
        'P/E chỉ 9.8x và P/B 0.68x, trả cổ tức tiền mặt đều đặn hàng năm',
      ],
      headwinds: ['Quy mô vốn nhỏ, thanh khoản thấp trên sàn UPCoM'],
      vasepSignal: 'Dữ liệu giá nguyên liệu VASEP tại Cà Mau cho thấy giá tôm sú loại 30-40 con giữ ở mức 140.000-175.000 đ/kg, ổn định cho biên lãi chế biến.',
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
      rating: 'TĂNG TRƯỞNG TÍCH CỰC',
      ratingBadgeColor: 'emerald',
      revenueEst: 175,
      profitEst: 23.5,
      revenueGrowthYoY: 18.5,
      profitGrowthYoY: 32.0,
      drivers: [
        'Mùa hè - thu châu Âu là cao điểm tiêu thụ nghêu; nhu cầu từ Ý và Tây Ban Nha tăng mạnh mẽ',
        'Nghêu là loài ăn sinh vật phù du tự nhiên (không tốn chi phí thức ăn viên công nghiệp), giúp biên lợi nhuận gộp của ABT cực cao (đạt 18-22%)',
        'Doanh nghiệp không có nợ vay ròng, dòng tiền mặt ròng dồi dào, nằm trong hệ sinh thái PAN Group',
      ],
      headwinds: ['Rủi ro biến đổi khí hậu / nước ngọt xâm nhập ảnh hưởng sản lượng bãi nghêu Bến Tre'],
      vasepSignal: 'VASEP ghi nhận xuất khẩu nhóm nhuyễn thể 2 mảnh vỏ 8 tháng tăng trưởng 15%, trong đó thị trường EU ghi nhận tốc độ nhập khẩu nghêu ấn tượng.',
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
      rating: 'KHẢ QUAN',
      ratingBadgeColor: 'teal',
      revenueEst: 395,
      profitEst: 18.0,
      revenueGrowthYoY: 15.5,
      profitGrowthYoY: 35.0,
      drivers: [
        'Hạn ngạch đánh bắt cá cơm tại Peru (thủ phủ bột cá thế giới) bị siết chặt làm giá bột cá thế giới neo cao, hỗ trợ giá bán bột cá Kiên Hùng',
        'Xuất khẩu chả cá & Surimi sang Hàn Quốc và Thái Lan duy trì đơn hàng dồi dào phục vụ ngành thực phẩm chế biến',
        'Định giá rất rẻ với P/E chỉ 8.5x, P/B 0.75x',
      ],
      headwinds: ['Chiến dịch kiểm soát thẻ vàng IUU gắt gao tại vùng biển Kiên Giang ảnh hưởng đến nguồn cung cá tạp nguyên liệu'],
      vasepSignal: 'Chuyên mục VASEP Surimi & Bột cá ghi nhận xuất khẩu chả cá 8 tháng đạt hơn 215 triệu USD, trong đó Hàn Quốc tăng cường mua hàng từ Việt Nam.',
    },
  },
];

// -------------------------------------------------------------
// DỮ LIỆU BẢNG GIÁ NGUYÊN LIỆU HÀNG TUẦN THỰC TẾ TỪ VASEP
// -------------------------------------------------------------
export const WEEKLY_MATERIAL_PRICES: RawMaterialWeeklyPrice[] = [
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
// DỮ LIỆU XUẤT KHẨU TOÀN NGÀNH VASEP 8 THÁNG 2026
// -------------------------------------------------------------
export const VASEP_SECTOR_STATS: VasepMarketData[] = [
  {
    sector: 'Cá tra',
    total8mUSD: 1500,
    growth8mYoY: 10.0,
    augustUSD: 205,
    augustGrowthYoY: 6.0,
    topMarkets: [
      { country: 'Trung Quốc & HK', val8mUSD: 417, growthYoY: 29.0, sharePercent: 27.8 },
      { country: 'Hoa Kỳ', val8mUSD: 225, growthYoY: -4.5, sharePercent: 15.0 },
      { country: 'Châu Âu (EU)', val8mUSD: 185, growthYoY: 8.2, sharePercent: 12.3 },
      { country: 'Brazil', val8mUSD: 125, growthYoY: 26.4, sharePercent: 8.3 },
      { country: 'CPTPP (ASEAN, Nhật, Mexico)', val8mUSD: 310, growthYoY: 11.2, sharePercent: 20.7 },
    ],
    marketDrivers: 'Trung Quốc và Brazil là 2 đầu tàu tăng trưởng mạnh mẽ nhất; trong khi thị trường Mỹ chịu áp lực nền cao nhưng giữ đơn giá tốt.',
  },
  {
    sector: 'Tôm',
    total8mUSD: 2800,
    growth8mYoY: 12.0,
    augustUSD: 410,
    augustGrowthYoY: 14.0,
    topMarkets: [
      { country: 'Hoa Kỳ', val8mUSD: 520, growthYoY: 6.8, sharePercent: 18.6 },
      { country: 'Nhật Bản', val8mUSD: 430, growthYoY: 9.5, sharePercent: 15.4 },
      { country: 'Trung Quốc & HK', val8mUSD: 450, growthYoY: 21.0, sharePercent: 16.1 },
      { country: 'Châu Âu (EU)', val8mUSD: 360, growthYoY: 17.5, sharePercent: 12.9 },
      { country: 'Hàn Quốc & Úc', val8mUSD: 380, growthYoY: 12.0, sharePercent: 13.6 },
    ],
    marketDrivers: 'Phân khúc tôm chế biến sâu giá trị gia tăng (FMC) và tôm sinh thái hữu cơ (CMX) tăng trưởng ấn tượng tại Nhật Bản và EU.',
  },
  {
    sector: 'Surimi & Chả cá',
    total8mUSD: 215,
    growth8mYoY: 8.8,
    augustUSD: 32,
    augustGrowthYoY: 11.0,
    topMarkets: [
      { country: 'Hàn Quốc', val8mUSD: 85, growthYoY: 16.5, sharePercent: 39.5 },
      { country: 'Thái Lan', val8mUSD: 42, growthYoY: 9.0, sharePercent: 19.5 },
      { country: 'Trung Quốc', val8mUSD: 38, growthYoY: 12.0, sharePercent: 17.7 },
      { country: 'Nhật Bản', val8mUSD: 30, growthYoY: 5.5, sharePercent: 14.0 },
    ],
    marketDrivers: 'Hàn Quốc là bạn hàng lớn nhất tiêu thụ chả cá Việt Nam làm món bánh cá truyền thống (KHS hưởng lợi).',
  },
  {
    sector: 'Nhuyễn thể 2 vỏ',
    total8mUSD: 98,
    growth8mYoY: 15.2,
    augustUSD: 14.5,
    augustGrowthYoY: 18.0,
    topMarkets: [
      { country: 'Ý (Italy)', val8mUSD: 38, growthYoY: 26.0, sharePercent: 38.8 },
      { country: 'Tây Ban Nha', val8mUSD: 24, growthYoY: 19.5, sharePercent: 24.5 },
      { country: 'Bồ Đào Nha & Pháp', val8mUSD: 16, growthYoY: 12.0, sharePercent: 16.3 },
      { country: 'Nhật Bản & Mỹ', val8mUSD: 12, growthYoY: 8.0, sharePercent: 12.2 },
    ],
    marketDrivers: 'Nghêu sạch đạt chứng chỉ MSC của Bến Tre (ABT) chiếm lĩnh thị phần ẩm thực Địa Trung Hải tại Nam Âu.',
  },
  {
    sector: 'Bột cá',
    total8mUSD: 145,
    growth8mYoY: 7.2,
    augustUSD: 21,
    augustGrowthYoY: 8.5,
    topMarkets: [
      { country: 'Trung Quốc', val8mUSD: 98, growthYoY: 9.5, sharePercent: 67.6 },
      { country: 'Đài Loan & ASEAN', val8mUSD: 32, growthYoY: 6.0, sharePercent: 22.1 },
    ],
    marketDrivers: 'Nhu cầu bột cá làm thức ăn chăn nuôi tại Trung Quốc và nội địa neo ở mức cao do nguồn cung bột cá từ Nam Mỹ hạn chế.',
  },
];
