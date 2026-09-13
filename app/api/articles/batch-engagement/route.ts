import { NextRequest, NextResponse } from 'next/server'
import { getBatchArticleEngagement } from '@/lib/article-interactions-service'
import { getAuthenticatedUser } from '@/lib/auth-user-helper'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const articleIds = Array.isArray(body.articleIds) ? body.articleIds : []

    if (articleIds.length === 0) {
      return NextResponse.json({ success: true, engagements: {} })
    }

    // Giới hạn tối đa 200 id mỗi request để tránh câu query quá dài
    const limitedIds = articleIds.slice(0, 200)

    const user = await getAuthenticatedUser(request)
    const engagements = getBatchArticleEngagement(limitedIds, user?.id)

    return NextResponse.json({
      success: true,
      engagements,
    })
  } catch (error: any) {
    console.error('[API /api/articles/batch-engagement] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi lấy thông tin tương tác batch' },
      { status: 500 }
    )
  }
}
