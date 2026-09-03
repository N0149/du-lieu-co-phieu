import { Suspense } from 'react'
import { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { IndustryContainer } from '@/components/industry/IndustryContainer'
import { getIndustryFullData } from '@/lib/industry-service'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Đánh Giá Ngành ICB & Cơ Cấu Vốn Hóa, Lợi Nhuận | Dữ Liệu Đầu Tư',
  description:
    'Bức tranh toàn cảnh 19 nhóm ngành ICB: cơ cấu vốn hóa, lợi nhuận sau thuế theo quý, định giá P/E, P/B và danh sách cổ phiếu trực thuộc từng ngành.',
}

export default async function IndustryPage() {
  let initialData = null
  let errorMessage: string | null = null

  try {
    initialData = await getIndustryFullData()
  } catch (err: any) {
    console.error('[IndustryPage SSR] Lỗi tải dữ liệu ngành:', err)
    errorMessage = err.message || 'Không thể tải dữ liệu ngành'
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-[#0f1218] pb-16 text-[#F0F3F6]">
        <div className="mx-auto max-w-[1720px] px-3 sm:px-6">
          <Suspense
            fallback={
              <div className="flex h-96 items-center justify-center text-xs text-[#8B98A5]">
                Đang tải dữ liệu phân tích ngành ICB...
              </div>
            }
          >
            {initialData ? (
              <IndustryContainer data={initialData} />
            ) : (
              <div className="mt-8 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-center text-sm text-rose-300">
                {errorMessage || 'Đang cập nhật dữ liệu...'}
              </div>
            )}
          </Suspense>
        </div>
      </main>
    </>
  )
}
