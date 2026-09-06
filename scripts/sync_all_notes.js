/**
 * Script trích xuất và đồng bộ hàng loạt dữ liệu Thuyết minh BCTC cho TOÀN BỘ danh mục cổ phiếu
 * từ cơ sở dữ liệu SQLite nội bộ (data/financial_statements.db).
 *
 * Nhóm khoản mục:
 * 1. Tiền chi mua sắm TSCĐ & Khấu hao (từ Báo cáo Lưu chuyển tiền tệ - LCTT)
 * 2. Các khoản mục Dự phòng (từ Bảng Cân đối kế toán - CĐKT)
 * 3. Doanh thu tài chính & Chi phí lãi vay (từ Báo cáo Kết quả kinh doanh - KQKD)
 *
 * Xuất dữ liệu: data/notes-cache/[ticker].json
 */

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT_DIR = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT_DIR, 'data', 'financial_statements.db');
const OUTPUT_DIR = path.join(ROOT_DIR, 'data', 'notes-cache');

function parseQuarterYear(dateStr) {
  if (!dateStr) return { year: null, quarter: null };
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  if (parts.length >= 2) {
    const month = parseInt(parts[1], 10);
    const quarter = Math.ceil(month / 3);
    return { year, quarter };
  }
  return { year, quarter: null };
}

function findRow(tableRows, candidateNames) {
  if (!Array.isArray(tableRows)) return null;
  const names = Array.isArray(candidateNames) ? candidateNames : [candidateNames];

  // 1. Khớp chính xác (case-insensitive)
  for (const name of names) {
    const target = name.toLowerCase().trim();
    const row = tableRows.find(
      (r) => r[0] && String(r[0]).toLowerCase().trim() === target
    );
    if (row) return row;
  }

  // 2. Khớp chứa chuỗi (contains)
  for (const name of names) {
    const target = name.toLowerCase().trim();
    const row = tableRows.find(
      (r) => r[0] && String(r[0]).toLowerCase().trim().includes(target)
    );
    if (row) return row;
  }

  return null;
}

// Định nghĩa cấu hình các chỉ tiêu cần bóc tách
function getTargetSpecs(cdkt, kqkd, lctt) {
  return [
    // 1. LCTT: Capex & Khấu hao
    {
      category: 'capex_khau_hao',
      item_code: 'capex_mua_sam_tscd',
      item_name: 'Tiền chi mua sắm, xây dựng TSCĐ và TSDLH khác',
      table: lctt,
      candidates: [
        'Tiền chi để mua sắm, xây dựng TSCĐ và các tài sản dài hạn khác',
        'Tiền chi mua sắm, xây dựng TSCĐ và các tài sản dài hạn khác',
        'mua sắm, xây dựng tscđ'
      ],
      unit: 'VND'
    },
    {
      category: 'capex_khau_hao',
      item_code: 'khau_hao_tscd',
      item_name: 'Khấu hao TSCĐ và BĐSĐT',
      table: lctt,
      candidates: [
        'Khấu hao TSCĐ và BĐSĐT',
        'Khấu hao tài sản cố định',
        'khấu hao tscđ'
      ],
      unit: 'VND'
    },

    // 2. CĐKT: Các khoản mục Dự phòng
    {
      category: 'du_phong',
      item_code: 'du_phong_phai_thu_ngan_han',
      item_name: 'Dự phòng phải thu ngắn hạn khó đòi',
      table: cdkt,
      candidates: [
        'Dự phòng nợ khó đòi',
        'Dự phòng phải thu ngắn hạn khó đòi',
        'phải thu ngắn hạn khó đòi'
      ],
      unit: 'VND'
    },
    {
      category: 'du_phong',
      item_code: 'du_phong_giam_gia_htk',
      item_name: 'Dự phòng giảm giá hàng tồn kho',
      table: cdkt,
      candidates: [
        'Dự phòng giảm giá hàng tồn kho',
        'giảm giá hàng tồn kho'
      ],
      unit: 'VND'
    },
    {
      category: 'du_phong',
      item_code: 'du_phong_phai_thu_dai_han',
      item_name: 'Dự phòng phải thu dài hạn khó đòi',
      table: cdkt,
      candidates: [
        'Dự phòng phải thu dài hạn',
        'Dự phòng phải thu dài hạn khó đòi'
      ],
      unit: 'VND'
    },
    {
      category: 'du_phong',
      item_code: 'du_phong_dau_tu_tc_dai_han',
      item_name: 'Dự phòng giảm giá đầu tư dài hạn',
      table: cdkt,
      candidates: [
        'Dự phòng giảm giá đầu tư dài hạn',
        'Dự phòng tổn thất đầu tư vào đơn vị khác'
      ],
      unit: 'VND'
    },

    // 3. KQKD: Doanh thu tài chính & Chi phí lãi vay
    {
      category: 'tai_chinh',
      item_code: 'doanh_thu_tai_chinh',
      item_name: 'Doanh thu hoạt động tài chính',
      table: kqkd,
      candidates: [
        'Doanh thu hoạt động tài chính',
        'doanh thu tài chính'
      ],
      unit: 'VND'
    },
    {
      category: 'tai_chinh',
      item_code: 'chi_phi_tai_chinh',
      item_name: 'Chi phí tài chính',
      table: kqkd,
      candidates: [
        'Chi phí tài chính'
      ],
      unit: 'VND'
    },
    {
      category: 'tai_chinh',
      item_code: 'chi_phi_lai_vay',
      item_name: 'Trong đó: Chi phí lãi vay',
      table: kqkd,
      candidates: [
        'Chi phí lãi vay',
        '- Trong đó: Chi phí lãi vay'
      ],
      unit: 'VND'
    }
  ];
}

function processSymbol(row) {
  if (!row || !row.fiscal_dates) return null;

  const dates = JSON.parse(row.fiscal_dates);
  if (!Array.isArray(dates) || dates.length === 0) return null;

  const cdkt = row.cdkt ? JSON.parse(row.cdkt) : [];
  const kqkd = row.kqkd ? JSON.parse(row.kqkd) : [];
  const lctt = row.lctt ? JSON.parse(row.lctt) : [];

  const specs = getTargetSpecs(cdkt, kqkd, lctt);
  const mappedSpecs = specs.map((spec) => ({
    ...spec,
    matchedRow: findRow(spec.table, spec.candidates)
  }));

  const records = [];

  for (let i = 0; i < dates.length; i++) {
    const dateStr = dates[i];
    const { year, quarter } = parseQuarterYear(dateStr);

    // Chỉ lấy từ năm 2024 trở về trước
    if (!year || year > 2024) continue;

    const colIdx = i + 1;

    for (const spec of mappedSpecs) {
      let val = null;
      if (spec.matchedRow && spec.matchedRow[colIdx] !== undefined && spec.matchedRow[colIdx] !== null) {
        const num = Number(spec.matchedRow[colIdx]);
        val = !isNaN(num) ? num : 0;
      }

      records.push({
        date: dateStr,
        year,
        quarter,
        category: spec.category,
        item_code: spec.item_code,
        item_name: spec.item_name,
        value: val,
        unit: spec.unit
      });
    }
  }

  records.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.quarter !== b.quarter) return (a.quarter || 0) - (b.quarter || 0);
    return a.item_code.localeCompare(b.item_code);
  });

  return records;
}

function main() {
  const startTime = Date.now();
  console.log(`[ETL Batch] Bắt đầu tiến trình đồng bộ toàn bộ danh mục...`);
  console.log(`[ETL Batch] Database: ${DB_PATH}`);

  if (!fs.existsSync(DB_PATH)) {
    console.error(`[Lỗi] Không tìm thấy database tại: ${DB_PATH}`);
    process.exit(1);
  }

  // Đảm bảo thư mục lưu trữ tồn tại
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);

  // Lấy danh sách toàn bộ các ticker duy nhất
  const tickerRows = db.prepare(`
    SELECT DISTINCT symbol
    FROM financial_statements
    WHERE period_type = 'quarter'
    ORDER BY symbol ASC
  `).all();

  const totalTickers = tickerRows.length;
  console.log(`[ETL Batch] Tìm thấy ${totalTickers} mã cổ phiếu có dữ liệu quý.`);

  const stmtGet = db.prepare(`
    SELECT fiscal_dates, cdkt, kqkd, lctt
    FROM financial_statements
    WHERE symbol = ? AND period_type = 'quarter'
  `);

  let successCount = 0;
  let skippedCount = 0;

  for (let idx = 0; idx < totalTickers; idx++) {
    const symbol = tickerRows[idx].symbol.trim().toUpperCase();
    const currentNum = idx + 1;

    try {
      const row = stmtGet.get(symbol);
      const records = processSymbol(row);

      if (records && records.length > 0) {
        const filePath = path.join(OUTPUT_DIR, `${symbol}.json`);
        fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf-8');
        successCount++;

        // In tiến độ theo thời gian thực (in từng mã hoặc mỗi 50 mã để tối ưu log)
        if (currentNum % 25 === 0 || currentNum === totalTickers || ['FMC', 'VNM', 'HPG', 'SSI', 'VCB', 'MWG'].includes(symbol)) {
          console.log(`[${currentNum}/${totalTickers}] Đã xử lý ${symbol} (${records.length} bản ghi)`);
        }
      } else {
        skippedCount++;
      }
    } catch (err) {
      console.warn(`[Cảnh báo] Lỗi khi xử lý ${symbol}: ${err.message}, bỏ qua và tiếp tục.`);
      skippedCount++;
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n========================================');
  console.log(`[HOÀN TẤT] Đồng bộ Thuyết minh BCTC hàng loạt:`);
  console.log(`- Tổng mã trong DB: ${totalTickers}`);
  console.log(`- Xuất thành công: ${successCount} file JSON tại data/notes-cache/`);
  console.log(`- Bỏ qua / thiếu dữ liệu: ${skippedCount} mã`);
  console.log(`- Thời gian hoàn thành: ${durationSec} giây`);
  console.log('========================================\n');
}

main();
