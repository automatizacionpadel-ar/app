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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const negocioId = await getNegocioId()
  if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const updates: any = {}
  if (body.nombre !== undefined) updates.nombre = body.nombre
  if (body.descripcion !== undefined) updates.descripcion = body.descripcion
  if (body.precio !== undefined) updates.precio = body.precio
  if (body.imagen_url !== undefined) updates.imagen_url = body.imagen_url
  if (body.activo !== undefined) updates.activo = body.activo
  if (body.orden !== undefined) updates.orden = body.orden
  updates.updated_at = new Date().toISOString()
  const admin = createAdminClient()
  const { data, error } = await admin.from('servicios').update(updates).eq('id', params.id).eq('negocio_id', negocioId).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ servicio: data })
}
