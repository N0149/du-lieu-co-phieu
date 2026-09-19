/**
 * scripts/crawl-company-websites.mjs
 * Tự động thu thập URL website, đơn vị kiểm toán, địa chỉ, ngày niêm yết của toàn bộ 1.530 mã cổ phiếu
 * Nguồn: WiData API (wichart/company/briefinfo)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT_DIR = 'd:\\hoc\\lap trinh\\du-lieu-co-phieu';
const OUT_PATH = path.join(ROOT_DIR, 'data', 'company_websites.json');
const ARCHIVE_PATH = path.join(ROOT_DIR, 'data', 'widata_archive', 'company', 'brief_info.json');

const PASSPHRASE = 'ZmRvaWFmaGRpc2ZoaWRzZHNoa2RoaW9zZGZoc2E=';

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

function decryptPayload(encryptedB64) {
  try {
    const raw = Buffer.from(encryptedB64, 'base64');
    if (raw.subarray(0, 8).toString('utf8') !== 'Salted__') return null;
    const salt = raw.subarray(8, 16);
    const ciphertext = raw.subarray(16);
    const { key, iv } = evpBytesToKey(Buffer.from(PASSPHRASE, 'utf8'), salt, 32, 16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch {
    return null;
  }
}

function generateHeaders(params = {}) {
  const stime = Date.now().toString();
  const nonce = (
    Math.floor((Math.random() + Math.floor(9 * Math.random() + 1)) * Math.pow(10, 19))
  ).toString();
  const signToken = 'ObBeWhVmYs3tP2Nz$C$FJ@P4AQfTjlPX';
  const v = 'v1';
  const authHeaders = { stime, nonce, 'sign-token': signToken, v };
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

async function fetchBriefInfo(ticker) {
  const body = { code: ticker };
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://widata.vn/',
    'Origin': 'https://widata.vn',
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
    ...generateHeaders(body),
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch('https://wichart.vn/wichartapi/wichart/company/briefinfo', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }
        return null;
      }
      const json = await res.json();
      if (!json?.enc) return null;
      return decryptPayload(json.enc);
    } catch {
      if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
    }
  }
  return null;
}

async function run() {
  console.log('🚀 Bắt đầu thu thập Website & Hồ sơ tóm tắt từ WiData...');
  
  // Đọc danh sách mã từ manifest
  const manifestPath = path.join(ROOT_DIR, 'data', 'longlive_manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const tickers = (manifest.items || manifest).map((s) => s.t.toUpperCase().trim());

  console.log(`📋 Tổng số mã cần quét: ${tickers.length}`);

  // Đọc checkpoint cũ nếu có
  let existingData = {};
  if (fs.existsSync(OUT_PATH)) {
    try {
      existingData = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
    } catch {}
  }

  const existingBrief = {};
  if (fs.existsSync(ARCHIVE_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(ARCHIVE_PATH, 'utf8'));
      Object.assign(existingBrief, parsed);
    } catch {}
  }

  const toFetch = tickers.filter((t) => !existingData[t] || !existingData[t].website);
  console.log(`⚡ Cần tải mới/bổ sung: ${toFetch.length} mã (đã có ${Object.keys(existingData).length} mã)`);

  const CONCURRENCY = 15;
  let successCount = 0;
  let failCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const chunk = toFetch.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (ticker) => {
        const info = await fetchBriefInfo(ticker);
        return { ticker, info };
      })
    );

    for (const { ticker, info } of results) {
      if (info) {
        successCount++;
        let ws = (info.website || '').trim();
        // Chuẩn hóa url website
        if (ws) {
          ws = ws.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
        }

        existingData[ticker] = {
          website: ws || null,
          address: info.diachi_vi?.trim() || null,
          auditor: info.donvikiemtoan?.trim() || null,
          listingDate: info.ngayniemyet?.slice(0, 10) || null,
          name: info.ten_vi?.trim() || null,
          intro: info.gioithieu_vi?.trim() || null,
        };
        existingBrief[ticker] = info;
      } else {
        failCount++;
      }
    }

    // Ghi checkpoint mỗi 90 mã
    if ((i + CONCURRENCY) % 90 === 0 || i + CONCURRENCY >= toFetch.length) {
      fs.writeFileSync(OUT_PATH, JSON.stringify(existingData, null, 2), 'utf8');
      fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(existingBrief, null, 2), 'utf8');
      const pct = Math.round(((i + chunk.length) / toFetch.length) * 100);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`[${pct}%] Đã xử lý ${i + chunk.length}/${toFetch.length} mã (${elapsed}s) - Thành công: ${successCount}, Trống: ${failCount}`);
    }

    // Delay nhỏ giữa các batch để tránh bị rate limit
    await new Promise((r) => setTimeout(r, 120));
  }

  // Ghi file cuối cùng
  fs.writeFileSync(OUT_PATH, JSON.stringify(existingData, null, 2), 'utf8');
  fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(existingBrief, null, 2), 'utf8');

  console.log(`\n🎉 HOÀN TẤT THU THẬP WEBSITE DOANH NGHIỆP!`);
  console.log(`📁 File tra cứu nhanh: ${OUT_PATH}`);
  console.log(`📁 File lưu trữ chi tiết: ${ARCHIVE_PATH}`);
  console.log(`📊 Tổng số mã có dữ liệu: ${Object.keys(existingData).length}`);
  const withWebsite = Object.values(existingData).filter((v) => v.website).length;
  console.log(`🌐 Tổng số mã có đường link Website: ${withWebsite}`);
}

run();
