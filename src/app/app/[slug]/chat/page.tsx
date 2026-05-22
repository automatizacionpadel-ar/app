// src/app/app/[slug]/chat/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Send, Loader2, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import CalendarioTurnos from '@/components/chat/CalendarioTurnos'

interface Mensaje {
  id:        string
  role:      'user' | 'assistant' | 'calendar'
  content:   string
  timestamp: Date
}

function BurbujaMensaje({ mensaje }: { mensaje: Mensaje }) {
  const esUsuario = mensaje.role === 'user'
  return (
    <div className={`flex ${esUsuario ? 'justify-end' : 'justify-start'} mb-3`}>
      {!esUsuario && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1"
          style={{ background: 'rgba(122,182,25,0.15)' }}>
          <span style={{ color: '#7AB619', fontSize: '12px' }}>IA</span>
        </div>
      )}
      <div className="max-w-[78%]">
        <div className="rounded-2xl px-4 py-2.5"
          style={{
            background:   esUsuario ? '#7AB619' : '#2A2A29',
            color:        esUsuario ? '#20201F' : '#F0F0EE',
            borderRadius: esUsuario ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          }}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{mensaje.content}</p>
        </div>
        <p className="text-[10px] mt-1 px-1"
          style={{ color: '#5C5C59', textAlign: esUsuario ? 'right' : 'left' }}>
          {format(mensaje.timestamp, 'HH:mm', { locale: es })}
        </p>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2"
        style={{ background: 'rgba(122,182,25,0.15)' }}>
        <span style={{ color: '#7AB619', fontSize: '12px' }}>IA</span>
      </div>
      <div className="rounded-2xl px-4 py-3"
        style={{ background: '#2A2A29', borderRadius: '18px 18px 18px 4px' }}>
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ background: '#7AB619', animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ChatPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const router   = useRouter()

  const [medicoId, setMedicoId]   = useState<string | null>(null)
  const [mensajes, setMensajes]   = useState<Mensaje[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [chatId]                  = useState(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('simplificia_chat_id') || crypto.randomUUID()
  })
  const [confirmedCalendarIds, setConfirmedCalendarIds] = useState<Set<string>>(new Set())

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, loading])

  useEffect(() => {
    fetch(`/api/medicos/publico?slug=${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.id) {
          setMedicoId(data.id)
          setMensajes([{
            id:        'welcome',
            role:      'assistant',
            content:   '¡Hola! Soy el asistente del consultorio. ¿En qué puedo ayudarte hoy?',
            timestamp: new Date(),
          }])
        }
      })
      .catch(console.error)
  }, [slug])

  async function enviarMensaje() {
    if (!input.trim() || loading || !medicoId) return

    const textoUsuario = input.trim()
    setInput('')

    const msgUsuario: Mensaje = {
      id:        crypto.randomUUID(),
      role:      'user',
      content:   textoUsuario,
      timestamp: new Date(),
    }

    setMensajes(prev => [...prev, msgUsuario])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medico_id: medicoId, chat_id: chatId, message: textoUsuario }),
      })
      const data = await res.json()
      if (data.action === 'show_calendar') {
        setMensajes(prev => [...prev, {
          id:        crypto.randomUUID(),
          role:      'calendar',
          content:   data.response || '¡Elegí una fecha disponible!',
          timestamp: new Date(),
        }])
      } else {
        setMensajes(prev => [...prev, {
          id:        crypto.randomUUID(),
          role:      'assistant',
          content:   data.response || 'Lo siento, no pude procesar tu mensaje.',
          timestamp: new Date(),
        }])
      }
    } catch {
      setMensajes(prev => [...prev, {
        id:        crypto.randomUUID(),
        role:      'assistant',
        content:   'Hubo un error de conexión. Por favor intentá de nuevo.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviarMensaje()
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  return (
    <div className="flex flex-col h-screen">

      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ background: '#2A2A29', borderBottom: '1px solid #3D3D3B' }}>
        <button onClick={() => router.back()} className="rounded-lg p-1.5" style={{ color: '#5C5C59' }}>
          <ArrowLeft size={18} />
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(122,182,25,0.15)' }}>
          <span style={{ color: '#7AB619', fontSize: '14px', fontWeight: 600 }}>IA</span>
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>Asistente</p>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#7AB619' }} />
            <p className="text-xs" style={{ color: '#7AB619' }}>En línea</p>
          </div>
        </div>
        <div className="ml-auto">
          <Image src="/logo.png" alt="SimplificIA" width={90} height={24} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
        {mensajes.map(msg => (
          <div key={msg.id}>
            <BurbujaMensaje mensaje={msg} />
            {msg.role === 'calendar' && medicoId && !confirmedCalendarIds.has(msg.id) && (
              <CalendarioTurnos
                medicoId={medicoId}
                onConfirmed={(label) => {
                  setConfirmedCalendarIds(prev => {
                    const next = new Set(prev)
                    next.add(msg.id)
                    return next
                  })
                  setMensajes(prev => [...prev, {
                    id:        crypto.randomUUID(),
                    role:      'assistant',
                    content:   `✓ Turno confirmado: ${label}. ¡Te esperamos!`,
                    timestamp: new Date(),
                  }])
                }}
              />
            )}
          </div>
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 px-4 pb-safe-bottom pb-4 pt-2"
        style={{ background: '#20201F', borderTop: '1px solid #2A2A29' }}>
        <div className="flex items-end gap-2 rounded-2xl px-4 py-2"
          style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribí tu mensaje..."
            rows={1}
            disabled={loading}
            className="flex-1 bg-transparent text-sm resize-none outline-none scrollbar-hide"
            style={{ color: '#F0F0EE', maxHeight: '120px', lineHeight: '1.5', paddingTop: '6px', paddingBottom: '6px' }}
          />
          <button
            onClick={enviarMensaje}
            disabled={loading || !input.trim()}
            className="rounded-xl p-2.5 flex-shrink-0 transition-all active:scale-90 disabled:opacity-40"
            style={{ background: '#7AB619', color: '#20201F', marginBottom: '2px' }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="text-center text-[10px] mt-2" style={{ color: '#3D3D3B' }}>
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  )
}
