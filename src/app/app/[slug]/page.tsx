// src/app/app/[slug]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { MessageCircle, Bell, BellOff, Loader2 } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

interface NegocioPublico {
  id:                  string
  slug:                string
  nombre:              string
  rubro:               string
  logo_url?:           string | null
  color_marca?:        string | null
  mensaje_bienvenida?: string
}

export default function AppPage({ params }: { params: { slug: string } }) {
  const { slug }  = params
  const router    = useRouter()

  const [medico, setMedico]   = useState<NegocioPublico | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatId]              = useState(() => {
    if (typeof window === 'undefined') return ''
    const stored = localStorage.getItem('simplificia_chat_id')
    if (stored) return stored
    const nuevo = crypto.randomUUID()
    localStorage.setItem('simplificia_chat_id', nuevo)
    return nuevo
  })

  const { estado: pushEstado, solicitarPermiso } = usePushNotifications(
    chatId || null,
    medico?.id ?? null
  )

  useEffect(() => {
    fetch(`/api/negocios/publico?slug=${slug}`)
      .then(r => r.json())
      .then(data => { setMedico(data.error ? null : data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug])

  function irAlChat() {
    router.push(`/app/${slug}/chat`)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: '#7AB619' }} />
      </div>
    )
  }

  if (!medico) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Image src="/logo.png" alt="SimplificIA" width={200} height={53} className="mb-6" style={{ mixBlendMode: 'screen' }} />
        <p className="text-sm" style={{ color: '#5C5C59' }}>
          Link inválido. Pedile al consultorio el link correcto.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-up">

      <Image src="/logo.png" alt="SimplificIA" width={175} height={45} className="mb-8" style={{ mixBlendMode: 'screen' }} />

      {medico.logo_url
        ? (
          <div className="w-16 h-16 rounded-full overflow-hidden mb-4 flex-shrink-0"
            style={{ border: `2px solid ${medico.color_marca ?? '#7AB619'}33` }}>
            <img src={medico.logo_url} alt={medico.nombre} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-4"
            style={{ background: `${medico.color_marca ?? '#7AB619'}26`, color: medico.color_marca ?? '#7AB619' }}>
            {medico.nombre.charAt(0)}
          </div>
        )
      }

      <h1 className="text-xl font-bold mb-1" style={{ color: '#F0F0EE' }}>
        {medico.nombre}
      </h1>
      <p className="text-sm mb-2" style={{ color: '#9A9A96' }}>
        {medico.rubro}
      </p>

      {medico.mensaje_bienvenida && (
        <p className="text-sm mb-8 max-w-xs" style={{ color: '#5C5C59' }}>
          {medico.mensaje_bienvenida}
        </p>
      )}

      <div className="w-full max-w-xs space-y-3">

        <button onClick={irAlChat}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-semibold transition-all active:scale-[0.98]"
          style={{ background: medico.color_marca ?? '#7AB619', color: '#fff' }}>
          <MessageCircle size={18} />
          Hablar con el asistente
        </button>

        {pushEstado === 'idle' && (
          <button onClick={solicitarPermiso}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-medium transition-all active:scale-[0.98]"
            style={{ background: '#2A2A29', border: '1px solid #3D3D3B', color: '#9A9A96' }}>
            <Bell size={18} />
            Activar recordatorios de citas
          </button>
        )}

        {pushEstado === 'loading' && (
          <div className="w-full flex items-center justify-center gap-2 rounded-xl py-4"
            style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
            <Loader2 size={16} className="animate-spin" style={{ color: medico.color_marca ?? '#7AB619' }} />
            <span className="text-sm" style={{ color: '#9A9A96' }}>Activando...</span>
          </div>
        )}

        {pushEstado === 'granted' && (
          <div className="w-full flex items-center justify-center gap-2 rounded-xl py-3"
            style={{ background: `${medico.color_marca ?? '#7AB619'}1A`, border: `1px solid ${medico.color_marca ?? '#7AB619'}33` }}>
            <Bell size={16} style={{ color: medico.color_marca ?? '#7AB619' }} />
            <span className="text-sm" style={{ color: medico.color_marca ?? '#7AB619' }}>Recordatorios activados ✓</span>
          </div>
        )}

        {pushEstado === 'denied' && (
          <div className="w-full flex items-center justify-center gap-2 rounded-xl py-3"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <BellOff size={16} style={{ color: '#EF4444' }} />
            <span className="text-sm" style={{ color: '#EF4444' }}>Notificaciones bloqueadas</span>
          </div>
        )}

        {pushEstado === 'unsupported' && (
          <p className="text-xs text-center" style={{ color: '#5C5C59' }}>
            Tu navegador no soporta notificaciones push.
            Instalá la app en tu pantalla de inicio para activarlas.
          </p>
        )}
      </div>

      <p className="text-xs mt-8" style={{ color: '#5C5C59' }}>
        💡 Instalá esta app en tu celular para acceder más rápido
      </p>
    </div>
  )
}
