import { ScrollText } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'

export const metadata = {
  title: 'Điều khoản sử dụng — Phân Tích Chuyên Sâu Cổ Phiếu',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 border-b border-border pb-5">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-primary">
            <ScrollText className="size-3.5" /> Pháp lý
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            Điều Khoản Sử Dụng
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vui lòng đọc kỹ các điều khoản trước khi sử dụng website dulieudautu.com.
          </p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">1. Chấp nhận điều khoản</h2>
            <p>
              Bằng việc truy cập và sử dụng website này, bạn xác nhận đã đọc, hiểu và đồng
              ý tuân thủ toàn bộ các điều khoản sử dụng được quy định dưới đây. Nếu không
              đồng ý với bất kỳ điều khoản nào, vui lòng ngừng sử dụng website.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">2. Bản chất nội dung</h2>
            <p>
              Toàn bộ nội dung trên website, bao gồm các báo cáo phân tích, dữ liệu tài
              chính, nhận định định giá và các thông tin liên quan, chỉ nhằm mục đích cung
              cấp thông tin tham khảo cho nhà đầu tư. Nội dung không được cấu thành và
              không được hiểu là khuyến nghị mua, bán hay nắm giữ bất kỳ chứng khoán nào.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">3. Trách nhiệm của người dùng</h2>
            <p>
              Nhà đầu tư tự chịu trách nhiệm hoàn toàn về các quyết định đầu tư của mình.
              Phân Tích Chuyên Sâu Cổ Phiếu không chịu trách nhiệm về bất kỳ tổn thất hoặc thiệt hại
              nào phát sinh từ việc sử dụng thông tin trên website.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">4. Quyền sở hữu trí tuệ</h2>
            <p>
              Toàn bộ nội dung, thiết kế, cấu trúc và mã nguồn của website thuộc quyền sở
              hữu của dulieudautu.com. Việc sao chép, tái xuất bản hoặc phân phối nội dung
              khi chưa được sự đồng ý bằng văn bản là vi phạm pháp luật.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">5. Thay đổi điều khoản</h2>
            <p>
              Chúng tôi có quyền sửa đổi, bổ sung các điều khoản này tại bất kỳ thời điểm
              nào. Việc tiếp tục sử dụng website sau khi các thay đổi được đăng tải đồng
              nghĩa với việc bạn chấp nhận các điều khoản mới.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
