'use client'

import { useState, useTransition } from 'react'
import { Briefcase, CheckCircle, XCircle, FileText } from 'lucide-react'

export function NegocioRow({ negocio }: {
  negocio: {
    id: string; nombre: string; rubro: string; activo: boolean
    habilitar_recetas: boolean; webhook_token: string
  }
}) {
  const [recetas, setRecetas] = useState(negocio.habilitar_recetas)
  const [pending, startTransition] = useTransition()

  function toggleRecetas() {
    const nuevoValor = !recetas
    setRecetas(nuevoValor)
    startTransition(async () => {
      const res = await fetch('/api/negocios/actualizar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ negocio_id: negocio.id, habilitar_recetas: nuevoValor }),
      })
      if (!res.ok) setRecetas(!nuevoValor)
    })
  }

  return (
    <div className="flex items-center gap-4 px-5 py-4 transition-colors"
      style={{ borderBottom: '1px solid #3D3D3B' }}>
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(122,182,25,0.12)', color: '#7AB619' }}>
        <Briefcase size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>{negocio.nombre}</p>
        <p className="text-xs" style={{ color: '#5C5C59' }}>{negocio.rubro}</p>
      </div>
      <div className="flex items-center gap-3">
        {negocio.activo ? (
          <span className="flex items-center gap-1 text-xs" style={{ color: '#7AB619' }}>
            <CheckCircle size={13} /> Activo
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs" style={{ color: '#EF4444' }}>
            <XCircle size={13} /> Inactivo
          </span>
        )}
        <button
          onClick={toggleRecetas}
          disabled={pending}
          className="flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 transition-all"
          style={{
            background: recetas ? 'rgba(139,92,246,0.15)' : 'rgba(92,92,89,0.15)',
            color:      recetas ? '#8B5CF6' : '#5C5C59',
            border:     `1px solid ${recetas ? 'rgba(139,92,246,0.3)' : '#3D3D3B'}`,
          }}>
          <FileText size={12} />
          {recetas ? 'Recetas ✓' : 'Recetas'}
        </button>
        <code className="text-[10px] rounded px-2 py-1"
          style={{ background: '#20201F', color: '#5C5C59' }}>
          {negocio.webhook_token.slice(0, 12)}...
        </code>
      </div>
    </div>
  )
}
