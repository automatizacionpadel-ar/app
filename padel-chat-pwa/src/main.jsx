import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ChatApp from './ChatApp.jsx'
import HomeScreen from './HomeScreen.jsx'
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
    <BrowserRouter>
      <Routes>
        <Route path="/:rubro/:slug" element={<ChatApp />} />
        <Route path="*" element={<HomeScreen />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
