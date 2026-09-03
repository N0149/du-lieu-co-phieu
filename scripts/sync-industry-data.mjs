/**
 * Script tải và đồng bộ toàn bộ dữ liệu Đánh Giá Ngành ICB từ ruatichsan.com
 *
 * Dữ liệu bao gồm:
 * 1. Cây phân cấp ngành ICB (L1 -> L2 -> L3 -> L4 & mapping mã cổ phiếu): config/icb_hierarchy.json
 * 2. Tổng quan vốn hóa, P/E, P/B thị trường & từng ngành L2: config/sector_icb_summary.json
 * 3. Kết quả kinh doanh Doanh thu, LNST đa quý từ 2018 đến nay: config/icb_kqkd/{code}.json
 * 4. Bảng định giá P/E, P/B, P/S hiện tại vs lịch sử 1Y, 3Y, 5Y, 10Y: public/sector-valuation/overview
 * 5. Bộ chỉ số mạng nhện ngành Ngân hàng & Chứng khoán: spider/{banking,securities}_spider.json
 *
 * Cách dùng:
 *   node scripts/sync-industry-data.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const INDUSTRY_DIR = path.join(ROOT_DIR, 'data', 'industry');
const KQKD_DIR = path.join(INDUSTRY_DIR, 'kqkd');
const SPIDER_DIR = path.join(INDUSTRY_DIR, 'spider');

const CIPHER_KEY_HEX = '19dd3af428f4cf7d68864cd4c87d8d1c5b489932e84b93ac6528a0dd403a5725';

let cryptoKeyCache = null;
async function getCryptoKey() {
  if (cryptoKeyCache) return cryptoKeyCache;
  const bytes = new Uint8Array(CIPHER_KEY_HEX.match(/.{2}/g).map((h) => parseInt(h, 16)));
  cryptoKeyCache = await crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['decrypt']);
  return cryptoKeyCache;
}

async function decryptApiResponse(res) {
  if (res.headers.get('X-Encrypted') !== '1') {
    return await res.json();
  }
  const buf = await res.arrayBuffer();
  const key = await getCryptoKey();
  const rawBytes = new Uint8Array(buf);
  const iv = rawBytes.slice(0, 12);
  const ciphertext = rawBytes.slice(12);
  const decryptedBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(decryptedBuf));
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'application/json',
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} when fetching ${url}`);
  }
  return await res.json();
}

async function syncIndustryData() {
  const startTime = Date.now();
  console.log('🚀 [Sync Industry] Bắt đầu đồng bộ dữ liệu ngành ICB...');

  ensureDir(INDUSTRY_DIR);
  ensureDir(KQKD_DIR);
  ensureDir(SPIDER_DIR);

  // 1. Tải icb_hierarchy.json, sector_icb_summary.json và sector_stocks.json
  console.log('📦 1/4 Đang tải cây ngành ICB & Tổng quan vốn hóa/định giá...');
  const [hierarchy, summary, sectorStocks] = await Promise.all([
    fetchJson('https://ruatichsan.com/config/icb_hierarchy.json'),
    fetchJson('https://ruatichsan.com/config/sector_icb_summary.json'),
    fetchJson('https://ruatichsan.com/config/sector_stocks.json').catch(() => null),
  ]);

  fs.writeFileSync(
    path.join(INDUSTRY_DIR, 'icb_hierarchy.json'),
    JSON.stringify(hierarchy, null, 2),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(INDUSTRY_DIR, 'sector_icb_summary.json'),
    JSON.stringify(summary, null, 2),
    'utf-8'
  );
  if (sectorStocks) {
    fs.writeFileSync(
      path.join(INDUSTRY_DIR, 'sector_stocks.json'),
      JSON.stringify(sectorStocks, null, 2),
      'utf-8'
    );
  }
  console.log('   ✅ Đã lưu icb_hierarchy.json, sector_icb_summary.json và sector_stocks.json');

  // 2. Tải toàn bộ KQKD: toàn thị trường ('market') và 19 ngành L2
  const l2Codes = Object.keys(summary.l2_sectors || {});
  const kqkdCodes = ['market', ...l2Codes];
  console.log(`📊 2/4 Đang tải KQKD cho ${kqkdCodes.length} nhóm ngành (Thị trường + 19 ngành L2)...`);

  let kqkdSuccessCount = 0;
  await Promise.all(
    kqkdCodes.map(async (code) => {
      try {
        const kqkdData = await fetchJson(`https://ruatichsan.com/config/icb_kqkd/${code}.json`);
        fs.writeFileSync(
          path.join(KQKD_DIR, `${code}.json`),
          JSON.stringify(kqkdData, null, 2),
          'utf-8'
        );
        kqkdSuccessCount++;
      } catch (err) {
        console.warn(`   ⚠️ Không tải được KQKD cho mã ${code}:`, err.message);
      }
    })
  );
  console.log(`   ✅ Đã lưu ${kqkdSuccessCount}/${kqkdCodes.length} file KQKD`);

  // 3. Tải bảng Định giá tổng quan ngành (sector-valuation/overview)
  console.log('📈 3/4 Đang tải dữ liệu Định giá đa khung thời gian (1Y, 3Y, 5Y, 10Y)...');
  try {
    const valRes = await fetch('https://api.ruatichsan.com/api/v1/data/public/sector-valuation/overview', {
      headers: {
        Origin: 'https://ruatichsan.com',
        Referer: 'https://ruatichsan.com/',
      },
    });
    if (valRes.ok) {
      const valData = await decryptApiResponse(valRes);
      fs.writeFileSync(
        path.join(INDUSTRY_DIR, 'sector_valuation_overview.json'),
        JSON.stringify(valData, null, 2),
        'utf-8'
      );
      console.log(`   ✅ Đã lưu sector_valuation_overview.json (${valData.sectors?.length || 0} ngành)`);
    } else {
      console.warn(`   ⚠️ API sector-valuation trả về status ${valRes.status}`);
    }
  } catch (err) {
    console.warn('   ⚠️ Lỗi giải mã dữ liệu định giá ngành:', err.message);
  }

  // 4. Tải dữ liệu mạng nhện Spider Chart & Benchmark chuyên biệt (Ngân hàng & Chứng khoán)
  console.log('🕸️ 4/4 Đang tải bộ dữ liệu chuyên biệt Ngân hàng & Chứng khoán...');
  for (const spiderType of ['banking_spider', 'securities_spider']) {
    try {
      const spiderRes = await fetch(`https://api.ruatichsan.com/api/v1/data/public/industry-spider/${spiderType}`, {
        headers: {
          Origin: 'https://ruatichsan.com',
          Referer: 'https://ruatichsan.com/',
        },
      });
      if (spiderRes.ok) {
        const spiderData = await decryptApiResponse(spiderRes);
        fs.writeFileSync(
          path.join(SPIDER_DIR, `${spiderType}.json`),
          JSON.stringify(spiderData, null, 2),
          'utf-8'
        );
        console.log(`   ✅ Đã lưu spider/${spiderType}.json`);
      } else {
        console.warn(`   ⚠️ Status ${spiderRes.status} khi tải ${spiderType}`);
      }
    } catch (err) {
      console.warn(`   ⚠️ Lỗi tải spider/${spiderType}.json:`, err.message);
    }
  }

  // Tải banking-industry-benchmark (Cơ cấu kỳ hạn & nhóm khách hàng của 27 ngân hàng)
  try {
    const benchRes = await fetch('https://api.ruatichsan.com/api/v1/data/public/banking-industry-benchmark', {
      headers: {
        Origin: 'https://ruatichsan.com',
        Referer: 'https://ruatichsan.com/',
      },
    });
    if (benchRes.ok) {
      const benchData = await decryptApiResponse(benchRes);
      fs.writeFileSync(
        path.join(INDUSTRY_DIR, 'banking_benchmark.json'),
        JSON.stringify(benchData, null, 2),
        'utf-8'
      );
      console.log('   ✅ Đã lưu banking_benchmark.json (Cơ cấu cho vay 27 ngân hàng)');
    }
  } catch (err) {
    console.warn('   ⚠️ Lỗi tải banking_benchmark.json:', err.message);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n🎉 [Sync Industry] Hoàn tất đồng bộ dữ liệu ngành trong ${duration}s!`);
}

syncIndustryData().catch((err) => {
  console.error('❌ Lỗi tiến trình đồng bộ ngành:', err);
  process.exit(1);
});
