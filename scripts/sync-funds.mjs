/**
 * Sync Open-Ended Funds Data (Quỹ Mở) from Fmarket API
 * 
 * Nguồn dữ liệu: Fmarket API (https://api.fmarket.vn/res/products/filter)
 * Outputs:
 *   1. data/funds_snapshot.json (Primary snapshot)
 *   2. lib/funds-data.ts (TypeScript static fallback & definitions)
 * 
 * Cách chạy:
 *   node scripts/sync-funds.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const SNAPSHOT_PATH = path.join(DATA_DIR, 'funds_snapshot.json');
const FUNDS_DATA_TS_PATH = path.join(ROOT_DIR, 'lib', 'funds-data.ts');

const STOCK_NAMES = {
  VIC: 'Tập đoàn Vingroup',
  VHM: 'CTCP Vinhomes',
  VRE: 'Vincom Retail',
  HPG: 'Tập đoàn Hòa Phát',
  HSG: 'Tập đoàn Hoa Sen',
  NKG: 'Thép Nam Kim',
  FPT: 'Tập đoàn FPT',
  MWG: 'Thế Giới Di Động',
  FRT: 'Bán lẻ FPT (Long Châu)',
  DGW: 'Thế Giới Số (Digiworld)',
  PNJ: 'Vàng bạc Phú Nhuận',
  MSN: 'Tập đoàn Masan',
  VNM: 'Vinamilk',
  SAB: 'Sabeco',
  KDC: 'Tập đoàn KIDO',
  QNS: 'Đường Quảng Ngãi',
  VCB: 'Vietcombank',
  BID: 'BIDV',
  CTG: 'VietinBank',
  TCB: 'Techcombank',
  MBB: 'Ngân hàng Quân Đội',
  ACB: 'Ngân hàng Á Châu',
  VPB: 'VPBank',
  STB: 'Sacombank',
  HDB: 'HDBank',
  TPB: 'TPBank',
  VIB: 'VIBank',
  SHB: 'SHB',
  LPB: 'LPBank',
  MSB: 'MSB',
  OCB: 'OCB',
  SSB: 'SeABank',
  EIB: 'Eximbank',
  SSI: 'Chứng khoán SSI',
  VND: 'Chứng khoán VNDIRECT',
  VCI: 'Chứng khoán Vietcap',
  HCM: 'Chứng khoán HSC',
  MBS: 'Chứng khoán MB',
  SHS: 'Chứng khoán SHS',
  FTS: 'Chứng khoán FPT',
  BSI: 'Chứng khoán BSC',
  CTS: 'Chứng khoán VietinBank',
  KDH: 'Nhà Khang Điền',
  NLG: 'Nam Long',
  DXG: 'Đất Xanh',
  PDR: 'Phát Đạt',
  DIG: 'DIC Corp',
  BCM: 'Becamex IDC',
  KBC: 'Kinh Bắc',
  IDC: 'Tổng Công ty IDICO',
  SZC: 'Sonadezi Châu Đức',
  VGC: 'Viglacera',
  GMD: 'Gemadept',
  HAH: 'Vận tải Hải An',
  VOS: 'Vận tải biển VN',
  PVT: 'Vận tải Dầu khí',
  GAS: 'Tổng công ty Khí VN',
  PLX: 'Petrolimex',
  PVD: 'Khoan Dầu khí',
  PVS: 'Dịch vụ Kỹ thuật Dầu khí',
  BSR: 'Lọc hóa dầu Bình Sơn',
  POW: 'PV Power',
  REE: 'Cơ Điện Lạnh',
  GEG: 'Điện Gia Lai',
  PC1: 'Tập đoàn PC1',
  HDG: 'Hà Đô Group',
  DGC: 'Hóa chất Đức Giang',
  DCM: 'Đạm Cà Mau',
  DPM: 'Đạm Phú Mỹ',
  CSV: 'Hóa chất Cơ bản Miền Nam',
  VHC: 'Thủy sản Vĩnh Hoàn',
  ANV: 'Thủy sản Nam Việt',
  FMC: 'Thực phẩm Sao Ta',
  CTR: 'Công trình Viettel',
  VGI: 'Viettel Global',
  BVH: 'Tập đoàn Bảo Việt',
  BMI: 'Bảo hiểm Bảo Minh',
  PVI: 'Bảo hiểm PVI',
  BMP: 'Nhựa Bình Minh',
  NTP: 'Nhựa Tiền Phong',
};

export async function fetchAndSyncFunds() {
  console.log('⏳ [Fmarket] Đang kết nối API lấy danh sách quỹ mở...');
  
  const res = await fetch('https://api.fmarket.vn/res/products/filter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: JSON.stringify({
      types: ['NEW_FUND', 'TRADING_FUND'],
      pageSize: 100,
    }),
  });

  if (!res.ok) {
    throw new Error(`Fmarket HTTP Error ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  const rows = json?.data?.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Fmarket returned empty fund rows');
  }

  console.log(`✅ [Fmarket] Đã tải danh sách ${rows.length} quỹ. Đang lấy danh mục chi tiết từng quỹ...`);

  const details = {};
  const chunkSize = 10;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    process.stdout.write(`   Tải chi tiết quỹ ${i + 1} - ${Math.min(i + chunkSize, rows.length)} / ${rows.length}...\r`);
    const results = await Promise.all(
      chunk.map(async (f) => {
        try {
          const detailRes = await fetch(`https://api.fmarket.vn/res/products/${f.id}`, {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          });
          if (detailRes.ok) {
            const d = await detailRes.json();
            return d?.data;
          }
        } catch (e) {
          console.warn(`Lỗi khi tải chi tiết quỹ ${f.shortName} (id ${f.id}):`, e.message);
        }
        return null;
      })
    );

    for (let j = 0; j < chunk.length; j++) {
      details[chunk[j].id] = results[j];
    }
  }
  console.log('\n✅ [Fmarket] Tải xong toàn bộ chi tiết danh mục!');

  const stockCounts = {};
  const industryStats = {};

  const funds = rows.map((r) => {
    const det = details[r.id];

    let cat = 'equity';
    const typeCode = r.dataFundAssetType?.code;
    if (typeCode === 'BOND') cat = 'bond';
    else if (typeCode === 'BALANCED') cat = 'balanced';

    const stockHoldings = (det?.productTopHoldingList || [])
      .filter((h) => Boolean(h.stockCode))
      .map((h) => ({
        symbol: h.stockCode,
        name: STOCK_NAMES[h.stockCode] || h.stockCode,
        industry: h.industry || 'Khác',
        weight: Number((h.netAssetPercent || 0).toFixed(2)),
      }));

    const bondHoldings = (det?.productTopHoldingBondList || [])
      .filter((h) => Boolean(h.stockCode))
      .map((h) => ({
        symbol: h.stockCode,
        name: h.stockCode,
        industry: h.industry || 'Trái phiếu',
        weight: Number((h.netAssetPercent || 0).toFixed(2)),
      }));

    const holdings = [...stockHoldings, ...bondHoldings];

    // Thống kê cổ phiếu
    for (const h of stockHoldings) {
      if (!stockCounts[h.symbol]) {
        stockCounts[h.symbol] = {
          symbol: h.symbol,
          name: h.name,
          industry: h.industry,
          fundCount: 0,
          totalWeight: 0,
        };
      }
      stockCounts[h.symbol].fundCount++;
      stockCounts[h.symbol].totalWeight += h.weight;
    }

    // Thống kê phân bổ ngành
    if (det?.productIndustriesHoldingList?.length > 0) {
      for (const ind of det.productIndustriesHoldingList) {
        if (ind.industry) {
          if (!industryStats[ind.industry]) {
            industryStats[ind.industry] = {
              industry: ind.industry,
              fundCount: 0,
              totalWeight: 0,
            };
          }
          industryStats[ind.industry].fundCount++;
          industryStats[ind.industry].totalWeight += ind.assetPercent || 0;
        }
      }
    }

    // Ngày cập nhật NAV
    let navDate = '';
    const updateTs = r.productNavChange?.updateAt || r.updateAt;
    if (updateTs) {
      const d = new Date(updateTs);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      navDate = `${day}/${month}/${year}`;
    }

    let inception = '';
    if (r.firstIssueAt) {
      const d = new Date(r.firstIssueAt);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      inception = `${day}/${month}/${year}`;
    }

    // Tính YTD
    let ytd = r.productNavChange?.navToLastYear ?? null;
    if (ytd == null && r.lastYearNav > 0 && r.nav > 0) {
      ytd = Number((((r.nav - r.lastYearNav) / r.lastYearNav) * 100).toFixed(2));
    } else if (ytd == null && r.firstIssueAt) {
      const year = new Date(r.firstIssueAt).getFullYear();
      if (year === new Date().getFullYear()) {
        ytd = r.productNavChange?.navToEstablish != null ? Number(r.productNavChange.navToEstablish.toFixed(2)) : null;
      }
    }

    return {
      id: r.shortName.toLowerCase(),
      fmarketId: r.id,
      code: r.shortName,
      name: r.name,
      category: cat,
      issuer: r.owner?.shortName || r.owner?.name || 'Khác',
      issuerFullName: r.owner?.name || '',
      nav: r.nav || 0,
      navDate: navDate || 'N/A',
      ytdReturn: ytd != null ? Number(ytd.toFixed(2)) : null,
      return1Y: r.productNavChange?.navTo12Months != null ? Number(r.productNavChange.navTo12Months.toFixed(2)) : null,
      return3Y: r.productNavChange?.navTo36Months != null ? Number(r.productNavChange.navTo36Months.toFixed(2)) : null,
      returnInception: r.productNavChange?.navToEstablish != null ? Number(r.productNavChange.navToEstablish.toFixed(2)) : null,
      aumBillionVnd: r.issueValue ? Math.round(r.issueValue / 1e9) : undefined,
      managementFee: r.managementFee || 0,
      inceptionDate: inception,
      description: r.description || '',
      holdings,
    };
  });

  // Top 10 cổ phiếu được quỹ nắm giữ nhiều nhất
  const topStocks = Object.values(stockCounts)
    .map((item, idx) => ({
      rank: idx + 1,
      symbol: item.symbol,
      name: item.name,
      industry: item.industry,
      fundCount: item.fundCount,
      avgWeight: Number((item.totalWeight / item.fundCount).toFixed(2)),
    }))
    .sort((a, b) => b.fundCount - a.fundCount || b.avgWeight - a.avgWeight)
    .slice(0, 10)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  // Top 10 ngành nghề
  const topIndustries = Object.values(industryStats)
    .map((item, idx) => ({
      rank: idx + 1,
      industry: item.industry,
      fundCount: item.fundCount,
      avgWeight: Number((item.totalWeight / item.fundCount).toFixed(2)),
    }))
    .sort((a, b) => b.fundCount - a.fundCount || b.avgWeight - a.avgWeight)
    .slice(0, 10)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const issuers = ['Tất cả tổ chức', ...new Set(funds.map((f) => f.issuer).filter(Boolean))];

  const now = new Date();
  const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const snapshot = {
    lastUpdated: now.toISOString(),
    formattedDate,
    fundsCount: funds.length,
    funds,
    topStocks,
    topIndustries,
    issuers,
  };

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // 1. Ghi snapshot JSON
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), 'utf-8');
  console.log(`\n🎉 [Thành công] Đã lưu snapshot dữ liệu ${funds.length} quỹ vào ${SNAPSHOT_PATH}`);

  // 2. Cập nhật lib/funds-data.ts để static fallback luôn đồng bộ
  try {
    const tsContent = `// Dữ liệu quỹ mở Việt Nam (Open-ended Mutual Funds Vietnam)
// Tự động đồng bộ từ hệ thống dữ liệu thị trường Fmarket

export type FundCategory = 'equity' | 'bond' | 'balanced'

export interface FundHolding {
  symbol: string
  name: string
  industry: string
  weight: number // % tỷ trọng danh mục
}

export interface Fund {
  id: string
  code: string // Mã CCQ: DCDS, VEOF, VCBF-MGF,...
  name: string
  category: FundCategory
  issuer: string // Dragon Capital, VinaCapital, VCBF, SSIAM,...
  issuerFullName?: string
  nav: number // Giá NAV gần nhất (VND)
  navDate: string // Ngày cập nhật NAV (dd/MM/yyyy)
  ytdReturn: number | null // % Lợi nhuận từ đầu năm (YTD)
  return1Y: number | null // % Lợi nhuận 1 năm
  return3Y: number | null // % Lợi nhuận 3 năm
  returnInception?: number | null // % Lợi nhuận từ khi thành lập
  aumBillionVnd?: number // Quy mô tài sản (tỷ VNĐ)
  managementFee?: number // % Phí quản lý hàng năm
  inceptionDate?: string
  holdings: FundHolding[]
  description: string
  fmarketId?: number
}

export interface StockHoldingStats {
  rank: number
  symbol: string
  name?: string
  industry: string
  fundCount: number
  avgWeight: number
}

export interface IndustryHoldingStats {
  rank: number
  industry: string
  fundCount: number
  avgWeight: number
}

export const FUND_CATEGORIES: { key: FundCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'equity', label: 'Cổ phiếu' },
  { key: 'bond', label: 'Trái phiếu' },
  { key: 'balanced', label: 'Cân bằng' },
]

export const FUND_ISSUERS: string[] = ${JSON.stringify(issuers, null, 2)}

export const FUNDS_DATA: Fund[] = ${JSON.stringify(funds, null, 2)}

export const TOP_STOCK_HOLDINGS: StockHoldingStats[] = ${JSON.stringify(topStocks, null, 2)}

export const TOP_INDUSTRY_HOLDINGS: IndustryHoldingStats[] = ${JSON.stringify(topIndustries, null, 2)}
`;
    fs.writeFileSync(FUNDS_DATA_TS_PATH, tsContent, 'utf-8');
    console.log(`✅ [Thành công] Đã cập nhật TypeScript fallback vào ${FUNDS_DATA_TS_PATH}`);
  } catch (tsErr) {
    console.warn('⚠️ Lỗi khi ghi lib/funds-data.ts:', tsErr.message);
  }

  console.log(`   - Ngày cập nhật: ${formattedDate} (${snapshot.lastUpdated})`);
  console.log(`   - Tổng số quỹ: ${funds.length}`);
  console.log(`   - Số lượng cổ phiếu top: ${topStocks.length}`);
  console.log(`   - Số lượng ngành top: ${topIndustries.length}`);
  console.log(`   - Tổ chức phát hành: ${issuers.length - 1} tổ chức`);
  
  return snapshot;
}

// Nếu gọi trực tiếp từ dòng lệnh
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  fetchAndSyncFunds().catch((err) => {
    console.error('❌ Lỗi khi đồng bộ dữ liệu quỹ mở:', err);
    process.exit(1);
  });
}
