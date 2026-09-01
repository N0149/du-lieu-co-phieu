import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

// Đọc API Key & Folder ID
const envPath = existsSync('.env.local') ? '.env.local' : '.env';
const envContent = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
const apiKey = process.env.GOOGLE_DRIVE_API_KEY || envContent.match(/GOOGLE_DRIVE_API_KEY=([^\r\n]+)/)?.[1]?.trim();
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || envContent.match(/GOOGLE_DRIVE_FOLDER_ID=([^\r\n]+)/)?.[1]?.trim() || '1eI8C_uDJlKDvNbzF9YOOr6QNCUIdw7o8';

if (!apiKey) {
  console.error('❌ Lỗi: Thiếu GOOGLE_DRIVE_API_KEY');
  process.exit(1);
}

console.log(`📁 Thư mục Google Drive: ${folderId}`);
console.log(`🔑 Google Drive API Key: ${apiKey.slice(0, 8)}...`);

const TICKER_STOP_WORDS = new Set([
  'RNAV', 'BCTC', 'CTY', 'KCN', 'BĐS', 'YOY', 'TNDN', 'LNST', 'EPS', 'PE', 'PB', 'Q1', 'Q2', 'Q3', 'Q4', 'NĐT', 'ROE',
]);

const CATEGORY_BY_TICKER = {
  SNZ: 'RNAV',
  BMI: 'Bảo Hiểm',
  SGP: 'Cảng Biển',
  SZL: 'RNAV',
  TTT: 'Định Giá Doanh Nghiệp',
  VNF: 'CTY Liên Kết',
  VNL: 'Logistics',
  DRI: 'RNAV',
  LHG: 'RNAV',
  M10: 'Dệt May',
  RAL: 'Sản Xuất',
  SD9: 'RNAV',
  IDV: 'RNAV',
  DC4: 'Bất Động Sản',
};

const DEFAULT_CATEGORY = 'Phân Tích';

function parseReportName(name) {
  let raw = name.trim();
  if (!raw || raw.includes('...') || raw.length < 3) return null;

  const bracket = raw.match(/^\s*\[([A-Za-z0-9_]{1,16})\]\s*(.+)$/);
  if (bracket) {
    const tag = bracket[1].toUpperCase();
    const title = bracket[2].trim();
    if (tag.startsWith('VIMO')) return { kind: 'macro', ticker: null, title };
    if (tag.startsWith('HANGHOA')) return { kind: 'commodity', ticker: null, title };
    return { kind: 'stock', ticker: tag, title };
  }

  let source = raw;
  if (/^Bản sao của\s+/i.test(source)) {
    source = source.replace(/^Bản sao của\s+/i, '').trim();
  }

  if (/^[A-Za-z0-9]{1,6}$/.test(source)) {
    return { kind: 'stock', ticker: source.toUpperCase(), title: source.toUpperCase() };
  }

  const tokens = source.match(/[A-Z]{2,5}[0-9]{0,3}/g) ?? [];
  let ticker = tokens.find((t) => !TICKER_STOP_WORDS.has(t.toUpperCase()));
  if (!ticker) {
    const single = source.match(/(?:^|[^A-Za-z0-9])([A-Z][0-9]{2,4})(?![A-Za-z0-9])/);
    if (single && !TICKER_STOP_WORDS.has(single[1].toUpperCase())) {
      ticker = single[1];
    }
  }
  if (!ticker) return null;

  return { kind: 'stock', ticker: ticker.toUpperCase(), title: source.trim() };
}

function toReportDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const vn = new Date(d.getTime() + 7 * 60 * 60 * 1000); // GMT+7
  const dd = String(vn.getUTCDate()).padStart(2, '0');
  const mm = String(vn.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = vn.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function stripAnnotations(s) {
  return s
    .replace(/[\u00B9\u00B2\u00B3\u2070-\u2079]/g, '')
    .replace(/\[\d+\]/g, '')
    .replace(/\*/g, '')
    .trim();
}

function parseVnd(raw) {
  const s = raw.trim().replace(/\s+/g, '');
  if (!/^[\d.,]+$/.test(s)) return null;

  const parts = s.split(/[.,]/);
  const last = parts[parts.length - 1] ?? '';

  if (parts.length > 1 && last.length === 3) {
    const n = Number(s.replace(/[.,]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(s.replace(/,/g, '.'));
  return Number.isFinite(n) ? n : null;
}

function resolvePrice(raw) {
  const cleaned = stripAnnotations(raw.trim()).replace(/[.,]$/, '');
  const toThousand = (n) => (n > 1000 ? n / 1000 : n);
  const range = cleaned.match(/([\d.,]+)\s*(?:[-–—]|đến|→)\s*([\d.,]+)/i);
  if (range) {
    const a = parseVnd(range[1]);
    const b = parseVnd(range[2]);
    if (a != null && b != null) {
      return toThousand((a + b) / 2);
    }
  }
  const v = parseVnd(cleaned);
  return v != null ? toThousand(v) : null;
}

const CURRENT_PRICE_PATTERNS = [
  /giá đóng cửa hiện tại(?:\s*\([^)]*\))?\s*:?\s*([\d.,]+\s*(?:[-–—]|đến|→)?\s*[\d.,]*)\s*(?:VND|VNĐ|đồng)?/i,
  /thị giá hiện tại(?:\s*\([^)]*\))?\s*(?:xoay quanh mốc|ở mức|khoảng|quanh mốc)?\s*:?\s*([\d.,]+\s*(?:[-–—]|đến|→)?\s*[\d.,]*)\s*(?:VND|VNĐ|đồng)?/i,
  /giá thị trường\s*(?:hiện tại)?(?:\s*\([^)]*\))?\s*(?:xoay quanh mốc|ở mức|khoảng)?\s*:?\s*([\d.,]+\s*(?:[-–—]|đến|→)?\s*[\d.,]*)\s*(?:VND|VNĐ|đồng)?/i,
  /giá hiện tại(?:\s*\([^)]*\))?\s*:?\s*([\d.,]+\s*(?:[-–—]|đến|→)?\s*[\d.,]*)\s*(?:VND|VNĐ|đồng)?/i,
  /(?:giá\s+(?:đóng\s+cửa(?:\s+hiện\s+tại)?|thị\s+trường|hiện\s+tại|tham\s+chiếu)(?:[^\d\n]{0,35})?)\s*[:=\s\n\t|]+(\d{1,3}(?:\.\d{3})+|\d+(?:[.,]\d+)?)\s*(?:vnđ|đồng|\/(?![0-9])|(?![.,\d])(?!\x2F[0-9])\b)/i,
];

const TARGET_PRICE_PATTERNS = [
  /giá mục tiêu\s*(?:\([^)]*\))?\s*(?:\d+\s*(?:năm|tháng|thang))?\s*:?\s*(?:(?:của\s+)?(?:cổ\s+phiếu\s+[a-zA-Z0-9]+\s+)?(?:được\s+xác\s+định\s+)?ở\s+mức|là)?\s*([\d.,]+)(?![\d.,])(?!\s*(?:tháng|thang|năm))\s*(?:VND|VNĐ|đồng|nghìn)?/i,
  /mức giá mục tiêu\s*(?:\d+\s*(?:năm|tháng|thang))?\s*:?\s*(?:(?:của\s+)?(?:cổ\s+phiếu\s+[a-zA-Z0-9]+\s+)?(?:được\s+xác\s+định\s+)?ở\s+mức|là)?\s*([\d.,]+)(?![\d.,])(?!\s*(?:tháng|thang|năm))\s*(?:VND|VNĐ|đồng|nghìn)?/i,
  /(?:giá\s+mục\s+tiêu(?:\s+cổ\s+phiếu\s+[a-z0-9]+)?(?:\s+(?:được\s+xác\s+định\s+)?ở\s+mức|\s*[:=-]|\s+là))\s*(\d{1,3}(?:\.\d{3})+|\d+(?:[.,]\d+)?)\s*(?:đồng|vnd|\/(?![0-9])|(?![.,\d])(?!\x2F[0-9])\b)/i,
];

const UPSIDE_PATTERNS = [
  /tỷ suất sinh lời kỳ vọng\s*:?\s*[+]?\s*([\d.,]+)\s*%/i,
  /mức sinh lời kỳ vọng\s*(?:\([^)]*\))?\s*:?\s*[+]?\s*([\d.,]+)\s*%/i,
  /upside\s*(?:\([^)]*\))?\s*:?\s*[+]?\s*([\d.,]+)\s*%/i,
  /tiềm năng tăng giá[^0-9]*?([0-9.,]+)\s*%/i,
];

function extractPrice(head, patterns) {
  for (const re of patterns) {
    const m = head.match(re);
    if (!m) continue;
    const raw = m[1];
    const next = head[(m.index ?? 0) + m[0].length] ?? '';
    if (!/[.,]$/.test(raw) && /[xX%]/.test(next)) continue;
    const v = resolvePrice(raw);
    if (v != null && v > 0) return v;
  }
  return null;
}

function extractRecommendation(head) {
  const recMatch = head.match(/khuyến nghị\s*:?\s*(MUA|KHẢ QUAN|NẮM GIỮ|THEO DÕI)/i);
  if (recMatch) return recMatch[1].toUpperCase();
  const anyMatch = head.match(/\b(MUA|KHẢ QUAN|NẮM GIỮ|THEO DÕI)\b/);
  return anyMatch ? anyMatch[1].toUpperCase() : null;
}

function extractUpside(head) {
  for (const re of UPSIDE_PATTERNS) {
    const m = head.match(re);
    if (!m) continue;
    const n = Number(m[1].replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

const BONUS_WELFARE_RATE_RE =
  /(?:tỷ\s*lệ\s*trích\s*)?(?:quỹ\s*)?(?:khen\s*thưởng\s*[,/&]?\s*phúc\s*lợi|ktpl)(?:[^\n%:=]{0,100}?)\s*[:=-]\s*(\d+(?:[.,]\d+)?)\s*%/i;

function extractBonusWelfareRate(text) {
  const cleaned = stripAnnotations(text);
  const m = cleaned.match(BONUS_WELFARE_RATE_RE);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, '.'));
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

function parseValuation(content) {
  const head = stripAnnotations(content.slice(0, 5000));
  const currentPrice = extractPrice(head, CURRENT_PRICE_PATTERNS);
  let targetPrice = extractPrice(head, TARGET_PRICE_PATTERNS);

  if (
    targetPrice != null &&
    currentPrice != null &&
    currentPrice > 0 &&
    targetPrice < currentPrice * 0.3
  ) {
    targetPrice = null;
  }
  const recommendation = extractRecommendation(head);

  let upside = extractUpside(head);
  if (
    upside == null &&
    currentPrice != null &&
    currentPrice > 0 &&
    targetPrice != null &&
    targetPrice > 0
  ) {
    upside = ((targetPrice - currentPrice) / currentPrice) * 100;
  }

  return { targetPrice, currentPrice, recommendation, upside };
}

function extractSummary(content, maxLen = 180) {
  const cleaned = stripAnnotations(content)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
  if (cleaned.length < 30) return null;

  const lines = cleaned
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const body = lines.slice(1).join(' ').trim() || lines[0] || '';
  const sentence = body.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
  const text = (sentence && sentence.length <= maxLen ? sentence : body.slice(0, maxLen))
    .trim()
    .replace(/[.!?]+$/, '');

  return text.length >= 20 ? `${text}…` : null;
}

async function listAllFilesInFolder(folderId) {
  const files = [];
  let pageToken = null;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, createdTime)',
      pageSize: '1000',
      orderBy: 'modifiedTime desc',
      key: apiKey,
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
    if (!res.ok) {
      throw new Error(`Drive list error: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    files.push(...(data.files || []));
    pageToken = data.nextPageToken || null;
  } while (pageToken);

  return files;
}

async function getDocContent(docId) {
  try {
    const params = new URLSearchParams({ mimeType: 'text/plain', key: apiKey });
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${docId}/export?${params}`);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// Xử lý song song có giới hạn concurrency
async function pMap(items, mapper, concurrency = 8) {
  const results = new Array(items.length);
  let index = 0;

  const workers = Array.from({ length: Math.min(items.length, concurrency) }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await mapper(items[current], current);
    }
  });

  await Promise.all(workers);
  return results;
}

async function run() {
  console.log('🔄 Đang kết nối Google Drive lấy danh sách file mới nhất...');
  const files = await listAllFilesInFolder(folderId);
  console.log(`✓ Tìm thấy tổng cộng ${files.length} files trong thư mục.`);

  if (files.length === 0) {
    console.warn('⚠ Không tìm thấy file nào trong thư mục Google Drive.');
    return;
  }

  console.log(`🚀 Đang bóc tách và phân tích song song ${files.length} tài liệu...`);
  
  let doneCount = 0;
  const reports = await pMap(files, async (file) => {
    const parsed = parseReportName(file.name);
    if (!parsed) {
      doneCount++;
      return null;
    }

    const date = toReportDate(file.createdTime);
    const content = await getDocContent(file.id);
    const valuation = parsed.kind === 'stock' && content ? parseValuation(content) : null;
    const summary = parsed.kind !== 'stock' && content ? extractSummary(content) : null;
    const bonusWelfareRate = parsed.kind === 'stock' && content ? extractBonusWelfareRate(content) : null;

    const slugBase = parsed.kind === 'stock' ? parsed.ticker.toLowerCase() : parsed.kind;

    doneCount++;
    if (doneCount % 10 === 0 || doneCount === files.length) {
      process.stdout.write(`  [${doneCount}/${files.length}] Hoàn tất ${parsed.ticker || parsed.kind}...\r`);
    }

    return {
      slug: `${slugBase}-${(date || 'unknown').replace(/\//g, '-')}`,
      ticker: parsed.ticker,
      title: parsed.title,
      category: parsed.kind === 'stock' ? CATEGORY_BY_TICKER[parsed.ticker] || DEFAULT_CATEGORY : parsed.kind,
      date,
      reportDate: date,
      driveDocId: file.id,
      summary,
      targetPrice: valuation?.targetPrice ?? null,
      currentPrice: valuation?.currentPrice ?? null,
      recommendation: valuation?.recommendation ?? null,
      upside: valuation?.upside ?? null,
      bonusWelfareRate,
    };
  }, 10);

  console.log('\n🧹 Đang lọc trùng và chuẩn hóa dữ liệu...');
  const seen = new Set();
  const deduped = [];
  for (const r of reports) {
    if (!r) continue;
    const key = `${r.ticker || r.category}|${r.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
  }

  console.log(`✓ Đã phân tích xong ${deduped.length} báo cáo hợp lệ.`);

  const snapshotPath = path.join(process.cwd(), 'data', 'reports-snapshot.json');
  writeFileSync(snapshotPath, JSON.stringify(deduped, null, 2), 'utf8');
  console.log(`✅ Ghi đè thành công ${deduped.length} báo cáo vào file: ${snapshotPath}`);
}

run().catch((e) => {
  console.error('❌ Lỗi khi đồng bộ:', e);
  process.exit(1);
});
