/**
 * LOCAL DATA SYNCHRONIZATION RUNNER
 * 
 * Script đồng bộ dữ liệu tổng hợp chạy trên máy tính cá nhân (Local):
 * 1. git pull: Kéo dữ liệu mới nhất (BCTC/Alerts) từ GitHub Actions về
 * 2. Thị trường: Đồng bộ chỉ số (indices) & danh mục mã (manifest)
 * 3. Biến động giá: Tính % 1W, 1M, 3M, 6M, 1Y, YTD cho hơn 1.500 mã
 * 4. Định giá: Cập nhật P/E, P/B, Market Cap Top 150 mã
 * 5. Cảng biển & Hàng hải: Lịch tàu, sản lượng, giá cước vận tải biển
 * 6. Google Drive: Cập nhật snapshot danh mục tài liệu & báo cáo PDF
 * 7. Báo cáo phân tích CTCK: Cập nhật báo cáo ngành & doanh nghiệp
 * 8. git push: Tự động commit & push các file dữ liệu sạch lên GitHub
 * 
 * Cách dùng:
 *   node scripts/local-sync.mjs             # Chạy đồng bộ (tự động bỏ qua nếu vừa chạy < 2 giờ)
 *   node scripts/local-sync.mjs --force     # Chạy ngay lập tức, bỏ qua kiểm tra thời gian
 *   node scripts/local-sync.mjs --skip-git  # Chỉ cập nhật dữ liệu, không pull/push Git
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { spawnSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const SYNC_STATE_FILE = path.join(DATA_DIR, '.last_local_sync.json');

// Danh sách các file/thư mục dữ liệu được phép commit & push tự động
const TRACKED_DATA_TARGETS = [
  'data/longlive_indices.json',
  'data/longlive_manifest.json',
  'data/stock_price_changes.json',
  'data/reports-snapshot.json',
  'data/company_reports_snapshot.json',
  'data/industry_reports_snapshot.json',
  'data/industry-reports.json',
  'data/company_reports_summary.json',
  'data/widata_archive/reports/',
  'data/maritime/',
  'data/maritime.db',
  'data/evaluation_cache/',
  'data/company_profiles.db',
];

function logHeader(title) {
  console.log(`\n======================================================`);
  console.log(`  ${title}`);
  console.log(`======================================================`);
}

function fetchAndSave(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`[Fetch] Đang tải ${url}...`);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch ${url}: HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        fs.writeFileSync(dest, data, 'utf-8');
        console.log(`[Fetch] -> Đã lưu: ${path.relative(ROOT_DIR, dest)}`);
        resolve();
      });
    }).on('error', reject);
  });
}

function runCommand(cmd, args, description) {
  console.log(`\n[Bước] ${description}...`);
  console.log(`> ${cmd} ${args.join(' ')}`);
  const start = Date.now();
  const res = spawnSync(cmd, args, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  const duration = ((Date.now() - start) / 1000).toFixed(1);
  if (res.status !== 0) {
    console.warn(`⚠️ [Cảnh báo] ${description} kết thúc với mã lỗi ${res.status} (${duration}s)`);
    return false;
  }
  console.log(`✅ [Thành công] ${description} (${duration}s)`);
  return true;
}

// Kiểm tra khoảng cách thời gian lần chạy gần nhất (tránh chạy lặp liên tục khi khởi động máy nhiều lần)
function shouldRun(isForce) {
  if (isForce) return true;
  try {
    if (fs.existsSync(SYNC_STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(SYNC_STATE_FILE, 'utf-8'));
      const lastRun = new Date(state.last_success_at).getTime();
      const now = Date.now();
      const diffHours = (now - lastRun) / (1000 * 60 * 60);

      // Nếu đã chạy trong vòng 2 tiếng gần nhất
      if (diffHours < 2) {
        console.log(`ℹ️ [Bỏ qua] Lần đồng bộ thành công gần nhất cách đây ${diffHours.toFixed(1)} giờ (quy định tối thiểu 2 giờ).`);
        console.log(`👉 Nếu muốn chạy ngay, vui lòng dùng cờ: --force`);
        return false;
      }
    }
  } catch (e) {
    // Nếu file hỏng thì chạy bình thường
  }
  return true;
}

async function syncMarketManifest() {
  console.log('\n[Bước] Đồng bộ Chỉ số & Danh mục cổ phiếu từ LongLiveStock...');
  try {
    const indicesDest = path.join(DATA_DIR, 'longlive_indices.json');
    const manifestDest = path.join(DATA_DIR, 'longlive_manifest.json');
    
    await fetchAndSave('https://longlivestock.com/data/indices.json', indicesDest);
    await fetchAndSave('https://longlivestock.com/data/manifest.json', manifestDest);

    // Merge mã custom nếu có
    const customPath = path.join(DATA_DIR, 'custom_stocks_manifest.json');
    if (fs.existsSync(customPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestDest, 'utf8'));
      const custom = JSON.parse(fs.readFileSync(customPath, 'utf8'));
      const existing = new Set((manifest.items || []).map(i => i.t.toUpperCase()));
      let mergedCount = 0;
      for (const c of custom) {
        if (!existing.has(c.t.toUpperCase())) {
          manifest.items.push(c);
          mergedCount++;
        }
      }
      manifest.count = manifest.items.length;
      fs.writeFileSync(manifestDest, JSON.stringify(manifest, null, 2), 'utf8');
      console.log(`[Merge] Đã hợp nhất ${mergedCount} mã tùy chỉnh vào manifest (Tổng: ${manifest.count} mã)`);
    }
    console.log('✅ [Thành công] Đồng bộ Chỉ số & Danh mục cổ phiếu hoàn tất');
  } catch (err) {
    console.warn('⚠️ [Cảnh báo] Lỗi tải Manifest thị trường:', err.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isForce = args.includes('--force');
  const skipGit = args.includes('--skip-git');

  logHeader('LOCAL DATA PIPELINE RUNNER - DỮ LIỆU ĐẦU TƯ');
  console.log(`⏰ Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (GMT+7)`);
  console.log(`⚙️ Chế độ: ${isForce ? 'Bắt buộc chạy (--force)' : 'Tự động kiểm tra thời gian'}`);

  if (!shouldRun(isForce)) {
    process.exit(0);
  }

  // Bước 1: Pull cập nhật mới nhất từ GitHub Actions về
  if (!skipGit) {
    console.log('\n[Git] Đồng bộ mã nguồn và dữ liệu từ GitHub (git pull --rebase)...');
    try {
      execSync('git pull --autostash --rebase origin main', { cwd: ROOT_DIR, stdio: 'inherit' });
      console.log('✅ [Git] Đồng bộ nhánh main từ GitHub thành công.');
    } catch (err) {
      console.warn('⚠️ [Git] Cảnh báo khi git pull: ' + err.message);
    }
  }

  // Bước 2: Đồng bộ Manifest & Chỉ số thị trường
  await syncMarketManifest();

  // Bước 3: Tính toán % biến động giá cổ phiếu (1W, 1M, 3M, 1Y, YTD)
  runCommand('node', ['scripts/sync-price-changes.mjs'], 'Tính toán Biến động giá cổ phiếu (1.530 mã)');

  // Bước 4: Định giá P/E, P/B, Vốn hóa Top 150
  runCommand('node', ['scripts/crawl-direct-market.mjs', '--mode=valuation'], 'Định giá P/E, P/B Top 150 mã');

  // Bước 5: Cảng biển & Hàng hải
  runCommand('python', ['scripts/cangbien/run_pipeline.py'], 'Cào Lịch tàu Cảng biển & Giá cước Logistics');

  // Bước 6: Google Drive Snapshot
  runCommand('node', ['scripts/sync-direct.mjs'], 'Đồng bộ Snapshot Google Drive Báo cáo phân tích');

  // Bước 7: Báo cáo phân tích CTCK mới nhất
  runCommand('node', ['scripts/sync-daily-reports.mjs'], 'Cập nhật Báo cáo phân tích Doanh nghiệp & Ngành');

  // Cập nhật mốc thời gian thành công
  try {
    fs.writeFileSync(SYNC_STATE_FILE, JSON.stringify({
      last_success_at: new Date().toISOString(),
      updated_by: 'local-runner',
    }, null, 2), 'utf-8');
  } catch (e) {}

  // Bước 8: Git Commit & Push dữ liệu sạch lên GitHub
  if (!skipGit) {
    console.log('\n[Git] Kiểm tra và đẩy dữ liệu mới lên GitHub...');
    try {
      // Chỉ add các mục dữ liệu xác định
      for (const target of TRACKED_DATA_TARGETS) {
        if (fs.existsSync(path.join(ROOT_DIR, target))) {
          spawnSync('git', ['add', '-f', target], { cwd: ROOT_DIR });
        }
      }

      // Kiểm tra có thay đổi nào trong staged không
      const stagedDiff = execSync('git diff --cached --quiet', { cwd: ROOT_DIR, stdio: 'pipe' });
      console.log('ℹ️ [Git] Không có dữ liệu mới cần commit.');
    } catch (diffErr) {
      // exit code 1 nghĩa là CÓ thay đổi staged -> commit & push
      try {
        const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        const commitMsg = `chore(local-sync): auto update market, maritime & drive data (${timestamp}) [skip ci]`;
        execSync(`git commit -m "${commitMsg}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
        console.log(`✅ [Git] Đã commit dữ liệu mới: ${commitMsg}`);

        // Kéo rebase nhẹ lần cuối trước khi push
        try {
          execSync('git pull --autostash --rebase origin main', { cwd: ROOT_DIR, stdio: 'inherit' });
        } catch (_) {}

        execSync('git push origin main', { cwd: ROOT_DIR, stdio: 'inherit' });
        console.log('🚀 [Git] ĐÃ PUSH THÀNH CÔNG DỮ LIỆU MỚI LÊN GITHUB REPOSITORY!');
      } catch (pushErr) {
        console.error('❌ [Git] Lỗi khi commit/push:', pushErr.message);
      }
    }
  }

  logHeader('HOÀN TẤT ĐỒNG BỘ DỮ LIỆU TẠI LOCAL!');
}

main().catch(console.error);
