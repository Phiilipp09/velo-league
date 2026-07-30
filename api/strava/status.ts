import { cookies } from './_shared'

export default function handler(req: any, res: any) {
  const data = cookies(req)
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ connected: Boolean(data.velo_strava_refresh) })
}
