import { NextRequest, NextResponse } from 'next/server'
import { toggleLikeCommunityPost } from '@/lib/stock-community-service'
import { getAuthenticatedUser } from '@/lib/auth-user-helper'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const postId = decodeURIComponent(id)
    if (!postId) {
      return NextResponse.json({ success: false, error: 'Thiếu postId' }, { status: 400 })
    }

    const user = await getAuthenticatedUser(request)
    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để thích bài viết này.' },
        { status: 401 }
      )
    }

    const result = toggleLikeCommunityPost(postId, user)

    return NextResponse.json({
      success: true,
      liked: result.liked,
      likesCount: result.likesCount,
    })
  } catch (error: any) {
    console.error('[API /api/community/[id]/like] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi thao tác like bài viết' },
      { status: 500 }
    )
  }
}
