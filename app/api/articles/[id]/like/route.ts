import { NextRequest, NextResponse } from 'next/server'
import { toggleLikeArticle } from '@/lib/article-interactions-service'
import { getAuthenticatedUser } from '@/lib/auth-user-helper'

export const dynamic = 'force-dynamic'

export async function POST(
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
    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để thích bài viết này.' },
        { status: 401 }
      )
    }

    const result = toggleLikeArticle(articleId, user)

    return NextResponse.json({
      success: true,
      liked: result.liked,
      likesCount: result.likesCount,
    })
  } catch (error: any) {
    console.error('[API /api/articles/[id]/like] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi thao tác like' },
      { status: 500 }
    )
  }
}
