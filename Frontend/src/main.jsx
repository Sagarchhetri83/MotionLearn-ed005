import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const rootElement = document.getElementById('root')
createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// ✅ Disable service worker completely
if ('serviceWorker' in navigator) {
  // Unregister any existing service workers
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister()
    }
  })
}
