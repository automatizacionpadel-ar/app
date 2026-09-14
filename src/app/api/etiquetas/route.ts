// src/app/api/etiquetas/route.ts — CRUD etiquetas por tenant
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getNegocioId(): Promise<string | null> {
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
  const { data, error } = await admin.from('etiquetas').select('*').eq('negocio_id', negocioId).order('nombre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ etiquetas: data ?? [] })
}

export async function POST(req: NextRequest) {
  const negocioId = await getNegocioId()
  if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { nombre, color } = await req.json()
  if (!nombre?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  const admin = createAdminClient()
  const { data, error } = await admin.from('etiquetas').insert({ negocio_id: negocioId, nombre: nombre.trim(), color: color ?? '#7AB619' }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 409 })
  return NextResponse.json({ etiqueta: data })
}

export async function DELETE(req: NextRequest) {
  const negocioId = await getNegocioId()
  if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const admin = createAdminClient()
  const { error } = await admin.from('etiquetas').delete().eq('id', id).eq('negocio_id', negocioId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
