import { NextRequest, NextResponse } from 'next/server'
import { getArticleEngagement, getArticleComments } from '@/lib/article-interactions-service'
import { getAuthenticatedUser } from '@/lib/auth-user-helper'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const articleId = decodeURIComponent(id)
    if (!articleId) {
      return NextResponse.json({ success: false, error: 'Thiếu articleId' }, { status: 400 })
    }

    const user = await getAuthenticatedUser(request)
    const engagement = getArticleEngagement(articleId, user?.id)
    const comments = getArticleComments(articleId)

    return NextResponse.json({
      success: true,
      data: {
        ...engagement,
        comments,
      },
    })
  } catch (error: any) {
    console.error('[API /api/articles/[id]/engagement] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi lấy thông tin tương tác' },
      { status: 500 }
    )
  }
}
