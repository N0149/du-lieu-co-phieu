import fs from 'fs';
import path from 'path';
import {
  MacroMeta,
  MacroRecord,
  MacroCatalog,
  MacroSummary,
} from './macro-types';

export * from './macro-types';

const MACRO_DIR = path.join(process.cwd(), 'data', 'macro');

// Lấy danh mục tất cả chỉ tiêu vĩ mô (Chạy trên Server)
export function getMacroCatalog(): MacroCatalog | null {
  try {
    const catalogPath = path.join(MACRO_DIR, 'catalog.json');
    if (!fs.existsSync(catalogPath)) return null;
    const raw = fs.readFileSync(catalogPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[getMacroCatalog] Lỗi đọc catalog.json:', err);
    return null;
  }
}

// Lấy bản tin tóm tắt chỉ số mới nhất (Chạy trên Server)
export function getMacroSummary(): MacroSummary | null {
  try {
    const summaryPath = path.join(MACRO_DIR, 'summary.json');
    if (!fs.existsSync(summaryPath)) return null;
    const raw = fs.readFileSync(summaryPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[getMacroSummary] Lỗi đọc summary.json:', err);
    return null;
  }
}

// Lấy chi tiết toàn bộ dữ liệu của một chỉ tiêu vĩ mô theo slug (Chạy trên Server)
export function getMacroIndicator(slug: string): MacroRecord | null {
  try {
    const filePath = path.join(MACRO_DIR, `${slug}.json`);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[getMacroIndicator] Lỗi đọc file ${slug}.json:`, err);
    return null;
  }
}
