// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const N8N_BASE_URL = process.env.N8N_WEBHOOK_URL ?? 'https://n8n.simplificia.com.ar/webhook/chat-medico'

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

    if (!negocio || !negocio.activo) {
      return NextResponse.json({ error: 'Negocio no encontrado o inactivo' }, { status: 404 })
    }

    const mensajeFinal = [
      message?.trim() ?? '',
      image_url ? `[Imagen adjunta: ${image_url}]` : '',
    ].filter(Boolean).join('\n')

    // Persist user message (cliente_id may be null at this point, updated after response)
    await supabase.from('mensajes').insert({
      negocio_id: negocio_id,
      chat_id,
      role:       'user',
      content:    message?.trim() ?? '',
      image_url:  image_url ?? null,
    })

    const n8nResponse = await fetch(N8N_BASE_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhook_token: negocio.webhook_token,
        chat_id,
        message: mensajeFinal,
      }),
    })

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text()
      console.error('Error desde n8n:', errorText)
      return NextResponse.json(
        { error: 'El asistente no está disponible en este momento' },
        { status: 503 }
      )
    }

    const data = await n8nResponse.json()

    let resolvedClienteId: string | null = data.cliente_id ?? null

    if (!resolvedClienteId && data.celular && negocio_id) {
      const { data: cli } = await supabase
        .from('clientes')
        .select('id')
        .eq('negocio_id', negocio_id)
        .eq('celular', data.celular)
        .maybeSingle()
      resolvedClienteId = cli?.id ?? null
    }

    // Persist assistant response
    const assistantContent = data.response || data.output || 'Sin respuesta del asistente'
    await supabase.from('mensajes').insert({
      negocio_id: negocio_id,
      cliente_id: resolvedClienteId ?? null,
      chat_id,
      role:    'assistant',
      content: assistantContent,
    })

    if (resolvedClienteId && chat_id) {
      await supabase.from('chat_sessions').upsert(
        { chat_id, cliente_id: resolvedClienteId, negocio_id, updated_at: new Date().toISOString() },
        { onConflict: 'chat_id' }
      )
      // Backfill cliente_id on the user message we just saved
      await supabase.from('mensajes')
        .update({ cliente_id: resolvedClienteId })
        .eq('chat_id', chat_id)
        .is('cliente_id', null)
    }

    return NextResponse.json({
      response:   data.response || data.output || 'Sin respuesta del asistente',
      action:     data.action ?? null,
      cliente_id: resolvedClienteId,
      chat_id,
    })
  } catch (error) {
    console.error('Error en /api/chat:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
