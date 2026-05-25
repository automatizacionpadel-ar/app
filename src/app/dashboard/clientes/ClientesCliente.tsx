// src/app/dashboard/clientes/ClientesCliente.tsx
'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Users, Phone, Mail, Calendar,
  Clock, X, ChevronRight, UserPlus, SlidersHorizontal, FileText
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Cliente } from '@/types'
import RecetaModal from './RecetaModal'

interface NegocioInfo {
  id:                string
  nombre:            string
  rubro:             string
  logo_url:          string | null
  sello_url:         string | null
  firma_url:         string | null
  habilitar_recetas: boolean
}

// ─── Badge estado push ────────────────────────────────────────────────────────
function PushBadge({ activo }: { activo: boolean }) {
  return (
    <span className="text-[10px] rounded-full px-2 py-0.5 font-medium"
      style={{
        background: activo ? 'rgba(122,182,25,0.15)' : 'rgba(92,92,89,0.15)',
        color: activo ? '#7AB619' : '#5C5C59'
      }}>
      {activo ? 'Push ✓' : 'Sin push'}
    </span>
  )
}

// ─── Modal detalle cliente ────────────────────────────────────────────────────
function ModalCliente({ cliente, onClose, onNuevaReceta, negocioInfo }: {
  cliente: Cliente
  onClose: () => void
  onNuevaReceta: () => void
  negocioInfo: NegocioInfo | null
}) {
  const nombre = `${cliente.nombre} ${cliente.apellido ?? ''}`.trim()
  const inicial = nombre.charAt(0).toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl animate-fade-up"
        style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid #3D3D3B' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: 'rgba(122,182,25,0.15)', color: '#7AB619' }}>
              {inicial}
            </div>
            <div>
              <p className="font-semibold" style={{ color: '#F0F0EE' }}>{nombre}</p>
              <PushBadge activo={cliente.push_activo} />
            </div>
          </div>
          <button onClick={onClose} style={{ color: '#5C5C59' }}>
            <X size={16} />
          </button>
        </div>

        {/* Info */}
        <div className="p-5 space-y-3">
          {cliente.celular && (
            <div className="flex items-center gap-3">
              <Phone size={15} style={{ color: '#7AB619' }} />
              <span className="text-sm" style={{ color: '#F0F0EE' }}>{cliente.celular}</span>
            </div>
          )}
          {cliente.email && (
            <div className="flex items-center gap-3">
              <Mail size={15} style={{ color: '#7AB619' }} />
              <span className="text-sm" style={{ color: '#F0F0EE' }}>{cliente.email}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Calendar size={15} style={{ color: '#7AB619' }} />
            <span className="text-sm" style={{ color: '#F0F0EE' }}>
              {cliente.total_citas} cita{cliente.total_citas !== 1 ? 's' : ''} en total
            </span>
          </div>
          {cliente.ultima_cita_at && (
            <div className="flex items-center gap-3">
              <Clock size={15} style={{ color: '#7AB619' }} />
              <span className="text-sm" style={{ color: '#9A9A96' }}>
                Última cita: {format(new Date(cliente.ultima_cita_at), "d 'de' MMMM yyyy", { locale: es })}
              </span>
            </div>
          )}
          {cliente.notas && (
            <div className="rounded-lg p-3 mt-2"
              style={{ background: '#20201F', border: '1px solid #3D3D3B' }}>
              <p className="text-xs mb-1" style={{ color: '#5C5C59' }}>Notas</p>
              <p className="text-sm" style={{ color: '#9A9A96' }}>{cliente.notas}</p>
            </div>
          )}
          <p className="text-xs pt-1" style={{ color: '#5C5C59' }}>
            Registrado el {format(new Date(cliente.created_at), "d 'de' MMMM yyyy", { locale: es })}
          </p>

          {negocioInfo?.habilitar_recetas && (
            <button onClick={onNuevaReceta}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all mt-2"
              style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.25)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.25)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.15)')}>
              <FileText size={15} />
              Nueva receta
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Fila de cliente ──────────────────────────────────────────────────────────
function FilaCliente({ cliente, onClick }: { cliente: Cliente; onClick: () => void }) {
  const nombre  = `${cliente.nombre} ${cliente.apellido ?? ''}`.trim()
  const inicial = nombre.charAt(0).toUpperCase()

  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left"
      style={{ borderBottom: '1px solid #3D3D3B' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(122,182,25,0.04)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
        style={{ background: 'rgba(122,182,25,0.12)', color: '#7AB619' }}>
        {inicial}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: '#F0F0EE' }}>{nombre}</p>
        <p className="text-xs truncate" style={{ color: '#5C5C59' }}>
          {cliente.celular ?? cliente.email ?? 'Sin contacto'}
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <PushBadge activo={cliente.push_activo} />
        <span className="text-xs" style={{ color: '#5C5C59' }}>
          {cliente.total_citas} citas
        </span>
        <ChevronRight size={14} style={{ color: '#3D3D3B' }} />
      </div>
    </button>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ClientesCliente({
  clientesIniciales, negocioId, negocioInfo
}: {
  clientesIniciales: Cliente[]
  negocioId: string | null
  negocioInfo: NegocioInfo | null
}) {
  const [busqueda, setBusqueda]     = useState('')
  const [filtroPush, setFiltroPush] = useState<'todos' | 'con_push' | 'sin_push'>('todos')
  const [clienteModal, setClienteModal]   = useState<Cliente | null>(null)
  const [recetaCliente, setRecetaCliente] = useState<Cliente | null>(null)

  const clientesFiltrados = useMemo(() => {
    return clientesIniciales.filter(p => {
      const nombre = `${p.nombre} ${p.apellido ?? ''}`.toLowerCase()
      const matchBusqueda = busqueda === '' ||
        nombre.includes(busqueda.toLowerCase()) ||
        (p.celular ?? '').includes(busqueda) ||
        (p.email ?? '').toLowerCase().includes(busqueda.toLowerCase())

      const matchPush =
        filtroPush === 'todos' ? true :
        filtroPush === 'con_push' ? p.push_activo :
        !p.push_activo

      return matchBusqueda && matchPush
    })
  }, [clientesIniciales, busqueda, filtroPush])

  const totalConPush = clientesIniciales.filter(p => p.push_activo).length

  return (
    <div className="p-6 w-[85%] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#F0F0EE' }}>Clientes</h1>
          <p className="text-sm" style={{ color: '#5C5C59' }}>
            {clientesIniciales.length} registrados · {totalConPush} con notificaciones push
          </p>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total', valor: clientesIniciales.length, color: '#7AB619' },
          { label: 'Con push', valor: totalConPush, color: '#3B82F6' },
          { label: 'Sin push', valor: clientesIniciales.length - totalConPush, color: '#5C5C59' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl p-4"
            style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
            <p className="text-xl font-bold" style={{ color: stat.color }}>{stat.valor}</p>
            <p className="text-xs mt-0.5" style={{ color: '#5C5C59' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Búsqueda y filtros */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: '#5C5C59' }} />
          <input
            type="text"
            placeholder="Buscar por nombre, celular o email..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full rounded-lg pl-9 pr-4 py-2.5 text-sm"
            style={{
              background: '#2A2A29',
              border: '1px solid #3D3D3B',
              color: '#F0F0EE',
              outline: 'none',
            }}
            onFocus={e => (e.target.style.borderColor = '#7AB619')}
            onBlur={e => (e.target.style.borderColor = '#3D3D3B')}
          />
        </div>

        {/* Filtro push */}
        <select
          value={filtroPush}
          onChange={e => setFiltroPush(e.target.value as typeof filtroPush)}
          className="rounded-lg px-3 py-2.5 text-sm"
          style={{
            background: '#2A2A29',
            border: '1px solid #3D3D3B',
            color: '#9A9A96',
            outline: 'none',
          }}>
          <option value="todos">Todos</option>
          <option value="con_push">Con push</option>
          <option value="sin_push">Sin push</option>
        </select>
      </div>

      {/* Lista */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>

        {clientesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Users size={40} style={{ color: '#3D3D3B' }} className="mb-3" />
            <p className="text-sm" style={{ color: '#5C5C59' }}>
              {busqueda ? 'No se encontraron clientes' : 'No hay clientes registrados'}
            </p>
          </div>
        ) : (
          clientesFiltrados.map(p => (
            <FilaCliente key={p.id} cliente={p} onClick={() => setClienteModal(p)} />
          ))
        )}
      </div>

      {/* Modal detalle */}
      {clienteModal && (
        <ModalCliente
          cliente={clienteModal}
          negocioInfo={negocioInfo}
          onClose={() => setClienteModal(null)}
          onNuevaReceta={() => { setRecetaCliente(clienteModal); setClienteModal(null) }}
        />
      )}

      {/* Modal receta */}
      {recetaCliente && negocioInfo && (
        <RecetaModal
          cliente={recetaCliente}
          negocio={negocioInfo}
          onClose={() => setRecetaCliente(null)}
        />
      )}
    </div>
  )
}
