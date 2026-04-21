# Rutas Dinámicas Multi-Rubro + UI iOS — Simplificia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar la PWA de query params hardcodeados a rutas `/:rubro/:slug` con config cargada desde Baserow y UI rediseñada con estilo iOS.

**Architecture:** React Router v6 lee `rubro` y `slug` de la URL. Un hook `useNegocio` consulta la tabla `negocios` de Baserow filtrando por ambos campos y devuelve la configuración completa. El componente `ChatApp` aplica el tema dinámicamente y usa el `webhook_url` que viene de Baserow.

**Tech Stack:** React 18, Vite 5, React Router v6, Baserow REST API, Vitest, @testing-library/react

---

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
|---|---|---|
| Crear | `padel-chat-pwa/vercel.json` | SPA rewrite para Vercel |
| Crear | `padel-chat-pwa/.env.example` | Documentar variables de entorno requeridas |
| Modificar | `padel-chat-pwa/package.json` | Agregar react-router-dom, vitest, @testing-library/react |
| Modificar | `padel-chat-pwa/vite.config.js` | Agregar config de test (jsdom) |
| Crear | `padel-chat-pwa/src/hooks/useNegocio.js` | Hook que fetcha config del negocio desde Baserow |
| Crear | `padel-chat-pwa/src/hooks/useNegocio.test.js` | Tests del hook |
| Modificar | `padel-chat-pwa/src/main.jsx` | Envolver en BrowserRouter, agregar Routes |
| Crear | `padel-chat-pwa/src/HomeScreen.jsx` | Pantalla para rutas sin rubro/slug |
| Modificar | `padel-chat-pwa/src/ChatApp.jsx` | Usar useParams + useNegocio, nuevos nombres de campos |
| Crear | `padel-chat-pwa/src/components/BusinessCard.jsx` | Card iOS con horarios y acciones rápidas |
| Modificar | `padel-chat-pwa/src/components/ChatHeader.jsx` | Nav bar estilo iOS, renombrar prop complex → negocio |
| Modificar | `padel-chat-pwa/src/ChatApp.css` | iOS variables, business-card styles, header translúcido |

---

## Task 1: vercel.json + dependencias

**Files:**
- Crear: `padel-chat-pwa/vercel.json`
- Crear: `padel-chat-pwa/.env.example`
- Modificar: `padel-chat-pwa/package.json`
- Modificar: `padel-chat-pwa/vite.config.js`

- [ ] **Paso 1: Crear vercel.json**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Ruta: `padel-chat-pwa/vercel.json`

- [ ] **Paso 2: Crear .env.example**

```
VITE_BASEROW_API_URL=https://api.baserow.io
VITE_BASEROW_TOKEN=your-read-only-token-here
VITE_BASEROW_TABLE_ID=your-table-id-here
```

Ruta: `padel-chat-pwa/.env.example`

- [ ] **Paso 3: Instalar dependencias**

```bash
cd padel-chat-pwa
npm install react-router-dom
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Paso 4: Actualizar vite.config.js con config de test**

Reemplazar el contenido completo:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
})
```

- [ ] **Paso 5: Agregar script de test en package.json**

En la sección `"scripts"`, agregar:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Paso 6: Verificar que el dev server arranca**

```bash
cd padel-chat-pwa
npm run dev
```

Expected: servidor en `http://localhost:5173`

- [ ] **Paso 7: Commit**

```bash
git init  # solo si no existe repo
git add padel-chat-pwa/vercel.json padel-chat-pwa/.env.example padel-chat-pwa/package.json padel-chat-pwa/package-lock.json padel-chat-pwa/vite.config.js
git commit -m "chore: add react-router-dom, vitest, vercel rewrite config"
```

---

## Task 2: Hook useNegocio con tests

**Files:**
- Crear: `padel-chat-pwa/src/hooks/useNegocio.js`
- Crear: `padel-chat-pwa/src/hooks/useNegocio.test.js`

- [ ] **Paso 1: Escribir los tests primero**

Crear `padel-chat-pwa/src/hooks/useNegocio.test.js`:

```javascript
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useNegocio } from './useNegocio'

const mockNegocio = {
  id: 1,
  nombre: 'Padel Zona Norte',
  rubro: 'padel',
  slug: 'zona-norte',
  color_primario: '#FF6B6B',
  color_dark: '#cc5555',
  logo_emoji: '🎾',
  descripcion: 'Reserva tus canches',
  horarios: '08:00 – 23:00',
  bienvenida: '¡Hola! Bienvenido a Padel Zona Norte',
  webhook_url: 'https://n8n.simplificia.com.ar/webhook/padel',
  activo: true,
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('useNegocio', () => {
  it('starts in loading status', () => {
    fetch.mockReturnValueOnce(new Promise(() => {})) // never resolves
    const { result } = renderHook(() => useNegocio('padel', 'zona-norte'))
    expect(result.current.status).toBe('loading')
    expect(result.current.negocio).toBeNull()
  })

  it('returns ready + negocio when Baserow returns an active business', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [mockNegocio] }),
    })

    const { result } = renderHook(() => useNegocio('padel', 'zona-norte'))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.negocio).toEqual(mockNegocio)
  })

  it('returns not_found when Baserow returns empty results', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    })

    const { result } = renderHook(() => useNegocio('padel', 'no-existe'))
    await waitFor(() => expect(result.current.status).toBe('not_found'))
    expect(result.current.negocio).toBeNull()
  })

  it('returns suspended when activo is false', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{ ...mockNegocio, activo: false }] }),
    })

    const { result } = renderHook(() => useNegocio('padel', 'zona-norte'))
    await waitFor(() => expect(result.current.status).toBe('suspended'))
    expect(result.current.negocio).toBeNull()
  })

  it('returns error when fetch rejects', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useNegocio('padel', 'zona-norte'))
    await waitFor(() => expect(result.current.status).toBe('error'))
  })

  it('returns error when Baserow returns HTTP error', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const { result } = renderHook(() => useNegocio('padel', 'zona-norte'))
    await waitFor(() => expect(result.current.status).toBe('error'))
  })
})
```

- [ ] **Paso 2: Correr los tests y verificar que fallan**

```bash
cd padel-chat-pwa
npm test
```

Expected: 6 tests en rojo, "Cannot find module './useNegocio'"

- [ ] **Paso 3: Crear la carpeta hooks e implementar el hook**

Crear `padel-chat-pwa/src/hooks/useNegocio.js`:

```javascript
import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_BASEROW_API_URL
const TOKEN = import.meta.env.VITE_BASEROW_TOKEN
const TABLE_ID = import.meta.env.VITE_BASEROW_TABLE_ID

export function useNegocio(rubro, slug) {
  const [negocio, setNegocio] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!rubro || !slug) {
      setStatus('not_found')
      return
    }

    setStatus('loading')
    setNegocio(null)

    const url =
      `${API_URL}/api/database/rows/table/${TABLE_ID}/` +
      `?user_field_names=true` +
      `&filter__rubro__equal=${encodeURIComponent(rubro)}` +
      `&filter__slug__equal=${encodeURIComponent(slug)}`

    fetch(url, { headers: { Authorization: `Token ${TOKEN}` } })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!data.results || data.results.length === 0) {
          setStatus('not_found')
          return
        }
        const row = data.results[0]
        if (!row.activo) {
          setStatus('suspended')
          return
        }
        setNegocio(row)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [rubro, slug])

  return { negocio, status }
}
```

- [ ] **Paso 4: Correr los tests y verificar que pasan**

```bash
cd padel-chat-pwa
npm test
```

Expected: 6 tests en verde

- [ ] **Paso 5: Commit**

```bash
git add padel-chat-pwa/src/hooks/
git commit -m "feat: add useNegocio hook with Baserow fetch and tests"
```

---

## Task 3: Routing en main.jsx + HomeScreen

**Files:**
- Modificar: `padel-chat-pwa/src/main.jsx`
- Crear: `padel-chat-pwa/src/HomeScreen.jsx`

- [ ] **Paso 1: Crear HomeScreen.jsx**

Crear `padel-chat-pwa/src/HomeScreen.jsx`:

```jsx
export default function HomeScreen() {
  return (
    <div className="fullscreen-center">
      <div className="error-icon">💬</div>
      <h2 className="error-title">Simplificia</h2>
      <p className="error-message">
        Accedé con el link de tu negocio.{'\n'}
        Ejemplo: /padel/zona-norte
      </p>
    </div>
  )
}
```

- [ ] **Paso 2: Actualizar main.jsx con BrowserRouter y rutas**

Reemplazar el contenido completo de `padel-chat-pwa/src/main.jsx`:

```jsx
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
```

- [ ] **Paso 3: Verificar en dev server**

Abrir `http://localhost:5173/` → debe mostrar HomeScreen con "Simplificia"
Abrir `http://localhost:5173/padel/zona-norte` → no debe romper (ChatApp cargará luego)

- [ ] **Paso 4: Commit**

```bash
git add padel-chat-pwa/src/main.jsx padel-chat-pwa/src/HomeScreen.jsx
git commit -m "feat: add React Router with /:rubro/:slug route"
```

---

## Task 4: Refactorizar ChatApp

**Files:**
- Modificar: `padel-chat-pwa/src/ChatApp.jsx`

Reemplazar el contenido completo de `padel-chat-pwa/src/ChatApp.jsx`:

- [ ] **Paso 1: Escribir el nuevo ChatApp.jsx**

```jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useNegocio } from './hooks/useNegocio'
import ChatHeader from './components/ChatHeader.jsx'
import ChatMessages from './components/ChatMessages.jsx'
import ChatInput from './components/ChatInput.jsx'
import BusinessCard from './components/BusinessCard.jsx'

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getStorageKey(rubro, slug) {
  return `chat_${rubro}_${slug}`
}

function getConvKey(rubro, slug) {
  return `conv_${rubro}_${slug}`
}

function loadMessages(rubro, slug) {
  try {
    const raw = localStorage.getItem(getStorageKey(rubro, slug))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveMessages(rubro, slug, messages) {
  try {
    localStorage.setItem(getStorageKey(rubro, slug), JSON.stringify(messages))
  } catch (e) {
    console.error('[Storage] Error al guardar:', e)
  }
}

function getOrCreateConversationId(rubro, slug) {
  const key = getConvKey(rubro, slug)
  let id = localStorage.getItem(key)
  if (!id) {
    id = generateId()
    localStorage.setItem(key, id)
  }
  return id
}

function applyTheme(negocio) {
  document.title = negocio.nombre
  document.documentElement.style.setProperty('--color-primary', negocio.color_primario)
  document.documentElement.style.setProperty('--color-primary-dark', negocio.color_dark)

  const themeMeta = document.getElementById('theme-color-meta')
  if (themeMeta) themeMeta.setAttribute('content', negocio.color_primario)

  const appleTitle = document.getElementById('apple-title')
  if (appleTitle) appleTitle.setAttribute('content', negocio.nombre)

  // Manifest y favicon usan slug con underscores para coincidir con nombres de archivo
  const fileSlug = negocio.slug.replace(/-/g, '_')

  const manifestLink = document.getElementById('manifest-link')
  if (manifestLink) manifestLink.setAttribute('href', `/manifests/manifest_${fileSlug}.json`)

  const appleIcon = document.getElementById('apple-icon')
  if (appleIcon) appleIcon.setAttribute('href', `/favicons/favicon_${fileSlug}_192.png`)
}

export default function ChatApp() {
  const { rubro, slug } = useParams()
  const { negocio, status } = useNegocio(rubro, slug)

  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [inputDisabled, setInputDisabled] = useState(false)
  const conversationIdRef = useRef(null)
  const initializedRef = useRef(false)

  // Inicializar mensajes y conversación cuando el negocio carga
  useEffect(() => {
    if (status !== 'ready' || !negocio || initializedRef.current) return
    initializedRef.current = true

    conversationIdRef.current = getOrCreateConversationId(rubro, slug)
    applyTheme(negocio)

    const saved = loadMessages(rubro, slug)
    if (saved && saved.length > 0) {
      setMessages(saved)
    } else {
      setMessages([
        {
          id: generateId(),
          role: 'bot',
          text: negocio.bienvenida,
          timestamp: Date.now(),
        },
      ])
    }
  }, [status, negocio, rubro, slug])

  // Guardar mensajes cuando cambian
  useEffect(() => {
    if (status === 'ready' && messages.length > 0) {
      saveMessages(rubro, slug, messages)
    }
  }, [messages, status, rubro, slug])

  const sendMessage = useCallback(
    async (payload) => {
      if (inputDisabled || !negocio) return
      if (payload.type === 'text' && !payload.text?.trim()) return

      const userMsg = {
        id: generateId(),
        role: 'user',
        type: payload.type,
        text: payload.text || '',
        mediaData: payload.mediaData || null,
        mimeType: payload.mimeType || null,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, userMsg])
      setInputDisabled(true)
      setIsTyping(true)

      try {
        const res = await fetch(negocio.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: payload.text || '',
            negocioId: negocio.slug,
            rubro: negocio.rubro,
            conversationId: conversationIdRef.current,
            type: payload.type,
            ...(payload.mediaData && { mediaData: payload.mediaData }),
            ...(payload.mimeType && { mimeType: payload.mimeType }),
            ...(payload.fileName && { fileName: payload.fileName }),
          }),
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = await res.json()
        const botText =
          data.botResponse || data.response || data.message || 'Lo siento, no pude procesar tu mensaje.'

        const newMsgs = [{ id: generateId(), role: 'bot', text: botText, timestamp: Date.now() }]

        if (data.botImages && data.botImages.length > 0) {
          data.botImages.forEach((img) => {
            newMsgs.push({
              id: generateId(),
              role: 'bot',
              type: 'image',
              mediaData: img,
              text: '',
              timestamp: Date.now(),
            })
          })
        }

        setMessages((prev) => [...prev, ...newMsgs])
      } catch (e) {
        console.error('[Chat] Error al enviar:', e)
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: 'error',
            text: 'No pude conectarme al servidor. Por favor, intentá de nuevo.',
            timestamp: Date.now(),
          },
        ])
      } finally {
        setIsTyping(false)
        setInputDisabled(false)
      }
    },
    [negocio, inputDisabled]
  )

  function clearHistory() {
    if (!rubro || !slug) return
    localStorage.removeItem(getStorageKey(rubro, slug))
    localStorage.removeItem(getConvKey(rubro, slug))
    conversationIdRef.current = getOrCreateConversationId(rubro, slug)
    setMessages([
      {
        id: generateId(),
        role: 'bot',
        text: negocio.bienvenida,
        timestamp: Date.now(),
      },
    ])
  }

  if (status === 'loading') return <LoadingScreen />
  if (status === 'not_found') return <ErrorScreen icon="🔍" title="Negocio no encontrado" message={`No existe el negocio "${rubro}/${slug}".\nVerificá el link que te dieron.`} />
  if (status === 'suspended') return <ErrorScreen icon="🔒" title="Cuenta suspendida" message="Este negocio no está disponible en este momento.\nContactá al administrador." />
  if (status === 'error') return <ErrorScreen icon="⚠️" title="Error de conexión" message="No pudimos cargar la información del negocio.\nVerificá tu conexión e intentá de nuevo." />

  return (
    <div
      className="app-container"
      style={{
        '--color-primary': negocio.color_primario,
        '--color-primary-dark': negocio.color_dark,
      }}
    >
      <ChatHeader negocio={negocio} onClearHistory={clearHistory} />
      <BusinessCard negocio={negocio} />
      <ChatMessages messages={messages} isTyping={isTyping} />
      <ChatInput onSend={sendMessage} disabled={inputDisabled} />
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="fullscreen-center">
      <div className="loading-spinner" />
      <p className="loading-text">Cargando...</p>
    </div>
  )
}

function ErrorScreen({ icon, title, message }) {
  return (
    <div className="fullscreen-center">
      <div className="error-icon">{icon}</div>
      <h2 className="error-title">{title}</h2>
      <p className="error-message">{message}</p>
    </div>
  )
}
```

- [ ] **Paso 2: Verificar que no hay errores de TypeScript/linting en dev**

```bash
cd padel-chat-pwa
npm run dev
```

Abrir `http://localhost:5173/padel/zona-norte` — debe mostrar loading (aún sin env vars)

- [ ] **Paso 3: Commit**

```bash
git add padel-chat-pwa/src/ChatApp.jsx
git commit -m "feat: refactor ChatApp to use React Router params and useNegocio hook"
```

---

## Task 5: BusinessCard component

**Files:**
- Crear: `padel-chat-pwa/src/components/BusinessCard.jsx`

- [ ] **Paso 1: Crear BusinessCard.jsx**

```jsx
export default function BusinessCard({ negocio }) {
  return (
    <div
      className="business-card"
      style={{
        background: `linear-gradient(135deg, ${negocio.color_primario}, ${negocio.color_dark})`,
      }}
    >
      <div className="business-card-label">Horarios de atención</div>
      <div className="business-card-hours">{negocio.horarios}</div>
      <div className="business-card-actions">
        <button className="business-card-btn" type="button">📞 Llamar</button>
        <button className="business-card-btn" type="button">📍 Ubicación</button>
      </div>
    </div>
  )
}
```

- [ ] **Paso 2: Commit**

```bash
git add padel-chat-pwa/src/components/BusinessCard.jsx
git commit -m "feat: add BusinessCard iOS component"
```

---

## Task 6: iOS CSS redesign

**Files:**
- Modificar: `padel-chat-pwa/src/ChatApp.css`

- [ ] **Paso 1: Actualizar las CSS variables para iOS**

En `padel-chat-pwa/src/ChatApp.css`, reemplazar el bloque `:root { ... }` y el bloque `@media (prefers-color-scheme: dark)`:

```css
:root {
  --color-primary: #333333;
  --color-primary-dark: #222222;
  --color-bg: #F2F2F7;
  --color-surface: #ffffff;
  --color-bot-bubble: #ffffff;
  --color-user-bubble: var(--color-primary);
  --color-text: #000000;
  --color-text-secondary: #8E8E93;
  --color-text-on-primary: #ffffff;
  --color-error: #FF3B30;
  --color-error-bg: #FFF2F1;
  --color-online: #34C759;
  --radius-bubble: 14px;
  --radius-input: 22px;
  --shadow-header: none;
  --shadow-input: none;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #1C1C1E;
    --color-surface: #2C2C2E;
    --color-bot-bubble: #2C2C2E;
    --color-text: #FFFFFF;
    --color-text-secondary: #8E8E93;
    --color-error-bg: #3A1010;
  }
}
```

- [ ] **Paso 2: Actualizar estilos del header a iOS nav bar**

Reemplazar el bloque `.chat-header { ... }` y todos sus sub-selectores (`.chat-header__left`, `.chat-header__logo`, `.chat-header__info`, `.chat-header__name`, `.chat-header__desc`, `.chat-header__actions`, `.btn-icon`):

```css
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(10px + var(--safe-top)) 14px 10px;
  background: rgba(242, 242, 247, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
  z-index: 10;
}

@media (prefers-color-scheme: dark) {
  .chat-header {
    background: rgba(28, 28, 30, 0.92);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
}

.chat-header__left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.chat-header__logo {
  font-size: 22px;
  line-height: 1;
  flex-shrink: 0;
}

.chat-header__info {
  min-width: 0;
}

.chat-header__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.3px;
}

.chat-header__status {
  font-size: 11px;
  color: var(--color-online);
  font-weight: 500;
}

.chat-header__actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 50%;
  cursor: pointer;
  font-size: 15px;
  color: var(--color-text-secondary);
  transition: background 0.15s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}

.btn-icon:hover { background: rgba(0, 0, 0, 0.1); }
.btn-icon:active { transform: scale(0.92); }

@media (prefers-color-scheme: dark) {
  .btn-icon { background: rgba(255, 255, 255, 0.1); }
  .btn-icon:hover { background: rgba(255, 255, 255, 0.16); }
}
```

- [ ] **Paso 3: Agregar estilos de BusinessCard después del bloque del header**

```css
/* ===========================
   Business Card
   =========================== */
.business-card {
  margin: 10px 10px 0;
  border-radius: 16px;
  padding: 14px 16px;
  color: #ffffff;
  flex-shrink: 0;
}

.business-card-label {
  font-size: 10px;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 3px;
  font-weight: 500;
}

.business-card-hours {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.2px;
}

.business-card-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.business-card-btn {
  background: rgba(255, 255, 255, 0.22);
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #ffffff;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, transform 0.1s;
}

.business-card-btn:active { transform: scale(0.96); }
```

- [ ] **Paso 4: Actualizar el input bar para iOS**

Reemplazar el bloque `.chat-input-wrapper { ... }` y `.chat-input { ... }`:

```css
.chat-input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 10px calc(8px + var(--safe-bottom));
  background: rgba(242, 242, 247, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
  z-index: 10;
  position: relative;
}

@media (prefers-color-scheme: dark) {
  .chat-input-wrapper {
    background: rgba(28, 28, 30, 0.92);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
}

.chat-input {
  flex: 1;
  min-height: 38px;
  max-height: 120px;
  padding: 8px 14px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: var(--radius-input);
  font-size: 15px;
  font-family: -apple-system, 'SF Pro Text', sans-serif;
  background: var(--color-surface);
  color: var(--color-text);
  resize: none;
  outline: none;
  line-height: 1.45;
  transition: border-color 0.15s;
  -webkit-appearance: none;
}

.chat-input:focus { border-color: var(--color-primary); }
.chat-input:disabled { opacity: 0.5; cursor: not-allowed; }
.chat-input::placeholder { color: var(--color-text-secondary); }
```

- [ ] **Paso 5: Actualizar bubble styles — esquina aguda iOS**

Reemplazar `.message-bubble--bot` y `.message-bubble--user`:

```css
.message-bubble--bot {
  background: var(--color-bot-bubble);
  color: var(--color-text);
  border-radius: var(--radius-bubble) var(--radius-bubble) var(--radius-bubble) 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.message-bubble--user {
  background: var(--color-user-bubble);
  color: var(--color-text-on-primary);
  border-radius: var(--radius-bubble) var(--radius-bubble) 4px var(--radius-bubble);
}
```

También actualizar `.message-bubble { padding: ... }`:

```css
.message-bubble {
  max-width: 82%;
  padding: 9px 13px;
  font-size: 15px;
  line-height: 1.45;
  word-break: break-word;
  white-space: pre-wrap;
}
```

- [ ] **Paso 6: Actualizar typing bubble para iOS**

Reemplazar `.typing-bubble { ... }`:

```css
.typing-bubble {
  background: var(--color-bot-bubble);
  border-radius: var(--radius-bubble) var(--radius-bubble) var(--radius-bubble) 4px;
  padding: 10px 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 5px;
}
```

- [ ] **Paso 7: Agregar fuente del sistema iOS al body**

Al principio del archivo, antes de `:root`, agregar:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Paso 8: Verificar visualmente**

Con dev server corriendo y env vars configuradas (ver Task 9 para eso), abrir `/padel/zona-norte` y verificar:
- Header translúcido con blur
- Business card con gradiente rojo
- Burbujas con esquinas asimétricas estilo iOS
- Input bar con fondo translúcido

- [ ] **Paso 9: Commit**

```bash
git add padel-chat-pwa/src/ChatApp.css
git commit -m "feat: iOS-style CSS redesign with business card styles"
```

---

## Task 7: Actualizar ChatHeader para iOS

**Files:**
- Modificar: `padel-chat-pwa/src/components/ChatHeader.jsx`

- [ ] **Paso 1: Reemplazar el contenido completo de ChatHeader.jsx**

```jsx
import React, { useState } from 'react'

export default function ChatHeader({ negocio, onClearHistory }) {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <>
      <header className="chat-header" role="banner">
        <div className="chat-header__left">
          <span className="chat-header__logo" aria-hidden="true">{negocio.logo_emoji}</span>
          <div className="chat-header__info">
            <div className="chat-header__name">{negocio.nombre}</div>
            <div className="chat-header__status">● En línea</div>
          </div>
        </div>
        <div className="chat-header__actions">
          <button
            className="btn-icon"
            onClick={() => setShowConfirm(true)}
            aria-label="Limpiar historial"
            title="Limpiar historial"
            type="button"
          >
            🗑️
          </button>
        </div>
      </header>

      {showConfirm && (
        <ConfirmDialog
          message="¿Borrar todo el historial de esta conversación?"
          onConfirm={() => { onClearHistory(); setShowConfirm(false) }}
          onCancel={() => setShowConfirm(false)}
          color={negocio.color_primario}
        />
      )}
    </>
  )
}

function ConfirmDialog({ message, onConfirm, onCancel, color }) {
  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true">
      <div className="confirm-box">
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-btn confirm-btn--cancel" onClick={onCancel} type="button">
            Cancelar
          </button>
          <button
            className="confirm-btn confirm-btn--confirm"
            style={{ background: color }}
            onClick={onConfirm}
            type="button"
          >
            Borrar
          </button>
        </div>
      </div>
      <style>{`
        .confirm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .confirm-box {
          background: var(--color-surface);
          border-radius: 16px;
          padding: 24px;
          width: 100%;
          max-width: 320px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }
        .confirm-message {
          font-size: 15px;
          color: var(--color-text);
          line-height: 1.5;
          margin-bottom: 20px;
          text-align: center;
        }
        .confirm-actions {
          display: flex;
          gap: 12px;
        }
        .confirm-btn {
          flex: 1;
          height: 44px;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .confirm-btn:active { opacity: 0.75; }
        .confirm-btn--cancel {
          background: rgba(0,0,0,0.08);
          color: var(--color-text);
        }
        .confirm-btn--confirm { color: white; }
      `}</style>
    </div>
  )
}
```

- [ ] **Paso 2: Correr los tests para confirmar que nada se rompió**

```bash
cd padel-chat-pwa
npm test
```

Expected: 6 tests en verde

- [ ] **Paso 3: Commit**

```bash
git add padel-chat-pwa/src/components/ChatHeader.jsx
git commit -m "feat: update ChatHeader to iOS nav bar style"
```

---

## Task 8: Configurar tabla negocios en Baserow (manual)

Esta tarea no tiene código — es configuración en la UI de Baserow.

- [ ] **Paso 1: Crear la tabla `negocios`**

1. Abrir Baserow → tu base de datos
2. Hacer click en "+" para agregar tabla nueva
3. Nombrarla `negocios`

- [ ] **Paso 2: Crear los campos de la tabla**

Agregar estos campos en orden:

| Nombre del campo | Tipo en Baserow |
|---|---|
| `nombre` | Text |
| `rubro` | Text |
| `slug` | Text |
| `color_primario` | Text |
| `color_dark` | Text |
| `logo_emoji` | Text |
| `descripcion` | Text |
| `horarios` | Text |
| `bienvenida` | Long text |
| `webhook_url` | URL |
| `activo` | Boolean |

- [ ] **Paso 3: Agregar los 4 registros de ejemplo**

Fila 1:
```
nombre:        Padel Zona Norte
rubro:         padel
slug:          zona-norte
color_primario: #FF6B6B
color_dark:    #cc5555
logo_emoji:    🎾
descripcion:   Reserva tus canches
horarios:      Lun–Dom · 08:00 – 23:00
bienvenida:    ¡Hola! Bienvenido a Padel Zona Norte 🎾\nEstamos disponibles de 08:00 a 23:00.\n¿En qué te puedo ayudar hoy?
webhook_url:   https://n8n.simplificia.com.ar/webhook/padel
activo:        ✓ (true)
```

Fila 2:
```
nombre:        Padel Zona Sur
rubro:         padel
slug:          zona-sur
color_primario: #4ECDC4
color_dark:    #3aada5
logo_emoji:    🏆
descripcion:   Las mejores canches del sur
horarios:      Lun–Dom · 09:00 – 22:00
bienvenida:    ¡Hola! Bienvenido a Padel Zona Sur 🏆\n¿Querés reservar una cancha o tenés alguna consulta?
webhook_url:   https://n8n.simplificia.com.ar/webhook/padel
activo:        ✓ (true)
```

Fila 3:
```
nombre:        Padel Centro
rubro:         padel
slug:          centro
color_primario: #45B7D1
color_dark:    #3498b8
logo_emoji:    ⚡
descripcion:   Centro de la ciudad
horarios:      Lun–Dom · 07:00 – 23:30
bienvenida:    ¡Hola! Bienvenido a Padel Centro ⚡\n¿En qué te puedo ayudar? Reservas, consultas de disponibilidad, precios...
webhook_url:   https://n8n.simplificia.com.ar/webhook/padel
activo:        ✓ (true)
```

Fila 4:
```
nombre:        Corte Urbano
rubro:         peluqueria
slug:          corte-urbano
color_primario: #A855F7
color_dark:    #9333ea
logo_emoji:    ✂️
descripcion:   Turnos online
horarios:      Lun–Sáb · 09:00 – 20:00
bienvenida:    ¡Hola! Bienvenido a Corte Urbano ✂️\nAgendá tu turno fácil y rápido.\n¿Para cuándo querés el turno?
webhook_url:   https://n8n.simplificia.com.ar/webhook/peluqueria
activo:        ✓ (true)
```

- [ ] **Paso 4: Obtener el Table ID**

En Baserow, abrir la tabla `negocios` → copiar el número de la URL:
`https://app.baserow.io/database/.../table/ESTE_NÚMERO/`

Guardarlo para las env vars del siguiente task.

- [ ] **Paso 5: Crear un token de API read-only**

1. En Baserow → Settings → API tokens
2. Crear nuevo token llamado "simplificia-pwa-read"
3. Darle permiso "Read" únicamente sobre la tabla `negocios`
4. Copiar el token generado

---

## Task 9: Variables de entorno + smoke test

- [ ] **Paso 1: Crear archivo .env.local para desarrollo**

Crear `padel-chat-pwa/.env.local` (no se commitea, está en .gitignore):

```
VITE_BASEROW_API_URL=https://api.baserow.io
VITE_BASEROW_TOKEN=tu-token-aqui
VITE_BASEROW_TABLE_ID=tu-table-id-aqui
```

- [ ] **Paso 2: Confirmar que .env.local está en .gitignore**

```bash
cat padel-chat-pwa/.gitignore | grep env
```

Si no está, agregar `.env.local` al `.gitignore`.

- [ ] **Paso 3: Smoke test local de las 4 rutas**

Reiniciar el dev server y verificar cada ruta:

```bash
cd padel-chat-pwa && npm run dev
```

| URL | Resultado esperado |
|---|---|
| `http://localhost:5173/` | HomeScreen con "Simplificia" |
| `http://localhost:5173/padel/zona-norte` | Chat rojo 🎾, card con 08:00–23:00 |
| `http://localhost:5173/padel/zona-sur` | Chat celeste 🏆, card con 09:00–22:00 |
| `http://localhost:5173/padel/centro` | Chat azul ⚡, card con 07:00–23:30 |
| `http://localhost:5173/peluqueria/corte-urbano` | Chat violeta ✂️, card con 09:00–20:00 |
| `http://localhost:5173/padel/no-existe` | Pantalla "Negocio no encontrado" |

- [ ] **Paso 4: Configurar variables de entorno en Vercel**

1. Abrir el proyecto en vercel.com → Settings → Environment Variables
2. Agregar:
   - `VITE_BASEROW_API_URL` = `https://api.baserow.io`
   - `VITE_BASEROW_TOKEN` = el token read-only
   - `VITE_BASEROW_TABLE_ID` = el table ID

- [ ] **Paso 5: Deploy en Vercel**

```bash
cd padel-chat-pwa
npm run build
```

Expected: build sin errores en `dist/`

Hacer push al repositorio conectado a Vercel (o `vercel --prod` si tenés la CLI).

- [ ] **Paso 6: Smoke test en producción**

Verificar las mismas 6 rutas en el dominio de Vercel.

- [ ] **Paso 7: Commit final**

```bash
git add padel-chat-pwa/.gitignore
git commit -m "chore: add .env.local to gitignore"
```

---

## Self-Review

**Spec coverage:**
- ✅ Rutas `/:rubro/:slug` con React Router → Tasks 1, 3, 4
- ✅ Datos cargados desde Baserow → Tasks 2, 4
- ✅ Tabla `negocios` diseñada → Task 8
- ✅ UI iOS estilo C → Tasks 5, 6, 7
- ✅ Peluquería como ejemplo → Task 8 (fila 4)
- ✅ vercel.json → Task 1
- ✅ 1 webhook por rubro → reflejado en `webhook_url` de la tabla
- ✅ Estados de error (not_found, suspended, error) → Task 4

**Placeholder scan:** ningún TBD, todos los pasos tienen código completo.

**Type consistency:**
- `negocio.logo_emoji` — definido en spec, usado en ChatHeader (Task 7) y applyTheme (Task 4) ✅
- `negocio.color_primario` — definido en spec, usado en BusinessCard (Task 5), CSS vars (Task 4) ✅
- `negocio.webhook_url` — definido en spec, usado en sendMessage (Task 4) ✅
- `useNegocio` devuelve `{ negocio, status }` — consumido correctamente en ChatApp (Task 4) ✅
