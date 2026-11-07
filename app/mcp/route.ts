// ─────────────────────────────────────────────────────────────────────────────
// app/mcp/route.ts — Remote Model Context Protocol (MCP) Server
// Hỗ trợ kết nối trực tiếp với Google Gemini Web, Claude, ChatGPT, Grok
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createDulieudautuMcpServer } from '@/lib/mcp/server'
import {
  getBaseUrl,
  verifyAccessToken,
  MCP_CORS_HEADERS,
} from '@/lib/mcp/oauth'
import { checkMcpDailyLimit } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Trích xuất và xác thực token truy cập từ request */
function extractAuthToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization') || ''
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim()
  }
  const url = new URL(req.url)
  const queryToken = url.searchParams.get('token') || url.searchParams.get('apiKey')
  if (queryToken) {
    return queryToken.trim()
  }
  return null
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: MCP_CORS_HEADERS,
  })
}

export async function GET(req: NextRequest) {
  const token = extractAuthToken(req)

  // Nếu chưa có token: trả về HTTP 401 kèm WWW-Authenticate OAuth metadata
  // Đây là tín hiệu chuẩn RFC 9728 để Google Gemini Web tự động mở popup "Liên kết tài khoản Google với Dữ Liệu Đầu Tư"
  if (!token) {
    const baseUrl = getBaseUrl(req)
    return new NextResponse(JSON.stringify({ error: 'invalid_token' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': `Bearer realm="MCP", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", error="invalid_token"`,
        ...MCP_CORS_HEADERS,
      },
    })
  }

  // Xác thực token
  const authPayload = verifyAccessToken(token)
  if (!authPayload) {
    const baseUrl = getBaseUrl(req)
    return new NextResponse(JSON.stringify({ error: 'invalid_token' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': `Bearer realm="MCP", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", error="invalid_token"`,
        ...MCP_CORS_HEADERS,
      },
    })
  }

  // Kết nối MCP qua Streamable HTTP / Server-Sent Events
  try {
    const server = createDulieudautuMcpServer()
    const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true })
    await server.connect(transport)

    const response = await transport.handleRequest(req)
    const headers = new Headers(response.headers)
    for (const [k, v] of Object.entries(MCP_CORS_HEADERS)) {
      headers.set(k, v)
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  } catch (err: unknown) {
    console.error('[MCP GET] Lỗi xử lý transport:', err)
    return new NextResponse(
      JSON.stringify({ error: 'mcp_transport_error', message: String(err) }),
      { status: 500, headers: MCP_CORS_HEADERS }
    )
  }
}

export async function POST(req: NextRequest) {
  const token = extractAuthToken(req)

  if (!token) {
    const baseUrl = getBaseUrl(req)
    return new NextResponse(JSON.stringify({ error: 'invalid_token' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': `Bearer realm="MCP", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", error="invalid_token"`,
        ...MCP_CORS_HEADERS,
      },
    })
  }

  const authPayload = verifyAccessToken(token)
  if (!authPayload) {
    const baseUrl = getBaseUrl(req)
    return new NextResponse(JSON.stringify({ error: 'invalid_token' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': `Bearer realm="MCP", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", error="invalid_token"`,
        ...MCP_CORS_HEADERS,
      },
    })
  }

  // Kiểm tra hạn mức 40 câu hỏi / ngày cho tài khoản MCP miễn phí
  const isVip = authPayload.scope?.includes('vip') || false
  const limitCheck = await checkMcpDailyLimit(authPayload.userId || authPayload.email, isVip)
  if (!limitCheck.success) {
    return new NextResponse(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message:
            'Tài khoản miễn phí đã đạt giới hạn tối đa 40 câu hỏi tra cứu MCP mỗi ngày. Vui lòng quay lại vào ngày mai!',
        },
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(limitCheck.reset),
          ...MCP_CORS_HEADERS,
        },
      }
    )
  }

  try {
    const server = createDulieudautuMcpServer()
    const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true })
    await server.connect(transport)

    const response = await transport.handleRequest(req)
    const headers = new Headers(response.headers)
    for (const [k, v] of Object.entries(MCP_CORS_HEADERS)) {
      headers.set(k, v)
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  } catch (err: unknown) {
    console.error('[MCP POST] Lỗi xử lý JSON-RPC:', err)
    return new NextResponse(
      JSON.stringify({ error: 'mcp_jsonrpc_error', message: String(err) }),
      { status: 500, headers: MCP_CORS_HEADERS }
    )
  }
}

export async function DELETE(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: MCP_CORS_HEADERS,
  })
}
