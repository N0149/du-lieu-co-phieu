import { NextRequest, NextResponse } from 'next/server'
import { getCustomsDriverProfile, searchCustomsProfiles, getAllDriverProfiles } from '@/lib/customs-profiles'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker')
  const query = req.nextUrl.searchParams.get('q')

  if (ticker) {
    const profile = getCustomsDriverProfile(ticker)
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found', ticker }, { status: 404 })
    }
    return NextResponse.json({ ticker: ticker.toUpperCase(), profile })
  }

  if (query) {
    const results = searchCustomsProfiles(query)
    return NextResponse.json({ query, count: results.length, results })
  }

  // Return all available tickers
  const all = getAllDriverProfiles()
  const tickers = Object.keys(all).sort()
  return NextResponse.json({ count: tickers.length, tickers })
}
