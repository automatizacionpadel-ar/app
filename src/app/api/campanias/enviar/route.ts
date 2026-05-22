// src/app/api/campanias/enviar/route.ts
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
    const { titulo, contenido, segmento, medico_id } = await req.json()

    if (!titulo || !contenido || !medico_id) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Obtener subscriptions según segmento
    let query = supabase
      .from('push_subscriptions')
      .select('id, subscription, paciente_id')
      .eq('medico_id', medico_id)
      .eq('activo', true)

    if (segmento === 'inactivos_30d') {
      const fecha = new Date()
      fecha.setDate(fecha.getDate() - 30)
      const { data: pacientesInactivos } = await supabase
        .from('pacientes')
        .select('id')
        .eq('medico_id', medico_id)
        .lt('ultima_cita_at', fecha.toISOString())

      const ids = (pacientesInactivos ?? []).map(p => p.id)
      if (ids.length > 0) query = query.in('paciente_id', ids)
      else return NextResponse.json({ enviados: 0, fallidos: 0 })
    }

    if (segmento === 'inactivos_60d') {
      const fecha = new Date()
      fecha.setDate(fecha.getDate() - 60)
      const { data: pacientesInactivos } = await supabase
        .from('pacientes')
        .select('id')
        .eq('medico_id', medico_id)
        .lt('ultima_cita_at', fecha.toISOString())

      const ids = (pacientesInactivos ?? []).map(p => p.id)
      if (ids.length > 0) query = query.in('paciente_id', ids)
      else return NextResponse.json({ enviados: 0, fallidos: 0 })
    }

    const { data: subscriptions } = await query

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ enviados: 0, fallidos: 0 })
    }

    // Payload de la notificación
    const payload = JSON.stringify({
      title: titulo,
      body:  contenido,
      icon:  '/logo.png',
      badge: '/logo.png',
    })

    // Enviar en paralelo
    const resultados = await Promise.allSettled(
      subscriptions.map(sub =>
        webpush.sendNotification(sub.subscription as any, payload)
      )
    )

    let enviados = 0
    let fallidos = 0
    const expiradas: string[] = []

    resultados.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        enviados++
      } else {
        fallidos++
        // Si el error es 410 Gone, la subscription expiró
        const status = (result.reason as any)?.statusCode
        if (status === 410 || status === 404) {
          expiradas.push(subscriptions[i].id)
        }
      }
    })

    // Marcar subscriptions expiradas como inactivas
    if (expiradas.length > 0) {
      await supabase
        .from('push_subscriptions')
        .update({ activo: false })
        .in('id', expiradas)
    }

    // Guardar registro de campaña
    const { data: campania } = await supabase
      .from('mensajes_promo')
      .insert({
        medico_id,
        titulo,
        contenido,
        segmento,
        total_enviados: enviados,
        total_fallidos: fallidos,
        enviado_at: new Date().toISOString(),
        borrador: false,
      })
      .select()
      .single()

    // Log de notificaciones
    await supabase.from('notificaciones_log').insert(
      subscriptions.map((sub, i) => ({
        medico_id,
        paciente_id:          sub.paciente_id,
        push_subscription_id: sub.id,
        promo_id:             campania?.id ?? null,
        tipo:                 'promocional',
        titulo,
        cuerpo:               contenido,
        exitoso:              resultados[i].status === 'fulfilled',
        error_mensaje:        resultados[i].status === 'rejected'
                                ? String((resultados[i] as PromiseRejectedResult).reason)
                                : null,
      }))
    )

    return NextResponse.json({ enviados, fallidos, campania })
  } catch (error) {
    console.error('Error enviando campaña:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
