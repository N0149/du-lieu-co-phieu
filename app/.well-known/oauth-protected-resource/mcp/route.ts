import { NextRequest, NextResponse } from 'next/server'
import { getBaseUrl, MCP_CORS_HEADERS } from '@/lib/mcp/oauth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req)

  return NextResponse.json(
    {
      resource: baseUrl,
      authorization_servers: [baseUrl],
      bearer_methods_supported: ['header'],
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        ...MCP_CORS_HEADERS,
      },
    }
  )
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: MCP_CORS_HEADERS,
  })
}
