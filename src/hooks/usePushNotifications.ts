// src/hooks/usePushNotifications.ts
'use client'

import { useState, useEffect } from 'react'

type PushState = 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported'

export function usePushNotifications(
  clienteId: string | null,
  negocioId: string | null,
  chatId?: string | null,
) {
  const [estado, setEstado] = useState<PushState>('idle')

  // Registrar service worker al montar
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setEstado('unsupported')
      return
    }

    navigator.serviceWorker.register('/sw.js').catch(console.error)

    if (Notification.permission === 'denied') {
      setEstado('denied')
      return
    }

    if (Notification.permission === 'granted') {
      // Verify there's an actual active subscription in the browser
      navigator.serviceWorker.ready.then(reg =>
        reg.pushManager.getSubscription().then(sub => {
          setEstado(sub ? 'granted' : 'idle')
        })
      ).catch(() => setEstado('idle'))
    }
  }, [])

  async function solicitarPermiso() {
    if (!negocioId) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setEstado('unsupported')
      return
    }

    setEstado('loading')

    try {
      // If clienteId wasn't resolved yet, try fetching it via chat session
      let resolvedClienteId = clienteId
      if (!resolvedClienteId && chatId) {
        const r = await fetch(`/api/sesion/cliente?chat_id=${chatId}`)
        if (r.ok) {
          const d = await r.json()
          resolvedClienteId = d.cliente_id ?? null
        }
      }

      // Request permission only if not already granted
      if (Notification.permission !== 'granted') {
        const permiso = await Notification.requestPermission()
        if (permiso !== 'granted') {
          setEstado('denied')
          return
        }
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
      const ua          = navigator.userAgent
      const dispositivo = /mobile/i.test(ua) ? 'mobile' : /tablet/i.test(ua) ? 'tablet' : 'desktop'

      // Guardar subscription via API (service role bypasses RLS)
      const res = await fetch('/api/push/suscribir', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          negocio_id:   negocioId,
          cliente_id:   resolvedClienteId ?? null,
          chat_id:      chatId ?? null,
          user_agent:   ua,
          dispositivo,
        }),
      })

      if (!res.ok) throw new Error('Error guardando suscripción')

      setEstado('granted')
    } catch (err) {
      console.error('Error suscribiendo a push:', err)
      setEstado('idle')
    }
  }

  return { estado, solicitarPermiso }
}

// ─── Helper: convertir clave VAPID de base64 a Uint8Array ────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  const output  = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}
