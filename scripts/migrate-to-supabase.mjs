import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pxtmuwrpuywrkclobfpa.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Jjx3eb2edh-gxHZKYEZIog_UyWNqV9Z'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const DATA_DIR = path.resolve(process.cwd(), 'data')

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function migrateBusinessPlans() {
  const dbPath = path.join(DATA_DIR, 'business_plans.db')
  if (!fs.existsSync(dbPath)) {
    console.log('[!] Không tìm thấy data/business_plans.db, bỏ qua.')
    return
  }

  console.log('\n==================================================')
  console.log('  1. BẮT ĐẦU MIGRATE KẾ HOẠCH KINH DOANH')
  console.log('==================================================')

  const db = new DatabaseSync(dbPath, { readOnly: true })
  const rows = db.prepare('SELECT symbol, plan_data, updated_source, updated_at FROM business_plans').all()
  console.log(`[+] Đã đọc ${rows.length} bản ghi Kế hoạch kinh doanh từ SQLite.`)

  const BATCH_SIZE = 100
  let successCount = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE).map((r) => {
      let parsedPlan = []
      try {
        parsedPlan = JSON.parse(r.plan_data)
      } catch {
        parsedPlan = []
      }
      return {
        symbol: r.symbol,
        plan_data: parsedPlan,
        updated_source: r.updated_source || null,
        updated_at: r.updated_at || new Date().toISOString(),
      }
    })

    let retries = 3
    let ok = false
    while (retries > 0 && !ok) {
      const { error } = await supabase.from('business_plans').upsert(chunk, { onConflict: 'symbol' })
      if (!error) {
        ok = true
        successCount += chunk.length
        process.stdout.write(`\r[>] Đã tải lên ${successCount}/${rows.length} bản ghi Kế hoạch KD...`)
      } else {
        retries--
        console.error(`\n[!] Lỗi tải batch ${i}-${i + chunk.length}:`, error.message, `Thử lại (${retries})...`)
        await sleep(1000)
      }
    }
  }

  console.log(`\n Hoàn tất migrate Kế hoạch KD: ${successCount}/${rows.length} bản ghi.\n`)
  db.close()
}

async function migrateFinancialStatements() {
  const dbPath = path.join(DATA_DIR, 'financial_statements.db')
  if (!fs.existsSync(dbPath)) {
    console.log('[!] Không tìm thấy data/financial_statements.db, bỏ qua.')
    return
  }

  console.log('==================================================')
  console.log('  2. BẮT ĐẦU MIGRATE BÁO CÁO TÀI CHÍNH (BCTC)')
  console.log('==================================================')

  const db = new DatabaseSync(dbPath, { readOnly: true })
  const rows = db.prepare('SELECT symbol, period_type, fiscal_dates, cdkt, kqkd, lctt, data_source, updated_at FROM financial_statements').all()
  console.log(`[+] Đã đọc ${rows.length} bản ghi BCTC từ SQLite.`)

  const BATCH_SIZE = 40 // BCTC có kích thước JSON lớn nên chia batch 40
  let successCount = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE).map((r) => {
      let dates = []
      let cdkt = []
      let kqkd = []
      let lctt = []
      try { dates = JSON.parse(r.fiscal_dates) } catch {}
      try { cdkt = JSON.parse(r.cdkt) } catch {}
      try { kqkd = JSON.parse(r.kqkd) } catch {}
      try { lctt = JSON.parse(r.lctt) } catch {}

      return {
        symbol: r.symbol,
        period_type: r.period_type,
        fiscal_dates: dates,
        cdkt: cdkt,
        kqkd: kqkd,
        lctt: lctt,
        data_source: r.data_source || 'Ruatichsan',
        updated_at: r.updated_at || new Date().toISOString(),
      }
    })

    let retries = 3
    let ok = false
    while (retries > 0 && !ok) {
      const { error } = await supabase.from('financial_statements').upsert(chunk, { onConflict: 'symbol,period_type' })
      if (!error) {
        ok = true
        successCount += chunk.length
        process.stdout.write(`\r[>] Đã tải lên ${successCount}/${rows.length} bản ghi BCTC...`)
      } else {
        retries--
        console.error(`\n[!] Lỗi tải batch ${i}-${i + chunk.length}:`, error.message, `Thử lại (${retries})...`)
        await sleep(1500)
      }
    }
  }

  console.log(`\n Hoàn tất migrate Báo cáo tài chính: ${successCount}/${rows.length} bản ghi.\n`)
  db.close()
}

async function main() {
  const start = Date.now()
  await migrateBusinessPlans()
  await migrateFinancialStatements()
  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(` TẤT CẢ DỮ LIỆU ĐÃ ĐƯỢC ĐỒNG BỘ LÊN SUPABASE TRONG ${elapsed} GIÂY!`)
}

main().catch((err) => {
  console.error('[!] Lỗi nghiêm trọng trong quá trình migrate:', err)
})
