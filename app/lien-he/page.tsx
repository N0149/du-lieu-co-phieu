import Link from 'next/link'
import { UserRound, Phone, Mail, Landmark, HeartHandshake } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { CopyButton } from '@/components/copy-button'

export const metadata = {
  title: 'Liên hệ — Phân Tích Chuyên Sâu Cổ Phiếu',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 border-b border-border pb-5">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-primary">
            <Mail className="size-3.5" /> Liên hệ
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            Liên Hệ
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Phân Tích Chuyên Sâu Cổ Phiếu luôn sẵn sàng tiếp nhận ý kiến đóng góp và phản hồi từ nhà đầu tư.
          </p>
        </div>

        <div className="space-y-4">
          {/* Người phụ trách / Sáng lập */}
          <ContactCard icon={<UserRound className="size-5" />} title="Người phụ trách / Sáng lập">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-foreground">Nguyễn Trung Nhật</p>
              <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
                Quản trị nội dung
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Phụ trách nghiên cứu, tổng hợp dữ liệu và xây dựng nội dung phân tích trên website.
            </p>
          </ContactCard>

          {/* Số điện thoại / Zalo */}
          <ContactCard icon={<Phone className="size-5" />} title="Số điện thoại / Zalo">
            <div className="flex items-center justify-between gap-3">
              <a
                href="tel:0983627018"
                className="font-mono text-base font-semibold text-foreground transition-colors hover:text-primary"
              >
                0983.627.018
              </a>
              <CopyButton value="0983627018" label="Sao chép" />
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Nhấn để gọi trực tiếp, hoặc kết bạn qua Zalo để trao đổi thêm.
            </p>
          </ContactCard>

          {/* Email */}
          <ContactCard icon={<Mail className="size-5" />} title="Email">
            <div className="flex items-center justify-between gap-3">
              <a
                href="mailto:trungnhat232@gmail.com"
                className="font-mono text-sm font-semibold text-foreground transition-colors hover:text-primary"
              >
                trungnhat232@gmail.com
              </a>
              <CopyButton value="trungnhat232@gmail.com" label="Sao chép" />
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Gửi email để đóng góp ý kiến, phản hồi nội dung hoặc đề xuất chủ đề phân tích.
            </p>
          </ContactCard>

          {/* Tài khoản ngân hàng — Ủng hộ / Đồng hành */}
          <div className="overflow-hidden rounded-lg border border-border/40 bg-card">
            <div className="flex items-center gap-3 border-b border-border/60 bg-accent/30 px-4 py-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Landmark className="size-5" />
              </span>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <HeartHandshake className="size-4 text-primary" />
                  Ủng hộ / Đồng hành nghiên cứu
                </p>
                <p className="text-xs text-muted-foreground">
                  Dùng để duy trì hoạt động tổng hợp và phát hành báo cáo phân tích.
                </p>
              </div>
            </div>

            <dl className="space-y-3 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-sm text-muted-foreground">Ngân hàng</dt>
                <dd className="text-sm font-semibold text-foreground">
                  BIDV{' '}
                  <span className="font-normal text-muted-foreground">
                    (Ngân hàng TMCP Đầu tư và Phát triển Việt Nam)
                  </span>
                </dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                <dt className="text-sm text-muted-foreground">Số tài khoản</dt>
                <dd className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold tracking-wide text-foreground">
                    1260202954
                  </span>
                  <CopyButton value="1260202954" label="Copy" />
                </dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-sm text-muted-foreground">Chủ tài khoản</dt>
                <dd className="font-mono text-sm font-semibold uppercase text-foreground">
                  NGUYEN TRUNG NHAT
                </dd>
              </div>
            </dl>

            <p className="border-t border-border/60 bg-muted/20 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
              Mọi đóng góp đều được trân trọng và được sử dụng đúng mục đích duy trì, nâng cao
              chất lượng dữ liệu. Nếu cần xác nhận thông tin chuyển khoản, vui lòng liên hệ qua
              Zalo hoặc email bên trên.
            </p>
          </div>

          {/* Phản hồi về báo cáo */}
          <ContactCard icon={<Mail className="size-5" />} title="Phản hồi về báo cáo">
            <p className="text-sm text-muted-foreground">
              Góp ý về nội dung phân tích vui lòng liên hệ qua email hoặc truy cập{' '}
              <Link href="/bao-cao" className="text-primary hover:underline">
                kho báo cáo phân tích
              </Link>
              .
            </p>
          </ContactCard>
        </div>
      </main>
    </div>
  )
}

function ContactCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-border/40 bg-card p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  )
}
