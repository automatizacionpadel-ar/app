// src/app/dashboard/mensajeria/MensajeriaCliente.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Search, User } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { es } from 'date-fns/locale'

interface Mensaje {
  id:         string
  chat_id:    string
  role:       'user' | 'assistant'
  content:    string
  image_url:  string | null
  created_at: string
  cliente_id: string | null
}

interface Conversacion {
  chat_id:    string
  content:    string
  role:       'user' | 'assistant'
  created_at: string
  cliente_id: string | null
  clientes:   { id: string; nombre: string; apellido: string | null; celular: string | null } | null
}

function formatHora(iso: string) {
  const d = new Date(iso)
  if (isToday(d))     return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Ayer'
  return format(d, 'd MMM', { locale: es })
}

function nombreCliente(c: Conversacion['clientes']) {
  if (!c) return 'Desconocido'
  return [c.nombre, c.apellido].filter(Boolean).join(' ')
}

function iniciales(c: Conversacion['clientes']) {
  if (!c) return '?'
  const n = c.nombre?.[0] ?? ''
  const a = c.apellido?.[0] ?? ''
  return (n + a).toUpperCase() || '?'
}

export default function MensajeriaCliente({
  negocioId,
  conversaciones: inicial,
}: {
  negocioId:      string
  conversaciones: Conversacion[]
}) {
  const [convs,    setConvs]    = useState<Conversacion[]>(inicial)
  const [selected, setSelected] = useState<string | null>(inicial[0]?.chat_id ?? null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [loading,  setLoading]  = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const filtradas = convs.filter(c => {
    const nombre = nombreCliente(c.clientes).toLowerCase()
    const cel    = c.clientes?.celular ?? ''
    const q      = busqueda.toLowerCase()
    return nombre.includes(q) || cel.includes(q)
  })

  const convActual = convs.find(c => c.chat_id === selected)

  // Load messages for selected conversation
  useEffect(() => {
    if (!selected) return
    setLoading(true)
    const supabase = createClient()
    supabase
      .from('mensajes')
      .select('id, chat_id, role, content, image_url, created_at, cliente_id')
      .eq('negocio_id', negocioId)
      .eq('chat_id', selected)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMensajes((data ?? []) as Mensaje[])
        setLoading(false)
      })
  }, [selected, negocioId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#20201F' }}>

      {/* ── Lista de conversaciones ── */}
      <div className="flex flex-col flex-shrink-0"
        style={{ width: 300, background: '#2A2A29', borderRight: '1px solid #3D3D3B' }}>

        {/* Header */}
        <div className="px-4 pt-5 pb-3 flex-shrink-0"
          style={{ borderBottom: '1px solid #3D3D3B' }}>
          <h1 className="text-lg font-bold mb-3" style={{ color: '#F0F0EE' }}>Mensajería</h1>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: '#20201F', border: '1px solid #3D3D3B' }}>
            <Search size={14} style={{ color: '#5C5C59', flexShrink: 0 }} />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar..."
              className="bg-transparent text-sm outline-none flex-1"
              style={{ color: '#F0F0EE' }}
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filtradas.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <MessageSquare size={28} style={{ color: '#3D3D3B' }} />
              <p className="text-sm" style={{ color: '#5C5C59' }}>Sin conversaciones</p>
            </div>
          )}
          {filtradas.map(conv => {
            const activa = conv.chat_id === selected
            return (
              <button
                key={conv.chat_id}
                onClick={() => setSelected(conv.chat_id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{
                  background:   activa ? 'rgba(122,182,25,0.08)' : 'transparent',
                  borderLeft:   activa ? '3px solid #7AB619' : '3px solid transparent',
                  borderBottom: '1px solid #3D3D3B',
                }}>
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                  style={{ background: 'rgba(122,182,25,0.15)', color: '#7AB619' }}>
                  {iniciales(conv.clientes)}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-semibold truncate" style={{ color: '#F0F0EE' }}>
                      {nombreCliente(conv.clientes)}
                    </p>
                    <p className="text-[10px] flex-shrink-0 ml-2" style={{ color: '#5C5C59' }}>
                      {formatHora(conv.created_at)}
                    </p>
                  </div>
                  <p className="text-xs truncate" style={{ color: '#5C5C59' }}>
                    {conv.role === 'assistant' ? '🤖 ' : ''}{conv.content}
                  </p>
                  {conv.clientes?.celular && (
                    <p className="text-[10px]" style={{ color: '#3D3D3B' }}>{conv.clientes.celular}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Thread ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <MessageSquare size={40} style={{ color: '#3D3D3B' }} />
            <p style={{ color: '#5C5C59' }}>Seleccioná una conversación</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 px-6 py-3 flex-shrink-0"
              style={{ background: '#2A2A29', borderBottom: '1px solid #3D3D3B' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: 'rgba(122,182,25,0.15)', color: '#7AB619' }}>
                {iniciales(convActual?.clientes ?? null)}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>
                  {nombreCliente(convActual?.clientes ?? null)}
                </p>
                {convActual?.clientes?.celular && (
                  <p className="text-xs" style={{ color: '#5C5C59' }}>{convActual.clientes.celular}</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading && (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 rounded-full border-2 animate-spin"
                    style={{ borderColor: '#3D3D3B', borderTopColor: '#7AB619' }} />
                </div>
              )}

              {!loading && mensajes.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                  <p className="text-sm" style={{ color: '#5C5C59' }}>Sin mensajes guardados</p>
                </div>
              )}

              {!loading && mensajes.map((msg, i) => {
                const esUser   = msg.role === 'user'
                const prevMsg  = mensajes[i - 1]
                const showDate = !prevMsg ||
                  new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="text-[10px] px-3 py-1 rounded-full"
                          style={{ background: '#2A2A29', color: '#5C5C59' }}>
                          {isToday(new Date(msg.created_at))
                            ? 'Hoy'
                            : format(new Date(msg.created_at), "d 'de' MMMM", { locale: es })}
                        </span>
                      </div>
                    )}
                    <div className={`flex mb-2 ${esUser ? 'justify-end' : 'justify-start'}`}>
                      {!esUser && (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1 text-xs font-bold"
                          style={{ background: 'rgba(122,182,25,0.15)', color: '#7AB619' }}>
                          IA
                        </div>
                      )}
                      <div className="max-w-[65%]">
                        {msg.image_url && (
                          <img src={msg.image_url} alt="adjunto"
                            className="rounded-xl mb-1 max-w-full"
                            style={{ maxHeight: 200, objectFit: 'contain' }} />
                        )}
                        {msg.content && (
                          <div className="rounded-2xl px-4 py-2.5"
                            style={{
                              background:   esUser ? '#7AB619' : '#2A2A29',
                              color:        esUser ? '#fff'    : '#F0F0EE',
                              borderRadius: esUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            }}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        )}
                        <p className="text-[10px] mt-1 px-1"
                          style={{ color: '#5C5C59', textAlign: esUser ? 'right' : 'left' }}>
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Read-only hint */}
            <div className="px-6 py-3 flex-shrink-0 flex items-center justify-center"
              style={{ background: '#2A2A29', borderTop: '1px solid #3D3D3B' }}>
              <p className="text-xs" style={{ color: '#5C5C59' }}>
                Solo lectura — las respuestas las maneja el asistente IA
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
