// Web Worker xử lý lọc 1.567+ mã cổ phiếu chuyên sâu ngầm trên luồng riêng (Off-thread Filtering)
// Đảm bảo Main Thread luôn đạt 60 - 120 FPS, chuyển động thanh trượt và giao diện luôn mượt mà.

self.onmessage = function (e) {
  const { type, payload } = e.data || {}

  if (type === 'FILTER_STOCKS') {
    const { stocks, selectedExchange, selectedSector, selectedTickers, conditions } = payload

    if (!stocks || stocks.length === 0) {
      self.postMessage({ type: 'FILTER_RESULT', filtered: [] })
      return
    }

    if (!selectedExchange && !selectedSector && (!selectedTickers || selectedTickers.length === 0) && (!conditions || conditions.length === 0)) {
      self.postMessage({ type: 'FILTER_RESULT', filtered: stocks })
      return
    }

    const lowerSector = selectedSector ? selectedSector.toLowerCase() : ''
    const tickerSet = selectedTickers && selectedTickers.length > 0 ? new Set(selectedTickers) : null

    const filtered = stocks.filter((stock) => {
      // 1. Sàn
      if (selectedExchange && stock.exchange !== selectedExchange) {
        return false
      }

      // 2. Ngành
      if (lowerSector) {
        const target = `${stock.sector || ''} ${stock.icbL1 || ''} ${stock.icbL2 || ''}`.toLowerCase()
        if (!target.includes(lowerSector)) return false
      }

      // 3. Ticker
      if (tickerSet && !tickerSet.has(stock.ticker)) {
        return false
      }

      // 4. Conditions
      if (conditions && conditions.length > 0) {
        for (let i = 0; i < conditions.length; i++) {
          const c = conditions[i]
          const val = stock[c.field]
          if (val == null || isNaN(val)) return false

          switch (c.op) {
            case 'gt':
              if (val < c.v1) return false
              break
            case 'lt':
              if (val > c.v1) return false
              break
            case 'between':
              if (val < c.minV || val > c.maxV) return false
              break
            case 'eq':
              if (Math.abs(val - c.v1) > 0.05) return false
              break
          }
        }
      }

      return true
    })

    self.postMessage({ type: 'FILTER_RESULT', filtered })
  }
}
