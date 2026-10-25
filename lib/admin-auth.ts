// lib/admin-auth.ts
// Quản lý danh sách và kiểm tra quyền Quản trị viên (Admin)

export const ADMIN_EMAILS: readonly string[] = [
  'trungnhat232@gmail.com',
]

/**
 * Kiểm tra xem một email có quyền Quản trị viên hay không
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false
  const normalized = email.trim().toLowerCase()
  return ADMIN_EMAILS.some((admin) => admin.toLowerCase() === normalized)
}
