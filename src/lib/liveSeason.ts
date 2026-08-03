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
