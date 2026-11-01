import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Award,
  TrendingUp,
  FileText,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import {
  getNghienCuuAiReportBySlug,
  getNghienCuuAiReportsForTicker,
  getAllNghienCuuAiReports,
} from '@/lib/nghien-cuu-ai-service'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  let report = getNghienCuuAiReportBySlug(slug)
  if (!report && slug.length <= 5) {
    const list = getNghienCuuAiReportsForTicker(slug)
    if (list.length > 0) report = getNghienCuuAiReportBySlug(list[0].slug)
  }

  if (!report) {
    return { title: 'Báo Cáo Nghiên Cứu Chuyên Sâu AI | Dữ Liệu Đầu Tư' }
  }

  return {
    title: `${report.displayTitle} | Dữ Liệu Đầu Tư`,
    description: report.summary || `Báo cáo nghiên cứu chuyên sâu AI mã ${report.ticker}`,
  }
}

export default async function NghienCuuAiDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  let report = getNghienCuuAiReportBySlug(slug)
  if (!report && slug.length <= 5) {
    const list = getNghienCuuAiReportsForTicker(slug)
    if (list.length > 0) report = getNghienCuuAiReportBySlug(list[0].slug)
  }

  if (!report) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[#11141c] text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Nút quay lại */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/nghien-cuu-ai"
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-[#9EACB9] hover:text-white transition-colors border border-white/10"
          >
            <ArrowLeft className="size-4" />
            <span>Quay lại danh mục Nghiên cứu chuyên sâu AI</span>
          </Link>

          {report.ticker && report.ticker !== 'MACRO' && (
            <Link
              href={`/stock/${report.ticker}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white px-3.5 py-2 text-xs font-semibold transition-all border border-emerald-500/30"
            >
              <span>Xem hồ sơ tài chính {report.ticker}</span>
              <ExternalLink className="size-3.5" />
            </Link>
          )}
        </div>

        {/* Header báo cáo */}
        <header className="rounded-2xl border border-white/10 bg-[#1c212d] p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center gap-2">
            {report.ticker && (
              <span className="rounded-lg bg-emerald-500/20 text-emerald-400 px-3 py-1 text-sm font-black font-mono border border-emerald-500/30">
                {report.ticker}
              </span>
            )}

            {report.score != null ? (
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1 text-xs font-bold text-emerald-400">
                ⭐ {report.score} ĐIỂM · {report.classification}
              </span>
            ) : (
              <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-3 py-1 text-xs font-semibold text-purple-400">
                Chuyên Đề Phân Tích
              </span>
            )}

            <span className="text-xs text-[#9EACB9] font-mono">
              Ngày nghiên cứu: {report.date}
            </span>

            {report.price && (
              <span className="text-xs text-[#9EACB9]">
                Thị giá tại thời điểm phân tích: <b className="font-mono text-white">{report.price} k₫</b>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
            {report.displayTitle}
          </h1>

          {report.summary && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs sm:text-sm leading-relaxed text-emerald-200">
              <b className="text-emerald-400 block mb-1">TÓM TẮT ĐỊNH GIÁ & LUẬN ĐIỂM CỐT LÕI:</b>
              {report.summary}
            </div>
          )}
        </header>

        {/* Nội dung bài viết */}
        <article className="rounded-2xl border border-white/10 bg-[#1a1e29] p-6 sm:p-10 shadow-2xl">
          <div
            className="prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-4 font-sans text-slate-200 [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-white [&_h1]:border-b [&_h1]:border-white/10 [&_h1]:pb-3 [&_h1]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-6 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-emerald-400 [&_h3]:mt-5 [&_strong]:text-white [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1"
            dangerouslySetInnerHTML={{ __html: report.contentHtml }}
          />
        </article>
      </main>
    </div>
  )
}
