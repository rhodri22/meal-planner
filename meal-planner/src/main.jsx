import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'

// Service-worker update detection.
// When a new version is deployed, this fires a 'pwa-update-available' event,
// and the App shows a banner letting the user refresh to get the latest code.
const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('pwa-update-available', { detail: { updateSW } }))
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
