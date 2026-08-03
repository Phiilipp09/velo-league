import { Mountain, Route, Trophy, X, Zap } from 'lucide-react'
import type { LeagueRider } from '../pages/League'
import { Card, Jersey } from './Ui'

export function RiderDetail({ rider, onClose }: { rider: LeagueRider; onClose: () => void }) {
  const format = (value: number) => Math.round(value).toLocaleString('de-DE')
  return <div className="modal-backdrop" onClick={onClose}><aside className="rider-drawer" onClick={event => event.stopPropagation()}><button className="drawer-close" aria-label="Profil schließen" onClick={onClose}><X size={20}/></button><div className="drawer-profile"><Jersey type="plain"/><div><p className="eyebrow">GRUPPENPROFIL</p><h2>{rider.name}</h2><span>Aktuelle Saison</span></div></div><div className="drawer-points"><strong>{format(rider.points)}</strong><span>Saisonpunkte</span></div><div className="drawer-stats"><span><Mountain size={16}/><b>{format(rider.elevation)}</b> hm</span><span><Route size={16}/><b>{format(rider.kilometers)}</b> km</span><span><Zap size={16}/><b>{format(rider.week)}</b> PTS · 7 Tage</span></div><Card className="empty-inline"><Trophy size={20}/><div><strong>Leistungsübersicht</strong><p>{format(rider.month)} Punkte in den letzten 30 Tagen · {rider.eligibleYoung ? 'U23-wertungsberechtigt' : 'keine U23-Wertung'}.</p></div></Card></aside></div>
}
