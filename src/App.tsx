import { useEffect, useState } from 'react'
import { Activity, BarChart3, Bell, CalendarDays, Flag, House, Map, Trophy, UserRound, Users } from 'lucide-react'
import { Dashboard } from './pages/Dashboard'
import { League } from './pages/League'
import { Segments } from './pages/Segments'
import { Challenges } from './pages/Challenges'
import { Profile } from './pages/Profile'
import { Sidebar } from './components/Sidebar'
import { ActivityHub } from './pages/ActivityHub'
import { SeasonCalendar } from './pages/SeasonCalendar'
import { RiderDetail } from './components/RiderDetail'
import { GroupHub } from './pages/GroupHub'
import { Onboarding } from './components/Onboarding'
import { defaultNotes, type Note, Notifications } from './components/Notifications'
import { AuthGate, getStoredSession } from './components/AuthGate'
import { PerformanceInsights } from './components/PerformanceInsights'
import { restoreSupabaseUser } from './lib/supabaseAuth'

export type Page = 'dashboard' | 'group' | 'league' | 'activities' | 'calendar' | 'segments' | 'challenges' | 'profile'
const pages: Record<Page, { label: string; icon: typeof House }> = { dashboard: { label: 'Dashboard', icon: House }, group: { label: 'Gruppe', icon: Users }, league: { label: 'Liga', icon: Trophy }, activities: { label: 'Fahrten', icon: Activity }, calendar: { label: 'Kalender', icon: CalendarDays }, segments: { label: 'Segmente', icon: Map }, challenges: { label: 'Challenges', icon: Flag }, profile: { label: 'Profil', icon: UserRound } }

export default function App() {
  const [user, setUser] = useState(() => getStoredSession())
  useEffect(() => { void restoreSupabaseUser().then(remoteUser => { if (remoteUser) setUser(remoteUser.user_metadata?.display_name || remoteUser.email?.split('@')[0] || 'Rider') }) }, [])
  const [page, setPage] = useState<Page>(() => new URLSearchParams(window.location.search).has('strava') ? 'activities' : 'dashboard')
  const [notice, setNotice] = useState('')
  const [rider, setRider] = useState<string | null>(null)
  const [onboarding, setOnboarding] = useState(true)
  const [notifications, setNotifications] = useState(false)
  const [performance, setPerformance] = useState(false)
  const [emptyStart] = useState(() => localStorage.getItem('velo-new-user') === 'true')
  const [notes, setNotes] = useState<Note[]>(() => { const saved = localStorage.getItem('velo-notifications'); return saved ? JSON.parse(saved) : defaultNotes })
  const deleteNote = (id: number) => setNotes(current => { const next = current.filter(note => note.id !== id); localStorage.setItem('velo-notifications', JSON.stringify(next)); return next })
  const showNotice = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2500) }
  if (!user) return <AuthGate onAuthenticated={setUser}/>
  return <div className="app-shell"><Sidebar page={page} setPage={setPage}/><main className="main-content"><header className="topbar"><div><p className="eyebrow">SAISON 2026 · ALPINE DIVISION</p><h1>{pages[page].label}</h1></div><div className="top-actions"><button className="icon-button notification-button" onClick={() => setNotifications(!notifications)} aria-label="Benachrichtigungen"><Bell size={19}/>{notes.length > 0 && <i/>}</button><button className="icon-button" onClick={() => setPerformance(true)} aria-label="Leistungsanalyse"><BarChart3 size={19}/></button><button className="avatar" onClick={() => setPage('profile')} aria-label="Profil">{user.slice(0, 1).toUpperCase()}</button></div></header>{page === 'dashboard' && <Dashboard empty={emptyStart} onNavigate={setPage}/>} {page === 'group' && <GroupHub notify={showNotice} onNavigate={setPage}/>} {page === 'league' && <League empty={emptyStart} onNavigate={setPage} onRiderSelect={setRider}/>} {page === 'activities' && <ActivityHub notify={showNotice}/>} {page === 'calendar' && <SeasonCalendar notify={showNotice} onNavigate={setPage}/>} {page === 'segments' && <Segments empty={emptyStart} notify={showNotice}/>} {page === 'challenges' && <Challenges empty={emptyStart} notify={showNotice}/>} {page === 'profile' && <Profile/>}</main>{notice && <div className="toast">{notice}</div>}{rider && <RiderDetail name={rider} onClose={() => setRider(null)}/>} {performance && <PerformanceInsights onClose={() => setPerformance(false)}/>} {notifications && <Notifications notes={notes} onDelete={deleteNote} onClose={() => setNotifications(false)} onNavigate={setPage}/>} {onboarding && <Onboarding onSkip={() => setOnboarding(false)} onFinish={() => { setOnboarding(false); setPage('group'); showNotice('Willkommen in deiner ersten Liga!') }}/>}</div>
}
