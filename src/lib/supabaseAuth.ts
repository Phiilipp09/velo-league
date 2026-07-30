const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined
const tokenKey = 'velo-supabase-access-token'

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

type AuthResponse = { access_token?: string; user?: { id: string; email?: string; user_metadata?: { display_name?: string } }; error?: { message?: string } }
async function request(path: string, body?: Record<string, unknown>, token?: string) {
  const response = await fetch(`${supabaseUrl}${path}`, { method: body ? 'POST' : 'GET', headers: { apikey: supabaseKey!, Authorization: `Bearer ${token || supabaseKey!}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  return await response.json() as AuthResponse
}
export async function signUpWithSupabase(email: string, password: string, name: string, birthDate: string) {
  return request('/auth/v1/signup', { email, password, data: { display_name: name, birth_date: birthDate } })
}
export async function signInWithSupabase(email: string, password: string) {
  const result = await request('/auth/v1/token?grant_type=password', { email, password })
  if (result.access_token) localStorage.setItem(tokenKey, result.access_token)
  return result
}
export async function restoreSupabaseUser() {
  if (!isSupabaseConfigured) return null
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const fromLink = hash.get('access_token')
  if (fromLink) { localStorage.setItem(tokenKey, fromLink); history.replaceState(null, '', window.location.pathname) }
  const token = fromLink || localStorage.getItem(tokenKey)
  if (!token) return null
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: supabaseKey!, Authorization: `Bearer ${token}` } })
  if (!response.ok) return null
  return await response.json() as { id: string; email?: string; user_metadata?: { display_name?: string } }
}
