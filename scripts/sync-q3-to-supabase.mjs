/**
 * Script đồng bộ các doanh nghiệp có BCTC Quý 3/2026 lên Supabase Cloud Database.
 * Giúp website sản xuất (dolieudautu.com trên Vercel) hiển thị đầy đủ số liệu và chỉ số mới nhất.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pxtmuwrpuywrkclobfpa.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Jjx3eb2edh-gxHZKYEZIog_UyWNqV9Z";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const dbPath = path.join(DATA_DIR, "financial_statements.db");
  if (!fs.existsSync(dbPath)) {
    console.error("Không tìm thấy financial_statements.db");
    process.exit(1);
  }

  const db = new DatabaseSync(dbPath, { readOnly: true });

  // 1. Tìm tất cả các mã có Q3 2026 (2026-09-30)
  const q3SymbolsRows = db.prepare(`
    SELECT DISTINCT symbol 
    FROM financial_statements 
    WHERE period_type = 'quarter' AND fiscal_dates LIKE '%2026-09-30%'
  `).all();

  const q3Symbols = new Set(q3SymbolsRows.map((r) => r.symbol));
  console.log(`===================================================================`);
  console.log(`🚀 ĐỒNG BỘ BCTC QUÝ 3/2026 LÊN SUPABASE CLOUD DATABASE`);
  console.log(`📋 Số lượng doanh nghiệp có BCTC Quý 3: ${q3Symbols.size} mã`);
  console.log(`===================================================================\n`);

  // Lấy toàn bộ bản ghi (cả quarter và annual) của các mã này
  const allRows = db.prepare(`
    SELECT symbol, period_type, fiscal_dates, cdkt, kqkd, lctt, data_source, updated_at
    FROM financial_statements
  `).all().filter((r) => q3Symbols.has(r.symbol));

  console.log(`Tổng số bản ghi (Quý + Năm) cần tải lên: ${allRows.length}`);

  const BATCH_SIZE = 25;
  let successCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const chunk = allRows.slice(i, i + BATCH_SIZE).map((r) => {
      let dates = [];
      let cdkt = [];
      let kqkd = [];
      let lctt = [];
      try { dates = JSON.parse(r.fiscal_dates); } catch {}
      try { cdkt = JSON.parse(r.cdkt); } catch {}
      try { kqkd = JSON.parse(r.kqkd); } catch {}
      try { lctt = JSON.parse(r.lctt); } catch {}

      return {
        symbol: r.symbol,
        period_type: r.period_type,
        fiscal_dates: dates,
        cdkt: cdkt,
        kqkd: kqkd,
        lctt: lctt,
        data_source: r.data_source || "Ruatichsan",
        updated_at: r.updated_at || new Date().toISOString(),
      };
    });

    let retries = 3;
    let ok = false;
    while (retries > 0 && !ok) {
      try {
        const { error } = await supabase
          .from("financial_statements")
          .upsert(chunk, { onConflict: "symbol,period_type" });

        if (!error) {
          ok = true;
          successCount += chunk.length;
          const pct = ((successCount / allRows.length) * 100).toFixed(1);
          process.stdout.write(`\r[${successCount}/${allRows.length}] (${pct}%) Đồng bộ lên Supabase thành công...`);
        } else {
          retries--;
          console.error(`\n[!] Lỗi batch ${i}:`, error.message, `Thử lại (${retries})...`);
          await sleep(1500);
        }
      } catch (err) {
        retries--;
        console.error(`\n[!] Exception batch ${i}:`, err.message, `Thử lại (${retries})...`);
        await sleep(1500);
      }
    }
  }

  db.close();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n===================================================================`);
  console.log(`🎉 HOÀN TẤT ĐỒNG BỘ: ${successCount}/${allRows.length} bản ghi lên Supabase trong ${elapsed}s!`);
  console.log(`🌐dolieuDautu.com đã sẵn sàng phục vụ dữ liệu BCTC Quý 3/2026.`);
  console.log(`===================================================================`);
}

main().catch(console.error);
