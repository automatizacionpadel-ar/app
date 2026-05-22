// src/hooks/usePushNotifications.ts
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type PushState = 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported'

export function usePushNotifications(pacienteId: string | null, medicoId: string | null) {
  const [estado, setEstado] = useState<PushState>('idle')

  // Registrar service worker al montar
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setEstado('unsupported')
      return
    }

    navigator.serviceWorker.register('/sw.js').catch(console.error)

    // Verificar estado actual del permiso
    if (Notification.permission === 'granted') setEstado('granted')
    if (Notification.permission === 'denied')  setEstado('denied')
  }, [])

  async function solicitarPermiso() {
    if (!pacienteId || !medicoId) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setEstado('unsupported')
      return
    }

    setEstado('loading')

    try {
      // Pedir permiso al usuario
      const permiso = await Notification.requestPermission()

      if (permiso !== 'granted') {
        setEstado('denied')
        return
      }

      // Obtener el registration del service worker
      const registration = await navigator.serviceWorker.ready

      // Suscribirse al push server con la clave VAPID pública
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })

      // Detectar tipo de dispositivo
      const ua         = navigator.userAgent
      const dispositivo = /mobile/i.test(ua) ? 'mobile' : /tablet/i.test(ua) ? 'tablet' : 'desktop'

      // Guardar subscription en Supabase
      const supabase = createClient()
      const { error } = await supabase.from('push_subscriptions').insert({
        paciente_id:  pacienteId,
        medico_id:    medicoId,
        subscription: subscription.toJSON(),
        user_agent:   ua.slice(0, 200),
        dispositivo,
        activo:       true,
      })

      if (error) {
        // Si ya existe (unique constraint), ignorar
        if (!error.message.includes('duplicate')) throw error
      }

      // Actualizar flag en pacientes
      await supabase
        .from('pacientes')
        .update({ push_activo: true })
        .eq('id', pacienteId)

      setEstado('granted')
    } catch (err) {
      console.error('Error suscribiendo a push:', err)
      setEstado('idle')
    }
  }

  return { estado, solicitarPermiso }
}

// ─── Helper: convertir clave VAPID de base64 a Uint8Array ────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding  = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData  = atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}
