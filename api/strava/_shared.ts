type TokenResponse = {
  access_token: string
  refresh_token: string
  expires_at: number
}

export function getOrigin(req: { headers?: Record<string, string | string[] | undefined> }) {
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '').split(',')[0]
  const proto = String(req.headers?.['x-forwarded-proto'] || 'https').split(',')[0]
  return `${proto}://${host}`
}

export function getAppOrigin(req: { headers?: Record<string, string | string[] | undefined> }) {
  return (process.env.STRAVA_APP_ORIGIN || getOrigin(req)).replace(/\/$/, '')
}

export function cookies(req: { headers?: Record<string, string | string[] | undefined> }) {
  const raw = String(req.headers?.cookie || '')
  return Object.fromEntries(raw.split(';').map(part => {
    const divider = part.indexOf('=')
    return divider === -1 ? [part.trim(), ''] : [part.slice(0, divider).trim(), decodeURIComponent(part.slice(divider + 1))]
  }).filter(([key]) => key))
}

export function cookie(name: string, value: string, maxAge: number, path = '/api/strava') {
  return `${name}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`
}

export function clearCookie(name: string, path = '/api/strava') {
  return cookie(name, '', 0, path)
}

export function appendCookies(res: { setHeader: (name: string, value: string[]) => void }, values: string[]) {
  res.setHeader('Set-Cookie', values)
}

export async function exchangeToken(params: Record<string, string>) {
  const body = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID || '',
    client_secret: process.env.STRAVA_CLIENT_SECRET || '',
    ...params,
  })
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  })
  if (!response.ok) throw new Error('Strava konnte die Verbindung nicht bestätigen.')
  return await response.json() as TokenResponse
}

export function tokenCookies(tokens: TokenResponse) {
  const refreshLifetime = 60 * 60 * 24 * 180
  return [
    cookie('velo_strava_access', tokens.access_token, Math.max(60, tokens.expires_at - Math.floor(Date.now() / 1000))),
    cookie('velo_strava_refresh', tokens.refresh_token, refreshLifetime),
    cookie('velo_strava_expires', String(tokens.expires_at), refreshLifetime),
  ]
}

export function configured() {
  return Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET)
}
