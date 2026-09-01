import { NextResponse } from "next/server";
import reportsSnapshot from "../../../data/reports-snapshot.json";

// CƠ CHẾ DỮ LIỆU: STATIC SNAPSHOT (mặc định).
// - Route phục vụ file data/reports-snapshot.json (đã lưu sẵn toàn bộ báo cáo đã parse) →
//   website hoạt động ổn định tuyệt đối, KHÔNG phụ thuộc Google Drive API lúc chạy.
// - Muốn cập nhật dữ liệu: chạy `node scripts/refresh-snapshot.mjs` (lấy mới từ Drive qua
//   local, dùng ?live=1) rồi commit file snapshot mới.
// - Muốn quay lại chế độ LIVE (gọi Drive API mỗi request): set env REPORTS_SOURCE=live
//   hoặc gọi /api/reports?live=1.
// Giữ force-dynamic để hỗ trợ cả 2 chế độ an toàn (không bị static-cache lúc build).
export const dynamic = "force-dynamic";

const DRIVE_API_KEY = process.env.GOOGLE_DRIVE_API_KEY ?? "";
const DRIVE_FOLDER_ID =
  process.env.GOOGLE_DRIVE_FOLDER_ID ?? "1eI8C_uDJlKDvNbzF9YOOr6QNCUIdw7o8";

const PAGE_SIZE = 1000; // tối đa Drive API cho phép — giảm số lần gọi
const DEFAULT_CATEGORY = "Phân Tích";

// Phân loại theo mã CK; mã mới chưa có trong map sẽ dùng DEFAULT_CATEGORY
const CATEGORY_BY_TICKER: Record<string, string> = {
  SNZ: "RNAV",
  BMI: "Bảo Hiểm",
  SGP: "Cảng Biển",
  SZL: "RNAV",
  TTT: "Định Giá Doanh Nghiệp",
  VNF: "CTY Liên Kết",
  VNL: "Logistics",
  DRI: "RNAV",
  LHG: "RNAV",
  M10: "Dệt May",
  RAL: "Sản Xuất",
  SD9: "RNAV",
  IDV: "RNAV",
  DC4: "Bất Động Sản",
};

type DriveFile = {
  id: string;
  name: string;
  mimeType?: string;
  modifiedTime?: string;
  createdTime?: string; // thời gian TẠO file (ngày báo cáo chính thức)
};

// Các từ khóa tài chính thường xuất hiện trong tên nhưng KHÔNG phải mã CK
const TICKER_STOP_WORDS = new Set([
  "RNAV",
  "BCTC",
  "CTY",
  "KCN",
  "BĐS",
  "YOY",
  "TNDN",
  "LNST",
  "EPS",
  "PE",
  "PB",
  "Q1",
  "Q2",
  "Q3",
  "Q4",
  "NĐT",
  "ROE",
]);

// Phân loại báo cáo: cổ phiếu (stock) / Kinh tế Vĩ mô (macro) / Hàng hóa & Ngành (commodity)
type ParsedReport =
  | { kind: "stock"; ticker: string; title: string }
  | { kind: "macro"; ticker: null; title: string }
  | { kind: "commodity"; ticker: null; title: string };

// Parse tên file báo cáo, ưu tiên định dạng "[MÃ_CK] Tiêu đề bài viết".
// Tiền tố đặc biệt: "[VIMO_...]" → Kinh tế Vĩ mô, "[HANGHOA_...]" → Hàng hóa & Ngành.
// Với các tên không có ngoặc vuông (vd "Định Giá Cổ Phiếu VNF"), tự nhận diện
// mã CK bằng cách tìm token in hoa đầu tiên không thuộc stop-words.
// Trả về null với file rác/tạm (đang soạn "...", không xác định được mã).
function parseReportName(name: string): ParsedReport | null {
  let raw = name.trim();
  // Loại file tạm/đang soạn hoặc tên quá ngắn
  if (!raw || raw.includes("...") || raw.length < 3) return null;

  // Định dạng chuẩn: "[MÃ_CK] Tiêu đề bài viết" (hỗ trợ tiền tố VIMO_/HANGHOA_)
  const bracket = raw.match(/^\s*\[([A-Za-z0-9_]{1,16})\]\s*(.+)$/);
  if (bracket) {
    const tag = bracket[1].toUpperCase();
    const title = bracket[2].trim();
    if (tag.startsWith("VIMO")) return { kind: "macro", ticker: null, title };
    if (tag.startsWith("HANGHOA")) return { kind: "commodity", ticker: null, title };
    return { kind: "stock", ticker: tag, title };
  }

  // Bỏ prefix "Bản sao của " để tránh lẫn vào title
  let source = raw;
  if (/^Bản sao của\s+/i.test(source)) {
    source = source.replace(/^Bản sao của\s+/i, "").trim();
  }

  // Tên chỉ là mã CK (vd: "ABT")
  if (/^[A-Za-z0-9]{1,6}$/.test(source)) {
    return { kind: "stock", ticker: source.toUpperCase(), title: source.toUpperCase() };
  }

  // Heuristic: tìm token mã CK đầu tiên (2-5 chữ in hoa, có thể kèm số).
  // Nếu không có, thử pattern mã 1 chữ + số (vd "S55", "M10").
  const tokens = source.match(/[A-Z]{2,5}[0-9]{0,3}/g) ?? [];
  let ticker = tokens.find((t) => !TICKER_STOP_WORDS.has(t.toUpperCase()));
  if (!ticker) {
    const single = source.match(/(?:^|[^A-Za-z0-9])([A-Z][0-9]{2,4})(?![A-Za-z0-9])/);
    if (single && !TICKER_STOP_WORDS.has(single[1].toUpperCase())) {
      ticker = single[1];
    }
  }
  if (!ticker) return null;

  return { kind: "stock", ticker: ticker.toUpperCase(), title: source.trim() };
}

// Ngày báo cáo = thời gian TẠO file (createdTime, RFC3339 UTC), chuyển sang "DD/MM/YYYY"
// theo múi giờ Việt Nam (GMT+7). KHÔNG dùng modifiedTime, KHÔNG quét regex trong nội dung.
function toReportDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const vn = new Date(d.getTime() + 7 * 60 * 60 * 1000); // GMT+7
  const dd = String(vn.getUTCDate()).padStart(2, "0");
  const mm = String(vn.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = vn.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ==========================================
// BÓC TÁCH ĐỊNH GIÁ TỪ NỘI DUNG BÁO CÁO (mẫu chuẩn: bài UIC)
// ==========================================

type ReportValuation = {
  targetPrice: number | null; // nghìn đồng/cổ phiếu
  currentPrice: number | null; // nghìn đồng/cổ phiếu
  recommendation: string | null; // MUA | KHẢ QUAN | NẮM GIỮ | THEO DÕI
  upside: number | null; // %
};

// Đọc nội dung text của Google Doc (export text/plain) — trả null nếu không truy cập được
async function getDocContent(docId: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ mimeType: "text/plain", key: DRIVE_API_KEY });
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${docId}/export?${params.toString()}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      // Log để chẩn đoán trên Vercel Function Logs (vd doc không public / hết hạn share)
      console.warn(
        `[reports] Không đọc được nội dung doc ${docId}: HTTP ${res.status} ${res.statusText}`,
      );
      return null;
    }
    return await res.text();
  } catch (err) {
    console.warn(`[reports] Lỗi fetch nội dung doc ${docId}:`, err);
    return null;
  }
}

// Lọc sạch ký tự chú thích/số mũ trước khi parse: ¹²³ [1] * ...
function stripAnnotations(s: string): string {
  return s
    .replace(/[\u00B9\u00B2\u00B3\u2070-\u2079]/g, "") // superscript ¹²³⁴...
    .replace(/\[\d+\]/g, "") // chú thích [1], [2]...
    .replace(/\*/g, "") // dấu sao
    .trim();
}

// Chuẩn hóa số theo văn phong VN: hỗ trợ dấu chấm/phẩy làm phân cách nghìn HOẶC dấu
// thập phân. "55.000" / "55,000" → 55000; "82.5" / "82,5" → 82.5
function parseVnd(raw: string): number | null {
  const s = raw.trim().replace(/\s+/g, "");
  if (!/^[\d.,]+$/.test(s)) return null;

  const parts = s.split(/[.,]/);
  const last = parts[parts.length - 1] ?? "";

  // Sau dấu phân cách cuối có ĐÚNG 3 chữ số → phân cách nghìn (bỏ hết dấu)
  if (parts.length > 1 && last.length === 3) {
    const n = Number(s.replace(/[.,]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  // Ngược lại → dấu thập phân (chuẩn hóa dấu phẩy thành chấm)
  const n = Number(s.replace(/,/g, "."));
  return Number.isFinite(n) ? n : null;
}

// Xử lý giá dạng khoảng "34.100 - 34.500" / "34.1 – 34.5" hoặc giá đơn "34.100".
// Trả giá theo nghìn đồng: số > 1000 được coi là VND (chia 1000), số ≤ 1000 đã là nghìn.
// Với khoảng thì lấy giá trị trung bình.
function resolvePrice(raw: string): number | null {
  // Loại dấu chấm/phẩy cuối chuỗi nếu là dấu câu (vd "34.5." / "34.5,")
  const cleaned = stripAnnotations(raw.trim()).replace(/[.,]$/, "");
  const toThousand = (n: number): number => (n > 1000 ? n / 1000 : n);
  const range = cleaned.match(/([\d.,]+)\s*(?:[-–—]|đến|→)\s*([\d.,]+)/i);
  if (range) {
    const a = parseVnd(range[1]);
    const b = parseVnd(range[2]);
    if (a != null && b != null) {
      return toThousand((a + b) / 2); // trung bình → nghìn đồng
    }
  }
  const v = parseVnd(cleaned);
  return v != null ? toThousand(v) : null;
}

// Pattern bóc GIÁ HIỆN TẠI (thứ tự ưu tiên) — hỗ trợ khoảng giá, linh hoạt viết hoa/thường.
// Pattern #5 (cuối): mẫu linh hoạt "giá đóng cửa / thị trường / hiện tại / tham chiếu ... X"
// cho cả BẢNG lẫn VĂN XUÔI, vượt được cụm "(VNĐ/cp)" + xuống dòng (vd LAF:
// "Giá đóng cửa hiện tại (VNĐ/cp)\r\n\t19.350" → 19.35). Đặt CUỐI để không cướp mất
// xử lý khoảng giá của các pattern trên. Thêm `(?![\d.,])\b` chống bắt nhầm tỷ lệ "1.0x".
const CURRENT_PRICE_PATTERNS = [
  /giá đóng cửa hiện tại(?:\s*\([^)]*\))?\s*:?\s*([\d.,]+\s*(?:[-–—]|đến|→)?\s*[\d.,]*)\s*(?:VND|VNĐ|đồng)?/i,
  /thị giá hiện tại(?:\s*\([^)]*\))?\s*(?:xoay quanh mốc|ở mức|khoảng|quanh mốc)?\s*:?\s*([\d.,]+\s*(?:[-–—]|đến|→)?\s*[\d.,]*)\s*(?:VND|VNĐ|đồng)?/i,
  /giá thị trường\s*(?:hiện tại)?(?:\s*\([^)]*\))?\s*(?:xoay quanh mốc|ở mức|khoảng)?\s*:?\s*([\d.,]+\s*(?:[-–—]|đến|→)?\s*[\d.,]*)\s*(?:VND|VNĐ|đồng)?/i,
  /giá hiện tại(?:\s*\([^)]*\))?\s*:?\s*([\d.,]+\s*(?:[-–—]|đến|→)?\s*[\d.,]*)\s*(?:VND|VNĐ|đồng)?/i,
  /(?:giá\s+(?:đóng\s+cửa(?:\s+hiện\s+tại)?|thị\s+trường|hiện\s+tại|tham\s+chiếu)(?:[^\d\n]{0,35})?)\s*[:=\s\n\t|]+(\d{1,3}(?:\.\d{3})+|\d+(?:[.,]\d+)?)\s*(?:vnđ|đồng|\/(?![0-9])|(?![.,\d])(?!\x2F[0-9])\b)/i,
];

// Pattern bóc GIÁ MỤC TIÊU — hỗ trợ nhãn "(Target Price)" và cụm thời hạn
// "1 NĂM" / "12 THÁNG" / "12 thang" (vd "GIÁ MỤC TIÊU 1 NĂM: 38.500 VNĐ" → 38.5).
// QUAN TRỌNG: phải nuốt số thời hạn trước dấu hai chấm, nếu không regex bắt nhầm "1"
// (của "1 NĂM") làm giá mục tiêu.
// Pattern #3 (văn xuôi): "giá mục tiêu cổ phiếu NNC ở mức 51.400 đồng/cổ phiếu1" → 51.4.
// LƯU Ý: thêm `(?![\d.,])\b` ở đuôi để chống backtrack cắt "1.0x" → "1" (bắt nhầm tỷ lệ P/B).
const TARGET_PRICE_PATTERNS = [
  // "giá mục tiêu ..." — thời hạn "1 NĂM"/"12 THÁNG", connector mở rộng "của cổ phiếu X
  // được xác định ở mức/ở mức/là". Guard `(?![\d.,])(?!\s*(?:tháng|thang|năm))` chặn
  // backtrack bắt nhầm số "12" của "12 THÁNG" (lỗi LAF: target=12 thay vì 21.0).
  /giá mục tiêu\s*(?:\([^)]*\))?\s*(?:\d+\s*(?:năm|tháng|thang))?\s*:?\s*(?:(?:của\s+)?(?:cổ\s+phiếu\s+[a-zA-Z0-9]+\s+)?(?:được\s+xác\s+định\s+)?ở\s+mức|là)?\s*([\d.,]+)(?![\d.,])(?!\s*(?:tháng|thang|năm))\s*(?:VND|VNĐ|đồng|nghìn)?/i,
  /mức giá mục tiêu\s*(?:\d+\s*(?:năm|tháng|thang))?\s*:?\s*(?:(?:của\s+)?(?:cổ\s+phiếu\s+[a-zA-Z0-9]+\s+)?(?:được\s+xác\s+định\s+)?ở\s+mức|là)?\s*([\d.,]+)(?![\d.,])(?!\s*(?:tháng|thang|năm))\s*(?:VND|VNĐ|đồng|nghìn)?/i,
  // Pattern văn xuôi NNC (giữ nguyên): "giá mục tiêu cổ phiếu NNC ở mức 51.400 đồng" → 51.4
  /(?:giá\s+mục\s+tiêu(?:\s+cổ\s+phiếu\s+[a-z0-9]+)?(?:\s+(?:được\s+xác\s+định\s+)?ở\s+mức|\s*[:=-]|\s+là))\s*(\d{1,3}(?:\.\d{3})+|\d+(?:[.,]\d+)?)\s*(?:đồng|vnd|\/(?![0-9])|(?![.,\d])(?!\x2F[0-9])\b)/i,
];

// Pattern bóc MỨC SINH LỜI KỲ VỌNG (Upside) — hỗ trợ nhãn "(Upside)" tùy chọn,
// dấu +/- và dấu phẩy thập phân
const UPSIDE_PATTERNS = [
  /tỷ suất sinh lời kỳ vọng\s*:?\s*[+]?\s*([\d.,]+)\s*%/i,
  /mức sinh lời kỳ vọng\s*(?:\([^)]*\))?\s*:?\s*[+]?\s*([\d.,]+)\s*%/i,
  /upside\s*(?:\([^)]*\))?\s*:?\s*[+]?\s*([\d.,]+)\s*%/i,
  /tiềm năng tăng giá[^0-9]*?([0-9.,]+)\s*%/i,
];

// Thử tuần tự các pattern giá, trả về giá đã quy đổi sang nghìn đồng/cổ phiếu.
// CHỐNG BẮT NHẦM TỶ LỆ: nếu ký tự ngay sau số (trong văn bản gốc) là "x" hoặc "%"
// (vd "P/B 1.0x", "P/E 10x", "10%") thì đó là chỉ số/định giá, không phải giá cổ phiếu
// → bỏ qua. Chỉ loại khi số bắt được KHÔNG kết thúc bằng dấu ngăn cách câu (",", ".")
// (vd "38.5, xấp xỉ 40" — dấu phẩy là ngăn cách câu, giá vẫn hợp lệ).
function extractPrice(head: string, patterns: RegExp[]): number | null {
  for (const re of patterns) {
    const m = head.match(re);
    if (!m) continue;
    const raw = m[1];
    const next = head[(m.index ?? 0) + m[0].length] ?? "";
    if (!/[.,]$/.test(raw) && /[xX%]/.test(next)) continue;
    const v = resolvePrice(raw);
    if (v != null && v > 0) return v;
  }
  return null;
}

// Bóc khuyến nghị: ưu tiên sau "khuyến nghị", fallback từ khóa in hoa đứng độc lập
function extractRecommendation(head: string): string | null {
  const recMatch = head.match(/khuyến nghị\s*:?\s*(MUA|KHẢ QUAN|NẮM GIỮ|THEO DÕI)/i);
  if (recMatch) return recMatch[1].toUpperCase();
  // "MUA (Chiến lược Trend Trade)" → MUA
  const anyMatch = head.match(/\b(MUA|KHẢ QUAN|NẮM GIỮ|THEO DÕI)\b/);
  return anyMatch ? anyMatch[1].toUpperCase() : null;
}

// Bóc upside trực tiếp từ bảng tóm tắt (nếu có), trả % (số dương)
function extractUpside(head: string): number | null {
  for (const re of UPSIDE_PATTERNS) {
    const m = head.match(re);
    if (!m) continue;
    const n = Number(m[1].replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

// ==========================================
// BÓC "TỶ LỆ TRÍCH QUỸ KHEN THƯỞNG PHÚC LỢI" (KTPL)
// ==========================================

// Quy chuẩn linh hoạt cho KTPL:
// Bắt được cả dạng bảng tóm tắt lẫn văn xuôi có định ngữ (/LNST, năm, hợp nhất...):
//   "Tỷ lệ trích Quỹ Khen thưởng phúc lợi/LNST năm 2025: 0,37%"
//   "Tỷ lệ trích Quỹ khen thưởng, phúc lợi/LNST: 17,62%"
//   "Tỷ lệ trích Quỹ Khen thưởng phúc lợi/Lợi nhuận sau thuế: 11,75%"
//   "KTPL: 10%" · "KTPL = 4,93%" · "Khen thưởng phúc lợi: 5%" · "Quỹ KTPL - 7.5%"
const BONUS_WELFARE_RATE_RE =
  /(?:tỷ\s*lệ\s*trích\s*)?(?:quỹ\s*)?(?:khen\s*thưởng\s*[,/&]?\s*phúc\s*lợi|ktpl)(?:[^\n%:=]{0,100}?)\s*[:=-]\s*(\d+(?:[.,]\d+)?)\s*%/i;

// Bóc tỷ lệ trích quỹ khen thưởng phúc lợi (KTPL) — trả % (số từ 0 đến 100) hoặc null.
// Hỗ trợ số nguyên & thập phân chuẩn VN hoặc quốc tế: 0% / 0,37% / 5% / 10% / 7,5% / 17,62%
function extractBonusWelfareRate(text: string): number | null {
  const cleaned = stripAnnotations(text);
  const m = cleaned.match(BONUS_WELFARE_RATE_RE);
  if (!m) return null;
  // "0,37" → 0.37; "7,5" → 7.5; "10" → 10 (dấu phẩy VN là dấu thập phân)
  const n = Number(m[1].replace(/,/g, "."));
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

// Bóc tách toàn bộ trường định giá từ nội dung báo cáo (mẫu chuẩn UIC)
function parseValuation(content: string): ReportValuation {
  // Lọc chú thích + chỉ parse phần tóm tắt đầu bài (tránh nhiễu số liệu ở phần thân)
  const head = stripAnnotations(content.slice(0, 5000));

  const currentPrice = extractPrice(head, CURRENT_PRICE_PATTERNS);
  let targetPrice = extractPrice(head, TARGET_PRICE_PATTERNS);

  // Backstop chống bắt nhầm chỉ số (P/B 1.0x, P/E...) làm giá mục tiêu: giá mục tiêu
  // thấp bất thường (< 30% giá hiện tại) là bất hợp lý với các khuyến nghị hệ thống
  // nhận diện (MUA/KHẢ QUAN/NẮM GIỮ/THEO DÕI) → coi như nhiễu, loại bỏ.
  if (
    targetPrice != null &&
    currentPrice != null &&
    currentPrice > 0 &&
    targetPrice < currentPrice * 0.3
  ) {
    targetPrice = null;
  }
  const recommendation = extractRecommendation(head);

  // Ưu tiên upside bóc trực tiếp từ bảng; fallback tự tính từ 2 giá
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

// Trích TÓM TẮT ngắn từ đầu nội dung bài (dùng cho card báo cáo vĩ mô/hàng hóa).
// Bỏ chú thích/ký tự thừa, lấy trọn câu đầu tiên (hoặc ~180 ký tự) có nghĩa.
function extractSummary(content: string, maxLen = 180): string | null {
  const cleaned = stripAnnotations(content)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
  if (cleaned.length < 30) return null;

  // Dòng đầu thường trùng tiêu đề bài → bắt đầu từ dòng thứ 2 có nội dung
  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const body = lines.slice(1).join(" ").trim() || lines[0] || "";
  const sentence = body.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
  const text = (sentence && sentence.length <= maxLen ? sentence : body.slice(0, maxLen))
    .trim()
    .replace(/[.!?]+$/, "");

  return text.length >= 20 ? `${text}…` : null;
}

// Quét TRIỆT ĐỂ toàn bộ file trong folder bằng vòng lặp pageToken (nextPageToken),
// không bị chặn bởi pageSize mặc định của Drive API
async function listAllFilesInFolder(folderId: string): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | null = null;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, modifiedTime, createdTime)",
      pageSize: String(PAGE_SIZE),
      orderBy: "modifiedTime desc",
      key: DRIVE_API_KEY,
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
      { cache: "no-store" },
    );

    if (!res.ok) {
      // Log ĐẦY ĐỦ URL đã gọi (che API key) + toàn bộ chuỗi JSON lỗi từ Drive (không cắt)
      // để tra cứu chính xác trên Vercel Runtime Logs. Lỗi 400 thường do folder ID sai
      // chính tả trong tham số q; 403 do API key bị giới hạn referrer/IP; 404 do folder
      // không public.
      const fullUrl = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
      const errorBody = await res.text();
      console.error(
        `[reports] Drive API thất bại — HTTP ${res.status} ${res.statusText}\n` +
          `URL: ${fullUrl.replace(/key=[^&]+/, "key=***")}\n` +
          `Response: ${errorBody}`,
      );
      throw new Error(
        `Google Drive API error ${res.status} ${res.statusText}: ${errorBody.slice(0, 500)}`,
      );
    }

    const data = (await res.json()) as {
      files?: DriveFile[];
      nextPageToken?: string;
    };
    files.push(...(data.files ?? []));
    pageToken = data.nextPageToken ?? null;
  } while (pageToken);

  return files;
}

// Danh sách tĩnh fallback — dùng khi chưa cấu hình API key hoặc Drive gặp lỗi,
// đảm bảo giao diện /bao-cao không bao giờ bị trắng
const STATIC_REPORTS = [
  {
    slug: "snz-q2-2026",
    ticker: "SNZ",
    title: "Đánh Giá Tài Sản SNZ Tính RNAV",
    category: "RNAV",
    date: "2026-08-08",
    driveDocId: "1t_KeRA3vDInpaXUjLDZENM8taoiMJFYT5DvwE0evaV8",
  },
  {
    slug: "bmi-q2-2026",
    ticker: "BMI",
    title: "Định Giá Cổ Phiếu BMI",
    category: "Bảo Hiểm",
    date: "2026-07-31",
    driveDocId: "1yjHgV9ubhIOZbkkfZGlLLCcqRXzc15-5Gxsvl-SCD8E",
  },
  {
    slug: "sgp-q2-2026",
    ticker: "SGP",
    title: "Định Giá Cổ Phiếu SGP - Cảng Sài Gòn",
    category: "Cảng Biển",
    date: "2026-07-14",
    driveDocId: "1k4IGwsmxdt7BUNYceBfUuZ27r_eeKjczPw11T0kT3QM",
  },
  {
    slug: "szl-q2-2026",
    ticker: "SZL",
    title: "Định Giá Cổ Phiếu SZL Bằng RNAV",
    category: "RNAV",
    date: "2026-04-12",
    driveDocId: "1gElWhAi1znQTnhKOS-v_MEK6nOoaVyNml8v-33UARTA",
  },
  {
    slug: "ttt-q2-2026",
    ticker: "TTT",
    title: "Định Giá Cổ Phiếu TTT",
    category: "Định Giá Doanh Nghiệp",
    date: "2026-07-13",
    driveDocId: "1YwOp6RG6Yxk9jnpwWmLtpld_EWnYapUfYMKeTZ0EbKE",
  },
  {
    slug: "vnf-q2-2026",
    ticker: "VNF",
    title: "Định Giá Cổ Phiếu VNF - Vinafreight",
    category: "CTY Liên Kết",
    date: "2026-08-01",
    driveDocId: "1jSk0lAOqaMh9Z4ThFcqRNlDCAwWX9cnlcoJs0y3PVGs",
  },
  {
    slug: "vnl-q2-2026",
    ticker: "VNL",
    title: "Định Giá Cổ Phiếu VNL - Logistics",
    category: "Logistics",
    date: "2026-08-01",
    driveDocId: "19iuzCYO1KwtH3tpU2iefRtMFetgjonD9V-vJ9o2J3gw",
  },
  {
    slug: "dri-q2-2026",
    ticker: "DRI",
    title: "Định Giá DRI Theo RNAV Chi Tiết",
    category: "RNAV",
    date: "2026-04-23",
    driveDocId: "1VqDyBRY33phdQCchleO9KZmZ_krgWezrhFz6lmHOekg",
  },
  {
    slug: "lhg-q2-2026",
    ticker: "LHG",
    title: "Định Giá LHG Theo Phương Pháp RNAV",
    category: "RNAV",
    date: "2026-05-22",
    driveDocId: "1LTbiMCRZHNPS31XZTN2BPpRgywc51bEbnRVuAlIgMQ8",
  },
  {
    slug: "m10-q2-2026",
    ticker: "M10",
    title: "Định Giá M10 Và Tiềm Năng Tăng Trưởng",
    category: "Dệt May",
    date: "2026-04-29",
    driveDocId: "1iwA-9XQossagjnpk1chEIZaM6bkXiY_EeND27wIY430",
  },
  {
    slug: "ral-q2-2026",
    ticker: "RAL",
    title: "Định Giá RAL Và Phân Tích Tăng Trưởng",
    category: "Sản Xuất",
    date: "2026-05-02",
    driveDocId: "1rVEdcwplN-FUDrNJjXYj3Ed3DgHLIgKEq6oZRk-Yn3c",
  },
  {
    slug: "sd9-q2-2026",
    ticker: "SD9",
    title: "Định Giá RNAV Của SD9",
    category: "RNAV",
    date: "2026-08-07",
    driveDocId: "1vbjd1GF8gTkUp4ptUYGtm7JsURm85d1v9B8SeQ5hmf0",
  },
  {
    slug: "idv-q2-2026",
    ticker: "IDV",
    title: "Deep Research IDV - Phân Tích RNAV 2026",
    category: "RNAV",
    date: "2026-08-08",
    driveDocId: "1ua3L_bcAqwpz-0soIg8GetncvQ_MAQtP-7NOXVYXvtg",
  },
  {
    slug: "dc4-q2-2026",
    ticker: "DC4",
    title: "Phân Tích Cổ Phiếu DC4 & Quỹ Đất DICERA",
    category: "Bất Động Sản",
    date: "2026-08-08",
    driveDocId: "1Z3FIe3ExzMBLCJEU-AKjo1Rso_e581u0_lfkHEKXRt0",
  },
];

export async function GET(request: Request) {
  // Chế độ mặc định: trả về static snapshot (không gọi Drive, không cần env).
  // Bỏ qua chỉ khi env REPORTS_SOURCE=live hoặc query ?live=1 (dùng bởi script refresh).
  const forceLive = new URL(request.url).searchParams.get("live") === "1";
  if (process.env.REPORTS_SOURCE !== "live" && !forceLive) {
    return NextResponse.json(reportsSnapshot, {
      headers: { "x-reports-source": "snapshot" },
    });
  }

  // ===== Chế độ LIVE (REPORTS_SOURCE=live hoặc ?live=1): gọi Google Drive API lúc chạy =====
  // Chưa cấu hình API key → trả về danh sách tĩnh (không phá vỡ UI hiện tại)
  if (!DRIVE_API_KEY) {
    console.error(
      "[reports] GOOGLE_DRIVE_API_KEY đang TRỐNG — trả về fallback tĩnh. Hãy cấu hình env trên Vercel.",
    );
    return NextResponse.json(STATIC_REPORTS);
  }

  // Cảnh báo nếu folder được cấu hình khác folder mặc định (folder mặc định là folder
  // đang hoạt động, trả về đủ báo cáo ở local) — giúp phát hiện sớm lỗi gõ sai env trên Vercel.
  const DEFAULT_FOLDER_ID = "1eI8C_uDJlKDvNbzF9YOOr6QNCUIdw7o8";
  if (DRIVE_FOLDER_ID !== DEFAULT_FOLDER_ID) {
    console.warn(
      `[reports] LƯU Ý: GOOGLE_DRIVE_FOLDER_ID khác folder mặc định. ` +
        `Đang dùng: ${DRIVE_FOLDER_ID} (mặc định: ${DEFAULT_FOLDER_ID})`,
    );
  }

  console.log(
    `[reports] Đồng bộ từ Drive: folder=${DRIVE_FOLDER_ID}, apiKey=${DRIVE_API_KEY ? "đã cấu hình" : "THIẾU"}`,
  );

  try {
    const files = await listAllFilesInFolder(DRIVE_FOLDER_ID);
    console.log(`[reports] Drive trả về ${files.length} file trong folder.`);

    const seen = new Set<string>();
    const reports = await Promise.all(
      files
        .map(async (file) => {
          const parsed = parseReportName(file.name);
          // Bỏ qua file/folder không đúng định dạng (tên rác, không xác định mã)
          if (!parsed) return null;

          const date = toReportDate(file.createdTime); // DD/MM/YYYY (GMT+7) từ createdTime
          // Bóc tách nội dung: định giá cho cổ phiếu, tóm tắt cho vĩ mô/hàng hóa
          const content = await getDocContent(file.id);
          const valuation =
            parsed.kind === "stock" && content ? parseValuation(content) : null;
          const summary =
            parsed.kind !== "stock" && content ? extractSummary(content) : null;
          // Tỷ lệ trích quỹ khen thưởng phúc lợi (KTPL) — chỉ với báo cáo cổ phiếu
          const bonusWelfareRate =
            parsed.kind === "stock" && content
              ? extractBonusWelfareRate(content)
              : null;

          // Slug theo loại: cổ phiếu dùng mã CK, vĩ mô/hàng hóa dùng tên loại
          const slugBase =
            parsed.kind === "stock" ? parsed.ticker.toLowerCase() : parsed.kind;

          return {
            // Slug dùng ngày sạch dấu "/" (DD/MM/YYYY → DD-MM-YYYY)
            slug: `${slugBase}-${(date || "unknown").replace(/\//g, "-")}`,
            ticker: parsed.ticker, // null với bài vĩ mô/hàng hóa
            title: parsed.title,
            // Cổ phiếu: danh mục theo mã CK; vĩ mô/hàng hóa: 'macro' | 'commodity'
            category:
              parsed.kind === "stock"
                ? CATEGORY_BY_TICKER[parsed.ticker] ?? DEFAULT_CATEGORY
                : parsed.kind,
            date,
            reportDate: date, // ngày báo cáo = createdTime (DD/MM/YYYY, GMT+7)
            driveDocId: file.id,
            summary, // tóm tắt ngắn cho bài vĩ mô/hàng hóa (null với cổ phiếu)
            targetPrice: valuation?.targetPrice ?? null,
            currentPrice: valuation?.currentPrice ?? null,
            recommendation: valuation?.recommendation ?? null,
            upside: valuation?.upside ?? null,
            bonusWelfareRate, // % trích quỹ khen thưởng phúc lợi (KTPL) — null với vĩ mô/hàng hóa
          };
        }),
    );

    const deduped = reports
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .filter((r) => {
        // Dedupe theo mã (hoặc loại bài với vĩ mô/hàng hóa) + tiêu đề chuẩn hóa
        const key = `${r.ticker ?? r.category}|${r.title.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    return NextResponse.json(deduped);
  } catch (error) {
    // Log ĐẦY ĐỦ thông tin để tra cứu trên Vercel (Project → Runtime Logs). Nguyên nhân
    // thường gặp: folder ID sai (400), API key bị giới hạn referrer/IP (403), folder không
    // public (404). Kèm folder + trạng thái apiKey để khoanh vùng nhanh.
    const isBadRequest =
      error instanceof Error && /Google Drive API error 400/.test(error.message);
    console.error(
      `[reports] Lỗi đồng bộ Google Drive — folder=${DRIVE_FOLDER_ID}, ` +
        `apiKeyConfigured=${Boolean(DRIVE_API_KEY)}` +
        (isBadRequest
          ? "\nGợi ý: Lỗi 400 Bad Request thường do GOOGLE_DRIVE_FOLDER_ID trên Vercel sai chính tả. " +
            "Folder đang hoạt động ở local: 1eI8C_uDJlKDvNbzF9YOOr6QNCUIdw7o8"
          : ""),
      error,
    );
    // Fallback an toàn: giữ nguyên danh sách tĩnh khi Drive lỗi
    return NextResponse.json(STATIC_REPORTS);
  }
}
