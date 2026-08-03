import { useEffect, useState } from 'react'
import { CalendarCheck, Copy, Crown, Link2, LoaderCircle, LockKeyhole, Plus, QrCode, Settings2, Share2, Users, X } from 'lucide-react'
import type { Page } from '../App'
import { Card, Jersey, SectionHeading } from '../components/Ui'
import { closeGroupSeason, createGroup, getGroupMembers, getGroups, joinGroup, removeMember, transferGroupOwnership, updateGroupName, updateGroupSeason, type LiveGroup, type LiveMember } from '../lib/supabaseData'
import { announceLiveDataChange } from '../lib/liveSeason'

export function GroupHub({ userId, notify, onNavigate }: { userId?: string; userName: string; notify: (message: string) => void; onNavigate: (page: Page) => void }) {
  const [groups, setGroups] = useState<LiveGroup[]>([])
  const [active, setActive] = useState<LiveGroup | null>(null)
  const [members, setMembers] = useState<LiveMember[]>([])
  const [create, setCreate] = useState(false)
  const [manage, setManage] = useState(false)
  const [qr, setQr] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!userId) return
    try {
      const all = await getGroups()
      const chosen = all.find(group => group.id === localStorage.getItem(`velo-active-group:${userId}`)) || all[0] || null
      setGroups(all)
      setActive(chosen)
      if (chosen) {
        localStorage.setItem(`velo-active-group:${userId}`, chosen.id)
        setMembers(await getGroupMembers(chosen.id))
      } else localStorage.removeItem(`velo-active-group:${userId}`)
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [userId])
  useEffect(() => {
    const code = new URLSearchParams(location.search).get('join')
    if (code && userId) void joinGroup(code).then(() => {
      history.replaceState(null, '', location.pathname)
      void load()
      notify('Du bist der Gruppe beigetreten.')
    }).catch(() => notify('Einladungslink ungültig.'))
  }, [userId])

  const save = async (name: string) => {
    if (!userId) return
    try {
      const group = await createGroup(name, userId)
      localStorage.setItem(`velo-active-group:${userId}`, group.id)
      await load()
      setCreate(false)
      announceLiveDataChange()
      notify('Gruppe erstellt.')
    } catch (error) { notify(error instanceof Error ? error.message : 'Gruppe konnte nicht erstellt werden.') }
  }

  if (loading) return <div className="page empty-page"><Card className="empty-state"><LoaderCircle className="spin"/><h2>Gruppen werden geladen...</h2></Card></div>
  if (!active) return <div className="page empty-page"><Card className="empty-state"><Users/><h2>Deine erste Gruppe ist noch leer.</h2><button className="primary-button" onClick={() => setCreate(true)}>Gruppe erstellen</button></Card>{create && <Create onClose={() => setCreate(false)} onCreate={save}/>}</div>

  const link = `${location.origin}${location.pathname}?join=${active.invite_code}`
  const copy = () => navigator.clipboard.writeText(link).then(() => notify('Einladungslink kopiert.'))
  const admin = active.owner_id === userId
  const leave = async () => {
    if (!userId) return
    if (admin && members.length > 1) return notify('Übertrage zuerst die Adminrolle, bevor du die Gruppe verlässt.')
    try {
      await removeMember(active.id, userId)
      localStorage.removeItem(`velo-active-group:${userId}`)
      announceLiveDataChange()
      await load()
      notify('Du hast die Gruppe verlassen.')
    } catch (error) { notify(error instanceof Error ? error.message : 'Gruppe konnte nicht verlassen werden.') }
  }
  const rename = async (name: string) => { await updateGroupName(active.id, name); announceLiveDataChange() }
  const seasonStatus = active.season_closed_at ? `${active.season_name || 'Diese Saison'} ist abgeschlossen.` : active.season_ends_at ? `${active.season_name || 'Aktuelle Saison'} endet am ${new Date(active.season_ends_at).toLocaleDateString('de-DE')}.` : 'Nur für Mitglieder sichtbar.'

  return <div className="page">
    <Card className="group-hero"><div className="group-emblem"><Crown/></div><div><p className="eyebrow">PRIVATE GRUPPE · {members.length} MITGLIEDER</p><h2>{active.name}</h2><p>{seasonStatus}</p></div><button className="group-switch" onClick={() => setCreate(true)}><Plus/> Gruppe</button></Card>
    <div className="group-grid">
      <Card className="invite-card"><div><p className="eyebrow">FREUNDE EINLADEN</p><h3>Gemeinsam in die Saison.</h3><p>Jeder mit diesem Link kann beitreten.</p></div><div className="invite-link"><Link2/><span>...?join={active.invite_code}</span><button onClick={copy}><Copy/></button></div><button className="primary-button" onClick={copy}><Share2/> Link teilen</button><button className="secondary-button" onClick={() => setQr(true)}><QrCode/> QR-Code</button></Card>
      <Card className="members-card"><div className="member-heading"><h3>Mitglieder</h3><button onClick={() => setManage(true)}><Settings2/></button></div>{members.map(member => <div className="member" key={member.user_id}><Jersey type="yellow" small/><strong>{member.profiles?.display_name || 'Rider'}</strong><span>{member.user_id === active.owner_id ? 'Gruppen-Admin' : 'Mitglied'}</span></div>)}<button className="text-button" onClick={() => setManage(true)}>Mitglieder verwalten</button></Card>
    </div>
    <SectionHeading title="Gruppenfeed" action={<button className="text-button" onClick={() => onNavigate('activities')}>Fahrten ansehen</button>}/>
    <Card className="feed-empty"><Users/><div><strong>Der Gruppenfeed ist bereit.</strong><p>Fahrten zählen automatisch für eure Liga.</p></div></Card>
    {create && <Create onClose={() => setCreate(false)} onCreate={save}/>} 
    {manage && <Manage active={active} members={members} userId={userId} admin={admin} leave={leave} rename={rename} reload={load} notify={notify} onClose={() => setManage(false)}/>} 
    {qr && <div className="modal-backdrop" onClick={() => setQr(false)}><section className="share-modal" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={() => setQr(false)}><X/></button><h2>Direkt in deine Gruppe</h2><img className="invite-qr" alt="Einladungs-QR-Code" src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(link)}`}/></section></div>}
  </div>
}

function Manage({ active, members, userId, admin, leave, rename, reload, notify, onClose }: { active: LiveGroup; members: LiveMember[]; userId?: string; admin: boolean; leave: () => void; rename: (name: string) => Promise<void>; reload: () => Promise<void>; notify: (message: string) => void; onClose: () => void }) {
  const [name, setName] = useState(active.name)
  const [seasonName, setSeasonName] = useState(active.season_name || `Saison ${active.season_year || new Date().getFullYear()}`)
  const [seasonYear, setSeasonYear] = useState(String(active.season_year || new Date().getFullYear()))
  const [seasonEnd, setSeasonEnd] = useState(active.season_ends_at || '')
  const [confirmClose, setConfirmClose] = useState(false)
  const act = async (fn: () => Promise<unknown>, message: string) => { try { await fn(); await reload(); notify(message) } catch (error) { notify(error instanceof Error ? error.message : 'Aktion nicht möglich.') } }
  const saveSeason = () => void act(() => updateGroupSeason(active.id, { season_name: seasonName.trim() || `Saison ${seasonYear}`, season_year: Number(seasonYear), season_ends_at: seasonEnd || null }), 'Saisondaten gespeichert.')
  const closeSeason = () => void act(() => closeGroupSeason(active.id, Number(seasonYear), seasonName.trim() || `Saison ${seasonYear}`), 'Saison abgeschlossen. Alle Fahrerkarten wurden archiviert.')

  return <div className="modal-backdrop" onClick={onClose}><section className="share-modal members-modal" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={onClose}><X/></button><p className="eyebrow">MITGLIEDERVERWALTUNG</p><h2>{active.name}</h2>
    {admin && <><div className="group-rename"><label>Gruppenname<input value={name} maxLength={60} onChange={event => setName(event.target.value)}/></label><button className="secondary-button" disabled={!name.trim() || name.trim() === active.name} onClick={() => void act(() => rename(name.trim()), 'Gruppenname gespeichert.')}>Gruppennamen speichern</button></div>
      <div className="season-admin"><div><CalendarCheck size={18}/><p><strong>Saisonverwaltung</strong><span>Beim Abschluss werden die Saisonwerte als dauerhafte Fahrerkarten archiviert.</span></p></div><label>Saisonname<input value={seasonName} maxLength={60} onChange={event => setSeasonName(event.target.value)}/></label><div className="season-admin-fields"><label>Jahr<input type="number" min="2020" max="2100" value={seasonYear} onChange={event => setSeasonYear(event.target.value)}/></label><label>Enddatum<input type="date" value={seasonEnd} onChange={event => setSeasonEnd(event.target.value)}/></label></div>
        {active.season_closed_at ? <div className="season-closed"><LockKeyhole size={15}/><span>Abgeschlossen am {new Date(active.season_closed_at).toLocaleDateString('de-DE')}</span></div> : <><button className="secondary-button" onClick={saveSeason}>Saisondaten speichern</button>{confirmClose ? <div className="season-close-confirm"><strong>Wirklich abschließen?</strong><p>Dieser Schritt erzeugt die dauerhaften Saisonkarten und kann nicht rückgängig gemacht werden.</p><div><button className="secondary-button" onClick={() => setConfirmClose(false)}>Abbrechen</button><button className="danger-button" onClick={closeSeason}>Saison endgültig abschließen</button></div></div> : <button className="danger-button" onClick={() => setConfirmClose(true)}><Crown size={16}/> Saison abschließen</button>}</>}</div>
    </>}
    {members.map(member => <div className="member manager-member" key={member.user_id}><strong>{member.profiles?.display_name || 'Rider'}</strong><span>{member.user_id === active.owner_id ? 'Gruppen-Admin' : 'Mitglied'}</span>{admin && member.user_id !== userId && <><button className="text-button" onClick={() => void act(() => transferGroupOwnership(active.id, userId!, member.user_id), 'Adminrolle übertragen.')}>Admin übertragen</button><button className="text-button" onClick={() => void act(() => removeMember(active.id, member.user_id), 'Mitglied entfernt.')}>Entfernen</button></>}</div>)}
    <button className="secondary-button" onClick={leave}>Gruppe verlassen</button>
  </section></div>
}

function Create({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) { const [name, setName] = useState(''); return <div className="modal-backdrop group-modal"><section className="create-group"><h2>Gruppe erstellen</h2><label>Gruppenname<input value={name} onChange={event => setName(event.target.value)}/></label><button className="primary-button" disabled={!name.trim()} onClick={() => onCreate(name.trim())}>Erstellen</button><button className="secondary-button" onClick={onClose}>Abbrechen</button></section></div> }
