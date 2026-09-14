// src/lib/webhooks.ts — dispatcher para eventos tenant
import { createAdminClient } from '@/lib/supabase/server'

export type WebhookEvent = 'nuevo_mensaje' | 'nuevo_cliente' | 'conversacion_cerrada' | 'conversacion_abierta' | 'notificacion_enviada'

export async function dispatchWebhooks(negocioId: string, evento: WebhookEvent, payload: any) {
  try {
    const supabase = createAdminClient()
    const { data: hooks } = await supabase
      .from('negocio_webhooks')
      .select('url, secret, eventos')
      .eq('negocio_id', negocioId)
      .eq('activo', true)

    if (!hooks?.length) return

    const body = JSON.stringify({ evento, negocio_id: negocioId, timestamp: new Date().toISOString(), data: payload })

    for (const h of hooks as any[]) {
      if (!h.eventos.includes(evento) && !h.eventos.includes('*')) continue
      fetch(h.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(h.secret ? { 'X-Webhook-Secret': h.secret } : {}),
        },
        body,
      }).catch(() => {})
    }
  } catch {}
}
