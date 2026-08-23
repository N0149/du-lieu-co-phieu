import DriveDocViewer from "@/components/DriveDocViewer";
import Link from "next/link";
import { Paywall } from "@/components/Paywall";
import { ReportAudioPlayer } from "@/components/report-audio-player";
import { getCurrentUser } from "@/lib/session";
import { checkUserAccess, canAccessReport } from "@/lib/auth-check";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const resolvedParams = await params;
  const docId = resolvedParams.slug; // slug chính là ID Google Doc

  // Kiểm tra quyền truy cập phía Server (không thể bypass từ client):
  // - TRIAL_ACTIVE / SUBSCRIPTION_ACTIVE → mở DriveDocViewer
  // - UNAUTHENTICATED / EXPIRED          → hiển thị Paywall thay nội dung tài liệu
  const user = await getCurrentUser();
  const access = checkUserAccess(user);
  const allowed = canAccessReport(access.status);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Nút quay lại */}
      <div className="mb-6">
        <Link
          href="/bao-cao"
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-emerald-600 transition"
        >
          ← Quay lại danh sách báo cáo
        </Link>
      </div>

      {allowed ? (
        /* Đang trong 7 ngày dùng thử HOẶC đã nâng cấp VIP → xem bình thường */
        <>
          <ReportAudioPlayer docId={docId} />
          <div className="h-4" />
          <DriveDocViewer docId={docId} title="Báo Cáo Nghiên Cứu Chi Tiết" />
        </>
      ) : (
        /* Chưa đăng nhập / hết hạn dùng thử → chặn bằng Paywall */
        <Paywall status={access.status} />
      )}
    </div>
  );
}