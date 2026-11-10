import { NextRequest, NextResponse } from 'next/server'
import {
  verifyAuthCode,
  verifyPkce,
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  MCP_CORS_HEADERS,
} from '@/lib/mcp/oauth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    let grantType = ''
    let code = ''
    let redirectUri = ''
    let codeVerifier = ''
    let refreshToken = ''

    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData()
      grantType = (formData.get('grant_type') as string) || ''
      code = (formData.get('code') as string) || ''
      redirectUri = (formData.get('redirect_uri') as string) || ''
      codeVerifier = (formData.get('code_verifier') as string) || ''
      refreshToken = (formData.get('refresh_token') as string) || ''
    } else {
      const body = await req.json().catch(() => ({}))
      grantType = body.grant_type || ''
      code = body.code || ''
      redirectUri = body.redirect_uri || ''
      codeVerifier = body.code_verifier || ''
      refreshToken = body.refresh_token || ''
    }

    if (grantType === 'authorization_code') {
      if (!code) {
        return NextResponse.json(
          { error: 'invalid_request', error_description: 'Thiếu mã code authorization' },
          { status: 400, headers: MCP_CORS_HEADERS }
        )
      }

      const authData = verifyAuthCode(code)
      if (!authData) {
        return NextResponse.json(
          { error: 'invalid_grant', error_description: 'Mã code không hợp lệ hoặc đã hết hạn' },
          { status: 400, headers: MCP_CORS_HEADERS }
        )
      }

      // Kiểm tra PKCE nếu có code_challenge
      if (authData.codeChallenge) {
        if (!codeVerifier) {
          return NextResponse.json(
            { error: 'invalid_grant', error_description: 'Thiếu code_verifier cho PKCE' },
            { status: 400, headers: MCP_CORS_HEADERS }
          )
        }
        const pkceValid = verifyPkce(codeVerifier, authData.codeChallenge, authData.codeChallengeMethod)
        if (!pkceValid) {
          return NextResponse.json(
            { error: 'invalid_grant', error_description: 'PKCE code_verifier không khớp' },
            { status: 400, headers: MCP_CORS_HEADERS }
          )
        }
      }

      const scope = authData.scope || 'mcp'
      const accessToken = createAccessToken(authData.userId, authData.email, scope)
      const newRefreshToken = createRefreshToken(authData.userId, authData.email)

      return NextResponse.json(
        {
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: 30 * 24 * 60 * 60, // 30 ngày
          scope,
          refresh_token: newRefreshToken,
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

    if (grantType === 'refresh_token') {
      if (!refreshToken) {
        return NextResponse.json(
          { error: 'invalid_request', error_description: 'Thiếu mã refresh_token' },
          { status: 400, headers: MCP_CORS_HEADERS }
        )
      }

      const tokenPayload = verifyRefreshToken(refreshToken)
      if (!tokenPayload) {
        return NextResponse.json(
          { error: 'invalid_grant', error_description: 'Mã refresh_token không hợp lệ hoặc đã hết hạn' },
          { status: 400, headers: MCP_CORS_HEADERS }
        )
      }

      // Cấp mới access_token và refresh_token từ refresh_token hợp lệ
      const accessToken = createAccessToken(tokenPayload.userId, tokenPayload.email)
      const newRefreshToken = createRefreshToken(tokenPayload.userId, tokenPayload.email)
      return NextResponse.json(
        {
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: 30 * 24 * 60 * 60,
          scope: 'mcp',
          refresh_token: newRefreshToken,
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

    return NextResponse.json(
      { error: 'unsupported_grant_type', error_description: 'Chỉ hỗ trợ authorization_code hoặc refresh_token' },
      { status: 400, headers: MCP_CORS_HEADERS }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: 'server_error', error_description: msg },
      { status: 500, headers: MCP_CORS_HEADERS }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: MCP_CORS_HEADERS,
  })
}
