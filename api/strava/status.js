import { authenticatedUser, cookies } from './_shared.js'
export default async function handler(req,res){const user=await authenticatedUser(req),saved=cookies(req);res.setHeader('Cache-Control','no-store');return res.status(200).json({connected:Boolean(user&&saved.velo_strava_refresh&&saved.velo_strava_owner===user.id)})}
