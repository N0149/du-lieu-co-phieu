// Vietnamese number formatting helpers (dấu chấm phân cách nghìn, dấu phẩy thập phân)

export function fmtPrice(v: number): string {
  return v.toLocaleString('vi-VN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

export function fmtNum(v: number, digits = 1): string {
  return v.toLocaleString('vi-VN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function fmtInt(v: number | null | undefined): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    return '0'
  }
  return v.toLocaleString('vi-VN', { maximumFractionDigits: 0 })
}

export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    return '-'
  }
  const sign = v > 0 ? '+' : ''
  return `${sign}${fmtNum(v, digits)}%`
}

export function fmtBillion(v: number): string {
  return v.toLocaleString('vi-VN', { maximumFractionDigits: 0 })
}
