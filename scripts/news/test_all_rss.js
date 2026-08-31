const Parser = require('rss-parser');
const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': '*/*'
  },
  timeout: 8000
});

function sanitizeXml(xml) {
  if (!xml) return '';
  return xml
    .trim()
    .replace(/&(?!(?:amp|apos|quot|lt|gt|[a-zA-Z]+|#[0-9]+|#x[0-9a-fA-F]+);)/gi, '&amp;');
}

async function testTinNhanhCK() {
  const urls = [
    'https://tinnhanhchungkhoan.vn/rss/chung-khoan.rss',
    'https://tinnhanhchungkhoan.vn/rss/doanh-nghiep.rss',
    'https://tinnhanhchungkhoan.vn/rss/tai-chinh.rss',
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const text = await res.text();
      const sanitized = sanitizeXml(text);
      const parsed = await parser.parseString(sanitized);
      console.log(`[OK] ${u} -> ${parsed.items.length} items`);
    } catch(e) {
      console.log(`[FAIL] ${u} -> ${e.message}`);
    }
  }
}
testTinNhanhCK();
