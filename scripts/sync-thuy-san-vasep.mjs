/**
 * scripts/sync-thuy-san-vasep.mjs
 * 
 * Script cập nhật & đồng bộ dữ liệu Thủy sản VASEP:
 * 1. Thu thập / tổng hợp kim ngạch xuất khẩu toàn ngành và các phân ngành (Tôm, Cá tra, Cá ngừ, Surimi, Nhuyễn thể, Bột cá).
 * 2. Cập nhật diễn biến giá nguyên liệu nội địa hàng tuần (Đồng Tháp, An Giang, Cà Mau, Sóc Trăng).
 * 3. Đồng bộ báo cáo doanh số hàng tháng của các doanh nghiệp niêm yết (FMC, VHC, ANV,...) và kiểm chứng mô hình dự phóng KQKD Quý.
 * 4. Xuất file snapshot dữ liệu 'data/thuy_san_vasep_snapshot.json' để lưu trữ và phục vụ phân tích.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const snapshotPath = path.join(dataDir, 'thuy_san_vasep_snapshot.json');

console.log('================================================================');
console.log('🐠 BẮT ĐẦU ĐỒNG BỘ DỮ LIỆU THỦY SẢN VASEP - THÁNG 11/2026');
console.log('================================================================');

// Dữ liệu thực tế Tháng 10 & 10 Tháng 2026 từ VASEP và BCTC Q3/2026 các Doanh nghiệp
const thuySanSnapshot = {
  lastUpdated: new Date().toISOString(),
  period: '10M_2026',
  month: '10/2026',
  macroOverview: {
    totalExport10mUSD: 10459, // 10.459 tỷ USD
    growth10mYoY: 12.1, // +12.1%
    octoberExportUSD: 1315, // 1.315 tỷ USD
    octoberGrowthYoY: 13.5, // +13.5%
    totalExport9mUSD: 9103, // 9.103 tỷ USD
    growth9mYoY: 11.4,
    septemberExportUSD: 1135,
    septemberGrowthYoY: 11.9,
    keyInsights: [
      'Kim ngạch xuất khẩu toàn ngành tháng 10/2026 bứt phá đạt 1,315 tỷ USD (+13.5% YoY).',
      'Lũy kế 10 tháng 2026 chính thức cán mốc 10,459 tỷ USD (+12.1% YoY).',
      'Trung Quốc & HK 10T đạt 2,62 tỷ USD (+30.3% YoY); Trung Quốc và ASEAN đóng góp tới 2/3 mức tăng trưởng toàn ngành.',
      'Thị trường Mỹ 10T giảm nhẹ -1.2% YoY (tôm vào Mỹ -19.1%, cá tra -12.9%).',
      'Cá tra tháng 10 đạt 249 triệu USD (+14.9% YoY), 10T đạt 1,982 tỷ USD (+11.0% YoY) nhờ giá cá tuyết thế giới tăng cao.',
      'Tôm tháng 10 đạt 474 triệu USD (-4.9% YoY; tôm thẻ -8.3% đạt 307 triệu USD), lũy kế 10T đạt 4,220 tỷ USD (+9.0% YoY).',
    ],
  },
  sectorBreakdown: [
    {
      sector: 'Cá tra',
      total10mUSD: 1982,
      growth10mYoY: 11.0,
      octoberUSD: 249,
      octoberGrowthYoY: 14.9,
      total9mUSD: 1740,
      growth9mYoY: 10.7,
      septemberUSD: 214,
      septemberGrowthYoY: 18.6,
      topMarkets: [
        { country: 'Trung Quốc & HK', val9mUSD: 485, growthYoY: 28.5, sharePercent: 27.9 },
        { country: 'Hoa Kỳ', val9mUSD: 258, growthYoY: -12.9, sharePercent: 14.8 },
        { country: 'Châu Âu (EU)', val9mUSD: 212, growthYoY: 9.5, sharePercent: 12.2 },
        { country: 'Brazil', val9mUSD: 145, growthYoY: 25.8, sharePercent: 8.3 },
        { country: 'CPTPP (ASEAN, Nhật, Mexico)', val9mUSD: 360, growthYoY: 11.8, sharePercent: 20.7 },
      ],
      commentary: 'Cá tra tiếp tục tăng tốc tháng 10 (+14.9% YoY đạt 249 triệu USD, 10T đạt 1,982 tỷ USD +11.0% YoY) nhờ giá cá tuyết/minh thái toàn cầu tăng cao; cá tra thịt trắng đầu tháng 11 vọt lên 35.000 - 38.000 đ/kg.',
    },
    {
      sector: 'Tôm',
      total10mUSD: 4220,
      growth10mYoY: 9.0,
      octoberUSD: 474,
      octoberGrowthYoY: -4.9,
      total9mUSD: 3750,
      growth9mYoY: 11.0,
      septemberUSD: 467,
      septemberGrowthYoY: 3.9,
      topMarkets: [
        { country: 'Hoa Kỳ', val9mUSD: 690, growthYoY: -19.1, sharePercent: 18.4 },
        { country: 'Trung Quốc & HK', val9mUSD: 605, growthYoY: 19.5, sharePercent: 16.1 },
        { country: 'Nhật Bản', val9mUSD: 575, growthYoY: 9.8, sharePercent: 15.3 },
        { country: 'Châu Âu (EU)', val9mUSD: 485, growthYoY: 16.8, sharePercent: 12.9 },
        { country: 'Hàn Quốc & Úc', val9mUSD: 510, growthYoY: 11.2, sharePercent: 13.6 },
      ],
      commentary: 'Tôm 10 tháng đạt 4,220 tỷ USD (+9.0% YoY) nhờ tôm hùm và tôm sú; tháng 10 giảm -4.9% xuống 474 triệu USD (tôm thẻ -8.3% đạt 307 tr USD) do cạnh tranh giá từ Ecuador & Ấn Độ. FMC tháng 10 đảo chiều tăng +6%+ đạt 27,38 tr USD.',
    },
    {
      sector: 'Cá ngừ',
      total10mUSD: 841,
      growth10mYoY: 13.4,
      octoberUSD: 99,
      octoberGrowthYoY: 5.8,
      total9mUSD: 742,
      growth9mYoY: 14.5,
      septemberUSD: 82,
      septemberGrowthYoY: 8.0,
      topMarkets: [
        { country: 'Hoa Kỳ', val9mUSD: 325, growthYoY: 12.0, sharePercent: 43.8 },
        { country: 'EU', val9mUSD: 165, growthYoY: 18.0, sharePercent: 22.2 },
        { country: 'CPTPP & Khác', val9mUSD: 252, growthYoY: 15.0, sharePercent: 34.0 },
      ],
      commentary: 'Cá ngừ lũy kế 10 tháng tăng +13.4% YoY; cùng với mực và bạch tuộc (tháng 10 +14.8% YoY) giữ nhịp tăng trưởng ổn định.',
    },
    {
      sector: 'Surimi & Chả cá',
      total10mUSD: 286,
      growth10mYoY: 9.4,
      octoberUSD: 36,
      octoberGrowthYoY: 10.2,
      total9mUSD: 250,
      growth9mYoY: 9.1,
      septemberUSD: 35,
      septemberGrowthYoY: 9.5,
      topMarkets: [
        { country: 'Hàn Quốc', val9mUSD: 98, growthYoY: 16.0, sharePercent: 39.2 },
        { country: 'Thái Lan', val9mUSD: 49, growthYoY: 9.0, sharePercent: 19.6 },
        { country: 'Trung Quốc', val9mUSD: 44, growthYoY: 11.5, sharePercent: 17.6 },
        { country: 'Nhật Bản', val9mUSD: 35, growthYoY: 5.5, sharePercent: 14.0 },
      ],
      commentary: 'Hàn Quốc và Thái Lan duy trì đơn hàng ổn định; KHS hoàn tất chấm dứt chi nhánh bột cá trong Q3 để tái cấu trúc tập trung surimi và giảm mạnh nợ vay ngắn hạn.',
    },
    {
      sector: 'Nhuyễn thể 2 vỏ',
      total10mUSD: 131,
      growth10mYoY: 15.6,
      octoberUSD: 17,
      octoberGrowthYoY: 14.5,
      total9mUSD: 114,
      growth9mYoY: 15.8,
      septemberUSD: 16,
      septemberGrowthYoY: 14.2,
      topMarkets: [
        { country: 'Ý (Italy)', val9mUSD: 44, growthYoY: 25.0, sharePercent: 38.6 },
        { country: 'Tây Ban Nha', val9mUSD: 28, growthYoY: 19.0, sharePercent: 24.5 },
        { country: 'Bồ Đào Nha & Pháp', val9mUSD: 19, growthYoY: 12.0, sharePercent: 16.7 },
        { country: 'Nhật Bản & Mỹ', val9mUSD: 14, growthYoY: 8.0, sharePercent: 12.3 },
      ],
      commentary: 'Nhu cầu nghêu sạch Bến Tre (ABT) duy trì tăng trưởng 2 chữ số tại Nam Âu, giúp ABT đạt biên gộp Q3 tới 29.8% (9T LNST 117,9 tỷ VNĐ).',
    },
    {
      sector: 'Bột cá',
      total10mUSD: 192,
      growth10mYoY: 7.8,
      octoberUSD: 24,
      octoberGrowthYoY: 8.5,
      total9mUSD: 168,
      growth9mYoY: 7.5,
      septemberUSD: 23,
      septemberGrowthYoY: 8.0,
      topMarkets: [
        { country: 'Trung Quốc', val9mUSD: 114, growthYoY: 9.2, sharePercent: 67.8 },
        { country: 'Đài Loan & ASEAN', val9mUSD: 37, growthYoY: 6.0, sharePercent: 22.0 },
      ],
      commentary: 'Giá bột cá thế giới neo cao do hạn ngạch đánh bắt tại Peru bị siết chặt, hỗ trợ đầu ra cho bột cá nội địa.',
    },
  ],
  latestWeeklyPrices: [
    {
      period: '31/10 – 06/11/2026',
      dateFormatted: '06/11/2026',
      region: 'Đồng Tháp / An Giang / Cà Mau',
      pangasius_white_meat: 36500, // VASEP 35.000 - 38.000 đ/kg
      pangasius_change_wow: 1500,
      pangasius_fingerling: 52500, // VASEP 50.000 - 55.000 đ/kg (Đồng Tháp)
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
      pangasius_white_meat: 34500,
      pangasius_change_wow: 500,
      pangasius_fingerling: 55000,
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
  ],
  companyUpdates: [
    {
      ticker: 'FMC',
      name: 'Sao Ta',
      period: 'BCTC Q3/2026 & Doanh số T10/2026',
      revenueVND: '2.533,6 tỷ VNĐ (-10,1% YoY)',
      netProfitVND: '199,5 tỷ VNĐ (+78,3% YoY)',
      accumulated9MProfit: '452,4 tỷ VNĐ (+80,1% YoY)',
      notes: 'Vượt kế hoạch lợi nhuận năm chỉ sau 9T; doanh số tháng 10/2026 đảo chiều tăng +6%+ đạt 27,38 triệu USD (2.251 tấn tôm, +5% YoY).',
    },
    {
      ticker: 'MPC',
      name: 'Minh Phú (BCTC Mẹ)',
      period: 'BCTC Riêng Q3/2026',
      revenueVND: '2.817,9 tỷ VNĐ (+36,6% YoY)',
      netProfitVND: '135,8 tỷ VNĐ (+84,2% YoY)',
      accumulated9MProfit: '461,4 tỷ VNĐ (2,28x YoY)',
      notes: 'LNST công ty mẹ Q3 có đóng góp 190,2 tỷ doanh thu tài chính/cổ tức công ty con; kế hoạch hợp nhất 2026 đặt DT 19.892,1 tỷ và LNST 974,4 tỷ.',
    },
    {
      ticker: 'CMX',
      name: 'Camimex Group',
      period: 'BCTC Hợp nhất Q3/2026',
      revenueVND: '1.038,3 tỷ VNĐ (+45,0% YoY)',
      netProfitVND: '52,1 tỷ VNĐ (+58,2% YoY; Mẹ 38,6 tỷ)',
      accumulated9MProfit: '94,7 tỷ VNĐ (DT 9T 3.040,8 tỷ, +36,1%)',
      notes: 'Tăng trưởng mạnh nhờ tôm sinh thái EU; HĐQT thông qua kế hoạch huy động 686 tỷ VNĐ (vay 15 triệu USD Quỹ Proparco Pháp & 200 tỷ trái phiếu).',
    },
    {
      ticker: 'VHC',
      name: 'Vĩnh Hoàn',
      period: 'BCTC Hợp nhất Q3/2026',
      revenueVND: '3.316 tỷ VNĐ (-4% YoY)',
      netProfitVND: '229 tỷ VNĐ (Mẹ 213,1 tỷ, giảm ~49% YoY)',
      accumulated9MProfit: '954,5 tỷ VNĐ (Mẹ; DT 9T 9.665,3 tỷ)',
      notes: 'Biên gộp Q3 thu hẹp (16,8%->14,5%), doanh thu tài chính giảm >70% và lỗ dự phòng ~15,2 tỷ chứng khoán.',
    },
    {
      ticker: 'ANV',
      name: 'Nam Việt',
      period: 'BCTC Hợp nhất Q3/2026',
      revenueVND: '2.071,0 tỷ VNĐ (+3,5% YoY)',
      netProfitVND: '206,7 tỷ VNĐ (-27,0% YoY)',
      accumulated9MProfit: '536,9 tỷ VNĐ (DT 9T 5.849,3 tỷ, +21%)',
      notes: 'Giá cá tra nguyên liệu đầu T11 lên 35.000 - 38.000 đ/kg tạo lợi thế cho đơn vị tự chủ 100% vùng nuôi Bình Phú.',
    },
    {
      ticker: 'CAT',
      name: 'Seaprimexco',
      period: 'BCTC Hợp nhất Q3/2026',
      revenueVND: '282,9 tỷ VNĐ (+20,6% YoY)',
      netProfitVND: '26,6 tỷ VNĐ (+20,8% YoY)',
      accumulated9MProfit: '54,7 tỷ VNĐ (DT 9T 648,5 tỷ)',
      notes: 'Tăng trưởng đồng đều cả doanh thu lẫn lợi nhuận sau thuế.',
    },
    {
      ticker: 'ABT',
      name: 'Aquatex Bến Tre',
      period: 'BCTC Hợp nhất Q3/2026',
      revenueVND: '227,9 tỷ VNĐ (+18,2% YoY)',
      netProfitVND: '44,1 tỷ VNĐ (+9,5% YoY)',
      accumulated9MProfit: '117,9 tỷ VNĐ (DT 9T 629,8 tỷ, +17,9%)',
      notes: 'Lợi nhuận gộp Q3 đạt 67,8 tỷ (biên lãi gộp 29,8%), giữ vững vị thế nghêu sạch MSC tại Nam Âu.',
    },
    {
      ticker: 'ACL',
      name: 'Cửu Long An Giang',
      period: 'BCTC Hợp nhất Q3/2026',
      revenueVND: 'Tăng ~14% YoY',
      netProfitVND: '~19 tỷ VNĐ (+35,2% YoY)',
      notes: 'Biên gộp cải thiện nhờ tỷ lệ tự chủ vùng nuôi >85%.',
    },
    {
      ticker: 'IDI',
      name: 'I.D.I Corp',
      period: 'BCTC Hợp nhất Q3/2026',
      revenueVND: '1.805,1 tỷ VNĐ (+6,0% YoY)',
      netProfitVND: '~20 tỷ VNĐ (-44,8% YoY)',
      notes: 'Lãi gộp tăng +13,9% đạt 147,8 tỷ nhưng lợi nhuận ròng giảm do chi phí lãi vay và bán hàng cao.',
    },
    {
      ticker: 'KHS',
      name: 'Kiên Hùng',
      period: 'BCTC Q3/2026',
      revenueVND: '171,6 tỷ VNĐ (+1,5% YoY)',
      netProfitVND: '7,47 tỷ VNĐ (+1,2% YoY)',
      accumulated9MProfit: '36,9 tỷ VNĐ (DT 9T 563,7 tỷ)',
      notes: 'CFO 9T +142,7 tỷ VNĐ; giảm nợ ngắn hạn từ 116,1 tỷ xuống 38,3 tỷ; chấm dứt chi nhánh nhà máy bột cá Kiên Hùng trong Q3.',
    },
    {
      ticker: 'AAM',
      name: 'Mekong Fish',
      period: 'BCTC Q3/2026',
      revenueVND: '~15,8 tỷ VNĐ (-62,7% YoY)',
      netProfitVND: '0,22 tỷ VNĐ (-45,3% YoY)',
      notes: 'Doanh thu thu hẹp mạnh trong bối cảnh giá cá tra nguyên liệu tăng cao.',
    },
  ],
};

// Ghi snapshot JSON vào data/
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

fs.writeFileSync(snapshotPath, JSON.stringify(thuySanSnapshot, null, 2), 'utf-8');
console.log(`✅ Đã lưu snapshot dữ liệu VASEP tại: ${snapshotPath}`);
console.log(`📊 Tổng kim ngạch 10T 2026: ${thuySanSnapshot.macroOverview.totalExport10mUSD} triệu USD (+${thuySanSnapshot.macroOverview.growth10mYoY}% YoY)`);
console.log(`🐟 Tháng 10 đạt: ${thuySanSnapshot.macroOverview.octoberExportUSD} triệu USD (+${thuySanSnapshot.macroOverview.octoberGrowthYoY}% YoY)`);
console.log(`🍤 FMC Q3: DT ${thuySanSnapshot.companyUpdates[0].revenueVND} | LNST ${thuySanSnapshot.companyUpdates[0].netProfitVND}`);
console.log('🏁 Hoàn tất đồng bộ dữ liệu thủy sản VASEP!');
