// src/app/api/citas/crear/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { addMinutes, parseISO } from 'date-fns'
import type { EstadoCita } from '@/types'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    let body: { medico_id?: string; nombre?: string; telefono?: string; fecha?: string; hora?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const { medico_id, nombre, telefono, fecha, hora } = body

    if (!medico_id || !nombre || !telefono || !fecha || !hora) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const trimmedTelefono = telefono.trim()
    const trimmedNombre   = nombre.trim()

    const supabase = createAdminClient()

    // Fetch medico to get duracion
    const { data: medico, error: errMedico } = await supabase
      .from('medicos')
      .select('id, duracion_cita_min')
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

    // Find or create paciente
    const { data: pacienteExistente } = await supabase
      .from('pacientes')
      .select('id')
      .eq('telefono', trimmedTelefono)
      .eq('medico_id', medico_id)
      .maybeSingle()

    let pacienteId: string

    if (pacienteExistente) {
      pacienteId = pacienteExistente.id
    } else {
      const { data: nuevoPaciente, error: errPaciente } = await supabase
        .from('pacientes')
        .insert({ medico_id, nombre: trimmedNombre, telefono: trimmedTelefono })
        .select('id')
        .single()

      if (errPaciente || !nuevoPaciente) {
        return NextResponse.json({ error: 'Error al registrar paciente' }, { status: 500 })
      }
      pacienteId = nuevoPaciente.id
    }

    // Insert cita
    const estado: EstadoCita = 'pendiente'
    const { data: cita, error: errCita } = await supabase
      .from('citas')
      .insert({
        medico_id,
        paciente_id: pacienteId,
        fecha_inicio: fechaInicioISO,
        fecha_fin:    fechaFinISO,
        estado,
      })
      .select('id')
      .single()

    if (errCita || !cita) {
      return NextResponse.json({ error: 'Error al crear la cita' }, { status: 500 })
    }

    return NextResponse.json({
      ok:           true,
      cita_id:      cita.id,
      fecha_inicio: fechaInicioISO,
      fecha_fin:    fechaFinISO,
    })
  } catch {
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}
