/**
 * Sync Daily Candles Bot (Chuẩn WiData & Koyfin EOD)
 * Tự động đồng bộ và lưu trữ nến kỹ thuật (OHLCV) 3 năm cho các mã cổ phiếu vào thư mục nội bộ:
 * data/price_history/{MÃ}.json
 *
 * Chạy 1 lần/ngày (sau 15:35 phiên đóng cửa) để người dùng khi lướt web luôn đọc 100% từ đĩa 0ms,
 * hoàn toàn không phụ thuộc và không gọi ra bên thứ ba.
 *
 * Cách chạy:
 *   node scripts/sync-daily-candles.mjs --top=100    # Đồng bộ Top 100 cổ phiếu lớn nhất
 *   node scripts/sync-daily-candles.mjs --missing    # Chỉ tải các mã chưa có file cache
 *   node scripts/sync-daily-candles.mjs --all        # Đồng bộ toàn bộ thị trường
 *   node scripts/sync-daily-candles.mjs --tickers=SSI,VND,HPG,FPT
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const CACHE_DIR = path.resolve(DATA_DIR, 'price_history');

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function formatDDMMYYYY(timestampSec) {
  const d = new Date(timestampSec * 1000);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const toVnd = (raw) => (raw < 500 ? Math.round(raw * 1000) : Math.round(raw));

async function fetchCandlesFromEntrade(sym, fromSec, toSec) {
  const url = `https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?from=${fromSec}&to=${toSec}&symbol=${sym}&resolution=1D`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !Array.isArray(data.t) || data.t.length === 0) return null;

    const times = data.t;
    const opens = data.o || [];
    const highs = data.h || [];
    const lows = data.l || [];
    const closes = data.c || [];
    const volumes = data.v || [];

    const points = [];
    for (let i = 0; i < times.length; i++) {
      const rawClose = Number(closes[i]) || 0;
      const rawOpen = Number(opens[i]) || rawClose;
      const rawHigh = Number(highs[i]) || Math.max(rawOpen, rawClose);
      const rawLow = Number(lows[i]) || Math.min(rawOpen, rawClose);

      points.push({
        time: times[i],
        date: formatDDMMYYYY(times[i]),
        open: toVnd(rawOpen),
        high: toVnd(rawHigh),
        low: toVnd(rawLow),
        close: toVnd(rawClose),
        volume: Number(volumes[i]) || 0,
      });
    }

    return points;
  } catch {
    return null;
  }
}

async function fetchCandlesFromVndirect(sym, fromSec, toSec) {
  const url = `https://dchart-api.vndirect.com.vn/dchart/history?resolution=D&symbol=${sym}&from=${fromSec}&to=${toSec}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.s !== 'ok' || !Array.isArray(data.t) || data.t.length === 0) return null;

    const times = data.t;
    const opens = data.o || [];
    const highs = data.h || [];
    const lows = data.l || [];
    const closes = data.c || [];
    const volumes = data.v || [];

    const points = [];
    for (let i = 0; i < times.length; i++) {
      const rawClose = Number(closes[i]) || 0;
      const rawOpen = Number(opens[i]) || rawClose;
      const rawHigh = Number(highs[i]) || Math.max(rawOpen, rawClose);
      const rawLow = Number(lows[i]) || Math.min(rawOpen, rawClose);

      points.push({
        time: times[i],
        date: formatDDMMYYYY(times[i]),
        open: toVnd(rawOpen),
        high: toVnd(rawHigh),
        low: toVnd(rawLow),
        close: toVnd(rawClose),
        volume: Number(volumes[i]) || 0,
      });
    }

    return points;
  } catch {
    return null;
  }
}

export async function syncDailyStockCandles(options = {}) {
  const manifestPath = path.join(DATA_DIR, 'longlive_manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('Không tìm thấy file data/longlive_manifest.json');
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const allItems = manifest.items || [];

  // Xác định danh sách mã cần đồng bộ
  let targetTickers = [];

  const args = process.argv.slice(2);
  const argTop = args.find((a) => a.startsWith('--top='));
  const argTickers = args.find((a) => a.startsWith('--tickers='));
  const isMissingOnly = args.includes('--missing') || options.missing;
  const isAll = args.includes('--all') || options.all;
  const isForce = args.includes('--force') || options.force;

  if (argTickers) {
    const rawList = argTickers.split('=')[1] || '';
    targetTickers = rawList.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);
  } else if (isAll) {
    targetTickers = allItems.map((x) => x.t).filter(Boolean);
  } else if (argTop) {
    const topN = parseInt(argTop.split('=')[1], 10) || 100;
    // Sắp xếp theo vốn hóa giảm dần
    const sorted = [...allItems].sort((a, b) => (b.cap || 0) - (a.cap || 0));
    targetTickers = sorted.slice(0, topN).map((x) => x.t).filter(Boolean);
  } else if (isMissingOnly) {
    targetTickers = allItems
      .map((x) => x.t)
      .filter((t) => t && !fs.existsSync(path.join(CACHE_DIR, `${t}.json`)));
  } else {
    // Mặc định: Đồng bộ Top 200 mã lớn nhất hoặc mã chưa có cache
    const sorted = [...allItems].sort((a, b) => (b.cap || 0) - (a.cap || 0));
    const top200 = sorted.slice(0, 200).map((x) => x.t).filter(Boolean);
    const missing = allItems
      .map((x) => x.t)
      .filter((t) => t && !fs.existsSync(path.join(CACHE_DIR, `${t}.json`)))
      .slice(0, 100);
    targetTickers = Array.from(new Set([...top200, ...missing]));
  }

  console.log(`=== BẮT ĐẦU ĐỒNG BỘ NẾN EOD CHO ${targetTickers.length} MÃ CỔ PHIẾU ===`);

  const now = Math.floor(Date.now() / 1000);
  const fromSec = now - 3 * 365 * 86400; // 3 năm
  const todayStr = new Date().toISOString().slice(0, 10);

  let success = 0;
  let skipped = 0;
  let failed = 0;
  let idx = 0;

  const CONCURRENCY = 15;
  const startTime = Date.now();

  async function worker() {
    while (idx < targetTickers.length) {
      const sym = targetTickers[idx++];
      const cachePath = path.join(CACHE_DIR, `${sym}.json`);

      // Kiểm tra nếu đã được cập nhật hôm nay thì bỏ qua (trừ khi có --force)
      if (!isForce && fs.existsSync(cachePath)) {
        try {
          const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
          if (cached && cached.updatedAt && cached.updatedAt.startsWith(todayStr)) {
            skipped++;
            continue;
          }
        } catch {}
      }

      // Thử nạp từ Entrade trước, fallback VNDirect
      let points = await fetchCandlesFromEntrade(sym, fromSec, now);
      if (!points || points.length === 0) {
        points = await fetchCandlesFromVndirect(sym, fromSec, now);
      }

      if (points && points.length > 0) {
        const payload = {
          symbol: sym,
          updatedAt: new Date().toISOString(),
          points,
        };
        try {
          fs.writeFileSync(cachePath, JSON.stringify(payload), 'utf-8');
          success++;
        } catch {
          failed++;
        }
      } else {
        failed++;
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`=== HOÀN TẤT ĐỒNG BỘ: ${success} thành công, ${skipped} đã cập nhật hôm nay, ${failed} lỗi (${elapsed}s) ===`);
}

if (process.argv[1] && process.argv[1].endsWith('sync-daily-candles.mjs')) {
  syncDailyStockCandles().catch(console.error);
}
