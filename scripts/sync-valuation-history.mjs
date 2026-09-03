/**
 * Script tải và lưu trữ dữ liệu Dải định giá lịch sử P/E, P/B, P/S (5-10 năm)
 * và Lịch sử chi trả cổ tức
 *
 * Lưu vào:
 *   data/valuation_history/${symbol}.json
 *   data/dividend_history/${symbol}.json
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");

const VAL_DIR = path.join(DATA_DIR, "valuation_history");
const DIV_DIR = path.join(DATA_DIR, "dividend_history");

fs.mkdirSync(VAL_DIR, { recursive: true });
fs.mkdirSync(DIV_DIR, { recursive: true });

const CIPHER_KEY_HEX = "19dd3af428f4cf7d68864cd4c87d8d1c5b489932e84b93ac6528a0dd403a5725";

async function decryptApiResponse(res) {
  if (res.headers.get("X-Encrypted") !== "1") {
    return await res.json();
  }
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(CIPHER_KEY_HEX.match(/.{2}/g).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["decrypt"]);
  const rawBytes = new Uint8Array(buf);
  const iv = rawBytes.slice(0, 12);
  const ciphertext = rawBytes.slice(12);
  const decryptedBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(decryptedBuf));
}

export async function syncValuationAndDividend(symbol) {
  const sym = symbol.toUpperCase().trim();
  let valOk = false;
  let divOk = false;

  // 1. Valuation
  try {
    const vRes = await fetch(`https://api.ruatichsan.com/api/v1/data/public/valuation/${sym}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Origin: "https://ruatichsan.com",
        Referer: `https://ruatichsan.com/company?symbol=${sym}`
      }
    });
    if (vRes.ok) {
      const vData = await decryptApiResponse(vRes);
      if (vData) {
        fs.writeFileSync(path.join(VAL_DIR, `${sym}.json`), JSON.stringify(vData, null, 2), "utf-8");
        valOk = true;
      }
    }
  } catch (e) {
    console.error(`  [${sym}] Lỗi tải Valuation:`, e.message);
  }

  // 2. Dividend History
  try {
    const dRes = await fetch(`https://api.ruatichsan.com/api/v1/data/public/dividend-history/${sym}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Origin: "https://ruatichsan.com",
        Referer: `https://ruatichsan.com/company?symbol=${sym}`
      }
    });
    if (dRes.ok) {
      const dData = await decryptApiResponse(dRes);
      if (dData) {
        fs.writeFileSync(path.join(DIV_DIR, `${sym}.json`), JSON.stringify(dData, null, 2), "utf-8");
        divOk = true;
      }
    }
  } catch (e) {
    console.error(`  [${sym}] Lỗi tải Dividend:`, e.message);
  }

  return { valOk, divOk };
}

async function main() {
  const args = process.argv.slice(2);
  let targets = [];

  const symArg = args.find((a) => a.startsWith("--symbol="));
  if (symArg) {
    targets = [symArg.split("=")[1].toUpperCase().trim()];
  } else {
    // Mặc định tải cho các mã phổ biến và VN30
    const defaultList = [
      "TCB", "VCB", "MBB", "ACB", "VPB", "CTG", "BID", "HDB", "STB", "SHB",
      "HPG", "FPT", "MWG", "VNM", "VHM", "VIC", "VRE", "MSN", "GAS", "SSI",
      "VND", "DGC", "GMD", "PNJ", "REE", "KDH", "VJC", "PLX", "SAB", "POW"
    ];
    targets = defaultList;
  }

  console.log(`=== BẮT ĐẦU TẢI VALUATION & DIVIDEND (${targets.length} MÃ) ===`);
  const startTime = Date.now();
  let count = 0;

  for (let i = 0; i < targets.length; i++) {
    const sym = targets[i];
    process.stdout.write(`[${i + 1}/${targets.length}] Đang tải ${sym}... `);
    const res = await syncValuationAndDividend(sym);
    if (res.valOk || res.divOk) {
      count++;
      console.log(`✅ OK (Val: ${res.valOk ? '✓' : '✗'}, Div: ${res.divOk ? '✓' : '✗'})`);
    } else {
      console.log(`⚠️ Thất bại`);
    }
    if (i < targets.length - 1) {
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  const dur = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`🎉 HOÀN THÀNH: ${count}/${targets.length} mã trong ${dur}s!`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
