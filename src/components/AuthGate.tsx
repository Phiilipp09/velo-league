import { useMemo, useState } from 'react'
import { ArrowRight, Bike, Check, LockKeyhole, Mail, ShieldCheck, UserPlus } from 'lucide-react'

type Account = { email: string; password: string; name: string; verified: boolean }

const accountKey = 'velo-test-account'
const sessionKey = 'velo-session'
const testCode = '123456'

export function getStoredSession() {
  return localStorage.getItem(sessionKey) ?? sessionStorage.getItem(sessionKey)
}

export function AuthGate({ onAuthenticated }: { onAuthenticated: (name: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [stage, setStage] = useState<'form' | 'verify'>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')

  const passwordRules = useMemo(() => [
    { label: 'Mindestens 8 Zeichen', met: password.length >= 8 },
    { label: 'Mindestens ein Großbuchstabe', met: /[A-ZÄÖÜ]/.test(password) },
    { label: 'Mindestens eine Zahl', met: /\d/.test(password) },
  ], [password])
  const passwordIsValid = passwordRules.every(rule => rule.met)

  const start = (displayName: string) => {
    if (remember) localStorage.setItem(sessionKey, displayName)
    else sessionStorage.setItem(sessionKey, displayName)
    onAuthenticated(displayName)
  }

  const startDeveloperDemo = () => {
    localStorage.removeItem('velo-new-user')
    localStorage.setItem(sessionKey, 'Philipp')
    onAuthenticated('Philipp')
  }

  const submit = () => {
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || (mode === 'register' && !name.trim()) || !password) {
      setError(mode === 'register' ? 'Bitte fülle Name, E-Mail-Adresse und Passwort aus.' : 'Bitte gib E-Mail-Adresse und Passwort ein.')
      return
    }
    if (mode === 'register') {
      if (!passwordIsValid) {
        setError('Bitte erfülle alle Passwortanforderungen.')
        return
      }
      setError('')
      setStage('verify')
      return
    }
    const raw = localStorage.getItem(accountKey)
    const account = raw ? JSON.parse(raw) as Account : null
    if (!account || account.email !== cleanEmail || account.password !== password || !account.verified) {
      setError('E-Mail-Adresse oder Passwort stimmen nicht. Registriere dich, falls du noch neu bist.')
      return
    }
    start(account.name)
  }

  const verify = () => {
    if (code !== testCode) {
      setError('Der Bestätigungscode ist nicht korrekt.')
      return
    }
    const account: Account = { email: email.trim().toLowerCase(), password, name: name.trim(), verified: true }
    localStorage.setItem(accountKey, JSON.stringify(account))
    localStorage.setItem('velo-profile-data', JSON.stringify({ name: account.name, email: account.email, height: '', weight: '', gender: 'Möchte ich nicht angeben', birthYear: '', team: '' }))
    localStorage.setItem('velo-new-user', 'true')
    start(account.name)
  }

  if (stage === 'verify') return <main className="auth-page"><section className="auth-panel verify-panel"><div className="auth-brand"><span><Bike size={21}/></span><strong>VELO <b>LEAGUE</b></strong></div><span className="verify-icon"><ShieldCheck size={28}/></span><p className="eyebrow">E-MAIL BESTÄTIGEN</p><h1>Fast geschafft.</h1><p className="auth-copy">Wir haben einen sechsstelligen Code an <b>{email}</b> gesendet. Gib ihn ein, um dein Konto zu aktivieren.</p><form onSubmit={event => { event.preventDefault(); verify() }} className="auth-form"><label>Bestätigungscode<div><ShieldCheck size={16}/><input className="verify-code" inputMode="numeric" maxLength={6} autoFocus value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} placeholder="000000"/></div></label><p className="test-code">Testphase: Verwende den Code <b>{testCode}</b>. Für echte E-Mails wird später ein Versanddienst verbunden.</p>{error && <p className="auth-error">{error}</p>}<button className="auth-submit" type="submit">E-Mail bestätigen <ArrowRight size={17}/></button><button className="text-button" type="button" onClick={() => { setStage('form'); setError('') }}>Zurück zur Registrierung</button></form></section></main>

  return <main className="auth-page"><section className="auth-panel"><div className="auth-brand"><span><Bike size={21}/></span><strong>VELO <b>LEAGUE</b></strong></div><p className="eyebrow">PRIVATE CYCLING LEAGUES</p><h1>{mode === 'login' ? 'Willkommen zurück.' : 'Deine Saison beginnt hier.'}</h1><p className="auth-copy">{mode === 'login' ? 'Melde dich an und setze deine persönliche Saison fort.' : 'Erstelle deinen persönlichen Zugang. Deine Daten richtest du gleich danach ein.'}</p><div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError('') }}>Anmelden</button><button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError('') }}>Registrieren</button></div><form onSubmit={event => { event.preventDefault(); submit() }} className="auth-form">{mode === 'register' && <label>Name<div><UserPlus size={16}/><input autoComplete="name" value={name} onChange={event => setName(event.target.value)} placeholder="Dein Name"/></div></label>}<label>E-Mail-Adresse<div><Mail size={16}/><input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@email.de"/></div></label><label>Passwort<div><LockKeyhole size={16}/><input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} placeholder={mode === 'register' ? 'Ein sicheres Passwort wählen' : 'Dein Passwort'}/></div></label>{mode === 'register' && <div className="password-requirements">{passwordRules.map(rule => <span key={rule.label} className={rule.met ? 'met' : ''}><i>{rule.met && <Check size={12}/>}</i>{rule.label}</span>)}</div>}<label className="remember-row"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)}/><span>Angemeldet bleiben</span></label>{error && <p className="auth-error">{error}</p>}<button className="auth-submit" type="submit">{mode === 'login' ? <>Anmelden <ArrowRight size={17}/></> : <>Code anfordern <ArrowRight size={17}/></>}</button></form><div className="developer-entry"><span>Nur zum Testen</span><button type="button" onClick={startDeveloperDemo}>Entwickler-Demo starten <ArrowRight size={15}/></button></div><p className="auth-legal">Private Testversion · Deine Daten sind nur für deine Gruppe vorgesehen.</p></section></main>
}
