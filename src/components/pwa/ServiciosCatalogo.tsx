'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Store, Plus, Minus, ShoppingBag, Send } from 'lucide-react'

type Servicio = { id: string; nombre: string; descripcion: string | null; precio: number; imagen_url: string | null }

export default function ServiciosCatalogo({ servicios, slug, color, negocioId }: { servicios: Servicio[]; slug: string; color: string; negocioId: string }) {
  const [carrito, setCarrito] = useState<Record<string, number>>({})
  const [enviando, setEnviando] = useState(false)
  const [exito, setExito] = useState(false)

  const totalItems = Object.values(carrito).reduce((a,b)=>a+b,0)
  const totalPrecio = Object.entries(carrito).reduce((sum,[id,cant])=>{
    const s = servicios.find(x=>x.id===id)
    return sum + (s ? Number(s.precio)*cant : 0)
  },0)

  function add(id: string) { setCarrito(prev=> ({ ...prev, [id]: (prev[id]??0)+1 })) }
  function remove(id: string) { setCarrito(prev=> { const n=(prev[id]??0)-1; if(n<=0){ const { [id]:_, ...rest}=prev; return rest } return { ...prev, [id]:n } }) }

  async function enviarPedido() {
    if (totalItems===0) return
    setEnviando(true)
    const chatId = typeof window!=='undefined' ? localStorage.getItem('simplificia_chat_id') : null
    const items = Object.entries(carrito).map(([servicio_id,cantidad])=>({ servicio_id, cantidad }))
    const res = await fetch('/api/pedidos/cliente', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ negocio_id: negocioId, chat_id: chatId, items }) })
    if (res.ok) { setExito(true); setCarrito({}); setTimeout(()=>setExito(false),3000) }
    setEnviando(false)
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#20201F' }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ background: '#2A2A29', borderBottom: '1px solid #3D3D3B' }}>
        <Link href={`/c/${slug}`} className="rounded-lg p-1.5" style={{ color: '#5C5C59' }}><Store size={18} /></Link>
        <p className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>Servicios</p>
        {totalItems>0 && <span className="ml-auto flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1" style={{ background: color, color: '#fff' }}><ShoppingBag size={12}/>{totalItems} · ${totalPrecio.toLocaleString('es-AR')}</span>}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
        {exito && <div className="rounded-xl p-3 text-sm text-center" style={{ background: 'rgba(122,182,25,0.15)', color: '#7AB619', border: '1px solid rgba(122,182,25,0.3)' }}>¡Pedido enviado! Te responderemos por chat.</div>}
        {servicios.map(s=> {
          const cant = carrito[s.id] ?? 0
          return (
            <div key={s.id} className="rounded-2xl p-3 flex gap-3" style={{ background: '#2A2A29', border: `1px solid ${cant>0 ? color : '#3D3D3B'}` }}>
              {s.imagen_url ? <img src={s.imagen_url} alt={s.nombre} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" /> : <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#20201F' }}><Store size={18} style={{ color }} /></div>}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>{s.nombre}</p>
                {s.descripcion && <p className="text-xs line-clamp-2" style={{ color: '#9A9A96' }}>{s.descripcion}</p>}
                <p className="text-sm font-bold mt-1" style={{ color }}>{s.precio>0 ? `$${Number(s.precio).toLocaleString('es-AR')}` : 'Consultar'}</p>
              </div>
              <div className="flex flex-col items-center gap-1 self-center">
                {cant===0 ? (
                  <button onClick={()=>add(s.id)} className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: color, color: '#fff' }}>Agregar</button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={()=>remove(s.id)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#3D3D3B', color: '#F0F0EE' }}><Minus size={12}/></button>
                    <span className="text-sm font-bold" style={{ color: '#F0F0EE' }}>{cant}</span>
                    <button onClick={()=>add(s.id)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: color, color: '#fff' }}><Plus size={12}/></button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {totalItems>0 && (
        <div className="flex-shrink-0 p-3 flex gap-2" style={{ background: '#2A2A29', borderTop: '1px solid #3D3D3B', paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: '#F0F0EE' }}>Total ${totalPrecio.toLocaleString('es-AR')}</p>
            <p className="text-xs" style={{ color: '#9A9A96' }}>{totalItems} items</p>
          </div>
          <button onClick={enviarPedido} disabled={enviando} className="rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50" style={{ background: color, color: '#fff' }}><Send size={14}/> {enviando ? 'Enviando...' : 'Pedir por chat'}</button>
        </div>
      )}
    </div>
  )
}
