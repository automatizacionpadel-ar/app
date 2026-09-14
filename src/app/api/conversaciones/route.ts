// GET /api/conversaciones?estado=abierta&etiqueta=xxx&q=...
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

export async function GET(req: NextRequest) {
  const negocioId = await getNegocioId()
  if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const estado = searchParams.get('estado')
  const etiqueta = searchParams.get('etiqueta')
  const q = searchParams.get('q')

  const admin = createAdminClient()
  let query = admin
    .from('conversaciones')
    .select('id, chat_id, cliente_id, estado, asignado_a, unread_count, last_message_at, last_message_preview, clientes(id,nombre,apellido,celular)')
    .eq('negocio_id', negocioId)
    .order('last_message_at', { ascending: false })
    .limit(100)

  if (estado && estado !== 'todas') query = query.eq('estado', estado)

  // filtro por etiqueta requiere join via conversacion_etiquetas
  if (etiqueta) {
    const { data: ids } = await admin.from('conversacion_etiquetas').select('conversacion_id').eq('etiqueta_id', etiqueta)
    const convIds = (ids ?? []).map((r: any) => r.conversacion_id)
    if (convIds.length === 0) return NextResponse.json({ conversaciones: [] })
    query = query.in('id', convIds)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let result = data ?? []
  if (q) {
    const lower = q.toLowerCase()
    result = result.filter((c: any) => {
      const cli = c.clientes
      const nombre = cli ? `${cli.nombre ?? ''} ${cli.apellido ?? ''}`.toLowerCase() : ''
      const cel = cli?.celular ?? ''
      return nombre.includes(lower) || cel.includes(lower) || c.last_message_preview?.toLowerCase().includes(lower)
    })
  }

  return NextResponse.json({ conversaciones: result })
}
