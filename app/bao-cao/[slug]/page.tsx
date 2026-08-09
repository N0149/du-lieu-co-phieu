import DriveDocViewer from "@/components/DriveDocViewer";
import Link from "next/link";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const resolvedParams = await params;
  const docId = resolvedParams.slug; // slug chính là ID Google Doc

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

      {/* Trình xem trực tiếp Google Doc full màn hình */}
      <DriveDocViewer docId={docId} title="Báo Cáo Nghiên Cứu Chi Tiết" />
    </div>
  );
}