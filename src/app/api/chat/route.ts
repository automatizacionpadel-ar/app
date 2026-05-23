// src/app/api/chat/route.ts
// Proxy entre la PWA del paciente y el webhook de n8n
// Agrega el webhook_token del médico y reenvía el mensaje

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const N8N_BASE_URL = process.env.N8N_WEBHOOK_URL ?? 'https://n8n.simplificia.com.ar/webhook/chat-medico'

export async function POST(req: NextRequest) {
  try {
    const { medico_id, chat_id, message, image_url } = await req.json()

    if (!medico_id || !chat_id || (!message?.trim() && !image_url)) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Obtener webhook_token del médico
    const { data: medico } = await supabase
      .from('medicos')
      .select('webhook_token, activo')
      .eq('id', medico_id)
      .single()

    if (!medico || !medico.activo) {
      return NextResponse.json({ error: 'Médico no encontrado o inactivo' }, { status: 404 })
    }

    // Armar mensaje final (texto + imagen si hay)
    const mensajeFinal = [
      message?.trim() ?? '',
      image_url ? `[Imagen adjunta: ${image_url}]` : '',
    ].filter(Boolean).join('\n')

    // Reenviar a n8n con el token
    const n8nResponse = await fetch(N8N_BASE_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhook_token: medico.webhook_token,
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

    // Resolver paciente_id: puede venir directo de n8n o buscarlo por celular
    let resolvedPacienteId: string | null = data.paciente_id ?? null

    if (!resolvedPacienteId && data.celular && medico_id) {
      const { data: pac } = await supabase
        .from('pacientes')
        .select('id')
        .eq('medico_id', medico_id)
        .eq('celular', data.celular)
        .single()
      resolvedPacienteId = pac?.id ?? null
    }

    if (resolvedPacienteId && chat_id) {
      await supabase.from('chat_sessions').upsert(
        { chat_id, paciente_id: resolvedPacienteId, medico_id, updated_at: new Date().toISOString() },
        { onConflict: 'chat_id' }
      )
    }

    return NextResponse.json({
      response:    data.response || data.output || 'Sin respuesta del asistente',
      action:      data.action ?? null,
      paciente_id: resolvedPacienteId,
      chat_id,
    })
  } catch (error) {
    console.error('Error en /api/chat:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
