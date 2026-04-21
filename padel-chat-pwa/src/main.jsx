import React from 'react'
import ReactDOM from 'react-dom/client'
import ChatApp from './ChatApp.jsx'
import './ChatApp.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => console.log('[SW] Registrado:', reg.scope))
      .catch((err) => console.error('[SW] Error:', err))
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChatApp />
  </React.StrictMode>
)
