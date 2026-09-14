// src/app/api/webhooks/n8n/route.ts — n8n puede pushar respuestas async
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { negocio_id, chat_id, cliente_id, content, mensaje, response, webhook_token } = body

    if (!negocio_id || !chat_id || !(content || mensaje || response)) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Validar webhook_token si se envía
    if (webhook_token) {
      const { data: negocio } = await supabase.from('negocios').select('webhook_token').eq('id', negocio_id).single()
      if (!negocio || (negocio as any).webhook_token !== webhook_token) {
        return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
      }
    }

    const text = content ?? mensaje ?? response

    const { data: msg, error } = await supabase.from('mensajes').insert({
      negocio_id,
      cliente_id: cliente_id ?? null,
      chat_id,
      role: 'assistant',
      content: text,
    }).select('id').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Push notification opcional si se pide
    // (el caller puede luego llamar a /api/push/enviar)

    return NextResponse.json({ ok: true, id: (msg as any).id })
  } catch (e: any) {
    console.error('webhook n8n error', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
