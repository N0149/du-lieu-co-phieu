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

const CIPHER_KEY_HEX = 'fa4abc75c049cac6b2d58d501f183a3f4eeace7d3f79f37724b1737d095371e5';
const Hs = [82, 84, 90, 49]; // 'R', 'T', 'Z', '1'

function isGzip(bytes) {
  if (bytes.length < Hs.length) return false;
  return Hs.every((b, idx) => bytes[idx] === b);
}

async function decompressGzip(bytes) {
  const ds = new DecompressionStream('gzip');
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    }
  }).pipeThrough(ds);
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

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
  let decryptedBytes = new Uint8Array(decryptedBuf);
  if (isGzip(decryptedBytes)) {
    decryptedBytes = await decompressGzip(decryptedBytes.subarray(Hs.length));
  }
  return JSON.parse(new TextDecoder().decode(decryptedBytes));
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function fetchJson(url, options = {}, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/json',
          ...options.headers,
        },
        ...options,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} when fetching ${url}`);
      }
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, attempt * 500));
    }
  }
}

async function syncIndustryData() {
  const startTime = Date.now();
  console.log('🚀 [Sync Industry] Bắt đầu đồng bộ dữ liệu ngành ICB...');

  ensureDir(INDUSTRY_DIR);
  ensureDir(KQKD_DIR);
  ensureDir(SPIDER_DIR);

  // 1. Tải icb_hierarchy.json, sector_icb_summary.json và sector_stocks.json
  console.log('📦 1/4 Đang tải cây ngành ICB & Tổng quan vốn hóa/định giá...');
  const hierarchy = await fetchJson('https://ruatichsan.com/config/icb_hierarchy.json');
  await new Promise((r) => setTimeout(r, 100));
  const summary = await fetchJson('https://ruatichsan.com/config/sector_icb_summary.json');
  await new Promise((r) => setTimeout(r, 100));
  const sectorStocks = await fetchJson('https://ruatichsan.com/config/sector_stocks.json').catch(() => null);

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
  fs.writeFileSync(
    path.join(INDUSTRY_DIR, 'icb-summary.json'),
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
  for (const code of kqkdCodes) {
    let attempts = 0;
    while (attempts < 3) {
      attempts++;
      try {
        const kqkdData = await fetchJson(`https://ruatichsan.com/config/icb_kqkd/${code}.json`);
        fs.writeFileSync(
          path.join(KQKD_DIR, `${code}.json`),
          JSON.stringify(kqkdData, null, 2),
          'utf-8'
        );
        kqkdSuccessCount++;
        break;
      } catch (err) {
        if (attempts >= 3) {
          console.warn(`   ⚠️ Không tải được KQKD cho mã ${code}:`, err.message);
        } else {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    }
  }
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
      fs.writeFileSync(
        path.join(INDUSTRY_DIR, 'sector-valuation-overview.json'),
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
      fs.writeFileSync(
        path.join(INDUSTRY_DIR, 'banking-industry-benchmark.json'),
        JSON.stringify(benchData, null, 2),
        'utf-8'
      );
      console.log('   ✅ Đã lưu banking_benchmark.json (Cơ cấu cho vay 27 ngân hàng)');
    }
  } catch (err) {
    console.warn('   ⚠️ Lỗi tải banking_benchmark.json:', err.message);
  }

  // 5. Cập nhật danh mục & định giá realtime từng cổ phiếu từ LongLiveStock
  console.log('⚡ 5/5 Đang cập nhật giá & định giá chi tiết từng cổ phiếu...');
  try {
    const manifestDest = path.join(ROOT_DIR, 'data', 'longlive_manifest.json');
    const manifestRes = await fetchJson('https://longlivestock.com/data/manifest.json');
    if (manifestRes && Array.isArray(manifestRes.items)) {
      // Merge custom stocks nếu có
      const customPath = path.join(ROOT_DIR, 'data', 'custom_stocks_manifest.json');
      if (fs.existsSync(customPath)) {
        try {
          const custom = JSON.parse(fs.readFileSync(customPath, 'utf8'));
          const existing = new Set(manifestRes.items.map((i) => i.t.toUpperCase()));
          for (const c of custom) {
            if (!existing.has(c.t.toUpperCase())) {
              manifestRes.items.push(c);
            }
          }
          manifestRes.count = manifestRes.items.length;
        } catch {}
      }
      fs.writeFileSync(manifestDest, JSON.stringify(manifestRes, null, 2), 'utf-8');
      console.log(`   ✅ Đã cập nhật longlive_manifest.json (${manifestRes.items.length} mã cổ phiếu)`);
    }
  } catch (err) {
    console.warn('   ⚠️ Không tải được manifest:', err.message);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n🎉 [Sync Industry] Hoàn tất đồng bộ dữ liệu ngành trong ${duration}s!`);
}

syncIndustryData().catch((err) => {
  console.error('❌ Lỗi tiến trình đồng bộ ngành:', err);
  process.exit(1);
});
