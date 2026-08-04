import { useCallback, useEffect, useState } from 'react'
import { getGroups, getRides, type LiveGroup, type LiveRide } from './supabaseData'

export type SeasonStats = {
  rides: LiveRide[]
  kilometers: number
  elevation: number
  points: number
  movingSeconds: number
  longestKilometers: number
}

export const emptySeasonStats: SeasonStats = { rides: [], kilometers: 0, elevation: 0, points: 0, movingSeconds: 0, longestKilometers: 0 }

export type RiderRating = { overall: number; mountain: number; endurance: number; activity: number; competition: number; form: number; activeWeeks: number; provisional: boolean }
type RatingOptions = { points?: number; wins?: number; jerseys?: number }
const ratingClamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

export function calculateRiderRating(rides: LiveRide[], options: RatingOptions = {}): RiderRating {
  const now = Date.now()
  const inDays = (days: number) => rides.filter(ride => new Date(ride.started_at).getTime() >= now - days * 86_400_000)
  const windowRides = inDays(56)
  const recentRides = inDays(14)
  const kilometers = windowRides.reduce((sum, ride) => sum + ride.distance_m / 1000, 0)
  const elevation = windowRides.reduce((sum, ride) => sum + ride.elevation_m, 0)
  const hours = windowRides.reduce((sum, ride) => sum + (ride.moving_time_s || 0) / 3600, 0)
  const longest = windowRides.reduce((best, ride) => Math.max(best, ride.distance_m / 1000), 0)
  const activeWeeks = new Set(windowRides.map(ride => { const date = new Date(ride.started_at); const monday = new Date(date); monday.setDate(date.getDate() - ((date.getDay() + 6) % 7)); return monday.toISOString().slice(0, 10) })).size
  const newestRide = rides.reduce<number | null>((latest, ride) => Math.max(latest || 0, new Date(ride.started_at).getTime()), null)
  const daysSinceRide = newestRide ? Math.max(0, Math.floor((now - newestRide) / 86_400_000)) : 99
  const mountain = ratingClamp(elevation / 4500 * 70 + (kilometers ? elevation / kilometers : 0) * 2.5)
  const endurance = ratingClamp(kilometers / 350 * 60 + hours / 20 * 20 + longest / 120 * 20)
  const activity = ratingClamp(windowRides.length / 12 * 55 + activeWeeks / 8 * 45)
  const competition = ratingClamp((options.points || 0) / 1800 * 65 + (options.wins || 0) * 10 + (options.jerseys || 0) * 5)
  const recency = Math.max(0, 100 - Math.max(0, daysSinceRide - 1) * 5)
  const form = ratingClamp(recentRides.length * 22 * 0.65 + recency * 0.35)
  const weighted = mountain * .25 + endurance * .30 + activity * .20 + competition * .15 + form * .10
  const hasPerformance = Boolean(rides.length || options.points || options.wins)
  const overall = hasPerformance ? Math.min(99, Math.max(30, Math.round(30 + weighted * .7))) : 30
  return { overall, mountain, endurance, activity, competition, form, activeWeeks, provisional: windowRides.length < 5 || activeWeeks < 4 }
}

export function calculateSeasonStats(rides: LiveRide[]): SeasonStats {
  return rides.reduce<SeasonStats>((stats, ride) => ({
    rides: [...stats.rides, ride],
    kilometers: stats.kilometers + ride.distance_m / 1000,
    elevation: stats.elevation + ride.elevation_m,
    points: stats.points + ride.points,
    movingSeconds: stats.movingSeconds + (ride.moving_time_s || 0),
    longestKilometers: Math.max(stats.longestKilometers, ride.distance_m / 1000),
  }), emptySeasonStats)
}

export function useLiveSeason(userId?: string) {
  const [groups, setGroups] = useState<LiveGroup[]>([])
  const [stats, setStats] = useState<SeasonStats>(emptySeasonStats)
  const [loading, setLoading] = useState(Boolean(userId))

  const refresh = useCallback(async () => {
    if (!userId) { setGroups([]); setStats(emptySeasonStats); setLoading(false); return }
    setLoading(true)
    try {
      const [nextGroups, allRides] = await Promise.all([getGroups(), getRides()])
      setGroups(nextGroups)
      const active = nextGroups.find(group => group.id === localStorage.getItem(`velo-active-group:${userId}`)) || nextGroups[0]
      if (active) localStorage.setItem(`velo-active-group:${userId}`, active.id)
      else localStorage.removeItem(`velo-active-group:${userId}`)
      setStats(calculateSeasonStats(allRides.filter(ride => ride.user_id === userId)))
    } finally { setLoading(false) }
  }, [userId])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 5000)
    return () => window.clearInterval(timer)
  }, [refresh])
  useEffect(() => {
    const handleChange = () => void refresh()
    window.addEventListener('velo-data-changed', handleChange)
    return () => window.removeEventListener('velo-data-changed', handleChange)
  }, [refresh])

  return { groups, stats, loading, refresh }
}

export const announceLiveDataChange = () => window.dispatchEvent(new Event('velo-data-changed'))
