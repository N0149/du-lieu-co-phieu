import { NextRequest, NextResponse } from "next/server";
import { getClientIp, checkInMemoryRateLimit, isSameOriginOrDirect } from "@/lib/security";
import reportsSnapshot from "@/data/reports-snapshot.json";
import { getNghienCuuAiReportBySlug } from "@/lib/nghien-cuu-ai-service";

// Chạy động (không static-cache) — nội dung lấy trực tiếp từ Drive mỗi request.
export const dynamic = "force-dynamic";

const DRIVE_API_KEY = process.env.GOOGLE_DRIVE_API_KEY ?? "";

/**
 * GET /api/reports/[id]/content
 * Export nội dung văn bản (text/plain) của báo cáo (ưu tiên file Markdown nghiên cứu AI cục bộ,
 * fallback Google Doc qua Drive API v3) phục vụ tính năng "Nghe đọc báo cáo".
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ip = getClientIp(request.headers);
  const host = request.headers.get("host");

  // 1. Kiểm tra Hotlinking
  if (!isSameOriginOrDirect(request.headers, host)) {
    return NextResponse.json(
      { error: "Truy cập tài nguyên trực tiếp từ nguồn ngoài bị từ chối." },
      { status: 403 }
    );
  }

  // 2. Giới hạn tần suất đọc báo cáo (tối đa 30 bài / phút / IP)
  const limiter = checkInMemoryRateLimit(`rl:doc:${ip}`, {
    windowMs: 60_000,
    max: 30,
  });

  if (!limiter.success) {
    return NextResponse.json(
      { error: "Tần suất yêu cầu nội dung quá nhanh. Vui lòng chờ 1 phút." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  if (!id) {
    return NextResponse.json({ error: "Thiếu ID tài liệu." }, { status: 400 });
  }

  // 3. Ưu tiên kiểm tra kho Nghiên cứu chuyên sâu AI cục bộ (bóc tách từ file Word)
  const localMatch = (reportsSnapshot as any[]).find(
    (r) => r.driveDocId === id || r.slug === id || r.localSlug === id
  );
  const targetSlug = localMatch?.localSlug || id;
  const localReport = getNghienCuuAiReportBySlug(targetSlug);

  if (localReport && localReport.markdown) {
    return NextResponse.json(
      { content: localReport.markdown },
      {
        headers: {
          "X-Robots-Tag": "noindex, nofollow, noarchive",
          "Cache-Control": "private, max-age=1800",
        },
      }
    );
  }

  // 4. Fallback Google Drive API nếu là Google Doc
  if (!DRIVE_API_KEY) {
    console.warn("[reports] GOOGLE_DRIVE_API_KEY trống — không đọc được nội dung tài liệu.");
    return NextResponse.json(
      { error: "Chưa cấu hình GOOGLE_DRIVE_API_KEY trên server." },
      { status: 500 },
    );
  }

  try {
    const query = new URLSearchParams({ mimeType: "text/plain", key: DRIVE_API_KEY });
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}/export?${query.toString()}`,
      { cache: "no-store" },
    );

    if (!res.ok) {
      console.warn(`[reports] Không đọc được nội dung doc ${id}: HTTP ${res.status}`);
      return NextResponse.json(
        { error: `Không đọc được nội dung tài liệu (HTTP ${res.status}).` },
        { status: res.status },
      );
    }

    const content = await res.text();
    return NextResponse.json(
      { content },
      {
        headers: {
          "X-Robots-Tag": "noindex, nofollow, noarchive",
          "Cache-Control": "private, max-age=1800",
        },
      }
    );
  } catch (err) {
    console.warn(`[reports] Lỗi export doc ${id}:`, err);
    return NextResponse.json({ error: "Lỗi khi đọc nội dung tài liệu." }, { status: 500 });
  }
}
