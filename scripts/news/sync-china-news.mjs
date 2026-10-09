/**
 * Sync China News (24h Daily Snapshot)
 * Thu thập tin tức trong 24 giờ qua từ các nguồn báo chí uy tín tại Trung Quốc:
 * 36Kr, QbitAI, Jiqizhixin, Caixin, Wallstreetcn, Yicai
 * Dịch thuật & tóm tắt sang tiếng Việt bằng Gemini Flash Lite (tiết kiệm token).
 * Tối ưu hóa: Chỉ chạy 1 lần/ngày để bảo toàn API quota.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const OUTPUT_PATH = path.join(ROOT_DIR, 'data', 'china_news_snapshot.json');

// Đọc API key từ .env.local nếu process.env chưa có
function getApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  try {
    const envPath = path.join(ROOT_DIR, '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/GEMINI_API_KEY=(.*)/);
      if (match) return match[1].trim();
    }
  } catch {}
  return '';
}

// Kiểm tra xem đã cập nhật trong vòng 20 tiếng chưa
function shouldSkipUpdate(force = false) {
  if (force) return false;
  if (!fs.existsSync(OUTPUT_PATH)) return false;
  try {
    const data = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
    if (!data.lastUpdated) return false;
    const diffHours = (Date.now() - new Date(data.lastUpdated).getTime()) / (1000 * 60 * 60);
    // Nếu chưa đủ 20 tiếng thì bỏ qua để tiết kiệm API key
    if (diffHours < 20 && data.items && data.items.length > 0) {
      console.log(`[China News] Đã cập nhật cách đây ${diffHours.toFixed(1)} giờ (chưa đủ 20h). Bỏ qua để tiết kiệm API.`);
      return true;
    }
  } catch {}
  return false;
}

// Nguồn RSS Google News lọc chính xác theo 24h và domain báo chí uy tín
const RSS_QUERIES = [
  {
    category: 'ai_tech',
    url: 'https://news.google.com/rss/search?q=when:24h+(AI+OR+%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD+OR+%E5%A4%A7%E6%A8%A1%E5%9E%8B+OR+%E8%8A%AF%E7%89%87+OR+%E5%8D%8A%E5%AF%BC%E4%BD%93+OR+%E6%9C%BA%E5%99%A8%E4%BA%BA)+(site:36kr.com+OR+site:qbitai.com+OR+site:jiqizhixin.com)&hl=zh-CN&gl=CN&ceid=CN:zh-Hans'
  },
  {
    category: 'economy_market',
    url: 'https://news.google.com/rss/search?q=when:24h+(%E7%BB%8F%E6%B5%8E+OR+%E5%A4%AE%E8%A1%8C+OR+%E8%82%A1%E5%B8%82+OR+%E6%8A%95%E8%9E%8D%E8%B5%84+OR+%E6%8A%95%E8%B5%84+OR+%E5%88%9B%E6%8A%95)+(site:caixin.com+OR+site:wallstreetcn.com+OR+site:yicai.com)&hl=zh-CN&gl=CN&ceid=CN:zh-Hans'
  }
];

// Hàm bóc tách item từ RSS XML
function parseRssItems(xmlText) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemBlock = match[1];
    const titleMatch = itemBlock.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || itemBlock.match(/<title>(.*?)<\/title>/);
    const linkMatch = itemBlock.match(/<link>(.*?)<\/link>/);
    const pubDateMatch = itemBlock.match(/<pubDate>(.*?)<\/pubDate>/);
    const sourceMatch = itemBlock.match(/<source[^>]*>(.*?)<\/source>/);

    let rawTitle = titleMatch ? titleMatch[1].trim() : '';
    let link = linkMatch ? linkMatch[1].trim() : '';
    let pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();
    let source = sourceMatch ? sourceMatch[1].trim() : '';

    // Bóc tách nguồn từ tiêu đề nếu source trống (VD: "Tiêu đề - 36Kr")
    if (!source && rawTitle.includes(' - ')) {
      const parts = rawTitle.split(' - ');
      source = parts.pop();
      rawTitle = parts.join(' - ');
    } else if (rawTitle.includes(' - ')) {
      const parts = rawTitle.split(' - ');
      rawTitle = parts.slice(0, -1).join(' - ');
    }

    if (rawTitle && link) {
      items.push({
        rawTitle,
        link,
        pubDate,
        source: source || 'Báo TQ',
      });
    }
  }
  return items;
}

async function fetchRssFeed(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssItems(xml);
  } catch (err) {
    console.warn('[China News] Lỗi khi tải RSS:', err.message);
    return [];
  }
}

async function translateAndSummarizeWithGemini(articles, apiKey) {
  const ai = new GoogleGenAI({ apiKey });
  const models = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.5-flash'];

  const promptInput = articles.map((a, idx) => ({
    id: idx + 1,
    title: a.rawTitle,
    source: a.source,
    pubDate: a.pubDate,
  }));

  const systemInstruction = `Bạn là chuyên gia phân tích tin tức kinh tế, thị trường, AI và công nghệ hàng đầu về Trung Quốc.
Nhiệm vụ của bạn: Dịch và tổng hợp danh sách các bài báo tiếng Trung trong 24 giờ qua sang tiếng Việt chuẩn văn phong báo chí tài chính - công nghệ.

Đối với MỖI bài báo trong danh sách, hãy cung cấp:
1. "titleVi": Tiêu đề tiếng Việt tự nhiên, súc tích, hấp dẫn, đúng thuật ngữ chuyên môn.
2. "takeaways": Mảng gồm 2 đến 3 gạch đầu dòng ngắn gọn (mỗi câu tối đa 20 từ) tóm tắt điểm quan trọng nhất hoặc ý nghĩa đối với thị trường/công nghệ.
3. "category": Phải thuộc một trong 4 loại chính xác sau:
   - "ai": nếu về Trí tuệ nhân tạo, LLM, Generative AI, Robot, Deep learning
   - "tech": nếu về Bán dẫn, Chip, Phần cứng, Big Tech (Tencent, Alibaba, ByteDance), Xe điện, Viễn thông
   - "economy": nếu về Kinh tế vĩ mô, PBOC, Chính sách tài khóa, Lạm phát, Bất động sản vĩ mô, Thị trường chứng khoán (A-shares, Hang Seng)
   - "investment": nếu về Xu hướng đầu tư, Vốn mạo hiểm (VC), Gọi vốn startup, M&A, Quỹ đầu tư
4. "tags": Mảng từ 2 đến 3 thẻ tag ngắn (ví dụ: ["AI", "OpenAI", "M&A"], ["PBOC", "Lãi suất"], ["Thị trường A-shares"]).

CHỈ TRẢ VỀ DUY NHẤT một chuỗi JSON hợp lệ với định dạng:
[
  {
    "id": 1,
    "titleVi": "...",
    "takeaways": ["...", "..."],
    "category": "ai",
    "tags": ["AI", "Robot"]
  }
]
Không kèm markdown giải thích bên ngoài.`;

  for (const modelName of models) {
    try {
      console.log(`[China News] Đang gửi bài viết sang Gemini (${modelName})...`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          { role: 'user', parts: [{ text: `${systemInstruction}\n\nDanh sách bài báo:\n${JSON.stringify(promptInput, null, 2)}` }] }
        ]
      });

      let responseText = response.text || '';
      // Làm sạch markdown nếu có ```json
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log(`[China News] ✅ Gemini dịch thành công ${parsed.length} bài viết.`);
        return parsed;
      }
    } catch (err) {
      console.warn(`[China News] Model ${modelName} thất bại:`, err.message);
    }
  }

  throw new Error('Tất cả các model Gemini đều không phản hồi kết quả hợp lệ.');
}

export async function syncChinaNews(force = false) {
  console.log(`\n=== [${new Date().toLocaleString('vi-VN')}] BẮT ĐẦU ĐỒNG BỘ TIN TỨC TRUNG QUỐC (24H) ===`);

  if (shouldSkipUpdate(force)) {
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('[China News] ❌ Không tìm thấy GEMINI_API_KEY trong môi trường hoặc .env.local');
    return;
  }

  // 1. Quét tin từ RSS
  console.log('[China News] Đang thu thập RSS Google News Trung Quốc trong 24h...');
  const allRaw = [];
  for (const q of RSS_QUERIES) {
    const items = await fetchRssFeed(q.url);
    console.log(`  - Nhóm ${q.category}: tìm thấy ${items.length} bài`);
    allRaw.push(...items);
  }

  // Lọc trùng theo title & link
  const seen = new Set();
  const uniqueItems = [];
  for (const it of allRaw) {
    const key = it.rawTitle.toLowerCase().trim();
    if (!seen.has(key) && key.length > 5) {
      seen.add(key);
      uniqueItems.push(it);
    }
  }

  // Giới hạn 16-20 bài tin nóng tinh hoa nhất để gọi Gemini trong 1 lượt request duy nhất
  const selectedArticles = uniqueItems.slice(0, 18);
  console.log(`[China News] Đã chọn lọc ${selectedArticles.length} bài nổi bật nhất để dịch & tóm tắt.`);

  if (selectedArticles.length === 0) {
    console.log('[China News] Không có bài viết mới nào.');
    return;
  }

  // 2. Dịch & tóm tắt bằng Gemini
  let translatedList = [];
  try {
    translatedList = await translateAndSummarizeWithGemini(selectedArticles, apiKey);
  } catch (err) {
    console.error('[China News] ❌ Lỗi xử lý Gemini:', err.message);
    return;
  }

  // Ghép kết quả
  const translatedMap = new Map();
  for (const t of translatedList) {
    translatedMap.set(t.id, t);
  }

  const categoryNames = {
    ai: 'Trí tuệ nhân tạo (AI)',
    tech: 'Công nghệ & Bán dẫn',
    economy: 'Kinh tế & Thị trường',
    investment: 'Xu hướng đầu tư & VC',
  };

  const finalItems = selectedArticles.map((raw, idx) => {
    const trans = translatedMap.get(idx + 1) || {};
    const cat = trans.category || 'tech';
    return {
      id: `cn-${Date.now()}-${idx + 1}`,
      titleVi: trans.titleVi || raw.rawTitle,
      titleOriginal: raw.rawTitle,
      takeaways: trans.takeaways || [],
      category: cat,
      categoryName: categoryNames[cat] || 'Công nghệ & Thị trường',
      tags: trans.tags || ['Trung Quốc', 'Tin tức'],
      source: raw.source,
      pubDate: raw.pubDate,
      link: raw.link,
    };
  });

  const snapshot = {
    lastUpdated: new Date().toISOString(),
    dateStr: new Date().toLocaleDateString('vi-VN'),
    total: finalItems.length,
    items: finalItems,
  };

  // 3. Ghi file snapshot
  const dataDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(snapshot, null, 2), 'utf8');
  console.log(`[China News] ✅ ĐÃ LƯU THÀNH CÔNG ${finalItems.length} BÀI VÀO ${OUTPUT_PATH}`);
}

// Nếu chạy trực tiếp từ dòng lệnh: node scripts/news/sync-china-news.mjs [--force]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const isForce = process.argv.includes('--force');
  syncChinaNews(isForce).catch(console.error);
}
