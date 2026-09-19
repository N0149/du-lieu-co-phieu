import fs from 'node:fs'
import path from 'node:path'

export interface BctcFileItem {
  tenbaocao: string
  linkbaocao: string
  tenfile: string
  nam: string
  quy: number
  isPdf: boolean
  isZip: boolean
}

export interface BctcDocumentGroup {
  nam: string
  quy: number
  periodLabel: string
  files: BctcFileItem[]
}

export interface BctcCompanyDocumentsPayload {
  ticker: string
  totalFiles: number
  hasArchivedPdfs: boolean
  groups: BctcDocumentGroup[]
  externalPortals: {
    name: string
    url: string
    description: string
  }[]
}

let archiveCache: Record<string, any[]> | null = null

function loadArchive(): Record<string, any[]> {
  if (archiveCache) return archiveCache
  try {
    const p = path.join(process.cwd(), 'data', 'widata_archive', 'company', 'bctc_pdf_links.json')
    if (fs.existsSync(p)) {
      archiveCache = JSON.parse(fs.readFileSync(p, 'utf8'))
      return archiveCache!
    }
  } catch {}
  archiveCache = {}
  return archiveCache
}

export function getCompanyBctcDocuments(
  ticker: string,
  corporateWebsite?: string | null
): BctcCompanyDocumentsPayload {
  const sym = ticker.toUpperCase().trim()
  const archive = loadArchive()
  const rawList = archive[sym] || []

  const groups: BctcDocumentGroup[] = []
  let totalFiles = 0

  for (const period of rawList) {
    const periodNam = String(period.nam || '')
    const periodQuy = Number(period.quy) || 0
    const rawFiles: any[] = period.baocao || []
    if (rawFiles.length === 0) continue

    const files: BctcFileItem[] = rawFiles.map((doc) => {
      const link = String(doc.linkbaocao || '')
      return {
        tenbaocao: String(doc.tenbaocao || 'Báo cáo tài chính'),
        linkbaocao: link,
        tenfile: String(doc.tenfile || link.split('/').pop() || 'bctc.pdf'),
        nam: periodNam,
        quy: periodQuy,
        isPdf: link.toLowerCase().endsWith('.pdf'),
        isZip: link.toLowerCase().endsWith('.zip'),
      }
    })

    totalFiles += files.length
    const periodLabel = periodQuy === 0 || periodQuy === 4
      ? `Năm ${periodNam}`
      : `Quý ${periodQuy}/${periodNam}`

    groups.push({
      nam: periodNam,
      quy: periodQuy,
      periodLabel,
      files,
    })
  }

  // Cổng thông tin tải BCTC bên ngoài (đảm bảo 100% 1.530 mã đều có nguồn tải file gốc)
  const externalPortals = []

  if (corporateWebsite) {
    const cleanUrl = corporateWebsite.startsWith('http://') || corporateWebsite.startsWith('https://')
      ? corporateWebsite
      : `https://${corporateWebsite}`
    externalPortals.push({
      name: `Website Doanh nghiệp (${corporateWebsite})`,
      url: cleanUrl,
      description: 'Trang thông tin Quan hệ Cổ đông (IR) & BCTC do doanh nghiệp tự công bố',
    })
  }

  externalPortals.push(
    {
      name: 'Vietstock Finance (Tài liệu BCTC)',
      url: `https://finance.vietstock.vn/${sym}/tai-lieu-bctc.htm`,
      description: 'Kho lưu trữ toàn bộ BCTC kiểm toán định kỳ, nghị quyết và báo cáo soát xét',
    },
    {
      name: 'CafeF (Báo Cáo Tài Chính Gốc)',
      url: `https://s.cafef.vn/bao-cao-tai-chinh/${sym}/IncSta/2025/4/0/0/ket-qua-hoat-dong-kinh-doanh.chn`,
      description: 'Bản quét BCTC có chữ ký kiểm toán viên & sở giao dịch chứng khoán',
    },
    {
      name: 'Cổng Công Bố Thông Tin UBCKNN (SSC)',
      url: 'https://congbothongtin.ssc.gov.vn/',
      description: 'Hệ thống công bố thông tin bắt buộc chính thống của Ủy ban Chứng khoán Nhà nước',
    }
  )

  return {
    ticker: sym,
    totalFiles,
    hasArchivedPdfs: totalFiles > 0,
    groups,
    externalPortals,
  }
}
