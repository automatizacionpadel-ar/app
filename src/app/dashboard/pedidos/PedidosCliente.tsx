'use client'

import { useState } from 'react'
import { ShoppingBag, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type Pedido = { id: string; estado: string; total: number; created_at: string; clientes: any; pedido_items: any[] }
type Servicio = { id: string; nombre: string; precio: number }

export default function PedidosCliente({ pedidosIniciales, servicios, clientes }: { pedidosIniciales: Pedido[]; servicios: Servicio[]; clientes: any[] }) {
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciales)
  const [clienteId, setClienteId] = useState('')
  const [items, setItems] = useState<{ servicio_id: string; cantidad: number }[]>([])
  const [loading, setLoading] = useState(false)

  function addItem(servId: string) {
    setItems(prev => {
      const ex = prev.find(i=>i.servicio_id===servId)
      if (ex) return prev.map(i=> i.servicio_id===servId ? { ...i, cantidad: i.cantidad+1 } : i)
      return [...prev, { servicio_id: servId, cantidad: 1 }]
    })
  }

  async function crear() {
    if (items.length===0) return
    setLoading(true)
    const res = await fetch('/api/pedidos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cliente_id: clienteId || null, items }) })
    const data = await res.json()
    if (data.pedido) setPedidos(prev=> [data.pedido as any, ...prev])
    setItems([]); setLoading(false)
  }

  return (
    <div className="w-[85%] mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: '#F0F0EE' }}><ShoppingBag size={20} style={{ color: '#7AB619' }}/> Pedidos</h1>
        <p className="text-sm mt-1" style={{ color: '#9A9A96' }}>{pedidos.length} pedidos · beta</p>
      </div>

      <div className="rounded-2xl p-5 space-y-3" style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
        <p className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>Nuevo pedido</p>
        <select value={clienteId} onChange={e=>setClienteId(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm" style={{ background: '#20201F', border: '1px solid #3D3D3B', color: '#F0F0EE' }}>
          <option value="">Cliente opcional</option>
          {clientes.map((c:any)=> <option key={c.id} value={c.id}>{c.nombre} {c.apellido} - {c.celular}</option>)}
        </select>
        <div className="flex flex-wrap gap-1.5">
          {servicios.map(s=> (
            <button key={s.id} onClick={()=>addItem(s.id)} className="rounded-full px-3 py-1.5 text-xs border" style={{ background: '#20201F', color: '#F0F0EE', borderColor: '#3D3D3B' }}>{s.nombre} - ${Number(s.precio).toLocaleString('es-AR')}</button>
          ))}
          {servicios.length===0 && <span className="text-xs" style={{ color: '#5C5C59' }}>Creá servicios primero en /dashboard/servicios</span>}
        </div>
        {items.length>0 && <div className="text-xs" style={{ color: '#9A9A96' }}>{items.length} items seleccionados</div>}
        <button onClick={crear} disabled={loading || items.length===0} className="rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40 flex items-center gap-1.5" style={{ background: '#7AB619', color: '#fff' }}><Plus size={14}/> Crear pedido</button>
      </div>

      <div className="space-y-2">
        {pedidos.length===0 && <p className="text-xs text-center py-8" style={{ color: '#5C5C59' }}>Sin pedidos aún.</p>}
        {pedidos.map(p=>(
          <div key={p.id} className="rounded-xl p-4 flex items-center gap-3" style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: '#F0F0EE' }}>#{p.id.slice(0,8)} · {p.estado} · ${Number(p.total).toLocaleString('es-AR')}</p>
              <p className="text-xs" style={{ color: '#9A9A96' }}>{p.clientes ? `${p.clientes.nombre} ${p.clientes.apellido ?? ''}` : 'Sin cliente'} · {format(new Date(p.created_at), "d MMM HH:mm", { locale: es })}</p>
            </div>
            <span className="text-xs rounded-full px-2 py-1" style={{ background: p.estado==='pendiente' ? 'rgba(245,158,11,0.15)' : 'rgba(122,182,25,0.15)', color: p.estado==='pendiente' ? '#F59E0B' : '#7AB619' }}>{p.estado}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
