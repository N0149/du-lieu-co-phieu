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

export async function migrateDividendHistory() {
  const dbPath = path.join(DATA_DIR, 'dividend_history.db')
  if (!fs.existsSync(dbPath)) {
    console.log('[!] Không tìm th?y data/dividend_history.db, b? qua.')
    return
  }

  console.log('\n==================================================')
  console.log('  1. B?T Ð?U MIGRATE L?CH S? C? T?C (DIVIDENDS)')
  console.log('==================================================')

  const db = new DatabaseSync(dbPath, { readOnly: true })
  const rows = db.prepare('SELECT symbol, events_json, updated_at FROM dividend_history').all()
  console.log(`[+] Ðã d?c ${rows.length} b?n ghi c? t?c t? SQLite.`)

  const BATCH_SIZE = 100
  let successCount = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE).map((r) => {
      let parsed = []
      try {
        parsed = JSON.parse(r.events_json)
      } catch {
        parsed = []
      }
      return {
        symbol: r.symbol.toUpperCase().trim(),
        events_json: parsed,
        updated_at: r.updated_at || new Date().toISOString(),
      }
    })

    let retries = 3
    let ok = false
    while (retries > 0 && !ok) {
      const { error } = await supabase.from('dividend_history').upsert(chunk, { onConflict: 'symbol' })
      if (!error) {
        ok = true
        successCount += chunk.length
        process.stdout.write(`\r[>] Ðã t?i lên ${successCount}/${rows.length} b?n ghi C? t?c...`)
      } else {
        retries--
        console.error(`\n[!] L?i t?i batch ${i}-${i + chunk.length}:`, error.message, `Th? l?i (${retries})...`)
        await sleep(1000)
      }
    }
  }

  console.log(`\n Hoàn t?t migrate C? t?c: ${successCount}/${rows.length} b?n ghi.\n`)
  db.close()
}

export async function migrateCompanyProfiles() {
  const dbPath = path.join(DATA_DIR, 'company_profiles.db')
  if (!fs.existsSync(dbPath)) {
    console.log('[!] Không tìm th?y data/company_profiles.db, b? qua.')
    return
  }

  console.log('==================================================')
  console.log('  2. B?T Ð?U MIGRATE H? SO DOANH NGHI?P & C? ÐÔNG')
  console.log('==================================================')

  const db = new DatabaseSync(dbPath, { readOnly: true })
  const rows = db.prepare('SELECT symbol, foreign_rate, state_rate, other_rate, raw_json, updated_at FROM company_profiles').all()
  console.log(`[+] Ðã d?c ${rows.length} b?n ghi h? so doanh nghi?p t? SQLite.`)

  const BATCH_SIZE = 50
  let successCount = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE).map((r) => {
      let parsed = {}
      try {
        parsed = JSON.parse(r.raw_json)
      } catch {
        parsed = {}
      }
      return {
        symbol: r.symbol.toUpperCase().trim(),
        foreign_rate: r.foreign_rate != null ? Number(r.foreign_rate) : null,
        state_rate: r.state_rate != null ? Number(r.state_rate) : null,
        other_rate: r.other_rate != null ? Number(r.other_rate) : null,
        raw_json: parsed,
        updated_at: r.updated_at || new Date().toISOString(),
      }
    })

    let retries = 3
    let ok = false
    while (retries > 0 && !ok) {
      const { error } = await supabase.from('company_profiles').upsert(chunk, { onConflict: 'symbol' })
      if (!error) {
        ok = true
        successCount += chunk.length
        process.stdout.write(`\r[>] Ðã t?i lên ${successCount}/${rows.length} b?n ghi H? so cty...`)
      } else {
        retries--
        console.error(`\n[!] L?i t?i batch ${i}-${i + chunk.length}:`, error.message, `Th? l?i (${retries})...`)
        await sleep(1000)
      }
    }
  }

  console.log(`\n Hoàn t?t migrate H? so cty: ${successCount}/${rows.length} b?n ghi.\n`)
  db.close()
}

export async function migrateStockEvaluations() {
  const dbPath = path.join(DATA_DIR, 'stock_evaluations.db')
  if (!fs.existsSync(dbPath)) {
    console.log('[!] Không tìm th?y data/stock_evaluations.db, b? qua.')
    return
  }

  console.log('==================================================')
  console.log('  3. B?T Ð?U MIGRATE ÐÁNH GIÁ 360° & Ð?NH GIÁ L?CH S?')
  console.log('==================================================')

  const db = new DatabaseSync(dbPath, { readOnly: true })
  const rows = db.prepare('SELECT symbol, score360_total, score360_rating, pe_vs_median, pb_vs_median, ps_vs_median, pe_forward, pb_forward, pe_forward_vs_median, pb_forward_vs_median, raw_json, updated_at FROM stock_evaluations').all()
  console.log(`[+] Ðã d?c ${rows.length} b?n ghi Ðánh giá & Ð?nh giá l?ch s? t? SQLite.`)

  const BATCH_SIZE = 25
  let successCount = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE).map((r) => {
      let parsed = {}
      try {
        parsed = JSON.parse(r.raw_json)
      } catch {
        parsed = {}
      }
      return {
        symbol: r.symbol.toUpperCase().trim(),
        score360_total: r.score360_total != null ? Number(r.score360_total) : null,
        score360_rating: r.score360_rating || null,
        pe_vs_median: r.pe_vs_median != null ? Number(r.pe_vs_median) : null,
        pb_vs_median: r.pb_vs_median != null ? Number(r.pb_vs_median) : null,
        ps_vs_median: r.ps_vs_median != null ? Number(r.ps_vs_median) : null,
        pe_forward: r.pe_forward != null ? Number(r.pe_forward) : null,
        pb_forward: r.pb_forward != null ? Number(r.pb_forward) : null,
        pe_forward_vs_median: r.pe_forward_vs_median != null ? Number(r.pe_forward_vs_median) : null,
        pb_forward_vs_median: r.pb_forward_vs_median != null ? Number(r.pb_forward_vs_median) : null,
        raw_json: parsed,
        updated_at: r.updated_at || new Date().toISOString(),
      }
    })

    let retries = 3
    let ok = false
    while (retries > 0 && !ok) {
      const { error } = await supabase.from('stock_evaluations').upsert(chunk, { onConflict: 'symbol' })
      if (!error) {
        ok = true
        successCount += chunk.length
        process.stdout.write(`\r[>] Ðã t?i lên ${successCount}/${rows.length} b?n ghi Ðánh giá 360 & Ð?nh giá...`)
      } else {
        retries--
        console.error(`\n[!] L?i t?i batch ${i}-${i + chunk.length}:`, error.message, `Th? l?i (${retries})...`)
        await sleep(1500)
      }
    }
  }

  console.log(`\n Hoàn t?t migrate Ðánh giá 360 & Ð?nh giá: ${successCount}/${rows.length} b?n ghi.\n`)
  db.close()
}

async function main() {
  const start = Date.now()
  await migrateDividendHistory()
  await migrateCompanyProfiles()
  await migrateStockEvaluations()
  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\n==================================================`)
  console.log(` Hoàn t?t d?ng b? 100% d? li?u lên Supabase trong ${elapsed} giây!`)
  console.log(`==================================================\n`)
}

main().catch((err) => {
  console.error('[!] L?i nghiêm tr?ng:', err)
})
