/**
 * Script trích xuất các khoản mục thuyết minh / tài chính chuyên sâu của FMC
 * từ cơ sở dữ liệu SQLite nội bộ (data/financial_statements.db).
 *
 * Nhóm khoản mục:
 * 1. Tiền chi mua sắm TSCĐ & Khấu hao (từ Báo cáo Lưu chuyển tiền tệ - LCTT)
 * 2. Các khoản mục Dự phòng (từ Bảng Cân đối kế toán - CĐKT)
 * 3. Doanh thu tài chính & Chi phí lãi vay (từ Báo cáo Kết quả kinh doanh - KQKD)
 *
 * Xuất dữ liệu: data/notes-cache/FMC.json
 */

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT_DIR = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT_DIR, 'data', 'financial_statements.db');
const OUTPUT_DIR = path.join(ROOT_DIR, 'data', 'notes-cache');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'FMC.json');

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

function run() {
  console.log(`[ETL] Đang mở database: ${DB_PATH}`);
  if (!fs.existsSync(DB_PATH)) {
    console.error(`[Lỗi] Không tìm thấy database tại: ${DB_PATH}`);
    process.exit(1);
  }

  const db = new DatabaseSync(DB_PATH);

  // Lấy dữ liệu BCTC theo quý của mã FMC
  const stmt = db.prepare(`
    SELECT period_type, fiscal_dates, cdkt, kqkd, lctt
    FROM financial_statements
    WHERE symbol = 'FMC' AND period_type = 'quarter'
  `);

  const row = stmt.get();
  if (!row || !row.fiscal_dates) {
    console.error('[Lỗi] Không tìm thấy bản ghi quý của FMC trong database!');
    process.exit(1);
  }

  const dates = JSON.parse(row.fiscal_dates);
  const cdkt = row.cdkt ? JSON.parse(row.cdkt) : [];
  const kqkd = row.kqkd ? JSON.parse(row.kqkd) : [];
  const lctt = row.lctt ? JSON.parse(row.lctt) : [];

  console.log(`[ETL] Đã tải dữ liệu quý FMC: ${dates.length} kỳ báo cáo.`);

  // Định nghĩa các chỉ tiêu cần trích xuất
  const TARGET_SPECS = [
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

  // Map từng spec với dòng dữ liệu tương ứng trong bảng
  const mappedSpecs = TARGET_SPECS.map((spec) => {
    const matchedRow = findRow(spec.table, spec.candidates);
    return {
      ...spec,
      matchedRow,
      rawTitle: matchedRow ? matchedRow[0] : null
    };
  });

  const records = [];

  // Duyệt qua từng kỳ báo cáo (từ 2024 trở về trước)
  for (let i = 0; i < dates.length; i++) {
    const dateStr = dates[i];
    const { year, quarter } = parseQuarterYear(dateStr);

    // Lọc các kỳ từ 2024 trở về trước
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

  // Sắp xếp dữ liệu theo năm, quý tăng dần và category
  records.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.quarter !== b.quarter) return (a.quarter || 0) - (b.quarter || 0);
    return a.item_code.localeCompare(b.item_code);
  });

  // Tạo thư mục nếu chưa tồn tại
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Ghi kết quả ra file JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(records, null, 2), 'utf-8');
  console.log(`[ETL] Xuất thành công ${records.length} bản ghi ra: ${OUTPUT_FILE}`);

  // In 5 dòng mẫu
  console.log('\n--- 5 DÒNG DỮ LIỆU MẪU (FMC.json) ---');
  console.log(JSON.stringify(records.slice(0, 5), null, 2));
}

run();
