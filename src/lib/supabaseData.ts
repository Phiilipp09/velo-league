import { getSupabaseAccessToken, getSupabaseConfig, isSupabaseConfigured } from './supabaseAuth'

export type LiveProfile = { id: string; display_name: string; birth_date?: string | null; gender?: string | null; height_cm?: number | null; weight_kg?: number | null; rider_level?: string | null; onboarding_completed?: boolean }
export type LiveGroup = { id: string; name: string; invite_code: string; owner_id: string; created_at: string }
export type LiveMember = { user_id: string; role: string; profiles?: { display_name?: string; birth_date?: string | null } | null }
export type LiveRide = { id: string; user_id: string; group_id?: string | null; external_id?: string | null; title: string; source: 'manual' | 'strava'; distance_m: number; elevation_m: number; moving_time_s?: number | null; points: number; started_at: string }
export type LiveChallenge = { id: string; group_id: string; challenger_id?: string | null; creator_id: string; opponent_id: string; title: string; goal: string; goal_text: string; challenge_type?: string; target_value?: number | null; target_unit?: string | null; jersey_key?: string | null; reward?: string | null; reward_text?: string | null; status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed'; starts_at?: string; ends_at: string; created_at: string }
export type LiveEvent = { id: string; group_id: string; creator_id: string; title: string; starts_at: string; details?: string | null; created_at: string }
export type JerseyHistory = { id: string; group_id: string; jersey_key: string; user_id: string; started_at: string; ended_at?: string | null; reason?: string | null; profiles?: { display_name?: string } | null }

async function db<T>(path: string, options: RequestInit = {}, prefer?: string): Promise<T> {
  const { url, key } = getSupabaseConfig()
  const token = getSupabaseAccessToken()
  if (!isSupabaseConfigured || !url || !key || !token) throw new Error('Bitte melde dich erneut an.')
  const response = await fetch(`${url}/rest/v1/${path}`, { ...options, headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}), ...(options.headers || {}) } })
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.message || body.hint || 'Speichern fehlgeschlagen.') }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function saveProfile(profile: LiveProfile) {
  const rows = await db<LiveProfile[]>('profiles?on_conflict=id', { method: 'POST', body: JSON.stringify(profile) }, 'resolution=merge-duplicates,return=representation')
  return rows[0]
}
export const getProfile = async (id: string) => (await db<LiveProfile[]>(`profiles?id=eq.${encodeURIComponent(id)}&select=*`))[0] || null
export const getGroups = () => db<LiveGroup[]>('groups?select=*&order=created_at.desc')
export async function createGroup(name: string, ownerId: string) {
  const rows = await db<LiveGroup[]>('groups', { method: 'POST', body: JSON.stringify({ name, owner_id: ownerId }) }, 'return=representation')
  const group = rows[0]
  await db('group_members', { method: 'POST', body: JSON.stringify({ group_id: group.id, user_id: ownerId, role: 'admin' }) }, 'return=minimal')
  return group
}
export const getGroupMembers = (groupId: string) => db<LiveMember[]>(`group_members?group_id=eq.${encodeURIComponent(groupId)}&select=user_id,role,profiles(display_name,birth_date)&order=joined_at.asc`)
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
  const rows = await db<LiveChallenge[]>(`challenges?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }, 'return=representation')
  return rows[0]
}
export async function updateMemberRole(groupId: string, userId: string, role: 'admin' | 'member') { await db(`group_members?group_id=eq.${encodeURIComponent(groupId)}&user_id=eq.${encodeURIComponent(userId)}`, { method: 'PATCH', body: JSON.stringify({ role }) }, 'return=minimal') }
export async function removeMember(groupId: string, userId: string) { await db(`group_members?group_id=eq.${encodeURIComponent(groupId)}&user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE' }, 'return=minimal') }
export const getEvents = (groupId: string) => db<LiveEvent[]>(`group_events?group_id=eq.${encodeURIComponent(groupId)}&select=*&order=starts_at.asc`)
export async function createEvent(event: Omit<LiveEvent, 'id' | 'created_at'>) { const rows=await db<LiveEvent[]>('group_events',{method:'POST',body:JSON.stringify(event)},'return=representation'); return rows[0] }
export async function getJerseyHistory(groupId: string) {
  const rows = await db<(Omit<JerseyHistory, 'started_at' | 'ended_at'> & { earned_at: string; lost_at?: string | null })[]>(`jersey_history?group_id=eq.${encodeURIComponent(groupId)}&select=*,profiles(display_name)&order=earned_at.desc`)
  return rows.map(row => ({ ...row, started_at: row.earned_at, ended_at: row.lost_at }))
}
export const syncJerseyHistory = (groupId: string) => db('rpc/sync_jersey_history', { method: 'POST', body: JSON.stringify({ target_group_id: groupId }) }, 'return=minimal')
