import { NextRequest, NextResponse } from 'next/server'
import { registerClient, MCP_CORS_HEADERS } from '@/lib/mcp/oauth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const clientName = body.client_name || 'Gemini/Claude Assistant'
    const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : []

    const client = registerClient(clientName, redirectUris)

    return NextResponse.json(
      {
        client_id: client.client_id,
        client_id_issued_at: Math.floor(client.created_at / 1000),
        client_name: client.client_name,
        grant_types: ['authorization_code', 'refresh_token'],
        redirect_uris: client.redirect_uris,
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
      },
      {
        status: 201,
        headers: MCP_CORS_HEADERS,
      }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: 'invalid_client_metadata', error_description: msg },
      { status: 400, headers: MCP_CORS_HEADERS }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: MCP_CORS_HEADERS,
  })
}
