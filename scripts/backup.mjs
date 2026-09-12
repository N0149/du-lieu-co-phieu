import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Thư mục đích lưu trữ bản sao lưu trên ổ D:
const BACKUP_DIR = process.env.BACKUP_DIR || "D:\\Backup";
const TEMP_DIR = path.resolve(process.cwd(), ".backup_staging");
// TUYỆT ĐỐI KHÔNG tự động xóa file backup cũ. Người dùng sẽ tự quản lý và xóa thủ công.

// 2. Danh sách các thư mục & tập tin cốt lõi cần sao lưu
const INCLUDED_ITEMS = [
  "data",             // Toàn bộ SQLite DBs, JSON caches, lịch sử giá, BCTC, định giá
  "content",          // Báo cáo MDX, tài liệu AGM / ĐHCĐ
  "app",              // Next.js App Router
  "components",       // React components & UI
  "lib",              // Services, DB connectors, logic
  "scripts",          // Automation & crawler scripts
  "public",           // Static assets & icons
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "next.config.mjs",
  "next.config.js",
  "postcss.config.mjs",
  "postcss.config.js",
  "components.json",
  "middleware.ts",
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  ".env",
  ".env.local",
];

function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${yyyy}-${mm}-${dd}_${hh}h${min}m${ss}`;
}



// Copy an toàn từng file/thư mục (tránh file khóa và file rác/cache tạm)
function copySafe(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      if (
        entry === "node_modules" ||
        entry === ".next" ||
        entry === ".git" ||
        entry === ".backup_staging" ||
        entry === "__pycache__" ||
        entry.endsWith(".log") ||
        entry.endsWith(".tmp")
      ) {
        continue;
      }
      copySafe(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

async function runBackup() {
  console.log("==================================================");
  console.log("   HỆ THỐNG SAO LƯU DỰ ÁN (WEB DỮ LIỆU CỔ PHIẾU)");
  console.log("   Chiến lược chống rủi ro 3-2-1: Đa ổ đĩa & Toàn vẹn DB");
  console.log("==================================================");

  // 1. Chuẩn bị thư mục sao lưu
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log(`[+] Đang tạo thư mục lưu trữ: ${BACKUP_DIR}`);
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // 2. Lọc các mục thực tế tồn tại trong dự án
  const validItems = INCLUDED_ITEMS.filter((item) => {
    const fullPath = path.resolve(process.cwd(), item);
    return fs.existsSync(fullPath);
  });

  const timestamp = getTimestamp();
  const zipFileName = `backup_du_lieu_co_phieu_${timestamp}.zip`;
  const zipFilePath = path.join(BACKUP_DIR, zipFileName);

  console.log(`[*] Thời gian: ${timestamp}`);
  console.log(`[*] Nơi lưu: ${BACKUP_DIR}`);
  console.log(`[*] Tên tệp nén: ${zipFileName}`);
  console.log(`[*] Các thành phần được sao lưu: ${validItems.join(", ")}`);

  const startTime = Date.now();

  try {
    // 3. Chuẩn bị thư mục tạm (staging) để đảm bảo tính toàn vẹn của file
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEMP_DIR, { recursive: true });

    console.log(`[*] Đang sao chép các thành phần vào staging...`);
    for (const item of validItems) {
      const srcPath = path.resolve(process.cwd(), item);
      const destPath = path.join(TEMP_DIR, item);
      copySafe(srcPath, destPath);
    }

    console.log(`[*] Đang nén dữ liệu sang file ZIP bằng TAR...`);

    // 4. Nén toàn bộ thư mục tạm vào BACKUP_DIR
    const cmd = `tar -a -c -f "${zipFilePath}" -C "${TEMP_DIR}" .`;
    execSync(cmd, { stdio: "inherit" });

    // 5. Dọn dẹp thư mục tạm
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });

    const stats = fs.statSync(zipFilePath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("--------------------------------------------------");
    console.log(` NÉN SAO LƯU THÀNH CÔNG trong ${elapsed} giây!`);
    console.log(` Dung lượng file: ${sizeMb} MB`);
    console.log(` Đường dẫn lưu: ${zipFilePath}`);

    console.log("--------------------------------------------------");
    // 6. Hiển thị thông tin tất cả bản sao lưu hiện có (Không bao giờ tự ý xóa)
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("backup_du_lieu_co_phieu_") && f.endsWith(".zip"))
      .sort()
      .reverse();

    console.log(`[i] Danh sách các bản sao lưu hiện có trong ${BACKUP_DIR}:`);
    files.forEach((f, idx) => {
      const fStat = fs.statSync(path.join(BACKUP_DIR, f));
      const fMb = (fStat.size / (1024 * 1024)).toFixed(2);
      console.log(`   ${idx + 1}. ${f} (${fMb} MB)`);
    });

    console.log("==================================================");
    console.log(" SAO LƯU THÀNH CÔNG! (KHÔNG TỰ ĐỘNG XÓA BẤT KỲ FILE NÀO)");
    console.log("==================================================");
  } catch (err) {
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    console.error("[!] Lỗi trong quá trình sao lưu:", err.message);
  }
}

runBackup();
