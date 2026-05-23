// src/app/api/citas/crear/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { addMinutes, parseISO } from 'date-fns'
import type { EstadoCita } from '@/types'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    let body: { medico_id?: string; paciente_id?: string; chat_id?: string; fecha?: string; hora?: string; metodo_pago?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const { medico_id, paciente_id: pacienteIdBody, chat_id, fecha, hora, metodo_pago } = body

    if (!medico_id || !fecha || !hora) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Resolver paciente_id: viene del frontend o se busca por chat_id
    let paciente_id = pacienteIdBody ?? null
    if (!paciente_id && chat_id) {
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('paciente_id')
        .eq('chat_id', chat_id)
        .eq('medico_id', medico_id)
        .single()
      paciente_id = session?.paciente_id ?? null
    }

    if (!paciente_id) {
      return NextResponse.json({ error: 'No se pudo identificar al paciente' }, { status: 400 })
    }

    // Fetch medico to get duracion and payment data
    const { data: medico, error: errMedico } = await supabase
      .from('medicos')
      .select('id, duracion_cita_min, cbu, alias_mp, precio_consulta, requiere_sena, monto_sena')
      .eq('id', medico_id)
      .single()

    if (errMedico) {
      if (errMedico.code === 'PGRST116') {
        return NextResponse.json({ error: 'Médico no encontrado' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Error al buscar médico' }, { status: 500 })
    }
    if (!medico) {
      return NextResponse.json({ error: 'Médico no encontrado' }, { status: 404 })
    }

    const duracion: number = medico.duracion_cita_min ?? 30

    // Build timestamps in Argentina timezone
    const fechaInicioLocal = `${fecha}T${hora}:00`
    const fechaInicio = parseISO(`${fechaInicioLocal}-03:00`)
    const fechaFin    = addMinutes(fechaInicio, duracion)

    const fechaInicioISO = fechaInicio.toISOString()
    const fechaFinISO    = fechaFin.toISOString()

    // Check for conflict
    const { data: conflicto, error: errConflicto } = await supabase
      .from('citas')
      .select('id')
      .eq('medico_id', medico_id)
      .neq('estado', 'cancelada')
      .lt('fecha_inicio', fechaFinISO)
      .gt('fecha_fin', fechaInicioISO)
      .limit(1)
      .maybeSingle()

    if (errConflicto) {
      return NextResponse.json({ error: 'Error al verificar disponibilidad' }, { status: 500 })
    }

    if (conflicto) {
      return NextResponse.json({ error: 'Ese turno ya fue tomado' }, { status: 409 })
    }

    // Insert cita
    const estado: EstadoCita = 'pendiente'
    const { data: cita, error: errCita } = await supabase
      .from('citas')
      .insert({
        medico_id,
        paciente_id,
        fecha_inicio:  fechaInicioISO,
        fecha_fin:     fechaFinISO,
        estado,
        metodo_pago:   metodo_pago ?? 'sin_pago',
      })
      .select('id')
      .single()

    if (errCita || !cita) {
      return NextResponse.json({ error: 'Error al crear la cita' }, { status: 500 })
    }

    // Actualizar stats del paciente
    const { count } = await supabase
      .from('citas')
      .select('*', { count: 'exact', head: true })
      .eq('paciente_id', paciente_id)
      .neq('estado', 'cancelada')
    await supabase
      .from('pacientes')
      .update({ total_citas: count ?? 1, ultima_cita_at: fechaInicioISO })
      .eq('id', paciente_id)

    return NextResponse.json({
      ok:              true,
      cita_id:         cita.id,
      fecha_inicio:    fechaInicioISO,
      fecha_fin:       fechaFinISO,
      cbu:             medico.cbu             ?? null,
      alias_mp:        medico.alias_mp        ?? null,
      precio_consulta: medico.precio_consulta ?? null,
      requiere_sena:   medico.requiere_sena   ?? false,
      monto_sena:      medico.monto_sena      ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}
