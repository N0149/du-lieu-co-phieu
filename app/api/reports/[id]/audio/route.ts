import { NextResponse } from "next/server";

// Chạy động — tạo audio mới mỗi request (có cache HTTP để tái sử dụng).
export const dynamic = "force-dynamic";
// An toàn cho Vercel Pro; trên Hobby giới hạn tối đa vẫn là 10s (bản này ~< 4s).
export const maxDuration = 60;

const DRIVE_API_KEY = process.env.GOOGLE_DRIVE_API_KEY ?? "";
const TTS_URL = "https://translate.google.com/translate_tts";
// User-Agent chuẩn trình duyệt để Google TTS không chặn request từ server
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const MAX_CHUNK_LEN = 180; // Google TTS giới hạn ~200 ký tự/request → an toàn dưới 180
const CONCURRENCY = 8; // số request TTS chạy song song (Promise.all theo batch)
// Chỉ đọc 2.500 ký tự đầu (Tóm tắt / Luận điểm / Khuyến nghị & Định giá) để
// audio sinh NHANH (< 4s) và không vượt Vercel Serverless Timeout.
const MAX_AUDIO_CHARS = 2500;

/**
 * Làm sạch văn bản trước khi đọc: bỏ URL/email, dấu gạch ngang dài, phân cách bảng
 * biểu rác (---, ===, ***, ||), ký tự đặc biệt; gộp khoảng trắng & ngắt dòng thừa.
 * GIỮ NGUYÊN dấu tiếng Việt để phát âm chuẩn.
 */
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/www\.\S+/g, " ")
    .replace(/\b[\w.+-]+@[\w.-]+\.\w+\b/g, " ")
    .replace(/[—–]/g, " ") // dấu gạch ngang dài → khoảng trắng
    .replace(/[-=*|]{2,}/g, " ") // phân cách bảng biểu rác: ---, ===, ***, ||
    .replace(/[*_#`~|>]/g, " ") // ký tự markdown/đặc biệt
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Trích phần văn bản dành cho Audio: làm sạch → lấy tối đa MAX_AUDIO_CHARS ký tự
 * đầu → cắt tại biên câu (tránh đọc lưng chừng giữa câu).
 */
function extractAudioText(content: string): string {
  const cleaned = cleanText(content);
  if (cleaned.length <= MAX_AUDIO_CHARS) return cleaned;
  const head = cleaned.slice(0, MAX_AUDIO_CHARS);
  // Lùi về dấu chấm câu gần nhất (nếu có và không quá xa) để kết thúc trọn câu
  const cut = head.lastIndexOf(". ");
  if (cut > MAX_AUDIO_CHARS * 0.6) return head.slice(0, cut + 1);
  return head;
}

/** Tách câu theo dấu kết thúc câu (giữ dấu). */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Tách văn bản thành các đoạn ≤ MAX_CHUNK_LEN (ưu tiên theo câu → phẩy → khoảng
 * trắng) để không vượt giới hạn ký tự của Google TTS; gộp đoạn ngắn liền kề.
 */
function chunkText(text: string, maxLen = MAX_CHUNK_LEN): string[] {
  const chunks: string[] = [];
  const push = (piece: string) => {
    const p = piece.trim();
    if (!p) return;
    if (chunks.length && (chunks[chunks.length - 1] + " " + p).length <= maxLen) {
      chunks[chunks.length - 1] += " " + p;
    } else {
      chunks.push(p);
    }
  };

  for (const sentence of splitSentences(text)) {
    if (sentence.length <= maxLen) {
      push(sentence);
      continue;
    }
    // Câu dài → tách theo phẩy/chấm phẩy
    const byComma = sentence.split(/(?<=[,;:])\s+/).map((s) => s.trim()).filter(Boolean);
    for (const part of byComma) {
      if (part.length <= maxLen) {
        push(part);
        continue;
      }
      // Vẫn dài → tách theo khoảng trắng (từng từ)
      let cur = "";
      for (const word of part.split(/\s+/).filter(Boolean)) {
        if (cur && (cur + " " + word).length > maxLen) {
          push(cur);
          cur = word;
        } else {
          cur = cur ? `${cur} ${word}` : word;
        }
      }
      if (cur) push(cur);
    }
  }
  return chunks;
}

/** Chạy fn trên các item với số lần song song tối đa `limit` (Promise.all theo batch). */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

/** Fetch MP3 1 đoạn qua Google TTS (kèm User-Agent + retry ngắn khi 429/5xx). */
async function fetchChunkAudio(chunk: string): Promise<ArrayBuffer | null> {
  const url = `${TTS_URL}?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(chunk)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": BROWSER_UA, Referer: "https://translate.google.com/" },
        cache: "no-store",
      });
      if (res.ok) return await res.arrayBuffer();
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
        continue;
      }
      console.warn(`[audio] TTS đoạn lỗi HTTP ${res.status} (không retry)`);
      return null;
    } catch (err) {
      console.warn(`[audio] Lỗi fetch TTS (thử ${attempt + 1}):`, err);
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
  return null;
}

/** Ghép các ArrayBuffer thành 1 mảng byte duy nhất (MP3 ghép nhị phân trực tiếp được). */
function concatBuffers(buffers: ArrayBuffer[]): Uint8Array {
  const total = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const buf of buffers) {
    merged.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return merged;
}

// ── Tính duration MP3 (giây) từ frame header (Google TTS MP3 không có Xing/Info) ──
const BITRATE_L3_V1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const BITRATE_L3_V2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
const SAMPLE_RATE_V1 = [44100, 48000, 32000];
const SAMPLE_RATE_V2 = [22050, 24000, 16000];
const SAMPLE_RATE_V25 = [11025, 12000, 8000];

function parseMp3Duration(data: Uint8Array): number {
  let offset = 0;
  // Bỏ ID3v2 tag nếu có
  if (data[0] === 0x49 && data[1] === 0x44 && data[2] === 0x33 && data.length > 10) {
    const size =
      ((data[6] & 0x7f) << 21) |
      ((data[7] & 0x7f) << 14) |
      ((data[8] & 0x7f) << 7) |
      (data[9] & 0x7f);
    offset = 10 + size;
  }

  let totalSamples = 0;
  let sampleRate = 44100;
  let frames = 0;

  while (offset + 4 <= data.length) {
    const b0 = data[offset];
    const b1 = data[offset + 1];
    if (b0 !== 0xff || (b1 & 0xe0) !== 0xe0) {
      offset++;
      continue;
    }
    const versionBits = (b1 >> 3) & 0x3; // 0=V2.5, 1=reserved, 2=V2, 3=V1
    const layerBits = (b1 >> 1) & 0x3; // 1=L3, 2=L2, 3=L1
    if (versionBits === 1 || layerBits === 0) {
      offset++;
      continue;
    }
    const bitrateIdx = (data[offset + 2] >> 4) & 0xf;
    const sampleIdx = (data[offset + 2] >> 2) & 0x3;
    const padding = (data[offset + 2] >> 1) & 0x1;
    if (bitrateIdx === 0 || bitrateIdx === 15 || sampleIdx === 3) {
      offset++;
      continue;
    }

    const isV1 = versionBits === 3;
    const bitrate = isV1 ? BITRATE_L3_V1[bitrateIdx] : BITRATE_L3_V2[bitrateIdx];
    const sr = isV1
      ? SAMPLE_RATE_V1[sampleIdx]
      : versionBits === 2
        ? SAMPLE_RATE_V2[sampleIdx]
        : SAMPLE_RATE_V25[sampleIdx];
    const spf = isV1 ? 1152 : 576; // samples/frame Layer 3
    if (bitrate === 0 || sr === 0) {
      offset++;
      continue;
    }

    let frameLen: number;
    if (layerBits === 3) {
      frameLen = (Math.floor((12 * bitrate * 1000) / sr) + padding) * 4;
    } else if (isV1) {
      frameLen = Math.floor((144 * bitrate * 1000) / sr) + padding;
    } else {
      frameLen = Math.floor((72 * bitrate * 1000) / sr) + padding;
    }
    if (frameLen < 24 || offset + frameLen > data.length) {
      offset++;
      continue;
    }

    totalSamples += spf;
    sampleRate = sr;
    frames++;
    offset += frameLen;
  }

  return frames > 0 ? totalSamples / sampleRate : 0;
}

/**
 * GET /api/reports/[id]/audio
 * Server-side Google Translate TTS (TỐI ƯU < 4s): export Google Doc text/plain →
 * trích 2.500 ký tự đầu (Tóm tắt/Luận điểm/Khuyến nghị & Định giá) → làm sạch →
 * tách câu → fetch MP3 song song (batch 8) → ghép → trả audio/mpeg.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Thiếu ID tài liệu." }, { status: 400 });
  }
  if (!DRIVE_API_KEY) {
    console.warn("[audio] GOOGLE_DRIVE_API_KEY trống — không đọc được nội dung tài liệu.");
    return NextResponse.json(
      { error: "Chưa cấu hình GOOGLE_DRIVE_API_KEY trên server." },
      { status: 500 },
    );
  }

  // 1) Lấy nội dung text từ Google Docs
  let content: string;
  try {
    const query = new URLSearchParams({ mimeType: "text/plain", key: DRIVE_API_KEY });
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}/export?${query.toString()}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      console.warn(`[audio] Không đọc được doc ${id}: HTTP ${res.status}`);
      return NextResponse.json(
        { error: `Không đọc được nội dung tài liệu (HTTP ${res.status}).` },
        { status: res.status },
      );
    }
    content = await res.text();
  } catch (err) {
    console.warn(`[audio] Lỗi export doc ${id}:`, err);
    return NextResponse.json({ error: "Lỗi khi đọc nội dung tài liệu." }, { status: 500 });
  }

  // 2) Trích phần Audio (2.500 ký tự đầu, làm sạch) + tách câu
  const chunks = chunkText(extractAudioText(content));
  if (chunks.length === 0) {
    return NextResponse.json({ error: "Không có nội dung văn bản để đọc." }, { status: 422 });
  }

  // 3) Fetch MP3 từng đoạn SONG SONG (batch) rồi ghép
  const startedAt = Date.now();
  const buffers = await mapLimit(chunks, CONCURRENCY, (chunk) => fetchChunkAudio(chunk));
  const okBuffers = buffers.filter((b): b is ArrayBuffer => b !== null);
  if (okBuffers.length === 0) {
    return NextResponse.json(
      { error: "Không thể tạo audio từ nội dung (Google TTS bị giới hạn)." },
      { status: 502 },
    );
  }
  if (okBuffers.length < chunks.length) {
    console.warn(`[audio] ${chunks.length - okBuffers.length}/${chunks.length} đoạn bị bỏ qua.`);
  }

  const merged = concatBuffers(okBuffers);
  const durationSec = parseMp3Duration(merged);
  console.info(
    `[audio] OK: ${chunks.length} đoạn → ${(merged.byteLength / 1024).toFixed(0)} KB, ` +
      `${durationSec.toFixed(0)}s, trong ${Date.now() - startedAt}ms`,
  );

  // 4) Trả MP3 (cache dài để tái sử dụng) + duration (MP3 ghép thiếu header duration)
  return new Response(merged.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
      "X-Audio-Chunks": String(okBuffers.length),
      "X-Duration-Seconds": durationSec.toFixed(0),
    },
  });
}
