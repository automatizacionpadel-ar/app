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

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const admin = createAdminClient()
  const { data, error } = await admin.from('cliente_etiquetas').select('etiqueta_id, etiquetas(id,nombre,color)').eq('cliente_id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ etiquetas: data?.map((r: any) => r.etiquetas) ?? [] })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const negocioId = await getNegocioId()
  if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { etiqueta_id } = await req.json()
  if (!etiqueta_id) return NextResponse.json({ error: 'Falta etiqueta_id' }, { status: 400 })
  const admin = createAdminClient()
  // verificar etiqueta pertenece al tenant
  const { data: et } = await admin.from('etiquetas').select('id').eq('id', etiqueta_id).eq('negocio_id', negocioId).maybeSingle()
  if (!et) return NextResponse.json({ error: 'Etiqueta no pertenece al negocio' }, { status: 403 })
  const { error } = await admin.from('cliente_etiquetas').insert({ cliente_id: params.id, etiqueta_id }).select()
  if (error && !error.message.includes('duplicate')) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const etiquetaId = req.nextUrl.searchParams.get('etiqueta_id')
  if (!etiquetaId) return NextResponse.json({ error: 'Falta etiqueta_id' }, { status: 400 })
  const admin = createAdminClient()
  await admin.from('cliente_etiquetas').delete().eq('cliente_id', params.id).eq('etiqueta_id', etiquetaId)
  return NextResponse.json({ ok: true })
}
