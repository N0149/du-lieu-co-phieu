import { NextRequest, NextResponse } from 'next/server'
import { getBaseUrl, MCP_CORS_HEADERS } from '@/lib/mcp/oauth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req)

  return NextResponse.json(
    {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      registration_endpoint: `${baseUrl}/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      scopes_supported: ['mcp'],
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
