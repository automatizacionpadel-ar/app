import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { subscription, negocio_id, cliente_id, chat_id, user_agent, dispositivo } = await req.json()

    if (!subscription || !negocio_id) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()

    let resolvedClienteId = cliente_id ?? null

    // Look up cliente_id from chat session if not provided
    if (!resolvedClienteId && chat_id) {
      const { data: msg } = await supabase
        .from('mensajes')
        .select('cliente_id')
        .eq('chat_id', chat_id)
        .not('cliente_id', 'is', null)
        .limit(1)
        .maybeSingle()
      resolvedClienteId = msg?.cliente_id ?? null
    }

    const { error } = await supabase.from('push_subscriptions').insert({
      cliente_id:   resolvedClienteId,
      negocio_id,
      subscription,
      user_agent:   (user_agent ?? '').slice(0, 200),
      dispositivo:  dispositivo ?? 'mobile',
      activo:       true,
    })

    if (error) {
      if (error.message.includes('duplicate') || error.code === '23505') {
        return NextResponse.json({ ok: true })
      }
      console.error('Error guardando suscripción:', error)
      return NextResponse.json({ error: 'Error al guardar suscripción' }, { status: 500 })
    }

    if (resolvedClienteId) {
      await supabase
        .from('clientes')
        .update({ push_activo: true })
        .eq('id', resolvedClienteId)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error en /api/push/suscribir:', err)
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}
