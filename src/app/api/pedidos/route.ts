import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getNegocioId() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: m } = await supabase.from('negocio_miembros').select('negocio_id').eq('usuario_id', user.id).maybeSingle()
  if ((m as any)?.negocio_id) return (m as any).negocio_id
  const { data: n } = await supabase.from('negocios').select('id').eq('usuario_id', user.id).maybeSingle()
  return (n as any)?.id ?? null
}

export async function GET() {
  const negocioId = await getNegocioId()
  if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const admin = createAdminClient()
  const { data, error } = await admin.from('pedidos').select('*, clientes(nombre, apellido, celular), pedido_items(*)').eq('negocio_id', negocioId).order('created_at', { ascending: false }).limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pedidos: data ?? [] })
}

export async function POST(req: NextRequest) {
  const negocioId = await getNegocioId()
  if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { cliente_id, items, notas } = await req.json() // items: [{servicio_id, cantidad}]
  if (!items?.length) return NextResponse.json({ error: 'Items requeridos' }, { status: 400 })
  const admin = createAdminClient()
  // calcular total
  let total = 0
  const resolvedItems: any[] = []
  for (const it of items) {
    const { data: serv } = await admin.from('servicios').select('nombre, precio').eq('id', it.servicio_id).maybeSingle()
    const precio = serv ? Number(serv.precio) : Number(it.precio) || 0
    const cantidad = Number(it.cantidad) || 1
    total += precio * cantidad
    resolvedItems.push({ servicio_id: it.servicio_id ?? null, nombre: serv?.nombre ?? it.nombre ?? 'Item', precio, cantidad, subtotal: precio * cantidad })
  }
  const { data: pedido, error } = await admin.from('pedidos').insert({ negocio_id: negocioId, cliente_id: cliente_id || null, total, notas: notas || null }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (resolvedItems.length) {
    await admin.from('pedido_items').insert(resolvedItems.map(ri => ({ ...ri, pedido_id: pedido.id })))
  }
  return NextResponse.json({ pedido })
}
