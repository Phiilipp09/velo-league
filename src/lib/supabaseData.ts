import { getSupabaseAccessToken, getSupabaseConfig, isSupabaseConfigured } from './supabaseAuth'

export type LiveProfile = { id: string; display_name: string; birth_date?: string | null; gender?: string | null; height_cm?: number | null; weight_kg?: number | null; rider_level?: string | null; onboarding_completed?: boolean }
export type LiveGroup = { id: string; name: string; invite_code: string; owner_id: string; created_at: string }
export type LiveMember = { user_id: string; role: string; profiles?: { display_name?: string } | null }
export type LiveRide = { id: string; user_id: string; group_id?: string | null; title: string; source: 'manual' | 'strava'; distance_m: number; elevation_m: number; moving_time_s?: number | null; points: number; started_at: string }
export type LiveChallenge = { id: string; group_id: string; challenger_id: string; opponent_id: string; title: string; goal: string; reward?: string | null; status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed'; ends_at?: string | null; created_at: string }

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
export const getGroupMembers = (groupId: string) => db<LiveMember[]>(`group_members?group_id=eq.${encodeURIComponent(groupId)}&select=user_id,role,profiles(display_name)&order=joined_at.asc`)
export async function joinGroup(inviteCode: string) { return db<string>('rpc/join_group_by_invite', { method: 'POST', body: JSON.stringify({ code: inviteCode }) }, 'return=representation') }
export const getRides = (groupId?: string) => db<LiveRide[]>(`rides?select=*&order=started_at.desc${groupId ? `&group_id=eq.${encodeURIComponent(groupId)}` : ''}`)
export async function saveRide(input: Omit<LiveRide, 'id'> & { user_id: string; group_id?: string | null; external_id?: string | null }) {
  const rows = await db<LiveRide[]>('rides', { method: 'POST', body: JSON.stringify(input) }, 'return=representation')
  return rows[0]
}
export const getChallenges = (groupId: string) => db<LiveChallenge[]>(`challenges?group_id=eq.${encodeURIComponent(groupId)}&select=*&order=created_at.desc`)
export async function createChallenge(input: Omit<LiveChallenge, 'id' | 'created_at' | 'status'>) {
  const rows = await db<LiveChallenge[]>('challenges', { method: 'POST', body: JSON.stringify({ ...input, status: 'pending' }) }, 'return=representation')
  return rows[0]
}
export async function updateChallengeStatus(id: string, status: LiveChallenge['status']) {
  const rows = await db<LiveChallenge[]>(`challenges?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }, 'return=representation')
  return rows[0]
}
