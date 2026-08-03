import { useEffect, useState } from 'react'
import { Bike, Flame, LogOut, Mountain, Settings, Trophy, X, Zap } from 'lucide-react'
import { Card, Jersey, SectionHeading } from '../components/Ui'
import { getChallenges, getGroupMembers, getJerseyHistory, getPointAdjustments, getProfile, getRides, saveProfile, syncJerseyHistory, type JerseyHistory, type LiveGroup } from '../lib/supabaseData'
import { jerseyLeaders, seasonStandings, type JerseyKey } from '../lib/seasonRules'
import type { SeasonStats } from '../lib/liveSeason'

type RiderProfile = { name?: string; team?: string; gender?: string; height?: string; weight?: string; level?: string }
const format = (value: number) => Math.round(value).toLocaleString('de-DE')
const jerseyTitle: Record<JerseyKey, string> = { yellow: 'Gelbes Trikot', polka: 'Bergtrikot', white: 'Young Rider', red: 'Form der Woche', violet: 'Form des Monats' }

export function ProfileLive({ user, userId, groups, stats, hasGroup }: { user: string; userId?: string; groups: LiveGroup[]; stats: SeasonStats; hasGroup: boolean }) {
  const [profile, setProfile] = useState<RiderProfile>(() => JSON.parse(localStorage.getItem(`velo-rider-profile:${user}`) || '{}'))
  const [settings, setSettings] = useState(false)
  const [jerseys, setJerseys] = useState<JerseyKey[]>([])
  const [history, setHistory] = useState<JerseyHistory[]>([])
  const [riderNumber, setRiderNumber] = useState<number | null>(null)
  const [wins, setWins] = useState(0)
  const [adjustmentPoints, setAdjustmentPoints] = useState(0)
  const displayName = profile.name || user
  const active = groups.find(group => group.id === (userId ? localStorage.getItem(`velo-active-group:${userId}`) : '')) || groups[0]

  useEffect(() => {
    if (!userId) return
    void getProfile(userId).then(storedProfile => {
      if (!storedProfile) return
      const next = { name: storedProfile.display_name, team: storedProfile.team_name || '', gender: storedProfile.gender || '', height: storedProfile.height_cm?.toString() || '', weight: storedProfile.weight_kg?.toString() || '', level: storedProfile.rider_level || '' }
      setProfile(next)
      localStorage.setItem(`velo-rider-profile:${user}`, JSON.stringify(next))
    }).catch(() => undefined)
  }, [userId, user])

  useEffect(() => {
    if (!active || !userId) return
    void Promise.all([getProfile(userId), getGroupMembers(active.id), getRides(active.id), getChallenges(active.id), getPointAdjustments(active.id)]).then(async ([storedProfile, members, rides, challenges, adjustments]) => {
      if (storedProfile) {
        const next = { name: storedProfile.display_name, team: storedProfile.team_name || '', gender: storedProfile.gender || '', height: storedProfile.height_cm?.toString() || '', weight: storedProfile.weight_kg?.toString() || '', level: storedProfile.rider_level || '' }
        setProfile(next)
        localStorage.setItem(`velo-rider-profile:${user}`, JSON.stringify(next))
      }
      setRiderNumber(members.find(member => member.user_id === userId)?.rider_number || null)
      setWins(challenges.filter(challenge => challenge.status === 'completed' && challenge.winner_id === userId).length)
      setAdjustmentPoints(adjustments.filter(item => item.user_id === userId).reduce((sum, item) => sum + item.points, 0))
      const leaders = jerseyLeaders(seasonStandings(members, rides))
      setJerseys((Object.entries(leaders) as [JerseyKey, { userId: string } | undefined][]).filter(([, holder]) => holder?.userId === userId).map(([key]) => key))
      try { await syncJerseyHistory(active.id); setHistory(await getJerseyHistory(active.id)) } catch { setHistory([]) }
    }).catch(() => undefined)
  }, [active?.id, userId, stats.points, user])

  const save = async (next: RiderProfile) => {
    try {
      if (userId) await saveProfile({ id: userId, display_name: next.name || user, team_name: next.team || null, gender: next.gender || null, height_cm: next.height ? Number(next.height) : null, weight_kg: next.weight ? Number(next.weight) : null, rider_level: next.level || 'Fortgeschritten', onboarding_completed: true })
    } finally {
      setProfile(next)
      localStorage.setItem(`velo-rider-profile:${user}`, JSON.stringify(next))
      setSettings(false)
    }
  }
  const logout = () => { ['velo-session', 'velo-supabase-access-token', 'velo-demo-mode'].forEach(key => { localStorage.removeItem(key); sessionStorage.removeItem(key) }); window.location.assign(window.location.pathname) }
  const totalPoints = stats.points + adjustmentPoints

  return <div className="page">
    <RiderCard name={displayName} group={active} team={profile.team} level={profile.level} number={riderNumber} jersey={jerseys[0]} points={totalPoints} wins={wins} kilometers={stats.kilometers} elevation={stats.elevation}/>
    <Card className="profile-hero"><button aria-label="Profileinstellungen öffnen" onClick={() => setSettings(true)} className="profile-settings"><Settings size={18}/></button><div className="profile-avatar">{displayName.slice(0, 1).toUpperCase()}</div><div><p className="eyebrow">DEIN FAHRERPROFIL</p><h2>{displayName}</h2><p>{profile.level || 'Rider'} · {stats.rides.length ? `${stats.rides.length} Fahrt${stats.rides.length === 1 ? '' : 'en'} in dieser Saison` : 'Saisonstart'}</p></div></Card>
    <SectionHeading eyebrow="DEINE WERTUNGEN" title="Trikots"/>
    {jerseys.length ? <Card className="empty-inline"><Jersey type={jerseys[0]} small/><div><strong>Du trägst aktuell {jerseys.map(key => jerseyTitle[key]).join(' · ')}.</strong><p>Die Wertungen werden automatisch aus den Gruppenfahrten berechnet.</p></div></Card> : <Card className="empty-inline"><Jersey type="yellow" small/><div><strong>Noch kein Trikot vergeben.</strong><p>{hasGroup ? 'Mit deiner nächsten Fahrt kannst du eine Wertung übernehmen.' : 'Tritt einer Gruppe bei, um an Wertungen teilzunehmen.'}</p></div></Card>}
    <div className="jersey-shelf muted-jerseys">{[['yellow', 'Gelbes Trikot', 'Meiste Saisonpunkte'], ['polka', 'Bergtrikot', 'Meiste Höhenmeter'], ['white', 'Young Rider', 'Beste U23-Wertung'], ['red', 'Form der Woche', 'Meiste Punkte in 7 Tagen'], ['violet', 'Form des Monats', 'Meiste Punkte in 30 Tagen']].map(([type, title, text]) => <div className="jersey-card" key={title}><Jersey type={type}/><div><strong>{title}</strong><span>{text}</span></div></div>)}</div>
    <SectionHeading eyebrow="DEINE MEILENSTEINE" title="Abzeichen"/>
    <div className="achievement-grid"><Badge icon={Mountain} title="Bergziege" requirement="10.000 Höhenmeter in einer Saison" progress={`${format(stats.elevation)} / 10.000 hm`}/><Badge icon={Bike} title="5000 km Fahrer" requirement="5.000 Kilometer in einer Saison fahren" progress={`${format(stats.kilometers)} / 5.000 km`}/><Badge icon={Flame} title="5 Siege Serie" requirement="5 Challenges hintereinander gewinnen" progress="Noch offen"/><Badge icon={Zap} title="Form der Woche" requirement="Meiste Punkte innerhalb von 7 Tagen" progress={stats.rides.length ? `${format(totalPoints)} PTS bisher` : 'Noch offen'}/><Badge icon={Trophy} title="Duell-Champion" requirement="Erste Challenge gewinnen" progress={`${wins} / 1 Sieg`}/></div>
    <SectionHeading eyebrow="SAISON 2026" title="Trikot-Historie"/>
    {history.length ? <div className="event-list">{history.map(entry => <Card className="event-card" key={entry.id}><Jersey type={entry.jersey_key} small/><div><h3>{jerseyTitle[entry.jersey_key as JerseyKey] || entry.jersey_key} · {entry.profiles?.display_name || 'Rider'}</h3><p>{new Date(entry.started_at).toLocaleDateString('de-DE')} {entry.ended_at ? `bis ${new Date(entry.ended_at).toLocaleDateString('de-DE')}` : '· aktuell'}</p></div></Card>)}</div> : <Card className="empty-inline"><Bike size={20}/><div><strong>Noch keine Historie.</strong><p>Nach der ersten automatischen Wertung erscheint der erste Eintrag hier.</p></div></Card>}
    <button className="profile-logout" onClick={logout}><LogOut size={17}/> Abmelden</button>
    {settings && <ProfileSettings initial={{ ...profile, name: displayName }} onClose={() => setSettings(false)} onSave={save}/>} 
  </div>
}

function RiderCard({ name, group, team, level, number, jersey, points, wins, kilometers, elevation }: { name: string; group?: LiveGroup; team?: string; level?: string; number: number | null; jersey?: JerseyKey; points: number; wins: number; kilometers: number; elevation: number }) {
  const cardJersey = jersey || 'plain'
  const rarity = points >= 2500 ? 'LEGEND' : points >= 1200 ? 'GOLD' : points >= 500 ? 'SILBER' : 'BRONZE'
  return <section className={`rider-card rider-card-${cardJersey}`} aria-label="Deine VELO LEAGUE Fahrerkarte"><div className="rider-card-glow"/><header><div className="rider-card-brand">VELO <b>LEAGUE</b></div><span>SEASON 2026</span></header><div className="rider-card-content"><div className="rider-card-identity"><p>FAHRERKARTE</p><strong>#{String(number || 0).padStart(2, '0')}</strong><h2>{name}</h2><span>{team || 'INDEPENDENT RIDERS'}</span><small>{group?.name || 'NOCH KEINE LIGA'}</small></div><div className="rider-card-avatar"><div>{name.slice(0, 1).toUpperCase()}</div><Jersey type={cardJersey}/></div></div><div className="rider-card-stats"><div><b>{format(points)}</b><span>GESAMTPUNKTE</span></div><div><b>{wins}</b><span>ETAPPENSIEGE</span></div><div><b>{format(kilometers)} km</b><span>DISTANZ</span></div><div><b>{format(elevation)} hm</b><span>HÖHENMETER</span></div></div><footer><span>{level || 'RIDER'} · {jersey ? jerseyTitle[jersey] : 'AUF DEM WEG ZUM ERSTEN TRIKOT'}</span><b>{rarity}</b></footer></section>
}

function Badge({ icon: Icon, title, requirement, progress }: { icon: typeof Mountain; title: string; requirement: string; progress: string }) { return <Card className="achievement achievement-button"><span className="yellow"><Icon/></span><strong>{title}</strong><p>{requirement}</p><small>{progress}</small></Card> }
function ProfileSettings({ initial, onClose, onSave }: { initial: RiderProfile; onClose: () => void; onSave: (profile: RiderProfile) => void }) { const [form, setForm] = useState(initial); const update = (key: keyof RiderProfile, value: string) => setForm(current => ({ ...current, [key]: value })); return <div className="modal-backdrop profile-settings-backdrop" onClick={onClose}><section className="profile-settings-modal" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={onClose}><X size={18}/></button><p className="eyebrow">PROFIL & KÖRPERDATEN</p><h2>Deine Einstellungen</h2><div className="settings-fields"><label>Name<input value={form.name || ''} onChange={event => update('name', event.target.value)}/></label><label>Team (optional)<input placeholder="z. B. Alpine Riders" value={form.team || ''} onChange={event => update('team', event.target.value)}/></label><label>Größe (cm)<input inputMode="numeric" value={form.height || ''} onChange={event => update('height', event.target.value)}/></label><label>Gewicht (kg)<input inputMode="decimal" value={form.weight || ''} onChange={event => update('weight', event.target.value)}/></label><label>Geschlecht<select value={form.gender || ''} onChange={event => update('gender', event.target.value)}><option value="">Bitte auswählen</option><option>Männlich</option><option>Weiblich</option><option>Divers</option><option>Keine Angabe</option></select></label><label>Fahrniveau<select value={form.level || 'Fortgeschritten'} onChange={event => update('level', event.target.value)}><option>Einsteiger</option><option>Fortgeschritten</option><option>Ambitioniert</option><option>Elite Rider</option></select></label></div><div className="settings-actions"><button className="secondary-button" onClick={onClose}>Abbrechen</button><button className="primary-button" onClick={() => onSave(form)}>Speichern</button></div></section></div> }
