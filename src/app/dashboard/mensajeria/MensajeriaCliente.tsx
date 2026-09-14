'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Search, Tag, CheckCircle, Archive, RotateCcw, Send, X } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { es } from 'date-fns/locale'

interface Mensaje {
  id: string
  chat_id: string
  role: 'user' | 'assistant'
  content: string
  image_url: string | null
  created_at: string
  cliente_id: string | null
}

interface Conversacion {
  id: string
  chat_id: string
  content: string
  role: 'user' | 'assistant'
  created_at: string
  cliente_id: string | null
  clientes: { id: string; nombre: string; apellido: string | null; celular: string | null } | null
  estado?: string
  unread_count?: number
}

type Etiqueta = { id: string; nombre: string; color: string }

function formatHora(iso: string) {
  const d = new Date(iso)
  if (isToday(d)) return format(d, 'HH:mm')
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
  negocioId: string
  conversaciones: Conversacion[]
}) {
  const [convs, setConvs] = useState<Conversacion[]>(inicial)
  const [selected, setSelected] = useState<string | null>(inicial[0]?.chat_id ?? null)
  const [selectedId, setSelectedId] = useState<string | null>(inicial[0]?.id ?? null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('todas')
  const [filtroEtiqueta, setFiltroEtiqueta] = useState<string>('')
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([])
  const [convEtiquetas, setConvEtiquetas] = useState<Etiqueta[]>([])
  const [loading, setLoading] = useState(false)
  const [respuesta, setRespuesta] = useState('')
  const [enviando, setEnviando] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/etiquetas').then(r=>r.json()).then(d=> setEtiquetas(d.etiquetas ?? [])).catch(()=>{})
  }, [])

  // cargar etiquetas de conversación seleccionada
  useEffect(() => {
    if (!selectedId) { setConvEtiquetas([]); return }
    fetch(`/api/conversaciones/${selectedId}/etiquetas`).then(r=>r.json()).then(d=> setConvEtiquetas(d.etiquetas ?? [])).catch(()=>{})
  }, [selectedId])

  // filtrado
  const filtradas = convs.filter(c => {
    const nombre = nombreCliente(c.clientes).toLowerCase()
    const cel = c.clientes?.celular ?? ''
    const q = busqueda.toLowerCase()
    const matchBusqueda = !q || nombre.includes(q) || cel.includes(q) || c.content.toLowerCase().includes(q)
    const matchEstado = filtroEstado === 'todas' || (c as any).estado === filtroEstado
    return matchBusqueda && matchEstado
  })

  // filtro por etiqueta requiere fetch? simplificamos client-side si ya tenemos convos con etiquetas, pero por ahora si hay filtroEtiqueta hacemos request
  useEffect(() => {
    if (!filtroEtiqueta) return
    // si hay filtro etiqueta, pedir al API
    fetch(`/api/conversaciones?etiqueta=${filtroEtiqueta}`).then(r=>r.json()).then(d=>{
      if (d.conversaciones) {
        // mapear a Conversacion
        const mapped = (d.conversaciones as any[]).map(c=> ({
          id: c.id, chat_id: c.chat_id, content: c.last_message_preview ?? '', role: 'user' as const,
          created_at: c.last_message_at, cliente_id: c.cliente_id, clientes: c.clientes, estado: c.estado, unread_count: c.unread_count
        }))
        setConvs(mapped)
      }
    })
  }, [filtroEtiqueta])

  const convActual = convs.find(c => c.chat_id === selected)

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    const supabase = createClient()
    supabase.from('mensajes').select('id, chat_id, role, content, image_url, created_at, cliente_id').eq('negocio_id', negocioId).eq('chat_id', selected).order('created_at', { ascending: true }).then(({ data }) => {
      setMensajes((data ?? []) as Mensaje[])
      setLoading(false)
      // marcar como leído
      if (selectedId) {
        fetch(`/api/conversaciones/${selectedId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ unread_count: 0 }) }).catch(()=>{})
        setConvs(prev=> prev.map(c=> c.id===selectedId ? { ...c, unread_count: 0 } as any : c))
      }
    })
  }, [selected, negocioId, selectedId])

  // realtime para mensajes nuevos en la conversación seleccionada
  useEffect(() => {
    if (!selected) return
    const supabase = createClient()
    const channel = supabase.channel(`dash:${selected}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `chat_id=eq.${selected}` }, (payload)=> {
      const row = payload.new as any
      if (row.negocio_id !== negocioId) return
      setMensajes(prev=> prev.some(m=>m.id===row.id) ? prev : [...prev, row as Mensaje])
      // actualizar preview en lista
      setConvs(prev=> prev.map(c=> c.chat_id===selected ? { ...c, content: row.content?.slice(0,120) ?? c.content, created_at: row.created_at, unread_count: row.role==='user' ? ((c as any).unread_count ?? 0)+1 : (c as any).unread_count } as any : c))
    }).subscribe()
    return ()=> { supabase.removeChannel(channel) }
  }, [selected, negocioId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensajes])

  function seleccionar(conv: Conversacion) {
    setSelected(conv.chat_id)
    setSelectedId((conv as any).id ?? null)
  }

  async function toggleEstado() {
    if (!selectedId || !convActual) return
    const nuevo = (convActual as any).estado === 'cerrada' ? 'abierta' : 'cerrada'
    await fetch(`/api/conversaciones/${selectedId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: nuevo }) })
    setConvs(prev=> prev.map(c=> (c as any).id===selectedId ? { ...c, estado: nuevo } as any : c))
  }

  async function toggleEtiquetaConv(etId: string, tiene: boolean) {
    if (!selectedId) return
    if (tiene) {
      await fetch(`/api/conversaciones/${selectedId}/etiquetas?etiqueta_id=${etId}`, { method: 'DELETE' })
      setConvEtiquetas(prev=> prev.filter(e=>e.id!==etId))
    } else {
      await fetch(`/api/conversaciones/${selectedId}/etiquetas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ etiqueta_id: etId }) })
      const et = etiquetas.find(e=>e.id===etId)
      if (et) setConvEtiquetas(prev=> [...prev, et])
    }
  }

  async function enviarRespuesta() {
    if (!respuesta.trim() || !selected || !selectedId) return
    setEnviando(true)
    const res = await fetch('/api/chat/responder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: selected, conversacion_id: selectedId, content: respuesta.trim(), cliente_id: convActual?.cliente_id ?? null }) })
    const data = await res.json()
    if (data.mensaje) {
      setMensajes(prev=> [...prev, { id: data.mensaje.id, chat_id: selected, role: 'assistant', content: respuesta.trim(), image_url: null, created_at: data.mensaje.created_at, cliente_id: convActual?.cliente_id ?? null }])
    }
    setRespuesta('')
    setEnviando(false)
  }

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden" style={{ background: '#20201F' }}>
      {/* Lista */}
      <div className="flex flex-col flex-shrink-0" style={{ width: 320, background: '#2A2A29', borderRight: '1px solid #3D3D3B' }}>
        <div className="px-4 pt-5 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid #3D3D3B' }}>
          <h1 className="text-lg font-bold mb-3" style={{ color: '#F0F0EE' }}>Mensajería</h1>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 mb-2" style={{ background: '#20201F', border: '1px solid #3D3D3B' }}>
            <Search size={14} style={{ color: '#5C5C59' }} />
            <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar..." className="bg-transparent text-sm outline-none flex-1" style={{ color: '#F0F0EE' }} />
          </div>
          <div className="flex gap-1.5">
            <select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)} className="flex-1 rounded-lg px-2 py-1.5 text-xs" style={{ background: '#20201F', border: '1px solid #3D3D3B', color: '#9A9A96' }}>
              <option value="todas">Todas</option>
              <option value="abierta">Abiertas</option>
              <option value="pendiente">Pendientes</option>
              <option value="cerrada">Cerradas</option>
            </select>
            <select value={filtroEtiqueta} onChange={e=>setFiltroEtiqueta(e.target.value)} className="flex-1 rounded-lg px-2 py-1.5 text-xs" style={{ background: '#20201F', border: '1px solid #3D3D3B', color: '#9A9A96' }}>
              <option value="">Todas etiquetas</option>
              {etiquetas.map(et=> <option key={et.id} value={et.id}>{et.nombre}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtradas.length===0 && <div className="flex flex-col items-center justify-center h-40 gap-2"><MessageSquare size={28} style={{ color: '#3D3D3B' }}/><p className="text-sm" style={{ color: '#5C5C59' }}>Sin conversaciones</p></div>}
          {filtradas.map(conv=>{
            const activa = conv.chat_id===selected
            const unread = (conv as any).unread_count ?? 0
            const estado = (conv as any).estado ?? 'abierta'
            return (
              <button key={conv.chat_id} onClick={()=>seleccionar(conv)} className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors" style={{ background: activa ? 'rgba(122,182,25,0.08)' : 'transparent', borderLeft: activa ? '3px solid #7AB619' : '3px solid transparent', borderBottom: '1px solid #3D3D3B' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{ background: 'rgba(122,182,25,0.15)', color: '#7AB619' }}>{iniciales(conv.clientes)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-semibold truncate" style={{ color: '#F0F0EE' }}>{nombreCliente(conv.clientes)}</p>
                    <div className="flex items-center gap-1">
                      {unread>0 && <span className="text-xs rounded-full px-1.5 py-0.5 font-bold" style={{ background: '#7AB619', color: '#fff' }}>{unread}</span>}
                      <p className="text-[10px] flex-shrink-0" style={{ color: '#5C5C59' }}>{formatHora(conv.created_at)}</p>
                    </div>
                  </div>
                  <p className="text-xs truncate" style={{ color: '#5C5C59' }}>{conv.content}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] rounded-full px-1.5 py-0.5" style={{ background: estado==='cerrada' ? '#3D3D3B' : estado==='pendiente' ? 'rgba(245,158,11,0.2)' : 'rgba(122,182,25,0.15)', color: estado==='cerrada' ? '#9A9A96' : estado==='pendiente' ? '#F59E0B' : '#7AB619' }}>{estado}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3"><MessageSquare size={40} style={{ color: '#3D3D3B' }}/><p style={{ color: '#5C5C59' }}>Seleccioná una conversación</p></div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-6 py-3 flex-shrink-0" style={{ background: '#2A2A29', borderBottom: '1px solid #3D3D3B' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(122,182,25,0.15)', color: '#7AB619' }}>{iniciales(convActual?.clientes ?? null)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>{nombreCliente(convActual?.clientes ?? null)}</p>
                {convActual?.clientes?.celular && <p className="text-xs" style={{ color: '#5C5C59' }}>{convActual.clientes.celular}</p>}
              </div>
              <button onClick={toggleEstado} className="rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5" style={{ background: (convActual as any)?.estado==='cerrada' ? 'rgba(122,182,25,0.15)' : '#3D3D3B', color: (convActual as any)?.estado==='cerrada' ? '#7AB619' : '#F0F0EE' }}>
                {(convActual as any)?.estado==='cerrada' ? <><RotateCcw size={12}/> Reabrir</> : <><Archive size={12}/> Cerrar</>}
              </button>
            </div>

            {/* etiquetas de conversación */}
            <div className="px-6 py-2 flex items-center gap-1.5 flex-wrap" style={{ background: '#20201F', borderBottom: '1px solid #2A2A29' }}>
              <Tag size={12} style={{ color: '#9A9A96' }}/>
              {etiquetas.map(et=>{
                const tiene = convEtiquetas.some(e=>e.id===et.id)
                return <button key={et.id} onClick={()=>toggleEtiquetaConv(et.id, tiene)} className="rounded-full px-2 py-0.5 text-xs border" style={{ background: tiene ? et.color : 'transparent', color: tiene ? '#fff' : et.color, borderColor: et.color }}>{et.nombre}</button>
              })}
              {etiquetas.length===0 && <span className="text-xs" style={{ color: '#5C5C59' }}>Sin etiquetas. Crealas en /dashboard/etiquetas</span>}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading && <div className="flex justify-center py-8"><div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: '#3D3D3B', borderTopColor: '#7AB619' }} /></div>}
              {!loading && mensajes.length===0 && <div className="flex flex-col items-center justify-center h-40 gap-2"><p className="text-sm" style={{ color: '#5C5C59' }}>Sin mensajes</p></div>}
              {!loading && mensajes.map((msg,i)=>{
                const esUser = msg.role==='user'
                const prev = mensajes[i-1]
                const showDate = !prev || new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString()
                return (
                  <div key={msg.id}>
                    {showDate && <div className="flex justify-center my-4"><span className="text-[10px] px-3 py-1 rounded-full" style={{ background: '#2A2A29', color: '#5C5C59' }}>{isToday(new Date(msg.created_at)) ? 'Hoy' : format(new Date(msg.created_at), "d 'de' MMMM", { locale: es })}</span></div>}
                    <div className={`flex mb-2 ${esUser ? 'justify-end' : 'justify-start'}`}>
                      {!esUser && <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1 text-xs font-bold" style={{ background: 'rgba(122,182,25,0.15)', color: '#7AB619' }}>IA</div>}
                      <div className="max-w-[65%]">
                        {msg.image_url && <img src={msg.image_url} alt="adjunto" className="rounded-xl mb-1 max-w-full" style={{ maxHeight: 200, objectFit: 'contain' }} />}
                        {msg.content && <div className="rounded-2xl px-4 py-2.5" style={{ background: esUser ? '#7AB619' : '#2A2A29', color: esUser ? '#fff' : '#F0F0EE', borderRadius: esUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px' }}><p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p></div>}
                        <p className="text-[10px] mt-1 px-1" style={{ color: '#5C5C59', textAlign: esUser ? 'right' : 'left' }}>{format(new Date(msg.created_at), 'HH:mm')}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <div className="px-6 py-3 flex-shrink-0 flex items-center gap-2" style={{ background: '#2A2A29', borderTop: '1px solid #3D3D3B' }}>
              <input value={respuesta} onChange={e=>setRespuesta(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); enviarRespuesta() }}} placeholder="Responder como empresa..." className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none" style={{ background: '#20201F', border: '1px solid #3D3D3B', color: '#F0F0EE' }} />
              <button onClick={enviarRespuesta} disabled={enviando || !respuesta.trim()} className="rounded-xl p-2.5 disabled:opacity-40" style={{ background: '#7AB619', color: '#fff' }}><Send size={16}/></button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
