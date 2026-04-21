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
