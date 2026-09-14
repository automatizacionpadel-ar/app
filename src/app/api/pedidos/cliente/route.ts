import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { negocio_id, chat_id, items } = await req.json()
    if (!negocio_id || !items?.length) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    const admin = createAdminClient()

    // resolver cliente_id via chat_sessions
    let clienteId: string | null = null
    if (chat_id) {
      const { data: sess } = await admin.from('chat_sessions').select('cliente_id').eq('chat_id', chat_id).maybeSingle()
      clienteId = (sess as any)?.cliente_id ?? null
    }

    let total = 0
    const resolved: any[] = []
    for (const it of items) {
      const { data: serv } = await admin.from('servicios').select('nombre, precio').eq('id', it.servicio_id).maybeSingle()
      const precio = serv ? Number(serv.precio) : 0
      const cantidad = Number(it.cantidad) || 1
      total += precio * cantidad
      resolved.push({ servicio_id: it.servicio_id, nombre: serv?.nombre ?? 'Item', precio, cantidad, subtotal: precio*cantidad })
    }

    const { data: pedido } = await admin.from('pedidos').insert({ negocio_id, cliente_id: clienteId, chat_id: chat_id ?? null, total, estado: 'pendiente' }).select('id').single()
    if (!pedido) return NextResponse.json({ error: 'Error creando pedido' }, { status: 500 })
    await admin.from('pedido_items').insert(resolved.map(r=> ({ ...r, pedido_id: (pedido as any).id })))

    // crear mensaje en el chat
    const resumen = resolved.map(r=> `• ${r.nombre} x${r.cantidad} - $${r.subtotal}`).join('\n')
    const contenido = `🛒 Nuevo pedido #${(pedido as any).id.slice(0,8)}\n${resumen}\n\nTotal: $${total.toLocaleString('es-AR')}\nTe confirmamos en breve.`

    await admin.from('mensajes').insert({ negocio_id, chat_id: chat_id ?? `pedido-${(pedido as any).id}`, cliente_id: clienteId, role: 'assistant', content: contenido })

    // también mensaje del cliente
    if (chat_id) {
      await admin.from('mensajes').insert({ negocio_id, chat_id, cliente_id: clienteId, role: 'user', content: `Quiero hacer este pedido:\n${resumen}` })
    }

    return NextResponse.json({ ok: true, pedido_id: (pedido as any).id })
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
