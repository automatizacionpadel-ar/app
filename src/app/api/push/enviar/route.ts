// src/app/api/push/enviar/route.ts
// Endpoint interno para enviar push a un paciente específico
// Usado por: confirmación de cita, recordatorios manuales

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { cliente_id, negocio_id, titulo, cuerpo, tipo, cita_id, url } = await req.json()

    if (!cliente_id || !titulo || !cuerpo) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Obtener todas las subscriptions activas del paciente
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('cliente_id', cliente_id)
      .eq('activo', true)

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ enviados: 0, mensaje: 'Sin subscriptions activas' })
    }

    const payload = JSON.stringify({
      title: titulo,
      body:  cuerpo,
      icon:  '/logo.png',
      badge: '/logo.png',
      data: {
        tag:     tipo || 'general',
        cita_id: cita_id || null,
        url:     url || null,
      },
    })

    const resultados = await Promise.allSettled(
      subscriptions.map(sub =>
        webpush.sendNotification(sub.subscription as any, payload)
      )
    )

    let enviados = 0
    const expiradas: string[] = []

    resultados.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        enviados++
      } else {
        const status = (result.reason as any)?.statusCode
        if (status === 410 || status === 404) expiradas.push(subscriptions[i].id)
      }
    })

    // Marcar expiradas
    if (expiradas.length > 0) {
      await supabase.from('push_subscriptions').update({ activo: false }).in('id', expiradas)
    }

    // Log
    if (negocio_id) {
      await supabase.from('notificaciones_log').insert(
        subscriptions.map((sub, i) => ({
          negocio_id,
          cliente_id,
          push_subscription_id: sub.id,
          cita_id:    cita_id || null,
          tipo:       tipo || 'confirmacion',
          titulo,
          cuerpo,
          exitoso:    resultados[i].status === 'fulfilled',
          error_mensaje: resultados[i].status === 'rejected'
            ? String((resultados[i] as PromiseRejectedResult).reason)
            : null,
        }))
      )
    }

    return NextResponse.json({ enviados, total: subscriptions.length })
  } catch (error) {
    console.error('Error en /api/push/enviar:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
