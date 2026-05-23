'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Send, Loader2, ArrowLeft, ImagePlus, X, Bell, BellOff, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import CalendarioTurnos from '@/components/chat/CalendarioTurnos'
import { usePushNotifications } from '@/hooks/usePushNotifications'

interface Mensaje {
  id:        string
  role:      'user' | 'assistant' | 'calendar' | 'push-prompt'
  content:   string
  imageUrl?: string
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
          {mensaje.imageUrl && (
            <img
              src={mensaje.imageUrl}
              alt="Imagen adjunta"
              className="rounded-lg mb-2 max-w-full"
              style={{ maxHeight: '200px', objectFit: 'contain' }}
            />
          )}
          {mensaje.content && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{mensaje.content}</p>
          )}
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

function PushPromptWidget({
  estado, onActivar,
}: {
  estado:   ReturnType<typeof usePushNotifications>['estado']
  onActivar: () => void
}) {
  if (estado === 'granted') {
    return (
      <div className="flex justify-start mb-3">
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1"
          style={{ background: 'rgba(122,182,25,0.15)' }}>
          <span style={{ color: '#7AB619', fontSize: '12px' }}>IA</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5"
          style={{ background: 'rgba(122,182,25,0.12)', border: '1px solid rgba(122,182,25,0.25)' }}>
          <CheckCircle size={15} style={{ color: '#7AB619', flexShrink: 0 }} />
          <p className="text-sm" style={{ color: '#7AB619' }}>Notificaciones activadas ✓</p>
        </div>
      </div>
    )
  }

  if (estado === 'denied') {
    return (
      <div className="flex justify-start mb-3">
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1"
          style={{ background: 'rgba(122,182,25,0.15)' }}>
          <span style={{ color: '#7AB619', fontSize: '12px' }}>IA</span>
        </div>
        <div className="rounded-2xl px-4 py-3 max-w-[78%]"
          style={{ background: '#2A2A29', borderRadius: '18px 18px 18px 4px' }}>
          <div className="flex items-center gap-2 mb-1">
            <BellOff size={14} style={{ color: '#EF4444' }} />
            <p className="text-sm font-medium" style={{ color: '#EF4444' }}>Notificaciones bloqueadas</p>
          </div>
          <p className="text-xs" style={{ color: '#5C5C59' }}>
            Habilitá las notificaciones en la configuración de tu navegador para recibir recordatorios.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-3">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1"
        style={{ background: 'rgba(122,182,25,0.15)' }}>
        <span style={{ color: '#7AB619', fontSize: '12px' }}>IA</span>
      </div>
      <div className="rounded-2xl px-4 py-3 max-w-[80%]"
        style={{ background: '#2A2A29', borderRadius: '18px 18px 18px 4px' }}>
        <p className="text-sm mb-2.5" style={{ color: '#F0F0EE' }}>
          🔔 ¡Activá las notificaciones para recibir el recordatorio de tu turno!
        </p>
        <button
          onClick={onActivar}
          disabled={estado === 'loading'}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all active:scale-95 disabled:opacity-60"
          style={{ background: '#7AB619', color: '#20201F' }}>
          {estado === 'loading'
            ? <><Loader2 size={14} className="animate-spin" /> Activando...</>
            : <><Bell size={14} /> Activar recordatorios</>
          }
        </button>
      </div>
    </div>
  )
}

export default function ChatPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const router   = useRouter()

  const [medicoId,    setMedicoId]    = useState<string | null>(null)
  const [pacienteId,  setPacienteId]  = useState<string | null>(null)
  const [mensajes,    setMensajes]    = useState<Mensaje[]>([])
  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [imagenPrevia, setImagenPrevia] = useState<{ file: File; preview: string } | null>(null)
  const [uploadingImg, setUploadingImg] = useState(false)

  const { estado: pushEstado, solicitarPermiso } = usePushNotifications(pacienteId, medicoId)

  const [chatId] = useState(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('simplificia_chat_id') || crypto.randomUUID()
  })
  const [confirmedCalendarIds, setConfirmedCalendarIds] = useState<Set<string>>(new Set())

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const fileRef    = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, loading])

  // Auto-focus cuando carga el médico
  useEffect(() => {
    if (medicoId) inputRef.current?.focus()
  }, [medicoId])

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

  function seleccionarImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setImagenPrevia({ file, preview })
    // Resetear input para poder seleccionar la misma imagen de nuevo
    e.target.value = ''
    inputRef.current?.focus()
  }

  function quitarImagen() {
    if (imagenPrevia) URL.revokeObjectURL(imagenPrevia.preview)
    setImagenPrevia(null)
  }

  async function enviarMensaje() {
    if ((!input.trim() && !imagenPrevia) || loading || !medicoId) return

    const textoUsuario = input.trim()
    setInput('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }

    let imageUrl: string | undefined

    // Subir imagen si hay una seleccionada
    if (imagenPrevia) {
      setUploadingImg(true)
      try {
        const fd = new FormData()
        fd.append('imagen', imagenPrevia.file)
        const res = await fetch('/api/chat/imagen', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.url) imageUrl = data.url
      } catch {}
      setUploadingImg(false)
      URL.revokeObjectURL(imagenPrevia.preview)
      setImagenPrevia(null)
    }

    const msgUsuario: Mensaje = {
      id:        crypto.randomUUID(),
      role:      'user',
      content:   textoUsuario,
      imageUrl,
      timestamp: new Date(),
    }

    setMensajes(prev => [...prev, msgUsuario])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medico_id: medicoId, chat_id: chatId, message: textoUsuario, image_url: imageUrl }),
      })
      const data = await res.json()
      if (data.paciente_id) setPacienteId(data.paciente_id)
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

  const enviando = loading || uploadingImg

  return (
    <div className="flex flex-col h-screen">

      {/* Header */}
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
          <Image src="/logo.png" alt="SimplificIA" width={113} height={30} style={{ mixBlendMode: 'screen' }} />
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
        {mensajes.map(msg => (
          <div key={msg.id}>
            {msg.role === 'push-prompt'
              ? <PushPromptWidget estado={pushEstado} onActivar={solicitarPermiso} />
              : <BurbujaMensaje mensaje={msg} />
            }
            {msg.role === 'calendar' && medicoId && !confirmedCalendarIds.has(msg.id) && (
              <CalendarioTurnos
                medicoId={medicoId}
                pacienteId={pacienteId}
                onConfirmed={(label) => {
                  setConfirmedCalendarIds(prev => {
                    const next = new Set(prev)
                    next.add(msg.id)
                    return next
                  })
                  setMensajes(prev => {
                    const confirmMsg: Mensaje = {
                      id:        crypto.randomUUID(),
                      role:      'assistant',
                      content:   `✓ Turno confirmado: ${label}. ¡Te esperamos!`,
                      timestamp: new Date(),
                    }
                    const msgs = [...prev, confirmMsg]
                    if (pushEstado !== 'granted') {
                      msgs.push({
                        id:        crypto.randomUUID(),
                        role:      'push-prompt',
                        content:   '',
                        timestamp: new Date(),
                      })
                    }
                    return msgs
                  })
                }}
              />
            )}
          </div>
        ))}
        {enviando && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-safe-bottom pb-4 pt-2"
        style={{ background: '#20201F', borderTop: '1px solid #2A2A29' }}>

        {/* Preview de imagen */}
        {imagenPrevia && (
          <div className="mb-2 relative inline-block">
            <img
              src={imagenPrevia.preview}
              alt="Preview"
              className="rounded-xl"
              style={{ height: '72px', width: 'auto', maxWidth: '120px', objectFit: 'cover' }}
            />
            <button
              onClick={quitarImagen}
              className="absolute -top-1.5 -right-1.5 rounded-full p-0.5"
              style={{ background: '#EF4444', color: '#fff' }}>
              <X size={11} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl px-3 py-2 border border-[#3D3D3B] focus-within:border-[#7AB619] transition-colors duration-150"
          style={{ background: '#2A2A29' }}>

          {/* Botón imagen */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={enviando}
            className="flex-shrink-0 rounded-lg p-1.5 transition-colors disabled:opacity-40"
            style={{ color: '#5C5C59', marginBottom: '2px' }}
            onMouseEnter={e => { if (!enviando) e.currentTarget.style.color = '#7AB619' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#5C5C59' }}>
            <ImagePlus size={18} />
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={seleccionarImagen}
          />

          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribí tu mensaje..."
            rows={1}
            disabled={enviando}
            className="flex-1 bg-transparent text-sm resize-none outline-none scrollbar-hide"
            style={{ color: '#F0F0EE', maxHeight: '120px', lineHeight: '1.5', paddingTop: '6px', paddingBottom: '6px' }}
          />

          <button
            onClick={enviarMensaje}
            disabled={enviando || (!input.trim() && !imagenPrevia)}
            className="rounded-xl p-2.5 flex-shrink-0 transition-all active:scale-90 disabled:opacity-40"
            style={{ background: '#7AB619', color: '#20201F', marginBottom: '2px' }}>
            {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>

        <p className="text-center text-[10px] mt-2" style={{ color: '#3D3D3B' }}>
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  )
}
