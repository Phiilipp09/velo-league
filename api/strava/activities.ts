import { appendCookies, cookies, exchangeToken, tokenCookies } from './_shared'

export default async function handler(req: any, res: any) {
  const saved = cookies(req)
  if (!saved.velo_strava_refresh) return res.status(401).json({ error: 'Strava ist noch nicht verbunden.' })
  try {
    let accessToken = saved.velo_strava_access
    const expiresAt = Number(saved.velo_strava_expires || 0)
    if (!accessToken || expiresAt < Math.floor(Date.now() / 1000) + 60) {
      const tokens = await exchangeToken({ grant_type: 'refresh_token', refresh_token: saved.velo_strava_refresh })
      accessToken = tokens.access_token
      appendCookies(res, tokenCookies(tokens))
    }
    const response = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=30', { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!response.ok) return res.status(response.status).json({ error: 'Strava-Fahrten konnten nicht geladen werden.' })
    const activities = await response.json()
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ activities })
  } catch {
    return res.status(500).json({ error: 'Die Strava-Verbindung konnte nicht aktualisiert werden.' })
  }
}
