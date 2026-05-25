// src/app/api/citas/crear/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { addMinutes, parseISO } from 'date-fns'
import type { EstadoCita } from '@/types'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    let body: { negocio_id?: string; cliente_id?: string; chat_id?: string; fecha?: string; hora?: string; metodo_pago?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const { negocio_id, cliente_id: clienteIdBody, chat_id, fecha, hora, metodo_pago } = body

    if (!negocio_id || !fecha || !hora) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()

    let cliente_id = clienteIdBody ?? null
    if (!cliente_id && chat_id) {
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('cliente_id')
        .eq('chat_id', chat_id)
        .eq('negocio_id', negocio_id)
        .single()
      cliente_id = session?.cliente_id ?? null
    }

    if (!cliente_id) {
      return NextResponse.json({ error: 'No se pudo identificar al cliente' }, { status: 400 })
    }

    const { data: negocio, error: errNegocio } = await supabase
      .from('negocios')
      .select('id, duracion_cita_min, cbu, alias_mp, precio_consulta, requiere_sena, monto_sena')
      .eq('id', negocio_id)
      .single()

    if (errNegocio) {
      if (errNegocio.code === 'PGRST116') {
        return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Error al buscar negocio' }, { status: 500 })
    }
    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
    }

    const duracion: number = negocio.duracion_cita_min ?? 30

    const fechaInicioLocal = `${fecha}T${hora}:00`
    const fechaInicio = parseISO(`${fechaInicioLocal}-03:00`)
    const fechaFin    = addMinutes(fechaInicio, duracion)

    const fechaInicioISO = fechaInicio.toISOString()
    const fechaFinISO    = fechaFin.toISOString()

    const { data: conflicto, error: errConflicto } = await supabase
      .from('citas')
      .select('id')
      .eq('negocio_id', negocio_id)
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

    const estado: EstadoCita = 'pendiente'
    const { data: cita, error: errCita } = await supabase
      .from('citas')
      .insert({
        negocio_id,
        cliente_id,
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

    const { count } = await supabase
      .from('citas')
      .select('*', { count: 'exact', head: true })
      .eq('cliente_id', cliente_id)
      .neq('estado', 'cancelada')
    await supabase
      .from('clientes')
      .update({ total_citas: count ?? 1, ultima_cita_at: fechaInicioISO })
      .eq('id', cliente_id)

    return NextResponse.json({
      ok:              true,
      cita_id:         cita.id,
      fecha_inicio:    fechaInicioISO,
      fecha_fin:       fechaFinISO,
      cbu:             negocio.cbu             ?? null,
      alias_mp:        negocio.alias_mp        ?? null,
      precio_consulta: negocio.precio_consulta ?? null,
      requiere_sena:   negocio.requiere_sena   ?? false,
      monto_sena:      negocio.monto_sena      ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}
