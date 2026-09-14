import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getNegocioId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: miembro } = await supabase.from('negocio_miembros').select('negocio_id').eq('usuario_id', user.id).maybeSingle()
  if ((miembro as any)?.negocio_id) return (miembro as any).negocio_id
  const { data: neg } = await supabase.from('negocios').select('id').eq('usuario_id', user.id).maybeSingle()
  return (neg as any)?.id ?? null
}

export async function POST(req: NextRequest) {
  try {
    const negocioId = await getNegocioId()
    if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { codigo, nombre } = await req.json()
    if (!codigo || !nombre) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })

    const supabase = createAdminClient()
    const { data: negocio } = await supabase.from('negocios').select('slug').eq('id', negocioId).single()
    if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.simplificia.com.ar'
    const url = `${baseUrl}/c/${(negocio as any).slug}?camp=${codigo}`

    const { data: campania, error } = await supabase.from('qr_campanias').insert({ negocio_id: negocioId, codigo, nombre, url }).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 409 })
    return NextResponse.json({ campania })
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const negocioId = await getNegocioId()
    if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
    const supabase = createAdminClient()
    await supabase.from('qr_campanias').delete().eq('id', id).eq('negocio_id', negocioId)
    return NextResponse.json({ ok: true })
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
