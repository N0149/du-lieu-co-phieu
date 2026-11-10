'use server'

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { createAuthCode, getClient } from '@/lib/mcp/oauth'
import { isAdminEmail, isVipUser } from '@/lib/admin-auth'

function isValidRedirectUri(redirectUri: string, clientId: string): boolean {
  if (!redirectUri) return false
  try {
    const target = new URL(redirectUri)
    // Chỉ cho phép giao thức http(s)
    if (target.protocol !== 'https:' && target.protocol !== 'http:') {
      return false
    }
    // Chỉ cho phép http trên localhost
    if (target.protocol === 'http:' && target.hostname !== 'localhost' && target.hostname !== '127.0.0.1') {
      return false
    }

    const client = getClient(clientId)
    // Nếu client có danh sách redirect_uris đăng ký sẵn -> Phải khớp domain/origin
    if (client && client.redirect_uris && client.redirect_uris.length > 0) {
      return client.redirect_uris.some((allowed) => {
        try {
          const allowedUrl = new URL(allowed)
          return target.origin === allowedUrl.origin
        } catch {
          return false
        }
      })
    }
    return true
  } catch {
    return false
  }
}

export async function approveOAuthAction(formData: FormData) {
  const clientId = (formData.get('client_id') as string) || 'gemini'
  const redirectUri = (formData.get('redirect_uri') as string) || ''
  const state = (formData.get('state') as string) || ''
  const codeChallenge = (formData.get('code_challenge') as string) || ''
  const codeChallengeMethod = (formData.get('code_challenge_method') as string) || 'S256'

  if (!isValidRedirectUri(redirectUri, clientId)) {
    console.warn(`[OAuth Security] Chặn redirect_uri không hợp lệ hoặc không thuộc client: "${redirectUri}"`)
    redirect('/')
  }

  const user = await getCurrentUser()
  const userId = user?.id || `mcp_user_${Date.now()}`
  const email = user?.email || 'guest@dulieudautu.com'

  const isVip = isAdminEmail(email) || isVipUser(user) || user?.status === 'active'
  const scope = isVip ? 'mcp mcp:vip' : 'mcp'

  const code = createAuthCode({
    userId,
    email,
    clientId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    scope,
  })

  const targetUrl = new URL(redirectUri)
  targetUrl.searchParams.set('code', code)
  if (state) {
    targetUrl.searchParams.set('state', state)
  }

  redirect(targetUrl.toString())
}

export async function denyOAuthAction(formData: FormData) {
  const clientId = (formData.get('client_id') as string) || 'gemini'
  const redirectUri = (formData.get('redirect_uri') as string) || ''
  const state = (formData.get('state') as string) || ''

  if (!isValidRedirectUri(redirectUri, clientId)) {
    redirect('/')
  }

  const targetUrl = new URL(redirectUri)
  targetUrl.searchParams.set('error', 'access_denied')
  if (state) {
    targetUrl.searchParams.set('state', state)
  }

  redirect(targetUrl.toString())
}
