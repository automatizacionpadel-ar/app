// src/app/app/page.tsx
// Página de entrada de la PWA para el paciente
// URL: /app?m=MEDICO_ID
// El médico comparte este link a sus pacientes

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { MessageCircle, Bell, BellOff, Loader2 } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

interface MedicoPublico {
  id:             string
  nombre_completo: string
  especialidad:   string
  mensaje_bienvenida?: string
}

export default function AppPage() {
  const params   = useSearchParams()
  const router   = useRouter()
  const medicoId = params.get('m')

  const [medico, setMedico]   = useState<MedicoPublico | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatId]              = useState(() => {
    // Generar o recuperar chat_id persistente del dispositivo
    if (typeof window === 'undefined') return ''
    const stored = localStorage.getItem('simplificia_chat_id')
    if (stored) return stored
    const nuevo = crypto.randomUUID()
    localStorage.setItem('simplificia_chat_id', nuevo)
    return nuevo
  })

  const { estado: pushEstado, solicitarPermiso } = usePushNotifications(
    chatId || null,  // acá usamos chat_id como paciente_id temporal
    medicoId
  )

  useEffect(() => {
    if (!medicoId) { setLoading(false); return }

    fetch(`/api/medicos/publico?id=${medicoId}`)
      .then(r => r.json())
      .then(data => { setMedico(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [medicoId])

  function irAlChat() {
    if (!medicoId) return
    router.push(`/app/chat?m=${medicoId}`)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: '#7AB619' }} />
      </div>
    )
  }

  if (!medicoId || !medico) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Image src="/logo.png" alt="SimplificIA" width={160} height={42} className="mb-6" />
        <p className="text-sm" style={{ color: '#5C5C59' }}>
          Link inválido. Pedile al consultorio el link correcto.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-up">

      {/* Logo */}
      <Image src="/logo.png" alt="SimplificIA" width={140} height={36} className="mb-8" />

      {/* Info del médico */}
      <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-4"
        style={{ background: 'rgba(122,182,25,0.15)', color: '#7AB619' }}>
        {medico.nombre_completo.charAt(0)}
      </div>

      <h1 className="text-xl font-bold mb-1" style={{ color: '#F0F0EE' }}>
        {medico.nombre_completo}
      </h1>
      <p className="text-sm mb-2" style={{ color: '#9A9A96' }}>
        {medico.especialidad}
      </p>

      {medico.mensaje_bienvenida && (
        <p className="text-sm mb-8 max-w-xs" style={{ color: '#5C5C59' }}>
          {medico.mensaje_bienvenida}
        </p>
      )}

      {/* Acciones */}
      <div className="w-full max-w-xs space-y-3">

        {/* Ir al chat */}
        <button onClick={irAlChat}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-semibold transition-all active:scale-[0.98]"
          style={{ background: '#7AB619', color: '#20201F' }}>
          <MessageCircle size={18} />
          Hablar con el asistente
        </button>

        {/* Push notifications */}
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
            <Loader2 size={16} className="animate-spin" style={{ color: '#7AB619' }} />
            <span className="text-sm" style={{ color: '#9A9A96' }}>Activando...</span>
          </div>
        )}

        {pushEstado === 'granted' && (
          <div className="w-full flex items-center justify-center gap-2 rounded-xl py-3"
            style={{ background: 'rgba(122,182,25,0.1)', border: '1px solid rgba(122,182,25,0.2)' }}>
            <Bell size={16} style={{ color: '#7AB619' }} />
            <span className="text-sm" style={{ color: '#7AB619' }}>Recordatorios activados ✓</span>
          </div>
        )}

        {pushEstado === 'denied' && (
          <div className="w-full flex items-center justify-center gap-2 rounded-xl py-3"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <BellOff size={16} style={{ color: '#EF4444' }} />
            <span className="text-sm" style={{ color: '#EF4444' }}>
              Notificaciones bloqueadas
            </span>
          </div>
        )}

        {pushEstado === 'unsupported' && (
          <p className="text-xs text-center" style={{ color: '#5C5C59' }}>
            Tu navegador no soporta notificaciones push.
            Instalá la app en tu pantalla de inicio para activarlas.
          </p>
        )}
      </div>

      {/* Instrucción instalar PWA */}
      <p className="text-xs mt-8" style={{ color: '#5C5C59' }}>
        💡 Instalá esta app en tu celular para acceder más rápido
      </p>
    </div>
  )
}
