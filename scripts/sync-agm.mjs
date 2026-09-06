import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SOURCE_DIR = 'D:\\hoc\\lap trinh\\tai-lieu-PDF\\ket_qua_trich_xuat'
const TARGET_DIR = path.resolve(__dirname, '../content/agm/2026')

export function syncAgmFiles() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ Thư mục nguồn không tồn tại: ${SOURCE_DIR}`)
    return
  }

  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true })
  }

  const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.md'))
  let copiedCount = 0

  for (const file of files) {
    const srcPath = path.join(SOURCE_DIR, file)
    const dstPath = path.join(TARGET_DIR, file)
    fs.copyFileSync(srcPath, dstPath)
    copiedCount++
  }

  console.log(`✅ Đã đồng bộ thành công ${copiedCount} file ĐHĐCĐ vào ${TARGET_DIR}`)
}

syncAgmFiles()
