import { useEffect, useState } from 'react'
import { Bike, Check, ChevronRight, Crown, Download, Flame, LogOut, Medal, Mountain, Settings, Share2, Trophy, X, Zap } from 'lucide-react'
import { Card, Jersey, SectionHeading } from '../components/Ui'
import { getChallenges, getGroupMembers, getJerseyHistory, getPointAdjustments, getProfile, getRides, getSeasonCardSnapshots, saveProfile, syncJerseyHistory, type JerseyHistory, type LiveGroup, type SeasonCardSnapshot } from '../lib/supabaseData'
import { jerseyLeaders, seasonStandings, type JerseyKey } from '../lib/seasonRules'
import { calculateRiderRating, type SeasonStats } from '../lib/liveSeason'
import '../styles/profile-rating.css'

type RiderProfile = { name?: string; team?: string; gender?: string; height?: string; weight?: string; level?: string; bikeBrand?: string; bikeModel?: string; bikeType?: string }
type ProfileTab = 'card' | 'performance' | 'career'
type Rating = { label: string; value: number; detail: string }
const format = (value: number) => Math.round(value).toLocaleString('de-DE')
const jerseyTitle: Record<JerseyKey, string> = { yellow: 'Gelbes Trikot', polka: 'Bergtrikot', white: 'Young Rider', red: 'Form der Woche', violet: 'Form des Monats' }
const jerseyCardCopy: Record<JerseyKey, { title: string; label: string; description: string }> = {
  yellow: { title: 'SEASON CHAMPION', label: 'Gelbes Trikot', description: 'Du führst die Saisonwertung deiner Liga.' },
  polka: { title: 'KING OF THE MOUNTAINS', label: 'Bergtrikot', description: 'Du führst die Bergwertung deiner Liga.' },
  white: { title: 'BEST YOUNG RIDER', label: 'Young Rider', description: 'Du führst die U23-Wertung deiner Liga.' },
  red: { title: 'FORM DER WOCHE', label: 'Weekly Form', description: 'Du hast die meisten Punkte der letzten 7 Tage.' },
  violet: { title: 'FORM DES MONATS', label: 'Monthly Form', description: 'Du hast die meisten Punkte der letzten 30 Tage.' },
}

export function ProfileLive({ user, userId, groups, stats, hasGroup }: { user: string; userId?: string; groups: LiveGroup[]; stats: SeasonStats; hasGroup: boolean }) {
  const [profile, setProfile] = useState<RiderProfile>(() => JSON.parse(localStorage.getItem(`velo-rider-profile:${user}`) || '{}'))
  const [settings, setSettings] = useState(false)
  const [jerseys, setJerseys] = useState<JerseyKey[]>([])
  const [history, setHistory] = useState<JerseyHistory[]>([])
  const [riderNumber, setRiderNumber] = useState<number | null>(null)
  const [wins, setWins] = useState(0)
  const [adjustmentPoints, setAdjustmentPoints] = useState(0)
  const [seasonCards, setSeasonCards] = useState<SeasonCardSnapshot[]>([])
  const [selectedJersey, setSelectedJersey] = useState<JerseyKey | null>(null)
  const [selectedJerseyArchive, setSelectedJerseyArchive] = useState<JerseyHistory | null>(null)
  const [selectedBadge, setSelectedBadge] = useState<BadgeInfo | null>(null)
  const [tab, setTab] = useState<ProfileTab>('card')
  const displayName = profile.name || user
  const active = groups.find(group => group.id === (userId ? localStorage.getItem(`velo-active-group:${userId}`) : '')) || groups[0]

  useEffect(() => {
    if (!userId) return
    void getProfile(userId).then(storedProfile => {
      if (!storedProfile) return
      const next = profileFromStored(storedProfile)
      setProfile(next)
      localStorage.setItem(`velo-rider-profile:${user}`, JSON.stringify(next))
    }).catch(() => undefined)
  }, [userId, user])

  useEffect(() => {
    if (!active || !userId) return
    void Promise.all([getProfile(userId), getGroupMembers(active.id), getRides(active.id), getChallenges(active.id), getPointAdjustments(active.id)]).then(async ([storedProfile, members, rides, challenges, adjustments]) => {
      if (storedProfile) {
        const next = profileFromStored(storedProfile)
        setProfile(next)
        localStorage.setItem(`velo-rider-profile:${user}`, JSON.stringify(next))
      }
      setRiderNumber(members.find(member => member.user_id === userId)?.rider_number || null)
      setWins(challenges.filter(challenge => challenge.status === 'completed' && challenge.winner_id === userId).length)
      setAdjustmentPoints(adjustments.filter(item => item.user_id === userId).reduce((sum, item) => sum + item.points, 0))
      const leaders = jerseyLeaders(seasonStandings(members, rides))
      setJerseys((Object.entries(leaders) as [JerseyKey, { userId: string } | undefined][]).filter(([, holder]) => holder?.userId === userId).map(([key]) => key))
      try {
        await syncJerseyHistory(active.id)
        const [nextHistory, nextSeasonCards] = await Promise.all([getJerseyHistory(active.id), getSeasonCardSnapshots(active.id, userId)])
        setHistory(nextHistory)
        setSeasonCards(nextSeasonCards)
      } catch { setHistory([]); setSeasonCards([]) }
    }).catch(() => undefined)
  }, [active?.id, userId, stats.points, user])

  const save = async (next: RiderProfile) => {
    try {
      if (userId) { const bike = next.bikeBrand || next.bikeModel || next.bikeType ? { bike_brand: next.bikeBrand || null, bike_model: next.bikeModel || null, bike_type: next.bikeType || null } : {}; await saveProfile({ id: userId, display_name: next.name || user, team_name: next.team || null, gender: next.gender || null, height_cm: next.height ? Number(next.height) : null, weight_kg: next.weight ? Number(next.weight) : null, rider_level: next.level || 'Fortgeschritten', onboarding_completed: true, ...bike }) }
    } finally {
      setProfile(next)
      localStorage.setItem(`velo-rider-profile:${user}`, JSON.stringify(next))
      setSettings(false)
    }
  }
  const logout = () => { ['velo-session', 'velo-supabase-access-token', 'velo-demo-mode'].forEach(key => { localStorage.removeItem(key); sessionStorage.removeItem(key) }); window.location.assign(window.location.pathname) }
  const totalPoints = stats.points + adjustmentPoints
  const riderRating = calculateRiderRating(stats.rides, { points: totalPoints, wins, jerseys: jerseys.length })
  const ratings = makeRatings(stats, totalPoints, wins, jerseys.length, riderRating)
  const overall = riderRating.overall
  const badges = makeBadges(stats, totalPoints, wins)

  return <div className="page">
    <Card className="profile-hero"><button aria-label="Einstellungen öffnen" onClick={() => setSettings(true)} className="profile-settings"><Settings size={18}/></button><div className="profile-avatar">{displayName.slice(0, 1).toUpperCase()}</div><div><p className="eyebrow">DEIN FAHRERPROFIL</p><h2>{displayName}</h2><p>{profile.level || 'Rider'} · {stats.rides.length ? `${stats.rides.length} Fahrten in dieser Saison` : 'Saisonstart'}</p></div></Card>
    <div className="profile-tabs" role="tablist"><button className={tab === 'card' ? 'active' : ''} onClick={() => setTab('card')}>Fahrerkarte</button><button className={tab === 'performance' ? 'active' : ''} onClick={() => setTab('performance')}>Leistung</button><button className={tab === 'career' ? 'active' : ''} onClick={() => setTab('career')}>Karriere</button></div>
    {tab === 'card' && <>
    <RiderCard name={displayName} group={active} team={profile.team} level={profile.level} number={riderNumber} jersey={jerseys[0]} points={totalPoints} wins={wins} kilometers={stats.kilometers} elevation={stats.elevation} overall={overall}/>
    <Card className="card-rating-summary"><div><span>FAHRER-RATING</span><strong>OVR {overall}</strong></div><p>{stats.rides.length ? 'Dein Rating wird ausschließlich aus echten Saisonleistungen berechnet.' : 'Rookie-Startwert – deine erste Fahrt setzt die Leistungswerte in Bewegung.'}</p></Card>
    <SectionHeading eyebrow="DEINE AKTUELLEN TITEL" title="Trikot-Spezialkarten"/>
    <JerseySpecialCards jerseys={jerseys} onSelect={setSelectedJersey}/>
    {!jerseys.length && <Card className="jersey-next-goal"><Jersey type="yellow" small/><div><strong>Deine erste Wertung wartet.</strong><p>{hasGroup ? 'Sammle Saisonpunkte und übernimm die Führung für das Gelbe Trikot.' : 'Tritt einer Liga bei, um deine erste Wertung zu fahren.'}</p></div></Card>}
    </>}
    {tab === 'performance' && <PerformancePanel ratings={ratings} overall={overall} stats={stats} bike={profile} onSettings={() => setSettings(true)}/>}
    {tab === 'career' && <><SectionHeading eyebrow="DEINE REISE" title="Saison- & Karriereentwicklung"/><CareerCards snapshots={seasonCards} seasonYear={new Date().getFullYear()} points={totalPoints} wins={wins} kilometers={stats.kilometers} elevation={stats.elevation} jerseys={jerseys} seasonClosed={Boolean(active?.season_closed_at)}/><SectionHeading eyebrow="DEINE SAMMLUNG" title="Gewonnene Trikotkarten"/><JerseyArchiveCards history={history.filter(entry => entry.user_id === userId && Boolean(entry.ended_at))} onSelect={setSelectedJerseyArchive}/><SectionHeading eyebrow="DEINE MEILENSTEINE" title="Abzeichen"/><div className="achievement-grid">{badges.map(badge => <Badge key={badge.title} {...badge} onSelect={setSelectedBadge}/>)}</div></>}
    <div className="profile-legacy" aria-hidden="true">
    <SectionHeading eyebrow="DEINE AKTUELLEN TITEL" title="Trikot-Spezialkarten"/>
    <JerseySpecialCards jerseys={jerseys} onSelect={setSelectedJersey}/>
    <SectionHeading eyebrow="DEINE SAMMLUNG" title="Gewonnene Trikotkarten"/>
    <JerseyArchiveCards history={history.filter(entry => entry.user_id === userId && Boolean(entry.ended_at))} onSelect={setSelectedJerseyArchive}/>
    <SectionHeading eyebrow="DEINE REISE" title="Saison- & Karriereentwicklung"/>
    <CareerCards snapshots={seasonCards} seasonYear={new Date().getFullYear()} points={totalPoints} wins={wins} kilometers={stats.kilometers} elevation={stats.elevation} jerseys={jerseys} seasonClosed={Boolean(active?.season_closed_at)}/>
    <Card className="profile-hero"><button aria-label="Profileinstellungen öffnen" onClick={() => setSettings(true)} className="profile-settings"><Settings size={18}/></button><div className="profile-avatar">{displayName.slice(0, 1).toUpperCase()}</div><div><p className="eyebrow">DEIN FAHRERPROFIL</p><h2>{displayName}</h2><p>{profile.level || 'Rider'} · {stats.rides.length ? `${stats.rides.length} Fahrt${stats.rides.length === 1 ? '' : 'en'} in dieser Saison` : 'Saisonstart'}</p></div></Card>
    <SectionHeading eyebrow="DEINE WERTUNGEN" title="Trikots"/>
    {jerseys.length ? <Card className="empty-inline"><Jersey type={jerseys[0]} small/><div><strong>Du trägst aktuell {jerseys.map(key => jerseyTitle[key]).join(' · ')}.</strong><p>Die Wertungen werden automatisch aus den Gruppenfahrten berechnet.</p></div></Card> : <Card className="empty-inline"><Jersey type="yellow" small/><div><strong>Noch kein Trikot vergeben.</strong><p>{hasGroup ? 'Mit deiner nächsten Fahrt kannst du eine Wertung übernehmen.' : 'Tritt einer Gruppe bei, um an Wertungen teilzunehmen.'}</p></div></Card>}
    <div className="jersey-shelf muted-jerseys">{[['yellow', 'Gelbes Trikot', 'Meiste Saisonpunkte'], ['polka', 'Bergtrikot', 'Meiste Höhenmeter'], ['white', 'Young Rider', 'Beste U23-Wertung'], ['red', 'Form der Woche', 'Meiste Punkte in 7 Tagen'], ['violet', 'Form des Monats', 'Meiste Punkte in 30 Tagen']].map(([type, title, text]) => <div className="jersey-card" key={title}><Jersey type={type}/><div><strong>{title}</strong><span>{text}</span></div></div>)}</div>
    <SectionHeading eyebrow="DEINE MEILENSTEINE" title="Abzeichen"/>
    <div className="achievement-grid"><Badge icon={Mountain} title="Bergziege" requirement="10.000 Höhenmeter in einer Saison" progress={`${format(stats.elevation)} / 10.000 hm`}/><Badge icon={Bike} title="5000 km Fahrer" requirement="5.000 Kilometer in einer Saison fahren" progress={`${format(stats.kilometers)} / 5.000 km`}/><Badge icon={Flame} title="5 Siege Serie" requirement="5 Challenges hintereinander gewinnen" progress="Noch offen"/><Badge icon={Zap} title="Form der Woche" requirement="Meiste Punkte innerhalb von 7 Tagen" progress={stats.rides.length ? `${format(totalPoints)} PTS bisher` : 'Noch offen'}/><Badge icon={Trophy} title="Duell-Champion" requirement="Erste Challenge gewinnen" progress={`${wins} / 1 Sieg`}/></div>
    <SectionHeading eyebrow="SAISON 2026" title="Trikot-Historie"/>
    {history.length ? <div className="event-list">{history.map(entry => <Card className="event-card" key={entry.id}><Jersey type={entry.jersey_key} small/><div><h3>{jerseyTitle[entry.jersey_key as JerseyKey] || entry.jersey_key} · {entry.profiles?.display_name || 'Rider'}</h3><p>{new Date(entry.started_at).toLocaleDateString('de-DE')} {entry.ended_at ? `bis ${new Date(entry.ended_at).toLocaleDateString('de-DE')}` : '· aktuell'}</p></div></Card>)}</div> : <Card className="empty-inline"><Bike size={20}/><div><strong>Noch keine Historie.</strong><p>Nach der ersten automatischen Wertung erscheint der erste Eintrag hier.</p></div></Card>}
    </div>
    <button className="profile-logout" onClick={logout}><LogOut size={17}/> Abmelden</button>
    {settings && <ProfileSettings initial={{ ...profile, name: displayName }} onClose={() => setSettings(false)} onSave={save}/>} 
    {selectedJersey && <JerseyCardModal type={selectedJersey} groupName={active?.name} onClose={() => setSelectedJersey(null)}/>} 
    {selectedJerseyArchive && <JerseyCardModal type={selectedJerseyArchive.jersey_key as JerseyKey} groupName={active?.name} history={selectedJerseyArchive} onClose={() => setSelectedJerseyArchive(null)}/>} 
    {selectedBadge && <BadgeDetail badge={selectedBadge} onClose={() => setSelectedBadge(null)}/>} 
  </div>
}

function RiderCard({ name, group, team, level, number, jersey, points, wins, kilometers, elevation, overall }: { name: string; group?: LiveGroup; team?: string; level?: string; number: number | null; jersey?: JerseyKey; points: number; wins: number; kilometers: number; elevation: number; overall: number }) {
  const [shareNotice, setShareNotice] = useState<string | null>(null)
  const [exportNotice, setExportNotice] = useState<string | null>(null)
  const cardJersey = jersey || 'plain'
  const rarity = points >= 2500 ? 'LEGEND' : points >= 1200 ? 'GOLD' : points >= 500 ? 'SILBER' : 'BRONZE'
  const share = async () => {
    const title = `${name} · VELO LEAGUE Fahrerkarte`
    const text = `Meine VELO LEAGUE Fahrerkarte: ${format(points)} Punkte · ${wins} Siege · ${format(kilometers)} km${jersey ? ` · ${jerseyTitle[jersey]}` : ''}. Every ride is a race.`
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: window.location.href })
        setShareNotice('Teilen geöffnet')
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${title}\n${text}\n${window.location.href}`)
        setShareNotice('Kartentext kopiert')
      } else setShareNotice('Teilen wird von diesem Browser nicht unterstützt')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setShareNotice('Teilen konnte nicht geöffnet werden')
    }
    window.setTimeout(() => setShareNotice(null), 2800)
  }
  const exportPng = async () => {
    setExportNotice('Karte wird erstellt …')
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1350
    const context = canvas.getContext('2d')
    if (!context) { setExportNotice('Export wird von diesem Browser nicht unterstützt'); return }
    const accent = cardJersey === 'polka' ? '#ed5a56' : cardJersey === 'red' ? '#ff706b' : cardJersey === 'violet' ? '#be91ff' : cardJersey === 'white' ? '#f5f5ef' : '#f5d928'
    const background = context.createLinearGradient(0, 0, 1080, 1350)
    background.addColorStop(0, '#070909'); background.addColorStop(.55, '#151916'); background.addColorStop(1, '#050606')
    context.fillStyle = background; context.fillRect(0, 0, 1080, 1350)
    context.strokeStyle = accent; context.lineWidth = 6; context.strokeRect(34, 34, 1012, 1282)
    context.strokeStyle = 'rgba(255,255,255,.16)'; context.lineWidth = 2; context.strokeRect(54, 54, 972, 1242)
    context.fillStyle = accent; context.font = 'italic 800 48px Arial'; context.fillText('VELO', 88, 124)
    context.fillStyle = '#ffffff'; context.font = '800 22px Arial'; context.fillText('LEAGUE', 254, 124)
    context.fillStyle = accent; context.font = '800 22px Arial'; context.fillText(`SEASON ${new Date().getFullYear()}`, 760, 120)
    context.fillStyle = '#b9beb5'; context.font = '800 18px Arial'; context.fillText('FAHRERKARTE', 88, 208)
    context.fillStyle = accent; context.fillRect(88, 236, 254, 94)
    context.fillStyle = '#121411'; context.font = '800 62px Arial'; context.fillText(`#${String(number || 0).padStart(2, '0')}`, 108, 304)
    context.fillStyle = '#fff'; context.font = '800 78px Arial'; context.fillText(name.toUpperCase().slice(0, 19), 88, 416)
    context.fillStyle = accent; context.font = '700 28px Arial'; context.fillText((team || 'INDEPENDENT RIDERS').toUpperCase().slice(0, 31), 90, 470)
    context.fillStyle = '#bbc1b8'; context.font = '600 23px Arial'; context.fillText((group?.name || 'VELO LEAGUE').toUpperCase().slice(0, 37), 90, 510)
    context.beginPath(); context.arc(805, 386, 158, 0, Math.PI * 2); context.fillStyle = '#202620'; context.fill(); context.lineWidth = 4; context.strokeStyle = accent; context.stroke()
    context.fillStyle = accent; context.font = '800 178px Arial'; context.textAlign = 'center'; context.fillText(name.slice(0, 1).toUpperCase(), 805, 448); context.textAlign = 'left'
    context.fillStyle = '#0c0f0d'; context.fillRect(88, 620, 904, 292); context.strokeStyle = '#41463f'; context.lineWidth = 2; context.strokeRect(88, 620, 904, 292)
    const statRows = [[format(points), 'GESAMTPUNKTE'], [String(wins), 'ETAPPENSIEGE'], [`${format(kilometers)} km`, 'DISTANZ'], [`${format(elevation)} hm`, 'HÖHENMETER']]
    statRows.forEach(([value, label], index) => { const column = index % 2; const row = Math.floor(index / 2); const x = 126 + column * 446; const y = 694 + row * 136; context.fillStyle = '#fff'; context.font = '800 46px Arial'; context.fillText(value, x, y); context.fillStyle = '#afb6ad'; context.font = '800 16px Arial'; context.fillText(label, x, y + 31) })
    context.fillStyle = accent; context.font = '800 20px Arial'; context.fillText('RIDER RATING', 88, 1002)
    context.fillStyle = '#fff'; context.font = '800 56px Arial'; context.fillText(rarity, 88, 1070)
    context.fillStyle = '#c7ccc4'; context.font = '600 23px Arial'; context.fillText(jersey ? jerseyTitle[jersey] : 'AUF DEM WEG ZUM ERSTEN TRIKOT', 88, 1120)
    context.fillStyle = accent; context.font = 'italic 700 30px Arial'; context.fillText('EVERY RIDE IS A RACE.', 88, 1230)
    context.fillStyle = '#bbc1b8'; context.font = '600 17px Arial'; context.fillText('VELO LEAGUE · DEINE DIGITALE FAHRERKARTE', 88, 1265)
    canvas.toBlob(async blob => {
      if (!blob) { setExportNotice('PNG konnte nicht erstellt werden'); return }
      const file = new File([blob], `velo-league-${name.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-fahrerkarte.png`, { type: 'image/png' })
      try {
        if (navigator.share && navigator.canShare?.({ files: [file] })) { await navigator.share({ title: `${name} · VELO LEAGUE`, files: [file] }); setExportNotice('PNG zum Teilen bereit') }
        else { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = file.name; link.click(); URL.revokeObjectURL(url); setExportNotice('PNG gespeichert') }
      } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) setExportNotice('PNG konnte nicht geteilt werden') }
      window.setTimeout(() => setExportNotice(null), 2800)
    }, 'image/png')
  }
  return <section className={`rider-card rider-card-${cardJersey}`} aria-label="Deine VELO LEAGUE Fahrerkarte"><div className="rider-card-glow"/><header><div className="rider-card-brand">VELO <b>LEAGUE</b></div><span>SEASON {group?.season_year || new Date().getFullYear()}</span></header><div className="rider-card-content"><div className="rider-card-identity"><p>FAHRERKARTE</p><strong>#{String(number || 0).padStart(2, '0')}</strong><h2>{name}</h2><span>{team || 'INDEPENDENT RIDERS'}</span><small>{group?.name || 'NOCH KEINE LIGA'}</small><i>RIDE FURTHER</i></div><div className="rider-card-avatar"><img src="/images/rider-card-cyclist.png" alt="Rennradfahrer in gelbem Trikot"/><Jersey type={cardJersey}/></div></div><div className="rider-card-stats"><div><b>{format(points)}</b><span>GESAMTPUNKTE</span></div><div><b>{wins}</b><span>ETAPPENSIEGE</span></div><div><b>{format(kilometers)} km</b><span>DISTANZ</span></div><div><b>{format(elevation)} hm</b><span>HÖHENMETER</span></div></div><div className="rider-card-share-row"><button type="button" className="rider-card-share" onClick={() => void share()}>{shareNotice ? <Check size={15}/> : <Share2 size={15}/>} {shareNotice || 'Fahrerkarte teilen'}</button><button type="button" className="rider-card-export" onClick={() => void exportPng()}>{exportNotice ? <Check size={15}/> : <Download size={15}/>} {exportNotice || 'Als PNG speichern'}</button></div><footer><span>{level || 'RIDER'} · {jersey ? jerseyTitle[jersey] : 'AUF DEM WEG ZUM ERSTEN TRIKOT'}</span><b>{rarity}</b></footer></section>
}

function JerseySpecialCards({ jerseys, onSelect }: { jerseys: JerseyKey[]; onSelect: (type: JerseyKey) => void }) {
  if (!jerseys.length) return <Card className="special-card-empty"><Medal size={22}/><div><strong>Deine erste Spezialkarte wartet.</strong><p>Übernimm eine Wertung in deiner Liga und sie erscheint automatisch hier.</p></div></Card>
  return <div className="special-card-grid">{jerseys.map(type => {
    const copy = jerseyCardCopy[type]
    return <button className={`jersey-special-card jersey-special-${type}`} key={type} onClick={() => onSelect(type)}><div className="special-card-top"><Jersey type={type} small/><span>AKTUELL</span></div><div><p>{copy.title}</p><h3>{copy.label}</h3><small>{copy.description}</small></div><b>Öffnen</b></button>
  })}</div>
}

function JerseyArchiveCards({ history, onSelect }: { history: JerseyHistory[]; onSelect: (entry: JerseyHistory) => void }) {
  if (!history.length) return <Card className="special-card-empty"><Medal size={22}/><div><strong>Deine Sammlung beginnt mit dem ersten Trikot.</strong><p>Gewonnene und später abgegebene Trikots bleiben hier dauerhaft als Karten erhalten.</p></div></Card>
  return <div className="jersey-archive-grid">{history.map(entry => {
    const type = entry.jersey_key as JerseyKey
    const started = new Date(entry.started_at)
    const ended = entry.ended_at ? new Date(entry.ended_at) : new Date()
    const days = Math.max(1, Math.ceil((ended.getTime() - started.getTime()) / 86_400_000))
    return <button type="button" className={`jersey-archive-card jersey-special-${type}`} key={entry.id} onClick={() => onSelect(entry)}><div><Jersey type={type} small/><span>ARCHIVIERT</span></div><p>{jerseyCardCopy[type]?.title || 'TRIKOT-TITEL'}</p><h3>{jerseyTitle[type] || entry.jersey_key}</h3><small>Getragen für {days} Tag{days === 1 ? '' : 'e'}</small><b>{started.toLocaleDateString('de-DE')}</b></button>
  })}</div>
}

function CareerCards({ snapshots, seasonYear, points, wins, kilometers, elevation, jerseys, seasonClosed }: { snapshots: SeasonCardSnapshot[]; seasonYear: number; points: number; wins: number; kilometers: number; elevation: number; jerseys: JerseyKey[]; seasonClosed: boolean }) {
  const [selectedCard, setSelectedCard] = useState<SeasonCardSnapshot | null>(null)
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(null)
  const currentRarity = points >= 2500 ? 'legend' : points >= 1200 ? 'gold' : points >= 500 ? 'silver' : 'bronze'
  const hasArchivedCurrentSeason = snapshots.some(card => card.season_year === seasonYear)
  const detailedTitles: Record<JerseyKey, string> = { yellow: 'SEASON CHAMPION', polka: 'KING OF THE MOUNTAINS', white: 'BEST YOUNG RIDER', red: 'FORM DER WOCHE', violet: 'FORM DES MONATS' }
  const liveTitles = [...jerseys.map(key => detailedTitles[key]), ...(wins ? [`${wins} DUELLSIEG${wins === 1 ? '' : 'E'}`] : [])]
  const liveCard: SeasonCardSnapshot = { id: 'live', group_id: '', user_id: '', created_at: new Date().toISOString(), season_year: seasonYear, rarity: currentRarity, total_points: points, wins, kilometers, elevation_m: elevation, titles: liveTitles }
  const allCards = seasonClosed || hasArchivedCurrentSeason ? snapshots : [liveCard, ...snapshots]
  const timelineCards = allCards.slice().sort((left, right) => left.season_year - right.season_year)
  const careerSource = timelineCards.length ? timelineCards : [liveCard]
  const timelineCard = careerSource.find(card => card.id === selectedTimelineId) || careerSource[careerSource.length - 1]
  const highest = Math.max(1, ...careerSource.map(card => card.total_points))
  const bestSeason = careerSource.reduce((best, card) => card.total_points > best.total_points ? card : best, careerSource[0])
  const careerKilometers = careerSource.reduce((sum, card) => sum + card.kilometers, 0)
  const careerTitles = careerSource.reduce((sum, card) => sum + card.titles.length, 0)
  return <><div className="career-layout"><div className="season-card-strip">{allCards.length ? allCards.map((card, index) => { const champion = card.titles.some(title => title === 'SEASON CHAMPION' || title === 'Gelbes Trikot'); const mountain = card.titles.some(title => title === 'KING OF THE MOUNTAINS' || title === 'Bergtrikot'); return <button type="button" aria-label={`Saisonkarte ${card.season_year} öffnen`} className={`season-mini-card season-mini-${card.rarity} ${champion ? 'season-mini-champion' : mountain ? 'season-mini-mountain' : ''}`} key={card.id} onClick={() => setSelectedCard(card)}><span>{champion ? 'SAISONABSCHLUSS · CHAMPION' : mountain ? 'SAISONABSCHLUSS · BERGKÖNIG' : card.id === 'live' && index === 0 ? 'LIVE · AKTUELLE SAISON' : 'ARCHIV · SAISONKARTE'}</span><strong>{card.season_year}</strong><b>{card.titles[0] || 'DEBUT SEASON'}</b><small>{format(card.total_points)} PKT</small><div><span>{card.wins} Duellsiege</span><span>{format(card.kilometers)} km</span></div><em>Details ansehen</em></button> }) : <Card className="special-card-empty"><Medal size={22}/><div><strong>Deine Saisonkarte wird vorbereitet.</strong><p>Nach dem Saisonabschluss erscheint sie hier dauerhaft.</p></div></Card>}</div><Card className="career-growth"><div><p className="eyebrow">KARRIERE-ENTWICKLUNG</p><h3>Deine Geschichte, Saison für Saison.</h3></div><div className="career-chart career-timeline" aria-label="Entwicklung deiner Saisonpunkte">{careerSource.map(card => <button type="button" key={card.id} className={card.id === timelineCard?.id ? 'active' : ''} onClick={() => setSelectedTimelineId(card.id)} aria-label={`Saison ${card.season_year}: ${format(card.total_points)} Punkte`}><i style={{ height: `${Math.max(12, Math.round((card.total_points / highest) * 100))}%` }}/><span>{card.season_year}</span></button>)}</div>{timelineCard && <button type="button" className="career-highlight" onClick={() => setSelectedCard(timelineCard)}><span>SAISON {timelineCard.season_year}</span><strong>{format(timelineCard.total_points)} Punkte</strong><small>{timelineCard.wins} Duellsiege · {format(timelineCard.kilometers)} km · Details öffnen</small></button>}<div className="career-summary"><span>{allCards.length} Saison{allCards.length === 1 ? '' : 'en'}</span><span>{format(careerKilometers)} Karriere-km</span><span>{careerTitles} Titel gewonnen</span><span>Bestes Jahr: {bestSeason.season_year} · {format(bestSeason.total_points)} Pkt</span></div></Card></div>{selectedCard && <SeasonCardModal card={selectedCard} onClose={() => setSelectedCard(null)}/>}</>
}

function SeasonCardModal({ card, onClose }: { card: SeasonCardSnapshot; onClose: () => void }) {
  const titles = card.titles.length ? card.titles : ['Debüt-Saison']
  return <div className="modal-backdrop" onClick={onClose}><section className={`season-card-modal season-mini-${card.rarity}`} onClick={event => event.stopPropagation()}><button className="modal-close" aria-label="Saisonkarte schließen" onClick={onClose}><X size={18}/></button><p className="eyebrow">{card.id === 'live' ? 'AKTUELLE FAHRERKARTE' : 'ARCHIVIERTE SAISONKARTE'}</p><h2>Saison {card.season_year}</h2><b className="season-card-rarity">{card.rarity.toUpperCase()}</b><div className="season-detail-points"><strong>{format(card.total_points)}</strong><span>GESAMTPUNKTE</span></div><div className="season-detail-stats"><span><b>{card.wins}</b> Siege</span><span><b>{format(card.kilometers)} km</b> Distanz</span><span><b>{format(card.elevation_m)} hm</b> Höhenmeter</span></div><div className="season-card-titles"><span>TITEL & ERFOLGE</span>{titles.map(title => <strong key={title}>{title}</strong>)}</div></section></div>
}

function JerseyCardModal({ type, groupName, history, onClose }: { type: JerseyKey; groupName?: string; history?: JerseyHistory; onClose: () => void }) { const copy = jerseyCardCopy[type]; const started = history ? new Date(history.started_at) : null; const ended = history?.ended_at ? new Date(history.ended_at) : null; const days = started ? Math.max(1, Math.ceil(((ended || new Date()).getTime() - started.getTime()) / 86_400_000)) : null; return <div className="modal-backdrop" onClick={onClose}><section className={`jersey-card-modal jersey-special-${type}`} onClick={event => event.stopPropagation()}><button className="modal-close" onClick={onClose}><X size={18}/></button><Jersey type={type}/><p className="eyebrow">{history ? 'ARCHIVIERTE TRIKOTKARTE' : 'TRIKOT-SPEZIALKARTE'}</p><h2>{copy.title}</h2><p>{copy.description}</p><div><span>WERTUNG</span><strong>{copy.label}</strong><span>LIGA</span><strong>{groupName || 'VELO LEAGUE'}</strong>{history && <><span>GEWONNEN</span><strong>{started?.toLocaleDateString('de-DE')}</strong><span>GETRAGEN</span><strong>{days} Tag{days === 1 ? '' : 'e'}</strong></>}</div></section></div> }

type BadgeInfo = { icon: typeof Mountain; title: string; requirement: string; progress: string; earned: boolean }
function Badge({ icon: Icon, title, requirement, progress, earned, onSelect }: BadgeInfo & { onSelect: (badge: BadgeInfo) => void }) { return <button type="button" className="achievement achievement-button" onClick={() => onSelect({ icon: Icon, title, requirement, progress, earned })}><span className={earned ? 'yellow' : 'muted'}><Icon/></span><strong>{title}</strong><p>{requirement}</p><small>{progress}</small><ChevronRight size={15}/></button> }
function BadgeDetail({ badge, onClose }: { badge: BadgeInfo; onClose: () => void }) { const Icon = badge.icon; return <div className="modal-backdrop" onClick={onClose}><section className="badge-detail-modal" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={onClose}><X size={18}/></button><span className={badge.earned ? 'yellow' : 'muted'}><Icon/></span><p className="eyebrow">{badge.earned ? 'FREIGESCHALTET' : 'NOCH OFFEN'}</p><h2>{badge.title}</h2><p>{badge.requirement}</p><strong>{badge.progress}</strong></section></div> }
function RatingRadar({ ratings }: { ratings: Rating[] }) {
  const visible = ratings.slice(0, 5)
  const points = visible.map((rating, index) => { const angle = -Math.PI / 2 + index * (Math.PI * 2 / visible.length); const radius = 31 * rating.value / 100; return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}` }).join(' ')
  const labels = [[50, 6], [93, 34], [78, 94], [22, 94], [7, 34]]
  return <div className="rating-radar"><svg viewBox="0 0 100 100" aria-label="Stärkenprofil"><polygon className="rating-radar-grid" points="50,12 86,38 72,81 28,81 14,38"/><polygon className="rating-radar-grid inner" points="50,27 68,40 61,62 39,62 32,40"/><polygon className="rating-radar-fill" points={points}/>{visible.map((rating, index) => <g key={rating.label}><text x={labels[index][0]} y={labels[index][1]}>{rating.label}</text><text className="rating-radar-value" x={labels[index][0]} y={labels[index][1] + (index > 1 ? -4 : 5)}>{rating.value}</text></g>)}</svg></div>
}
function PerformancePanel({ ratings, overall, stats, bike, onSettings }: { ratings: Rating[]; overall: number; stats: SeasonStats; bike: RiderProfile; onSettings: () => void }) {
  const fastest = stats.rides.reduce((best, ride) => { const speed = ride.moving_time_s ? ride.distance_m / 1000 / (ride.moving_time_s / 3600) : 0; return Math.max(best, speed) }, 0)
  const highestRide = stats.rides.reduce((best, ride) => Math.max(best, ride.elevation_m), 0)
  const bestPoints = stats.rides.reduce((best, ride) => Math.max(best, ride.points), 0)
  return <div className="performance-panel"><Card className="performance-rating"><div className="performance-rating-head"><div className="overall-rating"><span>OVR</span><strong>{overall}</strong><small>{stats.rides.length ? 'aus deiner Form' : 'Rookie-Startwert'}</small></div><div><p className="eyebrow">STÄRKEN</p><p className="performance-rating-copy">Dein Profil aus echten Gruppenfahrten.</p></div></div><RatingRadar ratings={ratings}/><div className="rating-bars">{ratings.map(rating => <div key={rating.label}><span>{rating.label}<small>{rating.detail}</small></span><b><i style={{ width: `${rating.value}%` }}/></b><strong>{rating.value}</strong></div>)}</div></Card><Card className="performance-top"><p className="eyebrow">TOP-PERFORMANCES</p><div><span>Schnellste Fahrt</span><strong>{fastest ? `${format(fastest)} km/h` : '—'}</strong></div><div><span>Längste Ausfahrt</span><strong>{format(stats.longestKilometers)} km</strong></div><div><span>Höchste HM</span><strong>{format(highestRide)} hm</strong></div><div><span>Meiste Punkte (Fahrt)</span><strong>{format(bestPoints)} Pkt</strong></div></Card><Card className="bike-card"><Bike size={26}/><div><p className="eyebrow">DEIN BIKE</p><h3>{bike.bikeBrand || bike.bikeModel ? [bike.bikeBrand, bike.bikeModel].filter(Boolean).join(' ') : 'Bike hinzufügen'}</h3><p>{bike.bikeType || 'Für deine Fahrerkarte und Leistungsübersicht.'}</p></div><button className="secondary-button" onClick={onSettings}>Bearbeiten</button></Card><Card className="rating-explainer"><p className="eyebrow">SO ENTSTEHT DEIN RATING</p><p>Berg, Ausdauer, Aktivität, Wettbewerb und Form werden getrennt bewertet. Sprint kommt erst dazu, sobald echte Segmente verfügbar sind.</p></Card></div>
}
function makeRatings(stats: SeasonStats, points: number, wins: number, jerseys: number, rating: ReturnType<typeof calculateRiderRating>): Rating[] { return [{ label: 'Berg', value: rating.mountain, detail: `${format(stats.elevation)} hm in den letzten 8 Wochen` }, { label: 'Ausdauer', value: rating.endurance, detail: `${format(stats.kilometers)} km · ${format(stats.longestKilometers)} km längste Fahrt` }, { label: 'Aktivität', value: rating.activity, detail: `${stats.rides.length} Fahrten · ${rating.activeWeeks}/8 Wochen aktiv` }, { label: 'Wettbewerb', value: rating.competition, detail: `${format(points)} Pkt · ${wins} Duellsiege · ${jerseys} Trikots` }, { label: 'Form', value: rating.form, detail: 'Letzte 14 Tage' }] }
function makeBadges(stats: SeasonStats, points: number, wins: number): BadgeInfo[] { return [{ icon: Mountain, title: 'Bergziege', requirement: '10.000 Höhenmeter in einer Saison', progress: `${format(stats.elevation)} / 10.000 hm`, earned: stats.elevation >= 10000 }, { icon: Bike, title: '5000 km Fahrer', requirement: '5.000 Kilometer in einer Saison fahren', progress: `${format(stats.kilometers)} / 5.000 km`, earned: stats.kilometers >= 5000 }, { icon: Flame, title: '5 Siege Serie', requirement: '5 Duellsiege in einer Saison', progress: `${wins} / 5 Duellsiege`, earned: wins >= 5 }, { icon: Zap, title: 'Punktemaschine', requirement: '1.000 Saisonpunkte erreichen', progress: `${format(points)} / 1.000 Pkt`, earned: points >= 1000 }, { icon: Trophy, title: 'Duell-Champion', requirement: 'Erstes Duell gewinnen', progress: `${wins} / 1 Duellsieg`, earned: wins >= 1 }] }
function profileFromStored(storedProfile: { display_name: string; team_name?: string | null; gender?: string | null; height_cm?: number | null; weight_kg?: number | null; rider_level?: string | null; bike_brand?: string | null; bike_model?: string | null; bike_type?: string | null }): RiderProfile { return { name: storedProfile.display_name, team: storedProfile.team_name || '', gender: storedProfile.gender || '', height: storedProfile.height_cm?.toString() || '', weight: storedProfile.weight_kg?.toString() || '', level: storedProfile.rider_level || '', bikeBrand: storedProfile.bike_brand || '', bikeModel: storedProfile.bike_model || '', bikeType: storedProfile.bike_type || '' } }
function ProfileSettings({ initial, onClose, onSave }: { initial: RiderProfile; onClose: () => void; onSave: (profile: RiderProfile) => void }) { const [form, setForm] = useState(initial); const update = (key: keyof RiderProfile, value: string) => setForm(current => ({ ...current, [key]: value })); return <div className="modal-backdrop profile-settings-backdrop" onClick={onClose}><section className="profile-settings-modal" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={onClose}><X size={18}/></button><p className="eyebrow">PROFIL & KÖRPERDATEN</p><h2>Deine Einstellungen</h2><div className="settings-fields"><label>Name<input value={form.name || ''} onChange={event => update('name', event.target.value)}/></label><label>Team (optional)<input placeholder="z. B. Alpine Riders" value={form.team || ''} onChange={event => update('team', event.target.value)}/></label><label>Größe (cm)<input inputMode="numeric" value={form.height || ''} onChange={event => update('height', event.target.value)}/></label><label>Gewicht (kg)<input inputMode="decimal" value={form.weight || ''} onChange={event => update('weight', event.target.value)}/></label><label>Geschlecht<select value={form.gender || ''} onChange={event => update('gender', event.target.value)}><option value="">Bitte auswählen</option><option>Männlich</option><option>Weiblich</option><option>Divers</option><option>Keine Angabe</option></select></label><label>Fahrniveau<select value={form.level || 'Fortgeschritten'} onChange={event => update('level', event.target.value)}><option>Einsteiger</option><option>Fortgeschritten</option><option>Ambitioniert</option><option>Elite Rider</option></select></label><label>Bike-Marke<input placeholder="z. B. Giant" value={form.bikeBrand || ''} onChange={event => update('bikeBrand', event.target.value)}/></label><label>Bike-Modell<input placeholder="z. B. TCR Advanced" value={form.bikeModel || ''} onChange={event => update('bikeModel', event.target.value)}/></label><label>Bike-Typ<input placeholder="z. B. Rennrad" value={form.bikeType || ''} onChange={event => update('bikeType', event.target.value)}/></label></div><div className="settings-actions"><button className="secondary-button" onClick={onClose}>Abbrechen</button><button className="primary-button" onClick={() => onSave(form)}>Speichern</button></div></section></div> }
