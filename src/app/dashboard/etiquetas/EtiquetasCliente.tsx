'use client'

import { useState } from 'react'
import { Tag, Plus, Trash2, Users } from 'lucide-react'

type Etiqueta = { id: string; nombre: string; color: string; created_at: string }

const COLORES = ['#7AB619','#3B82F6','#8B5CF6','#EF4444','#F59E0B','#10B981','#EC4899','#6366F1']

export default function EtiquetasCliente({ etiquetasIniciales, totalClientes }: { etiquetasIniciales: Etiqueta[]; totalClientes: number }) {
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>(etiquetasIniciales)
  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState(COLORES[0] ?? '#7AB619')
  const [loading, setLoading] = useState(false)

  const colores = COLORES

  async function crear() {
    if (!nombre.trim()) return
    setLoading(true)
    const res = await fetch('/api/etiquetas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: nombre.trim(), color }) })
    const data = await res.json()
    if (data.etiqueta) setEtiquetas(prev => [...prev, data.etiqueta].sort((a,b)=>a.nombre.localeCompare(b.nombre)))
    setNombre('')
    setLoading(false)
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar etiqueta? Se quitará de todos los clientes y conversaciones.')) return
    await fetch(`/api/etiquetas?id=${id}`, { method: 'DELETE' })
    setEtiquetas(prev => prev.filter(e=>e.id!==id))
  }

  return (
    <div className="w-[85%] mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: '#F0F0EE' }}><Tag size={20} style={{ color: '#7AB619' }}/> Etiquetas</h1>
        <p className="text-sm mt-1" style={{ color: '#9A9A96' }}>Segmentá clientes y conversaciones. {totalClientes} clientes totales.</p>
      </div>

      <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
        <div className="flex flex-col md:flex-row gap-2">
          <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Nombre (ej: VIP, Nuevo, Inactivo)" className="flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={{ background: '#20201F', border: '1px solid #3D3D3B', color: '#F0F0EE' }} onKeyDown={e=>e.key==='Enter'&&crear()} />
          <div className="flex items-center gap-1.5">
            {colores.map(c=>(
              <button key={c} onClick={()=>setColor(c)} className="w-7 h-7 rounded-full border-2 transition-all" style={{ background: c, borderColor: color===c ? '#F0F0EE' : 'transparent', transform: color===c ? 'scale(1.15)' : 'scale(1)' }} title={c} />
            ))}
          </div>
          <button onClick={crear} disabled={loading || !nombre.trim()} className="rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40 flex items-center gap-1.5" style={{ background: '#7AB619', color: '#fff' }}><Plus size={14}/> Crear</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {etiquetas.length===0 && <p className="text-xs py-4 text-center md:col-span-2" style={{ color: '#5C5C59' }}>Sin etiquetas. Creá la primera.</p>}
          {etiquetas.map(e=>(
            <div key={e.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: '#20201F', border: `1px solid ${e.color}30` }}>
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: e.color }} />
              <span className="text-sm flex-1 truncate" style={{ color: '#F0F0EE' }}>{e.nombre}</span>
              <span className="text-xs" style={{ color: '#5C5C59' }}>{new Date(e.created_at).toLocaleDateString('es-AR')}</span>
              <button onClick={()=>eliminar(e.id)} className="p-1.5 rounded-lg" style={{ color: '#EF4444' }}><Trash2 size={14}/></button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-4 flex items-center gap-2" style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
        <Users size={14} style={{ color: '#7AB619' }} />
        <p className="text-xs" style={{ color: '#9A9A96' }}>Asigná etiquetas desde <b style={{ color: '#F0F0EE' }}>Clientes</b> y <b style={{ color: '#F0F0EE' }}>Mensajería</b>. Luego usalas para filtrar y enviar campañas segmentadas.</p>
      </div>
    </div>
  )
}
