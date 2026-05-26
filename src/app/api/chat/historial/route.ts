import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const negocio_id = searchParams.get('negocio_id')
  const chat_id    = searchParams.get('chat_id')

  if (!negocio_id || !chat_id) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: mensajes, error } = await supabase
    .from('mensajes')
    .select('id, role, content, image_url, created_at')
    .eq('negocio_id', negocio_id)
    .eq('chat_id', chat_id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Error cargando historial' }, { status: 500 })
  }

  return NextResponse.json(
    { mensajes: mensajes ?? [] },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
