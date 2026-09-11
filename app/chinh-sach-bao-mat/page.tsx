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
            Cam kết bảo vệ thông tin và quyền riêng tư của người dùng website dulieudautu.com.
          </p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">1. Giới thiệu về Dữ Liệu Đầu Tư (dulieudautu.com)</h2>
            <p>
              Website <strong>dulieudautu.com</strong> cung cấp nền tảng tra cứu, phân tích tài chính chuyên sâu và theo dõi danh mục cổ phiếu niêm yết trên thị trường chứng khoán Việt Nam. Chính sách bảo mật này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ thông tin khi bạn sử dụng dịch vụ hoặc đăng nhập tài khoản.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">2. Dữ liệu chúng tôi thu thập từ Đăng nhập Google (Google User Data)</h2>
            <p className="mb-2">
              Khi bạn lựa chọn đăng nhập bằng Google OAuth trên <strong>dulieudautu.com</strong>, chúng tôi chỉ yêu cầu quyền truy cập thông tin định danh cơ bản (Basic Profile & Email) từ tài khoản Google của bạn, bao gồm:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li><strong>Địa chỉ Email:</strong> Được dùng làm mã định danh duy nhất để tạo tài khoản và lưu trữ danh mục theo dõi (Watchlist) của bạn.</li>
              <li><strong>Tên hiển thị & Ảnh đại diện (Profile Name & Avatar):</strong> Được dùng để hiển thị trên thanh menu giúp bạn nhận biết tài khoản đang đăng nhập.</li>
            </ul>
            <p className="mt-2 text-xs text-foreground/80">
              Chúng tôi <strong>tuyệt đối KHÔNG</strong> yêu cầu hoặc truy cập vào bất kỳ dữ liệu nhạy cảm nào khác (như danh bạ, Google Drive, email cá nhân hay tệp tin).
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">3. Mục đích sử dụng dữ liệu</h2>
            <p>
              Thông tin thu thập chỉ được sử dụng duy nhất cho các mục đích:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs mt-1">
              <li>Xác thực phiên đăng nhập an toàn giữa các thiết bị (máy tính, điện thoại).</li>
              <li>Lưu trữ, sao lưu và đồng bộ danh mục cổ phiếu theo dõi (Watchlist) riêng tư của bạn.</li>
              <li>Lọc tin tức, thông báo công bố thông tin theo danh mục cổ phiếu bạn đã chọn.</li>
            </ul>
            <p className="mt-2 font-medium text-foreground">
              Chúng tôi cam kết không bán, cho thuê, trao đổi hay chia sẻ dữ liệu người dùng Google cho bất kỳ bên thứ ba nào vì mục đích quảng cáo hay thương mại.
            </p>
          </section>

          <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <h2 className="mb-2 text-base font-semibold text-foreground">
              4. Tuân thủ Chính sách dữ liệu người dùng Google API (Google API Limited Use Disclosure)
            </h2>
            <p className="text-xs leading-relaxed text-foreground/90 mb-2">
              <strong>English:</strong> dulieudautu.com's use and transfer to any other app of information received from Google APIs will adhere to{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="text-primary font-medium hover:underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
            <p className="text-xs leading-relaxed text-foreground/90">
              <strong>Tiếng Việt:</strong> Việc dulieudautu.com sử dụng và chuyển giao cho bất kỳ ứng dụng nào khác thông tin nhận được từ các API của Google sẽ tuân thủ nghiêm ngặt{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="text-primary font-medium hover:underline"
              >
                Chính sách dữ liệu người dùng của dịch vụ Google API
              </a>
              , bao gồm các yêu cầu về Sử dụng có giới hạn (Limited Use):
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-muted-foreground">
              <li><strong>Không quảng cáo:</strong> Tuyệt đối không sử dụng dữ liệu người dùng Google để phân phối quảng cáo hoặc tái tiếp thị (retargeting).</li>
              <li><strong>Không bán dữ liệu:</strong> Không bán, cho thuê hay chuyển nhượng dữ liệu người dùng cho bất kỳ bên thứ ba hay nhà môi giới dữ liệu nào.</li>
              <li><strong>Không huấn luyện mô hình AI:</strong> Không sử dụng dữ liệu người dùng Google để huấn luyện các mô hình trí tuệ nhân tạo (AI/ML) tổng quát.</li>
              <li><strong>Giới hạn quyền truy cập con người:</strong> Nhân sự quản trị không được phép xem dữ liệu cá nhân của người dùng trừ khi có sự đồng ý rõ ràng để hỗ trợ kỹ thuật hoặc theo yêu cầu pháp lý.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">5. Lưu trữ và Bảo mật dữ liệu</h2>
            <p>
              Dữ liệu danh mục của bạn được lưu trữ trên cơ sở dữ liệu đám mây Supabase với cơ chế bảo mật cấp dòng (Row Level Security - RLS). Chỉ có chính tài khoản của bạn mới có quyền xem và chỉnh sửa danh mục cổ phiếu của mình.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">6. Quyền kiểm soát và Xóa dữ liệu (Data Deletion)</h2>
            <p>
              Bạn có toàn quyền kiểm soát dữ liệu cá nhân của mình bất kỳ lúc nào:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs mt-1">
              <li>Bạn có thể xóa bất kỳ mã cổ phiếu nào khỏi Watchlist hoặc đăng xuất khỏi hệ thống bất kỳ lúc nào.</li>
              <li>Để yêu cầu xóa toàn bộ tài khoản và toàn bộ dữ liệu liên quan khỏi hệ thống, bạn có thể gửi email yêu cầu đến: <strong className="text-foreground">trungnhat232@gmail.com</strong>. Dữ liệu của bạn sẽ được xóa vĩnh viễn trong vòng 24 giờ làm việc.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">7. Thông tin liên hệ</h2>
            <p>
              Mọi thắc mắc về chính sách bảo mật và quyền riêng tư, vui lòng liên hệ:
            </p>
            <p className="mt-1 text-xs text-foreground">
              - Đơn vị quản lý: <strong>Dữ Liệu Đầu Tư (dulieudautu.com)</strong><br />
              - Đại diện & Quản trị: <strong>Nguyễn Trung Nhật</strong><br />
              - Email hỗ trợ: <strong>trungnhat232@gmail.com</strong><br />
              - Điện thoại / Zalo: <strong>0983.627.018</strong><br />
              - Website chính thức: <a href="https://dulieudautu.com" className="text-primary hover:underline">https://dulieudautu.com</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
