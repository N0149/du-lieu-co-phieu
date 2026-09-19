import { Suspense } from 'react';
import { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { MacroDashboard } from '@/components/macro/MacroDashboard';
import { getMacroCatalog, getMacroSummary, getMacroIndicator } from '@/lib/macro-service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dữ Liệu Kinh Tế Vĩ Mô Việt Nam & Toàn Cầu | Dữ Liệu Đầu Tư',
  description:
    'Theo dõi toàn diện các chỉ số kinh tế vĩ mô Việt Nam: GDP thực & danh nghĩa, Cung tiền M2, Tín dụng toàn hệ thống, Vốn đầu tư toàn xã hội, Vốn đầu tư NSNN, PMI, IIP, CPI lạm phát và kim ngạch xuất nhập khẩu.',
};

export default async function MacroPage() {
  const catalog = getMacroCatalog();
  const summary = getMacroSummary();
  const defaultSlug = 'dau-tu-toan-xh';
  const defaultRecord = getMacroIndicator(defaultSlug);

  if (!catalog || !defaultRecord) {
    return (
      <>
        <SiteHeader />
        <main className="min-h-screen bg-[#0f1218] py-12 px-4 text-[#F0F3F6]">
          <div className="mx-auto max-w-4xl text-center space-y-4">
            <h1 className="text-xl font-bold text-rose-400">Chưa có dữ liệu vĩ mô</h1>
            <p className="text-xs text-[#8B98A5]">
              Vui lòng chạy lệnh <code className="bg-white/10 px-2 py-1 rounded">npm run sync-macro</code> để đồng bộ dữ liệu vĩ mô lần đầu.
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-[#0f1218] pb-16 text-[#F0F3F6]">
        <div className="mx-auto max-w-[1720px] px-3 sm:px-6 pt-4">
          <Suspense
            fallback={
              <div className="flex h-96 items-center justify-center text-xs text-[#8B98A5]">
                Đang tải dữ liệu kinh tế vĩ mô...
              </div>
            }
          >
            <MacroDashboard
              initialCatalog={catalog.indicators}
              initialSummary={summary?.summary || []}
              initialRecord={defaultRecord}
              initialSlug={defaultSlug}
            />
          </Suspense>
        </div>
      </main>
    </>
  );
}
