// src/app/api/clientes/registrar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    let body: { negocio_id?: string; nombre?: string; apellido?: string; celular?: string; chat_id?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const { negocio_id, nombre, celular, chat_id, apellido } = body

    if (!negocio_id || !nombre || !celular) {
      return NextResponse.json({ error: 'Faltan campos requeridos: negocio_id, nombre, celular' }, { status: 400 })
    }

    const supabase = createAdminClient()

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
