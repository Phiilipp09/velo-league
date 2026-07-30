import { appendCookies, configured, cookie, getAppOrigin, getOrigin } from './_shared'

export default function handler(req: any, res: any) {
  if (!configured()) return res.redirect(302, '/?strava=configuration-error#activities')
  if (getOrigin(req) !== getAppOrigin(req)) return res.redirect(302, `${getAppOrigin(req)}/api/strava/connect`)
  const state = crypto.randomUUID()
  appendCookies(res, [cookie('velo_strava_state', state, 600, '/api/strava')])
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: `${getAppOrigin(req)}/api/strava/callback`,
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
    state,
  })
  res.redirect(302, `https://www.strava.com/oauth/authorize?${params}`)
}
