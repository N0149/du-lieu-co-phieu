import Link from 'next/link'
import { TrendingUp, Sparkles, ShieldCheck, Database, CheckCircle2, Lock, ArrowRight } from 'lucide-react'
import { getCurrentUser } from '@/lib/session'
import { approveOAuthAction, denyOAuthAction } from './actions'

export const dynamic = 'force-dynamic'

interface AuthorizePageProps {
  searchParams: Promise<{
    client_id?: string
    redirect_uri?: string
    state?: string
    code_challenge?: string
    code_challenge_method?: string
    scope?: string
  }>
}

export default async function AuthorizePage({ searchParams }: AuthorizePageProps) {
  const params = await searchParams
  const user = await getCurrentUser()

  const clientId = params.client_id || 'Gemini/Claude'
  const redirectUri = params.redirect_uri || ''
  const state = params.state || ''
  const codeChallenge = params.code_challenge || ''
  const codeChallengeMethod = params.code_challenge_method || 'S256'

  // Nhận diện ứng dụng AI đang kết nối
  let clientDisplay = 'Trợ lý AI'
  if (redirectUri.includes('google.com') || clientId.toLowerCase().includes('gemini')) {
    clientDisplay = 'Google Gemini Web'
  } else if (redirectUri.includes('claude') || clientId.toLowerCase().includes('claude')) {
    clientDisplay = 'Anthropic Claude'
  } else if (redirectUri.includes('chatgpt') || clientId.toLowerCase().includes('chatgpt')) {
    clientDisplay = 'OpenAI ChatGPT'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0d14] px-4 py-8 text-[#f0f3f6]">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121620] p-6 shadow-2xl space-y-6">
        {/* Header Branding */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <TrendingUp className="size-5" />
            </span>
            <div>
              <h2 className="font-bold text-base leading-tight">
                Dữ Liệu<span className="text-emerald-400"> Đầu Tư</span>
              </h2>
              <p className="text-[11px] text-[#9eacb9]">Cổng Dữ Liệu & Báo Cáo Tài Chính</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
            <Sparkles className="size-3" /> MCP Remote
          </span>
        </div>

        {/* Authorization Prompt */}
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 mb-3">
            <Database className="size-6 text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-white">Liên kết với {clientDisplay}</h3>
          <p className="text-xs text-[#9eacb9] leading-relaxed">
            Ứng dụng <strong className="text-white">{clientDisplay}</strong> yêu cầu cấp quyền truy xuất dữ liệu tài chính từ tài khoản Dữ Liệu Đầu Tư của bạn qua giao thức Model Context Protocol.
          </p>
        </div>

        {/* User Status Card */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#9eacb9]">Tài khoản kết nối:</span>
            <span className="font-semibold text-emerald-400">
              {user ? user.email : 'Tài khoản Dùng thử (Miễn phí)'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#9eacb9]">Gói dịch vụ:</span>
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
              {user?.status === 'active' ? 'Thành viên VIP' : 'Dùng thử 7 ngày (Full Data)'}
            </span>
          </div>
        </div>

        {/* Permissions list */}
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-[#9eacb9] uppercase tracking-wider">
            Các quyền dữ liệu sẽ cấp cho {clientDisplay}:
          </p>
          <ul className="space-y-2 text-xs text-[#ced7e0]">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>Tra cứu 16 năm BCTC (KQKD, CĐKT, LCTT) 1.530+ mã cổ phiếu</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>Bóc tách Thuyết minh CAPEX, cơ cấu nợ vay & áp lực chi phí lãi vay</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>Kế hoạch ĐHĐCĐ & Tỷ lệ trích Quỹ khen thưởng phúc lợi (KTPL)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>Định giá RNAV tài sản ngầm, giá mục tiêu CTCK & upside</span>
            </li>
          </ul>
        </div>

        {/* Security assurance */}
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-2.5 text-[11px] text-emerald-300 border border-emerald-500/20">
          <ShieldCheck className="size-4 shrink-0 text-emerald-400" />
          <span>Kết nối an toàn chuẩn OAuth 2.0 PKCE. Bạn có thể ngắt kết nối bất cứ lúc nào trong cài đặt.</span>
        </div>

        {/* Action Form */}
        <div className="space-y-2 pt-2">
          <form action={approveOAuthAction}>
            <input type="hidden" name="client_id" value={clientId} />
            <input type="hidden" name="redirect_uri" value={redirectUri} />
            <input type="hidden" name="state" value={state} />
            <input type="hidden" name="code_challenge" value={codeChallenge} />
            <input type="hidden" name="code_challenge_method" value={codeChallengeMethod} />

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 transition-colors cursor-pointer"
            >
              <span>Đồng ý và Tiếp tục</span>
              <ArrowRight className="size-4" />
            </button>
          </form>

          <form action={denyOAuthAction}>
            <input type="hidden" name="redirect_uri" value={redirectUri} />
            <input type="hidden" name="state" value={state} />

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center rounded-xl border border-white/10 bg-transparent px-4 py-2 text-xs font-medium text-[#9eacb9] hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
            >
              Từ chối kết nối
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
