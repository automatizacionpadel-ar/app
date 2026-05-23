// src/app/api/medicos/actualizar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: medico, error: medicoError } = await supabase
      .from('medicos')
      .select('id')
      .eq('usuario_id', user.id)
      .single()

    if (medicoError || !medico) {
      return NextResponse.json({ error: 'Médico no encontrado' }, { status: 404 })
    }

    const body = await req.json()
    const {
      nombre_completo, telefono, direccion,
      foto_perfil_url, logo_url,
      horarios,
      precio_consulta, requiere_sena, monto_sena,
      acepta_agendamientos,
    } = body

    const { error: updateError } = await supabase
      .from('medicos')
      .update({
        nombre_completo,
        telefono:             telefono        || null,
        direccion:            direccion       || null,
        foto_perfil_url:      foto_perfil_url ?? null,
        logo_url:             logo_url        ?? null,
        horarios:             horarios        ?? undefined,
        precio_consulta:      precio_consulta != null
                                ? (isNaN(parseFloat(String(precio_consulta))) ? null : parseFloat(String(precio_consulta)))
                                : null,
        requiere_sena:        requiere_sena   ?? undefined,
        monto_sena:           requiere_sena && monto_sena != null
                                ? (isNaN(parseFloat(String(monto_sena))) ? null : parseFloat(String(monto_sena)))
                                : null,
        acepta_agendamientos: acepta_agendamientos ?? undefined,
      })
      .eq('id', medico.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error en PATCH /api/medicos/actualizar:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
