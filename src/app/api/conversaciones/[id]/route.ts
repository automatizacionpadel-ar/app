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
  if (body.estado && ['abierta','cerrada','pendiente'].includes(body.estado)) updates.estado = body.estado
  if (body.asignado_a !== undefined) updates.asignado_a = body.asignado_a || null
  if (body.unread_count !== undefined) updates.unread_count = body.unread_count
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })
  updates.updated_at = new Date().toISOString()

  const admin = createAdminClient()
  const { data, error } = await admin.from('conversaciones').update(updates).eq('id', params.id).eq('negocio_id', negocioId).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // webhook evento
  if (updates.estado === 'cerrada') {
    // fire-and-forget
    admin.from('audit_logs').insert({ negocio_id: negocioId, accion: 'conversacion_cerrada', entidad: 'conversacion', entidad_id: params.id, payload: body }).then(()=>{})
  }

  return NextResponse.json({ conversacion: data })
}
