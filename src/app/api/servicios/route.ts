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
  const negocioId = req.nextUrl.searchParams.get('negocio_id')
  // público si viene negocio_id por query (PWA), sino requiere auth
  if (negocioId) {
    const admin = createAdminClient()
    const { data, error } = await admin.from('servicios').select('*').eq('negocio_id', negocioId).eq('activo', true).order('orden').order('nombre')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ servicios: data ?? [] })
  }
  const id = await getNegocioId()
  if (!id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const admin = createAdminClient()
  const { data, error } = await admin.from('servicios').select('*').eq('negocio_id', id).order('orden').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ servicios: data ?? [] })
}

export async function POST(req: NextRequest) {
  const negocioId = await getNegocioId()
  if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const { nombre, descripcion, precio, imagen_url, activo, orden } = body
  if (!nombre?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  const admin = createAdminClient()
  const { data, error } = await admin.from('servicios').insert({
    negocio_id: negocioId,
    nombre: nombre.trim(),
    descripcion: descripcion?.trim() || null,
    precio: Number(precio) || 0,
    imagen_url: imagen_url || null,
    activo: activo ?? true,
    orden: orden ?? 0,
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ servicio: data })
}

export async function DELETE(req: NextRequest) {
  const negocioId = await getNegocioId()
  if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const admin = createAdminClient()
  const { error } = await admin.from('servicios').delete().eq('id', id).eq('negocio_id', negocioId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
