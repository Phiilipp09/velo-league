import { useEffect, useState } from 'react'
import { Crown, SlidersHorizontal, Trophy, X } from 'lucide-react'
import type { Page } from '../App'
import { Card, EmptyGuide, Jersey, SectionHeading } from '../components/Ui'
import { getGroupMembers, getPointAdjustments, getRides, type LiveGroup, type LiveMember, type LiveRide, type PointAdjustment } from '../lib/supabaseData'

type Filter = 'Gesamt' | 'Berg' | 'Kilometer' | 'Sprint' | 'Young Rider'
export type LeagueRider = { id: string; name: string; team?: string; riderNumber?: number | null; jersey?: string; points: number; elevation: number; kilometers: number; sprint: number; young: number; week: number; month: number; eligibleYoung: boolean }
const filters: Filter[] = ['Gesamt', 'Berg', 'Kilometer', 'Sprint', 'Young Rider']
const value = (rider: LeagueRider, filter: Filter) => filter === 'Berg' ? rider.elevation : filter === 'Kilometer' ? rider.kilometers : filter === 'Sprint' ? rider.sprint : filter === 'Young Rider' ? rider.young : rider.points
const dateAfter = (days: number) => new Date(Date.now() - days * 86400000)
const isYoung = (birthDate?: string | null) => { if (!birthDate) return false; const birth = new Date(birthDate); const today = new Date(); let age = today.getFullYear() - birth.getFullYear(); if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age--; return age < 23 }
const jerseyFor = (filter: Filter, index: number) => {
  if (index !== 0) return 'plain'
  return filter === 'Berg' ? 'polka' : filter === 'Sprint' ? 'green' : filter === 'Young Rider' ? 'white' : 'yellow'
}
function ridersFrom(members: LiveMember[], rides: LiveRide[], bonuses: PointAdjustment[]): LeagueRider[] {
  return members.map(member => {
    const own = rides.filter(ride => ride.user_id === member.user_id)
    const sum = (list: LiveRide[]) => list.reduce((total, ride) => total + ride.points, 0)
    const eligibleYoung = isYoung(member.profiles?.birth_date)
    const bonus = bonuses.filter(item => item.user_id === member.user_id).reduce((total, item) => total + item.points, 0)
    const points = sum(own) + bonus
    return { id: member.user_id, name: member.profiles?.display_name || 'Rider', team: member.profiles?.team_name || undefined, riderNumber: member.rider_number, points, elevation: own.reduce((total, ride) => total + ride.elevation_m, 0), kilometers: own.reduce((total, ride) => total + ride.distance_m / 1000, 0), sprint: 0, young: eligibleYoung ? points : 0, week: sum(own.filter(ride => new Date(ride.started_at) >= dateAfter(7))) + bonus, month: sum(own.filter(ride => new Date(ride.started_at) >= dateAfter(30))) + bonus, eligibleYoung }
  })
}
function leader(riders: LeagueRider[], key: keyof LeagueRider, only?: (rider: LeagueRider) => boolean) { return riders.filter(rider => Number(rider[key]) > 0 && (!only || only(rider))).sort((a, b) => Number(b[key]) - Number(a[key]))[0] }

export function League({ onRiderSelect, onNavigate, userId, groups, demo }: { onRiderSelect: (rider: LeagueRider) => void; onNavigate?: (page: Page) => void; userId?: string; groups: LiveGroup[]; demo: boolean }) {
  const [filter, setFilter] = useState<Filter>('Gesamt')
  const [members, setMembers] = useState<LiveMember[]>([])
  const [rides, setRides] = useState<LiveRide[]>([])
  const [bonuses, setBonuses] = useState<PointAdjustment[]>([])
  const [info, setInfo] = useState(false)
  const activeId = userId ? localStorage.getItem(`velo-active-group:${userId}`) : null
  const active = groups.find(group => group.id === activeId) || groups[0]

  useEffect(() => { if (active) void Promise.all([getGroupMembers(active.id), getRides(active.id), getPointAdjustments(active.id)]).then(([nextMembers, nextRides, nextBonuses]) => { setMembers(nextMembers); setRides(nextRides); setBonuses(nextBonuses) }) }, [active?.id])
  if (demo) return <div className="page"><Card className="empty-inline"><strong>Entwickler-Demo</strong></Card></div>
  if (!active) return <div className="page"><EmptyGuide icon={<Trophy size={24}/>} eyebrow="LIGA" title="Deine Liga wartet" text="Erstelle zuerst eine Gruppe." preview={<div/>} action={<button className="primary-button" onClick={() => onNavigate?.('group')}>Gruppe erstellen</button>}/></div>

  const riders = ridersFrom(members, rides, bonuses).sort((a, b) => value(b, filter) - value(a, filter))
  const totalLeader = leader(riders, 'points'), mountainLeader = leader(riders, 'elevation'), kilometerLeader = leader(riders, 'kilometers'), youngLeader = leader(riders, 'young', rider => rider.eligibleYoung), weekLeader = leader(riders, 'week'), monthLeader = leader(riders, 'month')
  const jerseys: [string, string, LeagueRider | undefined, keyof LeagueRider, string][] = [['yellow', 'Gelbes Trikot', totalLeader, 'points', 'Saisonpunkte'], ['polka', 'Bergtrikot', mountainLeader, 'elevation', 'Höhenmeter'], ['green', 'Sprinttrikot', undefined, 'sprint', 'Segmente erforderlich'], ['white', 'Young Rider', youngLeader, 'young', 'U23-Punkte'], ['red', 'Form der Woche', weekLeader, 'week', 'Punkte in 7 Tagen'], ['violet', 'Form des Monats', monthLeader, 'month', 'Punkte in 30 Tagen']]
  const unit = filter === 'Berg' ? 'HM' : filter === 'Kilometer' ? 'KM' : filter === 'Sprint' ? 'KM/H' : 'PTS'

  return <div className="page"><div className="league-hero"><div><p className="eyebrow">FREUNDESLIGA · {riders.length} FAHRER</p><h2>{active.name}</h2><p>Live aus euren gespeicherten Gruppenfahrten.</p></div><div className="league-badge"><Crown size={24}/><span>LIVE</span></div></div><SectionHeading eyebrow="TRIKOTWERTUNGEN" title="Aktuelle Träger"/><div className="league-jerseys">{jerseys.map(([type, title, holder, key, label]) => <div className="league-jersey-button" key={title}><Jersey type={type}/><span><b>{title}</b>{holder?.name || 'Noch offen'}<small>{holder ? `${Math.round(Number(holder[key])).toLocaleString('de-DE')} ${label}` : label}</small></span></div>)}</div><div className="filter-row"><button className="filter-icon-button" onClick={() => setInfo(true)} aria-label="Filter und Erklärung öffnen"><SlidersHorizontal size={17}/></button>{filters.map(item => <button key={item} onClick={() => setFilter(item)} className={filter === item ? 'filter active' : 'filter'}>{item}</button>)}</div><SectionHeading title="Rangliste" action={<span className="subtle">{filter}</span>}/><Card className="ranking">{riders.map((rider, index) => <button className="rider-row" key={rider.id} onClick={() => onRiderSelect({ ...rider, jersey: jerseyFor(filter, index) })}><span className={`rank rank-${index + 1}`}>#{index + 1}</span><Jersey type={jerseyFor(filter, index)} small/><div className="rider-name"><strong>{rider.name}</strong><span>{filter === 'Young Rider' && !rider.eligibleYoung ? 'Nicht U23' : `${Math.round(value(rider, filter)).toLocaleString('de-DE')} ${unit}`}</span></div><strong className="rider-points">{Math.round(value(rider, filter))} <small>{unit}</small></strong></button>)}</Card>{info && <div className="modal-backdrop" onClick={() => setInfo(false)}><section className="filter-modal" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={() => setInfo(false)}><X/></button><h2>Wertungen</h2><p>Gesamt zählt Saisonpunkte, Berg Höhenmeter und Kilometer die Distanz. Young Rider zählt für Fahrer unter 23. Sprint beginnt mit Segmenten.</p></section></div>}</div>
}
