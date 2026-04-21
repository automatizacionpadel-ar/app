import React, { useState, useEffect, useRef, useCallback } from 'react'
import ChatHeader from './components/ChatHeader.jsx'
import ChatMessages from './components/ChatMessages.jsx'
import ChatInput from './components/ChatInput.jsx'

const COMPLEXES = {
  zona_norte: {
    id: 'zona_norte',
    nombre: 'Padel Zona Norte',
    color: '#FF6B6B',
    colorDark: '#cc5555',
    logo: '🎾',
    descripcion: 'Reserva tus canches',
    horarios: '08:00 - 23:00',
    bienvenida: '¡Hola! Bienvenido a Padel Zona Norte 🎾\nEstamos disponibles de 08:00 a 23:00.\n¿En qué te puedo ayudar hoy? Podés consultar disponibilidad, reservar una cancha o hacer cualquier pregunta.',
  },
  zona_sur: {
    id: 'zona_sur',
    nombre: 'Padel Zona Sur',
    color: '#4ECDC4',
    colorDark: '#3aada5',
    logo: '🏆',
    descripcion: 'Las mejores canches del sur',
    horarios: '09:00 - 22:00',
    bienvenida: '¡Hola! Bienvenido a Padel Zona Sur 🏆\nEstamos disponibles de 09:00 a 22:00.\n¿Querés reservar una cancha o tenés alguna consulta?',
  },
  centro: {
    id: 'centro',
    nombre: 'Padel Centro',
    color: '#45B7D1',
    colorDark: '#3498b8',
    logo: '⚡',
    descripcion: 'Centro de la ciudad',
    horarios: '07:00 - 23:30',
    bienvenida: '¡Hola! Bienvenido a Padel Centro ⚡\nEstamos disponibles de 07:00 a 23:30.\n¿En qué te puedo ayudar? Reservas, consultas de disponibilidad, precios...',
  },
}

const WEBHOOK_URL = 'https://n8n.simplificia.com.ar/webhook/chat'

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getStorageKey(complexId) {
  return `chat_${complexId}`
}

function loadMessages(complexId) {
  try {
    const raw = localStorage.getItem(getStorageKey(complexId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveMessages(complexId, messages) {
  try {
    localStorage.setItem(getStorageKey(complexId), JSON.stringify(messages))
  } catch (e) {
    console.error('[Storage] Error al guardar:', e)
  }
}

function getOrCreateConversationId(complexId) {
  const key = `conv_${complexId}`
  let id = localStorage.getItem(key)
  if (!id) {
    id = generateId()
    localStorage.setItem(key, id)
  }
  return id
}

export default function ChatApp() {
  const [complexId, setComplexId] = useState(null)
  const [complex, setComplex] = useState(null)
  const [error, setError] = useState(null)
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [inputDisabled, setInputDisabled] = useState(false)
  const conversationIdRef = useRef(null)

  // Inicialización: leer complex_id de la URL y configurar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('complex_id')

    if (!id) {
      setError('no_param')
      return
    }

    const data = COMPLEXES[id]
    if (!data) {
      setError('not_found')
      setComplexId(id)
      return
    }

    setComplexId(id)
    setComplex(data)
    conversationIdRef.current = getOrCreateConversationId(id)

    // Cargar historial o mostrar bienvenida
    const saved = loadMessages(id)
    if (saved && saved.length > 0) {
      setMessages(saved)
    } else {
      const welcome = {
        id: generateId(),
        role: 'bot',
        text: data.bienvenida,
        timestamp: Date.now(),
      }
      setMessages([welcome])
    }

    // Aplicar tema al documento
    applyTheme(data)
  }, [])

  // Guardar mensajes cada vez que cambian
  useEffect(() => {
    if (complexId && messages.length > 0) {
      saveMessages(complexId, messages)
    }
  }, [messages, complexId])

  function applyTheme(data) {
    document.title = data.nombre
    document.documentElement.style.setProperty('--color-primary', data.color)
    document.documentElement.style.setProperty('--color-primary-dark', data.colorDark)

    // theme-color meta
    const themeMeta = document.getElementById('theme-color-meta')
    if (themeMeta) themeMeta.setAttribute('content', data.color)

    // apple title
    const appleTitle = document.getElementById('apple-title')
    if (appleTitle) appleTitle.setAttribute('content', data.nombre)

    // manifest
    const manifestLink = document.getElementById('manifest-link')
    if (manifestLink) manifestLink.setAttribute('href', `/manifests/manifest_${data.id}.json`)

    // apple icon
    const appleIcon = document.getElementById('apple-icon')
    if (appleIcon) appleIcon.setAttribute('href', `/favicons/favicon_${data.id}_192.png`)
  }

  const sendMessage = useCallback(
    async (payload) => {
      // payload: { type, text, mediaData?, mimeType?, fileName? }
      if (inputDisabled || !complex) return
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
        const res = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: payload.text || '',
            complexId: complex.id,
            conversationId: conversationIdRef.current,
            type: payload.type,
            ...(payload.mediaData && { mediaData: payload.mediaData }),
            ...(payload.mimeType && { mimeType: payload.mimeType }),
            ...(payload.fileName && { fileName: payload.fileName }),
          }),
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = await res.json()
        const botText = data.botResponse || data.response || data.message || 'Lo siento, no pude procesar tu mensaje.'

        const newMsgs = [{ id: generateId(), role: 'bot', text: botText, timestamp: Date.now() }]

        if (data.botImages && data.botImages.length > 0) {
          data.botImages.forEach((img) => {
            newMsgs.push({ id: generateId(), role: 'bot', type: 'image', mediaData: img, text: '', timestamp: Date.now() })
          })
        }

        setMessages((prev) => [...prev, ...newMsgs])
      } catch (e) {
        console.error('[Chat] Error al enviar:', e)
        const errMsg = {
          id: generateId(),
          role: 'error',
          text: 'No pude conectarme al servidor. Por favor, intentá de nuevo.',
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, errMsg])
      } finally {
        setIsTyping(false)
        setInputDisabled(false)
      }
    },
    [complex, inputDisabled]
  )

  function clearHistory() {
    if (!complexId) return
    localStorage.removeItem(getStorageKey(complexId))
    // Generar nuevo conversation ID
    localStorage.removeItem(`conv_${complexId}`)
    conversationIdRef.current = getOrCreateConversationId(complexId)
    const welcome = {
      id: generateId(),
      role: 'bot',
      text: complex.bienvenida,
      timestamp: Date.now(),
    }
    setMessages([welcome])
  }

  if (error === 'no_param') {
    return <ErrorScreen title="¿Cuál es tu complejo?" message="Accedé a la app con el link de tu complejo de pádel.\nEjemplo: /?complex_id=zona_norte" />
  }

  if (error === 'not_found') {
    return <ErrorScreen title="Complejo no encontrado" message={`No existe el complejo "${complexId}".\nVerificá el link que te dieron.`} />
  }

  if (!complex) {
    return <LoadingScreen />
  }

  return (
    <div className="app-container" style={{ '--color-primary': complex.color, '--color-primary-dark': complex.colorDark }}>
      <ChatHeader complex={complex} onClearHistory={clearHistory} />
      <ChatMessages messages={messages} isTyping={isTyping} complex={complex} />
      <ChatInput onSend={sendMessage} disabled={inputDisabled} color={complex.color} />
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

function ErrorScreen({ title, message }) {
  return (
    <div className="fullscreen-center">
      <div className="error-icon">🎾</div>
      <h2 className="error-title">{title}</h2>
      <p className="error-message">{message}</p>
    </div>
  )
}
