/**
 * scripts/sync-macro-data.mjs
 * Script tự động đồng bộ dữ liệu kinh tế vĩ mô từ WiData/WiChart về local
 * Thuộc Phương án 1 - Chạy định kỳ hoặc thủ công bằng: npm run sync-macro
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'data', 'macro');

// Đảm bảo thư mục đích tồn tại
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Hàm suy diễn khóa OpenSSL EVP_BytesToKey (tương thích CryptoJS)
function evpBytesToKey(password, salt, keyLen = 32, ivLen = 16) {
  let dtot = Buffer.alloc(0);
  let d = Buffer.alloc(0);
  while (dtot.length < keyLen + ivLen) {
    d = crypto.createHash('md5').update(Buffer.concat([d, password, salt])).digest();
    dtot = Buffer.concat([dtot, d]);
  }
  return {
    key: dtot.subarray(0, keyLen),
    iv: dtot.subarray(keyLen, keyLen + ivLen),
  };
}

// Hàm giải mã AES-256-CBC từ ciphertext dạng CryptoJS
function decryptCryptoJS(encryptedB64, passphrase = 'ZmRvaWFmaGRpc2ZoaWRzZHNoa2RoaW9zZGZoc2E=') {
  const raw = Buffer.from(encryptedB64, 'base64');
  if (raw.subarray(0, 8).toString('utf8') !== 'Salted__') {
    throw new Error('Định dạng mã hóa không hợp lệ (thiếu Salted__)');
  }
  const salt = raw.subarray(8, 16);
  const ciphertext = raw.subarray(16);
  const { key, iv } = evpBytesToKey(Buffer.from(passphrase, 'utf8'), salt, 32, 16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}

// Tạo request headers có chữ ký số MD5 hợp lệ
function generateHeaders(params = {}) {
  const stime = Date.now().toString();
  const nonce = (
    Math.floor((Math.random() + Math.floor(9 * Math.random() + 1)) * Math.pow(10, 19))
  ).toString();
  const signToken = 'ObBeWhVmYs3tP2Nz$C$FJ@P4AQfTjlPX';
  const v = 'v1';

  const authHeaders = {
    stime,
    nonce,
    'sign-token': signToken,
    v,
  };

  const combined = { ...params, ...authHeaders };
  const sortedKeys = Object.keys(combined)
    .filter((k) => k !== 'sign' && combined[k] !== undefined && combined[k] !== null)
    .sort();

  let h = '';
  sortedKeys.forEach((k) => {
    h += k + combined[k];
  });
  const sign = crypto.createHash('md5').update(h).digest('hex');
  authHeaders.sign = sign;
  return authHeaders;
}

// Danh mục toàn bộ các chỉ tiêu vĩ mô hỗ trợ đồng bộ
const MACRO_INDICATORS = [
  // --- Nhóm 1: Đầu tư ---
  {
    group: 'Đầu tư',
    groupKey: 'dautu',
    name: 'Vốn đầu tư toàn xã hội',
    slug: 'dau-tu-toan-xh',
    apiPath: 'dautu/vondautuptxh',
    defaultTimeFrame: 'quarterly',
    defaultValueType: 'value',
    supportedTimeFrames: ['quarterly', 'yearly'],
    supportedValueTypes: ['value', 'qoq', 'yoy'],
    unit: 'Nghìn tỷ VND',
    description: 'Số liệu vốn đầu tư toàn xã hội từ khu vực nhà nước, tư nhân và FDI.',
  },
  {
    group: 'Đầu tư',
    groupKey: 'dautu',
    name: 'Vốn đầu tư NSNN',
    slug: 'dau-tu-nsnn',
    apiPath: 'dautu/vondautunsnn',
    defaultTimeFrame: 'monthly',
    defaultValueType: 'value',
    supportedTimeFrames: ['monthly', 'quarterly', 'yearly'],
    supportedValueTypes: ['value', 'yoy'],
    unit: 'Tỷ VND',
    description: 'Vốn đầu tư thực hiện từ nguồn ngân sách nhà nước qua các cấp quản lý.',
  },
  {
    group: 'Đầu tư',
    groupKey: 'dautu',
    name: 'Đăng ký kinh doanh',
    slug: 'dang-ky-kd',
    apiPath: 'dautu/dangkykinhdoanh',
    defaultTimeFrame: 'monthly',
    defaultValueType: 'value',
    supportedTimeFrames: ['monthly', 'quarterly', 'yearly'],
    supportedValueTypes: ['value', 'yoy'],
    unit: 'Doanh nghiệp / Vốn',
    description: 'Tình hình doanh nghiệp thành lập mới, quay trở lại và tạm ngừng hoạt động.',
  },

  // --- Nhóm 2: Hệ thống ngân hàng & Tiền tệ ---
  {
    group: 'Hệ thống ngân hàng',
    groupKey: 'hethongnganhang',
    name: 'Cung tiền M2',
    slug: 'cung-tien',
    apiPath: 'hethongnganhang/cungtienhuydongtindung/m2',
    defaultTimeFrame: 'monthly',
    defaultValueType: 'value',
    supportedTimeFrames: ['monthly', 'quarterly', 'yearly'],
    supportedValueTypes: ['value', 'yoy'],
    unit: 'Tỷ VND',
    description: 'Chỉ số cung tiền M1, M2, thước đo thanh khoản của toàn nền kinh tế.',
  },
  {
    group: 'Hệ thống ngân hàng',
    groupKey: 'hethongnganhang',
    name: 'Tiền gửi khách hàng (Huy động)',
    slug: 'huy-dong',
    apiPath: 'hethongnganhang/cungtienhuydongtindung/huydong',
    defaultTimeFrame: 'monthly',
    defaultValueType: 'value',
    supportedTimeFrames: ['monthly', 'quarterly', 'yearly'],
    supportedValueTypes: ['value', 'yoy'],
    unit: 'Tỷ VND',
    description: 'Quy mô tiền gửi của các tổ chức kinh tế và dân cư vào hệ thống ngân hàng.',
  },
  {
    group: 'Hệ thống ngân hàng',
    groupKey: 'hethongnganhang',
    name: 'Tín dụng nền kinh tế',
    slug: 'tin-dung',
    apiPath: 'hethongnganhang/cungtienhuydongtindung/tindung',
    defaultTimeFrame: 'monthly',
    defaultValueType: 'value',
    supportedTimeFrames: ['monthly', 'quarterly', 'yearly'],
    supportedValueTypes: ['value', 'yoy'],
    unit: 'Tỷ VND',
    description: 'Dư nợ tín dụng đối với nền kinh tế, động lực tăng trưởng quan trọng.',
  },
  {
    group: 'Thị trường tiền tệ',
    groupKey: 'thitruongtiente',
    name: 'Bơm hút ròng SBV (OMO)',
    slug: 'bom-hut-rong',
    apiPath: 'thitruongtiente/thitruongmo/bomhutrong',
    defaultTimeFrame: 'monthly',
    defaultValueType: 'value',
    supportedTimeFrames: ['monthly', 'quarterly'],
    supportedValueTypes: ['value'],
    unit: 'Tỷ VND',
    description: 'Quy mô bơm hút thanh khoản của Ngân hàng Nhà nước qua thị trường mở OMO.',
  },

  // --- Nhóm 3: Tổng sản phẩm quốc nội (GDP) ---
  {
    group: 'Tổng sản phẩm quốc nội',
    groupKey: 'tongsanphamquocnoi',
    name: 'GDP thực',
    slug: 'gdp-thuc',
    apiPath: 'tongsanphamquocnoi/gdpthuc',
    defaultTimeFrame: 'quarterly',
    defaultValueType: 'value',
    supportedTimeFrames: ['quarterly', 'yearly'],
    supportedValueTypes: ['value', 'qoq', 'yoy'],
    unit: 'Tỷ VND',
    description: 'Tổng sản phẩm quốc nội theo giá so sánh điều chỉnh lạm phát.',
  },
  {
    group: 'Tổng sản phẩm quốc nội',
    groupKey: 'tongsanphamquocnoi',
    name: 'GDP danh nghĩa',
    slug: 'gdp-danh-nghia',
    apiPath: 'tongsanphamquocnoi/gdpdanhnghia',
    defaultTimeFrame: 'quarterly',
    defaultValueType: 'value',
    supportedTimeFrames: ['quarterly', 'yearly'],
    supportedValueTypes: ['value', 'qoq', 'yoy'],
    unit: 'Tỷ VND',
    description: 'Tổng sản phẩm quốc nội theo giá hiện hành.',
  },

  // --- Nhóm 4: Sản xuất & Tiêu dùng ---
  {
    group: 'Sản xuất và Dịch vụ',
    groupKey: 'sanxuatvadichvu',
    name: 'PMI Sản xuất',
    slug: 'pmi-san-xuat',
    apiPath: 'sanxuatvadichvu/pmi',
    defaultTimeFrame: 'monthly',
    defaultValueType: 'value',
    supportedTimeFrames: ['monthly'],
    supportedValueTypes: ['value'],
    unit: 'Điểm',
    description: 'Chỉ số nhà quản trị mua hàng PMI lĩnh vực sản xuất Việt Nam (ngưỡng 50 điểm).',
  },
  {
    group: 'Sản xuất và Dịch vụ',
    groupKey: 'sanxuatvadichvu',
    name: 'Chỉ số sản xuất công nghiệp (IIP)',
    slug: 'iip',
    apiPath: 'sanxuatvadichvu/iip',
    defaultTimeFrame: 'monthly',
    defaultValueType: 'yoy',
    supportedTimeFrames: ['monthly'],
    supportedValueTypes: ['yoy'],
    unit: '%',
    description: 'Tốc độ tăng trưởng chỉ số sản xuất công nghiệp toàn ngành.',
  },
  {
    group: 'Tiêu dùng',
    groupKey: 'tieudung',
    name: 'Bán lẻ hàng hóa & dịch vụ',
    slug: 'ban-le-hang-hoa-dich-vu',
    apiPath: 'tieudung/banlehhdv',
    defaultTimeFrame: 'monthly',
    defaultValueType: 'value',
    supportedTimeFrames: ['monthly', 'quarterly', 'yearly'],
    supportedValueTypes: ['value', 'yoy'],
    unit: 'Nghìn tỷ VND',
    description: 'Tổng mức bán lẻ hàng hóa và doanh thu dịch vụ tiêu dùng.',
  },

  // --- Nhóm 5: Giá cả & Lạm phát ---
  {
    group: 'Giá cả',
    groupKey: 'giaca',
    name: 'Chỉ số giá tiêu dùng (CPI)',
    slug: 'chi-so-gia-cpi',
    apiPath: 'giaca/chisogiatieudungcpi',
    defaultTimeFrame: 'monthly',
    defaultValueType: 'yoy',
    supportedTimeFrames: ['monthly', 'yearly'],
    supportedValueTypes: ['value', 'yoy'],
    unit: '% / Điểm',
    description: 'Chỉ số giá tiêu dùng CPI đo lường tốc độ lạm phát theo rổ hàng hóa.',
  },

  // --- Nhóm 6: Thương mại quốc tế ---
  {
    group: 'Giao dịch quốc tế',
    groupKey: 'giaodichquocte',
    name: 'Giá trị xuất khẩu',
    slug: 'gia-tri-xuat-khau',
    apiPath: 'giaodichquocte/giatrixuatnhapkhau/xuatkhau',
    defaultTimeFrame: 'monthly',
    defaultValueType: 'value',
    supportedTimeFrames: ['monthly', 'quarterly', 'yearly'],
    supportedValueTypes: ['value', 'yoy'],
    unit: 'Triệu USD',
    description: 'Kim ngạch xuất khẩu hàng hóa Việt Nam ra thị trường quốc tế.',
  },
  {
    group: 'Giao dịch quốc tế',
    groupKey: 'giaodichquocte',
    name: 'Giá trị nhập khẩu',
    slug: 'gia-tri-nhap-khau',
    apiPath: 'giaodichquocte/giatrixuatnhapkhau/nhapkhau',
    defaultTimeFrame: 'monthly',
    defaultValueType: 'value',
    supportedTimeFrames: ['monthly', 'quarterly', 'yearly'],
    supportedValueTypes: ['value', 'yoy'],
    unit: 'Triệu USD',
    description: 'Kim ngạch nhập khẩu hàng hóa phục vụ sản xuất và tiêu dùng.',
  },
  {
    group: 'Giao dịch quốc tế',
    groupKey: 'giaodichquocte',
    name: 'Cán cân thương mại XNK',
    slug: 'can-can-xuat-nhap-khau',
    apiPath: 'giaodichquocte/giatrixuatnhapkhau/can-can-xuat-nhap-khau',
    defaultTimeFrame: 'monthly',
    defaultValueType: 'value',
    supportedTimeFrames: ['monthly', 'quarterly', 'yearly'],
    supportedValueTypes: ['value'],
    unit: 'Triệu USD',
    description: 'Chênh lệch giữa kim ngạch xuất khẩu và nhập khẩu hàng hóa (Xuất siêu/Nhập siêu).',
  },

  // --- Nhóm 7: Tài khóa ---
  {
    group: 'Tài khóa',
    groupKey: 'taikhoa',
    name: 'Nợ Chính phủ',
    slug: 'no-chinh-phu',
    apiPath: 'taikhoa/nocong/vaynochinhphu',
    defaultTimeFrame: 'yearly',
    defaultValueType: 'value',
    supportedTimeFrames: ['yearly'],
    supportedValueTypes: ['value'],
    unit: 'Tỷ VND',
    description: 'Quy mô vay nợ trong và ngoài nước của Chính phủ.',
  },
];

// Hàm fetch 1 endpoint từ WiData
async function fetchIndicatorData(apiPath, timeFrame, valueType) {
  const baseUrl = `https://wichart.vn/wichartapi/macro/vn/${apiPath}`;
  const params = { time_frame: timeFrame, value_type: valueType };
  const authHeaders = generateHeaders(params);

  const res = await fetch(`${baseUrl}?time_frame=${timeFrame}&value_type=${valueType}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: 'https://widata.vn/',
      Origin: 'https://widata.vn',
      Accept: 'application/json, text/plain, */*',
      ...authHeaders,
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  if (!json.enc) {
    return json;
  }

  const decrypted = decryptCryptoJS(json.enc);
  return JSON.parse(decrypted);
}

// Chạy tiến trình đồng bộ toàn bộ
async function syncAllMacro() {
  console.log('=====================================================');
  console.log('🚀 BẮT ĐẦU ĐỒNG BỘ DỮ LIỆU KINH TẾ VĨ MÔ TỪ WIDATA');
  console.log('=====================================================');

  const summaryList = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < MACRO_INDICATORS.length; i++) {
    const item = MACRO_INDICATORS[i];
    console.log(`\n[${i + 1}/${MACRO_INDICATORS.length}] Đang đồng bộ: ${item.name} (${item.slug})...`);

    const datasets = {};
    let latestValue = null;
    let latestPeriod = null;

    for (const tf of item.supportedTimeFrames) {
      datasets[tf] = {};
      for (const vt of item.supportedValueTypes) {
        try {
          const data = await fetchIndicatorData(item.apiPath, tf, vt);
          datasets[tf][vt] = data;

          // Lấy giá trị mới nhất cho bảng tổng quan (ở cấu hình mặc định)
          if (tf === item.defaultTimeFrame && vt === item.defaultValueType) {
            const firstChild = data.parent?.[0]?.child?.[0];
            if (firstChild && firstChild.data && firstChild.data.length > 0) {
              const firstPoint = firstChild.data[0];
              latestPeriod = data.headers?.[0] || 'Gần nhất';
              latestValue = firstPoint[1];
            }
          }

          // Nghỉ nhẹ 100ms tránh spam
          await new Promise((r) => setTimeout(r, 100));
        } catch (err) {
          console.warn(`   ⚠️ Lỗi [${tf} / ${vt}]: ${err.message}`);
        }
      }
    }

    const hasData = Object.keys(datasets).some((tf) => Object.keys(datasets[tf]).length > 0);

    if (hasData) {
      const fullRecord = {
        meta: {
          ...item,
          updatedAt: new Date().toISOString(),
          latestPeriod,
          latestValue,
        },
        datasets,
      };

      const filePath = path.join(OUTPUT_DIR, `${item.slug}.json`);
      fs.writeFileSync(filePath, JSON.stringify(fullRecord, null, 2), 'utf8');
      console.log(`   ✅ Đã lưu: data/macro/${item.slug}.json (Kỳ gần nhất: ${latestPeriod} = ${latestValue})`);
      successCount++;

      summaryList.push({
        name: item.name,
        slug: item.slug,
        group: item.group,
        groupKey: item.groupKey,
        unit: item.unit,
        description: item.description,
        defaultTimeFrame: item.defaultTimeFrame,
        defaultValueType: item.defaultValueType,
        latestPeriod,
        latestValue,
        updatedAt: new Date().toISOString(),
      });
    } else {
      console.error(`   ❌ Thất bại: Không lấy được dữ liệu cho ${item.name}`);
      failCount++;
    }
  }

  // Lưu danh mục tổng quan (catalog.json) và bản tin tóm tắt (summary.json)
  const catalogPath = path.join(OUTPUT_DIR, 'catalog.json');
  fs.writeFileSync(
    catalogPath,
    JSON.stringify(
      {
        total: MACRO_INDICATORS.length,
        updatedAt: new Date().toISOString(),
        indicators: MACRO_INDICATORS,
      },
      null,
      2
    ),
    'utf8'
  );

  const summaryPath = path.join(OUTPUT_DIR, 'summary.json');
  fs.writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        total: summaryList.length,
        updatedAt: new Date().toISOString(),
        summary: summaryList,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log('\n=====================================================');
  console.log(`🎉 HOÀN THÀNH ĐỒNG BỘ: Thành công ${successCount}/${MACRO_INDICATORS.length}, Thất bại: ${failCount}`);
  console.log(`📁 Thư mục lưu trữ: data/macro/`);
  console.log('=====================================================');
}

syncAllMacro().catch((err) => {
  console.error('Lỗi nghiêm trọng trong quá trình đồng bộ vĩ mô:', err);
  process.exit(1);
});
