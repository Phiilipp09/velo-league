import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)

// The previous offline cache could keep an outdated Vercel build alive and
// leave users with a blank screen after a deployment. The app is online-first,
// so remove legacy service workers and their stale caches on startup.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister())
    })
  })
}

if ('caches' in window) {
  caches.keys().then((keys) => {
    keys.filter((key) => key.startsWith('velo-league-')).forEach((key) => caches.delete(key))
  })
}
