import { ArrowRight, ChevronRight, Crown, Flame, Mountain, Trophy } from 'lucide-react'
import type { Page } from '../App'
import { Card, Jersey, SectionHeading } from '../components/Ui'
import type { ElementType } from 'react'

export function Dashboard({ onNavigate }: { onNavigate: (p: Page) => void }) { return <div className="page dashboard-page">
  <div className="dashboard-grid">
    <Card className="leader-card"><div className="leader-noise"/><div className="leader-copy"><p className="eyebrow">AKTUELLES TRIKOT</p><h2>Gelbes Trikot</h2><p className="muted">Du führst die Alpine Cycling League.</p><div className="leader-name"><Jersey /><div><strong>Philipp</strong><span>Gesamtführender</span></div></div></div><div className="leader-points"><strong>2.450</strong><span>Saisonpunkte</span><em><Crown size={14}/> RANG #1</em></div></Card>
    <Card className="challenge-hero"><div className="route-lines"/><div className="challenge-content"><p className="eyebrow">NÄCHSTE HERAUSFORDERUNG</p><h2><Mountain size={22}/> Alpenstraße König</h2><div className="challenge-numbers"><span><b>5,4</b> km</span><span><b>420</b> hm</span><span><b>19:05</b> deine Zeit</span></div><button onClick={() => onNavigate('segments')} className="primary-button">Segment ansehen <ArrowRight size={17}/></button></div><div className="best-time"><span>BESTE ZEIT</span><b>18:32</b><small>Max · 2026</small></div></Card>
  </div>
  <SectionHeading eyebrow="DEINE LEISTUNG" title="Saisonübersicht" action={<button onClick={() => onNavigate('profile')} className="text-button">Alle Statistiken <ChevronRight size={16}/></button>} />
  <div className="stats-grid">{stats.map(({ value, label, Icon }) => <Card className="stat-card" key={label}><span className="stat-icon"><Icon size={19}/></span><strong>{value}</strong><span>{label}</span></Card>)}</div>
  <SectionHeading eyebrow="IM RÜCKSPIEGEL" title="Letzte Aktivitäten" />
  <Card className="activity"><div className="activity-icon"><Mountain size={19}/></div><div><strong>Mendelpass Attack</strong><p>Heute · 42,8 km · 1.120 hm</p></div><b>+180 <small>PTS</small></b><span className="rank-pill">#2 Berg</span></Card>
</div> }
const stats: { value: string; label: string; Icon: ElementType }[] = [
  { value: '1.850', label: 'Kilometer', Icon: BikeIcon }, { value: '32.500', label: 'Höhenmeter', Icon: Mountain },
  { value: '14', label: 'Siege', Icon: Trophy }, { value: '27', label: 'Podiumsplätze', Icon: Flame },
]
function BikeIcon(){ return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M5.5 17.5 9 8h4l2 9.5M8 12h7M10 5h4"/></svg> }
