/**
 * Script đồng bộ toàn diện và cập nhật Lịch sử Cổ tức cho TOÀN BỘ các mã cổ phiếu trên thị trường
 * Nguồn: API Ruatichsan (giải mã AES-GCM + DecompressionStream gzip)
 * Đích lưu:
 *   1. data/dividend_history.db (SQLite)
 *   2. data/dividend_history/${symbol}.json (JSON cache)
 *   3. Supabase 'dividend_history' table (Cloud DB đồng bộ)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DIV_DIR = path.join(DATA_DIR, 'dividend_history');
const DB_PATH = path.join(DATA_DIR, 'dividend_history.db');

if (!fs.existsSync(DIV_DIR)) {
  fs.mkdirSync(DIV_DIR, { recursive: true });
}

const CIPHER_KEY_HEX = 'fa4abc75c049cac6b2d58d501f183a3f4eeace7d3f79f37724b1737d095371e5';
const RTZ1_MAGIC = [82, 84, 90, 49];

function isRtz1Compressed(buf) {
  if (!buf || buf.length < RTZ1_MAGIC.length) return false;
  return RTZ1_MAGIC.every((b, i) => buf[i] === b);
}

async function decompressRtz1Gzip(buf) {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(buf);
      controller.close();
    },
  }).pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

let cachedKey = null;
async function getCryptoKey() {
  if (cachedKey) return cachedKey;
  const bytes = new Uint8Array(CIPHER_KEY_HEX.match(/.{2}/g).map((h) => parseInt(h, 16)));
  cachedKey = await crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['decrypt']);
  return cachedKey;
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
  const decryptedBytes = new Uint8Array(decryptedBuf);
  const finalBytes = isRtz1Compressed(decryptedBytes)
    ? await decompressRtz1Gzip(decryptedBytes.subarray(RTZ1_MAGIC.length))
    : decryptedBytes;
  return JSON.parse(new TextDecoder().decode(finalBytes));
}

async function fetchDividend(sym, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`https://api.ruatichsan.com/api/v1/data/public/dividend-history/${sym}`, {
        headers: {
          Origin: 'https://ruatichsan.com',
          Referer: 'https://ruatichsan.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      if (res.ok) {
        return await decryptApiResponse(res);
      }
      if (res.status === 404) return null;
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    } catch (err) {
      if (i === retries) return null;
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return null;
}

function getAllTickers() {
  const tickerSet = new Set();
  
  // 1. Từ longlive_manifest.json
  const manifestPath = path.join(DATA_DIR, 'longlive_manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      for (const item of manifest.items || []) {
        if (item.t) tickerSet.add(item.t.toUpperCase().trim());
      }
    } catch {}
  }

  // 2. Từ dividend_history.db hiện tại
  if (fs.existsSync(DB_PATH)) {
    try {
      const db = new DatabaseSync(DB_PATH, { readOnly: true });
      const rows = db.prepare('SELECT symbol FROM dividend_history').all();
      for (const r of rows) {
        if (r.symbol) tickerSet.add(r.symbol.toUpperCase().trim());
      }
      db.close();
    } catch {}
  }

  return Array.from(tickerSet).sort();
}

async function main() {
  console.log('===================================================================');
  console.log('🚀 BẮT ĐẦU KIỂM TRA & ĐỒNG BỘ CỔ TỨC TOÀN BỘ CÁC MÃ CỔ PHIẾU');
  console.log('===================================================================');

  const tickers = getAllTickers();
  console.log(`📌 Tổng số mã cần kiểm tra: ${tickers.length} mã.`);

  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS dividend_history (
      symbol TEXT PRIMARY KEY,
      events_json TEXT,
      updated_at TEXT
    );
  `);

  // Lấy dữ liệu cũ để đối chiếu
  const oldDataMap = new Map();
  const existingRows = db.prepare('SELECT symbol, events_json, updated_at FROM dividend_history').all();
  for (const row of existingRows) {
    try {
      const evs = JSON.parse(row.events_json);
      oldDataMap.set(row.symbol, {
        count: Array.isArray(evs) ? evs.length : 0,
        latestDate: Array.isArray(evs) && evs.length > 0 ? evs[evs.length - 1].date : '',
      });
    } catch {}
  }

  const upsertStmt = db.prepare(`
    INSERT INTO dividend_history (symbol, events_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(symbol) DO UPDATE SET
      events_json = excluded.events_json,
      updated_at = excluded.updated_at
  `);

  const CONCURRENCY = 12;
  let currentIndex = 0;
  let processed = 0;
  let updatedCount = 0;
  let newEventsCount = 0;
  const new2026Stocks = [];
  const allUpsertRecords = [];

  const nowIso = new Date().toISOString();
  const startTime = Date.now();

  async function worker() {
    while (currentIndex < tickers.length) {
      const idx = currentIndex++;
      const sym = tickers[idx];

      const res = await fetchDividend(sym);
      processed++;

      if (res && Array.isArray(res.events)) {
        const events = res.events;
        const newCount = events.length;
        const newLatestDate = newCount > 0 ? events[newCount - 1].date : '';
        const old = oldDataMap.get(sym);

        let hasChange = false;
        if (!old) {
          hasChange = true;
        } else if (newCount !== old.count || newLatestDate !== old.latestDate) {
          hasChange = true;
        }

        // Kiểm tra xem có sự kiện năm 2026 không
        const events2026 = events.filter((e) => e.date && e.date.startsWith('2026'));
        if (events2026.length > 0) {
          new2026Stocks.push({
            symbol: sym,
            eventsCount2026: events2026.length,
            latestDate: newLatestDate,
            events2026,
            hasChangedSinceSep: hasChange,
          });
        }

        if (hasChange) {
          updatedCount++;
          if (old && newCount > old.count) {
            newEventsCount += (newCount - old.count);
          }
        }

        // Lưu vào SQLite
        upsertStmt.run(sym, JSON.stringify(events), nowIso);

        // Lưu file JSON
        fs.writeFileSync(path.join(DIV_DIR, `${sym}.json`), JSON.stringify(res, null, 2), 'utf-8');

        // Đưa vào danh sách đẩy Supabase
        allUpsertRecords.push({
          symbol: sym,
          events_json: events,
          updated_at: nowIso,
        });
      }

      if (processed % 100 === 0 || processed === tickers.length) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const pct = ((processed / tickers.length) * 100).toFixed(1);
        process.stdout.write(`\r⏳ Tiến độ: [${processed}/${tickers.length}] (${pct}%) - Đã phát hiện ${updatedCount} mã có cập nhật... (${elapsed}s)`);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const crawlDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n✅ Hoàn tất quét & cập nhật SQLite + JSON trong ${crawlDuration} giây!`);
  console.log(`📊 Kết quả:`);
  console.log(`   - Tổng số mã đã kiểm tra: ${processed}`);
  console.log(`   - Số mã có dữ liệu cổ tức mới / thay đổi: ${updatedCount}`);
  console.log(`   - Số mã có sự kiện cổ tức trong năm 2026: ${new2026Stocks.length}`);

  // Đẩy lên Supabase Cloud Database để đồng bộ cho toàn bộ hệ thống
  console.log('\n===================================================================');
  console.log('☁️ ĐANG ĐỒNG BỘ DỮ LIỆU CỔ TỨC LÊN SUPABASE CLOUD...');
  console.log('===================================================================');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pxtmuwrpuywrkclobfpa.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Jjx3eb2edh-gxHZKYEZIog_UyWNqV9Z';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const BATCH_SIZE = 100;
  let supaSuccess = 0;
  for (let i = 0; i < allUpsertRecords.length; i += BATCH_SIZE) {
    const chunk = allUpsertRecords.slice(i, i + BATCH_SIZE);
    let ok = false;
    let retries = 3;
    while (retries > 0 && !ok) {
      const { error } = await supabase.from('dividend_history').upsert(chunk, { onConflict: 'symbol' });
      if (!error) {
        ok = true;
        supaSuccess += chunk.length;
        process.stdout.write(`\r[>] Đã tải lên Supabase: ${supaSuccess}/${allUpsertRecords.length} mã...`);
      } else {
        retries--;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
  console.log(`\n🎉 Hoàn thành đồng bộ Supabase: ${supaSuccess}/${allUpsertRecords.length} mã thành công!`);

  // In chi tiết mã ITC
  console.log('\n===================================================================');
  console.log('🔍 CHI TIẾT CỔ TỨC MÃ ITC (Kiểm tra theo yêu cầu người dùng):');
  console.log('===================================================================');
  const itcRow = db.prepare('SELECT events_json, updated_at FROM dividend_history WHERE symbol = ?').get('ITC');
  if (itcRow) {
    const itcEvents = JSON.parse(itcRow.events_json);
    console.log(`Mã ITC hiện có ${itcEvents.length} sự kiện cổ tức (Cập nhật lúc: ${itcRow.updated_at})`);
    console.log('Sự kiện gần nhất:');
    console.log(JSON.stringify(itcEvents.slice(-3), null, 2));
  }

  // Danh sách các mã tiêu biểu có cổ tức năm 2026
  console.log('\n===================================================================');
  console.log(`⭐ TOP 20 MÃ CÓ CỔ TỨC NĂM 2026 (Trong tổng số ${new2026Stocks.length} mã):`);
  console.log('===================================================================');
  const sample2026 = new2026Stocks.slice(0, 20);
  for (const s of sample2026) {
    const latest = s.events2026[s.events2026.length - 1];
    const detail = (latest.texts || []).join(' & ');
    console.log(`- Mã ${s.symbol.padEnd(5)} | Ngày GDKHQ: ${latest.date} | ${detail || (latest.cashVnd ? `Tiền ${latest.cashVnd}đ` : `Cổ phiếu ${latest.stockPct}%`)}`);
  }
}

main().catch(console.error);
