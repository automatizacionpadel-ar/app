import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { dispatchWebhooks } from '@/lib/webhooks'

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
  const { chat_id, conversacion_id, content, cliente_id } = await req.json()
  if (!chat_id || !content?.trim()) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })

  const admin = createAdminClient()

  // resolver cliente_id si no viene
  let resolvedClienteId = cliente_id ?? null
  if (!resolvedClienteId) {
    const { data: conv } = await admin.from('conversaciones').select('cliente_id').eq('chat_id', chat_id).eq('negocio_id', negocioId).maybeSingle()
    resolvedClienteId = (conv as any)?.cliente_id ?? null
  }

  const { data: msg, error } = await admin.from('mensajes').insert({
    negocio_id: negocioId,
    chat_id,
    cliente_id: resolvedClienteId,
    role: 'assistant',
    content: content.trim(),
  }).select('id, created_at').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // marcar como leída (unread 0) y actualizar preview
  if (conversacion_id) {
    await admin.from('conversaciones').update({ unread_count: 0, last_message_preview: content.trim().slice(0,120), last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', conversacion_id)
  } else {
    await admin.from('conversaciones').update({ unread_count: 0, last_message_preview: content.trim().slice(0,120), last_message_at: new Date().toISOString() }).eq('chat_id', chat_id).eq('negocio_id', negocioId)
  }

  // push si tiene subscription
  if (resolvedClienteId) {
    // fire push via existing logic? dispatch webhook y dejar que /api/push/enviar lo haga si se quiere
    dispatchWebhooks(negocioId, 'nuevo_mensaje', { chat_id, cliente_id: resolvedClienteId, content, from: 'empleado' })
  }

  return NextResponse.json({ ok: true, mensaje: msg })
}
