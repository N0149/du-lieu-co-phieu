import { NextRequest, NextResponse } from 'next/server'
import {
  getCommunityPostComments,
  addCommunityPostComment,
  deleteCommunityPostComment,
} from '@/lib/stock-community-service'
import { getAuthenticatedUser } from '@/lib/auth-user-helper'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const postId = decodeURIComponent(id)
    if (!postId) {
      return NextResponse.json({ success: false, error: 'Thiếu postId' }, { status: 400 })
    }

    const comments = getCommunityPostComments(postId)
    return NextResponse.json({
      success: true,
      data: comments,
      count: comments.length,
    })
  } catch (error: any) {
    console.error('[API GET /api/community/[id]/comments] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi tải danh sách bình luận' },
      { status: 500 }
    )
  }
}

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
        { success: false, error: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để bình luận.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const content = (body.content || '').trim()
    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Nội dung bình luận không được để trống.' },
        { status: 400 }
      )
    }

    const result = addCommunityPostComment(postId, user, content)

    return NextResponse.json({
      success: true,
      data: result.comment,
      commentsCount: result.commentsCount,
    })
  } catch (error: any) {
    console.error('[API POST /api/community/[id]/comments] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi gửi bình luận' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' },
        { status: 401 }
      )
    }

    let commentId = request.nextUrl.searchParams.get('commentId')
    if (!commentId) {
      try {
        const body = await request.json()
        commentId = body.commentId
      } catch {}
    }

    if (!commentId) {
      return NextResponse.json({ success: false, error: 'Thiếu commentId' }, { status: 400 })
    }

    const result = deleteCommunityPostComment(commentId, user.id)

    return NextResponse.json({
      success: true,
      deletedId: commentId,
      commentsCount: result.commentsCount,
    })
  } catch (error: any) {
    console.error('[API DELETE /api/community/[id]/comments] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi xóa bình luận' },
      { status: 500 }
    )
  }
}
