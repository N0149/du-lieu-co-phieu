/**
 * Sync Price Changes Bot
 * Đồng bộ và tính toán hiệu suất biến động giá: 1 tuần (1W), 1 tháng (1M), 3 tháng (3M), 
 * 6 tháng (6M), 1 năm (1Y), 3 năm (3Y) và từ đầu năm (YTD) cho toàn bộ 1.530 mã cổ phiếu.
 *
 * Nguồn dữ liệu: DNSE Entrade DChart API (OHLCV lịch sử 3+ năm chuẩn xác).
 * Output: data/stock_price_changes.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.resolve(ROOT_DIR, 'data');

function calculateReturns(times, closes) {
  if (!times || !closes || times.length < 2) return null;
  const len = closes.length;
  const lastTime = times[len - 1]; // epoch seconds
  const lastClose = closes[len - 1];
  if (!lastClose || lastClose <= 0) return null;

  function getPriceAt(targetSec) {
    let closestIdx = -1;
    for (let i = len - 1; i >= 0; i--) {
      if (times[i] <= targetSec) {
        closestIdx = i;
        break;
      }
    }
    if (closestIdx === -1) return null;
    return closes[closestIdx];
  }

  // 1 tuần: 7 ngày trước (hoặc 5 phiên)
  const p1w = getPriceAt(lastTime - 7 * 86400);
  // 1 tháng: 30 ngày trước
  const p1m = getPriceAt(lastTime - 30 * 86400);
  // 3 tháng: 90 ngày trước
  const p3m = getPriceAt(lastTime - 90 * 86400);
  // 6 tháng: 180 ngày trước
  const p6m = getPriceAt(lastTime - 180 * 86400);
  // 1 năm: 365 ngày trước
  const p1y = getPriceAt(lastTime - 365 * 86400);
  // 3 năm: 3 * 365 ngày trước
  const p3y = getPriceAt(lastTime - 3 * 365 * 86400);

  // YTD: Phiên giao dịch cuối cùng của năm trước
  const dLast = new Date(lastTime * 1000);
  const startOfYearSec = Math.floor(new Date(dLast.getFullYear(), 0, 1).getTime() / 1000);
  const pYtd = getPriceAt(startOfYearSec);

  const calcPct = (p) => (p && p > 0 ? Math.round(((lastClose - p) / p) * 1000) / 10 : null);

  return {
    price: lastClose,
    change1w: calcPct(p1w),
    change1m: calcPct(p1m),
    change3m: calcPct(p3m),
    change6m: calcPct(p6m),
    change1y: calcPct(p1y),
    change3y: calcPct(p3y),
    changeYtd: calcPct(pYtd),
    updatedAt: new Date().toISOString(),
  };
}

export async function syncAllStockPriceChanges() {
  const manifestPath = path.join(DATA_DIR, 'longlive_manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('Không tìm thấy longlive_manifest.json');
    return {};
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const tickers = (manifest.items || []).map((x) => x.t).filter(Boolean);
  console.log(`=== BẮT ĐẦU ĐỒNG BỘ BIẾN ĐỘNG GIÁ CHO ${tickers.length} MÃ CỔ PHIẾU ===`);

  const now = Math.floor(Date.now() / 1000);
  const fromSec = now - (3 * 365 + 60) * 86400; // 3 năm và 2 tháng trước để bao quát đủ mốc 3Y

  const results = {};
  let successCount = 0;
  let failCount = 0;

  const CONCURRENCY = 20;
  let idx = 0;
  const startTime = Date.now();

  async function worker() {
    while (idx < tickers.length) {
      const sym = tickers[idx++];
      const url = `https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?from=${fromSec}&to=${now}&symbol=${sym}&resolution=1D`;
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(3500),
        });

        if (res.ok) {
          const d = await res.json();
          if (d && Array.isArray(d.t) && d.t.length > 0) {
            const ret = calculateReturns(d.t, d.c);
            if (ret) {
              results[sym] = ret;
              successCount++;
            } else {
              failCount++;
            }
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Đã hoàn tất đồng bộ: ${successCount} thành công, ${failCount} không có dữ liệu giao dịch (${totalElapsed}s).`);

  const outputPath = path.join(DATA_DIR, 'stock_price_changes.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`Đã lưu dữ liệu vào: ${outputPath}`);

  return results;
}

if (process.argv[1] && process.argv[1].endsWith('sync-price-changes.mjs')) {
  syncAllStockPriceChanges().catch(console.error);
}
