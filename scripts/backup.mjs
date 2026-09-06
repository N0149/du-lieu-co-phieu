import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Thư mục đích lưu trữ bản sao lưu
const BACKUP_DIR = "D:\\Backup";
const TEMP_DIR = path.resolve(process.cwd(), ".backup_staging");

// Danh sách các thư mục & tập tin cốt lõi cần sao lưu
const INCLUDED_ITEMS = [
  "data",
  "app",
  "components",
  "lib",
  "scripts",
  "public",
  "package.json",
  "tsconfig.json",
  "next.config.mjs",
  "next.config.js",
  "postcss.config.mjs",
  "postcss.config.js",
  "AGENTS.md",
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

// Copy file hoặc thư mục an toàn ngay cả khi SQLite đang mở
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
        entry.endsWith(".log") ||
        entry.endsWith(".tmp")
      ) {
        continue;
      }
      copySafe(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    // File copy với shared lock
    fs.copyFileSync(src, dest);
  }
}

async function runBackup() {
  console.log("==================================================");
  console.log("   TIẾN TRÌNH SAO LƯU DỰ ÁN (WEB DỮ LIỆU CỔ PHIẾU)");
  console.log("==================================================");

  // 1. Kiểm tra / Tạo thư mục đích D:\Backup
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
  console.log(`[*] Đang chuẩn bị dữ liệu (${validItems.join(", ")})...`);

  const startTime = Date.now();

  try {
    // 3. Tạo thư mục tạm để copy an toàn (tránh lock file SQLite khi dev server đang chạy)
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEMP_DIR, { recursive: true });

    for (const item of validItems) {
      const srcPath = path.resolve(process.cwd(), item);
      const destPath = path.join(TEMP_DIR, item);
      copySafe(srcPath, destPath);
    }

    console.log(`[*] Đang nén dữ liệu sang ZIP...`);

    // 4. Nén toàn bộ thư mục tạm vào D:\Backup
    const cmd = `tar -a -c -f "${zipFilePath}" -C "${TEMP_DIR}" .`;
    execSync(cmd, { stdio: "inherit" });

    // 5. Xóa thư mục tạm
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const stats = fs.statSync(zipFilePath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

    console.log("--------------------------------------------------");
    console.log(` SAO LƯU THÀNH CÔNG trong ${elapsed} giây!`);
    console.log(` Dung lượng file: ${sizeMb} MB`);
    console.log(` Đường dẫn: ${zipFilePath}`);
    console.log("--------------------------------------------------");

    // 6. Liệt kê các bản backup gần đây trong D:\Backup
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("backup_du_lieu_co_phieu_") && f.endsWith(".zip"))
      .sort()
      .reverse();

    console.log(`[i] Danh sách các bản sao lưu trong ${BACKUP_DIR}:`);
    files.slice(0, 5).forEach((f, idx) => {
      const fStat = fs.statSync(path.join(BACKUP_DIR, f));
      const fMb = (fStat.size / (1024 * 1024)).toFixed(2);
      console.log(`   ${idx + 1}. ${f} (${fMb} MB)`);
    });

    console.log("==================================================");
  } catch (err) {
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    console.error("[!] Lỗi trong quá trình nén sao lưu:", err.message);
    process.exit(1);
  }
}

runBackup();
