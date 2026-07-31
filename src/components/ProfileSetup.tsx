import { useState } from 'react'
import { ArrowRight, Bike, Ruler, Scale, UserRound } from 'lucide-react'
import { saveProfile } from '../lib/supabaseData'

type RiderProfile = { gender: string; height: string; weight: string; level: string; birthDate: string }
export function ProfileSetup({ user, userId, onComplete }: { user: string; userId?: string; onComplete: () => void }) {
  const draft = JSON.parse(localStorage.getItem('velo-profile-draft') || '{}') as Partial<RiderProfile>
  const [profile, setProfile] = useState<RiderProfile>({ gender: '', height: '', weight: '', level: 'Fortgeschritten', birthDate: draft.birthDate || '' })
  const [saving, setSaving] = useState(false), [error, setError] = useState('')
  const update = (key: keyof RiderProfile, value: string) => setProfile(current => ({ ...current, [key]: value }))
  const finish = async () => {
    setSaving(true); setError('')
    try {
      if (userId) await saveProfile({ id: userId, display_name: user, birth_date: profile.birthDate || null, gender: profile.gender || null, height_cm: profile.height ? Number(profile.height) : null, weight_kg: profile.weight ? Number(profile.weight) : null, rider_level: profile.level, onboarding_completed: true })
      localStorage.setItem(`velo-rider-profile:${user}`, JSON.stringify(profile)); localStorage.setItem(`velo-profile-complete:${user}`, 'true'); localStorage.removeItem('velo-profile-draft'); onComplete()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Profil konnte nicht gespeichert werden.') } finally { setSaving(false) }
  }
  return <main className="auth-page"><section className="auth-panel profile-setup"><div className="auth-brand"><span><Bike size={21}/></span><strong>VELO <b>LEAGUE</b></strong></div><p className="eyebrow">SCHRITT 2 VON 2 · FAHRERPROFIL</p><h1>Bereit für deine Saison, {user}?</h1><p className="auth-copy">Diese Angaben helfen dir später bei deinen persönlichen Leistungswerten. Sie sind nur in deiner privaten Gruppe sichtbar.</p><div className="profile-setup-grid"><label>Geschlecht<div><UserRound size={16}/><select value={profile.gender} onChange={event => update('gender', event.target.value)}><option value="">Bitte auswählen</option><option>Männlich</option><option>Weiblich</option><option>Divers</option><option>Keine Angabe</option></select></div></label><label>Körpergröße<div><Ruler size={16}/><input inputMode="numeric" value={profile.height} onChange={event => update('height', event.target.value.replace(/\D/g, ''))} placeholder="z. B. 182"/><span>cm</span></div></label><label>Gewicht<div><Scale size={16}/><input inputMode="decimal" value={profile.weight} onChange={event => update('weight', event.target.value.replace(',', '.').replace(/[^\d.]/g, ''))} placeholder="z. B. 74"/><span>kg</span></div></label><label>Fahrniveau<div><Bike size={16}/><select value={profile.level} onChange={event => update('level', event.target.value)}><option>Einsteiger</option><option>Fortgeschritten</option><option>Ambitioniert</option><option>Elite Rider</option></select></div></label></div>{error && <p className="auth-error">{error}</p>}<button onClick={() => void finish()} disabled={saving} className="auth-submit">{saving ? 'Speichert…' : <>Saison starten <ArrowRight size={17}/></>}</button><button onClick={() => void finish()} disabled={saving} className="setup-skip">Später ergänzen</button></section></main>
}
