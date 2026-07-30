import { appendCookies, clearCookie, cookies } from './_shared'

export default async function handler(req: any, res: any) {
  const saved = cookies(req)
  try {
    if (saved.velo_strava_refresh && process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET) {
      const basic = Buffer.from(`${process.env.STRAVA_CLIENT_ID}:${process.env.STRAVA_CLIENT_SECRET}`).toString('base64')
      await fetch('https://www.strava.com/oauth/revoke', { method: 'POST', headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: saved.velo_strava_refresh, token_type_hint: 'refresh_token' }) })
    }
  } finally {
    appendCookies(res, ['velo_strava_access', 'velo_strava_refresh', 'velo_strava_expires', 'velo_strava_state'].map(name => clearCookie(name)))
  }
  return res.status(200).json({ connected: false })
}
