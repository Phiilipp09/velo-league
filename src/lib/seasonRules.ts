import type { LiveMember, LiveRide } from './supabaseData'

export type JerseyKey = 'yellow' | 'polka' | 'white' | 'red' | 'violet'
export type Standing = { userId: string; name: string; points: number; elevation: number; week: number; month: number; young: number }
const cutoff = (days: number) => new Date(Date.now() - days * 86400000)
const under23 = (birthDate?: string | null) => { if (!birthDate) return false; const birth = new Date(birthDate), now = new Date(); let age = now.getFullYear() - birth.getFullYear(); if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age--; return age < 23 }
export function seasonStandings(members: LiveMember[], rides: LiveRide[]): Standing[] { return members.map(member => { const own = rides.filter(ride => ride.user_id === member.user_id), total = (list: LiveRide[]) => list.reduce((sum, ride) => sum + ride.points, 0), points = total(own); return { userId: member.user_id, name: member.profiles?.display_name || 'Rider', points, elevation: own.reduce((sum, ride) => sum + ride.elevation_m, 0), week: total(own.filter(ride => new Date(ride.started_at) >= cutoff(7))), month: total(own.filter(ride => new Date(ride.started_at) >= cutoff(30))), young: under23(member.profiles?.birth_date) ? points : 0 } }) }
export function jerseyLeaders(standings: Standing[]) {
  const by = (key: keyof Standing, allowed?: (standing: Standing) => boolean) => standings
    .filter(item => Number(item[key]) > 0 && (!allowed || allowed(item)))
    .sort((a, b) => Number(b[key]) - Number(a[key]))[0]
  return { yellow: by('points'), polka: by('elevation'), white: by('young', item => item.young > 0), red: by('week'), violet: by('month') }
}
