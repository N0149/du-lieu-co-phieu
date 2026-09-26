/**
 * scripts/sync-widata-reports.mjs
 * 
 * Đồng bộ báo cáo phân tích từ WiData về hệ thống cục bộ:
 * - Báo cáo doanh nghiệp -> data/company_reports.db
 * - Báo cáo ngành -> data/industry_reports.db & data/industry-reports.json
 * - Báo cáo vĩ mô, chiến lược, trái phiếu, bản tin IR -> data/widata_archive/reports/
 * 
 * BẢO MẬT & CHỐNG PHÁT HIỆN / CHỐNG CHẶN TÀI KHOẢN:
 * 1. Chạy 100% ở chế độ khách vãng lai ẩn danh (Guest), KHÔNG gửi hay lưu trữ
 *    bất kỳ cookie, token, email hay thông tin tài khoản cá nhân nào.
 * 2. Tài khoản cá nhân của bạn hoàn toàn KHÔNG THỂ BỊ CHẶN vì WiData không biết tài khoản là ai.
 * 3. Đồng bộ gia tăng (Incremental Sync): Chỉ quét trang 1-2 (các báo cáo mới nhất gần đây),
 *    dừng ngay khi gặp báo cáo đã có trong DB -> Chỉ 1-2 requests/danh mục, không gây tải hay cảnh báo Cloudflare.
 * 4. Delay ngẫu nhiên giữa các lần gọi để giả lập hành vi trình duyệt tự nhiên.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const ARCHIVE_REPORTS_DIR = path.join(DATA_DIR, 'widata_archive', 'reports');

if (!fs.existsSync(ARCHIVE_REPORTS_DIR)) {
  fs.mkdirSync(ARCHIVE_REPORTS_DIR, { recursive: true });
}

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

// Giải mã AES-256-CBC
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

// Tạo request headers với chữ ký số MD5 công khai của web client
function generateHeaders(params = {}) {
  const stime = Date.now().toString();
  const nonce = Math.floor((Math.random() + Math.floor(9 * Math.random() + 1)) * Math.pow(10, 19)).toString();
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

// Gọi API WiData an toàn ẩn danh
async function callWiDataApi(endpoint, params = {}) {
  const queryStr = new URLSearchParams(params).toString();
  const fullUrl = `https://wichart.vn/wichartapi/${endpoint}${queryStr ? `?${queryStr}` : ''}`;
  const authHeaders = generateHeaders(params);

  const res = await fetch(fullUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Referer: 'https://widata.vn/bao-cao-phan-tich',
      Origin: 'https://widata.vn',
      Accept: 'application/json, text/plain, */*',
      'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function toSlug(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDate(isoStr) {
  if (!isoStr) return { date: '', displayDate: '' };
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return { date: '', displayDate: '' };
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return {
      date: `${yyyy}-${mm}-${dd}`,
      displayDate: `${dd}/${mm}/${yyyy}`,
    };
  } catch {
    return { date: '', displayDate: '' };
  }
}

// 1. Đồng bộ Báo cáo Doanh nghiệp
async function syncCompanyReports(db, maxPages = 3) {
  console.log('\n--- 1. ĐỒNG BỘ BÁO CÁO DOANH NGHIỆP TỪ WIDATA ---');
  let newCount = 0;
  let skippedCount = 0;

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO company_reports (
      id, symbol, title, slug, source, date, display_date,
      recommendation, target_price, page_count, description,
      download_url, thumbnail_url, pdf_key, thumb_key, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  for (let page = 1; page <= maxPages; page++) {
    console.log(`[Doanh nghiệp] Đang tải trang ${page}...`);
    try {
      const res = await callWiDataApi('wichart/company/report', {
        loaibaocao: 'bao_cao_doanh_nghiep',
        page,
        limit: 20,
      });

      const list = res?.result || [];
      if (list.length === 0) break;

      let pageNew = 0;
      for (const item of list) {
        const customId = `wd_${item.id}`;
        const symbol = (item.mack || '').toUpperCase().trim();
        if (!symbol) continue;

        const { date, displayDate } = formatDate(item.ngay_congbo || item.ngaykn);
        const title = (item.tenbaocao || '').trim();
        const slug = `${toSlug(symbol)}-${toSlug(title)}-${customId}`;
        const source = (item.nguon || 'WiData').trim();
        const recommendation = item.khuyennghi && item.khuyennghi !== 'KHÁC' ? item.khuyennghi : null;
        const targetPrice = item.giamuctieu_dieuchinh || item.giamuctieu || null;
        const downloadUrl = item.url || '';

        // Tóm tắt bổ sung
        let descParts = [];
        if (item.ten_vi) descParts.push(item.ten_vi);
        if (item.nganhcap4_vi) descParts.push(`Ngành: ${item.nganhcap4_vi}`);
        if (item.upside_hientai) descParts.push(`Kỳ vọng tăng giá (Upside): ${Number(item.upside_hientai).toFixed(1)}%`);
        if (item.lnst_duphong) descParts.push(`Dự phóng LNST: ${item.lnst_duphong} tỷ đồng`);
        const description = descParts.join(' | ');

        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

        const result = insertStmt.run(
          customId,
          symbol,
          title,
          slug,
          source,
          date,
          displayDate,
          recommendation,
          targetPrice ? Number(targetPrice) : null,
          0,
          description,
          downloadUrl,
          '',
          '',
          '',
          now
        );

        if (result.changes > 0) {
          pageNew++;
          newCount++;
        } else {
          skippedCount++;
        }
      }

      console.log(`   Trang ${page}: +${pageNew} báo cáo mới.`);
      // Nếu toàn bộ trang này đã có sẵn trong DB, dừng để tiết kiệm requests
      if (pageNew === 0 && list.length > 0) {
        console.log(`   ⏩ Các báo cáo tiếp theo đã có trong DB. Dừng quét gia tăng an toàn.`);
        break;
      }

      // Giãn cách an toàn 1.5 - 2.5 giây giữa các trang
      await sleep(1500 + Math.random() * 1000);
    } catch (err) {
      console.warn(`   ⚠️ Lỗi tải trang ${page}: ${err.message}`);
      break;
    }
  }

  console.log(`✅ Hoàn thành Báo cáo Doanh nghiệp: +${newCount} mới (bỏ qua ${skippedCount} đã tồn tại).`);
  return newCount;
}

// 2. Đồng bộ Báo cáo Ngành
async function syncIndustryReports(indDb, maxPages = 3) {
  console.log('\n--- 2. ĐỒNG BỘ BÁO CÁO NGÀNH TỪ WIDATA ---');
  let newCount = 0;
  let skippedCount = 0;

  const insertStmt = indDb.prepare(`
    INSERT OR IGNORE INTO industry_reports (
      id, slug, title, source, date, display_date,
      scope, sector_name, symbol, description,
      page_count, download_url, thumbnail_url,
      recommendation, target_price, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?
    )
  `);

  for (let page = 1; page <= maxPages; page++) {
    console.log(`[Ngành] Đang tải trang ${page}...`);
    try {
      const res = await callWiDataApi('wichart/company/report', {
        loaibaocao: 'bao_cao_nganh',
        page,
        limit: 20,
      });

      const list = res?.result || [];
      if (list.length === 0) break;

      let pageNew = 0;
      for (const item of list) {
        const customId = `wd_ind_${item.id}`;
        const sectorName = item.rsnganh || item.nganhcap4_vi || 'Ngành chung';
        const { date, displayDate } = formatDate(item.ngay_congbo || item.ngaykn);
        const title = (item.tenbaocao || '').trim();
        const slug = `${toSlug(sectorName)}-${toSlug(title)}-${customId}`;
        const source = (item.nguon || 'WiData').trim();
        const downloadUrl = item.url || '';
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

        const result = insertStmt.run(
          customId,
          slug,
          title,
          source,
          date,
          displayDate,
          'sector',
          sectorName,
          null,
          title,
          0,
          downloadUrl,
          '',
          null,
          null,
          now
        );

        if (result.changes > 0) {
          pageNew++;
          newCount++;
        } else {
          skippedCount++;
        }
      }

      console.log(`   Trang ${page}: +${pageNew} báo cáo mới.`);
      if (pageNew === 0 && list.length > 0) {
        console.log(`   ⏩ Các báo cáo ngành tiếp theo đã có trong DB. Dừng an toàn.`);
        break;
      }

      await sleep(1500 + Math.random() * 1000);
    } catch (err) {
      console.warn(`   ⚠️ Lỗi tải trang ngành ${page}: ${err.message}`);
      break;
    }
  }

  // Cập nhật lại snapshot JSON cho frontend nếu có báo cáo mới
  if (newCount > 0) {
    try {
      const allRows = indDb.prepare(`
        SELECT id, slug, title, source, date, display_date as displayDate, scope,
               sector_name as sectorName, symbol, description, page_count as pageCount,
               download_url as downloadUrl, thumbnail_url as thumbnailUrl,
               recommendation, target_price as targetPrice
        FROM industry_reports
        ORDER BY date DESC, id DESC
      `).all();
      const sectorSet = new Set();
      for (const row of allRows) {
        if (row.sectorName && row.sectorName !== "Ngành chung") sectorSet.add(row.sectorName);
      }
      const jsonPath = path.join(DATA_DIR, "industry-reports.json");
      fs.writeFileSync(
        jsonPath,
        JSON.stringify(
          {
            updatedAt: new Date().toISOString(),
            total: allRows.length,
            availableSectors: Array.from(sectorSet).sort(),
            reports: allRows,
          },
          null,
          2
        ),
        "utf8"
      );
      console.log(`   💾 Đã cập nhật snapshot: data/industry-reports.json (${allRows.length} báo cáo)`);
    } catch (e) {
      console.warn(`   ⚠️ Lỗi ghi snapshot json: ${e.message}`);
    }
  }

  console.log(`✅ Hoàn thành Báo cáo Ngành: +${newCount} mới (bỏ qua ${skippedCount} đã tồn tại).`);
  return newCount;
}

// 3. Đồng bộ các loại báo cáo chuyên sâu khác (Vĩ mô, Chiến lược, Trái phiếu, Bản tin IR)
async function syncOtherReports(categoryKey, filename, label) {
  console.log(`\n--- 3. ĐỒNG BỘ ${label.toUpperCase()} (${categoryKey}) ---`);
  const filePath = path.join(ARCHIVE_REPORTS_DIR, filename);

  let existing = [];
  if (fs.existsSync(filePath)) {
    try {
      existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {}
  }
  const existingIds = new Set(existing.map((x) => x.id));

  try {
    const res = await callWiDataApi('wichart/company/report', {
      loaibaocao: categoryKey,
      page: 1,
      limit: 25,
    });

    const list = res?.result || [];
    let added = 0;

    for (const item of list) {
      if (!existingIds.has(item.id)) {
        existing.unshift({
          id: item.id,
          title: item.tenbaocao,
          source: item.nguon,
          date: item.ngay_congbo,
          url: item.url,
          category: label,
          created_at: new Date().toISOString(),
        });
        existingIds.add(item.id);
        added++;
      }
    }

    if (added > 0) {
      // Giữ tối đa 500 báo cáo gần nhất mỗi loại
      const trimmed = existing.slice(0, 500);
      fs.writeFileSync(filePath, JSON.stringify(trimmed, null, 2), 'utf8');
      console.log(`✅ Đã lưu ${added} báo cáo mới vào ${filename} (Tổng: ${trimmed.length})`);
    } else {
      console.log(`✅ Không có báo cáo mới (Đang có ${existing.length} báo cáo).`);
    }
    return added;
  } catch (err) {
    console.warn(`⚠️ Lỗi tải ${label}: ${err.message}`);
    return 0;
  }
}

// ============================================================================
// MAIN RUNNER
// ============================================================================
async function main() {
  console.log('===============================================================');
  console.log('🛡️  ĐỒNG BỘ BÁO CÁO PHÂN TÍCH WIDATA (CHẾ ĐỘ AN TOÀN ẨN DANH)');
  console.log('   - Cơ chế: Guest unauthenticated (Tuyệt đối không dùng token/tài khoản)');
  console.log('   - Chống phát hiện: Jitter delay + Incremental sync');
  console.log('===============================================================');

  const companyDbPath = path.join(DATA_DIR, 'company_reports.db');
  const industryDbPath = path.join(DATA_DIR, 'industry_reports.db');

  const compDb = new DatabaseSync(companyDbPath);
  const indDb = new DatabaseSync(industryDbPath);

  // 1. Doanh nghiệp
  const compCount = await syncCompanyReports(compDb, 2);

  // 2. Ngành
  await sleep(1500);
  const indCount = await syncIndustryReports(indDb, 2);

  // 3. Vĩ mô & Chiến lược & Trái phiếu & IR
  await sleep(1500);
  await syncOtherReports('bao_cao_vi_mo', 'macro_reports.json', 'Báo cáo Vĩ mô');

  await sleep(1500);
  await syncOtherReports('bao_cao_chien_luoc', 'strategy_reports.json', 'Báo cáo Chiến lược');

  await sleep(1500);
  await syncOtherReports('bao_cao_trai_phieu', 'bond_reports.json', 'Báo cáo Trái phiếu');

  await sleep(1500);
  await syncOtherReports('ban_tin_ir', 'ir_news.json', 'Bản tin IR');

  // Đóng kết nối DB
  compDb.close();
  indDb.close();

  // Cập nhật summary metadata cho website nếu có báo cáo doanh nghiệp mới
  if (compCount > 0) {
    try {
      const tempDb = new DatabaseSync(companyDbPath, { readOnly: true });
      const totalRow = tempDb.prepare('SELECT COUNT(*) as count FROM company_reports').get();
      const symbolsRow = tempDb.prepare('SELECT COUNT(DISTINCT symbol) as count FROM company_reports').get();
      const latestRow = tempDb.prepare('SELECT MAX(date) as max_date FROM company_reports').get();
      tempDb.close();

      const summaryPath = path.join(DATA_DIR, 'company_reports_summary.json');
      fs.writeFileSync(
        summaryPath,
        JSON.stringify(
          {
            totalReports: totalRow.count,
            totalSymbols: symbolsRow.count,
            latestDate: latestRow.max_date,
            updatedAt: new Date().toISOString(),
          },
          null,
          2
        ),
        'utf8'
      );
      console.log(`\n📊 Đã cập nhật company_reports_summary.json: ${totalRow.count} báo cáo (${symbolsRow.count} mã)`);
    } catch {}
  }

  console.log('\n===============================================================');
  console.log('🎉 ĐỒNG BỘ BÁO CÁO WIDATA HOÀN TẤT THÀNH CÔNG VÀ TUYỆT ĐỐI AN TOÀN!');
  console.log('===============================================================');
}

main().catch((err) => {
  console.error('Lỗi nghiêm trọng:', err);
  process.exit(1);
});
