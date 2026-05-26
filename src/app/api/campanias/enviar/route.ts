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
    const { titulo, contenido, segmento, negocio_id } = await req.json()

    if (!titulo || !contenido || !negocio_id) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get negocio slug to build the chat URL
    const { data: negocio } = await supabase
      .from('negocios')
      .select('slug')
      .eq('id', negocio_id)
      .single()

    const chatBaseUrl = `https://app.simplificia.com.ar/app/${negocio?.slug}/chat`

    // Build subscriptions query by segment
    let query = supabase
      .from('push_subscriptions')
      .select('id, subscription, cliente_id')
      .eq('negocio_id', negocio_id)
      .eq('activo', true)

    if (segmento === 'inactivos_30d') {
      const fecha = new Date()
      fecha.setDate(fecha.getDate() - 30)
      const { data: clientesInactivos } = await supabase
        .from('clientes')
        .select('id')
        .eq('negocio_id', negocio_id)
        .lt('ultima_cita_at', fecha.toISOString())

      const ids = (clientesInactivos ?? []).map(p => p.id)
      if (ids.length > 0) query = query.in('cliente_id', ids)
      else return NextResponse.json({ enviados: 0, fallidos: 0 })
    }

    if (segmento === 'inactivos_60d') {
      const fecha = new Date()
      fecha.setDate(fecha.getDate() - 60)
      const { data: clientesInactivos } = await supabase
        .from('clientes')
        .select('id')
        .eq('negocio_id', negocio_id)
        .lt('ultima_cita_at', fecha.toISOString())

      const ids = (clientesInactivos ?? []).map(p => p.id)
      if (ids.length > 0) query = query.in('cliente_id', ids)
      else return NextResponse.json({ enviados: 0, fallidos: 0 })
    }

    const { data: subscriptions } = await query

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ enviados: 0, fallidos: 0 })
    }

    // Notification payload — title only, body is a tap prompt
    // Full content is delivered as a message in the chat
    const payload = JSON.stringify({
      title: titulo,
      body:  'Tocá para ver el mensaje completo',
      icon:  '/logo.png',
      badge: '/logo.png',
      data: {
        tag: 'campania',
        url: chatBaseUrl,
      },
    })

    // Send push notifications in parallel
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
        const status = (result.reason as any)?.statusCode
        if (status === 410 || status === 404) expiradas.push(subscriptions[i].id)
      }
    })

    if (expiradas.length > 0) {
      await supabase.from('push_subscriptions').update({ activo: false }).in('id', expiradas)
    }

    // Insert campaign content as a chat message for each client that has a session
    const clienteIds = subscriptions.map(s => s.cliente_id).filter(Boolean)
    if (clienteIds.length > 0) {
      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('chat_id, cliente_id')
        .in('cliente_id', clienteIds)
        .eq('negocio_id', negocio_id)

      if (sessions && sessions.length > 0) {
        await supabase.from('mensajes').insert(
          sessions.map(s => ({
            negocio_id,
            chat_id:    s.chat_id,
            cliente_id: s.cliente_id,
            role:       'assistant',
            content:    contenido,
          }))
        )
      }
    }

    // Save campaign record
    const { data: campania } = await supabase
      .from('mensajes_promo')
      .insert({
        negocio_id,
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

    // Log notifications
    await supabase.from('notificaciones_log').insert(
      subscriptions.map((sub, i) => ({
        negocio_id,
        cliente_id:           sub.cliente_id,
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
