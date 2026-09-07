/**
 * Market Data Scheduler Daemon
 * Tiến trình ngầm tự động kích hoạt bot theo đúng lịch trình đã cấu hình:
 *   1. 12:06 hàng ngày: Cập nhật Giao dịch nội bộ Lần 1 (Bắt tin sáng, đón đầu phiên chiều)
 *   2. 16:16 hàng ngày: Cập nhật Chỉ số Định giá (P/E, P/B, Vốn hóa, Điểm 360°)
 *   3. 18:36 hàng ngày: Cập nhật Giao dịch nội bộ Lần 2 (Chốt tin chiều & cả ngày)
 *   4. 23:00 ngày 1 hàng tháng: Cập nhật Cơ cấu cổ đông lớn & Công ty con
 *
 * Cách chạy:
 *   node scripts/scheduler-daemon.mjs
 *   # hoặc: pnpm scheduler
 */

import { exec } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

let lastRunValuationDate = "";
let lastRunInsiderDate1206 = "";
let lastRunInsiderDate1836 = "";
let lastRunDisclosures1200 = "";
let lastRunDisclosures1800 = "";
let lastRunDisclosures2030 = "";
let lastRunShareholdersMonth = "";

function runCommand(cmd, taskName) {
  const timeStr = new Date().toLocaleTimeString("vi-VN");
  console.log(`\n[${timeStr}] ⏳ ĐANG KÍCH HOẠT NHIỆM VỤ TỰ ĐỘNG: ${taskName}...`);
  console.log(`> ${cmd}`);

  exec(cmd, { cwd: ROOT_DIR }, (error, stdout, stderr) => {
    const finishTime = new Date().toLocaleTimeString("vi-VN");
    if (error) {
      console.error(`[${finishTime}] ❌ LỖI KHI CHẠY ${taskName}:`, error.message);
      return;
    }
    console.log(`[${finishTime}] ✅ HOÀN THÀNH XUẤT SẮC: ${taskName}`);
    if (stdout.trim()) {
      console.log(stdout.trim().split("\n").slice(-3).join("\n"));
    }
  });
}

function checkAndRunSchedule() {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const monthStr = dateStr.slice(0, 7); // YYYY-MM
  const dayOfMonth = now.getDate();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  // 1. Giao dịch nội bộ Lần 1: 12:06 trưa hàng ngày (Đón đầu phiên chiều)
  if (hours === 12 && minutes === 6 && lastRunInsiderDate1206 !== dateStr) {
    lastRunInsiderDate1206 = dateStr;
    runCommand("node scripts/crawl-direct-market.mjs --mode=insider", "GIAO DỊCH NỘI BỘ LẦN 1 (12:06 TRƯA)");
  }

  // 2. Công bố thông tin 3 Sàn Lần 1: 12:00 trưa hàng ngày
  if (hours === 12 && minutes === 0 && lastRunDisclosures1200 !== dateStr) {
    lastRunDisclosures1200 = dateStr;
    runCommand("node scripts/sync-disclosures.mjs", "CÔNG BỐ THÔNG TIN 3 SÀN (12:00 TRƯA)");
  }

  // 3. Chỉ số định giá: 16:16 hàng ngày (Sau phiên ATC)
  if (hours === 16 && minutes === 16 && lastRunValuationDate !== dateStr) {
    lastRunValuationDate = dateStr;
    runCommand("node scripts/crawl-direct-market.mjs --mode=valuation", "CHỈ SỐ ĐỊNH GIÁ (16:16)");
  }

  // 4. Công bố thông tin 3 Sàn Lần 2: 18:00 chiều (Bắt trọn BCTC & Giải trình sau phiên)
  if (hours === 18 && minutes === 0 && lastRunDisclosures1800 !== dateStr) {
    lastRunDisclosures1800 = dateStr;
    runCommand("node scripts/sync-disclosures.mjs", "CÔNG BỐ THÔNG TIN 3 SÀN (18:00 CHIỀU)");
  }

  // 5. Giao dịch nội bộ Lần 2: 18:36 tối hàng ngày (Chốt tin chiều & cả ngày)
  if (hours === 18 && minutes === 36 && lastRunInsiderDate1836 !== dateStr) {
    lastRunInsiderDate1836 = dateStr;
    runCommand("node scripts/crawl-direct-market.mjs --mode=insider", "GIAO DỊCH NỘI BỘ LẦN 2 (18:36 TỐI)");
  }

  // 6. Công bố thông tin 3 Sàn Lần 3: 20:30 tối (Quét chốt ngày)
  if (hours === 20 && minutes === 30 && lastRunDisclosures2030 !== dateStr) {
    lastRunDisclosures2030 = dateStr;
    runCommand("node scripts/sync-disclosures.mjs", "CÔNG BỐ THÔNG TIN 3 SÀN (20:30 TỐI)");
  }

  // 7. Cơ cấu cổ đông lớn & Công ty con: Ngày 1 hàng tháng lúc 23:00
  if (dayOfMonth === 1 && hours === 23 && minutes === 0 && lastRunShareholdersMonth !== monthStr) {
    lastRunShareholdersMonth = monthStr;
    runCommand("node scripts/crawl-direct-market.mjs --mode=shareholders", "CỔ ĐÔNG & CÔNG TY CON (NGÀY 1 HÀNG THÁNG)");
  }
}

console.log("===================================================================");
console.log("   🚀 MARKET DATA SCHEDULER DAEMON ĐANG HOẠT ĐỘNG");
console.log("===================================================================");
console.log(" Lịch trình đã thiết lập:");
console.log("   • 12:00 hàng ngày           : Cập nhật Công bố thông tin 3 Sàn (Lần 1)");
console.log("   • 12:06 hàng ngày           : Cập nhật Giao dịch nội bộ (Lần 1 - Đón phiên chiều)");
console.log("   • 16:16 hàng ngày           : Cập nhật Chỉ số Định giá (P/E, P/B, Điểm 360°)");
console.log("   • 18:00 hàng ngày           : Cập nhật Công bố thông tin 3 Sàn (Lần 2 - Bắt BCTC/Giải trình)");
console.log("   • 18:36 hàng ngày           : Cập nhật Giao dịch nội bộ (Lần 2 - Chốt ngày)");
console.log("   • 20:30 hàng ngày           : Cập nhật Công bố thông tin 3 Sàn (Lần 3 - Chốt tối)");
console.log("   • 23:00 ngày 1 hàng tháng   : Cập nhật Cơ cấu Cổ đông & Công ty con");
console.log("-------------------------------------------------------------------");
console.log(`[${new Date().toLocaleTimeString("vi-VN")}] Daemon đang canh thời gian thực... (Kiểm tra mỗi 30s)`);

// Kiểm tra mỗi 30 giây
setInterval(checkAndRunSchedule, 30000);
checkAndRunSchedule();
