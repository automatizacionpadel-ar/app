'use client'

import { useState } from 'react'
import { Webhook, Plus, Trash2, Copy, Check, ExternalLink } from 'lucide-react'

type Hook = { id: string; url: string; eventos: string[]; activo: boolean; created_at: string }

const EVENTOS_DISPONIBLES = ['nuevo_mensaje','nuevo_cliente','conversacion_cerrada','conversacion_abierta','notificacion_enviada'] as const

export default function WebhooksCliente({ hooksIniciales }: { hooksIniciales: Hook[] }) {
  const [hooks, setHooks] = useState<Hook[]>(hooksIniciales)
  const [url, setUrl] = useState('')
  const [eventos, setEventos] = useState<string[]>(['nuevo_mensaje','nuevo_cliente'])
  const [loading, setLoading] = useState(false)

  async function crear() {
    if (!url.trim()) return
    setLoading(true)
    const res = await fetch('/api/webhooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: url.trim(), eventos }) })
    const data = await res.json()
    if (data.hook) setHooks(prev => [data.hook, ...prev])
    setUrl('')
    setLoading(false)
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar webhook?')) return
    await fetch(`/api/webhooks?id=${id}`, { method: 'DELETE' })
    setHooks(prev => prev.filter(h=>h.id!==id))
  }

  function toggleEvento(ev: string) {
    setEventos(prev => prev.includes(ev) ? prev.filter(e=>e!==ev) : [...prev, ev])
  }

  return (
    <div className="w-[85%] mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: '#F0F0EE' }}><Webhook size={20} style={{ color: '#7AB619' }}/> Webhooks / n8n</h1>
        <p className="text-sm mt-1" style={{ color: '#9A9A96' }}>Recibí eventos en tu URL de n8n u otro sistema. Útil para automatizaciones.</p>
      </div>

      <div className="rounded-2xl p-5 space-y-4" style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
        <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://n8n.tudominio.com/webhook/..." className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: '#20201F', border: '1px solid #3D3D3B', color: '#F0F0EE' }} />
        <div>
          <p className="text-xs mb-2" style={{ color: '#9A9A96' }}>Eventos:</p>
          <div className="flex flex-wrap gap-1.5">
            {EVENTOS_DISPONIBLES.map(ev=>(
              <button key={ev} onClick={()=>toggleEvento(ev)} className="rounded-full px-3 py-1 text-xs font-medium border" style={{ background: eventos.includes(ev) ? '#7AB619' : '#20201F', color: eventos.includes(ev) ? '#fff' : '#9A9A96', borderColor: eventos.includes(ev) ? '#7AB619' : '#3D3D3B' }}>{ev}</button>
            ))}
          </div>
        </div>
        <button onClick={crear} disabled={loading || !url.trim()} className="rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40 flex items-center gap-1.5" style={{ background: '#7AB619', color: '#fff' }}><Plus size={14}/> Agregar webhook</button>

        <div className="space-y-2 pt-2">
          {hooks.length===0 && <p className="text-xs text-center py-6" style={{ color: '#5C5C59' }}>Sin webhooks. Agregá tu URL de n8n.</p>}
          {hooks.map(h=>(
            <div key={h.id} className="flex items-center gap-3 rounded-xl px-3 py-3" style={{ background: '#20201F', border: '1px solid #3D3D3B' }}>
              <Webhook size={16} style={{ color: h.activo ? '#7AB619' : '#5C5C59' }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate" style={{ color: '#F0F0EE' }}>{h.url}</p>
                <p className="text-xs" style={{ color: '#5C5C59' }}>{h.eventos.join(', ')} · {new Date(h.created_at).toLocaleDateString()}</p>
              </div>
              <button onClick={()=>eliminar(h.id)} className="p-1.5 rounded-lg" style={{ color: '#EF4444' }}><Trash2 size={14}/></button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
        <p className="text-xs" style={{ color: '#9A9A96' }}>Payload ejemplo: <code style={{ color: '#F0F0EE' }}>{`{ evento: "nuevo_mensaje", negocio_id, data: { chat_id, contenido } }`}</code></p>
      </div>
    </div>
  )
}
