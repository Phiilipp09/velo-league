import { appendCookies, authenticatedUser, cookies, exchangeToken, tokenCookies } from './_shared.js'

// Test-Saison: Nur Fahrten ab dem 1. August 2026 werden von Strava geladen.
const SEASON_START_UNIX = Math.floor(Date.UTC(2026, 7, 1) / 1000)

export default async function handler(req,res){
  const user=await authenticatedUser(req),saved=cookies(req)
  if(!user||saved.velo_strava_owner!==user.id||!saved.velo_strava_refresh)return res.status(401).json({error:'Strava ist für dieses Konto noch nicht verbunden.'})
  try{
    let access=saved.velo_strava_access
    if(!access||Number(saved.velo_strava_expires||0)<Math.floor(Date.now()/1000)+60){
      const tokens=await exchangeToken({grant_type:'refresh_token',refresh_token:saved.velo_strava_refresh})
      access=tokens.access_token
      appendCookies(res,tokenCookies(tokens))
    }
    const query=new URLSearchParams({per_page:'30',after:String(SEASON_START_UNIX)})
    const response=await fetch(`https://www.strava.com/api/v3/athlete/activities?${query}`,{headers:{Authorization:`Bearer ${access}`}})
    if(!response.ok)return res.status(response.status).json({error:'Strava-Fahrten konnten nicht geladen werden.'})
    res.setHeader('Cache-Control','no-store')
    return res.status(200).json({activities:await response.json()})
  }catch{return res.status(500).json({error:'Die Strava-Verbindung konnte nicht aktualisiert werden.'})}
}
