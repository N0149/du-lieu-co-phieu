'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface ChartWatermarkProps {
  /** Địa chỉ web hiển thị in chìm (mặc định: dulieudautu.com - luôn viết thường) */
  domain?: string
  /** Tên thương hiệu phụ hiển thị bên dưới (mặc định: Dữ Liệu Đầu Tư) */
  brandName?: string
  /** Vị trí: 'top-center' (mặc định: giữa trên) | 'center' | 'bottom-center' */
  position?: 'top-center' | 'center' | 'bottom-center'
  /** Góc xoay (độ), mặc định: 0 (nằm ngang ngay giữa trên để không che cột) */
  rotate?: number
  /** Kích thước: 'sm' | 'md' | 'lg' */
  size?: 'sm' | 'md' | 'lg'
  /** ClassName bổ sung cho wrapper */
  className?: string
  /** Tùy chọn làm mờ tùy biến */
  opacityClass?: string
}

/**
 * Watermark in chìm thương hiệu và địa chỉ website trên biểu đồ.
 *
 * Mặc định:
 * - Đặt ở "giữa trên" (top-center) của biểu đồ, nằm ngang, hoàn toàn không có khung nền che cột.
 * - Địa chỉ web luôn viết thường: "dulieudautu.com".
 * - Không cản trở hover/tooltip/click vào các cột/đường đồ thị nhờ `pointer-events-none`.
 * - Stacking `z-10` đảm bảo luôn hiển thị nổi trên nền lưới đồ thị.
 */
export function ChartWatermark({
  domain = 'dulieudautu.com',
  brandName = 'Dữ Liệu Đầu Tư',
  position = 'top-center',
  rotate = 0,
  size = 'md',
  className,
  opacityClass,
}: ChartWatermarkProps) {
  const formattedDomain = (domain || 'dulieudautu.com').toLowerCase()

  const sizeClasses = {
    sm: {
      domain: 'text-xs sm:text-[13px] font-mono font-bold tracking-wider',
      sub: 'text-[9px] uppercase tracking-[0.2em]',
    },
    md: {
      domain: 'text-sm sm:text-base font-mono font-bold tracking-wider',
      sub: 'text-[10px] uppercase tracking-[0.25em]',
    },
    lg: {
      domain: 'text-base sm:text-lg md:text-xl font-mono font-bold tracking-widest',
      sub: 'text-[11px] sm:text-xs uppercase tracking-[0.3em]',
    },
  }[size]

  const positionClasses = {
    'top-center': 'top-2 inset-x-0 justify-start',
    center: 'inset-0 items-center justify-center',
    'bottom-center': 'bottom-2 inset-x-0 justify-end',
  }[position]

  return (
    <div
      className={cn(
        'pointer-events-none absolute z-10 flex flex-col items-center select-none text-center',
        positionClasses,
        className,
      )}
      aria-hidden="true"
    >
      <div
        className={cn(
          'flex flex-col items-center justify-center transition-opacity',
          rotate !== 0 && 'transform',
          opacityClass,
        )}
        style={rotate !== 0 ? { transform: `rotate(${rotate}deg)` } : undefined}
      >
        <span
          className={cn(
            'lowercase whitespace-nowrap text-white/35 dark:text-white/40 drop-shadow-xs',
            sizeClasses.domain,
          )}
        >
          {formattedDomain}
        </span>
        {brandName && (
          <span
            className={cn(
              'mt-0.5 uppercase whitespace-nowrap text-white/20 dark:text-white/25 font-semibold',
              sizeClasses.sub,
            )}
          >
            {brandName}
          </span>
        )}
      </div>
    </div>
  )
}

export default ChartWatermark
