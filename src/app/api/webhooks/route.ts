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

export async function POST(req: NextRequest) {
  const negocioId = await getNegocioId()
  if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { url, eventos, secret } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL requerida' }, { status: 400 })
  const admin = createAdminClient()
  const { data, error } = await admin.from('negocio_webhooks').insert({ negocio_id: negocioId, url, eventos: eventos ?? ['nuevo_mensaje'], secret: secret ?? null }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ hook: data })
}

export async function DELETE(req: NextRequest) {
  const negocioId = await getNegocioId()
  if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const admin = createAdminClient()
  await admin.from('negocio_webhooks').delete().eq('id', id).eq('negocio_id', negocioId)
  return NextResponse.json({ ok: true })
}
