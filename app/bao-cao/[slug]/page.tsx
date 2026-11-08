import DriveDocViewer from "@/components/DriveDocViewer";
import Link from "next/link";
import { ReportAudioPlayer } from "@/components/report-audio-player";
import { getAuthenticatedUser } from "@/lib/auth-user-helper";
import { AuthGate } from "@/components/auth/AuthGate";
import reportsSnapshot from "@/data/reports-snapshot.json";
import { getNghienCuuAiReportBySlug } from "@/lib/nghien-cuu-ai-service";
import { ArrowLeft, BookOpen, ExternalLink, Sparkles } from "lucide-react";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const docId = resolvedParams.slug; // slug chính là ID Google Doc hoặc slug báo cáo

  // Kiểm tra quyền truy cập phía Server (nhận biết session đăng nhập tức thì)
  const authUser = await getAuthenticatedUser();
  const isLoggedIn = Boolean(authUser);

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

      {localReport ? (
        /* Hiển thị bài đọc Markdown trực tiếp từ file nghiên cứu nội bộ */
        <div className="w-full flex flex-col bg-[#1a1e29] rounded-2xl border border-white/10 shadow-xl overflow-hidden">
          {/* Header Báo Cáo - Công khai cho mọi độc giả & Googlebot index */}
          <div className="px-6 py-5 bg-[#141824] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
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
              <h1 className="text-lg sm:text-xl font-bold text-white">
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
            {/* TÓM TẮT ĐỊNH GIÁ & LUẬN ĐIỂM CỐT LÕI - Luôn mở công khai cho độc giả cảm nhận giá trị */}
            {localReport.summary && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5 text-xs sm:text-sm leading-relaxed text-emerald-200 mb-8 shadow-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1.5 text-sm">
                  <Sparkles className="size-4" />
                  <span>TÓM TẮT ĐỊNH GIÁ & LUẬN ĐIỂM CỐT LÕI</span>
                </div>
                <p className="text-slate-200 leading-relaxed">{localReport.summary}</p>
              </div>
            )}

            {/* CỔNG CHẶN ĐĂNG NHẬP (AUTH GATE) CHO PHẦN NỘI DUNG CHI TIẾT & AUDIO */}
            <AuthGate
              isLoggedIn={isLoggedIn}
              variant="blur"
              blurHeight={300}
              title="Đăng nhập để đọc toàn bộ bài phân tích chi tiết & nghe Audio"
              subtitle="Tạo tài khoản hoặc đăng nhập miễn phí chỉ mất 3 giây bằng Google để mở khóa toàn bộ bài nghiên cứu chuyên sâu."
              features={[
                'Đọc trọn vẹn 100% luận điểm phân tích, rủi ro & dự phóng tài chính',
                'Mở khóa bảng số liệu định giá RNAV & chiết khấu dòng tiền',
                'Nghe file Audio đọc báo cáo tóm tắt bằng giọng AI tự nhiên',
              ]}
              ctaText="Đăng nhập miễn phí để đọc tiếp"
            >
              <div className="space-y-6">
                <ReportAudioPlayer docId={docId} />

                <div
                  className="prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-4 font-sans [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-white [&_h1]:border-b [&_h1]:border-white/10 [&_h1]:pb-3 [&_h1]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-6 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-emerald-400 [&_h3]:mt-5 [&_strong]:text-white [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1"
                  dangerouslySetInnerHTML={{ __html: localReport.contentHtml }}
                />
              </div>
            </AuthGate>
          </div>
        </div>
      ) : (
        /* Fallback xem qua Google Drive Preview với các file Google Docs cũ */
        <AuthGate
          isLoggedIn={isLoggedIn}
          variant="blur"
          blurHeight={260}
          title="Đăng nhập để mở xem tài liệu báo cáo"
          subtitle="Tài khoản thành viên miễn phí mở khóa xem toàn bộ tài liệu nghiên cứu."
          features={[
            'Xem toàn bộ tài liệu Google Docs gốc trực tiếp trên web',
            'Không cần chuyển hướng ra bên ngoài',
            'Đăng nhập miễn phí trong 3 giây bằng Google',
          ]}
        >
          <div className="space-y-4">
            <ReportAudioPlayer docId={docId} />
            <DriveDocViewer docId={docId} title="Báo Cáo Nghiên Cứu Chi Tiết" />
          </div>
        </AuthGate>
      )}
    </div>
  );
}
