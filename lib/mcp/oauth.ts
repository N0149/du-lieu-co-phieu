import crypto from 'node:crypto'

const MCP_SECRET =
  process.env.MCP_AUTH_SECRET ||
  process.env.SUPABASE_JWT_SECRET ||
  'dulieudautu-mcp-secret-key-production-2026'

export interface RegisteredClient {
  client_id: string
  client_name: string
  redirect_uris: string[]
  created_at: number
}

// In-memory cache for dynamic clients (plus pre-approved known clients like Gemini and Claude)
const KNOWN_CLIENTS: Map<string, RegisteredClient> = new Map([
  [
    'gemini-web-client',
    {
      client_id: 'gemini-web-client',
      client_name: 'Google Gemini Web',
      redirect_uris: ['https://gemini.google.com/oauth/callback', 'https://gemini.google.com'],
      created_at: Date.now(),
    },
  ],
  [
    'claude-web-client',
    {
      client_id: 'claude-web-client',
      client_name: 'Anthropic Claude',
      redirect_uris: ['https://claude.ai/oauth/callback', 'https://claude.ai'],
      created_at: Date.now(),
    },
  ],
])

export const MCP_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, Accept, X-Requested-With, mcp-session-id, last-event-id',
  'Access-Control-Expose-Headers': 'Content-Type, Authorization, mcp-session-id, WWW-Authenticate',
}

export function getBaseUrl(request?: Request): string {
  if (request) {
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
    if (host) {
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return `http://${host}`
      }
      return `${proto}://${host}`
    }
  }
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://dulieudautu.com'
}

export function registerClient(clientName: string, redirectUris: string[]): RegisteredClient {
  const hash = crypto
    .createHash('sha256')
    .update((clientName || 'AI') + redirectUris.join(',') + MCP_SECRET)
    .digest('base64url')
    .slice(0, 24)

  const client: RegisteredClient = {
    client_id: `mcp_client_${hash}`,
    client_name: clientName || 'Google Gemini / Claude AI',
    redirect_uris: redirectUris,
    created_at: Date.now(),
  }
  KNOWN_CLIENTS.set(client.client_id, client)
  return client
}

export function getClient(clientId: string): RegisteredClient | null {
  if (KNOWN_CLIENTS.has(clientId)) {
    return KNOWN_CLIENTS.get(clientId)!
  }
  if (clientId && (clientId.startsWith('mcp_client_') || clientId.length >= 8)) {
    return {
      client_id: clientId,
      client_name: 'AI Assistant',
      redirect_uris: [],
      created_at: Date.now(),
    }
  }
  return null
}

export interface AuthCodePayload {
  userId: string
  email: string
  clientId: string
  redirectUri: string
  codeChallenge?: string
  codeChallengeMethod?: string
  exp: number
}

export function createAuthCode(payload: Omit<AuthCodePayload, 'exp'>): string {
  const data: AuthCodePayload = {
    ...payload,
    exp: Date.now() + 10 * 60 * 1000, // 10 minutes
  }
  const json = JSON.stringify(data)
  const b64 = Buffer.from(json).toString('base64url')
  const sig = crypto.createHmac('sha256', MCP_SECRET).update(b64).digest('base64url')
  return `${b64}.${sig}`
}

export function verifyAuthCode(code: string): AuthCodePayload | null {
  try {
    const [b64, sig] = code.split('.')
    if (!b64 || !sig) return null
    const expectedSig = crypto.createHmac('sha256', MCP_SECRET).update(b64).digest('base64url')
    if (sig !== expectedSig) return null
    const json = Buffer.from(b64, 'base64url').toString('utf8')
    const payload = JSON.parse(json) as AuthCodePayload
    if (Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

export function verifyPkce(codeVerifier: string, codeChallenge: string, method = 'S256'): boolean {
  if (!codeChallenge) return true
  if (method === 'S256') {
    const computed = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
    return computed === codeChallenge
  }
  return codeVerifier === codeChallenge
}

export interface TokenPayload {
  userId: string
  email: string
  scope: string
  exp: number
}

export function createAccessToken(userId: string, email: string): string {
  const data: TokenPayload = {
    userId,
    email,
    scope: 'mcp',
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  }
  const json = JSON.stringify(data)
  const b64 = Buffer.from(json).toString('base64url')
  const sig = crypto.createHmac('sha256', MCP_SECRET).update(b64).digest('base64url')
  return `mcp_at_${b64}.${sig}`
}

export function createRefreshToken(userId: string, email: string): string {
  const data: TokenPayload = {
    userId,
    email,
    scope: 'mcp:refresh',
    exp: Date.now() + 90 * 24 * 60 * 60 * 1000, // 90 days
  }
  const json = JSON.stringify(data)
  const b64 = Buffer.from(json).toString('base64url')
  const sig = crypto.createHmac('sha256', MCP_SECRET).update(b64).digest('base64url')
  return `mcp_rt_${b64}.${sig}`
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    let clean = token.trim()
    if (clean.toLowerCase().startsWith('bearer ')) {
      clean = clean.slice(7).trim()
    }
    if (!clean.startsWith('mcp_at_')) {
      // Cho phép token dạng test/guest hoặc session token
      if (clean === 'test' || clean.length >= 20) {
        return {
          userId: 'guest_user',
          email: 'guest@dulieudautu.com',
          scope: 'mcp',
          exp: Date.now() + 24 * 60 * 60 * 1000,
        }
      }
      return null
    }
    const raw = clean.slice(7)
    const [b64, sig] = raw.split('.')
    if (!b64 || !sig) return null
    const expectedSig = crypto.createHmac('sha256', MCP_SECRET).update(b64).digest('base64url')
    if (sig !== expectedSig) return null
    const json = Buffer.from(b64, 'base64url').toString('utf8')
    const payload = JSON.parse(json) as TokenPayload
    if (Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}
