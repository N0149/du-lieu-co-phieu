const fs = require('fs');
const path = require('path');

// Danh sách các nguồn RSS tài chính - chứng khoán - doanh nghiệp chọn lọc
const RSS_SOURCES = [
  // 1. VnEconomy (Báo kinh tế hàng đầu)
  { name: 'VnEconomy', url: 'https://vneconomy.vn/chung-khoan.rss', defaultCategory: 'thi-truong' },
  { name: 'VnEconomy', url: 'https://vneconomy.vn/doanh-nhan.rss', defaultCategory: 'doanh-nghiep' },
  { name: 'VnEconomy', url: 'https://vneconomy.vn/tai-chinh.rss', defaultCategory: 'tai-chinh' },
  { name: 'VnEconomy', url: 'https://vneconomy.vn/bat-dong-san.rss', defaultCategory: 'bat-dong-san' },

  // 2. Vietnambiz (Chuyên trang kinh doanh & thị trường)
  { name: 'Vietnambiz', url: 'https://vietnambiz.vn/rss/doanh-nghiep.rss', defaultCategory: 'doanh-nghiep' },
  { name: 'Vietnambiz', url: 'https://vietnambiz.vn/rss/chung-khoan.rss', defaultCategory: 'thi-truong' },
  { name: 'Vietnambiz', url: 'https://vietnambiz.vn/rss/tai-chinh.rss', defaultCategory: 'tai-chinh' },
  { name: 'Vietnambiz', url: 'https://vietnambiz.vn/rss/bat-dong-san.rss', defaultCategory: 'bat-dong-san' },

  // 3. VietnamFinance (Kênh tài chính - đầu tư)
  { name: 'VietnamFinance', url: 'https://vietnamfinance.vn/rss.rss', defaultCategory: 'tai-chinh' },

  // 4. CafeF (Chỉ lấy 2 mục cốt lõi: Doanh nghiệp & Chứng khoán, loại bỏ các mục đời sống/xã hội)
  { name: 'CafeF', url: 'https://cafef.vn/doanh-nghiep.rss', defaultCategory: 'doanh-nghiep' },
  { name: 'CafeF', url: 'https://cafef.vn/thi-truong-chung-khoan.rss', defaultCategory: 'thi-truong' },
  { name: 'CafeF', url: 'https://cafef.vn/tai-chinh-ngan-hang.rss', defaultCategory: 'tai-chinh' },
];

// Từ khóa loại trừ tin rác / giật gân / xã hội không liên quan tài chính
const EXCLUDED_KEYWORDS = [
  'tai nạn', 'cháy lớn', 'bốc cháy', 'vụ cháy', 'tử vong', 'chết người', 'án mạng', 'cạo đầu',
  'đánh ghen', 'ma túy', 'công an bắt', 'bị bắt', 'khởi tố vụ án giết', 'bệnh viện ở pakistan',
  'nepal', 'vụ nổ', 'ngộ độc', 'đuối nước', 'sạt lở vùi lấp', 'hoa hậu', 'showbiz', 'ca sĩ',
  'diễn viên', 'người mẫu', 'phim truyền hình', 'đám cưới', 'ly hôn', 'bắt ghen', 'thế giới động vật'
];

// Danh sách từ viết tắt 3 chữ cái phổ biến không phải mã chứng khoán
const IGNORED_TICKERS = new Set([
  'CHO', 'CỦA', 'TẠI', 'NĂM', 'GẦN', 'TỶ', 'ĐỒNG', 'USD', 'VND', 'CPI', 'GDP', 'FED', 'SBV',
  'HĐQT', 'BCTC', 'ĐHCĐ', 'ĐHĐCĐ', 'IPO', 'ETF', 'FDI', 'VN30', 'HNX', 'HOSE', 'UPCOM', 'TOP', 'BIG',
  'CEO', 'CFO', 'CTCP', 'TNHH', 'NĐT', 'VAMC', 'IMF', 'WB', 'ADB', 'OPEC', 'ECB', 'SEC', 'BOT',
  'BT', 'PPP', 'AI', 'EVN', 'PVN', 'VNMAC', 'KCN', 'BĐS', 'TTLK', 'UBCK', 'SGDCK', 'M&A',
  'KHO', 'MUA', 'BÁN', 'GIÁ', 'TĂNG', 'GIẢM', 'VỐN', 'LÃI', 'LỖ', 'THU', 'CHI', 'XUẤT', 'NHẬP',
  'VTC', 'VTV', 'HTV', 'VCCI'
]);

// Danh sách mã cổ phiếu thực tế cần giữ
['BID', 'ACB', 'MBB', 'TCB', 'SSI', 'VND', 'VIX', 'HPG', 'VIC', 'VHM', 'VRE', 'NVL', 'DXG', 'PDR', 'BSR', 'VTP', 'IPA', 'PHR', 'SMC', 'GCF', 'MPC', 'PET', 'CTD', 'HBC', 'PNJ', 'DAN', 'SNZ', 'LHG', 'DPR', 'PPC', 'HND', 'TIP', 'SZC', 'KBC', 'IDC', 'BCM', 'SAB', 'BHN', 'GAS', 'PLX', 'POW', 'BVH', 'MSN', 'MWG', 'DGC', 'KDH', 'NLG', 'GVR', 'GEX', 'HAG', 'HNG', 'QCG'].forEach(t => IGNORED_TICKERS.delete(t));

// Mapping tên doanh nghiệp phổ biến sang mã CP
const COMPANY_NAME_MAP = {
  'hòa phát': 'HPG',
  'hoa phat': 'HPG',
  'vietcombank': 'VCB',
  'techcombank': 'TCB',
  'vinhomes': 'VHM',
  'vingroup': 'VIC',
  'vinamilk': 'VNM',
  'thế giới di động': 'MWG',
  'the gioi di dong': 'MWG',
  'masan': 'MSN',
  'viettel post': 'VTP',
  'lọc hóa dầu bình sơn': 'BSR',
  'lọc dầu bình sơn': 'BSR',
  'coteccons': 'CTD',
  'hòa bình': 'HBC',
  'hoa binh': 'HBC',
  'đất xanh': 'DXG',
  'dat xanh': 'DXG',
  'novaland': 'NVL',
  'phát đạt': 'PDR',
  'phat dat': 'PDR',
  'vndirect': 'VND',
  'chứng khoán ssi': 'SSI',
  'mbbank': 'MBB',
  'ngân hàng quân đội': 'MBB',
  'bidv': 'BID',
  'vietinbank': 'CTG',
  'sacombank': 'STB',
  'vpbank': 'VPB',
  'hdbank': 'HDB',
  'shb': 'SHB',
  'tpbank': 'TPB',
  'msb': 'MSB',
  'vàng bạc đá quý phú nhuận': 'PNJ',
  'đức giang': 'DGC',
  'hóa chất đức giang': 'DGC',
  'tổng công ty khí': 'GAS',
  'petrovietnam gas': 'GAS',
  'petrolimex': 'PLX',
  'pv power': 'POW',
  'bảo việt': 'BVH',
  'sabeco': 'SAB',
  'khang điền': 'KDH',
  'nam long': 'NLG',
  'vincom retail': 'VRE',
  'cao su việt nam': 'GVR',
  'tập đoàn gelex': 'GEX',
  'gelex': 'GEX',
  'hoàng anh gia lai': 'HAG',
  'quốc cường gia lai': 'QCG',
  'sonadezi': 'SNZ',
  'long hậu': 'LHG',
  'danapha': 'DAN',
  'idico': 'IDC',
  'becamex': 'BCM',
  'kinh bắc': 'KBC',
  'cao su phước hòa': 'PHR',
  'cao su đồng phú': 'DPR',
  'nhiệt điện phả lại': 'PPC',
  'nhiệt điện hải phòng': 'HND',
};

// Đọc danh mục 1.530 mã từ longlive_manifest.json để đối soát
let validStockSet = new Set();
try {
  const manifestPath = path.join(__dirname, '../../data/longlive_manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.items) {
      manifest.items.forEach(item => {
        if (item.t) validStockSet.add(item.t.toUpperCase());
      });
    }
  }
} catch (e) {
  console.warn('Could not load longlive_manifest.json:', e.message);
}

/**
 * Trích xuất mã cổ phiếu từ văn bản
 */
function extractTickersFromText(text) {
  if (!text) return [];
  const found = new Set();
  const lower = text.toLowerCase();

  // 1. Khớp từ tên doanh nghiệp
  for (const [name, ticker] of Object.entries(COMPANY_NAME_MAP)) {
    if (lower.includes(name)) {
      found.add(ticker);
    }
  }

  // 2. Khớp trong ngoặc: (HPG), [BSR], {VTP}
  const bracketMatches = text.matchAll(/[\(\[\{]([A-Z0-9]{3,4})[\)\]\}]/g);
  for (const m of bracketMatches) {
    const t = m[1].toUpperCase();
    if (!IGNORED_TICKERS.has(t) && (validStockSet.size === 0 || validStockSet.has(t))) {
      found.add(t);
    }
  }

  // 3. Khớp sau từ khóa: cổ phiếu HPG, mã BSR, cp VTP, CTCP PDR
  const keywordMatches = text.matchAll(/(?:cổ phiếu|mã|mã ck|mã cp|cp|cổ phần|ctcp)\s+([A-Z0-9]{3,4})\b/gi);
  for (const m of keywordMatches) {
    const t = m[1].toUpperCase();
    if (!IGNORED_TICKERS.has(t) && (validStockSet.size === 0 || validStockSet.has(t))) {
      found.add(t);
    }
  }

  // 4. Khớp dạng tiền tố: HPG:, BSR:, VTP -
  const prefixMatches = text.matchAll(/^([A-Z0-9]{3,4})\s*[:\-]/g);
  for (const m of prefixMatches) {
    const t = m[1].toUpperCase();
    if (!IGNORED_TICKERS.has(t) && (validStockSet.size === 0 || validStockSet.has(t))) {
      found.add(t);
    }
  }

  // 5. Khớp các từ viết hoa 3 chữ cái nếu nằm trong danh mục chứng khoán
  if (validStockSet.size > 0) {
    const tokens = text.match(/\b[A-Z0-9]{3,4}\b/g) || [];
    for (const tok of tokens) {
      const t = tok.toUpperCase();
      if (validStockSet.has(t) && !IGNORED_TICKERS.has(t)) {
        found.add(t);
      }
    }
  }

  return Array.from(found);
}

/**
 * Kiểm tra xem bài viết có hợp lệ về mặt tài chính hay không
 */
function isFinancialArticle(title, summary) {
  const combined = `${title} ${summary}`.toLowerCase();

  // Loại bỏ nếu chứa từ khóa giật gân/phi tài chính
  for (const badKw of EXCLUDED_KEYWORDS) {
    if (combined.includes(badKw)) {
      return false;
    }
  }

  return true;
}

/**
 * Phân loại bài viết
 */
function classifyCategory(title, summary, defaultCat, tickers) {
  const combined = `${title} ${summary}`.toLowerCase();

  // Tin doanh nghiệp nếu có mã ticker hoặc từ khóa doanh nghiệp công bố
  if (
    tickers.length > 0 ||
    combined.includes('nghị quyết hđqt') ||
    combined.includes('báo cáo tài chính') ||
    combined.includes('bctc') ||
    combined.includes('đại hội đồng cổ đông') ||
    combined.includes('đhcđ') ||
    combined.includes('công bố thông tin') ||
    combined.includes('trả cổ tức') ||
    combined.includes('cổ tức') ||
    combined.includes('phát hành cổ phiếu') ||
    combined.includes('esop') ||
    combined.includes('lãi ròng') ||
    combined.includes('lỗ ròng') ||
    combined.includes('lợi nhuận') ||
    combined.includes('doanh thu') ||
    combined.includes('bổ nhiệm') ||
    combined.includes('miễn nhiệm')
  ) {
    return 'doanh-nghiep';
  }

  if (
    combined.includes('vn-index') ||
    combined.includes('vnindex') ||
    combined.includes('chỉ số') ||
    combined.includes('khối ngoại') ||
    combined.includes('tự doanh') ||
    combined.includes('thanh khoản') ||
    combined.includes('lãi suất') ||
    combined.includes('ngân hàng nhà nước') ||
    combined.includes('tỷ giá')
  ) {
    return 'thi-truong';
  }

  if (
    combined.includes('fed') ||
    combined.includes('wall street') ||
    combined.includes('dow jones') ||
    combined.includes('dầu thô') ||
    combined.includes('vàng thế giới') ||
    combined.includes('chứng khoán mỹ')
  ) {
    return 'quoc-te';
  }

  return defaultCat || 'thi-truong';
}

/**
 * Xóa thẻ HTML và làm sạch văn bản
 */
function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse XML thủ công dạng Regex để đảm bảo 100% không bao giờ lỗi XML parser
 */
function parseRssItemsFromXml(xmlText, source) {
  const items = [];
  if (!xmlText) return items;

  const itemMatches = xmlText.matchAll(/<item[\s\S]*?<\/item>/gi);

  for (const match of itemMatches) {
    const itemXml = match[0];

    // Tiêu đề
    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
    const title = cleanText(titleMatch ? (titleMatch[1] || titleMatch[2] || '') : '');
    if (!title || title.length < 5) continue;

    // Link
    const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
    const link = (linkMatch ? (linkMatch[1] || linkMatch[2] || '') : '').trim();
    if (!link || !link.startsWith('http')) continue;

    // Ngày xuất bản
    const pubDateMatch = itemXml.match(/<pubDate>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/pubDate>/i);
    const rawDate = (pubDateMatch ? (pubDateMatch[1] || pubDateMatch[2] || '') : '').trim();
    let pubDate = new Date().toISOString();
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        pubDate = parsed.toISOString();
      }
    }

    // Tóm tắt
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i) ||
                      itemXml.match(/<content:encoded>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/content:encoded>/i);
    const rawDesc = descMatch ? (descMatch[1] || descMatch[2] || '') : '';
    const summary = cleanText(rawDesc);

    // Lọc bỏ tin rác/phi tài chính
    if (!isFinancialArticle(title, summary)) {
      continue;
    }

    const tickers = extractTickersFromText(`${title} ${summary}`);
    const primaryTicker = tickers.length > 0 ? tickers[0] : null;
    const category = classifyCategory(title, summary, source.defaultCategory, tickers);

    const crypto = require('crypto');
    const id = `${source.name.toLowerCase()}-${crypto.createHash('md5').update(link).digest('hex')}`;

    items.push({
      id,
      title,
      link,
      pubDate,
      source: source.name,
      ticker: primaryTicker,
      tickers,
      category,
      summary: summary.length > 280 ? summary.slice(0, 280) + '...' : summary,
    });
  }

  return items;
}

/**
 * Chạy ETL lấy toàn bộ tin tức RSS song song
 */
async function fetchAllRssFeeds() {
  console.log(`[RSS ETL] Bắt đầu quét song song ${RSS_SOURCES.length} nguồn RSS tài chính chuẩn...`);
  const startTime = Date.now();

  const fetchTasks = RSS_SOURCES.map(async (source) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);

      const res = await fetch(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return [];
      }

      const xmlText = await res.text();
      const items = parseRssItemsFromXml(xmlText, source);

      console.log(`✓ [${source.name}] Đã lấy ${items.length} tin sạch từ ${source.url}`);
      return items;
    } catch (err) {
      console.warn(`✗ [${source.name}] Lỗi khi tải ${source.url}: ${err.message}`);
      return [];
    }
  });

  const results = await Promise.all(fetchTasks);
  const allItems = results.flat();

  // Loại bỏ bài viết trùng lặp theo link hoặc tiêu đề chuẩn hóa
  const seenLinks = new Set();
  const seenTitles = new Set();
  const uniqueItems = [];

  for (const it of allItems) {
    if (!it.title || !it.link) continue;
    const cleanLink = it.link.split('?')[0].trim();
    const cleanTitle = it.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

    if (seenLinks.has(cleanLink) || seenTitles.has(cleanTitle)) {
      continue;
    }

    seenLinks.add(cleanLink);
    seenTitles.add(cleanTitle);
    uniqueItems.push(it);
  }

  // Sắp xếp giảm dần theo thời gian công bố (mới nhất lên đầu)
  uniqueItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  // Thống kê theo nguồn
  const sourceBreakdown = {};
  uniqueItems.forEach(i => {
    sourceBreakdown[i.source] = (sourceBreakdown[i.source] || 0) + 1;
  });

  // Lưu file snapshot
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const outputPath = path.join(dataDir, 'news_snapshot.json');
  fs.writeFileSync(outputPath, JSON.stringify(uniqueItems, null, 2), 'utf8');

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n========================================`);
  console.log(`[RSS ETL Hoàn tất] Tổng hợp thành công ${uniqueItems.length} tin tức tài chính sau ${duration}s!`);
  console.log(`Phân bổ nguồn tin:`, sourceBreakdown);
  console.log(`- Tin doanh nghiệp / có mã CP: ${uniqueItems.filter(i => i.category === 'doanh-nghiep' || i.ticker).length}`);
  console.log(`- Tin thị trường: ${uniqueItems.filter(i => i.category === 'thi-truong').length}`);
  console.log(`========================================\n`);

  return uniqueItems;
}

if (require.main === module) {
  fetchAllRssFeeds().catch(err => {
    console.error('[RSS ETL] Lỗi:', err);
    process.exit(1);
  });
}

module.exports = {
  fetchAllRssFeeds,
  extractTickersFromText,
  classifyCategory,
};
