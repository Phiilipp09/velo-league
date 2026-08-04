import { Mountain, Route, Trophy, X, Zap } from 'lucide-react'
import type { LeagueRider } from '../pages/League'
import { Jersey } from './Ui'

const format = (value: number) => Math.round(value).toLocaleString('de-DE')

const imageForJersey: Record<string, string> = {
  polka: '/images/rider-card-polka.png',
  green: '/images/rider-card-green-v2.png',
  white: '/images/rider-card-white.png',
}

export function RiderDetail({ rider, onClose }: { rider: LeagueRider; onClose: () => void }) {
  const jersey = rider.jersey || 'plain'
  const riderImage = imageForJersey[jersey] || '/images/rider-card-cyclist.png'
  const rarity = rider.points >= 2500 ? 'LEGEND' : rider.points >= 1200 ? 'GOLD' : rider.points >= 500 ? 'SILBER' : 'ROOKIE'
  const rating = rider.points || rider.kilometers || rider.elevation
    ? Math.min(99, Math.max(30, Math.round((rider.points / 14 + rider.kilometers / 12 + rider.elevation / 110) / 3)))
    : 30
  const ratings = [
    { label: 'Berg', value: Math.min(99, Math.round(rider.elevation / 90)) },
    { label: 'Ausdauer', value: Math.min(99, Math.round(rider.kilometers / 9)) },
    { label: 'Aktivität', value: Math.min(99, Math.round(rider.week / 4)) },
    { label: 'Wettbewerb', value: Math.min(99, Math.round(rider.points / 14)) },
  ]

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <aside className={`public-rider-card public-rider-${jersey}`} onClick={event => event.stopPropagation()}>
        <button className="drawer-close" aria-label="Fahrerkarte schließen" onClick={onClose}><X size={20} /></button>
        <header><span>VELO <b>LEAGUE</b></span><small>FAHRERKARTE</small></header>
        <div className="public-rider-hero">
          <div>
            <p>SAISONAKTUELL</p>
            <strong>#{String(rider.riderNumber || 0).padStart(2, '0')}</strong>
            <h2>{rider.name}</h2>
            <span>{rider.team || 'INDEPENDENT RIDERS'}</span>
            <i>{rarity} · RIDE FURTHER</i>
          </div>
          <div className="public-rider-overall"><span>OVR</span><b>{rating}</b></div>
          <div className="public-rider-image"><img src={riderImage} alt={`Rennradfahrer im ${jersey}-Trikot`} /></div>
        </div>
        <div className="public-rider-stats">
          <span><Trophy size={15} /><b>{format(rider.points)}</b><small>PKT</small></span>
          <span><Mountain size={15} /><b>{format(rider.elevation)}</b><small>HM</small></span>
          <span><Route size={15} /><b>{format(rider.kilometers)}</b><small>KM</small></span>
          <span><Zap size={15} /><b>{format(rider.week)}</b><small>7 TAGE</small></span>
        </div>
        <div className="public-rider-ratings">
          <p>FAHRER-RATING</p>
          {ratings.map(item => <div key={item.label}><span>{item.label}</span><i><b style={{ width: `${item.value}%` }} /></i><strong>{item.value}</strong></div>)}
        </div>
        <div className="public-rider-titles">
          <p>TITEL & STATUS</p>
          <div><Jersey type={jersey} small /><span><strong>{jersey === 'plain' ? 'ERSTE WERTUNG WARTET' : 'AKTUELLES TRIKOT'}</strong><small>{jersey === 'plain' ? 'Sammle Punkte für deine erste Spezialkarte.' : 'In dieser Ranglistenwertung führend.'}</small></span></div>
        </div>
        <footer><p>Öffentliche Saisonkarte · nur für Mitglieder dieser Liga sichtbar.</p></footer>
      </aside>
    </div>
  )
}
