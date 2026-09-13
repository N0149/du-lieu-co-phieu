import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export interface ArticleComment {
  id: string
  articleId: string
  userId: string
  userEmail: string
  userName: string
  userAvatar?: string
  content: string
  createdAt: string
}

export interface ArticleEngagement {
  articleId: string
  likesCount: number
  commentsCount: number
  isLiked: boolean
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
const DB_PATH = path.join(DB_DIR, 'article_interactions.db')

let dbInstance: DatabaseSync | null = null

export function getInteractionsDb(): DatabaseSync {
  if (dbInstance) return dbInstance

  if (!fs.existsSync(DB_DIR)) {
    try {
      fs.mkdirSync(DB_DIR, { recursive: true })
    } catch {}
  }

  const db = new DatabaseSync(DB_PATH)

  // Bật WAL mode cho SQLite để xử lý ghi/đọc đồng thời nhanh và mượt mà
  try {
    db.exec(`PRAGMA journal_mode = WAL;`)
  } catch {}

  // 1. Bảng lưu lượt Like bài viết
  db.exec(`
    CREATE TABLE IF NOT EXISTS article_likes (
      article_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_email TEXT,
      user_name TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      PRIMARY KEY (article_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_likes_article_id ON article_likes (article_id);
    CREATE INDEX IF NOT EXISTS idx_likes_user_id ON article_likes (user_id);
  `)

  // 2. Bảng lưu Bình luận bài viết
  db.exec(`
    CREATE TABLE IF NOT EXISTS article_comments (
      id TEXT PRIMARY KEY NOT NULL,
      article_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_email TEXT,
      user_name TEXT,
      user_avatar TEXT,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_comments_article_id ON article_comments (article_id);
    CREATE INDEX IF NOT EXISTS idx_comments_user_id ON article_comments (user_id);
    CREATE INDEX IF NOT EXISTS idx_comments_created_at ON article_comments (created_at DESC);
  `)

  dbInstance = db
  return dbInstance
}

/**
 * Lấy số lượt like, số bình luận và trạng thái like của user cho 1 bài viết
 */
export function getArticleEngagement(
  articleId: string,
  userId?: string | null
): ArticleEngagement {
  try {
    const db = getInteractionsDb()

    const likesStmt = db.prepare(`SELECT COUNT(*) as count FROM article_likes WHERE article_id = ?`)
    const likesRow = likesStmt.get(articleId) as { count: number } | undefined
    const likesCount = likesRow?.count ?? 0

    const commentsStmt = db.prepare(`SELECT COUNT(*) as count FROM article_comments WHERE article_id = ?`)
    const commentsRow = commentsStmt.get(articleId) as { count: number } | undefined
    const commentsCount = commentsRow?.count ?? 0

    let isLiked = false
    if (userId) {
      const userLikeStmt = db.prepare(`SELECT 1 FROM article_likes WHERE article_id = ? AND user_id = ?`)
      const userLikeRow = userLikeStmt.get(articleId, userId)
      isLiked = Boolean(userLikeRow)
    }

    return {
      articleId,
      likesCount,
      commentsCount,
      isLiked,
    }
  } catch (error) {
    console.error(`[Interactions] getArticleEngagement error for ${articleId}:`, error)
    return {
      articleId,
      likesCount: 0,
      commentsCount: 0,
      isLiked: false,
    }
  }
}

/**
 * Lấy hàng loạt thống kê tương tác cho danh sách bài viết (dùng cho feed tab Bài viết)
 */
export function getBatchArticleEngagement(
  articleIds: string[],
  userId?: string | null
): Record<string, ArticleEngagement> {
  const result: Record<string, ArticleEngagement> = {}
  if (!articleIds || articleIds.length === 0) return result

  // Khởi tạo mặc định cho tất cả id
  for (const id of articleIds) {
    result[id] = {
      articleId: id,
      likesCount: 0,
      commentsCount: 0,
      isLiked: false,
    }
  }

  try {
    const db = getInteractionsDb()

    // Query đếm Likes
    const placeholders = articleIds.map(() => '?').join(',')
    const likesSql = `
      SELECT article_id, COUNT(*) as count 
      FROM article_likes 
      WHERE article_id IN (${placeholders}) 
      GROUP BY article_id
    `
    const likesRows = db.prepare(likesSql).all(...articleIds) as Array<{ article_id: string; count: number }>
    for (const row of likesRows) {
      if (result[row.article_id]) {
        result[row.article_id].likesCount = row.count
      }
    }

    // Query đếm Comments
    const commentsSql = `
      SELECT article_id, COUNT(*) as count 
      FROM article_comments 
      WHERE article_id IN (${placeholders}) 
      GROUP BY article_id
    `
    const commentsRows = db.prepare(commentsSql).all(...articleIds) as Array<{ article_id: string; count: number }>
    for (const row of commentsRows) {
      if (result[row.article_id]) {
        result[row.article_id].commentsCount = row.count
      }
    }

    // Query kiểm tra User đã like những bài nào
    if (userId) {
      const userLikesSql = `
        SELECT article_id 
        FROM article_likes 
        WHERE user_id = ? AND article_id IN (${placeholders})
      `
      const userLikesRows = db.prepare(userLikesSql).all(userId, ...articleIds) as Array<{ article_id: string }>
      for (const row of userLikesRows) {
        if (result[row.article_id]) {
          result[row.article_id].isLiked = true
        }
      }
    }
  } catch (error) {
    console.error('[Interactions] getBatchArticleEngagement error:', error)
  }

  return result
}

/**
 * Thả tim hoặc Bỏ thích bài viết (Toggle Like)
 */
export function toggleLikeArticle(
  articleId: string,
  user: UserAuthProfile
): { liked: boolean; likesCount: number } {
  const db = getInteractionsDb()

  const checkStmt = db.prepare(`SELECT 1 FROM article_likes WHERE article_id = ? AND user_id = ?`)
  const exists = checkStmt.get(articleId, user.id)

  if (exists) {
    // Đã like -> Xóa like (Unlike)
    const deleteStmt = db.prepare(`DELETE FROM article_likes WHERE article_id = ? AND user_id = ?`)
    deleteStmt.run(articleId, user.id)

    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM article_likes WHERE article_id = ?`)
    const countRow = countStmt.get(articleId) as { count: number }
    return { liked: false, likesCount: countRow?.count ?? 0 }
  } else {
    // Chưa like -> Thêm like
    const insertStmt = db.prepare(`
      INSERT INTO article_likes (article_id, user_id, user_email, user_name, created_at)
      VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
    `)
    insertStmt.run(
      articleId,
      user.id,
      user.email || '',
      user.name || user.email?.split('@')[0] || 'Nhà đầu tư'
    )

    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM article_likes WHERE article_id = ?`)
    const countRow = countStmt.get(articleId) as { count: number }
    return { liked: true, likesCount: countRow?.count ?? 1 }
  }
}

/**
 * Lấy danh sách bình luận của 1 bài viết
 */
export function getArticleComments(articleId: string): ArticleComment[] {
  try {
    const db = getInteractionsDb()
    const stmt = db.prepare(`
      SELECT 
        id, 
        article_id as articleId, 
        user_id as userId, 
        user_email as userEmail, 
        user_name as userName, 
        user_avatar as userAvatar, 
        content, 
        created_at as createdAt
      FROM article_comments
      WHERE article_id = ?
      ORDER BY datetime(created_at) ASC
    `)

    return (stmt.all(articleId) as unknown) as ArticleComment[]
  } catch (error) {
    console.error(`[Interactions] getArticleComments error for ${articleId}:`, error)
    return []
  }
}

/**
 * Thêm bình luận mới vào bài viết
 */
export function addArticleComment(
  articleId: string,
  user: UserAuthProfile,
  content: string
): { comment: ArticleComment; commentsCount: number } {
  const db = getInteractionsDb()
  const trimmed = content.trim()
  if (!trimmed) {
    throw new Error('Nội dung bình luận không được để trống')
  }

  const commentId = `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const userName = user.name || user.email?.split('@')[0] || 'Nhà đầu tư'
  const userAvatar = user.avatar || ''
  const userEmail = user.email || ''

  const insertStmt = db.prepare(`
    INSERT INTO article_comments (id, article_id, user_id, user_email, user_name, user_avatar, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `)

  insertStmt.run(commentId, articleId, user.id, userEmail, userName, userAvatar, trimmed)

  // Lấy bản ghi vừa tạo
  const getStmt = db.prepare(`
    SELECT 
      id, 
      article_id as articleId, 
      user_id as userId, 
      user_email as userEmail, 
      user_name as userName, 
      user_avatar as userAvatar, 
      content, 
      created_at as createdAt
    FROM article_comments
    WHERE id = ?
  `)
  const newComment = (getStmt.get(commentId) as unknown) as ArticleComment

  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM article_comments WHERE article_id = ?`)
  const countRow = countStmt.get(articleId) as { count: number }

  return {
    comment: newComment,
    commentsCount: countRow?.count ?? 1,
  }
}

/**
 * Xóa bình luận bài viết (chỉ tác giả hoặc admin mới xóa được)
 */
export function deleteArticleComment(
  commentId: string,
  userId: string
): { success: boolean; commentsCount: number; articleId?: string } {
  const db = getInteractionsDb()

  const findStmt = db.prepare(`SELECT article_id, user_id FROM article_comments WHERE id = ?`)
  const found = findStmt.get(commentId) as { article_id: string; user_id: string } | undefined

  if (!found) {
    return { success: false, commentsCount: 0 }
  }

  if (found.user_id !== userId) {
    throw new Error('Bạn không có quyền xóa bình luận này')
  }

  const deleteStmt = db.prepare(`DELETE FROM article_comments WHERE id = ?`)
  deleteStmt.run(commentId)

  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM article_comments WHERE article_id = ?`)
  const countRow = countStmt.get(found.article_id) as { count: number }

  return {
    success: true,
    commentsCount: countRow?.count ?? 0,
    articleId: found.article_id,
  }
}
