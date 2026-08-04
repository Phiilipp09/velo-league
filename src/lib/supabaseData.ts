import { getSupabaseAccessToken, getSupabaseConfig, isSupabaseConfigured } from './supabaseAuth'

export type LiveProfile = { id: string; display_name: string; avatar?: string | null; team_name?: string | null; birth_date?: string | null; gender?: string | null; height_cm?: number | null; weight_kg?: number | null; rider_level?: string | null; bike_brand?: string | null; bike_model?: string | null; bike_type?: string | null; onboarding_completed?: boolean }
export type LiveGroup = { id: string; name: string; invite_code: string; owner_id: string; created_at: string; season_name?: string | null; season_year?: number | null; season_ends_at?: string | null; season_closed_at?: string | null }
export type LiveMember = { user_id: string; role: string; rider_number?: number | null; profiles?: { display_name?: string; birth_date?: string | null; team_name?: string | null } | null }
export type LiveRide = { id: string; user_id: string; group_id?: string | null; external_id?: string | null; title: string; source: 'manual' | 'strava'; distance_m: number; elevation_m: number; moving_time_s?: number | null; points: number; started_at: string }
export type LiveChallenge = { id: string; group_id: string; challenger_id?: string | null; creator_id: string; opponent_id: string; winner_id?: string | null; title: string; goal: string; goal_text: string; challenge_type?: string; target_value?: number | null; target_unit?: string | null; jersey_key?: string | null; reward?: string | null; reward_text?: string | null; status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed'; starts_at?: string; ends_at: string; created_at: string }
export type PointAdjustment = { id: string; group_id: string; user_id: string; points: number; reason: string; challenge_id?: string | null }
export type LiveEvent = { id: string; group_id: string; creator_id: string; title: string; starts_at: string; details?: string | null; created_at: string }
export type EventRsvp = { event_id: string; user_id: string; status: 'accepted' | 'declined' | 'pending' }
export type LiveNotification = { id: string; user_id: string; group_id?: string | null; type: string; title: string; body?: string | null; read_at?: string | null; created_at: string }
export type JerseyHistory = { id: string; group_id: string; jersey_key: string; user_id: string; started_at: string; ended_at?: string | null; reason?: string | null; profiles?: { display_name?: string } | null }
export type SeasonCardSnapshot = { id: string; group_id: string; user_id: string; season_year: number; rarity: 'bronze' | 'silver' | 'gold' | 'legend'; total_points: number; wins: number; kilometers: number; elevation_m: number; titles: string[]; created_at: string }

async function db<T>(path: string, options: RequestInit = {}, prefer?: string): Promise<T> {
  const { url, key } = getSupabaseConfig()
  const token = getSupabaseAccessToken()
  if (!isSupabaseConfigured || !url || !key || !token) throw new Error('Bitte melde dich erneut an.')
  const response = await fetch(`${url}/rest/v1/${path}`, { ...options, headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}), ...(options.headers || {}) } })
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.message || body.hint || 'Speichern fehlgeschlagen.') }
  // PostgREST antwortet bei `return=minimal` je nach Umgebung mit 201 oder 204
  // und ohne Body. Das ist trotzdem ein erfolgreicher Speichervorgang.
  if (response.status === 204) return undefined as T
  const body = await response.text()
  return (body ? JSON.parse(body) : undefined) as T
}

export async function saveProfile(profile: LiveProfile) {
  const rows = await db<LiveProfile[]>('profiles?on_conflict=id', { method: 'POST', body: JSON.stringify(profile) }, 'resolution=merge-duplicates,return=representation')
  return rows[0]
}
export const getProfile = async (id: string) => (await db<LiveProfile[]>(`profiles?id=eq.${encodeURIComponent(id)}&select=*`))[0] || null
export const getGroups = () => db<LiveGroup[]>('groups?select=*&order=created_at.desc')
export async function resolveActiveGroupId(userId: string) {
  const key = `velo-active-group:${userId}`
  const saved = localStorage.getItem(key)
  const groups = await getGroups()
  const active = groups.find(group => group.id === saved) || groups[0]
  if (active) localStorage.setItem(key, active.id)
  else localStorage.removeItem(key)
  return active?.id || null
}
export async function createGroup(name: string, ownerId: string) {
  const rows = await db<LiveGroup[]>('groups', { method: 'POST', body: JSON.stringify({ name, owner_id: ownerId }) }, 'return=representation')
  const group = rows[0]
  await db('group_members', { method: 'POST', body: JSON.stringify({ group_id: group.id, user_id: ownerId, role: 'admin' }) }, 'return=minimal')
  return group
}
export async function updateGroupName(groupId: string, name: string) {
  const rows = await db<LiveGroup[]>(`groups?id=eq.${encodeURIComponent(groupId)}`, { method: 'PATCH', body: JSON.stringify({ name }) }, 'return=representation')
  return rows[0]
}
export async function updateGroupSeason(groupId: string, input: { season_name?: string | null; season_year?: number | null; season_ends_at?: string | null }) {
  const rows = await db<LiveGroup[]>(`groups?id=eq.${encodeURIComponent(groupId)}`, { method: 'PATCH', body: JSON.stringify(input) }, 'return=representation')
  return rows[0]
}
export const closeGroupSeason = (groupId: string, seasonYear: number, seasonName: string) => db<string>('rpc/close_group_season', { method: 'POST', body: JSON.stringify({ target_group_id: groupId, target_year: seasonYear, target_name: seasonName }) }, 'return=representation')
export const getGroupMembers = (groupId: string) => db<LiveMember[]>(`group_members?group_id=eq.${encodeURIComponent(groupId)}&select=user_id,role,rider_number,profiles(display_name,birth_date,team_name)&order=joined_at.asc`)
export async function joinGroup(inviteCode: string) { return db<string>('rpc/join_group_by_invite', { method: 'POST', body: JSON.stringify({ code: inviteCode }) }, 'return=representation') }
export const getRides = (groupId?: string) => db<LiveRide[]>(`rides?select=*&order=started_at.desc${groupId ? `&group_id=eq.${encodeURIComponent(groupId)}` : ''}`)
export async function saveRide(input: Omit<LiveRide, 'id'> & { user_id: string; group_id?: string | null; external_id?: string | null }) {
  const rows = await db<LiveRide[]>('rides', { method: 'POST', body: JSON.stringify(input) }, 'return=representation')
  return rows[0]
}
export async function deleteRide(id: string) { await db(`rides?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }, 'return=minimal') }
export const getOwnRides = (userId: string) => db<LiveRide[]>(`rides?user_id=eq.${encodeURIComponent(userId)}&select=*&order=started_at.desc`)
export const getChallenges = (groupId: string) => db<LiveChallenge[]>(`challenges?group_id=eq.${encodeURIComponent(groupId)}&select=*&order=created_at.desc`)
export async function createChallenge(input: Omit<LiveChallenge, 'id' | 'created_at' | 'status' | 'goal_text' | 'reward_text' | 'starts_at'>) {
  const creatorId = input.creator_id || input.challenger_id
  const rows = await db<LiveChallenge[]>('challenges', { method: 'POST', body: JSON.stringify({
    ...input,
    creator_id: creatorId,
    challenge_type: input.challenge_type || 'free',
    goal_text: input.goal,
    reward_text: input.reward || '100 Saisonpunkte',
    starts_at: new Date().toISOString(),
    status: 'pending'
  }) }, 'return=representation')
  return rows[0]
}
export async function updateChallengeStatus(id: string, status: LiveChallenge['status']) {
  const body = status === 'accepted' ? { status, starts_at: new Date().toISOString() } : { status }
  const rows = await db<LiveChallenge[]>(`challenges?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }, 'return=representation')
  return rows[0]
}
export const completeChallenge = (challengeId: string) => db<string | null>('rpc/complete_challenge', { method: 'POST', body: JSON.stringify({ target_challenge_id: challengeId }) }, 'return=representation')
export const getPointAdjustments = (groupId?: string) => db<PointAdjustment[]>(`season_point_adjustments?select=*${groupId ? `&group_id=eq.${encodeURIComponent(groupId)}` : ''}`)
export async function updateMemberRole(groupId: string, userId: string, role: 'admin' | 'member') { await db(`group_members?group_id=eq.${encodeURIComponent(groupId)}&user_id=eq.${encodeURIComponent(userId)}`, { method: 'PATCH', body: JSON.stringify({ role }) }, 'return=minimal') }
export async function transferGroupOwnership(groupId: string, fromUserId: string, nextOwnerId: string) { await updateMemberRole(groupId, nextOwnerId, 'admin'); await updateMemberRole(groupId, fromUserId, 'member'); await db(`groups?id=eq.${encodeURIComponent(groupId)}`, { method: 'PATCH', body: JSON.stringify({ owner_id: nextOwnerId }) }, 'return=minimal') }
export async function removeMember(groupId: string, userId: string) { await db(`group_members?group_id=eq.${encodeURIComponent(groupId)}&user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE' }, 'return=minimal') }
export const getEvents = (groupId: string) => db<LiveEvent[]>(`group_events?group_id=eq.${encodeURIComponent(groupId)}&select=*&order=starts_at.asc`)
export async function createEvent(event: Omit<LiveEvent, 'id' | 'created_at'>) { const rows=await db<LiveEvent[]>('group_events',{method:'POST',body:JSON.stringify(event)},'return=representation'); return rows[0] }
export const getEventRsvps = (eventId: string) => db<EventRsvp[]>(`event_rsvps?event_id=eq.${encodeURIComponent(eventId)}&select=*`)
export async function setEventRsvp(eventId: string, userId: string, status: EventRsvp['status']) { const rows = await db<EventRsvp[]>('event_rsvps?on_conflict=event_id,user_id', { method: 'POST', body: JSON.stringify({ event_id: eventId, user_id: userId, status }) }, 'resolution=merge-duplicates,return=representation'); return rows[0] }
export const getNotifications = (userId: string, groupIds: string[]) => {
  if (!groupIds.length) return Promise.resolve([] as LiveNotification[])
  const ids = groupIds.map(id => `"${id}"`).join(',')
  return db<LiveNotification[]>(`notifications?user_id=eq.${encodeURIComponent(userId)}&group_id=in.(${encodeURIComponent(`(${ids})`)})&read_at=is.null&select=*&order=created_at.desc`)
}
export async function createNotification(note: Omit<LiveNotification, 'id' | 'created_at' | 'read_at'>) { await db('notifications', { method: 'POST', body: JSON.stringify(note) }, 'return=minimal') }
export async function deleteNotification(id: string) { await db(`notifications?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }, 'return=minimal') }
export const notifyGroupEvent = (eventId: string) => db('rpc/notify_group_event', { method: 'POST', body: JSON.stringify({ target_event_id: eventId }) }, 'return=minimal')
export const notifyChallenge = (challengeId: string, action: 'requested' | 'accepted' | 'completed') => db('rpc/notify_challenge', { method: 'POST', body: JSON.stringify({ target_challenge_id: challengeId, action }) }, 'return=minimal')
export async function getJerseyHistory(groupId: string) {
  const rows = await db<(Omit<JerseyHistory, 'started_at' | 'ended_at'> & { earned_at: string; lost_at?: string | null })[]>(`jersey_history?group_id=eq.${encodeURIComponent(groupId)}&select=*,profiles(display_name)&order=earned_at.desc`)
  return rows.map(row => ({ ...row, started_at: row.earned_at, ended_at: row.lost_at }))
}
export const syncJerseyHistory = (groupId: string) => db('rpc/sync_jersey_history', { method: 'POST', body: JSON.stringify({ target_group_id: groupId }) }, 'return=minimal')
export const getSeasonCardSnapshots = (groupId: string, userId: string) => db<SeasonCardSnapshot[]>(`season_card_snapshots?group_id=eq.${encodeURIComponent(groupId)}&user_id=eq.${encodeURIComponent(userId)}&select=*&order=season_year.desc`)
