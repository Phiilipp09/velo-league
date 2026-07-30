import { cookies } from './_shared.js'
export default function handler(req, res) { res.setHeader('Cache-Control', 'no-store'); return res.status(200).json({ connected: Boolean(cookies(req).velo_strava_refresh) }) }
