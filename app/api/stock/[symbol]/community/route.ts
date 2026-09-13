import { NextRequest, NextResponse } from 'next/server'
import {
  getCommunityPosts,
  createCommunityPost,
  deleteCommunityPost,
} from '@/lib/stock-community-service'
import { getAuthenticatedUser } from '@/lib/auth-user-helper'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const ticker = symbol?.toUpperCase().trim()
    if (!ticker) {
      return NextResponse.json({ success: false, error: 'Thiếu mã cổ phiếu' }, { status: 400 })
    }

    const sortParam = request.nextUrl.searchParams.get('sort') === 'most_liked' ? 'most_liked' : 'newest'
    const user = await getAuthenticatedUser(request)

    const posts = getCommunityPosts(ticker, user?.id, sortParam)

    return NextResponse.json({
      success: true,
      data: posts,
      total: posts.length,
    })
  } catch (error: any) {
    console.error('[API GET /api/stock/[symbol]/community] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi tải bài viết cộng đồng' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const ticker = symbol?.toUpperCase().trim()
    if (!ticker) {
      return NextResponse.json({ success: false, error: 'Thiếu mã cổ phiếu' }, { status: 400 })
    }

    const user = await getAuthenticatedUser(request)
    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để đăng bài phân tích.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const content = (body.content || '').trim()
    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Nội dung bài viết không được để trống.' },
        { status: 400 }
      )
    }

    const newPost = createCommunityPost(ticker, user, {
      title: body.title,
      content,
      sentiment: body.sentiment,
      tickers: body.tickers,
      imageUrl: body.imageUrl,
    })

    return NextResponse.json({
      success: true,
      data: newPost,
    })
  } catch (error: any) {
    console.error('[API POST /api/stock/[symbol]/community] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi tạo bài viết cộng đồng' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' },
        { status: 401 }
      )
    }

    let postId = request.nextUrl.searchParams.get('postId')
    if (!postId) {
      try {
        const body = await request.json()
        postId = body.postId
      } catch {}
    }

    if (!postId) {
      return NextResponse.json({ success: false, error: 'Thiếu postId' }, { status: 400 })
    }

    const success = deleteCommunityPost(postId, user.id)
    return NextResponse.json({
      success,
      deletedId: postId,
    })
  } catch (error: any) {
    console.error('[API DELETE /api/stock/[symbol]/community] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi xóa bài viết' },
      { status: 500 }
    )
  }
}
