'use client'

import { useEffect, useMemo, useState } from 'react'

export type Report = {
  slug: string
  ticker: string | null // null với báo cáo Vĩ mô (macro) / Hàng hóa (commodity)
  title: string
  category: string // 'macro' | 'commodity' với bài đặc biệt, ngược lại là danh mục cổ phiếu
  date: string
  reportDate?: string // ngày báo cáo (DD/MM/YYYY từ createdTime Google Drive, GMT+7)
  driveDocId: string
  summary?: string | null // tóm tắt ngắn (bài vĩ mô/hàng hóa)
  bonusWelfareRate?: number | null // % tỷ lệ trích quỹ khen thưởng phúc lợi (KTPL)
  // Định giá bóc tách từ nội dung báo cáo (mẫu chuẩn UIC) — optional, fallback an toàn
  targetPrice?: number | null // nghìn đồng/cổ phiếu
  currentPrice?: number | null // nghìn đồng/cổ phiếu
  recommendation?: string | null // MUA | KHẢ QUAN | NẮM GIỮ | THEO DÕI
  upside?: number | null // %
}

/**
 * Hook dùng chung: lấy danh sách báo cáo thực tế từ API /api/reports
 * (đã đồng bộ từ Google Drive), trả về map byTicker để các bảng/quick-jump
 * quyết định hướng điều hướng: mã có báo cáo → /bao-cao/{driveDocId},
 * mã chưa có → /bao-cao?ticker={MÃ_CK}.
 */
export function useReports() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/reports')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setReports(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        // Giữ danh sách rỗng khi API lỗi — UI vẫn hiển thị bình thường
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const byTicker = useMemo(() => {
    const map = new Map<string, Report>()
    for (const r of reports) {
      if (!r.ticker) continue // bỏ qua bài Vĩ mô / Hàng hóa (không có mã CK)
      const key = r.ticker.toUpperCase()
      if (!map.has(key)) map.set(key, r)
    }
    return map
  }, [reports])

  return { reports, byTicker, loading }
}

/** Trả href điều hướng cho một mã CK: luôn về trang kho báo cáo đã lọc theo mã */
export function reportHref(ticker: string): string {
  return `/bao-cao?ticker=${encodeURIComponent(ticker.toUpperCase())}`
}
