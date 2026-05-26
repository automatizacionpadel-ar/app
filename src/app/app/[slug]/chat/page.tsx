'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2, ArrowLeft, ImagePlus, X, Bell, Settings } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import CalendarioTurnos from '@/components/chat/CalendarioTurnos'
import { usePushNotifications } from '@/hooks/usePushNotifications'

interface Mensaje {
  id:          string
  role:        'user' | 'assistant' | 'calendar'
  content:     string
  imageUrl?:   string
  clienteId?: string   // snapshot al momento de mostrar el calendario
  timestamp:   Date
}

function AvatarBot({ logoUrl, color }: { logoUrl: string | null; color: string }) {
  return (
    <div className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden"
      style={{ background: `${color}26` }}>
      {logoUrl
        ? <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center">
            <span style={{ color, fontSize: '12px' }}>IA</span>
          </div>
      }
    </div>
  )
}

function BurbujaMensaje({ mensaje, logoUrl, color }: { mensaje: Mensaje; logoUrl: string | null; color: string }) {
  const esUsuario = mensaje.role === 'user'
  return (
    <div className={`flex ${esUsuario ? 'justify-end' : 'justify-start'} mb-3`}>
      {!esUsuario && (
        <div className="mr-2 mt-1">
          <AvatarBot logoUrl={logoUrl} color={color} />
        </div>
      )}
      <div className="max-w-[78%]">
        <div className="rounded-2xl px-4 py-2.5"
          style={{
            background:   esUsuario ? color : '#2A2A29',
            color:        esUsuario ? '#fff' : '#F0F0EE',
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

function TypingIndicator({ logoUrl, color }: { logoUrl: string | null; color: string }) {
  return (
    <div className="flex justify-start mb-3">
      <div className="mr-2">
        <AvatarBot logoUrl={logoUrl} color={color} />
      </div>
      <div className="rounded-2xl px-4 py-3"
        style={{ background: '#2A2A29', borderRadius: '18px 18px 18px 4px' }}>
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ background: color, animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    </div>
  )
}


export default function ChatPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const router   = useRouter()

  const [chatId] = useState(() => {
    if (typeof window === 'undefined') return ''
    const stored = localStorage.getItem('simplificia_chat_id')
    if (stored) return stored
    const newId = crypto.randomUUID()
    localStorage.setItem('simplificia_chat_id', newId)
    return newId
  })

  const [negocioId,  setNegocioId]  = useState<string | null>(null)
  const [logoUrl,    setLogoUrl]    = useState<string | null>(null)
  const [colorMarca, setColorMarca] = useState('#7AB619')
  const [clienteId,  setClienteId]  = useState<string | null>(null)
  const [mensajes,    setMensajes]    = useState<Mensaje[]>([])
  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [imagenPrevia, setImagenPrevia] = useState<{ file: File; preview: string } | null>(null)
  const [uploadingImg, setUploadingImg] = useState(false)

  const { estado: pushEstado, solicitarPermiso } = usePushNotifications(clienteId, negocioId, chatId)
  const [confirmedCalendarIds, setConfirmedCalendarIds] = useState<Set<string>>(new Set())
  const [settingsOpen, setSettingsOpen] = useState(false)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const fileRef    = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, loading])

  // Auto-focus: al cargar el negocio y después de cada respuesta
  useEffect(() => {
    if (negocioId && !loading && !uploadingImg) inputRef.current?.focus()
  }, [negocioId, loading, uploadingImg])

  // Preload clienteId from chat_sessions on mount
  useEffect(() => {
    if (!chatId) return
    fetch(`/api/sesion/cliente?chat_id=${chatId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.cliente_id) setClienteId(d.cliente_id) })
      .catch(() => {})
  }, [chatId])

  useEffect(() => {
    fetch(`/api/negocios/publico?slug=${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.id) {
          setNegocioId(data.id)
          setLogoUrl(data.logo_url ?? null)
          setColorMarca(data.color_marca ?? '#7AB619')
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
    if ((!input.trim() && !imagenPrevia) || loading || !negocioId) return

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
        body: JSON.stringify({ negocio_id: negocioId, chat_id: chatId, message: textoUsuario, image_url: imageUrl }),
      })
      const data = await res.json()
      if (data.cliente_id) setClienteId(data.cliente_id)
      if (data.action === 'show_calendar') {
        // Congela el clienteId al momento de mostrar el calendario:
        // usa el que viene en la respuesta o el que ya estaba en el estado.
        const pidSnapshot = data.cliente_id || clienteId || undefined
        setMensajes(prev => [...prev, {
          id:          crypto.randomUUID(),
          role:        'calendar',
          content:     data.response || '¡Elegí una fecha disponible!',
          clienteId:   pidSnapshot,
          timestamp:   new Date(),
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
      <div className="flex-shrink-0" style={{ background: '#2A2A29', borderBottom: '1px solid #3D3D3B' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="rounded-lg p-1.5" style={{ color: '#5C5C59' }}>
            <ArrowLeft size={18} />
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
            style={{ background: `${colorMarca}26` }}>
            {logoUrl
              ? <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center">
                  <span style={{ color: colorMarca, fontSize: '14px', fontWeight: 600 }}>IA</span>
                </div>
            }
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>Asistente</p>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: colorMarca }} />
              <p className="text-xs" style={{ color: colorMarca }}>En línea</p>
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(o => !o)}
            className="ml-auto rounded-lg p-1.5 transition-colors"
            style={{ color: settingsOpen ? colorMarca : '#5C5C59' }}>
            <Settings size={20} />
          </button>
        </div>

        {/* Settings panel */}
        {settingsOpen && (
          <div className="px-4 pb-3" style={{ borderTop: '1px solid #3D3D3B' }}>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2.5">
                <Bell size={16} style={{ color: '#9A9A96' }} />
                <div>
                  <p className="text-sm" style={{ color: '#F0F0EE' }}>Notificaciones</p>
                  <p className="text-xs" style={{ color: '#5C5C59' }}>
                    {pushEstado === 'granted'  ? 'Notificaciones activadas'  :
                     pushEstado === 'denied'   ? 'Bloqueadas en el navegador' :
                     pushEstado === 'unsupported' ? 'No disponible en este dispositivo' :
                     'Recibí alertas de tus turnos'}
                  </p>
                </div>
              </div>

              {/* Toggle */}
              {pushEstado !== 'unsupported' && pushEstado !== 'denied' && (
                <button
                  onClick={pushEstado !== 'granted' ? solicitarPermiso : undefined}
                  disabled={pushEstado === 'loading'}
                  className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 disabled:opacity-60"
                  style={{ background: pushEstado === 'granted' ? colorMarca : '#3D3D3B' }}>
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                    style={{ transform: pushEstado === 'granted' ? 'translateX(20px)' : 'translateX(0)' }}
                  />
                </button>
              )}

              {pushEstado === 'denied' && (
                <p className="text-xs" style={{ color: '#EF4444' }}>Bloqueadas</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
        {mensajes.map(msg => (
          <div key={msg.id}>
            <BurbujaMensaje mensaje={msg} logoUrl={logoUrl} color={colorMarca} />
            {msg.role === 'calendar' && negocioId && !confirmedCalendarIds.has(msg.id) && (
              <CalendarioTurnos
                negocioId={negocioId}
                chatId={chatId}
                clienteId={msg.clienteId ?? clienteId}
                onConfirmed={(label) => {
                  setConfirmedCalendarIds(prev => {
                    const next = new Set(prev)
                    next.add(msg.id)
                    return next
                  })
                  setMensajes(prev => [...prev, {
                    id:        crypto.randomUUID(),
                    role:      'assistant',
                    content:   `✓ Turno confirmado: ${label}. ¡Te esperamos! Podés activar los recordatorios desde el ⚙️ arriba.`,
                    timestamp: new Date(),
                  }])
                }}
              />
            )}
          </div>
        ))}
        {enviando && <TypingIndicator logoUrl={logoUrl} color={colorMarca} />}
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
            style={{ background: colorMarca, color: '#fff', marginBottom: '2px' }}>
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
