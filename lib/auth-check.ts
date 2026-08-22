// ─────────────────────────────────────────────────────────────────────────────
// lib/auth-check.ts — Kiểm tra quyền truy cập báo cáo (7 ngày dùng thử + VIP)
//
// Module này CHỈ chứa logic thuần (types + hàm tính toán), KHÔNG import
// `next/headers` nên an toàn cho cả Server Component lẫn Client Component.
// Phần đọc/ghi cookie (server-only) nằm riêng ở `lib/session.ts`.
// ─────────────────────────────────────────────────────────────────────────────

/** Số ngày dùng thử miễn phí kể từ khi tạo tài khoản */
export const TRIAL_DAYS = 7

/** Tên cookie chứa session người dùng (giá trị là JSON của `UserProfile`) */
export const SESSION_COOKIE_NAME = 'dulieucophieu_session'

/**
 * Trạng thái quyền truy cập hiện tại của người dùng.
 * - `UNAUTHENTICATED`      : chưa đăng nhập
 * - `TRIAL_ACTIVE`         : đang trong 7 ngày dùng thử
 * - `SUBSCRIPTION_ACTIVE`  : đã nâng cấp tài khoản (Active / VIP)
 * - `EXPIRED`              : đã qua `trial_ends_at`, chưa nâng cấp
 */
export type AccessStatus =
  | 'UNAUTHENTICATED'
  | 'TRIAL_ACTIVE'
  | 'SUBSCRIPTION_ACTIVE'
  | 'EXPIRED'

/**
 * Hồ sơ người dùng đọc từ session (cookie).
 * - `status`: `'active'` → đã nâng cấp VIP; `'trial'` → đang dùng thử;
 *   `'inactive'` → hết hạn / bị khóa.
 * - `trial_started_at` / `trial_ends_at`: mốc thời gian ISO 8601 (UTC).
 *   `trial_ends_at` mặc định = `trial_started_at` + 7 ngày.
 */
export type UserProfile = {
  id: string
  email: string
  name?: string
  status: 'active' | 'trial' | 'inactive'
  trial_started_at: string
  trial_ends_at: string
  /** Gói dịch vụ: `'vip'` (đã nâng cấp) / `'free'` (đang dùng thử) */
  plan?: string
  /** Thời điểm kích hoạt VIP (ISO) — null nếu chưa nâng cấp */
  activated_at?: string | null
  createdAt?: string
}

/** Kết quả kiểm tra quyền truy cập (kèm thời gian dùng thử còn lại) */
export type AccessResult = {
  status: AccessStatus
  /** Số ngày còn lại của dùng thử (làm tròn lên), 0 nếu không phải TRIAL_ACTIVE */
  daysRemaining: number
  /** Số giờ còn lại của dùng thử (tối thiểu 1 nếu còn hạn), 0 nếu không phải TRIAL_ACTIVE */
  hoursRemaining: number
  /** Mốc hết hạn dùng thử (ISO 8601) — null nếu không có */
  expiresAt: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

/** Kiểm tra chuỗi có phải timestamp ISO hợp lệ không (tránh NaN). */
function isValidIso(value: string | null | undefined): value is string {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime())
}

/**
 * Tính số ngày/giờ còn lại cho đến mốc `expiresAt` (tính từ thời điểm hiện tại).
 * Trả về `{ days, hours }` — cả hai >= 0; trả 0 nếu thiếu/không hợp lệ/đã qua hạn.
 */
export function timeRemainingUntil(expiresAt: string | null | undefined): {
  days: number
  hours: number
} {
  if (!isValidIso(expiresAt)) return { days: 0, hours: 0 }

  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return { days: 0, hours: 0 }

  return {
    days: Math.ceil(diff / DAY_MS),
    hours: Math.max(1, Math.ceil(diff / HOUR_MS)),
  }
}

/**
 * Xác định trạng thái quyền truy cập hiện tại của người dùng.
 *
 * - `userProfile === null` (chưa đăng nhập)              → `UNAUTHENTICATED`
 * - `userProfile.status === 'active'` (đã nâng cấp)       → `SUBSCRIPTION_ACTIVE`
 * - Ngày hiện tại <= `trial_ends_at` (7 ngày từ lúc tạo)   → `TRIAL_ACTIVE` (kèm ngày/giờ còn lại)
 * - Ngày hiện tại > `trial_ends_at`                       → `EXPIRED`
 */
export function checkUserAccess(userProfile: UserProfile | null): AccessResult {
  // 1. Chưa đăng nhập → yêu cầu đăng nhập để bắt đầu dùng thử
  if (!userProfile) {
    return {
      status: 'UNAUTHENTICATED',
      daysRemaining: 0,
      hoursRemaining: 0,
      expiresAt: null,
    }
  }

  // 2. Tài khoản đã nâng cấp (status === 'active') → truy cập không giới hạn
  if (userProfile.status === 'active') {
    return {
      status: 'SUBSCRIPTION_ACTIVE',
      daysRemaining: 0,
      hoursRemaining: 0,
      expiresAt: userProfile.activated_at ?? null,
    }
  }

  // 3. Chưa nâng cấp → kiểm tra cửa sổ dùng thử 7 ngày
  const endsAt = userProfile.trial_ends_at
  if (!isValidIso(endsAt)) {
    // Thiếu / sai định dạng mốc hết hạn → không còn quyền truy cập
    return {
      status: 'EXPIRED',
      daysRemaining: 0,
      hoursRemaining: 0,
      expiresAt: endsAt ?? null,
    }
  }

  if (new Date(endsAt).getTime() >= Date.now()) {
    const { days, hours } = timeRemainingUntil(endsAt)
    return {
      status: 'TRIAL_ACTIVE',
      daysRemaining: days,
      hoursRemaining: hours,
      expiresAt: endsAt,
    }
  }

  // 4. Đã qua `trial_ends_at` → hết hạn dùng thử
  return {
    status: 'EXPIRED',
    daysRemaining: 0,
    hoursRemaining: 0,
    expiresAt: endsAt,
  }
}

/** Trạng thái có được phép mở nội dung chi tiết báo cáo hay không. */
export function canAccessReport(status: AccessStatus): boolean {
  return status === 'TRIAL_ACTIVE' || status === 'SUBSCRIPTION_ACTIVE'
}
