// src/app/dashboard/mensajeria/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MensajeriaCliente from './MensajeriaCliente'

export default async function MensajeriaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Resolver negocio via membresía (compatible legacy)
  let negocioId: string | null = null

  const { data: miembro } = await supabase
    .from('negocio_miembros')
    .select('negocio_id')
    .eq('usuario_id', user.id)
    .maybeSingle()

  if ((miembro as any)?.negocio_id) {
    negocioId = (miembro as any).negocio_id
  } else {
    const { data: negocio } = await supabase.from('negocios').select('id').eq('usuario_id', user.id).maybeSingle()
    negocioId = (negocio as any)?.id ?? null
  }

  if (!negocioId) redirect('/dashboard')

  // Intentar leer conversaciones (nueva tabla); fallback a mensajes dedup
  let conversaciones: any[] = []

  const { data: convs, error: convErr } = await supabase
    .from('conversaciones')
    .select(`
      id,
      chat_id,
      last_message_preview,
      estado,
      unread_count,
      last_message_at,
      cliente_id,
      clientes ( id, nombre, apellido, celular )
    `)
    .eq('negocio_id', negocioId)
    .order('last_message_at', { ascending: false })
    .limit(100)

  if (!convErr && convs && convs.length > 0) {
    conversaciones = convs.map((c: any) => ({
      id: c.id,
      chat_id: c.chat_id,
      content: c.last_message_preview ?? '',
      role: 'user' as const,
      created_at: c.last_message_at,
      cliente_id: c.cliente_id,
      clientes: c.clientes,
      estado: c.estado,
      unread_count: c.unread_count,
    }))
  } else {
    const { data: msgs } = await supabase
      .from('mensajes')
      .select(`chat_id, content, role, created_at, cliente_id, clientes ( id, nombre, apellido, celular )`)
      .eq('negocio_id', negocioId)
      .order('created_at', { ascending: false })
      .limit(500)

    const vistas = new Map<string, any>()
    for (const msg of msgs ?? []) {
      if (!vistas.has((msg as any).chat_id)) vistas.set((msg as any).chat_id, msg as any)
    }
    conversaciones = Array.from(vistas.values())
  }

  return <MensajeriaCliente negocioId={negocioId} conversaciones={conversaciones as any} />
}
