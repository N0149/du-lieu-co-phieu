'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Sparkles,
  X,
  Copy,
  Check,
  Download,
  ExternalLink,
  BookOpen,
  FileText,
  AlertCircle,
  Loader2,
  ChevronRight,
  HelpCircle,
  Share2,
} from 'lucide-react'
import type { AiBundleResult } from '@/lib/ai-bundle-service'

type AiPlatform = 'gemini' | 'notebooklm' | 'chatgpt' | 'claude' | 'deepseek'

interface AiPlatformInfo {
  id: AiPlatform
  name: string
  shortName: string
  badge: string
  url: string
  description: string
  recommendation: string
  accentColor: string
}

const AI_PLATFORMS: AiPlatformInfo[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    shortName: 'Gemini',
    badge: 'Khuyên dùng · Ngữ cảnh 1M+ tokens',
    url: 'https://gemini.google.com',
    description:
      'Cửa sổ ngữ cảnh khổng lồ (1.000.000+ tokens), phân tích bảng biểu BCTC siêu nhanh, miễn phí cho mọi tài khoản Google.',
    recommendation: 'Sao chép Mega-Prompt hoặc kéo thả file .md trực tiếp vào khung chat Gemini Web.',
    accentColor: 'from-blue-500/20 to-indigo-500/20 border-blue-500/40 text-blue-600 dark:text-blue-400',
  },
  {
    id: 'notebooklm',
    name: 'Google NotebookLM',
    shortName: 'NotebookLM',
    badge: 'Chuyên sâu tài liệu · Trích dẫn chuẩn 100%',
    url: 'https://notebooklm.google.com',
    description:
      'Công cụ nghiên cứu tài liệu số 1 của Google. Cho phép nạp hồ sơ Markdown làm nguồn (Source), hỏi đáp có trích dẫn chính xác từng dòng số liệu.',
    recommendation: 'Tải file .md về ➔ Vào NotebookLM tạo sổ mới ➔ Tải file lên làm Nguồn ➔ Tự do hỏi đáp.',
    accentColor: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'chatgpt',
    name: 'OpenAI ChatGPT',
    shortName: 'ChatGPT',
    badge: 'GPT-4o & o3-mini · Phản biện sắc sảo',
    url: 'https://chatgpt.com',
    description:
      'Mô hình tư duy logic hàng đầu. Rất phù hợp để phản biện mô hình kinh doanh, soi rủi ro tài chính và phân tích kịch bản tương lai.',
    recommendation: 'Sao chép Prompt tóm tắt dán vào chat box hoặc đính kèm file .md (với ChatGPT Plus).',
    accentColor: 'from-teal-500/20 to-emerald-500/20 border-teal-500/40 text-teal-600 dark:text-teal-400',
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    shortName: 'Claude',
    badge: 'Sonnet 3.7 · Thấu hiểu kế toán & văn phong',
    url: 'https://claude.ai',
    description:
      'Cực kỳ tinh tế trong việc đọc hiểu các báo cáo kế toán phức tạp, phát hiện điểm bất thường trong thuyết minh và biên bản ĐHĐCĐ.',
    recommendation: 'Sao chép Prompt dán vào Claude hoặc kéo thả file .md vào cửa sổ chat claude.ai.',
    accentColor: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-600 dark:text-amber-400',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    shortName: 'DeepSeek',
    badge: 'Miễn phí · Chuỗi tư duy Reasoning R1',
    url: 'https://chat.deepseek.com',
    description:
      'Mô hình suy luận chuyên sâu mã nguồn mở hoàn toàn miễn phí. Bóc tách từng bước tính toán chi tiết và logic tài chính.',
    recommendation: 'Sao chép Prompt dán vào chat.deepseek.com (bật chế độ DeepThink R1 nếu cần suy luận sâu).',
    accentColor: 'from-sky-500/20 to-cyan-500/20 border-sky-500/40 text-sky-600 dark:text-sky-400',
  },
]

const QUICK_PROMPTS = [
  {
    id: 'cfo',
    title: '🔍 Soi chất lượng lợi nhuận & Dòng tiền (CFO)',
    prompt:
      'Dựa vào BCTC trên, hãy so sánh LNST và Dòng tiền hoạt động kinh doanh (CFO) qua các kỳ. Doanh nghiệp có thu được tiền thật về không hay đang bị đọng vốn ở các khoản phải thu và hàng tồn kho? Tỷ lệ chuyển hóa lợi nhuận thành tiền mặt (Cash Conversion) ra sao?',
  },
  {
    id: 'debt',
    title: '⚠️ Rủi ro Nợ vay, Thanh khoản & Áp lực Lãi vay',
    prompt:
      'Bóc tách cơ cấu nợ vay ngắn hạn và dài hạn của công ty. Tỷ lệ đòn bẩy D/E và khả năng chi trả lãi vay (ICR = EBIT / Chi phí lãi vay) có ở mức an toàn không? Có rủi ro thanh khoản hay áp lực đáo hạn nợ trong 12 tháng tới không?',
  },
  {
    id: 'agm',
    title: '🎯 Kế hoạch ĐHĐCĐ & Tỷ lệ trích Quỹ KTPL',
    prompt:
      'Đánh giá tính khả thi kế hoạch doanh thu và lợi nhuận tại ĐHĐCĐ. Tỷ lệ trích Quỹ khen thưởng & phúc lợi (KTPL) của công ty là bao nhiêu phần trăm LNST? Ban lãnh đạo có chính sách phân phối lợi nhuận và chia cổ tức công bằng với cổ đông nhỏ lẻ không?',
  },
  {
    id: 'valuation',
    title: '📊 Định giá nhanh & Biên an toàn (MOS)',
    prompt:
      'Từ các chỉ số định giá P/E, P/B, định giá RNAV và tỷ suất cổ tức hiện tại, hãy cho tôi biết mức định giá này đang đắt hay rẻ so với bình quân ngành và lịch sử? Dư địa tăng giá và biên an toàn hiện tại có đủ hấp dẫn cho nhà đầu tư giá trị không?',
  },
  {
    id: 'capex',
    title: '🏭 Thuyết minh Dự án đầu tư & Chi phí dở dang',
    prompt:
      'Từ thuyết minh BCTC và chi phí xây dựng cơ bản dở dang (CAPEX), công ty đang dồn vốn vào những dự án trọng điểm nào? Dự kiến khi nào các dự án này đi vào vận hành và sẽ đóng góp thêm bao nhiêu công suất/doanh thu?',
  },
]

interface AiExportModalProps {
  open: boolean
  onClose: () => void
  ticker: string
  companyName?: string
}

export function AiExportModal({ open, onClose, ticker, companyName }: AiExportModalProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedAi, setSelectedAi] = useState<AiPlatform>('gemini')
  const [loading, setLoading] = useState(false)
  const [bundleData, setBundleData] = useState<AiBundleResult | null>(null)
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [copiedQuickPromptId, setCopiedQuickPromptId] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch bundle data when modal opens
  useEffect(() => {
    if (!open || !ticker) return

    let isMounted = true
    setLoading(true)

    fetch(`/api/stock/${ticker.toUpperCase()}/ai-bundle`)
      .then((res) => {
        if (!res.ok) throw new Error('Không thể tải dữ liệu AI')
        return res.json()
      })
      .then((data: AiBundleResult) => {
        if (isMounted) {
          setBundleData(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Lỗi tải dữ liệu AI:', err)
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [open, ticker])

  if (!mounted || !open) return null

  const activePlatform = AI_PLATFORMS.find((p) => p.id === selectedAi) || AI_PLATFORMS[0]

  // Hàm sao chép Prompt toàn tập
  const handleCopyPrompt = async () => {
    if (!bundleData) return
    try {
      const contentToCopy =
        selectedAi === 'gemini' || selectedAi === 'notebooklm'
          ? bundleData.markdownContent
          : bundleData.compactPrompt

      await navigator.clipboard.writeText(contentToCopy)
      setCopiedPrompt(true)
      setTimeout(() => setCopiedPrompt(false), 2500)
    } catch (err) {
      console.error('Không thể sao chép:', err)
    }
  }

  // Hàm sao chép prompt chuyên sâu
  const handleCopyQuickPrompt = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedQuickPromptId(id)
      setTimeout(() => setCopiedQuickPromptId(null), 2000)
    } catch (err) {
      console.error('Không thể sao chép câu hỏi:', err)
    }
  }

  // Hàm tải file .md bằng Blob (tức thì 0ms, chống chặn popup trình duyệt)
  const handleDownloadFile = () => {
    if (!ticker) return
    const filename = `${ticker.toUpperCase()}_Ho_So_AI_${new Date().toISOString().slice(0, 10)}.md`

    try {
      if (bundleData?.markdownContent) {
        const blob = new Blob([bundleData.markdownContent], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setDownloaded(true)
        setTimeout(() => setDownloaded(false), 2500)
        return
      }
    } catch (e) {
      console.warn('Lỗi khi tạo Blob download, fallback sang link trực tiếp:', e)
    }

    // Fallback nếu bundleData chưa tải xong
    const a = document.createElement('a')
    a.href = `/api/stock/${ticker.toUpperCase()}/ai-bundle?format=download`
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 2500)
  }

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER MODAL ── */}
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/20">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Nạp Dữ Liệu {ticker.toUpperCase()} Vào AI Cá Nhân
                </h2>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  0đ Chi Phí API
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {companyName ? `${companyName} · ` : ''}Tự động đóng gói BCTC, Thuyết minh & ĐHĐCĐ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ── NỘI DUNG CUỘN ĐƯỢC ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* BƯỚC 1: CHỌN NỀN TẢNG AI */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 block">
              1. Chọn mô hình AI bạn đang sử dụng:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {AI_PLATFORMS.map((platform) => {
                const active = selectedAi === platform.id
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => setSelectedAi(platform.id)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40'
                        : 'border-border bg-card hover:bg-muted/50 hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-foreground">{platform.shortName}</span>
                      {active && <Check className="size-3.5 text-primary" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
                      {platform.badge.split('·')[0]}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Thông tin mô hình được chọn */}
            <div className={`mt-3 rounded-xl border p-3.5 bg-gradient-to-r ${activePlatform.accentColor}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-foreground">{activePlatform.name}</h3>
                    <span className="text-[10px] px-2 py-0.2 rounded-md bg-background/80 font-medium">
                      {activePlatform.badge}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {activePlatform.description}
                  </p>
                  <p className="text-xs font-medium text-foreground mt-2 flex items-center gap-1.5">
                    <span className="text-primary font-bold">💡 Cách nạp tối ưu:</span>{' '}
                    {activePlatform.recommendation}
                  </p>
                </div>
                <a
                  href={activePlatform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-background/90 text-foreground hover:bg-background border border-border shadow-2xs transition-colors"
                >
                  <span>Mở {activePlatform.shortName}</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          </div>

          {/* BƯỚC 2: HÀNH ĐỘNG NẠP DỮ LIỆU */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 block">
              2. Lấy dữ liệu về cổ phiếu {ticker.toUpperCase()}:
            </label>

            {loading ? (
              <div className="flex items-center justify-center p-8 rounded-xl border border-dashed border-border text-muted-foreground gap-2">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span className="text-xs">Đang tổng hợp BCTC, Thuyết minh và ĐHĐCĐ...</span>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {/* NÚT 1: SAO CHÉP PROMPT TOÀN TẬP */}
                <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Copy className="size-3.5" />
                      </div>
                      <h4 className="text-xs font-bold text-foreground">Sao chép Mega-Prompt</h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                      Đã kèm sẵn toàn bộ BCTC nhiều năm, thuyết minh trọng yếu và <b>câu lệnh CFA</b> định hướng AI phân tích chuyên sâu.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyPrompt}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
                        copiedPrompt
                          ? 'bg-emerald-600 text-white'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                    >
                      {copiedPrompt ? (
                        <>
                          <Check className="size-3.5" />
                          <span>Đã sao chép vào Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          <span>Sao chép Prompt ({selectedAi === 'gemini' ? 'Toàn diện' : 'Tối ưu'})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* NÚT 2: TẢI FILE HỒ SƠ MARKDOWN */}
                <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Download className="size-3.5" />
                      </div>
                      <h4 className="text-xs font-bold text-foreground">Tải File Hồ Sơ (.md)</h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                      File văn bản đầy đủ 100% bảng biểu. Cực kỳ lý tưởng để <b>nạp vào Google NotebookLM</b> hoặc đính kèm vào Gemini/ChatGPT/Claude.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadFile}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
                        downloaded
                          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'border-border bg-card hover:bg-muted text-foreground'
                      }`}
                    >
                      {downloaded ? (
                        <>
                          <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Đã tải file thành công!</span>
                        </>
                      ) : (
                        <>
                          <Download className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Tải file {ticker.toUpperCase()}_Ho_So_AI.md</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BƯỚC 3: GỢI Ý CÂU HỎI PHÂN TÍCH CHUYÊN SÂU */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                3. Gợi ý câu hỏi phân tích chuyên sâu (Bấm để chép):
              </label>
              <span className="text-[11px] text-muted-foreground">Chuẩn phân tích CFA / Kiểm toán</span>
            </div>

            <div className="space-y-2">
              {QUICK_PROMPTS.map((item) => {
                const isCopied = copiedQuickPromptId === item.id
                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-border/80 bg-card hover:border-border transition-colors text-xs"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                        "{item.prompt}"
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyQuickPrompt(item.id, item.prompt)}
                      className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                        isCopied
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'border-border bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="size-3.5" />
                          <span>Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          <span>Chép câu hỏi</span>
                        </>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* BƯỚC 4: DANH MỤC LINK TÀI LIỆU GỐC (PDF CÓ DẤU ĐỎ) */}
          {bundleData && bundleData.pdfLinks && bundleData.pdfLinks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  4. Tài liệu gốc đính kèm (BCTC Kiểm toán, BCTN, ĐHĐCĐ):
                </label>
                <span className="text-[11px] text-muted-foreground">
                  {bundleData.pdfLinks.length} tài liệu công bố
                </span>
              </div>

              <div className="max-h-36 overflow-y-auto rounded-xl border border-border bg-muted/20 p-2 space-y-1.5">
                {bundleData.pdfLinks.slice(0, 8).map((link, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-card border border-border/50 text-xs"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="size-3.5 text-primary shrink-0" />
                      <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                        {link.publishedAt.substring(0, 10)}
                      </span>
                      <span className="text-foreground truncate" title={link.title}>
                        {link.title}
                      </span>
                    </div>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                    >
                      <span>Tải PDF</span>
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER MODAL ── */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 px-5 py-3.5 bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="size-3.5 text-primary" />
            <span>
              Tất cả dữ liệu được biên soạn tự động từ <b>dulieudautu.com</b>. Hoàn toàn không tốn chi phí API của bạn.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-muted text-xs font-medium transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <a
              href={activePlatform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-2xs transition-colors"
            >
              <span>Mở {activePlatform.shortName} ngay</span>
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
