// src/app/dashboard/mensajeria/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MensajeriaCliente from './MensajeriaCliente'

export default async function MensajeriaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id')
    .eq('usuario_id', user.id)
    .single()

  if (!negocio) redirect('/dashboard')

  // Conversations: latest message per chat_id, joined with cliente
  const { data: conversaciones } = await supabase
    .from('mensajes')
    .select(`
      chat_id,
      content,
      role,
      created_at,
      cliente_id,
      clientes ( id, nombre, apellido, celular )
    `)
    .eq('negocio_id', negocio.id)
    .order('created_at', { ascending: false })

  // Deduplicate to one row per chat_id (most recent message)
  const vistas = new Map<string, typeof conversaciones>()
  for (const msg of conversaciones ?? []) {
    if (!vistas.has(msg.chat_id)) vistas.set(msg.chat_id, msg as any)
  }
  const convs = Array.from(vistas.values())

  return <MensajeriaCliente negocioId={negocio.id} conversaciones={convs as any} />
}
