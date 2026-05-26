// src/app/api/clientes/registrar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    let body: { negocio_id?: string; medico_id?: string; nombre?: string; apellido?: string; celular?: string; chat_id?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    // medico_id is the legacy field name sent by older n8n workflow nodes
    const { nombre, celular, chat_id, apellido } = body
    let negocio_id = body.negocio_id ?? body.medico_id

    const supabase = createAdminClient()

    // If negocio_id missing but chat_id present, look it up from mensajes table
    if (!negocio_id && chat_id) {
      const { data: msg } = await supabase
        .from('mensajes')
        .select('negocio_id')
        .eq('chat_id', chat_id)
        .limit(1)
        .maybeSingle()
      negocio_id = msg?.negocio_id ?? undefined
    }

    if (!negocio_id || !nombre || !celular) {
      return NextResponse.json({ error: 'Faltan campos requeridos: negocio_id, nombre, celular' }, { status: 400 })
    }

    const { data: cliente, error: errCliente } = await supabase
      .from('clientes')
      .upsert(
        { negocio_id, nombre, apellido: apellido ?? null, celular },
        { onConflict: 'negocio_id,celular', ignoreDuplicates: false }
      )
      .select('id')
      .single()

    if (errCliente || !cliente) {
      return NextResponse.json({ error: 'Error al registrar cliente' }, { status: 500 })
    }

    if (chat_id) {
      await supabase
        .from('chat_sessions')
        .upsert(
          { chat_id, cliente_id: cliente.id, negocio_id, updated_at: new Date().toISOString() },
          { onConflict: 'chat_id' }
        )
    }

    return NextResponse.json({ ok: true, cliente_id: cliente.id })
  } catch {
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}
