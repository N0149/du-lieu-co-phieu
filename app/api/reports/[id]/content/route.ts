import { NextResponse } from "next/server";

// Chạy động (không static-cache) — nội dung lấy trực tiếp từ Drive mỗi request.
export const dynamic = "force-dynamic";

const DRIVE_API_KEY = process.env.GOOGLE_DRIVE_API_KEY ?? "";

/**
 * GET /api/reports/[id]/content
 * Export nội dung văn bản (text/plain) của Google Doc qua Drive API v3 →
 * phục vụ tính năng "Nghe đọc báo cáo" (Web Speech API) trên trang báo cáo chi tiết.
 *
 * Yêu cầu: file Google Docs phải public (hoặc được share với "anyone with the link"),
 * và env GOOGLE_DRIVE_API_KEY đã cấu hình (Vercel / .env.local).
 *
 * Trả về: 200 { content: string } | 4xx/5xx { error: string }
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
    return NextResponse.json({ content });
  } catch (err) {
    console.warn(`[reports] Lỗi export doc ${id}:`, err);
    return NextResponse.json({ error: "Lỗi khi đọc nội dung tài liệu." }, { status: 500 });
  }
}
