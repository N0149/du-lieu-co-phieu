export interface MacroMeta {
  group: string;
  groupKey: string;
  name: string;
  slug: string;
  apiPath: string;
  defaultTimeFrame: string;
  defaultValueType: string;
  supportedTimeFrames: string[];
  supportedValueTypes: string[];
  unit: string;
  description: string;
  updatedAt?: string;
  latestPeriod?: string | null;
  latestValue?: number | null;
}

export interface MacroChildMetric {
  id: string;
  name: string;
  column_name?: string;
  table_name?: string;
  level?: number;
  data: [number, number | null][]; // [timestamp, value]
  child?: MacroChildMetric[];
}

export interface MacroParentGroup {
  title: string;
  child: MacroChildMetric[];
}

export interface MacroDataset {
  title: string;
  headers: string[]; // ["06-2026", "03-2026", ...]
  parent: MacroParentGroup[];
}

export interface MacroRecord {
  meta: MacroMeta;
  datasets: {
    [timeFrame: string]: {
      [valueType: string]: MacroDataset;
    };
  };
}

export interface MacroCatalog {
  total: number;
  updatedAt: string;
  indicators: MacroMeta[];
}

export interface MacroSummaryItem {
  name: string;
  slug: string;
  group: string;
  groupKey: string;
  unit: string;
  description: string;
  defaultTimeFrame: string;
  defaultValueType: string;
  latestPeriod: string | null;
  latestValue: number | null;
  updatedAt: string;
}

export interface MacroSummary {
  total: number;
  updatedAt: string;
  summary: MacroSummaryItem[];
}

// Định dạng số hiển thị chuẩn Việt Nam (dùng được cả Client và Server)
export function formatMacroValue(val: number | null | undefined, unit?: string): string {
  if (val === null || val === undefined || isNaN(val)) return '—';

  const abs = Math.abs(val);
  let decimals = 2;
  if (abs >= 100000) decimals = 0;
  else if (abs >= 1000) decimals = 1;
  else if (abs < 1) decimals = 2;

  const formatted = new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(val);

  return unit ? `${formatted} ${unit}` : formatted;
}

// Chuyển đổi mã kỳ thành nhãn dễ đọc (vd: 06-2026 -> Q2-2026 cho kỳ quý, hoặc T06/2026 cho kỳ tháng)
export function formatPeriodLabel(header: string, timeFrame: string): string {
  if (!header) return '';
  const parts = header.split('-');
  if (parts.length === 2) {
    const [monthOrDay, year] = parts;
    const m = parseInt(monthOrDay, 10);
    if (timeFrame === 'quarterly') {
      if (m <= 3) return `Q1-${year}`;
      if (m <= 6) return `Q2-${year}`;
      if (m <= 9) return `Q3-${year}`;
      return `Q4-${year}`;
    }
    if (timeFrame === 'monthly') {
      return `T${monthOrDay}/${year}`;
    }
    if (timeFrame === 'yearly') {
      return `Năm ${year}`;
    }
  }
  return header;
}
