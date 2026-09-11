import Link from 'next/link'

const FOOTER_LINKS = [
  { label: 'Điều khoản sử dụng', href: '/dieu-khoan' },
  { label: 'Chính sách bảo mật', href: '/chinh-sach-bao-mat' },
  { label: 'Báo cáo phân tích', href: '/bao-cao' },
  { label: 'Liên hệ', href: '/lien-he' },
]

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-[1600px] px-4 py-8">
      <div className="rounded-xl border border-white/8 bg-[#212631] shadow-[0_4px_20px_rgba(0,0,0,0.25)] p-6 sm:p-8">
        {/* Tuyên bố giới thiệu & Miễn trách nhiệm */}
        <section aria-labelledby="disclaimer-title" className="max-w-4xl">
          <h2
            id="disclaimer-title"
            className="text-base font-bold tracking-tight text-[#F0F3F6]"
          >
            Giới thiệu & Tuyên bố trách nhiệm
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              <strong>dulieudautu.com (Dữ Liệu Đầu Tư)</strong> là cổng thông tin tài chính chuyên sâu, tổng hợp dữ liệu giao dịch, tin tức và công bố thông tin 3 sàn (HOSE, HNX, UPCOM) theo thời gian thực. Website hoạt động công khai, cho phép mọi người dùng tự do truy cập tra cứu báo cáo tài chính, tin tức và chỉ số thị trường mà không bắt buộc phải đăng nhập. Đăng nhập tài khoản chỉ là tính năng tùy chọn nhằm hỗ trợ người dùng lưu trữ và đồng bộ danh mục cổ phiếu theo dõi (Watchlist) cá nhân giữa các thiết bị.
            </p>
            <p>
              Các thông tin và nhận định trong các báo cáo phân tích trên website được
              Dữ Liệu Đầu Tư tổng hợp và xây dựng dựa trên các nguồn thông tin công
              khai (Báo cáo tài chính, tài liệu Công bố thông tin của doanh nghiệp,
              Nghị quyết ĐHĐCĐ, báo cáo thường niên, ...) và các thông tin trên các
              website trong nước và quốc tế được coi là đáng tin cậy và hợp pháp.
            </p>
            <p>
              Nhà đầu tư sử dụng báo cáo cần lưu ý rằng các nhận định định giá mang
              tính chất góc nhìn nghiên cứu độc lập. Nhà đầu tư tự chịu trách nhiệm
              hoàn toàn về quyết định giải ngân và quản trị danh mục của mình.
            </p>
          </div>
        </section>

        {/* Đường kẻ phân cách */}
        <div className="my-6 h-px w-full bg-border/60" />

        {/* Người phụ trách / Liên hệ */}
        <p className="text-xs text-muted-foreground">
          Người phụ trách: <span className="font-medium text-foreground">Nguyễn Trung Nhật</span>
          {' · '}
          <a href="tel:0983627018" className="transition-colors hover:text-primary">
            Zalo 0983.627.018
          </a>
          {' · '}
          <a href="mailto:trungnhat232@gmail.com" className="transition-colors hover:text-primary">
            trungnhat232@gmail.com
          </a>
        </p>

        {/* Bản quyền */}
        <p className="mt-3 text-xs text-muted-foreground">
          © 2026 Phân Tích Chuyên Sâu Cổ Phiếu. Bản quyền thuộc về{' '}
          <span className="font-medium text-foreground">dulieudautu.com</span>.
        </p>

        {/* Hàng nút liên kết phụ */}
        <nav aria-label="Liên kết phụ" className="mt-4">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
