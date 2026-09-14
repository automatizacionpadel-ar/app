'use client'

import { useState } from 'react'
import { Star, Ticket, Gift } from 'lucide-react'

type Cupon = { id: string; codigo: string; descuento_porcentaje: number | null; activo: boolean; usos: number }

export default function FidelizacionCliente({ config, cuponesIniciales, clientes, saldos, negocioId }: { config: any; cuponesIniciales: Cupon[]; clientes: any[]; saldos: any[]; negocioId: string }) {
  const [cupones, setCupones] = useState<Cupon[]>(cuponesIniciales)
  const [codigo, setCodigo] = useState('')
  const [desc, setDesc] = useState('10')
  const [clienteId, setClienteId] = useState('')
  const [puntos, setPuntos] = useState('10')

  async function crearCupon() {
    if (!codigo.trim()) return
    const res = await fetch('/api/fidelizacion/cupones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: codigo.trim().toUpperCase(), descuento_porcentaje: Number(desc) }) })
    const data = await res.json()
    if (data.cupon) setCupones(prev=>[data.cupon, ...prev])
    setCodigo('')
  }

  async function sumarPuntos() {
    if (!clienteId || !puntos) return
    await fetch('/api/fidelizacion/puntos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cliente_id: clienteId, puntos: Number(puntos), motivo: 'manual' }) })
    alert('Puntos asignados')
  }

  return (
    <div className="w-[85%] mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: '#F0F0EE' }}><Star size={20} style={{ color: '#F59E0B' }}/> Fidelización</h1>
        <p className="text-sm" style={{ color: '#9A9A96' }}>Puntos y cupones · {config?.activo ? 'Activo' : 'Inactivo (activar en config)'} </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 space-y-3" style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
          <p className="text-sm font-semibold flex items-center gap-2" style={{ color: '#F0F0EE' }}><Ticket size={16}/> Cupones</p>
          <div className="flex gap-2">
            <input value={codigo} onChange={e=>setCodigo(e.target.value)} placeholder="Código (ej: BIENVENIDA10)" className="flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={{ background: '#20201F', border: '1px solid #3D3D3B', color: '#F0F0EE' }} />
            <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="%" type="number" className="w-20 rounded-xl px-3 py-2 text-sm outline-none" style={{ background: '#20201F', border: '1px solid #3D3D3B', color: '#F0F0EE' }} />
            <button onClick={crearCupon} className="rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: '#7AB619', color: '#fff' }}>Crear</button>
          </div>
          <div className="space-y-1.5">
            {cupones.length===0 && <p className="text-xs" style={{ color: '#5C5C59' }}>Sin cupones</p>}
            {cupones.map(c=>(
              <div key={c.id} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: '#20201F', border: '1px solid #3D3D3B' }}>
                <span className="text-xs font-bold" style={{ color: '#F0F0EE' }}>{c.codigo}</span>
                <span className="text-xs" style={{ color: '#7AB619' }}>{c.descuento_porcentaje}% OFF</span>
                <span className="ml-auto text-xs" style={{ color: '#5C5C59' }}>{c.usos} usos</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-5 space-y-3" style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
          <p className="text-sm font-semibold flex items-center gap-2" style={{ color: '#F0F0EE' }}><Gift size={16}/> Puntos</p>
          <select value={clienteId} onChange={e=>setClienteId(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm" style={{ background: '#20201F', border: '1px solid #3D3D3B', color: '#F0F0EE' }}>
            <option value="">Seleccionar cliente</option>
            {clientes.map((c:any)=> <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
          </select>
          <div className="flex gap-2">
            <input value={puntos} onChange={e=>setPuntos(e.target.value)} type="number" className="flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={{ background: '#20201F', border: '1px solid #3D3D3B', color: '#F0F0EE' }} />
            <button onClick={sumarPuntos} className="rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: '#F59E0B', color: '#fff' }}>Sumar</button>
          </div>
          <div className="space-y-1">
            {saldos.map((s:any)=>(
              <div key={s.cliente_id} className="flex justify-between text-xs" style={{ color: '#9A9A96' }}><span>{s.cliente_id.slice(0,8)}</span><span style={{ color: '#F59E0B' }}>{s.saldo} pts</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
