import { useEffect, useState } from 'react'
import { CheckCircle2, ChevronRight, Link2, LoaderCircle, Plus, ShieldCheck, Unlink, X } from 'lucide-react'
import { Card, SectionHeading } from '../components/Ui'

type Ride = { id: string; title: string; date: string; distance: number; elevation: number; duration: string; points: number; source: 'manual' | 'strava' }
type StravaActivity = { id: number; name: string; type?: string; sport_type?: string; distance: number; total_elevation_gain: number; moving_time: number; start_date_local: string }
const key = 'velo-test-rides'

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60), remaining = seconds % 60
  return `${hours ? `${hours}:` : ''}${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
}

const toRide = (activity: StravaActivity): Ride => {
  const distance = Math.round((activity.distance / 1000) * 10) / 10
  const elevation = Math.round(activity.total_elevation_gain || 0)
  return { id: `strava-${activity.id}`, title: activity.name || 'Strava Fahrt', date: new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(activity.start_date_local)), distance, elevation, duration: formatDuration(activity.moving_time), points: Math.round(distance + elevation / 10), source: 'strava' }
}

export function ActivityHub({ notify }: { notify: (message: string) => void }) {
  const [connected, setConnected] = useState(false)
  const [rides, setRides] = useState<Ride[]>([])
  const [manual, setManual] = useState(false)
  const [detail, setDetail] = useState<Ride | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [connectionNote, setConnectionNote] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem(key)
    if (stored) setRides(JSON.parse(stored))
    const result = new URLSearchParams(window.location.search).get('strava')
    if (result) {
      setConnectionNote(result === 'connected' ? 'Strava ist verbunden. Importiere jetzt deine Fahrten.' : result === 'denied' ? 'Die Strava-Freigabe wurde abgebrochen.' : 'Strava konnte nicht verbunden werden. Prüfe die App-Einstellungen.')
      if (result === 'connected') setConnected(true)
      history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`)
    }
    void fetch('/api/strava/status').then(response => response.ok ? response.json() : { connected: false }).then(data => setConnected(Boolean(data.connected))).catch(() => undefined)
  }, [])

  const add = (ride: Ride) => {
    const next = [ride, ...rides]
    setRides(next)
    localStorage.setItem(key, JSON.stringify(next))
    setManual(false)
    notify(`Fahrt eingetragen · +${ride.points} Saisonpunkte`)
  }

  const sync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/strava/activities')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      const imported = (data.activities as StravaActivity[]).filter(activity => ['Ride', 'EBikeRide', 'GravelRide', 'MountainBikeRide', 'Velomobile'].includes(activity.sport_type || activity.type || '')).map(toRide)
      setRides(current => {
        const next = [...imported, ...current.filter(ride => !imported.some(item => item.id === ride.id))]
        localStorage.setItem(key, JSON.stringify(next))
        return next
      })
      notify(imported.length ? `${imported.length} Strava-Fahrten importiert.` : 'Keine neuen Radfahrten bei Strava gefunden.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Strava-Fahrten konnten nicht geladen werden.')
    } finally { setSyncing(false) }
  }

  const disconnect = async () => {
    await fetch('/api/strava/disconnect', { method: 'POST' })
    setConnected(false)
    setConnectionNote('Strava wurde getrennt. Bereits importierte Fahrten bleiben sichtbar.')
    notify('Strava-Verbindung getrennt.')
  }

  return <div className="page activities-page">
    <Card className="strava-card"><div className="strava-logo">STRAVA</div><div className="strava-copy"><p className="eyebrow">DEIN AKTIVITÄTS-IMPORT</p><h2>{connected ? 'Strava ist verbunden' : 'Verbinde dein Strava'}</h2><p>{connected ? 'Neue Radfahrten können jetzt direkt und sicher importiert werden.' : 'Verbinde dein Konto einmalig direkt über Strava.'}</p></div><div className="strava-action">{connected ? <><button onClick={() => void sync()} disabled={syncing} className="primary-button">{syncing ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}{syncing ? ' Importiere…' : ' Fahrten importieren'}</button><button onClick={() => void disconnect()} className="text-button"><Unlink size={14} /> Strava trennen</button></> : <button onClick={() => window.location.assign('/api/strava/connect')} className="primary-button"><Link2 size={16} /> Mit Strava verbinden</button>}<small><ShieldCheck size={12} /> Sicher über Strava OAuth</small></div></Card>
    {connectionNote && <Card className="oauth-note"><CheckCircle2 size={19} /><p>{connectionNote}</p></Card>}
    <SectionHeading eyebrow="DEINE FAHRTEN" title="Aktivitäten" action={<button className="text-button" onClick={() => setManual(true)}><Plus size={15} /> Fahrt eintragen</button>} />
    {rides.length === 0 ? <Card className="empty-inline"><Plus size={20} /><div><strong>Noch keine Fahrten.</strong><p>{connected ? 'Tippe auf „Fahrten importieren“, um deine Radfahrten zu laden.' : 'Trage eine Testfahrt ein oder verbinde Strava.'}</p></div></Card> : <div className="ride-list">{rides.map(ride => <button onClick={() => setDetail(ride)} className="ride-button" key={ride.id}><RideCard ride={ride} /></button>)}</div>}
    {manual && <ManualRide onClose={() => setManual(false)} onSave={add} />}{detail && <RideDetail ride={detail} onClose={() => setDetail(null)} />}
  </div>
}

function RideCard({ ride }: { ride: Ride }) { return <Card className="ride-card"><div className="ride-map" /><div className="ride-main"><p className="eyebrow">{ride.date} · {ride.source === 'manual' ? 'MANUELL' : 'STRAVA'}</p><h3>{ride.title}</h3><div><span>{ride.distance.toLocaleString('de-DE')} km</span><span>{ride.elevation.toLocaleString('de-DE')} hm</span><span>{ride.duration}</span></div></div><strong className="ride-points">+{ride.points}<small> PTS</small></strong><ChevronRight size={18} className="ride-chevron" /></Card> }

function ManualRide({ onClose, onSave }: { onClose: () => void; onSave: (ride: Ride) => void }) { const [name, setName] = useState('Sonntagsrunde'), [km, setKm] = useState(45), [hm, setHm] = useState(620); const points = Math.round(km + hm / 10); return <div className="modal-backdrop group-modal"><section className="create-group"><button onClick={onClose} className="drawer-close"><X size={18} /></button><p className="eyebrow">MANUELLER EINTRAG</p><h2>Fahrt hinzufügen</h2><label>Name der Fahrt<input value={name} onChange={e => setName(e.target.value)} /></label><div className="form-pair"><label>Kilometer<input type="number" value={km} onChange={e => setKm(Number(e.target.value))} /></label><label>Höhenmeter<input type="number" value={hm} onChange={e => setHm(Number(e.target.value))} /></label></div><Card className="points-preview"><span>Voraussichtliche Punkte</span><strong>{points} PTS</strong><small>{km} km × 1 PTS + {hm} hm ÷ 10</small></Card><p className="manual-hint">Manuell eingetragene Fahrten sind in der Gruppe entsprechend gekennzeichnet.</p><div><button onClick={onClose} className="secondary-button">Abbrechen</button><button onClick={() => onSave({ id: crypto.randomUUID(), title: name, date: 'Heute', distance: km, elevation: hm, duration: '—', points, source: 'manual' })} className="primary-button">Fahrt speichern</button></div></section></div> }

function RideDetail({ ride, onClose }: { ride: Ride; onClose: () => void }) { return <div className="modal-backdrop group-modal"><section className="create-group ride-detail"><button onClick={onClose} className="drawer-close"><X size={18} /></button><p className="eyebrow">FAHRT-DETAILS · {ride.source === 'manual' ? 'MANUELLER EINTRAG' : 'STRAVA'}</p><h2>{ride.title}</h2><div className="detail-metrics"><span><b>{ride.distance}</b> km</span><span><b>{ride.elevation}</b> hm</span><span><b>{ride.duration}</b></span></div><h3>Punkteverteilung</h3><div className="points-breakdown"><div><span>Kilometer</span><b>+{ride.distance} PTS</b></div><div><span>Höhenmeter</span><b>+{Math.round(ride.elevation / 10)} PTS</b></div><div className="points-total"><span>Gesamt</span><b>+{ride.points} PTS</b></div></div></section></div> }
