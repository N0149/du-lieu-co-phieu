'use server'

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { createAuthCode } from '@/lib/mcp/oauth'

export async function approveOAuthAction(formData: FormData) {
  const clientId = (formData.get('client_id') as string) || 'gemini'
  const redirectUri = (formData.get('redirect_uri') as string) || ''
  const state = (formData.get('state') as string) || ''
  const codeChallenge = (formData.get('code_challenge') as string) || ''
  const codeChallengeMethod = (formData.get('code_challenge_method') as string) || 'S256'

  if (!redirectUri) {
    redirect('/')
  }

  const user = await getCurrentUser()
  const userId = user?.id || `mcp_user_${Date.now()}`
  const email = user?.email || 'guest@dulieudautu.com'

  const code = createAuthCode({
    userId,
    email,
    clientId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
  })

  const targetUrl = new URL(redirectUri)
  targetUrl.searchParams.set('code', code)
  if (state) {
    targetUrl.searchParams.set('state', state)
  }

  redirect(targetUrl.toString())
}

export async function denyOAuthAction(formData: FormData) {
  const redirectUri = (formData.get('redirect_uri') as string) || ''
  const state = (formData.get('state') as string) || ''

  if (!redirectUri) {
    redirect('/')
  }

  const targetUrl = new URL(redirectUri)
  targetUrl.searchParams.set('error', 'access_denied')
  if (state) {
    targetUrl.searchParams.set('state', state)
  }

  redirect(targetUrl.toString())
}
