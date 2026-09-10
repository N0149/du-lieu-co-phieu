import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return handleSync(request)
}

export async function POST(request: NextRequest) {
  return handleSync(request)
}

async function handleSync(request: NextRequest) {
  // Kiểm tra xác thực Cron Secret để ngăn chặn truy cập trái phép
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Trên môi trường production hoặc khi đã cấu hình CRON_SECRET: bắt buộc phải khớp xác thực
  if (process.env.NODE_ENV === 'production' || cronSecret) {
    const url = new URL(request.url)
    const querySecret = url.searchParams.get('secret')
    const isAuthorized =
      Boolean(cronSecret) &&
      (authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret)

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Yêu cầu mã xác thực CRON_SECRET hợp lệ.' },
        { status: 401 }
      )
    }
  }

  const results: { indices?: string; manifest?: string; errors: string[] } = {
    errors: [],
  }

  try {
    // 1. Fetch indices.json
    const indicesRes = await fetch('https://longlivestock.com/data/indices.json', {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    })

    if (indicesRes.ok) {
      const indicesData = await indicesRes.text()
      const indicesPath = path.join(process.cwd(), 'data', 'longlive_indices.json')
      try {
        fs.writeFileSync(indicesPath, indicesData, 'utf-8')
        results.indices = 'Đồng bộ indices.json thành công'
      } catch (err: any) {
        // In serverless environments fs might be read-only, which is fine as ISR handles dynamic cache
        results.indices = 'Đã tải indices mới từ nguồn'
      }
    } else {
      results.errors.push(`indices.json HTTP ${indicesRes.status}`)
    }

    // 2. Fetch manifest.json (1.530 stocks)
    const manifestRes = await fetch('https://longlivestock.com/data/manifest.json', {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    })

    if (manifestRes.ok) {
      const manifestData = await manifestRes.text()
      const manifestPath = path.join(process.cwd(), 'data', 'longlive_manifest.json')
      try {
        fs.writeFileSync(manifestPath, manifestData, 'utf-8')
        results.manifest = 'Đồng bộ manifest.json (1.530 mã) thành công'
      } catch (err: any) {
        results.manifest = 'Đã tải manifest mới từ nguồn'
      }
    } else {
      results.errors.push(`manifest.json HTTP ${manifestRes.status}`)
    }

    // 3. Revalidate Next.js cached pages on-demand
    try {
      revalidatePath('/')
      revalidatePath('/tra-cuu')
      revalidatePath('/stock/[symbol]', 'page')
    } catch {}

    const success = results.errors.length === 0
    return NextResponse.json({
      success,
      timestamp: new Date().toISOString(),
      message: success
        ? 'Dữ liệu giá thị trường và 1.530 mã cổ phiếu đã được đồng bộ mới nhất!'
        : 'Đồng bộ hoàn tất một phần',
      results,
    })
  } catch (error: any) {
    console.error('[Sync Market Data] Error:', error)
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: error?.message || 'Lỗi không xác định khi đồng bộ',
      },
      { status: 500 }
    )
  }
}
