import { Activity, Bike, CalendarDays, Flag, House, LogOut, Trophy, UserRound, Users } from 'lucide-react'
import type { Page } from '../App'
import type { SeasonStats } from '../lib/liveSeason'

const nav: { id: Page; label: string; icon: typeof House; mobile?: boolean }[] = [
  { id: 'dashboard', label: 'Start', icon: House, mobile: true },
  { id: 'group', label: 'Gruppe', icon: Users, mobile: true },
  { id: 'league', label: 'Liga', icon: Trophy, mobile: true },
  { id: 'activities', label: 'Fahrten', icon: Activity, mobile: true },
  { id: 'calendar', label: 'Kalender', icon: CalendarDays },
  { id: 'challenges', label: 'Challenges', icon: Flag },
  { id: 'profile', label: 'Profil', icon: UserRound, mobile: true },
]

export function Sidebar({ page, setPage }: { page: Page; setPage: (page: Page) => void; demo?: boolean; stats: SeasonStats }) {
  const logout = () => {
    ;['velo-session', 'velo-supabase-access-token', 'velo-demo-mode'].forEach(key => {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    })
    window.location.assign(window.location.pathname)
  }

  return <nav className="sidebar">
    <button className="brand brand-button" onClick={() => setPage('dashboard')} aria-label="Zur Startseite"><span className="brand-mark"><Bike size={24}/></span><span>VELO <b>LEAGUE</b></span></button>
    <div className="nav-list">{nav.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => setPage(item.id)} className={`${page === item.id ? 'nav-item active' : 'nav-item'} ${item.mobile ? 'mobile-nav' : 'desktop-only-mobile'}`}><Icon size={19}/><span>{item.label}</span></button> })}</div>
    <button className="logout-button" onClick={logout}><LogOut size={16}/> Abmelden</button>
  </nav>
}
