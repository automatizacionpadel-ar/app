// src/app/api/chat/route.ts — Mensajería nativa + n8n async opcional
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const N8N_BASE_URL = process.env.N8N_WEBHOOK_URL ?? 'https://n8n.simplificia.com.ar/webhook/chat-medico'
const N8N_TIMEOUT_MS = 8000

export async function POST(req: NextRequest) {
  try {
    const { negocio_id, chat_id, message, image_url } = await req.json()

    if (!negocio_id || !chat_id || (!message?.trim() && !image_url)) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: negocio } = await supabase
      .from('negocios')
      .select('webhook_token, activo')
      .eq('id', negocio_id)
      .single()

    if (!negocio || !(negocio as any).activo) {
      return NextResponse.json({ error: 'Negocio no encontrado o inactivo' }, { status: 404 })
    }

    const mensajeFinal = [message?.trim() ?? '', image_url ? `[Imagen adjunta: ${image_url}]` : ''].filter(Boolean).join('\n')

    // 1. Persistir mensaje del usuario (siempre, aunque n8n falle)
    const { data: userMsg } = await supabase
      .from('mensajes')
      .insert({
        negocio_id,
        chat_id,
        role: 'user',
        content: message?.trim() ?? '',
        image_url: image_url ?? null,
      })
      .select('id')
      .single()

    // 2. Intentar n8n con timeout — no bloquea indefinidamente
    let n8nData: any = null
    let n8nOk = false
    if ((negocio as any).webhook_token) {
      try {
        const controller = new AbortController()
        const t = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS)
        const res = await fetch(N8N_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webhook_token: (negocio as any).webhook_token,
            chat_id,
            message: mensajeFinal,
          }),
          signal: controller.signal,
        })
        clearTimeout(t)
        if (res.ok) {
          n8nData = await res.json()
          n8nOk = true
        } else {
          console.warn('n8n no-ok:', await res.text())
        }
      } catch (e: any) {
        console.warn('n8n error/timeout:', e?.message ?? e)
      }
    }

    // 3. Resolver cliente_id (desde n8n o por chat_sessions previo)
    let resolvedClienteId: string | null = n8nData?.cliente_id ?? null
    if (!resolvedClienteId && n8nData?.celular) {
      const { data: cli } = await supabase.from('clientes').select('id').eq('negocio_id', negocio_id).eq('celular', n8nData.celular).maybeSingle()
      resolvedClienteId = (cli as any)?.id ?? null
    }
    // Fallback: buscar en chat_sessions si ya existía vínculo
    if (!resolvedClienteId) {
      const { data: sess } = await supabase.from('chat_sessions').select('cliente_id').eq('chat_id', chat_id).maybeSingle()
      resolvedClienteId = (sess as any)?.cliente_id ?? null
    }

    // 4. Contenido del asistente
    const assistantContent =
      (n8nOk && (n8nData.response || n8nData.output)) ||
      (n8nOk ? 'Sin respuesta del asistente' : 'Gracias por tu mensaje. Un asesor te responderá en breve.')

    const { data: assistantMsg } = await supabase
      .from('mensajes')
      .insert({
        negocio_id,
        cliente_id: resolvedClienteId ?? null,
        chat_id,
        role: 'assistant',
        content: assistantContent,
      })
      .select('id')
      .single()

    if (resolvedClienteId && chat_id) {
      await supabase.from('chat_sessions').upsert(
        { chat_id, cliente_id: resolvedClienteId, negocio_id, updated_at: new Date().toISOString() },
        { onConflict: 'chat_id' }
      )
      await supabase.from('mensajes').update({ cliente_id: resolvedClienteId }).eq('chat_id', chat_id).is('cliente_id', null)
    }

    // 5. Fire-and-forget webhook para automatizaciones (si se configura N8N_EVENT_WEBHOOK_URL)
    const eventWebhook = process.env.N8N_EVENT_WEBHOOK_URL
    if (eventWebhook) {
      fetch(eventWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'nuevo_mensaje', negocio_id, chat_id, cliente_id: resolvedClienteId, message: message?.trim() }),
      }).catch(() => {})
    }

    return NextResponse.json({
      response: assistantContent,
      action: n8nData?.action ?? null,
      cliente_id: resolvedClienteId,
      user_message_id: (userMsg as any)?.id ?? null,
      assistant_message_id: (assistantMsg as any)?.id ?? null,
      chat_id,
      via: n8nOk ? 'n8n' : 'fallback',
    })
  } catch (error) {
    console.error('Error en /api/chat:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
