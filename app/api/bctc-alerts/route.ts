import { NextResponse } from 'next/server'
import { fetchLiveBctcAlerts } from '@/lib/bctc-alerts-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const alerts = await fetchLiveBctcAlerts()
    return NextResponse.json({
      success: true,
      total: alerts.length,
      items: alerts,
      lastUpdated: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
