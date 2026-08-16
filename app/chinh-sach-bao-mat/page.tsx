import { ShieldCheck } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'

export const metadata = {
  title: 'Chính sách bảo mật — Phân Tích Chuyên Sâu Cổ Phiếu',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 border-b border-border pb-5">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-primary">
            <ShieldCheck className="size-3.5" /> Bảo mật
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            Chính Sách Bảo Mật
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cam kết bảo vệ thông tin và quyền riêng tư của người dùng website dulieucophieu.com.
          </p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">1. Dữ liệu chúng tôi thu thập</h2>
            <p>
              Website chỉ thu thập thông tin tối thiểu cần thiết cho hoạt động, bao gồm:
              dữ liệu truy cập ẩn danh (địa chỉ IP, trình duyệt, thời gian truy cập) phục vụ
              phân tích hiệu năng và bảo mật. Chúng tôi không yêu cầu tài khoản hay thu
              thập thông tin cá nhân nhạy cảm để sử dụng các chức năng cơ bản.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">2. Mục đích sử dụng dữ liệu</h2>
            <p>
              Dữ liệu thu thập được sử dụng để: vận hành và cải thiện trải nghiệm website,
              đảm bảo an toàn bảo mật hệ thống, và phân tích xu hướng sử dụng ở mức tổng hợp.
              Chúng tôi không bán, cho thuê hay trao đổi dữ liệu của người dùng cho bên thứ ba.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">3. Cookie & Lưu trữ cục bộ</h2>
            <p>
              Website có thể sử dụng bộ nhớ cục bộ (localStorage) để lưu các tùy chọn giao
              diện như chế độ sáng/tối. Bạn có thể xóa dữ liệu này bất kỳ lúc nào thông qua
              thiết lập trình duyệt.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">4. Bảo mật dữ liệu</h2>
            <p>
              Chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức hợp lý để bảo vệ dữ liệu
              khỏi truy cập trái phép, thay đổi, tiết lộ hoặc phá hủy. Tuy nhiên, không có
              phương thức truyền tải qua internet nào an toàn tuyệt đối.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">5. Liên hệ</h2>
            <p>
              Nếu bạn có bất kỳ câu hỏi nào về chính sách bảo mật, vui lòng liên hệ với
              chúng tôi qua trang Liên hệ.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
