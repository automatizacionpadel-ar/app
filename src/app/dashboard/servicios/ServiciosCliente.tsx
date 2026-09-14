'use client'

import { useState } from 'react'
import { Store, Plus, Trash2, Edit2, Image as ImageIcon, DollarSign } from 'lucide-react'

type Servicio = { id: string; nombre: string; descripcion: string | null; precio: number; imagen_url: string | null; activo: boolean }

export default function ServiciosCliente({ serviciosIniciales, negocioId }: { serviciosIniciales: Servicio[]; negocioId: string }) {
  const [servicios, setServicios] = useState<Servicio[]>(serviciosIniciales)
  const [form, setForm] = useState({ nombre: '', descripcion: '', precio: '', imagen_url: '' })
  const [loading, setLoading] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  async function guardar() {
    if (!form.nombre.trim()) return
    setLoading(true)
    if (editId) {
      const res = await fetch(`/api/servicios/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: form.nombre.trim(), descripcion: form.descripcion.trim(), precio: Number(form.precio) || 0, imagen_url: form.imagen_url || null }) })
      const data = await res.json()
      if (data.servicio) setServicios(prev=> prev.map(s=> s.id===editId ? data.servicio : s))
      setEditId(null)
    } else {
      const res = await fetch('/api/servicios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: form.nombre.trim(), descripcion: form.descripcion.trim(), precio: Number(form.precio) || 0, imagen_url: form.imagen_url || null }) })
      const data = await res.json()
      if (data.servicio) setServicios(prev=> [data.servicio, ...prev])
    }
    setForm({ nombre: '', descripcion: '', precio: '', imagen_url: '' })
    setLoading(false)
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar servicio?')) return
    await fetch(`/api/servicios?id=${id}`, { method: 'DELETE' })
    setServicios(prev=> prev.filter(s=>s.id!==id))
  }

  function editar(s: Servicio) {
    setEditId(s.id)
    setForm({ nombre: s.nombre, descripcion: s.descripcion ?? '', precio: String(s.precio), imagen_url: s.imagen_url ?? '' })
  }

  return (
    <div className="w-[85%] mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: '#F0F0EE' }}><Store size={20} style={{ color: '#7AB619' }}/> Servicios</h1>
        <p className="text-sm mt-1" style={{ color: '#9A9A96' }}>Catálogo que verán tus clientes en la PWA. Base para pedidos y reservas.</p>
      </div>

      <div className="rounded-2xl p-5 space-y-3" style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
        <div className="grid md:grid-cols-2 gap-3">
          <input value={form.nombre} onChange={e=>setForm(s=>({...s, nombre:e.target.value}))} placeholder="Nombre *" className="rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: '#20201F', border: '1px solid #3D3D3B', color: '#F0F0EE' }} />
          <input value={form.precio} onChange={e=>setForm(s=>({...s, precio:e.target.value}))} placeholder="Precio (ej: 1500)" type="number" className="rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: '#20201F', border: '1px solid #3D3D3B', color: '#F0F0EE' }} />
          <input value={form.descripcion} onChange={e=>setForm(s=>({...s, descripcion:e.target.value}))} placeholder="Descripción" className="md:col-span-2 rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: '#20201F', border: '1px solid #3D3D3B', color: '#F0F0EE' }} />
          <input value={form.imagen_url} onChange={e=>setForm(s=>({...s, imagen_url:e.target.value}))} placeholder="Imagen URL (opcional)" className="md:col-span-2 rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: '#20201F', border: '1px solid #3D3D3B', color: '#F0F0EE' }} />
        </div>
        <div className="flex gap-2">
          <button onClick={guardar} disabled={loading || !form.nombre.trim()} className="rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40 flex items-center gap-1.5" style={{ background: '#7AB619', color: '#fff' }}><Plus size={14}/> {editId ? 'Actualizar' : 'Agregar'}</button>
          {editId && <button onClick={()=>{ setEditId(null); setForm({ nombre:'', descripcion:'', precio:'', imagen_url:''})}} className="rounded-xl px-4 py-2 text-sm" style={{ background: '#3D3D3B', color: '#F0F0EE' }}>Cancelar</button>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {servicios.length===0 && <p className="text-xs py-8 text-center md:col-span-2" style={{ color: '#5C5C59' }}>Sin servicios. Agregá el primero.</p>}
        {servicios.map(s=>(
          <div key={s.id} className="rounded-xl p-4 flex gap-3" style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
            {s.imagen_url ? <img src={s.imagen_url} alt={s.nombre} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" /> : <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#20201F' }}><ImageIcon size={18} style={{ color: '#5C5C59' }}/></div>}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: '#F0F0EE' }}>{s.nombre}</p>
              {s.descripcion && <p className="text-xs line-clamp-2" style={{ color: '#9A9A96' }}>{s.descripcion}</p>}
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#7AB619' }}><DollarSign size={12}/> {Number(s.precio).toLocaleString('es-AR')}</p>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={()=>editar(s)} className="p-1.5 rounded-lg" style={{ color: '#9A9A96' }}><Edit2 size={14}/></button>
              <button onClick={()=>eliminar(s.id)} className="p-1.5 rounded-lg" style={{ color: '#EF4444' }}><Trash2 size={14}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
