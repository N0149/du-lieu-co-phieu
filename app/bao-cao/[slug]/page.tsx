import DriveDocViewer from "@/components/DriveDocViewer";
import Link from "next/link";
import { Paywall } from "@/components/Paywall";
import { ReportAudioPlayer } from "@/components/report-audio-player";
import { getCurrentUser } from "@/lib/session";
import { checkUserAccess, canAccessReport } from "@/lib/auth-check";
import reportsSnapshot from "@/data/reports-snapshot.json";
import { getNghienCuuAiReportBySlug } from "@/lib/nghien-cuu-ai-service";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const docId = resolvedParams.slug; // slug chính là ID Google Doc hoặc slug báo cáo

  // Kiểm tra quyền truy cập phía Server:
  const user = await getCurrentUser();
  const access = checkUserAccess(user);
  const allowed = canAccessReport(access.status);

  // Tìm xem bài báo cáo này có file Markdown nghiên cứu chuyên sâu AI nội bộ không
  const matchedSnapshot = (reportsSnapshot as any[]).find(
    (r) => r.driveDocId === docId || r.slug === docId || r.localSlug === docId
  );
  const localSlug = matchedSnapshot?.localSlug || docId;
  const localReport = getNghienCuuAiReportBySlug(localSlug);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Nút quay lại */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          href="/bao-cao"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-emerald-400 transition"
        >
          <ArrowLeft className="size-4" />
          <span>Quay lại danh sách báo cáo</span>
        </Link>

        {localReport && (
          <Link
            href="/nghien-cuu-ai"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg"
          >
            <BookOpen className="size-3.5" />
            <span>Mở trong Kho Nghiên Cứu Chuyên Sâu AI</span>
          </Link>
        )}
      </div>

      {allowed ? (
        /* Đang trong dùng thử hoặc VIP -> hiển thị nội dung */
        <>
          <ReportAudioPlayer docId={docId} />
          <div className="h-4" />

          {localReport ? (
            /* Hiển thị bài đọc Markdown trực tiếp từ file Word đã đồng bộ */
            <div className="w-full flex flex-col bg-[#1a1e29] rounded-2xl border border-white/10 shadow-xl overflow-hidden">
              <div className="px-6 py-4 bg-[#141824] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {localReport.ticker && (
                      <span className="rounded bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 text-xs font-bold font-mono">
                        {localReport.ticker}
                      </span>
                    )}
                    {localReport.score != null && (
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 text-xs font-bold text-emerald-400">
                        {localReport.score} ĐIỂM · {localReport.classification}
                      </span>
                    )}
                    <span className="text-xs text-[#9EACB9]">
                      Ngày: {localReport.date}
                    </span>
                  </div>
                  <h1 className="text-lg font-bold text-white">
                    {localReport.displayTitle || localReport.title}
                  </h1>
                </div>

                {localReport.ticker && (
                  <Link
                    href={`/stock/${localReport.ticker}`}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition flex items-center gap-1"
                  >
                    <span>Hồ sơ {localReport.ticker}</span>
                    <ExternalLink className="size-3" />
                  </Link>
                )}
              </div>

              <div className="p-6 sm:p-10 text-slate-200">
                {localReport.summary && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs sm:text-sm leading-relaxed text-emerald-200 mb-6">
                    <b className="text-emerald-400 block mb-1">TÓM TẮT ĐỊNH GIÁ & LUẬN ĐIỂM CỐT LÕI:</b>
                    {localReport.summary}
                  </div>
                )}

                <div
                  className="prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-4 font-sans [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-white [&_h1]:border-b [&_h1]:border-white/10 [&_h1]:pb-3 [&_h1]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-6 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-emerald-400 [&_h3]:mt-5 [&_strong]:text-white [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1"
                  dangerouslySetInnerHTML={{ __html: localReport.contentHtml }}
                />
              </div>
            </div>
          ) : (
            /* Fallback xem qua Google Drive Preview với các file Google Docs cũ */
            <DriveDocViewer docId={docId} title="Báo Cáo Nghiên Cứu Chi Tiết" />
          )}
        </>
      ) : (
        /* Chưa đăng nhập / hết hạn dùng thử -> chặn bằng Paywall */
        <Paywall status={access.status} />
      )}
    </div>
  );
}
