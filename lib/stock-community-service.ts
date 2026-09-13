import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export interface CommunityComment {
  id: string
  postId: string
  userId: string
  userName: string
  userEmail: string
  userAvatar?: string
  content: string
  createdAt: string
}

export type MarketSentiment = 'bullish' | 'neutral' | 'bearish'

export interface CommunityPost {
  id: string
  symbol: string
  userId: string
  userName: string
  userEmail: string
  userAvatar?: string
  title?: string
  content: string
  sentiment?: MarketSentiment | null
  tickers: string[]
  imageUrl?: string
  likesCount: number
  commentsCount: number
  isLiked: boolean
  createdAt: string
  updatedAt: string
}

export interface UserAuthProfile {
  id: string
  email: string
  name?: string
  avatar?: string
}

import os from 'node:os'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
const DB_DIR = isServerless ? os.tmpdir() : DATA_DIR
const DB_PATH = path.join(DB_DIR, 'stock_community.db')

let dbInstance: DatabaseSync | null = null

export function getCommunityDb(): DatabaseSync {
  if (dbInstance) return dbInstance

  if (!fs.existsSync(DB_DIR)) {
    try {
      fs.mkdirSync(DB_DIR, { recursive: true })
    } catch {}
  }

  const db = new DatabaseSync(DB_PATH)
  try {
    db.exec(`PRAGMA journal_mode = WAL;`)
  } catch {}

  // 1. Bảng lưu trữ bài viết cộng đồng
  db.exec(`
    CREATE TABLE IF NOT EXISTS community_posts (
      id TEXT PRIMARY KEY NOT NULL,
      symbol TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_email TEXT,
      user_avatar TEXT,
      title TEXT,
      content TEXT NOT NULL,
      sentiment TEXT,
      tickers TEXT,
      image_url TEXT,
      likes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_posts_symbol ON community_posts (symbol);
    CREATE INDEX IF NOT EXISTS idx_posts_created_at ON community_posts (created_at DESC);
  `)

  // 2. Bảng lưu lượt Like của bài viết cộng đồng
  db.exec(`
    CREATE TABLE IF NOT EXISTS community_post_likes (
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      PRIMARY KEY (post_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_post_likes_post ON community_post_likes (post_id);
    CREATE INDEX IF NOT EXISTS idx_post_likes_user ON community_post_likes (user_id);
  `)

  // 3. Bảng lưu bình luận của bài viết cộng đồng
  db.exec(`
    CREATE TABLE IF NOT EXISTS community_post_comments (
      id TEXT PRIMARY KEY NOT NULL,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_email TEXT,
      user_avatar TEXT,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_post_comments_post ON community_post_comments (post_id);
    CREATE INDEX IF NOT EXISTS idx_post_comments_created ON community_post_comments (created_at ASC);
  `)

  // Tự động khởi tạo dữ liệu mẫu nếu bảng chưa có bài nào
  seedInitialDiscussions(db)

  dbInstance = db
  return dbInstance
}

/**
 * Khởi tạo dữ liệu mẫu ban đầu để tab không bị trống (chuẩn theo phong cách FireAnt)
 */
function seedInitialDiscussions(db: DatabaseSync) {
  try {
    const countRow = db.prepare(`SELECT COUNT(*) as c FROM community_posts`).get() as { c: number } | undefined
    if (countRow && countRow.c > 0) return

    const initialPosts = [
      {
        id: 'post_seed_mwg_1',
        symbol: 'MWG',
        user_id: 'user_analyst_longphan',
        user_name: 'LONG PHAN STOCK',
        user_email: 'longphan.stock@gmail.com',
        user_avatar: '',
        title: 'GOM MẠNH 3 SIÊU CỔ PHIẾU TEST CUNG NỔ VƯỢT NỀN TẢNG DƯ ĐỊA 20%',
        content: `GOM MẠNH 3 SIÊU CỔ PHIẾU TEST CUNG NỔ VƯỢT NỀN TẢNG DƯ ĐỊA 20%
Dòng tiền lớn đã quay trở lại nhóm bán lẻ tiêu dùng sau chu kỳ tái cấu trúc.
Khối lượng cạn kiệt ở vùng hỗ trợ mạnh, dòng tiền lớn hấp thụ toàn bộ áp lực chốt lời.
Mục tiêu ngắn hạn kiểm định vùng 78-82.
Chi tiết xem thêm tại kênh phân tích chuyên sâu!`,
        sentiment: 'bullish',
        tickers: JSON.stringify(['MWG', 'DGW', 'FRT', 'HPX']),
        likes_count: 5,
        comments_count: 3,
        created_at: '2026-09-12 21:49:00',
      },
      {
        id: 'post_seed_mwg_2',
        symbol: 'MWG',
        user_id: 'user_investor_kynguyen',
        user_name: 'Ky Nguyen',
        user_email: 'kynguyen.invest@gmail.com',
        user_avatar: '',
        title: 'Cổ phiếu Bán lẻ: Bước ngoặt Bách Hóa Xanh đóng góp lợi nhuận dương',
        content: `Cổ phiếu MWG: Bước ngoặt chuỗi Bách Hóa Xanh bắt đầu có lãi ròng từ quý trước, giải tỏa hoàn toàn áp lực gánh lỗ nhiều năm qua.
Biên lợi nhuận gộp toàn chuỗi hồi phục vượt 23.5%. Định giá hiện tại vẫn còn hấp dẫn so với tiềm năng tăng trưởng 2026-2027.`,
        sentiment: 'bullish',
        tickers: JSON.stringify(['MWG', 'FRT']),
        likes_count: 7,
        comments_count: 2,
        created_at: '2026-09-12 21:43:00',
      },
      {
        id: 'post_seed_aam_1',
        symbol: 'AAM',
        user_id: 'user_fishery_pro',
        user_name: 'Minh Thủy Sản - Value Invest',
        user_email: 'minh.fishery@gmail.com',
        user_avatar: '',
        title: 'AAM: Triển vọng xuất khẩu cá tra hồi phục quý 3 & 4',
        content: `AAM: Doanh nghiệp giữ tỷ lệ nợ vay ở mức cực kỳ an toàn, tiền mặt dồi dào và lượng đơn hàng xuất khẩu thủy sản sang các thị trường truyền thống đang gia tăng trở lại.
P/B đang ở mức dưới 1.0, cổ tức tiền mặt đều đặn qua các năm là điểm cộng lớn cho nhà đầu tư giá trị.`,
        sentiment: 'bullish',
        tickers: JSON.stringify(['AAM', 'VHC', 'ANV']),
        likes_count: 4,
        comments_count: 1,
        created_at: '2026-09-13 09:15:00',
      },
      {
        id: 'post_seed_fpt_1',
        symbol: 'FPT',
        user_id: 'user_tech_lead',
        user_name: 'Hoàng Tech Invest',
        user_email: 'hoang.fpt@gmail.com',
        user_avatar: '',
        title: 'FPT: Động lực tăng trưởng kép từ AI Factory và Dịch vụ CNTT toàn cầu',
        content: `Doanh thu chuyển đổi số và hợp tác chiến lược mảng bán dẫn/AI tiếp tục duy trì đà tăng trưởng trên 25% YoY. FPT vẫn là cổ phiếu trụ cột phòng thủ lẫn tấn công tối ưu của thị trường chứng khoán Việt Nam.`,
        sentiment: 'bullish',
        tickers: JSON.stringify(['FPT', 'CMG']),
        likes_count: 9,
        comments_count: 4,
        created_at: '2026-09-13 10:30:00',
      },
    ]

    const insertStmt = db.prepare(`
      INSERT INTO community_posts 
      (id, symbol, user_id, user_name, user_email, user_avatar, title, content, sentiment, tickers, likes_count, comments_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const p of initialPosts) {
      insertStmt.run(
        p.id,
        p.symbol,
        p.user_id,
        p.user_name,
        p.user_email,
        p.user_avatar,
        p.title,
        p.content,
        p.sentiment,
        p.tickers,
        p.likes_count,
        p.comments_count,
        p.created_at,
        p.created_at
      )
    }

    // Seed vài bình luận mẫu cho bài MWG
    const cmtStmt = db.prepare(`
      INSERT INTO community_post_comments
      (id, post_id, user_id, user_name, user_email, user_avatar, content, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    cmtStmt.run(
      'cmt_seed_1',
      'post_seed_mwg_1',
      'user_member_1',
      'Tuấn Vũ Stock',
      'tuanvu@gmail.com',
      '',
      'Đồng quan điểm với bác Long. MWG vùng này tích lũy nền rất chặt, dòng tiền Tây cũng bắt đầu mua ròng trở lại.',
      '2026-09-12 22:10:00'
    )

    cmtStmt.run(
      'cmt_seed_2',
      'post_seed_mwg_1',
      'user_member_2',
      'Bảo Ngọc F0',
      'baongoc@gmail.com',
      '',
      'Cho mình hỏi điểm mua gia tăng vùng 70.x có ổn không ạ?',
      '2026-09-12 22:30:00'
    )
  } catch (err) {
    console.error('[CommunityService] Seed error:', err)
  }
}

/**
 * Lấy danh sách bài viết cộng đồng của 1 mã cổ phiếu
 */
export function getCommunityPosts(
  symbol: string,
  userId?: string | null,
  sort: 'newest' | 'most_liked' = 'newest'
): CommunityPost[] {
  try {
    const db = getCommunityDb()
    const symUpper = symbol.toUpperCase().trim()

    let orderBy = 'datetime(p.created_at) DESC'
    if (sort === 'most_liked') {
      orderBy = 'p.likes_count DESC, datetime(p.created_at) DESC'
    }

    // Tìm các bài đăng trực tiếp về mã này HOẶC có gắn tag mã này trong danh sách tickers
    const sql = `
      SELECT 
        p.id,
        p.symbol,
        p.user_id as userId,
        p.user_name as userName,
        p.user_email as userEmail,
        p.user_avatar as userAvatar,
        p.title,
        p.content,
        p.sentiment,
        p.tickers,
        p.image_url as imageUrl,
        p.likes_count as likesCount,
        p.comments_count as commentsCount,
        p.created_at as createdAt,
        p.updated_at as updatedAt
      FROM community_posts p
      WHERE p.symbol = ? OR p.tickers LIKE ?
      ORDER BY ${orderBy}
    `

    const rows = db.prepare(sql).all(symUpper, `%"${symUpper}"%`) as any[]

    // Kiểm tra user đã like những bài nào
    let likedPostIds = new Set<string>()
    if (userId && rows.length > 0) {
      const placeholders = rows.map(() => '?').join(',')
      const postIds = rows.map((r) => r.id)
      const userLikes = db
        .prepare(`SELECT post_id FROM community_post_likes WHERE user_id = ? AND post_id IN (${placeholders})`)
        .all(userId, ...postIds) as Array<{ post_id: string }>
      likedPostIds = new Set(userLikes.map((l) => l.post_id))
    }

    return rows.map((r) => {
      let tickers: string[] = []
      try {
        tickers = r.tickers ? JSON.parse(r.tickers) : [r.symbol]
      } catch {
        tickers = [r.symbol]
      }

      return {
        id: r.id,
        symbol: r.symbol,
        userId: r.userId,
        userName: r.userName,
        userEmail: r.userEmail || '',
        userAvatar: r.userAvatar || '',
        title: r.title || '',
        content: r.content,
        sentiment: r.sentiment as MarketSentiment | null,
        tickers,
        imageUrl: r.imageUrl || '',
        likesCount: Number(r.likesCount) || 0,
        commentsCount: Number(r.commentsCount) || 0,
        isLiked: likedPostIds.has(r.id),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }
    })
  } catch (error) {
    console.error(`[CommunityService] getCommunityPosts error for ${symbol}:`, error)
    return []
  }
}

/**
 * Đăng bài phân tích mới
 */
export function createCommunityPost(
  symbol: string,
  user: UserAuthProfile,
  data: {
    title?: string
    content: string
    sentiment?: MarketSentiment | null
    tickers?: string[]
    imageUrl?: string
  }
): CommunityPost {
  const db = getCommunityDb()
  const content = (data.content || '').trim()
  if (!content) {
    throw new Error('Nội dung bài viết không được để trống')
  }

  const symUpper = symbol.toUpperCase().trim()
  const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

  // Đảm bảo mã hiện tại luôn có trong tickers
  const tickerList = Array.from(new Set([symUpper, ...(data.tickers || []).map((t) => t.toUpperCase().trim())]))
  const tickersJson = JSON.stringify(tickerList)

  const userName = user.name || user.email?.split('@')[0] || 'Nhà đầu tư'
  const userEmail = user.email || ''
  const userAvatar = user.avatar || ''
  const title = (data.title || '').trim()
  const sentiment = data.sentiment || null
  const imageUrl = (data.imageUrl || '').trim()

  const insertStmt = db.prepare(`
    INSERT INTO community_posts 
    (id, symbol, user_id, user_name, user_email, user_avatar, title, content, sentiment, tickers, image_url, likes_count, comments_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, datetime('now', 'localtime'), datetime('now', 'localtime'))
  `)

  insertStmt.run(
    postId,
    symUpper,
    user.id,
    userName,
    userEmail,
    userAvatar,
    title,
    content,
    sentiment,
    tickersJson,
    imageUrl
  )

  const getStmt = db.prepare(`
    SELECT 
      id, symbol, user_id as userId, user_name as userName, user_email as userEmail,
      user_avatar as userAvatar, title, content, sentiment, tickers, image_url as imageUrl,
      likes_count as likesCount, comments_count as commentsCount,
      created_at as createdAt, updated_at as updatedAt
    FROM community_posts
    WHERE id = ?
  `)

  const row = getStmt.get(postId) as any
  return {
    id: row.id,
    symbol: row.symbol,
    userId: row.userId,
    userName: row.userName,
    userEmail: row.userEmail || '',
    userAvatar: row.userAvatar || '',
    title: row.title || '',
    content: row.content,
    sentiment: row.sentiment as MarketSentiment | null,
    tickers: tickerList,
    imageUrl: row.imageUrl || '',
    likesCount: 0,
    commentsCount: 0,
    isLiked: false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/**
 * Xóa bài đăng (chỉ tác giả)
 */
export function deleteCommunityPost(postId: string, userId: string): boolean {
  const db = getCommunityDb()

  const checkStmt = db.prepare(`SELECT user_id FROM community_posts WHERE id = ?`)
  const found = checkStmt.get(postId) as { user_id: string } | undefined

  if (!found) return false
  if (found.user_id !== userId) {
    throw new Error('Bạn không có quyền xóa bài đăng này')
  }

  // Xóa bài đăng, likes và comments liên quan
  db.prepare(`DELETE FROM community_post_comments WHERE post_id = ?`).run(postId)
  db.prepare(`DELETE FROM community_post_likes WHERE post_id = ?`).run(postId)
  db.prepare(`DELETE FROM community_posts WHERE id = ?`).run(postId)

  return true
}

/**
 * Thích / Bỏ thích bài đăng
 */
export function toggleLikeCommunityPost(
  postId: string,
  user: UserAuthProfile
): { liked: boolean; likesCount: number } {
  const db = getCommunityDb()

  const checkStmt = db.prepare(`SELECT 1 FROM community_post_likes WHERE post_id = ? AND user_id = ?`)
  const exists = checkStmt.get(postId, user.id)

  if (exists) {
    // Bỏ thích
    db.prepare(`DELETE FROM community_post_likes WHERE post_id = ? AND user_id = ?`).run(postId, user.id)
    db.prepare(`UPDATE community_posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?`).run(postId)

    const countRow = db.prepare(`SELECT likes_count FROM community_posts WHERE id = ?`).get(postId) as { likes_count: number }
    return { liked: false, likesCount: countRow?.likes_count ?? 0 }
  } else {
    // Thích
    db.prepare(`
      INSERT INTO community_post_likes (post_id, user_id, user_name, created_at)
      VALUES (?, ?, ?, datetime('now', 'localtime'))
    `).run(postId, user.id, user.name || user.email?.split('@')[0] || 'Nhà đầu tư')

    db.prepare(`UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = ?`).run(postId)

    const countRow = db.prepare(`SELECT likes_count FROM community_posts WHERE id = ?`).get(postId) as { likes_count: number }
    return { liked: true, likesCount: countRow?.likes_count ?? 1 }
  }
}

/**
 * Lấy danh sách bình luận của 1 bài đăng
 */
export function getCommunityPostComments(postId: string): CommunityComment[] {
  try {
    const db = getCommunityDb()
    const stmt = db.prepare(`
      SELECT 
        id, 
        post_id as postId, 
        user_id as userId, 
        user_name as userName, 
        user_email as userEmail, 
        user_avatar as userAvatar, 
        content, 
        created_at as createdAt
      FROM community_post_comments
      WHERE post_id = ?
      ORDER BY datetime(created_at) ASC
    `)

    return (stmt.all(postId) as unknown) as CommunityComment[]
  } catch (error) {
    console.error(`[CommunityService] getCommunityPostComments error for ${postId}:`, error)
    return []
  }
}

/**
 * Thêm bình luận vào bài đăng
 */
export function addCommunityPostComment(
  postId: string,
  user: UserAuthProfile,
  content: string
): { comment: CommunityComment; commentsCount: number } {
  const db = getCommunityDb()
  const trimmed = content.trim()
  if (!trimmed) {
    throw new Error('Nội dung bình luận không được để trống')
  }

  const commentId = `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const userName = user.name || user.email?.split('@')[0] || 'Nhà đầu tư'
  const userEmail = user.email || ''
  const userAvatar = user.avatar || ''

  db.prepare(`
    INSERT INTO community_post_comments 
    (id, post_id, user_id, user_name, user_email, user_avatar, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `).run(commentId, postId, user.id, userName, userEmail, userAvatar, trimmed)

  // Cập nhật số lượng comment trong bài viết
  db.prepare(`UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = ?`).run(postId)

  const getStmt = db.prepare(`
    SELECT 
      id, post_id as postId, user_id as userId, user_name as userName,
      user_email as userEmail, user_avatar as userAvatar, content, created_at as createdAt
    FROM community_post_comments
    WHERE id = ?
  `)
  const newComment = (getStmt.get(commentId) as unknown) as CommunityComment

  const postRow = db.prepare(`SELECT comments_count FROM community_posts WHERE id = ?`).get(postId) as { comments_count: number }

  return {
    comment: newComment,
    commentsCount: postRow?.comments_count ?? 1,
  }
}

/**
 * Xóa bình luận bài đăng
 */
export function deleteCommunityPostComment(
  commentId: string,
  userId: string
): { success: boolean; commentsCount: number; postId?: string } {
  const db = getCommunityDb()

  const findStmt = db.prepare(`SELECT post_id, user_id FROM community_post_comments WHERE id = ?`)
  const found = findStmt.get(commentId) as { post_id: string; user_id: string } | undefined

  if (!found) {
    return { success: false, commentsCount: 0 }
  }

  if (found.user_id !== userId) {
    throw new Error('Bạn không có quyền xóa bình luận này')
  }

  db.prepare(`DELETE FROM community_post_comments WHERE id = ?`).run(commentId)
  db.prepare(`UPDATE community_posts SET comments_count = MAX(0, comments_count - 1) WHERE id = ?`).run(found.post_id)

  const countRow = db.prepare(`SELECT comments_count FROM community_posts WHERE id = ?`).get(found.post_id) as { comments_count: number }

  return {
    success: true,
    commentsCount: countRow?.comments_count ?? 0,
    postId: found.post_id,
  }
}
