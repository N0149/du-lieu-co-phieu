'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import {
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Bot,
  Zap,
  ShieldCheck,
  HelpCircle,
  TrendingUp,
  Settings,
  UserCheck,
  Layers,
  MessageSquare,
  AlertTriangle,
  Info,
  Lock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Globe,
  Sliders,
  FileText,
  CheckCircle2,
  Cpu,
  ArrowLeft,
  Home,
  ChevronRight,
} from 'lucide-react'

type Platform = 'claude' | 'chatgpt' | 'gemini' | 'grok'

const CONNECT_INFO = {
  name: 'dulieudautu.com',
  url: 'https://www.dulieudautu.com/mcp',
  auth: 'OAuth (RFC 7636 PKCE S256)',
  scope: '16 năm BCTC, Thuyết minh CAPEX & Lãi vay, Kế hoạch ĐHĐCĐ & Quỹ KTPL, Định giá RNAV',
}

const MCP_TOOLS = [
  {
    name: 'tra_cuu_ho_so_tai_chinh',
    title: 'Tra cứu Hồ sơ Tài chính 16 năm',
    desc: 'Bóc tách lịch sử BCTC từ 2008 đến nay: Doanh thu thuần, LNST, CĐKT, chỉ số P/E, P/B, EPS, ROE của 1.530+ mã.',
    badge: 'Core Financials',
  },
  {
    name: 'soi_chat_luong_dong_tien',
    title: 'Soi Chất lượng Dòng tiền (CFO vs LNST)',
    desc: 'So sánh lợi nhuận ròng với dòng tiền thuần kinh doanh CFO, cảnh báo dòng tiền âm kéo dài và bẫy lợi nhuận trên giấy.',
    badge: 'CFA Standard',
  },
  {
    name: 'soi_no_vay_va_lai_vay',
    title: 'Soi Nợ vay & Áp lực Chi phí Lãi vay',
    desc: 'Bóc tách nợ ngắn hạn, nợ dài hạn, tỷ lệ Đòn bẩy D/E và hệ số che phủ lãi vay (EBIT/Chi phí lãi vay).',
    badge: 'Risk Analysis',
  },
  {
    name: 'ke_hoach_dhdcd_va_ktpl',
    title: 'Kế hoạch ĐHĐCĐ & Tỷ lệ Trích Quỹ KTPL',
    desc: 'Theo dõi chỉ tiêu doanh thu, LNST được ĐHĐCĐ thông qua, tỷ lệ hoàn thành thực tế và mức trích Quỹ khen thưởng phúc lợi.',
    badge: 'Governance',
  },
  {
    name: 'dinh_gia_rnav_tai_san',
    title: 'Định giá RNAV & Tài sản Ngầm',
    desc: 'Bóc tách Chi phí xây dựng cơ bản dở dang (XDCB), tiền mặt ròng, định giá tài sản ròng RNAV cho BĐS, Hạ tầng, Cảng biển.',
    badge: 'Valuation',
  },
  {
    name: 'kho_bao_cao_va_upside',
    title: 'Kho 94 Báo cáo Phân tích & Upside',
    desc: 'Tra cứu giá mục tiêu, upside tiềm năng, luận điểm đầu tư và khuyến nghị mua/bán từ kho báo cáo phân tích độc quyền.',
    badge: 'Analyst Research',
  },
  {
    name: 'bo_loc_co_phieu',
    title: 'Bộ lọc Cổ phiếu Thông minh (Screener)',
    desc: 'Sàng lọc 1.530+ mã theo Ngành, ROE, P/E, P/B, Cổ tức, Quỹ KTPL, Vốn hóa và Điểm AI 360.',
    badge: 'Smart Screener',
  },
  {
    name: 'so_sanh_co_phieu',
    title: 'So sánh Đối đầu Cổ phiếu (Peer Comparison)',
    desc: 'So sánh trực tiếp 2 - 5 mã cùng ngành: Định giá, Biên lợi nhuận, Đòn bẩy nợ, Cổ tức và Quỹ KTPL.',
    badge: 'Peer Benchmarking',
  },
  {
    name: 'su_kien_va_cong_bo_thong_tin',
    title: 'Lịch Cổ tức, Giao dịch Nội bộ & Công bố TT',
    desc: 'Tra cứu thông báo chia cổ tức (tiền/cổ phiếu, GDKHQ), giao dịch lãnh đạo mua/bán và sự kiện nóng toàn thị trường.',
    badge: 'Corporate Actions',
  },
]

const SAMPLE_PROMPTS = [
  {
    title: 'Sàng lọc top cổ phiếu Cảng biển',
    prompt: 'Lọc cho tôi các cổ phiếu ngành Cảng biển có ROE > 15%, P/E < 10 và tỷ suất cổ tức tiền mặt > 4%.',
  },
  {
    title: 'So sánh đối đầu HPG vs NKG vs HSG',
    prompt: 'So sánh đối đầu toàn diện 3 mã thép HPG, HSG và NKG: Biên lãi gộp, áp lực nợ vay và định giá hiện tại.',
  },
  {
    title: 'Tra cứu lịch cổ tức & giao dịch nội bộ',
    prompt: 'Tra cứu lịch chia cổ tức và các giao dịch mua bán của lãnh đạo hoặc cổ đông lớn của VNM trong thời gian gần đây.',
  },
  {
    title: 'Soi chất lượng LNST & dòng tiền CFO',
    prompt: 'Soi chất lượng lợi nhuận và dòng tiền kinh doanh CFO của MWG trong 4 năm gần nhất. Tiền có thực về tài khoản không?',
  },
  {
    title: 'Kiểm tra tỷ lệ trích quỹ KTPL',
    prompt: 'Kiểm tra tỷ lệ trích Quỹ khen thưởng phúc lợi của DXP và đánh giá tính minh bạch với cổ đông nhỏ lẻ.',
  },
  {
    title: 'Soi nợ vay và áp lực lãi vay',
    prompt: 'Bóc tách cơ cấu nợ vay ngắn hạn, dài hạn và chi phí lãi vay của HPG. Đánh giá sức khỏe tài chính hiện tại.',
  },
  {
    title: 'Định giá RNAV & tài sản dở dang',
    prompt: 'Bóc tách chi phí xây dựng cơ bản dở dang và tài sản ngầm của KBC, tính định giá RNAV trên mỗi cổ phiếu.',
  },
]

const FAQ_ITEMS = [
  {
    q: 'Chi phí sử dụng MCP là bao nhiêu? Có tốn phí chủ web không?',
    a: 'Chi phí là 0đ đối với máy chủ của dulieudautu.com. Toàn bộ quá trình tính toán và suy luận AI được xử lý trực tiếp trên tài khoản Claude, ChatGPT, Gemini hoặc Grok của bạn.',
  },
  {
    q: 'Giao thức MCP (Model Context Protocol) là gì?',
    a: 'MCP là tiêu chuẩn kết nối mở do Anthropic khởi xướng (và được Google, OpenAI, Microsoft áp dụng), cho phép các mô hình AI lớn truy xuất an toàn dữ liệu chuyên sâu theo thời gian thực từ máy chủ bên ngoài mà không cần bạn phải sao chép dữ liệu thủ công.',
  },
  {
    q: 'Dữ liệu và tài khoản của tôi có an toàn không?',
    a: 'Hoàn toàn an toàn. Kết nối sử dụng cơ chế OAuth 2.0 PKCE (RFC 7636) bảo mật cấp ngân hàng. Mô hình AI chỉ đọc dữ liệu tài chính công khai và chỉ khi bạn trực tiếp yêu cầu trong câu hỏi.',
  },
  {
    q: 'Tôi phải làm gì nếu Claude báo "This connector has no tools available"?',
    a: 'Tại trang connector trong Cài đặt của Claude, hãy bấm vào nút ba chấm (⋯) cạnh chữ Disconnect, sau đó chọn "Refresh tools list" và đợi 3-5 giây để Claude đồng bộ lại danh sách 6 công cụ.',
  },
  {
    q: 'ChatGPT gói Team/Enterprise không thấy nút "Add custom MCP server"?',
    a: 'Với tài khoản ChatGPT Team hoặc Enterprise, quản trị viên (Admin) của không gian làm việc cần vào Workspace Settings ➔ Security/Data Controls để bật quyền "Allow custom MCP plugins" cho các thành viên.',
  },
]

export default function KetNoiMcpPage() {
  const [platform, setPlatform] = useState<Platform>('gemini')
  const [copiedItem, setCopiedItem] = useState<string | null>(null)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const serverUrl =
    mounted &&
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? `${window.location.origin}/mcp`
      : 'https://www.dulieudautu.com/mcp'

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedItem(label)
    setTimeout(() => setCopiedItem(null), 2000)
  }

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-[#0e1117] text-[#f0f3f6] pb-24">
        {/* Navigation Breadcrumb Bar */}
        <div className="border-b border-white/5 bg-[#10131a] px-4 sm:px-6 py-2.5">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Back Button & Breadcrumbs */}
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1 text-[#ced7e0] hover:text-white transition-colors font-medium cursor-pointer"
                title="Quay lại Trang chủ"
              >
                <ArrowLeft className="size-3.5 text-emerald-400" />
                <span>Quay lại Trang chủ</span>
              </Link>
              <span className="text-white/20">/</span>
              <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-[#9eacb9]">
                <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
                  <Home className="size-3" /> Trang chủ
                </Link>
                <ChevronRight className="size-3 text-white/30" />
                <span className="text-emerald-400 font-medium">Kết nối MCP AI</span>
              </nav>
            </div>

            {/* Quick Section Links */}
            <div className="hidden md:flex items-center gap-3 text-[11px] text-[#9eacb9]">
              <Link href="/stock/MWG" className="hover:text-white transition-colors">
                Phân tích cổ phiếu
              </Link>
              <span className="text-white/20">•</span>
              <Link href="/bo-loc" className="hover:text-white transition-colors">
                Bộ lọc
              </Link>
              <span className="text-white/20">•</span>
              <Link href="/bao-cao" className="hover:text-white transition-colors">
                Kho báo cáo
              </Link>
              <span className="text-white/20">•</span>
              <Link href="/thi-truong" className="hover:text-white transition-colors">
                Thị trường
              </Link>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            1. HEADER BANNER
        ────────────────────────────────────────────────────────────── */}
      <div className="border-b border-white/10 bg-[#141720]/90 backdrop-blur-md py-8 sm:py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
              <Sparkles className="size-3.5" /> Giao thức Remote MCP (OAuth PKCE)
            </span>
            <span className="text-xs text-[#9eacb9]">Chuẩn Model Context Protocol 2026</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Kết nối Dữ Liệu Đầu Tư với <span className="text-emerald-400">Claude, ChatGPT & Gemini</span>
          </h1>

          <p className="text-sm sm:text-base text-[#9eacb9] max-w-3xl leading-relaxed">
            Biến trợ lý AI yêu thích của bạn (Claude, ChatGPT, Gemini, Grok) thành <strong>Chuyên gia Phân tích Tài chính cấp cao (CFA)</strong>.
            AI sẽ tự động đọc 16 năm BCTC, Thuyết minh CAPEX & Lãi vay, Kế hoạch ĐHĐCĐ & Tỷ lệ trích Quỹ KTPL của hơn 1.530+ mã cổ phiếu Việt Nam để trả lời bạn.
          </p>

          {/* Quick Connection URL Card */}
          <div className="pt-2">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-3 sm:p-4 max-w-3xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Địa chỉ MCP Server chính thức:
                  </div>
                  <div className="font-mono text-sm sm:text-base text-white truncate">
                    {serverUrl}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyText(serverUrl, 'header-url')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors cursor-pointer shadow-sm"
                  >
                    {copiedItem === 'header-url' ? (
                      <>
                        <Check className="size-3.5" /> <span>Đã sao chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" /> <span>Sao chép URL</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(CONNECT_INFO.name, 'header-name')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-[#ced7e0] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    {copiedItem === 'header-name' ? (
                      <>
                        <Check className="size-3.5 text-emerald-400" /> <span>Đã chép tên</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" /> <span>Chép tên MCP</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN CONTAINER
      ────────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-10">

        {/* CONNECTION INFO TABLE CARD (STEP 1 SUMMARY - WIDATA STYLE) */}
        <div className="rounded-2xl border border-white/10 bg-[#141720] p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                1
              </span>
              <span>Thông tin kết nối chuẩn (Dùng cho tất cả các nền tảng AI)</span>
            </h2>
            <span className="text-[11px] text-[#9eacb9]">RFC 9728 & RFC 7591 Ready</span>
          </div>
          <p className="text-xs text-[#9eacb9] leading-relaxed">
            Sử dụng các thông tin sau để điền vào phần cài đặt Connector / Plugin của từng ứng dụng AI:
          </p>

          <div className="overflow-x-auto pt-1">
            <table className="w-full text-left text-xs border border-white/10 rounded-xl overflow-hidden">
              <tbody className="divide-y divide-white/10">
                <tr className="bg-white/[0.02]">
                  <td className="py-2.5 px-3.5 font-semibold text-[#9eacb9] w-44">Tên hiển thị (Name)</td>
                  <td className="py-2.5 px-3.5 font-mono text-white flex items-center justify-between gap-2">
                    <span>{CONNECT_INFO.name}</span>
                    <button
                      type="button"
                      onClick={() => copyText(CONNECT_INFO.name, 'table-name')}
                      className="text-emerald-400 hover:text-emerald-300 font-sans inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedItem === 'table-name' ? <Check className="size-3" /> : <Copy className="size-3" />}
                      <span>{copiedItem === 'table-name' ? 'Đã chép' : 'Chép'}</span>
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3.5 font-semibold text-[#9eacb9]">Địa chỉ máy chủ (Server URL)</td>
                  <td className="py-2.5 px-3.5 font-mono text-emerald-400 flex items-center justify-between gap-2">
                    <span className="truncate">{serverUrl}</span>
                    <button
                      type="button"
                      onClick={() => copyText(serverUrl, 'table-url')}
                      className="text-emerald-400 hover:text-emerald-300 font-sans inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedItem === 'table-url' ? <Check className="size-3" /> : <Copy className="size-3" />}
                      <span>{copiedItem === 'table-url' ? 'Đã chép' : 'Chép'}</span>
                    </button>
                  </td>
                </tr>
                <tr className="bg-white/[0.02]">
                  <td className="py-2.5 px-3.5 font-semibold text-[#9eacb9]">Phương thức xác thực (Authentication)</td>
                  <td className="py-2.5 px-3.5 text-[#ced7e0]">
                    <span className="font-semibold text-white">OAuth</span> (Hệ thống tự động phát hiện, không cần cấu hình thêm)
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3.5 font-semibold text-[#9eacb9]">Quyền truy cập dữ liệu (Scope)</td>
                  <td className="py-2.5 px-3.5 text-[#9eacb9] leading-relaxed">
                    {CONNECT_INFO.scope}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* PLATFORM SELECTOR TABS */}
        <div className="space-y-4">
          <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setPlatform('claude')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                platform === 'claude'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-400'
                  : 'border-transparent text-[#9eacb9] hover:text-white hover:bg-white/5'
              }`}
            >
              <Bot className="size-4" />
              <span>Anthropic Claude (Web & Desktop)</span>
            </button>

            <button
              type="button"
              onClick={() => setPlatform('chatgpt')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                platform === 'chatgpt'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-400'
                  : 'border-transparent text-[#9eacb9] hover:text-white hover:bg-white/5'
              }`}
            >
              <Zap className="size-4" />
              <span>OpenAI ChatGPT (Web & App)</span>
            </button>

            <button
              type="button"
              onClick={() => setPlatform('gemini')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                platform === 'gemini'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-400'
                  : 'border-transparent text-[#9eacb9] hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="size-4" />
              <span>Google Gemini Web (gemini.google.com)</span>
            </button>

            <button
              type="button"
              onClick={() => setPlatform('grok')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                platform === 'grok'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-400'
                  : 'border-transparent text-[#9eacb9] hover:text-white hover:bg-white/5'
              }`}
            >
              <Cpu className="size-4" />
              <span>xAI Grok (grok.com)</span>
            </button>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              TAB A: ANTHROPIC CLAUDE (DETAILED 10 STEPS - WIDATA STYLE)
          ────────────────────────────────────────────────────────────── */}
          {platform === 'claude' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-[#141720] p-4 sm:p-6 space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Hướng dẫn từng bước kết nối Dữ Liệu Đầu Tư MCP với Claude</span>
                    <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Claude.ai & Claude Desktop
                    </span>
                  </h2>
                  <p className="text-xs text-[#9eacb9]">
                    Áp dụng cho tài khoản Claude trên trình duyệt web (claude.ai) và ứng dụng Claude Desktop trên máy tính.
                  </p>
                </div>

                {/* Steps List */}
                <div className="space-y-5">
                  {/* Step 2 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      2
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-white text-sm">Mở menu tài khoản, chọn Settings</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Truy cập <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline inline-flex items-center gap-0.5">claude.ai <ExternalLink className="size-3" /></a>. Bấm vào tên tài khoản ở <strong>góc dưới bên trái</strong> màn hình, sau đó chọn <strong>Settings</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      3
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-white text-sm">Vào mục Connectors</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Trong cửa sổ Settings vừa mở, nhìn sang thanh menu bên trái ở nhóm <strong>Customize</strong>, chọn mục <strong>Connectors</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      4
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-white text-sm">Thêm connector mới</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Bấm vào nút <strong>+ Add</strong> ở góc trên bên phải trang Connectors, rồi chọn <strong>Add custom connector</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      5
                    </span>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-bold text-white text-sm">Nhập tên và địa chỉ MCP Server</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Điền 2 ô thông tin kết nối theo bảng ở Bước 1:
                      </p>
                      <div className="space-y-1.5 rounded-xl bg-black/40 border border-white/10 p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[#9eacb9]">Name:</span>
                          <span className="font-mono text-white font-bold">{CONNECT_INFO.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#9eacb9]">MCP server URL:</span>
                          <span className="font-mono text-emerald-400">{serverUrl}</span>
                        </div>
                      </div>
                      <p className="text-xs text-[#9eacb9]">
                        Bấm <strong>Continue</strong>. Claude sẽ tự động gửi yêu cầu kiểm tra và bắt tay với máy chủ trong vài giây.
                      </p>
                    </div>
                  </div>

                  {/* Step 6 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      6
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-white text-sm">Giữ nguyên cấu hình đăng nhập, bấm Add</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Claude sẽ tự động nhận diện cấu hình đăng nhập an toàn của máy chủ (cả mục <strong>Sign in now</strong> và <strong>Register automatically</strong> đều hiển thị nhãn <em className="text-emerald-400">Detected</em>). Giữ nguyên toàn bộ cấu hình mặc định, không cần thêm header hay mục nâng cao. Kéo xuống cuối và bấm <strong>Add</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Step 7 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      7
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-white text-sm">Bấm Connect</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Màn hình hiển thị thông báo <em>"You're not connected to Dữ Liệu Đầu Tư MCP yet"</em>. Bấm nút <strong>Connect</strong> ở giữa để chuyển sang trang cấp quyền tài khoản.
                      </p>
                    </div>
                  </div>

                  {/* Step 8 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      8
                    </span>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-bold text-white text-sm">Đăng nhập & Cấp quyền tài khoản</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Trang xác thực của Dữ Liệu Đầu Tư sẽ mở ra. Đăng nhập bằng tài khoản Google hoặc Email của bạn, sau đó bấm <strong>Đồng ý và Cho phép kết nối</strong>.
                      </p>
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2.5">
                        <Lock className="size-4 shrink-0 text-amber-400 mt-0.5" />
                        <div>
                          <strong>Lưu ý bảo mật:</strong> Chỉ xác thực khi trang đăng nhập có tên miền chính thức là <code className="text-emerald-300 font-mono">dulieudautu.com</code> trên thanh địa chỉ của trình duyệt.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 9 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      9
                    </span>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-bold text-white text-sm">Kết nối thành công & Quản lý Tool Permissions</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Bạn sẽ được tự động chuyển về lại Claude. Trang connector hiển thị danh sách <strong>6 công cụ phân tích</strong> tại mục <strong>Tool permissions</strong>. Kết nối đã hoàn tất, bạn có thể đóng cửa sổ Settings.
                      </p>

                      <div className="space-y-2 pt-1">
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200 flex items-start gap-2.5">
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                          <div>
                            <strong>Quyền chạy công cụ (Tool permissions):</strong> Mặc định mỗi công cụ hiển thị <em>Needs approval</em> (Claude sẽ hỏi bạn xác nhận trước khi dùng). Bạn có thể chuyển sang <strong>Always allow</strong> để Claude tự động bóc tách số liệu mượt mà mà không phải bấm xác nhận mỗi lần.
                          </div>
                        </div>

                        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-200 flex items-start gap-2.5">
                          <RefreshCw className="size-4 shrink-0 text-blue-400 mt-0.5" />
                          <div>
                            <strong>Mẹo khi chưa thấy công cụ:</strong> Nếu màn hình báo <em>"This connector has no tools available"</em>, hãy bấm nút ba chấm <strong>⋯</strong> cạnh nút Disconnect, chọn <strong>Refresh tools list</strong> và đợi 3-5 giây để tải danh sách công cụ.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 10 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      10
                    </span>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-bold text-white text-sm">Bật Dữ Liệu Đầu Tư MCP trong cuộc trò chuyện</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Mở một cuộc trò chuyện mới trên Claude, bấm biểu tượng dấu cộng <strong>+</strong> ở góc khung chat, chọn <strong>Connectors</strong> và bật công tắc <strong>Dữ Liệu Đầu Tư MCP</strong>. Sau đó đặt câu hỏi bằng tiếng Việt:
                      </p>
                      <div className="rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs text-emerald-300">
                        "Soi chất lượng LNST và dòng tiền CFO của MWG 4 năm gần nhất. Tiền có thực về tài khoản không?"
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional: Claude Desktop Config File */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FileText className="size-3.5 text-[#9eacb9]" />
                    <span>Dành cho người dùng chuyên sâu Claude Desktop (File cấu hình JSON)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        `{\n  "mcpServers": {\n    "dulieudautu": {\n      "url": "${serverUrl}"\n    }\n  }\n}`,
                        'claude-json'
                      )
                    }
                    className="text-xs text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedItem === 'claude-json' ? <Check className="size-3" /> : <Copy className="size-3" />}
                    <span>{copiedItem === 'claude-json' ? 'Đã chép JSON' : 'Chép cấu hình JSON'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#9eacb9]">
                  Nếu sử dụng ứng dụng Claude Desktop, bạn cũng có thể thêm đoạn mã sau vào file cấu hình <code>claude_desktop_config.json</code>:
                </p>
                <pre className="rounded-xl bg-black/60 p-3 text-xs font-mono text-emerald-400 overflow-x-auto border border-white/10">
{`{
  "mcpServers": {
    "dulieudautu": {
      "url": "${serverUrl}"
    }
  }
}`}
                </pre>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB B: OPENAI CHATGPT (DETAILED 9 STEPS - WIDATA STYLE)
          ────────────────────────────────────────────────────────────── */}
          {platform === 'chatgpt' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-[#141720] p-4 sm:p-6 space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Hướng dẫn từng bước kết nối Dữ Liệu Đầu Tư MCP với ChatGPT</span>
                    <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      chatgpt.com & ChatGPT App
                    </span>
                  </h2>
                  <p className="text-xs text-[#9eacb9]">
                    Áp dụng cho ChatGPT trên trình duyệt (chatgpt.com) và ứng dụng ChatGPT trên điện thoại/máy tính.
                  </p>
                </div>

                {/* Steps List */}
                <div className="space-y-5">
                  {/* Step 2 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      2
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-white text-sm">Vào mục Plugins</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Truy cập <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline inline-flex items-center gap-0.5">chatgpt.com <ExternalLink className="size-3" /></a>. Ở thanh bên trái của ChatGPT, chọn <strong>Plugins</strong> (hoặc vào <em>Settings ➔ Connected Apps & Plugins</em>).
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      3
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-white text-sm">Thêm MCP server tùy chỉnh</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Bấm nút <strong>Add</strong> ở góc trên bên phải trang Plugins, sau đó chọn <strong>Add custom MCP server</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      4
                    </span>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-bold text-white text-sm">Nhập tên và địa chỉ MCP Server</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Điền các ô thông tin theo bảng ở Bước 1:
                      </p>
                      <div className="space-y-1.5 rounded-xl bg-black/40 border border-white/10 p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[#9eacb9]">Name:</span>
                          <span className="font-mono text-white font-bold">{CONNECT_INFO.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#9eacb9]">Connection (chọn Server URL):</span>
                          <span className="font-mono text-emerald-400">{serverUrl}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#9eacb9]">Authentication:</span>
                          <span className="font-mono text-white">OAuth (Tự động nhận diện)</span>
                        </div>
                      </div>
                      <p className="text-xs text-[#9eacb9]">
                        <em>Mục Authentication tự nhận là OAuth, giữ nguyên. Không cần điền Icon, Description hay Advanced OAuth settings.</em>
                      </p>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      5
                    </span>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-bold text-white text-sm">Xác nhận và tạo plugin</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Tích vào ô <strong>I understand and want to continue</strong>, rồi bấm nút <strong>Create as a plugin</strong>.
                      </p>
                      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-200 flex items-start gap-2.5">
                        <Info className="size-4 shrink-0 text-blue-400 mt-0.5" />
                        <div>
                          ChatGPT luôn hiển thị cảnh báo <em>"Custom MCP servers introduce risk"</em> đối với mọi máy chủ MCP tùy chỉnh thêm từ bên ngoài. Đây là cảnh báo bảo mật mặc định chung của OpenAI; máy chủ Dữ Liệu Đầu Tư được vận hành chính thức và tuân thủ chuẩn an toàn RFC 7636.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 6 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      6
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-white text-sm">Bấm Connect Dữ Liệu Đầu Tư MCP</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Hộp thoại <strong>Connect Dữ Liệu Đầu Tư MCP</strong> hiện ra. Bấm nút <strong>Connect</strong> để chuyển sang trang đăng nhập và xác thực tài khoản.
                      </p>
                    </div>
                  </div>

                  {/* Step 7 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      7
                    </span>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-bold text-white text-sm">Đăng nhập tài khoản Dữ Liệu Đầu Tư</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Đăng nhập bằng tài khoản Google hoặc Email của bạn trên trang Dữ Liệu Đầu Tư, sau đó bấm <strong>Đồng ý và Cho phép kết nối</strong>.
                      </p>
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2.5">
                        <Lock className="size-4 shrink-0 text-amber-400 mt-0.5" />
                        <div>
                          <strong>Lưu ý bảo mật:</strong> Chỉ nhập thông tin khi thanh địa chỉ trình duyệt hiển thị tên miền <code className="text-emerald-300 font-mono">dulieudautu.com</code>.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 8 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      8
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-white text-sm">Kết nối thành công</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Bạn sẽ được tự động đưa về lại trang Plugins của ChatGPT. Plugin <strong>Dữ Liệu Đầu Tư MCP</strong> sẽ xuất hiện trong tab <strong>Personal</strong>, mục <strong>Created by you</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Step 9 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      9
                    </span>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-bold text-white text-sm">Dùng Dữ Liệu Đầu Tư MCP trong cuộc trò chuyện</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Mở một cuộc trò chuyện mới, bấm vào biểu tượng <strong>Plugins</strong> bên dưới khung chat, chọn <strong>Dữ Liệu Đầu Tư MCP</strong> và đặt câu hỏi bằng tiếng Việt:
                      </p>
                      <div className="rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs text-emerald-300">
                        "Kiểm tra tỷ lệ trích Quỹ khen thưởng phúc lợi của DXP và kế hoạch ĐHĐCĐ năm nay thế nào?"
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-[#9eacb9] flex items-start gap-2.5">
                        <HelpCircle className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                        <div>
                          <strong>Dành cho gói Team / Enterprise:</strong> Nếu bạn không thấy mục <em>Add custom MCP server</em>, quản trị viên không gian làm việc (Workspace Admin) cần bật quyền cho phép thêm MCP tùy chỉnh trong phần cài đặt bảo mật.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB C: GOOGLE GEMINI (DETAILED 10 STEPS - WIDATA STYLE)
          ────────────────────────────────────────────────────────────── */}
          {platform === 'gemini' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-[#141720] p-4 sm:p-6 space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Hướng dẫn từng bước kết nối Dữ Liệu Đầu Tư MCP với Gemini</span>
                    <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      gemini.google.com
                    </span>
                  </h2>
                  <p className="text-xs text-[#9eacb9]">
                    Áp dụng cho Google Gemini trên trình duyệt máy tính và điện thoại.
                  </p>
                </div>

                {/* Steps List */}
                <div className="space-y-5">
                  {/* Step 2 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      2
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-white text-sm">Mở Cài đặt trên Google Gemini</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Truy cập <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline inline-flex items-center gap-0.5">gemini.google.com <ExternalLink className="size-3" /></a>. Bấm vào biểu tượng <strong>Cài đặt (bánh răng ⚙️)</strong> ở góc dưới bên trái màn hình, cạnh tên tài khoản của bạn.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      3
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-white text-sm">Chọn Trí thông minh cá nhân</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Trong menu vừa mở ra, ở nhóm <strong>Lựa chọn ưu tiên</strong>, hãy chọn <strong>Trí thông minh cá nhân (Personal Intelligence)</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      4
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-white text-sm">Mở Các ứng dụng có thể kết nối & Thêm tùy chỉnh</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Bấm vào thẻ <strong>Các ứng dụng có thể kết nối (Connected Apps)</strong>, sau đó nhấn nút <strong>+ Tùy chỉnh (+ Custom)</strong> ở góc trên bên phải.
                      </p>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      5
                    </span>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-bold text-white text-sm">Nhập URL máy chủ MCP</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Trong hộp thoại <strong>Kết nối với máy chủ MCP</strong>, ô <em>URL của máy chủ MCP</em> nhập:
                      </p>
                      <div className="flex items-center gap-2 rounded-xl bg-black/40 border border-white/10 p-2.5 text-xs font-mono text-emerald-400">
                        <span className="truncate">{serverUrl}</span>
                        <button
                          type="button"
                          onClick={() => copyText(serverUrl, 'gemini-step-url')}
                          className="ml-auto text-xs text-[#9eacb9] hover:text-white inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedItem === 'gemini-step-url' ? <Check className="size-3" /> : <Copy className="size-3" />}
                          <span>{copiedItem === 'gemini-step-url' ? 'Đã chép' : 'Chép'}</span>
                        </button>
                      </div>
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300 leading-relaxed">
                        <strong className="text-amber-200">⚠️ Lưu ý bắt buộc:</strong> Phải có chữ <code className="bg-black/40 px-1 py-0.5 rounded text-amber-200 font-mono">www.</code> là <code className="bg-black/40 px-1 py-0.5 rounded text-white font-mono">https://www.dulieudautu.com/mcp</code>. Tuyệt đối không xóa chữ <code className="font-mono">www.</code> vì Google Gemini sẽ tự động hủy token bảo mật nếu gặp chuyển hướng tên miền, làm treo ứng dụng.
                      </div>
                      <p className="text-xs text-[#9eacb9]">
                        Sau đó bấm <strong>Tiếp theo</strong> (Không cần cấu hình phần Cài đặt bổ sung).
                      </p>
                    </div>
                  </div>

                  {/* Step 6 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      6
                    </span>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-bold text-white text-sm">Đồng ý và kết nối</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Kéo xuống cuối, tích vào ô <strong>"Tôi hiểu và chấp nhận các rủi ro về bảo mật và quyền riêng tư khi kết nối ứng dụng tùy chỉnh này"</strong>, rồi bấm nút <strong>Kết nối</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Step 7 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      7
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-white text-sm">Liên kết Tài khoản Google & Cấp quyền</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Hộp thoại <em>Liên kết Tài khoản Google của bạn với dulieudautu.com</em> hiện ra. Kéo xuống cuối và bấm <strong>Đồng ý và tiếp tục</strong> để xác thực tài khoản.
                      </p>
                    </div>
                  </div>

                  {/* Step 8 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      8
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-white text-sm">Lưu ứng dụng tùy chỉnh</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Sau khi hoàn tất đăng nhập, hộp thoại <em>Lưu ứng dụng tùy chỉnh</em> hiện ra với tên ứng dụng là <strong>dulieudautu.com</strong>. Bấm nút <strong>Kết nối</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Step 9 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      9
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-white text-sm">Kết nối thành công</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Gemini sẽ hiển thị thông báo <em>"dulieudautu.com đã được kết nối và sẵn sàng để sử dụng"</em>. Ứng dụng hiện trong mục <strong>Ứng dụng tùy chỉnh</strong>. Bấm <strong>Thử ngay</strong> để bắt đầu.
                      </p>
                    </div>
                  </div>

                  {/* Step 10 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      10
                    </span>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-bold text-white text-sm">Gọi dulieudautu.com trong khung chat Gemini</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Trong khung chat của Gemini, gõ ký tự <code className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-400 font-bold font-mono">@dulieudautu.com</code> (hoặc gõ <code className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-400 font-bold font-mono">@</code> rồi chọn tên ứng dụng), sau đó đặt câu hỏi:
                      </p>
                      <div className="rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs text-emerald-300">
                        @Dulieudautu Bóc tách nợ vay ngắn hạn, nợ dài hạn và chi phí lãi vay của HPG
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB D: XAI GROK (DETAILED 8 STEPS - WIDATA STYLE)
          ────────────────────────────────────────────────────────────── */}
          {platform === 'grok' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-[#141720] p-4 sm:p-6 space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Hướng dẫn từng bước kết nối Dữ Liệu Đầu Tư MCP với Grok</span>
                    <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      grok.com
                    </span>
                  </h2>
                  <p className="text-xs text-[#9eacb9]">
                    Áp dụng cho tài khoản Grok trên trình duyệt web (grok.com).
                  </p>
                </div>

                {/* Steps List */}
                <div className="space-y-5">
                  {/* Step 2 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      2
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-white text-sm">Mở Plugins</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Truy cập <a href="https://grok.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline inline-flex items-center gap-0.5">grok.com <ExternalLink className="size-3" /></a>. Ở góc dưới bên trái màn hình, bấm chọn <strong>Plugins</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      3
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-white text-sm">Tạo connector mới</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Trong tab <strong>Connectors</strong>, bấm nút <strong>New Connector</strong> ở góc trên bên phải.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      4
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-white text-sm">Chọn Custom</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Trong hộp thoại New Connector hiện ra, chọn mục <strong>Custom (Add your own custom connector)</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      5
                    </span>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-bold text-white text-sm">Nhập tên và địa chỉ MCP Server</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Điền theo bảng thông tin kết nối ở Bước 1:
                      </p>
                      <div className="space-y-1.5 rounded-xl bg-black/40 border border-white/10 p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[#9eacb9]">Name:</span>
                          <span className="font-mono text-white font-bold">{CONNECT_INFO.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#9eacb9]">Server URL:</span>
                          <span className="font-mono text-emerald-400">{serverUrl}</span>
                        </div>
                      </div>
                      <p className="text-xs text-[#9eacb9]">
                        Bấm <strong>Add Connector</strong>. Grok sẽ kiểm tra máy chủ trong vài giây rồi mở cửa sổ xác thực.
                      </p>
                    </div>
                  </div>

                  {/* Step 6 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      6
                    </span>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-bold text-white text-sm">Đăng nhập tài khoản Dữ Liệu Đầu Tư</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Một cửa sổ đăng nhập Dữ Liệu Đầu Tư sẽ mở ra. Đăng nhập bằng Google hoặc Email của bạn rồi bấm cho phép liên kết.
                      </p>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-[#9eacb9]">
                        <em>Lưu ý: Nếu cửa sổ đăng nhập không tự mở, hãy cho phép trình duyệt bật cửa sổ pop-up từ grok.com rồi thử lại.</em>
                      </div>
                    </div>
                  </div>

                  {/* Step 7 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      7
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-white text-sm">Kết nối thành công</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Grok báo <strong>Connector added successfully</strong>. <strong>Dữ Liệu Đầu Tư MCP</strong> sẽ xuất hiện trong mục <strong>Connected</strong> với nhãn <strong>Added</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Step 8 */}
                  <div className="flex gap-4 items-start">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      8
                    </span>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-bold text-white text-sm">Bật Dữ Liệu Đầu Tư MCP trong khung chat Grok</h3>
                      <p className="text-xs text-[#9eacb9] leading-relaxed">
                        Mở cuộc trò chuyện mới, bấm dấu cộng <strong>+</strong> ở khung chat, chọn <strong>Connectors</strong> và bật <strong>Dữ Liệu Đầu Tư MCP</strong>, sau đó bắt đầu đặt câu hỏi phân tích.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. SUPPORTED MCP TOOLS SHOWCASE
        ────────────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="size-5 text-emerald-400" />
              <span>Kho 6 Công Cụ Phân Tích Tài Chính Chuẩn CFA Tích Hợp Sẵn</span>
            </h2>
            <span className="text-xs text-[#9eacb9]">Tự động kích hoạt thông minh qua MCP</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {MCP_TOOLS.map((tool) => (
              <div
                key={tool.name}
                className="rounded-2xl border border-white/10 bg-[#141720] p-4 space-y-2 hover:border-emerald-500/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {tool.badge}
                  </span>
                  <code className="text-[10px] text-[#9eacb9] font-mono truncate max-w-[140px]">
                    {tool.name}
                  </code>
                </div>
                <h3 className="text-sm font-bold text-white leading-snug">{tool.title}</h3>
                <p className="text-xs text-[#9eacb9] leading-relaxed">{tool.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. QUICK-COPY SAMPLE PROMPTS
        ────────────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="size-5 text-emerald-400" />
              <span>Gợi ý câu hỏi mẫu khi trò chuyện với AI</span>
            </h2>
            <span className="text-xs text-[#9eacb9]">Bấm để sao chép câu hỏi và dán vào AI</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SAMPLE_PROMPTS.map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/10 bg-[#141720] p-4 space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-emerald-400">{item.title}</div>
                  <p className="text-xs text-[#f0f3f6] font-mono bg-black/40 p-2.5 rounded-xl border border-white/5 leading-relaxed">
                    "{item.prompt}"
                  </p>
                </div>
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => copyText(item.prompt, `prompt-${idx}`)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[#ced7e0] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    {copiedItem === `prompt-${idx}` ? (
                      <>
                        <Check className="size-3 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Đã chép câu hỏi</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Sao chép câu hỏi</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            5. FAQ SECTION
        ────────────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <HelpCircle className="size-5 text-emerald-400" />
            <span>Câu hỏi thường gặp về kết nối MCP</span>
          </h2>

          <div className="space-y-2">
            {FAQ_ITEMS.map((item, idx) => {
              const isExpanded = expandedFaq === idx
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/10 bg-[#141720] overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                    className="w-full flex items-center justify-between p-4 text-left text-xs sm:text-sm font-semibold text-white hover:bg-white/[0.02] cursor-pointer"
                  >
                    <span>{item.q}</span>
                    {isExpanded ? (
                      <ChevronUp className="size-4 text-emerald-400 shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="size-4 text-[#9eacb9] shrink-0 ml-2" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 text-xs text-[#9eacb9] leading-relaxed border-t border-white/5">
                      {item.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            6. SECURITY COMMITMENT & SUPPORT FOOTER
        ────────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-[#141720] to-emerald-950/20 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="size-5 text-emerald-400" />
                <span>Bảo mật dữ liệu tuyệt đối & Hỗ trợ kỹ thuật 24/7</span>
              </h3>
              <p className="text-xs text-[#9eacb9] leading-relaxed max-w-2xl">
                Dữ Liệu Đầu Tư cam kết không lưu trữ lịch sử hội thoại riêng tư của bạn với Claude hay ChatGPT.
                Nếu bạn cần hỗ trợ cài đặt hoặc muốn tùy biến thêm chỉ tiêu tài chính, đừng ngần ngại liên hệ chuyên viên.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href="https://zalo.me/0983627018"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-sm"
              >
                <MessageSquare className="size-4" />
                <span>Zalo hỗ trợ: 0983.627.018</span>
              </a>
              <Link
                href="/stock/MWG"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-[#ced7e0] hover:text-white hover:bg-white/10 transition-colors"
              >
                <span>Xem thử cổ phiếu MWG</span>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
    </>
  )
}
