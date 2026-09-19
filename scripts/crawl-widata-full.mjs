/**
 * scripts/crawl-widata-full.mjs
 * Hệ thống tự động thu thập và lưu trữ toàn bộ kho dữ liệu từ WiData/WiChart
 * Lưu trữ dự phòng cục bộ: Thị trường, Dòng tiền Tự doanh/Khối ngoại, Dự phóng CTCK, Ban lãnh đạo, Link BCTC PDF...
 * 
 * Cách dùng:
 *   node scripts/crawl-widata-full.mjs --mode=market      (Kéo dữ liệu thị trường, tự doanh, khối ngoại)
 *   node scripts/crawl-widata-full.mjs --mode=news        (Kéo tin tức WiBrain)
 *   node scripts/crawl-widata-full.mjs --mode=company --limit=50  (Kéo 50 mã cổ phiếu trọng yếu)
 *   node scripts/crawl-widata-full.mjs --mode=all         (Kéo toàn bộ)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const ARCHIVE_DIR = path.join(ROOT_DIR, 'data', 'widata_archive');

// Các thư mục con
const MARKET_DIR = path.join(ARCHIVE_DIR, 'market');
const COMPANY_DIR = path.join(ARCHIVE_DIR, 'company');
const NEWS_DIR = path.join(ARCHIVE_DIR, 'news');

[ARCHIVE_DIR, MARKET_DIR, COMPANY_DIR, NEWS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Hàm suy diễn khóa OpenSSL EVP_BytesToKey (tương thích CryptoJS)
function evpBytesToKey(password, salt, keyLen = 32, ivLen = 16) {
  let dtot = Buffer.alloc(0);
  let d = Buffer.alloc(0);
  while (dtot.length < keyLen + ivLen) {
    d = crypto.createHash('md5').update(Buffer.concat([d, password, salt])).digest();
    dtot = Buffer.concat([dtot, d]);
  }
  return {
    key: dtot.subarray(0, keyLen),
    iv: dtot.subarray(keyLen, keyLen + ivLen),
  };
}

// Hàm giải mã AES-256-CBC
function decryptCryptoJS(encryptedB64, passphrase = 'ZmRvaWFmaGRpc2ZoaWRzZHNoa2RoaW9zZGZoc2E=') {
  const raw = Buffer.from(encryptedB64, 'base64');
  if (raw.subarray(0, 8).toString('utf8') !== 'Salted__') {
    throw new Error('Định dạng mã hóa không hợp lệ (thiếu Salted__)');
  }
  const salt = raw.subarray(8, 16);
  const ciphertext = raw.subarray(16);
  const { key, iv } = evpBytesToKey(Buffer.from(passphrase, 'utf8'), salt, 32, 16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}

// Tạo request headers có chữ ký số MD5 hợp lệ
function generateHeaders(params = {}) {
  const stime = Date.now().toString();
  const nonce = (
    Math.floor((Math.random() + Math.floor(9 * Math.random() + 1)) * Math.pow(10, 19))
  ).toString();
  const signToken = 'ObBeWhVmYs3tP2Nz$C$FJ@P4AQfTjlPX';
  const v = 'v1';

  const authHeaders = {
    stime,
    nonce,
    'sign-token': signToken,
    v,
  };

  const combined = { ...params, ...authHeaders };
  const sortedKeys = Object.keys(combined)
    .filter((k) => k !== 'sign' && combined[k] !== undefined && combined[k] !== null)
    .sort();

  let h = '';
  sortedKeys.forEach((k) => {
    h += k + combined[k];
  });
  const sign = crypto.createHash('md5').update(h).digest('hex');
  authHeaders.sign = sign;
  return authHeaders;
}

// Gọi API WiData an toàn
async function callWiDataApi(endpoint, params = {}) {
  const queryStr = new URLSearchParams(params).toString();
  const fullUrl = `https://wichart.vn/wichartapi/${endpoint}${queryStr ? `?${queryStr}` : ''}`;
  const authHeaders = generateHeaders(params);

  const res = await fetch(fullUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: 'https://widata.vn/',
      Origin: 'https://widata.vn',
      Accept: 'application/json, text/plain, */*',
      ...authHeaders,
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  if (json.enc) {
    const decrypted = decryptCryptoJS(json.enc);
    return JSON.parse(decrypted);
  }
  return json;
}

// Sleep helper
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ============================================================================
// 1. PHÂN HỆ THỊ TRƯỜNG & DÒNG TIỀN (MARKET & FLOWS)
// ============================================================================
async function crawlMarketData() {
  console.log('\n--- BẮT ĐẦU CÀO DỮ LIỆU THỊ TRƯỜNG & DÒNG TIỀN ---');

  // A. Tự doanh CTCK mua/bán ròng
  try {
    console.log('1. Đang tải dữ liệu Giao dịch Tự doanh CTCK...');
    const tuDoanhData = await callWiDataApi('wichart/sidebar/tu-doanh/statisheatmap', {
      date_type: 'day',
    });
    fs.writeFileSync(
      path.join(MARKET_DIR, 'tu_doanh_daily.json'),
      JSON.stringify({ updatedAt: new Date().toISOString(), data: tuDoanhData }, null, 2),
      'utf8'
    );
    console.log(`   ✅ Đã lưu: market/tu_doanh_daily.json (${tuDoanhData?.length || 0} mã)`);
  } catch (err) {
    console.warn(`   ⚠️ Lỗi tải Tự doanh: ${err.message}`);
  }

  await sleep(150);

  // B. Khối ngoại mua/bán ròng
  try {
    console.log('2. Đang tải dữ liệu Giao dịch Khối Ngoại...');
    const nuocNgoaiData = await callWiDataApi('wichart/sidebar/nuoc-ngoai/statisheatmap', {
      date_type: 'day',
    });
    fs.writeFileSync(
      path.join(MARKET_DIR, 'nuoc_ngoai_daily.json'),
      JSON.stringify({ updatedAt: new Date().toISOString(), data: nuocNgoaiData }, null, 2),
      'utf8'
    );
    console.log(`   ✅ Đã lưu: market/nuoc_ngoai_daily.json (${nuocNgoaiData?.length || 0} mã)`);
  } catch (err) {
    console.warn(`   ⚠️ Lỗi tải Khối ngoại: ${err.message}`);
  }

  await sleep(150);

  // C. Tác động Index (HOSE & HNX)
  try {
    console.log('3. Đang tải dữ liệu Tác động VN-Index & HNX-Index...');
    const [tacDongHose, tacDongHnx] = await Promise.all([
      callWiDataApi('wichart/sidebar/bien-dong/tac-dong-den-index', { san: 'HOSE' }).catch(() => []),
      callWiDataApi('wichart/sidebar/bien-dong/tac-dong-den-index', { san: 'HNX' }).catch(() => []),
    ]);
    fs.writeFileSync(
      path.join(MARKET_DIR, 'tac_dong_index.json'),
      JSON.stringify(
        { updatedAt: new Date().toISOString(), hose: tacDongHose, hnx: tacDongHnx },
        null,
        2
      ),
      'utf8'
    );
    console.log(
      `   ✅ Đã lưu: market/tac_dong_index.json (HOSE: ${tacDongHose?.length || 0}, HNX: ${tacDongHnx?.length || 0})`
    );
  } catch (err) {
    console.warn(`   ⚠️ Lỗi tải Tác động Index: ${err.message}`);
  }

  await sleep(150);

  // D. Phân bổ dòng tiền
  try {
    console.log('4. Đang tải dữ liệu Phân bổ dòng tiền các sàn...');
    const [dongTienHose, dongTienHnx] = await Promise.all([
      callWiDataApi('wichart/sidebar/bien-dong/phan-bo-dong-tien', { san: 'HOSE' }).catch(() => null),
      callWiDataApi('wichart/sidebar/bien-dong/phan-bo-dong-tien', { san: 'HNX' }).catch(() => null),
    ]);
    fs.writeFileSync(
      path.join(MARKET_DIR, 'phan_bo_dong_tien.json'),
      JSON.stringify(
        { updatedAt: new Date().toISOString(), hose: dongTienHose, hnx: dongTienHnx },
        null,
        2
      ),
      'utf8'
    );
    console.log('   ✅ Đã lưu: market/phan_bo_dong_tien.json');
  } catch (err) {
    console.warn(`   ⚠️ Lỗi tải Phân bổ dòng tiền: ${err.message}`);
  }

  await sleep(150);

  // E. Lịch sử Định giá P/E và chênh lệch E/P
  try {
    console.log('5. Đang tải dữ liệu Lịch sử P/E & E/P Thị trường...');
    const [peData, epData] = await Promise.all([
      callWiDataApi('wichart/sidebar/dinh-gia/pe-thi-truong').catch(() => null),
      callWiDataApi('wichart/sidebar/dinh-gia/ep-thi-truong').catch(() => null),
    ]);
    fs.writeFileSync(
      path.join(MARKET_DIR, 'pe_ep_thi_truong.json'),
      JSON.stringify({ updatedAt: new Date().toISOString(), pe: peData, ep: epData }, null, 2),
      'utf8'
    );
    console.log(
      `   ✅ Đã lưu: market/pe_ep_thi_truong.json (P/E: ${peData?.data?.length || 0} điểm, E/P: ${epData?.length || 0} điểm)`
    );
  } catch (err) {
    console.warn(`   ⚠️ Lỗi tải Định giá P/E: ${err.message}`);
  }
}

// ============================================================================
// 2. PHÂN HỆ TIN TỨC WIBRAIN (NEWS & ANALYSIS)
// ============================================================================
async function crawlNewsData() {
  console.log('\n--- BẮT ĐẦU CÀO TIN TỨC TÀI CHÍNH WIBRAIN ---');
  try {
    const newsData = await callWiDataApi('xbrain-news/', { page: '1', limit: '50' });
    fs.writeFileSync(
      path.join(NEWS_DIR, 'xbrain_news.json'),
      JSON.stringify({ updatedAt: new Date().toISOString(), data: newsData }, null, 2),
      'utf8'
    );
    console.log(
      `   ✅ Đã lưu: news/xbrain_news.json (${newsData?.result?.length || newsData?.data?.length || 0} tin tức)`
    );
  } catch (err) {
    console.warn(`   ⚠️ Lỗi tải tin tức: ${err.message}`);
  }
}

// ============================================================================
// 3. PHÂN HỆ DOANH NGHIỆP & CỔ PHIẾU (COMPANY INTELLIGENCE)
// ============================================================================
async function crawlCompanyData(limit = 100) {
  console.log(`\n--- BẮT ĐẦU CÀO DỮ LIỆU DOANH NGHIỆP (GIỚI HẠN: ${limit} MÃ) ---`);

  // Lấy danh sách mã từ company_core_cards.json
  const coreCardsPath = path.join(ROOT_DIR, 'data', 'company_core_cards.json');
  let tickers = [
    'HPG', 'VHM', 'VIC', 'VCB', 'SSI', 'MWG', 'FPT', 'TCB', 'MBB', 'STB',
    'VNM', 'MSN', 'GAS', 'BID', 'CTG', 'VRE', 'VJC', 'PLX', 'POW', 'SAB',
    'VPB', 'GVR', 'ACB', 'HDB', 'SHB', 'TPB', 'VIB', 'LPB', 'SSB', 'MSB',
    'DGC', 'KBC', 'KDH', 'NLG', 'PDR', 'DXG', 'DIG', 'CEO', 'CII', 'VND',
    'VIX', 'VCI', 'HCM', 'BSI', 'FTS', 'CTS', 'PVD', 'PVS', 'PVT', 'BSR'
  ];

  if (fs.existsSync(coreCardsPath)) {
    try {
      const cards = JSON.parse(fs.readFileSync(coreCardsPath, 'utf8'));
      const allKeys = Object.keys(cards);
      // Giữ ưu tiên các mã lớn trước, sau đó bổ sung
      const uniqueTickers = Array.from(new Set([...tickers, ...allKeys]));
      tickers = uniqueTickers.slice(0, limit);
    } catch {}
  }

  // Tải hoặc khởi tạo các kho lưu trữ
  const loadOrCreate = (file) => {
    const p = path.join(COMPANY_DIR, file);
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch {}
    }
    return {};
  };

  const projectedProfitStore = loadOrCreate('projected_profit.json');
  const leadersStore = loadOrCreate('board_and_leaders.json');
  const eventsStore = loadOrCreate('corporate_events.json');
  const subsidiariesStore = loadOrCreate('subsidiaries.json');
  const bctcPdfStore = loadOrCreate('bctc_pdf_links.json');

  let processedCount = 0;

  for (let i = 0; i < tickers.length; i++) {
    const code = tickers[i];
    console.log(`\n[${i + 1}/${tickers.length}] Đang cào dữ liệu mã: ${code}...`);

    // 1. Dự phóng lợi nhuận CTCK (Projected Profit)
    try {
      const proj = await callWiDataApi('wichart/report/get-projected-profit', { code });
      if (proj && (proj.result || proj.data || Array.isArray(proj))) {
        projectedProfitStore[code] = proj;
        console.log(`   + Dự phóng lợi nhuận: OK`);
      }
    } catch {}
    await sleep(100);

    // 2. Ban lãnh đạo & Sở hữu (Leaders)
    try {
      const leaders = await callWiDataApi('wichart/company/leader', { code });
      if (leaders && Array.isArray(leaders) && leaders.length > 0) {
        leadersStore[code] = leaders;
        console.log(`   + Ban lãnh đạo & sở hữu: ${leaders.length} người`);
      }
    } catch {}
    await sleep(100);

    // 3. Lịch sự kiện & Cổ tức (Events)
    try {
      const events = await callWiDataApi('wichart/company/events', { code });
      if (events && Array.isArray(events) && events.length > 0) {
        eventsStore[code] = events;
        console.log(`   + Lịch sự kiện & cổ tức: ${events.length} sự kiện`);
      }
    } catch {}
    await sleep(100);

    // 4. Công ty con & Liên kết (Subsidiaries)
    try {
      const subs = await callWiDataApi('wichart/company/subcompany', { code });
      if (subs && Array.isArray(subs) && subs.length > 0) {
        subsidiariesStore[code] = subs;
        console.log(`   + Công ty con & liên kết: ${subs.length} công ty`);
      }
    } catch {}
    await sleep(100);

    // 5. Link PDF BCTC gốc (PDF Links)
    try {
      const bctc = await callWiDataApi('wichart/tai-lieu-bctc', {
        code,
        quarter: '1',
        isConsolidatedReport: 'true',
      });
      if (bctc && Array.isArray(bctc) && bctc.length > 0) {
        bctcPdfStore[code] = bctc;
        console.log(`   + Link file PDF BCTC gốc: ${bctc.length} năm`);
      }
    } catch {}
    await sleep(150);

    processedCount++;

    // Lưu định kỳ sau mỗi 10 mã
    if (processedCount % 10 === 0 || processedCount === tickers.length) {
      fs.writeFileSync(
        path.join(COMPANY_DIR, 'projected_profit.json'),
        JSON.stringify(projectedProfitStore, null, 2),
        'utf8'
      );
      fs.writeFileSync(
        path.join(COMPANY_DIR, 'board_and_leaders.json'),
        JSON.stringify(leadersStore, null, 2),
        'utf8'
      );
      fs.writeFileSync(
        path.join(COMPANY_DIR, 'corporate_events.json'),
        JSON.stringify(eventsStore, null, 2),
        'utf8'
      );
      fs.writeFileSync(
        path.join(COMPANY_DIR, 'subsidiaries.json'),
        JSON.stringify(subsidiariesStore, null, 2),
        'utf8'
      );
      fs.writeFileSync(
        path.join(COMPANY_DIR, 'bctc_pdf_links.json'),
        JSON.stringify(bctcPdfStore, null, 2),
        'utf8'
      );
      console.log(`   💾 [CHECKPOINT] Đã lưu tiến độ ${processedCount}/${tickers.length} mã.`);
    }
  }

  console.log(`\n🎉 ĐÃ HOÀN THÀNH CÀO DOANH NGHIỆP (${processedCount} mã)`);
}

// ============================================================================
// MAIN RUNNER
// ============================================================================
async function main() {
  const args = process.argv.slice(2);
  const modeArg = args.find((a) => a.startsWith('--mode='));
  const limitArg = args.find((a) => a.startsWith('--limit='));

  const mode = modeArg ? modeArg.split('=')[1] : 'market';
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 50;

  console.log('===============================================================');
  console.log('📦 TIẾN TRÌNH THU THẬP & LƯU TRỮ DỰ PHÒNG DỮ LIỆU TỪ WIDATA');
  console.log(`Chế độ: ${mode.toUpperCase()} | Giới hạn mã: ${limit}`);
  console.log(`Thư mục lưu trữ: ${ARCHIVE_DIR}`);
  console.log('===============================================================');

  if (mode === 'market' || mode === 'all') {
    await crawlMarketData();
  }

  if (mode === 'news' || mode === 'all') {
    await crawlNewsData();
  }

  if (mode === 'company' || mode === 'all') {
    await crawlCompanyData(limit);
  }

  console.log('\n===============================================================');
  console.log('🏁 TOÀN BỘ QUÁ TRÌNH THU THẬP ĐÃ HOÀN TẤT THÀNH CÔNG!');
  console.log('===============================================================');
}

main().catch((err) => {
  console.error('Lỗi nghiêm trọng:', err);
  process.exit(1);
});
